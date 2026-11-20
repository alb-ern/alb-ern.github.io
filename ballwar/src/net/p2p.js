const PEER_PREFIX = 'bvb-alpern-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const QUICKMATCH_SLOTS = 12;
const QUICKMATCH_PROBE_TIMEOUT_MS = 5500;
const GUEST_CONNECT_TIMEOUT_MS = 15000;

const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
};

export function generateRoomCode(len = 4) {
  let code = '';
  for (let i = 0; i < len; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export function sanitizeRoomCode(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}

export function quickmatchRoomCode(slotIdx, prefix = 'QM') {
  const clean = sanitizeRoomCode(prefix).slice(0, 4) || 'QM';
  return `${clean}${String(Math.max(0, Number(slotIdx) || 0) + 1).padStart(2, '0')}`;
}

export class P2PRoomClient {
  constructor() {
    this.peer = null;
    this.conn = null; // guest -> host connection
    this.guestConns = new Map(); // host: seat (1..maxGuests) -> open DataConnection
    this.role = null; // 'host' | 'guest'
    this.roomCode = null;
    this.maxGuests = 1;
    this.teamSize = 1;
    this.seat = 0;
    this._matchStarted = false;
    this._opToken = 0;
    this._qmSearching = false;
    this._qmPeer = null;
    this._qmTimer = null;
    this._connectTimer = null;
    this._activeQmAttempt = null;
    this.handlers = {
      onStatus: () => {},
      onRoster: () => {},
      onConnected: () => {},
      onMessage: () => {},
      onDisconnected: () => {},
      onError: () => {},
    };
  }

  get isHost() {
    return this.role === 'host';
  }

  isSearchingQuickmatch() {
    return this._qmSearching;
  }

  setHandlers(handlers) {
    Object.assign(this.handlers, handlers);
  }

  ensurePeerJS() {
    if (typeof window === 'undefined' || !window.Peer) {
      throw new Error('PeerJS library failed to load.');
    }
  }

  _clearConnectTimer() {
    if (this._connectTimer) {
      clearTimeout(this._connectTimer);
      this._connectTimer = null;
    }
  }

  attachHostPeerHandlers(peer, { onOpen, onUnavailableId } = {}) {
    peer.on('open', () => {
      if (this.peer !== peer) return;
      if (onOpen) {
        onOpen();
        return;
      }
      const total = this.maxGuests + 1;
      const waitMsg =
        total > 2
          ? `Room ${this.roomCode} ready (1/${total} players) — waiting for teammates & opponents...`
          : `Room ${this.roomCode} ready — waiting for opponent...`;
      this.handlers.onStatus(waitMsg);
      this.handlers.onRoster({ connectedSeats: [0], total, teamSize: this.teamSize });
    });

    peer.on('connection', (conn) => {
      if (this.peer !== peer) return;
      // Only claim a host seat once the WebRTC DataChannel actually opens so failed/aborted probes never jam the room.
      conn.on('open', () => {
        if (this.peer !== peer) {
          try { conn.close(); } catch (_) {}
          return;
        }
        let assignedSeat = null;
        for (let s = 1; s <= this.maxGuests; s++) {
          if (!this.guestConns.has(s)) {
            assignedSeat = s;
            break;
          }
        }
        if (assignedSeat == null) {
          try { conn.send({ type: 'room_full' }); } catch (_) {}
          setTimeout(() => { try { conn.close(); } catch (_) {} }, 120);
          return;
        }
        this.attachHostGuestConnection(conn, assignedSeat);
      });
      conn.on('error', () => {});
    });

    peer.on('error', (err) => {
      if (this.peer !== peer) return;
      if (err && err.type === 'unavailable-id' && onUnavailableId) {
        onUnavailableId();
        return;
      }
      this.handlers.onError(err?.message || String(err));
    });
  }

  hostRoom(requestedCode = null, options = {}) {
    this.close();
    this.ensurePeerJS();
    this.role = 'host';
    this.maxGuests = options.maxGuests ?? 1;
    this.teamSize = options.teamSize ?? (this.maxGuests >= 3 ? 2 : 1);
    this.seat = 0;
    this._matchStarted = false;
    this.roomCode = sanitizeRoomCode(requestedCode) || generateRoomCode(4);
    const peerId = `${PEER_PREFIX}${this.roomCode}`;

    this.handlers.onStatus('Connecting to PeerJS signaling...');
    const peer = new window.Peer(peerId, { config: ICE_CONFIG });
    this.peer = peer;

    this.attachHostPeerHandlers(peer, {
      onUnavailableId: !requestedCode
        ? () => this.hostRoom(null, { maxGuests: this.maxGuests, teamSize: this.teamSize })
        : null,
    });

    return this.roomCode;
  }

  joinRoom(rawCode) {
    this.close();
    this.ensurePeerJS();
    const code = sanitizeRoomCode(rawCode);
    if (code.length < 3) {
      this.handlers.onError('Enter a valid room code.');
      return;
    }
    const token = this._opToken;
    this.role = 'guest';
    this.roomCode = code;
    const hostPeerId = `${PEER_PREFIX}${code}`;

    this.handlers.onStatus(`Connecting to room ${code}...`);
    const peer = new window.Peer(undefined, { config: ICE_CONFIG });
    this.peer = peer;

    this._connectTimer = setTimeout(() => {
      if (token !== this._opToken || (this.conn && this.conn.open)) return;
      this.handlers.onError(`Could not reach P2P host for room ${code} (strict NAT/firewall or host left).`);
      this.close();
    }, GUEST_CONNECT_TIMEOUT_MS);

    peer.on('open', () => {
      if (this.peer !== peer || token !== this._opToken) return;
      this.handlers.onStatus(`Found room ${code}, establishing P2P channel...`);
      const conn = peer.connect(hostPeerId, { reliable: true, serialization: 'json' });
      this.attachGuestConnection(conn, token);
    });

    peer.on('error', (err) => {
      if (this.peer !== peer || token !== this._opToken) return;
      this._clearConnectTimer();
      const msg =
        err?.type === 'peer-unavailable'
          ? `Room ${code} not found or host left.`
          : err?.message || String(err);
      this.handlers.onError(msg);
    });
  }

  quickmatch(options = {}) {
    this.close();
    this.ensurePeerJS();
    const token = this._opToken;
    const maxSlots = options.maxSlots ?? QUICKMATCH_SLOTS;
    const prefix = options.prefix ?? 'QM';
    this.maxGuests = 1;
    this.teamSize = 1;
    this._qmSearching = true;
    const isStale = () => token !== this._opToken;

    const advanceSlot = (nextIdx) => {
      if (isStale()) return;
      if (nextIdx >= maxSlots) {
        this.handlers.onStatus('Quickmatch: all queues busy, retrying...');
        this._qmTimer = setTimeout(() => {
          if (!isStale()) ensureProbePeerAndTry(0, true);
        }, 900);
        return;
      }
      ensureProbePeerAndTry(nextIdx, true);
    };

    const claimHostSlot = (slotIdx) => {
      if (isStale()) return;
      if (this._qmPeer) {
        try { this._qmPeer.destroy(); } catch (_) {}
        this._qmPeer = null;
      }
      const code = quickmatchRoomCode(slotIdx, prefix);
      const peerId = `${PEER_PREFIX}${code}`;
      this.role = 'host';
      this.roomCode = code;
      this.maxGuests = 1;
      this.teamSize = 1;
      this.seat = 0;
      this._matchStarted = false;
      this.handlers.onStatus('Quickmatch: opening arena...');

      const hostPeer = new window.Peer(peerId, { config: ICE_CONFIG });
      this.peer = hostPeer;
      this.attachHostPeerHandlers(hostPeer, {
        onOpen: () => {
          if (isStale()) return;
          this.handlers.onStatus('Quickmatch: waiting for opponent (1v1)...');
        },
        onUnavailableId: () => {
          if (isStale()) return;
          try { hostPeer.destroy(); } catch (_) {}
          if (this.peer === hostPeer) this.peer = null;
          this.role = null;
          // Another client claimed this slot right before us — connect as guest instead
          ensureProbePeerAndTry(slotIdx, false);
        },
      });
    };

    const finishAsGuest = (conn, code, seatAssignData) => {
      if (isStale()) return;
      const guestPeer = this._qmPeer;
      this.conn = conn;
      this.peer = guestPeer;
      this._qmPeer = null;
      this.role = 'guest';
      this.roomCode = code;
      this._qmSearching = false;
      if (guestPeer) {
        guestPeer.removeAllListeners('error');
        guestPeer.on('error', (err) => {
          if (isStale() || this.peer !== guestPeer) return;
          this.handlers.onError(err?.message || String(err));
        });
      }
      this._handleGuestData(seatAssignData);
    };

    const probeSlot = (slotIdx, canClaimHost) => {
      if (isStale()) return;
      const peer = this._qmPeer;
      if (!peer || peer.destroyed) return;
      const code = quickmatchRoomCode(slotIdx, prefix);
      const targetId = `${PEER_PREFIX}${code}`;
      this.handlers.onStatus(`Quickmatch: searching queue (${slotIdx + 1}/${maxSlots})...`);
      const conn = peer.connect(targetId, { reliable: true, serialization: 'json' });
      let settled = false;

      const clearAttempt = () => {
        if (this._qmTimer) {
          clearTimeout(this._qmTimer);
          this._qmTimer = null;
        }
        if (this._activeQmAttempt === attempt) {
          this._activeQmAttempt = null;
        }
      };

      const failProbe = (shouldClaim) => {
        if (settled || isStale()) return;
        settled = true;
        clearAttempt();
        try { conn.close(); } catch (_) {}
        if (shouldClaim) {
          claimHostSlot(slotIdx);
        } else {
          advanceSlot(slotIdx + 1);
        }
      };

      const attempt = {
        targetId,
        onPeerUnavailable: () => failProbe(canClaimHost),
      };
      this._activeQmAttempt = attempt;

      this._qmTimer = setTimeout(() => failProbe(false), QUICKMATCH_PROBE_TIMEOUT_MS);

      conn.on('iceStateChanged', (state) => {
        if (isStale() || settled) return;
        if (state === 'failed' || state === 'closed') {
          failProbe(false);
        }
      });

      conn.on('data', (data) => {
        if (isStale()) return;
        if (!settled) {
          if (data && data.type === 'room_full') {
            failProbe(false);
            return;
          }
          if (data && data.type === 'seat_assign') {
            settled = true;
            clearAttempt();
            finishAsGuest(conn, code, data);
            return;
          }
        }
        if (settled && this.conn === conn) {
          this._handleGuestData(data);
        }
      });

      conn.on('close', () => {
        if (isStale()) return;
        if (!settled) {
          failProbe(false);
          return;
        }
        if (this.conn === conn) {
          this.handlers.onDisconnected('Host or peer disconnected.');
        }
      });

      conn.on('error', (err) => {
        if (isStale()) return;
        if (!settled) {
          failProbe(false);
          return;
        }
        if (this.conn === conn) {
          this.handlers.onError(err?.message || String(err));
        }
      });
    };

    const ensureProbePeerAndTry = (slotIdx, canClaimHost) => {
      if (isStale()) return;
      if (this._qmPeer && !this._qmPeer.destroyed && this._qmPeer.open) {
        probeSlot(slotIdx, canClaimHost);
        return;
      }
      if (!this._qmPeer || this._qmPeer.destroyed) {
        this.handlers.onStatus('Quickmatch: joining signaling network...');
        const qmPeer = new window.Peer(undefined, { config: ICE_CONFIG });
        this._qmPeer = qmPeer;
        qmPeer.on('error', (err) => {
          if (isStale() || this._qmPeer !== qmPeer) return;
          if (err?.type === 'peer-unavailable' && this._activeQmAttempt) {
            const msg = String(err?.message || '');
            if (!msg || msg.includes(this._activeQmAttempt.targetId)) {
              this._activeQmAttempt.onPeerUnavailable();
            }
            return;
          }
          this._qmSearching = false;
          this.handlers.onError(err?.message || String(err));
        });
        qmPeer.on('open', () => {
          if (isStale() || this._qmPeer !== qmPeer) return;
          probeSlot(slotIdx, canClaimHost);
        });
      }
    };

    ensureProbePeerAndTry(0, true);
  }

  attachHostGuestConnection(conn, seat) {
    this.guestConns.set(seat, conn);

    const connectedSeats = [0, ...Array.from(this.guestConns.keys()).sort((a, b) => a - b)];
    const total = this.maxGuests + 1;
    conn.send({
      type: 'seat_assign',
      seat,
      teamSize: this.teamSize,
      totalPlayers: total,
      connectedSeats,
    });
    this.send({ type: 'room_roster', connectedSeats, totalPlayers: total, teamSize: this.teamSize });
    this.handlers.onRoster({ connectedSeats, total, teamSize: this.teamSize });

    if (this.guestConns.size < this.maxGuests) {
      this.handlers.onStatus(
        `Room ${this.roomCode}: ${connectedSeats.length}/${total} players joined — waiting for ${total - connectedSeats.length} more...`
      );
    } else if (!this._matchStarted) {
      this._matchStarted = true;
      this._qmSearching = false;
      this.handlers.onStatus(total > 2 ? 'All players connected! Starting match...' : 'Opponent matched! Starting 1v1 match...');
      this.handlers.onConnected({
        role: 'host',
        roomCode: this.roomCode,
        seat: 0,
        teamSize: this.teamSize,
        totalPlayers: total,
      });
    }

    conn.on('data', (data) => {
      this.handlers.onMessage(data, { seat });
    });

    conn.on('close', () => {
      this.guestConns.delete(seat);
      if (this._matchStarted) {
        this.handlers.onDisconnected(`Player ${seat + 1} disconnected.`, { seat });
      } else {
        const nextSeats = [0, ...Array.from(this.guestConns.keys()).sort((a, b) => a - b)];
        this.handlers.onRoster({ connectedSeats: nextSeats, total, teamSize: this.teamSize });
        this.handlers.onStatus(
          `Room ${this.roomCode}: ${nextSeats.length}/${total} players connected — waiting for ${total - nextSeats.length} more...`
        );
        this.send({ type: 'room_roster', connectedSeats: nextSeats, totalPlayers: total, teamSize: this.teamSize });
      }
    });

    conn.on('error', (err) => {
      this.handlers.onError(err?.message || String(err));
    });
  }

  _handleGuestData(data) {
    if (data && data.type === 'room_full') {
      this._clearConnectTimer();
      this.handlers.onError('Room is already full.');
      this.close();
      return;
    }
    if (data && data.type === 'seat_assign') {
      this._clearConnectTimer();
      this.seat = data.seat;
      this.teamSize = data.teamSize || 1;
      this.maxGuests = (data.totalPlayers || 2) - 1;
      this.handlers.onRoster({
        connectedSeats: data.connectedSeats || [0, data.seat],
        total: data.totalPlayers || 2,
        teamSize: this.teamSize,
        mySeat: data.seat,
      });
      const count = (data.connectedSeats || []).length;
      const total = data.totalPlayers || 2;
      if (total > 2 && count < total) {
        this.handlers.onStatus(
          `Joined as Player ${data.seat + 1} (${count}/${total}) — waiting for ${total - count} more player(s)...`
        );
      } else {
        this.handlers.onStatus('Connected!');
      }
      this.handlers.onConnected({
        role: 'guest',
        roomCode: this.roomCode,
        seat: data.seat,
        teamSize: this.teamSize,
        totalPlayers: total,
      });
      return;
    }
    if (data && data.type === 'room_roster') {
      const count = (data.connectedSeats || []).length;
      const total = data.totalPlayers || 2;
      this.handlers.onRoster({
        connectedSeats: data.connectedSeats || [],
        total,
        teamSize: data.teamSize || 1,
        mySeat: this.seat,
      });
      if (count < total) {
        this.handlers.onStatus(
          `Joined as Player ${this.seat + 1} (${count}/${total}) — waiting for ${total - count} more player(s)...`
        );
      }
      return;
    }
    this.handlers.onMessage(data, { seat: 0 });
  }

  attachGuestConnection(conn, token = this._opToken) {
    this.conn = conn;
    conn.on('open', () => {
      if (token !== this._opToken) return;
      this._clearConnectTimer();
      this.handlers.onStatus('Connected to host! Waiting for seat assignment...');
    });
    conn.on('iceStateChanged', (state) => {
      if (token !== this._opToken) return;
      if (state === 'failed') {
        this._clearConnectTimer();
        this.handlers.onError('WebRTC P2P connection failed (strict NAT or firewall blocked direct peer connection).');
      }
    });
    conn.on('data', (data) => {
      if (token !== this._opToken) return;
      this._handleGuestData(data);
    });
    conn.on('close', () => {
      if (token !== this._opToken) return;
      this._clearConnectTimer();
      this.handlers.onDisconnected('Host or peer disconnected.');
    });
    conn.on('error', (err) => {
      if (token !== this._opToken) return;
      this._clearConnectTimer();
      this.handlers.onError(err?.message || String(err));
    });
  }

  send(payload) {
    if (this.role === 'host') {
      let sentAny = false;
      for (const conn of this.guestConns.values()) {
        if (conn && conn.open) {
          conn.send(payload);
          sentAny = true;
        }
      }
      return sentAny;
    }
    if (this.conn && this.conn.open) {
      this.conn.send(payload);
      return true;
    }
    return false;
  }

  close() {
    this._opToken += 1;
    this._qmSearching = false;
    this._clearConnectTimer();
    if (this._qmTimer) {
      clearTimeout(this._qmTimer);
      this._qmTimer = null;
    }
    this._activeQmAttempt = null;
    if (this._qmPeer) {
      try { this._qmPeer.destroy(); } catch (_) {}
      this._qmPeer = null;
    }
    for (const conn of this.guestConns.values()) {
      try { conn.close(); } catch (_) {}
    }
    this.guestConns.clear();
    if (this.conn) {
      try { this.conn.close(); } catch (_) {}
      this.conn = null;
    }
    if (this.peer) {
      try { this.peer.destroy(); } catch (_) {}
      this.peer = null;
    }
    this.role = null;
    this.seat = 0;
    this._matchStarted = false;
  }
}


const PEER_PREFIX = 'bvb-alpern-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
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

export class P2PRoomClient {
  constructor() {
    this.peer = null;
    this.conn = null; // guest -> host connection
    this.guestConns = new Map(); // host: seat (1..maxGuests) -> DataConnection
    this.role = null; // 'host' | 'guest'
    this.roomCode = null;
    this.maxGuests = 1;
    this.teamSize = 1;
    this.seat = 0;
    this._matchStarted = false;
    this.handlers = {
      onStatus: () => {},
      onRoster: () => {},
      onConnected: () => {},
      onMessage: () => {},
      onDisconnected: () => {},
      onError: () => {},
    };
  }

  setHandlers(handlers) {
    Object.assign(this.handlers, handlers);
  }

  ensurePeerJS() {
    if (typeof window === 'undefined' || !window.Peer) {
      throw new Error('PeerJS library failed to load.');
    }
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

    peer.on('open', () => {
      const total = this.maxGuests + 1;
      const waitMsg =
        total > 2
          ? `Room ${this.roomCode} ready (1/${total} players) — waiting for teammates & opponents...`
          : `Room ${this.roomCode} ready — waiting for opponent...`;
      this.handlers.onStatus(waitMsg);
      this.handlers.onRoster({ connectedSeats: [0], total, teamSize: this.teamSize });
    });

    peer.on('connection', (conn) => {
      let assignedSeat = null;
      for (let s = 1; s <= this.maxGuests; s++) {
        if (!this.guestConns.has(s)) {
          assignedSeat = s;
          break;
        }
      }
      if (assignedSeat == null) {
        try { conn.close(); } catch (_) {}
        return;
      }
      this.attachHostGuestConnection(conn, assignedSeat);
    });

    peer.on('error', (err) => {
      if (err && err.type === 'unavailable-id' && !requestedCode) {
        // Retry automatically with a fresh code if collision occurred
        this.hostRoom(null, { maxGuests: this.maxGuests, teamSize: this.teamSize });
        return;
      }
      this.handlers.onError(err?.message || String(err));
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
    this.role = 'guest';
    this.roomCode = code;
    const hostPeerId = `${PEER_PREFIX}${code}`;

    this.handlers.onStatus(`Connecting to room ${code}...`);
    const peer = new window.Peer(undefined, { config: ICE_CONFIG });
    this.peer = peer;

    peer.on('open', () => {
      const conn = peer.connect(hostPeerId, { reliable: true, serialization: 'json' });
      this.attachGuestConnection(conn);
    });

    peer.on('error', (err) => {
      const msg =
        err?.type === 'peer-unavailable'
          ? `Room ${code} not found or host left.`
          : err?.message || String(err);
      this.handlers.onError(msg);
    });
  }

  attachHostGuestConnection(conn, seat) {
    this.guestConns.set(seat, conn);

    conn.on('open', () => {
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
        this.handlers.onStatus('All players connected! Starting match...');
        this.handlers.onConnected({
          role: 'host',
          roomCode: this.roomCode,
          seat: 0,
          teamSize: this.teamSize,
          totalPlayers: total,
        });
      }
    });

    conn.on('data', (data) => {
      this.handlers.onMessage(data, { seat });
    });

    conn.on('close', () => {
      this.guestConns.delete(seat);
      const total = this.maxGuests + 1;
      if (this._matchStarted) {
        this.handlers.onDisconnected(`Player ${seat + 1} disconnected.`, { seat });
      } else {
        const connectedSeats = [0, ...Array.from(this.guestConns.keys()).sort((a, b) => a - b)];
        this.handlers.onRoster({ connectedSeats, total, teamSize: this.teamSize });
        this.handlers.onStatus(
          `Room ${this.roomCode}: ${connectedSeats.length}/${total} players connected — waiting for ${total - connectedSeats.length} more...`
        );
        this.send({ type: 'room_roster', connectedSeats, totalPlayers: total, teamSize: this.teamSize });
      }
    });

    conn.on('error', (err) => {
      this.handlers.onError(err?.message || String(err));
    });
  }

  attachGuestConnection(conn) {
    this.conn = conn;
    conn.on('open', () => {
      this.handlers.onStatus('Connected to host! Waiting for seat assignment...');
    });
    conn.on('data', (data) => {
      if (data && data.type === 'seat_assign') {
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
    });
    conn.on('close', () => {
      this.handlers.onDisconnected('Host or peer disconnected.');
    });
    conn.on('error', (err) => {
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

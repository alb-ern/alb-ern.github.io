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
    this.conn = null;
    this.role = null; // 'host' | 'guest'
    this.roomCode = null;
    this.handlers = {
      onStatus: () => {},
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

  hostRoom(requestedCode = null) {
    this.close();
    this.ensurePeerJS();
    this.role = 'host';
    this.roomCode = sanitizeRoomCode(requestedCode) || generateRoomCode(4);
    const peerId = `${PEER_PREFIX}${this.roomCode}`;

    this.handlers.onStatus('Connecting to PeerJS signaling...');
    const peer = new window.Peer(peerId, { config: ICE_CONFIG });
    this.peer = peer;

    peer.on('open', () => {
      this.handlers.onStatus(`Room ${this.roomCode} ready — waiting for opponent...`);
    });

    peer.on('connection', (conn) => {
      if (this.conn && this.conn.open) {
        conn.close();
        return;
      }
      this.attachConnection(conn);
    });

    peer.on('error', (err) => {
      if (err && err.type === 'unavailable-id' && !requestedCode) {
        // Retry automatically with a fresh code if collision occurred
        this.hostRoom();
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
      this.attachConnection(conn);
    });

    peer.on('error', (err) => {
      const msg =
        err?.type === 'peer-unavailable'
          ? `Room ${code} not found or host left.`
          : err?.message || String(err);
      this.handlers.onError(msg);
    });
  }

  attachConnection(conn) {
    this.conn = conn;
    conn.on('open', () => {
      this.handlers.onStatus('Connected!');
      this.handlers.onConnected({ role: this.role, roomCode: this.roomCode });
    });
    conn.on('data', (data) => {
      this.handlers.onMessage(data);
    });
    conn.on('close', () => {
      this.handlers.onDisconnected('Opponent disconnected.');
    });
    conn.on('error', (err) => {
      this.handlers.onError(err?.message || String(err));
    });
  }

  send(payload) {
    if (this.conn && this.conn.open) {
      this.conn.send(payload);
      return true;
    }
    return false;
  }

  close() {
    if (this.conn) {
      try { this.conn.close(); } catch (_) {}
      this.conn = null;
    }
    if (this.peer) {
      try { this.peer.destroy(); } catch (_) {}
      this.peer = null;
    }
    this.role = null;
  }
}

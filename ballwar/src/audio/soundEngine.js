class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  unlock() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
  }

  playTone(freq, endFreq, duration, type = 'sine', gainVal = 0.08) {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(25, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  handleSimEvents(events) {
    if (this.muted || !events || events.length === 0) return;
    let wallPlayed = false;
    for (const ev of events) {
      switch (ev.type) {
        case 'launch':
          this.playTone(260, 520, 0.16, 'triangle', 0.1);
          break;
        case 'wall':
          if (!wallPlayed) {
            wallPlayed = true;
            this.playTone(190, 120, 0.06, 'sine', 0.045);
          }
          break;
        case 'clash':
          this.playTone(150, 70, 0.11, 'square', 0.075);
          break;
        case 'damage':
          if (ev.amount >= 10) {
            this.playTone(220, 90, 0.12, 'sawtooth', 0.065);
          }
          break;
        case 'heal':
          this.playTone(520, 740, 0.09, 'sine', 0.05);
          break;
        case 'levelUp':
          this.playTone(523, 784, 0.14, 'triangle', 0.1);
          setTimeout(() => this.playTone(784, 1046, 0.18, 'triangle', 0.1), 90);
          break;
        case 'suddenDeath':
          this.playTone(220, 180, 0.35, 'sawtooth', 0.1);
          break;
        case 'ability':
          if (ev.kind === 'train' || ev.kind === 'beamFire') {
            this.playTone(440, 140, 0.22, 'sawtooth', 0.08);
          } else if (ev.kind === 'shatter') {
            this.playTone(880, 320, 0.11, 'triangle', 0.06);
          } else if (ev.kind === 'shot' || ev.kind === 'knife') {
            this.playTone(620, 240, 0.05, 'square', 0.03);
          } else if (ev.kind === 'shackleSnap') {
            this.playTone(300, 110, 0.14, 'square', 0.08);
          }
          break;
        case 'roundEnd':
          this.playTone(392, 523, 0.24, 'triangle', 0.11);
          break;
        case 'matchEnd':
          this.playTone(523, 659, 0.16, 'triangle', 0.11);
          setTimeout(() => this.playTone(659, 784, 0.16, 'triangle', 0.11), 130);
          setTimeout(() => this.playTone(784, 1046, 0.28, 'triangle', 0.12), 260);
          break;
        default:
          break;
      }
    }
  }

  playReward() {
    this.playTone(587, 784, 0.12, 'triangle', 0.09);
    setTimeout(() => this.playTone(784, 1175, 0.18, 'triangle', 0.09), 90);
  }

  playLevelUp() {
    this.playTone(523, 659, 0.12, 'triangle', 0.1);
    setTimeout(() => this.playTone(659, 784, 0.12, 'triangle', 0.1), 85);
    setTimeout(() => this.playTone(784, 1046, 0.24, 'triangle', 0.11), 175);
  }
}

export const soundEngine = new SoundEngine();

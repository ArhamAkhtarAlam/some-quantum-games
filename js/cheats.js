// ═══════════════════════════════════════════════════════
//  CHEATS — practice-only, never on a scored run
//  Type the code during practice to unlock it. Everything
//  here is gated on noclip at the call site, and practice
//  already refuses to submit a score, so this can't touch
//  the leaderboard.
// ═══════════════════════════════════════════════════════

const CHEAT_SPEEDS = [0.25, 0.4, 0.55, 0.7, 0.85, 1, 1.25, 1.5, 2]
const CHEAT_NORMAL = CHEAT_SPEEDS.indexOf(1)

// A typed-code listener with a speed multiplier attached.
//   c.feed(e, allowed) -> 'unlock' | 'speed' | false
function makeCheat(code) {
  return {
    code, buf:'', on:false, idx:CHEAT_NORMAL, mul:1,

    feed(e, allowed) {
      if (!allowed) return false
      // Ignore modified keys so browser shortcuts still work
      if (e.ctrlKey || e.metaKey || e.altKey) return false

      if (!this.on) {
        const k = (e.key || '').length === 1 ? e.key.toLowerCase() : ''
        if (!k) return false
        this.buf = (this.buf + k).slice(-this.code.length)
        if (this.buf === this.code) { this.on = true; this.buf = ''; return 'unlock' }
        return false
      }

      // Unlocked: [ and ] (or - and =) step the speed
      const k = e.key
      if (k === ']' || k === '=' || k === '+') {
        this.idx = Math.min(CHEAT_SPEEDS.length - 1, this.idx + 1)
        this.mul = CHEAT_SPEEDS[this.idx]; return 'speed'
      }
      if (k === '[' || k === '-' || k === '_') {
        this.idx = Math.max(0, this.idx - 1)
        this.mul = CHEAT_SPEEDS[this.idx]; return 'speed'
      }
      if (k === '\\') {                       // back to normal speed
        this.idx = CHEAT_NORMAL; this.mul = 1; return 'speed'
      }
      return false
    },

    label() { return `⚡ SPEEDHACK ${this.mul}×   [ / ] to change` },

    // Called whenever a scored run starts, so it can never leak in
    reset() { this.buf = ''; this.on = false; this.idx = CHEAT_NORMAL; this.mul = 1 },
  }
}

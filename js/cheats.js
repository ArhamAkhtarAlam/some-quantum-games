// ═══════════════════════════════════════════════════════
//  CHEATS — practice-only, never on a scored run
//  Type the code any time you're on the game's screen: on
//  the start overlay or mid-run, both work. The *effect* is
//  gated separately on noclip, so unlocking it can never
//  change a scored run.
// ═══════════════════════════════════════════════════════

const CHEAT_SPEEDS = [0.25, 0.4, 0.55, 0.7, 0.85, 1, 1.25, 1.5, 2]
const CHEAT_NORMAL = CHEAT_SPEEDS.indexOf(1)

const _CHEATS = []

// makeCheat(code, isArmed) — isArmed() decides when typing counts,
// e.g. "the Wave Gauntlet screen is showing".
function makeCheat(code, isArmed) {
  const c = {
    code, buf:'', on:false, idx:CHEAT_NORMAL, mul:1,
    isArmed: isArmed || (() => false),
    onUnlock: null,

    feed(e, allowed) {
      if (!allowed) return false
      if (e.ctrlKey || e.metaKey || e.altKey) return false

      if (!this.on) {
        const k = (e.key || '').length === 1 ? e.key.toLowerCase() : ''
        if (!k) return false
        this.buf = (this.buf + k).slice(-this.code.length)
        if (this.buf === this.code) {
          this.on = true; this.buf = ''
          if (this.onUnlock) this.onUnlock()
          return 'unlock'
        }
        return false
      }

      const k = e.key
      if (k === ']' || k === '=' || k === '+') {
        this.idx = Math.min(CHEAT_SPEEDS.length - 1, this.idx + 1)
        this.mul = CHEAT_SPEEDS[this.idx]; return 'speed'
      }
      if (k === '[' || k === '-' || k === '_') {
        this.idx = Math.max(0, this.idx - 1)
        this.mul = CHEAT_SPEEDS[this.idx]; return 'speed'
      }
      if (k === '\\') { this.idx = CHEAT_NORMAL; this.mul = 1; return 'speed' }
      return false
    },

    label() { return `⚡ SPEEDHACK ${this.mul}×   [ / ] to change` },
    reset() { this.buf = ''; this.on = false; this.idx = CHEAT_NORMAL; this.mul = 1 },
  }
  _CHEATS.push(c)
  return c
}

// One listener for every cheat, installed once and always live.
// Each cheat decides for itself whether it's currently listening.
if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (e) => {
    for (const c of _CHEATS) {
      let armed = false
      try { armed = !!c.isArmed() } catch { armed = false }
      const hit = c.feed(e, armed)
      if (hit && typeof SFX !== 'undefined') {
        hit === 'unlock' ? SFX.powerup() : SFX.click()
      }
    }
  })
}

// True when the given game <section> is on screen, or when a Test Play
// host is up. editor.html and review.html run the real game inside their
// own container rather than index.html's <section>, so without this the
// cheat would never arm there.
function cheatScreenActive(id) {
  const el = document.getElementById(id)
  if (el && el.classList.contains('active')) return true
  for (const host of ['ed-testhost', 'rv-testhost']) {
    const h = document.getElementById(host)
    if (h && h.classList.contains('on')) return true
  }
  return false
}

// ═══════════════════════════════════════════════════════
//  SFX — shared Web Audio sound effects for all games
//  Call SFX.resume() inside any user-gesture handler.
//  All sound methods are safe to call at any time.
// ═══════════════════════════════════════════════════════

const SFX = (() => {
  let _ctx = null
  let _master = null

  function ctx() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)()
    return _ctx
  }

  function master() {
    if (!_master) {
      _master = ctx().createGain()
      _master.gain.value = 0.85
      _master.connect(ctx().destination)
    }
    return _master
  }

  function resume() {
    if (_ctx && _ctx.state === 'suspended') _ctx.resume()
  }

  // ── primitive builders ──────────────────────────────
  function tone(freq, type, dur, vol, freqEnd, when) {
    try {
      const ac = ctx(); resume()
      const t = when ?? ac.currentTime
      const osc = ac.createOscillator()
      const env = ac.createGain()
      osc.type = type || 'sine'
      osc.frequency.setValueAtTime(freq, t)
      if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur)
      env.gain.setValueAtTime(vol, t)
      env.gain.exponentialRampToValueAtTime(0.001, t + dur)
      osc.connect(env); env.connect(master())
      osc.start(t); osc.stop(t + dur + 0.01)
    } catch(e) {}
  }

  function noise(dur, vol, hpFreq, when) {
    try {
      const ac = ctx(); resume()
      const t = when ?? ac.currentTime
      const frames = Math.ceil(ac.sampleRate * dur)
      const buf = ac.createBuffer(1, frames, ac.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < frames; i++) d[i] = Math.random() * 2 - 1
      const src = ac.createBufferSource(); src.buffer = buf
      const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = hpFreq || 400
      const env = ac.createGain()
      src.connect(hp); hp.connect(env); env.connect(master())
      env.gain.setValueAtTime(vol, t)
      env.gain.exponentialRampToValueAtTime(0.001, t + dur)
      src.start(t); src.stop(t + dur + 0.01)
    } catch(e) {}
  }

  // ── sound effects ───────────────────────────────────
  return {
    resume,

    // positive short hit / button press
    hit() { tone(520, 'sine', 0.08, 0.28, 640) },

    // perfect / excellent
    perfect() {
      tone(660, 'sine', 0.06, 0.3, 880)
      tone(880, 'sine', 0.06, 0.2, 1100, ctx().currentTime + 0.06)
    },

    // collecting an orb / coin / point
    coin() { tone(880, 'sine', 0.05, 0.22, 1320) },

    // wrong answer / miss (soft thud)
    miss() { tone(180, 'sine', 0.18, 0.35, 80) },

    // hard wrong / penalty buzz
    error() {
      tone(120, 'square', 0.12, 0.3, 80)
      noise(0.1, 0.15, 200)
    },

    // player death
    die() {
      tone(300, 'sawtooth', 0.25, 0.4, 60)
      noise(0.2, 0.3, 150)
    },

    // jump
    jump() { tone(260, 'sine', 0.12, 0.22, 520) },

    // land
    land() { tone(100, 'sine', 0.07, 0.18, 60) },

    // level / round complete
    win() {
      const t0 = ctx().currentTime
      ;[330, 440, 550, 660].forEach((f, i) => tone(f, 'sine', 0.12, 0.25, f * 1.05, t0 + i * 0.09))
    },

    // correct answer / good select
    correct() { tone(440, 'sine', 0.1, 0.28, 660) },

    // UI button click
    click() { tone(600, 'sine', 0.04, 0.12, 700) },

    // electric / zap
    zap() {
      noise(0.12, 0.4, 2000)
      tone(80, 'sawtooth', 0.08, 0.3, 40)
    },

    // power up / upgrade bought
    powerup() {
      const t0 = ctx().currentTime
      ;[220, 330, 440, 660].forEach((f, i) => tone(f, 'sine', 0.1, 0.2, f * 1.1, t0 + i * 0.06))
    },

    // quick whoosh (movement / speed)
    whoosh() { tone(400, 'sine', 0.1, 0.15, 120) },

    // shoot / fire
    shoot() {
      tone(200, 'sawtooth', 0.09, 0.25, 80)
      noise(0.05, 0.1, 1000)
    },

    // bounce / wall hit
    bounce() { tone(300, 'sine', 0.06, 0.18, 200) },

    // hover / ambient tick (very soft)
    tick() { tone(700, 'sine', 0.03, 0.08) },
  }
})()

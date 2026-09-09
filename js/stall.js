// ═══════════════════════════════════════════════════════
//  STALL DECORATIONS — the fun bits
//  Injected by qgApplyStall(), so it only ever runs on /stall.
//
//  Bulbs pop and change colour when clicked. Bunting flags can be
//  dragged and swing back on a damped spring, and their neighbours
//  catch a little of the motion so a tug ripples along the string.
//
//  These are decoration, not controls: they stay aria-hidden and out
//  of the tab order, and nothing here changes any game state.
// ═══════════════════════════════════════════════════════

(function () {
  const reduced = typeof matchMedia === 'function' &&
                  matchMedia('(prefers-reduced-motion: reduce)').matches

  // ── Bulbs ───────────────────────────────────────────
  const BULBS = [
    ['#ffc23c', 'rgba(255,194,60,.85)'],
    ['#ff6b8a', 'rgba(255,107,138,.8)'],
    ['#6ee7f0', 'rgba(110,231,240,.8)'],
    ['#9bf07a', 'rgba(155,240,122,.8)'],
    ['#c58cff', 'rgba(197,140,255,.8)'],
  ]
  document.querySelectorAll('.stall-lights i').forEach((b, i) => {
    b._c = i % BULBS.length
    b.addEventListener('pointerdown', e => {
      e.preventDefault()
      b._c = (b._c + 1) % BULBS.length
      const [col, glow] = BULBS[b._c]
      b.style.background = col
      b.style.boxShadow  = `0 0 10px 2px ${glow}`
      if (reduced) return
      // Pop overrides the twinkle for a moment, then hands it back
      b.style.animation = 'stall-pop .38s ease'
      const done = () => {
        b.style.animation = ''
        b.removeEventListener('animationend', done)
      }
      b.addEventListener('animationend', done)
    })
  })

  // ── Bunting ─────────────────────────────────────────
  const flags = [...document.querySelectorAll('.stall-bunting i')]
  if (!flags.length) return

  // Everything below is in degrees and degrees/second. Mixing degrees with
  // radians here made one frame's step ~160deg, so every flag slammed into
  // the clamp and the ripple came out backwards — the far flags swinging
  // harder than the near ones.
  const MAX   = 62                // degrees a flag will swing to
  const K     = 30                // spring constant: period ~1.15s
  const D     = 2.2               // damping, so it settles instead of ringing
  const VMAX  = 620               // deg/s cap on how hard a flag can be thrown
  const st  = flags.map(() => ({ a: 0, v: 0, held: false }))
  let running = false, last = 0

  function frame(ts) {
    const dt = Math.min((ts - last) / 1000, 0.05)
    last = ts
    let alive = false
    for (let i = 0; i < flags.length; i++) {
      const s = st[i]
      if (s.held) { alive = true; continue }
      // 0.3deg is already invisible; stopping there saves the loop idling
      if (Math.abs(s.a) < 0.3 && Math.abs(s.v) < 0.5) {
        if (s.a !== 0) { s.a = 0; s.v = 0; flags[i].style.transform = ''
                         flags[i].classList.remove('swinging') }
        continue
      }
      // damped spring back to hanging straight down
      s.v += (-K * s.a - D * s.v) * dt
      s.a += s.v * dt
      if (s.a >  MAX) { s.a =  MAX; s.v = -s.v * 0.3 }
      if (s.a < -MAX) { s.a = -MAX; s.v = -s.v * 0.3 }
      flags[i].classList.add('swinging')
      flags[i].style.transform = `rotate(${s.a.toFixed(2)}deg)`
      alive = true
    }
    if (alive) requestAnimationFrame(frame)
    else running = false
  }
  function kick() {
    if (running) return
    running = true; last = performance.now()
    requestAnimationFrame(frame)
  }
  // A tug on one flag travels a little way along the string
  function nudge(i, amount) {
    for (let d = 1; d <= 3; d++) {
      const f = amount * (0.34 / d)
      if (st[i - d]) st[i - d].v += f
      if (st[i + d]) st[i + d].v += f
    }
  }

  // The drag is tracked on the window, not on the flag. A flag's hit area is
  // only about 30px wide, so listening on the element meant the drag died the
  // moment the pointer left the triangle — and setPointerCapture fails
  // silently on some inputs, so it could not be relied on to hold the stream.
  let heldIdx = -1

  function onMove(e) {
    if (heldIdx < 0) return
    const s = st[heldIdx], f = flags[heldIdx]
    const prev = s.a, now = performance.now()
    const gap = Math.max(8, now - (s.t || now))   // ms since the last move
    s.a = Math.max(-MAX, Math.min(MAX, s.base + (e.clientX - s.grabX) * 0.55))
    // real angular speed, so a flick throws harder than a slow drag
    s.v = Math.max(-VMAX, Math.min(VMAX, (s.a - prev) / (gap / 1000)))
    s.t = now
    f.style.transform = `rotate(${s.a.toFixed(2)}deg)`
  }
  function onUp() {
    if (heldIdx < 0) return
    const i = heldIdx, s = st[i]
    heldIdx = -1
    s.held = false
    flags[i].classList.remove('grabbed')
    // A tap with no drag still gets a flick, so clicking does something
    if (Math.abs(s.a) < 1 && Math.abs(s.v) < 1) s.v = 210
    nudge(i, s.v)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
    kick()
  }

  flags.forEach((f, i) => {
    f.addEventListener('pointerdown', e => {
      e.preventDefault()
      onUp()                       // drop any flag still held
      const s = st[i]
      heldIdx = i
      s.held  = true
      s.grabX = e.clientX
      s.base  = s.a
      s.t     = performance.now()
      f.classList.add('grabbed', 'swinging')
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
      kick()
    })
  })
})()

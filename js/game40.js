// ═══════════════════════════════════════════════════════
//  GAME 40 — UFO FLAP
//  Flappy-Bird style. Space / tap to thrust up.
//  Dodge the neon pillars — faster and tighter as you score.
// ═══════════════════════════════════════════════════════

const G40_GRAV      = 880
const G40_THRUST    = -400
const G40_UFO_RX    = 22
const G40_UFO_RY    = 11
const G40_PIPE_W    = 62
const G40_PIPE_GAP0 = 195
const G40_PIPE_SPD0 = 155
const G40_PIPE_SEP  = 290
const G40_ACCEL     = 3.5

const G40 = {
  active:   false,
  phase:    'idle',
  y:        0,
  vy:       0,
  score:    0,
  pipes:    [],
  speed:    G40_PIPE_SPD0,
  gap:      G40_PIPE_GAP0,
  stars:    [],
  raf:      null,
  lastTime: 0,
  deadT:    0,
  showOver: false,
  // Gauntlet mode (beta + stall): a named level series instead of one endless run
  gauntlet: false,
  challenge: null,
  scrollX:  0,
  clearAt:  0,
  announceT: 0,
  clearedT: 0,
  // Same-device 2P: P1 on Space, P2 on the up arrow, one shared level
  multi:    false,
  p2y:      0,
  p2vy:     0,
  p1dead:   false,
  p2dead:   false,
  winner:   0,
}


// ═══════════════════════════════════════════════════════
//  GAUNTLET MODE — a named series instead of one endless run
//  Levels are resolution-independent: `cyf` is the gap centre as a
//  fraction of canvas height, `gapf` the gap size as a fraction, and
//  `at` the world x the pillar sits at. Same idea as Wave Gauntlet's
//  keyframes, so a level plays the same on any window size.
//
//  Authoring notes (physics: gravity 880, one thrust sets vy to -400):
//    a single flap climbs ~91px before gravity wins
//    falling is far faster than climbing, so upward steps cost flaps
//  Runs on /beta and /stall; the main site keeps the endless game.
// ═══════════════════════════════════════════════════════

const P = (at, cyf, gapf) => (gapf ? { at, cyf, gapf } : { at, cyf })

// Build an evenly spaced run — keeps level definitions readable
function _g40Run(x0, step, cys, gapf) {
  return cys.map((cyf, i) => P(x0 + i * step, cyf, gapf))
}

const G40_POOL = {
  easy: [
    { name:'FIRST STEPS', diff:'easy', speed:150, gapf:0.34, clearAt:3000,
      pipes:_g40Run(520, 330, [0.50,0.44,0.56,0.48,0.54,0.46,0.52]) },
    { name:'EASY ORBIT', diff:'easy', speed:162, gapf:0.31, clearAt:3250,
      pipes:_g40Run(520, 320, [0.44,0.56,0.40,0.58,0.46,0.54,0.48]) },
  ],
  medium: [
    { name:'STAIRCASE', diff:'medium', speed:178, gapf:0.27, clearAt:3400,
      pipes:_g40Run(520, 300, [0.66,0.58,0.50,0.42,0.34,0.42,0.50,0.58]) },
    { name:'ZIGZAG', diff:'medium', speed:184, gapf:0.26, clearAt:3400,
      pipes:_g40Run(520, 295, [0.36,0.62,0.36,0.62,0.36,0.62,0.40,0.58]) },
    { name:'NARROWING', diff:'medium', speed:176, gapf:0.28, clearAt:3350,
      pipes:[P(520,0.50,0.32),P(810,0.44,0.29),P(1100,0.56,0.27),P(1390,0.46,0.25),
             P(1680,0.54,0.24),P(1970,0.48,0.23),P(2260,0.52,0.22),P(2560,0.50,0.22)] },
  ],
  hard: [
    { name:'TIGHT SQUEEZE', diff:'hard', speed:198, gapf:0.205, clearAt:3300,
      pipes:_g40Run(520, 275, [0.50,0.45,0.55,0.44,0.56,0.46,0.54,0.50]) },
    { name:'THE LADDER', diff:'hard', speed:204, gapf:0.22, clearAt:3400,
      pipes:_g40Run(520, 268, [0.70,0.62,0.54,0.46,0.38,0.30,0.38,0.50,0.62]) },
    { name:'WHIPLASH', diff:'hard', speed:208, gapf:0.235, clearAt:3350,
      pipes:_g40Run(520, 272, [0.32,0.68,0.30,0.70,0.34,0.66,0.36,0.64]) },
  ],
  extreme: [
    { name:'NEEDLE', diff:'extreme', speed:222, gapf:0.175, clearAt:3300,
      pipes:_g40Run(520, 262, [0.50,0.46,0.54,0.47,0.53,0.48,0.52,0.50]) },
    { name:'THE GRINDER', diff:'extreme', speed:232, gapf:0.19, clearAt:3450,
      pipes:_g40Run(520, 274, [0.42,0.58,0.38,0.62,0.44,0.56,0.40,0.60,0.50]) },
  ],
}

function _g40Gauntlet() { return !!(window.QG_BETA || window.QG_STALL) }

function _g40GetPool(score) {
  const {easy,medium,hard,extreme} = G40_POOL
  if (score < 2) return [...easy]
  if (score < 4) return [...easy, ...medium]
  if (score < 7) return [...medium, ...hard]
  if (score < 10) return [...hard, ...extreme]
  return [...extreme, ...hard]
}

// Lay a level out in screen space. Pillars start off to the right and
// scroll in, exactly as the endless spawner does, so movement, drawing
// and collision are shared between both modes.
function _g40LoadLevel(w, h) {
  const pool = _g40GetPool(G40.score)
  const tmpl = pool[qRandInt(pool.length)] || G40_POOL.easy[0]
  G40.challenge = tmpl
  G40.speed     = tmpl.speed
  G40.gap       = tmpl.gapf * h
  G40.clearAt   = tmpl.clearAt
  G40.scrollX   = 0
  G40.pipes     = tmpl.pipes.map(p => ({
    x: p.at + w, cy: p.cyf * h, gap: (p.gapf || tmpl.gapf) * h, passed: false,
  }))
  G40.y   = h / 2; G40.vy   = 0
  G40.p2y = h / 2; G40.p2vy = 0
  G40.p1dead = false; G40.p2dead = false
  G40.phase = 'announce'; G40.announceT = 0
}

let _g40Canvas = null
function _g40C() {
  if (!_g40Canvas) _g40Canvas = document.getElementById('g40-canvas')
  return _g40Canvas
}

async function initGame40() {
  stopGame40()
  _g40Canvas = null
  document.getElementById('g40-overlay').style.display = 'flex'
  document.getElementById('g40-over').style.display    = 'none'
  // The level series and same-device 2P run on /beta and /stall only;
  // the main site keeps the original endless game and no 2P button.
  const twoP = document.getElementById('g40-2p-btn')
  if (twoP) twoP.style.display = _g40Gauntlet() ? '' : 'none'
  const hint = document.getElementById('g40-hint')
  if (hint) hint.textContent = _g40Gauntlet()
    ? 'Clear a series of named levels — each one has a finish line.'
    : 'Faster and tighter as you score!'
  await initCurby()
}
window.initGame40 = initGame40

window.startUFOGame = function() { G40.multi = false; _g40Begin() }
// Same-device versus: two UFOs, one level, first to clip a pillar loses
window.startUFO2P   = function() { G40.multi = true;  _g40Begin() }

function _g40Begin() {
  G40.gauntlet = _g40Gauntlet()
  SFX.resume(); SFX.click()
  const c = _g40C()
  c.width  = c.parentElement.clientWidth
  c.height = c.parentElement.clientHeight
  document.getElementById('g40-overlay').style.display = 'none'
  document.getElementById('g40-over').style.display    = 'none'

  G40.stars = Array.from({length: 70}, () => ({
    x:   Math.random() * c.width,
    y:   Math.random() * c.height,
    r:   Math.random() * 1.4 + 0.3,
    spd: Math.random() * 28 + 8,
    a:   Math.random() * 0.5 + 0.4,
  }))

  G40.active   = true
  G40.phase    = 'playing'
  G40.y        = c.height / 2
  G40.vy       = 0
  G40.score    = 0
  G40.pipes    = []
  G40.speed    = G40_PIPE_SPD0
  G40.gap      = G40_PIPE_GAP0
  G40.deadT    = 0
  G40.showOver = false
  G40.p2y      = c.height / 2
  G40.p2vy     = 0
  G40.p1dead   = false
  G40.p2dead   = false
  G40.winner   = 0
  G40.scrollX  = 0
  document.getElementById('g40-score-hud').textContent = '0'

  if (G40.gauntlet) _g40LoadLevel(c.width, c.height)
  else              _g40Spawn(c.width + G40_PIPE_W, c.height)

  c.addEventListener('click',      _g40Thrust)
  c.addEventListener('touchstart', _g40Thrust, { passive: false })
  window.addEventListener('keydown', _g40Key)

  G40.lastTime = performance.now()
  G40.raf = requestAnimationFrame(_g40Loop)
}

window.stopGame40 = function() {
  G40.active = false
  if (G40.raf) { cancelAnimationFrame(G40.raf); G40.raf = null }
  const c = _g40C()
  if (c) {
    c.removeEventListener('click',      _g40Thrust)
    c.removeEventListener('touchstart', _g40Thrust)
  }
  window.removeEventListener('keydown', _g40Key)
}

function _g40Key(e) {
  if (e.repeat) return
  if (e.code === 'Space') { e.preventDefault(); _g40DoThrust() }
  else if (e.key === 'ArrowUp') {
    e.preventDefault()
    G40.multi ? _g40DoThrust2() : _g40DoThrust()
  }
}
function _g40DoThrust2() {
  if (G40.phase !== 'playing' || G40.p2dead) return
  G40.p2vy = G40_THRUST * (G40.gauntlet ? _g40C().height / 560 : 1)
  SFX.click()
}
function _g40Thrust(e) { e.preventDefault(); _g40DoThrust() }
function _g40DoThrust() {
  if (G40.phase !== 'playing' || G40.p1dead) return
  G40.vy = G40_THRUST * (G40.gauntlet ? _g40C().height / 560 : 1)
  SFX.click()
}

function _g40Spawn(x, h) {
  const margin = Math.floor(h * 0.18)
  const range  = Math.floor(h * 0.64)
  const cy = margin + (range > 0 ? qRandInt(range + 1) : 0)
  G40.pipes.push({ x, cy, passed: false })
}

function _g40Loop(ts) {
  if (!G40.active) return
  const dt = Math.min((ts - G40.lastTime) / 1000, 0.05)
  G40.lastTime = ts

  const c = _g40C()
  const w = c.width, h = c.height
  const ufoX = w * 0.20
  // Gauntlet levels are authored as fractions of the canvas, but gravity and
  // thrust are absolute px/s^2 — so on a short window the UFO fell twice as
  // fast relative to the screen and half the levels became unclearable.
  // Scaling the physics with height makes a level play the same everywhere.
  // Endless mode keeps k = 1 so the main site is untouched.
  const k     = G40.gauntlet ? h / 560 : 1
  const GRAV  = G40_GRAV * k
  const RY    = G40_UFO_RY * k
  const RX    = G40_UFO_RX * k
  const spd   = G40.speed * k

  for (const s of G40.stars) {
    s.x -= s.spd * dt
    if (s.x < 0) { s.x = w + 2; s.y = Math.random() * h }
  }

  if (G40.phase === 'announce') {
    G40.announceT += dt
    if (G40.announceT >= 0.9) G40.phase = 'playing'

  } else if (G40.phase === 'cleared') {
    G40.clearedT += dt
    if (G40.clearedT >= 0.75) {
      G40.score++
      window._g40Score = G40.score
      document.getElementById('g40-score-hud').textContent = G40.score
      _g40LoadLevel(w, h)
    }

  } else if (G40.phase === 'playing') {
    if (!G40.p1dead) { G40.vy += GRAV * dt; G40.y += G40.vy * dt }
    if (G40.multi && !G40.p2dead) { G40.p2vy += GRAV * dt; G40.p2y += G40.p2vy * dt }

    for (const p of G40.pipes) p.x -= spd * dt

    if (G40.gauntlet) {
      G40.scrollX += spd * dt
    } else {
      // Endless: a passed pillar is a point, and the run tightens as you go
      for (const p of G40.pipes) {
        if (!p.passed && p.x + G40_PIPE_W < ufoX - RX) {
          p.passed = true
          G40.score++
          window._g40Score = G40.score
          document.getElementById('g40-score-hud').textContent = G40.score
          G40.speed = G40_PIPE_SPD0 + G40.score * G40_ACCEL
          G40.gap   = Math.max(95, G40_PIPE_GAP0 - G40.score * 2.2)
        }
      }
      G40.pipes = G40.pipes.filter(p => p.x > -G40_PIPE_W - 20)
      const last = G40.pipes[G40.pipes.length - 1]
      if (!last || last.x < w - G40_PIPE_SEP) _g40Spawn(w + G40_PIPE_W, h)
    }

    // Collision, checked per player so a 2P round can name a winner
    const hits = (y) => {
      if (y - RY <= 0 || y + RY >= h) return true
      for (const p of G40.pipes) {
        const half = (p.gap != null ? p.gap : G40.gap) / 2
        const inX  = ufoX + RX > p.x && ufoX - RX < p.x + G40_PIPE_W
        if (inX && (y - RY < p.cy - half || y + RY > p.cy + half)) return true
      }
      return false
    }
    if (!G40.p1dead && hits(G40.y))   { G40.p1dead = true; if (!G40.multi) _g40Die() }
    if (G40.multi && !G40.p2dead && hits(G40.p2y)) G40.p2dead = true
    // 2P is a race: the first to clip a pillar loses the round outright
    if (G40.multi && (G40.p1dead || G40.p2dead)) {
      G40.winner = G40.p1dead && G40.p2dead ? 0 : (G40.p1dead ? 2 : 1)
      _g40Die()
    }

    if (G40.gauntlet && !G40.p1dead && G40.scrollX >= G40.clearAt) {
      G40.phase = 'cleared'; G40.clearedT = 0
      SFX.win()
    }

  } else if (G40.phase === 'dead') {
    G40.vy   += GRAV * dt
    G40.y    += G40.vy * dt
    if (G40.multi) { G40.p2vy += GRAV * dt; G40.p2y += G40.p2vy * dt }
    G40.deadT += dt
    if (G40.deadT >= 1.5 && !G40.showOver) {
      G40.showOver = true
      window._g40Score = G40.score
      const s = G40.score
      let label
      if (G40.multi) label = G40.winner ? `Player ${G40.winner} wins — ${s} level${s !== 1 ? 's' : ''}`
                                        : `Draw — ${s} level${s !== 1 ? 's' : ''}`
      else if (G40.gauntlet) label = `${s} level${s !== 1 ? 's' : ''}`
      else label = `${s} pipe${s !== 1 ? 's' : ''}`
      document.getElementById('g40-final-score').textContent = label
      document.getElementById('g40-over').style.display = 'flex'
    }
  }

  _g40Draw(c.getContext('2d'), w, h)

  if (G40.showOver) { G40.active = false; return }
  G40.raf = requestAnimationFrame(_g40Loop)
}

function _g40Die() {
  if (G40.phase === 'dead') return
  G40.phase = 'dead'
  G40.deadT = 0
  G40.vy    = G40_THRUST * 0.45
  SFX.die()
  const c = _g40C()
  c.removeEventListener('click',      _g40Thrust)
  c.removeEventListener('touchstart', _g40Thrust)
  window.removeEventListener('keydown', _g40Key)
}

function _g40Draw(ctx, w, h) {
  ctx.save()
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'

  // Background
  ctx.fillStyle = '#030710'
  ctx.fillRect(0, 0, w, h)

  // Nebula glow
  const ng = ctx.createRadialGradient(w * 0.72, h * 0.38, 0, w * 0.72, h * 0.38, w * 0.55)
  ng.addColorStop(0, 'rgba(88,28,135,0.14)')
  ng.addColorStop(1, 'rgba(88,28,135,0)')
  ctx.fillStyle = ng
  ctx.fillRect(0, 0, w, h)

  // Stars
  for (const s of G40.stars) {
    ctx.globalAlpha = s.a
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'; ctx.fill()
  }
  ctx.globalAlpha = 1

  for (const p of G40.pipes) {
    const halfGap = (p.gap != null ? p.gap : G40.gap) / 2
    _g40DrawPipe(ctx, p.x, 0,              G40_PIPE_W, p.cy - halfGap,            true)
    _g40DrawPipe(ctx, p.x, p.cy + halfGap, G40_PIPE_W, h - (p.cy + halfGap), false)
  }

  const ufoX  = w * 0.20
  const alpha = G40.phase === 'dead' ? Math.max(0.15, 1 - G40.deadT * 1.4) : 1
  const scale = G40.gauntlet ? h / 560 : 1
  if (G40.multi) {
    // P2 first so P1 reads on top when they overlap
    ctx.globalAlpha = G40.p2dead ? 0.28 : alpha
    _g40DrawUFO(ctx, ufoX, G40.p2y, scale, '#fb923c')
    ctx.globalAlpha = G40.p1dead ? 0.28 : alpha
    _g40DrawUFO(ctx, ufoX, G40.y, scale, '#22d3ee')
  } else {
    ctx.globalAlpha = alpha
    _g40DrawUFO(ctx, ufoX, G40.y, scale)
  }
  ctx.globalAlpha = 1

  // Score
  ctx.textAlign   = 'center'
  ctx.font        = 'bold 28px monospace'
  ctx.fillStyle   = 'rgba(255,255,255,0.92)'
  ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 18
  ctx.fillText(G40.score, w / 2, 46)
  ctx.shadowBlur  = 0

  // Level announce
  if (G40.phase === 'announce' && G40.challenge) {
    const fade = Math.min(1, G40.announceT / 0.18)
    ctx.globalAlpha = fade
    ctx.fillStyle = 'rgba(3,7,16,.72)'
    ctx.fillRect(0, h / 2 - 62, w, 124)
    ctx.textAlign = 'center'
    ctx.font = 'bold 13px monospace'
    ctx.fillStyle = '#a855f7'
    ctx.fillText(G40.challenge.diff.toUpperCase(), w / 2, h / 2 - 22)
    ctx.font = 'bold 32px monospace'
    ctx.fillStyle = '#fff'
    ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 20
    ctx.fillText(G40.challenge.name, w / 2, h / 2 + 16)
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
  }

  // 2P result
  if (G40.multi && G40.phase === 'dead' && G40.winner) {
    ctx.textAlign = 'center'
    ctx.font = 'bold 26px monospace'
    ctx.fillStyle = G40.winner === 1 ? '#22d3ee' : '#fb923c'
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 18
    ctx.fillText(`PLAYER ${G40.winner} WINS`, w / 2, h / 2)
    ctx.shadowBlur = 0
  }

  ctx.restore()
}

function _g40DrawPipe(ctx, x, y, pw, ph, isTop) {
  if (ph <= 0) return
  const capH = 18, capX = x - 5, capW = pw + 10
  const capY = isTop ? y + ph - capH : y

  ctx.fillStyle = '#06091a'
  ctx.fillRect(x, y, pw, ph)
  ctx.fillStyle = '#0d1533'
  ctx.fillRect(capX, capY, capW, capH)

  ctx.strokeStyle = '#a855f7'
  ctx.lineWidth   = 1.8
  ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 12
  ctx.strokeRect(x + 0.9, y, pw - 1.8, ph)
  ctx.strokeRect(capX + 0.9, capY, capW - 1.8, capH)
  ctx.shadowBlur  = 0

  ctx.fillStyle = 'rgba(168,85,247,0.10)'
  ctx.fillRect(x + 4, y, 7, ph)
}

// `scale` keeps the saucer in proportion with the gauntlet's scaled physics;
// `tint` distinguishes the two players in a same-device round.
function _g40DrawUFO(ctx, x, y, scale, tint) {
  const s  = scale || 1
  const rx = G40_UFO_RX * s, ry = G40_UFO_RY * s
  const hull = tint || '#a855f7'
  const edge = tint || '#c084fc'

  // Tractor beam
  const bGrad = ctx.createLinearGradient(x, y + ry, x, y + ry + 32)
  bGrad.addColorStop(0, tint ? tint + '48' : 'rgba(168,85,247,0.28)')
  bGrad.addColorStop(1, tint ? tint + '00' : 'rgba(168,85,247,0)')
  ctx.beginPath()
  ctx.moveTo(x - rx * 0.45, y + ry)
  ctx.lineTo(x - rx,        y + ry + 32)
  ctx.lineTo(x + rx,        y + ry + 32)
  ctx.lineTo(x + rx * 0.45, y + ry)
  ctx.closePath()
  ctx.fillStyle = bGrad; ctx.fill()

  // Saucer body
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle   = '#1e0d38'
  ctx.shadowColor = hull; ctx.shadowBlur = 28
  ctx.fill(); ctx.shadowBlur = 0
  ctx.strokeStyle = edge; ctx.lineWidth = 2
  ctx.shadowColor = hull; ctx.shadowBlur = 12
  ctx.stroke(); ctx.shadowBlur = 0

  // Dome
  ctx.beginPath()
  ctx.ellipse(x, y - ry * 0.15, rx * 0.48, ry * 1.15, 0, Math.PI, 0)
  ctx.fillStyle = 'rgba(168,85,247,0.30)'; ctx.fill()
  ctx.strokeStyle = 'rgba(216,180,254,0.6)'; ctx.lineWidth = 1.2; ctx.stroke()

  // Rim lights
  const rimColors = ['#fbbf24', '#4ade80', '#fbbf24', '#06b6d4', '#fbbf24']
  for (let i = 0; i < 5; i++) {
    const t  = Math.PI * 0.08 + (i / 4) * Math.PI * 0.84
    const lx = x + Math.cos(t) * rx * 0.76
    const ly = y + Math.sin(t) * ry * 0.6
    ctx.beginPath(); ctx.arc(lx, ly, 2.2, 0, Math.PI * 2)
    ctx.fillStyle   = rimColors[i]
    ctx.shadowColor = rimColors[i]; ctx.shadowBlur = 8
    ctx.fill(); ctx.shadowBlur = 0
  }
}

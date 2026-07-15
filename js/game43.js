// ═══════════════════════════════════════════════════════
//  GAME 43 — WAVE GAUNTLET
//  Exact GD wave physics: hold = up 255px/s, release = down 255px/s.
//  Hitbox R=7 (same as Wave Dash / game35).
//  Easy: slow wide corridor feel. FP: exactly 1 frame of clearance.
//  Ol' Death Corridor: mini-wave (R=4), 5–6 FP-density pillars, max speed.
// ═══════════════════════════════════════════════════════

const G43_WAVE_SPD    = 255   // exact match to game35 G35_WAVE_SPD
const G43_WAVE_R_NRM  = 7     // exact match to game35 G35_PR
const G43_WAVE_R_MINI = 4     // GD size-change feel for DC tier
const G43_PILLAR_W    = 50

// gapFrac = fraction of canvas height (for easy/medium/hard — scales with screen).
// gapPx   = fixed pixels (for FP/DC — ensures exactly 1-frame clearance on any screen).
//
// With R=7 (diam=14px), G43_WAVE_SPD=255:
//   1 frame of clearance each side = 255 * (1/60) ≈ 4.25px
//   FP gapPx 24 → clearance = (24-14)/2 = 5px ≈ 1.2 frames ✓
//
// With miniWave R=4 (diam=8px):
//   DC gapPx 22 → clearance = (22-8)/2 = 7px ≈ 1.6 frames each obstacle
//   × 5–6 obstacles at max speed = total DC difficulty

const G43_POOL = {
  easy: [
    { name: 'WIDE GAP',    diff:'easy',   gapFrac:0.52,  count:1, spacing:420, speed:152 },
    { name: 'HIGH ROAD',   diff:'easy',   gapFrac:0.50,  count:1, spacing:420, speed:158, fixedCy:0.27 },
    { name: 'LOW ROAD',    diff:'easy',   gapFrac:0.50,  count:1, spacing:420, speed:158, fixedCy:0.73 },
    { name: 'DOUBLE WIDE', diff:'easy',   gapFrac:0.48,  count:2, spacing:430, speed:145 },
  ],
  medium: [
    { name: 'TIGHT',       diff:'medium', gapFrac:0.265, count:1, spacing:430, speed:238 },
    { name: 'ALTERNATING', diff:'medium', gapFrac:0.252, count:2, spacing:385, speed:230, alt:true },
    { name: 'TRIPLE',      diff:'medium', gapFrac:0.245, count:3, spacing:372, speed:248 },
    { name: 'SPEED BURST', diff:'medium', gapFrac:0.280, count:2, spacing:320, speed:348 },
  ],
  hard: [
    { name: 'NEEDLE',       diff:'hard',  gapFrac:0.142, count:1, spacing:445, speed:295 },
    { name: 'DUAL NEEDLE',  diff:'hard',  gapFrac:0.135, count:2, spacing:392, speed:308 },
    { name: 'GAUNTLET',     diff:'hard',  gapFrac:0.140, count:4, spacing:345, speed:315 },
    { name: 'SPEED NEEDLE', diff:'hard',  gapFrac:0.148, count:2, spacing:328, speed:405 },
  ],
  fp: [
    // count ALWAYS 1 — player makes exactly 1 frame-perfect click/release.
    { name: 'FRAME PERFECT', diff:'fp',  gapPx:24, count:1, spacing:480, speed:308, isFP:true },
    { name: 'HIGH FP',       diff:'fp',  gapPx:24, count:1, spacing:480, speed:312, isFP:true, fixedCy:0.34 },
    { name: 'LOW FP',        diff:'fp',  gapPx:24, count:1, spacing:480, speed:312, isFP:true, fixedCy:0.66 },
  ],
  dc: [
    // gapPx=22, miniWave R=4 → same per-obstacle feel as FP but ×5–6 in a row at max speed.
    { name: "OL' DEATH CORRIDOR", diff:'dc', gapPx:22, count:5, spacing:306, speed:440, isDC:true, miniWave:true },
    { name: 'THE CORRIDOR',       diff:'dc', gapPx:22, count:5, spacing:300, speed:450, isDC:true, miniWave:true, alt:true },
    { name: 'FULL CORRIDOR',      diff:'dc', gapPx:24, count:6, spacing:294, speed:460, isDC:true, miniWave:true },
  ],
}

const G43_DIFF_COL = { easy:'#4ade80', medium:'#fbbf24', hard:'#f87171', fp:'#c084fc', dc:'#ef4444' }
const G43_DIFF_BG  = { easy:'#01080a', medium:'#09080a', hard:'#0a0101', fp:'#04020a', dc:'#0a0101' }

const G43 = {
  active:false, phase:'idle',
  wy:0, wvy:0, holding:false,
  waveR: G43_WAVE_R_NRM,
  score:0, challenge:null,
  obstacles:[],
  trail:[],
  announceT:0, clearedT:0,
  deadT:0, showOver:false,
  shake:0,
  noclip:false, practiceDiff:null, hitFlash:0,
  raf:null, lastTime:0,
}
window._g43Score = 0

let _g43Canvas = null
function _g43C() {
  if (!_g43Canvas) _g43Canvas = document.getElementById('g43-canvas')
  return _g43Canvas
}

async function initGame43() {
  stopGame43()
  _g43Canvas = null
  document.getElementById('g43-overlay').style.display = 'flex'
  document.getElementById('g43-over').style.display    = 'none'
  await initCurby()
}
window.initGame43 = initGame43

function _g43Start(noclip, practiceDiff) {
  SFX.resume(); SFX.click()
  const c = _g43C()
  c.width  = c.parentElement.clientWidth
  c.height = c.parentElement.clientHeight
  document.getElementById('g43-overlay').style.display = 'none'
  document.getElementById('g43-over').style.display    = 'none'

  Object.assign(G43, {
    active:true, phase:'announce',
    wy:c.height / 2, wvy: G43_WAVE_SPD, holding:false,
    waveR: G43_WAVE_R_NRM,
    score:0, challenge:null, obstacles:[],
    trail:[],
    announceT:0, clearedT:0,
    deadT:0, showOver:false, shake:0,
    noclip:!!noclip, practiceDiff: practiceDiff || null, hitFlash:0,
  })
  window._g43Score = 0
  document.getElementById('g43-score-hud').textContent = noclip ? '—' : '0'

  _g43LoadChallenge(c.width, c.height)

  c.addEventListener('mousedown',  _g43On,  { passive:false })
  c.addEventListener('mouseup',    _g43Off)
  c.addEventListener('touchstart', _g43On,  { passive:false })
  c.addEventListener('touchend',   _g43Off, { passive:false })
  window.addEventListener('keydown', _g43KeyDn)
  window.addEventListener('keyup',   _g43KeyUp)

  G43.lastTime = performance.now()
  G43.raf = requestAnimationFrame(_g43Loop)
}

window.startWaveGauntlet         = function() { _g43Start(false, null) }
window.startWaveGauntletPractice = function(d) { _g43Start(true, d) }

window.stopGame43 = function() {
  G43.active = false
  if (G43.raf) { cancelAnimationFrame(G43.raf); G43.raf = null }
  const c = _g43C()
  if (c) {
    c.removeEventListener('mousedown',  _g43On)
    c.removeEventListener('mouseup',    _g43Off)
    c.removeEventListener('touchstart', _g43On)
    c.removeEventListener('touchend',   _g43Off)
  }
  window.removeEventListener('keydown', _g43KeyDn)
  window.removeEventListener('keyup',   _g43KeyUp)
}

function _g43On(e)    { e.preventDefault(); G43.holding = true }
function _g43Off(e)   { if (e.cancelable) e.preventDefault(); G43.holding = false }
function _g43KeyDn(e) { if (e.code==='Space'||e.key==='ArrowUp') { e.preventDefault(); G43.holding = true } }
function _g43KeyUp(e) { if (e.code==='Space'||e.key==='ArrowUp') G43.holding = false }

function _g43GetPool(score) {
  const {easy, medium, hard, fp, dc} = G43_POOL
  if (score < 3)  return [...easy]
  if (score < 5)  return [...easy, ...medium]
  if (score < 9)  return [...medium, ...hard, fp[0]]
  if (score < 13) return [...hard, ...fp]
  if (score < 17) return [...fp, dc[0]]
  return [...fp, ...dc, ...dc]
}

function _g43LoadChallenge(w, h) {
  let pool
  if (G43.noclip && G43.practiceDiff) {
    pool = G43_POOL[G43.practiceDiff] || G43_POOL.easy
  } else {
    pool = _g43GetPool(G43.score)
  }
  const tmpl = pool[qRandInt(pool.length)]
  G43.challenge = { ...tmpl }
  G43.waveR     = tmpl.miniWave ? G43_WAVE_R_MINI : G43_WAVE_R_NRM
  G43.trail     = []

  // gapPx (FP/DC) overrides gapFrac so the window is always exactly ~1 frame
  const gapPx  = tmpl.gapPx !== undefined ? tmpl.gapPx : Math.round(tmpl.gapFrac * h)
  const startX = w + 100

  const obstacles = []
  for (let i = 0; i < tmpl.count; i++) {
    let cy
    if (tmpl.fixedCy !== undefined) {
      cy = Math.round(tmpl.fixedCy * h)
    } else if (tmpl.alt) {
      const jitter = qRandInt(Math.round(h * 0.10))
      cy = i % 2 === 0
        ? Math.round(h * 0.26) + jitter
        : Math.round(h * 0.64) + jitter
    } else {
      const halfG = gapPx / 2
      const lo    = Math.round(halfG + 22)
      const hi    = Math.round(h - halfG - 22)
      cy          = lo + qRandInt(Math.max(1, hi - lo + 1))
    }
    obstacles.push({
      x:       startX + i * tmpl.spacing,
      cy,
      gapTop:  cy - gapPx / 2,
      gapBot:  cy + gapPx / 2,
      cleared: false,
    })
  }

  G43.obstacles = obstacles
  G43.phase     = 'announce'
  G43.announceT = 0
  G43.wy        = h / 2
  G43.wvy       = G43_WAVE_SPD   // start going down
  G43.hitFlash  = 0
}

function _g43Loop(ts) {
  if (!G43.active) return
  const dt = Math.min((ts - G43.lastTime) / 1000, 0.05)
  G43.lastTime = ts
  const c = _g43C(), w = c.width, h = c.height
  const waveX = Math.round(w * 0.22)
  const WR    = G43.waveR

  if (G43.shake    > 0) G43.shake    = Math.max(0, G43.shake    - dt * 4)
  if (G43.hitFlash > 0) G43.hitFlash = Math.max(0, G43.hitFlash - dt)

  // GD wave physics — instant direction, constant speed (exact game35 model)
  const waveStep = (clamp) => {
    G43.wvy = G43.holding ? -G43_WAVE_SPD : G43_WAVE_SPD
    G43.wy += G43.wvy * dt
    if (clamp) G43.wy = Math.max(WR + 2, Math.min(h - WR - 2, G43.wy))
  }

  // ── announce ─────────────────────────────────────────
  if (G43.phase === 'announce') {
    G43.announceT += dt
    if (G43.announceT >= 0.9) G43.phase = 'playing'

  // ── playing ──────────────────────────────────────────
  } else if (G43.phase === 'playing') {
    waveStep(false)

    G43.trail.push({ x: waveX, y: G43.wy })
    if (G43.trail.length > 32) G43.trail.shift()

    const spd = G43.challenge.speed
    let allClear = true
    for (const ob of G43.obstacles) {
      ob.x -= spd * dt
      if (!ob.cleared && ob.x + G43_PILLAR_W < waveX - WR) ob.cleared = true
      if (!ob.cleared) allClear = false
    }

    if (allClear && G43.obstacles.length > 0) {
      G43.phase    = 'cleared'
      G43.clearedT = 0
      if (!G43.noclip) {
        G43.score++
        window._g43Score = G43.score
        document.getElementById('g43-score-hud').textContent = G43.score
      }
      SFX.win()
    }

    // Collision
    let hit = G43.wy - WR < 0 || G43.wy + WR > h
    if (!hit) {
      for (const ob of G43.obstacles) {
        if (ob.cleared) continue
        const inX = waveX + WR > ob.x && waveX - WR < ob.x + G43_PILLAR_W
        if (inX && (G43.wy - WR < ob.gapTop || G43.wy + WR > ob.gapBot)) {
          hit = true; break
        }
      }
    }
    if (hit) {
      if (G43.noclip) {
        if (G43.hitFlash <= 0) { G43.hitFlash = 0.22; SFX.die() }
        G43.wy = Math.max(WR + 2, Math.min(h - WR - 2, G43.wy))
      } else {
        _g43Die()
      }
    }

  // ── cleared ──────────────────────────────────────────
  } else if (G43.phase === 'cleared') {
    G43.clearedT += dt
    waveStep(true)
    if (G43.clearedT >= 0.75) _g43LoadChallenge(w, h)

  // ── dead ─────────────────────────────────────────────
  } else if (G43.phase === 'dead') {
    G43.deadT += dt
    G43.wvy = G43_WAVE_SPD
    G43.wy += G43.wvy * dt
    if (G43.deadT >= 1.8 && !G43.showOver) {
      G43.showOver     = true
      window._g43Score = G43.score
      document.getElementById('g43-final-score').textContent =
        `${G43.score} clear${G43.score !== 1 ? 's' : ''}`
      document.getElementById('g43-over').style.display = 'flex'
    }
  }

  _g43Draw(c.getContext('2d'), w, h)
  if (G43.showOver) { G43.active = false; return }
  G43.raf = requestAnimationFrame(_g43Loop)
}

function _g43Die() {
  if (G43.phase === 'dead') return
  G43.phase = 'dead'; G43.deadT = 0; G43.shake = 1
  SFX.die()
  window.removeEventListener('keydown', _g43KeyDn)
  window.removeEventListener('keyup',   _g43KeyUp)
}

// ── draw ─────────────────────────────────────────────────

function _g43Draw(ctx, w, h) {
  ctx.save()

  if (G43.shake > 0) {
    const s = G43.shake * 7
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s)
  }

  const ch      = G43.challenge
  const mainCol = ch ? (G43_DIFF_COL[ch.diff] || '#22c55e') : '#22c55e'
  const bgCol   = ch ? (G43_DIFF_BG[ch.diff]  || '#01080a') : '#01080a'

  ctx.fillStyle = bgCol
  ctx.fillRect(-12, -12, w + 24, h + 24)

  // Subtle horizontal lines (Wave Dash corridor feel)
  ctx.strokeStyle = 'rgba(255,255,255,0.025)'
  ctx.lineWidth   = 1
  for (let y = 0; y < h; y += 28) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
  }

  // Floor and ceiling walls (like Wave Dash) ─────────────
  const WALL_H = 22
  const wallCol = ch && ch.isDC ? '#ef4444' : mainCol

  // Ceiling
  ctx.fillStyle = bgCol
  ctx.fillRect(0, 0, w, WALL_H)
  ctx.strokeStyle = wallCol; ctx.lineWidth = 2
  ctx.shadowColor = wallCol; ctx.shadowBlur = 8
  ctx.beginPath(); ctx.moveTo(0, WALL_H); ctx.lineTo(w, WALL_H); ctx.stroke()
  ctx.shadowBlur = 0

  // Floor
  ctx.fillStyle = bgCol
  ctx.fillRect(0, h - WALL_H, w, WALL_H)
  ctx.strokeStyle = wallCol; ctx.lineWidth = 2
  ctx.shadowColor = wallCol; ctx.shadowBlur = 8
  ctx.beginPath(); ctx.moveTo(0, h - WALL_H); ctx.lineTo(w, h - WALL_H); ctx.stroke()
  ctx.shadowBlur = 0

  const waveX = Math.round(w * 0.22)

  // Obstacles
  for (const ob of G43.obstacles) {
    if (!ob.cleared) _g43DrawPillar(ctx, ob, h, mainCol, ch && ch.isDC, ch && ch.isFP)
  }

  // Wave trail
  _g43DrawTrail(ctx, mainCol)

  // Wave
  const wAlpha = G43.phase === 'dead' ? Math.max(0, 1 - G43.deadT * 2.2) : 1
  ctx.globalAlpha = wAlpha
  _g43DrawWave(ctx, waveX, G43.wy, G43.waveR, mainCol)
  ctx.globalAlpha = 1

  // Noclip hit flash
  if (G43.noclip && G43.hitFlash > 0) {
    ctx.fillStyle = `rgba(239,68,68,${Math.min(0.30, G43.hitFlash * 2.0)})`
    ctx.fillRect(0, 0, w, h)
  }

  // Score / noclip badge
  ctx.textAlign = 'center'
  if (G43.noclip) {
    ctx.font = 'bold 11px monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.44)'
    ctx.fillText('NOCLIP — ' + (G43.practiceDiff || '').toUpperCase(), w / 2, 14)
  } else {
    ctx.font      = 'bold 26px monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.shadowColor = mainCol; ctx.shadowBlur = 16
    ctx.fillText(G43.score, w / 2, 44)
    ctx.shadowBlur  = 0
  }

  // Obstacle counter
  if ((G43.phase === 'playing' || G43.phase === 'cleared') && ch && ch.count > 1) {
    const done = G43.obstacles.filter(o => o.cleared).length
    ctx.textAlign = 'right'; ctx.font = '11px monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.28)'
    ctx.fillText(`${done}/${ch.count}`, w - 8, 44)
  }

  // ── Announce overlay ─────────────────────────────────
  if (G43.phase === 'announce' && ch) {
    const a = Math.min(1, G43.announceT * 7)
    ctx.globalAlpha = a
    ctx.fillStyle   = 'rgba(0,0,0,0.60)'
    ctx.fillRect(0, 0, w, h)

    ctx.textAlign = 'center'
    ctx.font      = 'bold 12px monospace'
    ctx.fillStyle = mainCol
    ctx.shadowColor = mainCol; ctx.shadowBlur = 12
    ctx.fillText(ch.diff.toUpperCase(), w / 2, h / 2 - 50)

    ctx.font      = `bold ${ch.isDC ? 20 : ch.isFP ? 23 : 28}px monospace`
    ctx.fillStyle = ch.isDC ? '#fca5a5' : ch.isFP ? '#e9d5ff' : '#ffffff'
    ctx.shadowColor = mainCol; ctx.shadowBlur = 24
    ctx.fillText(ch.name, w / 2, h / 2 - 12)
    ctx.shadowBlur = 0

    ctx.font = '12px monospace'; ctx.fillStyle = 'rgba(255,255,255,0.36)'
    ctx.fillText('hold SPACE / click-hold to fly up', w / 2, h / 2 + 18)

    if (ch.isFP) {
      ctx.font = '11px monospace'
      ctx.fillStyle = 'rgba(216,180,254,0.75)'
      ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 6
      ctx.fillText('⚡ 1 click at the exact right moment', w / 2, h / 2 + 38)
      ctx.shadowBlur = 0
    } else if (ch.isDC) {
      ctx.font = '11px monospace'
      ctx.fillStyle = 'rgba(252,165,165,0.75)'
      ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 6
      ctx.fillText('⚡ mini wave · ' + ch.count + ' FP-density pillars · max speed', w / 2, h / 2 + 38)
      ctx.shadowBlur = 0
    }

    if (G43.noclip) {
      ctx.font = '11px monospace'; ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.fillText('noclip active — walls won\'t kill you', w / 2, h / 2 + 58)
    }

    ctx.globalAlpha = 1
  }

  // ── Cleared overlay ──────────────────────────────────
  if (G43.phase === 'cleared') {
    const t = G43.clearedT
    const a = Math.min(1, t * 8) * Math.max(0, 1 - (t - 0.25) * 5.5)
    if (a > 0.01) {
      ctx.globalAlpha = a
      ctx.textAlign   = 'center'
      ctx.font        = 'bold 36px monospace'
      ctx.fillStyle   = '#4ade80'
      ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 30
      ctx.fillText('CLEARED!', w / 2, h / 2)
      ctx.shadowBlur  = 0
      ctx.globalAlpha = 1
    }
  }

  ctx.restore()
}

function _g43DrawTrail(ctx, col) {
  const t = G43.trail
  if (t.length < 2) return
  for (let i = 1; i < t.length; i++) {
    const a = (i / t.length)
    ctx.globalAlpha = a * a * 0.6
    ctx.strokeStyle = col
    ctx.lineWidth   = (i / t.length) * 2.5
    ctx.shadowColor = col; ctx.shadowBlur = 3
    ctx.beginPath()
    ctx.moveTo(t[i-1].x, t[i-1].y)
    ctx.lineTo(t[i].x,   t[i].y)
    ctx.stroke()
    ctx.shadowBlur = 0
  }
  ctx.globalAlpha = 1
}

function _g43DrawPillar(ctx, ob, h, col, isDC, isFP) {
  const cap    = 14
  const capOvr = 5
  const WALL_H = 22

  const drawBlock = (bx, by, bw, bh, capSide) => {
    if (bh <= 0) return
    ctx.fillStyle = isDC ? '#0e0101' : '#020e06'
    ctx.fillRect(bx, by, bw, bh)
    ctx.strokeStyle = col; ctx.lineWidth = 1.6
    ctx.shadowColor = col; ctx.shadowBlur = 8
    ctx.strokeRect(bx + 0.8, by, bw - 1.6, bh)
    ctx.shadowBlur = 0

    const cy = capSide === 'bot' ? by : by + bh - cap
    ctx.fillStyle = isDC ? '#1a0202' : '#051a09'
    ctx.fillRect(bx - capOvr, cy, bw + capOvr * 2, cap)
    ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 6
    ctx.strokeRect(bx - capOvr + 0.8, cy, bw + capOvr * 2 - 1.6, cap)
    ctx.shadowBlur = 0
  }

  drawBlock(ob.x, WALL_H,     G43_PILLAR_W, ob.gapTop - WALL_H,     'bot')
  drawBlock(ob.x, ob.gapBot,  G43_PILLAR_W, h - WALL_H - ob.gapBot, 'top')

  // Gap tint + aim guide
  const gapH = ob.gapBot - ob.gapTop
  if (gapH > 0) {
    ctx.fillStyle = isFP
      ? 'rgba(192,132,252,0.12)'
      : isDC
        ? 'rgba(239,68,68,0.08)'
        : 'rgba(34,197,94,0.04)'
    ctx.fillRect(ob.x, ob.gapTop, G43_PILLAR_W, gapH)

    // Center aim line (always for FP/DC, only for tight hard)
    if (isFP || isDC || gapH < 65) {
      ctx.strokeStyle = isFP
        ? 'rgba(216,180,254,0.55)'
        : isDC
          ? 'rgba(252,165,165,0.45)'
          : 'rgba(134,239,172,0.35)'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 5])
      ctx.beginPath()
      ctx.moveTo(ob.x, ob.cy); ctx.lineTo(ob.x + G43_PILLAR_W, ob.cy)
      ctx.stroke(); ctx.setLineDash([])
    }
  }
}

function _g43DrawWave(ctx, x, y, R, col) {
  // Tilt ±45° based on direction, like real GD wave
  const tilt = G43.wvy < 0 ? -Math.PI * 0.25 : Math.PI * 0.25

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(tilt)

  // Outer glow
  ctx.beginPath()
  ctx.arc(0, 0, R * 2.6, 0, Math.PI * 2)
  ctx.fillStyle = col + '1a'; ctx.fill()

  // Triangle body
  ctx.beginPath()
  ctx.moveTo( R * 1.5,  0)
  ctx.lineTo(-R * 1.0, -R * 0.78)
  ctx.lineTo(-R * 0.35, 0)
  ctx.lineTo(-R * 1.0,  R * 0.78)
  ctx.closePath()
  ctx.fillStyle   = '#ffffff'
  ctx.shadowColor = col; ctx.shadowBlur = 20
  ctx.fill()
  ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.stroke()
  ctx.shadowBlur  = 0

  ctx.restore()
}

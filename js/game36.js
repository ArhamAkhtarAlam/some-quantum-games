// ═══════════════════════════════════════════════════════
//  GAME 36 — GD MIX
//  Geometry Dash-style: cube · ship · wave modes
//  Inspired by Stereo Madness + Base After Base
// ═══════════════════════════════════════════════════════

const G36_ROWS = 12  // grid rows (floor at row 11)
let G36 = {}
window._g36Score = 0
let _g36Canvas = null

function _g36C() {
  if (!_g36Canvas) _g36Canvas = document.getElementById('g36-canvas')
  return _g36Canvas
}

// ─── Input ─────────────────────────────────────────────
let _g36Holding = false
function _g36KD(e) { if (['Space','ArrowUp','KeyW'].includes(e.code)) { e.preventDefault(); _g36Press() } }
function _g36KU(e) { if (['Space','ArrowUp','KeyW'].includes(e.code)) { _g36Holding = false } }
function _g36MD()  { _g36Press() }
function _g36MU()  { _g36Holding = false }
function _g36TD(e) { e.preventDefault(); _g36Press() }
function _g36TU(e) { e.preventDefault(); _g36Holding = false }

function _g36Press() {
  _g36Holding = true
  if (G36.mode === 'cube' && G36.onGround && G36.active && !G36.dead) {
    _g36CubeJump()
  }
}

function _g36CubeJump() {
  G36.vy = G36_JUMP_V * G36.B * G36.gravDir
  G36.onGround = false
  SFX.jump()
}

// ─── Stop ───────────────────────────────────────────────
function stopGame36() {
  if (G36.raf) { cancelAnimationFrame(G36.raf); G36.raf = null }
  G36.active = false
  document.removeEventListener('keydown', _g36KD)
  document.removeEventListener('keyup',   _g36KU)
  const c = _g36C()
  if (c) {
    c.removeEventListener('mousedown',  _g36MD)
    c.removeEventListener('mouseup',    _g36MU)
    c.removeEventListener('touchstart', _g36TD)
    c.removeEventListener('touchend',   _g36TU)
  }
}
window.stopGame36 = stopGame36

// ─── Init ───────────────────────────────────────────────
window.initGame36 = async function() {
  stopGame36()
  _g36Canvas = null
  document.getElementById('g36-over').classList.remove('show')
  document.getElementById('g36-overlay').style.display = 'flex'
  await initCurby()
}

// ─── Level Data ─────────────────────────────────────────
function _g36BuildLevel() {
  const FLOOR = G36_ROWS - 1
  const su = (bx, by=FLOOR-1) => ({ bx, by, type:'spike_up' })
  const sd = (bx, by=1)       => ({ bx, by, type:'spike_dn' })
  const bl = (bx, by, w=1, h=1) => ({ bx, by, w, h, type:'block' })

  return {
    totalBlocks: 255,

    obstacles: [
      // ── Section 1: Cube (0–60) ──
      su(8), su(9),
      bl(14, FLOOR-4, 3, 1),
      su(17),
      su(22), su(23), su(24),
      su(30), su(31), su(32),
      su(40), su(41), su(42), su(43),
      bl(48, FLOOR-4, 2, 1),
      su(50), su(51),
      bl(52, FLOOR-2, 1, 2),
      su(55), su(56), su(57),

      // ── Section 2: Ship (60–100) ──
      bl(65, 0, 4, 3),
      bl(65, FLOOR-3, 4, 3),
      sd(73), sd(74),
      su(78), su(79),
      bl(83, 0, 5, 4),
      bl(83, FLOOR-4, 5, 4),
      sd(91), sd(92), sd(93),
      su(95), su(96), su(97),

      // ── Section 3: Cube (100–140) ──
      su(105), su(106), su(107), su(108),
      bl(112, FLOOR-3, 2, 1),
      su(114), su(115),
      bl(118, FLOOR-5, 3, 1),
      su(122), su(123),
      su(126), su(127), su(128),

      // ── Section 4: Anti-gravity Cube (140–175) ──
      sd(143), sd(144),
      sd(147), sd(148),
      su(150),
      sd(152), sd(153), sd(154),
      bl(157, 0, 2, 3),
      sd(160), sd(161),
      bl(165, 0, 2, 2),
      sd(168), sd(169), sd(170),

      // ── Section 5: Wave (175–210) — walls handled separately ──

      // ── Section 6: Final Ship (210–255) ──
      sd(213), sd(214),
      su(215), su(216),
      bl(218, 0, 6, 4),
      bl(218, FLOOR-4, 6, 4),
      sd(226), sd(227),
      su(228), su(229),
      bl(232, 0, 4, 3),
      bl(232, FLOOR-5, 4, 5),
      sd(238), sd(239), sd(240),
      su(241), su(242), su(243),
      bl(246, 0, 5, 5),
      bl(246, FLOOR-5, 5, 5),
      sd(252), sd(253),
      su(252), su(253),
    ],

    pads: [
      { bx: 39,  by: FLOOR-1, color: 'yellow' },  // right before the 40–43 spike run
      { bx: 104, by: FLOOR-1, color: 'yellow' },  // right before the 105–108 spike run
    ],

    modeChanges: [
      { bx:   0, mode: 'cube' },
      { bx:  60, mode: 'ship' },
      { bx: 100, mode: 'cube' },
      { bx: 140, mode: 'cube' },
      { bx: 175, mode: 'wave' },
      { bx: 210, mode: 'ship' },
    ],

    gravChanges: [
      { bx: 140, dir: -1 },
      { bx: 172, dir:  1 },
    ],
  }
}

function _g36BuildWaveWalls() {
  const WAVE_START = 175, WAVE_END = 210
  const FLOOR = G36_ROWS - 1
  const walls = {}
  for (let bx = WAVE_START; bx <= WAVE_END; bx++) {
    const t = (bx - WAVE_START) / (WAVE_END - WAVE_START)
    const centerRow = 5.5 + Math.sin(t * Math.PI * 4) * 2.5
    const halfGap   = 2
    walls[bx] = {
      topRow: Math.max(1, centerRow - halfGap),
      botRow: Math.min(FLOOR - 1, centerRow + halfGap),
    }
  }
  return walls
}

// ─── Physics constants (in blocks/sec) ──────────────────
const G36_SPEED    = 8.0
const G36_JUMP_V   = -17.0   // blocks/sec upward (negated by gravDir)
const G36_GRAVITY  = 55.0    // blocks/sec²
const G36_TERM     = 18.0    // blocks/sec terminal velocity
const G36_SHIP_THR = -22.0   // blocks/sec² thrust
const G36_SHIP_GRV = 12.0    // blocks/sec² ship gravity
const G36_SHIP_MAX = 14.0    // blocks/sec max ship speed
const G36_WAVE_SPD = 8.0     // blocks/sec wave diagonal (45 degrees vs horizontal speed)
const G36_YPAD_V   = -24.5   // yellow pad launch (blocks/sec)
const G36_PR       = 0.35    // player half-size in blocks
const G36_TRAIL_MAX = 34
const G36_THEMES = [
  { at: 0,   bg0:'#111827', bg1:'#0e7490', tile:'#164e63', edge:'#22d3ee', accent:'#00e5ff' },
  { at: 60,  bg0:'#24111f', bg1:'#9a3412', tile:'#57231a', edge:'#fb923c', accent:'#ff6b35' },
  { at: 100, bg0:'#06261f', bg1:'#047857', tile:'#064e3b', edge:'#34d399', accent:'#4ade80' },
  { at: 140, bg0:'#20123a', bg1:'#6d28d9', tile:'#3b1f68', edge:'#c084fc', accent:'#a78bfa' },
  { at: 175, bg0:'#082f49', bg1:'#0f766e', tile:'#164e63', edge:'#38bdf8', accent:'#22d3ee' },
  { at: 210, bg0:'#2b0f1e', bg1:'#9f1239', tile:'#581c2c', edge:'#fb7185', accent:'#f43f5e' },
]

// ─── Start ──────────────────────────────────────────────
window.startGDMix = function() {
  SFX.resume()
  const c = _g36C()
  c.width  = c.parentElement.clientWidth
  c.height = c.parentElement.clientHeight
  document.getElementById('g36-overlay').style.display = 'none'

  const B  = Math.min(c.height / G36_ROWS, c.width / 22)
  const FLOOR_ROW = G36_ROWS - 1

  G36 = {
    active:    true,
    worldX:    0,
    y:         (FLOOR_ROW - G36_PR - 0.01) * B,
    vy:        0,
    onGround:  true,
    dead:      false,
    score:     0,
    attempts:  (G36.attempts || 0) + 1,
    bestProg:  G36.bestProg || 0,
    progress:  0,
    time:      0,
    mode:      'cube',
    gravDir:   1,
    cx:        Math.floor(c.width * 0.25),
    B,
    H:         c.height,
    level:     _g36BuildLevel(),
    waveWalls: _g36BuildWaveWalls(),
    deathTimer: 0,
    portalFlash: 0,
    trail:     [],
    raf:       null,
    lastTime:  0,
    // track which mode/grav changes have fired
    _mcFired:  {},
    _gcFired:  {},
    _padFired: {},
  }

  _g36Holding = false
  document.getElementById('g36-score-hud').textContent = '0%'
  document.addEventListener('keydown',   _g36KD)
  document.addEventListener('keyup',     _g36KU)
  c.addEventListener('mousedown',  _g36MD)
  c.addEventListener('mouseup',    _g36MU)
  c.addEventListener('touchstart', _g36TD, { passive: false })
  c.addEventListener('touchend',   _g36TU, { passive: false })

  G36.lastTime = performance.now()
  G36.raf = requestAnimationFrame(_g36Loop)
}

// ─── Update ─────────────────────────────────────────────
function _g36Update(dt) {
  const g = G36, B = g.B
  const FLOOR_ROW = G36_ROWS - 1
  const PR = G36_PR * B

  g.time += dt
  if (g.portalFlash > 0) g.portalFlash = Math.max(0, g.portalFlash - dt)

  if (g.dead) {
    g.deathTimer -= dt
    if (g.deathTimer <= 0) _g36Restart()
    return
  }

  g.worldX += G36_SPEED * B * dt
  g.progress = Math.min(100, (g.worldX / (g.level.totalBlocks * B)) * 100)
  if (g.progress > g.bestProg) g.bestProg = g.progress
  document.getElementById('g36-score-hud').textContent = Math.floor(g.progress) + '%'

  if (g.worldX >= g.level.totalBlocks * B) { _g36Win(); return }

  // Fire mode/grav changes by world position
  const bxNow = g.worldX / B
  for (const mc of g.level.modeChanges) {
    if (!g._mcFired[mc.bx] && bxNow >= mc.bx) {
      g._mcFired[mc.bx] = true
      const wasMode = g.mode
      g.mode = mc.mode
      g.portalFlash = 0.22
      if (mc.mode === 'ship') g.vy = 0
      if (mc.mode === 'cube' && wasMode === 'ship') g.vy = Math.max(g.vy, 0)
      SFX.whoosh()
    }
  }
  for (const gc of g.level.gravChanges) {
    if (!g._gcFired[gc.bx] && bxNow >= gc.bx) {
      g._gcFired[gc.bx] = true
      g.gravDir = gc.dir
      g.vy = 0
      g.portalFlash = 0.22
      SFX.whoosh()
    }
  }

  // Pad collision
  for (const pad of g.level.pads) {
    if (g._padFired[pad.bx]) continue
    const padWX = pad.bx * B
    const padY  = pad.by * B + B * 0.5
    if (Math.abs(g.worldX - padWX) < PR * 1.5 && Math.abs(g.y - padY) < B) {
      g._padFired[pad.bx] = true
      if (pad.color === 'yellow' && g.mode !== 'wave') {
        g.vy = G36_YPAD_V * B * g.gravDir
        g.onGround = false
        SFX.jump()
      } else if (pad.color === 'blue') {
        g.gravDir *= -1
        g.vy = 0
        SFX.jump()
      }
    }
  }

  // ── Mode physics ──
  if (g.mode === 'cube') {
    g.vy += G36_GRAVITY * B * g.gravDir * dt
    if (g.gravDir ===  1) g.vy = Math.min(g.vy,  G36_TERM * B)
    else                  g.vy = Math.max(g.vy, -G36_TERM * B)
    g.y += g.vy * dt

    const floorY = FLOOR_ROW * B - PR
    const ceilY  = B + PR
    if (g.gravDir === 1 && g.y >= floorY) {
      g.y = floorY; g.vy = 0; g.onGround = true
    } else if (g.gravDir === -1 && g.y <= ceilY) {
      g.y = ceilY; g.vy = 0; g.onGround = true
    } else {
      g.onGround = false
    }
    if (_g36Holding && g.onGround) _g36CubeJump()

  } else if (g.mode === 'ship') {
    const thr = _g36Holding ? G36_SHIP_THR : G36_SHIP_GRV
    g.vy += thr * B * g.gravDir * dt
    g.vy = Math.max(-G36_SHIP_MAX * B, Math.min(G36_SHIP_MAX * B, g.vy))
    g.y += g.vy * dt
    g.onGround = false
    const floorY = (FLOOR_ROW - 1) * B
    const ceilY  = B
    if (g.y + PR > floorY) {
      g.y = floorY - PR
      if (g.vy > 0) g.vy = 0
    }
    if (g.y - PR < ceilY) {
      g.y = ceilY + PR
      if (g.vy < 0) g.vy = 0
    }

  } else if (g.mode === 'wave') {
    g.vy = (_g36Holding ? -1 : 1) * G36_WAVE_SPD * B * g.gravDir
    g.y += g.vy * dt
    g.onGround = false
    const bxI = Math.floor(bxNow)
    const ww  = g.waveWalls[bxI]
    if (ww && (g.y - PR < ww.topRow * B || g.y + PR > ww.botRow * B)) {
      _g36Die(); return
    }
    if (g.y - PR < B || g.y + PR > (FLOOR_ROW - 1) * B) { _g36Die(); return }
  }

  // ── Obstacle collision ──
  const bxI = Math.floor(bxNow)
  const PR2 = PR * 0.74
  for (const obs of g.level.obstacles) {
    if (Math.abs(obs.bx - bxI) > 3) continue
    const ox = obs.bx * B, oy = obs.by * B
    const ow = (obs.w || 1) * B, oh = (obs.h || 1) * B

    if (obs.type === 'spike_up') {
      const sx = ox + B * 0.15, sw = B * 0.7, sy = oy + B * 0.2, sh = B * 0.8
      if (_g36AABB(g.worldX - PR2, g.y - PR2, PR2*2, PR2*2, sx, sy, sw, sh)) { _g36Die(); return }
    } else if (obs.type === 'spike_dn') {
      const sx = ox + B * 0.15, sw = B * 0.7, sy = oy, sh = B * 0.8
      if (_g36AABB(g.worldX - PR2, g.y - PR2, PR2*2, PR2*2, sx, sy, sw, sh)) { _g36Die(); return }
    } else if (obs.type === 'block') {
      const pl = g.worldX - PR2, pr2 = g.worldX + PR2
      const pt = g.y      - PR2, pb  = g.y      + PR2
      if (pl < ox+ow && pr2 > ox && pt < oy+oh && pb > oy) {
        const overT = (oy + oh) - pt
        const overB = pb - oy
        const overL = (ox + ow) - pl
        const overR = pr2 - ox
        const minO  = Math.min(overT, overB, overL, overR)
        if (minO === overT && g.vy < 0) {
          g.y = oy + oh + PR2; g.vy = 0
          if (g.mode === 'cube' && g.gravDir === -1) g.onGround = true
        } else if (minO === overB && g.vy > 0) {
          g.y = oy - PR2; g.vy = 0
          if (g.mode === 'cube' && g.gravDir === 1) g.onGround = true
        } else {
          _g36Die(); return
        }
      }
    }
  }

  g.trail.push({ x: g.worldX, y: g.y, mode: g.mode, t: g.time })
  if (g.trail.length > G36_TRAIL_MAX) g.trail.splice(0, g.trail.length - G36_TRAIL_MAX)
}

function _g36AABB(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx+bw && ax+aw > bx && ay < by+bh && ay+ah > by
}

// ─── Die / Restart / Win ─────────────────────────────────
function _g36Die() {
  if (G36.dead) return
  SFX.die()
  G36.dead = true
  G36.deathTimer = 0.7
}

function _g36Restart() {
  const bestProg = G36.bestProg
  stopGame36()
  window.startGDMix()
  G36.bestProg = bestProg
}

function _g36Win() {
  SFX.win()
  stopGame36()
  window._g36Score = 1000
  document.getElementById('g36-final-score').textContent = '100% — Complete!'
  renderMedalDisplay('g36-medal-display', 'gdmix', 1000)
  document.getElementById('g36-over').classList.add('show')
}

// ─── Loop ──────────────────────────────────────────────
function _g36Loop(ts) {
  if (!G36.active) return
  const dt = Math.min((ts - G36.lastTime) / 1000, 0.05)
  G36.lastTime = ts
  _g36Update(dt)
  if (G36.active) {
    _g36Draw()
    G36.raf = requestAnimationFrame(_g36Loop)
  }
}

// ─── Draw ──────────────────────────────────────────────
function _g36ThemeFor(bx) {
  let theme = G36_THEMES[0]
  for (const t of G36_THEMES) if (bx >= t.at) theme = t
  return theme
}

function _g36DrawTileBand(ctx, y, h, W, B, offX, theme) {
  ctx.fillStyle = theme.tile
  ctx.fillRect(0, y, W, h)
  for (let i = -1; i < Math.ceil(W / B) + 2; i++) {
    const x = i * B - offX
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)'
    ctx.fillRect(x, y, B, h)
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.strokeRect(x + 0.5, y + 0.5, B - 1, h - 1)
  }
  ctx.fillStyle = theme.edge
  ctx.shadowColor = theme.edge
  ctx.shadowBlur = 8
  ctx.fillRect(0, y, W, Math.max(2, B * 0.07))
  ctx.shadowBlur = 0
}

function _g36DrawBlock(ctx, sx, sy, ow, oh, B, theme) {
  ctx.fillStyle = theme.tile
  ctx.fillRect(sx, sy, ow, oh)
  const cols = Math.ceil(ow / B)
  const rows = Math.ceil(oh / B)
  for (let ix = 0; ix < cols; ix++) {
    for (let iy = 0; iy < rows; iy++) {
      const x = sx + ix * B, y = sy + iy * B
      ctx.fillStyle = (ix + iy) % 2 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.09)'
      ctx.fillRect(x, y, B, B)
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.strokeRect(x + 0.5, y + 0.5, B - 1, B - 1)
    }
  }
  ctx.strokeStyle = theme.edge
  ctx.lineWidth = 2
  ctx.shadowColor = theme.edge
  ctx.shadowBlur = 5
  ctx.strokeRect(sx + 1, sy + 1, ow - 2, oh - 2)
  ctx.shadowBlur = 0
  ctx.lineWidth = 1
}

function _g36DrawSpike(ctx, sx, sy, B, down) {
  const grd = ctx.createLinearGradient(0, sy, 0, sy + B)
  grd.addColorStop(0, down ? '#fef08a' : '#fff7ad')
  grd.addColorStop(1, '#facc15')
  ctx.fillStyle = grd
  ctx.strokeStyle = '#fff7ad'
  ctx.lineWidth = 2
  ctx.shadowColor = '#facc15'
  ctx.shadowBlur = 10
  ctx.beginPath()
  if (down) {
    ctx.moveTo(sx + B * 0.5, sy + B * 0.98)
    ctx.lineTo(sx + B * 0.06, sy + B * 0.05)
    ctx.lineTo(sx + B * 0.94, sy + B * 0.05)
  } else {
    ctx.moveTo(sx + B * 0.5, sy + B * 0.02)
    ctx.lineTo(sx + B * 0.06, sy + B * 0.95)
    ctx.lineTo(sx + B * 0.94, sy + B * 0.95)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.lineWidth = 1
}

function _g36DrawPad(ctx, sx, sy, B, pad, fired) {
  const cx = sx + B * 0.5
  const cy = sy + B * 0.68
  const pulse = fired ? 0.75 : 1 + Math.sin(G36.time * 8) * 0.06
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(pulse, pulse)
  ctx.fillStyle = '#facc15'
  ctx.strokeStyle = '#fff7ad'
  ctx.shadowColor = '#facc15'
  ctx.shadowBlur = fired ? 4 : 16
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.ellipse(0, 0, B * 0.43, B * 0.18, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#78350f'
  ctx.beginPath()
  ctx.ellipse(0, 0, B * 0.22, B * 0.08, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff7ad'
  ctx.beginPath()
  ctx.moveTo(0, -B * 0.58)
  ctx.lineTo(B * 0.22, -B * 0.25)
  ctx.lineTo(B * 0.08, -B * 0.25)
  ctx.lineTo(B * 0.08, -B * 0.06)
  ctx.lineTo(-B * 0.08, -B * 0.06)
  ctx.lineTo(-B * 0.08, -B * 0.25)
  ctx.lineTo(-B * 0.22, -B * 0.25)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  ctx.shadowBlur = 0
  ctx.lineWidth = 1
}

function _g36DrawModePortal(ctx, sx, B, floorRow, mode, time) {
  const col = { cube:'#00e5ff', ship:'#ff6b35', wave:'#4ade80' }[mode] || '#fff'
  const cy = floorRow * B * 0.5
  const spin = (time * 2.4) % (Math.PI * 2)
  ctx.save()
  ctx.translate(sx + B * 0.5, cy)
  ctx.strokeStyle = col
  ctx.shadowColor = col
  ctx.shadowBlur = 14
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.ellipse(0, 0, B * 0.42, B * 1.75, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = 2
  ctx.rotate(spin)
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3)
    ctx.beginPath()
    ctx.moveTo(0, -B * 1.45)
    ctx.lineTo(0, -B * 1.15)
    ctx.stroke()
  }
  ctx.rotate(-spin)
  ctx.fillStyle = '#fff'
  ctx.font = `bold ${Math.floor(B * 0.28)}px monospace`
  ctx.textAlign = 'center'
  ctx.fillText(mode[0].toUpperCase(), 0, B * 0.1)
  ctx.restore()
  ctx.shadowBlur = 0
  ctx.lineWidth = 1
  ctx.textAlign = 'left'
}

function _g36DrawGravityPortal(ctx, sx, B, floorRow, dir, time) {
  const col = dir === -1 ? '#facc15' : '#38bdf8'
  const cy = floorRow * B * 0.5
  const arrow = dir === -1 ? '↑' : '↓'
  ctx.save()
  ctx.translate(sx + B * 0.5, cy)
  ctx.strokeStyle = col
  ctx.shadowColor = col
  ctx.shadowBlur = 14
  ctx.lineWidth = 4
  ctx.setLineDash([B * 0.16, B * 0.12])
  ctx.lineDashOffset = -time * B * 2
  ctx.beginPath()
  ctx.ellipse(0, 0, B * 0.45, B * 1.9, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = '#fff'
  ctx.font = `bold ${Math.floor(B * 0.5)}px monospace`
  ctx.textAlign = 'center'
  ctx.fillText(arrow, 0, B * 0.17)
  ctx.restore()
  ctx.shadowBlur = 0
  ctx.lineWidth = 1
  ctx.textAlign = 'left'
}

function _g36DrawTrail(ctx, g, wx2sx) {
  if (g.trail.length < 2) return
  ctx.save()
  ctx.lineCap = 'round'
  for (let i = 1; i < g.trail.length; i++) {
    const a = g.trail[i - 1], b = g.trail[i]
    const alpha = (i / g.trail.length) * 0.38
    const col = { cube:'0,229,255', ship:'255,107,53', wave:'74,222,128' }[b.mode] || '255,255,255'
    ctx.strokeStyle = `rgba(${col},${alpha})`
    ctx.lineWidth = (G36_PR * g.B * 1.5) * (i / g.trail.length)
    ctx.beginPath()
    ctx.moveTo(wx2sx(a.x), a.y)
    ctx.lineTo(wx2sx(b.x), b.y)
    ctx.stroke()
  }
  ctx.restore()
}

function _g36DrawPlayer(ctx, g) {
  const B = g.B
  const PR = G36_PR * B
  ctx.save()
  ctx.translate(g.cx, g.y)

  if (g.mode === 'cube') {
    ctx.rotate((g.worldX / B) * (Math.PI / 2) * g.gravDir)
    ctx.fillStyle = '#00e5ff'
    ctx.strokeStyle = '#ecfeff'
    ctx.shadowColor = '#00e5ff'
    ctx.shadowBlur = 14
    ctx.lineWidth = 3
    ctx.fillRect(-PR, -PR, PR * 2, PR * 2)
    ctx.strokeRect(-PR, -PR, PR * 2, PR * 2)
    ctx.shadowBlur = 0
    ctx.fillStyle = '#053242'
    ctx.fillRect(-PR * 0.45, -PR * 0.35, PR * 0.24, PR * 0.24)
    ctx.fillRect(PR * 0.2, -PR * 0.35, PR * 0.24, PR * 0.24)
    ctx.fillRect(-PR * 0.38, PR * 0.22, PR * 0.76, PR * 0.16)
  } else if (g.mode === 'ship') {
    ctx.rotate(Math.atan2(g.vy, G36_SPEED * B) * 0.45)
    if (_g36Holding) {
      ctx.fillStyle = '#facc15'
      ctx.shadowColor = '#f97316'
      ctx.shadowBlur = 15
      ctx.beginPath()
      ctx.moveTo(-PR * 1.1, 0)
      ctx.lineTo(-PR * 1.9, -PR * 0.36)
      ctx.lineTo(-PR * 1.7, 0)
      ctx.lineTo(-PR * 1.9, PR * 0.36)
      ctx.closePath()
      ctx.fill()
      ctx.shadowBlur = 0
    }
    ctx.fillStyle = '#ff6b35'
    ctx.strokeStyle = '#ffedd5'
    ctx.shadowColor = '#ff6b35'
    ctx.shadowBlur = 14
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(PR * 1.45, 0)
    ctx.lineTo(-PR * 0.75, -PR * 0.78)
    ctx.lineTo(-PR * 1.05, 0)
    ctx.lineTo(-PR * 0.75, PR * 0.78)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#38bdf8'
    ctx.beginPath()
    ctx.arc(PR * 0.15, 0, PR * 0.32, 0, Math.PI * 2)
    ctx.fill()
  } else if (g.mode === 'wave') {
    ctx.rotate(_g36Holding ? -Math.PI / 4 : Math.PI / 4)
    ctx.fillStyle = '#4ade80'
    ctx.strokeStyle = '#dcfce7'
    ctx.shadowColor = '#4ade80'
    ctx.shadowBlur = 14
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(PR * 1.25, 0)
    ctx.lineTo(-PR * 0.85, -PR * 0.85)
    ctx.lineTo(-PR * 0.35, 0)
    ctx.lineTo(-PR * 0.85, PR * 0.85)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  ctx.restore()
  ctx.shadowBlur = 0
  ctx.lineWidth = 1
}

function _g36Draw() {
  const c   = _g36C()
  const ctx = c.getContext('2d')
  const W = c.width, H = c.height
  const g = G36, B = g.B
  const FLOOR_ROW = G36_ROWS - 1
  const bxNow = g.worldX / B
  const theme = _g36ThemeFor(bxNow)
  const offX = g.worldX % B
  const wx2sx = wx => g.cx + (wx - g.worldX)

  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, theme.bg0)
  bg.addColorStop(1, theme.bg1)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = 'rgba(255,255,255,0.07)'
  ctx.lineWidth = 1
  for (let i = 0; i < Math.ceil(W / B) + 2; i++) {
    const x = i * B - offX
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
  }
  for (let row = 0; row <= G36_ROWS; row++) {
    const y = row * B
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
  }

  _g36DrawTileBand(ctx, FLOOR_ROW * B, B, W, B, offX, theme)
  _g36DrawTileBand(ctx, 0, B, W, B, offX, theme)

  if (g.worldX > 174 * B) {
    for (let bx = 175; bx <= 210; bx++) {
      const ww = g.waveWalls[bx]
      if (!ww) continue
      const sx = wx2sx(bx * B)
      if (sx + B < 0 || sx > W) continue
      ctx.fillStyle = 'rgba(8,47,73,0.82)'
      ctx.fillRect(sx, B, B, ww.topRow * B - B)
      ctx.fillRect(sx, ww.botRow * B, B, FLOOR_ROW * B - ww.botRow * B)
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 1
      ctx.strokeRect(sx + 0.5, B + 0.5, B - 1, ww.topRow * B - B - 1)
      ctx.strokeRect(sx + 0.5, ww.botRow * B + 0.5, B - 1, FLOOR_ROW * B - ww.botRow * B - 1)
    }
  }

  for (const obs of g.level.obstacles) {
    const sx = wx2sx(obs.bx * B)
    const sy = obs.by * B
    const ow = (obs.w || 1) * B, oh = (obs.h || 1) * B
    if (sx + ow < 0 || sx > W) continue
    if (obs.type === 'block') _g36DrawBlock(ctx, sx, sy, ow, oh, B, theme)
    else if (obs.type === 'spike_up') _g36DrawSpike(ctx, sx, sy, B, false)
    else if (obs.type === 'spike_dn') _g36DrawSpike(ctx, sx, sy, B, true)
  }

  for (const pad of g.level.pads) {
    const sx = wx2sx(pad.bx * B)
    if (sx < -B || sx > W + B) continue
    _g36DrawPad(ctx, sx, pad.by * B, B, pad, !!g._padFired[pad.bx])
  }

  for (const mc of g.level.modeChanges) {
    const sx = wx2sx(mc.bx * B)
    if (sx < -B * 2 || sx > W + B * 2) continue
    _g36DrawModePortal(ctx, sx, B, FLOOR_ROW, mc.mode, g.time)
  }

  for (const gc of g.level.gravChanges) {
    const sx = wx2sx(gc.bx * B)
    if (sx < -B * 2 || sx > W + B * 2) continue
    _g36DrawGravityPortal(ctx, sx, B, FLOOR_ROW, gc.dir, g.time)
  }

  _g36DrawTrail(ctx, g, wx2sx)

  if (g.dead) ctx.globalAlpha = Math.floor(Date.now() / 80) % 2 === 0 ? 0.45 : 0.12
  _g36DrawPlayer(ctx, g)
  ctx.globalAlpha = 1

  const barW = Math.min(420, W * 0.46)
  const barH = 7
  const barX = (W - barW) / 2
  const barY = 12
  ctx.fillStyle = 'rgba(0,0,0,0.36)'
  ctx.fillRect(barX, barY, barW, barH)
  ctx.strokeStyle = 'rgba(255,255,255,0.38)'
  ctx.strokeRect(barX + 0.5, barY + 0.5, barW - 1, barH - 1)
  ctx.fillStyle = theme.accent
  ctx.shadowColor = theme.accent
  ctx.shadowBlur = 8
  ctx.fillRect(barX, barY, barW * g.progress / 100, barH)
  ctx.shadowBlur = 0

  ctx.font = 'bold 12px monospace'
  ctx.fillStyle = 'rgba(255,255,255,0.78)'
  ctx.textAlign = 'left'
  ctx.fillText(`ATTEMPT ${G36.attempts}`, 12, 25)
  ctx.textAlign = 'right'
  ctx.fillText(`${Math.floor(g.progress)}%   BEST ${Math.floor(G36.bestProg)}%`, W - 12, 25)

  const modeCol = { cube:'#00e5ff', ship:'#ff6b35', wave:'#4ade80' }[g.mode] || '#fff'
  ctx.fillStyle = modeCol
  ctx.shadowColor = modeCol
  ctx.shadowBlur = 8
  ctx.font = `bold ${Math.floor(B * 0.34)}px monospace`
  ctx.textAlign = 'center'
  ctx.fillText(g.mode.toUpperCase(), W / 2, barY + B * 0.72)
  ctx.shadowBlur = 0

  if (g.time < 1.1) {
    const a = Math.min(1, (1.1 - g.time) / 0.45)
    ctx.globalAlpha = a
    ctx.fillStyle = '#fff'
    ctx.font = `bold ${Math.floor(B * 0.8)}px monospace`
    ctx.fillText(`ATTEMPT ${G36.attempts}`, W / 2, H * 0.33)
    ctx.globalAlpha = 1
  }

  if (g.gravDir === -1) {
    ctx.fillStyle = '#fde68a'
    ctx.font = 'bold 12px monospace'
    ctx.textAlign = 'right'
    ctx.fillText('REVERSE GRAVITY', W - 12, 43)
  }

  if (g.portalFlash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${g.portalFlash * 0.8})`
    ctx.fillRect(0, 0, W, H)
  }

  if (g.dead) {
    ctx.fillStyle = `rgba(255,40,40,${Math.max(0, (0.7 - g.deathTimer) / 0.7) * 0.35})`
    ctx.fillRect(0, 0, W, H)
  }
  ctx.textAlign = 'left'
}

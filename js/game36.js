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
    G36.vy = G36_JUMP_V * G36.B * G36.gravDir
    G36.onGround = false
    SFX.jump()
  }
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
      { bx: 36,  by: FLOOR-1, color: 'yellow' },  // launch over 4 spikes
      { bx: 103, by: FLOOR-1, color: 'yellow' },  // launch over 4 spikes
      { bx: 140, by: FLOOR-1, color: 'blue'   },  // flip gravity
      { bx: 172, by: 1,       color: 'blue'   },  // flip back (ceiling in inverted = row 1)
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
      { bx: 175, dir:  1 },
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
const G36_WAVE_SPD = 10.0    // blocks/sec wave diagonal
const G36_YPAD_V   = -22.0   // yellow pad launch (blocks/sec)
const G36_PR       = 0.35    // player half-size in blocks

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
    mode:      'cube',
    gravDir:   1,
    cx:        Math.floor(c.width * 0.25),
    B,
    H:         c.height,
    level:     _g36BuildLevel(),
    waveWalls: _g36BuildWaveWalls(),
    deathTimer: 0,
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
  const g = G36, B = g.B, gd = g.gravDir
  const FLOOR_ROW = G36_ROWS - 1
  const PR = G36_PR * B

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
      g.mode = mc.mode
      if (mc.mode === 'ship') g.vy = 0
    }
  }
  for (const gc of g.level.gravChanges) {
    if (!g._gcFired[gc.bx] && bxNow >= gc.bx) {
      g._gcFired[gc.bx] = true
      g.gravDir = gc.dir
    }
  }

  // Pad collision
  for (const pad of g.level.pads) {
    if (g._padFired[pad.bx]) continue
    const padWX = pad.bx * B
    const padY  = pad.by * B + B * 0.5
    if (Math.abs(g.worldX - padWX) < PR * 1.5 && Math.abs(g.y - padY) < B) {
      g._padFired[pad.bx] = true
      if (pad.color === 'yellow') {
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
  const PR2 = PR * 0.85
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
        } else if (minO === overB && g.vy > 0) {
          g.y = oy - PR2; g.vy = 0
          if (g.mode === 'cube') g.onGround = true
        } else {
          _g36Die(); return
        }
      }
    }
  }
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
function _g36Draw() {
  const c   = _g36C()
  const ctx = c.getContext('2d')
  const W = c.width, H = c.height
  const g = G36, B = g.B
  const FLOOR_ROW = G36_ROWS - 1

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0d0527'); bg.addColorStop(1, '#1a0a33')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1
  const offX = g.worldX % B
  for (let i = 0; i < Math.ceil(W / B) + 1; i++) {
    const x = i * B - offX
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
  }
  for (let row = 0; row <= G36_ROWS; row++) {
    const y = row * B
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
  }

  const wx2sx = wx => g.cx + (wx - g.worldX)

  // Floor
  ctx.fillStyle = '#2d2b5e'; ctx.fillRect(0, FLOOR_ROW * B, W, B)
  ctx.fillStyle = '#3d3b7e'; ctx.fillRect(0, FLOOR_ROW * B, W, B * 0.18)
  ctx.strokeStyle = '#5a58a0'; ctx.lineWidth = 1; ctx.strokeRect(0, FLOOR_ROW * B, W, B)

  // Ceiling
  ctx.fillStyle = '#2d2b5e'; ctx.fillRect(0, 0, W, B)
  ctx.fillStyle = '#3d3b7e'; ctx.fillRect(0, B * 0.82, W, B * 0.18)
  ctx.strokeStyle = '#5a58a0'; ctx.strokeRect(0, 0, W, B)

  // Wave walls
  if (g.worldX > 174 * B) {
    for (let bx = 175; bx <= 210; bx++) {
      const ww = g.waveWalls[bx]
      if (!ww) continue
      const sx = wx2sx(bx * B)
      if (sx + B < 0 || sx > W) continue
      ctx.fillStyle = '#1a3a6e'
      ctx.fillRect(sx, B, B, ww.topRow * B - B)
      ctx.fillRect(sx, ww.botRow * B, B, FLOOR_ROW * B - ww.botRow * B)
      ctx.strokeStyle = '#4488ff'; ctx.lineWidth = 1
      ctx.strokeRect(sx, B, B, ww.topRow * B - B)
      ctx.strokeRect(sx, ww.botRow * B, B, FLOOR_ROW * B - ww.botRow * B)
    }
  }

  // Obstacles
  for (const obs of g.level.obstacles) {
    const sx = wx2sx(obs.bx * B)
    const sy = obs.by * B
    const ow = (obs.w || 1) * B, oh = (obs.h || 1) * B
    if (sx + ow < 0 || sx > W) continue

    if (obs.type === 'block') {
      ctx.fillStyle = '#2d2b5e'; ctx.fillRect(sx, sy, ow, oh)
      ctx.fillStyle = '#3d3b7e'; ctx.fillRect(sx, sy, ow, oh * 0.15)
      ctx.strokeStyle = '#5a58a0'; ctx.lineWidth = 1; ctx.strokeRect(sx+0.5, sy+0.5, ow-1, oh-1)
    } else if (obs.type === 'spike_up') {
      ctx.fillStyle = '#ffd700'; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.moveTo(sx + B*0.5, sy + B*0.02)
      ctx.lineTo(sx + B*0.05, sy + B)
      ctx.lineTo(sx + B*0.95, sy + B)
      ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0
    } else if (obs.type === 'spike_dn') {
      ctx.fillStyle = '#ffd700'; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.moveTo(sx + B*0.5, sy + B*0.98)
      ctx.lineTo(sx + B*0.05, sy)
      ctx.lineTo(sx + B*0.95, sy)
      ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0
    }
  }

  // Pads
  for (const pad of g.level.pads) {
    const sx = wx2sx(pad.bx * B)
    if (sx < -B || sx > W + B) continue
    const sy  = pad.by * B
    const col = pad.color === 'yellow' ? '#ffd700' : '#4488ff'
    ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 14
    const px = sx + B/2, py = sy + B/2
    ctx.beginPath()
    ctx.moveTo(px, py - B*0.4); ctx.lineTo(px + B*0.4, py)
    ctx.lineTo(px, py + B*0.4); ctx.lineTo(px - B*0.4, py)
    ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0
    ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.floor(B*0.35)}px monospace`
    ctx.textAlign = 'center'
    ctx.fillText(pad.color === 'yellow' ? '▲' : '↕', px, sy + B * 0.7)
    ctx.textAlign = 'left'
  }

  // Mode portals
  const portalCols = { cube:'#00e5ff', ship:'#ff6b35', wave:'#4ade80' }
  for (const mc of g.level.modeChanges) {
    const sx = wx2sx(mc.bx * B)
    if (sx < -B*2 || sx > W + B*2) continue
    const col = portalCols[mc.mode] || '#fff'
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.shadowColor = col; ctx.shadowBlur = 8
    ctx.setLineDash([6, 4])
    ctx.beginPath(); ctx.moveTo(sx, B); ctx.lineTo(sx, FLOOR_ROW * B); ctx.stroke()
    ctx.setLineDash([]); ctx.shadowBlur = 0
  }

  // Player
  const px = g.cx, py = g.y
  if (g.dead) ctx.globalAlpha = Math.floor(Date.now() / 80) % 2 === 0 ? 0.5 : 0.1

  ctx.save(); ctx.translate(px, py)

  if (g.mode === 'cube') {
    const rot = (g.worldX / B) * (Math.PI / 2) * g.gravDir
    ctx.rotate(rot)
    const PR = G36_PR * B
    ctx.fillStyle = '#00e5ff'; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 14
    ctx.fillRect(-PR, -PR, PR*2, PR*2)
    ctx.fillStyle = '#003344'
    ctx.fillRect(-PR*0.55, -PR*0.55, PR*1.1, PR*1.1)
    ctx.fillStyle = '#00e5ff'
    ctx.beginPath(); ctx.arc(0, 0, PR*0.3, 0, Math.PI*2); ctx.fill()
    ctx.shadowBlur = 0

  } else if (g.mode === 'ship') {
    const ang = Math.atan2(g.vy, G36_SPEED * B) * 0.4
    ctx.rotate(ang)
    const PR = G36_PR * B
    ctx.fillStyle = '#ff6b35'; ctx.shadowColor = '#ff6b35'; ctx.shadowBlur = 14
    ctx.beginPath()
    ctx.moveTo(PR*1.4, 0)
    ctx.bezierCurveTo(PR*0.4, -PR*0.9, -PR*0.9, -PR*0.6, -PR, 0)
    ctx.bezierCurveTo(-PR*0.9, PR*0.6, PR*0.4, PR*0.9, PR*1.4, 0)
    ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0

  } else if (g.mode === 'wave') {
    const rot = (g.worldX / B) * Math.PI * 0.5
    ctx.rotate(rot)
    const PR = G36_PR * B
    ctx.fillStyle = '#4ade80'; ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 14
    ctx.beginPath()
    ctx.moveTo(0, -PR); ctx.lineTo(PR, 0); ctx.lineTo(0, PR); ctx.lineTo(-PR, 0)
    ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0
  }

  ctx.restore()
  ctx.globalAlpha = 1

  // Progress bar
  const barW = W * 0.4, barH = 5, barX = (W-barW)/2, barY = H - barH - 6
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(barX, barY, barW, barH)
  ctx.fillStyle = '#00e5ff'; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 5
  ctx.fillRect(barX, barY, barW * g.progress / 100, barH)
  ctx.shadowBlur = 0

  // HUD
  ctx.font = 'bold 12px monospace'
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.textAlign = 'left'
  ctx.fillText(`Attempt ${G36.attempts}`, 10, 20)
  ctx.textAlign = 'right'
  ctx.fillText(`Best ${Math.floor(G36.bestProg)}%`, W - 10, 20)

  const modeCol = { cube:'#00e5ff', ship:'#ff6b35', wave:'#4ade80' }[g.mode] || '#fff'
  ctx.fillStyle = modeCol; ctx.shadowColor = modeCol; ctx.shadowBlur = 8
  ctx.font = `bold ${Math.floor(B*0.45)}px monospace`; ctx.textAlign = 'center'
  ctx.fillText(g.mode.toUpperCase(), W/2, barY - 10)
  ctx.shadowBlur = 0; ctx.textAlign = 'left'

  if (g.gravDir === -1) {
    ctx.fillStyle = '#a78bfa'; ctx.font = 'bold 11px monospace'
    ctx.textAlign = 'right'; ctx.fillText('↑ GRAVITY FLIP', W - 10, 36)
    ctx.textAlign = 'left'
  }

  // Death flash
  if (g.dead) {
    ctx.fillStyle = `rgba(255,40,40,${Math.max(0, (0.7 - g.deathTimer) / 0.7) * 0.35})`
    ctx.fillRect(0, 0, W, H)
  }
}

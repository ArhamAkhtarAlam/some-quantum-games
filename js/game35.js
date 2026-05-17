// ═══════════════════════════════════════════════════════
//  GAME 35 — WAVE DASH
//  GD wave gamemode. Hold to angle up, release to go down.
//  Starts wide and slow — gets tighter and faster.
// ═══════════════════════════════════════════════════════
const G35_WAVE_SPD = 255
const G35_PR       = 7

let G35_roomCode   = null
let G35_sideBySide = false
let G35_oppScore   = null
let G35_oppY       = null   // opponent Y (in their panel-height coordinates)
let G35_oppWallCy  = null   // opponent wall centre Y
let G35_oppWallGap = null   // opponent wall gap height
let G35_oppPanelH  = null   // opponent panel height (so we can scale correctly)
let G35_oppDone    = false

const G35 = {
  active: false,
  y: 0,
  vy: 0,
  holding: false,
  score: 0,
  scrollX: 0,
  scrollAcc: 0,
  speed: 150,
  gapH: 205,
  wallBuf: [],
  wallGenCy: 0,
  wallGenTarget: 0,
  wallGenTimer: 0,
  wallGenVel: 0,
  wallGenDist: 0,
  trail: [],
  cx: 0,
  grace: 3.5,
  panelH: 0,       // effective height for player's panel (= H/2 in side-by-side)
  lastSyncTime: 0,
  raf: null,
  lastTime: 0,
}
window._g35Score = 0

let _g35Canvas = null
let _g35WallPat = null

function _g35C() {
  if (!_g35Canvas) _g35Canvas = document.getElementById('g35-canvas')
  return _g35Canvas
}

function _g35MakePat(ctx, tint) {
  const off = document.createElement('canvas')
  off.width = 24; off.height = 24
  const oc = off.getContext('2d')
  oc.fillStyle = tint === 'red' ? '#1a0707' : '#07111e'
  oc.fillRect(0, 0, 24, 24)
  oc.fillStyle = tint === 'red' ? '#2d1010' : '#0f2d47'
  oc.beginPath()
  oc.moveTo(12, 0); oc.lineTo(24, 12); oc.lineTo(12, 24); oc.lineTo(0, 12)
  oc.closePath(); oc.fill()
  oc.fillStyle = tint === 'red' ? '#3d1a1a' : '#163d5e'
  oc.beginPath()
  oc.moveTo(12, 0); oc.lineTo(24, 12); oc.lineTo(12, 12)
  oc.closePath(); oc.fill()
  return ctx.createPattern(off, 'repeat')
}

function _g35UpdateOppHud() {
  const hud  = document.getElementById('g35-opp-hud')
  const stat = document.getElementById('g35-opp-stat')
  if (!hud || !stat) return
  if (G35_roomCode && G35_oppScore !== null && !G35_sideBySide) {
    hud.style.display = 'flex'
    stat.textContent  = G35_oppScore + ' blocks'
  } else if (G35_sideBySide) {
    hud.style.display = 'none'  // HUD hidden in split mode (rendered on canvas)
  }
}

window.g35FindMatch = function() {
  mpFindMatch('wavedash', {
    statusEl: document.getElementById('g35-queue-status'),
    btnEl:    document.getElementById('g35-queue-btn'),
    onMatched: ({ code, sideBySide }) => {
      G35_roomCode   = code
      G35_sideBySide = sideBySide
      G35_oppScore   = 0
      G35_oppY       = null
      G35_oppWallCy  = null
      G35_oppWallGap = null
      G35_oppPanelH  = null
      const sock = mpGetSocket()
      sock.off('opponent-score'); sock.off('opponent-state'); sock.off('opponent-done')
      sock.off('force-end'); sock.off('opponent-left')
      sock.on('opponent-score', score => { G35_oppScore = score; _g35UpdateOppHud() })
      sock.on('opponent-state', ({ y, wallCy, wallGap, panelH }) => {
        G35_oppY       = y
        G35_oppWallCy  = wallCy
        G35_oppWallGap = wallGap
        G35_oppPanelH  = panelH
      })
      sock.on('opponent-done',  score  => { G35_oppScore = score; G35_oppDone = true; _g35UpdateOppHud() })
      sock.on('force-end', ({ loserScore }) => {
        stopGame35()
        window._g35Score = G35.score
        document.getElementById('g35-final-score').textContent = G35.score + ' blocks'
        renderMedalDisplay('g35-medal-display', 'wavedash', G35.score)
        document.getElementById('g35-mp-result').innerHTML =
          `Opponent crashed at ${loserScore} blocks! 🏆 <b>You win!</b>`
        document.getElementById('g35-over').classList.add('show')
        if (typeof recordMpResult === 'function') recordMpResult('wavedash', true)
      })
      sock.on('opponent-left', () => {
        G35_oppScore = null
        document.getElementById('g35-queue-status').textContent = 'Opponent disconnected.'
      })
      startWaveDash()
    }
  })
}

function stopGame35() {
  G35.active = false
  if (G35.raf) { cancelAnimationFrame(G35.raf); G35.raf = null }
  document.removeEventListener('keydown',  _g35KD)
  document.removeEventListener('keyup',    _g35KU)
  const c = _g35C()
  if (c) {
    c.removeEventListener('mousedown',  _g35MD)
    c.removeEventListener('mouseup',    _g35MU)
    c.removeEventListener('touchstart', _g35TD)
    c.removeEventListener('touchend',   _g35TU)
  }
}
window.stopGame35 = stopGame35

function _g35KD(e) { if (e.code==='Space'||e.code==='KeyW'||e.code==='ArrowUp') { e.preventDefault(); G35.holding=true } }
function _g35KU(e) { if (e.code==='Space'||e.code==='KeyW'||e.code==='ArrowUp') { e.preventDefault(); G35.holding=false } }
function _g35MD() { G35.holding = true }
function _g35MU() { G35.holding = false }
function _g35TD(e) { e.preventDefault(); G35.holding = true }
function _g35TU(e) { e.preventDefault(); G35.holding = false }

async function initGame35() {
  stopGame35()
  _g35Canvas   = null
  _g35WallPat  = null
  G35_roomCode = null
  G35_sideBySide = false
  G35_oppScore = null
  G35_oppY     = null
  G35_oppWallCy = null
  G35_oppWallGap = null
  G35_oppPanelH = null
  G35_oppDone  = false
  document.getElementById('g35-over').classList.remove('show')
  document.getElementById('g35-overlay').style.display = 'flex'
  const hud = document.getElementById('g35-opp-hud')
  if (hud) hud.style.display = 'none'
  const st = document.getElementById('g35-queue-status')
  if (st) st.textContent = ''
  await initCurby()
}

window.startWaveDash = function() {
  SFX.resume(); SFX.click()
  if (G35_roomCode && !G35_sideBySide) {
    const hud = document.getElementById('g35-opp-hud')
    if (hud) hud.style.display = 'flex'
  }
  const c = _g35C()
  c.width  = c.parentElement.clientWidth
  c.height = c.parentElement.clientHeight
  document.getElementById('g35-overlay').style.display = 'none'

  const w = c.width, h = c.height
  // In side-by-side mode, player uses bottom half — generate corridor for half-height
  const panelH = G35_sideBySide ? Math.floor(h / 2) : h

  G35.active    = true
  G35.y         = panelH / 2
  G35.vy        = 0
  G35.holding   = false
  G35.score     = 0
  G35.scrollX   = 0
  G35.scrollAcc = 0
  G35.speed     = 150
  G35.gapH      = 205
  G35.grace     = 3.5
  G35.trail     = []
  G35.cx        = Math.floor(w * 0.18)
  G35.panelH    = panelH
  G35.lastSyncTime = 0
  _g35WallPat   = null

  G35.wallBuf       = []
  G35.wallGenCy     = panelH / 2
  G35.wallGenTarget = panelH / 2
  G35.wallGenTimer  = 240
  G35.wallGenVel    = 0
  G35.wallGenDist   = 0

  const safeLen = Math.max(420, Math.floor(w * 0.70))
  for (let x = 0; x < safeLen; x++) G35.wallBuf.push({ cy: panelH / 2, gapH: G35.gapH })
  g35GenCols(w + 250 - safeLen, panelH)

  document.getElementById('g35-score-hud').textContent = '0'
  document.addEventListener('keydown',   _g35KD)
  document.addEventListener('keyup',     _g35KU)
  c.addEventListener('mousedown',  _g35MD)
  c.addEventListener('mouseup',    _g35MU)
  c.addEventListener('touchstart', _g35TD, { passive: false })
  c.addEventListener('touchend',   _g35TU, { passive: false })

  G35.lastTime = performance.now()
  G35.raf = requestAnimationFrame(g35Loop)
}

function g35GenCols(n, h) {
  for (let i = 0; i < n; i++) {
    G35.wallGenDist++
    const margin   = G35.gapH / 2 + 24
    const progress = Math.min(1, G35.wallGenDist / 2400)
    const spread   = (0.12 + progress * 0.28) * h
    const lo       = Math.max(margin, h / 2 - spread)
    const hi       = Math.min(h - margin, h / 2 + spread)
    const step     = G35_WAVE_SPD / G35.speed

    if (Math.abs(G35.wallGenTarget - G35.wallGenCy) <= step) {
      G35.wallGenCy = G35.wallGenTarget
      const mid = (lo + hi) / 2
      if (G35.wallGenCy <= mid) {
        G35.wallGenTarget = mid + qRandInt(Math.max(1, Math.floor(hi - mid + 1)))
      } else {
        G35.wallGenTarget = lo + qRandInt(Math.max(1, Math.floor(mid - lo + 1)))
      }
    } else {
      G35.wallGenCy += Math.sign(G35.wallGenTarget - G35.wallGenCy) * step
    }

    G35.wallBuf.push({ cy: G35.wallGenCy, gapH: G35.gapH })
  }
}

function g35Loop(ts) {
  if (!G35.active) return
  const dt = Math.min((ts - G35.lastTime) / 1000, 0.05)
  G35.lastTime = ts

  const c   = _g35C()
  const w   = c.width, h = c.height
  const ctx = c.getContext('2d')
  const pH  = G35.panelH  // player's effective height

  // Grace period
  if (G35.grace > 0) {
    G35.grace -= dt
    g35Draw(ctx, w, h)
    const label = G35.grace > 2.5 ? '3' : G35.grace > 1.5 ? '2' : G35.grace > 0.4 ? '1' : 'GO!'
    const alpha  = G35.grace > 0.4 ? 1 : G35.grace / 0.4
    ctx.globalAlpha = alpha
    ctx.font = 'bold 80px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#4ade80'
    ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 32
    // Draw countdown in the player's panel area
    const countY = G35_sideBySide ? h * 0.75 : h / 2
    ctx.fillText(label, w / 2, countY + 28)
    ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.textAlign = 'left'
    G35.raf = requestAnimationFrame(g35Loop)
    return
  }

  // Scroll
  G35.scrollAcc += G35.speed * dt
  const px = Math.floor(G35.scrollAcc)
  if (px > 0) {
    G35.scrollAcc -= px
    G35.scrollX   += px
    G35.wallBuf.splice(0, px)
    G35.gapH  = Math.max(88, G35.gapH - px * 0.003)
    G35.speed = Math.min(380, 150 + G35.scrollX * 0.018)
    g35GenCols(px, pH)
  }

  // Score
  const newScore = Math.floor(G35.scrollX / 80)
  if (newScore !== G35.score) {
    G35.score = newScore
    document.getElementById('g35-score-hud').textContent = G35.score
    if (G35_roomCode && G35.score % 5 === 0) {
      mpGetSocket().emit('score-update', { code: G35_roomCode, score: G35.score })
    }
  }

  // State sync for side-by-side (every ~100ms)
  if (G35_sideBySide && G35_roomCode && ts - G35.lastSyncTime > 100) {
    G35.lastSyncTime = ts
    const wall = G35.wallBuf[G35.cx]
    mpGetSocket().emit('state-sync', { code: G35_roomCode, state: {
      y:       G35.y,
      wallCy:  wall?.cy  ?? pH / 2,
      wallGap: wall?.gapH ?? G35.gapH,
      panelH:  pH,
    }})
  }

  // Wave physics
  G35.vy = G35.holding ? -G35_WAVE_SPD : G35_WAVE_SPD
  G35.y  += G35.vy * dt
  G35.y   = Math.max(G35_PR, Math.min(pH - G35_PR, G35.y))

  // Trail
  G35.trail.push({ sx: G35.scrollX, y: G35.y })
  if (G35.trail.length > 120) G35.trail.shift()

  // Collision
  const wallIdx = Math.min(G35.cx, G35.wallBuf.length - 1)
  const wall    = G35.wallBuf[wallIdx]
  if (G35.y <= wall.cy - wall.gapH / 2 + G35_PR || G35.y >= wall.cy + wall.gapH / 2 - G35_PR) {
    endGame35(); return
  }

  g35Draw(ctx, w, h)
  G35.raf = requestAnimationFrame(g35Loop)
}

// ── drawing ────────────────────────────────────────────

function g35Draw(ctx, w, h) {
  if (G35_sideBySide) {
    _g35DrawSplit(ctx, w, h)
  } else {
    _g35DrawCore(ctx, w, h, G35.panelH, 0)
  }
}

// Draw the player corridor.
// `panelH` = the logical height of the corridor (wallBuf values are in [0, panelH])
// `yOff`   = vertical pixel offset to render into (0 for full, h/2 for bottom half)
function _g35DrawCore(ctx, w, h, panelH, yOff) {
  ctx.fillStyle = '#030710'
  ctx.fillRect(0, yOff, w, panelH)

  const pat = _g35MakePat(ctx, null)

  // Top wall
  ctx.beginPath()
  ctx.moveTo(0, yOff)
  for (let x = 0; x < w; x += 2) {
    const e = G35.wallBuf[Math.min(x, G35.wallBuf.length - 1)]
    ctx.lineTo(x, yOff + e.cy - e.gapH / 2)
  }
  ctx.lineTo(w, yOff)
  ctx.closePath()
  ctx.fillStyle = pat
  ctx.fill()

  // Bottom wall
  ctx.beginPath()
  ctx.moveTo(0, yOff + panelH)
  for (let x = 0; x < w; x += 2) {
    const e = G35.wallBuf[Math.min(x, G35.wallBuf.length - 1)]
    ctx.lineTo(x, yOff + e.cy + e.gapH / 2)
  }
  ctx.lineTo(w, yOff + panelH)
  ctx.closePath()
  ctx.fillStyle = pat
  ctx.fill()

  // Edge lines
  ctx.lineWidth = 2.5
  ctx.shadowColor = '#06b6d4'; ctx.shadowBlur = 14
  ctx.beginPath()
  for (let x = 0; x < w; x += 2) {
    const e = G35.wallBuf[Math.min(x, G35.wallBuf.length - 1)]
    const y = yOff + e.cy - e.gapH / 2
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.strokeStyle = '#67e8f9'; ctx.stroke()
  ctx.beginPath()
  for (let x = 0; x < w; x += 2) {
    const e = G35.wallBuf[Math.min(x, G35.wallBuf.length - 1)]
    const y = yOff + e.cy + e.gapH / 2
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.strokeStyle = '#67e8f9'; ctx.stroke()
  ctx.shadowBlur = 0

  // Trail
  if (G35.trail.length > 1) {
    const pts = []
    for (let i = 0; i < G35.trail.length; i++) {
      const p = G35.trail[i]
      const sx = G35.cx - (G35.scrollX - p.sx)
      if (sx >= -4) pts.push({ x: sx, y: yOff + p.y })
    }
    if (pts.length > 1) {
      ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 10
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(74,222,128,0.25)'
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
      ctx.stroke()
      ctx.shadowBlur = 6; ctx.lineWidth = 2; ctx.strokeStyle = '#4ade80'
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
      ctx.stroke()
    }
  }

  // Player arrow
  const angle = Math.atan2(G35.vy, G35.speed)
  ctx.save()
  ctx.translate(G35.cx, yOff + G35.y)
  ctx.rotate(angle)
  const s = G35_PR
  ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 18
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.moveTo(s * 1.5, 0)
  ctx.lineTo(-s * 0.5, -s)
  ctx.lineTo(-s * 0.1, 0)
  ctx.lineTo(-s * 0.5, s)
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 1.5; ctx.stroke()
  ctx.shadowBlur = 0
  ctx.restore()

  // "YOU" label in player panel
  if (G35_sideBySide) {
    ctx.fillStyle = 'rgba(74,222,128,0.5)'
    ctx.font = `bold ${Math.min(w/24, 14)}px monospace`
    ctx.textAlign = 'center'
    ctx.fillText('YOU', w / 2, yOff + 16)
    // Score
    ctx.fillStyle = '#4ade80'
    ctx.font = `bold ${Math.min(w/20, 16)}px monospace`
    ctx.textAlign = 'right'
    ctx.fillText(G35.score + ' blocks', w - 10, yOff + panelH - 8)
    ctx.textAlign = 'left'
  }
}

// Draw opponent corridor in the top half
function _g35DrawOpp(ctx, w, HH) {
  ctx.fillStyle = '#07030f'
  ctx.fillRect(0, 0, w, HH)

  if (G35_oppY !== null && G35_oppWallCy !== null && G35_oppWallGap !== null) {
    const srcH  = G35_oppPanelH ?? HH  // opponent's panel height
    const scale = HH / srcH             // scale to our top-half height

    const cy  = G35_oppWallCy  * scale
    const gap = G35_oppWallGap * scale
    const top = Math.max(0, cy - gap / 2)
    const bot = Math.min(HH, cy + gap / 2)
    const oppY = G35_oppY * scale

    // Top wall
    const pat = _g35MakePat(ctx, 'red')
    ctx.fillStyle = pat
    ctx.fillRect(0, 0, w, top)

    // Bottom wall
    ctx.fillStyle = pat
    ctx.fillRect(0, bot, w, HH - bot)

    // Edge lines (red)
    ctx.strokeStyle = '#f87171'; ctx.lineWidth = 2.5
    ctx.shadowColor = '#f87171'; ctx.shadowBlur = 10
    ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(w, top); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, bot); ctx.lineTo(w, bot); ctx.stroke()
    ctx.shadowBlur = 0

    // Opponent dot
    ctx.fillStyle = '#f87171'
    ctx.shadowColor = '#f87171'; ctx.shadowBlur = 14
    ctx.beginPath(); ctx.arc(G35.cx, oppY, G35_PR, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0
  }

  // Opponent label + score
  ctx.fillStyle = 'rgba(248,113,113,0.6)'
  ctx.font = `bold ${Math.min(w/24, 14)}px monospace`
  ctx.textAlign = 'center'
  ctx.fillText('👤 OPPONENT', w / 2, 16)
  if (G35_oppScore !== null) {
    ctx.fillStyle = '#f87171'
    ctx.font = `bold ${Math.min(w/20, 16)}px monospace`
    ctx.textAlign = 'right'
    ctx.fillText(G35_oppScore + ' blocks', w - 10, HH - 8)
    ctx.textAlign = 'left'
  }
}

function _g35DrawSplit(ctx, w, h) {
  const HH = Math.floor(h / 2)

  // Opponent panel (top)
  _g35DrawOpp(ctx, w, HH)

  // Player panel (bottom)
  _g35DrawCore(ctx, w, h, HH, HH)

  // Divider
  ctx.strokeStyle = 'rgba(6,182,212,0.4)'
  ctx.lineWidth = 1
  ctx.setLineDash([])
  ctx.beginPath(); ctx.moveTo(0, HH); ctx.lineTo(w, HH); ctx.stroke()
}

function endGame35() {
  SFX.die()
  stopGame35()
  window._g35Score = G35.score

  if (G35_roomCode) {
    mpGetSocket().emit('player-died', { code: G35_roomCode, score: G35.score })
    if (typeof recordMpResult === 'function') recordMpResult('wavedash', false)
  }

  document.getElementById('g35-final-score').textContent = G35.score + ' blocks'
  renderMedalDisplay('g35-medal-display', 'wavedash', G35.score)

  const mpEl = document.getElementById('g35-mp-result')
  if (mpEl && G35_roomCode) {
    mpEl.innerHTML = G35_oppScore !== null
      ? `Opponent was at ${G35_oppScore} blocks. 😔 <b>You crashed first!</b>`
      : ''
  }

  document.getElementById('g35-over').classList.add('show')
}

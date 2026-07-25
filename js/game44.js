// ═══════════════════════════════════════════════════════
//  GAME 44 — SPIDER
//  GD-inspired: tap to snap instantly between floor & ceiling.
//  Web thread appears at each flip point. Score = blocks cleared.
// ═══════════════════════════════════════════════════════

const SPD_R   = 9    // spider body radius
const SPD_OBW = 26   // obstacle block width

const _SPD = {
  active:false, phase:'idle',
  onFloor:true,
  scrollX:0, speed:0,
  score:0,
  obstacles:[], nextObstCol:0, lastObstFloor:true,
  trail:[], threads:[],
  shake:0,
  deadT:0, showOver:false,
  raf:null, lastTime:0,
}
window._spdScore = 0

let _spdCvs = null
function _spdC() {
  if (!_spdCvs) _spdCvs = document.getElementById('spd-canvas')
  return _spdCvs
}

async function initSpider() {
  stopSpider(); _spdCvs = null
  document.getElementById('spd-overlay').style.display = 'flex'
  document.getElementById('spd-over').style.display    = 'none'
  await initCurby()
}
window.initSpider = initSpider
window.initGame44 = initSpider
window.stopGame44 = function() { stopSpider() }

function startSpider() {
  SFX.resume(); SFX.click()
  const c = _spdC()
  c.width  = c.parentElement.clientWidth
  c.height = c.parentElement.clientHeight
  document.getElementById('spd-overlay').style.display = 'none'
  document.getElementById('spd-over').style.display    = 'none'

  Object.assign(_SPD, {
    active:true, phase:'playing',
    onFloor:true,
    scrollX:0, speed:220,
    score:0,
    obstacles:[], nextObstCol: Math.round(c.width * 0.25) + 300,
    lastObstFloor:true,   // first obstacle will be ceiling → player on floor safe at start
    trail:[], threads:[],
    shake:0, deadT:0, showOver:false,
  })
  window._spdScore = 0
  document.getElementById('spd-score-hud').textContent = '0'

  window.addEventListener('keydown', _spdKeyDn)
  c.addEventListener('mousedown',  _spdInput, {passive:false})
  c.addEventListener('touchstart', _spdInput, {passive:false})

  _SPD.lastTime = performance.now()
  _SPD.raf = requestAnimationFrame(_spdLoop)
}
window.startSpider = startSpider

window.stopSpider = function() {
  _SPD.active = false
  if (_SPD.raf) { cancelAnimationFrame(_SPD.raf); _SPD.raf = null }
  const c = _spdC()
  if (c) {
    c.removeEventListener('mousedown',  _spdInput)
    c.removeEventListener('touchstart', _spdInput)
  }
  window.removeEventListener('keydown', _spdKeyDn)
}

function _spdKeyDn(e) {
  if (e.code === 'Space') { e.preventDefault(); _spdDoFlip() }
}
function _spdInput(e) { e.preventDefault(); _spdDoFlip() }

function _spdDoFlip() {
  if (!_SPD.active || _SPD.phase !== 'playing') return
  const h = _spdC().height
  const fromY = _SPD.onFloor ? h - SPD_R - 4 : SPD_R + 4
  _SPD.onFloor = !_SPD.onFloor
  const toY   = _SPD.onFloor ? h - SPD_R - 4 : SPD_R + 4
  // Web thread: stays in world space and scrolls away to the left
  _SPD.threads.push({ worldX: _SPD.scrollX, y1: fromY, y2: toY, age: 0 })
  if (_SPD.threads.length > 10) _SPD.threads.shift()
  SFX.click()
}

function _spdSpawnObs(w, h) {
  while (_SPD.nextObstCol < _SPD.scrollX + w + 300) {
    _SPD.lastObstFloor = !_SPD.lastObstFloor
    // Fixed height — only the timing between blocks creates difficulty
    const oh = Math.max(28, Math.floor(h * 0.12))
    _SPD.obstacles.push({ col: _SPD.nextObstCol, floor: _SPD.lastObstFloor, h: oh, passed: false })
    // Gap shrinks continuously, bottoms out at 72px (brutal at max speed)
    const gap = Math.max(72, 285 - _SPD.score * 3) + qRandInt(20)
    _SPD.nextObstCol += gap
  }
  _SPD.obstacles = _SPD.obstacles.filter(o => o.col > _SPD.scrollX - 120)
}

function _spdLoop(ts) {
  if (!_SPD.active) return
  const dt = Math.min((ts - _SPD.lastTime) / 1000, 0.05)
  _SPD.lastTime = ts
  const c = _spdC(), w = c.width, h = c.height
  const spX = Math.round(w * 0.25)

  if (_SPD.shake > 0) _SPD.shake = Math.max(0, _SPD.shake - dt * 4)

  if (_SPD.phase === 'playing') {
    _SPD.speed    = Math.min(460, 200 + _SPD.score * 6)
    _SPD.scrollX += _SPD.speed * dt

    const spY = _SPD.onFloor ? h - SPD_R - 4 : SPD_R + 4

    // Trail: store world-space positions so they scroll left with the world
    _SPD.trail.push({ worldX: _SPD.scrollX, y: spY })
    if (_SPD.trail.length > 40) _SPD.trail.shift()

    for (const t of _SPD.threads) t.age += dt
    _SPD.threads = _SPD.threads.filter(t => t.age < 2)

    _spdSpawnObs(w, h)

    for (const obs of _SPD.obstacles) {
      const ox = obs.col - _SPD.scrollX + spX
      if (Math.abs(ox - spX) < SPD_OBW / 2 + SPD_R) {
        const hit = obs.floor ? spY + SPD_R > h - obs.h : spY - SPD_R < obs.h
        if (hit) { _spdDie(); return }
      }
      if (!obs.passed && obs.col < _SPD.scrollX) {
        obs.passed = true
        _SPD.score++
        window._spdScore = _SPD.score
        document.getElementById('spd-score-hud').textContent = _SPD.score
        SFX.win()
      }
    }

  } else if (_SPD.phase === 'dead') {
    _SPD.deadT += dt
    if (_SPD.deadT >= 1.6 && !_SPD.showOver) {
      _SPD.showOver = true
      window._spdScore = _SPD.score
      document.getElementById('spd-final-score').textContent =
        `${_SPD.score} block${_SPD.score !== 1 ? 's' : ''}`
      document.getElementById('spd-over').style.display = 'flex'
    }
  }

  _spdDraw(c.getContext('2d'), w, h)
  if (_SPD.showOver) { _SPD.active = false; return }
  _SPD.raf = requestAnimationFrame(_spdLoop)
}

function _spdDie() {
  if (_SPD.phase === 'dead') return
  _SPD.phase = 'dead'; _SPD.deadT = 0; _SPD.shake = 1.2
  SFX.die()
  window.removeEventListener('keydown', _spdKeyDn)
}

// ── Draw ─────────────────────────────────────────────────────

const _SPD_COL = '#a855f7'

function _spdDraw(ctx, w, h) {
  const S = _SPD
  ctx.save()
  if (S.shake > 0) {
    const s = S.shake * 7
    ctx.translate((Math.random()-0.5)*s, (Math.random()-0.5)*s)
  }

  const spX = Math.round(w * 0.25)
  const spY = S.onFloor ? h - SPD_R - 4 : SPD_R + 4

  // Background
  ctx.fillStyle = '#05010a'
  ctx.fillRect(-12, -12, w+24, h+24)

  // Faint grid
  ctx.strokeStyle = 'rgba(168,85,247,0.025)'
  ctx.lineWidth = 1
  for (let y = 0; y < h; y += 28) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
  }

  // Floor & ceiling surfaces
  const surfH = 6
  ctx.fillStyle = '#150020'
  ctx.fillRect(0, 0, w, surfH)
  ctx.fillRect(0, h - surfH, w, surfH)
  ctx.strokeStyle = _SPD_COL; ctx.lineWidth = 1.5
  ctx.shadowColor = _SPD_COL; ctx.shadowBlur = 8
  ctx.beginPath(); ctx.moveTo(0, surfH); ctx.lineTo(w, surfH); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0, h-surfH); ctx.lineTo(w, h-surfH); ctx.stroke()
  ctx.shadowBlur = 0

  // Web threads (world-space: scroll left as world scrolls)
  ctx.setLineDash([3, 5])
  for (const t of S.threads) {
    const tx = Math.round(t.worldX - S.scrollX + spX)
    if (tx < -30 || tx > w + 30) continue
    const a = Math.max(0, 1 - t.age * 0.65)
    ctx.globalAlpha = a * 0.5
    ctx.strokeStyle = _SPD_COL; ctx.lineWidth = 1
    ctx.shadowColor = _SPD_COL; ctx.shadowBlur = 4
    ctx.beginPath(); ctx.moveTo(tx, t.y1); ctx.lineTo(tx, t.y2); ctx.stroke()
    ctx.shadowBlur = 0
  }
  ctx.setLineDash([])
  ctx.globalAlpha = 1

  // Trail (world-space dots scrolling left)
  for (let i = 1; i < S.trail.length; i++) {
    const tx = Math.round(S.trail[i].worldX - S.scrollX + spX)
    if (tx < -20 || tx > w + 20) continue
    const a = i / S.trail.length
    ctx.globalAlpha = a * a * 0.4
    ctx.fillStyle = _SPD_COL
    ctx.shadowColor = _SPD_COL; ctx.shadowBlur = 3
    ctx.beginPath(); ctx.arc(tx, S.trail[i].y, 2.5, 0, Math.PI*2); ctx.fill()
    ctx.shadowBlur = 0
  }
  ctx.globalAlpha = 1

  // Obstacles
  for (const obs of S.obstacles) {
    const ox   = Math.round(obs.col - S.scrollX + spX)
    if (ox < -SPD_OBW - 10 || ox > w + SPD_OBW) continue
    const half = SPD_OBW / 2
    const oy   = obs.floor ? h - obs.h : 0
    const edgeY = obs.floor ? h - obs.h : obs.h

    ctx.fillStyle = '#1e0030'
    ctx.fillRect(ox - half, oy, SPD_OBW, obs.h)
    ctx.strokeStyle = 'rgba(168,85,247,0.25)'; ctx.lineWidth = 1
    ctx.strokeRect(ox - half, oy, SPD_OBW, obs.h)

    ctx.strokeStyle = _SPD_COL; ctx.lineWidth = 2
    ctx.shadowColor = _SPD_COL; ctx.shadowBlur = 10
    ctx.beginPath(); ctx.moveTo(ox - half, edgeY); ctx.lineTo(ox + half, edgeY)
    ctx.stroke(); ctx.shadowBlur = 0
  }

  // Spider
  const deadAlpha = S.phase === 'dead' ? Math.max(0, 1 - S.deadT * 2.5) : 1
  if (deadAlpha > 0.01) {
    ctx.globalAlpha = deadAlpha
    _spdDrawSpider(ctx, spX, spY, S.onFloor)
    ctx.globalAlpha = 1
  }

  // Score
  ctx.textAlign = 'center'
  ctx.font = 'bold 26px monospace'
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.shadowColor = _SPD_COL; ctx.shadowBlur = 16
  ctx.fillText(S.score, w/2, 42)
  ctx.shadowBlur = 0

  ctx.restore()
}

function _spdDrawSpider(ctx, x, y, onFloor) {
  const R = SPD_R, col = _SPD_COL
  ctx.save()
  ctx.translate(x, y)
  if (!onFloor) ctx.scale(1, -1)  // flip for ceiling — legs point toward surface

  // 8 legs: 4 pairs radiating downward
  ctx.strokeStyle = col; ctx.lineWidth = 1.5
  ctx.shadowColor = col; ctx.shadowBlur = 3
  for (const deg of [22, 44, 66, 84]) {
    const rad = deg * Math.PI / 180
    const sx = Math.cos(rad) * R * 0.85, sy = Math.sin(rad) * R * 0.85
    const ex = Math.cos(rad) * R * 2.4,  ey = Math.sin(rad) * R * 1.9
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(-sx, sy); ctx.lineTo(-ex, ey); ctx.stroke()
  }
  ctx.shadowBlur = 0

  // Glow halo
  ctx.beginPath(); ctx.arc(0, 0, R * 1.6, 0, Math.PI*2)
  ctx.fillStyle = col + '15'; ctx.fill()

  // Body
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI*2)
  ctx.fillStyle = col + '40'; ctx.fill()

  // Core
  ctx.beginPath(); ctx.arc(0, 0, R * 0.62, 0, Math.PI*2)
  ctx.fillStyle = '#fff'
  ctx.shadowColor = col; ctx.shadowBlur = 12
  ctx.fill(); ctx.shadowBlur = 0

  // Eyes
  ctx.fillStyle = '#05010a'
  ctx.beginPath(); ctx.arc(-R*0.22, -R*0.2, 1.4, 0, Math.PI*2); ctx.fill()
  ctx.beginPath(); ctx.arc( R*0.22, -R*0.2, 1.4, 0, Math.PI*2); ctx.fill()

  ctx.restore()
}

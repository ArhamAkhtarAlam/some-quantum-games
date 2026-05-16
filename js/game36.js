// ═══════════════════════════════════════════════════════
//  GAME 36 — CPS TEST
//  Click + Space both count. 10 seconds. Integer score.
// ═══════════════════════════════════════════════════════

const G36_DURATION = 10
let G36 = { active: false, done: false, clicks: 0, timeLeft: G36_DURATION, startTime: 0, ripples: [], raf: null, lastTime: 0 }
window._g36Score = 0

function stopGame36() {
  if (G36.raf) { cancelAnimationFrame(G36.raf); G36.raf = null }
  G36.active = false
  const c = document.getElementById('g36-canvas')
  if (c) { c.onclick = null }
  document.removeEventListener('keydown', _g36Key)
}
window.stopGame36 = stopGame36

window.initGame36 = async function() {
  stopGame36()
  G36 = { active: false, done: false, clicks: 0, timeLeft: G36_DURATION, startTime: 0, ripples: [], raf: null, lastTime: 0 }
  window._g36Score = 0
  document.getElementById('g36-over').classList.remove('show')
  document.getElementById('g36-overlay').style.display = 'flex'
  await initCurby()
}

window.startCPS = function() {
  SFX.resume()
  document.getElementById('g36-overlay').style.display = 'none'
  const c = document.getElementById('g36-canvas')
  c.width  = c.parentElement.clientWidth
  c.height = c.parentElement.clientHeight
  G36 = { active: true, done: false, clicks: 0, timeLeft: G36_DURATION, startTime: 0, ripples: [], raf: null, lastTime: performance.now() }
  c.onclick = e => _g36Click(e.offsetX, e.offsetY)
  document.addEventListener('keydown', _g36Key)
  G36.raf = requestAnimationFrame(_g36Loop)
}

function _g36Key(e) {
  if (!document.getElementById('game36').classList.contains('active')) return
  if (e.code === 'Space') { e.preventDefault(); _g36Click(null, null) }
}

function _g36Click(x, y) {
  if (!G36.active || G36.done) return
  if (G36.startTime === 0) G36.startTime = performance.now()
  G36.clicks++
  SFX.click?.()
  if (x !== null) {
    G36.ripples.push({ x, y, r: 0, maxR: 60, alpha: 1, t: 0 })
  } else {
    // spacebar — ripple from center
    const c = document.getElementById('g36-canvas')
    G36.ripples.push({ x: c.width/2, y: c.height/2, r: 0, maxR: 80, alpha: 1, t: 0 })
  }
}

function _g36Loop(ts) {
  if (!G36.active) return
  const dt = Math.min((ts - G36.lastTime) / 1000, 0.05)
  G36.lastTime = ts

  if (G36.startTime > 0 && !G36.done) {
    G36.timeLeft = Math.max(0, G36_DURATION - (ts - G36.startTime) / 1000)
    if (G36.timeLeft === 0) { _g36End(); return }
  }

  G36.ripples = G36.ripples.filter(r => {
    r.t += dt; r.r += 180 * dt; r.alpha = Math.max(0, 1 - r.t * 2.5)
    return r.alpha > 0
  })

  _g36Draw()
  G36.raf = requestAnimationFrame(_g36Loop)
}

function _g36End() {
  G36.done = true
  G36.active = false
  cancelAnimationFrame(G36.raf); G36.raf = null
  document.removeEventListener('keydown', _g36Key)

  const elapsed = G36_DURATION
  const cps = Math.round(G36.clicks / elapsed)
  window._g36Score = cps

  document.getElementById('g36-final-score').textContent = `${cps} CPS  (${G36.clicks} clicks)`
  renderMedalDisplay('g36-medal-display', 'cps', cps)
  document.getElementById('g36-over').classList.add('show')
  SFX.win()
}

function _g36Draw() {
  const c   = document.getElementById('g36-canvas')
  const ctx = c.getContext('2d')
  const W = c.width, H = c.height

  // Background
  ctx.fillStyle = '#0a0a1a'
  ctx.fillRect(0, 0, W, H)

  // Big click zone hint
  const notStarted = G36.startTime === 0
  if (notStarted) {
    ctx.strokeStyle = 'rgba(99,102,241,0.2)'
    ctx.lineWidth = 2
    ctx.setLineDash([8, 8])
    const pad = 24
    ctx.strokeRect(pad, pad, W - pad*2, H - pad*2)
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(99,102,241,0.5)'
    ctx.font = `bold ${Math.min(W/12, 32)}px monospace`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('CLICK OR SPACE TO START', W/2, H/2 + 60)
  }

  // Ripples
  for (const r of G36.ripples) {
    ctx.strokeStyle = `rgba(129,140,248,${r.alpha})`
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI*2); ctx.stroke()
  }

  // Timer arc
  const cx = W/2, cy = H * 0.38, arcR = Math.min(W, H) * 0.28
  const progress = G36.startTime === 0 ? 1 : G36.timeLeft / G36_DURATION
  // bg ring
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 10; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.arc(cx, cy, arcR, -Math.PI/2, Math.PI*2 - Math.PI/2); ctx.stroke()
  // progress ring
  const col = progress > 0.5 ? '#6366f1' : progress > 0.25 ? '#f59e0b' : '#ef4444'
  ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 18
  ctx.beginPath(); ctx.arc(cx, cy, arcR, -Math.PI/2, Math.PI*2 * progress - Math.PI/2); ctx.stroke()
  ctx.shadowBlur = 0

  // Timer number inside arc
  ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.floor(arcR * 0.7)}px monospace`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(G36.startTime === 0 ? G36_DURATION : Math.ceil(G36.timeLeft), cx, cy)

  // CPS live
  const elapsed = G36.startTime > 0 ? (performance.now() - G36.startTime) / 1000 : 0
  const liveCPS = elapsed > 0.3 ? Math.round(G36.clicks / elapsed) : 0
  ctx.fillStyle = '#a5b4fc'; ctx.font = `bold ${Math.floor(arcR * 0.25)}px monospace`
  ctx.fillText(G36.startTime === 0 ? 'CPS' : `${liveCPS} CPS`, cx, cy + arcR * 0.55)

  // Click count big
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${Math.min(W/5, 90)}px monospace`
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
  ctx.shadowColor = '#6366f1'; ctx.shadowBlur = 20
  ctx.fillText(G36.clicks, W/2, H * 0.82)
  ctx.shadowBlur = 0

  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = `${Math.min(W/20, 18)}px monospace`
  ctx.fillText('CLICKS', W/2, H * 0.82 + 22)
}

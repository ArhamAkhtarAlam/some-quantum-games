// ═══════════════════════════════════════════════════════
//  GAME 30 — MICRO RTS
//  Control one unit. Click to move. Auto-attack nearby
//  enemies. Survive quantum-random waves. Score = kills.
// ═══════════════════════════════════════════════════════
const G30 = {
  active: false,
  px: 0, py: 0, ptx: 0, pty: 0,
  pHp: 10, pMaxHp: 10,
  pRange: 120, pAtkCd: 0, pAtkCdMax: 55,
  pSpeed: 160,
  enemies: [], bullets: [],
  score: 0, wave: 0,
  waveTimer: 0, betweenWaves: true,
  raf: null, lastTime: 0,
}
window._g30Score = 0

function stopGame30() {
  G30.active = false
  if (G30.raf) { cancelAnimationFrame(G30.raf); G30.raf = null }
}
window.stopGame30 = stopGame30

function initGame30() {
  stopGame30()
  document.getElementById('g30-over').classList.remove('show')
  document.getElementById('g30-overlay').style.display = 'flex'
  document.getElementById('g30-score-hud').textContent = '0'
  document.getElementById('g30-wave-hud').textContent = 'Wave 0'
  document.getElementById('g30-hp-hud').textContent = '10 / 10'
}

window.startRTS = function() {
  SFX.resume(); SFX.click()
  const c = document.getElementById('g30-canvas')
  c.width = c.parentElement.clientWidth
  c.height = c.parentElement.clientHeight
  document.getElementById('g30-overlay').style.display = 'none'

  const w = c.width, h = c.height
  G30.active = true
  G30.px = w * 0.3; G30.py = h * 0.5
  G30.ptx = G30.px; G30.pty = G30.py
  G30.pHp = 10; G30.pMaxHp = 10
  G30.pAtkCd = 0
  G30.enemies = []; G30.bullets = []
  G30.score = 0; G30.wave = 0
  G30.betweenWaves = true; G30.waveTimer = 120
  G30.lastTime = performance.now()

  c.onclick = function(e) {
    if (!G30.active) return
    const r = c.getBoundingClientRect()
    G30.ptx = e.clientX - r.left
    G30.pty = e.clientY - r.top
  }

  G30.raf = requestAnimationFrame(g30Loop)
}

function g30SpawnWave() {
  G30.wave++
  const c = document.getElementById('g30-canvas')
  const w = c.width, h = c.height
  const count = 3 + G30.wave * 2
  document.getElementById('g30-wave-hud').textContent = `Wave ${G30.wave}`
  for (let i = 0; i < count; i++) {
    const side = qRandInt(4)
    let ex, ey
    if (side === 0)      { ex = qRandInt(w); ey = -24 }
    else if (side === 1) { ex = w + 24; ey = qRandInt(h) }
    else if (side === 2) { ex = qRandInt(w); ey = h + 24 }
    else                 { ex = -24; ey = qRandInt(h) }
    const big = qRandInt(3) === 0
    G30.enemies.push({
      x: ex, y: ey,
      hp: big ? 4 : 1, maxHp: big ? 4 : 1,
      speed: big ? 55 : 90 + G30.wave * 5,
      r: big ? 14 : 9,
      atk: big ? 2 : 1,
      atkCd: 0, atkCdMax: big ? 80 : 55,
      color: big ? '#ef4444' : '#f87171',
      dead: false,
    })
  }
  G30.betweenWaves = false
}

function g30Loop(ts) {
  if (!G30.active) return
  const dt = Math.min((ts - G30.lastTime) / 1000, 0.05)
  G30.lastTime = ts
  const c = document.getElementById('g30-canvas')
  const ctx = c.getContext('2d')
  const w = c.width, h = c.height

  // Wave management
  if (G30.betweenWaves) {
    G30.waveTimer--
    if (G30.waveTimer <= 0) g30SpawnWave()
  } else if (G30.enemies.every(e => e.dead)) {
    G30.betweenWaves = true
    G30.waveTimer = 90
    G30.pHp = Math.min(G30.pMaxHp, G30.pHp + 2)
    document.getElementById('g30-hp-hud').textContent = `${G30.pHp} / ${G30.pMaxHp}`
    SFX.coin()
  }

  // Move player toward target
  const tdx = G30.ptx - G30.px, tdy = G30.pty - G30.py
  const tdist = Math.hypot(tdx, tdy)
  if (tdist > 3) {
    const step = Math.min(G30.pSpeed * dt, tdist)
    G30.px += (tdx / tdist) * step
    G30.py += (tdy / tdist) * step
  }

  // Auto-attack: find nearest enemy in range
  G30.pAtkCd = Math.max(0, G30.pAtkCd - 1)
  let nearest = null, nearDist = Infinity
  for (const e of G30.enemies) {
    if (e.dead) continue
    const d = Math.hypot(e.x - G30.px, e.y - G30.py)
    if (d < nearDist) { nearDist = d; nearest = e }
  }
  if (nearest && nearDist < G30.pRange && G30.pAtkCd === 0) {
    G30.pAtkCd = G30.pAtkCdMax
    G30.bullets.push({ x: G30.px, y: G30.py, target: nearest, speed: 320, r: 5, alive: true })
    SFX.tick()
  }

  // Move bullets (homing)
  for (const b of G30.bullets) {
    if (!b.alive) continue
    if (b.target.dead) { b.alive = false; continue }
    const bdx = b.target.x - b.x, bdy = b.target.y - b.y
    const bd = Math.hypot(bdx, bdy)
    if (bd < 8) {
      b.alive = false
      b.target.hp -= 1
      if (b.target.hp <= 0) {
        b.target.dead = true
        G30.score += b.target.maxHp > 1 ? 25 : 10
        SFX.hit()
        document.getElementById('g30-score-hud').textContent = G30.score
      }
    } else {
      b.x += (bdx / bd) * b.speed * dt
      b.y += (bdy / bd) * b.speed * dt
    }
  }
  G30.bullets = G30.bullets.filter(b => b.alive)

  // Enemy movement + attacks
  for (const e of G30.enemies) {
    if (e.dead) continue
    const edx = G30.px - e.x, edy = G30.py - e.y
    const ed = Math.hypot(edx, edy)
    if (ed > e.r + 14) {
      e.x += (edx / ed) * e.speed * dt
      e.y += (edy / ed) * e.speed * dt
    } else {
      e.atkCd = Math.max(0, e.atkCd - 1)
      if (e.atkCd === 0) {
        e.atkCd = e.atkCdMax
        G30.pHp -= e.atk
        SFX.error()
        document.getElementById('g30-hp-hud').textContent = `${G30.pHp} / ${G30.pMaxHp}`
        if (G30.pHp <= 0) { endGame30(); return }
      }
    }
  }

  // ─── Draw ───
  ctx.fillStyle = '#0d1117'
  ctx.fillRect(0, 0, w, h)

  // Grid background
  ctx.strokeStyle = '#1a2332'; ctx.lineWidth = 1
  for (let x = 0; x < w; x += 48) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke() }
  for (let y = 0; y < h; y += 48) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke() }

  // Move target marker
  if (tdist > 10) {
    ctx.beginPath(); ctx.arc(G30.ptx, G30.pty, 6, 0, Math.PI * 2)
    ctx.strokeStyle = '#60a5fa55'; ctx.lineWidth = 1.5; ctx.stroke()
    ctx.beginPath(); ctx.moveTo(G30.ptx - 10, G30.pty); ctx.lineTo(G30.ptx + 10, G30.pty)
    ctx.moveTo(G30.ptx, G30.pty - 10); ctx.lineTo(G30.ptx, G30.pty + 10)
    ctx.strokeStyle = '#60a5fa44'; ctx.stroke()
  }

  // Attack range ring
  ctx.beginPath(); ctx.arc(G30.px, G30.py, G30.pRange, 0, Math.PI * 2)
  ctx.strokeStyle = '#60a5fa18'; ctx.lineWidth = 1; ctx.stroke()

  // Bullets
  for (const b of G30.bullets) {
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
    ctx.fillStyle = '#93c5fd'; ctx.fill()
  }

  // Enemies
  for (const e of G30.enemies) {
    if (e.dead) continue
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2)
    ctx.fillStyle = e.color; ctx.fill()
    if (e.maxHp > 1) {
      const bx = e.x - e.r, by = e.y - e.r - 8
      ctx.fillStyle = '#333'; ctx.fillRect(bx, by, e.r * 2, 4)
      ctx.fillStyle = '#ef4444'; ctx.fillRect(bx, by, e.r * 2 * (e.hp / e.maxHp), 4)
    }
  }

  // Player glow
  const pGrad = ctx.createRadialGradient(G30.px, G30.py, 0, G30.px, G30.py, 22)
  pGrad.addColorStop(0, '#60a5fa88'); pGrad.addColorStop(1, '#60a5fa00')
  ctx.beginPath(); ctx.arc(G30.px, G30.py, 22, 0, Math.PI * 2)
  ctx.fillStyle = pGrad; ctx.fill()
  ctx.beginPath(); ctx.arc(G30.px, G30.py, 12, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'; ctx.fill()

  // Player HP bar
  ctx.fillStyle = '#333'; ctx.fillRect(G30.px - 30, G30.py - 28, 60, 5)
  ctx.fillStyle = G30.pHp > G30.pMaxHp * 0.4 ? '#60a5fa' : '#ef4444'
  ctx.fillRect(G30.px - 30, G30.py - 28, 60 * (G30.pHp / G30.pMaxHp), 5)

  // Wave countdown banner
  if (G30.betweenWaves && G30.waveTimer > 0) {
    ctx.fillStyle = 'rgba(0,0,0,.65)'
    ctx.fillRect(w / 2 - 90, 14, 180, 26)
    ctx.fillStyle = '#60a5fa'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center'
    ctx.fillText(`Wave ${G30.wave + 1} incoming in ${Math.ceil(G30.waveTimer / 60)}s`, w / 2, 31)
    ctx.textAlign = 'left'
  }

  G30.raf = requestAnimationFrame(g30Loop)
}

function endGame30() {
  SFX.die()
  stopGame30()
  window._g30Score = G30.score
  document.getElementById('g30-final-score').textContent = G30.score + ' pts'
  renderMedalDisplay('g30-medal-display', 'mrts', G30.score)
  document.getElementById('g30-over').classList.add('show')
}

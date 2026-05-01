// ═══════════════════════════════════════════════════════
//  GAME 12 — QUANTUM TUNNELING RUNNER
//  Space/W/↑ = jump | Q = quantum tunnel | B = burst
//  ESC = pause & shop
// ═══════════════════════════════════════════════════════

const G12_PU = {
  shield:  { icon:'🛡️', name:'Shield',        consumable:false, tiers:[
    { cost:50,  desc:'Absorb 1 hit' },
    { cost:120, desc:'Absorb 2 hits' },
    { cost:280, desc:'Absorb 3 hits' },
  ]},
  jump:    { icon:'🦘', name:'Extra Jump',     consumable:false, tiers:[
    { cost:75,  desc:'3 jumps max' },
    { cost:180, desc:'4 jumps max' },
    { cost:400, desc:'5 jumps max' },
  ]},
  tunnel:  { icon:'🌀', name:'Tunnel Upgrade', consumable:false, tiers:[
    { cost:60,  desc:'4 charges, faster recharge' },
    { cost:150, desc:'5 charges, much faster' },
    { cost:320, desc:'6 charges, instant recharge' },
  ]},
  slow:    { icon:'⏱️', name:'Slow World',     consumable:false, tiers:[
    { cost:80,  desc:'World 5% slower' },
    { cost:200, desc:'World 10% slower' },
    { cost:450, desc:'World 15% slower' },
  ]},
  magnet:  { icon:'🧲', name:'Orb Magnet',     consumable:false, tiers:[
    { cost:100, desc:'Attract orbs 80px' },
    { cost:260, desc:'Attract orbs 160px' },
  ]},
  burst:   { icon:'💥', name:'Burst',          consumable:true,  tiers:[
    { cost:120, desc:'Clear all walls on screen' },
  ]},
}
const G12_PU_KEYS = ['shield','jump','tunnel','slow','magnet','burst']

let G12 = {}
const G12_FLOOR = 340, G12_CEIL = 60
const G12_PW = 26, G12_PH = 34
let g12Canvas, g12Ctx, g12Raf, g12KD, g12KU

function g12Reset() {
  G12 = {
    score:0, dist:0, lives:3, shieldHP:0, active:false, paused:false,
    px:110, py:G12_FLOOR - G12_PH, vy:0, onGround:true,
    maxJumps:2, jumpsLeft:2,
    tunnelCharge:3, tunnelMax:3, tunnelCooldown:0,
    tunneling:false, tunnelFrames:0,
    burstCount:0, puCoins:0,
    scrollX:0, frameCount:0,
    obstacles:[], orbs:[], particles:[],
    puLevels:{ shield:0, jump:0, tunnel:0, slow:0, magnet:0, burst:0 },
    keys:{},
  }
}

async function initGame12() {
  g12Reset()
  document.getElementById('g12-over').classList.remove('show')
  document.getElementById('g12-pause').style.display = 'none'
  g12Canvas = document.getElementById('g12-canvas')
  g12Ctx = g12Canvas.getContext('2d')
  const arena = document.getElementById('g12-arena')
  g12Canvas.width  = arena.clientWidth  || 800
  g12Canvas.height = arena.clientHeight || 420
  document.getElementById('g12-overlay').style.display = 'flex'
  setEntropyLive(false)
  await initCurby()
  document.getElementById('g12-overlay').style.display = 'none'
  g12Start()
}

function g12Start() {
  document.getElementById('g12-lives').textContent = '❤️❤️❤️'
  // pre-generate terrain
  for (let i = 0; i < 10; i++) g12SpawnChunk(700 + i * 300)
  if (g12KD) document.removeEventListener('keydown', g12KD)
  if (g12KU) document.removeEventListener('keyup',   g12KU)
  g12KD = e => {
    G12.keys[e.code] = true
    if (e.code === 'Escape') { e.preventDefault(); g12TogglePause(); return }
    if (G12.paused || !G12.active) return
    if (['Space','ArrowUp','KeyW'].includes(e.code)) { e.preventDefault(); g12Jump() }
    if (e.code === 'KeyQ') g12Tunnel()
    if (e.code === 'KeyB') g12UseBurst()
  }
  g12KU = e => { G12.keys[e.code] = false }
  document.addEventListener('keydown', g12KD)
  document.addEventListener('keyup',   g12KU)
  G12.active = true
  cancelAnimationFrame(g12Raf)
  g12Loop()
}

function g12Jump() {
  if (G12.jumpsLeft <= 0) return
  SFX.jump()
  G12.vy = -13.5
  G12.onGround = false
  G12.jumpsLeft--
}

function g12Tunnel() {
  if (G12.tunneling || G12.tunnelCharge <= 0 || G12.tunnelCooldown > 0) return
  SFX.whoosh()
  G12.tunnelCharge--
  G12.tunneling = true
  G12.tunnelFrames = 0
  G12.tunnelCooldown = [90,70,50,25][G12.puLevels.tunnel] || 90
}

function g12UseBurst() {
  if (G12.burstCount <= 0) return
  SFX.powerup()
  G12.burstCount--
  G12.obstacles = G12.obstacles.filter(o => {
    if (o.type !== 'gap') {
      for (let i = 0; i < 10; i++)
        G12.particles.push({ x:o.x+o.w/2, y:o.y+o.h/2,
          vx:(Math.random()-0.5)*7, vy:(Math.random()-1.2)*5, life:35, col:'#f97316' })
      return false
    }
    return true
  })
  setTimeout(() => g12RenderPause(), 0)
}

function g12IsOverGap(px) {
  const cx = px + G12_PW / 2
  return G12.obstacles.some(o => o.type === 'gap' && cx > o.x + 4 && cx < o.x + o.w - 4)
}

function g12SpawnChunk(atX) {
  const r = qRandInt(10)
  if (r < 4) {
    const h = 55 + qRandInt(90)
    G12.obstacles.push({ x:atX, y:G12_FLOOR - h, w:28, h, type:'wall' })
  } else if (r < 6) {
    G12.obstacles.push({ x:atX, y:G12_FLOOR, w:70 + qRandInt(60), h:80, type:'gap' })
  } else if (r < 8) {
    // Low-hanging bar — duck by staying low (no crouch, so just narrower gap)
    const barH = 16 + qRandInt(14)
    G12.obstacles.push({ x:atX, y:G12_CEIL, w:90 + qRandInt(60), h:barH, type:'ceiling' })
  }
  const count = 1 + qRandInt(4)
  for (let i = 0; i < count; i++) {
    G12.orbs.push({
      x: atX + 20 + qRandInt(250),
      y: G12_CEIL + 50 + qRandInt(G12_FLOOR - G12_CEIL - 110),
      collected: false,
    })
  }
}

function g12Loop() {
  if (!G12.active) return
  g12Raf = requestAnimationFrame(g12Loop)
  if (G12.paused) return

  const W = g12Canvas.width, H = g12Canvas.height
  const ctx = g12Ctx
  const slowMul = [1, 0.95, 0.90, 0.85][G12.puLevels.slow] || 1
  const speed = (4.5 + G12.frameCount / 2500) * slowMul
  G12.frameCount++
  G12.dist = Math.floor(G12.frameCount * speed / 10)

  // Tunnel recharge
  if (G12.tunnelCooldown > 0) G12.tunnelCooldown--
  const maxCharge = [3,4,5,6][G12.puLevels.tunnel] || 3
  G12.tunnelMax = maxCharge
  const rechargeEvery = [14,10,7,3][G12.puLevels.tunnel] || 14
  if (G12.tunnelCharge < G12.tunnelMax && G12.tunnelCooldown <= 0 && G12.frameCount % rechargeEvery === 0)
    G12.tunnelCharge = Math.min(G12.tunnelCharge + 1, G12.tunnelMax)

  // Tunnel dash
  if (G12.tunneling) {
    G12.tunnelFrames++
    if (G12.tunnelFrames >= 28) G12.tunneling = false
  }

  // Physics
  G12.vy = Math.min(G12.vy + 0.58, 16)
  G12.py += G12.vy

  // Floor
  const overGap = g12IsOverGap(G12.px)
  if (G12.py + G12_PH >= G12_FLOOR) {
    if (!overGap) {
      G12.py = G12_FLOOR - G12_PH
      G12.vy = 0
      G12.onGround = true
      G12.jumpsLeft = G12.maxJumps
    } else if (G12.py > H + 50) {
      g12Hit()
    }
  }
  // Ceiling
  if (G12.py <= G12_CEIL) { G12.py = G12_CEIL; G12.vy = 2 }

  // Scroll
  for (const o of G12.obstacles) o.x -= speed
  for (const o of G12.orbs)      o.x -= speed
  for (const p of G12.particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.22; p.life-- }
  G12.particles = G12.particles.filter(p => p.life > 0)

  // Spawn more
  const lastX = G12.obstacles.reduce((m, o) => Math.max(m, o.x + o.w), 0)
  if (lastX < W + 500) g12SpawnChunk(W + 200 + qRandInt(250))
  G12.obstacles = G12.obstacles.filter(o => o.x + o.w > -100)
  G12.orbs      = G12.orbs.filter(o => o.x > -30)

  // Magnet + orb collect
  const magR = [0,80,160][G12.puLevels.magnet] || 0
  for (const o of G12.orbs) {
    if (o.collected) continue
    const dx = G12.px + G12_PW/2 - o.x, dy = G12.py + G12_PH/2 - o.y
    const d = Math.hypot(dx, dy)
    if (d < magR && d > 1) { o.x += dx/d*5; o.y += dy/d*5 }
    if (d < G12_PW + 4) {
      o.collected = true
      G12.puCoins += 10
      G12.score   += 10
      for (let i = 0; i < 5; i++)
        G12.particles.push({ x:o.x, y:o.y, vx:(Math.random()-0.5)*4, vy:-Math.random()*4, life:22, col:'#fbbf24' })
    }
  }
  G12.orbs = G12.orbs.filter(o => !o.collected)

  // Wall collision (skip when tunneling)
  if (!G12.tunneling) {
    for (const o of G12.obstacles) {
      if (o.type === 'gap') continue
      if (G12.px < o.x + o.w && G12.px + G12_PW > o.x &&
          G12.py < o.y + o.h && G12.py + G12_PH > o.y) {
        g12Hit()
        break
      }
    }
  }

  G12.score = G12.dist + G12.puCoins

  // ─── Draw ───
  ctx.clearRect(0, 0, W, H)
  // BG
  ctx.fillStyle = '#0a0a18'
  ctx.fillRect(0, 0, W, H)
  // Grid lines
  ctx.strokeStyle = 'rgba(99,102,241,0.08)'
  ctx.lineWidth = 1
  const gOff = (G12.frameCount * speed * 0.3) % 60
  for (let x = -gOff; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
  for (let y = 0; y < H; y += 60)     { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }

  // Floor platform
  ctx.fillStyle = '#1e1b4b'
  ctx.fillRect(0, G12_FLOOR, W, H - G12_FLOOR)
  ctx.fillStyle = '#6366f1'
  ctx.fillRect(0, G12_FLOOR - 3, W, 4)
  // Ceiling band
  ctx.fillStyle = '#1e1b4b'
  ctx.fillRect(0, 0, W, G12_CEIL)
  ctx.fillStyle = '#6366f1'
  ctx.fillRect(0, G12_CEIL - 1, W, 4)

  // Draw floor gaps as holes
  for (const o of G12.obstacles) {
    if (o.type === 'gap') {
      ctx.fillStyle = '#0a0a18'
      ctx.fillRect(o.x, G12_FLOOR - 3, o.w, H - G12_FLOOR + 10)
      // Danger stripes
      ctx.strokeStyle = '#dc2626'
      ctx.lineWidth = 2
      ctx.setLineDash([8,6])
      ctx.strokeRect(o.x + 2, G12_FLOOR, o.w - 4, 20)
      ctx.setLineDash([])
    }
  }

  // Obstacles
  for (const o of G12.obstacles) {
    if (o.type === 'wall') {
      const g = ctx.createLinearGradient(o.x, o.y, o.x + o.w, o.y + o.h)
      g.addColorStop(0, '#dc2626')
      g.addColorStop(1, '#7f1d1d')
      ctx.fillStyle = g
      ctx.fillRect(o.x, o.y, o.w, o.h)
      ctx.fillStyle = '#fca5a5'
      ctx.fillRect(o.x, o.y, o.w, 3)
    } else if (o.type === 'ceiling') {
      ctx.fillStyle = '#7c3aed'
      ctx.fillRect(o.x, G12_CEIL, o.w, o.h)
      ctx.fillStyle = '#c4b5fd'
      ctx.fillRect(o.x, G12_CEIL + o.h - 3, o.w, 3)
    }
  }

  // Orbs
  for (const o of G12.orbs) {
    ctx.beginPath()
    ctx.arc(o.x, o.y, 7, 0, Math.PI*2)
    const og = ctx.createRadialGradient(o.x-2, o.y-2, 1, o.x, o.y, 7)
    og.addColorStop(0, '#fef9c3')
    og.addColorStop(1, '#f59e0b')
    ctx.fillStyle = og
    ctx.fill()
  }

  // Particles
  for (const p of G12.particles) {
    ctx.globalAlpha = p.life / 35
    ctx.beginPath()
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI*2)
    ctx.fillStyle = p.col
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // Shield glow
  if (G12.shieldHP > 0) {
    ctx.strokeStyle = '#22d3ee'
    ctx.lineWidth = 3
    ctx.shadowBlur = 12
    ctx.shadowColor = '#22d3ee'
    ctx.beginPath()
    ctx.arc(G12.px + G12_PW/2, G12.py + G12_PH/2, G12_PW + 6, 0, Math.PI*2)
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  // Player
  const alpha = G12.tunneling ? 0.25 + 0.55 * Math.abs(Math.sin(G12.tunnelFrames * 0.35)) : 1
  ctx.globalAlpha = alpha
  if (G12.tunneling) { ctx.shadowBlur = 18; ctx.shadowColor = '#818cf8' }
  ctx.fillStyle = '#6366f1'
  ctx.beginPath()
  ctx.roundRect(G12.px, G12.py, G12_PW, G12_PH, 5)
  ctx.fill()
  ctx.fillStyle = '#e0e7ff'
  ctx.fillRect(G12.px + 5, G12.py + 7, 7, 7)
  ctx.shadowBlur = 0
  ctx.globalAlpha = 1

  // Tunnel charge pips
  for (let i = 0; i < G12.tunnelMax; i++) {
    ctx.beginPath()
    ctx.arc(G12.px + 4 + i * 12, G12.py - 10, 4, 0, Math.PI*2)
    ctx.fillStyle = i < G12.tunnelCharge ? '#818cf8' : '#374151'
    ctx.fill()
  }

  // HUD
  document.getElementById('g12-score-hud').textContent = G12.score
  document.getElementById('g12-coins-hud').textContent = '🪙 ' + G12.puCoins
  document.getElementById('g12-dist-hud').textContent  = G12.dist + 'm'
  document.getElementById('g12-burst-hud').textContent = G12.burstCount > 0 ? '💥 ×' + G12.burstCount : ''
}

function g12Hit() {
  if (G12.shieldHP > 0) {
    G12.shieldHP--
    G12.tunneling = true; G12.tunnelFrames = 0
    return
  }
  G12.lives--
  for (let i = 0; i < 14; i++)
    G12.particles.push({ x:G12.px+G12_PW/2, y:G12.py+G12_PH/2,
      vx:(Math.random()-0.5)*9, vy:(Math.random()-1.1)*7, life:40, col:'#ef4444' })
  if (G12.lives <= 0) { endGame12(); return }
  G12.py = G12_FLOOR - G12_PH - 5; G12.vy = -9
  G12.tunneling = true; G12.tunnelFrames = 0
  document.getElementById('g12-lives').textContent = '❤️'.repeat(Math.max(0,G12.lives)) + '🖤'.repeat(Math.max(0,3-G12.lives))
}

function g12TogglePause() {
  if (!G12.active) return
  G12.paused = !G12.paused
  const p = document.getElementById('g12-pause')
  if (G12.paused) { p.style.display = 'flex'; setTimeout(() => g12RenderPause(), 0) }
  else p.style.display = 'none'
}

function g12RenderPause() {
  const cont = document.getElementById('g12-pu-list')
  cont.innerHTML = ''
  document.getElementById('g12-pause-coins').textContent = '🪙 ' + G12.puCoins
  for (const key of G12_PU_KEYS) {
    const pu = G12_PU[key]
    const lvl = G12.puLevels[key]
    const tier = pu.tiers[pu.consumable ? 0 : Math.min(lvl, pu.tiers.length - 1)]
    const maxed = !pu.consumable && lvl >= pu.tiers.length
    const label = pu.consumable
      ? `${pu.icon} ${pu.name} (×${key==='burst'?G12.burstCount:0})`
      : `${pu.icon} ${pu.name} ${maxed ? '(MAX)' : `Lvl ${lvl}→${lvl+1}`}`
    const d = document.createElement('div')
    d.className = 'g12-pu-item'
    d.innerHTML = `<span>${label}</span><small style="color:var(--muted)">${maxed?'✓':tier.desc}</small><button class="btn-primary" style="font-size:.75rem;padding:.25rem .7rem" ${maxed||(!pu.consumable&&G12.puCoins<tier.cost)?'disabled':''} onclick="g12BuyPU('${key}')">${maxed?'MAX':'🪙 '+tier.cost}</button>`
    cont.appendChild(d)
  }
}

window.g12BuyPU = function(key) {
  const pu = G12_PU[key]
  const lvl = G12.puLevels[key]
  if (!pu.consumable && lvl >= pu.tiers.length) return
  const tier = pu.tiers[pu.consumable ? 0 : lvl]
  if (G12.puCoins < tier.cost) return
  G12.puCoins -= tier.cost
  if (pu.consumable) {
    if (key === 'burst') G12.burstCount++
  } else {
    G12.puLevels[key]++
    if (key === 'shield') G12.shieldHP = G12.puLevels.shield
    if (key === 'jump')   G12.maxJumps = 2 + G12.puLevels.jump
    if (key === 'tunnel') G12.tunnelMax = 3 + G12.puLevels.tunnel
  }
  setTimeout(() => g12RenderPause(), 0)
}

function endGame12() {
  SFX.die()
  G12.active = false
  cancelAnimationFrame(g12Raf)
  if (g12KD) document.removeEventListener('keydown', g12KD)
  if (g12KU) document.removeEventListener('keyup',   g12KU)
  window._g12Score = G12.score
  document.getElementById('g12-final-score').textContent = G12.score
  document.getElementById('g12-final-dist').textContent  = G12.dist + 'm'
  renderMedalDisplay('g12-medal-display', 'runner', G12.score)
  document.getElementById('g12-over').classList.add('show')
}

// ═══════════════════════════════════════════════════════
//  GAME 10 — GRAVITY WELLS
//  Score = floor(seconds) + orbsCollected*10 + wellsDestroyed*50 - pointsSpent
// ═══════════════════════════════════════════════════════

// ── Powerup config ──────────────────────────────────────
const G10_PU = {
  orbs:    { icon:'🟡', name:'More Orbs',       consumable:true,  tiers:[
    { cost:30,  desc:'+3 orbs' },
    { cost:55,  desc:'+7 orbs' },
    { cost:90,  desc:'+15 orbs' },
    { cost:150, desc:'+25 orbs' },
  ]},
  scatter: { icon:'💥', name:'Scatter',          consumable:true,  tiers:[
    { cost:200,  desc:'Scatter all wells' },
    { cost:450,  desc:'Scatter + half speed' },
    { cost:750,  desc:'Scatter + stun 5s' },
    { cost:1000, desc:'💣 NUKE (destroy all)' },
  ]},
  speed:   { icon:'⚡', name:'Speed Boost',      consumable:false, tiers:[
    { cost:50,   dur:10,       desc:'10s speed boost' },
    { cost:100,  dur:25,       desc:'25s speed boost' },
    { cost:200,  dur:60,       desc:'60s speed boost' },
    { cost:500,  dur:Infinity, desc:'Permanent!' },
  ]},
  gravity: { icon:'🌀', name:'Weak Gravity',     consumable:false, tiers:[
    { cost:75,   dur:10,       desc:'10s weak gravity' },
    { cost:150,  dur:25,       desc:'25s weak gravity' },
    { cost:300,  dur:60,       desc:'60s weak gravity' },
    { cost:800,  dur:Infinity, desc:'Permanent!' },
  ]},
  freeze:  { icon:'❄️', name:'Freeze Wells',     consumable:false, tiers:[
    { cost:150,  dur:10,       desc:'Freeze 10s' },
    { cost:300,  dur:25,       desc:'Freeze 25s' },
    { cost:600,  dur:60,       desc:'Freeze 60s' },
    { cost:2500, dur:Infinity, desc:'🧊 PERMANENT FREEZE' },
  ]},
  nodrag:  { icon:'🛡️', name:'No Pull',          consumable:false, tiers:[
    { cost:200,  dur:10,       desc:'No pull 10s' },
    { cost:400,  dur:25,       desc:'No pull 25s' },
    { cost:700,  dur:60,       desc:'No pull 60s' },
    { cost:5000, dur:Infinity, desc:'🛡️ PERMANENT' },
  ]},
  chain:    { icon:'⛓', name:'Chain Reaction',    consumable:false, tiers:[
    { cost:150, desc:'5 hops · 100px range' },
    { cost:400, desc:'8 hops · 150px range' },
    { cost:900, desc:'∞ hops · 220px range' },
  ]},
  multishot: { icon:'🔱', name:'Multi-Shot',       consumable:false, tiers:[
    { cost:200, desc:'3 bullets spread' },
    { cost:500, desc:'5 bullets spread' },
    { cost:1000, desc:'7 bullets spread' },
  ]},
  gun:     { icon:'🔫', name:'Gun Upgrade',      consumable:false, tiers:[
    { cost:100, desc:'Kill in 2 shots' },
    { cost:350, desc:'Kill in 1 shot!' },
  ]},
  reload:  { icon:'🎯', name:'Auto-Aim Rate',   consumable:false, tiers:[
    { cost:150, desc:'Cooldown 1s' },
    { cost:300, desc:'Cooldown 0.5s' },
    { cost:600, desc:'Cooldown 0.2s' },
    { cost:1200, desc:'⚡ No cooldown!' },
  ]},
  nocorner: { icon:'🕳️', name:'Remove Corners',  consumable:false, tiers:[
    { cost:300,  dur:10,       desc:'Hide corners 10s' },
    { cost:550,  dur:25,       desc:'Hide corners 25s' },
    { cost:900,  dur:60,       desc:'Hide corners 60s' },
    { cost:3000, dur:Infinity, desc:'🕳️ PERMANENT' },
  ]},
  nospawn:  { icon:'🚫', name:'No Spawn',         consumable:false, tiers:[
    { cost:200,  dur:15,       desc:'No spawns 15s' },
    { cost:380,  dur:35,       desc:'No spawns 35s' },
    { cost:650,  dur:90,       desc:'No spawns 90s' },
    { cost:2000, dur:Infinity, desc:'🚫 PERMANENT' },
  ]},
  ghost:    { icon:'👻', name:'Ghost Mode',        consumable:false, tiers:[
    { cost:250,  dur:3,        desc:'Invincible 3s' },
    { cost:500,  dur:7,        desc:'Invincible 7s' },
    { cost:900,  dur:15,       desc:'Invincible 15s' },
    { cost:4000, dur:Infinity, desc:'👻 PERMANENT' },
  ]},
  shield:   { icon:'🛡️', name:'Shield Upgrade',     consumable:false, tiers:[
    { cost:120, desc:'Shield lasts 2× longer' },
    { cost:350, desc:'Shield lasts 4× longer' },
    { cost:800, desc:'⚡ Instant recharge' },
    { cost:2000, desc:'♾️ No drain!' },
  ]},
  magnetpow: { icon:'⚡🧲', name:'Magnet Power',     consumable:false, tiers:[
    { cost:100,  desc:'2× reach & pull' },
    { cost:250,  desc:'4× reach & pull' },
    { cost:500,  desc:'8× reach & pull' },
    { cost:1000, desc:'Pulls from anywhere' },
    { cost:2500, desc:'✨ AUTO-COLLECT all orbs!' },
  ]},
  magnet:   { icon:'🧲', name:'Orb Magnet',        consumable:false, tiers:[
    { cost:150,  dur:10,       desc:'Attract orbs 10s' },
    { cost:280,  dur:25,       desc:'Attract orbs 25s' },
    { cost:500,  dur:60,       desc:'Attract orbs 60s' },
    { cost:1500, dur:Infinity, desc:'🧲 PERMANENT' },
  ]},
}

// ── Settings (persisted) ────────────────────────────────
const G10_SETTINGS = {
  get moveMode()  { return localStorage.getItem('g10_moveMode')  || 'wasd' },
  set moveMode(v) { localStorage.setItem('g10_moveMode', v) },
  get shootDir()  { return localStorage.getItem('g10_shootDir')  || 'mouse' },
  set shootDir(v) { localStorage.setItem('g10_shootDir', v) },
  get autoAim()   { return localStorage.getItem('g10_autoAim') === '1' },
  set autoAim(v)  { localStorage.setItem('g10_autoAim', v ? '1' : '0') },
}

// ── State ───────────────────────────────────────────────
const G10 = {
  active: false,
  paused: false,
  pauseStart: 0,
  startTime: null,
  elapsed: 0,
  animFrame: null,
  keys: {},
  playerX: 0, playerY: 0,
  vx: 0, vy: 0,
  mouseX: 0, mouseY: 0,   // for aimed shooting
  lastShotAngle: -Math.PI/2,
  aimAngle: -Math.PI/2,   // for split mode
  aimLocked: false,       // true = free-aim (A/D used), false = track mouse
  wells: [],
  ghosts: [],
  orbs: [],
  bullets: [],
  boss: null,
  bosses: [],
  bossBullets: [],
  nextBossSpawn: 45,
  shieldEnergy: 100,
  orbScore: 0,
  wellsDestroyed: 0,
  combo: 0,            // consecutive orbs collected within 4s
  lastOrbCollect: 0,   // elapsed when last orb collected
  comboMultiplier: 1,  // current point multiplier for orbs
  canvas: null,
  ctx: null,
  spawnCount: 0,
  lastOrbTime: 0,
  hunting: false,
  wasHunting: false,
  pointsSpent: 0,
  particles: [],
  floaters: [],          // score pop-up text
  shake: { frames:0, intensity:0 },
  aravMode: false,
  aravKeyBuf: '',
  arhamMode: false, arhamType: 0,
  bossMode: false,
  // Powerup state
  puLevels:    { speed:0, gravity:0, freeze:0, nodrag:0, gun:0, nocorner:0, nospawn:0, ghost:0, magnet:0, reload:0 },
  lastShotTime: 0,
  puOrbTier:   0,
  puScatterTier: 0,
  speedUntil:   0,
  gravityUntil: 0,
  freezeUntil:  0,
  nodragUntil:  0,
  nocornerUntil: 0,
  nospawnUntil:  0,
  ghostUntil:   0,
  magnetUntil:  0,
}

function stopGame10() {
  cancelAnimationFrame(G10.animFrame)
  G10.animFrame = null
  G10.active = false
  G10.paused = false
  G10.keys = {}
  const arena = document.getElementById('g10-arena')
  if (arena) {
    arena.removeEventListener('mousemove', g10MouseMove)
    arena.removeEventListener('mousemove', g10TrackMouse)
    arena.removeEventListener('mousedown', g10MouseShoot)
  }
  document.removeEventListener('keydown', g10KeyDown)
  document.removeEventListener('keyup', g10KeyUp)
  const po = document.getElementById('g10-pause-overlay')
  if (po) po.style.display = 'none'
  ;['g10-boss-bar','g10-reload-bar','g10-orb-bar','g10-danger-bar'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none'
  })
}
window.stopGame10 = stopGame10

async function initGame10() {
  stopGame10()
  Object.assign(G10, {
    active:false, elapsed:0, keys:{}, vx:0, vy:0,
    wells:[], ghosts:[], orbs:[], bullets:[],
    boss:null, bosses:[], bossBullets:[], nextBossSpawn:45, shieldEnergy:100,
    orbScore:0, wellsDestroyed:0, spawnCount:0,
    lastOrbTime:0, hunting:false, wasHunting:false,
    paused:false, pauseStart:0, pointsSpent:0,
    combo:0, lastOrbCollect:0, comboMultiplier:1, lastAutoCollect:0,
    maxCombo:0, orbsCollected:0, chainCount:0, goldenDestroyed:0, goldenBonus:0, bossKills:0, dangerEventsCount:0,
    dangerMeter:0, lastDangerEvent:-30, devMode:false, fps:60, fpsFrames:0, fpsLastTime:0,
    speedRushUntil:0, gravityFlipUntil:0,
    particles:[], floaters:[], shake:{frames:0,intensity:0},
    aravMode:false, aravKeyBuf:'',
    arhamMode:false, arhamType:0,
    bossMode:false,
    puLevels:{ speed:0, gravity:0, freeze:0, nodrag:0, gun:0, chain:0, multishot:0, nocorner:0, nospawn:0, ghost:0, magnet:0, reload:0, shield:0, magnetpow:0 },
    lastShotTime: 0,
    puOrbTier:0, puScatterTier:0,
    speedUntil:0, gravityUntil:0, freezeUntil:0, nodragUntil:0,
    nocornerUntil:0, nospawnUntil:0, ghostUntil:0, magnetUntil:0,
    lastShotAngle: -Math.PI/2,
    aimAngle: -Math.PI/2,
    aimLocked: false,
  })
  document.getElementById('g10-over').classList.remove('show')
  document.getElementById('g10-score').textContent = '0 pts'
  document.getElementById('g10-overlay').style.display = 'flex'
  document.getElementById('g10-timer-display').textContent = ''
  G10.canvas = document.getElementById('g10-canvas')
  G10.ctx = G10.canvas.getContext('2d')
  await initCurby()
}

window.startGravity = function() {
  document.getElementById('g10-overlay').style.display = 'none'
  const arena = document.getElementById('g10-arena')
  const rect = arena.getBoundingClientRect()
  G10.canvas.width = rect.width
  G10.canvas.height = rect.height
  const w = G10.canvas.width, h = G10.canvas.height
  const pad = 18

  G10.playerX = w / 2; G10.playerY = h / 2
  G10.mouseX = w / 2;  G10.mouseY = h / 2
  G10.active = true; G10.paused = false
  G10.startTime = Date.now(); G10.elapsed = 0
  G10.wells = []; G10.ghosts = []

  const corners = [
    {x:pad,y:pad},{x:w-pad,y:pad},{x:pad,y:h-pad},{x:w-pad,y:h-pad}
  ]
  for (const c of corners)
    G10.wells.push({x:c.x,y:c.y,vx:0,vy:0,mass:700,r:16,corner:true,health:Infinity,maxHealth:Infinity,cracks:[]})

  queueNextGhost()
  for (let i = 0; i < 5; i++) spawnG10Orb()

  arena.addEventListener('mousemove', g10MouseMove)
  arena.addEventListener('mousemove', g10TrackMouse)
  arena.addEventListener('mousedown', g10MouseShoot)
  document.addEventListener('keydown', g10KeyDown)
  document.addEventListener('keyup',   g10KeyUp)
  g10Loop()
}

function g10TrackMouse(e) {
  const rect = document.getElementById('g10-arena').getBoundingClientRect()
  G10.mouseX = e.clientX - rect.left
  G10.mouseY = e.clientY - rect.top
}

function g10Interval(n) {
  if (n < 5)  return 15
  if (n < 10) return 10
  return Math.max(5, 9 - Math.floor((n - 10) / 5))
}

function queueNextGhost() {
  const w = G10.canvas.width, h = G10.canvas.height, margin = 50
  let x, y, attempts = 0
  do {
    x = margin + qRandInt(w - margin*2)
    y = margin + qRandInt(h - margin*2)
    attempts++
  } while (Math.hypot(x - G10.playerX, y - G10.playerY) < 120 && attempts < 20)
  const interval = g10Interval(G10.spawnCount) * (G10.aravMode ? 0.5 : 1) * (G10.bossMode ? 0.25 : 1)
  G10.ghosts.push({x, y, spawnAt: G10.elapsed + interval})
}

function g10MouseShoot(e) {
  if (!G10.active || G10.paused) return
  if (e.button !== 0) return
  e.preventDefault()
  g10Shoot()
}

function g10MouseMove(e) {
  if (!G10.active || G10.paused) return
  if (G10_SETTINGS.moveMode !== 'mouse') return
  const rect = document.getElementById('g10-arena').getBoundingClientRect()
  G10.vx += (e.clientX - rect.left - G10.playerX) * 0.015
  G10.vy += (e.clientY - rect.top  - G10.playerY) * 0.015
}

function g10KeyDown(e) {
  if (!document.getElementById('game10').classList.contains('active')) return
  if (e.key === 'Escape') {
    if (!G10.active) return
    G10.paused ? g10Resume() : g10Pause()
    return
  }
  if (e.key === ' ' || e.key === 'Space') {
    e.preventDefault()
    if (G10.active && !G10.paused) g10Shoot()
    return
  }
  if (e.key === 'v' || e.key === 'V') {
    if (G10.active && !G10.paused) {
      G10_SETTINGS.autoAim = !G10_SETTINGS.autoAim
      g10Floater(G10.playerX, G10.playerY - 20,
        G10_SETTINGS.autoAim ? '🎯 AUTO-AIM ON' : '🎯 AUTO-AIM OFF', '#34d399')
      // fall through so 'v' still reaches the easter egg buffer below
    }
  }
  if (e.key === 'b' || e.key === 'B') {
    if (G10.active && !G10.paused && G10_SETTINGS.moveMode === 'split' && !G10_SETTINGS.autoAim) {
      G10.aimLocked = !G10.aimLocked
      return
    }
  }
  // Shift+A/D: small aim nudge in split mode (blocked when auto-aim on)
  if (!G10_SETTINGS.autoAim && e.shiftKey && (e.key === 'A' || e.key === 'a') && G10.active && !G10.paused && G10_SETTINGS.moveMode === 'split') {
    G10.aimAngle -= 0.015; G10.aimLocked = true; return
  }
  if (!G10_SETTINGS.autoAim && e.shiftKey && (e.key === 'D' || e.key === 'd') && G10.active && !G10.paused && G10_SETTINGS.moveMode === 'split') {
    G10.aimAngle += 0.015; G10.aimLocked = true; return
  }
  // Easter egg key detection
  if (G10.active && !G10.paused && e.key.length === 1) {
    G10.aravKeyBuf = (G10.aravKeyBuf + e.key.toLowerCase()).slice(-12)
    if (G10.aravKeyBuf.endsWith('arav') && !G10.aravMode) {
      G10.aravMode = true
      G10.hunting = true; G10.wasHunting = true
      G10.lastOrbTime = -999
    }
    if (G10.aravKeyBuf.endsWith('arham') && !G10.arhamMode) {
      G10.arhamMode = true
      G10.arhamType = Math.floor(Math.random() * 3)
      if (G10.arhamType === 1) G10.wells.forEach(w => { w.mass *= 2 })
      for (let i = 0; i < 50 + Math.floor(Math.random()*51); i++) spawnG10Orb()
      g10Shake(8, 30)
    }
    if (G10.aravKeyBuf.endsWith('fartisfart')) {
      G10.devMode = !G10.devMode
      g10Floater(G10.playerX, G10.playerY - 20, G10.devMode ? '💩 DEV ON' : '💩 DEV OFF', '#a78bfa')
    }
    if (G10.aravKeyBuf.endsWith('boss') && !G10.bossMode) {
      G10.bossMode = true
      G10.wells = G10.wells.filter(w => !w.corner)  // remove all corner wells
      G10.wells.forEach(w => { w.mass *= 3; w.r = Math.min(w.r * 1.5, 28) })
      G10.hunting = true; G10.wasHunting = true
      G10.lastOrbTime = -999
      g10Shake(20, 120)
      const bw = G10.canvas.width, bh = G10.canvas.height
      G10.bosses = []
      for (let i = 0; i < 10; i++) {
        const side = qRandInt(4)
        let bx, by
        if (side===0) { bx=qRandInt(bw); by=-40-i*15 }
        else if (side===1) { bx=bw+40+i*15; by=qRandInt(bh) }
        else if (side===2) { bx=qRandInt(bw); by=bh+40+i*15 }
        else { bx=-40-i*15; by=qRandInt(bh) }
        G10.bosses.push({ x:bx, y:by, vx:0, vy:0, hp:5, maxHp:5, shootTimer:1.5+qRandInt(1000)/1000, phase:0 })
      }
    }
  }

  G10.keys[e.key] = true
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault()
}
function g10KeyUp(e) { G10.keys[e.key] = false }

function g10Pause() {
  G10.paused = true
  G10.pauseStart = Date.now()
  cancelAnimationFrame(G10.animFrame)
  G10.animFrame = null
  // dim canvas
  G10.ctx.fillStyle = 'rgba(0,0,0,0.45)'
  G10.ctx.fillRect(0, 0, G10.canvas.width, G10.canvas.height)
  g10ShowPauseUI()
}

window.g10Resume = function() {
  if (!G10.paused) return
  const pausedSec = (Date.now() - G10.pauseStart) / 1000
  G10.startTime += Date.now() - G10.pauseStart
  // shift active powerup timers so they don't drain during pause
  if (G10.speedUntil    !== Infinity) G10.speedUntil    += pausedSec
  if (G10.gravityUntil  !== Infinity) G10.gravityUntil  += pausedSec
  if (G10.freezeUntil   !== Infinity) G10.freezeUntil   += pausedSec
  if (G10.nodragUntil   !== Infinity) G10.nodragUntil   += pausedSec
  if (G10.nocornerUntil !== Infinity) G10.nocornerUntil += pausedSec
  if (G10.nospawnUntil  !== Infinity) G10.nospawnUntil  += pausedSec
  if (G10.ghostUntil    !== Infinity) G10.ghostUntil    += pausedSec
  if (G10.magnetUntil   !== Infinity) G10.magnetUntil   += pausedSec
  G10.paused = false
  document.getElementById('g10-pause-overlay').style.display = 'none'
  g10Loop()
}

// ── Powerup purchase ─────────────────────────────────────
window.g10BuyPowerup = function(key) {
  const cfg = G10_PU[key]
  let tierIdx
  if (cfg.consumable) {
    tierIdx = key === 'orbs' ? G10.puOrbTier : G10.puScatterTier
  } else {
    tierIdx = G10.puLevels[key]
    if (tierIdx >= cfg.tiers.length) return   // maxed
  }

  const tier = cfg.tiers[tierIdx]
  const pts  = g10CurrentPts()
  const statusEl = document.getElementById('g10-pu-status')

  if (pts < tier.cost) {
    statusEl.style.color = 'var(--danger)'
    statusEl.textContent = `Need ${tier.cost} pts, have ${pts}.`
    return
  }
  G10.pointsSpent += tier.cost
  SFX.powerup()

  // Apply effect
  if (key === 'orbs') {
    const counts = [3, 7, 15, 25]
    for (let i = 0; i < counts[tierIdx]; i++) spawnG10Orb()
    G10.puOrbTier = Math.min(G10.puOrbTier + 1, cfg.tiers.length - 1)
    statusEl.style.color = 'var(--success)'
    statusEl.textContent = `🟡 ${tier.desc}!`
  } else if (key === 'scatter') {
    g10ApplyScatter(tierIdx)
    G10.puScatterTier = Math.min(G10.puScatterTier + 1, cfg.tiers.length - 1)
    statusEl.style.color = 'var(--success)'
    statusEl.textContent = `💥 ${tier.desc}!`
  } else if (key === 'speed') {
    G10.puLevels.speed = tierIdx + 1
    const dur = tier.dur
    G10.speedUntil = dur === Infinity ? Infinity : Math.max(G10.speedUntil, G10.elapsed) + dur
    statusEl.style.color = 'var(--success)'
    statusEl.textContent = `⚡ ${tier.desc}!`
  } else if (key === 'gravity') {
    G10.puLevels.gravity = tierIdx + 1
    const dur = tier.dur
    G10.gravityUntil = dur === Infinity ? Infinity : Math.max(G10.gravityUntil, G10.elapsed) + dur
    statusEl.style.color = 'var(--success)'
    statusEl.textContent = `🌀 ${tier.desc}!`
  } else if (key === 'freeze') {
    G10.puLevels.freeze = tierIdx + 1
    const dur = tier.dur
    G10.freezeUntil = dur === Infinity ? Infinity : Math.max(G10.freezeUntil, G10.elapsed) + dur
    statusEl.style.color = 'var(--success)'
    statusEl.textContent = `❄️ ${tier.desc}!`
  } else if (key === 'nodrag') {
    G10.puLevels.nodrag = tierIdx + 1
    const dur = tier.dur
    G10.nodragUntil = dur === Infinity ? Infinity : Math.max(G10.nodragUntil, G10.elapsed) + dur
    statusEl.style.color = 'var(--success)'
    statusEl.textContent = `🛡️ ${tier.desc}!`
  } else if (key === 'chain') {
    G10.puLevels.chain = tierIdx + 1
  } else if (key === 'multishot') {
    G10.puLevels.multishot = tierIdx + 1
  } else if (key === 'gun') {
    G10.puLevels.gun = tierIdx + 1
    statusEl.style.color = 'var(--success)'
    statusEl.textContent = `🔫 ${tier.desc}!`
  } else if (key === 'ghost') {
    G10.puLevels.ghost = tierIdx + 1
    const dur = tier.dur
    G10.ghostUntil = dur === Infinity ? Infinity : Math.max(G10.ghostUntil, G10.elapsed) + dur
    statusEl.style.color = 'var(--success)'
    statusEl.textContent = `👻 ${tier.desc}!`
  } else if (key === 'magnetpow') {
    G10.puLevels.magnetpow = tierIdx + 1
  } else if (key === 'magnet') {
    G10.puLevels.magnet = tierIdx + 1
    const dur = tier.dur
    G10.magnetUntil = dur === Infinity ? Infinity : Math.max(G10.magnetUntil, G10.elapsed) + dur
    statusEl.style.color = 'var(--success)'
    statusEl.textContent = `🧲 ${tier.desc}!`
  } else if (key === 'nocorner') {
    G10.puLevels.nocorner = tierIdx + 1
    const dur = tier.dur
    G10.nocornerUntil = dur === Infinity ? Infinity : Math.max(G10.nocornerUntil, G10.elapsed) + dur
    statusEl.style.color = 'var(--success)'
    statusEl.textContent = `🕳️ ${tier.desc}!`
  } else if (key === 'nospawn') {
    G10.puLevels.nospawn = tierIdx + 1
    const dur = tier.dur
    G10.nospawnUntil = dur === Infinity ? Infinity : Math.max(G10.nospawnUntil, G10.elapsed) + dur
    statusEl.style.color = 'var(--success)'
    statusEl.textContent = `🚫 ${tier.desc}!`
  } else if (key === 'shield') {
    G10.puLevels.shield = tierIdx + 1
  } else if (key === 'reload') {
    G10.puLevels.reload = tierIdx + 1
    statusEl.style.color = 'var(--success)'
    statusEl.textContent = `🎯 ${tier.desc}!`
  }

  // Re-render so tier badges/headers update immediately (deferred to avoid click bleed)
  const msg = statusEl ? { color: statusEl.style.color, text: statusEl.textContent } : null
  setTimeout(g10RenderPauseContent, 0)
  if (msg) {
    const s = document.getElementById('g10-pu-status')
    if (s) { s.style.color = msg.color; s.textContent = msg.text }
  }
}

function g10ApplyScatter(tierIdx) {
  if (tierIdx === 3) {
    // Nuke — destroy all non-corner wells
    const before = G10.wells.length
    G10.wells = G10.wells.filter(w => w.corner)
    G10.wellsDestroyed += before - G10.wells.length
    G10.freezeUntil = 0  // unfreeze
    return
  }
  for (const well of G10.wells) {
    if (well.corner) continue
    const angle = Math.random() * Math.PI * 2
    let spd = 0.5 + Math.random() * 2
    if (tierIdx >= 1) spd *= 0.5   // half speed
    well.vx = Math.cos(angle) * spd
    well.vy = Math.sin(angle) * spd
  }
  if (tierIdx === 2) {
    // Stun 5s
    G10.freezeUntil = Math.max(G10.freezeUntil, G10.elapsed + 5)
  }
}

function g10CurrentPts() {
  const base = Math.floor(G10.elapsed) + G10.orbScore * 10 + G10.wellsDestroyed * 50 + G10.goldenBonus - G10.pointsSpent
  return G10.aravMode ? base * 2 : base
}

function g10ComboMult(combo) {
  if (combo >= 50) return 20
  if (combo >= 30) return 15
  if (combo >= 20) return 10
  if (combo >= 15) return 8
  if (combo >= 12) return 6
  if (combo >= 8)  return 4
  if (combo >= 5)  return 3
  if (combo >= 3)  return 2
  return 1
}

// ── Pause UI ──────────────────────────────────────────────
function g10ShowPauseUI() {
  const overlay = document.getElementById('g10-pause-overlay')
  overlay.style.display = 'block'
  g10RenderPauseContent()
}

function g10RenderPauseContent() {
  const pts = g10CurrentPts()
  const puKeys = ['orbs','scatter','speed','gravity','freeze','nodrag','chain','multishot','gun','reload','shield','nocorner','nospawn','ghost','magnet','magnetpow']

  let cardsHtml = ''
  for (const key of puKeys) {
    const cfg = G10_PU[key]
    let tierIdx
    if (cfg.consumable) {
      tierIdx = key === 'orbs' ? G10.puOrbTier : G10.puScatterTier
    } else {
      tierIdx = G10.puLevels[key]
    }
    const maxed   = !cfg.consumable && tierIdx >= cfg.tiers.length
    const tier    = maxed ? cfg.tiers[cfg.tiers.length - 1] : cfg.tiers[tierIdx]
    const needsAutoAim = key === 'reload' && !G10_SETTINGS.autoAim
    const needsMagnet  = key === 'magnetpow' && G10.puLevels.magnet === 0
    const locked = needsAutoAim || needsMagnet
    const canBuy  = !maxed && !locked && pts >= tier.cost
    const lvlBadge = cfg.consumable ? `(next: tier ${tierIdx + 1})` : maxed ? 'MAX' : `Lvl ${tierIdx} → ${tierIdx+1}`
    const descText = maxed ? '✓ Maxed out!' : needsAutoAim ? '🔒 Enable Auto-Aim first' : needsMagnet ? '🔒 Buy Orb Magnet first' : tier.desc

    cardsHtml += `
      <div class="g10-pu-card ${maxed ? 'maxed' : ''}" id="g10-pu-card-${key}" style="${locked ? 'opacity:.45;' : ''}">
        <div class="g10-pu-top">${cfg.icon} <span class="g10-pu-name">${cfg.name}</span> <span class="g10-pu-lvl">${lvlBadge}</span></div>
        <div class="g10-pu-desc">${descText}</div>
        <button class="btn-primary g10-pu-btn" data-pukey="${key}"
          ${maxed || locked ? 'disabled' : ''}
          style="${!canBuy && !maxed && !locked ? 'opacity:.45;' : ''}">
          ${maxed ? '—' : tier.cost + ' pts'}
        </button>
      </div>`
  }

  // Settings
  const moveMode = G10_SETTINGS.moveMode
  const shootDir = G10_SETTINGS.shootDir
  const shootRowHtml = moveMode === 'mouse'
    ? `<div class="g10-settings-row"><span style="color:var(--muted);font-size:.8rem;">🔫 Shoot: movement direction (mouse controls movement)</span></div>`
    : moveMode === 'split'
    ? `<div class="g10-settings-row"><span style="color:var(--muted);font-size:.8rem;">🔫 Mouse aims · A/D rotate · A+D snap to mouse · Space/click shoot</span></div>`
    : `<div class="g10-settings-row">
        <span style="color:var(--muted);font-size:.85rem;">🎯 Shoot direction:</span>
        <button class="g10-setting-btn" data-shootdir="mouse" ${shootDir==='mouse'?'style="background:var(--accent);border-color:var(--accent);color:#fff"':''}>Mouse aim</button>
        <button class="g10-setting-btn" data-shootdir="movement" ${shootDir==='movement'?'style="background:var(--accent);border-color:var(--accent);color:#fff"':''}>Movement dir</button>
       </div>`
  const autoAim = G10_SETTINGS.autoAim
  const settingsHtml = `
    <div class="g10-settings-row">
      <span style="color:var(--muted);font-size:.85rem;">🕹️ Movement:</span>
      <button class="g10-setting-btn" data-movemode="wasd" ${moveMode==='wasd'?'style="background:var(--accent);border-color:var(--accent);color:#fff"':''}>WASD / Arrows</button>
      <button class="g10-setting-btn" data-movemode="split" ${moveMode==='split'?'style="background:var(--accent);border-color:var(--accent);color:#fff"':''}>Split (↑↓←→ move, A/D rotate aim)</button>
      <button class="g10-setting-btn" data-movemode="mouse" ${moveMode==='mouse'?'style="background:var(--accent);border-color:var(--accent);color:#fff"':''}>Mouse</button>
    </div>
    ${shootRowHtml}
    <div class="g10-settings-row">
      <span style="color:var(--muted);font-size:.85rem;">🎯 Auto-Aim: <span style="font-size:.7rem;">(V to toggle)</span></span>
      <button class="g10-setting-btn" data-autoaim="1" ${autoAim?'style="background:var(--accent);border-color:var(--accent);color:#fff"':''}>On</button>
      <button class="g10-setting-btn" data-autoaim="0" ${!autoAim?'style="background:var(--accent);border-color:var(--accent);color:#fff"':''}>Off</button>
    </div>`

  const content = document.getElementById('g10-pause-content')
  content.innerHTML = `
    <div style="text-align:center;margin-bottom:.8rem;">
      <div style="font-size:1.5rem;font-weight:800;color:#fff;">⏸ Paused</div>
      <div id="g10-pause-pts" style="color:var(--accent);font-weight:600;margin-top:.3rem;">${pts} pts available</div>
    </div>
    <div class="g10-pu-grid">${cardsHtml}</div>
    <div id="g10-pu-status" style="text-align:center;font-size:.85rem;min-height:1.3rem;margin:.5rem 0;"></div>
    ${settingsHtml}
    <div style="text-align:center;margin-top:.8rem;">
      <button class="btn-primary" id="g10-resume-btn">▶ Resume (ESC)</button>
      <button class="btn-secondary" id="g10-end-btn" style="margin-top:.4rem;opacity:.6;font-size:.8rem;">✕ End Game</button>
    </div>`

  // Attach listeners — NO inline onclick, avoids any misfiring
  content.querySelectorAll('[data-pukey]').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); g10BuyPowerup(btn.dataset.pukey) })
  })
  content.querySelectorAll('[data-movemode]').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); g10SetMoveMode(btn.dataset.movemode) })
  })
  content.querySelectorAll('[data-shootdir]').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); g10SetShootDir(btn.dataset.shootdir) })
  })
  content.querySelectorAll('[data-autoaim]').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); G10_SETTINGS.autoAim = btn.dataset.autoaim === '1'; setTimeout(g10RenderPauseContent, 0) })
  })
  document.getElementById('g10-resume-btn').addEventListener('click', e => { e.stopPropagation(); g10Resume() })
  document.getElementById('g10-end-btn').addEventListener('click', e => { e.stopPropagation(); g10Resume(); endGame10() })
}

function g10RefreshShopButtons() {
  const pts = g10CurrentPts()
  for (const key of Object.keys(G10_PU)) {
    const cfg = G10_PU[key]
    let tierIdx = cfg.consumable ? (key==='orbs'?G10.puOrbTier:G10.puScatterTier) : G10.puLevels[key]
    const card = document.getElementById(`g10-pu-card-${key}`)
    if (!card) continue
    const maxed = !cfg.consumable && tierIdx >= cfg.tiers.length
    const tier  = maxed ? cfg.tiers[cfg.tiers.length-1] : cfg.tiers[tierIdx]
    const btn   = card.querySelector('button')
    if (btn && !maxed) {
      const needsAutoAim = key === 'reload' && !G10_SETTINGS.autoAim
      const needsMagnet  = key === 'magnetpow' && G10.puLevels.magnet === 0
      const canBuy = !needsAutoAim && !needsMagnet && pts >= tier.cost
      btn.disabled = !canBuy
      btn.style.opacity = canBuy ? '' : '.45'
    }
  }
}

window.g10SetMoveMode = function(mode) {
  G10_SETTINGS.moveMode = mode
  setTimeout(g10RenderPauseContent, 0)
}

window.g10SetShootDir = function(dir) {
  G10_SETTINGS.shootDir = dir
  setTimeout(g10RenderPauseContent, 0)
}

// ── Shooting ─────────────────────────────────────────────
function g10Shoot(forcedAngle) {
  SFX.shoot()
  // Cooldown check (only when auto-aim is on)
  if (G10_SETTINGS.autoAim) {
    const cooldowns = [1.5, 1.0, 0.4, 0]
    const cd = cooldowns[Math.min(G10.puLevels.reload, 3)]
    if (cd > 0 && G10.elapsed - G10.lastShotTime < cd) return
  }
  G10.lastShotTime = G10.elapsed

  let angle
  if (forcedAngle !== undefined) {
    angle = forcedAngle
  } else if (G10_SETTINGS.moveMode === 'split') {
    angle = G10.aimAngle
  } else if (G10_SETTINGS.moveMode === 'mouse') {
    const spd = Math.hypot(G10.vx, G10.vy)
    angle = spd > 0.3 ? Math.atan2(G10.vy, G10.vx) : G10.lastShotAngle
  } else {
    const effectiveShootDir = G10_SETTINGS.shootDir
    if (effectiveShootDir === 'movement') {
      const spd = Math.hypot(G10.vx, G10.vy)
      angle = spd > 0.3 ? Math.atan2(G10.vy, G10.vx) : G10.lastShotAngle
    } else {
      angle = Math.atan2(G10.mouseY - G10.playerY, G10.mouseX - G10.playerX)
    }
  }
  G10.lastShotAngle = angle
  G10.aimAngle = angle
  const bulletSpeed = 14
  G10.bullets.push({ x:G10.playerX, y:G10.playerY, vx:Math.cos(angle)*bulletSpeed, vy:Math.sin(angle)*bulletSpeed })
  const extraPairs = G10.puLevels.multishot  // 1→+1pair(3 total), 2→+2pair(5), 3→+3pair(7)
  const spread = 0.22
  for (let i = 1; i <= extraPairs; i++) {
    const a1 = angle + spread * i, a2 = angle - spread * i
    G10.bullets.push({ x:G10.playerX, y:G10.playerY, vx:Math.cos(a1)*bulletSpeed, vy:Math.sin(a1)*bulletSpeed })
    G10.bullets.push({ x:G10.playerX, y:G10.playerY, vx:Math.cos(a2)*bulletSpeed, vy:Math.sin(a2)*bulletSpeed })
  }
}

// ── Orb spawn ─────────────────────────────────────────────
function spawnG10Orb() {
  const w = G10.canvas.width, h = G10.canvas.height, margin = 20
  let x, y, safe, attempts = 0
  do {
    x = margin + qRandInt(w - margin*2)
    y = margin + qRandInt(h - margin*2)
    safe = G10.wells.every(well => Math.hypot(x-well.x, y-well.y) > 90)
      && Math.hypot(x-G10.playerX, y-G10.playerY) > 40
    attempts++
  } while (!safe && attempts < 30)
  G10.orbs.push({x, y, hue: qRandInt(360), r:8})
}

// ── Main loop ─────────────────────────────────────────────
function g10Shake(intensity, frames) {
  if (intensity > G10.shake.intensity) { G10.shake.intensity = intensity; G10.shake.frames = frames }
}

function g10Floater(x, y, text, color) {
  G10.floaters.push({ x, y, text, color: color||'#fff', life:1, vy:-0.9 })
}

function g10Loop() {
  if (!G10.active || G10.paused) return
  const now = Date.now()
  G10.elapsed = (now - G10.startTime) / 1000

  const w = G10.canvas.width, h = G10.canvas.height
  const ctx = G10.ctx

  const speedActive     = G10.elapsed < G10.speedUntil    || G10.speedUntil    === Infinity
  const gravityActive   = G10.elapsed < G10.gravityUntil  || G10.gravityUntil  === Infinity
  const freezeActive    = G10.elapsed < G10.freezeUntil   || G10.freezeUntil   === Infinity
  const nodragActive    = G10.elapsed < G10.nodragUntil   || G10.nodragUntil   === Infinity
  const nocornerActive  = G10.elapsed < G10.nocornerUntil || G10.nocornerUntil === Infinity
  const nospawnActive   = G10.elapsed < G10.nospawnUntil  || G10.nospawnUntil  === Infinity
  const ghostActive     = G10.elapsed < G10.ghostUntil    || G10.ghostUntil    === Infinity
  const magnetActive    = G10.elapsed < G10.magnetUntil   || G10.magnetUntil   === Infinity || (G10.arhamMode && G10.arhamType === 0)

  // Ghost → well (blocked during nospawn)
  for (let i = G10.ghosts.length - 1; i >= 0; i--) {
    const g = G10.ghosts[i]
    if (!nospawnActive && G10.elapsed >= g.spawnAt) {
      const angle = Math.atan2(h/2-g.y, w/2-g.x) + (qRandInt(2000)-1000)/1000
      const spd = 0.5 + qRandInt(80)/100
      const maxHealth = 3 - G10.puLevels.gun
      const baseMass = (600+qRandInt(400)) * (G10.arhamMode && G10.arhamType === 1 ? 2 : 1) * (G10.bossMode ? 3 : 1)
      const golden = qRandInt(100) < 15
      G10.wells.push({x:g.x, y:g.y, vx:Math.cos(angle)*spd, vy:Math.sin(angle)*spd,
        mass:baseMass, r:golden?20:16, corner:false, health:maxHealth, maxHealth, cracks:[], golden})
      G10.ghosts.splice(i,1)
      G10.spawnCount++
      queueNextGhost()
    }
  }

  // Hunt state
  const timeSinceOrb = G10.elapsed - G10.lastOrbTime
  const nowHunting   = timeSinceOrb >= 10
  const huntJustStarted = !G10.wasHunting && nowHunting
  const huntJustEnded   = G10.wasHunting && !nowHunting
  G10.hunting    = nowHunting
  G10.wasHunting = nowHunting

  if (huntJustStarted) g10Shake(5, 18)

  if (huntJustEnded) {
    g10Shake(3, 10)
    for (const well of G10.wells) {
      if (well.corner) continue
      const angle = Math.random() * Math.PI * 2
      const spd = 0.6 + Math.random() * 2.8
      well.vx = Math.cos(angle) * spd
      well.vy = Math.sin(angle) * spd
    }
  }

  // HUD
  const pts = g10CurrentPts()
  const nextGhost = G10.ghosts[0]
  const timeToNext = nextGhost ? Math.max(0, nextGhost.spawnAt - G10.elapsed).toFixed(0) : '?'
  document.getElementById('g10-score').textContent = pts + ' pts'
  const orbWarn = G10.hunting ? ' 🔴 HUNTING' : timeSinceOrb >= 5 ? ` ⚠️ ${Math.ceil(10-timeSinceOrb)}s` : ''
  const puInd = (speedActive?'⚡':'') + (gravityActive?'🌀':'') + (freezeActive?'❄️':'') + (nodragActive?'🛡️':'') + (nocornerActive?'🕳️':'') + (nospawnActive?'🚫':'') + (ghostActive?'👻':'') + (magnetActive?'🧲':'')
  const shieldInd = G10.shieldEnergy < 100 ? ` 🛡️${Math.floor(G10.shieldEnergy)}%` : ''
  document.getElementById('g10-timer-display').textContent =
    `${G10.wells.length} wells · next in ${timeToNext}s${orbWarn}${puInd ? ' '+puInd : ''}${shieldInd}`

  // Boss bar
  const bossBarEl = document.getElementById('g10-boss-bar')
  if (G10.bossMode && G10.bosses.length > 0) {
    bossBarEl.style.display = 'block'
    const totalHp = G10.bosses.reduce((s,b) => s+b.hp, 0)
    const totalMaxHp = G10.bosses.length * 5
    document.getElementById('g10-boss-bar-fill').style.width = (totalHp / totalMaxHp * 100) + '%'
    document.getElementById('g10-boss-bar-fill').style.background = '#f59e0b'
    const lbl = bossBarEl.querySelector('div')
    if (lbl) lbl.textContent = `👑 FINAL BOSS: ${G10.bosses.length} remaining`
  } else if (G10.boss) {
    bossBarEl.style.display = 'block'
    document.getElementById('g10-boss-bar-fill').style.width = (G10.boss.hp / G10.boss.maxHp * 100) + '%'
    const lbl = bossBarEl.querySelector('div')
    if (lbl) lbl.textContent = '⚡ BOSS'
  } else {
    bossBarEl.style.display = 'none'
  }

  // Reload bar (auto-aim cooldown progress)
  const reloadBarEl = document.getElementById('g10-reload-bar')
  if (G10_SETTINGS.autoAim) {
    const cooldowns = [1.5, 1.0, 0.4, 0]
    const cd = cooldowns[Math.min(G10.puLevels.reload, 3)]
    reloadBarEl.style.display = 'block'
    reloadBarEl.style.top = G10.boss ? '36px' : '6px'
    if (cd > 0) {
      const progress = Math.min(1, (G10.elapsed - G10.lastShotTime) / cd)
      document.getElementById('g10-reload-bar-fill').style.width = (progress * 100) + '%'
      document.getElementById('g10-reload-bar-fill').style.background = progress >= 1 ? '#22c55e' : '#7c3aed'
      reloadBarEl.querySelector('div').textContent = progress >= 1 ? '🎯 READY' : '🎯 RELOADING'
    } else {
      document.getElementById('g10-reload-bar-fill').style.width = '100%'
      document.getElementById('g10-reload-bar-fill').style.background = '#22c55e'
      reloadBarEl.querySelector('div').textContent = '🎯 AUTO'
    }
  } else {
    reloadBarEl.style.display = 'none'
  }

  // Orb timer bar (bottom) — shows danger from 5s, full at 10s
  const orbBarEl = document.getElementById('g10-orb-bar')
  if (!G10.hunting && timeSinceOrb >= 3) {
    orbBarEl.style.display = 'block'
    const frac = Math.min(timeSinceOrb / 10, 1)
    const color = frac < 0.5 ? '#f59e0b' : '#ef4444'
    document.getElementById('g10-orb-bar-fill').style.width = (frac * 100) + '%'
    document.getElementById('g10-orb-bar-fill').style.background = color
    document.getElementById('g10-orb-bar-label').textContent =
      `⚠️ no orb ${timeSinceOrb.toFixed(0)}s / 10s`
    document.getElementById('g10-orb-bar-label').style.color = color
  } else {
    orbBarEl.style.display = 'none'
  }

  // Player thrust — WASD or mouse-follow depending on setting
  if (G10_SETTINGS.moveMode === 'mouse') {
    // Steer toward mouse cursor each frame
    const dx = G10.mouseX - G10.playerX, dy = G10.mouseY - G10.playerY
    const dist = Math.hypot(dx, dy) || 1
    const thrust = Math.min(dist * 0.06, 0.6)   // scale with distance, cap at 0.6
    G10.vx += (dx / dist) * thrust
    G10.vy += (dy / dist) * thrust
  } else if (G10_SETTINGS.moveMode === 'split') {
    // Arrows = move, WASD = aim direction
    const THRUST = 0.25
    const inv = (G10.arhamMode && G10.arhamType === 2) ? -1 : 1
    if (G10.keys['ArrowUp'])    G10.vy -= THRUST * inv
    if (G10.keys['ArrowDown'])  G10.vy += THRUST * inv
    if (G10.keys['ArrowLeft'])  G10.vx -= THRUST * inv
    if (G10.keys['ArrowRight']) G10.vx += THRUST * inv
    // W toggles aimLocked: locked = A/D rotate freely, unlocked = track mouse
    // Auto-aim overrides all of this, handled separately below
    if (!G10_SETTINGS.autoAim) {
      const mouseAngle = Math.atan2(G10.mouseY - G10.playerY, G10.mouseX - G10.playerX)
      const aDown = G10.keys['a']||G10.keys['A'], dDown = G10.keys['d']||G10.keys['D']
      if (G10.aimLocked) {
        if (aDown) G10.aimAngle -= 0.055
        if (dDown) G10.aimAngle += 0.055
      } else {
        G10.aimAngle = mouseAngle
      }
    }
  } else {
    const THRUST = 0.25
    const inv = (G10.arhamMode && G10.arhamType === 2) ? -1 : 1
    if (G10.keys['ArrowUp']   ||G10.keys['w']||G10.keys['W']) G10.vy -= THRUST * inv
    if (G10.keys['ArrowDown'] ||G10.keys['s']||G10.keys['S']) G10.vy += THRUST * inv
    if (G10.keys['ArrowLeft'] ||G10.keys['a']||G10.keys['A']) G10.vx -= THRUST * inv
    if (G10.keys['ArrowRight']||G10.keys['d']||G10.keys['D']) G10.vx += THRUST * inv
  }

  const playerSpeed = Math.hypot(G10.vx, G10.vy)

  // Auto-aim: find nearest target, predict intercept, fire when cooldown allows
  if (G10_SETTINGS.autoAim) {
    let tx = null, ty = null, tvx = 0, tvy = 0
    if (G10.bossMode && G10.bosses.length > 0) {
      let nearestDist = Infinity
      for (const b of G10.bosses) {
        const d = Math.hypot(G10.playerX - b.x, G10.playerY - b.y)
        if (d < nearestDist) { nearestDist = d; tx = b.x; ty = b.y; tvx = b.vx; tvy = b.vy }
      }
    } else if (G10.boss) {
      tx = G10.boss.x; ty = G10.boss.y
      tvx = G10.boss.vx || 0; tvy = G10.boss.vy || 0
    } else {
      let nearestDist = Infinity
      for (const well of G10.wells) {
        if (well.corner && !G10.bossMode) continue
        const d = Math.hypot(G10.playerX - well.x, G10.playerY - well.y)
        if (d < nearestDist) { nearestDist = d; tx = well.x; ty = well.y; tvx = well.vx; tvy = well.vy }
      }
    }
    G10.autoAimHasTarget = tx !== null
    if (G10.autoAimHasTarget) {
      // Solve intercept: (dx+tvx*t)^2+(dy+tvy*t)^2 = (14*t)^2
      const dx = tx - G10.playerX, dy = ty - G10.playerY
      const BSPD = 14
      const a = tvx*tvx + tvy*tvy - BSPD*BSPD
      const b = 2*(dx*tvx + dy*tvy)
      const c = dx*dx + dy*dy
      let t = null
      if (Math.abs(a) < 0.001) {
        if (Math.abs(b) > 0.001) t = -c / b
      } else {
        const disc = b*b - 4*a*c
        if (disc >= 0) {
          const t1 = (-b - Math.sqrt(disc)) / (2*a)
          const t2 = (-b + Math.sqrt(disc)) / (2*a)
          if (t1 > 0 && t2 > 0) t = Math.min(t1, t2)
          else if (t1 > 0) t = t1
          else if (t2 > 0) t = t2
        }
      }
      const aimX = t !== null ? tx + tvx*t : tx
      const aimY = t !== null ? ty + tvy*t : ty
      G10.aimAngle = Math.atan2(aimY - G10.playerY, aimX - G10.playerX)
      g10Shoot(G10.aimAngle)
    }
  } else {
    G10.autoAimHasTarget = false
  }

  // ARAV / BOSS: force permanent hunt
  if (G10.aravMode || G10.bossMode) { G10.hunting = true; G10.wasHunting = true }

  // Move wells
  if (!freezeActive) {
    for (let i = 0; i < G10.wells.length; i++) {
      const well = G10.wells[i]
      // Boss: corner wells also hunt
      if (well.corner && !G10.bossMode) continue

      if (G10.hunting || (well.corner && G10.bossMode)) {
        const huntSpd = well.corner ? Math.max(0.6, playerSpeed * 0.55) : Math.max(0.4, playerSpeed * 0.45)
        const dx = G10.playerX - well.x, dy = G10.playerY - well.y
        const d  = Math.hypot(dx, dy) || 1
        well.vx = (dx/d)*huntSpd; well.vy = (dy/d)*huntSpd
      }

      // Separation
      for (let j = i+1; j < G10.wells.length; j++) {
        const other = G10.wells[j]
        const dx = well.x - other.x, dy = well.y - other.y
        const dist = Math.hypot(dx,dy)||1, minDist = well.r+other.r+8
        if (dist < minDist) {
          const push=(minDist-dist)/2, nx=dx/dist, ny=dy/dist
          if (!well.corner)  { well.x+=nx*push; well.y+=ny*push }
          if (!other.corner) { other.x-=nx*push; other.y-=ny*push }
        }
      }

      // Record trail
      if (!well.trail) well.trail = []
      well.trail.push({ x: well.x, y: well.y })
      if (well.trail.length > 18) well.trail.shift()

      const rushActive = G10.elapsed < G10.speedRushUntil
      const speedMult = G10.bossMode ? 2.2 : (G10.aravMode && !G10.hunting) ? 1.6 : rushActive ? 2.0 : 1
      well.x += well.vx * speedMult; well.y += well.vy * speedMult
      if (well.x < well.r+5)     { well.vx= Math.abs(well.vx); well.x=well.r+5 }
      if (well.x > w-well.r-5)   { well.vx=-Math.abs(well.vx); well.x=w-well.r-5 }
      if (well.y < well.r+5)     { well.vy= Math.abs(well.vy); well.y=well.r+5 }
      if (well.y > h-well.r-5)   { well.vy=-Math.abs(well.vy); well.y=h-well.r-5 }
    }
  }

  // Apply gravity — nodrag skips non-corner wells only; corners always pull
  const gravMult = gravityActive ? 0.35 : 1
  const flipMult = G10.elapsed < G10.gravityFlipUntil ? -1 : 1
  for (const well of G10.wells) {
    if (nodragActive && !well.corner) continue
    const dx = well.x-G10.playerX, dy = well.y-G10.playerY
    const dist2 = dx*dx+dy*dy, dist = Math.sqrt(dist2)||1
    G10.vx += (dx/dist)*(well.mass/dist2)*gravMult*flipMult
    G10.vy += (dy/dist)*(well.mass/dist2)*gravMult*flipMult
  }

  G10.vx *= 0.97; G10.vy *= 0.97
  const speedCap = speedActive ? 13 : 8
  const speed = Math.hypot(G10.vx, G10.vy)
  if (speed > speedCap) { G10.vx=G10.vx/speed*speedCap; G10.vy=G10.vy/speed*speedCap }

  G10.playerX += G10.vx; G10.playerY += G10.vy
  if (G10.playerX < 10)     { G10.playerX=10;     G10.vx*=-0.5 }
  if (G10.playerX > w-10)   { G10.playerX=w-10;   G10.vx*=-0.5 }
  if (G10.playerY < 10)     { G10.playerY=10;      G10.vy*=-0.5 }
  if (G10.playerY > h-10)   { G10.playerY=h-10;    G10.vy*=-0.5 }

  // Move bullets + check well hits
  for (let i = G10.bullets.length-1; i >= 0; i--) {
    const b = G10.bullets[i]
    b.x += b.vx; b.y += b.vy
    if (b.x < 0 || b.x > w || b.y < 0 || b.y > h) { G10.bullets.splice(i,1); continue }

    let hit = false
    for (let j = G10.wells.length-1; j >= 0; j--) {
      const well = G10.wells[j]
      if (well.corner) continue
      if (Math.hypot(b.x-well.x, b.y-well.y) < well.r) {
        well.health--
        // Add a crack
        well.cracks.push({ angle: Math.random()*Math.PI*2, len: 0.5 + Math.random()*0.45 })
        if (well.health <= 0) {
          SFX.hit()
          G10.wellsDestroyed++
          if (well.golden) { G10.goldenDestroyed++; G10.goldenBonus += 100 }
          g10Shake(well.golden ? 6 : 4, well.golden ? 18 : 12)
          g10Floater(well.x, well.y - well.r, well.golden ? '+150 ✨ GOLDEN!' : '+50 💥', well.golden?'#fde68a':'#f97316')
          // Spawn explosion particles
          for (let p = 0; p < 14; p++) {
            const a = (p / 14) * Math.PI * 2 + Math.random() * 0.4
            const spd = 1.5 + Math.random() * 3
            G10.particles.push({ x: well.x, y: well.y,
              vx: Math.cos(a)*spd, vy: Math.sin(a)*spd,
              life: 1, decay: 0.025 + Math.random()*0.02,
              r: 2 + Math.random()*3, hue: 0 + Math.random()*30 })
          }
          G10.wells.splice(j,1)
        }
        hit = true
        break
      }
    }
    if (hit) { G10.bullets.splice(i,1) }
  }

  // Shield energy drain/recharge
  const shieldHeld = G10.keys['Control']
  const shieldDrain    = [0.6, 0.3, 0.15, 0.05, 0][Math.min(G10.puLevels.shield, 4)]
  const shieldRecharge = [0.25, 0.5, 1.0, 2.0, 5.0][Math.min(G10.puLevels.shield, 4)]
  if (shieldHeld && G10.shieldEnergy > 0) {
    G10.shieldEnergy = Math.max(0, G10.shieldEnergy - shieldDrain)
  } else if (!shieldHeld) {
    G10.shieldEnergy = Math.min(100, G10.shieldEnergy + shieldRecharge)
  }
  const shieldActive = shieldHeld && G10.shieldEnergy > 0

  // Boss spawn (regular game only, not during boss mode easter egg)
  if (!G10.bossMode && !G10.boss && G10.elapsed >= G10.nextBossSpawn) {
    const side = qRandInt(4)
    let bx, by
    if (side===0) { bx=qRandInt(w); by=-30 }
    else if (side===1) { bx=w+30; by=qRandInt(h) }
    else if (side===2) { bx=qRandInt(w); by=h+30 }
    else { bx=-30; by=qRandInt(h) }
    G10.boss = { x:bx, y:by, vx:0, vy:0, hp:5, maxHp:5, shootTimer:2.5, phase:0 }
    g10Shake(6, 20)
  }

  // Boss update
  if (G10.boss) {
    const boss = G10.boss
    // Move toward player slowly
    const bdx = G10.playerX - boss.x, bdy = G10.playerY - boss.y
    const bd = Math.hypot(bdx, bdy) || 1
    const bspd = 0.9 + boss.phase * 0.3
    boss.vx += (bdx/bd)*bspd*0.08; boss.vy += (bdy/bd)*bspd*0.08
    boss.vx *= 0.94; boss.vy *= 0.94
    boss.x += boss.vx; boss.y += boss.vy
    // Shoot at player
    boss.shootTimer -= 1/60
    if (boss.shootTimer <= 0) {
      const shotAngle = Math.atan2(bdy, bdx) + (qRandInt(600)-300)/1000
      const bspeed = 5 + boss.phase
      G10.bossBullets.push({ x:boss.x, y:boss.y,
        vx:Math.cos(shotAngle)*bspeed, vy:Math.sin(shotAngle)*bspeed })
      boss.shootTimer = Math.max(0.8, 2.5 - boss.phase*0.4)
    }
  }

  // Boss mode: update all 10 bosses
  if (G10.bossMode) {
    for (const boss of G10.bosses) {
      const bdx = G10.playerX - boss.x, bdy = G10.playerY - boss.y
      const bd = Math.hypot(bdx, bdy) || 1
      const bspd = 1.1 + boss.phase * 0.25
      boss.vx += (bdx/bd)*bspd*0.08; boss.vy += (bdy/bd)*bspd*0.08
      boss.vx *= 0.94; boss.vy *= 0.94
      boss.x += boss.vx; boss.y += boss.vy
      boss.shootTimer -= 1/60
      if (boss.shootTimer <= 0) {
        const shotAngle = Math.atan2(bdy, bdx) + (qRandInt(600)-300)/1000
        const bspeed = 5 + boss.phase
        G10.bossBullets.push({ x:boss.x, y:boss.y, vx:Math.cos(shotAngle)*bspeed, vy:Math.sin(shotAngle)*bspeed })
        boss.shootTimer = Math.max(0.6, 2.0 - boss.phase*0.3)
      }
    }
    // Player bullets hitting boss mode bosses
    for (let i = G10.bullets.length-1; i >= 0; i--) {
      const b = G10.bullets[i]
      let hit = false
      for (let j = G10.bosses.length-1; j >= 0; j--) {
        const boss = G10.bosses[j]
        if (Math.hypot(b.x-boss.x, b.y-boss.y) < 26) {
          boss.hp--
          G10.bullets.splice(i,1)
          g10Shake(3, 8)
          if (boss.hp <= 0) {
            G10.bossKills++
            const reward = 1000 + Math.floor(Math.random()*1001)
            G10.orbScore += Math.floor(reward/10)
            g10Floater(boss.x, boss.y-30, `+${reward} 💥 BOSS SLAIN`, '#f59e0b')
            g10Shake(12, 40)
            for (let p = 0; p < 30; p++) {
              const a = (p/30)*Math.PI*2+Math.random()*0.3
              const spd = 2+Math.random()*5
              G10.particles.push({x:boss.x,y:boss.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:1,decay:0.018+Math.random()*0.015,r:3+Math.random()*5,hue:45+Math.random()*30})
            }
            G10.bosses.splice(j,1)
            if (G10.bosses.length === 0) {
              g10Floater(G10.playerX, G10.playerY-50, '👑 ALL BOSSES DEFEATED!', '#fde68a')
              g10Shake(25, 80)
            }
          } else {
            boss.phase = boss.maxHp - boss.hp
          }
          hit = true; break
        }
      }
      if (hit) continue
    }
  }

  // Boss bullets
  for (let i = G10.bossBullets.length-1; i >= 0; i--) {
    const b = G10.bossBullets[i]
    b.x += b.vx; b.y += b.vy
    if (b.x < -20 || b.x > w+20 || b.y < -20 || b.y > h+20) { G10.bossBullets.splice(i,1); continue }
    if (Math.hypot(b.x-G10.playerX, b.y-G10.playerY) < 12) {
      if (shieldActive) {
        G10.bossBullets.splice(i,1)
        g10Shake(2, 6)
      } else if (!ghostActive) {
        endGame10(); return
      }
    }
  }

  // Player bullets hitting boss
  if (G10.boss) {
    for (let i = G10.bullets.length-1; i >= 0; i--) {
      const b = G10.bullets[i]
      if (Math.hypot(b.x-G10.boss.x, b.y-G10.boss.y) < 26) {
        G10.boss.hp--
        G10.bullets.splice(i,1)
        g10Shake(3, 8)
        if (G10.boss.hp <= 0) {
          G10.bossKills++
          const reward = 1000 + Math.floor(Math.random()*1001)
          G10.orbScore += Math.floor(reward/10)
          g10Floater(G10.boss.x, G10.boss.y-30, `+${reward} 💥 BOSS SLAIN`, '#f59e0b')
          g10Shake(12, 40)
          for (let p = 0; p < 30; p++) {
            const a = (p/30)*Math.PI*2+Math.random()*0.3
            const spd = 2+Math.random()*5
            G10.particles.push({x:G10.boss.x,y:G10.boss.y,
              vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,
              life:1,decay:0.018+Math.random()*0.015,r:3+Math.random()*5,hue:45+Math.random()*30})
          }
          G10.boss = null
          G10.nextBossSpawn = G10.elapsed + 90
        } else {
          G10.boss.phase = G10.boss.maxHp - G10.boss.hp
        }
        break
      }
    }
  }

  // ─── DRAW ───────────────────────────────────────────
  // Screen shake
  ctx.save()
  if (G10.shake.frames > 0) {
    const s = G10.shake.intensity * (G10.shake.frames / 18)
    ctx.translate((Math.random()-0.5)*s, (Math.random()-0.5)*s)
    G10.shake.frames--
    if (G10.shake.frames <= 0) G10.shake.intensity = 0
  }

  ctx.clearRect(-20, -20, w+40, h+40)

  // Ghost wells
  ctx.font = 'bold 12px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'
  for (const g of G10.ghosts) {
    const tl = g.spawnAt - G10.elapsed
    ctx.beginPath(); ctx.arc(g.x,g.y,16,0,Math.PI*2)
    ctx.fillStyle='rgba(239,68,68,0.35)'; ctx.fill()
    ctx.strokeStyle='#ef4444'; ctx.lineWidth=2; ctx.stroke()
    ctx.fillStyle='#fff'; ctx.fillText(Math.ceil(tl)+'s',g.x,g.y)
  }
  ctx.textAlign='left'; ctx.textBaseline='alphabetic'

  const warnFrac = Math.max(0,(timeSinceOrb-5)/5)
  const wellColor = G10.hunting ? '#f97316'
    : timeSinceOrb >= 5 ? `hsl(${Math.round((1-warnFrac)*15)},90%,55%)` : '#ef4444'

  // Well trails
  for (const well of G10.wells) {
    if (well.corner || !well.trail || well.trail.length < 2) continue
    for (let t = 0; t < well.trail.length; t++) {
      const alpha = (t / well.trail.length) * 0.3
      const r = well.r * 0.35 * (t / well.trail.length)
      ctx.beginPath()
      ctx.arc(well.trail[t].x, well.trail[t].y, Math.max(1, r), 0, Math.PI*2)
      ctx.fillStyle = G10.hunting ? `rgba(249,115,22,${alpha})` : `rgba(239,68,68,${alpha})`
      ctx.fill()
    }
  }

  // Live wells — outer pulse ring (skip hidden corners)
  const pulse = Math.sin(now/300)*0.3+0.7
  ctx.strokeStyle = freezeActive ? 'rgba(99,179,237,0.5)' : G10.hunting ? 'rgba(249,115,22,0.35)' : 'rgba(239,68,68,0.25)'
  ctx.lineWidth = 2
  for (const well of G10.wells) {
    if (nocornerActive && well.corner) continue
    ctx.beginPath(); ctx.arc(well.x,well.y,well.r+18*pulse,0,Math.PI*2); ctx.stroke()
  }

  // Live wells — solid fill
  for (const well of G10.wells) {
    if (nocornerActive && well.corner) continue
    if (well.golden) {
      const gPulse = Math.sin(now/180)*0.35+0.65
      ctx.beginPath(); ctx.arc(well.x,well.y,well.r+10*gPulse,0,Math.PI*2)
      ctx.fillStyle=`rgba(251,191,36,${0.15+gPulse*0.1})`; ctx.fill()
      ctx.beginPath(); ctx.arc(well.x,well.y,well.r,0,Math.PI*2)
      ctx.fillStyle=freezeActive?'#60a5fa':`hsl(${45+Math.sin(now/200)*10},100%,60%)`; ctx.fill()
    } else {
      ctx.beginPath(); ctx.arc(well.x,well.y,well.r,0,Math.PI*2)
      ctx.fillStyle=freezeActive?'#60a5fa':wellColor; ctx.fill()
    }
  }
  // Dark core
  ctx.fillStyle = '#111'
  for (const well of G10.wells) {
    if (nocornerActive && well.corner) continue
    ctx.beginPath(); ctx.arc(well.x,well.y,well.r*0.45,0,Math.PI*2); ctx.fill()
  }
  // Cracks (damage indicator)
  ctx.lineWidth = 1.5
  for (const well of G10.wells) {
    if (!well.cracks || well.cracks.length === 0) continue
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'
    for (const crack of well.cracks) {
      ctx.beginPath()
      ctx.moveTo(well.x + Math.cos(crack.angle)*4, well.y + Math.sin(crack.angle)*4)
      ctx.lineTo(well.x + Math.cos(crack.angle)*well.r*crack.len,
                 well.y + Math.sin(crack.angle)*well.r*crack.len)
      ctx.stroke()
      // Branch
      ctx.beginPath()
      ctx.moveTo(well.x + Math.cos(crack.angle)*well.r*0.3, well.y + Math.sin(crack.angle)*well.r*0.3)
      ctx.lineTo(well.x + Math.cos(crack.angle+0.7)*well.r*0.5, well.y + Math.sin(crack.angle+0.7)*well.r*0.5)
      ctx.stroke()
    }
  }
  // Weak gravity ring
  if (gravityActive) {
    ctx.strokeStyle = 'rgba(99,179,237,0.4)'; ctx.lineWidth = 1.5
    for (const well of G10.wells) {
      ctx.beginPath(); ctx.arc(well.x,well.y,well.r+6,0,Math.PI*2); ctx.stroke()
    }
  }

  // Orbs
  for (const orb of G10.orbs) {
    ctx.fillStyle = `hsl(${orb.hue},90%,65%)`
    ctx.beginPath(); ctx.arc(orb.x,orb.y,orb.r,0,Math.PI*2); ctx.fill()
  }

  // Bullets
  ctx.fillStyle = '#fde68a'
  for (const b of G10.bullets) {
    ctx.beginPath(); ctx.arc(b.x,b.y,4,0,Math.PI*2); ctx.fill()
  }
  // Bullet trail
  ctx.strokeStyle = 'rgba(253,230,138,0.35)'; ctx.lineWidth = 2
  for (const b of G10.bullets) {
    ctx.beginPath()
    ctx.moveTo(b.x - b.vx*2, b.y - b.vy*2)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }

  // Boss bullets
  ctx.fillStyle = '#f87171'
  for (const b of G10.bossBullets) {
    ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI*2); ctx.fill()
  }
  ctx.strokeStyle = 'rgba(248,113,113,0.35)'; ctx.lineWidth = 2
  for (const b of G10.bossBullets) {
    ctx.beginPath(); ctx.moveTo(b.x-b.vx*2,b.y-b.vy*2); ctx.lineTo(b.x,b.y); ctx.stroke()
  }

  // Boss(es)
  const bossToDraw = G10.bossMode ? G10.bosses : (G10.boss ? [G10.boss] : [])
  for (const boss of bossToDraw) {
    const bPulse = Math.sin(now/200)*0.3+0.7
    const bHpFrac = boss.hp / boss.maxHp
    ctx.beginPath(); ctx.arc(boss.x, boss.y, 36*bPulse, 0, Math.PI*2)
    ctx.fillStyle = `rgba(251,191,36,${0.08+bPulse*0.07})`; ctx.fill()
    ctx.beginPath(); ctx.arc(boss.x, boss.y, 26, 0, Math.PI*2)
    ctx.fillStyle = `hsl(${30+boss.phase*15},90%,${45+bPulse*10}%)`; ctx.fill()
    ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 3; ctx.stroke()
    ctx.beginPath(); ctx.arc(boss.x, boss.y, 10, 0, Math.PI*2)
    ctx.fillStyle = '#111'; ctx.fill()
    const eyeAngle = Math.atan2(G10.playerY-boss.y, G10.playerX-boss.x)
    ctx.beginPath(); ctx.arc(boss.x+Math.cos(eyeAngle)*8, boss.y+Math.sin(eyeAngle)*8, 4, 0, Math.PI*2)
    ctx.fillStyle = '#f87171'; ctx.fill()
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(boss.x-26, boss.y-38, 52, 6)
    ctx.fillStyle = bHpFrac > 0.5 ? '#4ade80' : bHpFrac > 0.25 ? '#f59e0b' : '#ef4444'
    ctx.fillRect(boss.x-26, boss.y-38, 52*bHpFrac, 6)
    ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
    ctx.fillStyle = '#fde68a'; ctx.fillText(G10.bossMode ? `👑 ${boss.hp}HP` : '⚡ BOSS', boss.x, boss.y-40)
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  }

  // Player
  // Ghost aura
  if (ghostActive) {
    ctx.beginPath(); ctx.arc(G10.playerX, G10.playerY, 16 + Math.sin(now/150)*3, 0, Math.PI*2)
    ctx.fillStyle = `rgba(167,139,250,${0.15 + Math.sin(now/200)*0.07})`; ctx.fill()
  }
  // Magnet aura
  if (magnetActive) {
    const magR = G10.puLevels.magnetpow >= 5 ? 9999 : [120,240,480,960,9999][Math.min(G10.puLevels.magnetpow,4)]
    ctx.beginPath(); ctx.arc(G10.playerX, G10.playerY, Math.min(magR, 9999), 0, Math.PI*2)
    ctx.strokeStyle = `rgba(251,191,36,${0.12 + Math.sin(now/300)*0.05})`; ctx.lineWidth = 1.5; ctx.stroke()
  }

  const pColor = ghostActive ? 'rgba(167,139,250,0.5)' : speedActive ? '#f59e0b' : '#7c3aed'
  const pRing  = ghostActive ? '#a78bfa' : speedActive ? '#fde68a' : '#c4b5fd'
  ctx.globalAlpha = ghostActive ? 0.5 : 1
  ctx.fillStyle = pColor
  ctx.beginPath(); ctx.arc(G10.playerX,G10.playerY,10,0,Math.PI*2); ctx.fill()
  ctx.strokeStyle = pRing; ctx.lineWidth = 2; ctx.stroke()
  ctx.globalAlpha = 1
  // Shield ring
  if (shieldActive) {
    ctx.beginPath(); ctx.arc(G10.playerX, G10.playerY, 18 + Math.sin(now/100)*2, 0, Math.PI*2)
    ctx.strokeStyle = `rgba(56,189,248,${0.6+Math.sin(now/150)*0.3})`; ctx.lineWidth = 3; ctx.stroke()
    ctx.beginPath(); ctx.arc(G10.playerX, G10.playerY, 22, 0, Math.PI*2)
    ctx.strokeStyle = 'rgba(56,189,248,0.2)'; ctx.lineWidth = 1; ctx.stroke()
  } else if (G10.shieldEnergy < 100) {
    // Recharging indicator
    ctx.strokeStyle = `rgba(56,189,248,${G10.shieldEnergy/200})`; ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(G10.playerX, G10.playerY, 18, -Math.PI/2, -Math.PI/2 + (G10.shieldEnergy/100)*Math.PI*2); ctx.stroke()
  }
  if (speed > 0.5) {
    ctx.beginPath()
    ctx.moveTo(G10.playerX, G10.playerY)
    ctx.lineTo(G10.playerX+G10.vx*3, G10.playerY+G10.vy*3)
    ctx.strokeStyle = speedActive ? 'rgba(253,230,138,0.6)' : 'rgba(167,139,250,0.5)'
    ctx.lineWidth = 2; ctx.stroke()
  }
  // Aim line — shown in split mode, or auto-aim when a target exists
  if (G10_SETTINGS.moveMode === 'split' || (G10_SETTINGS.autoAim && G10.autoAimHasTarget)) {
    const hasGun = G10.puLevels.gun > 0
    const aimLen = hasGun ? 40 + G10.puLevels.gun * 10 : 35
    let color, lineWidth
    if (G10_SETTINGS.autoAim && hasGun) {
      color = 'rgba(248,113,113,0.9)'; lineWidth = 2.5  // red = auto-aim
    } else if (G10_SETTINGS.autoAim) {
      color = 'rgba(248,113,113,0.4)'; lineWidth = 1.5
    } else {
      color = G10.aimLocked ? 'rgba(34,211,238,0.85)' : hasGun ? 'rgba(251,191,36,0.8)' : 'rgba(148,163,184,0.5)'
      lineWidth = G10.aimLocked ? 2.5 : hasGun ? 2 : 1.5
    }
    ctx.beginPath()
    ctx.moveTo(G10.playerX, G10.playerY)
    ctx.lineTo(G10.playerX + Math.cos(G10.aimAngle)*aimLen, G10.playerY + Math.sin(G10.aimAngle)*aimLen)
    ctx.strokeStyle = color; ctx.lineWidth = lineWidth
    ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([])
  }

  // Danger vignette — red edges when close to any well
  let closestDanger = Infinity
  for (const well of G10.wells) {
    if (nocornerActive && well.corner) continue
    const d = Math.hypot(G10.playerX - well.x, G10.playerY - well.y) - well.r
    if (d < closestDanger) closestDanger = d
  }
  if (!ghostActive && closestDanger < 10) g10Shake(3, 6)   // near-miss shake
  if (closestDanger < 80 || G10.bossMode) {
    const baseIntensity = G10.bossMode ? 0.15 + Math.sin(now/300)*0.1 : 0
    const intensity = Math.max(baseIntensity, 1 - closestDanger / 80)
    const grad = ctx.createRadialGradient(w/2, h/2, Math.min(w,h)*0.3, w/2, h/2, Math.max(w,h)*0.75)
    grad.addColorStop(0, 'rgba(239,68,68,0)')
    grad.addColorStop(1, `rgba(239,68,68,${(intensity * 0.55).toFixed(2)})`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }

  // Destruction particles
  for (let i = G10.particles.length - 1; i >= 0; i--) {
    const p = G10.particles[i]
    p.x += p.vx; p.y += p.vy
    p.vx *= 0.92; p.vy *= 0.92
    p.life -= p.decay
    if (p.life <= 0) { G10.particles.splice(i, 1); continue }
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2)
    ctx.fillStyle = `hsla(${p.hue},90%,65%,${p.life.toFixed(2)})`
    ctx.fill()
  }


  // Floaters
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  for (let i = G10.floaters.length - 1; i >= 0; i--) {
    const f = G10.floaters[i]
    f.y += f.vy; f.life -= 0.022
    if (f.life <= 0) { G10.floaters.splice(i, 1); continue }
    ctx.globalAlpha = f.life
    ctx.font = `bold ${13 + (1-f.life)*4}px sans-serif`
    ctx.fillStyle = f.color
    ctx.fillText(f.text, f.x, f.y)
  }
  ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'

  ctx.restore()  // end screen shake transform

  // Easter egg overlays
  let overlayY = 8
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  if (G10.bossMode) {
    ctx.font = `bold ${15 + Math.sin(now/150)*3}px sans-serif`
    ctx.fillStyle = `rgba(239,68,68,${0.8 + Math.sin(now/200)*0.2})`
    ctx.fillText('💀 FINAL BOSS', w/2, overlayY); overlayY += 22
  }
  if (G10.aravMode) {
    ctx.font = `bold ${14 + Math.sin(now/200)*2}px sans-serif`
    ctx.fillStyle = `rgba(249,115,22,${0.7 + Math.sin(now/300)*0.3})`
    ctx.fillText('⚠️ ARAV MODE — 2× SCORE', w/2, overlayY); overlayY += 20
  }
  if (G10.arhamMode) {
    const arhamColors = ['rgba(52,211,153,','rgba(239,68,68,','rgba(167,139,250,']
    const arhamLabels = ['😇 GOD MODE','💀 NIGHTMARE','🌀 INVERTED']
    ctx.font = `bold ${13 + Math.sin(now/180)*1.5}px sans-serif`
    ctx.fillStyle = arhamColors[G10.arhamType] + `${0.75 + Math.sin(now/250)*0.25})`
    ctx.fillText(arhamLabels[G10.arhamType], w/2, overlayY)
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'

  // Combo indicator above player
  if (G10.combo >= 2) {
    const colors = {2:'#34d399',3:'#f59e0b',4:'#f97316',6:'#fb923c',8:'#ef4444',10:'#e879f9',15:'#a78bfa',20:'#67e8f9'}
    const comboColor = colors[G10.comboMultiplier] || '#f97316'
    ctx.font = `bold ${12 + G10.comboMultiplier*2}px sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
    ctx.fillStyle = comboColor
    ctx.fillText(`x${G10.comboMultiplier} COMBO (${G10.combo})`, G10.playerX, G10.playerY - 16)
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  }

  // Magnet — pull orbs toward player
  if (magnetActive) {
    const mpow = G10.puLevels.magnetpow
    if (mpow >= 5) {
      // Auto-collect: blast all orbs toward player at high speed every frame
      for (const orb of G10.orbs) {
        const dx = G10.playerX - orb.x, dy = G10.playerY - orb.y
        const dist = Math.hypot(dx, dy) || 1
        const pull = Math.min(30, dist)  // zoom in at up to 30px/frame
        orb.x += (dx / dist) * pull
        orb.y += (dy / dist) * pull
      }
    } else {
      const scale = [1, 2, 4, 8, 99999][Math.min(mpow, 4)]
      for (const orb of G10.orbs) {
        const dx = G10.playerX - orb.x, dy = G10.playerY - orb.y
        const dist = Math.hypot(dx, dy) || 1
        const pull = Math.min(3 * scale, (120 * scale) / dist)
        orb.x += (dx / dist) * pull
        orb.y += (dy / dist) * pull
      }
    }
  }

  // Orb collection — combo multiplier + chain reactions
  function collectOrb(idx, cx, cy, chainHop) {
    const orb = G10.orbs[idx]
    if (!orb) return
    SFX.coin()
    if (G10.elapsed - G10.lastOrbCollect > 4) G10.combo = 0
    G10.combo++; if (G10.combo > G10.maxCombo) G10.maxCombo = G10.combo
    G10.orbsCollected++
    G10.lastOrbCollect = G10.elapsed
    G10.comboMultiplier = g10ComboMult(G10.combo)
    const bonus = (G10.comboMultiplier - 1) * 10
    if (bonus > 0) G10.pointsSpent -= bonus
    G10.orbScore++
    G10.orbs.splice(idx, 1)
    spawnG10Orb()
    G10.lastOrbTime = G10.elapsed
    G10.hunting = false; G10.wasHunting = false
    const comboText = G10.comboMultiplier > 1 ? ` x${G10.comboMultiplier}!` : ''
    g10Floater(cx, cy - 20, `+${10 * G10.comboMultiplier}${comboText}`, G10.comboMultiplier > 1 ? '#f59e0b' : '#34d399')
    // Chain: collect nearby orbs (max 3 hops, range shrinks each hop)
    const maxHops  = [3, 5, 8, Infinity][Math.min(G10.puLevels.chain, 3)]
    const baseRange = [75, 100, 150, 220][Math.min(G10.puLevels.chain, 3)]
    if (chainHop < maxHops) {
      const chainRange = baseRange - chainHop * 15
      for (let j = G10.orbs.length-1; j >= 0; j--) {
        if (Math.hypot(cx - G10.orbs[j].x, cy - G10.orbs[j].y) < chainRange) {
          G10.chainCount++
          g10Floater(G10.orbs[j].x, G10.orbs[j].y - 12, '⛓ chain!', '#a78bfa')
          collectOrb(j, G10.orbs[j]?.x ?? cx, G10.orbs[j]?.y ?? cy, chainHop + 1)
        }
      }
    }
  }
  for (let i = G10.orbs.length-1; i >= 0; i--) {
    if (Math.hypot(G10.playerX-G10.orbs[i].x, G10.playerY-G10.orbs[i].y) < 14) {
      collectOrb(i, G10.playerX, G10.playerY, 0)
    }
  }
  if (G10.combo > 0 && G10.elapsed - G10.lastOrbCollect > 4) {
    G10.combo = 0; G10.comboMultiplier = 1
  }

  // FPS tracking (dev mode)
  G10.fpsFrames++
  if (now - G10.fpsLastTime >= 1000) {
    G10.fps = G10.fpsFrames; G10.fpsFrames = 0; G10.fpsLastTime = now
  }

  // Danger meter — fills from well proximity, triggers random event at 100
  if (G10.elapsed - G10.lastDangerEvent > 15) {
    let threat = 0
    for (const well of G10.wells) {
      if (well.corner) continue
      const d = Math.hypot(G10.playerX - well.x, G10.playerY - well.y)
      threat += Math.max(0, 1 - d / 400)
    }
    G10.dangerMeter = Math.min(100, G10.dangerMeter + 0.04 + threat * 0.4)
    if (G10.dangerMeter >= 100) {
      G10.dangerMeter = 0
      G10.lastDangerEvent = G10.elapsed
      G10.dangerEventsCount++
      const roll = Math.random()
      if (roll < 0.16) {
        // GOOD: orb gift
        for (let i = 0; i < 20; i++) spawnG10Orb()
        g10Floater(w/2, h/2-30, '🎁 ORB GIFT! +20 orbs', '#34d399')
        g10Shake(3, 8)
      } else if (roll < 0.33) {
        // GOOD: freeze burst
        G10.freezeUntil = Math.max(G10.freezeUntil, G10.elapsed) + 6
        g10Floater(w/2, h/2-30, '❄️ FREEZE BURST!', '#60a5fa')
        g10Shake(4, 10)
      } else if (roll < 0.50) {
        // GOOD: bonus pts
        G10.goldenBonus += 300
        g10Floater(w/2, h/2-30, '💰 BONUS +300 pts!', '#fde68a')
        g10Shake(3, 8)
      } else if (roll < 0.66) {
        // BAD: well surge — spawn 3 extra
        for (let i = 0; i < 3; i++) {
          const side = Math.floor(Math.random()*4)
          let sx, sy
          if (side===0) { sx=Math.random()*w; sy=0 }
          else if (side===1) { sx=w; sy=Math.random()*h }
          else if (side===2) { sx=Math.random()*w; sy=h }
          else { sx=0; sy=Math.random()*h }
          const ang = Math.atan2(h/2-sy, w/2-sx) + (Math.random()-.5)*1.5
          G10.wells.push({x:sx,y:sy,vx:Math.cos(ang)*1.2,vy:Math.sin(ang)*1.2,mass:700,r:16,corner:false,health:Math.max(1,3-G10.puLevels.gun),maxHealth:Math.max(1,3-G10.puLevels.gun),cracks:[],golden:false})
        }
        g10Floater(w/2, h/2-30, '💥 WELL SURGE! +3 wells', '#f97316')
        g10Shake(8, 20)
      } else if (roll < 0.83) {
        // BAD: speed rush
        G10.speedRushUntil = G10.elapsed + 6
        g10Floater(w/2, h/2-30, '⚡ SPEED RUSH! Wells faster 6s', '#ef4444')
        g10Shake(6, 15)
      } else {
        // BAD: gravity flip
        G10.gravityFlipUntil = G10.elapsed + 4
        g10Floater(w/2, h/2-30, '🌀 GRAVITY FLIP! 4s', '#e879f9')
        g10Shake(6, 15)
      }
    }
  }
  const dangerBarEl = document.getElementById('g10-danger-bar')
  if (dangerBarEl && G10.elapsed - G10.lastDangerEvent > 5) {
    dangerBarEl.style.display = 'block'
    document.getElementById('g10-danger-fill').style.width = G10.dangerMeter + '%'
    const lbl = document.getElementById('g10-danger-label')
    lbl.textContent = G10.dangerMeter > 75 ? '🔴 DANGER CRITICAL' : G10.dangerMeter > 40 ? '⚠️ DANGER' : '🟢 SAFE'
    lbl.style.color = G10.dangerMeter > 75 ? '#ef4444' : G10.dangerMeter > 40 ? '#fb923c' : '#34d399'
  } else if (dangerBarEl) {
    dangerBarEl.style.display = 'none'
  }

  // Developer mode overlay
  if (G10.devMode) {
    ctx.save()
    ctx.strokeStyle = 'rgba(167,139,250,0.6)'; ctx.lineWidth = 1
    for (const well of G10.wells) {
      ctx.beginPath(); ctx.arc(well.x, well.y, well.r + 4, 0, Math.PI*2); ctx.stroke()
      ctx.fillStyle='rgba(167,139,250,0.7)'; ctx.font='9px monospace'; ctx.textAlign='center'
      ctx.fillText(`${well.vx.toFixed(1)},${well.vy.toFixed(1)}`, well.x, well.y+well.r+14)
    }
    ctx.strokeStyle='rgba(52,211,153,0.6)'
    ctx.beginPath(); ctx.arc(G10.playerX, G10.playerY, 14, 0, Math.PI*2); ctx.stroke()
    ctx.fillStyle='#a78bfa'; ctx.textAlign='left'; ctx.font='bold 11px monospace'
    ctx.fillText(`FPS: ${G10.fps}`, 8, 20)
    ctx.fillText(`pos: ${G10.playerX.toFixed(0)},${G10.playerY.toFixed(0)}`, 8, 34)
    ctx.fillText(`vel: ${G10.vx.toFixed(2)},${G10.vy.toFixed(2)}`, 8, 48)
    ctx.fillText(`wells: ${G10.wells.length}  bullets: ${G10.bullets.length}`, 8, 62)
    ctx.fillText(`danger: ${G10.dangerMeter.toFixed(0)}%  combo: ${G10.combo}`, 8, 76)
    ctx.fillText(`elapsed: ${G10.elapsed.toFixed(2)}s`, 8, 90)
    ctx.restore()
  }

  // Well collision = death (ghost = invincible; hidden corners safe during nocorner)
  for (const well of G10.wells) {
    if (nocornerActive && well.corner) continue
    if (ghostActive) continue
    if (G10.arhamMode && G10.arhamType === 0) continue  // god mode
    if (Math.hypot(G10.playerX-well.x, G10.playerY-well.y) < well.r + 4) {
      endGame10(); return
    }
  }

  G10.animFrame = requestAnimationFrame(g10Loop)
}

function endGame10() {
  SFX.die()
  stopGame10()
  const survived = parseFloat(G10.elapsed.toFixed(1))
  const pts = g10CurrentPts()
  window._g10Score = pts
  window._g10Stats = { survived, pts,
    orbs: G10.orbsCollected, wells: G10.wellsDestroyed, golden: G10.goldenDestroyed,
    maxCombo: G10.maxCombo, chains: G10.chainCount, bossKills: G10.bossKills,
    spent: G10.pointsSpent, events: G10.dangerEventsCount }

  document.getElementById('g10-final-score').textContent = pts + ' pts'
  renderMedalDisplay('g10-medal-display', 'gravity', pts)

  // Breakdown
  const s = window._g10Stats
  const rows = [
    ['⏱ Time survived', `${s.survived}s`],
    ['🟡 Orbs collected', s.orbs],
    ['💥 Wells destroyed', `${s.wells}${s.golden>0?' (✨'+s.golden+' golden)':''}`],
    ['🔥 Max combo', `x${g10ComboMult(s.maxCombo)} (${s.maxCombo} streak)`],
    s.chains > 0 ? ['⛓ Chain reactions', s.chains] : null,
    s.bossKills > 0 ? ['👑 Boss kills', s.bossKills] : null,
    s.events > 0 ? ['⚡ Danger events', s.events] : null,
    s.spent > 0 ? ['💸 Points spent', s.spent] : null,
  ].filter(Boolean)
  document.getElementById('g10-breakdown').innerHTML = rows.map(([k,v]) =>
    `<div style="display:flex;justify-content:space-between;"><span>${k}</span><span style="color:#fff;font-weight:700">${v}</span></div>`
  ).join('')

  document.getElementById('g10-over').classList.add('show')
}

window.g10Share = function() {
  const s = window._g10Stats
  if (!s) return
  const lines = [
    '🌌 Gravity Wells',
    `Score: ${s.pts} pts | ${s.survived}s`,
    `Orbs: ${s.orbs} | Wells: ${s.wells}${s.golden>0?' (✨'+s.golden+' golden)':''}`,
    `Max combo: x${g10ComboMult(s.maxCombo)} (${s.maxCombo} streak)`,
    s.chains>0 ? `Chain reactions: ${s.chains}` : null,
    s.bossKills>0 ? `Boss kills: ${s.bossKills}` : null,
    'Play at: ' + location.origin + location.pathname,
  ].filter(Boolean).join('\n')
  navigator.clipboard.writeText(lines).then(() => {
    const btn = document.getElementById('g10-share-btn')
    btn.textContent = '✓ Copied!'
    setTimeout(() => { btn.textContent = '📋 Share' }, 2000)
  }).catch(() => { alert(lines) })
}

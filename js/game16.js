// ═══════════════════════════════════════════════════════
//  GAME 16 — QUANTUM CLICKER
//  Click to observe qubits. Buy buildings for auto-production.
//  Unlock upgrades, catch golden qubits, prestige for bonuses.
// ═══════════════════════════════════════════════════════

const G16_BUILDINGS = [
  { id:'dot',      name:'Quantum Dot',         icon:'⚛️',  baseCost:10,          baseQps:0.1,    desc:'Observe quantum dots to emit qubits.' },
  { id:'spin',     name:'Electron Spin',        icon:'🌀',  baseCost:100,         baseQps:0.5,    desc:'Harness electron spin states for qubit generation.' },
  { id:'photon',   name:'Photon Emitter',       icon:'💡',  baseCost:1100,        baseQps:4,      desc:'Emit entangled photons at quantum frequencies.' },
  { id:'register', name:'Qubit Register',       icon:'📟',  baseCost:12000,       baseQps:15,     desc:'A register of quantum bits collapsing in your favor.' },
  { id:'gate',     name:'Quantum Gate',         icon:'🔮',  baseCost:130000,      baseQps:60,     desc:'Logic gates operating on quantum superpositions.' },
  { id:'pair',     name:'Entangled Pair',        icon:'🔗',  baseCost:1400000,     baseQps:240,    desc:'Entangled pairs generate qubits through correlation.' },
  { id:'qc',       name:'Quantum Computer',     icon:'💻',  baseCost:20000000,    baseQps:1000,   desc:'A full quantum computer humming with possibility.' },
  { id:'collapse', name:'Wave Collapse Engine', icon:'🌊',  baseCost:330000000,   baseQps:4200,   desc:'Collapse entire wavefunctions into pure qubits.' },
  { id:'fork',     name:'Multiverse Fork',      icon:'🌌',  baseCost:5100000000,  baseQps:18000,  desc:'Branch parallel universes and harvest their quantum states.' },
  { id:'crystal',  name:'Time Crystal',         icon:'💎',  baseCost:75000000000, baseQps:80000,  desc:'Oscillates outside of time, producing qubits forever.' },
]

// Upgrades: click upgrades + 4 tiers per building + synergies + special
const G16_UPGRADES = [
  // ── Click upgrades ──────────────────────────────────
  { id:'click1', name:'Quantum Observation',   icon:'👁️',  cost:100,       desc:'Clicking power ×2.',            type:'click', mult:2,  unlock: s => s.totalProduced >= 1 },
  { id:'click2', name:'Focused Measurement',   icon:'🎯',  cost:500,       desc:'Clicking power ×2.',            type:'click', mult:2,  unlock: s => s.totalProduced >= 100 },
  { id:'click3', name:'Heisenberg Hack',        icon:'⚡',  cost:3000,      desc:'Clicking power ×2.',            type:'click', mult:2,  unlock: s => s.totalProduced >= 1000 },
  { id:'click4', name:'Schrödinger Click',      icon:'🐱',  cost:20000,     desc:'Clicking power ×2.',            type:'click', mult:2,  unlock: s => s.totalProduced >= 10000 },
  { id:'click5', name:'Dirac Notation',         icon:'📐',  cost:150000,    desc:'Clicking power ×2.',            type:'click', mult:2,  unlock: s => s.totalProduced >= 200000 },
  { id:'click6', name:'Bell State Boost',       icon:'🔔',  cost:1200000,   desc:'Clicking power ×2.',            type:'click', mult:2,  unlock: s => s.totalProduced >= 5000000 },
  { id:'click7', name:'No-Cloning Bypass',      icon:'♾️',  cost:10000000,  desc:'Clicking power ×2.',            type:'click', mult:2,  unlock: s => s.totalProduced >= 100000000 },
  { id:'click8', name:'Many Worlds Click',      icon:'🌌',  cost:100000000, desc:'Clicking power ×2.',            type:'click', mult:2,  unlock: s => s.totalProduced >= 2000000000 },
  // Click = 1% of QPS (synergy)
  { id:'clicksyn', name:'Quantum Synergy',      icon:'🔀',  cost:500000,    desc:'Each QPS adds 1% to click value.', type:'clicksyn', unlock: s => s.totalProduced >= 1000000 },
  // Auto-clicker
  { id:'autoclk1', name:'Auto-Observer',         icon:'🤖',  cost:2000,      desc:'Automatically clicks 1×/sec.',  type:'autoclk', rate:1,   unlock: s => g16Owned('dot') >= 5 },
  { id:'autoclk2', name:'Quantum Daemon',         icon:'👾',  cost:50000,     desc:'+4 auto-clicks/sec.',           type:'autoclk', rate:4,   unlock: s => g16Owned('dot') >= 25 },
  { id:'autoclk3', name:'Recursive Observer',    icon:'🔁',  cost:2000000,   desc:'+20 auto-clicks/sec.',          type:'autoclk', rate:20,  unlock: s => g16Owned('spin') >= 25 },
  // ── Quantum Dot upgrades ──
  { id:'dot1', name:'Sharper Focus',             icon:'⚛️',  cost:100,       desc:'Quantum Dots ×2.',              type:'bld', bld:'dot', mult:2, unlock: s => g16Owned('dot') >= 1 },
  { id:'dot2', name:'Dot Matrix',                icon:'⚛️',  cost:500,       desc:'Quantum Dots ×2.',              type:'bld', bld:'dot', mult:2, unlock: s => g16Owned('dot') >= 5 },
  { id:'dot3', name:'Quantum Coherence',         icon:'⚛️',  cost:5000,      desc:'Quantum Dots ×2.',              type:'bld', bld:'dot', mult:2, unlock: s => g16Owned('dot') >= 25 },
  { id:'dot4', name:'Decoherence Shield',        icon:'⚛️',  cost:50000,     desc:'Quantum Dots ×4.',              type:'bld', bld:'dot', mult:4, unlock: s => g16Owned('dot') >= 50 },
  // ── Electron Spin upgrades ──
  { id:'spin1', name:'Spin Up',                  icon:'🌀',  cost:1000,      desc:'Electron Spins ×2.',            type:'bld', bld:'spin', mult:2, unlock: s => g16Owned('spin') >= 1 },
  { id:'spin2', name:'Spin Polarizer',           icon:'🌀',  cost:5000,      desc:'Electron Spins ×2.',            type:'bld', bld:'spin', mult:2, unlock: s => g16Owned('spin') >= 5 },
  { id:'spin3', name:'Ferromagnetic Boost',      icon:'🌀',  cost:50000,     desc:'Electron Spins ×2.',            type:'bld', bld:'spin', mult:2, unlock: s => g16Owned('spin') >= 25 },
  { id:'spin4', name:'Spin Echo Protocol',       icon:'🌀',  cost:500000,    desc:'Electron Spins ×4.',            type:'bld', bld:'spin', mult:4, unlock: s => g16Owned('spin') >= 50 },
  // ── Photon upgrades ──
  { id:'photon1', name:'Coherent Light',         icon:'💡',  cost:11000,     desc:'Photon Emitters ×2.',           type:'bld', bld:'photon', mult:2, unlock: s => g16Owned('photon') >= 1 },
  { id:'photon2', name:'Laser Focus',            icon:'💡',  cost:55000,     desc:'Photon Emitters ×2.',           type:'bld', bld:'photon', mult:2, unlock: s => g16Owned('photon') >= 5 },
  { id:'photon3', name:'Squeezed Light',         icon:'💡',  cost:550000,    desc:'Photon Emitters ×2.',           type:'bld', bld:'photon', mult:2, unlock: s => g16Owned('photon') >= 25 },
  { id:'photon4', name:'Photon Number State',    icon:'💡',  cost:5500000,   desc:'Photon Emitters ×4.',           type:'bld', bld:'photon', mult:4, unlock: s => g16Owned('photon') >= 50 },
  // ── Qubit Register ──
  { id:'reg1', name:'Error Correction',          icon:'📟',  cost:120000,    desc:'Qubit Registers ×2.',           type:'bld', bld:'register', mult:2, unlock: s => g16Owned('register') >= 1 },
  { id:'reg2', name:'Topological Encoding',      icon:'📟',  cost:600000,    desc:'Qubit Registers ×2.',           type:'bld', bld:'register', mult:2, unlock: s => g16Owned('register') >= 5 },
  { id:'reg3', name:'Fault-Tolerant Register',   icon:'📟',  cost:6000000,   desc:'Qubit Registers ×2.',           type:'bld', bld:'register', mult:2, unlock: s => g16Owned('register') >= 25 },
  { id:'reg4', name:'Logical Qubit Array',       icon:'📟',  cost:60000000,  desc:'Qubit Registers ×4.',           type:'bld', bld:'register', mult:4, unlock: s => g16Owned('register') >= 50 },
  // ── Quantum Gate ──
  { id:'gate1', name:'CNOT Optimization',        icon:'🔮',  cost:1300000,   desc:'Quantum Gates ×2.',             type:'bld', bld:'gate', mult:2, unlock: s => g16Owned('gate') >= 1 },
  { id:'gate2', name:'Toffoli Cascade',          icon:'🔮',  cost:6500000,   desc:'Quantum Gates ×2.',             type:'bld', bld:'gate', mult:2, unlock: s => g16Owned('gate') >= 5 },
  { id:'gate3', name:'Universal Gate Set',       icon:'🔮',  cost:65000000,  desc:'Quantum Gates ×2.',             type:'bld', bld:'gate', mult:2, unlock: s => g16Owned('gate') >= 25 },
  { id:'gate4', name:'Fault-Tolerant Gates',     icon:'🔮',  cost:650000000, desc:'Quantum Gates ×4.',             type:'bld', bld:'gate', mult:4, unlock: s => g16Owned('gate') >= 50 },
  // ── Entangled Pair ──
  { id:'pair1', name:'Bell Inequality Exploit',  icon:'🔗',  cost:14000000,  desc:'Entangled Pairs ×2.',           type:'bld', bld:'pair', mult:2, unlock: s => g16Owned('pair') >= 1 },
  { id:'pair2', name:'GHZ State',                icon:'🔗',  cost:70000000,  desc:'Entangled Pairs ×2.',           type:'bld', bld:'pair', mult:2, unlock: s => g16Owned('pair') >= 5 },
  { id:'pair3', name:'W State Distributor',      icon:'🔗',  cost:700000000, desc:'Entangled Pairs ×2.',           type:'bld', bld:'pair', mult:2, unlock: s => g16Owned('pair') >= 25 },
  { id:'pair4', name:'Multipartite Entanglement',icon:'🔗',  cost:7000000000,desc:'Entangled Pairs ×4.',           type:'bld', bld:'pair', mult:4, unlock: s => g16Owned('pair') >= 50 },
  // ── Quantum Computer ──
  { id:'qc1', name:'Shor\'s Algorithm',          icon:'💻',  cost:200000000, desc:'Quantum Computers ×2.',         type:'bld', bld:'qc', mult:2, unlock: s => g16Owned('qc') >= 1 },
  { id:'qc2', name:'Grover\'s Search',           icon:'💻',  cost:1000000000,desc:'Quantum Computers ×2.',         type:'bld', bld:'qc', mult:2, unlock: s => g16Owned('qc') >= 5 },
  { id:'qc3', name:'Quantum Supremacy',          icon:'💻',  cost:10000000000,desc:'Quantum Computers ×2.',        type:'bld', bld:'qc', mult:2, unlock: s => g16Owned('qc') >= 25 },
  { id:'qc4', name:'Post-Quantum Protocol',      icon:'💻',  cost:100000000000,desc:'Quantum Computers ×4.',       type:'bld', bld:'qc', mult:4, unlock: s => g16Owned('qc') >= 50 },
  // ── Wave Collapse ──
  { id:'wc1',  name:'Copenhagen Shortcut',       icon:'🌊',  cost:3300000000, desc:'Wave Collapse Engines ×2.',    type:'bld', bld:'collapse', mult:2, unlock: s => g16Owned('collapse') >= 1 },
  { id:'wc2',  name:'Many Worlds Harvest',       icon:'🌊',  cost:16500000000,desc:'Wave Collapse Engines ×2.',    type:'bld', bld:'collapse', mult:2, unlock: s => g16Owned('collapse') >= 5 },
  { id:'wc3',  name:'Consistent Histories',      icon:'🌊',  cost:165000000000,desc:'Wave Collapse Engines ×4.',   type:'bld', bld:'collapse', mult:4, unlock: s => g16Owned('collapse') >= 25 },
  // ── Multiverse Fork ──
  { id:'mv1',  name:'Branching Algorithm',       icon:'🌌',  cost:51000000000, desc:'Multiverse Forks ×2.',        type:'bld', bld:'fork', mult:2, unlock: s => g16Owned('fork') >= 1 },
  { id:'mv2',  name:'Everett Interpretation',    icon:'🌌',  cost:255000000000,desc:'Multiverse Forks ×2.',        type:'bld', bld:'fork', mult:2, unlock: s => g16Owned('fork') >= 5 },
  { id:'mv3',  name:'Parallel Harvester',        icon:'🌌',  cost:2550000000000,desc:'Multiverse Forks ×4.',       type:'bld', bld:'fork', mult:4, unlock: s => g16Owned('fork') >= 25 },
  // ── Time Crystal ──
  { id:'tc1',  name:'Discrete Time Symmetry',    icon:'💎',  cost:750000000000, desc:'Time Crystals ×2.',          type:'bld', bld:'crystal', mult:2, unlock: s => g16Owned('crystal') >= 1 },
  { id:'tc2',  name:'Floquet Engineering',       icon:'💎',  cost:3750000000000,desc:'Time Crystals ×4.',          type:'bld', bld:'crystal', mult:4, unlock: s => g16Owned('crystal') >= 5 },
  // ── Synergy upgrades ──
  { id:'syn1', name:'Spin-Photon Coupling',      icon:'✨',  cost:250000,    desc:'Electron Spins boost Photon Emitters: +3% per Spin owned.',     type:'synergy', a:'spin', b:'photon', unlock: s => g16Owned('photon') >= 10 },
  { id:'syn2', name:'Register-Gate Fusion',      icon:'✨',  cost:5000000,   desc:'Qubit Registers boost Gates: +2% per Register owned.',         type:'synergy', a:'register', b:'gate', unlock: s => g16Owned('gate') >= 10 },
  { id:'syn3', name:'Entanglement Network',      icon:'✨',  cost:50000000,  desc:'Entangled Pairs boost all buildings +1% per Pair owned.',      type:'synergy', a:'pair', b:'all',   unlock: s => g16Owned('pair') >= 10 },
  { id:'syn4', name:'Quantum Supremacy Link',    icon:'✨',  cost:500000000, desc:'Quantum Computer multiplies all buildings by 1 + (QCs × 2%).',  type:'synergy', a:'qc', b:'all',    unlock: s => g16Owned('qc') >= 10 },
  // ── Golden Qubit upgrades ──
  { id:'gold1', name:'Golden Observation',       icon:'⭐',  cost:3000000,   desc:'Golden Qubits appear 33% more often.',                         type:'goldenFreq', val:0.67, unlock: s => s.goldenClicked >= 1 },
  { id:'gold2', name:'Quantum Lore',             icon:'⭐',  cost:30000000,  desc:'Golden Qubits last 50% longer.',                              type:'goldenDur', val:1.5,   unlock: s => s.goldenClicked >= 5 },
  { id:'gold3', name:'Entangled Fortune',        icon:'⭐',  cost:300000000, desc:'Golden Qubits give double the bonus.',                         type:'goldenBonus', val:2,  unlock: s => s.goldenClicked >= 15 },
  // ── Prestige upgrade ──
  { id:'pres1', name:'Quantum Legacy',           icon:'🏆',  cost:1000000000000, desc:'Permanently unlock: +10% QPS per Prestige level.',         type:'prestige_unlock', unlock: s => s.prestigeLevel >= 1 },
]

// ── State ─────────────────────────────────────────────
let G16 = {}
let g16Raf, g16SaveTimer = 0, g16GoldenTimer = 0, g16GoldenActive = false
let g16AutoClickAccum = 0
let g16Frenzy = { active:false, mult:1, until:0, label:'' }
const G16_SAVE_KEY = 'qg_g16_save'

function g16DefaultState() {
  return {
    qubits: 0, totalProduced: 0, totalClicked: 0, manualClicks: 0,
    goldenClicked: 0, prestigeLevel: 0, prestigeMult: 1,
    buildings: Object.fromEntries(G16_BUILDINGS.map(b => [b.id, 0])),
    upgrades: {},
    // multipliers (computed)
    clickMult: 1, buildingMult: Object.fromEntries(G16_BUILDINGS.map(b => [b.id, 1])),
    autoClickRate: 0, clickSynActive: false,
    goldenFreqMult: 1, goldenDurMult: 1, goldenBonusMult: 1,
    prestigeUnlocked: false,
    tab: 'upgrades',
  }
}

function g16Owned(id) { return G16.buildings?.[id] || 0 }

function g16GetBuildingCost(id) {
  const b = G16_BUILDINGS.find(x => x.id === id)
  return Math.ceil(b.baseCost * Math.pow(1.15, g16Owned(id)))
}

function g16GetQps() {
  let total = 0
  const synPairAll  = G16.upgrades['syn3'] ? g16Owned('pair') * 0.01 : 0
  const synQcAll    = G16.upgrades['syn4'] ? g16Owned('qc')   * 0.02 : 0
  for (const b of G16_BUILDINGS) {
    let qps = b.baseQps * g16Owned(b.id) * (G16.buildingMult[b.id] || 1)
    // Synergy: Electron Spins boost Photon Emitters
    if (b.id === 'photon' && G16.upgrades['syn1'])
      qps *= (1 + g16Owned('spin') * 0.03)
    // Synergy: Registers boost Gates
    if (b.id === 'gate' && G16.upgrades['syn2'])
      qps *= (1 + g16Owned('register') * 0.02)
    // Global synergies
    qps *= (1 + synPairAll + synQcAll)
    total += qps
  }
  return total * G16.prestigeMult * (g16Frenzy.active && Date.now() < g16Frenzy.until ? g16Frenzy.mult : 1)
}

function g16GetClickValue() {
  let cv = G16.clickMult
  if (G16.clickSynActive) cv += g16GetQps() * 0.01
  if (g16Frenzy.active && Date.now() < g16Frenzy.until && g16Frenzy.clickMult)
    cv *= g16Frenzy.clickMult
  return Math.max(1, cv)
}

async function initGame16() {
  g16Load()
  document.getElementById('g16-over').classList.remove('show')
  setEntropyLive(false)
  await initCurby()
  g16ApplyAllUpgrades()
  g16RenderShop()
  g16RenderStats()
  cancelAnimationFrame(g16Raf)
  g16GoldenTimer = Date.now() + g16NextGoldenDelay()
  g16Loop()
}

// ── Game Loop ─────────────────────────────────────────
let g16LastTick = 0
function g16Loop(now = 0) {
  g16Raf = requestAnimationFrame(g16Loop)
  const dt = Math.min((now - g16LastTick) / 1000, 0.1)
  g16LastTick = now
  if (dt <= 0) return

  const qps = g16GetQps()
  const gain = qps * dt
  G16.qubits        += gain
  G16.totalProduced += gain

  // Auto-click
  g16AutoClickAccum += G16.autoClickRate * dt
  if (g16AutoClickAccum >= 1) {
    const clicks = Math.floor(g16AutoClickAccum)
    g16AutoClickAccum -= clicks
    const cv = g16GetClickValue()
    G16.qubits        += cv * clicks
    G16.totalProduced += cv * clicks
    G16.totalClicked  += cv * clicks
  }

  // Golden qubit
  if (!g16GoldenActive && Date.now() >= g16GoldenTimer) g16SpawnGolden()

  // Auto-save every 30s
  g16SaveTimer += dt
  if (g16SaveTimer >= 30) { g16Save(); g16SaveTimer = 0 }

  // Frenzy expiry
  if (g16Frenzy.active && Date.now() >= g16Frenzy.until) {
    g16Frenzy = { active:false, mult:1, until:0, label:'' }
    document.getElementById('g16-frenzy').style.display = 'none'
  }

  g16UpdateHUD(qps)
  g16CheckUpgradesUnlocked()
  g16TickCount = (g16TickCount||0)+1
  if (g16TickCount % 10 === 0) g16RefreshAffordability()
}

// ── Click ─────────────────────────────────────────────
window.g16Click = function(e) {
  SFX.resume(); SFX.tick()
  const cv = g16GetClickValue()
  G16.qubits        += cv
  G16.totalProduced += cv
  G16.totalClicked  += cv
  G16.manualClicks++
  if (e) g16ClickParticle(e, '+' + g16Fmt(cv))
}

function g16ClickParticle(e, text) {
  const btn = document.getElementById('g16-click-btn')
  const rect = btn.getBoundingClientRect()
  const p = document.createElement('div')
  p.className = 'g16-click-pop'
  p.textContent = text
  p.style.left = (e.clientX - rect.left) + 'px'
  p.style.top  = (e.clientY - rect.top) + 'px'
  btn.appendChild(p)
  setTimeout(() => p.remove(), 900)
}

// ── HUD ───────────────────────────────────────────────
function g16UpdateHUD(qps) {
  document.getElementById('g16-qubit-count').textContent = g16Fmt(Math.floor(G16.qubits)) + ' qubits'
  document.getElementById('g16-qps-display').textContent = g16Fmt(qps, 1) + ' per second'
  document.getElementById('g16-click-val').textContent   = 'each click: ' + g16Fmt(g16GetClickValue(), 1)
}

// ── Shop rendering ────────────────────────────────────
let g16ShopDirty = true
let g16LastAffordFrame = 0
function g16RenderShop() {
  if (!g16ShopDirty) return
  g16ShopDirty = false
  if (G16.tab === 'upgrades') g16RenderUpgrades()
  else if (G16.tab === 'buildings') g16RenderBuildings()
  else g16RenderStats()
}

// lightweight pass: just update disabled state + locked class without full re-render
function g16RefreshAffordability() {
  const cont = document.getElementById('g16-shop-content')
  if (!cont) return
  const items = cont.querySelectorAll('.g16-shop-item')
  let anyChange = false
  items.forEach(item => {
    const btn = item.querySelector('button.g16-buy-btn')
    if (!btn) return
    const id = (btn.getAttribute('onclick')||'').match(/'([^']+)'/)?.[1]
    if (!id) return
    let canAfford = false
    // check buildings
    const bld = G16_BUILDINGS && G16_BUILDINGS.find(b=>b.id===id)
    if (bld) canAfford = G16.qubits >= g16GetBuildingCost(id)
    // check upgrades
    const upg = G16_UPGRADES && G16_UPGRADES.find(u=>u.id===id)
    if (upg) canAfford = G16.qubits >= upg.cost
    const wasDisabled = btn.disabled
    btn.disabled = !canAfford
    if (canAfford) item.classList.remove('g16-locked')
    else           item.classList.add('g16-locked')
    if (wasDisabled !== btn.disabled) anyChange = true
  })
}

function g16CheckUpgradesUnlocked() {
  for (const u of G16_UPGRADES) {
    if (!G16.upgrades[u.id] && u.unlock({ totalProduced: G16.totalProduced, goldenClicked: G16.goldenClicked, prestigeLevel: G16.prestigeLevel })) {
      g16ShopDirty = true
      break
    }
  }
  if (g16ShopDirty) g16RenderShop()
}

function g16RenderUpgrades() {
  const cont = document.getElementById('g16-shop-content')
  cont.innerHTML = ''
  const available = G16_UPGRADES.filter(u =>
    !G16.upgrades[u.id] &&
    u.unlock({ totalProduced: G16.totalProduced, goldenClicked: G16.goldenClicked, prestigeLevel: G16.prestigeLevel })
  )
  if (available.length === 0) {
    cont.innerHTML = '<div style="color:var(--muted);text-align:center;padding:2rem;font-size:.85rem">No upgrades available yet — keep producing qubits!</div>'
    return
  }
  for (const u of available) {
    const canAfford = G16.qubits >= u.cost
    const div = document.createElement('div')
    div.className = 'g16-shop-item' + (canAfford ? '' : ' g16-locked')
    div.innerHTML = `<span class="g16-item-icon">${u.icon}</span><div class="g16-item-info"><div class="g16-item-name">${u.name}</div><div class="g16-item-desc">${u.desc}</div></div><button class="btn-primary g16-buy-btn" ${canAfford ? '' : 'disabled'} onclick="g16BuyUpgrade('${u.id}')">🪙 ${g16Fmt(u.cost)}</button>`
    cont.appendChild(div)
  }
}

function g16RenderBuildings() {
  const cont = document.getElementById('g16-shop-content')
  cont.innerHTML = ''
  for (const b of G16_BUILDINGS) {
    const cost = g16GetBuildingCost(b.id)
    const owned = g16Owned(b.id)
    const canAfford = G16.qubits >= cost
    const bqps = b.baseQps * (G16.buildingMult[b.id] || 1)
    const div = document.createElement('div')
    div.className = 'g16-shop-item' + (canAfford ? '' : ' g16-locked')
    div.innerHTML = `<span class="g16-item-icon">${b.icon}</span><div class="g16-item-info"><div class="g16-item-name">${b.name} <span style="color:var(--muted);font-size:.8rem">×${owned}</span></div><div class="g16-item-desc">${b.desc}</div><div style="color:#fbbf24;font-size:.75rem">${g16Fmt(bqps,1)} qps each · total ${g16Fmt(bqps*owned,1)} qps</div></div><button class="btn-primary g16-buy-btn" ${canAfford?'':'disabled'} onclick="g16BuyBuilding('${b.id}')">🪙 ${g16Fmt(cost)}</button>`
    cont.appendChild(div)
  }
}

function g16RenderStats() {
  const cont = document.getElementById('g16-shop-content')
  const prestigeThreshold = 1e12
  const canPrestige = G16.totalProduced >= prestigeThreshold
  cont.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:.8rem;font-size:.85rem;">
      <div class="g16-stat-row"><span>Qubits produced (all time)</span><span>${g16Fmt(G16.totalProduced)}</span></div>
      <div class="g16-stat-row"><span>Qubits from clicking</span><span>${g16Fmt(G16.totalClicked)}</span></div>
      <div class="g16-stat-row"><span>Manual clicks</span><span>${g16Fmt(G16.manualClicks)}</span></div>
      <div class="g16-stat-row"><span>Golden qubits caught</span><span>${G16.goldenClicked}</span></div>
      <div class="g16-stat-row"><span>Prestige level</span><span>${G16.prestigeLevel}</span></div>
      <div class="g16-stat-row"><span>Prestige bonus</span><span>×${G16.prestigeMult.toFixed(2)}</span></div>
      <div class="g16-stat-row"><span>Auto-clicks/sec</span><span>${G16.autoClickRate}</span></div>
      <hr style="border-color:var(--border)">
      <div style="text-align:center;color:var(--muted);font-size:.8rem">
        Prestige resets all buildings &amp; upgrades but gives a permanent ×1.1 multiplier per level.<br>
        Requires 1 trillion total qubits produced.
      </div>
      <button class="btn-primary" ${canPrestige?'':'disabled'} onclick="g16Prestige()" style="${canPrestige?'':'opacity:.4;'}">
        ✨ Prestige (${g16Fmt(G16.totalProduced)} / ${g16Fmt(prestigeThreshold)} qubits)
      </button>
      <button class="btn-primary" style="background:var(--card);color:var(--muted);border:1px solid var(--border);box-shadow:none;" onclick="g16Save();document.getElementById('g16-save-msg').style.display='block';setTimeout(()=>document.getElementById('g16-save-msg').style.display='none',1500)">💾 Save</button>
      <div id="g16-save-msg" style="display:none;text-align:center;color:var(--success);font-size:.8rem">✓ Saved!</div>
      <button class="btn-primary" style="background:var(--card);color:#ef4444;border:1px solid #ef4444;box-shadow:none;" onclick="g16HardReset()">🗑️ Hard Reset</button>
    </div>`
}

// ── Buy actions ───────────────────────────────────────
window.g16BuyBuilding = function(id) {
  const cost = g16GetBuildingCost(id)
  if (G16.qubits < cost) return
  SFX.powerup()
  G16.qubits -= cost
  G16.buildings[id]++
  g16ShopDirty = true
  g16RenderShop()
}

window.g16BuyUpgrade = function(id) {
  const u = G16_UPGRADES.find(x => x.id === id)
  if (!u || G16.upgrades[id]) return
  if (G16.qubits < u.cost) return
  G16.qubits -= u.cost
  G16.upgrades[id] = true
  g16ApplyUpgrade(u)
  g16ShopDirty = true
  g16RenderShop()
}

function g16ApplyUpgrade(u) {
  if (u.type === 'click')        G16.clickMult *= u.mult
  if (u.type === 'clicksyn')     G16.clickSynActive = true
  if (u.type === 'autoclk')      G16.autoClickRate += u.rate
  if (u.type === 'bld')          G16.buildingMult[u.bld] = (G16.buildingMult[u.bld] || 1) * u.mult
  if (u.type === 'goldenFreq')   G16.goldenFreqMult *= u.val
  if (u.type === 'goldenDur')    G16.goldenDurMult  *= u.val
  if (u.type === 'goldenBonus')  G16.goldenBonusMult *= u.val
  if (u.type === 'prestige_unlock') G16.prestigeUnlocked = true
  // Synergy and other types are computed dynamically in g16GetQps
}

function g16ApplyAllUpgrades() {
  // Reset multipliers then replay
  G16.clickMult = 1
  G16.buildingMult = Object.fromEntries(G16_BUILDINGS.map(b => [b.id, 1]))
  G16.autoClickRate = 0
  G16.clickSynActive = false
  G16.goldenFreqMult = 1; G16.goldenDurMult = 1; G16.goldenBonusMult = 1
  G16.prestigeUnlocked = false
  for (const u of G16_UPGRADES) {
    if (G16.upgrades[u.id]) g16ApplyUpgrade(u)
  }
}

// ── Prestige ──────────────────────────────────────────
window.g16Prestige = function() {
  if (G16.totalProduced < 1e12) return
  if (!confirm('Prestige? All buildings and upgrades reset, but you gain ×1.1 permanent production bonus.')) return
  G16.prestigeLevel++
  G16.prestigeMult = Math.pow(1.1, G16.prestigeLevel)
  const level = G16.prestigeLevel
  const golden = G16.goldenClicked
  G16 = g16DefaultState()
  G16.prestigeLevel = level
  G16.prestigeMult  = Math.pow(1.1, level)
  G16.goldenClicked = golden
  g16Save()
  g16RenderShop()
  g16RenderStats()
}

window.g16HardReset = function() {
  if (!confirm('Hard reset? ALL progress (including prestige) will be deleted.')) return
  localStorage.removeItem(G16_SAVE_KEY)
  G16 = g16DefaultState()
  g16ApplyAllUpgrades()
  g16RenderShop()
}

// ── Golden Qubit ──────────────────────────────────────
function g16NextGoldenDelay() {
  return (120000 + Math.random() * 180000) * G16.goldenFreqMult
}

function g16SpawnGolden() {
  g16GoldenActive = true
  const el = document.getElementById('g16-golden')
  const arena = document.getElementById('g16-left-panel')
  const rect = arena.getBoundingClientRect()
  el.style.left = (20 + Math.random() * (rect.width - 80)) + 'px'
  el.style.top  = (80 + Math.random() * (rect.height - 160)) + 'px'
  el.style.display = 'flex'
  const dur = 13000 * G16.goldenDurMult
  el._timeout = setTimeout(() => {
    el.style.display = 'none'
    g16GoldenActive = false
    g16GoldenTimer = Date.now() + g16NextGoldenDelay()
  }, dur)
}

window.g16ClickGolden = function() {
  SFX.perfect()
  const el = document.getElementById('g16-golden')
  clearTimeout(el._timeout)
  el.style.display = 'none'
  g16GoldenActive = false
  g16GoldenTimer = Date.now() + g16NextGoldenDelay()
  G16.goldenClicked++

  // Pick random effect
  const r = Math.random()
  const qps = g16GetQps()
  const bonus = G16.goldenBonusMult
  if (r < 0.35) {
    // Lucky: 15 minutes of QPS
    const gain = Math.min(qps * 900, qps * 900) * bonus
    G16.qubits += gain; G16.totalProduced += gain
    g16ShowFrenzyBanner('⭐ Lucky! +' + g16Fmt(gain) + ' qubits', 4000)
  } else if (r < 0.65) {
    // Frenzy: 7× for 77s
    g16Frenzy = { active:true, mult:7 * bonus, until:Date.now() + 77000, label:'⚡ Frenzy ×7' }
    document.getElementById('g16-frenzy').textContent = '⚡ QUANTUM FRENZY ×7  (77s)'
    document.getElementById('g16-frenzy').style.display = 'block'
    g16ShowFrenzyBanner('⚡ Quantum Frenzy! ×7 production for 77s', 4000)
  } else if (r < 0.85) {
    // Click Frenzy: ×777 clicks for 13s
    g16Frenzy = { active:true, mult:1, clickMult:777 * bonus, until:Date.now() + 13000, label:'🖱️ Click Frenzy' }
    document.getElementById('g16-frenzy').textContent = '🖱️ CLICK FRENZY ×777  (13s)'
    document.getElementById('g16-frenzy').style.display = 'block'
    g16ShowFrenzyBanner('🖱️ Click Frenzy! ×777 click value for 13s', 4000)
  } else {
    // Quantum Surge: random building ×10 for 30s (simulated as bonus)
    const bldList = G16_BUILDINGS.filter(b => g16Owned(b.id) > 0)
    const bld = bldList.length ? bldList[Math.floor(Math.random() * bldList.length)] : null
    if (bld) {
      const surge = bld.baseQps * g16Owned(bld.id) * 9 * 30 * bonus
      G16.qubits += surge; G16.totalProduced += surge
      g16ShowFrenzyBanner(`🚀 Quantum Surge! ${bld.icon} ${bld.name} ×10 for 30s → +${g16Fmt(surge)}`, 5000)
    }
  }
  g16ShopDirty = true
  g16RenderShop()
}

function g16ShowFrenzyBanner(msg, dur) {
  const el = document.getElementById('g16-banner')
  el.textContent = msg
  el.style.display = 'block'
  clearTimeout(el._t)
  el._t = setTimeout(() => el.style.display = 'none', dur)
}

// ── News ticker ───────────────────────────────────────
const G16_NEWS = [
  'Quantum physicists baffled by unprecedented qubit yields.',
  'Local electron refuses to pick a spin — claims "both are valid".',
  'Schrödinger\'s cat demands hazard pay.',
  'Heisenberg uncertainty: we\'re not sure where all these qubits are coming from.',
  'Sources report that observing quantum dots makes them produce more qubits.',
  'Multiverse fork causes minor existential crisis in parallel lab.',
  'Time crystal accused of working overtime.',
  'Entangled pair in dispute — each blames the other.',
  'Quantum computer solves problem nobody had.',
  'Wave collapse engine rated "extremely satisfying" by local physicist.',
  'Breaking: superposition discovered to be "both profitable and not profitable".',
  'Scientists alarmed as qubit production exceeds GDP of several nations.',
  '"We didn\'t expect this many qubits," admits researcher, visibly delighted.',
  'Golden qubit sighting reported in sector 7.',
  'CERN requests consulting fee for "inspiration".',
]
let g16NewsIdx = 0
function g16TickNews() {
  const el = document.getElementById('g16-news-text')
  if (el) el.textContent = G16_NEWS[g16NewsIdx++ % G16_NEWS.length]
}

// ── Tab switching ─────────────────────────────────────
window.g16Tab = function(tab) {
  G16.tab = tab
  document.querySelectorAll('.g16-tab-btn').forEach(b => b.classList.remove('active'))
  document.getElementById('g16-tab-' + tab).classList.add('active')
  g16ShopDirty = true
  g16RenderShop()
}

// ── Save / Load ───────────────────────────────────────
function g16Save() {
  const data = {
    qubits: G16.qubits, totalProduced: G16.totalProduced,
    totalClicked: G16.totalClicked, manualClicks: G16.manualClicks,
    goldenClicked: G16.goldenClicked, prestigeLevel: G16.prestigeLevel,
    buildings: G16.buildings, upgrades: G16.upgrades, tab: G16.tab,
  }
  localStorage.setItem(G16_SAVE_KEY, JSON.stringify(data))
}

function g16Load() {
  G16 = g16DefaultState()
  try {
    const raw = localStorage.getItem(G16_SAVE_KEY)
    if (!raw) return
    const d = JSON.parse(raw)
    Object.assign(G16, d)
    G16.prestigeMult = Math.pow(1.1, G16.prestigeLevel || 0)
  } catch {}
}

// ── Number formatter ──────────────────────────────────
function g16Fmt(n, dp = 0) {
  if (n < 1000) return dp ? n.toFixed(dp) : Math.floor(n).toString()
  const units = ['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc']
  const i = Math.floor(Math.log10(n) / 3)
  const idx = Math.min(i, units.length - 1)
  const val = n / Math.pow(1000, idx)
  return val.toFixed(idx > 0 ? 2 : dp) + units[idx]
}

// ── Init ticker & keyboard ─────────────────────────────
window.addEventListener('load', () => {
  setInterval(g16TickNews, 6000)
})
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !e.repeat && document.getElementById('game16')?.classList.contains('active')) {
    e.preventDefault()
    g16Click(null)
  }
})

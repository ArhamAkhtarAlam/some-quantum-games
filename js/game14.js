// ═══════════════════════════════════════════════════════
//  GAME 14 — WAVE COLLAPSE PUZZLE
//  Arrow keys = move cursor | X = flip gate | H = Hadamard
//  M = Measure | Z = Undo | ESC = pause & shop
//  Match all qubits to the target state to advance
// ═══════════════════════════════════════════════════════
//  Qubit states: 0 = |0⟩  1 = |1⟩  S = superposition |+⟩
//  Gates: X flips 0↔1 (S unchanged) | H: 0→S, 1→S, S→0
//         M: collapses S→0 or 1 randomly

const G14_PU = {
  time:  { icon:'⏱️', name:'Extra Time',    consumable:true,  tiers:[
    { cost:60,  desc:'+10 seconds' },
  ]},
  hint:  { icon:'💡', name:'Hint',          consumable:true,  tiers:[
    { cost:80,  desc:'Highlight a wrong qubit' },
  ]},
  undo:  { icon:'↩️', name:'Extra Undos',   consumable:false, tiers:[
    { cost:100, desc:'5 undo slots' },
    { cost:250, desc:'10 undo slots' },
    { cost:500, desc:'Unlimited undo' },
  ]},
  slow:  { icon:'🐢', name:'Slow Timer',    consumable:false, tiers:[
    { cost:120, desc:'Timer 20% slower' },
    { cost:300, desc:'Timer 40% slower' },
    { cost:700, desc:'Timer 60% slower' },
  ]},
  peek:  { icon:'👁️', name:'Peek',          consumable:true,  tiers:[
    { cost:150, desc:'Show solution for 3s' },
  ]},
}
const G14_PU_KEYS = ['time','hint','undo','slow','peek']

const G14_COLS = 4, G14_ROWS = 4

let G14 = {}
let g14Interval, g14KD, g14PeekTimeout

function g14Reset() {
  G14 = {
    score:0, level:0, active:false, paused:false,
    grid: [], target: [],
    cx:0, cy:0,
    timeLeft:30, timeFrac:0,
    history:[], maxHistory:3,
    hintCell:null, hintTimer:0,
    peekActive:false,
    puCoins:0,
    puLevels:{ time:0, hint:0, undo:0, slow:0, peek:0 },
    extraTimes:0, extraHints:0, extraPeeks:0,
    keys:{},
  }
}

async function initGame14() {
  g14Reset()
  document.getElementById('g14-over').classList.remove('show')
  document.getElementById('g14-pause').style.display = 'none'
  setEntropyLive(false)
  await initCurby()
  g14Start()
}

function g14Start() {
  if (g14KD) document.removeEventListener('keydown', g14KD)
  g14KD = e => {
    if (e.code === 'Escape') { e.preventDefault(); g14TogglePause(); return }
    if (G14.paused || !G14.active) return
    const { cx, cy } = G14
    if (e.code === 'ArrowUp')    { e.preventDefault(); G14.cy = (cy - 1 + G14_ROWS) % G14_ROWS }
    if (e.code === 'ArrowDown')  { e.preventDefault(); G14.cy = (cy + 1) % G14_ROWS }
    if (e.code === 'ArrowLeft')  { e.preventDefault(); G14.cx = (cx - 1 + G14_COLS) % G14_COLS }
    if (e.code === 'ArrowRight') { e.preventDefault(); G14.cx = (cx + 1) % G14_COLS }
    if (e.code === 'KeyX') { SFX.click(); g14ApplyGate('X') }
    if (e.code === 'KeyH') { SFX.click(); g14ApplyGate('H') }
    if (e.code === 'KeyM') g14ApplyGate('M')
    if (e.code === 'KeyZ') g14Undo()
    if (e.code === 'KeyT') g14UseTime()
    if (e.code === 'KeyI') g14UseHint()
    if (e.code === 'KeyP') g14UsePeek()
    g14Render()
  }
  document.addEventListener('keydown', g14KD)
  G14.active = true
  g14NextLevel()
}

function g14MakeGrid(difficulty) {
  // Start from target, apply random valid gates to produce initial state
  const target = []
  for (let r = 0; r < G14_ROWS; r++) {
    target.push([])
    for (let c = 0; c < G14_COLS; c++) {
      const v = qRandInt(3) // 0,1,2 → |0⟩,|1⟩,|+⟩
      target[r].push(v < 2 ? v : 'S')
    }
  }

  // Clone grid from target
  const grid = target.map(r => [...r])

  // Apply random inverse gates to create starting state
  const ops = difficulty + 4
  for (let i = 0; i < ops; i++) {
    const r = qRandInt(G14_ROWS), c = qRandInt(G14_COLS)
    const gate = ['X','H','M'][qRandInt(3)]
    grid[r][c] = g14Gate(grid[r][c], gate)
  }
  return { grid, target }
}

function g14Gate(val, gate) {
  if (gate === 'X') return val === 0 ? 1 : val === 1 ? 0 : 'S'
  if (gate === 'H') return val === 0 ? 'S' : val === 1 ? 'S' : 0
  if (gate === 'M') return val === 'S' ? (qRandInt(2) === 0 ? 0 : 1) : val
  return val
}

function g14ApplyGate(gate) {
  if (!G14.active || G14.paused) return
  // Save history
  const maxH = [3,5,10,Infinity][G14.puLevels.undo] || 3
  if (G14.history.length >= maxH && maxH !== Infinity)
    G14.history.shift()
  G14.history.push(G14.grid.map(r => [...r]))

  const { cx, cy } = G14
  G14.grid[cy][cx] = g14Gate(G14.grid[cy][cx], gate)
  G14.hintCell = null

  // Check win
  let win = true
  for (let r = 0; r < G14_ROWS; r++)
    for (let c = 0; c < G14_COLS; c++)
      if (G14.grid[r][c] !== G14.target[r][c]) { win = false; break }
  if (win) g14LevelComplete()
}

function g14Undo() {
  if (G14.history.length === 0) return
  G14.grid = G14.history.pop()
  g14Render()
}

function g14UseTime() {
  if (G14.extraTimes <= 0) return
  G14.extraTimes--
  G14.timeLeft = Math.min(G14.timeLeft + 10, 60)
  g14Render()
}

function g14UseHint() {
  if (G14.extraHints <= 0) return
  G14.extraHints--
  // Find first wrong cell
  for (let r = 0; r < G14_ROWS; r++)
    for (let c = 0; c < G14_COLS; c++)
      if (G14.grid[r][c] !== G14.target[r][c]) {
        G14.hintCell = { r, c }
        G14.hintTimer = 120
        g14Render()
        return
      }
}

function g14UsePeek() {
  if (G14.extraPeeks <= 0 || G14.peekActive) return
  G14.extraPeeks--
  G14.peekActive = true
  clearTimeout(g14PeekTimeout)
  g14PeekTimeout = setTimeout(() => { G14.peekActive = false; g14Render() }, 3000)
  g14Render()
}

function g14NextLevel() {
  G14.level++
  const diff = Math.min(G14.level * 2, 14)
  const { grid, target } = g14MakeGrid(diff)
  G14.grid = grid; G14.target = target
  G14.history = []; G14.hintCell = null; G14.peekActive = false
  G14.timeLeft = Math.max(20, 35 - G14.level)
  G14.timeFrac = 0
  clearInterval(g14Interval)
  const slowMul = [1, 0.8, 0.6, 0.4][G14.puLevels.slow] || 1
  g14Interval = setInterval(() => {
    if (!G14.active || G14.paused) return
    if (G14.hintTimer > 0) G14.hintTimer--
    G14.timeFrac += 0.1 * slowMul
    if (G14.timeFrac >= 1) { G14.timeFrac = 0; G14.timeLeft-- }
    if (G14.timeLeft <= 0) g14TimeUp()
    g14Render()
  }, 100)
  g14Render()
}

function g14LevelComplete() {
  SFX.win()
  const bonus = Math.ceil(G14.timeLeft * 5)
  G14.score += 100 + bonus
  G14.puCoins += 30 + G14.level * 5
  clearInterval(g14Interval)
  // Flash cells green briefly
  setTimeout(() => g14NextLevel(), 800)
}

function g14TimeUp() {
  SFX.error()
  clearInterval(g14Interval)
  G14.active = false
  endGame14()
}

function g14Render() {
  const container = document.getElementById('g14-grid')
  const tContainer = document.getElementById('g14-target')
  if (!container) return

  const stateLabel = v => v === 0 ? '|0⟩' : v === 1 ? '|1⟩' : '|+⟩'
  const stateColor = v => v === 0 ? '#60a5fa' : v === 1 ? '#f87171' : '#c084fc'

  // Main grid
  container.innerHTML = ''
  for (let r = 0; r < G14_ROWS; r++) {
    for (let c = 0; c < G14_COLS; c++) {
      const val = G14.grid[r][c]
      const isCursor = r === G14.cy && c === G14.cx
      const isHint = G14.hintCell && G14.hintCell.r === r && G14.hintCell.c === c && G14.hintTimer > 0
      const isWrong = val !== G14.target[r][c]
      const cell = document.createElement('div')
      cell.className = 'g14-cell'
      cell.style.borderColor = isCursor ? '#fbbf24' : isHint ? '#22d3ee' : isWrong ? '#ef444466' : '#374151'
      cell.style.color = stateColor(val)
      cell.style.background = isCursor ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.03)'
      cell.textContent = stateLabel(val)
      if (isCursor) cell.style.boxShadow = '0 0 0 2px #fbbf24'
      container.appendChild(cell)
    }
  }

  // Target grid (or peek)
  tContainer.innerHTML = ''
  const showTarget = G14.peekActive
  const tLabel = document.getElementById('g14-target-label')
  if (tLabel) tLabel.textContent = showTarget ? '👁️ Solution:' : 'Target:'
  for (let r = 0; r < G14_ROWS; r++) {
    for (let c = 0; c < G14_COLS; c++) {
      const val = showTarget ? G14.grid[r][c] : G14.target[r][c]
      const tval = G14.target[r][c]
      const cell = document.createElement('div')
      cell.className = 'g14-cell g14-target-cell'
      cell.style.color = stateColor(showTarget ? val : tval)
      cell.style.borderColor = showTarget ? '#22d3ee44' : '#37415166'
      cell.textContent = stateLabel(showTarget ? val : tval)
      tContainer.appendChild(cell)
    }
  }

  // HUD
  document.getElementById('g14-score-hud').textContent = G14.score
  document.getElementById('g14-level-hud').textContent = 'Level ' + G14.level
  document.getElementById('g14-time-hud').textContent  = G14.timeLeft + 's'
  document.getElementById('g14-coins-hud').textContent = '🪙 ' + G14.puCoins
  // Timer bar
  const bar = document.getElementById('g14-timer-bar')
  if (bar) {
    const pct = (G14.timeLeft / Math.max(20, 35 - G14.level)) * 100
    bar.style.width = pct + '%'
    bar.style.background = pct < 30 ? 'var(--danger)' : 'var(--accent)'
  }
  // Consumable counts
  document.getElementById('g14-hints-hud').textContent  = G14.extraHints  > 0 ? '💡×'+G14.extraHints  : ''
  document.getElementById('g14-times-hud').textContent  = G14.extraTimes  > 0 ? '⏱×'+G14.extraTimes  : ''
  document.getElementById('g14-peeks-hud').textContent  = G14.extraPeeks  > 0 ? '👁×'+G14.extraPeeks  : ''

  // Keys hint
  document.getElementById('g14-keys-hud').textContent = '[X] flip  [H] Hadamard  [M] Measure  [Z] Undo'
}

function g14TogglePause() {
  if (!G14.active) return
  G14.paused = !G14.paused
  const p = document.getElementById('g14-pause')
  if (G14.paused) { p.style.display = 'flex'; setTimeout(() => g14RenderPause(), 0) }
  else p.style.display = 'none'
}

function g14RenderPause() {
  const cont = document.getElementById('g14-pu-list')
  cont.innerHTML = ''
  document.getElementById('g14-pause-coins').textContent = '🪙 ' + G14.puCoins
  for (const key of G14_PU_KEYS) {
    const pu = G14_PU[key]
    const lvl = G14.puLevels[key]
    const tier = pu.tiers[pu.consumable ? 0 : Math.min(lvl, pu.tiers.length-1)]
    const maxed = !pu.consumable && lvl >= pu.tiers.length
    let stockStr = ''
    if (key === 'time')  stockStr = ` (×${G14.extraTimes})`
    if (key === 'hint')  stockStr = ` (×${G14.extraHints})`
    if (key === 'peek')  stockStr = ` (×${G14.extraPeeks})`
    const label = `${pu.icon} ${pu.name}${stockStr} ${maxed?'(MAX)':pu.consumable?'':`Lvl ${lvl}→${lvl+1}`}`
    const d = document.createElement('div')
    d.className = 'g14-pu-item'
    d.innerHTML = `<span>${label}</span><small style="color:var(--muted)">${maxed?'✓':tier.desc}</small><button class="btn-primary" style="font-size:.75rem;padding:.25rem .7rem" ${maxed||G14.puCoins<tier.cost?'disabled':''} onclick="g14BuyPU('${key}')">${maxed?'MAX':'🪙 '+tier.cost}</button>`
    cont.appendChild(d)
  }
}

window.g14BuyPU = function(key) {
  const pu = G14_PU[key]
  const lvl = G14.puLevels[key]
  if (!pu.consumable && lvl >= pu.tiers.length) return
  const tier = pu.tiers[pu.consumable ? 0 : lvl]
  if (G14.puCoins < tier.cost) return
  G14.puCoins -= tier.cost
  if (pu.consumable) {
    if (key === 'time') G14.extraTimes++
    if (key === 'hint') G14.extraHints++
    if (key === 'peek') G14.extraPeeks++
  } else {
    G14.puLevels[key]++
    if (key === 'undo') G14.maxHistory = [3,5,10,Infinity][G14.puLevels.undo] || 3
  }
  setTimeout(() => g14RenderPause(), 0)
}

function endGame14() {
  clearInterval(g14Interval)
  G14.active = false
  if (g14KD) document.removeEventListener('keydown', g14KD)
  window._g14Score = G14.score
  document.getElementById('g14-final-score').textContent = G14.score
  document.getElementById('g14-final-level').textContent = 'Reached level ' + G14.level
  renderMedalDisplay('g14-medal-display', 'wavecollapse', G14.score)
  document.getElementById('g14-over').classList.add('show')
}

window.g14EndGame = function() { document.getElementById('g14-pause').style.display='none'; G14.paused=false; endGame14() }

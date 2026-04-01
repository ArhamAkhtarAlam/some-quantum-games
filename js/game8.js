// ═══════════════════════════════════════════════════════
//  GAME 8 — TILE COLLAPSE
//  A grid of tiles each with a countdown bar. Click them
//  before they collapse. 3 lives. Score = tiles clicked.
// ═══════════════════════════════════════════════════════
const G8 = {
  active: false,
  score: 0,
  lives: 3,
  level: 1,
  tiles: [],  // { el, bar, timeout, interval, hue }
  spawnInterval: null,
}

function stopGame8() {
  clearInterval(G8.spawnInterval)
  G8.spawnInterval = null
  G8.tiles.forEach(t => {
    clearTimeout(t.timeout)
    clearInterval(t.barInterval)
  })
  G8.tiles = []
  G8.active = false
}
window.stopGame8 = stopGame8

async function initGame8() {
  stopGame8()
  G8.active = false; G8.score = 0; G8.lives = 3; G8.level = 1; G8.tiles = []
  document.getElementById('g8-over').classList.remove('show')
  document.getElementById('g8-score').textContent = '0'
  document.getElementById('g8-overlay').style.display = 'flex'
  document.getElementById('g8-grid').innerHTML = ''
  updateG8UI()
  await initCurby()
}

window.startTile = function() {
  document.getElementById('g8-overlay').style.display = 'none'
  G8.active = true
  scheduleG8Spawn()
}

function scheduleG8Spawn() {
  if (!G8.active) return
  clearInterval(G8.spawnInterval)
  const rate = Math.max(300, 1200 - G8.level * 80)
  G8.spawnInterval = setInterval(() => {
    if (!G8.active) return
    const grid = document.getElementById('g8-grid')
    if (grid.children.length < 16) spawnG8Tile()
  }, rate)
  spawnG8Tile()
}

function spawnG8Tile() {
  if (!G8.active) return
  const lifetime = Math.max(1000, 3500 - G8.level * 200)
  const hue = qRandInt(360)
  const icons = ['⬡','◈','⬟','◉','⬠','◆','⬡','◇']
  const icon = icons[qRandInt(icons.length)]

  const el = document.createElement('div')
  el.className = 'g8-tile'
  el.style.background = `hsl(${hue},70%,22%)`
  el.style.borderColor = `hsl(${hue},80%,50%)`
  el.style.boxShadow = `0 0 10px hsl(${hue},80%,40%)`
  el.style.color = `hsl(${hue},90%,75%)`

  const bar = document.createElement('div')
  bar.className = 'g8-tile-bar'
  bar.style.background = `hsl(${hue},80%,60%)`
  el.appendChild(bar)

  el.innerHTML += icon

  const spawnedAt = Date.now()

  const barInterval = setInterval(() => {
    if (!el.isConnected) { clearInterval(barInterval); return }
    const pct = Math.max(0, 1 - (Date.now() - spawnedAt) / lifetime)
    bar.style.transform = `scaleX(${pct})`
  }, 50)

  const timeout = setTimeout(() => {
    if (!G8.active || !el.isConnected) return
    collapseG8Tile(el, false)
  }, lifetime)

  el.addEventListener('click', () => {
    if (!G8.active) return
    collapseG8Tile(el, true)
  })

  document.getElementById('g8-grid').appendChild(el)
  G8.tiles.push({ el, barInterval, timeout, hue })
}

function collapseG8Tile(el, clicked) {
  const tileData = G8.tiles.find(t => t.el === el)
  if (!tileData) return
  clearTimeout(tileData.timeout)
  clearInterval(tileData.barInterval)
  G8.tiles = G8.tiles.filter(t => t.el !== el)

  if (clicked) {
    G8.score++
    document.getElementById('g8-score').textContent = G8.score
    // Level up every 15 tiles
    if (G8.score % 15 === 0) { G8.level++; scheduleG8Spawn() }
    el.style.background = 'rgba(34,197,94,.3)'
    el.style.borderColor = 'var(--success)'
    setTimeout(() => { if (el.isConnected) el.remove() }, 200)
  } else {
    // Tile collapsed — lose a life
    G8.lives--
    updateG8UI()
    el.classList.add('collapsing')
    setTimeout(() => { if (el.isConnected) el.remove() }, 300)
    if (G8.lives <= 0) { setTimeout(endGame8, 300); return }
  }
}

function updateG8UI() {
  document.getElementById('g8-lives').textContent = '❤️'.repeat(G8.lives) + '🖤'.repeat(Math.max(0, 3 - G8.lives))
  document.getElementById('g8-level').textContent = G8.level
}

function endGame8() {
  stopGame8()
  window._g8Score = G8.score
  document.getElementById('g8-grid').innerHTML = ''
  document.getElementById('g8-final-score').textContent = G8.score
  document.getElementById('g8-over-stats').textContent = `${G8.score} tiles clicked · Reached level ${G8.level}`
  renderMedalDisplay('g8-medal-display', 'tiles', G8.score)
  document.getElementById('g8-over').classList.add('show')
}

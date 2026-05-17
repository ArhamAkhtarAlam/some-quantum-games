// ═══════════════════════════════════════════════════════
//  GAME 37 — QUANTUM RHYTHM  (ADOFAI-inspired)
//  Endless quantum-generated path. Press SPACE / click
//  when the planet aligns with the gold ring on the next tile.
//  Speed ramps from half-beat to full 120 BPM over 60 tiles.
// ═══════════════════════════════════════════════════════

const G37_COLORS = ['#f472b6','#c084fc','#818cf8','#60a5fa','#34d399','#fbbf24','#fb7185','#a78bfa','#38bdf8','#4ade80']
const G37_ORBITR  = 32     // orbit radius (px)
const G37_TILE_D  = 90     // distance between tiles (world px)
const G37_PERF    = 0.22   // ±perfect window (rad ≈ 12.6°)
const G37_GOOD    = 0.52   // ±good window (rad ≈ 29.8°)
const G37_AUTO    = 0.68   // auto-miss margin past exit angle
const G37_SPD0    = Math.PI        // starting speed: 60 BPM timing
const G37_SPD_MAX = Math.PI * 2    // max speed: 120 BPM timing
const G37_BPM     = 120
const G37_BL      = 60 / G37_BPM  // beat length in seconds (0.5 s)

let G37 = {
  active: false,
  tiles: [], headings: [], genHeading: 0,
  orbitTile: 0, dir: 1,
  arcStart: 0, arcEnd: 0, arcLen: 0, arcT: 0,
  speed: G37_SPD0,
  health: 3, score: 0, combo: 0, tilesCompleted: 0,
  hits: [], feedback: '', fbColor: '#fff', fbTimer: 0,
  trail: [],
  shake: 0,
  camX: 0, camY: 0,
  flashIdx: -1, flashT: 0,
  raf: null, lastTime: 0,
}
window._g37Score = 0

// ── audio ──────────────────────────────────────────────

let _g37AC   = null
let _g37Sched = null
let _g37NextBeat = 0
let _g37BeatIdx  = 0

function _g37GetAC() {
  if (!_g37AC) _g37AC = new (window.AudioContext || window.webkitAudioContext)()
  return _g37AC
}

function _g37Kick(t, vol = 0.65) {
  const ac = _g37GetAC(), g = ac.createGain(), o = ac.createOscillator()
  o.frequency.setValueAtTime(160, t)
  o.frequency.exponentialRampToValueAtTime(36, t + 0.13)
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.30)
  o.connect(g); g.connect(ac.destination)
  o.start(t); o.stop(t + 0.32)
}

function _g37Snare(t, vol = 0.38) {
  const ac = _g37GetAC()
  const len = Math.floor(ac.sampleRate * 0.11)
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const d   = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / len * 2.4)
  const src = ac.createBufferSource(); src.buffer = buf
  const g   = ac.createGain()
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.13)
  src.connect(g); g.connect(ac.destination); src.start(t); src.stop(t + 0.15)
  // body tone
  const o2 = ac.createOscillator(), g2 = ac.createGain()
  o2.frequency.setValueAtTime(190, t); o2.frequency.exponentialRampToValueAtTime(90, t + 0.05)
  g2.gain.setValueAtTime(vol * 0.35, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.07)
  o2.connect(g2); g2.connect(ac.destination); o2.start(t); o2.stop(t + 0.09)
}

function _g37Hat(t, vol = 0.18, dur = 0.032) {
  const ac = _g37GetAC()
  const len = Math.floor(ac.sampleRate * dur)
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const d   = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  const src = ac.createBufferSource(); src.buffer = buf
  const flt = ac.createBiquadFilter(); flt.type = 'highpass'; flt.frequency.value = 7500
  const g   = ac.createGain()
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.connect(flt); flt.connect(g); g.connect(ac.destination); src.start(t); src.stop(t + dur + 0.01)
}

function _g37Ding(t, freq = 880, vol = 0.22) {
  const ac = _g37GetAC(), o = ac.createOscillator(), g = ac.createGain()
  o.frequency.setValueAtTime(freq, t)
  o.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.12)
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
  o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.2)
}

// 16-step drum pattern (each step = 1 sixteenth note = G37_BL/4 sec)
// K=kick  S=snare  H=hihat(closed)  O=hihat(open)
const _g37Pat = [
  {k:1      }, // 1
  {         }, // e
  {     h:1 }, // +
  {         }, // a
  {         }, // 2
  {     h:1 }, // e
  {         }, // +
  {         }, // a
  {k:1      }, // 3
  {  s:1    }, // e  (snare on the "e" of 3)
  {     h:1 }, // +
  {         }, // a
  {         }, // 4
  {     h:1 }, // e
  {         }, // +
  {     h:1, o:1 }, // a  (open hat)
]

function _g37SchedBeats() {
  if (!G37.active) return
  const ac = _g37GetAC()
  const step = G37_BL / 4
  while (_g37NextBeat < ac.currentTime + 0.28) {
    const p = _g37Pat[_g37BeatIdx % _g37Pat.length]
    if (p.k) _g37Kick(_g37NextBeat)
    if (p.s) _g37Snare(_g37NextBeat)
    if (p.h) _g37Hat(_g37NextBeat, p.o ? 0.22 : 0.16, p.o ? 0.10 : 0.032)
    _g37NextBeat += step
    _g37BeatIdx++
  }
  _g37Sched = setTimeout(_g37SchedBeats, 25)
}

function _g37StartAudio() {
  const ac = _g37GetAC(); ac.resume()
  _g37NextBeat = ac.currentTime + 0.06
  _g37BeatIdx  = 0
  _g37SchedBeats()
}

function _g37StopAudio() {
  if (_g37Sched) { clearTimeout(_g37Sched); _g37Sched = null }
}

// ── tile generation ────────────────────────────────────

function _g37GenTiles(count) {
  const diff = Math.min(1, G37.tilesCompleted / 60)
  for (let k = 0; k < count; k++) {
    const n    = G37.tiles.length
    const last = G37.tiles[n - 1]
    let opts
    if (diff < 0.25)      opts = [0, 0, 0, -90, 90]
    else if (diff < 0.55) opts = [0, 0, -90, 90, -45, 45]
    else                  opts = [0, -90, 90, -90, 90, -45, 45]
    const turn = opts[qRandInt(opts.length)]
    G37.genHeading = ((G37.genHeading + turn * Math.PI / 180) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
    G37.tiles.push({
      x: last.x + G37_TILE_D * Math.cos(G37.genHeading),
      y: last.y + G37_TILE_D * Math.sin(G37.genHeading),
    })
    G37.headings.push(G37.genHeading)
  }
}

// ── arc mechanics ──────────────────────────────────────

function _g37ArcLen(from, to, dir) {
  let d = ((to - from) * dir % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
  return d < 0.001 ? Math.PI * 2 : d
}

function _g37StartTile(i) {
  G37.orbitTile = i
  G37.arcT = 0
  let arcStart = i === 0
    ? G37.headings[0] + Math.PI
    : G37.headings[i - 1] + Math.PI
  arcStart = ((arcStart % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  G37.arcStart = arcStart
  if (i >= G37.headings.length) { G37.arcEnd = arcStart; G37.arcLen = 0; G37.dir = 1; return }
  const arcEnd = ((G37.headings[i] % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  G37.arcEnd = arcEnd
  const cw = _g37ArcLen(arcStart, arcEnd, +1), ccw = _g37ArcLen(arcStart, arcEnd, -1)
  if (cw <= ccw) { G37.dir = +1; G37.arcLen = cw } else { G37.dir = -1; G37.arcLen = ccw }
}

// ── lifecycle ──────────────────────────────────────────

function stopGame37() {
  G37.active = false
  _g37StopAudio()
  if (G37.raf) { cancelAnimationFrame(G37.raf); G37.raf = null }
  document.removeEventListener('keydown', _g37Key)
  const c = document.getElementById('g37-canvas')
  if (c) c.onclick = null
}
window.stopGame37 = stopGame37

window.initGame37 = async function() {
  stopGame37()
  G37 = {
    active: false, tiles: [], headings: [], genHeading: 0,
    orbitTile: 0, dir: 1, arcStart: 0, arcEnd: 0, arcLen: 0, arcT: 0,
    speed: G37_SPD0, health: 3, score: 0, combo: 0, tilesCompleted: 0,
    hits: [], feedback: '', fbColor: '#fff', fbTimer: 0,
    trail: [], shake: 0, camX: 0, camY: 0, flashIdx: -1, flashT: 0,
    raf: null, lastTime: 0,
  }
  window._g37Score = 0
  document.getElementById('g37-score-hud').textContent = '—'
  document.getElementById('g37-over').classList.remove('show')
  document.getElementById('g37-overlay').style.display = 'flex'
  await initCurby()
}

window.startRhythm = function() {
  SFX.resume(); SFX.click()
  const c = document.getElementById('g37-canvas')
  c.width  = c.parentElement.clientWidth
  c.height = c.parentElement.clientHeight
  document.getElementById('g37-overlay').style.display = 'none'

  const W = c.width, H = c.height
  G37.tiles      = [{ x: W / 2, y: H * 0.58 }]
  G37.headings   = []
  G37.genHeading = 0
  G37.camX = W / 2; G37.camY = H * 0.58
  _g37GenTiles(35)
  _g37StartTile(0)
  G37.active = true

  c.onclick = _g37Press
  document.addEventListener('keydown', _g37Key)
  _g37StartAudio()
  G37.lastTime = performance.now()
  G37.raf = requestAnimationFrame(_g37Loop)
}

function _g37Key(e) {
  if (!document.getElementById('game37').classList.contains('active')) return
  if (e.code === 'Space') { e.preventDefault(); _g37Press() }
}

// ── hit logic ──────────────────────────────────────────

function _g37Press() {
  if (!G37.active) return
  const diff = Math.abs(G37.arcLen - G37.arcT)
  _g37ApplyResult(diff < G37_PERF ? 'perfect' : diff < G37_GOOD ? 'good' : 'miss')
}

function _g37ApplyResult(rating) {
  G37.hits.push(rating)
  G37.feedback = rating
  G37.fbTimer  = 0.65

  if (rating === 'miss') {
    G37.combo   = 0
    G37.health--
    G37.shake   = 0.38
    G37.fbColor = '#f87171'
    if (_g37AC) _g37Snare(_g37AC.currentTime, 0.55)
    if (G37.health <= 0) { setTimeout(_g37EndGame, 380); return }
  } else {
    G37.combo++
    const mul = Math.min(4, Math.floor(G37.combo / 8) + 1)
    G37.score += (rating === 'perfect' ? 100 : 50) * mul
    G37.tilesCompleted++
    G37.fbColor = rating === 'perfect' ? '#fbbf24' : '#4ade80'
    if (rating === 'perfect') {
      G37.flashIdx = G37.orbitTile
      G37.flashT   = 0.28
      if (_g37AC) _g37Ding(_g37AC.currentTime, 880 + (G37.tilesCompleted % 8) * 110, 0.22)
    }
    document.getElementById('g37-score-hud').textContent = G37.score.toLocaleString()
    // speed ramp: 60→120 BPM over first 60 tiles
    G37.speed = G37_SPD0 + (G37_SPD_MAX - G37_SPD0) * Math.min(1, G37.tilesCompleted / 60)
  }

  if (G37.tiles.length - G37.orbitTile < 25) _g37GenTiles(25)
  _g37StartTile(G37.orbitTile + 1)
}

// ── loop ───────────────────────────────────────────────

function _g37Loop(ts) {
  if (!G37.active) return
  const dt = Math.min((ts - G37.lastTime) / 1000, 0.05)
  G37.lastTime = ts

  G37.fbTimer = Math.max(0, G37.fbTimer - dt)
  G37.shake   = Math.max(0, G37.shake   - dt * 3.5)
  G37.flashT  = Math.max(0, G37.flashT  - dt * 3.5)

  G37.arcT += G37.speed * dt
  if (G37.arcT > G37.arcLen + G37_AUTO) _g37ApplyResult('miss')

  // Planet world pos
  const angle = ((G37.arcStart + G37.arcT * G37.dir) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
  const ct = G37.tiles[G37.orbitTile]
  const px = ct.x + G37_ORBITR * Math.cos(angle)
  const py = ct.y + G37_ORBITR * Math.sin(angle)

  G37.trail.push({ x: px, y: py })
  if (G37.trail.length > 55) G37.trail.shift()

  // Camera: smooth follow, biased toward upcoming tiles
  const ahead = Math.min(G37.orbitTile + 4, G37.tiles.length - 1)
  G37.camX += (G37.tiles[ahead].x - G37.camX) * 0.07
  G37.camY += (G37.tiles[ahead].y - G37.camY) * 0.07

  _g37Draw(px, py)
  G37.raf = requestAnimationFrame(_g37Loop)
}

// ── draw ───────────────────────────────────────────────

function _g37Draw(px, py) {
  const c   = document.getElementById('g37-canvas')
  const ctx = c.getContext('2d')
  const W = c.width, H = c.height

  ctx.fillStyle = '#05050d'
  ctx.fillRect(0, 0, W, H)

  const shk = G37.shake
  const sx = shk > 0 ? (Math.random() - .5) * shk * 14 : 0
  const sy = shk > 0 ? (Math.random() - .5) * shk * 14 : 0
  const toX = wx => (wx - G37.camX) + W / 2 + sx
  const toY = wy => (wy - G37.camY) + H / 2 + sy

  const oi    = G37.orbitTile
  const tiles = G37.tiles
  const n     = tiles.length
  const vS    = Math.max(0, oi - 6)
  const vE    = Math.min(n - 1, oi + 24)
  const now   = Date.now()

  // ── path lines ──
  for (let i = vS; i < vE; i++) {
    const done = i < oi
    const col  = _g37TileColor(i)
    ctx.strokeStyle = done
      ? `rgba(79,70,229,0.55)`
      : i === oi
        ? `rgba(255,255,255,0.25)`
        : `rgba(255,255,255,0.10)`
    ctx.lineWidth = done ? 2 : 1.5
    ctx.beginPath()
    ctx.moveTo(toX(tiles[i].x),   toY(tiles[i].y))
    ctx.lineTo(toX(tiles[i+1].x), toY(tiles[i+1].y))
    ctx.stroke()
  }

  // ── orbit ghost ring ──
  if (oi < n) {
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(toX(tiles[oi].x), toY(tiles[oi].y), G37_ORBITR, 0, Math.PI * 2); ctx.stroke()
  }

  // ── tiles (rotating diamonds) ──
  for (let i = vS; i <= vE && i < n; i++) {
    const tx = toX(tiles[i].x), ty = toY(tiles[i].y)
    const isCur  = i === oi
    const isDone = i < oi
    const isNext = i === oi + 1
    const col    = _g37TileColor(i)
    const sz     = isCur ? 11 : isNext ? 9 : isDone ? 4 : 7
    const rot    = now * 0.001 * (isCur ? 1.5 : 0.4) * (i % 2 ? 1 : -1)

    let flash = 0
    if (i === G37.flashIdx && G37.flashT > 0) flash = G37.flashT / 0.28

    ctx.save()
    ctx.translate(tx, ty)
    ctx.rotate(Math.PI / 4 + rot)

    if (flash > 0) {
      ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 40 * flash
    } else {
      ctx.shadowColor = col
      ctx.shadowBlur = isCur ? 22 : isNext ? 10 : 0
    }
    ctx.globalAlpha = isDone ? 0.4 : 1
    ctx.fillStyle = isDone ? '#3730a3' : col

    // outer diamond
    ctx.fillRect(-sz, -sz, sz * 2, sz * 2)

    // inner highlight for current tile
    if (isCur) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      ctx.fillRect(-sz * 0.42, -sz * 0.42, sz * 0.84, sz * 0.84)
    }
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${flash * 0.6})`
      ctx.fillRect(-sz * 1.4, -sz * 1.4, sz * 2.8, sz * 2.8)
    }

    ctx.restore()
    ctx.shadowBlur = 0; ctx.globalAlpha = 1
  }

  // ── target indicator (pulsing gold ring) ──
  if (oi < n - 1) {
    const pulse = 0.55 + Math.sin(now / 120) * 0.45
    const ex = toX(tiles[oi].x + G37_ORBITR * Math.cos(G37.arcEnd))
    const ey = toY(tiles[oi].y + G37_ORBITR * Math.sin(G37.arcEnd))
    ctx.strokeStyle = `rgba(251,191,36,${pulse * 0.9})`
    ctx.lineWidth = 2.5
    ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 12 * pulse
    ctx.beginPath(); ctx.arc(ex, ey, 6, 0, Math.PI * 2); ctx.stroke()
    ctx.shadowBlur = 0
  }

  // ── trail ──
  const tcol = _g37TileColor(oi)
  ctx.lineCap = 'round'
  for (let i = 1; i < G37.trail.length; i++) {
    const a  = i / G37.trail.length
    const tx1 = toX(G37.trail[i-1].x), ty1 = toY(G37.trail[i-1].y)
    const tx2 = toX(G37.trail[i].x),   ty2 = toY(G37.trail[i].y)
    ctx.globalAlpha = a * a * 0.75
    ctx.strokeStyle = tcol
    ctx.lineWidth = 1.5 + a * 3.5
    ctx.beginPath(); ctx.moveTo(tx1, ty1); ctx.lineTo(tx2, ty2); ctx.stroke()
  }
  ctx.globalAlpha = 1

  // ── planet ──
  if (oi < n) {
    const spx = toX(px), spy = toY(py)
    // outer glow ring
    ctx.fillStyle = tcol
    ctx.shadowColor = tcol; ctx.shadowBlur = 22
    ctx.beginPath(); ctx.arc(spx, spy, 9, 0, Math.PI * 2); ctx.fill()
    // white core
    ctx.fillStyle = '#ffffff'
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 10
    ctx.beginPath(); ctx.arc(spx, spy, 5.5, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0
  }

  // ── HUD ──
  for (let i = 0; i < 3; i++) {
    const alive = i < G37.health
    ctx.fillStyle = alive ? '#f472b6' : 'rgba(255,255,255,0.1)'
    ctx.shadowColor = '#f472b6'; ctx.shadowBlur = alive ? 9 : 0
    ctx.font = '18px sans-serif'; ctx.textAlign = 'left'
    ctx.fillText('♥', 10 + i * 24, 28)
  }
  ctx.shadowBlur = 0

  ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'right'
  ctx.fillText(G37.score.toLocaleString() + ' pts', W - 10, 25)

  if (G37.combo >= 5) {
    const mul = Math.min(4, Math.floor(G37.combo / 8) + 1)
    ctx.fillStyle = mul >= 4 ? '#fbbf24' : mul >= 3 ? '#f472b6' : '#c084fc'
    ctx.font = `bold ${mul >= 3 ? 13 : 11}px monospace`
    ctx.fillText(`${G37.combo}× COMBO${mul > 1 ? ' ×'+mul : ''}`, W - 10, 44)
  }

  // speed indicator (fills as game speeds up)
  const spd = (G37.speed - G37_SPD0) / (G37_SPD_MAX - G37_SPD0)
  if (spd > 0) {
    const barW = 80, barH = 4
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.fillRect(W/2 - barW/2, 8, barW, barH)
    ctx.fillStyle = tcol
    ctx.shadowColor = tcol; ctx.shadowBlur = 6
    ctx.fillRect(W/2 - barW/2, 8, barW * spd, barH)
    ctx.shadowBlur = 0
  }

  if (G37.fbTimer > 0) {
    const a   = G37.fbTimer / 0.65
    const txt = G37.feedback === 'perfect' ? 'PERFECT!'
              : G37.feedback === 'good'    ? 'GOOD'
              : 'MISS'
    ctx.globalAlpha = a
    ctx.fillStyle = G37.fbColor
    ctx.font = `bold ${G37.feedback === 'perfect' ? 28 : 22}px monospace`
    ctx.textAlign = 'center'
    ctx.shadowColor = G37.fbColor; ctx.shadowBlur = 16
    ctx.fillText(txt, W / 2, H * 0.17 - (1 - a) * 18)
    ctx.shadowBlur = 0; ctx.globalAlpha = 1
  }

  ctx.textAlign = 'left'
}

function _g37TileColor(i) { return G37_COLORS[i % G37_COLORS.length] }

function _g37EndGame() {
  stopGame37()
  const p = G37.hits.filter(h => h === 'perfect').length
  const g = G37.hits.filter(h => h === 'good').length
  const m = G37.hits.filter(h => h === 'miss').length
  const acc = G37.hits.length > 0 ? Math.round((p + g * 0.5) / G37.hits.length * 100) : 0
  window._g37Score = G37.score
  document.getElementById('g37-final-score').textContent = G37.score.toLocaleString() + ' pts'
  document.getElementById('g37-over-stats').textContent  =
    `${G37.tilesCompleted} tiles · ${acc}% acc · ${p}× Perfect  ${g}× Good  ${m}× Miss`
  renderMedalDisplay('g37-medal-display', 'rhythm', G37.score)
  document.getElementById('g37-over').classList.add('show')
  SFX.win?.()
}

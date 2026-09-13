// ═══════════════════════════════════════════════════════
//  LEVEL CHECKER
//  Answers the questions you actually want answered about a
//  submitted level: can it be cleared at all, how much room
//  for error is there, and is anything about it unfair
//  (frame-rate dependent, unreachable, sub-frame detail).
//
//  The clearability answer is exhaustive, not a heuristic:
//  it tracks every wave position reachable by any sequence
//  of hold/release choices, frame by frame. If the set ever
//  empties, no human input could have survived either.
// ═══════════════════════════════════════════════════════

const LC_WAVE  = 255     // wave climb/fall speed, px/sec
const LC_R     = 7       // wave radius
const LC_FPS   = 60
const LC_DT    = 1 / LC_FPS
const LC_FRAME = LC_WAVE * LC_DT      // px of travel in one frame
const LC_QUANT = 8                    // positions per px when searching
// Wave Gauntlet runs its simulation on this fixed step (G43_SIM_DT), so the
// solver models the same clock the game actually uses. Before the game was
// fixed-stepped, this had to guess at 60Hz and the verdict on a fast level
// turned on the guess: ULTRASONIC came out unclearable at 59, 60 and 61Hz —
// each dying at a different column — yet clear at 75Hz and above.
const LC_SIM_DT = 1 / 240

const LC_HEIGHTS = [360, 400, 460, 520, 600, 700, 800]

// ── Corridor sampling ─────────────────────────────────

function lcWallAt(kfs, col, h) {
  if (!kfs.length) return { cy: h/2, gapH: h*0.6 }
  const k = kfs.map(f => ({ at:f.at, cy:(f.cf ?? 0.5)*h, gapH:(f.gapHf ?? 0.4)*h }))
  if (col <= k[0].at) return k[0]
  const last = k[k.length-1]
  if (col >= last.at) return last
  for (let i = 1; i < k.length; i++) {
    if (col > k[i].at) continue
    const span = k[i].at - k[i-1].at
    const t = span > 0 ? (col - k[i-1].at) / span : 1
    return {
      cy:   k[i-1].cy   + (k[i].cy   - k[i-1].cy)   * t,
      gapH: k[i-1].gapH + (k[i].gapH - k[i-1].gapH) * t,
    }
  }
  return last
}

// Every position reachable by any hold/release sequence, frame by frame.
// Returns the narrowest surviving band — the real margin for error.
function lcSolveWave(lv, h, dt) {
  const DT = dt || LC_DT
  const kfs = lv.keyframes || []
  const speed = lv.speed || 200
  const clear = lv.clearAt || 800
  // Quantise onto a grid that divides the wave's step exactly. With the old
  // fixed 1/8px grid a step was 8.5 units, and Math.round sends .5 toward
  // +infinity — which is downward — so every up/down pair sank 0.125px and a
  // spamming line drifted to the floor. On this grid a move is exactly ±4
  // units and there is no rounding to accumulate.
  const GQ = (LC_WAVE * DT) / 4
  let states = new Set([Math.round(h/2 / GQ)])
  let scroll = 0, frame = 0
  let worst = Infinity, worstCol = 0

  while (scroll < clear) {
    const next = new Set()
    const { cy, gapH } = lcWallAt(kfs, scroll, h)
    // Match the game: the wave is clamped to the screen and tested against
    // the real corridor. Clamping the walls instead made the screen edge
    // lethal, which killed players on open corridor above y=0.
    const top = cy - gapH/2, bot = cy + gapH/2
    for (const q of states) {
      const y = q * GQ
      for (const up of [true, false]) {
        let ny = y + (up ? -LC_WAVE : LC_WAVE) * DT
        ny = Math.max(LC_R + 2, Math.min(h - LC_R - 2, ny))
        if (ny - LC_R < top || ny + LC_R > bot) continue
        next.add(Math.round(ny / GQ))
      }
    }
    if (next.size === 0) return { ok:false, diedAt:Math.round(scroll), frame }
    // Skip the opening frames: the spread there is just branching, not difficulty
    if (frame > 8) {
      const ys = [...next].map(q => q * GQ)
      const span = Math.max(...ys) - Math.min(...ys)
      if (span < worst) { worst = span; worstCol = Math.round(scroll) }
    }
    states = next
    scroll += speed * DT
    frame++
  }
  return { ok:true, band:worst === Infinity ? 0 : worst, atCol:worstCol, frames:frame }
}

// The actual inputs of an ideal run — not just whether one exists.
// Same exhaustive search as lcSolveWave, but keeping a parent pointer per
// state so the winning line can be walked back. Prefers the fewest presses,
// which is what a clean line looks like rather than a jittery one.
// `margin` shrinks the corridor while solving, so the line keeps clearance
// instead of grazing the walls. Replaying a discrete plan against
// continuous physics never lands exactly where the solver predicted —
// positions are quantised to 1/8px, and with variable frame times an
// input switch can land up to a frame late (4.25px). Without margin a
// long level accumulates that and eventually clips a wall.
function lcSolveLine(lv, h, margin, dt, worst) {
  const pad = margin || 0
  const DT = dt || LC_DT
  const kfs = lv.keyframes || []
  const speed = lv.speed || 200
  const clear = lv.clearAt || 800
  // Same exact-divisor grid as lcSolveWave — see the note there
  const GQ = (LC_WAVE * DT) / 4
  const start = Math.round(h / 2 / GQ)

  // layers[f] : Map(stateKey -> { prev, hold, taps })
  const layers = []
  let cur = new Map([[start + ':0', { prev: null, hold: false, taps: 0 }]])
  let scroll = 0, frame = 0

  while (scroll < clear) {
    // The game moves the wave, advances the scroll, and only then tests
    // the wall at the new column. Checking at the old column instead put
    // the solved line one frame out of step and it died on its own plan.
    const at = scroll + speed * DT
    const { cy, gapH } = lcWallAt(kfs, Math.floor(at), h)
    // Same as the game: real corridor, wave clamped to the screen
    const top = cy - gapH / 2 + pad
    const bot = cy + gapH / 2 - pad
    const next = new Map()
    for (const [key, node] of cur) {
      const [q, last] = key.split(':')
      const y = +q * GQ
      for (const hold of [true, false]) {
        let ny = y + (hold ? -LC_WAVE : LC_WAVE) * DT
        ny = Math.max(LC_R + 2, Math.min(h - LC_R - 2, ny))
        if (ny - LC_R < top || ny + LC_R > bot) continue
        const nk = Math.round(ny / GQ) + ':' + (hold ? '1' : '0')
        const taps = node.taps + ((hold && last === '0') ? 1 : 0)
        const seen = next.get(nk)
        // `worst` is evilbot: same line, but wring every extra press out of it
        const better = !seen || (worst ? seen.taps < taps : seen.taps > taps)
        if (better) next.set(nk, { prev: key, hold, taps })
      }
    }
    if (next.size === 0) return { ok: false, diedAt: Math.round(scroll), frame }
    layers.push(next)
    cur = next
    scroll += speed * DT
    frame++
  }

  // Walk back from the cheapest surviving end state
  let bestKey = null, bestTaps = worst ? -Infinity : Infinity
  for (const [k, n] of cur) {
    if (worst ? n.taps > bestTaps : n.taps < bestTaps) { bestTaps = n.taps; bestKey = k }
  }
  const holds = new Array(layers.length)
  const ys    = new Array(layers.length)   // the height the line sits at
  let key = bestKey
  for (let f = layers.length - 1; f >= 0; f--) {
    const node = layers[f].get(key)
    holds[f] = node.hold
    ys[f]    = +key.split(':')[0] * GQ
    key = node.prev
  }
  return { ok: true, holds, ys, frames: holds.length, taps: bestTaps, margin: pad, dt: DT }
}

// Prefer a line with room to spare; fall back to tighter ones, and finally
// to an exact line, so a level that only just works still gets a bot.
// `dt` should be the frame time the game is actually running at. Planning
// in 1/60s steps and replaying at 120Hz puts the plan and the game on
// different grids, which is fatal on a level with no margin to absorb it.
// Fly the plan the way the bot actually flies it and see whether it lives.
// The solver returns a path with a known clearance, but the bot does not
// follow that path exactly — it chases it with a hold/release controller,
// and the tracking error is not bounded by the clearance. On THE SAW that
// gap was fatal: a valid plan with 3px of margin died at column 189.
function _lcReplayOk(lv, h, plan) {
  const kfs   = lv.keyframes || []
  const speed = lv.speed || 200
  const clear = lv.clearAt || 800
  const DT    = plan.dt
  const step  = speed * DT
  const ys    = plan.ys
  if (!ys || !ys.length || step <= 0) return false
  let wy = h / 2, scroll = 0, guard = 0
  while (scroll < clear && guard++ < 400000) {
    const i = Math.min(ys.length - 1, Math.max(0, Math.round(scroll / step)))
    wy += (wy > ys[i] ? -LC_WAVE : LC_WAVE) * DT
    wy = Math.max(LC_R + 2, Math.min(h - LC_R - 2, wy))   // same clamp as the game
    scroll += step
    const { cy, gapH } = lcWallAt(kfs, Math.floor(scroll), h)
    if (wy - LC_R < cy - gapH / 2 || wy + LC_R > cy + gapH / 2) return false
  }
  return true
}

function lcSolveLineSafe(lv, h, dt, worst) {
  // A finer ladder than before, because the first plan that solves is not
  // necessarily one the controller can hold — more rungs means more chances
  // to find one that both solves and survives.
  for (const pad of [10, 8, 6, 4.5, 3, 2, 1.5, 1, 0.5, 0]) {
    const r = lcSolveLine(lv, h, pad, dt, worst)
    if (r.ok && _lcReplayOk(lv, h, r)) return r
  }
  // Better no bot than a bot that flies into a wall
  return { ok: false }
}

// Spider: alternating blocks, so each surface switch needs flip time
function lcCheckSpider(lv) {
  const obs = [...(lv.obstacles || [])].sort((a,b) => a.col - b.col)
  const speed = lv.speed || 200
  const problems = [], warnings = []
  let tightest = Infinity

  for (let i = 1; i < obs.length; i++) {
    const cols = obs[i].col - obs[i-1].col
    const secs = cols / speed
    if (cols === 0) problems.push(`Two blocks stacked at column ${obs[i].col}.`)
    if (obs[i].floor !== obs[i-1].floor) {
      tightest = Math.min(tightest, secs)
      if (secs < 0.10) problems.push(`Blocks at ${obs[i-1].col}→${obs[i].col}: only ${(secs*1000).toFixed(0)}ms to flip. Not humanly possible.`)
      else if (secs < 0.16) warnings.push(`Blocks at ${obs[i-1].col}→${obs[i].col}: ${(secs*1000).toFixed(0)}ms to flip — near the limit.`)
    }
  }
  if (obs.length && obs[0].floor) {
    const secs = obs[0].col / speed
    if (secs < 0.5) problems.push(`First block is on the FLOOR where the spider spawns and arrives in ${secs.toFixed(2)}s.`)
  }
  return {
    ok: problems.length === 0, problems, warnings,
    tightestFlipMs: tightest === Infinity ? null : Math.round(tightest * 1000),
    blocks: obs.length,
  }
}

// ── Full report ───────────────────────────────────────

function lcLabel(frames) {
  if (frames < 1)   return { text:'frame-perfect', cls:'bad'  }
  if (frames < 2.5) return { text:'very tight',    cls:'warn' }
  if (frames < 5)   return { text:'tight',         cls:'ok'   }
  return { text:'comfortable', cls:'good' }
}

function lcReport(lv) {
  const game = lv.game || (lv.keyframes ? 'wavegauntlet' : 'spider')
  const speed = lv.speed || 200
  const r = {
    game, name: lv.name || '(unnamed)', diff: lv.diff || '?', speed,
    clearAt: lv.clearAt || 0,
    problems: [], warnings: [], heights: [],
  }

  // Structural checks both games share
  if (!lv.name) r.warnings.push('No name — it will show as blank on the announce screen.')
  if (speed <= 0) r.problems.push('Speed must be above zero.')

  if (game === 'spider') {
    const s = lcCheckSpider(lv)
    r.problems.push(...s.problems)
    r.warnings.push(...s.warnings)
    r.blocks = s.blocks
    r.tightestFlipMs = s.tightestFlipMs
    r.clearable = s.ok
    return r
  }

  const kfs = lv.keyframes || []
  if (kfs.length < 2) r.problems.push('Needs at least two keyframes.')
  for (let i = 1; i < kfs.length; i++) {
    if (kfs[i].at < kfs[i-1].at) r.problems.push(`Keyframe ${i+1} sits before the previous one.`)
    if (kfs[i].at === kfs[i-1].at) r.warnings.push(`Two keyframes share column ${kfs[i].at} — the first is ignored.`)
  }
  const past = kfs.filter(k => k.at > r.clearAt).length
  if (past) r.warnings.push(`${past} keyframe(s) sit past the finish at ${r.clearAt} and never render.`)
  if (kfs.length && kfs[kfs.length-1].at < r.clearAt) {
    r.warnings.push(`Last keyframe is at ${kfs[kfs.length-1].at} but the level runs to ${r.clearAt} — the corridor holds its final shape for the rest.`)
  }

  // Corridor outside the canvas is invisible, and the wave can reach it
  let offscreen = 0
  for (let c = 0; c <= r.clearAt; c += 5) {
    const wl = lcWallAt(kfs, c, 500)
    if (wl.cy - wl.gapH / 2 < 0 || wl.cy + wl.gapH / 2 > 500) offscreen += 5
  }
  if (offscreen) {
    r.warnings.push(`Corridor sits outside the visible screen for ${offscreen} of ${r.clearAt} columns — those walls can't be seen, though the game now bounds the corridor to the screen.`)
  }

  // Speed feel: how much of the level a player can actually see and react to
  r.colsPerFrame = speed * LC_DT
  r.lookahead    = 900 / speed          // seconds of level visible on a 900px arena
  if (r.colsPerFrame > 10) {
    r.warnings.push(`Scrolls ${(speed * LC_SIM_DT).toFixed(0)} columns per simulation step — detail finer than that is skipped entirely, so very narrow features here are decoration rather than obstacles.`)
  }
  if (r.lookahead < 0.35) {
    r.warnings.push(`Only ${r.lookahead.toFixed(2)}s of warning, below human reaction time — this has to be memorised rather than read.`)
  }

  // Exhaustive clearability across a range of window sizes.
  // The solver walks the level one 60Hz frame at a time, so it only tests
  // the columns that stepping happens to land on. That is fine at normal
  // speeds, but a level scrolling 167 columns a frame is sampled less than
  // 1 column in 100, and the verdict then turns on the sampling phase
  // rather than the level: ULTRASONIC came out unclearable at 59, 60 and
  // 61Hz — each dying at a different column — yet clear at 75Hz and above.
  // So on fast levels, re-test at several refresh rates and only call it
  // unclearable when no rate survives.
  let anyFail = false
  for (const h of LC_HEIGHTS) {
    const s = lcSolveWave(lv, h, LC_SIM_DT)
    if (!s.ok) { anyFail = true; r.heights.push({ h, ok:false, diedAt:s.diedAt }) }
    else {
      const frames = s.band / LC_FRAME
      r.heights.push({ h, ok:true, band:s.band, frames, atCol:s.atCol, label:lcLabel(frames) })
    }
  }
  const good = r.heights.filter(x => x.ok)
  r.clearable = good.length > 0
  if (!good.length) r.problems.push('Impossible at every window size tested — no sequence of inputs survives.')
  else if (anyFail) {
    const bad = r.heights.filter(x => !x.ok).map(x => x.h + 'px')
    r.problems.push(`Unclearable on a ${bad.join(', ')} tall window, so it is unplayable for some people.`)
  }
  if (good.length) {
    const tight = good.reduce((m, x) => x.frames < m.frames ? x : m, good[0])
    r.tightest = tight
    if (tight.frames < 1) r.warnings.push(`Frame-perfect at ${tight.h}px — exactly one viable line.`)
  }

  // Tightest gap in absolute terms, at a typical window
  const H = 500
  let minGap = Infinity, minCol = 0
  for (let c = 0; c <= r.clearAt; c += 2) {
    const g = lcWallAt(kfs, c, H).gapH
    if (g < minGap) { minGap = g; minCol = c }
  }
  r.tightestGap = { px: minGap, col: minCol, clearance: minGap - 2*LC_R }
  if (r.tightestGap.clearance < 4) {
    r.problems.push(`Tightest gap is ${minGap.toFixed(0)}px at column ${minCol} — the wave is ${2*LC_R}px tall, leaving ${r.tightestGap.clearance.toFixed(0)}px.`)
  }
  return r
}



// ═══════════════════════════════════════════════════════
//  UFO FLAP — bot line
//  Physics is gravity plus an impulse, so the state is (y, vy) rather
//  than a single height. The plan is the flap sequence itself: with the
//  game on a fixed timestep, replaying it reproduces the solve exactly.
//  Everything scales with height, matching what the game does.
// ═══════════════════════════════════════════════════════

const LC_U_GRAV = 880, LC_U_THRUST = -400, LC_U_RY = 11, LC_U_RX = 22, LC_U_PW = 62

function _lcUfoHit(lv, h, w, y, scroll, RY, RX, pad) {
  if (y - RY <= 0 || y + RY >= h) return true
  const ufoX = w * 0.20
  for (const p of lv.pipes || []) {
    const px = p.at + ufoX - scroll
    if (px >= ufoX + RX || px + LC_U_PW <= ufoX - RX) continue
    const gap = (p.gapf || lv.gapf || 0.3) * h
    const cy  = p.cyf * h
    // A landable pillar is not a wall on the side you may rest on
    if (y + RY > cy + gap / 2 && p.safe !== 'bottom') return true
    if (y - RY < cy - gap / 2 && p.safe !== 'top')    return true
    if (pad) {
      if (y + RY > cy + gap / 2 - pad && p.safe !== 'bottom') return true
      if (y - RY < cy - gap / 2 + pad && p.safe !== 'top')    return true
    }
  }
  return false
}

// Replay a flap list against continuous physics — the solver quantises,
// the game does not, so a plan is only trusted once it has been flown.
function _lcUfoReplay(lv, h, w, flaps, dt) {
  const k = h / 560
  const GRAV = LC_U_GRAV * k, THRUST = LC_U_THRUST * k
  const RY = LC_U_RY * k, RX = LC_U_RX * k
  const spd = (lv.speed || 160) * k
  let y = h / 2, vy = 0, scroll = 0
  for (let i = 0; i < flaps.length; i++) {
    if (flaps[i]) vy = THRUST
    vy += GRAV * dt
    y  += vy * dt
    scroll += spd * dt
    if (_lcUfoHit(lv, h, w, y, scroll, RY, RX, 0)) {
      // landing on a green pillar is a rest, not a death
      let rested = false
      const ufoX = w * 0.20
      for (const p of lv.pipes || []) {
        const px = p.at + ufoX - scroll
        if (px >= ufoX + RX || px + LC_U_PW <= ufoX - RX) continue
        const gap = (p.gapf || lv.gapf || 0.3) * h, cy = p.cyf * h
        if (p.safe === 'bottom' && y + RY > cy + gap / 2) { y = cy + gap/2 - RY; vy = 0; rested = true }
        if (p.safe === 'top'    && y - RY < cy - gap / 2) { y = cy - gap/2 + RY; vy = 0; rested = true }
      }
      if (!rested) return { ok: false, at: Math.round(scroll) }
    }
  }
  return { ok: true }
}

// A budget, because this blocks the page while it runs. A normal level takes
// 0.5-2s; a level authored into a corner can take far longer, and there is no
// good reason to freeze the tab for it. Out of time means no bot line, which
// the HUD says out loud, rather than a hang.
const LC_UFO_BUDGET_MS = 2500

function lcSolveUFO(lv, h, w, dt, worst) {
  const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now())
  const outOfTime = () =>
    ((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0) > LC_UFO_BUDGET_MS
  const DT = dt || 1 / 240
  const k = h / 560
  const GRAV = LC_U_GRAV * k, THRUST = LC_U_THRUST * k
  const RY = LC_U_RY * k, RX = LC_U_RX * k
  const spd = (lv.speed || 160) * k
  const clear = lv.clearAt || 3000
  const QY = 2.5, QV = 18
  const key = (y, v) => Math.round(y / QY) + ':' + Math.round(v / QV)

  for (const pad of [10, 6, 3, 1, 0]) {
    if (outOfTime()) break
    const layers = []
    let cur = new Map([[key(h/2, 0), { y: h/2, vy: 0, prev: null, flap: false, taps: 0 }]])
    let scroll = 0, guard = 0, dead = false
    while (scroll < clear && guard++ < 60000) {
      const next = new Map()
      for (const [kk, st] of cur) {
        for (const flap of [true, false]) {
          let vy = flap ? THRUST : st.vy
          vy += GRAV * DT
          let y = st.y + vy * DT
          const sc = scroll + spd * DT
          if (_lcUfoHit(lv, h, w, y, sc, RY, RX, pad)) continue
          const nk = key(y, vy)
          const taps = st.taps + (flap ? 1 : 0)
          // Always solve for the fewest taps, even for evilbot — see the
          // note on _lcUfoMoreTaps for why maximising in here goes wrong.
          const seen = next.get(nk)
          if (!seen || seen.taps > taps) next.set(nk, { y, vy, prev: kk, flap, taps })
        }
      }
      if (next.size === 0) { dead = true; break }
      layers.push(next)
      cur = next
      scroll += spd * DT
      if ((layers.length & 255) === 0 && outOfTime()) { dead = true; break }
    }
    if (dead || !layers.length) continue

    let bestKey = null, bestTaps = Infinity
    for (const [kk, n] of cur) if (n.taps < bestTaps) { bestTaps = n.taps; bestKey = kk }
    const flaps = new Array(layers.length)
    let kk = bestKey
    for (let i = layers.length - 1; i >= 0; i--) {
      const n = layers[i].get(kk)
      flaps[i] = n.flap
      kk = n.prev
    }
    const check = _lcUfoReplay(lv, h, w, flaps, DT)
    if (!check.ok) continue
    if (worst) {
      const padded = _lcUfoMoreTaps(lv, h, w, flaps, DT)
      return { ok: true, flaps: padded, taps: padded.filter(Boolean).length, margin: pad, dt: DT }
    }
    return { ok: true, flaps, taps: bestTaps, margin: pad, dt: DT }
  }
  return { ok: false }
}

// evilbot. Maximising taps inside the search does not work: the state key
// quantises (y, vy), and preferring the flappiest way of reaching a key
// stores the representative that sits nearest a wall, so the search runs out
// of states — on FIRST STEPS it died at column 320 every time.
// Padding a plan that already flies is both robust and obviously valid:
// try adding a flap at each step, keep it only if the line still survives.
function _lcUfoMoreTaps(lv, h, w, flaps, DT) {
  const best = flaps.slice()
  const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now())
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < best.length - 1; i++) {
      if (best[i]) continue
      // Stop padding rather than run long — whatever it has by now still flies
      if ((i & 63) === 0 && now() - t0 > 900) return best
      best[i] = true
      if (!_lcUfoReplay(lv, h, w, best, DT).ok) best[i] = false
    }
  }
  return best
}

// ═══════════════════════════════════════════════════════
//  SPIDER — bot line
//  The spider is on the floor or the ceiling and nothing else, and a
//  block only kills you when you are on its surface. So the required
//  surface at every block is forced, and the only question is where to
//  flip between them. No search needed — just the flip columns.
// ═══════════════════════════════════════════════════════

function lcSolveSpider(lv, worst) {
  const obs = [...(lv.obstacles || [])].sort((a, b) => a.col - b.col)
  const flips = []
  let onFloor = true                     // the spider always spawns on the floor
  let prevCol = 0
  for (const o of obs) {
    const needFloor = !o.floor           // stand on the opposite surface
    if (needFloor !== onFloor) {
      // Flip in the clear space before this block. Latest possible is the
      // edge of its hit window; evilbot dawdles, the normal bot goes early.
      const latest = o.col - 26 / 2 - 9 - 2
      const earliest = prevCol + 26 / 2 + 9 + 2
      flips.push(Math.max(0, worst ? latest : Math.max(earliest, (earliest + latest) / 2)))
      onFloor = needFloor
    }
    prevCol = o.col
  }
  // evilbot pads out the run with harmless extra flips in the gaps
  if (worst) {
    const extra = []
    for (let i = 0; i < obs.length - 1; i++) {
      const a = obs[i].col + 22, b = obs[i+1].col - 22
      if (b - a < 90) continue
      extra.push(a + (b - a) * 0.34, a + (b - a) * 0.66)   // flip and flip back
    }
    flips.push(...extra)
    flips.sort((x, y) => x - y)
  }
  return { ok: true, flips, taps: flips.length }
}

if (typeof window !== 'undefined') {
  window.lcReport = lcReport
  window.lcSolveWave = lcSolveWave
  window.lcSolveLine = lcSolveLine
  window.lcSolveUFO = lcSolveUFO
  window.lcSolveSpider = lcSolveSpider
  window.lcSolveLineSafe = lcSolveLineSafe
  window.lcWallAt = lcWallAt
  window.lcLabel = lcLabel
  window.LC_HEIGHTS = LC_HEIGHTS
  window.LC_FRAME = LC_FRAME
  window.LC_SIM_DT = LC_SIM_DT
}
if (typeof module !== 'undefined') module.exports = { lcReport, lcSolveWave, lcSolveLine, lcSolveLineSafe, lcSolveUFO, lcSolveSpider, lcWallAt, lcLabel }

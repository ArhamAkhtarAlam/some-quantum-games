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
function lcSolveWave(lv, h) {
  const kfs = lv.keyframes || []
  const speed = lv.speed || 200
  const clear = lv.clearAt || 800
  let states = new Set([Math.round(h/2 * LC_QUANT)])
  let scroll = 0, frame = 0
  let worst = Infinity, worstCol = 0

  while (scroll < clear) {
    const next = new Set()
    const { cy, gapH } = lcWallAt(kfs, scroll, h)
    const top = cy - gapH/2, bot = cy + gapH/2
    for (const q of states) {
      const y = q / LC_QUANT
      for (const up of [true, false]) {
        const ny = y + (up ? -LC_WAVE : LC_WAVE) * LC_DT
        if (ny - LC_R < top || ny + LC_R > bot) continue
        next.add(Math.round(ny * LC_QUANT))
      }
    }
    if (next.size === 0) return { ok:false, diedAt:Math.round(scroll), frame }
    // Skip the opening frames: the spread there is just branching, not difficulty
    if (frame > 8) {
      const ys = [...next].map(q => q / LC_QUANT)
      const span = Math.max(...ys) - Math.min(...ys)
      if (span < worst) { worst = span; worstCol = Math.round(scroll) }
    }
    states = next
    scroll += speed * LC_DT
    frame++
  }
  return { ok:true, band:worst === Infinity ? 0 : worst, atCol:worstCol, frames:frame }
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

  // Speed feel: how much of the level a player can actually see and react to
  r.colsPerFrame = speed * LC_DT
  r.lookahead    = 900 / speed          // seconds of level visible on a 900px arena
  if (r.colsPerFrame > 10) {
    r.warnings.push(`Scrolls ${r.colsPerFrame.toFixed(0)} columns per frame at 60Hz — detail finer than that is skipped, and the level plays differently on a higher-refresh screen.`)
  }
  if (r.lookahead < 0.35) {
    r.warnings.push(`Only ${r.lookahead.toFixed(2)}s of warning, below human reaction time — this has to be memorised rather than read.`)
  }

  // Exhaustive clearability across a range of window sizes
  let anyFail = false
  for (const h of LC_HEIGHTS) {
    const s = lcSolveWave(lv, h)
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

if (typeof window !== 'undefined') {
  window.lcReport = lcReport
  window.lcSolveWave = lcSolveWave
  window.lcWallAt = lcWallAt
  window.lcLabel = lcLabel
  window.LC_HEIGHTS = LC_HEIGHTS
  window.LC_FRAME = LC_FRAME
}
if (typeof module !== 'undefined') module.exports = { lcReport, lcSolveWave, lcWallAt, lcLabel }

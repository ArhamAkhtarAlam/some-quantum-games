// ═══════════════════════════════════════════════════════
//  DECO — decorative, non-lethal level scenery
//  Shared by Wave Gauntlet (43) and Spider (44), and by the
//  local level editor. Drawn behind the corridor/obstacles so
//  it can never be mistaken for something that kills you.
//
//  One deco item:
//    { t, col, cf, w, hf, c, a, tx, rot }
//      t    shape: rect diamond circle bar tri line text
//      col  world column (same axis as keyframes / obstacles)
//      cf   vertical centre, fraction of canvas height
//      w    width in columns
//      hf   height as a fraction of canvas height
//      c    index into DECO_COLS
//      a    alpha 0–1 (defaults low so it stays background)
//      tx   text content, `text` type only
//      rot  rotation in degrees
// ═══════════════════════════════════════════════════════

const DECO_COLS = [
  '#22c55e', // green
  '#06b6d4', // cyan
  '#a855f7', // purple
  '#f59e0b', // amber
  '#ef4444', // red
  '#e2e8f0', // white
]
const DECO_TYPES = ['rect', 'diamond', 'circle', 'bar', 'tri', 'line', 'text']

const DECO_DEFAULT_ALPHA = 0.22

// scroll  = current world scroll in columns
// originX = canvas x that world column `scroll` maps to
function drawDeco(ctx, deco, w, h, scroll, originX, opts) {
  if (!deco || !deco.length) return
  const glow = !opts || opts.glow !== false
  ctx.save()
  for (const d of deco) {
    const dw = (d.w ?? 40)
    const x  = (d.col ?? 0) - scroll + originX
    if (x + dw < -40 || x - dw > w + 40) continue      // offscreen

    const y   = (d.cf ?? 0.5) * h
    const dh  = (d.hf ?? 0.1) * h
    const col = DECO_COLS[d.c ?? 0] || DECO_COLS[0]

    ctx.globalAlpha = d.a ?? DECO_DEFAULT_ALPHA
    ctx.fillStyle   = col
    ctx.strokeStyle = col
    ctx.lineWidth   = 2
    if (glow) { ctx.shadowColor = col; ctx.shadowBlur = 10 }

    ctx.save()
    ctx.translate(x, y)
    if (d.rot) ctx.rotate(d.rot * Math.PI / 180)

    switch (d.t) {
      case 'diamond':
        ctx.beginPath()
        ctx.moveTo(0, -dh/2); ctx.lineTo(dw/2, 0)
        ctx.lineTo(0,  dh/2); ctx.lineTo(-dw/2, 0)
        ctx.closePath(); ctx.stroke()
        break
      case 'circle':
        ctx.beginPath(); ctx.arc(0, 0, Math.min(dw, dh) / 2, 0, Math.PI*2); ctx.stroke()
        break
      case 'bar':
        ctx.fillRect(-dw/2, -dh/2, dw, dh)
        break
      case 'tri':
        ctx.beginPath()
        ctx.moveTo(0, -dh/2); ctx.lineTo(dw/2, dh/2); ctx.lineTo(-dw/2, dh/2)
        ctx.closePath(); ctx.stroke()
        break
      case 'line':
        ctx.beginPath(); ctx.moveTo(-dw/2, 0); ctx.lineTo(dw/2, 0); ctx.stroke()
        break
      case 'text':
        ctx.font = `bold ${Math.max(8, Math.round(dh))}px monospace`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(d.tx || '', 0, 0)
        break
      default: // rect
        ctx.strokeRect(-dw/2, -dh/2, dw, dh)
    }

    ctx.restore()
  }
  ctx.restore()
}

// Editor convenience — a fresh item of the given type
function makeDeco(t, col, cf) {
  const d = { t, col: Math.round(col), cf: +cf.toFixed(4), w: 60, hf: 0.12, c: 1, a: DECO_DEFAULT_ALPHA }
  if (t === 'text') { d.tx = 'TEXT'; d.hf = 0.06; d.a = 0.5 }
  if (t === 'line') { d.hf = 0.01; d.w = 120 }
  if (t === 'bar')  { d.a = 0.14 }
  return d
}

if (typeof window !== 'undefined') {
  window.DECO_COLS = DECO_COLS
  window.DECO_TYPES = DECO_TYPES
  window.drawDeco = drawDeco
  window.makeDeco = makeDeco
}

// ═══════════════════════════════════════════════════════
//  CUSTOM LEVELS — read side (loaded by the live site)
//  Levels are authored in editor.html (local dev tool) and
//  published to Supabase. Here we just fetch them so the
//  games can mix them into their difficulty pools.
// ═══════════════════════════════════════════════════════

window.QG_CUSTOM_LEVELS = { wavegauntlet: [], spider: [] }

window.loadCustomLevels = async function() {
  if (typeof _sb === 'undefined' || !_sb) return
  try {
    const { data, error } = await _sb.from('custom_levels').select('*')
    if (error || !data) return
    const out = { wavegauntlet: [], spider: [] }
    for (const row of data) {
      if (!out[row.game]) continue
      out[row.game].push({
        id: row.id, name: row.name, diff: row.diff,
        speed: row.speed, clearAt: row.clear_at,
        ...(row.data || {}),
        custom: true,
      })
    }
    window.QG_CUSTOM_LEVELS = out
  } catch { /* offline or table missing — games fall back to built-ins */ }
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => window.loadCustomLevels(), 400)
})

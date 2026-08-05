// 记录本机曾经演出过的彩头场景 id，跨局累积，用于"集齐十二生肖"这类收集类印章
export const readSeenMods = () => {
  try { return new Set(JSON.parse(localStorage.getItem('zzl_seen_mods') || '[]')) } catch { return new Set() }
}

export const addSeenMod = (id) => {
  const seen = readSeenMods()
  if (seen.has(id)) return seen
  seen.add(id)
  try { localStorage.setItem('zzl_seen_mods', JSON.stringify([...seen])) } catch {}
  return seen
}

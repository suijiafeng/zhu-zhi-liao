import { STORAGE } from './constants.js'

// 记录本机曾经演出过的彩头场景 id，跨局累积
export const readSeenMods = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE.seenMods) || '[]'))
  } catch {
    return new Set()
  }
}

export const addSeenMod = (id) => {
  const seen = readSeenMods()
  if (seen.has(id)) return seen
  seen.add(id)
  try {
    localStorage.setItem(STORAGE.seenMods, JSON.stringify([...seen]))
  } catch {}
  return seen
}

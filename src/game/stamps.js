import { ZODIAC_IDS } from './scenarios.js'
import { STORAGE } from './constants.js'

export const STAMPS = [
  { id: 'first', icon: '🎋', name: '初登台', desc: '完整演完一场', test: () => true },
  { id: 'combo15', icon: '🔥', name: '十五连拍', desc: '连拍打满 15', test: (r) => r.maxCombo >= 15 },
  { id: 'guard', icon: '😴', name: '守盹人', desc: '一场守护两次打盹', test: (r) => r.stats.naps >= 2 },
  { id: 'duet', icon: '🐝', name: '对唱名家', desc: '完成一次完美对唱', test: (r) => r.stats.duets >= 1 },
  { id: 'cat', icon: '🐱', name: '猫口脱险', desc: '吓退扑蝉的野猫', test: (r) => r.stats.cats >= 1 },
  { id: 'golden', icon: '🪙', name: '金蝉知己', desc: '接住一闪而过的金蝉', test: (r) => r.stats.golden >= 1 },
  { id: 'fever2', icon: '🏮', name: '狂欢之王', desc: '一场触发两次狂欢', test: (r) => r.stats.feverN >= 2 },
  { id: 'fly', icon: '🚀', name: '飞天一回', desc: '成功放飞一次', test: (r) => r.stats.flights >= 1 },
  {
    id: 'nosnap',
    icon: '🧵',
    name: '惜线如金',
    desc: '800 分且全场不断线',
    test: (r) => r.score >= 800 && r.brokenN === 0,
  },
  { id: 'master', icon: '👑', name: '哇声宗师', desc: '单场拿下 3800 分', test: (r) => r.score >= 3800 },
  {
    id: 'zodiac12',
    icon: '🈴',
    name: '十二生肖·集福',
    desc: '集齐十二个生肖场景',
    test: (_r, seen) => !!seen && ZODIAC_IDS.every((id) => seen.has(id)),
  },
]

export const readStamps = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE.stamps) || '[]')
  } catch {
    return []
  }
}

export const saveStamps = (ids) => {
  try {
    localStorage.setItem(STORAGE.stamps, JSON.stringify(ids))
  } catch {}
}

export const awardStamps = (result, seenMods) => {
  const owned = readStamps()
  const earned = STAMPS.filter((s) => !owned.includes(s.id) && s.test(result, seenMods))
  const stampIds = [...owned, ...earned.map((s) => s.id)]
  if (earned.length) saveStamps(stampIds)
  return { newStamps: earned, stampIds }
}

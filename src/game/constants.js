export const DESIGN_W = 480
export const DESIGN_H = 640

export const ROUND_TIME = 60

export const TITLES = [
  [0, '手生的娃娃'],
  [400, '巷口小能手'],
  [800, '松香老手'],
  [1400, '庙会艺人'],
  [2200, '甩蝉高手'],
  [3200, '庙会压轴'],
  [4200, '哇声一片·宗师'],
]

export const getTitle = (s) => TITLES.reduce((t, [min, name]) => (s >= min ? name : t), TITLES[0][1])

export const STORAGE = {
  classic: 'zzl_best_classic',
  endless: 'zzl_best_endless',
  sound: 'zzl_sound',
  legacy: 'zzl_best',
  seenMods: 'zzl_seen_mods',
  stamps: 'zzl_stamps',
}

export const BREAK_SPEED = 0.42
export const COMBO_SHIELD_AT = 8
/** 野猫吓退橙区：快而不至于断线 */
export const CAT_SCARE_LO = 0.32
export const CAT_SCARE_HI = BREAK_SPEED

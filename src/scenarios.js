import { rand } from './utils.js'

// 每局随机彩头：改变玩法侧重、得分倍率与画面氛围。
// 字段都是可选的机制钩子，缺省即维持基础规则——加新场景只需按需挑字段填，不用改主循环。
//   mult 得分倍率 · zoneWidthMult 甜蜜区宽度 · driftFrames 节奏区漂移间隔（越小漂得越勤）
//   decayMult 转速衰减倍率（>1 更快掉速）· snapMult 断线张力累积倍率（>1 更易断）
//   startCrowd 起始欢呼度 · feverThreshold 狂欢触发阈值 · eventCooldownStart 首个事件冷却
//   eventFreqMult 事件冷却倍率（<1 更频繁）· napWeightBonus/duetWeightBonus 事件权重偏移
//   napBonusMult/duetMultBonus 对应事件的奖励倍率 · dark 深色配色 · stars 星空 · moon 月亮
//   particle 环境粒子 {kind, rate, color}（新增 kind：wave 水波 / star 星点 / spark 电光碎屑）
//   bg2 第二组背景色，与 bg 随局内进度插值（晨昏过渡）
//   thunder 定时轻微震屏+雷声（纯氛围）· lightning 定时全屏闪光（纯氛围）
export const ZODIAC_IDS = [
  'z-rat', 'z-ox', 'z-tiger', 'z-rabbit', 'z-dragon', 'z-snake',
  'z-horse', 'z-goat', 'z-monkey', 'z-rooster', 'z-dog', 'z-pig',
]

export const MODS = [
  { id: 'plain', name: '寻常日子', icon: '🎪', desc: '风平浪静，好好演出', mult: 1, w: 5 },
  { id: 'night', name: '夜场灯会', icon: '🏮', desc: '灯笼点起，萤火作伴 · 得分 +20%', mult: 1.2, w: 2,
    dark: true, stars: true, bg: { top: '#252b47', bottom: '#4a3a2c' },
    particle: { kind: 'firefly', rate: 0.4, color: '255,236,130' } },
  { id: 'wind', name: '大风天', icon: '🌬️', desc: '节奏区漂得更勤 · 得分 +30%', mult: 1.3, w: 2, driftFrames: 200 },
  { id: 'lazy', name: '懒觉日', icon: '😴', desc: '老爷爷今天特别困 · 守盹奖励翻倍', mult: 1, w: 1.6,
    napWeightBonus: 0.19, napBonusMult: 2 },
  { id: 'rain', name: '雨夜演出', icon: '🌧️', desc: '线绳打滑，转速掉得快 · 得分 +25%', mult: 1.25, w: 1.6,
    dark: true, bg: { top: '#2b3340', bottom: '#3c4a3e' }, decayMult: 1.35,
    particle: { kind: 'rain', rate: 1.1, color: '190,210,230' } },
  { id: 'sun', name: '毒日头', icon: '☀️', desc: '竹片晒得发脆，更容易绷断 · 得分 +35%', mult: 1.35, w: 1.6,
    bg: { top: '#fff2c4', bottom: '#f0c46a' }, snapMult: 1.5 },
  { id: 'fog', name: '大雾天', icon: '🌫️', desc: '雾气遮眼，节奏区变窄 · 得分 +30%', mult: 1.3, w: 1.4,
    bg: { top: '#cdd3cf', bottom: '#b7c2ba' }, zoneWidthMult: 0.65,
    particle: { kind: 'fogpuff', rate: 0.15, color: '255,255,255' } },
  { id: 'peak', name: '庙会高峰', icon: '👥', desc: '人潮拥挤，事件更密、狂欢更易触发', mult: 1.1, w: 1.4,
    startCrowd: 20, feverThreshold: 80, eventCooldownStart: 260, eventFreqMult: 0.65 },
  { id: 'moon', name: '中秋月圆', icon: '🌕', desc: '桂花香里，对唱更常见、奖励更丰', mult: 1.15, w: 1.4,
    dark: true, stars: true, moon: true, bg: { top: '#26305c', bottom: '#5a4a72' },
    duetWeightBonus: 0.18, duetMultBonus: 1.5, particle: { kind: 'petal', rate: 0.3, color: '255,214,235' } },
  { id: 'newyear', name: '新春庙会', icon: '🧨', desc: '碎纸漫天，欢呼起点更高、狂欢更易触发', mult: 1.1, w: 1.4,
    startCrowd: 25, feverThreshold: 85, particle: { kind: 'confetti', rate: 0.5, color: '217,70,62' } },
  { id: 'dawn', name: '清晨早市', icon: '🌅', desc: '新手友好：节奏区更宽、漂移更慢', mult: 1, w: 1.3,
    bg: { top: '#ffe1c2', bottom: '#ffcfa0' }, zoneWidthMult: 1.4, driftFrames: 420, napWeightBonus: -0.1 },
  { id: 'hardcore', name: '硬核挑战场', icon: '🏆', desc: '节奏区更窄、漂移更快 · 得分 ×1.5', mult: 1.5, w: 1,
    zoneWidthMult: 0.6, driftFrames: 180 },
  { id: 'plum', name: '梅雨潮湿天', icon: '💧', desc: '线绳发涩不易断，但转速掉得快', mult: 1.15, w: 1.3,
    bg: { top: '#dbe4d8', bottom: '#c3d0c1' }, decayMult: 1.25, snapMult: 0.6,
    particle: { kind: 'rain', rate: 0.5, color: '170,190,180' } },
  { id: 'autumn', name: '秋风落叶', icon: '🍃', desc: '风助一臂，转速更耐甩，但节奏区飘得快', mult: 1.1, w: 1.3,
    bg: { top: '#e8d3a0', bottom: '#c99a5c' }, decayMult: 0.85, driftFrames: 220,
    particle: { kind: 'leaf', rate: 0.3, color: '198,122,53' } },

  // ------- 江河湖海：老街尽头那条河，四种水情 -------
  { id: 'river', name: '大江奔流', icon: '🏞️', desc: '江水推着劲，转速格外耐甩，但节奏说变就变 · 得分 +30%', mult: 1.3, w: 1.4,
    bg: { top: '#c9dde0', bottom: '#7fa3ac' }, decayMult: 0.75, driftFrames: 200,
    particle: { kind: 'wave', rate: 0.35, color: '210,230,232' } },
  { id: 'stream', name: '小河潺潺', icon: '💧', desc: '水浅流缓，新手友好：节奏区更宽、漂移更慢', mult: 1, w: 1.3,
    bg: { top: '#dcebdf', bottom: '#a9c9b4' }, zoneWidthMult: 1.35, driftFrames: 400,
    particle: { kind: 'wave', rate: 0.2, color: '220,240,225' } },
  { id: 'lake', name: '静湖泛舟', icon: '🛶', desc: '水鸟应和，对唱格外容易凑成、奖励更丰', mult: 1.15, w: 1.4,
    bg: { top: '#d6e6ee', bottom: '#9db8c9' }, duetWeightBonus: 0.16, duetMultBonus: 1.4,
    particle: { kind: 'wave', rate: 0.2, color: '215,232,238' } },
  { id: 'sea', name: '潮起潮涌', icon: '🌊', desc: '浪头一波接一波，线绷得更紧、欢呼起点更高 · 得分 +35%', mult: 1.35, w: 1.2,
    dark: true, bg: { top: '#22405a', bottom: '#3f6f78' }, snapMult: 1.35, startCrowd: 15,
    particle: { kind: 'wave', rate: 0.5, color: '180,220,225' } },

  // ------- 星辰：日月已有场景，这里只补星与辰 -------
  { id: 'star', name: '满天星斗', icon: '✨', desc: '星光缀满夜空，稳住绿区更容易引来对唱 · 得分 +20%', mult: 1.2, w: 1.3,
    dark: true, stars: true, bg: { top: '#161c3a', bottom: '#33314f' },
    duetWeightBonus: 0.1, particle: { kind: 'star', rate: 0.3, color: '255,250,220' } },
  { id: 'dusk', name: '晨昏时辰', icon: '🌆', desc: '一局之内天色由晨入昏，节奏也随之悄悄变化 · 得分 +15%', mult: 1.15, w: 1.2,
    bg: { top: '#ffdca8', bottom: '#f3a95f' }, bg2: { top: '#2c3768', bottom: '#5a4a72' }, driftFrames: 260 },

  // ------- 雷电：风雨已有场景，这里只补雷与电 -------
  { id: 'thunder', name: '闷雷滚滚', icon: '🌩️', desc: '远处雷声阵阵，让人心一颤（纯氛围，不影响判定）· 得分 +30%', mult: 1.3, w: 1.2,
    dark: true, bg: { top: '#2e3446', bottom: '#4a4e42' }, thunder: true },
  { id: 'lightning', name: '电光乍现', icon: '⚡', desc: '闪电一闪，节奏区亮一下就暗下去 · 得分 +35%', mult: 1.35, w: 1.1,
    dark: true, bg: { top: '#262b3d', bottom: '#3d4451' }, lightning: true, zoneWidthMult: 0.85,
    particle: { kind: 'spark', rate: 0.25, color: '255,244,180' } },

  // ------- 十二生肖：每年赶来老街听蝉鸣的那位属相 -------
  { id: 'z-rat', name: '鼠年报喜', icon: '🐭', desc: '机灵劲儿传染人，事件来得更勤，得手快才行', mult: 1.1, w: 0.7,
    eventFreqMult: 0.7 },
  { id: 'z-ox', name: '牛年耕耘', icon: '🐮', desc: '老黄牛的憨劲：转速耐甩、线也更结实', mult: 1.1, w: 0.7,
    decayMult: 0.8, snapMult: 0.75 },
  { id: 'z-tiger', name: '虎年生威', icon: '🐯', desc: '虎虎生风，节奏区收窄，硬核向 · 得分 +40%', mult: 1.4, w: 0.6,
    zoneWidthMult: 0.65, driftFrames: 200 },
  { id: 'z-rabbit', name: '兔年安康', icon: '🐰', desc: '性子温顺，节奏区格外宽容，新手友好', mult: 1, w: 0.8,
    zoneWidthMult: 1.45, driftFrames: 420 },
  { id: 'z-dragon', name: '龙年呈祥', icon: '🐲', desc: '传说这天江边能听见龙吟应蝉鸣，狂欢来得格外快', mult: 1.3, w: 0.5,
    dark: true, stars: true, bg: { top: '#241a3d', bottom: '#4a2d55' }, feverThreshold: 78, startCrowd: 20,
    particle: { kind: 'star', rate: 0.35, color: '255,214,120' } },
  { id: 'z-snake', name: '蛇年灵动', icon: '🐍', desc: '身段灵活，节奏区窄而漂移勤，考验手感', mult: 1.2, w: 0.6,
    zoneWidthMult: 0.75, driftFrames: 230 },
  { id: 'z-horse', name: '马年奔腾', icon: '🐴', desc: '一马当先，转速掉得极慢，甩起来格外痛快', mult: 1.25, w: 0.7,
    decayMult: 0.65 },
  { id: 'z-goat', name: '羊年温顺', icon: '🐐', desc: '性情温顺，老爷爷打盹的次数也跟着变多，守盹奖励翻倍', mult: 1, w: 0.7,
    napWeightBonus: 0.18, napBonusMult: 2 },
  { id: 'z-monkey', name: '猴年闹春', icon: '🐵', desc: '调皮捣蛋，事件密集又随机，一刻不得闲', mult: 1.15, w: 0.6,
    eventFreqMult: 0.6, eventCooldownStart: 240 },
  { id: 'z-rooster', name: '鸡年报晓', icon: '🐔', desc: '雄鸡一唱天下白，节奏区宽、漂移慢，清清爽爽演一场', mult: 1.05, w: 0.8,
    bg: { top: '#ffe4b8', bottom: '#ffc98a' }, zoneWidthMult: 1.3, driftFrames: 380 },
  { id: 'z-dog', name: '狗年守岁', icon: '🐶', desc: '忠诚守护，线绷得没那么容易断', mult: 1.1, w: 0.7,
    snapMult: 0.7 },
  { id: 'z-pig', name: '猪年纳福', icon: '🐷', desc: '福气满满，欢呼起点高、狂欢来得快 · 得分 +25%', mult: 1.25, w: 0.6,
    startCrowd: 22, feverThreshold: 82, particle: { kind: 'confetti', rate: 0.3, color: '242,182,50' } },
]

// 展示用分组（不影响抽取逻辑）：按 id 归类到四字词分组，图鉴 UI 据此分区展示
const WATER_IDS = ['river', 'stream', 'lake', 'sea']
const SKY_IDS = ['star', 'dusk']
const STORM_IDS = ['thunder', 'lightning']
export const MOD_GROUPS = [
  { key: 'season', label: '四季天气', match: (id) => !WATER_IDS.includes(id) && !SKY_IDS.includes(id) && !STORM_IDS.includes(id) && !ZODIAC_IDS.includes(id) },
  { key: 'water', label: '江河湖海', match: (id) => WATER_IDS.includes(id) },
  { key: 'sky', label: '星辰', match: (id) => SKY_IDS.includes(id) },
  { key: 'storm', label: '雷电', match: (id) => STORM_IDS.includes(id) },
  { key: 'zodiac', label: '十二生肖', match: (id) => ZODIAC_IDS.includes(id) },
]
export const groupedMods = () => MOD_GROUPS.map((g) => ({ ...g, mods: MODS.filter((m) => g.match(m.id)) }))

export const pickMod = () => {
  const total = MODS.reduce((sum, mod) => sum + mod.w, 0)
  const roll = Math.random() * total
  let acc = 0
  for (const mod of MODS) { acc += mod.w; if (roll < acc) return mod }
  return MODS[MODS.length - 1]
}

export const rollZone = (mod) => {
  const widthMult = mod?.zoneWidthMult ?? 1
  const lo = rand(0.1, 0.3)
  return { lo, hi: lo + rand(0.1, 0.15) * widthMult }
}

export const nextEventCooldown = (mod) => rand(420, 640) * (mod?.eventFreqMult ?? 1)

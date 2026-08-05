export const TITLES = [
  [0, '手生的娃娃 🌱'],
  [400, '巷口小能手 🎋'],
  [1000, '庙会艺人 🏮'],
  [2000, '甩蝉高手 🥇'],
  [3800, '哇声一片·宗师 👑'],
]

export const getTitle = (score) => TITLES.reduce((title, [min, name]) => (score >= min ? name : title), TITLES[0][1])

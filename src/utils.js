export const rand = (min, max) => min + Math.random() * (max - min)
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

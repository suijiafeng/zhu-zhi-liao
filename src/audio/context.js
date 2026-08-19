import { STORAGE } from '../game/constants.js'

let actx = null
let muted = false

export const isMuted = () => muted

export const setMuted = (v) => {
  muted = !!v
  try {
    localStorage.setItem(STORAGE.sound, muted ? '0' : '1')
  } catch {}
}

export const loadMutePreference = () => {
  try {
    muted = localStorage.getItem(STORAGE.sound) === '0'
  } catch {}
  return muted
}

export const getCtx = () => {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)()
  if (actx.state === 'suspended') actx.resume()
  return actx
}

export const unlockAudio = () => {
  try {
    getCtx()
  } catch {}
}

import { useEffect, useRef, useState } from 'react'
import { W, H, CX, CY, ROUND_TIME } from './gameConstants.js'
import { rand, clamp } from './utils.js'
import {
  getAudioContext, setMuted, createCicadaVoice, beep,
  sndCrowdWa, sndSnap, sndCombo, sndFanfare, sndWildWa, sndSnore,
  sndAngry, sndSuccess, sndMeow, sndFly, sndChime, sndWhiff,
  sndThunder, sndLightning,
} from './audio.js'
import { pickMod, rollZone, nextEventCooldown } from './scenarios.js'
import { STAMPS, readStamps, saveStamps } from './stamps.js'
import { addSeenMod } from './seenScenarios.js'
import { getTitle } from './titles.js'
import Hud from './components/Hud.jsx'
import ReadyOverlay from './components/ReadyOverlay.jsx'
import GameOverOverlay from './components/GameOverOverlay.jsx'

export default function Game({ onGameOver, best }) {
  const canvasRef = useRef(null)
  const [phase, setPhase] = useState('ready')
  const [hud, setHud] = useState({ score: 0, time: ROUND_TIME, combo: 0, fly: false })
  const [result, setResult] = useState(null)
  const [modInfo, setModInfo] = useState(null)

  const S = useRef({
    angle: 0, speed: 0,
    lastPtrAngle: null, ptrActive: false,
    pinched: false,   // 掐线中
    tension: 0, broken: 0,
    crowd: 0, score: 0, combo: 0, comboT: 0,
    zone: { lo: 0.16, hi: 0.3 }, zoneTimer: 0, inZoneFrames: 0,
    fever: 0,         // 狂欢模式剩余帧
    event: null,      // {type:'nap'|'duet'|'cat'|'golden', ...}
    eventCooldown: 500,
    stats: { naps: 0, duets: 0, feverN: 0, cats: 0, flights: 0, golden: 0 },
    maxCombo: 0, brokenN: 0, mod: null,
    flyCharge: 0, flight: 0, trail: [], scenery: [],
    waves: [], notes: [], confetti: [],
    crowdFaces: Array.from({ length: 9 }, (_, i) => ({ x: 34 + i * 51, jump: 0, wa: 0 })),
    toasts: [], shake: 0, tick: 0, timeLeft: ROUND_TIME * 60,
    voice: null, flash: 0, thunderTimer: null, lightningTimer: null,
    cicX: 0, cicY: 0, cicVX: 0, cicVY: 0, cicPrevX: 0, cicPrevY: 0,
  }).current

  // -------- 指针（Pointer Events 统一鼠标/触屏；捕获后甩出画布也不断） --------
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: (e.clientX - rect.left) * (W / rect.width), y: (e.clientY - rect.top) * (H / rect.height) }
  }
  const pDown = (e) => {
    getAudioContext()
    if (phase !== 'playing') return
    try { canvasRef.current.setPointerCapture?.(e.pointerId) } catch {}
    const p = getPos(e)
    S.lastPtrAngle = Math.atan2(p.y - CY, p.x - CX)
    S.ptrActive = true
  }
  const pMove = (e) => {
    if (phase !== 'playing' || !S.ptrActive || S.broken > 0 || S.flight > 0) return
    const p = getPos(e)
    const a = Math.atan2(p.y - CY, p.x - CX)
    if (S.lastPtrAngle !== null) {
      let da = a - S.lastPtrAngle
      if (da > Math.PI) da -= Math.PI * 2
      if (da < -Math.PI) da += Math.PI * 2
      S.speed += Math.abs(da) * 0.09
    }
    S.lastPtrAngle = a
  }
  const pUp = () => { S.ptrActive = false; S.lastPtrAngle = null }

  // 掐线：空格键 / 屏幕按钮；F 键放飞
  useEffect(() => {
    const down = (e) => {
      if (e.code === 'Space') { e.preventDefault(); S.pinched = true }
      if (e.code === 'KeyF') tryFlyRef.current?.()
    }
    const up = (e) => { if (e.code === 'Space') S.pinched = false }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  // 摇一摇放飞（手机；iOS 的动作权限在「开演」手势里申请）
  const tryFlyRef = useRef(null)
  useEffect(() => {
    let lastMag = 9.8
    let cool = 0
    const onMotion = (e) => {
      const a = e.accelerationIncludingGravity
      if (!a) return
      const mag = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z)
      const now = performance.now()
      if (Math.abs(mag - lastMag) > 13 && now > cool) {
        cool = now + 1500
        tryFlyRef.current?.()
      }
      lastMag = mag
    }
    window.addEventListener('devicemotion', onMotion)
    return () => window.removeEventListener('devicemotion', onMotion)
  }, [])

  const addToast = (text, big = false) => S.toasts.push({ text, y: CY - 130, life: 75, big })
  const gain = (n) => Math.round(n * (S.mod?.mult || 1))
  const burstConfetti = (n = 40) => {
    for (let i = 0; i < n; i++) {
      S.confetti.push({
        x: rand(0, W), y: -10, vx: rand(-1, 1), vy: rand(1, 3),
        color: ['#d9463e', '#f2b632', '#5aaa5a', '#5b7fa6', '#a67ab0'][i % 5],
        rot: rand(0, 6), vr: rand(-0.2, 0.2), life: rand(80, 160),
      })
    }
  }

  // 🚀 放飞：飞天值蓄满后，按钮 / F 键 / 摇一摇触发
  const tryFly = () => {
    if (phase !== 'playing' || S.flight > 0 || S.flyCharge < 100 || S.broken > 0) return
    const bonus = gain(500)
    S.flight = 170
    S.flyCharge = 0
    S.speed = 0
    S.trail = []
    S.score += bonus
    S.crowd = clamp(S.crowd + 30, 0, 100)
    S.stats.flights++
    S.shake = 8
    sndFly()
    burstConfetti(30)
    S.crowdFaces.forEach((f) => { f.jump = rand(12, 22); f.wa = 36 })
    addToast(`🚀 飞上天啦！+${bonus}`, true)
  }
  tryFlyRef.current = tryFly

  const start = () => {
    const m = pickMod()
    Object.assign(S, {
      angle: 0, speed: 0, pinched: false, tension: 0, broken: 0, crowd: m.startCrowd || 0, score: 0,
      combo: 0, comboT: 0, inZoneFrames: 0, tick: 0, timeLeft: ROUND_TIME * 60,
      zone: rollZone(m), zoneTimer: 0, fever: 0, event: null, eventCooldown: m.eventCooldownStart ?? 420,
      stats: { naps: 0, duets: 0, feverN: 0, cats: 0, flights: 0, golden: 0 },
      maxCombo: 0, brokenN: 0, mod: m, flyCharge: 0, flight: 0,
      flash: 0, thunderTimer: null, lightningTimer: null,
      cicX: 120, cicY: 26, cicVX: 0, cicVY: 0, cicPrevX: 120, cicPrevY: 26,
    })
    S.waves = []; S.notes = []; S.toasts = []; S.confetti = []; S.trail = []; S.scenery = []
    S.crowdFaces.forEach((f) => { f.jump = 0; f.wa = 0 })
    if (!S.voice) S.voice = createCicadaVoice()
    // iOS 13+ 的摇一摇需要在用户手势里申请动作权限
    if (!S.motionAsked && typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function') {
      S.motionAsked = true
      DeviceMotionEvent.requestPermission().catch(() => {})
    }
    addToast(`${m.icon} 今日彩头：${m.name}`, true)
    setModInfo(m)
    setResult(null)
    setPhase('playing')
  }

  useEffect(() => () => { S.voice?.stop(); S.voice = null }, [])

  // 切到后台时立刻消音（rAF 暂停后 voice 参数不再更新，否则会一直响）
  useEffect(() => {
    const onVis = () => { if (document.hidden) S.voice?.set(0, false) }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const [soundOn, setSoundOn] = useState(true)
  const toggleSound = () => {
    const next = !soundOn
    setMuted(!next)
    setSoundOn(next)
  }

  // 全屏（PC；iPhone Safari 不支持元素全屏，按钮自动隐藏）
  const wrapRef = useRef(null)
  const [isFull, setIsFull] = useState(false)
  const fsOk = typeof document !== 'undefined' &&
    (document.fullscreenEnabled || document.webkitFullscreenEnabled)
  const toggleFull = () => {
    const el = wrapRef.current
    if (!el) return
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      ;(document.exitFullscreen || document.webkitExitFullscreen)?.call(document)
    } else {
      try { (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el) } catch {}
    }
  }
  useEffect(() => {
    const onFs = () => setIsFull(!!(document.fullscreenElement || document.webkitFullscreenElement))
    document.addEventListener('fullscreenchange', onFs)
    document.addEventListener('webkitfullscreenchange', onFs)
    return () => {
      document.removeEventListener('fullscreenchange', onFs)
      document.removeEventListener('webkitfullscreenchange', onFs)
    }
  }, [])

  // ================= 主循环 =================
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    // 高分屏：物理像素放大，逻辑坐标仍按 480x640 绘制，彻底告别模糊
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    let raf
    const inZone = () => {
      const widen = S.fever > 0 ? 0.05 : 0
      return S.speed >= S.zone.lo - widen && S.speed <= S.zone.hi + widen
    }

    // ---------- 事件系统 ----------
    const maybeSpawnEvent = () => {
      if (S.event || S.fever > 0 || S.flight > 0) return
      if (S.eventCooldown-- > 0) return
      if (Math.random() < 0.1) {
        // 金蝉限时闪现：纯惊喜向，稳在绿区接住给大奖，错过不罚
        S.event = { type: 'golden', t: 100, fromLeft: Math.random() < 0.5, caught: false }
        addToast('🪙 金蝉现身！稳住绿区接住它！', true)
        return
      }
      const r = Math.random()
      const napP = clamp(0.36 + (S.mod?.napWeightBonus || 0), 0.1, 0.75)
      const duetHi = napP + 0.34 + (S.mod?.duetWeightBonus || 0)
      if (r < napP) {
        // 老爷爷打盹：一段时间内必须安静（掐线或停转）
        S.event = { type: 'nap', t: 240, warn: 60, x: W - 70 }
        addToast('🤫 老爷爷睡着了，掐线保持安静！', true)
        sndSnore()
      } else if (r < duetHi) {
        // 野蝉应和：树上野蝉叫 n 声，之后你要在窗口内保持甜蜜区应和
        S.event = { type: 'duet', stage: 'call', calls: 3, callT: 0, t: 0, x: 60 }
        addToast('🌳 野蝉起调了，准备应和！', true)
      } else {
        // 野猫扑蝉：潜行逼近，冲进橙区（快而不断）把它吓走
        const fromLeft = Math.random() < 0.5
        S.event = { type: 'cat', stage: 'stalk', t: 300, scare: 0, fromLeft, px: fromLeft ? -24 : W + 24 }
        addToast('🐱 野猫盯上蝉了！甩快些吓走它！', true)
        sndMeow()
      }
    }

    const updateEvent = () => {
      const ev = S.event
      if (!ev) { maybeSpawnEvent(); return }
      if (ev.type === 'nap') {
        ev.t--
        const noisy = S.speed > 0.1 && !S.pinched
        if (noisy && ev.warn-- <= 0) {
          // 吵醒
          S.event = null
          S.eventCooldown = nextEventCooldown(S.mod)
          S.crowd = clamp(S.crowd - 25, 0, 100)
          S.combo = 0
          sndAngry(); S.shake = 10
          addToast('😠 吵醒老爷爷了！', true)
          return
        }
        if (!noisy) ev.warn = Math.min(ev.warn + 0.5, 60)
        if (ev.t <= 0) {
          S.event = null
          S.eventCooldown = nextEventCooldown(S.mod)
          const bonus = gain(150 * (S.mod?.napBonusMult || 1))
          S.score += bonus
          S.crowd = clamp(S.crowd + 15, 0, 100)
          S.stats.naps++
          sndSuccess()
          addToast(`😴 没吵醒他！+${bonus}`, true)
        }
      } else if (ev.type === 'duet') {
        if (ev.stage === 'call') {
          if (ev.callT-- <= 0) {
            ev.callT = 40
            ev.calls--
            sndWildWa()
            ev.pulse = 20
            if (ev.calls <= 0) {
              ev.stage = 'answer'
              ev.t = 200
              addToast('🎵 轮到你了！稳住绿区应和！')
            }
          }
        } else {
          ev.t--
          if (inZone() && S.broken === 0 && !S.pinched) ev.good = (ev.good || 0) + 1
          if (ev.t <= 0) {
            const ok = (ev.good || 0) > 110
            S.event = null
            S.eventCooldown = nextEventCooldown(S.mod)
            if (ok) {
              const bonus = gain(250 * (S.mod?.duetMultBonus || 1))
              S.score += bonus
              S.crowd = clamp(S.crowd + 25, 0, 100)
              S.stats.duets++
              sndSuccess(); burstConfetti(16)
              addToast(`🐝 完美对唱！+${bonus}`, true)
            } else {
              addToast('💨 没跟上节奏…下次再来')
            }
          }
        }
      } else if (ev.type === 'cat') {
        if (ev.stage === 'stalk') {
          ev.t--
          const x0 = ev.fromLeft ? -24 : W + 24
          const target = ev.fromLeft ? CX - 55 : CX + 55
          ev.px = x0 + (target - x0) * (1 - ev.t / 300)
          const scaring = S.speed >= 0.765 && S.broken === 0
          if (scaring) ev.scare += 1
          else ev.scare = Math.max(0, ev.scare - 0.4)
          if (ev.scare >= 80) {
            // 吓退成功
            ev.stage = 'flee'; ev.t = 44
            const bonus = gain(200)
            S.score += bonus
            S.crowd = clamp(S.crowd + 15, 0, 100)
            S.stats.cats++
            sndMeow(); sndSuccess(); burstConfetti(14)
            addToast(`🐱💨 吓跑野猫！+${bonus}`, true)
          } else if (ev.t <= 0) {
            // 扑到了：拍断线
            S.event = null
            S.eventCooldown = nextEventCooldown(S.mod)
            if (S.broken === 0) { S.broken = 70; S.speed = 0; S.tension = 0; S.brokenN++ }
            S.combo = 0
            S.crowd = clamp(S.crowd - 20, 0, 100)
            sndSnap(); sndMeow(); S.shake = 12
            addToast('🐱 被野猫拍了一爪，线断了！', true)
          }
        } else {
          ev.t--
          ev.px += ev.fromLeft ? -7 : 7
          if (ev.t <= 0) { S.event = null; S.eventCooldown = nextEventCooldown(S.mod) }
        }
      } else if (ev.type === 'golden') {
        ev.t--
        if (!ev.caught && inZone() && S.broken === 0 && !S.pinched) {
          ev.caught = true
          const bonus = gain(500)
          S.score += bonus
          S.crowd = clamp(S.crowd + 20, 0, 100)
          S.stats.golden++
          sndChime(); burstConfetti(24)
          addToast(`🪙 接住金蝉！+${bonus}`, true)
        }
        if (ev.t <= 0) {
          S.event = null
          S.eventCooldown = nextEventCooldown(S.mod)
          if (!ev.caught) { sndWhiff(); addToast('💫 金蝉一闪而过…') }
        }
      }
      if (ev?.pulse > 0) ev.pulse--
    }

    // ---------- 绘制 ----------
    const drawBackground = () => {
      const dark = !!S.mod?.dark
      const bg = S.mod?.bg
      const feverT = S.fever > 0 ? 0.5 + 0.5 * Math.sin(S.tick * 0.2) : 0
      const g = ctx.createLinearGradient(0, 0, 0, H)
      if (S.fever > 0) {
        g.addColorStop(0, `hsl(${(S.tick * 2) % 360}, 45%, 82%)`)
        g.addColorStop(1, '#e8d2a0')
      } else if (bg && S.mod?.bg2) {
        // 晨昏时辰：局内进度从 bg 过渡到 bg2
        const prog = 1 - clamp(S.timeLeft / (ROUND_TIME * 60), 0, 1)
        const mix = (a, b, t) => {
          const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16))
          const pb = b.match(/\w\w/g).map((h) => parseInt(h, 16))
          return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`
        }
        g.addColorStop(0, mix(bg.top.replace('#', ''), S.mod.bg2.top.replace('#', ''), prog))
        g.addColorStop(1, mix(bg.bottom.replace('#', ''), S.mod.bg2.bottom.replace('#', ''), prog))
      } else if (bg) {
        g.addColorStop(0, bg.top)
        g.addColorStop(1, bg.bottom)
      } else {
        g.addColorStop(0, '#f7e9c8')
        g.addColorStop(1, '#e8d2a0')
      }
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
      if (S.mod?.thunder && S.fever <= 0) {
        S.thunderTimer = (S.thunderTimer ?? rand(160, 260)) - 1
        if (S.thunderTimer <= 0) {
          S.thunderTimer = rand(220, 360)
          S.shake = 4
          sndThunder()
        }
      }
      if (S.mod?.lightning && S.fever <= 0) {
        S.lightningTimer = (S.lightningTimer ?? rand(140, 240)) - 1
        if (S.lightningTimer <= 0) {
          S.lightningTimer = rand(200, 340)
          S.flash = 1
          sndLightning()
        }
      }
      if (S.mod?.stars && S.fever <= 0) {
        for (let i = 0; i < 24; i++) {
          const sx = (i * 97 + 23) % W
          const sy = (i * 53 + 11) % 210
          ctx.fillStyle = `rgba(255,244,214,${0.2 + 0.3 * Math.abs(Math.sin(S.tick * 0.04 + i))})`
          ctx.fillRect(sx, sy, 2, 2)
        }
      }
      if (S.mod?.moon && S.fever <= 0) {
        const mx = W - 76, my = 64
        const halo = ctx.createRadialGradient(mx, my, 6, mx, my, 46)
        halo.addColorStop(0, 'rgba(255,244,214,0.35)')
        halo.addColorStop(1, 'rgba(255,244,214,0)')
        ctx.fillStyle = halo
        ctx.beginPath(); ctx.arc(mx, my, 46, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#fff6df'
        ctx.beginPath(); ctx.arc(mx, my, 22, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = 'rgba(210,195,150,0.4)'
        ctx.beginPath(); ctx.arc(mx - 7, my - 5, 4, 0, Math.PI * 2); ctx.arc(mx + 6, my + 7, 3, 0, Math.PI * 2); ctx.fill()
      }
      for (let i = 0; i < 4; i++) {
        const lx = 60 + i * 120
        const sway = Math.sin(S.tick * (S.fever > 0 ? 0.12 : 0.02) + i) * (S.fever > 0 ? 9 : 4)
        if (dark) {
          const glow = ctx.createRadialGradient(lx + sway, 48, 4, lx + sway, 48, 42)
          glow.addColorStop(0, 'rgba(255,176,70,0.4)')
          glow.addColorStop(1, 'rgba(255,176,70,0)')
          ctx.fillStyle = glow
          ctx.beginPath(); ctx.arc(lx + sway, 48, 42, 0, Math.PI * 2); ctx.fill()
        }
        ctx.strokeStyle = dark ? '#7d6440' : '#a8834f'; ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx + sway, 34); ctx.stroke()
        ctx.fillStyle = feverT > 0 ? `hsl(${(S.tick * 3 + i * 90) % 360}, 70%, 55%)` : (dark ? '#e85a48' : '#d9463e')
        ctx.beginPath(); ctx.ellipse(lx + sway, 48, 15, 18, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#f2b632'; ctx.fillRect(lx + sway - 6, 28, 12, 5); ctx.fillRect(lx + sway - 5, 64, 10, 4)
      }
    }

    // ---------- 环境粒子：雨/雪/花瓣/落叶/纸屑/萤火/雾团，按 mod.particle 统一生成与绘制 ----------
    const spawnScenery = () => {
      const p = S.mod?.particle
      if (p && Math.random() < p.rate * 0.6) {
        const kind = p.kind
        if (kind === 'firefly') S.scenery.push({ kind, x: rand(0, W), y: rand(70, 380), ph: rand(0, 6), vx: rand(-0.25, 0.25), life: rand(300, 500) })
        else if (kind === 'rain') S.scenery.push({ kind, x: rand(-20, W + 20), y: -10, vy: rand(9, 14), len: rand(14, 22), life: 90 })
        else if (kind === 'fogpuff') S.scenery.push({ kind, x: rand(0, W), y: rand(40, 300), r: rand(50, 100), vx: rand(-0.15, 0.15), a: rand(0.05, 0.12), life: 500 })
        else if (kind === 'wave') S.scenery.push({ kind, x: rand(-30, W + 30), y: rand(420, 600), vx: rand(0.3, 0.8), amp: rand(4, 10), w: rand(50, 100), life: rand(200, 320) })
        else if (kind === 'star') S.scenery.push({ kind, x: rand(0, W), y: rand(20, 300), ph: rand(0, 6), life: rand(300, 500) })
        else if (kind === 'spark') S.scenery.push({ kind, x: rand(0, W), y: rand(0, 150), vx: rand(-1, 1), vy: rand(1, 3), life: rand(18, 32) })
        else S.scenery.push({ kind, x: rand(-10, W + 10), y: -10, vy: rand(0.6, 1.6), vx: rand(-0.4, 0.4), rot: rand(0, 6), vr: rand(-0.05, 0.05), life: 260 }) // snow/petal/leaf/confetti
      }
      S.scenery.forEach((s) => {
        s.life--
        if (s.kind === 'rain') s.y += s.vy
        else if (s.kind === 'firefly' || s.kind === 'fogpuff' || s.kind === 'wave') s.x += s.vx
        else if (s.kind === 'star') { /* 静止闪烁 */ }
        else if (s.kind === 'spark') { s.x += s.vx; s.y += s.vy }
        else { s.y += s.vy; s.x += s.vx; s.rot = (s.rot || 0) + (s.vr || 0) }
      })
      S.scenery = S.scenery.filter((s) => s.life > 0 && s.y < H + 30)
    }
    const drawScenery = () => {
      const p = S.mod?.particle
      if (!p) return
      const col = p.color || '255,255,255'
      S.scenery.forEach((s) => {
        if (s.kind === 'rain') {
          ctx.strokeStyle = `rgba(${col},0.5)`; ctx.lineWidth = 1.4
          ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - 2, s.y + s.len); ctx.stroke()
        } else if (s.kind === 'firefly') {
          const a = 0.35 + 0.35 * Math.sin(S.tick * 0.09 + s.ph * 2)
          ctx.fillStyle = `rgba(${col},${Math.max(0.08, a)})`
          ctx.beginPath(); ctx.arc(s.x, s.y + Math.sin(S.tick * 0.03 + s.ph) * 18, 2.2, 0, Math.PI * 2); ctx.fill()
        } else if (s.kind === 'fogpuff') {
          ctx.fillStyle = `rgba(${col},${s.a})`
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill()
        } else if (s.kind === 'wave') {
          ctx.strokeStyle = `rgba(${col},0.4)`; ctx.lineWidth = 1.6
          ctx.beginPath()
          for (let i = 0; i <= s.w; i += 6) ctx.lineTo(s.x + i, s.y + Math.sin((i + S.tick * 2) * 0.15) * s.amp)
          ctx.stroke()
        } else if (s.kind === 'star') {
          const a = 0.3 + 0.5 * Math.abs(Math.sin(S.tick * 0.06 + s.ph))
          ctx.fillStyle = `rgba(${col},${a})`
          ctx.beginPath(); ctx.arc(s.x, s.y, 1.6, 0, Math.PI * 2); ctx.fill()
        } else if (s.kind === 'spark') {
          ctx.strokeStyle = `rgba(${col},${clamp(s.life / 24, 0, 1)})`; ctx.lineWidth = 1.6
          ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 3, s.y - s.vy * 3); ctx.stroke()
        } else {
          ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot || 0)
          ctx.fillStyle = `rgba(${col},0.85)`
          if (s.kind === 'confetti') ctx.fillRect(-3, -2, 6, 4)
          else { ctx.beginPath(); ctx.ellipse(0, 0, 3.4, 2.2, 0, 0, Math.PI * 2); ctx.fill() }
          ctx.restore()
        }
      })
    }

    const drawEventNPC = () => {
      const ev = S.event
      if (!ev) return
      if (ev.type === 'nap') {
        const x = ev.x, y = 150
        // 摇椅老爷爷
        ctx.fillStyle = '#8a6a3c'
        ctx.beginPath(); ctx.arc(x, y + 22, 20, 0.2, Math.PI - 0.2); ctx.stroke()
        ctx.fillStyle = '#6b6b6b'
        ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill() // 头
        ctx.fillStyle = '#eee'
        ctx.fillRect(x - 8, y + 4, 16, 3) // 白胡子
        ctx.fillStyle = '#5b7fa6'
        ctx.beginPath(); ctx.roundRect(x - 12, y + 10, 24, 20, 4); ctx.fill()
        const noisy = S.speed > 0.1 && !S.pinched
        ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'
        if (noisy) {
          ctx.fillStyle = '#d9463e'
          ctx.fillText('❗', x, y - 22 - Math.sin(S.tick * 0.3) * 3)
          // 吵醒倒计条
          ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x - 24, y - 44, 48, 6)
          ctx.fillStyle = '#d9463e'; ctx.fillRect(x - 24, y - 44, 48 * (ev.warn / 60), 6)
        } else {
          ctx.fillStyle = '#5b7fa6'
          ctx.fillText('💤', x + 14, y - 18 - (S.tick % 60) * 0.2)
        }
        // 剩余时间
        ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(x - 24, y + 38, 48, 5)
        ctx.fillStyle = '#5aaa5a'; ctx.fillRect(x - 24, y + 38, 48 * (ev.t / 240), 5)
      } else if (ev.type === 'duet') {
        const x = ev.x, y = 130
        // 小树 + 野蝉
        ctx.fillStyle = '#8a6a3c'; ctx.fillRect(x - 4, y + 10, 8, 40)
        ctx.fillStyle = '#5f8a4a'
        ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.arc(x - 18, y + 12, 18, 0, Math.PI * 2); ctx.arc(x + 18, y + 12, 18, 0, Math.PI * 2); ctx.fill()
        const pulse = ev.pulse > 0 ? 1 + ev.pulse * 0.02 : 1
        ctx.save(); ctx.translate(x + 6, y - 2); ctx.scale(pulse, pulse)
        ctx.fillStyle = '#4a3a2a'
        ctx.beginPath(); ctx.ellipse(0, 0, 8, 5, 0.4, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
        if (ev.pulse > 12) {
          ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = '#7a5a2a'; ctx.textAlign = 'center'
          ctx.fillText('哇~', x + 26, y - 12)
        }
        if (ev.stage === 'answer') {
          ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(x - 26, y + 56, 52, 6)
          ctx.fillStyle = '#f2b632'; ctx.fillRect(x - 26, y + 56, 52 * clamp((ev.good || 0) / 110, 0, 1), 6)
        }
      } else if (ev.type === 'cat') {
        const x = ev.px, y = CY + 128
        const dirC = ev.fromLeft ? 1 : -1 // 面向场中央
        const bob = Math.sin(S.tick * 0.25) * (ev.stage === 'flee' ? 4 : 1.5)
        ctx.save(); ctx.translate(x, y + bob); ctx.scale(dirC, 1)
        ctx.strokeStyle = '#4c4c56'; ctx.lineWidth = 4; ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(-16, -2)
        ctx.quadraticCurveTo(-30, -8 - Math.sin(S.tick * 0.15) * 6, -26, -20); ctx.stroke()
        ctx.fillStyle = '#565660'
        ctx.beginPath(); ctx.ellipse(-4, -6, 16, 10, 0, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(12, -14, 9, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath()
        ctx.moveTo(6, -20); ctx.lineTo(8, -28); ctx.lineTo(12, -21); ctx.closePath()
        ctx.moveTo(14, -21); ctx.lineTo(18, -28); ctx.lineTo(19, -19); ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#ffd76b'
        ctx.beginPath(); ctx.ellipse(10, -14, 2.2, 3, 0, 0, Math.PI * 2); ctx.ellipse(16, -13, 2.2, 3, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#222'
        ctx.fillRect(9.4, -16.5, 1.4, 5); ctx.fillRect(15.4, -15.5, 1.4, 5)
        ctx.strokeStyle = 'rgba(230,230,230,0.7)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(18, -12); ctx.lineTo(26, -13); ctx.moveTo(18, -10); ctx.lineTo(26, -9); ctx.stroke()
        ctx.restore()
        const scaring = S.speed >= 0.765 && S.broken === 0 && ev.stage === 'stalk'
        ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'
        if (ev.stage === 'flee') ctx.fillText('💨', x - dirC * 18, y - 34)
        else if (scaring) ctx.fillText('😾', x, y - 36 - Math.sin(S.tick * 0.4) * 2)
        if (ev.stage === 'stalk') {
          ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x - 22, y + 16, 44, 5)
          ctx.fillStyle = '#f2a232'; ctx.fillRect(x - 22, y + 16, 44 * clamp(ev.scare / 80, 0, 1), 5)
        }
      } else if (ev.type === 'golden') {
        // 金蝉一闪而过：从一侧掠向另一侧，划一道弧线，接住会留一圈闪光
        const p = 1 - ev.t / 100
        const gx = ev.fromLeft ? -20 + p * (W + 40) : W + 20 - p * (W + 40)
        const gy = 96 + Math.sin(p * Math.PI) * 46
        const glow = ctx.createRadialGradient(gx, gy, 2, gx, gy, ev.caught ? 30 : 20)
        glow.addColorStop(0, `rgba(255,224,120,${ev.caught ? 0.5 : 0.9})`)
        glow.addColorStop(1, 'rgba(255,224,120,0)')
        ctx.fillStyle = glow
        ctx.beginPath(); ctx.arc(gx, gy, ev.caught ? 30 : 20, 0, Math.PI * 2); ctx.fill()
        if (!ev.caught) {
          ctx.save(); ctx.translate(gx, gy); ctx.rotate(Math.sin(S.tick * 0.5) * 0.3)
          ctx.fillStyle = '#ffd76b'
          ctx.beginPath(); ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = '#fff3c4'
          ctx.beginPath(); ctx.ellipse(-(ev.fromLeft ? 1 : -1) * 10, 0, 5, 2.4, 0, 0, Math.PI * 2); ctx.fill()
          ctx.restore()
        } else {
          ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#f2b632'
          ctx.fillText('✨', gx, gy - 22)
        }
      }
    }

    const drawSpeedGauge = () => {
      const dark = !!S.mod?.dark
      const gx = CX, gy = H - 128, r = 82
      ctx.lineWidth = 14
      ctx.strokeStyle = dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)'
      ctx.beginPath(); ctx.arc(gx, gy, r, Math.PI, 0); ctx.stroke()
      const toA = (v) => Math.PI + clamp(v / 1.125, 0, 1) * Math.PI
      const widen = S.fever > 0 ? 0.05 : 0
      ctx.strokeStyle = S.fever > 0 ? 'rgba(242,182,50,0.95)' : 'rgba(90,170,90,0.85)'
      ctx.beginPath(); ctx.arc(gx, gy, r, toA(S.zone.lo - widen), toA(S.zone.hi + widen)); ctx.stroke()
      ctx.strokeStyle = 'rgba(217,70,62,0.7)'
      ctx.beginPath(); ctx.arc(gx, gy, r, toA(0.945), toA(1.125)); ctx.stroke()
      // 猫事件：吓退橙区
      if (S.event?.type === 'cat' && S.event.stage === 'stalk') {
        ctx.strokeStyle = `rgba(242,150,50,${0.65 + 0.3 * Math.sin(S.tick * 0.25)})`
        ctx.beginPath(); ctx.arc(gx, gy, r, toA(0.765), toA(0.945)); ctx.stroke()
      }
      // 内圈：飞天值
      ctx.lineWidth = 8
      ctx.strokeStyle = dark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.09)'
      ctx.beginPath(); ctx.arc(gx, gy, 60, Math.PI, 0); ctx.stroke()
      const flyFull = S.flyCharge >= 100
      ctx.strokeStyle = flyFull
        ? `rgba(255,190,60,${0.7 + 0.3 * Math.sin(S.tick * 0.3)})`
        : 'rgba(242,166,50,0.75)'
      ctx.beginPath(); ctx.arc(gx, gy, 60, Math.PI, Math.PI + (clamp(S.flyCharge, 0, 100) / 100) * Math.PI); ctx.stroke()
      const na = toA(S.speed)
      ctx.strokeStyle = dark ? '#ece0c2' : '#333'; ctx.lineWidth = 4
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(na) * (r - 4), gy + Math.sin(na) * (r - 4)); ctx.stroke()
      ctx.fillStyle = dark ? '#ece0c2' : '#333'; ctx.beginPath(); ctx.arc(gx, gy, 6, 0, Math.PI * 2); ctx.fill()
      ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = dark ? '#dccda4' : '#6b5836'
      const msg = S.flight > 0 ? '🛫 飞天表演中——哇！' :
        S.pinched ? '🤏 掐线中·蝉哑了' :
        S.event?.type === 'cat' && S.event.stage === 'stalk' ? '🐱 冲进橙区吓走野猫！' :
        flyFull ? '🚀 满弦！放飞 / 按 F / 摇一摇' :
        S.fever > 0 ? '🔥 狂欢中！分数翻倍！' :
        inZone() ? '🎵 完美节奏！保持住' :
        S.speed > S.zone.hi ? '⚠️ 太快了，线要断！' : '💨 画圈甩起来'
      ctx.fillText(msg, gx, gy + 26)
    }

    const drawCicada = (cx2, x, y, rot, alpha) => {
      const c = cx2
      c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha = alpha
      const flut = S.speed > 0.1 && !S.pinched ? Math.sin(S.tick * 1.2) * 0.18 : 0
      const wing = (side) => {
        c.save(); c.rotate(side * (0.32 + flut * side))
        const wg = c.createLinearGradient(0, 0, -44, 0)
        wg.addColorStop(0, '#e6d3ac'); wg.addColorStop(1, '#cdb384')
        c.fillStyle = wg; c.strokeStyle = '#b09468'; c.lineWidth = 1.2
        c.beginPath(); c.ellipse(-24, side * 5, 24, 7.5, side * 0.12, 0, Math.PI * 2); c.fill(); c.stroke()
        c.strokeStyle = 'rgba(150,120,80,0.5)'
        c.beginPath(); c.moveTo(-4, side * 3); c.lineTo(-44, side * 7); c.stroke()
        c.restore()
      }
      wing(-1); wing(1)
      const bg = c.createLinearGradient(0, -9, 0, 9)
      bg.addColorStop(0, '#dcc79c'); bg.addColorStop(0.45, '#efe0bc'); bg.addColorStop(1, '#c4aa7c')
      c.fillStyle = bg; c.strokeStyle = '#a8894f'; c.lineWidth = 1
      c.beginPath(); c.roundRect(-14, -9, 26, 18, 4); c.fill(); c.stroke()
      c.fillStyle = '#d9463e'
      c.beginPath(); c.roundRect(8, -9, 6, 18, [0, 4, 4, 0]); c.fill()
      c.fillStyle = '#b8352e'
      c.beginPath(); c.ellipse(14, 0, 2.5, 9, 0, 0, Math.PI * 2); c.fill()
      c.fillStyle = '#1a1a1a'
      c.beginPath(); c.arc(10, -8, 3, 0, Math.PI * 2); c.arc(10, 8, 3, 0, Math.PI * 2); c.fill()
      c.fillStyle = 'rgba(255,255,255,0.7)'
      c.beginPath(); c.arc(9, -9, 1, 0, Math.PI * 2); c.arc(9, 7, 1, 0, Math.PI * 2); c.fill()
      c.restore()
    }

    const drawToy = () => {
      ctx.save()
      ctx.translate(CX, CY)
      ctx.save()
      ctx.rotate(0.35)
      const hg = ctx.createLinearGradient(-3, 0, 3, 0)
      hg.addColorStop(0, '#c8ab74'); hg.addColorStop(0.5, '#e2cb9b'); hg.addColorStop(1, '#b3945c')
      ctx.fillStyle = hg
      ctx.beginPath(); ctx.roundRect(-3, -12, 6, 78, 3); ctx.fill()
      // 松香段（发亮的一小截）
      ctx.fillStyle = 'rgba(255,220,120,0.8)'
      ctx.beginPath(); ctx.roundRect(-3, -12, 6, 16, 3); ctx.fill()
      ctx.restore()

      const R = 120
      const droop = clamp(26 - S.speed * 70, 0, 26) // 重力：转速越低越往下坠，甩快了离心力甩平
      const bx = Math.cos(S.angle) * R
      const by = Math.sin(S.angle) * R * 0.55 + droop

      // 软绳手感：蝉的视觉位置不直接等于目标点，而是弹簧-阻尼追赶目标，
      // 体现加速度与惯性——甩快了蝉会滞后甩出去，减速/掐线时还会因惯性晃一下才收住。
      if (S.broken <= 0 && S.flight <= 0) {
        const kSpring = 0.22, damping = 0.72
        S.cicVX = (S.cicVX + (bx - S.cicX) * kSpring) * damping
        S.cicVY = (S.cicVY + (by - S.cicY) * kSpring) * damping
        S.cicPrevX = S.cicX; S.cicPrevY = S.cicY
        S.cicX += S.cicVX; S.cicY += S.cicVY
      }
      const vx = S.cicX - S.cicPrevX, vy = S.cicY - S.cicPrevY

      if (S.flight > 0) {
        // 蝉飞走了，空线松松地飘
        ctx.strokeStyle = '#c9b891'
        ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.moveTo(0, -8)
        ctx.quadraticCurveTo(26, 30 + Math.sin(S.tick * 0.1) * 8, 8, 74)
        ctx.stroke()
      } else if (S.broken > 0) {
        // 断线：沿甩动惯性甩出 + 真实抛物线下坠（先上抛一点，再被重力拉回落地）
        const t = 1 - S.broken / 70
        const fallX = S.cicX + (S.cicX + vx * 22) * 1.8 * t
        const fallY = S.cicY - 50 * t + 330 * t * t
        drawCicada(ctx, fallX, fallY, S.angle + t * 10, 1 - t * 0.4)
        ctx.strokeStyle = '#c9b8917f'
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(S.cicX * 0.4, S.cicY * 0.4); ctx.stroke()
      } else {
        const tn = clamp(S.tension, 0, 1)
        ctx.strokeStyle = `rgb(${140 + tn * 100}, ${120 - tn * 60}, ${90 - tn * 50})`
        ctx.lineWidth = 1.5 + S.speed * 3
        ctx.beginPath(); ctx.moveTo(0, -8)
        // 绳子的弯曲控制点随蝉的视觉速度偏移：甩得越快、绳子甩得越弯，静止时自然下垂
        const sag = clamp(30 - S.speed * 90, 0, 30)
        const whip = clamp(vx * -2.2, -22, 22)
        ctx.quadraticCurveTo(S.cicX * 0.5 + whip, S.cicY * 0.5 + sag - vy * 1.5, S.cicX, S.cicY)
        ctx.stroke()
        ;[0.3, 0.45].forEach((t, i) => {
          const px = S.cicX * t + whip * (1 - t) * 0.6
          const py = S.cicY * t + sag * 4 * t * (1 - t)
          ctx.fillStyle = i === 0 ? '#d9463e' : '#c23a32'
          ctx.beginPath(); ctx.arc(px, py, 4.5 - i, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = 'rgba(255,255,255,0.6)'
          ctx.beginPath(); ctx.arc(px - 1.5, py - 1.5, 1.2, 0, Math.PI * 2); ctx.fill()
        })
        if (S.pinched) {
          ctx.fillStyle = '#f2d1a9'
          ctx.beginPath(); ctx.arc(S.cicX * 0.18, S.cicY * 0.18 - 4, 7, 0, Math.PI * 2); ctx.fill()
          ctx.beginPath(); ctx.arc(S.cicX * 0.18 + 6, S.cicY * 0.18 + 2, 6, 0, Math.PI * 2); ctx.fill()
        }
        drawCicada(ctx, S.cicX, S.cicY, S.angle + Math.PI / 2 + whip * 0.01, 1)
      }
      ctx.restore()
    }

    // 🚀 飞天：螺旋上升 + 金色拖尾（纯视觉，按显示帧推进即可）
    const drawFlight = () => {
      const p = 1 - S.flight / 170
      const arc = 4 * p * (1 - p) // 抛物线：0→1→0，真实的抛起再被重力拉回落下
      const fx = CX + Math.sin(p * 14) * 70 * (1 - p * 0.75)
      const fy = CY + 30 - arc * 300
      const rot = Math.sin(p * 14) * 0.6 - 0.2 + (p - 0.5) * 0.5
      S.trail.push({ x: fx + rand(-3, 3), y: fy + 10 + rand(-3, 3), life: 26 })
      S.trail.forEach((t) => {
        ctx.globalAlpha = clamp(t.life / 26, 0, 1) * 0.8
        ctx.fillStyle = '#ffd966'
        ctx.beginPath(); ctx.arc(t.x, t.y, 2 + (26 - t.life) * 0.08, 0, Math.PI * 2); ctx.fill()
        t.life--
      })
      ctx.globalAlpha = 1
      S.trail = S.trail.filter((t) => t.life > 0)
      if (fy > -40) drawCicada(ctx, fx, fy, rot, 1)
      if (p < 0.25) {
        ctx.globalAlpha = Math.max(0, 1 - p * 4)
        ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'
        ctx.fillStyle = '#d9463e'
        ctx.fillText('嘎哇——！', fx, fy - 26)
        ctx.globalAlpha = 1
      }
    }

    const drawCrowd = () => {
      const dark = !!S.mod?.dark
      const gy = H - 46
      ctx.fillStyle = dark ? '#4e4234' : '#d9c49a'
      ctx.fillRect(0, gy - 14, W, 60)
      S.crowdFaces.forEach((f, i) => {
        const jy = gy - f.jump
        ctx.fillStyle = ['#c46a4f', '#5b7fa6', '#7a9a5b', '#a67ab0'][i % 4]
        ctx.beginPath(); ctx.arc(f.x, jy, 13, Math.PI, 0); ctx.fill()
        ctx.fillStyle = '#f2d1a9'
        ctx.beginPath(); ctx.arc(f.x, jy - 18, 9, 0, Math.PI * 2); ctx.fill()
        if (f.wa > 0) {
          ctx.fillStyle = '#7a3030'
          ctx.beginPath(); ctx.ellipse(f.x, jy - 15, 3, 4, 0, 0, Math.PI * 2); ctx.fill()
          ctx.font = 'bold 13px sans-serif'
          ctx.fillStyle = `rgba(200,80,60,${clamp(f.wa / 30, 0, 1)})`
          ctx.fillText('哇', f.x + 10, jy - 30 - (30 - f.wa) * 0.8)
          f.wa--
        } else {
          ctx.fillStyle = '#7a3030'
          ctx.fillRect(f.x - 2, jy - 15, 4, 1.5)
        }
        if (f.jump > 0) f.jump *= 0.85
      })
      ctx.fillStyle = 'rgba(0,0,0,0.15)'
      ctx.fillRect(20, gy + 26, W - 40, 10)
      const grd = ctx.createLinearGradient(20, 0, W - 20, 0)
      grd.addColorStop(0, '#f2b632'); grd.addColorStop(1, '#d9463e')
      ctx.fillStyle = grd
      ctx.fillRect(20, gy + 26, (S.crowd / 100) * (W - 40), 10)
      ctx.font = '12px sans-serif'; ctx.fillStyle = dark ? '#dccda4' : '#6b5836'; ctx.textAlign = 'left'
      ctx.fillText(S.fever > 0 ? `🔥 狂欢 ${Math.ceil(S.fever / 60)}s` : '观众欢呼度', 20, gy + 22)
    }

    const step = () => {
      S.tick++
      if (phase === 'playing') {
        const baseDecay = S.pinched ? 0.968 : 0.975 // 掐线时略微更耗速
        S.speed *= 1 - (1 - baseDecay) * (S.mod?.decayMult ?? 1)
        if (S.speed < 0.002) S.speed = 0
        S.angle += S.speed
        S.voice?.set(S.broken > 0 ? 0 : S.speed * 2, S.pinched, S.angle)

        if (S.speed > 0.945) {
          S.tension += 0.02 * (S.mod?.snapMult ?? 1)
          if (S.tension >= 1 && S.broken === 0) {
            S.broken = 70; S.speed = 0; S.tension = 0; S.combo = 0; S.brokenN++
            S.crowd = clamp(S.crowd - 30, 0, 100)
            sndSnap(); S.shake = 14
            addToast('💥 甩太猛，线断了！', true)
          }
        } else S.tension = clamp(S.tension - 0.015, 0, 1)
        if (S.broken > 0) S.broken--
        if (S.flight > 0) {
          S.flight--
          if (S.flight === 0) addToast('🪢 重新系上，接着甩！')
        }

        const scoring = inZone() && S.broken === 0 && !S.pinched && S.flight === 0
        if (scoring) {
          S.inZoneFrames++
          S.crowd = clamp(S.crowd + (S.fever > 0 ? 0.1 : 0.22), 0, 100)
          // 甜蜜区里蓄"飞天值"，狂欢时蓄得更快
          const before = S.flyCharge
          S.flyCharge = clamp(S.flyCharge + (S.fever > 0 ? 0.4 : 0.22), 0, 100)
          if (before < 100 && S.flyCharge >= 100) {
            addToast('🚀 弦满了！放飞它！', true)
            sndCombo(10)
          }
          if (S.inZoneFrames % 30 === 0) {
            S.combo++; S.comboT = 90
            if (S.combo > S.maxCombo) S.maxCombo = S.combo
            const mult = S.fever > 0 ? 2 : 1
            const pts = gain(5 * Math.min(S.combo, 15) * mult)
            S.score += pts
            sndCombo(S.combo)
            S.notes.push({ x: CX + rand(-60, 60), y: CY - 40, vy: -1.5, life: 50, s: pts, fever: S.fever > 0 })
            if (S.combo % 6 === 0) addToast(`🔥 ${S.combo} 连拍！`)
          }
        } else {
          S.inZoneFrames = 0
          if (S.flyCharge < 100) S.flyCharge = clamp(S.flyCharge - 0.05, 0, 100)
          if (!S.pinched) S.crowd = clamp(S.crowd - 0.12, 0, 100)
          if (S.comboT > 0) S.comboT--
          else S.combo = 0
        }

        // 甜蜜区漂移（狂欢时不漂移）
        if (S.fever <= 0) {
          S.zoneTimer++
          if (S.zoneTimer > (S.mod?.driftFrames || 300)) {
            S.zoneTimer = 0
            S.zone = rollZone(S.mod)
            addToast('🎯 节奏变了，跟上！')
          }
        } else {
          S.fever--
          if (S.fever === 0) addToast('狂欢结束，稳住节奏~')
        }

        // 欢呼度满 -> 狂欢模式
        if (S.crowd >= (S.mod?.feverThreshold ?? 100) && S.fever <= 0) {
          S.crowd = 30
          S.fever = 8 * 60
          S.stats.feverN++
          S.score += gain(100)
          sndCrowdWa(); sndFanfare()
          S.shake = 10
          burstConfetti(50)
          addToast('🏮 哇声一片！狂欢开始！×2', true)
          S.crowdFaces.forEach((f) => { f.jump = rand(14, 24); f.wa = 40 })
        }
        if (S.crowd > 25 && S.tick % Math.max(20, 90 - S.crowd) === 0) {
          const f = S.crowdFaces[Math.floor(rand(0, S.crowdFaces.length))]
          f.wa = 26; f.jump = rand(6, 12)
          if (Math.random() < 0.4) beep(rand(300, 380), 0.3, 'sine', 0.04, -80)
        }

        updateEvent()

        if (S.speed > 0.12 && !S.pinched && S.tick % 12 === 0) S.waves.push({ r: 30, life: 40 })

        S.timeLeft--
        if (S.timeLeft <= 0) {
          S.voice?.set(0, false)
          const res = {
            score: S.score, title: getTitle(S.score), stats: { ...S.stats },
            maxCombo: S.maxCombo, brokenN: S.brokenN, mod: S.mod,
          }
          // 结算印章：新获得的存入本机
          const seenMods = addSeenMod(S.mod.id)
          const owned = readStamps()
          const newStamps = STAMPS.filter((s) => !owned.includes(s.id) && s.test(res, seenMods))
          const stampIds = [...owned, ...newStamps.map((s) => s.id)]
          if (newStamps.length) saveStamps(stampIds)
          res.newStamps = newStamps
          res.stampIds = stampIds
          setResult(res)
          onGameOver(res)
          setPhase('over')
          return true
        }
        if (S.tick % 6 === 0) {
          setHud({
            score: S.score, time: Math.ceil(S.timeLeft / 60), combo: S.combo,
            fly: S.flyCharge >= 100 && S.flight === 0 && S.broken === 0,
          })
        }
      }

      spawnScenery()
      S.waves.forEach((w) => { w.r += 2.5; w.life-- })
      S.waves = S.waves.filter((w) => w.life > 0)
      S.notes.forEach((n) => { n.y += n.vy; n.life-- })
      S.notes = S.notes.filter((n) => n.life > 0)
      S.toasts.forEach((t) => { t.y -= 0.5; t.life-- })
      S.toasts = S.toasts.filter((t) => t.life > 0)
      S.confetti.forEach((c) => { c.x += c.vx; c.y += c.vy; c.rot += c.vr; c.life-- })
      S.confetti = S.confetti.filter((c) => c.life > 0 && c.y < H + 20)
      if (S.shake > 0) { S.shake *= 0.85; if (S.shake < 0.5) S.shake = 0 }
      if (S.flash > 0) { S.flash *= 0.8; if (S.flash < 0.02) S.flash = 0 }
      return false
    }

    // ---- 绘制（每显示帧一次；模拟固定 60Hz，高刷屏不会再加速） ----
    const draw = () => {
      ctx.save()
      if (S.shake > 0) ctx.translate(rand(-1, 1) * S.shake * 0.5, rand(-1, 1) * S.shake * 0.5)
      drawBackground()
      S.waves.forEach((w) => {
        ctx.strokeStyle = `rgba(90,150,80,${clamp(w.life / 40, 0, 1) * 0.5})`
        ctx.lineWidth = 2
        ctx.beginPath(); ctx.arc(CX, CY, w.r, 0, Math.PI * 2); ctx.stroke()
      })
      drawEventNPC()
      drawToy()
      if (S.flight > 0) drawFlight()
      drawSpeedGauge()
      drawCrowd()
      drawScenery()
      S.confetti.forEach((c) => {
        ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot)
        ctx.fillStyle = c.color
        ctx.fillRect(-3, -2, 6, 4)
        ctx.restore()
      })
      S.notes.forEach((n) => {
        ctx.globalAlpha = clamp(n.life / 30, 0, 1)
        ctx.font = `bold ${n.fever ? 18 : 16}px sans-serif`
        ctx.fillStyle = n.fever ? '#d9463e' : (S.mod?.dark ? '#ffd98a' : '#b8742e'); ctx.textAlign = 'center'
        ctx.fillText(`♪ +${n.s}`, n.x, n.y)
        ctx.globalAlpha = 1
      })
      S.toasts.forEach((t) => {
        ctx.globalAlpha = clamp(t.life / 40, 0, 1)
        ctx.font = `bold ${t.big ? 26 : 20}px "PingFang SC", sans-serif`
        ctx.textAlign = 'center'
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 4
        ctx.strokeText(t.text, CX, t.y)
        ctx.fillStyle = '#fff3d6'
        ctx.fillText(t.text, CX, t.y)
        ctx.globalAlpha = 1
      })
      if (S.flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${S.flash * 0.55})`
        ctx.fillRect(0, 0, W, H)
      }
      ctx.restore()
    }

    // 固定时间步：以真实时间累积、按 60Hz 步进模拟，120Hz 屏与 60Hz 屏手感一致
    const STEP = 1000 / 60
    let last = performance.now()
    let acc = 0
    const loop = (now) => {
      acc = Math.min(acc + (now - last), 120) // 后台切回时最多补 120ms，不快进
      last = now
      while (acc >= STEP) {
        acc -= STEP
        if (step()) { acc = 0; break }
      }
      draw()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  return (
    <div className="game-wrap" ref={wrapRef}>
      <Hud
        score={hud.score} combo={hud.combo} time={hud.time} playing={phase === 'playing'} best={best}
        soundOn={soundOn} onToggleSound={toggleSound}
        fsOk={fsOk} isFull={isFull} onToggleFull={toggleFull}
      />
      <div className="canvas-box">
        <canvas
          ref={canvasRef} width={W} height={H} className="game-canvas"
          onPointerDown={pDown} onPointerMove={pMove} onPointerUp={pUp} onPointerCancel={pUp}
          onContextMenu={(e) => e.preventDefault()}
        />
        {phase === 'playing' && (
          <button
            className="pinch-btn"
            onPointerDown={(e) => { e.preventDefault(); S.pinched = true }}
            onPointerUp={() => (S.pinched = false)}
            onPointerLeave={() => (S.pinched = false)}
            onPointerCancel={() => (S.pinched = false)}
            onContextMenu={(e) => e.preventDefault()}
          >🤏 掐线消音<span className="key-hint">（空格）</span></button>
        )}
        {phase === 'playing' && hud.fly && (
          <button className="fly-btn" onClick={tryFly}>🚀 放飞！</button>
        )}
        {phase === 'ready' && <ReadyOverlay onStart={start} />}
        {phase === 'over' && result && <GameOverOverlay result={result} best={best} onRestart={start} />}
      </div>
      <div className="hint">
        {phase === 'playing'
          ? `${modInfo ? `${modInfo.icon} ${modInfo.name} · ` : ''}持续画圈（甩出画面也不断）· 留意两侧突发事件`
          : '💡 开声音玩：蝉鸣是实时合成的'}
      </div>
    </div>
  )
}

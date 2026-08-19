import { clamp, rand } from '../utils.js'
import { inZone } from '../physics.js'
import { BREAK_SPEED, CAT_SCARE_HI, CAT_SCARE_LO, ROUND_TIME } from '../constants.js'

export function drawFrame(ctx, S) {
  const { w: W, h: H, cx: CX, cy: CY } = S.layout

  ctx.save()
  if (S.shake > 0) {
    ctx.translate(randShake(S.shake), randShake(S.shake))
  }

  drawBackground(ctx, S, W, H)
  updateAndDrawScenery(ctx, S, W, H)
  S.waves.forEach((wave) => {
    ctx.strokeStyle = `rgba(90,150,80,${clamp(wave.life / 40, 0, 1) * 0.5})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(CX, CY, wave.r, 0, Math.PI * 2)
    ctx.stroke()
  })
  drawEventNPC(ctx, S)
  if (S.flight > 0) drawFlight(ctx, S)
  else drawToy(ctx, S)
  drawSpeedGauge(ctx, S, W, H, CX)
  drawCrowd(ctx, S, W, H)

  if (S.flash > 0) {
    ctx.fillStyle = `rgba(255,255,240,${clamp(S.flash * 0.55, 0, 0.7)})`
    ctx.fillRect(0, 0, W, H)
  }

  S.confetti.forEach((c) => {
    ctx.save()
    ctx.translate(c.x, c.y)
    ctx.rotate(c.rot)
    ctx.fillStyle = c.color
    ctx.fillRect(-3, -2, 6, 4)
    ctx.restore()
  })
  S.notes.forEach((n) => {
    ctx.globalAlpha = clamp(n.life / 30, 0, 1)
    ctx.font = `bold ${n.fever ? 18 : 16}px "ZCOOL XiaoWei", "PingFang SC", sans-serif`
    ctx.fillStyle = n.fever ? '#d9463e' : '#b8742e'
    ctx.textAlign = 'center'
    ctx.fillText(`+${n.s}`, n.x, n.y)
    ctx.globalAlpha = 1
  })
  S.toasts.forEach((t) => {
    ctx.globalAlpha = clamp(t.life / 40, 0, 1)
    ctx.font = `bold ${t.big ? 24 : 18}px "ZCOOL XiaoWei", "PingFang SC", sans-serif`
    ctx.textAlign = 'center'
    ctx.strokeStyle = 'rgba(40,28,12,0.4)'
    ctx.lineWidth = 4
    ctx.strokeText(t.text, CX, t.y)
    ctx.fillStyle = '#fff6e4'
    ctx.fillText(t.text, CX, t.y)
    ctx.globalAlpha = 1
  })

  ctx.restore()
}

function randShake(s) {
  return (Math.random() * 2 - 1) * s * 0.5
}

function drawBackground(ctx, S, W, H) {
  const dark = !!S.mod?.dark
  const bg = S.mod?.bg
  const feverT = S.fever > 0 ? 0.5 + 0.5 * Math.sin(S.tick * 0.2) : 0
  const g = ctx.createLinearGradient(0, 0, 0, H)

  if (S.fever > 0) {
    g.addColorStop(0, `hsl(${(S.tick * 2) % 360}, 45%, 82%)`)
    g.addColorStop(1, '#e8d2a0')
  } else if (bg && S.mod?.bg2) {
    const prog =
      S.mode === 'endless'
        ? clamp(S.survived / (ROUND_TIME * 60 * 2), 0, 1)
        : 1 - clamp(S.timeLeft / (ROUND_TIME * 60), 0, 1)
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
    g.addColorStop(0, '#f3e4c4')
    g.addColorStop(0.55, '#e8d2a0')
    g.addColorStop(1, '#d4c08a')
  }
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  if (S.mod?.stars && S.fever <= 0) {
    for (let i = 0; i < 24; i++) {
      const sx = (i * 97 + 23) % W
      const sy = (i * 53 + 11) % 210
      ctx.fillStyle = `rgba(255,244,214,${0.2 + 0.3 * Math.abs(Math.sin(S.tick * 0.04 + i))})`
      ctx.fillRect(sx, sy, 2, 2)
    }
  }
  if (S.mod?.moon && S.fever <= 0) {
    const mx = W - 76
    const my = 64
    const halo = ctx.createRadialGradient(mx, my, 6, mx, my, 46)
    halo.addColorStop(0, 'rgba(255,244,214,0.35)')
    halo.addColorStop(1, 'rgba(255,244,214,0)')
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(mx, my, 46, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff6df'
    ctx.beginPath()
    ctx.arc(mx, my, 22, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(210,195,150,0.4)'
    ctx.beginPath()
    ctx.arc(mx - 7, my - 5, 4, 0, Math.PI * 2)
    ctx.arc(mx + 6, my + 7, 3, 0, Math.PI * 2)
    ctx.fill()
  }

  for (let i = 0; i < Math.ceil(W / 100); i++) {
    const lx = 40 + i * 110
    const sway = Math.sin(S.tick * (S.fever > 0 ? 0.12 : 0.02) + i) * (S.fever > 0 ? 9 : 4)
    if (dark) {
      const glow = ctx.createRadialGradient(lx + sway, 48, 4, lx + sway, 48, 42)
      glow.addColorStop(0, 'rgba(255,176,70,0.4)')
      glow.addColorStop(1, 'rgba(255,176,70,0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(lx + sway, 48, 42, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.strokeStyle = dark ? '#7d6440' : '#a8834f'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(lx, 0)
    ctx.lineTo(lx + sway, 34)
    ctx.stroke()
    ctx.fillStyle = feverT > 0 ? `hsl(${(S.tick * 3 + i * 90) % 360}, 70%, 55%)` : dark ? '#e85a48' : '#d9463e'
    ctx.beginPath()
    ctx.ellipse(lx + sway, 48, 15, 18, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#f2b632'
    ctx.fillRect(lx + sway - 6, 28, 12, 5)
    ctx.fillRect(lx + sway - 5, 64, 10, 4)
  }
}

function updateAndDrawScenery(ctx, S, W, H) {
  const p = S.mod?.particle
  if (!p) return
  if (!S.scenery) S.scenery = []

  if (Math.random() < p.rate * 0.6) {
    const kind = p.kind
    if (kind === 'firefly') {
      S.scenery.push({ kind, x: rand(0, W), y: rand(70, 380), ph: rand(0, 6), vx: rand(-0.25, 0.25), life: rand(300, 500) })
    } else if (kind === 'rain') {
      S.scenery.push({ kind, x: rand(-20, W + 20), y: -10, vy: rand(9, 14), len: rand(14, 22), life: 90 })
    } else if (kind === 'fogpuff') {
      S.scenery.push({ kind, x: rand(0, W), y: rand(40, 300), r: rand(50, 100), vx: rand(-0.15, 0.15), a: rand(0.05, 0.12), life: 500 })
    } else if (kind === 'wave') {
      S.scenery.push({ kind, x: rand(-30, W + 30), y: rand(H * 0.65, H * 0.92), vx: rand(0.3, 0.8), amp: rand(4, 10), w: rand(50, 100), life: rand(200, 320) })
    } else if (kind === 'star') {
      S.scenery.push({ kind, x: rand(0, W), y: rand(20, 300), ph: rand(0, 6), life: rand(300, 500) })
    } else if (kind === 'spark') {
      S.scenery.push({ kind, x: rand(0, W), y: rand(0, 150), vx: rand(-1, 1), vy: rand(1, 3), life: rand(18, 32) })
    } else {
      S.scenery.push({
        kind,
        x: rand(-10, W + 10),
        y: -10,
        vy: rand(0.6, 1.6),
        vx: rand(-0.4, 0.4),
        rot: rand(0, 6),
        vr: rand(-0.05, 0.05),
        life: 260,
      })
    }
  }

  S.scenery.forEach((s) => {
    s.life--
    if (s.kind === 'rain') s.y += s.vy
    else if (s.kind === 'firefly' || s.kind === 'fogpuff' || s.kind === 'wave') s.x += s.vx
    else if (s.kind === 'spark') {
      s.x += s.vx
      s.y += s.vy
    } else if (s.kind !== 'star') {
      s.y += s.vy
      s.x += s.vx
      s.rot = (s.rot || 0) + (s.vr || 0)
    }
  })
  S.scenery = S.scenery.filter((s) => s.life > 0 && s.y < H + 30)

  const col = p.color || '255,255,255'
  S.scenery.forEach((s) => {
    if (s.kind === 'rain') {
      ctx.strokeStyle = `rgba(${col},0.5)`
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(s.x, s.y)
      ctx.lineTo(s.x - 2, s.y + s.len)
      ctx.stroke()
    } else if (s.kind === 'firefly') {
      const a = 0.35 + 0.35 * Math.sin(S.tick * 0.09 + s.ph * 2)
      ctx.fillStyle = `rgba(${col},${Math.max(0.08, a)})`
      ctx.beginPath()
      ctx.arc(s.x, s.y + Math.sin(S.tick * 0.03 + s.ph) * 18, 2.2, 0, Math.PI * 2)
      ctx.fill()
    } else if (s.kind === 'fogpuff') {
      ctx.fillStyle = `rgba(${col},${s.a})`
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fill()
    } else if (s.kind === 'wave') {
      ctx.strokeStyle = `rgba(${col},0.4)`
      ctx.lineWidth = 1.6
      ctx.beginPath()
      for (let i = 0; i <= s.w; i += 6) {
        ctx.lineTo(s.x + i, s.y + Math.sin((i + S.tick * 2) * 0.15) * s.amp)
      }
      ctx.stroke()
    } else if (s.kind === 'star') {
      const a = 0.3 + 0.5 * Math.abs(Math.sin(S.tick * 0.06 + s.ph))
      ctx.fillStyle = `rgba(${col},${a})`
      ctx.beginPath()
      ctx.arc(s.x, s.y, 1.6, 0, Math.PI * 2)
      ctx.fill()
    } else if (s.kind === 'spark') {
      ctx.strokeStyle = `rgba(${col},${clamp(s.life / 24, 0, 1)})`
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.moveTo(s.x, s.y)
      ctx.lineTo(s.x - s.vx * 3, s.y - s.vy * 3)
      ctx.stroke()
    } else {
      ctx.save()
      ctx.translate(s.x, s.y)
      ctx.rotate(s.rot || 0)
      ctx.fillStyle = `rgba(${col},0.85)`
      if (s.kind === 'confetti') ctx.fillRect(-3, -2, 6, 4)
      else {
        ctx.beginPath()
        ctx.ellipse(0, 0, 3.4, 2.2, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
  })
}

function drawEventNPC(ctx, S) {
  const ev = S.event
  if (!ev) return

  if (ev.type === 'nap') {
    const x = ev.x
    const y = 150
    ctx.strokeStyle = '#8a6a3c'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y + 22, 20, 0.2, Math.PI - 0.2)
    ctx.stroke()
    ctx.fillStyle = '#6b6b6b'
    ctx.beginPath()
    ctx.arc(x, y, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#eee'
    ctx.fillRect(x - 8, y + 4, 16, 3)
    ctx.fillStyle = '#5b7fa6'
    roundRect(ctx, x - 12, y + 10, 24, 20, 4)
    ctx.fill()
    const noisy = S.speed > 0.1 && !S.pinched
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'center'
    if (noisy) {
      ctx.fillStyle = '#d9463e'
      ctx.fillText('!', x, y - 22 - Math.sin(S.tick * 0.3) * 3)
      ctx.fillStyle = 'rgba(0,0,0,0.2)'
      ctx.fillRect(x - 24, y - 44, 48, 6)
      ctx.fillStyle = '#d9463e'
      ctx.fillRect(x - 24, y - 44, 48 * (ev.warn / 60), 6)
    } else {
      ctx.fillStyle = '#5b7fa6'
      ctx.fillText('Zzz', x + 14, y - 18 - (S.tick % 60) * 0.2)
    }
    ctx.fillStyle = 'rgba(0,0,0,0.15)'
    ctx.fillRect(x - 24, y + 38, 48, 5)
    ctx.fillStyle = '#5aaa5a'
    ctx.fillRect(x - 24, y + 38, 48 * (ev.t / 240), 5)
  } else if (ev.type === 'duet') {
    const x = ev.x
    const y = 130
    ctx.fillStyle = '#8a6a3c'
    ctx.fillRect(x - 4, y + 10, 8, 40)
    ctx.fillStyle = '#5f8a4a'
    ctx.beginPath()
    ctx.arc(x, y, 26, 0, Math.PI * 2)
    ctx.arc(x - 18, y + 12, 18, 0, Math.PI * 2)
    ctx.arc(x + 18, y + 12, 18, 0, Math.PI * 2)
    ctx.fill()
    const pulse = ev.pulse > 0 ? 1 + ev.pulse * 0.02 : 1
    ctx.save()
    ctx.translate(x + 6, y - 2)
    ctx.scale(pulse, pulse)
    ctx.fillStyle = '#4a3a2a'
    ctx.beginPath()
    ctx.ellipse(0, 0, 8, 5, 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    if (ev.pulse > 12) {
      ctx.font = 'bold 15px sans-serif'
      ctx.fillStyle = '#7a5a2a'
      ctx.textAlign = 'center'
      ctx.fillText('哇~', x + 26, y - 12)
    }
    if (ev.stage === 'answer') {
      ctx.fillStyle = 'rgba(0,0,0,0.15)'
      ctx.fillRect(x - 26, y + 56, 52, 6)
      ctx.fillStyle = '#f2b632'
      ctx.fillRect(x - 26, y + 56, 52 * clamp((ev.good || 0) / 110, 0, 1), 6)
    }
  } else if (ev.type === 'gust') {
    const { cx, cy } = S.layout
    ctx.save()
    ctx.globalAlpha = 0.35 + (ev.active ? 0.25 : 0)
    ctx.strokeStyle = '#7a9ab8'
    ctx.lineWidth = 3
    for (let i = 0; i < 5; i++) {
      const y = cy - 80 + i * 36 + Math.sin(S.tick * 0.2 + i) * 8
      ctx.beginPath()
      ctx.moveTo(cx - 100, y)
      ctx.bezierCurveTo(cx - 40, y - 12, cx + 40, y + 12, cx + 100, y)
      ctx.stroke()
    }
    ctx.restore()
    ctx.font = '14px "PingFang SC", sans-serif'
    ctx.fillStyle = '#4a6a88'
    ctx.textAlign = 'center'
    ctx.fillText(ev.active ? '阵风！' : '风势渐弱', cx, cy - 150)
  } else if (ev.type === 'rosin') {
    ctx.fillStyle = ev.got ? '#f2b632' : 'rgba(242,182,50,0.9)'
    ctx.beginPath()
    ctx.arc(ev.x, ev.y, 10 + Math.sin(S.tick * 0.15) * 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff6'
    ctx.beginPath()
    ctx.arc(ev.x - 3, ev.y - 3, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.font = '12px "PingFang SC", sans-serif'
    ctx.fillStyle = '#8a6a2a'
    ctx.textAlign = 'center'
    ctx.fillText('松香', ev.x, ev.y + 24)
  } else if (ev.type === 'cat') {
    const { cy } = S.layout
    const x = ev.px
    const y = cy + 128
    const dirC = ev.fromLeft ? 1 : -1
    const bob = Math.sin(S.tick * 0.25) * (ev.stage === 'flee' ? 4 : 1.5)
    ctx.save()
    ctx.translate(x, y + bob)
    ctx.scale(dirC, 1)
    ctx.strokeStyle = '#4c4c56'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-16, -2)
    ctx.quadraticCurveTo(-30, -8 - Math.sin(S.tick * 0.15) * 6, -26, -20)
    ctx.stroke()
    ctx.fillStyle = '#565660'
    ctx.beginPath()
    ctx.ellipse(-4, -6, 16, 10, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(12, -14, 9, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(6, -20)
    ctx.lineTo(8, -28)
    ctx.lineTo(12, -21)
    ctx.closePath()
    ctx.moveTo(14, -21)
    ctx.lineTo(18, -28)
    ctx.lineTo(19, -19)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#ffd76b'
    ctx.beginPath()
    ctx.ellipse(10, -14, 2.2, 3, 0, 0, Math.PI * 2)
    ctx.ellipse(16, -13, 2.2, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#222'
    ctx.fillRect(9.4, -16.5, 1.4, 5)
    ctx.fillRect(15.4, -15.5, 1.4, 5)
    ctx.restore()
    const scaring = S.speed >= CAT_SCARE_LO && S.broken === 0 && ev.stage === 'stalk'
    ctx.font = 'bold 15px sans-serif'
    ctx.textAlign = 'center'
    if (ev.stage === 'flee') ctx.fillText('逃', x - dirC * 18, y - 34)
    else if (scaring) ctx.fillText('！', x, y - 36 - Math.sin(S.tick * 0.4) * 2)
    if (ev.stage === 'stalk') {
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.fillRect(x - 22, y + 16, 44, 5)
      ctx.fillStyle = '#f2a232'
      ctx.fillRect(x - 22, y + 16, 44 * clamp(ev.scare / 80, 0, 1), 5)
    }
  } else if (ev.type === 'golden') {
    const { w } = S.layout
    const p = 1 - ev.t / 100
    const gx = ev.fromLeft ? -20 + p * (w + 40) : w + 20 - p * (w + 40)
    const gy = 96 + Math.sin(p * Math.PI) * 46
    const glow = ctx.createRadialGradient(gx, gy, 2, gx, gy, ev.caught ? 30 : 20)
    glow.addColorStop(0, `rgba(255,224,120,${ev.caught ? 0.5 : 0.9})`)
    glow.addColorStop(1, 'rgba(255,224,120,0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(gx, gy, ev.caught ? 30 : 20, 0, Math.PI * 2)
    ctx.fill()
    if (!ev.caught) {
      ctx.save()
      ctx.translate(gx, gy)
      ctx.rotate(Math.sin(S.tick * 0.5) * 0.3)
      ctx.fillStyle = '#ffd76b'
      ctx.beginPath()
      ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff3c4'
      ctx.beginPath()
      ctx.ellipse(-(ev.fromLeft ? 1 : -1) * 10, 0, 5, 2.4, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    } else {
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = '#f2b632'
      ctx.fillText('金', gx, gy - 22)
    }
  }
}

function drawSpeedGauge(ctx, S, W, H, CX) {
  const dark = !!S.mod?.dark
  const gx = CX
  const gy = H - 118
  const r = 78
  ctx.lineWidth = 14
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)'
  ctx.beginPath()
  ctx.arc(gx, gy, r, Math.PI, 0)
  ctx.stroke()
  const toA = (v) => Math.PI + clamp(v / 0.5, 0, 1) * Math.PI
  const widen = (S.fever > 0 ? 0.05 : 0) + (S.rosinBoost > 0 ? 0.04 : 0)
  ctx.strokeStyle = S.fever > 0 ? 'rgba(242,182,50,0.95)' : 'rgba(90,170,90,0.85)'
  ctx.beginPath()
  ctx.arc(gx, gy, r, toA(S.zone.lo - widen), toA(S.zone.hi + widen))
  ctx.stroke()
  ctx.strokeStyle = 'rgba(217,70,62,0.7)'
  ctx.beginPath()
  ctx.arc(gx, gy, r, toA(BREAK_SPEED), toA(0.5))
  ctx.stroke()
  if (S.event?.type === 'cat' && S.event.stage === 'stalk') {
    ctx.strokeStyle = `rgba(242,150,50,${0.65 + 0.3 * Math.sin(S.tick * 0.25)})`
    ctx.beginPath()
    ctx.arc(gx, gy, r, toA(CAT_SCARE_LO), toA(CAT_SCARE_HI))
    ctx.stroke()
  }
  ctx.lineWidth = 8
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.09)'
  ctx.beginPath()
  ctx.arc(gx, gy, 56, Math.PI, 0)
  ctx.stroke()
  const flyFull = S.flyCharge >= 100
  ctx.strokeStyle = flyFull
    ? `rgba(255,190,60,${0.7 + 0.3 * Math.sin(S.tick * 0.3)})`
    : 'rgba(242,166,50,0.75)'
  ctx.beginPath()
  ctx.arc(gx, gy, 56, Math.PI, Math.PI + (clamp(S.flyCharge, 0, 100) / 100) * Math.PI)
  ctx.stroke()
  const na = toA(S.speed)
  ctx.strokeStyle = dark ? '#ece0c2' : '#333'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(gx, gy)
  ctx.lineTo(gx + Math.cos(na) * (r - 4), gy + Math.sin(na) * (r - 4))
  ctx.stroke()
  ctx.fillStyle = dark ? '#ece0c2' : '#333'
  ctx.beginPath()
  ctx.arc(gx, gy, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.font = '13px "PingFang SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = dark ? '#dccda4' : '#6b5836'
  const msg =
    S.flight > 0
      ? '飞天表演中——哇！'
      : S.pinched
        ? '掐线中 · 蝉哑了'
        : S.event?.type === 'cat' && S.event.stage === 'stalk'
          ? '冲进橙区吓走野猫！'
          : flyFull
            ? '满弦！放飞 / F / 摇一摇'
            : S.fever > 0
              ? '狂欢中！分数翻倍'
              : inZone(S)
                ? '完美节奏！保持住'
                : S.speed > S.zone.hi
                  ? '太快了，线要断'
                  : '画圈甩起来'
  ctx.fillText(msg, gx, gy + 26)
}

function drawCicada(c, S, x, y, rot, alpha) {
  c.save()
  c.translate(x, y)
  c.rotate(rot)
  c.globalAlpha = alpha
  const flut = S.speed > 0.1 && !S.pinched ? Math.sin(S.tick * 1.2) * 0.18 : 0
  const wing = (side) => {
    c.save()
    c.rotate(side * (0.32 + flut * side))
    const wg = c.createLinearGradient(0, 0, -44, 0)
    wg.addColorStop(0, '#e6d3ac')
    wg.addColorStop(1, '#cdb384')
    c.fillStyle = wg
    c.strokeStyle = '#b09468'
    c.lineWidth = 1.2
    c.beginPath()
    c.ellipse(-24, side * 5, 24, 7.5, side * 0.12, 0, Math.PI * 2)
    c.fill()
    c.stroke()
    c.strokeStyle = 'rgba(150,120,80,0.5)'
    c.beginPath()
    c.moveTo(-4, side * 3)
    c.lineTo(-44, side * 7)
    c.stroke()
    c.restore()
  }
  wing(-1)
  wing(1)
  const bg = c.createLinearGradient(0, -9, 0, 9)
  bg.addColorStop(0, '#dcc79c')
  bg.addColorStop(0.45, '#efe0bc')
  bg.addColorStop(1, '#c4aa7c')
  c.fillStyle = bg
  c.strokeStyle = '#a8894f'
  c.lineWidth = 1
  roundRect(c, -14, -9, 26, 18, 4)
  c.fill()
  c.stroke()
  c.fillStyle = '#d9463e'
  roundRect(c, 8, -9, 6, 18, [0, 4, 4, 0])
  c.fill()
  c.fillStyle = '#b8352e'
  c.beginPath()
  c.ellipse(14, 0, 2.5, 9, 0, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = '#1a1a1a'
  c.beginPath()
  c.arc(10, -8, 3, 0, Math.PI * 2)
  c.arc(10, 8, 3, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = 'rgba(255,255,255,0.7)'
  c.beginPath()
  c.arc(9, -9, 1, 0, Math.PI * 2)
  c.arc(9, 7, 1, 0, Math.PI * 2)
  c.fill()
  c.restore()
}

function drawToy(ctx, S) {
  const { cx: CX, cy: CY, radius: R } = S.layout
  ctx.save()
  ctx.translate(CX, CY)
  ctx.save()
  ctx.rotate(0.35)
  const hg = ctx.createLinearGradient(-3, 0, 3, 0)
  hg.addColorStop(0, '#c8ab74')
  hg.addColorStop(0.5, '#e2cb9b')
  hg.addColorStop(1, '#b3945c')
  ctx.fillStyle = hg
  roundRect(ctx, -3, -12, 6, 78, 3)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,220,120,0.8)'
  roundRect(ctx, -3, -12, 6, 16, 3)
  ctx.fill()
  ctx.restore()

  const bx = Math.cos(S.angle) * R
  const by = Math.sin(S.angle) * R * 0.55
  if (S.broken > 0) {
    const t = 1 - S.broken / 70
    drawCicada(ctx, S, bx * (1 + t * 3), by * (1 + t * 3) + t * t * 160, S.angle + t * 10, 1 - t * 0.4)
    ctx.strokeStyle = '#c9b8917f'
    ctx.beginPath()
    ctx.moveTo(0, -8)
    ctx.lineTo(bx * 0.4, by * 0.4)
    ctx.stroke()
  } else {
    const tn = clamp(S.tension, 0, 1)
    ctx.strokeStyle = `rgb(${140 + tn * 100}, ${120 - tn * 60}, ${90 - tn * 50})`
    ctx.lineWidth = 1.5 + S.speed * 3
    ctx.beginPath()
    ctx.moveTo(0, -8)
    const sag = clamp(30 - S.speed * 90, 0, 30)
    ctx.quadraticCurveTo(bx * 0.5, by * 0.5 + sag, bx, by)
    ctx.stroke()
    ;[0.3, 0.45].forEach((t, i) => {
      const px = bx * t
      const py = by * t + sag * 4 * t * (1 - t)
      ctx.fillStyle = i === 0 ? '#d9463e' : '#c23a32'
      ctx.beginPath()
      ctx.arc(px, py, 4.5 - i, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.beginPath()
      ctx.arc(px - 1.5, py - 1.5, 1.2, 0, Math.PI * 2)
      ctx.fill()
    })
    if (S.pinched) {
      ctx.fillStyle = '#f2d1a9'
      ctx.beginPath()
      ctx.arc(bx * 0.18, by * 0.18 - 4, 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(bx * 0.18 + 6, by * 0.18 + 2, 6, 0, Math.PI * 2)
      ctx.fill()
    }
    if (S.shield) {
      ctx.strokeStyle = 'rgba(91,127,166,0.55)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(bx, by, 28, 0, Math.PI * 2)
      ctx.stroke()
    }
    drawCicada(ctx, S, bx, by, S.angle + Math.PI / 2, 1)
  }
  ctx.restore()
}

function drawFlight(ctx, S) {
  const { cx: CX, cy: CY } = S.layout
  if (!S.trail) S.trail = []
  const p = 1 - S.flight / 170
  const arc = 4 * p * (1 - p)
  const fx = CX + Math.sin(p * 14) * 70 * (1 - p * 0.75)
  const fy = CY + 30 - arc * 300
  const rot = Math.sin(p * 14) * 0.6 - 0.2 + (p - 0.5) * 0.5
  S.trail.push({ x: fx + rand(-3, 3), y: fy + 10 + rand(-3, 3), life: 26 })
  S.trail.forEach((t) => {
    ctx.globalAlpha = clamp(t.life / 26, 0, 1) * 0.8
    ctx.fillStyle = '#ffd966'
    ctx.beginPath()
    ctx.arc(t.x, t.y, 2 + (26 - t.life) * 0.08, 0, Math.PI * 2)
    ctx.fill()
    t.life--
  })
  ctx.globalAlpha = 1
  S.trail = S.trail.filter((t) => t.life > 0)
  if (fy > -40) drawCicada(ctx, S, fx, fy, rot, 1)
  if (p < 0.25) {
    ctx.globalAlpha = Math.max(0, 1 - p * 4)
    ctx.font = 'bold 22px "ZCOOL XiaoWei", "PingFang SC", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#d9463e'
    ctx.fillText('嘎哇——！', fx, fy - 26)
    ctx.globalAlpha = 1
  }
}

function drawCrowd(ctx, S, W, H) {
  const dark = !!S.mod?.dark
  const gy = H - 42
  ctx.fillStyle = dark ? '#4e4234' : '#d9c49a'
  ctx.fillRect(0, gy - 14, W, 60)
  S.crowdFaces.forEach((f) => {
    const jy = gy - f.jump
    const idx = Math.floor(f.x / 51) % 4
    ctx.fillStyle = ['#c46a4f', '#5b7fa6', '#7a9a5b', '#a67ab0'][idx]
    ctx.beginPath()
    ctx.arc(f.x, jy, 13, Math.PI, 0)
    ctx.fill()
    ctx.fillStyle = '#f2d1a9'
    ctx.beginPath()
    ctx.arc(f.x, jy - 18, 9, 0, Math.PI * 2)
    ctx.fill()
    if (f.wa > 0) {
      ctx.fillStyle = '#7a3030'
      ctx.beginPath()
      ctx.ellipse(f.x, jy - 15, 3, 4, 0, 0, Math.PI * 2)
      ctx.fill()
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
  ctx.fillRect(20, gy + 22, W - 40, 10)
  const grd = ctx.createLinearGradient(20, 0, W - 20, 0)
  grd.addColorStop(0, '#f2b632')
  grd.addColorStop(1, '#d9463e')
  ctx.fillStyle = grd
  ctx.fillRect(20, gy + 22, (S.crowd / 100) * (W - 40), 10)
  ctx.font = '12px "PingFang SC", sans-serif'
  ctx.fillStyle = dark ? '#dccda4' : '#6b5836'
  ctx.textAlign = 'left'
  ctx.fillText(S.fever > 0 ? `狂欢 ${Math.ceil(S.fever / 60)}s` : '观众欢呼度', 20, gy + 18)
}

function roundRect(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
    return
  }
  const radii = Array.isArray(r) ? r : [r, r, r, r]
  const [tl, tr, br, bl] = radii
  ctx.beginPath()
  ctx.moveTo(x + tl, y)
  ctx.lineTo(x + w - tr, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr)
  ctx.lineTo(x + w, y + h - br)
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h)
  ctx.lineTo(x + bl, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl)
  ctx.lineTo(x, y + tl)
  ctx.quadraticCurveTo(x, y, x + tl, y)
  ctx.closePath()
}

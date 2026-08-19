import { useEffect, useRef, useState } from 'react'
import { unlockAudio } from '../audio/context.js'
import { createCicadaVoice } from '../audio/cicadaVoice.js'
import { sndFly } from '../audio/sfx.js'
import { createGameState, resetRound, tryFly, updateLayout } from '../game/state.js'
import { applySpinInput, stepPhysics } from '../game/physics.js'
import { stepScoring } from '../game/scoring.js'
import { createEventHelpers, updateEvent } from '../game/events.js'
import { drawFrame } from '../game/draw/scene.js'
import { classicHud, classicTickEnd } from '../game/modes/classic.js'
import { endlessHud, endlessTickEnd } from '../game/modes/endless.js'
import { ROUND_TIME } from '../game/constants.js'
import Hud from './Hud.jsx'
import PinchButton from './PinchButton.jsx'
import FlyButton from './FlyButton.jsx'
import OverlayReady from './OverlayReady.jsx'
import OverlayResult from './OverlayResult.jsx'
import SoundToggle from './SoundToggle.jsx'

export default function Game({ mode, best, onGameOver, onBack, soundOn, onToggleSound }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const helpersRef = useRef(null)
  const tryFlyRef = useRef(null)
  const [phase, setPhase] = useState('ready')
  const [hud, setHud] = useState({
    score: 0,
    time: mode === 'classic' ? ROUND_TIME : 0,
    combo: 0,
    mode,
    shield: false,
    fever: false,
    fly: false,
  })
  const [result, setResult] = useState(null)
  const S = useRef(createGameState(mode)).current

  const mapPointer = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const { w, h, cx, cy } = S.layout
    const clientX = e.clientX ?? e.touches?.[0]?.clientX
    const clientY = e.clientY ?? e.touches?.[0]?.clientY
    return {
      x: ((clientX - rect.left) / rect.width) * w,
      y: ((clientY - rect.top) / rect.height) * h,
      angle: Math.atan2(
        ((clientY - rect.top) / rect.height) * h - cy,
        ((clientX - rect.left) / rect.width) * w - cx,
      ),
    }
  }

  const onPtrDown = (e) => {
    if (e.target.closest?.('.ui-chrome')) return
    unlockAudio()
    if (phase !== 'playing') return
    e.preventDefault()
    const p = mapPointer(e)
    S.lastPtrAngle = p.angle
    S.ptrActive = true
    try {
      canvasRef.current.setPointerCapture?.(e.pointerId)
    } catch {}
  }

  const onPtrMove = (e) => {
    if (phase !== 'playing' || !S.ptrActive || S.broken > 0 || S.flight > 0) return
    e.preventDefault()
    applySpinInput(S, mapPointer(e).angle)
  }

  const onPtrUp = (e) => {
    S.ptrActive = false
    S.lastPtrAngle = null
    try {
      canvasRef.current.releasePointerCapture?.(e.pointerId)
    } catch {}
  }

  const doFly = () => {
    if (phase !== 'playing') return
    const helpers = helpersRef.current || createEventHelpers(S)
    if (tryFly(S, helpers)) sndFly()
  }
  tryFlyRef.current = doFly

  useEffect(() => {
    const down = (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        if (phase === 'playing') S.pinched = true
      }
      if (e.code === 'KeyF') {
        e.preventDefault()
        tryFlyRef.current?.()
      }
    }
    const up = (e) => {
      if (e.code === 'Space') S.pinched = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [phase])

  useEffect(() => {
    let lastShake = 0
    const onMotion = (e) => {
      const a = e.accelerationIncludingGravity
      if (!a) return
      const mag = Math.hypot(a.x || 0, a.y || 0, a.z || 0)
      const now = performance.now()
      if (mag > 28 && now - lastShake > 900) {
        lastShake = now
        tryFlyRef.current?.()
      }
    }
    window.addEventListener('devicemotion', onMotion)
    return () => window.removeEventListener('devicemotion', onMotion)
  }, [])

  const start = () => {
    unlockAudio()
    const mod = resetRound(S, mode)
    if (!S.voice) S.voice = createCicadaVoice()
    const helpers = createEventHelpers(S)
    helpersRef.current = helpers
    helpers.addToast(`${mod.icon} 今日彩头：${mod.name}`, true)
    if (
      !S.motionAsked &&
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof DeviceMotionEvent.requestPermission === 'function'
    ) {
      S.motionAsked = true
      DeviceMotionEvent.requestPermission().catch(() => {})
    }
    setResult(null)
    setPhase('playing')
  }

  useEffect(() => () => {
    S.voice?.stop()
    S.voice = null
  }, [])

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const syncSize = () => {
      const vw = wrap.clientWidth
      const vh = wrap.clientHeight
      const layout = updateLayout(S, vw, vh)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(layout.w * dpr)
      canvas.height = Math.floor(layout.h * dpr)
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      const ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    syncSize()
    const ro = new ResizeObserver(syncSize)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let raf
    const helpers = createEventHelpers(S)
    helpersRef.current = helpers

    const loop = () => {
      S.tick++
      if (phase === 'playing') {
        stepPhysics(S, helpers)
        S.voice?.set(
          S.broken > 0 || S.flight > 0 ? 0 : Math.min(S.speed * 2, 1),
          S.pinched,
          S.angle,
        )
        stepScoring(S, helpers)
        updateEvent(S, helpers)

        if (S.speed > 0.12 && !S.pinched && S.flight === 0 && S.tick % 12 === 0) {
          S.waves.push({ r: 30, life: 40 })
        }

        const end = mode === 'classic' ? classicTickEnd(S) : endlessTickEnd(S)
        if (end.over) {
          S.voice?.set(0, false)
          setResult(end.result)
          onGameOver(end.result)
          setPhase('over')
        }

        if (S.tick % 6 === 0) {
          setHud(mode === 'classic' ? classicHud(S) : endlessHud(S))
        }
      }

      S.waves.forEach((w) => {
        w.r += 2.5
        w.life--
      })
      S.waves = S.waves.filter((w) => w.life > 0)
      S.notes.forEach((n) => {
        n.y += n.vy
        n.life--
      })
      S.notes = S.notes.filter((n) => n.life > 0)
      S.toasts.forEach((t) => {
        t.y -= 0.5
        t.life--
      })
      S.toasts = S.toasts.filter((t) => t.life > 0)
      S.confetti.forEach((c) => {
        c.x += c.vx
        c.y += c.vy
        c.rot += c.vr
        c.life--
      })
      S.confetti = S.confetti.filter((c) => c.life > 0 && c.y < S.layout.h + 20)

      const span = S.layout.w
      S.crowdFaces.forEach((f, i) => {
        f.x = 34 + i * ((span - 68) / 8)
      })

      drawFrame(ctx, S)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [phase, mode])

  return (
    <div className="game-shell" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="game-canvas"
        onPointerDown={onPtrDown}
        onPointerMove={onPtrMove}
        onPointerUp={onPtrUp}
        onPointerCancel={onPtrUp}
      />
      <div className="ui-chrome">
        <Hud hud={hud} best={best} />
        <SoundToggle on={soundOn} onToggle={onToggleSound} />
        {phase === 'playing' && (
          <>
            <PinchButton
              onDown={() => {
                S.pinched = true
              }}
              onUp={() => {
                S.pinched = false
              }}
            />
            {hud.fly && <FlyButton onFly={doFly} />}
          </>
        )}
        {phase === 'ready' && (
          <OverlayReady mode={mode} onStart={start} onBack={onBack} />
        )}
        {phase === 'over' && result && (
          <OverlayResult
            result={result}
            best={best}
            onRetry={start}
            onBack={onBack}
          />
        )}
      </div>
    </div>
  )
}

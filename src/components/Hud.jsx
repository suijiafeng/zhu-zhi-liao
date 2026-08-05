import { ROUND_TIME } from '../gameConstants.js'

export default function Hud({ score, combo, time, playing, best, soundOn, onToggleSound, fsOk, isFull, onToggleFull }) {
  return (
    <div className="hud">
      <span className="hud-chip">
        ⭐ {score}
        {combo >= 2 ? <em className="combo">×{Math.min(combo, 15)}</em> : null}
      </span>
      <span className={`hud-chip${playing && time <= 10 ? ' low' : ''}`}>
        ⏱ {playing ? time : ROUND_TIME}s
      </span>
      <span className="hud-chip">🏆 {best}</span>
      <button
        className="hud-chip hud-mute"
        onClick={onToggleSound}
        aria-label={soundOn ? '关闭声音' : '打开声音'}
      >{soundOn ? '🔊' : '🔇'}</button>
      {fsOk && (
        <button
          className="hud-chip hud-mute"
          onClick={onToggleFull}
          aria-label={isFull ? '退出全屏' : '全屏游玩'}
          title={isFull ? '退出全屏' : '全屏游玩'}
        >{isFull ? '✕' : '⛶'}</button>
      )}
    </div>
  )
}

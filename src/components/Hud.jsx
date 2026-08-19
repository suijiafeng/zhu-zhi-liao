export default function Hud({ hud, best }) {
  return (
    <header className={`hud ${hud.fever ? 'hud--fever' : ''}`}>
      <div className="hud-item">
        <span className="hud-label">得分</span>
        <span className="hud-value">
          {hud.score}
          {hud.combo >= 2 ? ` ×${Math.min(hud.combo, 15)}` : ''}
        </span>
      </div>
      <div className="hud-item hud-item--center">
        <span className="hud-label">{hud.mode === 'endless' ? '存活' : '剩余'}</span>
        <span className="hud-value">{hud.time}s</span>
      </div>
      <div className="hud-item hud-item--right">
        <span className="hud-label">最高</span>
        <span className="hud-value">{best}</span>
      </div>
      {hud.shield && <span className="hud-shield">护盾</span>}
    </header>
  )
}

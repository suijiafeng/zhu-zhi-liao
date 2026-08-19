export default function OverlayResult({ result, best, onRetry, onBack }) {
  const isNew = result.score >= best && result.score > 0
  const s = result.stats || {}
  const mod = result.mod

  return (
    <div className="overlay">
      <div className="overlay-card">
        <p className="overlay-kicker">曲终收工</p>
        <h2 className="title-badge">{result.title}</h2>
        {mod && (
          <>
            <p className="mod-line">
              {mod.icon} 本场彩头 · {mod.name}
            </p>
            <p className="mod-story">{mod.desc}</p>
          </>
        )}
        <p className="result-score">
          本场 <strong>{result.score}</strong>
        </p>
        {result.mode === 'endless' && (
          <p className="result-meta">
            存活 {result.survived}s · {result.reason || ''} · 最高连击 {result.maxCombo}
          </p>
        )}
        {result.mode === 'classic' && (
          <p className="result-meta">最高连击 {result.maxCombo}</p>
        )}
        <p className="stats-line">
          打盹 {s.naps || 0} · 对唱 {s.duets || 0} · 猫 {s.cats || 0} · 金蝉 {s.golden || 0} · 放飞{' '}
          {s.flights || 0} · 狂欢 {s.feverN || 0}
        </p>
        {result.newStamps?.length > 0 && (
          <p className="new-stamps">
            新收印章：{result.newStamps.map((st) => `${st.icon}${st.name}`).join(' · ')}
          </p>
        )}
        {isNew && <p className="newbest">新纪录</p>}
        <div className="overlay-actions">
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            再来一局
          </button>
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            换模式
          </button>
        </div>
        <p className="science-note">
          真实竹知了靠线与竹棒松香摩擦发声，掐住线，声源就被切断了。
        </p>
      </div>
    </div>
  )
}

export default function GameOverOverlay({ result, best, onRestart }) {
  return (
    <div className="overlay-panel">
      <h2>🍵 曲终收工</h2>
      <p className="title-badge">{result.title}</p>
      {result.mod && (
        <>
          <p className="mod-line">{result.mod.icon} 本场彩头 · {result.mod.name}</p>
          <p className="mod-story">{result.mod.desc}</p>
        </>
      )}
      <p>本场得分 <b>{result.score}</b></p>
      <p className="stats-line">
        😴 ×{result.stats.naps} · 🐝 ×{result.stats.duets} · 🐱 ×{result.stats.cats} · 🪙 ×{result.stats.golden} · 🚀 ×{result.stats.flights} · 🔥 ×{result.stats.feverN}
      </p>
      {result.newStamps?.length > 0 && (
        <p className="new-stamps">
          🧧 新收印章：{result.newStamps.map((s) => `${s.icon}${s.name}`).join(' · ')}
        </p>
      )}
      {result.score >= best && best > 0 && <p className="newbest">🎉 新纪录！</p>}
      <button onClick={onRestart}>再来一场</button>
    </div>
  )
}

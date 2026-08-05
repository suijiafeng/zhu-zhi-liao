import { useState } from 'react'
import Game, { TITLES, ROUND_TIME, STAMPS, readStamps } from './Game.jsx'

const readBest = () => {
  try { return Number(localStorage.getItem('zzl_best') || 0) } catch { return 0 }
}

export default function App() {
  const [best, setBest] = useState(readBest)
  const [stamps, setStamps] = useState(readStamps)

  const handleGameOver = ({ score, stampIds }) => {
    if (score > best) {
      setBest(score)
      try { localStorage.setItem('zzl_best', String(score)) } catch {}
    }
    if (stampIds) setStamps(stampIds)
  }

  return (
    <div className="page">
      <header className="site-header">
        <h1>🎋 竹知了<span className="seal">鸣</span></h1>
        <p className="subtitle">摇一摇，飞上天 · 听它"嘎哇嘎哇"地叫</p>
      </header>

      <main className="layout">
        <section className="stage-card">
          <Game onGameOver={handleGameOver} best={best} />
        </section>

        <aside className="side">
          <details className="card">
            <summary>🎮 怎么玩</summary>
            <ul className="howto">
              <li>按住画面绕中心<b>画圈甩动</b>，指针稳在<span className="k green">绿区</span>持续连击得分；<span className="k red">红区</span>会绷断线</li>
              <li><b>🤏 掐线消音</b>（空格 / 按钮）：老爷爷打盹时全靠它</li>
              <li>🌳 野蝉起调后稳住绿区<b>对唱</b>；🐱 野猫扑来时冲进<span className="k amber">橙区</span>吓走它</li>
              <li>绿区蓄满飞天值 → 🚀 <b>放飞</b>（按钮 / F 键 / 手机<b>摇一摇</b>）送它上天</li>
              <li>每场随机<b>彩头</b>（共 14 种）：夜场灯会 🏮 / 毒日头 ☀️ / 中秋月圆 🌕 等，各带独特画面与得分机制</li>
            </ul>
          </details>

          <details className="card">
            <summary>🧧 印章收集 <span className="count">{stamps.length}/{STAMPS.length}</span></summary>
            <div className="stamp-grid">
              {STAMPS.map((s) => {
                const got = stamps.includes(s.id)
                return (
                  <div key={s.id} className={got ? 'stamp earned' : 'stamp locked'} title={s.desc}>
                    <span className="ico">{s.icon}</span>
                    <span className="nm">{s.name}</span>
                    {!got && <span className="ds">{s.desc}</span>}
                  </div>
                )
              })}
            </div>
          </details>

          <details className="card">
            <summary>🏮 称号阶梯</summary>
            <ol className="titles">
              {TITLES.map(([min, name]) => (
                <li key={name}>
                  <span className="pts">{min}</span>
                  <span>{name}</span>
                </li>
              ))}
            </ol>
          </details>

          <details className="card">
            <summary>📜 关于竹知了</summary>
            <p>
              竹知了（竹蝉）是中国传统民俗玩具：蝉形竹哨系在线上，
              抡圈甩动时靠摩擦与气流发出连绵的"哇哇"鸣叫，
              是许多人童年庙会里几毛钱的快乐。
            </p>
            <p className="fine">
              本页蝉鸣由 Web Audio 实时合成——双共振峰调出"唐老鸭"式的嘎哇声，建议开声游玩。
            </p>
          </details>
        </aside>
      </main>

      <footer className="site-footer">民俗小游戏 · 一局 {ROUND_TIME} 秒 · 最高分与印章只存在本机</footer>
    </div>
  )
}

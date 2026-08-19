import { STAMPS } from '../game/stamps.js'
import StampWall from './StampWall.jsx'
import ModCodex from './ModCodex.jsx'

export default function ModeSelect({ bestClassic, bestEndless, stamps, onSelect }) {
  return (
    <div className="mode-select">
      <div className="mode-select__bg" aria-hidden />
      <div className="mode-select__inner">
        <header className="brand">
          <h1 className="brand-name">竹知了</h1>
          <p className="brand-tag">甩起来，听它哇哇地叫</p>
        </header>

        <div className="mode-grid">
          <button type="button" className="mode-card" onClick={() => onSelect('classic')}>
            <span className="mode-card__label">经典</span>
            <span className="mode-card__desc">六十秒庙会演奏会</span>
            <span className="mode-card__best">最高 {bestClassic}</span>
          </button>
          <button type="button" className="mode-card mode-card--alt" onClick={() => onSelect('endless')}>
            <span className="mode-card__label">无尽</span>
            <span className="mode-card__desc">难度爬升，能甩多久算多久</span>
            <span className="mode-card__best">最高 {bestEndless}</span>
          </button>
        </div>

        <details className="collect-panel">
          <summary>
            印章收集 <span className="count">{stamps.length}/{STAMPS.length}</span>
          </summary>
          <StampWall earned={stamps} />
        </details>

        <details className="collect-panel">
          <summary>彩头图鉴</summary>
          <ModCodex />
        </details>

        <p className="mode-hint">画圈甩蝉 · 绿区蓄满可放飞 · 手机与网页均可畅玩</p>
      </div>
    </div>
  )
}

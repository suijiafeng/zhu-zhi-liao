import { ROUND_TIME } from '../game/constants.js'

export default function OverlayReady({ mode, onStart, onBack }) {
  const isEndless = mode === 'endless'

  return (
    <div className="overlay">
      <div className="overlay-card">
        <p className="overlay-kicker">{isEndless ? '无尽模式' : '经典演奏会'}</p>
        <h2>{isEndless ? '能甩多久算多久' : '六十秒庙会一曲'}</h2>
        <ul className="rules">
          <li>按住画面绕中心画圈，把转速稳住在绿色甜蜜区</li>
          <li>甩进红区会断线；野猫来时冲进橙区吓走它</li>
          <li>掐线（按钮 / 空格）立刻消音；绿区蓄满可放飞（F / 摇一摇）</li>
          <li>每局随机彩头；金蝉闪过时稳住绿区接住</li>
          {isEndless && <li>断线或观众散场即结束，难度会随时间抬升</li>}
        </ul>
        <div className="overlay-actions">
          <button type="button" className="btn btn-primary" onClick={onStart}>
            {isEndless ? '开始无尽' : `开演（${ROUND_TIME} 秒）`}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            返回
          </button>
        </div>
      </div>
    </div>
  )
}

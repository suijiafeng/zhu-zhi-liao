import { ROUND_TIME } from '../gameConstants.js'

export default function ReadyOverlay({ onStart }) {
  return (
    <div className="overlay-panel">
      <h2>🏮 竹知了演奏会</h2>
      <ul className="rules-list">
        <li>🌀 按住画面<b>画圈甩动</b>，稳在<span className="k green">绿区</span>连击得分</li>
        <li>⚠️ 甩进<span className="k red">红区</span>线会绷断；🤏 <b>掐线</b>（空格）可消音</li>
        <li>🚀 绿区蓄满飞天值就<b>放飞</b>（F / 摇一摇）</li>
        <li>🎭 每场随机彩头 ×34，攒印章解锁成就</li>
      </ul>
      <button onClick={onStart}>开演！（{ROUND_TIME} 秒）</button>
    </div>
  )
}

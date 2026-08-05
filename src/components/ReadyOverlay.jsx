import { ROUND_TIME } from '../gameConstants.js'

export default function ReadyOverlay({ onStart }) {
  return (
    <div className="overlay-panel">
      <h2>🏮 竹知了演奏会</h2>
      <p className="rules">
        按住画面绕中心 <b>画圈甩动</b>，指针稳在 <span style={{ color: '#7ed07e' }}>■ 绿区</span> 持续得分，
        甩进 <span style={{ color: '#ff9088' }}>■ 红区</span> 线会绷断<br />
        🤏 <b>掐线</b>（空格/按钮）立刻消音——老爷爷打盹时保持安静<br />
        🌳 野蝉起调，稳住绿区 <b>对唱</b>；🐱 野猫扑来，<b>甩快些</b>吓走它<br />
        欢呼度攒满触发 🔥 <b>狂欢</b>；绿区蓄满飞天值 → 🚀 <b>放飞</b>（F / 摇一摇）飞上天！<br />
        每场随机一个 <b>彩头</b>（共 34 种场景：江河湖海、星辰雷电、十二生肖），攒印章解锁成就～
      </p>
      <button onClick={onStart}>开演！（{ROUND_TIME} 秒）</button>
      <p className="science-note">
        冷知识：掐线消音是真的——真实竹知了靠线与竹棒上的松香摩擦振动、
        经筒口薄膜共鸣发声，掐住线摩擦停了，声音源头就被切断了。
      </p>
    </div>
  )
}

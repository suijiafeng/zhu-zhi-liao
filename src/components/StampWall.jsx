import { STAMPS } from '../stamps.js'

export default function StampWall({ earned }) {
  return (
    <div className="stamp-grid">
      {STAMPS.map((s) => {
        const got = earned.includes(s.id)
        const legendary = s.id === 'zodiac12'
        return (
          <div
            key={s.id}
            className={`stamp ${got ? 'earned' : 'locked'}${legendary ? ' legendary' : ''}`}
            title={s.desc}
          >
            <span className="ico">{s.icon}</span>
            <span className="nm">{s.name}</span>
          </div>
        )
      })}
    </div>
  )
}

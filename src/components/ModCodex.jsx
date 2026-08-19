import { groupedMods } from '../game/scenarios.js'

export default function ModCodex() {
  return (
    <div className="mod-groups">
      {groupedMods().map((g) => (
        <div className="mod-group" key={g.key}>
          <p className="mod-group-title">{g.label}</p>
          <div className="mod-chip-row">
            {g.mods.map((m) => (
              <span className={`mod-chip mc-${g.key}`} key={m.id} title={m.desc}>
                {m.icon} {m.name}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

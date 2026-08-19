import { useEffect, useState } from 'react'
import ModeSelect from './components/ModeSelect.jsx'
import Game from './components/Game.jsx'
import { STORAGE } from './game/constants.js'
import { readStamps } from './game/stamps.js'
import { loadMutePreference, setMuted } from './audio/context.js'

function readBest(key) {
  try {
    return Number(localStorage.getItem(key) || 0)
  } catch {
    return 0
  }
}

function migrateLegacyBest() {
  try {
    const legacy = Number(localStorage.getItem(STORAGE.legacy) || 0)
    const classic = readBest(STORAGE.classic)
    if (legacy > classic) {
      localStorage.setItem(STORAGE.classic, String(legacy))
    }
  } catch {}
}

export default function App() {
  const [screen, setScreen] = useState('select')
  const [mode, setMode] = useState('classic')
  const [bestClassic, setBestClassic] = useState(0)
  const [bestEndless, setBestEndless] = useState(0)
  const [stamps, setStamps] = useState([])
  const [soundOn, setSoundOn] = useState(true)

  useEffect(() => {
    migrateLegacyBest()
    setBestClassic(readBest(STORAGE.classic))
    setBestEndless(readBest(STORAGE.endless))
    setStamps(readStamps())
    setSoundOn(!loadMutePreference())
  }, [])

  const handleSelect = (m) => {
    setMode(m)
    setScreen('game')
  }

  const handleGameOver = ({ score, mode: m, stampIds }) => {
    if (m === 'endless') {
      if (score > bestEndless) {
        setBestEndless(score)
        try {
          localStorage.setItem(STORAGE.endless, String(score))
        } catch {}
      }
    } else if (score > bestClassic) {
      setBestClassic(score)
      try {
        localStorage.setItem(STORAGE.classic, String(score))
      } catch {}
    }
    if (stampIds) setStamps(stampIds)
  }

  const toggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    setMuted(!next)
  }

  const best = mode === 'endless' ? bestEndless : bestClassic

  return (
    <div className="app-root">
      {screen === 'select' ? (
        <ModeSelect
          bestClassic={bestClassic}
          bestEndless={bestEndless}
          stamps={stamps}
          onSelect={handleSelect}
        />
      ) : (
        <Game
          key={mode}
          mode={mode}
          best={best}
          onGameOver={handleGameOver}
          onBack={() => setScreen('select')}
          soundOn={soundOn}
          onToggleSound={toggleSound}
        />
      )}
    </div>
  )
}

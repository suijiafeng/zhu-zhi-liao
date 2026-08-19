export default function SoundToggle({ on, onToggle }) {
  return (
    <button
      type="button"
      className={`sound-toggle ${on ? '' : 'is-off'}`}
      onClick={onToggle}
      aria-label={on ? '关闭声音' : '打开声音'}
    >
      {on ? '声开' : '声关'}
    </button>
  )
}

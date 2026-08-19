export default function FlyButton({ onFly }) {
  return (
    <button
      type="button"
      className="fly-btn"
      aria-label="放飞"
      onPointerDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onFly()
      }}
    >
      <span className="fly-btn__main">放飞</span>
      <span className="fly-btn__sub">F / 摇一摇</span>
    </button>
  )
}

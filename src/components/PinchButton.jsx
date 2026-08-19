export default function PinchButton({ onDown, onUp }) {
  return (
    <button
      type="button"
      className="pinch-btn"
      aria-label="掐线消音"
      onPointerDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onDown()
      }}
      onPointerUp={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onUp()
      }}
      onPointerLeave={onUp}
      onPointerCancel={onUp}
    >
      <span className="pinch-btn__main">掐线</span>
      <span className="pinch-btn__sub">空格</span>
    </button>
  )
}

export default function Tooltip({ text, children }) {
  return (
    <span className="tooltip-wrap">
      {children || <span className="tooltip-trigger">?</span>}
      <span className="tooltip-content">{text}</span>
    </span>
  )
}

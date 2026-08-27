function BearMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <g className="bear-mark">
        <circle cx="72" cy="66" r="16" />
        <circle cx="128" cy="66" r="16" />
        <circle cx="100" cy="104" r="46" />
      </g>
      <g className="bear-mark-muzzle">
        <ellipse cx="100" cy="118" rx="20" ry="14" />
        <circle cx="100" cy="112" r="4" />
        <circle cx="82" cy="96" r="5" />
        <circle cx="118" cy="96" r="5" />
      </g>
    </svg>
  )
}

export default BearMark

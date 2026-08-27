function BearStamp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        <path
          id="stamp-ring-path"
          d="M 100,100 m -80,0 a 80,80 0 1,1 160,0 a 80,80 0 1,1 -160,0"
        />
      </defs>
      <circle className="stamp-ring" cx="100" cy="100" r="94" fill="none" />
      <circle className="stamp-ring" cx="100" cy="100" r="72" fill="none" />
      <text className="stamp-ring-text">
        <textPath href="#stamp-ring-path" startOffset="0%">
          · OSO TOSTADAS · PUNTO DE VENTA · OSO TOSTADAS · PUNTO DE VENTA
        </textPath>
      </text>
      <g className="stamp-bear">
        <circle cx="72" cy="66" r="16" />
        <circle cx="128" cy="66" r="16" />
        <circle cx="100" cy="104" r="46" />
        <ellipse className="stamp-bear-muzzle" cx="100" cy="118" rx="20" ry="14" />
        <circle className="stamp-bear-muzzle" cx="100" cy="112" r="4" />
        <circle className="stamp-bear-muzzle" cx="82" cy="96" r="5" />
        <circle className="stamp-bear-muzzle" cx="118" cy="96" r="5" />
      </g>
    </svg>
  )
}

export default BearStamp

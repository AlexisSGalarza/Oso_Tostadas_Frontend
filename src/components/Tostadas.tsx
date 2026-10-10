import './Tostadas.css'

export type TonoTostada = 'amarilla' | 'roja' | 'natural'

// El color del paquete solo existe en el nombre del producto ("... amarillas", "... rojas").
export function tonoDe(nombre: string): TonoTostada {
  const texto = nombre.toLowerCase()
  if (texto.includes('amarill')) return 'amarilla'
  if (texto.includes('roj')) return 'roja'
  return 'natural'
}

// Numero de piezas del paquete, si el nombre lo dice ("Paquete 50 tostadas").
export function piezasDe(nombre: string) {
  return nombre.match(/\b(\d{2,4})\b/)?.[1] ?? null
}

// Ilustracion de una pila de tostadas; sustituye a la foto del producto.
function Tostadas({ nombre, className = '' }: { nombre: string; className?: string }) {
  const piezas = piezasDe(nombre)
  return (
    <span className={`tostadas is-${tonoDe(nombre)} ${className}`} aria-hidden="true">
      <svg viewBox="0 0 96 72">
        <ellipse className="tostadas__sombra" cx="48" cy="60" rx="34" ry="7" />
        {[52, 42, 32].map((cy) => (
          <g key={cy}>
            <ellipse className="tostadas__canto" cx="48" cy={cy + 4} rx="32" ry="11" />
            <ellipse className="tostadas__cara" cx="48" cy={cy} rx="32" ry="11" />
          </g>
        ))}
        <g className="tostadas__burbujas">
          <circle cx="36" cy="30" r="2.2" />
          <circle cx="52" cy="35" r="1.6" />
          <circle cx="60" cy="29" r="2" />
          <circle cx="44" cy="27" r="1.3" />
        </g>
      </svg>
      {piezas && <span className="tostadas__piezas">{piezas}</span>}
    </span>
  )
}

export default Tostadas

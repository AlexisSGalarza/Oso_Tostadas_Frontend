type Props = {
  valores: number[]
  className?: string
}

const ALTO = 32
const MARGEN = 4

// Tendencia en miniatura para las tarjetas de cifras. Es decorativa: quien la
// usa describe la serie en texto, por eso va oculta a los lectores de pantalla.
function Sparkline({ valores, className = '' }: Props) {
  if (valores.length < 2) return null

  const maximo = Math.max(...valores, 0)
  const paso = 100 / (valores.length - 1)
  const puntos = valores.map((valor, i) => ({
    x: i * paso,
    y: maximo > 0 ? ALTO - MARGEN - (valor / maximo) * (ALTO - MARGEN * 2) : ALTO - MARGEN,
  }))
  // Misma curva que la grafica de area: no rebasa los valores reales.
  const linea = puntos
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`
      const anterior = puntos[i - 1]
      const medio = (anterior.x + p.x) / 2
      return `C ${medio} ${anterior.y}, ${medio} ${p.y}, ${p.x} ${p.y}`
    })
    .join(' ')
  const ultimo = puntos[puntos.length - 1]

  return (
    <span className={`spark ${className}`} aria-hidden="true">
      <svg viewBox={`0 0 100 ${ALTO}`} preserveAspectRatio="none">
        <path className="spark__relleno" d={`${linea} L 100 ${ALTO} L 0 ${ALTO} Z`} />
        <path className="spark__linea" d={linea} />
      </svg>
      <span className="spark__punto" style={{ top: `${(ultimo.y / ALTO) * 100}%` }} />
    </span>
  )
}

export default Sparkline

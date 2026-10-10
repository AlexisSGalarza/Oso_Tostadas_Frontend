import { useState } from 'react'
import './GraficaDona.css'

export type RebanadaDona = {
  clave: string
  nombre: string
  valor: number
  color: string
}

type Props = {
  rebanadas: RebanadaDona[]
  formatear: (valor: number) => string
  etiquetaTotal: string
  descripcion: string
  vacio?: string
}

const RADIO = 40
const PERIMETRO = 2 * Math.PI * RADIO
// Separacion entre rebanadas, en unidades del trazo
const HUECO = 1.6

function GraficaDona({ rebanadas, formatear, etiquetaTotal, descripcion, vacio = 'Sin datos todavía.' }: Props) {
  const [activa, setActiva] = useState<string | null>(null)
  const total = rebanadas.reduce((suma, r) => suma + r.valor, 0)

  if (total <= 0) {
    return <p className="dona__vacio">{vacio}</p>
  }

  let recorrido = 0
  const arcos = rebanadas.map((r) => {
    const largo = (r.valor / total) * PERIMETRO
    const arco = { ...r, largo: Math.max(largo - (rebanadas.length > 1 ? HUECO : 0), 0.5), inicio: recorrido }
    recorrido += largo
    return arco
  })
  const destacada = arcos.find((a) => a.clave === activa)

  return (
    <div className="dona">
      <div className="dona__anillo">
        <svg viewBox="0 0 100 100" role="img" aria-label={descripcion}>
          <circle className="dona__pista" cx="50" cy="50" r={RADIO} />
          {arcos.map((a) => (
            <circle
              key={a.clave}
              className={`dona__arco ${activa && activa !== a.clave ? 'is-tenue' : ''}`}
              cx="50"
              cy="50"
              r={RADIO}
              stroke={a.color}
              strokeDasharray={`${a.largo} ${PERIMETRO - a.largo}`}
              strokeDashoffset={-a.inicio}
              onMouseEnter={() => setActiva(a.clave)}
              onMouseLeave={() => setActiva(null)}
            />
          ))}
        </svg>
        <div className="dona__centro" aria-live="polite">
          <span className="dona__total">{formatear(destacada ? destacada.valor : total)}</span>
          <span className="dona__etiqueta">{destacada ? destacada.nombre : etiquetaTotal}</span>
        </div>
      </div>

      <ul className="dona__leyenda">
        {arcos.map((a) => (
          <li
            key={a.clave}
            className={activa && activa !== a.clave ? 'is-tenue' : ''}
            onMouseEnter={() => setActiva(a.clave)}
            onMouseLeave={() => setActiva(null)}
          >
            <span className="dona__color" style={{ background: a.color }} aria-hidden="true" />
            <span className="dona__nombre">{a.nombre}</span>
            <span className="dona__valor">
              {formatear(a.valor)} · {((a.valor / total) * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default GraficaDona

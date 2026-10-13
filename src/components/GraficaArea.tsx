import { useId, useState } from 'react'
import './GraficaArea.css'

export type PuntoArea = {
  clave: string
  eje: string
  titulo: string
  detalle: string[]
  valor: number
}

type Props = {
  puntos: PuntoArea[]
  formatear: (valor: number) => string
  descripcion: string
  vacio?: string
}

// Redondea el tope del eje a un numero "limpio" (1, 2, 2.5 o 5 por una potencia de 10).
function topeLimpio(maximo: number) {
  const potencia = 10 ** Math.floor(Math.log10(maximo))
  const base = maximo / potencia
  const limpio = base <= 1 ? 1 : base <= 2 ? 2 : base <= 2.5 ? 2.5 : base <= 5 ? 5 : 10
  return limpio * potencia
}

function GraficaArea({ puntos, formatear, descripcion, vacio = 'Sin datos todavía.' }: Props) {
  const idDegradado = useId()
  const [activo, setActivo] = useState<number | null>(null)
  const maximo = Math.max(...puntos.map((p) => p.valor), 0)

  if (maximo <= 0 || puntos.length < 2) {
    return <p className="area__vacio">{vacio}</p>
  }

  const tope = topeLimpio(maximo)
  const paso = 100 / (puntos.length - 1)
  const coordenadas = puntos.map((p, i) => ({ x: i * paso, y: 100 - (p.valor / tope) * 100 }))
  // Curva suave que nunca rebasa los valores reales: los puntos de control comparten altura con su extremo.
  const linea = coordenadas
    .map((c, i) => {
      if (i === 0) return `M ${c.x} ${c.y}`
      const anterior = coordenadas[i - 1]
      const medio = (anterior.x + c.x) / 2
      return `C ${medio} ${anterior.y}, ${medio} ${c.y}, ${c.x} ${c.y}`
    })
    .join(' ')
  const punto = activo === null ? null : { ...puntos[activo], ...coordenadas[activo] }

  return (
    <div className="area">
      <div className="area__ejey" aria-hidden="true">
        <span>{formatear(tope)}</span>
        <span>{formatear(tope / 2)}</span>
        <span>{formatear(0)}</span>
      </div>

      <div className="area__lienzo" role="group" aria-label={descripcion} onMouseLeave={() => setActivo(null)}>
        <span className="area__rejilla" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id={idDegradado} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--verde-salsa)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--verde-salsa)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className="area__relleno" d={`${linea} L 100 100 L 0 100 Z`} fill={`url(#${idDegradado})`} />
          <path className="area__linea" d={linea} />
        </svg>

        {punto && (
          <>
            <span className="area__guia" style={{ left: `${punto.x}%` }} aria-hidden="true" />
            <span className="area__marca" style={{ left: `${punto.x}%`, top: `${punto.y}%` }} aria-hidden="true" />
            <span
              className={`area__globo ${punto.x < 25 ? 'is-izq' : punto.x > 75 ? 'is-der' : ''}`}
              style={{ left: `${punto.x}%`, top: `${punto.y}%` }}
              role="tooltip"
            >
              <strong>{punto.titulo}</strong>
              {punto.detalle.map((linea) => (
                <span key={linea}>{linea}</span>
              ))}
            </span>
          </>
        )}

        <div className="area__zonas" style={{ marginInline: `-${paso / 2}%` }}>
          {puntos.map((p, i) => (
            <button
              type="button"
              key={p.clave}
              className="area__zona"
              aria-label={`${p.titulo}: ${p.detalle.join(', ')}`}
              onMouseEnter={() => setActivo(i)}
              onFocus={() => setActivo(i)}
              onBlur={() => setActivo(null)}
              onClick={() => setActivo(i)}
            />
          ))}
        </div>
      </div>

      <div className="area__ejex" aria-hidden="true">
        {puntos.map((p, i) => (
          <span key={p.clave} className={i === activo ? 'is-activa' : ''}>
            {p.eje}
          </span>
        ))}
      </div>
    </div>
  )
}

export default GraficaArea

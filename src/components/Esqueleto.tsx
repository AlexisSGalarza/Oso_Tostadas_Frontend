import type { CSSProperties } from 'react'

type Props = {
  ancho?: string
  alto?: string
  className?: string
}

// Bloque gris que ocupa el lugar del contenido mientras llega del servidor.
export function Esqueleto({ ancho = '100%', alto = '1rem', className = '' }: Props) {
  return <span className={`esq ${className}`} style={{ width: ancho, height: alto } as CSSProperties} aria-hidden="true" />
}

const ANCHOS = ['62%', '48%', '71%', '55%', '66%', '44%']

// Tarjeta con renglones, para las pantallas que cargan una lista o una tabla.
export function EsqueletoLista({ filas = 5, etiqueta = 'Cargando…' }: { filas?: number; etiqueta?: string }) {
  return (
    <div className="tarjeta esq-lista" role="status">
      <span className="solo-lectores">{etiqueta}</span>
      {Array.from({ length: filas }, (_, i) => (
        <div className="esq-lista__fila" key={i}>
          <Esqueleto ancho={ANCHOS[i % ANCHOS.length]} alto="0.9rem" />
          <Esqueleto ancho="4.5rem" alto="0.9rem" />
        </div>
      ))}
    </div>
  )
}

// Fila de tarjetas de cifras.
export function EsqueletoKpis({ cantidad = 4 }: { cantidad?: number }) {
  return (
    <div className="kpis" aria-hidden="true">
      {Array.from({ length: cantidad }, (_, i) => (
        <div className="kpi" key={i}>
          <Esqueleto ancho="45%" alto="0.8rem" />
          <Esqueleto ancho="60%" alto="1.9rem" />
          <Esqueleto alto="2rem" />
          <Esqueleto ancho="80%" alto="0.75rem" />
        </div>
      ))}
    </div>
  )
}

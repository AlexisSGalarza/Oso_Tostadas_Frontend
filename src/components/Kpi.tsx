import type { CSSProperties, ReactNode } from 'react'
import Icono from './Icono'
import Sparkline from './Sparkline'
import { useConteo } from '../lib/conteo'

type Props = {
  etiqueta: string
  // Con numero la cifra sube animada; con texto se muestra tal cual. null = sin dato.
  valor: number | string | null
  formato?: (valor: number) => string
  nota?: ReactNode
  // Variacion en porcentaje contra el periodo anterior.
  cambio?: number | null
  // Serie para la tendencia en miniatura y a que periodo corresponde.
  serie?: number[]
  seriePeriodo?: string
  // Avance de 0 a 100 cuando la cifra es parte de un total (por ejemplo, el margen).
  avance?: number | null
  tono?: 'normal' | 'alerta'
  indice?: number
}

function Kpi({ etiqueta, valor, formato = String, nota, cambio, serie, seriePeriodo, avance, tono = 'normal', indice = 0 }: Props) {
  const animado = useConteo(typeof valor === 'number' ? valor : 0)
  const texto = valor === null ? '—' : typeof valor === 'number' ? formato(animado) : valor

  return (
    <div className={`kpi entra ${tono === 'alerta' ? 'is-alerta' : ''}`} style={{ '--i': indice } as CSSProperties}>
      <div className="kpi__cabeza">
        <span className="kpi__etiqueta">{etiqueta}</span>
        {cambio !== null && cambio !== undefined && (
          <span className={`kpi__cambio ${cambio >= 0 ? 'is-sube' : 'is-baja'}`}>
            <Icono nombre={cambio >= 0 ? 'flecha-sube' : 'flecha-baja'} />
            {Math.abs(cambio).toFixed(0)}%
            <span className="solo-lectores">{cambio >= 0 ? ' más' : ' menos'}</span>
          </span>
        )}
      </div>
      <span className="kpi__valor">{texto}</span>
      {serie && serie.length > 1 && (
        <span className="kpi__tendencia">
          <Sparkline valores={serie} />
          {seriePeriodo && <span className="kpi__periodo">{seriePeriodo}</span>}
        </span>
      )}
      {avance !== null && avance !== undefined && (
        <span className="kpi__avance" aria-hidden="true">
          <span style={{ width: `${Math.min(Math.max(avance, 0), 100)}%` }} />
        </span>
      )}
      {nota && <span className="kpi__nota">{nota}</span>}
    </div>
  )
}

export default Kpi

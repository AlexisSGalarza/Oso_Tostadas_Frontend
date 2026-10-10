import type { ReactNode } from 'react'
import Icono, { type NombreIcono } from './Icono'

type Props = {
  icono: NombreIcono
  titulo: string
  children?: ReactNode
  compacto?: boolean
}

function EstadoVacio({ icono, titulo, children, compacto = false }: Props) {
  return (
    <div className={`vacio ${compacto ? 'vacio--compacto' : ''}`}>
      <span className="vacio__icono" aria-hidden="true">
        <Icono nombre={icono} />
      </span>
      <p className="vacio__titulo">{titulo}</p>
      {children && <p className="vacio__texto">{children}</p>}
    </div>
  )
}

export default EstadoVacio

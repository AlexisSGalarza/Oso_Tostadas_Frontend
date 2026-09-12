import { useState } from 'react'
import BearMark from './BearMark'
import ConfirmDialog from './ConfirmDialog'
import './TopBar.css'

type Props = {
  clock: string
  sucursal?: string
  onCerrarSesion: () => void
  onVolver?: () => void
  volverLabel?: string
}

function TopBar({ clock, sucursal = 'Sucursal Centro', onCerrarSesion, onVolver, volverLabel }: Props) {
  const [confirmandoSalida, setConfirmandoSalida] = useState(false)

  return (
    <header className="topbar">
      <div className="topbar__brand">
        {onVolver ? (
          <button type="button" className="topbar__back" onClick={onVolver}>
            <span aria-hidden="true">←</span> {volverLabel ?? 'Volver'}
          </button>
        ) : (
          <>
            <BearMark className="topbar__mark" />
            <span className="topbar__name">Oso Tostadas</span>
          </>
        )}
      </div>
      <div className="topbar__meta">
        <span className="topbar__sucursal">{sucursal}</span>
        <span className="topbar__clock">{clock}</span>
        <button type="button" className="topbar__logout" onClick={() => setConfirmandoSalida(true)}>
          Cerrar sesión
        </button>
      </div>

      <ConfirmDialog
        open={confirmandoSalida}
        title="¿Cerrar sesión?"
        message="Vas a salir del punto de venta. Si tienes un turno abierto, sigue abierto y puedes volver a entrar para continuar."
        confirmLabel="Cerrar sesión"
        cancelLabel="Seguir aquí"
        tone="danger"
        onCancel={() => setConfirmandoSalida(false)}
        onConfirm={() => {
          setConfirmandoSalida(false)
          onCerrarSesion()
        }}
      />
    </header>
  )
}

export default TopBar

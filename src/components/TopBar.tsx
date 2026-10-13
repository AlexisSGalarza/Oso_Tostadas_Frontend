import { useState } from 'react'
import BearMark from './BearMark'
import ConfirmDialog from './ConfirmDialog'
import Icono from './Icono'
import { useShell } from './AppShell'
import './TopBar.css'

type Props = {
  clock: string
  sucursal?: string
  onCerrarSesion: () => void
  onVolver?: () => void
  volverLabel?: string
  // Dentro del menu lateral solo las pantallas de detalle muestran "Volver";
  // a las secciones principales se llega desde el menu.
  esDetalle?: boolean
}

function TopBar({ clock, sucursal, onCerrarSesion, onVolver, volverLabel, esDetalle = false }: Props) {
  const shell = useShell()
  const [confirmandoSalida, setConfirmandoSalida] = useState(false)

  if (shell) {
    return (
      <header className="topbar topbar--shell">
        <div className="topbar__brand">
          <button type="button" className="topbar__menu" onClick={shell.abrirMenu} aria-label="Abrir menú">
            <Icono nombre="menu" />
          </button>
          {esDetalle && onVolver ? (
            <button type="button" className="topbar__back" onClick={onVolver}>
              <Icono nombre="volver" /> {volverLabel ?? 'Volver'}
            </button>
          ) : (
            <span className="topbar__name topbar__name--movil">Oso Tostadas</span>
          )}
        </div>
        <div className="topbar__meta">
          <span className="topbar__sucursal">{sucursal ?? shell.sucursal}</span>
          <span className="topbar__clock">{clock}</span>
        </div>
      </header>
    )
  }

  return (
    <header className="topbar">
      <div className="topbar__brand">
        {onVolver ? (
          <button type="button" className="topbar__back" onClick={onVolver}>
            <Icono nombre="volver" /> {volverLabel ?? 'Volver'}
          </button>
        ) : (
          <>
            <BearMark className="topbar__mark" />
            <span className="topbar__name">Oso Tostadas</span>
          </>
        )}
      </div>
      <div className="topbar__meta">
        {sucursal && <span className="topbar__sucursal">{sucursal}</span>}
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

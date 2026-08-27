import BearMark from './BearMark'
import './TopBar.css'

type Props = {
  clock: string
  sucursal?: string
  onCerrarSesion: () => void
  onVolver?: () => void
  volverLabel?: string
}

function TopBar({ clock, sucursal = 'Sucursal Centro', onCerrarSesion, onVolver, volverLabel }: Props) {
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
        <button type="button" className="topbar__logout" onClick={onCerrarSesion}>
          Cerrar sesión
        </button>
      </div>
    </header>
  )
}

export default TopBar

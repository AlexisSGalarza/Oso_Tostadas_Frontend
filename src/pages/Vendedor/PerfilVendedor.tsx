import TopBar from '../../components/TopBar'
import { formatClock, formatElapsed, formatMoney } from '../../lib/format'
import type { Devolucion, Venta } from './types'
import './PerfilVendedor.css'

type Props = {
  now: Date
  turnoInicio: Date | null
  ventas: Venta[]
  devoluciones: Devolucion[]
  onAbrirTurno: () => void
  onCerrarTurno: () => void
  onCerrarSesion: () => void
  onNuevaVenta: () => void
  onHistorial: () => void
  onCorte: () => void
  onDevolucion: () => void
}

function contarPaquetes(movimientos: { items: { cantidad: number }[] }[]) {
  return movimientos.flatMap((movimiento) => movimiento.items).reduce((suma, item) => suma + item.cantidad, 0)
}

function PerfilVendedor({
  now,
  turnoInicio,
  ventas,
  devoluciones,
  onAbrirTurno,
  onCerrarTurno,
  onCerrarSesion,
  onNuevaVenta,
  onHistorial,
  onCorte,
  onDevolucion,
}: Props) {
  const turnoAbierto = turnoInicio !== null
  const totalVentas = ventas.reduce((suma, venta) => suma + venta.total, 0)
  const totalDevoluciones = devoluciones.reduce((suma, devolucion) => suma + devolucion.total, 0)
  const ventasNetas = totalVentas - totalDevoluciones
  const paquetesVendidos = contarPaquetes(ventas) - contarPaquetes(devoluciones)
  const ticketPromedio = ventas.length > 0 ? totalVentas / ventas.length : 0

  return (
    <div className="perfil">
      <TopBar clock={formatClock(now)} onCerrarSesion={onCerrarSesion} />

      <main className="perfil__main">
        <section className="saludo">
          <h1>Hola, María</h1>
          <p className="saludo__rol">Vendedora · Sucursal Centro</p>
        </section>

        <div className="paneles">
          <section className="turno">
            <div className="turno__head">
              <span className="turno__label">Turno</span>
              <span className={`turno__estado ${turnoAbierto ? 'is-abierto' : 'is-cerrado'}`}>
                {turnoAbierto ? 'Abierto' : 'Cerrado'}
              </span>
            </div>

            {turnoAbierto && turnoInicio ? (
              <>
                <p className="turno__tiempo">{formatElapsed(now.getTime() - turnoInicio.getTime())}</p>
                <p className="turno__detalle">
                  Inicio {formatClock(turnoInicio)} · Corte estimado 21:00
                </p>
                <button type="button" className="turno__accion turno__accion--cerrar" onClick={onCerrarTurno}>
                  Cerrar turno
                </button>
              </>
            ) : (
              <>
                <p className="turno__hint">Abre tu turno para comenzar a vender.</p>
                <button type="button" className="turno__accion turno__accion--abrir" onClick={onAbrirTurno}>
                  Iniciar turno
                </button>
              </>
            )}

            <div className="turno__footer">
              <span>CAJA 01</span>
              <span>{formatClock(now)}</span>
            </div>
          </section>

          <nav className="acciones" aria-label="Acciones rápidas">
            <button type="button" className="accion accion--principal" disabled={!turnoAbierto} onClick={onNuevaVenta}>
              <span>Nueva venta</span>
              <span aria-hidden="true">→</span>
            </button>
            <button type="button" className="accion" disabled={!turnoAbierto} onClick={onHistorial}>
              <span>Historial del turno</span>
              <span aria-hidden="true">→</span>
            </button>
            <button type="button" className="accion" disabled={!turnoAbierto} onClick={onCorte}>
              <span>Solicitar corte de caja</span>
              <span aria-hidden="true">→</span>
            </button>
            <button type="button" className="accion" disabled={!turnoAbierto} onClick={onDevolucion}>
              <span>Procesar una devolución</span>
              <span aria-hidden="true">→</span>
            </button>
          </nav>
        </div>

        <section className="stats" aria-label="Resumen de hoy">
          <div className="stat">
            <span className="stat__valor">{turnoAbierto ? formatMoney(ventasNetas) : '—'}</span>
            <span className="stat__etiqueta">Ventas de hoy</span>
          </div>
          <div className="stat">
            <span className="stat__valor">{turnoAbierto ? paquetesVendidos : '—'}</span>
            <span className="stat__etiqueta">Paquetes vendidos</span>
          </div>
          <div className="stat">
            <span className="stat__valor">{turnoAbierto && ventas.length > 0 ? formatMoney(ticketPromedio) : '—'}</span>
            <span className="stat__etiqueta">Ticket promedio</span>
          </div>
        </section>
      </main>
    </div>
  )
}

export default PerfilVendedor

import TopBar from '../../components/TopBar'
import { formatClock, formatMoney, formatTicket } from '../../lib/format'
import type { Devolucion, Venta } from './types'
import './HistorialScreen.css'

type Props = {
  now: Date
  ventas: Venta[]
  devoluciones: Devolucion[]
  onVolver: () => void
  onCerrarSesion: () => void
  onNuevaVenta: () => void
}

type Movimiento = { tipo: 'venta'; data: Venta } | { tipo: 'devolucion'; data: Devolucion }

function resumenItems(items: { nombre: string; cantidad: number }[]) {
  return items.map((item) => `${item.cantidad}× ${item.nombre}`).join(', ')
}

function HistorialScreen({ now, ventas, devoluciones, onVolver, onCerrarSesion, onNuevaVenta }: Props) {
  const totalVentas = ventas.reduce((suma, venta) => suma + venta.total, 0)
  const totalDevoluciones = devoluciones.reduce((suma, devolucion) => suma + devolucion.total, 0)
  const totalNeto = totalVentas - totalDevoluciones

  const movimientos: Movimiento[] = [
    ...ventas.map((venta): Movimiento => ({ tipo: 'venta', data: venta })),
    ...devoluciones.map((devolucion): Movimiento => ({ tipo: 'devolucion', data: devolucion })),
  ].sort((a, b) => b.data.hora.getTime() - a.data.hora.getTime())

  return (
    <div className="historial">
      <TopBar clock={formatClock(now)} onVolver={onVolver} volverLabel="Perfil" onCerrarSesion={onCerrarSesion} />

      <main className="historial__main">
        <h1>Historial del turno</h1>
        <p className="historial__subtitulo">Ventas y devoluciones registradas en tu turno actual</p>

        {movimientos.length === 0 ? (
          <div className="historial__vacio">
            <p>Aún no registras ventas en este turno.</p>
            <button type="button" onClick={onNuevaVenta}>
              Registrar una venta
            </button>
          </div>
        ) : (
          <>
            <ul className="rollo">
              {movimientos.map((movimiento) =>
                movimiento.tipo === 'venta' ? (
                  <li key={`venta-${movimiento.data.id}`} className="ticket-fila">
                    <div className="ticket-fila__principal">
                      <span className="ticket-fila__numero">{formatTicket(movimiento.data.id)}</span>
                      <span className="ticket-fila__hora">{formatClock(movimiento.data.hora)}</span>
                      <span className={`pill pill--${movimiento.data.metodoPago}`}>
                        {movimiento.data.metodoPago === 'efectivo' ? 'Efectivo' : 'Tarjeta'}
                      </span>
                    </div>
                    <p className="ticket-fila__items">{resumenItems(movimiento.data.items)}</p>
                    {movimiento.data.metodoPago === 'efectivo' && movimiento.data.efectivoRecibido !== undefined && (
                      <p className="ticket-fila__cambio">
                        Recibió {formatMoney(movimiento.data.efectivoRecibido)} · Cambio{' '}
                        {formatMoney(movimiento.data.cambio ?? 0)}
                      </p>
                    )}
                    <span className="ticket-fila__total">{formatMoney(movimiento.data.total)}</span>
                  </li>
                ) : (
                  <li key={`devolucion-${movimiento.data.id}`} className="ticket-fila ticket-fila--devolucion">
                    <div className="ticket-fila__principal">
                      <span className="ticket-fila__numero">{formatTicket(movimiento.data.id)}</span>
                      <span className="ticket-fila__hora">{formatClock(movimiento.data.hora)}</span>
                      <span className="pill pill--devolucion">Devolución</span>
                    </div>
                    <p className="ticket-fila__items">
                      Ref. {formatTicket(movimiento.data.ventaId)} · {resumenItems(movimiento.data.items)}
                    </p>
                    <span className="ticket-fila__total ticket-fila__total--negativo">
                      −{formatMoney(movimiento.data.total)}
                    </span>
                  </li>
                ),
              )}
            </ul>

            <div className="historial__resumen">
              <span>
                {ventas.length} ventas
                {devoluciones.length > 0 ? ` · ${devoluciones.length} devoluciones` : ''}
              </span>
              <span>{formatMoney(totalNeto)}</span>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default HistorialScreen

import { useState } from 'react'
import TopBar from '../../components/TopBar'
import { formatClock, formatMoney } from '../../lib/format'
import type { EmpleadoMe, Turno } from '../../lib/api'
import type { Devolucion, Venta } from './types'
import './PerfilVendedor.css'

type Props = {
  now: Date
  empleado: EmpleadoMe
  turno: Turno | null
  turnoError: string
  ventas: Venta[]
  devoluciones: Devolucion[]
  onAbrirTurno: (montoInicial: number) => void | Promise<void>
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

function calcularElapsed(horaInicio: string, fecha: string, now: Date) {
  const inicio = new Date(`${fecha}T${horaInicio}`)
  const ms = now.getTime() - inicio.getTime()
  const horas = Math.floor(ms / 3_600_000)
  const minutos = Math.floor((ms % 3_600_000) / 60_000)
  return `${horas}h ${minutos}m`
}

function PerfilVendedor({
  now,
  empleado,
  turno,
  turnoError,
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
  const [montoInicial, setMontoInicial] = useState('500')
  const [abriendo, setAbriendo] = useState(false)

  const turnoAbierto = turno !== null && turno.estado === 'abierto'
  const totalVentas = ventas.reduce((suma, venta) => suma + venta.total, 0)
  const totalDevoluciones = devoluciones.reduce((suma, devolucion) => suma + devolucion.total, 0)
  const ventasNetas = totalVentas - totalDevoluciones
  const paquetesVendidos = contarPaquetes(ventas) - contarPaquetes(devoluciones)
  const ticketPromedio = ventas.length > 0 ? totalVentas / ventas.length : 0

  async function iniciarTurno() {
    const monto = Number.parseFloat(montoInicial)
    if (Number.isNaN(monto) || monto < 0) return
    setAbriendo(true)
    try {
      await onAbrirTurno(monto)
    } finally {
      setAbriendo(false)
    }
  }

  return (
    <div className="perfil">
      <TopBar clock={formatClock(now)} onCerrarSesion={onCerrarSesion} />

      <main className="perfil__main">
        <section className="saludo">
          <h1>Hola, {empleado.nombre}</h1>
          <p className="saludo__rol">
            {empleado.rol} · {empleado.sucursal}
          </p>
        </section>

        <div className="paneles">
          <section className="turno">
            <div className="turno__head">
              <span className="turno__label">Turno</span>
              <span className={`turno__estado ${turnoAbierto ? 'is-abierto' : 'is-cerrado'}`}>
                {turnoAbierto ? 'Abierto' : 'Cerrado'}
              </span>
            </div>

            {turnoAbierto && turno ? (
              <>
                <p className="turno__tiempo">{calcularElapsed(turno.hora_inicio, turno.fecha, now)}</p>
                <p className="turno__detalle">
                  Inicio {turno.hora_inicio.slice(0, 5)} · Fondo inicial {formatMoney(turno.monto_inicial)}
                </p>
                <button type="button" className="turno__accion turno__accion--cerrar" onClick={onCerrarTurno}>
                  Cerrar turno
                </button>
              </>
            ) : (
              <>
                <p className="turno__hint">Abre tu turno para comenzar a vender.</p>
                <div className="turno__monto-inicial">
                  <label htmlFor="monto-inicial">Fondo inicial de caja</label>
                  <input
                    id="monto-inicial"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={montoInicial}
                    onChange={(event) => setMontoInicial(event.target.value)}
                  />
                </div>
                {turnoError && (
                  <p className="turno__error" role="alert">
                    {turnoError}
                  </p>
                )}
                <button
                  type="button"
                  className="turno__accion turno__accion--abrir"
                  onClick={iniciarTurno}
                  disabled={abriendo}
                >
                  {abriendo ? 'Abriendo…' : 'Iniciar turno'}
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

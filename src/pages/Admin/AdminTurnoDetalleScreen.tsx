import { useEffect, useState } from 'react'
import TopBar from '../../components/TopBar'
import { formatClock, formatFecha, formatMoney, ZONA_HORARIA_MX } from '../../lib/format'
import { api, ApiError, type TurnoDetalleAdmin, type VentaApi } from '../../lib/api'
import './AdminTurnoDetalleScreen.css'

function formatHora(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: ZONA_HORARIA_MX })
}

function metodoPagoDe(venta: VentaApi) {
  return venta.pagos[0]?.metodo_pago === 'tarjeta' ? 'tarjeta' : 'efectivo'
}

function disponible(venta: VentaApi, idProducto: number) {
  const original = venta.detalles.find((d) => d.id_producto === idProducto)?.unidades ?? 0
  const yaDevuelto = venta.devoluciones
    .flatMap((d) => d.detalles)
    .filter((d) => d.id_producto === idProducto)
    .reduce((suma, d) => suma + d.cantidad, 0)
  return Math.max(0, original - yaDevuelto)
}

type Props = {
  now: Date
  idTurno: number
  onVolver: () => void
  onCerrarSesion: () => void
}

function AdminTurnoDetalleScreen({ now, idTurno, onVolver, onCerrarSesion }: Props) {
  const [turno, setTurno] = useState<TurnoDetalleAdmin | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [ventaAbiertaId, setVentaAbiertaId] = useState<number | null>(null)
  const [cantidades, setCantidades] = useState<Record<number, number>>({})
  const [enviando, setEnviando] = useState(false)
  const [descargandoId, setDescargandoId] = useState<number | null>(null)

  function cargar() {
    setCargando(true)
    api
      .turnoDetalleAdmin(idTurno)
      .then(setTurno)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudo cargar el turno.'))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [idTurno])

  function abrirDevolucion(idVenta: number) {
    setVentaAbiertaId((actual) => (actual === idVenta ? null : idVenta))
    setCantidades({})
  }

  async function confirmarDevolucion(venta: VentaApi) {
    const detalles = venta.detalles
      .filter((d) => (cantidades[d.id_producto] ?? 0) > 0)
      .map((d) => ({ id_producto: d.id_producto, cantidad: cantidades[d.id_producto] }))
    if (detalles.length === 0) return

    setEnviando(true)
    setError('')
    try {
      await api.registrarDevolucion(venta.id_venta, detalles)
      setVentaAbiertaId(null)
      setCantidades({})
      cargar()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar la devolución.')
    } finally {
      setEnviando(false)
    }
  }

  async function descargarRecibo(idVenta: number) {
    setDescargandoId(idVenta)
    try {
      await api.descargarRecibo(idVenta)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo descargar el recibo.')
    } finally {
      setDescargandoId(null)
    }
  }

  return (
    <div className="turnodetalle">
      <TopBar clock={formatClock(now)} onVolver={onVolver} volverLabel="Admin" onCerrarSesion={onCerrarSesion} />

      <main className="turnodetalle__main">
        {cargando && <p className="turnodetalle__subtitulo">Cargando…</p>}
        {error && (
          <p className="turnodetalle__error" role="alert">
            {error}
          </p>
        )}

        {turno && (
          <>
            <h1>Turno de {turno.empleado_nombre}</h1>
            <p className="turnodetalle__subtitulo">
              {formatFecha(new Date(`${turno.fecha}T12:00:00Z`), { day: 'numeric', month: 'long', year: 'numeric' })} ·{' '}
              {turno.hora_inicio.slice(0, 5)}
              {turno.hora_fin ? `–${turno.hora_fin.slice(0, 5)}` : ' (en curso)'} ·{' '}
              {turno.estado === 'abierto' ? 'Abierto' : 'Cerrado'}
            </p>

            {turno.estado === 'cerrado' && (
              <div className="turnodetalle__resumen">
                <span>Fondo inicial: {formatMoney(turno.monto_inicial)}</span>
                <span>Efectivo esperado: {turno.monto_esperado !== null ? formatMoney(turno.monto_esperado) : '—'}</span>
                <span>Efectivo contado: {turno.monto_contado !== null ? formatMoney(turno.monto_contado) : '—'}</span>
                <span className={turno.diferencia ? 'is-desajuste' : 'is-exacto'}>
                  Diferencia: {turno.diferencia !== null ? formatMoney(turno.diferencia) : '—'}
                </span>
              </div>
            )}

            {turno.ventas.length === 0 ? (
              <p className="turnodetalle__subtitulo">Este turno no tiene ventas registradas.</p>
            ) : (
              <ul className="turnodetalle__lista">
                {turno.ventas.map((venta) => {
                  const metodoPago = metodoPagoDe(venta)
                  return (
                    <li key={venta.id_venta} className="tventa">
                      <div className="tventa__cabeza">
                        <span className="tventa__numero">Ticket #{venta.id_venta}</span>
                        <span className="tventa__hora">{formatHora(venta.creado_en)}</span>
                        <span className={`pill pill--${metodoPago}`}>
                          {metodoPago === 'efectivo' ? 'Efectivo' : 'Tarjeta'}
                        </span>
                      </div>
                      <p className="tventa__items">
                        {venta.detalles.map((d) => `${d.unidades}× ${d.producto}`).join(', ')}
                      </p>
                      {venta.devoluciones.length > 0 && (
                        <p className="tventa__devuelto">
                          Ya devuelto: {venta.devoluciones.map((d) => formatMoney(d.monto)).join(', ')}
                        </p>
                      )}
                      <div className="tventa__pie">
                        <div className="tventa__acciones">
                          <button
                            type="button"
                            className="tventa__boton"
                            onClick={() => descargarRecibo(venta.id_venta)}
                            disabled={descargandoId === venta.id_venta}
                          >
                            {descargandoId === venta.id_venta ? 'Generando…' : 'Recibo'}
                          </button>
                          <button
                            type="button"
                            className="tventa__boton"
                            onClick={() => abrirDevolucion(venta.id_venta)}
                            disabled={venta.detalles.every((d) => disponible(venta, d.id_producto) === 0)}
                          >
                            {ventaAbiertaId === venta.id_venta ? 'Cancelar' : 'Devolver'}
                          </button>
                        </div>
                        <span className="tventa__total">{formatMoney(venta.total)}</span>
                      </div>

                      {ventaAbiertaId === venta.id_venta && (
                        <div className="tventa__form">
                          {venta.detalles.map((d) => {
                            const max = disponible(venta, d.id_producto)
                            const cantidad = cantidades[d.id_producto] ?? 0
                            return (
                              <div key={d.id_producto} className="tventa__formfila">
                                <span>{d.producto}</span>
                                <div className="tventa__cantidad">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCantidades((actual) => ({
                                        ...actual,
                                        [d.id_producto]: Math.max(0, (actual[d.id_producto] ?? 0) - 1),
                                      }))
                                    }
                                    disabled={cantidad === 0}
                                    aria-label={`Quitar una unidad de ${d.producto} de la devolución`}
                                  >
                                    −
                                  </button>
                                  <span aria-live="polite">{cantidad}</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCantidades((actual) => ({
                                        ...actual,
                                        [d.id_producto]: Math.min(max, (actual[d.id_producto] ?? 0) + 1),
                                      }))
                                    }
                                    disabled={cantidad >= max}
                                    aria-label={`Agregar una unidad de ${d.producto} a la devolución`}
                                  >
                                    +
                                  </button>
                                </div>
                                <span className="tventa__disponible">Disp: {max}</span>
                              </div>
                            )
                          })}
                          <button
                            type="button"
                            className="tventa__confirmar"
                            onClick={() => confirmarDevolucion(venta)}
                            disabled={enviando || Object.values(cantidades).every((c) => !c)}
                          >
                            {enviando ? 'Registrando…' : 'Confirmar devolución'}
                          </button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default AdminTurnoDetalleScreen

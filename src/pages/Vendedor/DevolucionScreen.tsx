import { useState } from 'react'
import TopBar from '../../components/TopBar'
import { formatClock, formatMoney, formatTicket } from '../../lib/format'
import { api, ApiError } from '../../lib/api'
import type { Devolucion, Venta } from './types'
import './DevolucionScreen.css'

// Debe coincidir con IVA_RATE en el backend (config/settings.py); solo se usa
// para la vista previa del total antes de confirmar. El monto real lo calcula
// el servidor al registrar la devolucion.
const IVA_ESTIMADO = 0.16

type Props = {
  now: Date
  ventas: Venta[]
  devoluciones: Devolucion[]
  onVolver: () => void
  onCerrarSesion: () => void
  onRegistrarDevolucion: (devolucion: Devolucion) => void
}

function disponible(venta: Venta, devoluciones: Devolucion[], idProducto: number) {
  const original = venta.items.find((item) => item.id_producto === idProducto)?.cantidad ?? 0
  const yaDevuelto = devoluciones
    .filter((devolucion) => devolucion.ventaId === venta.idVenta)
    .flatMap((devolucion) => devolucion.items)
    .filter((item) => item.id_producto === idProducto)
    .reduce((suma, item) => suma + item.cantidad, 0)
  return Math.max(0, original - yaDevuelto)
}

function ventaTieneDisponible(venta: Venta, devoluciones: Devolucion[]) {
  return venta.items.some((item) => item.id_producto !== undefined && disponible(venta, devoluciones, item.id_producto) > 0)
}

function resumenItems(venta: { items: { nombre: string; cantidad: number }[] }) {
  return venta.items.map((item) => `${item.cantidad}× ${item.nombre}`).join(', ')
}

function DevolucionScreen({
  now,
  ventas,
  devoluciones,
  onVolver,
  onCerrarSesion,
  onRegistrarDevolucion,
}: Props) {
  const [ventaId, setVentaId] = useState<number | null>(null)
  const [cantidades, setCantidades] = useState<Record<number, number>>({})
  const [confirmado, setConfirmado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const disponibles = [...ventas].reverse().filter((venta) => ventaTieneDisponible(venta, devoluciones))
  const venta = ventaId !== null ? ventas.find((v) => v.id === ventaId) ?? null : null

  function elegirVenta(seleccionada: Venta) {
    setVentaId(seleccionada.id)
    setCantidades({})
    setError('')
  }

  function ajustarCantidad(idProducto: number, maximo: number, delta: number) {
    setCantidades((actual) => {
      const siguiente = Math.min(maximo, Math.max(0, (actual[idProducto] ?? 0) + delta))
      return { ...actual, [idProducto]: siguiente }
    })
  }

  const subtotal = venta
    ? venta.items.reduce(
        (suma, item) => suma + item.precio * (item.id_producto !== undefined ? cantidades[item.id_producto] ?? 0 : 0),
        0,
      )
    : 0
  const total = Math.round(subtotal * (1 + IVA_ESTIMADO) * 100) / 100
  const hayCantidad = total > 0

  async function confirmar() {
    if (!venta || !venta.idVenta || !hayCantidad || enviando) return
    setEnviando(true)
    setError('')
    try {
      const detalles = venta.items
        .filter((item) => item.id_producto !== undefined && (cantidades[item.id_producto] ?? 0) > 0)
        .map((item) => ({ id_producto: item.id_producto as number, cantidad: cantidades[item.id_producto as number] }))

      const devolucionCreada = await api.registrarDevolucion(venta.idVenta, detalles)

      onRegistrarDevolucion({
        id: devolucionCreada.id_devolucion,
        ventaId: venta.idVenta,
        hora: new Date(),
        items: devolucionCreada.detalles.map((det) => ({
          id_producto: det.id_producto,
          nombre: det.producto,
          precio: venta.items.find((it) => it.id_producto === det.id_producto)?.precio ?? 0,
          cantidad: det.cantidad,
        })),
        total: devolucionCreada.monto,
        metodoPago: venta.metodoPago,
      })

      setConfirmado(true)
      setTimeout(() => {
        setConfirmado(false)
        setVentaId(null)
        setCantidades({})
      }, 1100)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar la devolución.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="devolucion">
      <TopBar clock={formatClock(now)} onVolver={onVolver} volverLabel="Perfil" onCerrarSesion={onCerrarSesion} />

      <main className="devolucion__main">
        <h1>Devolución</h1>
        <p className="devolucion__subtitulo">Elige el ticket y los paquetes que se regresan</p>

        {confirmado ? (
          <div className="devolucion__confirmado">
            <p>Devolución registrada</p>
            <p className="devolucion__confirmado-sub">Ticket impreso</p>
          </div>
        ) : venta ? (
          <div className="detalle">
            <div className="detalle__head">
              <button type="button" className="detalle__volver" onClick={() => setVentaId(null)}>
                <span aria-hidden="true">←</span> Elegir otro ticket
              </button>
              <span className="detalle__ticket">{formatTicket(venta.id)}</span>
            </div>
            <p className="detalle__meta">
              {formatClock(venta.hora)} · {venta.metodoPago === 'efectivo' ? 'Efectivo' : 'Tarjeta'}
            </p>

            <ul className="detalle__items">
              {venta.items.map((item) => {
                const maximo = item.id_producto !== undefined ? disponible(venta, devoluciones, item.id_producto) : 0
                const cantidad = item.id_producto !== undefined ? cantidades[item.id_producto] ?? 0 : 0
                return (
                  <li key={item.id_producto ?? item.nombre} className={`renglon ${maximo === 0 ? 'is-agotado' : ''}`}>
                    <div className="renglon__info">
                      <span className="renglon__nombre">{item.nombre}</span>
                      <span className="renglon__disponible">
                        {maximo === 0 ? 'Ya devuelto' : `Disponible: ${maximo}`}
                      </span>
                    </div>
                    <div className="renglon__cantidad">
                      <button
                        type="button"
                        onClick={() => item.id_producto !== undefined && ajustarCantidad(item.id_producto, maximo, -1)}
                        disabled={cantidad === 0}
                        aria-label={`Quitar una unidad de ${item.nombre} de la devolución`}
                      >
                        −
                      </button>
                      <span aria-live="polite">{cantidad}</span>
                      <button
                        type="button"
                        onClick={() => item.id_producto !== undefined && ajustarCantidad(item.id_producto, maximo, 1)}
                        disabled={cantidad >= maximo}
                        aria-label={`Agregar una unidad de ${item.nombre} a la devolución`}
                      >
                        +
                      </button>
                    </div>
                    <span className="renglon__total">{formatMoney(item.precio * cantidad)}</span>
                  </li>
                )
              })}
            </ul>

            <div className="detalle__total">
              <span>Total a devolver (con IVA est.)</span>
              <span>{formatMoney(total)}</span>
            </div>

            {error && (
              <p className="devolucion__error" role="alert">
                {error}
              </p>
            )}

            <button type="button" className="detalle__confirmar" onClick={confirmar} disabled={!hayCantidad || enviando}>
              {enviando ? 'Registrando…' : `Confirmar devolución de ${formatMoney(total)}`}
            </button>
          </div>
        ) : disponibles.length === 0 ? (
          <div className="devolucion__vacio">
            <p>
              {ventas.length === 0
                ? 'Aún no hay ventas en este turno para devolver.'
                : 'No quedan paquetes disponibles para devolver en este turno.'}
            </p>
          </div>
        ) : (
          <ul className="lista">
            {disponibles.map((v) => (
              <li key={v.id} className="lista__fila">
                <div className="lista__info">
                  <div className="lista__principal">
                    <span className="lista__numero">{formatTicket(v.id)}</span>
                    <span className="lista__hora">{formatClock(v.hora)}</span>
                  </div>
                  <p className="lista__items">{resumenItems(v)}</p>
                </div>
                <div className="lista__accion">
                  <span className="lista__total">{formatMoney(v.total)}</span>
                  <button type="button" onClick={() => elegirVenta(v)}>
                    Devolver
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

export default DevolucionScreen

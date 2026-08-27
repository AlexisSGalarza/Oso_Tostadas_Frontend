import { useState } from 'react'
import TopBar from '../../components/TopBar'
import { formatClock, formatMoney, formatTicket } from '../../lib/format'
import type { Devolucion, Venta } from './types'
import './DevolucionScreen.css'

type Props = {
  now: Date
  ventas: Venta[]
  devoluciones: Devolucion[]
  siguienteTicket: number
  onVolver: () => void
  onCerrarSesion: () => void
  onRegistrarDevolucion: (devolucion: Devolucion) => void
}

function disponible(venta: Venta, devoluciones: Devolucion[], nombre: string) {
  const original = venta.items.find((item) => item.nombre === nombre)?.cantidad ?? 0
  const yaDevuelto = devoluciones
    .filter((devolucion) => devolucion.ventaId === venta.id)
    .flatMap((devolucion) => devolucion.items)
    .filter((item) => item.nombre === nombre)
    .reduce((suma, item) => suma + item.cantidad, 0)
  return Math.max(0, original - yaDevuelto)
}

function ventaTieneDisponible(venta: Venta, devoluciones: Devolucion[]) {
  return venta.items.some((item) => disponible(venta, devoluciones, item.nombre) > 0)
}

function resumenItems(venta: Venta) {
  return venta.items.map((item) => `${item.cantidad}× ${item.nombre}`).join(', ')
}

function DevolucionScreen({
  now,
  ventas,
  devoluciones,
  siguienteTicket,
  onVolver,
  onCerrarSesion,
  onRegistrarDevolucion,
}: Props) {
  const [ventaId, setVentaId] = useState<number | null>(null)
  const [cantidades, setCantidades] = useState<Record<string, number>>({})
  const [confirmado, setConfirmado] = useState(false)

  const disponibles = [...ventas].reverse().filter((venta) => ventaTieneDisponible(venta, devoluciones))
  const venta = ventaId !== null ? ventas.find((v) => v.id === ventaId) ?? null : null

  function elegirVenta(seleccionada: Venta) {
    setVentaId(seleccionada.id)
    setCantidades({})
  }

  function ajustarCantidad(nombre: string, maximo: number, delta: number) {
    setCantidades((actual) => {
      const siguiente = Math.min(maximo, Math.max(0, (actual[nombre] ?? 0) + delta))
      return { ...actual, [nombre]: siguiente }
    })
  }

  const total = venta
    ? venta.items.reduce((suma, item) => suma + item.precio * (cantidades[item.nombre] ?? 0), 0)
    : 0
  const hayCantidad = total > 0

  function confirmar() {
    if (!venta || !hayCantidad) return
    const itemsDevueltos = venta.items
      .filter((item) => (cantidades[item.nombre] ?? 0) > 0)
      .map((item) => ({ nombre: item.nombre, precio: item.precio, cantidad: cantidades[item.nombre] }))

    onRegistrarDevolucion({
      id: siguienteTicket,
      ventaId: venta.id,
      hora: new Date(),
      items: itemsDevueltos,
      total,
      metodoPago: venta.metodoPago,
    })

    setConfirmado(true)
    setTimeout(() => {
      setConfirmado(false)
      setVentaId(null)
      setCantidades({})
    }, 1100)
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
                const maximo = disponible(venta, devoluciones, item.nombre)
                const cantidad = cantidades[item.nombre] ?? 0
                return (
                  <li key={item.nombre} className={`renglon ${maximo === 0 ? 'is-agotado' : ''}`}>
                    <div className="renglon__info">
                      <span className="renglon__nombre">{item.nombre}</span>
                      <span className="renglon__disponible">
                        {maximo === 0 ? 'Ya devuelto' : `Disponible: ${maximo}`}
                      </span>
                    </div>
                    <div className="renglon__cantidad">
                      <button
                        type="button"
                        onClick={() => ajustarCantidad(item.nombre, maximo, -1)}
                        disabled={cantidad === 0}
                        aria-label={`Quitar una unidad de ${item.nombre} de la devolución`}
                      >
                        −
                      </button>
                      <span aria-live="polite">{cantidad}</span>
                      <button
                        type="button"
                        onClick={() => ajustarCantidad(item.nombre, maximo, 1)}
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
              <span>Total a devolver</span>
              <span>{formatMoney(total)}</span>
            </div>

            <button type="button" className="detalle__confirmar" onClick={confirmar} disabled={!hayCantidad}>
              Confirmar devolución de {formatMoney(total)}
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

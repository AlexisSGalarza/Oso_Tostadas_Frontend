import { useState } from 'react'
import TopBar from '../../components/TopBar'
import { formatClock, formatMoney, formatTicket } from '../../lib/format'
import { PAQUETES } from './catalogo'
import type { ItemVenta, MetodoPago, Venta } from './types'
import './VentaScreen.css'

type Props = {
  now: Date
  siguienteTicket: number
  onVolver: () => void
  onCerrarSesion: () => void
  onRegistrarVenta: (venta: Venta) => void
}

function VentaScreen({ now, siguienteTicket, onVolver, onCerrarSesion, onRegistrarVenta }: Props) {
  const [carrito, setCarrito] = useState<ItemVenta[]>([])
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo')
  const [efectivoRecibido, setEfectivoRecibido] = useState('')
  const [justCharged, setJustCharged] = useState(false)

  function agregar(nombre: string, precio: number) {
    setCarrito((actual) => {
      const existente = actual.find((item) => item.nombre === nombre)
      if (existente) {
        return actual.map((item) =>
          item.nombre === nombre ? { ...item, cantidad: item.cantidad + 1 } : item,
        )
      }
      return [...actual, { nombre, precio, cantidad: 1 }]
    })
  }

  function incrementar(nombre: string) {
    setCarrito((actual) =>
      actual.map((item) => (item.nombre === nombre ? { ...item, cantidad: item.cantidad + 1 } : item)),
    )
  }

  function decrementar(nombre: string) {
    setCarrito((actual) =>
      actual
        .map((item) => (item.nombre === nombre ? { ...item, cantidad: item.cantidad - 1 } : item))
        .filter((item) => item.cantidad > 0),
    )
  }

  function cambiarMetodoPago(metodo: MetodoPago) {
    setMetodoPago(metodo)
    if (metodo === 'tarjeta') {
      setEfectivoRecibido('')
    }
  }

  function cancelarVenta() {
    setCarrito([])
    setEfectivoRecibido('')
    setMetodoPago('efectivo')
  }

  const total = carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0)
  const recibidoNumero = Number.parseFloat(efectivoRecibido)
  const hayRecibido = efectivoRecibido.trim() !== '' && !Number.isNaN(recibidoNumero)
  const cambio = metodoPago === 'efectivo' && hayRecibido ? recibidoNumero - total : null

  const puedeCobrar =
    carrito.length > 0 && (metodoPago === 'tarjeta' || (hayRecibido && recibidoNumero >= total))

  function cobrar() {
    if (!puedeCobrar) return
    const venta: Venta = {
      id: siguienteTicket,
      hora: new Date(),
      items: carrito,
      total,
      metodoPago,
      efectivoRecibido: metodoPago === 'efectivo' ? recibidoNumero : undefined,
      cambio: metodoPago === 'efectivo' ? (cambio ?? 0) : undefined,
    }
    onRegistrarVenta(venta)
    setCarrito([])
    setEfectivoRecibido('')
    setMetodoPago('efectivo')
    setJustCharged(true)
    setTimeout(() => setJustCharged(false), 1100)
  }

  const etiquetaCobrar =
    metodoPago === 'efectivo' && cambio !== null && cambio > 0
      ? `Cobrar y dar cambio de ${formatMoney(cambio)}`
      : `Cobrar ${formatMoney(total)}`

  return (
    <div className="venta">
      <TopBar clock={formatClock(now)} onVolver={onVolver} volverLabel="Perfil" onCerrarSesion={onCerrarSesion} />

      <main className="venta__main">
        <section className="catalogo" aria-label="Paquetes de tostadas">
          <h1 className="catalogo__titulo">Paquetes de tostadas</h1>

          <div className="catalogo__grid">
            {PAQUETES.map((producto) => (
              <button
                key={producto.nombre}
                type="button"
                className="producto"
                onClick={() => agregar(producto.nombre, producto.precio)}
              >
                <span className="producto__nombre">{producto.nombre}</span>
                <span className="producto__precio">{formatMoney(producto.precio)}</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="cuenta">
          <div className="cuenta__head">
            <span className="cuenta__label">Venta en curso</span>
            <span className="cuenta__ticket">{formatTicket(siguienteTicket)}</span>
          </div>

          {justCharged ? (
            <div className="cuenta__confirmado">
              <p>Venta registrada</p>
              <p className="cuenta__confirmado-sub">Ticket impreso</p>
            </div>
          ) : carrito.length === 0 ? (
            <p className="cuenta__vacio">Toca un paquete para agregarlo a la cuenta.</p>
          ) : (
            <>
              <ul className="cuenta__items">
                {carrito.map((item) => (
                  <li key={item.nombre} className="item">
                    <div className="item__info">
                      <span className="item__nombre">{item.nombre}</span>
                      <span className="item__preciounidad">{formatMoney(item.precio)} c/u</span>
                    </div>
                    <div className="item__cantidad">
                      <button
                        type="button"
                        onClick={() => decrementar(item.nombre)}
                        aria-label={`Quitar una unidad de ${item.nombre}`}
                      >
                        −
                      </button>
                      <span aria-live="polite">{item.cantidad}</span>
                      <button
                        type="button"
                        onClick={() => incrementar(item.nombre)}
                        aria-label={`Agregar una unidad de ${item.nombre}`}
                      >
                        +
                      </button>
                    </div>
                    <span className="item__total">{formatMoney(item.precio * item.cantidad)}</span>
                  </li>
                ))}
              </ul>

              <div className="cuenta__total">
                <span>Total</span>
                <span>{formatMoney(total)}</span>
              </div>

              <div className="cuenta__pago" role="radiogroup" aria-label="Método de pago">
                <button
                  type="button"
                  role="radio"
                  aria-checked={metodoPago === 'efectivo'}
                  className={`pago ${metodoPago === 'efectivo' ? 'is-active' : ''}`}
                  onClick={() => cambiarMetodoPago('efectivo')}
                >
                  Efectivo
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={metodoPago === 'tarjeta'}
                  className={`pago ${metodoPago === 'tarjeta' ? 'is-active' : ''}`}
                  onClick={() => cambiarMetodoPago('tarjeta')}
                >
                  Tarjeta
                </button>
              </div>

              {metodoPago === 'efectivo' && (
                <div className="cuenta__recibido">
                  <label htmlFor="recibido">Efectivo recibido</label>
                  <input
                    id="recibido"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={efectivoRecibido}
                    onChange={(event) => setEfectivoRecibido(event.target.value)}
                  />
                  {hayRecibido && (
                    <div className={`cuenta__cambio ${cambio !== null && cambio < 0 ? 'is-falta' : 'is-ok'}`}>
                      <span>{cambio !== null && cambio < 0 ? 'Falta' : 'Cambio'}</span>
                      <span>{formatMoney(Math.abs(cambio ?? 0))}</span>
                    </div>
                  )}
                </div>
              )}

              <button type="button" className="cuenta__cobrar" onClick={cobrar} disabled={!puedeCobrar}>
                {etiquetaCobrar}
              </button>
              <button type="button" className="cuenta__cancelar" onClick={cancelarVenta}>
                Cancelar venta
              </button>
            </>
          )}
        </aside>
      </main>
    </div>
  )
}

export default VentaScreen

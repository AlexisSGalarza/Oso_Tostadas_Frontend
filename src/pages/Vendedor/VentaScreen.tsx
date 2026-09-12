import { useEffect, useState } from 'react'
import TopBar from '../../components/TopBar'
import { formatClock, formatMoney, formatTicket } from '../../lib/format'
import { api, ApiError, type ProductoDisponible, type Turno } from '../../lib/api'
import type { Devolucion, ItemVenta, MetodoPago, Venta } from './types'
import './VentaScreen.css'

// Debe coincidir con IVA_RATE en el backend (config/settings.py); solo se usa
// para la vista previa del total antes de confirmar. El total real y
// definitivo lo calcula el servidor al crear la venta.
const IVA_ESTIMADO = 0.16

type ItemCarrito = ItemVenta & { id_producto: number }

type Props = {
  now: Date
  turno: Turno
  ventasTurno: Venta[]
  devolucionesTurno: Devolucion[]
  siguienteTicket: number
  onVolver: () => void
  onCerrarSesion: () => void
  onRegistrarVenta: (venta: Venta) => void
}

function VentaScreen({
  now,
  turno,
  ventasTurno,
  devolucionesTurno,
  siguienteTicket,
  onVolver,
  onCerrarSesion,
  onRegistrarVenta,
}: Props) {
  const [productos, setProductos] = useState<ProductoDisponible[]>([])
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true)
  const [errorCatalogo, setErrorCatalogo] = useState('')

  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo')
  const [efectivoRecibido, setEfectivoRecibido] = useState('')
  const [justCharged, setJustCharged] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorVenta, setErrorVenta] = useState('')

  useEffect(() => {
    api
      .productosDisponibles()
      .then(setProductos)
      .catch((err) => setErrorCatalogo(err instanceof ApiError ? err.message : 'No se pudo cargar el catálogo.'))
      .finally(() => setCargandoCatalogo(false))
  }, [])

  function agregar(producto: ProductoDisponible) {
    setCarrito((actual) => {
      const existente = actual.find((item) => item.id_producto === producto.id_producto)
      if (existente) {
        return actual.map((item) =>
          item.id_producto === producto.id_producto ? { ...item, cantidad: item.cantidad + 1 } : item,
        )
      }
      return [...actual, { id_producto: producto.id_producto, nombre: producto.nombre, precio: producto.precio, cantidad: 1 }]
    })
  }

  function incrementar(idProducto: number) {
    setCarrito((actual) =>
      actual.map((item) => (item.id_producto === idProducto ? { ...item, cantidad: item.cantidad + 1 } : item)),
    )
  }

  function decrementar(idProducto: number) {
    setCarrito((actual) =>
      actual
        .map((item) => (item.id_producto === idProducto ? { ...item, cantidad: item.cantidad - 1 } : item))
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
    setErrorVenta('')
  }

  // Efectivo fisico disponible en la caja: el fondo inicial mas lo que ya entro en
  // ventas en efectivo, menos lo que ya se devolvio en efectivo, en este turno.
  // Las de tarjeta no mueven el efectivo fisico.
  const efectivoEnCaja =
    turno.monto_inicial +
    ventasTurno.filter((v) => v.metodoPago === 'efectivo').reduce((s, v) => s + v.total, 0) -
    devolucionesTurno.filter((d) => d.metodoPago === 'efectivo').reduce((s, d) => s + d.total, 0)

  const subtotal = carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0)
  const total = Math.round(subtotal * (1 + IVA_ESTIMADO) * 100) / 100
  const recibidoNumero = Number.parseFloat(efectivoRecibido)
  const hayRecibido = efectivoRecibido.trim() !== '' && !Number.isNaN(recibidoNumero)
  const cambio = metodoPago === 'efectivo' && hayRecibido ? recibidoNumero - total : null
  const alcanzaElCambio = cambio === null || cambio <= efectivoEnCaja

  const puedeCobrar =
    !enviando &&
    carrito.length > 0 &&
    (metodoPago === 'tarjeta' || (hayRecibido && recibidoNumero >= total && alcanzaElCambio))

  async function cobrar() {
    if (!puedeCobrar) return
    setEnviando(true)
    setErrorVenta('')
    try {
      const ventaCreada = await api.crearVenta(
        carrito.map((item) => ({ id_producto: item.id_producto, unidades: item.cantidad })),
      )
      await api.registrarPago(ventaCreada.id_venta, metodoPago, ventaCreada.total)

      const cambioReal = metodoPago === 'efectivo' ? recibidoNumero - ventaCreada.total : undefined

      const venta: Venta = {
        id: siguienteTicket,
        idVenta: ventaCreada.id_venta,
        hora: new Date(),
        items: carrito,
        total: ventaCreada.total,
        metodoPago,
        efectivoRecibido: metodoPago === 'efectivo' ? recibidoNumero : undefined,
        cambio: cambioReal,
      }
      onRegistrarVenta(venta)
      setCarrito([])
      setEfectivoRecibido('')
      setMetodoPago('efectivo')
      setJustCharged(true)
      // refresca el stock mostrado ya que la venta lo descuenta en el servidor
      api.productosDisponibles().then(setProductos).catch(() => {})
      setTimeout(() => setJustCharged(false), 1100)
    } catch (err) {
      setErrorVenta(err instanceof ApiError ? err.message : 'No se pudo registrar la venta.')
    } finally {
      setEnviando(false)
    }
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

          {cargandoCatalogo && <p className="cuenta__vacio">Cargando catálogo…</p>}
          {errorCatalogo && (
            <p className="venta__error" role="alert">
              {errorCatalogo}
            </p>
          )}

          <div className="catalogo__grid">
            {productos.map((producto) => (
              <button
                key={producto.id_producto}
                type="button"
                className="producto"
                onClick={() => agregar(producto)}
                disabled={producto.stock <= 0}
              >
                <span className="producto__nombre">{producto.nombre}</span>
                <span className="producto__precio">{formatMoney(producto.precio)}</span>
                <span className="producto__precio">{producto.stock > 0 ? `Stock: ${producto.stock}` : 'Sin stock'}</span>
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
                  <li key={item.id_producto} className="item">
                    <div className="item__info">
                      <span className="item__nombre">{item.nombre}</span>
                      <span className="item__preciounidad">{formatMoney(item.precio)} c/u</span>
                    </div>
                    <div className="item__cantidad">
                      <button
                        type="button"
                        onClick={() => decrementar(item.id_producto)}
                        aria-label={`Quitar una unidad de ${item.nombre}`}
                      >
                        −
                      </button>
                      <span aria-live="polite">{item.cantidad}</span>
                      <button
                        type="button"
                        onClick={() => incrementar(item.id_producto)}
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
                <span>Total (con IVA est.)</span>
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

              {metodoPago === 'tarjeta' && (
                <p className="cuenta__vacio">Cobra en la terminal externa y confirma aquí para registrar el pago.</p>
              )}

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
                  {hayRecibido && !alcanzaElCambio && (
                    <p className="venta__error" role="alert">
                      No hay suficiente efectivo en caja para dar ese cambio (disponible: {formatMoney(efectivoEnCaja)}).
                    </p>
                  )}
                </div>
              )}

              {errorVenta && (
                <p className="venta__error" role="alert">
                  {errorVenta}
                </p>
              )}

              <button type="button" className="cuenta__cobrar" onClick={cobrar} disabled={!puedeCobrar}>
                {enviando ? 'Registrando…' : etiquetaCobrar}
              </button>
              <button type="button" className="cuenta__cancelar" onClick={cancelarVenta} disabled={enviando}>
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

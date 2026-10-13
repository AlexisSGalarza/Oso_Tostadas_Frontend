import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import TopBar from '../../components/TopBar'
import ConfirmDialog from '../../components/ConfirmDialog'
import NumericKeypad from '../../components/NumericKeypad'
import EscanerCamara, { type ResultadoLectura } from '../../components/EscanerCamara'
import Icono from '../../components/Icono'
import Tostadas, { tonoDe } from '../../components/Tostadas'
import { mismoCodigo, sonarLectura, useLectorCodigos } from '../../lib/escaner'
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
  const [ultimaVentaId, setUltimaVentaId] = useState<number | null>(null)
  const [descargandoRecibo, setDescargandoRecibo] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorVenta, setErrorVenta] = useState('')
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false)

  const [codigoManual, setCodigoManual] = useState('')
  const [avisoCodigo, setAvisoCodigo] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [camaraEncendida, setCamaraEncendida] = useState(false)
  const [filtro, setFiltro] = useState<'todos' | 'amarilla' | 'roja'>('todos')

  // En telefono la cuenta queda debajo del catalogo: una barra fija muestra el
  // total y lleva a la cuenta, y se oculta cuando la cuenta ya esta a la vista.
  const cuentaRef = useRef<HTMLElement>(null)
  const [cuentaVisible, setCuentaVisible] = useState(false)

  useEffect(() => {
    const cuenta = cuentaRef.current
    if (!cuenta) return
    const observador = new IntersectionObserver(([entrada]) => setCuentaVisible(entrada.isIntersecting), {
      threshold: 0.15,
    })
    observador.observe(cuenta)
    return () => observador.disconnect()
  }, [])

  useEffect(() => {
    api
      .productosDisponibles()
      .then(setProductos)
      .catch((err) => setErrorCatalogo(err instanceof ApiError ? err.message : 'No se pudo cargar el catálogo.'))
      .finally(() => setCargandoCatalogo(false))
  }, [])

  // No oculta la confirmacion mientras se descarga el recibo o hay un error visible;
  // el temporizador se reprograma solo cuando ambos ya se resolvieron.
  useEffect(() => {
    if (!justCharged || descargandoRecibo || errorVenta) return
    const id = setTimeout(() => setJustCharged(false), 4000)
    return () => clearTimeout(id)
  }, [justCharged, descargandoRecibo, errorVenta])

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

  // Entrada unica para lector fisico, camara y codigo escrito a mano.
  // Devuelve que paso con el codigo (para confirmarlo sobre la camara) o null si venia vacio.
  function registrarCodigo(leido: string): ResultadoLectura | null {
    const codigo = leido.trim()
    if (!codigo) return null
    const producto = productos.find((p) => mismoCodigo(p.codigo_barras, codigo))
    const enCuenta = producto
      ? (carrito.find((item) => item.id_producto === producto.id_producto)?.cantidad ?? 0)
      : 0

    let resultado: ResultadoLectura
    if (!producto) {
      resultado = { tipo: 'error', texto: `Ningún producto tiene el código ${codigo}.` }
    } else if (producto.stock - enCuenta <= 0) {
      resultado = { tipo: 'error', texto: `Ya no hay existencia de ${producto.nombre}.` }
    } else {
      // Escanear despues de cobrar empieza la siguiente venta sin tocar la pantalla.
      setJustCharged(false)
      setErrorVenta('')
      agregar(producto)
      resultado = { tipo: 'ok', texto: `${producto.nombre} registrado (${enCuenta + 1} en la cuenta).` }
    }
    setAvisoCodigo(resultado)
    sonarLectura(resultado.tipo === 'ok')
    return resultado
  }

  // Enter en el buscador: si el texto es un codigo se agrega ese producto; si la
  // busqueda dejo un solo paquete, se agrega ese; si no, solo se queda filtrado.
  function enviarCodigoManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const texto = codigoManual.trim()
    if (!texto) return
    const porCodigo = productos.some((p) => mismoCodigo(p.codigo_barras, texto))
    if (porCodigo) {
      registrarCodigo(texto)
    } else if (visibles.length === 1) {
      if (registrarCodigo(visibles[0].codigo_barras ?? '')?.tipo !== 'ok') agregarSiHay(visibles[0])
    } else if (visibles.length === 0) {
      registrarCodigo(texto)
    } else {
      return
    }
    setCodigoManual('')
  }

  function agregarSiHay(producto: ProductoDisponible) {
    const enCuenta = carrito.find((item) => item.id_producto === producto.id_producto)?.cantidad ?? 0
    if (producto.stock - enCuenta > 0) agregar(producto)
  }

  useLectorCodigos(registrarCodigo, !confirmandoCancelar && !enviando)

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
    setAvisoCodigo(null)
  }

  // Efectivo fisico disponible en la caja: el fondo inicial mas lo que ya entro en
  // ventas en efectivo, menos lo que ya se devolvio en efectivo, en este turno.
  // Las de tarjeta no mueven el efectivo fisico.
  const efectivoEnCaja =
    turno.monto_inicial +
    ventasTurno.filter((v) => v.metodoPago === 'efectivo').reduce((s, v) => s + v.total, 0) -
    devolucionesTurno.filter((d) => d.metodoPago === 'efectivo').reduce((s, d) => s + d.total, 0)

  const termino = codigoManual.trim().toLowerCase()
  const visibles = productos.filter(
    (p) =>
      (filtro === 'todos' || tonoDe(p.nombre) === filtro) &&
      (!termino || p.nombre.toLowerCase().includes(termino) || mismoCodigo(p.codigo_barras, termino)),
  )
  const filtros = [
    { id: 'todos' as const, etiqueta: 'Todos', cantidad: productos.length },
    { id: 'amarilla' as const, etiqueta: 'Amarillas', cantidad: productos.filter((p) => tonoDe(p.nombre) === 'amarilla').length },
    { id: 'roja' as const, etiqueta: 'Rojas', cantidad: productos.filter((p) => tonoDe(p.nombre) === 'roja').length },
  ].filter((f) => f.cantidad > 0)

  const unidades = carrito.reduce((suma, item) => suma + item.cantidad, 0)
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
      setUltimaVentaId(ventaCreada.id_venta)
      // refresca el stock mostrado ya que la venta lo descuenta en el servidor
      api.productosDisponibles().then(setProductos).catch(() => {})
    } catch (err) {
      setErrorVenta(err instanceof ApiError ? err.message : 'No se pudo registrar la venta.')
    } finally {
      setEnviando(false)
    }
  }

  async function descargarRecibo(idVenta: number) {
    setDescargandoRecibo(true)
    try {
      await api.descargarRecibo(idVenta)
    } catch (err) {
      setErrorVenta(err instanceof ApiError ? err.message : 'No se pudo descargar el recibo.')
    } finally {
      setDescargandoRecibo(false)
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
          <form className="buscador" onSubmit={enviarCodigoManual}>
            <label htmlFor="buscador" className="solo-lectores">
              Buscar por nombre o código de barras
            </label>
            <Icono nombre="buscar" className="buscador__lupa" />
            <input
              id="buscador"
              type="search"
              autoComplete="off"
              spellCheck={false}
              placeholder="Busca un paquete o escanea su código"
              value={codigoManual}
              onChange={(event) => setCodigoManual(event.target.value)}
              onKeyDown={(event) => {
                // Lectores que terminan con Tab en lugar de Enter: si lo escrito es un codigo, se agrega igual.
                if (event.key === 'Tab' && productos.some((p) => mismoCodigo(p.codigo_barras, codigoManual))) {
                  event.preventDefault()
                  event.currentTarget.form?.requestSubmit()
                }
              }}
            />
          </form>

          <EscanerCamara encendida={camaraEncendida} onCambiar={setCamaraEncendida} onCodigo={registrarCodigo} />

          {filtros.length > 1 && (
            <div className="filtros" role="group" aria-label="Filtrar paquetes">
              {filtros.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`filtro ${filtro === f.id ? 'is-activo' : ''}`}
                  aria-pressed={filtro === f.id}
                  onClick={() => setFiltro(f.id)}
                >
                  <span className="filtro__nombre">{f.etiqueta}</span>
                  <span className="filtro__cuenta">
                    {f.cantidad} {f.cantidad === 1 ? 'paquete' : 'paquetes'}
                  </span>
                </button>
              ))}
            </div>
          )}

          <p className={`lector__aviso ${avisoCodigo ? `is-${avisoCodigo.tipo}` : ''}`} role="status" aria-live="polite">
            {avisoCodigo?.texto ??
              (!cargandoCatalogo && productos.length > 0 && !productos.some((p) => p.codigo_barras)
                ? 'Ningún producto tiene código de barras todavía. Se asignan en Inventario, desde una cuenta de administrador.'
                : 'Con un lector conectado, solo escanea: no hace falta tocar el buscador.')}
          </p>

          {cargandoCatalogo && <p className="cuenta__vacio">Cargando catálogo…</p>}
          {errorCatalogo && (
            <p className="venta__error" role="alert">
              {errorCatalogo}
            </p>
          )}
          {!cargandoCatalogo && !errorCatalogo && visibles.length === 0 && (
            <p className="cuenta__vacio">Ningún paquete coincide con “{codigoManual.trim()}”.</p>
          )}

          <div className="catalogo__grid">
            {visibles.map((producto, indice) => {
              const enCuenta = carrito.find((item) => item.id_producto === producto.id_producto)?.cantidad ?? 0
              const agotado = producto.stock - enCuenta <= 0
              return (
                <button
                  key={producto.id_producto}
                  type="button"
                  className={`producto entra ${enCuenta > 0 ? 'is-en-cuenta' : ''}`}
                  style={{ '--i': indice } as CSSProperties}
                  onClick={() => agregar(producto)}
                  disabled={agotado}
                >
                  <Tostadas nombre={producto.nombre} className="producto__foto" />
                  {enCuenta > 0 && (
                    <span key={enCuenta} className="producto__encuenta" aria-label={`${enCuenta} en la cuenta`}>
                      {enCuenta}
                    </span>
                  )}
                  <span className="producto__pie">
                    <span className="producto__texto">
                      <span className="producto__nombre">{producto.nombre}</span>
                      <span className="producto__precio">{formatMoney(producto.precio)}</span>
                      <span className={`producto__stock ${producto.stock <= 0 ? 'is-agotado' : ''}`}>
                        {producto.stock > 0 ? `${producto.stock} en existencia` : 'Agotado'}
                      </span>
                    </span>
                    <span className="producto__mas" aria-hidden="true">
                      <Icono nombre="mas" />
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <aside className="cuenta" id="cuenta" ref={cuentaRef}>
          <div className="cuenta__head">
            <span className="cuenta__label">Venta en curso</span>
            <span className="cuenta__ticket">{formatTicket(siguienteTicket)}</span>
          </div>

          {justCharged ? (
            <div className="cuenta__confirmado">
              <span className="cuenta__palomita" aria-hidden="true">
                <Icono nombre="palomita" />
              </span>
              <p>Venta registrada</p>
              <p className="cuenta__confirmado-sub">Ticket #{ultimaVentaId}</p>
              {ultimaVentaId !== null && (
                <button
                  type="button"
                  className="cuenta__recibo"
                  onClick={() => descargarRecibo(ultimaVentaId)}
                  disabled={descargandoRecibo}
                >
                  {descargandoRecibo ? 'Generando…' : 'Descargar recibo PDF'}
                </button>
              )}
              {errorVenta && (
                <p className="venta__error" role="alert">
                  {errorVenta}
                </p>
              )}
              <button
                type="button"
                className="cuenta__nuevaventa"
                onClick={() => {
                  setJustCharged(false)
                  setErrorVenta('')
                }}
              >
                Nueva venta
              </button>
            </div>
          ) : carrito.length === 0 ? (
            <div className="cuenta__vacio cuenta__vacio--inicio">
              <Icono nombre="venta" />
              <p>La cuenta está vacía.</p>
              <p>Toca un paquete o escanea su código para empezar.</p>
            </div>
          ) : (
            <>
              <ul className="cuenta__items">
                {carrito.map((item) => (
                  <li key={item.id_producto} className="item">
                    <Tostadas nombre={item.nombre} className="item__foto" />
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
                  <div className="cuenta__recibidocabeza">
                    <label htmlFor="recibido">Efectivo recibido</label>
                    <button type="button" className="cuenta__exacto" onClick={() => setEfectivoRecibido(String(total))}>
                      Cobro exacto
                    </button>
                  </div>
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
                  <NumericKeypad
                    value={efectivoRecibido}
                    onChange={setEfectivoRecibido}
                    quickAmounts={[50, 100, 200, 500]}
                    onQuickAmount={(monto) =>
                      setEfectivoRecibido((actual) =>
                        String(Math.round(((Number.parseFloat(actual) || 0) + monto) * 100) / 100),
                      )
                    }
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
              <button
                type="button"
                className="cuenta__cancelar"
                onClick={() => setConfirmandoCancelar(true)}
                disabled={enviando}
              >
                Cancelar venta
              </button>
            </>
          )}
        </aside>
      </main>

      {carrito.length > 0 && !cuentaVisible && (
        <a className="venta__barra" href="#cuenta">
          <span>
            {unidades} {unidades === 1 ? 'paquete' : 'paquetes'}
          </span>
          <span className="venta__barra-total">{formatMoney(total)}</span>
          <span className="venta__barra-ir">Ver cuenta</span>
        </a>
      )}

      <ConfirmDialog
        open={confirmandoCancelar}
        title="¿Cancelar esta venta?"
        message="Se va a vaciar la cuenta en curso. Los paquetes que ya agregaste no se guardan."
        confirmLabel="Sí, cancelar"
        cancelLabel="Seguir con la venta"
        tone="danger"
        onCancel={() => setConfirmandoCancelar(false)}
        onConfirm={() => {
          setConfirmandoCancelar(false)
          cancelarVenta()
        }}
      />
    </div>
  )
}

export default VentaScreen

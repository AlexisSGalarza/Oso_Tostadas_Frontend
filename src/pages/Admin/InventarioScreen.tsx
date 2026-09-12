import { useEffect, useState, type FormEvent } from 'react'
import TopBar from '../../components/TopBar'
import { formatClock, formatMoney } from '../../lib/format'
import { api, ApiError, type InsumoAdmin, type ProductoAdmin, type Proveedor } from '../../lib/api'
import './InventarioScreen.css'

type Estado = 'bien' | 'bajo' | 'agotado'

const ESTADO_LABEL: Record<Estado, string> = {
  bien: 'Bien',
  bajo: 'Bajo',
  agotado: 'Agotado',
}

function estadoDe(cantidad: number, minimo: number): Estado {
  if (cantidad <= 0) return 'agotado'
  if (cantidad < minimo) return 'bajo'
  return 'bien'
}

type Tab = 'insumos' | 'productos'

type Props = {
  now: Date
  onVolver: () => void
  onCerrarSesion: () => void
}

function InventarioScreen({ now, onVolver, onCerrarSesion }: Props) {
  const [tab, setTab] = useState<Tab>('insumos')
  const [insumos, setInsumos] = useState<InsumoAdmin[]>([])
  const [productos, setProductos] = useState<ProductoAdmin[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [entradaInsumoId, setEntradaInsumoId] = useState<number | null>(null)
  const [cantidadEntrada, setCantidadEntrada] = useState('')
  const [proveedorEntrada, setProveedorEntrada] = useState<number | ''>('')

  const [produccionId, setProduccionId] = useState<number | null>(null)
  const [cantidadProduccion, setCantidadProduccion] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    Promise.all([api.insumosAdmin(), api.productosAdmin(), api.proveedores()])
      .then(([insumosData, productosData, proveedoresData]) => {
        setInsumos(insumosData)
        setProductos(productosData)
        setProveedores(proveedoresData)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudo cargar el inventario.'))
      .finally(() => setCargando(false))
  }, [])

  const bajosInsumos = insumos.filter((insumo) => estadoDe(insumo.stock, insumo.stock_minimo) !== 'bien').length
  const bajosProductos = productos.filter((producto) => estadoDe(producto.stock, producto.stock_minimo) !== 'bien').length

  function abrirEntrada(insumo: InsumoAdmin) {
    if (entradaInsumoId === insumo.id_insumo) {
      setEntradaInsumoId(null)
      return
    }
    setEntradaInsumoId(insumo.id_insumo)
    setCantidadEntrada('')
    setProveedorEntrada(insumo.id_proveedor ?? '')
  }

  async function confirmarEntrada(event: FormEvent<HTMLFormElement>, idInsumo: number) {
    event.preventDefault()
    const cantidad = Number.parseFloat(cantidadEntrada)
    if (Number.isNaN(cantidad) || cantidad <= 0) return
    setEnviando(true)
    try {
      const actualizado = await api.registrarEntradaInsumo(idInsumo, cantidad, proveedorEntrada || null)
      setInsumos((actual) => actual.map((i) => (i.id_insumo === idInsumo ? actualizado : i)))
      setEntradaInsumoId(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar la entrada.')
    } finally {
      setEnviando(false)
    }
  }

  function abrirProduccion(producto: ProductoAdmin) {
    if (produccionId === producto.id_producto) {
      setProduccionId(null)
      return
    }
    setProduccionId(producto.id_producto)
    setCantidadProduccion('')
  }

  async function confirmarProduccion(event: FormEvent<HTMLFormElement>, idProducto: number) {
    event.preventDefault()
    const cantidad = Number.parseInt(cantidadProduccion, 10)
    if (Number.isNaN(cantidad) || cantidad <= 0) return
    setEnviando(true)
    try {
      const actualizado = await api.registrarProduccion(idProducto, cantidad)
      setProductos((actual) => actual.map((p) => (p.id_producto === idProducto ? actualizado : p)))
      setProduccionId(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar la producción.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="inventario">
      <TopBar clock={formatClock(now)} onVolver={onVolver} volverLabel="Admin" onCerrarSesion={onCerrarSesion} />

      <main className="inventario__main">
        <h1>Inventario</h1>
        <p className="inventario__subtitulo">Insumos de producción y paquetes listos para vender</p>

        {cargando && <p className="inventario__subtitulo">Cargando…</p>}
        {error && (
          <p className="alta__error" role="alert">
            {error}
          </p>
        )}

        {!cargando && (
          <>
            <div className="tabs" role="tablist" aria-label="Tipo de inventario">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'insumos'}
                className={`tab ${tab === 'insumos' ? 'is-activo' : ''}`}
                onClick={() => setTab('insumos')}
              >
                Insumos {bajosInsumos > 0 && <span className="tab__badge">{bajosInsumos}</span>}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'productos'}
                className={`tab ${tab === 'productos' ? 'is-activo' : ''}`}
                onClick={() => setTab('productos')}
              >
                Productos {bajosProductos > 0 && <span className="tab__badge">{bajosProductos}</span>}
              </button>
            </div>

            {tab === 'insumos' && (
              <section className="lista" aria-label="Insumos">
                <div className="lista__cabecera lista__cabecera--insumos" aria-hidden="true">
                  <span>Insumo</span>
                  <span>Existencia</span>
                  <span>Mínimo</span>
                  <span>Proveedor</span>
                  <span>Estado</span>
                  <span></span>
                </div>
                <ul className="lista__filas">
                  {insumos.map((insumo) => {
                    const estado = estadoDe(insumo.stock, insumo.stock_minimo)
                    return (
                      <li className="ifila" key={insumo.id_insumo}>
                        <div className="ifila__fila ifila__fila--insumos">
                          <span className="ifila__celda ifila__celda--nombre" data-label="Insumo">
                            {insumo.nombre}
                          </span>
                          <span className="ifila__celda ifila__celda--num" data-label="Existencia">
                            {insumo.stock} {insumo.unidad_medida}
                          </span>
                          <span className="ifila__celda ifila__celda--num" data-label="Mínimo">
                            {insumo.stock_minimo} {insumo.unidad_medida}
                          </span>
                          <span className="ifila__celda ifila__celda--proveedor" data-label="Proveedor">
                            {insumo.proveedor ?? 'Sin proveedor'}
                          </span>
                          <span className="ifila__celda" data-label="Estado">
                            <span className={`ifila__estado is-${estado}`}>{ESTADO_LABEL[estado]}</span>
                          </span>
                          <span className="ifila__celda ifila__celda--accion">
                            <button type="button" className="ifila__entrada" onClick={() => abrirEntrada(insumo)}>
                              {entradaInsumoId === insumo.id_insumo ? 'Cancelar' : '+ Registrar entrada'}
                            </button>
                          </span>
                        </div>

                        {entradaInsumoId === insumo.id_insumo && (
                          <form
                            className="ifila__form"
                            onSubmit={(event) => confirmarEntrada(event, insumo.id_insumo)}
                          >
                            <div className="ifila__formcampo">
                              <label htmlFor={`cantidad-${insumo.id_insumo}`}>
                                Cantidad recibida ({insumo.unidad_medida})
                              </label>
                              <input
                                id={`cantidad-${insumo.id_insumo}`}
                                type="number"
                                inputMode="decimal"
                                min="1"
                                step="1"
                                placeholder="0"
                                value={cantidadEntrada}
                                onChange={(event) => setCantidadEntrada(event.target.value)}
                                autoFocus
                              />
                            </div>
                            <div className="ifila__formcampo">
                              <label htmlFor={`proveedor-${insumo.id_insumo}`}>Proveedor que entregó</label>
                              <select
                                id={`proveedor-${insumo.id_insumo}`}
                                value={proveedorEntrada}
                                onChange={(event) =>
                                  setProveedorEntrada(event.target.value ? Number(event.target.value) : '')
                                }
                              >
                                <option value="">Sin especificar</option>
                                {proveedores
                                  .filter((proveedor) => proveedor.estado === 'activo')
                                  .map((proveedor) => (
                                    <option key={proveedor.id_proveedor} value={proveedor.id_proveedor}>
                                      {proveedor.nombre}
                                    </option>
                                  ))}
                              </select>
                            </div>
                            <button type="submit" className="ifila__confirmar" disabled={enviando}>
                              Confirmar entrada
                            </button>
                          </form>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {tab === 'productos' && (
              <section className="lista" aria-label="Productos">
                <div className="lista__cabecera lista__cabecera--productos" aria-hidden="true">
                  <span>Producto</span>
                  <span>Precio</span>
                  <span>Existencia</span>
                  <span>Mínimo</span>
                  <span>Estado</span>
                  <span></span>
                </div>
                <ul className="lista__filas">
                  {productos.map((producto) => {
                    const estado = estadoDe(producto.stock, producto.stock_minimo)
                    return (
                      <li className="ifila" key={producto.id_producto}>
                        <div className="ifila__fila ifila__fila--productos">
                          <span className="ifila__celda ifila__celda--nombre" data-label="Producto">
                            {producto.nombre}
                          </span>
                          <span className="ifila__celda ifila__celda--num" data-label="Precio">
                            {formatMoney(producto.precio)}
                          </span>
                          <span className="ifila__celda ifila__celda--num" data-label="Existencia">
                            {producto.stock} pzas
                          </span>
                          <span className="ifila__celda ifila__celda--num" data-label="Mínimo">
                            {producto.stock_minimo} pzas
                          </span>
                          <span className="ifila__celda" data-label="Estado">
                            <span className={`ifila__estado is-${estado}`}>{ESTADO_LABEL[estado]}</span>
                          </span>
                          <span className="ifila__celda ifila__celda--accion">
                            <button type="button" className="ifila__entrada" onClick={() => abrirProduccion(producto)}>
                              {produccionId === producto.id_producto ? 'Cancelar' : '+ Registrar producción'}
                            </button>
                          </span>
                        </div>

                        {produccionId === producto.id_producto && (
                          <form
                            className="ifila__form"
                            onSubmit={(event) => confirmarProduccion(event, producto.id_producto)}
                          >
                            <div className="ifila__formcampo">
                              <label htmlFor={`produccion-${producto.id_producto}`}>Paquetes empacados hoy</label>
                              <input
                                id={`produccion-${producto.id_producto}`}
                                type="number"
                                inputMode="decimal"
                                min="1"
                                step="1"
                                placeholder="0"
                                value={cantidadProduccion}
                                onChange={(event) => setCantidadProduccion(event.target.value)}
                                autoFocus
                              />
                            </div>
                            <button type="submit" className="ifila__confirmar" disabled={enviando}>
                              Confirmar producción
                            </button>
                          </form>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default InventarioScreen

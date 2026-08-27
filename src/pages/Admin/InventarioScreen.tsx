import { useState, type FormEvent } from 'react'
import TopBar from '../../components/TopBar'
import { formatClock, formatMoney } from '../../lib/format'
import { INSUMOS, PRODUCTOS, PROVEEDORES } from './data'
import type { EstadoInsumo, Insumo, Producto } from './types'
import './InventarioScreen.css'

const ESTADO_LABEL: Record<EstadoInsumo, string> = {
  bien: 'Bien',
  bajo: 'Bajo',
  agotado: 'Agotado',
}

function estadoDe(cantidad: number, minimo: number): EstadoInsumo {
  if (cantidad <= 0) return 'agotado'
  if (cantidad < minimo) return 'bajo'
  return 'bien'
}

function nombreProveedor(id: string) {
  return PROVEEDORES.find((proveedor) => proveedor.id === id)?.nombre ?? 'Sin proveedor'
}

type Tab = 'insumos' | 'productos'

type Props = {
  now: Date
  onVolver: () => void
  onCerrarSesion: () => void
}

function InventarioScreen({ now, onVolver, onCerrarSesion }: Props) {
  const [tab, setTab] = useState<Tab>('insumos')
  const [insumos, setInsumos] = useState<Insumo[]>(INSUMOS)
  const [productos, setProductos] = useState<Producto[]>(PRODUCTOS)

  const [entradaInsumoId, setEntradaInsumoId] = useState<string | null>(null)
  const [cantidadEntrada, setCantidadEntrada] = useState('')
  const [proveedorEntrada, setProveedorEntrada] = useState('')

  const [produccionId, setProduccionId] = useState<string | null>(null)
  const [cantidadProduccion, setCantidadProduccion] = useState('')

  const bajosInsumos = insumos.filter((insumo) => estadoDe(insumo.cantidad, insumo.minimo) !== 'bien').length
  const bajosProductos = productos.filter((producto) => estadoDe(producto.cantidad, producto.minimo) !== 'bien').length

  function abrirEntrada(insumo: Insumo) {
    if (entradaInsumoId === insumo.id) {
      setEntradaInsumoId(null)
      return
    }
    setEntradaInsumoId(insumo.id)
    setCantidadEntrada('')
    setProveedorEntrada(insumo.proveedorId)
  }

  function confirmarEntrada(event: FormEvent<HTMLFormElement>, insumoId: string) {
    event.preventDefault()
    const cantidad = Number.parseFloat(cantidadEntrada)
    if (Number.isNaN(cantidad) || cantidad <= 0) return
    setInsumos((actual) =>
      actual.map((insumo) =>
        insumo.id === insumoId
          ? { ...insumo, cantidad: insumo.cantidad + cantidad, proveedorId: proveedorEntrada || insumo.proveedorId }
          : insumo,
      ),
    )
    setEntradaInsumoId(null)
  }

  function abrirProduccion(producto: Producto) {
    if (produccionId === producto.id) {
      setProduccionId(null)
      return
    }
    setProduccionId(producto.id)
    setCantidadProduccion('')
  }

  function confirmarProduccion(event: FormEvent<HTMLFormElement>, productoId: string) {
    event.preventDefault()
    const cantidad = Number.parseFloat(cantidadProduccion)
    if (Number.isNaN(cantidad) || cantidad <= 0) return
    setProductos((actual) =>
      actual.map((producto) => (producto.id === productoId ? { ...producto, cantidad: producto.cantidad + cantidad } : producto)),
    )
    setProduccionId(null)
  }

  return (
    <div className="inventario">
      <TopBar clock={formatClock(now)} onVolver={onVolver} volverLabel="Admin" onCerrarSesion={onCerrarSesion} />

      <main className="inventario__main">
        <h1>Inventario</h1>
        <p className="inventario__subtitulo">Insumos de producción y paquetes listos para vender · Sucursal Centro</p>

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
                const estado = estadoDe(insumo.cantidad, insumo.minimo)
                return (
                  <li className="ifila" key={insumo.id}>
                    <div className="ifila__fila ifila__fila--insumos">
                      <span className="ifila__celda ifila__celda--nombre" data-label="Insumo">
                        {insumo.nombre}
                      </span>
                      <span className="ifila__celda ifila__celda--num" data-label="Existencia">
                        {insumo.cantidad} {insumo.unidad}
                      </span>
                      <span className="ifila__celda ifila__celda--num" data-label="Mínimo">
                        {insumo.minimo} {insumo.unidad}
                      </span>
                      <span className="ifila__celda ifila__celda--proveedor" data-label="Proveedor">
                        {nombreProveedor(insumo.proveedorId)}
                      </span>
                      <span className="ifila__celda" data-label="Estado">
                        <span className={`ifila__estado is-${estado}`}>{ESTADO_LABEL[estado]}</span>
                      </span>
                      <span className="ifila__celda ifila__celda--accion">
                        <button type="button" className="ifila__entrada" onClick={() => abrirEntrada(insumo)}>
                          {entradaInsumoId === insumo.id ? 'Cancelar' : '+ Registrar entrada'}
                        </button>
                      </span>
                    </div>

                    {entradaInsumoId === insumo.id && (
                      <form className="ifila__form" onSubmit={(event) => confirmarEntrada(event, insumo.id)}>
                        <div className="ifila__formcampo">
                          <label htmlFor={`cantidad-${insumo.id}`}>Cantidad recibida ({insumo.unidad})</label>
                          <input
                            id={`cantidad-${insumo.id}`}
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
                          <label htmlFor={`proveedor-${insumo.id}`}>Proveedor que entregó</label>
                          <select
                            id={`proveedor-${insumo.id}`}
                            value={proveedorEntrada}
                            onChange={(event) => setProveedorEntrada(event.target.value)}
                          >
                            {PROVEEDORES.filter((proveedor) => proveedor.estado === 'activo').map((proveedor) => (
                              <option key={proveedor.id} value={proveedor.id}>
                                {proveedor.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button type="submit" className="ifila__confirmar">
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
                const estado = estadoDe(producto.cantidad, producto.minimo)
                return (
                  <li className="ifila" key={producto.id}>
                    <div className="ifila__fila ifila__fila--productos">
                      <span className="ifila__celda ifila__celda--nombre" data-label="Producto">
                        {producto.nombre}
                      </span>
                      <span className="ifila__celda ifila__celda--num" data-label="Precio">
                        {formatMoney(producto.precio)}
                      </span>
                      <span className="ifila__celda ifila__celda--num" data-label="Existencia">
                        {producto.cantidad} pzas
                      </span>
                      <span className="ifila__celda ifila__celda--num" data-label="Mínimo">
                        {producto.minimo} pzas
                      </span>
                      <span className="ifila__celda" data-label="Estado">
                        <span className={`ifila__estado is-${estado}`}>{ESTADO_LABEL[estado]}</span>
                      </span>
                      <span className="ifila__celda ifila__celda--accion">
                        <button type="button" className="ifila__entrada" onClick={() => abrirProduccion(producto)}>
                          {produccionId === producto.id ? 'Cancelar' : '+ Registrar producción'}
                        </button>
                      </span>
                    </div>

                    {produccionId === producto.id && (
                      <form className="ifila__form" onSubmit={(event) => confirmarProduccion(event, producto.id)}>
                        <div className="ifila__formcampo">
                          <label htmlFor={`produccion-${producto.id}`}>Paquetes empacados hoy</label>
                          <input
                            id={`produccion-${producto.id}`}
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
                        <button type="submit" className="ifila__confirmar">
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
      </main>
    </div>
  )
}

export default InventarioScreen

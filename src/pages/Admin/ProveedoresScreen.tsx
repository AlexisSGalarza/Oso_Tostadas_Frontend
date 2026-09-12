import { useEffect, useState, type FormEvent } from 'react'
import TopBar from '../../components/TopBar'
import ConfirmDialog from '../../components/ConfirmDialog'
import { formatClock } from '../../lib/format'
import { api, ApiError, type Proveedor } from '../../lib/api'
import './ProveedoresScreen.css'

type Props = {
  now: Date
  onVolver: () => void
  onCerrarSesion: () => void
}

function ProveedoresScreen({ now, onVolver, onCerrarSesion }: Props) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [cargando, setCargando] = useState(true)
  const [detalleId, setDetalleId] = useState<number | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [insumo, setInsumo] = useState('')
  const [contacto, setContacto] = useState('')
  const [correo, setCorreo] = useState('')
  const [direccion, setDireccion] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [accionandoId, setAccionandoId] = useState<number | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [proveedorPendiente, setProveedorPendiente] = useState<Proveedor | null>(null)

  useEffect(() => {
    api
      .proveedores()
      .then(setProveedores)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudo cargar a los proveedores.'))
      .finally(() => setCargando(false))
  }, [])

  const urgentes = proveedores.filter((proveedor) => proveedor.urgente).length

  const busquedaNormalizada = busqueda.trim().toLowerCase()
  const proveedoresFiltrados = busquedaNormalizada
    ? proveedores.filter((proveedor) =>
        [proveedor.nombre, proveedor.insumo_principal, proveedor.correo, proveedor.telefono]
          .join(' ')
          .toLowerCase()
          .includes(busquedaNormalizada),
      )
    : proveedores

  async function alternarEstado(id: number) {
    setAccionandoId(id)
    try {
      const actualizado = await api.alternarEstadoProveedor(id)
      setProveedores((actual) => actual.map((p) => (p.id_proveedor === id ? actualizado : p)))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el proveedor.')
    } finally {
      setAccionandoId(null)
    }
  }

  function alternarDetalle(id: number) {
    setDetalleId((actual) => (actual === id ? null : id))
  }

  async function agregarProveedor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!nombre.trim() || !insumo.trim()) {
      setError('Escribe el nombre del proveedor y qué insumo surte.')
      return
    }
    setError('')
    setEnviando(true)
    try {
      const nuevo = await api.crearProveedor({
        nombre: nombre.trim(),
        insumo_principal: insumo.trim(),
        telefono: contacto.trim(),
        correo: correo.trim(),
        direccion: direccion.trim(),
      })
      setProveedores((actual) => [...actual, nuevo])
      setNombre('')
      setInsumo('')
      setContacto('')
      setCorreo('')
      setDireccion('')
      setMostrarForm(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el proveedor.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="proveedores">
      <TopBar clock={formatClock(now)} onVolver={onVolver} volverLabel="Admin" onCerrarSesion={onCerrarSesion} />

      <main className="proveedores__main">
        <div className="proveedores__head">
          <div>
            <h1>Proveedores</h1>
            <p className="proveedores__subtitulo">
              Quién surte cada insumo
              {urgentes > 0 ? ` · ${urgentes} con entrega urgente` : ''}
            </p>
          </div>
          <button type="button" className="proveedores__nuevo" onClick={() => setMostrarForm((valor) => !valor)}>
            {mostrarForm ? 'Cancelar' : '+ Nuevo proveedor'}
          </button>
        </div>

        {mostrarForm && (
          <form className="alta" onSubmit={agregarProveedor}>
            <div className="alta__campo">
              <label htmlFor="p-nombre">Proveedor</label>
              <input
                id="p-nombre"
                type="text"
                placeholder="Nombre del proveedor"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                autoFocus
              />
            </div>
            <div className="alta__campo">
              <label htmlFor="p-insumo">Insumo que surte</label>
              <input
                id="p-insumo"
                type="text"
                placeholder="Ej. Masa de maíz"
                value={insumo}
                onChange={(event) => setInsumo(event.target.value)}
              />
            </div>
            <div className="alta__campo">
              <label htmlFor="p-contacto">Teléfono</label>
              <input
                id="p-contacto"
                type="tel"
                placeholder="55 0000 0000"
                value={contacto}
                onChange={(event) => setContacto(event.target.value)}
              />
            </div>
            <div className="alta__campo">
              <label htmlFor="p-correo">Correo</label>
              <input
                id="p-correo"
                type="email"
                placeholder="contacto@proveedor.mx"
                value={correo}
                onChange={(event) => setCorreo(event.target.value)}
              />
            </div>
            <div className="alta__campo">
              <label htmlFor="p-direccion">Dirección</label>
              <input
                id="p-direccion"
                type="text"
                placeholder="Calle, colonia"
                value={direccion}
                onChange={(event) => setDireccion(event.target.value)}
              />
            </div>
            {error && (
              <p className="alta__error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="alta__guardar" disabled={enviando}>
              {enviando ? 'Guardando…' : 'Guardar proveedor'}
            </button>
          </form>
        )}

        {cargando && <p className="proveedores__subtitulo">Cargando…</p>}

        {!cargando && proveedores.length > 0 && (
          <input
            type="search"
            className="proveedores__buscador"
            placeholder="Buscar por nombre, insumo, correo o teléfono…"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            aria-label="Buscar proveedores"
          />
        )}

        {!cargando && (
          <section className="lista" aria-label="Proveedores registrados">
            <div className="lista__cabecera" aria-hidden="true">
              <span>Proveedor</span>
              <span>Insumo</span>
              <span>Contacto</span>
              <span>Próxima entrega</span>
              <span>Estado</span>
              <span></span>
            </div>
            {proveedoresFiltrados.length === 0 && proveedores.length > 0 && (
              <p className="proveedores__subtitulo">No hay proveedores que coincidan con "{busqueda}".</p>
            )}
            <ul className="lista__filas">
              {proveedoresFiltrados.map((proveedor) => (
                <li className="pfila" key={proveedor.id_proveedor}>
                  <div className="pfila__fila">
                    <span className="pfila__celda pfila__celda--nombre" data-label="Proveedor">
                      {proveedor.nombre}
                    </span>
                    <span className="pfila__celda" data-label="Insumo">
                      {proveedor.insumo_principal || '—'}
                    </span>
                    <span className="pfila__celda pfila__celda--mono" data-label="Contacto">
                      {proveedor.telefono || '—'}
                    </span>
                    <span className="pfila__celda pfila__celda--mono" data-label="Próxima entrega">
                      {proveedor.urgente ? (
                        <span className="pfila__urgente">Urgente · {proveedor.proxima_entrega ?? '—'}</span>
                      ) : (
                        proveedor.proxima_entrega ?? 'Por programar'
                      )}
                    </span>
                    <span className="pfila__celda" data-label="Estado">
                      <span className={`pfila__estado is-${proveedor.estado}`}>
                        {proveedor.estado === 'activo' ? 'Activo' : 'Inactivo'}
                      </span>
                    </span>
                    <span className="pfila__celda pfila__celda--accion">
                      <button
                        type="button"
                        className="pfila__detalle"
                        onClick={() => alternarDetalle(proveedor.id_proveedor)}
                      >
                        {detalleId === proveedor.id_proveedor ? 'Ocultar' : 'Ver detalle'}
                      </button>
                    </span>
                  </div>

                  {detalleId === proveedor.id_proveedor && (
                    <div className="pfila__panel">
                      <div className="pfila__dato">
                        <span className="pfila__datolabel">Correo</span>
                        <span>{proveedor.correo || '—'}</span>
                      </div>
                      <div className="pfila__dato">
                        <span className="pfila__datolabel">Dirección</span>
                        <span>{proveedor.direccion || '—'}</span>
                      </div>
                      <button
                        type="button"
                        className="pfila__toggle"
                        onClick={() => setProveedorPendiente(proveedor)}
                        disabled={accionandoId === proveedor.id_proveedor}
                      >
                        {proveedor.estado === 'activo' ? 'Desactivar proveedor' : 'Reactivar proveedor'}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <ConfirmDialog
        open={proveedorPendiente !== null}
        title={
          proveedorPendiente?.estado === 'activo' ? '¿Desactivar este proveedor?' : '¿Reactivar este proveedor?'
        }
        message={
          proveedorPendiente?.estado === 'activo'
            ? `${proveedorPendiente?.nombre} dejará de aparecer como opción al registrar entradas de insumo.`
            : `${proveedorPendiente?.nombre} volverá a aparecer como opción al registrar entradas de insumo.`
        }
        confirmLabel="Sí, continuar"
        cancelLabel="Cancelar"
        tone={proveedorPendiente?.estado === 'activo' ? 'danger' : 'default'}
        onCancel={() => setProveedorPendiente(null)}
        onConfirm={() => {
          if (!proveedorPendiente) return
          const id = proveedorPendiente.id_proveedor
          setProveedorPendiente(null)
          alternarEstado(id)
        }}
      />
    </div>
  )
}

export default ProveedoresScreen

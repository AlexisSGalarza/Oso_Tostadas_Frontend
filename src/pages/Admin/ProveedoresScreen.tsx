import { useState, type FormEvent } from 'react'
import TopBar from '../../components/TopBar'
import { formatClock } from '../../lib/format'
import { PROVEEDORES } from './data'
import type { Proveedor } from './types'
import './ProveedoresScreen.css'

type Props = {
  now: Date
  onVolver: () => void
  onCerrarSesion: () => void
}

function ProveedoresScreen({ now, onVolver, onCerrarSesion }: Props) {
  const [proveedores, setProveedores] = useState<Proveedor[]>(PROVEEDORES)
  const [detalleId, setDetalleId] = useState<string | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [insumo, setInsumo] = useState('')
  const [contacto, setContacto] = useState('')
  const [correo, setCorreo] = useState('')
  const [direccion, setDireccion] = useState('')
  const [error, setError] = useState('')

  const urgentes = proveedores.filter((proveedor) => proveedor.urgente).length

  function alternarEstado(id: string) {
    setProveedores((actual) =>
      actual.map((proveedor) =>
        proveedor.id === id
          ? { ...proveedor, estado: proveedor.estado === 'activo' ? 'inactivo' : 'activo' }
          : proveedor,
      ),
    )
  }

  function alternarDetalle(id: string) {
    setDetalleId((actual) => (actual === id ? null : id))
  }

  function agregarProveedor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!nombre.trim() || !insumo.trim()) {
      setError('Escribe el nombre del proveedor y qué insumo surte.')
      return
    }
    setProveedores((actual) => [
      ...actual,
      {
        id: `p${actual.length + 1}`,
        nombre: nombre.trim(),
        insumo: insumo.trim(),
        contacto: contacto.trim() || '—',
        correo: correo.trim() || '—',
        direccion: direccion.trim() || '—',
        proximaEntrega: 'Por programar',
        estado: 'activo',
      },
    ])
    setNombre('')
    setInsumo('')
    setContacto('')
    setCorreo('')
    setDireccion('')
    setError('')
    setMostrarForm(false)
  }

  return (
    <div className="proveedores">
      <TopBar clock={formatClock(now)} onVolver={onVolver} volverLabel="Admin" onCerrarSesion={onCerrarSesion} />

      <main className="proveedores__main">
        <div className="proveedores__head">
          <div>
            <h1>Proveedores</h1>
            <p className="proveedores__subtitulo">
              Quién surte cada insumo · Sucursal Centro
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
            <button type="submit" className="alta__guardar">
              Guardar proveedor
            </button>
          </form>
        )}

        <section className="lista" aria-label="Proveedores registrados">
          <div className="lista__cabecera" aria-hidden="true">
            <span>Proveedor</span>
            <span>Insumo</span>
            <span>Contacto</span>
            <span>Próxima entrega</span>
            <span>Estado</span>
            <span></span>
          </div>
          <ul className="lista__filas">
            {proveedores.map((proveedor) => (
              <li className="pfila" key={proveedor.id}>
                <div className="pfila__fila">
                  <span className="pfila__celda pfila__celda--nombre" data-label="Proveedor">
                    {proveedor.nombre}
                  </span>
                  <span className="pfila__celda" data-label="Insumo">
                    {proveedor.insumo}
                  </span>
                  <span className="pfila__celda pfila__celda--mono" data-label="Contacto">
                    {proveedor.contacto}
                  </span>
                  <span className="pfila__celda pfila__celda--mono" data-label="Próxima entrega">
                    {proveedor.urgente ? (
                      <span className="pfila__urgente">Urgente · {proveedor.proximaEntrega}</span>
                    ) : (
                      proveedor.proximaEntrega
                    )}
                  </span>
                  <span className="pfila__celda" data-label="Estado">
                    <span className={`pfila__estado is-${proveedor.estado}`}>
                      {proveedor.estado === 'activo' ? 'Activo' : 'Inactivo'}
                    </span>
                  </span>
                  <span className="pfila__celda pfila__celda--accion">
                    <button type="button" className="pfila__detalle" onClick={() => alternarDetalle(proveedor.id)}>
                      {detalleId === proveedor.id ? 'Ocultar' : 'Ver detalle'}
                    </button>
                  </span>
                </div>

                {detalleId === proveedor.id && (
                  <div className="pfila__panel">
                    <div className="pfila__dato">
                      <span className="pfila__datolabel">Correo</span>
                      <span>{proveedor.correo}</span>
                    </div>
                    <div className="pfila__dato">
                      <span className="pfila__datolabel">Dirección</span>
                      <span>{proveedor.direccion}</span>
                    </div>
                    <button type="button" className="pfila__toggle" onClick={() => alternarEstado(proveedor.id)}>
                      {proveedor.estado === 'activo' ? 'Desactivar proveedor' : 'Reactivar proveedor'}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}

export default ProveedoresScreen

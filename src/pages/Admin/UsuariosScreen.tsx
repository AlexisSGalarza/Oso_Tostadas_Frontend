import { useState, type FormEvent } from 'react'
import TopBar from '../../components/TopBar'
import { formatClock } from '../../lib/format'
import { USUARIOS } from './data'
import type { RolUsuario, Usuario } from './types'
import './UsuariosScreen.css'

const ROL_LABEL: Record<RolUsuario, string> = {
  admin: 'Administrador',
  vendedor: 'Vendedor',
}

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

function generarContrasena() {
  let resultado = ''
  for (let i = 0; i < 10; i += 1) {
    resultado += ALFABETO[Math.floor(Math.random() * ALFABETO.length)]
  }
  return resultado
}

function slug(texto: string) {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.')
}

type Props = {
  now: Date
  onVolver: () => void
  onCerrarSesion: () => void
}

function UsuariosScreen({ now, onVolver, onCerrarSesion }: Props) {
  const [usuarios, setUsuarios] = useState<Usuario[]>(USUARIOS)
  const [detalleId, setDetalleId] = useState<string | null>(null)
  const [contrasenasTemporales, setContrasenasTemporales] = useState<Record<string, string>>({})
  const [mostrarForm, setMostrarForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState<RolUsuario>('vendedor')
  const [error, setError] = useState('')

  function alternarEstado(id: string) {
    setUsuarios((actual) =>
      actual.map((usuario) =>
        usuario.id === id ? { ...usuario, estado: usuario.estado === 'activo' ? 'inactivo' : 'activo' } : usuario,
      ),
    )
  }

  function alternarDetalle(id: string) {
    setDetalleId((actual) => (actual === id ? null : id))
  }

  function restablecerContrasena(id: string) {
    setContrasenasTemporales((actual) => ({ ...actual, [id]: generarContrasena() }))
  }

  function agregarUsuario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!nombre.trim()) {
      setError('Escribe el nombre de la persona.')
      return
    }
    const usuarioId = slug(nombre)
    if (usuarios.some((u) => u.usuario === usuarioId)) {
      setError('Ya existe un usuario con ese nombre.')
      return
    }
    const nuevoId = `u${usuarios.length + 1}`
    setUsuarios((actual) => [
      ...actual,
      {
        id: nuevoId,
        nombre: nombre.trim(),
        usuario: usuarioId,
        correo: `${usuarioId}@ositostadas.mx`,
        telefono: '—',
        rol,
        fechaIngreso: now.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }),
        estado: 'activo',
      },
    ])
    setContrasenasTemporales((actual) => ({ ...actual, [nuevoId]: generarContrasena() }))
    setDetalleId(nuevoId)
    setNombre('')
    setRol('vendedor')
    setError('')
    setMostrarForm(false)
  }

  return (
    <div className="usuarios">
      <TopBar clock={formatClock(now)} onVolver={onVolver} volverLabel="Admin" onCerrarSesion={onCerrarSesion} />

      <main className="usuarios__main">
        <div className="usuarios__head">
          <div>
            <h1>Gestionar usuarios</h1>
            <p className="usuarios__subtitulo">Personal con acceso al punto de venta de Sucursal Centro</p>
          </div>
          <button type="button" className="usuarios__nuevo" onClick={() => setMostrarForm((valor) => !valor)}>
            {mostrarForm ? 'Cancelar' : '+ Nuevo usuario'}
          </button>
        </div>

        {mostrarForm && (
          <form className="alta" onSubmit={agregarUsuario}>
            <div className="alta__campo">
              <label htmlFor="nombre">Nombre completo</label>
              <input
                id="nombre"
                type="text"
                placeholder="Nombre y apellido"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                autoFocus
              />
            </div>
            <div className="alta__campo">
              <label htmlFor="rol">Rol</label>
              <select id="rol" value={rol} onChange={(event) => setRol(event.target.value as RolUsuario)}>
                <option value="vendedor">Vendedor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            {error && (
              <p className="alta__error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="alta__guardar">
              Guardar usuario
            </button>
          </form>
        )}

        <section className="lista" aria-label="Usuarios registrados">
          <div className="lista__cabecera" aria-hidden="true">
            <span>Nombre</span>
            <span>Usuario</span>
            <span>Rol</span>
            <span>Estado</span>
            <span></span>
          </div>
          <ul className="lista__filas">
            {usuarios.map((usuario) => (
              <li className="ufila" key={usuario.id}>
                <div className="ufila__fila">
                  <span className="ufila__celda ufila__celda--nombre" data-label="Nombre">
                    {usuario.nombre}
                  </span>
                  <span className="ufila__celda ufila__celda--usuario" data-label="Usuario">
                    @{usuario.usuario}
                  </span>
                  <span className="ufila__celda" data-label="Rol">
                    {ROL_LABEL[usuario.rol]}
                  </span>
                  <span className="ufila__celda" data-label="Estado">
                    <span className={`ufila__estado is-${usuario.estado}`}>
                      {usuario.estado === 'activo' ? 'Activo' : 'Inactivo'}
                    </span>
                  </span>
                  <span className="ufila__celda ufila__celda--accion">
                    <button type="button" className="ufila__detalle" onClick={() => alternarDetalle(usuario.id)}>
                      {detalleId === usuario.id ? 'Ocultar' : 'Ver detalle'}
                    </button>
                  </span>
                </div>

                {detalleId === usuario.id && (
                  <div className="ufila__panel">
                    <div className="ufila__datos">
                      <div className="ufila__dato">
                        <span className="ufila__datolabel">Correo</span>
                        <span>{usuario.correo}</span>
                      </div>
                      <div className="ufila__dato">
                        <span className="ufila__datolabel">Teléfono</span>
                        <span>{usuario.telefono}</span>
                      </div>
                      <div className="ufila__dato">
                        <span className="ufila__datolabel">Ingresó</span>
                        <span>{usuario.fechaIngreso}</span>
                      </div>
                    </div>

                    <div className="ufila__seguridad">
                      <button type="button" className="ufila__toggle" onClick={() => alternarEstado(usuario.id)}>
                        {usuario.estado === 'activo' ? 'Desactivar acceso' : 'Reactivar acceso'}
                      </button>
                      <button
                        type="button"
                        className="ufila__reset"
                        onClick={() => restablecerContrasena(usuario.id)}
                      >
                        Restablecer contraseña
                      </button>
                    </div>

                    {contrasenasTemporales[usuario.id] && (
                      <p className="ufila__temporal">
                        Contraseña temporal: <strong>{contrasenasTemporales[usuario.id]}</strong>
                        <br />
                        Compártela con {usuario.nombre.split(' ')[0]}; se le pedirá cambiarla en su próximo inicio de
                        sesión.
                      </p>
                    )}
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

export default UsuariosScreen

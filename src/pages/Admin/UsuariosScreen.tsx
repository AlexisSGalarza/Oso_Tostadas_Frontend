import { useEffect, useState, type FormEvent } from 'react'
import TopBar from '../../components/TopBar'
import { formatClock } from '../../lib/format'
import { api, ApiError, type EmpleadoAdmin, type Rol } from '../../lib/api'
import './UsuariosScreen.css'

// Quita las marcas diacriticas (acentos) que deja `normalize('NFD')', ej. "á" -> "a" + U+0301.
const MARCAS_DIACRITICAS = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, 'g')

function slug(texto: string) {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(MARCAS_DIACRITICAS, '')
    .replace(/\s+/g, '.')
}

type Props = {
  now: Date
  onVolver: () => void
  onCerrarSesion: () => void
}

function UsuariosScreen({ now, onVolver, onCerrarSesion }: Props) {
  const [usuarios, setUsuarios] = useState<EmpleadoAdmin[]>([])
  const [roles, setRoles] = useState<Rol[]>([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')

  const [detalleId, setDetalleId] = useState<number | null>(null)
  const [contrasenasTemporales, setContrasenasTemporales] = useState<Record<number, string>>({})
  const [mostrarForm, setMostrarForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [idRol, setIdRol] = useState<number | null>(null)
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [accionandoId, setAccionandoId] = useState<number | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [horarioDias, setHorarioDias] = useState('')
  const [horarioInicio, setHorarioInicio] = useState('')
  const [horarioFin, setHorarioFin] = useState('')
  const [guardandoHorario, setGuardandoHorario] = useState(false)

  useEffect(() => {
    Promise.all([api.empleados(), api.roles()])
      .then(([empleadosData, rolesData]) => {
        setUsuarios(empleadosData)
        setRoles(rolesData)
        setIdRol((actual) => actual ?? rolesData[0]?.id_rol ?? null)
      })
      .catch((err) => setErrorCarga(err instanceof ApiError ? err.message : 'No se pudo cargar el personal.'))
      .finally(() => setCargando(false))
  }, [])

  async function alternarEstado(id: number) {
    setAccionandoId(id)
    try {
      const actualizado = await api.alternarEstadoEmpleado(id)
      setUsuarios((actual) => actual.map((u) => (u.id_empleado === id ? actualizado : u)))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el estado.')
    } finally {
      setAccionandoId(null)
    }
  }

  function alternarDetalle(usuario: EmpleadoAdmin) {
    setDetalleId((actual) => (actual === usuario.id_empleado ? null : usuario.id_empleado))
    setHorarioDias(usuario.horario_dias)
    setHorarioInicio(usuario.horario_hora_inicio?.slice(0, 5) ?? '')
    setHorarioFin(usuario.horario_hora_fin?.slice(0, 5) ?? '')
  }

  async function guardarHorario(id: number) {
    setGuardandoHorario(true)
    setError('')
    try {
      const actualizado = await api.actualizarHorarioEmpleado(id, {
        horario_dias: horarioDias.trim(),
        horario_hora_inicio: horarioInicio || null,
        horario_hora_fin: horarioFin || null,
      })
      setUsuarios((actual) => actual.map((u) => (u.id_empleado === id ? actualizado : u)))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el horario.')
    } finally {
      setGuardandoHorario(false)
    }
  }

  async function restablecerContrasena(id: number) {
    setAccionandoId(id)
    try {
      const { password_temporal } = await api.restablecerPasswordEmpleado(id)
      setContrasenasTemporales((actual) => ({ ...actual, [id]: password_temporal }))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo restablecer la contraseña.')
    } finally {
      setAccionandoId(null)
    }
  }

  async function agregarUsuario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!nombre.trim() || !idRol) {
      setError('Escribe el nombre de la persona y elige un rol.')
      return
    }
    setError('')
    setEnviando(true)
    try {
      const correo = `${slug(nombre)}@ositostadas.mx`
      const nuevo = await api.crearEmpleado({
        nombre: nombre.trim(),
        correo,
        telefono: '',
        id_rol: idRol,
        password: password.trim() || undefined,
      })
      setUsuarios((actual) => [...actual, nuevo])
      const passwordMostrada = nuevo.password_temporal ?? password.trim()
      setContrasenasTemporales((actual) => ({ ...actual, [nuevo.id_empleado]: passwordMostrada }))
      setDetalleId(nuevo.id_empleado)
      setNombre('')
      setPassword('')
      setMostrarForm(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el usuario.')
    } finally {
      setEnviando(false)
    }
  }

  const busquedaNormalizada = busqueda.trim().toLowerCase()
  const usuariosFiltrados = busquedaNormalizada
    ? usuarios.filter((usuario) =>
        [usuario.nombre, usuario.correo, usuario.numero_empleado, usuario.rol]
          .join(' ')
          .toLowerCase()
          .includes(busquedaNormalizada),
      )
    : usuarios

  return (
    <div className="usuarios">
      <TopBar clock={formatClock(now)} onVolver={onVolver} volverLabel="Admin" onCerrarSesion={onCerrarSesion} />

      <main className="usuarios__main">
        <div className="usuarios__head">
          <div>
            <h1>Gestionar usuarios</h1>
            <p className="usuarios__subtitulo">Personal con acceso al punto de venta</p>
          </div>
          <button type="button" className="usuarios__nuevo" onClick={() => setMostrarForm((valor) => !valor)}>
            {mostrarForm ? 'Cancelar' : '+ Nuevo usuario'}
          </button>
        </div>

        {!cargando && !errorCarga && usuarios.length > 0 && (
          <input
            type="search"
            className="usuarios__buscador"
            placeholder="Buscar por nombre, correo, no. de empleado o rol…"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            aria-label="Buscar usuarios"
          />
        )}

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
              <select
                id="rol"
                value={idRol ?? ''}
                onChange={(event) => setIdRol(Number(event.target.value))}
              >
                {roles.map((rol) => (
                  <option key={rol.id_rol} value={rol.id_rol}>
                    {rol.nombre_rol}
                  </option>
                ))}
              </select>
            </div>
            <div className="alta__campo">
              <label htmlFor="password">Contraseña (opcional)</label>
              <div className="alta__password">
                <input
                  id="password"
                  type={mostrarPassword ? 'text' : 'password'}
                  placeholder="Vacío = se genera una automática"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="alta__passwordtoggle"
                  onClick={() => setMostrarPassword((valor) => !valor)}
                >
                  {mostrarPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>
            {error && (
              <p className="alta__error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="alta__guardar" disabled={enviando}>
              {enviando ? 'Guardando…' : 'Guardar usuario'}
            </button>
          </form>
        )}

        {cargando && <p className="usuarios__subtitulo">Cargando personal…</p>}
        {errorCarga && (
          <p className="alta__error" role="alert">
            {errorCarga}
          </p>
        )}

        {!cargando && !errorCarga && (
          <section className="lista" aria-label="Usuarios registrados">
            <div className="lista__cabecera" aria-hidden="true">
              <span>Nombre</span>
              <span>No. empleado</span>
              <span>Rol</span>
              <span>Estado</span>
              <span></span>
            </div>
            {usuariosFiltrados.length === 0 && (
              <p className="usuarios__subtitulo">No hay usuarios que coincidan con "{busqueda}".</p>
            )}
            <ul className="lista__filas">
              {usuariosFiltrados.map((usuario) => (
                <li className="ufila" key={usuario.id_empleado}>
                  <div className="ufila__fila">
                    <span className="ufila__celda ufila__celda--nombre" data-label="Nombre">
                      {usuario.nombre}
                    </span>
                    <span className="ufila__celda ufila__celda--usuario" data-label="No. empleado">
                      {usuario.numero_empleado}
                    </span>
                    <span className="ufila__celda" data-label="Rol">
                      {usuario.rol}
                    </span>
                    <span className="ufila__celda" data-label="Estado">
                      <span className={`ufila__estado is-${usuario.estado}`}>
                        {usuario.estado === 'activo' ? 'Activo' : 'Inactivo'}
                      </span>
                    </span>
                    <span className="ufila__celda ufila__celda--accion">
                      <button
                        type="button"
                        className="ufila__detalle"
                        onClick={() => alternarDetalle(usuario)}
                      >
                        {detalleId === usuario.id_empleado ? 'Ocultar' : 'Ver detalle'}
                      </button>
                    </span>
                  </div>

                  {detalleId === usuario.id_empleado && (
                    <div className="ufila__panel">
                      <div className="ufila__datos">
                        <div className="ufila__dato">
                          <span className="ufila__datolabel">Correo</span>
                          <span>{usuario.correo}</span>
                        </div>
                        <div className="ufila__dato">
                          <span className="ufila__datolabel">Teléfono</span>
                          <span>{usuario.telefono || '—'}</span>
                        </div>
                        <div className="ufila__dato">
                          <span className="ufila__datolabel">Ingresó</span>
                          <span>{usuario.fecha_ingreso}</span>
                        </div>
                        <div className="ufila__dato">
                          <span className="ufila__datolabel">Horario</span>
                          <span>
                            {usuario.horario_dias || usuario.horario_hora_inicio ? (
                              <>
                                {usuario.horario_dias || 'Sin días asignados'}
                                {usuario.horario_hora_inicio && usuario.horario_hora_fin
                                  ? ` · ${usuario.horario_hora_inicio.slice(0, 5)}–${usuario.horario_hora_fin.slice(0, 5)}`
                                  : ''}
                              </>
                            ) : (
                              'Sin asignar'
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="ufila__horario">
                        <div className="ufila__horariocampo">
                          <label htmlFor={`horario-dias-${usuario.id_empleado}`}>Días</label>
                          <input
                            id={`horario-dias-${usuario.id_empleado}`}
                            type="text"
                            placeholder="Ej. Lunes a Viernes"
                            value={horarioDias}
                            onChange={(event) => setHorarioDias(event.target.value)}
                          />
                        </div>
                        <div className="ufila__horariocampo">
                          <label htmlFor={`horario-inicio-${usuario.id_empleado}`}>Entrada</label>
                          <input
                            id={`horario-inicio-${usuario.id_empleado}`}
                            type="time"
                            value={horarioInicio}
                            onChange={(event) => setHorarioInicio(event.target.value)}
                          />
                        </div>
                        <div className="ufila__horariocampo">
                          <label htmlFor={`horario-fin-${usuario.id_empleado}`}>Salida</label>
                          <input
                            id={`horario-fin-${usuario.id_empleado}`}
                            type="time"
                            value={horarioFin}
                            onChange={(event) => setHorarioFin(event.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          className="ufila__horarioguardar"
                          onClick={() => guardarHorario(usuario.id_empleado)}
                          disabled={guardandoHorario}
                        >
                          {guardandoHorario ? 'Guardando…' : 'Guardar horario'}
                        </button>
                      </div>

                      <div className="ufila__seguridad">
                        <button
                          type="button"
                          className="ufila__toggle"
                          onClick={() => alternarEstado(usuario.id_empleado)}
                          disabled={accionandoId === usuario.id_empleado}
                        >
                          {usuario.estado === 'activo' ? 'Desactivar acceso' : 'Reactivar acceso'}
                        </button>
                        <button
                          type="button"
                          className="ufila__reset"
                          onClick={() => restablecerContrasena(usuario.id_empleado)}
                          disabled={accionandoId === usuario.id_empleado}
                        >
                          Restablecer contraseña
                        </button>
                      </div>

                      {contrasenasTemporales[usuario.id_empleado] && (
                        <p className="ufila__temporal">
                          No. de empleado: <strong>{usuario.numero_empleado}</strong> · Contraseña temporal:{' '}
                          <strong>{contrasenasTemporales[usuario.id_empleado]}</strong>
                          <br />
                          Compártelos con {usuario.nombre.split(' ')[0]}; anótalos ahora, la contraseña no se
                          puede volver a mostrar.
                        </p>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  )
}

export default UsuariosScreen

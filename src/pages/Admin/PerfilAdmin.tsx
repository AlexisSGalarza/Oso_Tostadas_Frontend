import { useEffect, useState } from 'react'
import TopBar from '../../components/TopBar'
import { formatClock, formatMoney, ZONA_HORARIA_MX } from '../../lib/format'
import { api, ApiError, type AdminDashboard, type EmpleadoMe } from '../../lib/api'
import './PerfilAdmin.css'

type CorteEstado = 'en curso' | 'cuadrada' | 'faltante'

const CORTE_LABEL: Record<CorteEstado, string> = {
  'en curso': 'Turno en curso',
  cuadrada: 'Caja cuadrada',
  faltante: 'Diferencia',
}

function corteDe(turno: AdminDashboard['turnos'][number]): CorteEstado {
  if (turno.estado === 'abierto') return 'en curso'
  return turno.diferencia && turno.diferencia !== 0 ? 'faltante' : 'cuadrada'
}

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// Fecha de "hoy" en horario de Mexico (no la del navegador), en formato AAAA-MM-DD.
function hoyMexicoISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA_MX }).format(new Date())
}

function sumarDias(fechaIso: string, dias: number) {
  const fecha = new Date(`${fechaIso}T12:00:00Z`)
  fecha.setUTCDate(fecha.getUTCDate() + dias)
  return fecha.toISOString().slice(0, 10)
}

type Props = {
  now: Date
  empleado: EmpleadoMe
  onCerrarSesion: () => void
  onUsuarios: () => void
  onReportes: () => void
  onInventario: () => void
  onProveedores: () => void
  onConfiguracion: () => void
  onAuditoria: () => void
  onVerTurno: (idTurno: number) => void
}

function PerfilAdmin({
  now,
  empleado,
  onCerrarSesion,
  onUsuarios,
  onReportes,
  onInventario,
  onProveedores,
  onConfiguracion,
  onAuditoria,
  onVerTurno,
}: Props) {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyMexicoISO)

  useEffect(() => {
    setCargando(true)
    api
      .dashboardAdmin(fechaSeleccionada)
      .then(setDashboard)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudo cargar el panel.'))
      .finally(() => setCargando(false))
  }, [fechaSeleccionada])

  const esHoySeleccionado = fechaSeleccionada === hoyMexicoISO()

  const fecha = capitalizar(
    now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: ZONA_HORARIA_MX }),
  )

  const acciones = [
    { label: 'Gestionar usuarios', onClick: onUsuarios },
    { label: 'Ver reportes de ventas', onClick: onReportes },
    { label: 'Inventario', onClick: onInventario },
    { label: 'Proveedores', onClick: onProveedores },
    { label: 'Configuración', onClick: onConfiguracion },
    { label: 'Auditoría', onClick: onAuditoria },
  ]

  return (
    <div className="admin">
      <TopBar clock={formatClock(now)} sucursal={empleado.sucursal} onCerrarSesion={onCerrarSesion} />

      <main className="admin__main">
        <section className="saludo saludo--admin">
          <div>
            <h1>Hola, {empleado.nombre}</h1>
            <p className="saludo__rol">
              {empleado.rol} · {empleado.sucursal}
            </p>
          </div>
          <p className="saludo__fecha">{fecha}</p>
        </section>

        {cargando && <p className="saludo__rol">Cargando…</p>}
        {error && (
          <p className="saludo__rol" role="alert">
            {error}
          </p>
        )}

        {dashboard && (
          <>
            <section className="resumen" aria-label="Resumen del día">
              <div className="resumen__item resumen__item--principal">
                <span className="resumen__valor">{formatMoney(dashboard.resumen.ventas_dia)}</span>
                <span className="resumen__etiqueta">{esHoySeleccionado ? 'Ventas de hoy' : 'Ventas del día'}</span>
              </div>
              <div className="resumen__item">
                <span className="resumen__valor">{dashboard.resumen.turnos_activos}</span>
                <span className="resumen__etiqueta">Turnos activos</span>
              </div>
              <div className="resumen__item">
                <span className="resumen__valor">{dashboard.resumen.cortes_por_revisar}</span>
                <span className="resumen__etiqueta">Cortes por revisar</span>
              </div>
            </section>

            <div className="paneles-admin">
              <section className="libro" aria-label="Libro de turnos">
                <div className="libro__head">
                  <h2 className="libro__titulo">
                    Libro de turnos ·{' '}
                    {capitalizar(
                      new Date(`${fechaSeleccionada}T12:00:00Z`).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        timeZone: ZONA_HORARIA_MX,
                      }),
                    )}
                  </h2>
                  <div className="libro__navfecha">
                    <button
                      type="button"
                      className="libro__navboton"
                      onClick={() => setFechaSeleccionada((f) => sumarDias(f, -1))}
                      aria-label="Día anterior"
                    >
                      ←
                    </button>
                    {!esHoySeleccionado && (
                      <button type="button" className="libro__navhoy" onClick={() => setFechaSeleccionada(hoyMexicoISO())}>
                        Hoy
                      </button>
                    )}
                    <button
                      type="button"
                      className="libro__navboton"
                      onClick={() => setFechaSeleccionada((f) => sumarDias(f, 1))}
                      disabled={esHoySeleccionado}
                      aria-label="Día siguiente"
                    >
                      →
                    </button>
                  </div>
                </div>

                <div className="libro__cabecera" aria-hidden="true">
                  <span>Cajero</span>
                  <span>Horario</span>
                  <span>Estado</span>
                  <span>Ventas</span>
                  <span>Corte</span>
                </div>

                {dashboard.turnos.length === 0 ? (
                  <p className="saludo__rol">
                    {esHoySeleccionado ? 'Todavía no hay turnos hoy.' : 'No hubo turnos ese día.'}
                  </p>
                ) : (
                  <ul className="libro__filas">
                    {dashboard.turnos.map((turno) => {
                      const corte = corteDe(turno)
                      return (
                        <li key={turno.id_turno}>
                        <button type="button" className="fila fila--clic" onClick={() => onVerTurno(turno.id_turno)}>
                          <span className="fila__celda fila__celda--nombre" data-label="Cajero">
                            {turno.empleado}
                          </span>
                          <span className="fila__celda" data-label="Horario">
                            {turno.hora_inicio.slice(0, 5)}
                            {turno.hora_fin ? `–${turno.hora_fin.slice(0, 5)}` : ' (en curso)'}
                          </span>
                          <span className="fila__celda" data-label="Estado">
                            <span className={`fila__estado ${turno.estado === 'abierto' ? 'is-abierto' : 'is-cerrado'}`}>
                              {turno.estado === 'abierto' ? 'Abierto' : 'Cerrado'}
                            </span>
                          </span>
                          <span className="fila__celda fila__celda--num" data-label="Ventas">
                            {formatMoney(turno.ventas)}
                          </span>
                          <span
                            className={`fila__celda fila__celda--corte is-${corte.replace(' ', '-')}`}
                            data-label="Corte"
                          >
                            {corte === 'faltante' && turno.diferencia
                              ? `${turno.diferencia < 0 ? 'Faltante' : 'Sobrante'} de ${formatMoney(Math.abs(turno.diferencia))}`
                              : CORTE_LABEL[corte]}
                          </span>
                        </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>

              <div className="lateral">
                <section className="pendientes" aria-label="Pendientes">
                  <h2 className="lateral__titulo">Pendientes</h2>
                  {dashboard.pendientes.length === 0 ? (
                    <p className="saludo__rol">Sin pendientes por ahora.</p>
                  ) : (
                    <ul className="pendientes__lista">
                      {dashboard.pendientes.map((pendiente, index) => (
                        <li key={index} className={`pendiente is-${pendiente.severidad}`}>
                          {pendiente.texto}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <nav className="acciones-admin" aria-label="Acciones de administración">
                  <h2 className="lateral__titulo">Acciones</h2>
                  {acciones.map((accion) => (
                    <button type="button" className="accion-admin" key={accion.label} onClick={accion.onClick}>
                      <span>{accion.label}</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default PerfilAdmin

import { useEffect, useState } from 'react'
import TopBar from '../../components/TopBar'
import { formatClock, formatFecha, ZONA_HORARIA_MX } from '../../lib/format'
import { api, ApiError, type RegistroAuditoria } from '../../lib/api'
import './AuditoriaScreen.css'

const ACCION_LABEL: Record<string, string> = {
  'empleado.crear': 'Usuario creado',
  'empleado.alternar_estado': 'Acceso de usuario',
  'empleado.restablecer_password': 'Contraseña restablecida',
  'empleado.horario': 'Horario asignado',
  'proveedor.alternar_estado': 'Proveedor',
  'insumo.crear': 'Insumo creado',
}

function formatFechaHora(iso: string) {
  const fecha = new Date(iso)
  return `${formatFecha(fecha, { day: 'numeric', month: 'short', year: 'numeric' })} · ${fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: ZONA_HORARIA_MX })}`
}

type Props = {
  now: Date
  onVolver: () => void
  onCerrarSesion: () => void
}

function AuditoriaScreen({ now, onVolver, onCerrarSesion }: Props) {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .auditoria()
      .then(setRegistros)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudo cargar la auditoría.'))
      .finally(() => setCargando(false))
  }, [])

  return (
    <div className="auditoria">
      <TopBar clock={formatClock(now)} onVolver={onVolver} volverLabel="Admin" onCerrarSesion={onCerrarSesion} />

      <main className="auditoria__main">
        <h1>Auditoría</h1>
        <p className="auditoria__subtitulo">Quién hizo qué en las últimas acciones administrativas</p>

        {cargando && <p className="auditoria__subtitulo">Cargando…</p>}
        {error && (
          <p className="auditoria__error" role="alert">
            {error}
          </p>
        )}

        {!cargando && !error && registros.length === 0 && (
          <p className="auditoria__subtitulo">Todavía no hay acciones registradas.</p>
        )}

        {!cargando && registros.length > 0 && (
          <ul className="auditoria__lista">
            {registros.map((registro) => (
              <li key={registro.id_registro} className="aregistro">
                <div className="aregistro__cabeza">
                  <span className="aregistro__tag">{ACCION_LABEL[registro.accion] ?? registro.accion}</span>
                  <span className="aregistro__fecha">{formatFechaHora(registro.creado_en)}</span>
                </div>
                <p className="aregistro__detalle">{registro.detalle}</p>
                <p className="aregistro__actor">Por {registro.actor}</p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

export default AuditoriaScreen

import { useEffect, useState } from 'react'
import TopBar from '../../components/TopBar'
import { formatClock, formatFecha, ZONA_HORARIA_MX } from '../../lib/format'
import EstadoVacio from '../../components/EstadoVacio'
import { EsqueletoLista } from '../../components/Esqueleto'
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

// Las acciones sin etiqueta llegan como "producto.codigo_barras": se muestran legibles.
function etiquetaAccion(accion: string) {
  if (ACCION_LABEL[accion]) return ACCION_LABEL[accion]
  const texto = accion.replace(/[._]/g, ' ')
  return texto.charAt(0).toUpperCase() + texto.slice(1)
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

        {cargando && <EsqueletoLista filas={6} etiqueta="Cargando la auditoría…" />}
        {error && (
          <p className="auditoria__error" role="alert">
            {error}
          </p>
        )}

        {!cargando && !error && registros.length === 0 && (
          <div className="tarjeta">
            <EstadoVacio icono="auditoria" titulo="Todavía no hay acciones registradas">
              Aquí queda constancia de altas, cambios de acceso y ajustes de inventario.
            </EstadoVacio>
          </div>
        )}

        {!cargando && registros.length > 0 && (
          <ul className="auditoria__lista">
            {registros.map((registro) => (
              <li key={registro.id_registro} className="aregistro">
                <span className="aregistro__fecha">{formatFechaHora(registro.creado_en)}</span>
                <div className="aregistro__cuerpo">
                  <p className="aregistro__detalle">{registro.detalle}</p>
                  <p className="aregistro__actor">Por {registro.actor}</p>
                </div>
                <span className="aregistro__tag">{etiquetaAccion(registro.accion)}</span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

export default AuditoriaScreen

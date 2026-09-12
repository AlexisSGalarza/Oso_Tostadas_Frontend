import { useEffect, useState } from 'react'
import TopBar from '../../components/TopBar'
import { formatClock, formatFecha, formatMoney, ZONA_HORARIA_MX } from '../../lib/format'
import { api, ApiError, type ReporteSemana } from '../../lib/api'
import './ReportesScreen.css'

function formatearFecha(fechaIso: string) {
  // Mediodia UTC evita que un huso horario distinto al de Mexico recorra el dia al formatear.
  const fecha = new Date(`${fechaIso}T12:00:00Z`)
  const diaCorto = fecha
    .toLocaleDateString('es-MX', { weekday: 'short', timeZone: ZONA_HORARIA_MX })
    .replace('.', '')
  return {
    dia: diaCorto.charAt(0).toUpperCase() + diaCorto.slice(1),
    fecha: formatFecha(fecha),
  }
}

type Props = {
  now: Date
  onVolver: () => void
  onCerrarSesion: () => void
}

function ReportesScreen({ now, onVolver, onCerrarSesion }: Props) {
  const [reporte, setReporte] = useState<ReporteSemana | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .reporteSemana()
      .then(setReporte)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudo cargar el reporte.'))
      .finally(() => setCargando(false))
  }, [])

  if (cargando || error || !reporte) {
    return (
      <div className="reportes">
        <TopBar clock={formatClock(now)} onVolver={onVolver} volverLabel="Admin" onCerrarSesion={onCerrarSesion} />
        <main className="reportes__main">
          <h1>Reportes de ventas</h1>
          <p className="reportes__subtitulo">{error || 'Cargando…'}</p>
        </main>
      </div>
    )
  }

  const semana = reporte.dias.map((dia) => ({ ...dia, ...formatearFecha(dia.fecha) }))
  const ventasSemana = semana.reduce((suma, dia) => suma + dia.ventas, 0)
  const ticketsSemana = semana.reduce((suma, dia) => suma + dia.tickets, 0)
  const ticketPromedio = ticketsSemana > 0 ? ventasSemana / ticketsSemana : 0
  const mejorDia = semana.reduce((mejor, dia) => (dia.ventas > mejor.ventas ? dia : mejor), semana[0])
  const maxVentas = Math.max(1, ...semana.map((dia) => dia.ventas))
  const maxIngresos = Math.max(1, ...reporte.productos.map((producto) => producto.ingresos))

  return (
    <div className="reportes">
      <TopBar clock={formatClock(now)} onVolver={onVolver} volverLabel="Admin" onCerrarSesion={onCerrarSesion} />

      <main className="reportes__main">
        <h1>Reportes de ventas</h1>
        <p className="reportes__subtitulo">Últimos 7 días</p>

        <section className="resumen" aria-label="Resumen de la semana">
          <div className="resumen__item resumen__item--principal">
            <span className="resumen__valor">{formatMoney(ventasSemana)}</span>
            <span className="resumen__etiqueta">Ventas de la semana</span>
          </div>
          <div className="resumen__item">
            <span className="resumen__valor">{formatMoney(ticketPromedio)}</span>
            <span className="resumen__etiqueta">Ticket promedio</span>
          </div>
          <div className="resumen__item">
            <span className="resumen__valor">{mejorDia.dia}</span>
            <span className="resumen__etiqueta">Mejor día · {formatMoney(mejorDia.ventas)}</span>
          </div>
        </section>

        <div className="paneles-reporte">
          <section className="semana" aria-label="Ventas por día">
            <h2 className="panel__titulo">Ventas por día</h2>
            <ul className="barras">
              {semana.map((dia) => (
                <li className="barra" key={dia.fecha + dia.dia}>
                  <span className="barra__dia">
                    {dia.dia}
                    <span className="barra__fecha">{dia.fecha}</span>
                  </span>
                  <span className="barra__pista">
                    <span className="barra__relleno" style={{ width: `${(dia.ventas / maxVentas) * 100}%` }} />
                  </span>
                  <span className="barra__valor">{formatMoney(dia.ventas)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="productos" aria-label="Productos más vendidos">
            <h2 className="panel__titulo">Productos más vendidos</h2>
            {reporte.productos.length === 0 ? (
              <p className="reportes__subtitulo">Sin ventas todavía en este periodo.</p>
            ) : (
              <ul className="producto-lista">
                {reporte.productos.map((producto) => (
                  <li className="producto-fila" key={producto.nombre}>
                    <div className="producto-fila__cabeza">
                      <span className="producto-fila__nombre">{producto.nombre}</span>
                      <span className="producto-fila__cantidad">{producto.cantidad} paquetes</span>
                    </div>
                    <span className="producto-fila__pista">
                      <span
                        className="producto-fila__relleno"
                        style={{ width: `${(producto.ingresos / maxIngresos) * 100}%` }}
                      />
                    </span>
                    <span className="producto-fila__ingresos">{formatMoney(producto.ingresos)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default ReportesScreen

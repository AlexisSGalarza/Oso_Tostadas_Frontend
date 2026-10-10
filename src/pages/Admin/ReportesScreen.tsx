import { useEffect, useState, type CSSProperties } from 'react'
import TopBar from '../../components/TopBar'
import GraficaBarras from '../../components/GraficaBarras'
import Kpi from '../../components/Kpi'
import EstadoVacio from '../../components/EstadoVacio'
import Tostadas from '../../components/Tostadas'
import { EsqueletoKpis, EsqueletoLista } from '../../components/Esqueleto'
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
          <p className="reportes__subtitulo">Últimos 7 días</p>
          {error ? (
            <div className="tarjeta">
              <EstadoVacio icono="alerta" titulo="No se pudo cargar el reporte">
                {error}
              </EstadoVacio>
            </div>
          ) : (
            <>
              <EsqueletoKpis />
              <EsqueletoLista filas={4} etiqueta="Cargando el reporte…" />
            </>
          )}
        </main>
      </div>
    )
  }

  const semana = reporte.dias.map((dia) => ({ ...dia, ...formatearFecha(dia.fecha) }))
  const ventasSemana = semana.reduce((suma, dia) => suma + dia.ventas, 0)
  const ticketsSemana = semana.reduce((suma, dia) => suma + dia.tickets, 0)
  const ticketPromedio = ticketsSemana > 0 ? ventasSemana / ticketsSemana : 0
  const mejorDia = semana.reduce((mejor, dia) => (dia.ventas > mejor.ventas ? dia : mejor), semana[0])
  const diasConVenta = semana.filter((dia) => dia.ventas > 0).length
  const maxIngresos = Math.max(1, ...reporte.productos.map((producto) => producto.ingresos))
  const paquetes = (cantidad: number) => `${cantidad} ${cantidad === 1 ? 'paquete' : 'paquetes'}`

  return (
    <div className="reportes">
      <TopBar clock={formatClock(now)} onVolver={onVolver} volverLabel="Admin" onCerrarSesion={onCerrarSesion} />

      <main className="reportes__main">
        <h1>Reportes de ventas</h1>
        <p className="reportes__subtitulo">
          Últimos 7 días, del {semana[0].fecha} al {semana[semana.length - 1].fecha}
        </p>

        <section className="kpis" aria-label="Resumen de la semana">
          <Kpi
            indice={0}
            etiqueta="Ventas de la semana"
            valor={ventasSemana}
            formato={(v) => formatMoney(Math.round(v * 100) / 100)}
            serie={semana.map((dia) => dia.ventas)}
            seriePeriodo="por día"
            nota={`${diasConVenta} de ${semana.length} días con venta`}
          />
          <Kpi
            indice={1}
            etiqueta="Tickets"
            valor={ticketsSemana}
            formato={(v) => String(Math.round(v))}
            serie={semana.map((dia) => dia.tickets)}
            seriePeriodo="por día"
            nota={`${(ticketsSemana / semana.length).toFixed(1)} al día en promedio`}
          />
          <Kpi
            indice={2}
            etiqueta="Ticket promedio"
            valor={ticketPromedio}
            formato={(v) => formatMoney(Math.round(v * 100) / 100)}
            nota="Venta de la semana entre sus tickets"
          />
          <Kpi
            indice={3}
            etiqueta="Mejor día"
            valor={mejorDia.ventas > 0 ? `${mejorDia.dia} ${mejorDia.fecha}` : null}
            nota={mejorDia.ventas > 0 ? `${formatMoney(mejorDia.ventas)} en ${mejorDia.tickets} ${mejorDia.tickets === 1 ? 'ticket' : 'tickets'}` : 'Sin ventas en el periodo'}
          />
        </section>

        <div className="paneles-reporte">
          <section className="tarjeta entra" style={{ '--i': 4 } as CSSProperties} aria-label="Ventas por día">
            <h2 className="tarjeta__titulo">Ventas por día</h2>
            <GraficaBarras
              descripcion="Ventas de cada día de la semana"
              formatear={formatMoney}
              vacio="Sin ventas en estos 7 días."
              puntos={semana.map((dia) => ({
                clave: dia.fecha + dia.dia,
                eje: dia.dia,
                titulo: `${dia.dia} ${dia.fecha}`,
                detalle: [formatMoney(dia.ventas), `${dia.tickets} ${dia.tickets === 1 ? 'ticket' : 'tickets'}`],
                valor: dia.ventas,
              }))}
            />
          </section>

          <section className="tarjeta entra" style={{ '--i': 5 } as CSSProperties} aria-label="Productos más vendidos">
            <h2 className="tarjeta__titulo">Productos más vendidos</h2>
            {reporte.productos.length === 0 ? (
              <EstadoVacio compacto icono="venta" titulo="Sin ventas en este periodo">
                Cuando haya ventas verás aquí qué producto deja más ingreso.
              </EstadoVacio>
            ) : (
              <table className="tabla">
                <thead>
                  <tr>
                    <th scope="col">Producto</th>
                    <th scope="col" className="tabla__col-barra">
                      <span className="solo-lectores">Parte del ingreso</span>
                    </th>
                    <th scope="col" className="es-numero">
                      Paquetes
                    </th>
                    <th scope="col" className="es-numero">
                      Ingreso
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reporte.productos.map((producto) => (
                    <tr key={producto.nombre}>
                      <td>
                        <span className="tabla__producto">
                          <Tostadas nombre={producto.nombre} className="tabla__foto" />
                          {producto.nombre}
                        </span>
                      </td>
                      <td className="tabla__col-barra">
                        <span className="tabla__barra" aria-hidden="true">
                          <span style={{ width: `${(producto.ingresos / maxIngresos) * 100}%` }} />
                        </span>
                      </td>
                      <td className="es-numero" aria-label={paquetes(producto.cantidad)}>
                        {producto.cantidad}
                      </td>
                      <td className="es-numero es-fuerte">{formatMoney(producto.ingresos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default ReportesScreen

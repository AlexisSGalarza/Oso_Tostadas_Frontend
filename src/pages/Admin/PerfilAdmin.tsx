import { useEffect, useState } from 'react'
import TopBar from '../../components/TopBar'
import GraficaBarras from '../../components/GraficaBarras'
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

// Mediodia UTC evita que un huso horario distinto al de Mexico recorra el dia al formatear.
function formatDia(fechaIso: string, opciones: Intl.DateTimeFormatOptions) {
  return new Date(`${fechaIso}T12:00:00Z`)
    .toLocaleDateString('es-MX', { ...opciones, timeZone: ZONA_HORARIA_MX })
    .replace('.', '')
}

function formatHora(hora: number) {
  return `${String(hora).padStart(2, '0')}:00`
}

function plural(cantidad: number, uno: string, varios: string) {
  return `${cantidad} ${cantidad === 1 ? uno : varios}`
}

type Props = {
  now: Date
  empleado: EmpleadoMe
  onCerrarSesion: () => void
  onVerTurno: (idTurno: number) => void
  onReportes: () => void
  onInventario: () => void
}

function PerfilAdmin({ now, empleado, onCerrarSesion, onVerTurno, onReportes, onInventario }: Props) {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyMexicoISO)

  useEffect(() => {
    let vigente = true
    setCargando(true)
    setError('')
    api
      .dashboardAdmin(fechaSeleccionada)
      .then((datos) => vigente && setDashboard(datos))
      .catch((err) => vigente && setError(err instanceof ApiError ? err.message : 'No se pudo cargar el panel.'))
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [fechaSeleccionada])

  const esHoy = fechaSeleccionada === hoyMexicoISO()
  const tituloDia = esHoy
    ? `Hoy, ${formatDia(fechaSeleccionada, { weekday: 'long', day: 'numeric', month: 'long' })}`
    : capitalizar(formatDia(fechaSeleccionada, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))

  const resumen = dashboard?.resumen
  const anterior = resumen?.comparacion.ventas_netas ?? 0
  const cambio = resumen && anterior > 0 ? ((resumen.ventas_netas - anterior) / anterior) * 100 : null
  const cobrado = resumen ? resumen.efectivo + resumen.tarjeta : 0
  const margen =
    resumen && resumen.utilidad_estimada !== null && resumen.costo_estimado !== null
      ? (resumen.utilidad_estimada / Math.max(resumen.utilidad_estimada + resumen.costo_estimado, 0.01)) * 100
      : null
  const maxUnidades = Math.max(1, ...(dashboard?.productos_top.map((p) => p.cantidad) ?? []))

  return (
    <div className="admin">
      <TopBar clock={formatClock(now)} sucursal={empleado.sucursal} onCerrarSesion={onCerrarSesion} />

      <main className="admin__main">
        <header className="panel-cabeza">
          <div>
            <h1>Panel</h1>
            <p className="panel-cabeza__dia">{tituloDia}</p>
          </div>
          <div className="panel-fecha" role="group" aria-label="Cambiar de día">
            <button
              type="button"
              className="panel-fecha__boton"
              onClick={() => setFechaSeleccionada((f) => sumarDias(f, -1))}
              aria-label="Día anterior"
            >
              ←
            </button>
            <input
              type="date"
              className="panel-fecha__campo"
              aria-label="Elegir día"
              value={fechaSeleccionada}
              max={hoyMexicoISO()}
              onChange={(event) => event.target.value && setFechaSeleccionada(event.target.value)}
            />
            <button
              type="button"
              className="panel-fecha__boton"
              onClick={() => setFechaSeleccionada((f) => sumarDias(f, 1))}
              disabled={esHoy}
              aria-label="Día siguiente"
            >
              →
            </button>
            {!esHoy && (
              <button type="button" className="panel-fecha__hoy" onClick={() => setFechaSeleccionada(hoyMexicoISO())}>
                Ir a hoy
              </button>
            )}
          </div>
        </header>

        {error && (
          <p className="panel-error" role="alert">
            {error}
          </p>
        )}
        {cargando && !dashboard && <p className="panel-nota">Cargando…</p>}

        {dashboard && resumen && (
          <div className={`panel-cuerpo ${cargando ? 'is-cargando' : ''}`} aria-busy={cargando}>
            <section className="cifras" aria-label="Cifras del día">
              <div className="cifra cifra--principal">
                <span className="cifra__etiqueta">Ventas netas</span>
                <span className="cifra__valor">{formatMoney(resumen.ventas_netas)}</span>
                <span className="cifra__nota">
                  {cambio === null ? (
                    `Sin ventas el ${formatDia(resumen.comparacion.fecha, { weekday: 'long' })} pasado para comparar`
                  ) : (
                    <>
                      <span className={`cifra__cambio ${cambio >= 0 ? 'is-sube' : 'is-baja'}`}>
                        {cambio >= 0 ? '▲' : '▼'} {Math.abs(cambio).toFixed(0)}%
                      </span>{' '}
                      contra el {formatDia(resumen.comparacion.fecha, { weekday: 'long' })} pasado ({formatMoney(anterior)})
                    </>
                  )}
                </span>
              </div>
              <div className="cifra">
                <span className="cifra__etiqueta">Tickets</span>
                <span className="cifra__valor">{resumen.tickets}</span>
                <span className="cifra__nota">Promedio de {formatMoney(resumen.ticket_promedio)} por ticket</span>
              </div>
              <div className="cifra">
                <span className="cifra__etiqueta">Paquetes vendidos</span>
                <span className="cifra__valor">{resumen.paquetes}</span>
                <span className="cifra__nota">
                  {resumen.devoluciones_dia > 0
                    ? `Ya descontando ${formatMoney(resumen.devoluciones_dia)} en devoluciones`
                    : 'Sin devoluciones'}
                </span>
              </div>
              <div className="cifra">
                <span className="cifra__etiqueta">Utilidad bruta estimada</span>
                <span className="cifra__valor">
                  {resumen.utilidad_estimada === null ? '—' : formatMoney(resumen.utilidad_estimada)}
                </span>
                <span className="cifra__nota">
                  {margen === null
                    ? resumen.tickets === 0
                      ? 'Se calcula con las recetas y el costo de los insumos'
                      : 'Falta la receta o el costo de algún producto vendido'
                    : `Margen de ${margen.toFixed(0)}% sobre la venta sin IVA, según recetas`}
                </span>
              </div>
            </section>

            <div className="panel-rejilla">
              <section className="tarjeta tarjeta--ancha">
                <h2 className="tarjeta__titulo">Ventas por hora</h2>
                <GraficaBarras
                  descripcion="Ventas por hora del día"
                  formatear={formatMoney}
                  vacio={esHoy ? 'Todavía no hay ventas hoy.' : 'No hubo ventas ese día.'}
                  puntos={dashboard.ventas_por_hora.map((h, indice) => ({
                    clave: String(h.hora),
                    eje: dashboard.ventas_por_hora.length > 10 && indice % 2 === 1 ? '' : String(h.hora),
                    titulo: `${formatHora(h.hora)} a ${formatHora(h.hora + 1)}`,
                    detalle: [formatMoney(h.ventas), plural(h.tickets, 'ticket', 'tickets')],
                    valor: h.ventas,
                  }))}
                />
              </section>

              <section className="tarjeta">
                <h2 className="tarjeta__titulo">Cómo pagaron</h2>
                {cobrado <= 0 ? (
                  <p className="panel-nota">Sin cobros registrados.</p>
                ) : (
                  <ul className="pagos">
                    {[
                      { nombre: 'Efectivo', monto: resumen.efectivo },
                      { nombre: 'Tarjeta', monto: resumen.tarjeta },
                    ].map((pago) => (
                      <li key={pago.nombre}>
                        <div className="pagos__fila">
                          <span>{pago.nombre}</span>
                          <span className="pagos__monto">
                            {formatMoney(pago.monto)} · {((pago.monto / cobrado) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <span className="medidor">
                          <span style={{ width: `${(pago.monto / cobrado) * 100}%` }} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <dl className="caja">
                  <div>
                    <dt>Turnos abiertos</dt>
                    <dd>{resumen.turnos_activos}</dd>
                  </div>
                  <div>
                    <dt>Cortes con diferencia</dt>
                    <dd className={resumen.cortes_por_revisar > 0 ? 'is-alerta' : ''}>{resumen.cortes_por_revisar}</dd>
                  </div>
                </dl>
              </section>

              <section className="tarjeta tarjeta--ancha">
                <div className="tarjeta__cabeza">
                  <h2 className="tarjeta__titulo">Últimos 7 días</h2>
                  <button type="button" className="tarjeta__enlace" onClick={onReportes}>
                    Ver reportes
                  </button>
                </div>
                <GraficaBarras
                  descripcion="Ventas de los últimos 7 días; elige una barra para ver ese día"
                  formatear={formatMoney}
                  vacio="Sin ventas en estos 7 días."
                  puntos={dashboard.semana.map((d) => ({
                    clave: d.fecha,
                    eje: capitalizar(formatDia(d.fecha, { weekday: 'short' })),
                    titulo: capitalizar(formatDia(d.fecha, { weekday: 'long', day: 'numeric', month: 'short' })),
                    detalle: [formatMoney(d.ventas), plural(d.tickets, 'ticket', 'tickets')],
                    valor: d.ventas,
                    activo: d.fecha === fechaSeleccionada,
                    onClick: () => setFechaSeleccionada(d.fecha),
                  }))}
                />
              </section>

              <section className="tarjeta">
                <h2 className="tarjeta__titulo">Lo más vendido</h2>
                {dashboard.productos_top.length === 0 ? (
                  <p className="panel-nota">{esHoy ? 'Todavía no hay ventas hoy.' : 'No hubo ventas ese día.'}</p>
                ) : (
                  <ol className="top">
                    {dashboard.productos_top.slice(0, 5).map((producto) => (
                      <li key={producto.nombre}>
                        <div className="pagos__fila">
                          <span>{producto.nombre}</span>
                          <span className="pagos__monto">{plural(producto.cantidad, 'paquete', 'paquetes')}</span>
                        </div>
                        <span className="medidor">
                          <span style={{ width: `${(producto.cantidad / maxUnidades) * 100}%` }} />
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className="tarjeta tarjeta--ancha" aria-label="Libro de turnos">
                <h2 className="tarjeta__titulo">Turnos del día</h2>
                {dashboard.turnos.length === 0 ? (
                  <p className="panel-nota">{esHoy ? 'Todavía no hay turnos hoy.' : 'No hubo turnos ese día.'}</p>
                ) : (
                  <>
                    <div className="libro__cabecera" aria-hidden="true">
                      <span>Cajero</span>
                      <span>Horario</span>
                      <span>Estado</span>
                      <span>Ventas</span>
                      <span>Corte</span>
                    </div>
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
                                {turno.hora_fin ? ` a ${turno.hora_fin.slice(0, 5)}` : ' (en curso)'}
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
                  </>
                )}
              </section>

              <section className="tarjeta">
                <h2 className="tarjeta__titulo">Pendientes</h2>
                {dashboard.pendientes.length === 0 ? (
                  <p className="panel-nota">Sin pendientes por ahora.</p>
                ) : (
                  <ul className="pendientes__lista">
                    {dashboard.pendientes.map((pendiente, index) => (
                      <li key={index} className={`pendiente is-${pendiente.severidad}`}>
                        <span className="pendiente__tipo">{pendiente.severidad === 'urgente' ? 'Urgente' : 'Aviso'}</span>
                        {pendiente.texto}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="tarjeta tarjeta--completa">
                <div className="tarjeta__cabeza">
                  <div>
                    <h2 className="tarjeta__titulo">Para cuántos días alcanza lo que hay</h2>
                    <p className="tarjeta__sub">Existencia actual entre la venta diaria promedio de los últimos 7 días</p>
                  </div>
                  <button type="button" className="tarjeta__enlace" onClick={onInventario}>
                    Ir a inventario
                  </button>
                </div>
                {dashboard.existencias.length === 0 ? (
                  <p className="panel-nota">No hay productos activos.</p>
                ) : (
                  <ul className="existencias">
                    {dashboard.existencias.map((e) => {
                      const nivel =
                        e.stock <= 0 || (e.dias_restantes !== null && e.dias_restantes < 2)
                          ? 'critico'
                          : e.stock < e.stock_minimo || (e.dias_restantes !== null && e.dias_restantes < 5)
                            ? 'bajo'
                            : 'bien'
                      return (
                        <li key={e.nombre} className={`existencia is-${nivel}`}>
                          <span className="existencia__nombre">{e.nombre}</span>
                          <span className="existencia__dias">
                            {e.stock <= 0
                              ? 'Agotado'
                              : e.dias_restantes === null
                                ? 'Sin ventas recientes'
                                : e.dias_restantes < 1
                                  ? 'Menos de 1 día'
                                  : `${plural(Math.floor(e.dias_restantes), 'día', 'días')}`}
                          </span>
                          <span className="existencia__detalle">
                            {plural(e.stock, 'paquete', 'paquetes')}
                            {e.venta_diaria > 0 ? ` · se venden ${e.venta_diaria} al día` : ''}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default PerfilAdmin

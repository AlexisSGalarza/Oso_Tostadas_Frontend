import { useEffect, useState, type CSSProperties } from 'react'
import TopBar from '../../components/TopBar'
import GraficaBarras from '../../components/GraficaBarras'
import GraficaArea from '../../components/GraficaArea'
import GraficaDona from '../../components/GraficaDona'
import Tostadas from '../../components/Tostadas'
import Icono from '../../components/Icono'
import Kpi from '../../components/Kpi'
import EstadoVacio from '../../components/EstadoVacio'
import { Esqueleto, EsqueletoKpis } from '../../components/Esqueleto'
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

// Paleta categorica validada (daltonismo y contraste) para distinguir productos en la dona.
const COLORES_PRODUCTO = ['#1f8a3b', '#dd9a00', '#d1492f', '#1a9a94', '#b0632a', '#7a56c2']

// La cobertura se dibuja contra un mes: mas de 30 dias ya es "de sobra".
const DIAS_TOPE = 30

function PanelEsqueleto() {
  return (
    <div className="panel-cuerpo" role="status">
      <span className="solo-lectores">Cargando el panel…</span>
      <EsqueletoKpis />
      <div className="panel-rejilla" aria-hidden="true">
        <div className="tarjeta tarjeta--ancha">
          <Esqueleto ancho="9rem" alto="1.1rem" />
          <Esqueleto alto="13rem" className="panel-esq__bloque" />
        </div>
        <div className="tarjeta">
          <Esqueleto ancho="10rem" alto="1.1rem" />
          <Esqueleto alto="13rem" className="panel-esq__bloque" />
        </div>
        <div className="tarjeta tarjeta--completa">
          <Esqueleto ancho="8rem" alto="1.1rem" />
          <Esqueleto alto="5rem" className="panel-esq__bloque" />
        </div>
      </div>
    </div>
  )
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
  // El color sigue al producto (orden alfabetico fijo), no a su lugar en el ranking del dia.
  const ordenProductos = [...(dashboard?.existencias ?? [])].map((e) => e.nombre).sort()
  const top = dashboard?.productos_top ?? []
  const directos = top.length > COLORES_PRODUCTO.length ? COLORES_PRODUCTO.length - 1 : top.length
  const rebanadas = [
    ...top.slice(0, directos).map((p) => ({
      clave: p.nombre,
      nombre: p.nombre,
      valor: p.ingresos,
      color: COLORES_PRODUCTO[Math.max(ordenProductos.indexOf(p.nombre), 0) % COLORES_PRODUCTO.length],
    })),
    ...(top.length > directos
      ? [{ clave: 'otros', nombre: 'Otros', valor: top.slice(directos).reduce((s, p) => s + p.ingresos, 0), color: '#8c9488' }]
      : []),
  ]

  const sinVentas = esHoy ? 'Todavía no hay ventas hoy' : 'No hubo ventas ese día'
  const diaComparado = resumen ? formatDia(resumen.comparacion.fecha, { weekday: 'long' }) : ''
  const semana = dashboard?.semana ?? []
  const pagos = resumen
    ? [
        { nombre: 'Efectivo', clase: 'is-efectivo', monto: resumen.efectivo },
        { nombre: 'Tarjeta', clase: 'is-tarjeta', monto: resumen.tarjeta },
      ]
    : []
  const urgentes = dashboard?.pendientes.filter((p) => p.severidad === 'urgente').length ?? 0

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
            {!esHoy && (
              <button type="button" className="panel-fecha__hoy" onClick={() => setFechaSeleccionada(hoyMexicoISO())}>
                Ir a hoy
              </button>
            )}
            <div className="panel-fecha__grupo">
              <button
                type="button"
                className="panel-fecha__boton"
                onClick={() => setFechaSeleccionada((f) => sumarDias(f, -1))}
                aria-label="Día anterior"
              >
                <Icono nombre="anterior" />
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
                <Icono nombre="siguiente" />
              </button>
            </div>
          </div>
        </header>

        {error && (
          <p className="panel-error" role="alert">
            <Icono nombre="alerta" />
            {error}
          </p>
        )}
        {cargando && !dashboard && <PanelEsqueleto />}

        {dashboard && resumen && (
          <div className={`panel-cuerpo ${cargando ? 'is-cargando' : ''}`} aria-busy={cargando}>
            <section className="kpis" aria-label="Cifras del día">
              <Kpi
                indice={0}
                etiqueta="Ventas netas"
                valor={resumen.ventas_netas}
                formato={(v) => formatMoney(Math.round(v * 100) / 100)}
                cambio={cambio}
                serie={semana.map((d) => d.ventas)}
                seriePeriodo="7 días"
                nota={
                  cambio === null
                    ? `Sin ventas el ${diaComparado} pasado para comparar`
                    : `Contra el ${diaComparado} pasado (${formatMoney(anterior)})`
                }
              />
              <Kpi
                indice={1}
                etiqueta="Tickets"
                valor={resumen.tickets}
                formato={(v) => String(Math.round(v))}
                serie={semana.map((d) => d.tickets)}
                seriePeriodo="7 días"
                nota={
                  resumen.devoluciones_dia > 0
                    ? `${plural(resumen.paquetes, 'paquete', 'paquetes')}, ya sin ${formatMoney(resumen.devoluciones_dia)} devueltos`
                    : `${plural(resumen.paquetes, 'paquete vendido', 'paquetes vendidos')}, sin devoluciones`
                }
              />
              <Kpi
                indice={2}
                etiqueta="Ticket promedio"
                valor={resumen.ticket_promedio}
                formato={(v) => formatMoney(Math.round(v * 100) / 100)}
                serie={semana.map((d) => (d.tickets > 0 ? d.ventas / d.tickets : 0))}
                seriePeriodo="7 días"
                nota={
                  resumen.tickets > 0
                    ? `${(resumen.paquetes / resumen.tickets).toFixed(1)} paquetes por ticket`
                    : 'Sin tickets para promediar'
                }
              />
              <Kpi
                indice={3}
                etiqueta="Utilidad bruta estimada"
                valor={resumen.utilidad_estimada}
                formato={(v) => formatMoney(Math.round(v * 100) / 100)}
                avance={margen}
                nota={
                  margen === null
                    ? resumen.tickets === 0
                      ? 'Se calcula con las recetas y el costo de los insumos'
                      : 'Falta la receta o el costo de algún producto vendido'
                    : `Margen de ${margen.toFixed(0)}% sobre la venta sin IVA`
                }
              />
            </section>

            <div className="panel-rejilla">
              <section className="tarjeta tarjeta--ancha entra" style={{ '--i': 4 } as CSSProperties}>
                <h2 className="tarjeta__titulo">Ventas por hora</h2>
                <GraficaArea
                  key={fechaSeleccionada}
                  descripcion="Ventas por hora del día"
                  formatear={formatMoney}
                  vacio={`${sinVentas}.`}
                  puntos={dashboard.ventas_por_hora.map((h, indice) => ({
                    clave: String(h.hora),
                    eje: dashboard.ventas_por_hora.length > 10 && indice % 2 === 1 ? '' : formatHora(h.hora),
                    titulo: `${formatHora(h.hora)} a ${formatHora(h.hora + 1)}`,
                    detalle: [formatMoney(h.ventas), plural(h.tickets, 'ticket', 'tickets')],
                    valor: h.ventas,
                  }))}
                />
              </section>

              <section className="tarjeta entra" style={{ '--i': 5 } as CSSProperties}>
                <h2 className="tarjeta__titulo">Ingreso por producto</h2>
                <GraficaDona
                  key={fechaSeleccionada}
                  descripcion="Ingreso del día repartido por producto"
                  etiquetaTotal="sin IVA"
                  formatear={formatMoney}
                  vacio={`${sinVentas}.`}
                  rebanadas={rebanadas}
                />
              </section>

              <section className="tarjeta tarjeta--ancha entra" style={{ '--i': 6 } as CSSProperties}>
                <div className="tarjeta__cabeza">
                  <div>
                    <h2 className="tarjeta__titulo">Últimos 7 días</h2>
                    <p className="tarjeta__sub">Elige una barra para ver ese día</p>
                  </div>
                </div>
                <GraficaBarras
                  descripcion="Ventas de los últimos 7 días; elige una barra para ver ese día"
                  formatear={formatMoney}
                  vacio="Sin ventas en estos 7 días."
                  puntos={semana.map((d) => ({
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

              <section className="tarjeta entra" style={{ '--i': 7 } as CSSProperties}>
                <h2 className="tarjeta__titulo">Cómo pagaron</h2>
                {cobrado <= 0 ? (
                  <EstadoVacio compacto icono="corte" titulo="Sin cobros registrados" />
                ) : (
                  <>
                    <span className="reparto" aria-hidden="true">
                      {pagos
                        .filter((pago) => pago.monto > 0)
                        .map((pago) => (
                          <span key={pago.nombre} className={pago.clase} style={{ flexGrow: pago.monto }} />
                        ))}
                    </span>
                    <ul className="pagos">
                      {pagos.map((pago) => (
                        <li key={pago.nombre}>
                          <span className={`pagos__color ${pago.clase}`} aria-hidden="true" />
                          <span className="pagos__nombre">{pago.nombre}</span>
                          <span className="pagos__parte">{((pago.monto / cobrado) * 100).toFixed(0)}%</span>
                          <span className="pagos__monto">{formatMoney(pago.monto)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
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

              <section className="tarjeta tarjeta--ancha entra" style={{ '--i': 8 } as CSSProperties}>
                <div className="tarjeta__cabeza">
                  <h2 className="tarjeta__titulo">Lo más vendido</h2>
                  <button type="button" className="tarjeta__enlace" onClick={onReportes}>
                    Ver reportes <Icono nombre="siguiente" />
                  </button>
                </div>
                {top.length === 0 ? (
                  <EstadoVacio compacto icono="venta" titulo={sinVentas}>
                    Aquí verás los productos que más se llevan.
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
                      {top.slice(0, 5).map((producto) => (
                        <tr key={producto.nombre}>
                          <td>
                            <span className="tabla__producto">
                              <Tostadas nombre={producto.nombre} className="tabla__foto" />
                              {producto.nombre}
                            </span>
                          </td>
                          <td className="tabla__col-barra">
                            <span className="tabla__barra" aria-hidden="true">
                              <span style={{ width: `${(producto.ingresos / Math.max(top[0].ingresos, 0.01)) * 100}%` }} />
                            </span>
                          </td>
                          <td className="es-numero">{producto.cantidad}</td>
                          <td className="es-numero es-fuerte">{formatMoney(producto.ingresos)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>

              <section className="tarjeta entra" style={{ '--i': 9 } as CSSProperties}>
                <div className="tarjeta__cabeza">
                  <h2 className="tarjeta__titulo">Pendientes</h2>
                  {urgentes > 0 && <span className="estado is-alerta">{plural(urgentes, 'urgente', 'urgentes')}</span>}
                </div>
                {dashboard.pendientes.length === 0 ? (
                  <EstadoVacio compacto icono="palomita" titulo="Todo en orden">
                    No hay pendientes por ahora.
                  </EstadoVacio>
                ) : (
                  <ul className="pendientes__lista">
                    {dashboard.pendientes.map((pendiente, index) => (
                      <li key={index} className={`pendiente is-${pendiente.severidad}`}>
                        <span className="pendiente__icono" aria-hidden="true">
                          <Icono nombre={pendiente.severidad === 'urgente' ? 'alerta' : 'reloj'} />
                        </span>
                        <span>
                          <span className="pendiente__tipo">{pendiente.severidad === 'urgente' ? 'Urgente' : 'Aviso'}</span>
                          {pendiente.texto}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="tarjeta tarjeta--completa" aria-label="Libro de turnos">
                <h2 className="tarjeta__titulo">Turnos del día</h2>
                {dashboard.turnos.length === 0 ? (
                  <EstadoVacio compacto icono="reloj" titulo={esHoy ? 'Todavía no hay turnos hoy' : 'No hubo turnos ese día'}>
                    Los turnos aparecen aquí cuando un cajero abre caja.
                  </EstadoVacio>
                ) : (
                  <>
                    <div className="libro__cabecera" aria-hidden="true">
                      <span>Cajero</span>
                      <span>Horario</span>
                      <span>Estado</span>
                      <span className="es-numero">Ventas</span>
                      <span>Corte</span>
                      <span />
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
                              <span className="fila__celda fila__celda--hora" data-label="Horario">
                                {turno.hora_inicio.slice(0, 5)}
                                {turno.hora_fin ? ` a ${turno.hora_fin.slice(0, 5)}` : ' (en curso)'}
                              </span>
                              <span className="fila__celda" data-label="Estado">
                                <span className={`estado ${turno.estado === 'abierto' ? 'is-bien' : 'is-neutro'}`}>
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
                              <span className="fila__ir" aria-hidden="true">
                                <Icono nombre="siguiente" />
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </>
                )}
              </section>

              <section className="tarjeta tarjeta--completa">
                <div className="tarjeta__cabeza">
                  <div>
                    <h2 className="tarjeta__titulo">Para cuántos días alcanza lo que hay</h2>
                    <p className="tarjeta__sub">Existencia actual entre la venta diaria promedio de los últimos 7 días</p>
                  </div>
                  <button type="button" className="tarjeta__enlace" onClick={onInventario}>
                    Ir a inventario <Icono nombre="siguiente" />
                  </button>
                </div>
                {dashboard.existencias.length === 0 ? (
                  <EstadoVacio compacto icono="inventario" titulo="No hay productos activos" />
                ) : (
                  <ul className="existencias">
                    {dashboard.existencias.map((e) => {
                      const nivel =
                        e.stock <= 0 || (e.dias_restantes !== null && e.dias_restantes < 2)
                          ? 'critico'
                          : e.stock < e.stock_minimo || (e.dias_restantes !== null && e.dias_restantes < 5)
                            ? 'bajo'
                            : 'bien'
                      const cobertura =
                        e.stock <= 0 ? 0 : e.dias_restantes === null ? 100 : Math.min((e.dias_restantes / DIAS_TOPE) * 100, 100)
                      return (
                        <li key={e.nombre} className={`existencia is-${nivel}`}>
                          <span className="existencia__nombre">{e.nombre}</span>
                          <span className="existencia__medidor" aria-hidden="true">
                            <span style={{ width: `${Math.max(cobertura, e.stock > 0 ? 3 : 0)}%` }} />
                          </span>
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
                            {e.venta_diaria > 0 ? ` · ${e.venta_diaria} al día` : ''}
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

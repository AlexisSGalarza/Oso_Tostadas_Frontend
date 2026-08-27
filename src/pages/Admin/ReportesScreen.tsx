import TopBar from '../../components/TopBar'
import { formatClock, formatMoney } from '../../lib/format'
import './ReportesScreen.css'

const SEMANA = [
  { dia: 'Lun', fecha: '17 ago', ventas: 3120, tickets: 74 },
  { dia: 'Mar', fecha: '18 ago', ventas: 2870, tickets: 68 },
  { dia: 'Mié', fecha: '19 ago', ventas: 3450, tickets: 81 },
  { dia: 'Jue', fecha: '20 ago', ventas: 3980, tickets: 89 },
  { dia: 'Vie', fecha: '21 ago', ventas: 5210, tickets: 112 },
  { dia: 'Sáb', fecha: '22 ago', ventas: 6340, tickets: 138 },
  { dia: 'Dom', fecha: '23 ago', ventas: 4580, tickets: 96 },
]

const PRODUCTOS = [
  { nombre: 'Paquete mediano (20 pzas)', cantidad: 214, ingresos: 9630 },
  { nombre: 'Paquete chico (10 pzas)', cantidad: 186, ingresos: 4650 },
  { nombre: 'Paquete grande (50 pzas)', cantidad: 97, ingresos: 9700 },
  { nombre: 'Paquete familiar (100 pzas)', cantidad: 34, ingresos: 6120 },
]

type Props = {
  now: Date
  onVolver: () => void
  onCerrarSesion: () => void
}

function ReportesScreen({ now, onVolver, onCerrarSesion }: Props) {
  const ventasSemana = SEMANA.reduce((suma, dia) => suma + dia.ventas, 0)
  const ticketsSemana = SEMANA.reduce((suma, dia) => suma + dia.tickets, 0)
  const ticketPromedio = ventasSemana / ticketsSemana
  const mejorDia = SEMANA.reduce((mejor, dia) => (dia.ventas > mejor.ventas ? dia : mejor), SEMANA[0])
  const maxVentas = Math.max(...SEMANA.map((dia) => dia.ventas))
  const maxIngresos = Math.max(...PRODUCTOS.map((producto) => producto.ingresos))

  return (
    <div className="reportes">
      <TopBar clock={formatClock(now)} onVolver={onVolver} volverLabel="Admin" onCerrarSesion={onCerrarSesion} />

      <main className="reportes__main">
        <h1>Reportes de ventas</h1>
        <p className="reportes__subtitulo">Últimos 7 días · Sucursal Centro</p>

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
              {SEMANA.map((dia) => (
                <li className="barra" key={dia.dia}>
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
            <ul className="producto-lista">
              {PRODUCTOS.map((producto) => (
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
          </section>
        </div>
      </main>
    </div>
  )
}

export default ReportesScreen

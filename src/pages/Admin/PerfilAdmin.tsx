import TopBar from '../../components/TopBar'
import { formatClock, formatMoney } from '../../lib/format'
import type { Pendiente, TurnoResumen } from './types'
import './PerfilAdmin.css'

const TURNOS: TurnoResumen[] = [
  {
    id: 't1',
    cajero: 'María Duarte',
    caja: 'Caja 01',
    jornada: 'Matutino',
    estado: 'cerrado',
    horario: '08:00–14:00',
    ventas: 2760,
    corte: 'cuadrada',
  },
  {
    id: 't2',
    cajero: 'Luis Peña',
    caja: 'Caja 01',
    jornada: 'Vespertino',
    estado: 'abierto',
    horario: 'Desde 14:05',
    ventas: 1820,
    corte: 'en curso',
  },
  {
    id: 't3',
    cajero: 'Rosa Elizalde',
    caja: 'Caja 02',
    jornada: 'Matutino',
    estado: 'cerrado',
    horario: '08:15–13:50',
    ventas: 1980,
    corte: 'faltante',
    diferencia: 45,
  },
  {
    id: 't4',
    cajero: 'Iván Cortés',
    caja: 'Caja 02',
    jornada: 'Vespertino',
    estado: 'cerrado',
    horario: '14:00–20:00',
    ventas: 1340,
    corte: 'pendiente',
  },
]

const PENDIENTES: Pendiente[] = [
  { id: 1, severidad: 'urgente', texto: 'Caja 02 — Rosa: faltante de $45.00 en el corte de su turno matutino.' },
  { id: 2, severidad: 'aviso', texto: 'Caja 02 — Iván: turno vespertino cerrado sin corte capturado.' },
  { id: 3, severidad: 'urgente', texto: 'Insumo: bolsas para paquete grande agotadas — pedido urgente con Empaques Monarca.' },
  { id: 4, severidad: 'aviso', texto: 'Producto: paquete grande con solo 22 unidades en existencia (mínimo 60).' },
  { id: 5, severidad: 'info', texto: 'Insumo: masa de maíz nixtamalizada por debajo del mínimo (18/25 kg).' },
]

const CORTE_LABEL: Record<TurnoResumen['corte'], string> = {
  'en curso': 'Turno en curso',
  cuadrada: 'Caja cuadrada',
  pendiente: 'Corte pendiente',
  faltante: 'Faltante',
}

type Props = {
  now: Date
  onCerrarSesion: () => void
  onUsuarios: () => void
  onReportes: () => void
  onInventario: () => void
  onProveedores: () => void
  onConfiguracion: () => void
}

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function PerfilAdmin({
  now,
  onCerrarSesion,
  onUsuarios,
  onReportes,
  onInventario,
  onProveedores,
  onConfiguracion,
}: Props) {
  const ventasHoy = TURNOS.reduce((suma, turno) => suma + turno.ventas, 0)
  const turnosActivos = TURNOS.filter((turno) => turno.estado === 'abierto').length
  const cortesPorRevisar = TURNOS.filter((turno) => turno.estado === 'cerrado' && turno.corte !== 'cuadrada').length
  const fecha = capitalizar(now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }))

  const acciones = [
    { label: 'Gestionar usuarios', onClick: onUsuarios },
    { label: 'Ver reportes de ventas', onClick: onReportes },
    { label: 'Inventario', onClick: onInventario },
    { label: 'Proveedores', onClick: onProveedores },
    { label: 'Configuración', onClick: onConfiguracion },
  ]

  return (
    <div className="admin">
      <TopBar clock={formatClock(now)} sucursal="Sucursal Centro" onCerrarSesion={onCerrarSesion} />

      <main className="admin__main">
        <section className="saludo saludo--admin">
          <div>
            <h1>Hola, Ana</h1>
            <p className="saludo__rol">Administradora · Sucursal Centro</p>
          </div>
          <p className="saludo__fecha">{fecha}</p>
        </section>

        <section className="resumen" aria-label="Resumen del día">
          <div className="resumen__item resumen__item--principal">
            <span className="resumen__valor">{formatMoney(ventasHoy)}</span>
            <span className="resumen__etiqueta">Ventas de hoy</span>
          </div>
          <div className="resumen__item">
            <span className="resumen__valor">{turnosActivos}</span>
            <span className="resumen__etiqueta">Turnos activos</span>
          </div>
          <div className="resumen__item">
            <span className="resumen__valor">{cortesPorRevisar}</span>
            <span className="resumen__etiqueta">Cortes por revisar</span>
          </div>
        </section>

        <div className="paneles-admin">
          <section className="libro" aria-label="Libro de turnos">
            <h2 className="libro__titulo">Libro de turnos</h2>

            <div className="libro__cabecera" aria-hidden="true">
              <span>Cajero</span>
              <span>Caja</span>
              <span>Turno</span>
              <span>Ventas</span>
              <span>Corte</span>
            </div>

            <ul className="libro__filas">
              {TURNOS.map((turno) => (
                <li className="fila" key={turno.id}>
                  <span className="fila__celda fila__celda--nombre" data-label="Cajero">
                    {turno.cajero}
                  </span>
                  <span className="fila__celda" data-label="Caja">
                    {turno.caja}
                  </span>
                  <span className="fila__celda" data-label="Turno">
                    <span className={`fila__estado ${turno.estado === 'abierto' ? 'is-abierto' : 'is-cerrado'}`}>
                      {turno.jornada} · {turno.horario}
                    </span>
                  </span>
                  <span className="fila__celda fila__celda--num" data-label="Ventas">
                    {formatMoney(turno.ventas)}
                  </span>
                  <span
                    className={`fila__celda fila__celda--corte is-${turno.corte.replace(' ', '-')}`}
                    data-label="Corte"
                  >
                    {turno.corte === 'faltante' && turno.diferencia
                      ? `Faltante de ${formatMoney(turno.diferencia)}`
                      : CORTE_LABEL[turno.corte]}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <div className="lateral">
            <section className="pendientes" aria-label="Pendientes">
              <h2 className="lateral__titulo">Pendientes</h2>
              <ul className="pendientes__lista">
                {PENDIENTES.map((pendiente) => (
                  <li key={pendiente.id} className={`pendiente is-${pendiente.severidad}`}>
                    {pendiente.texto}
                  </li>
                ))}
              </ul>
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
      </main>
    </div>
  )
}

export default PerfilAdmin

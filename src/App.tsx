import { useEffect, useState } from 'react'
import LoginPage from './pages/Login/LoginPage'
import PerfilVendedor from './pages/Vendedor/PerfilVendedor'
import VentaScreen from './pages/Vendedor/VentaScreen'
import HistorialScreen from './pages/Vendedor/HistorialScreen'
import CorteScreen from './pages/Vendedor/CorteScreen'
import DevolucionScreen from './pages/Vendedor/DevolucionScreen'
import PerfilAdmin from './pages/Admin/PerfilAdmin'
import UsuariosScreen from './pages/Admin/UsuariosScreen'
import ReportesScreen from './pages/Admin/ReportesScreen'
import InventarioScreen from './pages/Admin/InventarioScreen'
import ProveedoresScreen from './pages/Admin/ProveedoresScreen'
import ConfiguracionScreen from './pages/Admin/ConfiguracionScreen'
import AuditoriaScreen from './pages/Admin/AuditoriaScreen'
import AdminTurnoDetalleScreen from './pages/Admin/AdminTurnoDetalleScreen'
import AppShell, { type ItemMenu } from './components/AppShell'
import type { Devolucion, MetodoPago, Venta } from './pages/Vendedor/types'
import { api, ApiError, getAccessToken, type EmpleadoMe, type Turno, type VentaApi } from './lib/api'

type Screen =
  | 'login'
  | 'perfil'
  | 'venta'
  | 'historial'
  | 'corte'
  | 'devolucion'
  | 'perfil-admin'
  | 'usuarios'
  | 'reportes'
  | 'inventario'
  | 'proveedores'
  | 'configuracion'
  | 'auditoria'
  | 'turno-detalle'

const BASE_TICKET = 428

const MENU_ADMIN: ItemMenu[] = [
  { id: 'perfil-admin', etiqueta: 'Panel', icono: 'inicio' },
  { id: 'reportes', etiqueta: 'Reportes', icono: 'reportes' },
  { id: 'inventario', etiqueta: 'Inventario', icono: 'inventario' },
  { id: 'proveedores', etiqueta: 'Proveedores', icono: 'proveedores' },
  { id: 'usuarios', etiqueta: 'Usuarios', icono: 'usuarios' },
  { id: 'auditoria', etiqueta: 'Auditoría', icono: 'auditoria' },
  { id: 'configuracion', etiqueta: 'Configuración', icono: 'configuracion' },
]

// El detalle de un turno se abre desde el panel, asi que en el menu sigue marcado "Panel".
const SECCION_DE: Partial<Record<Screen, Screen>> = { 'turno-detalle': 'perfil-admin' }
const ROLES_VENDEDOR = ['vendedor', 'cajero']

// Reconstruye una Venta (para Historial/Corte) a partir de lo que ya quedo guardado
// en el servidor; se usa al recuperar un turno abierto en un relogin.
function mapVentaApi(v: VentaApi): Venta {
  const pago = v.pagos[0]
  const metodoPago: MetodoPago = pago?.metodo_pago === 'tarjeta' ? 'tarjeta' : 'efectivo'
  return {
    id: v.id_venta,
    idVenta: v.id_venta,
    hora: v.creado_en ? new Date(v.creado_en) : new Date(`${v.fecha}T00:00:00`),
    items: v.detalles.map((d) => ({
      id_producto: d.id_producto,
      nombre: d.producto,
      precio: d.precio_unitario,
      cantidad: d.unidades,
    })),
    total: v.total,
    metodoPago,
  }
}

function mapDevolucionesDeVenta(v: VentaApi): Devolucion[] {
  const metodoPago: MetodoPago = v.pagos[0]?.metodo_pago === 'tarjeta' ? 'tarjeta' : 'efectivo'
  return v.devoluciones.map((d) => ({
    id: d.id_devolucion,
    ventaId: v.id_venta,
    hora: d.creado_en ? new Date(d.creado_en) : new Date(`${d.fecha}T00:00:00`),
    items: d.detalles.map((det) => ({
      id_producto: det.id_producto,
      nombre: det.producto,
      precio: v.detalles.find((dv) => dv.id_producto === det.id_producto)?.precio_unitario ?? 0,
      cantidad: det.cantidad,
    })),
    total: d.monto,
    metodoPago,
  }))
}

function App() {
  const [screen, setScreen] = useState<Screen>('login')
  const [now, setNow] = useState(() => new Date())
  const [empleado, setEmpleado] = useState<EmpleadoMe | null>(null)
  const [turno, setTurno] = useState<Turno | null>(null)
  const [turnoError, setTurnoError] = useState('')
  const [ventas, setVentas] = useState<Venta[]>([])
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([])
  const [idTurnoSeleccionado, setIdTurnoSeleccionado] = useState<number | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!getAccessToken()) return
    api
      .me()
      .then(async (datos) => {
        setEmpleado(datos)
        setScreen(ROLES_VENDEDOR.includes(datos.rol.toLowerCase()) ? 'perfil' : 'perfil-admin')
        await recuperarTurnoYVentas()
      })
      .catch(() => api.logout())
  }, [])

  async function recuperarTurnoYVentas() {
    const turnoActual = await api.turnoActual()
    setTurno(turnoActual)
    if (!turnoActual) {
      setVentas([])
      setDevoluciones([])
      return
    }
    const ventasApi = await api.listarVentasTurno()
    setVentas(ventasApi.map(mapVentaApi))
    setDevoluciones(ventasApi.flatMap(mapDevolucionesDeVenta))
  }

  const siguienteTicket = BASE_TICKET + ventas.length + devoluciones.length + 1

  function registrarVenta(venta: Venta) {
    setVentas((actual) => [...actual, venta])
  }

  function registrarDevolucion(devolucion: Devolucion) {
    setDevoluciones((actual) => [...actual, devolucion])
  }

  async function handleIniciarSesion(datosEmpleado: EmpleadoMe) {
    setEmpleado(datosEmpleado)
    setScreen(ROLES_VENDEDOR.includes(datosEmpleado.rol.toLowerCase()) ? 'perfil' : 'perfil-admin')
    // si la sesion anterior se cerro sin cerrar turno, lo recuperamos junto con su historial
    // en vez de bloquear "Iniciar turno" y perder las ventas ya registradas
    await recuperarTurnoYVentas()
  }

  function handleCerrarSesion() {
    api.logout()
    setEmpleado(null)
    setTurno(null)
    setTurnoError('')
    setVentas([])
    setDevoluciones([])
    setScreen('login')
  }

  async function abrirTurno(montoInicial: number) {
    setTurnoError('')
    try {
      const nuevoTurno = await api.abrirTurno(montoInicial)
      setTurno(nuevoTurno)
      setVentas([])
      setDevoluciones([])
    } catch (err) {
      setTurnoError(err instanceof ApiError ? err.message : 'No se pudo abrir el turno.')
    }
  }

  function turnoCerrado() {
    setTurno(null)
    setVentas([])
    setDevoluciones([])
    setScreen('perfil')
  }

  if (screen === 'login' || !empleado) {
    return <LoginPage onIniciarSesion={handleIniciarSesion} />
  }

  const esVendedor = ROLES_VENDEDOR.includes(empleado.rol.toLowerCase())
  const sinTurno = turno === null
  const menu: ItemMenu[] = esVendedor
    ? [
        { id: 'perfil', etiqueta: 'Mi turno', icono: 'inicio' },
        { id: 'venta', etiqueta: 'Nueva venta', icono: 'venta', deshabilitado: sinTurno, motivo: 'Abre tu turno primero' },
        { id: 'historial', etiqueta: 'Historial', icono: 'historial', deshabilitado: sinTurno, motivo: 'Abre tu turno primero' },
        { id: 'devolucion', etiqueta: 'Devoluciones', icono: 'devolucion', deshabilitado: sinTurno, motivo: 'Abre tu turno primero' },
        { id: 'corte', etiqueta: 'Corte de caja', icono: 'corte', deshabilitado: sinTurno, motivo: 'Abre tu turno primero' },
      ]
    : MENU_ADMIN

  const comunes = { now, onCerrarSesion: handleCerrarSesion }
  const volverAdmin = () => setScreen('perfil-admin')
  const volverPerfil = () => setScreen('perfil')

  function pantalla() {
    if (!empleado) return null
    switch (screen) {
      case 'perfil-admin':
        return (
          <PerfilAdmin
            {...comunes}
            empleado={empleado}
            onUsuarios={() => setScreen('usuarios')}
            onReportes={() => setScreen('reportes')}
            onInventario={() => setScreen('inventario')}
            onProveedores={() => setScreen('proveedores')}
            onConfiguracion={() => setScreen('configuracion')}
            onAuditoria={() => setScreen('auditoria')}
            onVerTurno={(idTurno) => {
              setIdTurnoSeleccionado(idTurno)
              setScreen('turno-detalle')
            }}
          />
        )
      case 'usuarios':
        return <UsuariosScreen {...comunes} onVolver={volverAdmin} />
      case 'reportes':
        return <ReportesScreen {...comunes} onVolver={volverAdmin} />
      case 'inventario':
        return <InventarioScreen {...comunes} onVolver={volverAdmin} />
      case 'proveedores':
        return <ProveedoresScreen {...comunes} onVolver={volverAdmin} />
      case 'configuracion':
        return <ConfiguracionScreen {...comunes} onVolver={volverAdmin} />
      case 'auditoria':
        return <AuditoriaScreen {...comunes} onVolver={volverAdmin} />
      case 'turno-detalle':
        if (idTurnoSeleccionado === null) break
        return <AdminTurnoDetalleScreen {...comunes} idTurno={idTurnoSeleccionado} onVolver={volverAdmin} />
      case 'venta':
        if (!turno) break
        return (
          <VentaScreen
            {...comunes}
            turno={turno}
            ventasTurno={ventas}
            devolucionesTurno={devoluciones}
            siguienteTicket={siguienteTicket}
            onVolver={volverPerfil}
            onRegistrarVenta={registrarVenta}
          />
        )
      case 'historial':
        return (
          <HistorialScreen
            {...comunes}
            ventas={ventas}
            devoluciones={devoluciones}
            onVolver={volverPerfil}
            onNuevaVenta={() => setScreen('venta')}
          />
        )
      case 'corte':
        if (!turno) break
        return (
          <CorteScreen
            {...comunes}
            turno={turno}
            ventas={ventas}
            devoluciones={devoluciones}
            onVolver={volverPerfil}
            onConfirmarCorte={turnoCerrado}
          />
        )
      case 'devolucion':
        return (
          <DevolucionScreen
            {...comunes}
            ventas={ventas}
            devoluciones={devoluciones}
            onVolver={volverPerfil}
            onRegistrarDevolucion={registrarDevolucion}
          />
        )
    }
    return (
      <PerfilVendedor
        {...comunes}
        empleado={empleado}
        turno={turno}
        turnoError={turnoError}
        ventas={ventas}
        devoluciones={devoluciones}
        onAbrirTurno={abrirTurno}
        onCerrarTurno={() => setScreen('corte')}
        onNuevaVenta={() => setScreen('venta')}
        onHistorial={() => setScreen('historial')}
        onCorte={() => setScreen('corte')}
        onDevolucion={() => setScreen('devolucion')}
      />
    )
  }

  return (
    <AppShell
      items={menu}
      activo={SECCION_DE[screen] ?? screen}
      nombre={empleado.nombre}
      rol={empleado.rol}
      sucursal={empleado.sucursal}
      onNavegar={(id) => setScreen(id as Screen)}
      onCerrarSesion={handleCerrarSesion}
    >
      {pantalla()}
    </AppShell>
  )
}

export default App

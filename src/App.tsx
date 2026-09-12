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

const BASE_TICKET = 428
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

  if (screen === 'login') {
    return <LoginPage onIniciarSesion={handleIniciarSesion} />
  }

  if (screen === 'perfil-admin') {
    return (
      <PerfilAdmin
        now={now}
        onCerrarSesion={handleCerrarSesion}
        onUsuarios={() => setScreen('usuarios')}
        onReportes={() => setScreen('reportes')}
        onInventario={() => setScreen('inventario')}
        onProveedores={() => setScreen('proveedores')}
        onConfiguracion={() => setScreen('configuracion')}
      />
    )
  }

  if (screen === 'usuarios') {
    return (
      <UsuariosScreen now={now} onVolver={() => setScreen('perfil-admin')} onCerrarSesion={handleCerrarSesion} />
    )
  }

  if (screen === 'reportes') {
    return (
      <ReportesScreen now={now} onVolver={() => setScreen('perfil-admin')} onCerrarSesion={handleCerrarSesion} />
    )
  }

  if (screen === 'inventario') {
    return (
      <InventarioScreen now={now} onVolver={() => setScreen('perfil-admin')} onCerrarSesion={handleCerrarSesion} />
    )
  }

  if (screen === 'proveedores') {
    return (
      <ProveedoresScreen now={now} onVolver={() => setScreen('perfil-admin')} onCerrarSesion={handleCerrarSesion} />
    )
  }

  if (screen === 'configuracion') {
    return (
      <ConfiguracionScreen now={now} onVolver={() => setScreen('perfil-admin')} onCerrarSesion={handleCerrarSesion} />
    )
  }

  if (screen === 'venta' && empleado && turno) {
    return (
      <VentaScreen
        now={now}
        turno={turno}
        ventasTurno={ventas}
        devolucionesTurno={devoluciones}
        siguienteTicket={siguienteTicket}
        onVolver={() => setScreen('perfil')}
        onCerrarSesion={handleCerrarSesion}
        onRegistrarVenta={registrarVenta}
      />
    )
  }

  if (screen === 'historial') {
    return (
      <HistorialScreen
        now={now}
        ventas={ventas}
        devoluciones={devoluciones}
        onVolver={() => setScreen('perfil')}
        onCerrarSesion={handleCerrarSesion}
        onNuevaVenta={() => setScreen('venta')}
      />
    )
  }

  if (screen === 'corte' && turno) {
    return (
      <CorteScreen
        now={now}
        turno={turno}
        ventas={ventas}
        devoluciones={devoluciones}
        onVolver={() => setScreen('perfil')}
        onCerrarSesion={handleCerrarSesion}
        onConfirmarCorte={turnoCerrado}
      />
    )
  }

  if (screen === 'devolucion') {
    return (
      <DevolucionScreen
        now={now}
        ventas={ventas}
        devoluciones={devoluciones}
        onVolver={() => setScreen('perfil')}
        onCerrarSesion={handleCerrarSesion}
        onRegistrarDevolucion={registrarDevolucion}
      />
    )
  }

  if (!empleado) {
    return <LoginPage onIniciarSesion={handleIniciarSesion} />
  }

  return (
    <PerfilVendedor
      now={now}
      empleado={empleado}
      turno={turno}
      turnoError={turnoError}
      ventas={ventas}
      devoluciones={devoluciones}
      onAbrirTurno={abrirTurno}
      onCerrarTurno={() => setScreen('corte')}
      onCerrarSesion={handleCerrarSesion}
      onNuevaVenta={() => setScreen('venta')}
      onHistorial={() => setScreen('historial')}
      onCorte={() => setScreen('corte')}
      onDevolucion={() => setScreen('devolucion')}
    />
  )
}

export default App

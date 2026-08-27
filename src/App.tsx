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
import type { Devolucion, Venta } from './pages/Vendedor/types'

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

function App() {
  const [screen, setScreen] = useState<Screen>('login')
  const [now, setNow] = useState(() => new Date())
  const [turnoInicio, setTurnoInicio] = useState<Date | null>(null)
  const [ventas, setVentas] = useState<Venta[]>([])
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const siguienteTicket = BASE_TICKET + ventas.length + devoluciones.length + 1

  function registrarVenta(venta: Venta) {
    setVentas((actual) => [...actual, venta])
  }

  function registrarDevolucion(devolucion: Devolucion) {
    setDevoluciones((actual) => [...actual, devolucion])
  }

  function cerrarTurno() {
    setTurnoInicio(null)
    setVentas([])
    setDevoluciones([])
    setScreen('perfil')
  }

  if (screen === 'login') {
    return <LoginPage onIniciarSesion={(rol) => setScreen(rol === 'admin' ? 'perfil-admin' : 'perfil')} />
  }

  if (screen === 'perfil-admin') {
    return (
      <PerfilAdmin
        now={now}
        onCerrarSesion={() => setScreen('login')}
        onUsuarios={() => setScreen('usuarios')}
        onReportes={() => setScreen('reportes')}
        onInventario={() => setScreen('inventario')}
        onProveedores={() => setScreen('proveedores')}
        onConfiguracion={() => setScreen('configuracion')}
      />
    )
  }

  if (screen === 'usuarios') {
    return <UsuariosScreen now={now} onVolver={() => setScreen('perfil-admin')} onCerrarSesion={() => setScreen('login')} />
  }

  if (screen === 'reportes') {
    return <ReportesScreen now={now} onVolver={() => setScreen('perfil-admin')} onCerrarSesion={() => setScreen('login')} />
  }

  if (screen === 'inventario') {
    return <InventarioScreen now={now} onVolver={() => setScreen('perfil-admin')} onCerrarSesion={() => setScreen('login')} />
  }

  if (screen === 'proveedores') {
    return <ProveedoresScreen now={now} onVolver={() => setScreen('perfil-admin')} onCerrarSesion={() => setScreen('login')} />
  }

  if (screen === 'configuracion') {
    return (
      <ConfiguracionScreen now={now} onVolver={() => setScreen('perfil-admin')} onCerrarSesion={() => setScreen('login')} />
    )
  }

  if (screen === 'venta') {
    return (
      <VentaScreen
        now={now}
        siguienteTicket={siguienteTicket}
        onVolver={() => setScreen('perfil')}
        onCerrarSesion={() => setScreen('login')}
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
        onCerrarSesion={() => setScreen('login')}
        onNuevaVenta={() => setScreen('venta')}
      />
    )
  }

  if (screen === 'corte') {
    return (
      <CorteScreen
        now={now}
        ventas={ventas}
        devoluciones={devoluciones}
        onVolver={() => setScreen('perfil')}
        onCerrarSesion={() => setScreen('login')}
        onConfirmarCorte={cerrarTurno}
      />
    )
  }

  if (screen === 'devolucion') {
    return (
      <DevolucionScreen
        now={now}
        ventas={ventas}
        devoluciones={devoluciones}
        siguienteTicket={siguienteTicket}
        onVolver={() => setScreen('perfil')}
        onCerrarSesion={() => setScreen('login')}
        onRegistrarDevolucion={registrarDevolucion}
      />
    )
  }

  return (
    <PerfilVendedor
      now={now}
      turnoInicio={turnoInicio}
      ventas={ventas}
      devoluciones={devoluciones}
      onAbrirTurno={() => setTurnoInicio(new Date())}
      onCerrarTurno={cerrarTurno}
      onCerrarSesion={() => setScreen('login')}
      onNuevaVenta={() => setScreen('venta')}
      onHistorial={() => setScreen('historial')}
      onCorte={() => setScreen('corte')}
      onDevolucion={() => setScreen('devolucion')}
    />
  )
}

export default App

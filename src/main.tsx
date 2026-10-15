import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import FacturaClienteScreen from './pages/Cliente/FacturaClienteScreen'
import PortalCliente from './pages/Cliente/PortalCliente'
import { usarSesionDeCliente } from './lib/api'
import './styles/index.css'
import './styles/admin.css'
import './styles/resalte.css'

// El cliente llega a /factura desde el ticket impreso (QR o URL corta), sin
// pasar por el login del personal, asi que se resuelve por ruta antes del
// flujo interno del punto de venta.
const ruta = window.location.pathname
// /cliente es el portal con cuenta: el cliente solo ve sus tickets y sus facturas.
const esPortalCliente = ruta.startsWith('/cliente')
const esFacturaCliente = ruta.startsWith('/factura')
if (esPortalCliente) usarSesionDeCliente()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {esPortalCliente ? <PortalCliente /> : esFacturaCliente ? <FacturaClienteScreen /> : <App />}
  </React.StrictMode>,
)


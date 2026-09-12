import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import FacturaClienteScreen from './pages/Cliente/FacturaClienteScreen'
import './styles/index.css'

// El cliente llega a /factura desde el ticket impreso (QR o URL corta), sin
// pasar por el login del personal, asi que se resuelve por ruta antes del
// flujo interno del punto de venta.
const esFacturaCliente = window.location.pathname.startsWith('/factura')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{esFacturaCliente ? <FacturaClienteScreen /> : <App />}</React.StrictMode>,
)


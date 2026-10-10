import type { ReactNode } from 'react'

export type NombreIcono =
  | 'inicio'
  | 'venta'
  | 'historial'
  | 'devolucion'
  | 'corte'
  | 'reportes'
  | 'facturas'
  | 'inventario'
  | 'proveedores'
  | 'usuarios'
  | 'auditoria'
  | 'configuracion'
  | 'menu'
  | 'cerrar'
  | 'salir'
  | 'volver'
  | 'camara'
  | 'codigo'
  | 'buscar'
  | 'mas'
  | 'palomita'
  | 'flecha-sube'
  | 'flecha-baja'
  | 'anterior'
  | 'siguiente'
  | 'alerta'
  | 'reloj'

const TRAZOS: Record<NombreIcono, ReactNode> = {
  inicio: <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />,
  venta: (
    <>
      <path d="M4 5h2.2l1.9 9.2a1 1 0 0 0 1 .8h7.6a1 1 0 0 0 1-.8L19 8H7" />
      <circle cx="10" cy="19" r="1.3" />
      <circle cx="17" cy="19" r="1.3" />
    </>
  ),
  historial: (
    <>
      <path d="M6 3.5h12v17l-2.4-1.6-2.4 1.6-2.4-1.6-2.4 1.6L6 20.5z" />
      <path d="M9 8.5h6M9 12h6" />
    </>
  ),
  devolucion: (
    <>
      <path d="M8 7 4 11l4 4" />
      <path d="M4 11h10a5 5 0 0 1 0 10h-3" />
    </>
  ),
  corte: (
    <>
      <rect x="3.5" y="6.5" width="17" height="11" rx="1.5" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M6.5 9.5v5M17.5 9.5v5" />
    </>
  ),
  reportes: <path d="M4 20h16M7 20v-6M12 20V6M17 20v-9" />,
  facturas: (
    <>
      <path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z" />
      <path d="M14 3.5v4h4M9.5 12h5M9.5 15.5h5" />
    </>
  ),
  inventario: (
    <>
      <path d="m12 3.5 8 4v9l-8 4-8-4v-9z" />
      <path d="m4 7.5 8 4 8-4M12 11.5v9" />
    </>
  ),
  proveedores: (
    <>
      <path d="M3 7h10.5v9.5H3zM13.5 10.5H18l3 3v3h-7.5" />
      <circle cx="7" cy="17.5" r="1.7" />
      <circle cx="17" cy="17.5" r="1.7" />
    </>
  ),
  usuarios: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3 19.5c.6-3.2 3-5 6-5s5.4 1.8 6 5M16 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14.8c1.9.6 3.1 2.2 3.5 4.7" />
    </>
  ),
  auditoria: (
    <>
      <path d="M12 3.5 5 6v5.5c0 4.3 2.9 7.6 7 9 4.1-1.4 7-4.7 7-9V6z" />
      <path d="m9 12 2.2 2.2L15.2 10" />
    </>
  ),
  configuracion: (
    <>
      <path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="17" cy="17" r="2" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  cerrar: <path d="m6 6 12 12M18 6 6 18" />,
  salir: <path d="M14 4.5h4.5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H14M10 8l-4 4 4 4M6 12h9" />,
  volver: <path d="M19 12H5M11 6l-6 6 6 6" />,
  camara: (
    <>
      <path d="M4 8.5a1 1 0 0 1 1-1h2.5L9 5.5h6l1.5 2H19a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <circle cx="12" cy="13" r="3.2" />
    </>
  ),
  buscar: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  mas: <path d="M12 5v14M5 12h14" />,
  palomita: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  'flecha-sube': <path d="M7 17 17 7M9 7h8v8" />,
  'flecha-baja': <path d="M7 7l10 10M17 9v8H9" />,
  anterior: <path d="m14.5 6-6 6 6 6" />,
  siguiente: <path d="m9.5 6 6 6-6 6" />,
  alerta: <path d="M12 4.5 3.5 19h17zM12 10v4.5M12 16.8v.2" />,
  reloj: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  codigo: <path d="M4 6v12M7 6v12M10.5 6v12M13 6v12M16.5 6v12M20 6v12" />,
}

function Icono({ nombre, className }: { nombre: NombreIcono; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {TRAZOS[nombre]}
    </svg>
  )
}

export default Icono

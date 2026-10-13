import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import BearMark from './BearMark'
import ConfirmDialog from './ConfirmDialog'
import Icono, { type NombreIcono } from './Icono'
import './AppShell.css'

export type ItemMenu = {
  id: string
  etiqueta: string
  icono: NombreIcono
  deshabilitado?: boolean
  // Texto corto que explica por que no se puede entrar (por ejemplo, falta abrir turno).
  motivo?: string
}

type ShellContexto = {
  sucursal: string
  abrirMenu: () => void
}

const Contexto = createContext<ShellContexto | null>(null)

// Lo usa TopBar para saber si vive dentro del menu lateral.
export function useShell() {
  return useContext(Contexto)
}

type Props = {
  items: ItemMenu[]
  activo: string
  nombre: string
  rol: string
  sucursal: string
  onNavegar: (id: string) => void
  onCerrarSesion: () => void
  children: ReactNode
}

function AppShell({ items, activo, nombre, rol, sucursal, onNavegar, onCerrarSesion, children }: Props) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [confirmandoSalida, setConfirmandoSalida] = useState(false)

  useEffect(() => {
    if (!menuAbierto) return
    function alPresionar(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuAbierto(false)
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [menuAbierto])

  return (
    <Contexto.Provider value={{ sucursal, abrirMenu: () => setMenuAbierto(true) }}>
      <div className="shell">
        {menuAbierto && <div className="shell__velo" onClick={() => setMenuAbierto(false)} aria-hidden="true" />}

        <aside className={`menu ${menuAbierto ? 'is-abierto' : ''}`}>
          <div className="menu__marca">
            <BearMark className="menu__oso" />
            <span>Oso Tostadas</span>
            <button
              type="button"
              className="menu__cerrar"
              onClick={() => setMenuAbierto(false)}
              aria-label="Cerrar menú"
            >
              <Icono nombre="cerrar" />
            </button>
          </div>

          <nav className="menu__nav" aria-label="Secciones">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="menu__item"
                aria-current={item.id === activo ? 'page' : undefined}
                disabled={item.deshabilitado}
                title={item.deshabilitado ? item.motivo : undefined}
                onClick={() => {
                  setMenuAbierto(false)
                  onNavegar(item.id)
                }}
              >
                <Icono nombre={item.icono} />
                <span>{item.etiqueta}</span>
              </button>
            ))}
          </nav>

          <div className="menu__pie">
            <div className="menu__persona">
              <span className="menu__nombre">{nombre}</span>
              <span className="menu__rol">
                {rol}, {sucursal}
              </span>
            </div>
            <button type="button" className="menu__salir" onClick={() => setConfirmandoSalida(true)}>
              <Icono nombre="salir" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </aside>

        <div className="shell__contenido">
          {/* La clave reinicia la animacion de entrada al cambiar de seccion */}
          <div className="shell__pantalla" key={activo}>
            {children}
          </div>
        </div>

        <ConfirmDialog
          open={confirmandoSalida}
          title="¿Cerrar sesión?"
          message="Vas a salir del punto de venta. Si tienes un turno abierto, sigue abierto y puedes volver a entrar para continuar."
          confirmLabel="Cerrar sesión"
          cancelLabel="Seguir aquí"
          tone="danger"
          onCancel={() => setConfirmandoSalida(false)}
          onConfirm={() => {
            setConfirmandoSalida(false)
            onCerrarSesion()
          }}
        />
      </div>
    </Contexto.Provider>
  )
}

export default AppShell

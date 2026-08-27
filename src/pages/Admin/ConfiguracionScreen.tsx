import { useState, type FormEvent } from 'react'
import TopBar from '../../components/TopBar'
import { formatClock } from '../../lib/format'
import './ConfiguracionScreen.css'

type Props = {
  now: Date
  onVolver: () => void
  onCerrarSesion: () => void
}

function ConfiguracionScreen({ now, onVolver, onCerrarSesion }: Props) {
  const [nombre, setNombre] = useState('Sucursal Centro')
  const [direccion, setDireccion] = useState('Av. Reforma 214, Col. Centro')
  const [apertura, setApertura] = useState('08:00')
  const [cierre, setCierre] = useState('20:00')
  const [fondoCaja, setFondoCaja] = useState('500')
  const [guardado, setGuardado] = useState(false)

  function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2200)
  }

  return (
    <div className="config">
      <TopBar clock={formatClock(now)} onVolver={onVolver} volverLabel="Admin" onCerrarSesion={onCerrarSesion} />

      <main className="config__main">
        <h1>Configuración</h1>
        <p className="config__subtitulo">Datos generales de Sucursal Centro</p>

        <form className="config__form" onSubmit={guardar}>
          <div className="config__campo">
            <label htmlFor="nombre">Nombre de la sucursal</label>
            <input id="nombre" type="text" value={nombre} onChange={(event) => setNombre(event.target.value)} />
          </div>

          <div className="config__campo">
            <label htmlFor="direccion">Dirección</label>
            <input
              id="direccion"
              type="text"
              value={direccion}
              onChange={(event) => setDireccion(event.target.value)}
            />
          </div>

          <div className="config__fila">
            <div className="config__campo">
              <label htmlFor="apertura">Hora de apertura</label>
              <input id="apertura" type="time" value={apertura} onChange={(event) => setApertura(event.target.value)} />
            </div>
            <div className="config__campo">
              <label htmlFor="cierre">Hora de cierre</label>
              <input id="cierre" type="time" value={cierre} onChange={(event) => setCierre(event.target.value)} />
            </div>
          </div>

          <div className="config__fila">
            <div className="config__campo">
              <label htmlFor="fondo">Fondo de caja inicial</label>
              <input
                id="fondo"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={fondoCaja}
                onChange={(event) => setFondoCaja(event.target.value)}
              />
              <span className="config__ayuda">Efectivo con el que abre cada turno antes de vender.</span>
            </div>
            <div className="config__campo">
              <label htmlFor="moneda">Moneda</label>
              <input id="moneda" type="text" value="Peso mexicano (MXN)" disabled />
            </div>
          </div>

          <div className="config__acciones">
            <button type="submit" className="config__guardar">
              Guardar cambios
            </button>
            {guardado && (
              <span className="config__confirmacion" role="status">
                Cambios guardados
              </span>
            )}
          </div>
        </form>
      </main>
    </div>
  )
}

export default ConfiguracionScreen

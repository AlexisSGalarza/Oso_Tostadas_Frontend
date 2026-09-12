import { useEffect, useState, type FormEvent } from 'react'
import TopBar from '../../components/TopBar'
import { formatClock } from '../../lib/format'
import { api, ApiError } from '../../lib/api'
import './ConfiguracionScreen.css'

type Props = {
  now: Date
  onVolver: () => void
  onCerrarSesion: () => void
}

function ConfiguracionScreen({ now, onVolver, onCerrarSesion }: Props) {
  const [nombre, setNombre] = useState('')
  const [direccion, setDireccion] = useState('')
  const [apertura, setApertura] = useState('')
  const [cierre, setCierre] = useState('')
  const [fondoCaja, setFondoCaja] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .miSucursal()
      .then((sucursal) => {
        setNombre(sucursal.nombre)
        setDireccion(sucursal.direccion)
        setApertura(sucursal.hora_apertura?.slice(0, 5) ?? '')
        setCierre(sucursal.hora_cierre?.slice(0, 5) ?? '')
        setFondoCaja(String(sucursal.fondo_caja_default))
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudo cargar la configuración.'))
      .finally(() => setCargando(false))
  }, [])

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setGuardando(true)
    try {
      await api.actualizarMiSucursal({
        nombre,
        direccion,
        hora_apertura: apertura || null,
        hora_cierre: cierre || null,
        fondo_caja_default: Number.parseFloat(fondoCaja) || 0,
      })
      setGuardado(true)
      setTimeout(() => setGuardado(false), 2200)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la configuración.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="config">
      <TopBar clock={formatClock(now)} onVolver={onVolver} volverLabel="Admin" onCerrarSesion={onCerrarSesion} />

      <main className="config__main">
        <h1>Configuración</h1>
        <p className="config__subtitulo">Datos generales de tu sucursal</p>

        {cargando ? (
          <p className="config__subtitulo">Cargando…</p>
        ) : (
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
                <span className="config__ayuda">Efectivo con el que se sugiere abrir cada turno.</span>
              </div>
              <div className="config__campo">
                <label htmlFor="moneda">Moneda</label>
                <input id="moneda" type="text" value="Peso mexicano (MXN)" disabled />
              </div>
            </div>

            {error && (
              <p className="config__error" role="alert">
                {error}
              </p>
            )}

            <div className="config__acciones">
              <button type="submit" className="config__guardar" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </button>
              {guardado && (
                <span className="config__confirmacion" role="status">
                  Cambios guardados
                </span>
              )}
            </div>
          </form>
        )}
      </main>
    </div>
  )
}

export default ConfiguracionScreen

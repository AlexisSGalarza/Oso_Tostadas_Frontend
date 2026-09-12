import { useState } from 'react'
import TopBar from '../../components/TopBar'
import NumericKeypad from '../../components/NumericKeypad'
import { formatClock, formatMoney } from '../../lib/format'
import { api, ApiError, type Turno } from '../../lib/api'
import type { Devolucion, Venta } from './types'
import './CorteScreen.css'

type Props = {
  now: Date
  turno: Turno
  ventas: Venta[]
  devoluciones: Devolucion[]
  onVolver: () => void
  onCerrarSesion: () => void
  onConfirmarCorte: () => void
}

function CorteScreen({ now, turno, ventas, devoluciones, onVolver, onCerrarSesion, onConfirmarCorte }: Props) {
  const [efectivoContado, setEfectivoContado] = useState('')
  const [confirmado, setConfirmado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [turnoCerrado, setTurnoCerrado] = useState<Turno | null>(null)

  const ventasEfectivo = ventas.filter((venta) => venta.metodoPago === 'efectivo')
  const ventasTarjeta = ventas.filter((venta) => venta.metodoPago === 'tarjeta')
  const devolucionesEfectivo = devoluciones.filter((devolucion) => devolucion.metodoPago === 'efectivo')
  const devolucionesTarjeta = devoluciones.filter((devolucion) => devolucion.metodoPago === 'tarjeta')

  const totalVentasEfectivo = ventasEfectivo.reduce((suma, venta) => suma + venta.total, 0)
  const totalVentasTarjeta = ventasTarjeta.reduce((suma, venta) => suma + venta.total, 0)
  const totalDevolucionesEfectivo = devolucionesEfectivo.reduce((suma, d) => suma + d.total, 0)
  const totalDevolucionesTarjeta = devolucionesTarjeta.reduce((suma, d) => suma + d.total, 0)

  const netoEfectivo = totalVentasEfectivo - totalDevolucionesEfectivo
  const netoTarjeta = totalVentasTarjeta - totalDevolucionesTarjeta
  const totalTurno = netoEfectivo + netoTarjeta
  const efectivoEsperadoEstimado = turno.monto_inicial + netoEfectivo

  const contadoNumero = Number.parseFloat(efectivoContado)
  const hayConteo = efectivoContado.trim() !== '' && !Number.isNaN(contadoNumero)
  const diferenciaEstimada = hayConteo ? contadoNumero - efectivoEsperadoEstimado : null

  async function confirmar() {
    if (!hayConteo || enviando) return
    setError('')
    setEnviando(true)
    try {
      const resultado = await api.cerrarTurno(contadoNumero)
      setTurnoCerrado(resultado)
      setConfirmado(true)
      setTimeout(() => {
        onConfirmarCorte()
      }, 1200)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cerrar el turno.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="corte">
      <TopBar clock={formatClock(now)} onVolver={onVolver} volverLabel="Perfil" onCerrarSesion={onCerrarSesion} />

      <main className="corte__main">
        <h1>Corte de caja</h1>
        <p className="corte__subtitulo">Cierra tu turno y concilia el efectivo en caja</p>

        <div className="recibo">
          {confirmado && turnoCerrado ? (
            <div className="recibo__confirmado">
              <p>Corte confirmado</p>
              <p className="recibo__confirmado-sub">
                Turno cerrado · Diferencia oficial:{' '}
                {formatMoney(turnoCerrado.diferencia ?? 0)}
              </p>
            </div>
          ) : (
            <>
              <div className="recibo__fila">
                <span>Ventas en efectivo</span>
                <span>
                  {ventasEfectivo.length} · {formatMoney(totalVentasEfectivo)}
                </span>
              </div>
              {devolucionesEfectivo.length > 0 && (
                <div className="recibo__fila recibo__fila--negativo">
                  <span>Devoluciones en efectivo</span>
                  <span>
                    {devolucionesEfectivo.length} · −{formatMoney(totalDevolucionesEfectivo)}
                  </span>
                </div>
              )}
              <div className="recibo__fila">
                <span>Ventas con tarjeta</span>
                <span>
                  {ventasTarjeta.length} · {formatMoney(totalVentasTarjeta)}
                </span>
              </div>
              {devolucionesTarjeta.length > 0 && (
                <div className="recibo__fila recibo__fila--negativo">
                  <span>Devoluciones con tarjeta</span>
                  <span>
                    {devolucionesTarjeta.length} · −{formatMoney(totalDevolucionesTarjeta)}
                  </span>
                </div>
              )}
              <div className="recibo__fila recibo__fila--total">
                <span>Total del turno</span>
                <span>{formatMoney(totalTurno)}</span>
              </div>

              <div className="recibo__corte" />

              <div className="recibo__fila">
                <span>Fondo inicial de caja</span>
                <span>{formatMoney(turno.monto_inicial)}</span>
              </div>
              <div className="recibo__fila recibo__fila--total">
                <span>Efectivo esperado (estimado)</span>
                <span>{formatMoney(efectivoEsperadoEstimado)}</span>
              </div>

              <div className="recibo__conteo">
                <label htmlFor="contado">Efectivo contado en caja</label>
                <input
                  id="contado"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={efectivoContado}
                  onChange={(event) => setEfectivoContado(event.target.value)}
                  autoFocus
                />
                <NumericKeypad
                  value={efectivoContado}
                  onChange={setEfectivoContado}
                  quickAmounts={[50, 100, 200, 500]}
                  onQuickAmount={(monto) =>
                    setEfectivoContado((actual) =>
                      String(Math.round(((Number.parseFloat(actual) || 0) + monto) * 100) / 100),
                    )
                  }
                />
              </div>

              {diferenciaEstimada !== null && (
                <div className={`recibo__diferencia ${diferenciaEstimada === 0 ? 'is-exacto' : 'is-desajuste'}`}>
                  <span>Diferencia estimada</span>
                  <span>
                    {diferenciaEstimada === 0
                      ? 'Caja cuadrada'
                      : `${diferenciaEstimada > 0 ? 'Sobrante de' : 'Faltante de'} ${formatMoney(Math.abs(diferenciaEstimada))}`}
                  </span>
                </div>
              )}

              {error && (
                <p className="recibo__fila recibo__fila--negativo" role="alert">
                  {error}
                </p>
              )}

              <button type="button" className="recibo__confirmar" onClick={confirmar} disabled={!hayConteo || enviando}>
                {enviando ? 'Cerrando…' : 'Confirmar corte y cerrar turno'}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default CorteScreen

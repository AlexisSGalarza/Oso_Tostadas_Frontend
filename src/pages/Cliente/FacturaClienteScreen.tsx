import { useEffect, useRef, useState, type FormEvent } from 'react'
import BearMark from '../../components/BearMark'
import BearStamp from '../../components/BearStamp'
import { formatFecha, formatMoney, formatTicket } from '../../lib/format'
import {
  api,
  ApiError,
  type DatosFiscales,
  type FacturaGenerada,
  type RegimenFiscal,
  type TicketPublico,
  type UsoCfdi,
} from '../../lib/api'
import './FacturaClienteScreen.css'

type Paso = 'buscar' | 'confirmar' | 'datos' | 'listo'

const PASOS: { id: Paso; etiqueta: string }[] = [
  { id: 'buscar', etiqueta: 'Buscar ticket' },
  { id: 'confirmar', etiqueta: 'Confirmar compra' },
  { id: 'datos', etiqueta: 'Datos fiscales' },
]

const USOS_CFDI: { valor: UsoCfdi; etiqueta: string }[] = [
  { valor: 'G03', etiqueta: 'G03 · Gastos en general' },
  { valor: 'G01', etiqueta: 'G01 · Adquisición de mercancías' },
  { valor: 'P01', etiqueta: 'P01 · Por definir' },
]

const REGIMENES: { valor: RegimenFiscal; etiqueta: string }[] = [
  { valor: '616', etiqueta: '616 · Sin obligaciones fiscales' },
  { valor: '612', etiqueta: '612 · Actividades empresariales y profesionales' },
  { valor: '621', etiqueta: '621 · Incorporación fiscal' },
  { valor: '601', etiqueta: '601 · General de ley personas morales' },
]

const DATOS_INICIALES: DatosFiscales = {
  rfc: '',
  razon_social: '',
  correo: '',
  codigo_postal: '',
  regimen_fiscal: '616',
  uso_cfdi: 'G03',
}

function soloDigitos(valor: string) {
  return valor.replace(/\D/g, '')
}

function rfcValido(rfc: string) {
  return /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc.trim().toUpperCase())
}

function correoValido(correo: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())
}

function FacturaClienteScreen() {
  const [paso, setPaso] = useState<Paso>('buscar')

  const [folio, setFolio] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState('')
  const [ticket, setTicket] = useState<TicketPublico | null>(null)

  const [datos, setDatos] = useState<DatosFiscales>(DATOS_INICIALES)
  const [enviando, setEnviando] = useState(false)
  const [errorDatos, setErrorDatos] = useState('')
  const [factura, setFactura] = useState<FacturaGenerada | null>(null)

  const encabezadoRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    encabezadoRef.current?.focus()
  }, [paso])

  async function handleBuscar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const limpio = soloDigitos(folio)
    if (!limpio) {
      setErrorBusqueda('Escribe el número de tu ticket para buscarlo.')
      return
    }
    setErrorBusqueda('')
    setBuscando(true)
    try {
      const encontrado = await api.buscarTicketPublico(limpio)
      setTicket(encontrado)
      setPaso('confirmar')
    } catch (err) {
      setErrorBusqueda(
        err instanceof ApiError && err.status === 404
          ? 'No encontramos un ticket con ese número. Revisa los dígitos e intenta de nuevo.'
          : err instanceof ApiError
            ? err.message
            : 'No se pudo conectar con el servidor.',
      )
    } finally {
      setBuscando(false)
    }
  }

  function handleBuscarOtro() {
    setFolio('')
    setErrorBusqueda('')
    setTicket(null)
    setDatos(DATOS_INICIALES)
    setErrorDatos('')
    setFactura(null)
    setPaso('buscar')
  }

  async function handleGenerarFactura(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ticket) return

    if (!datos.razon_social.trim()) {
      setErrorDatos('Ingresa la razón social o el nombre completo del receptor.')
      return
    }
    if (!rfcValido(datos.rfc)) {
      setErrorDatos('Ese RFC no tiene un formato válido. Revísalo e intenta de nuevo.')
      return
    }
    if (!correoValido(datos.correo)) {
      setErrorDatos('Ingresa un correo válido para enviar la factura.')
      return
    }
    if (soloDigitos(datos.codigo_postal).length !== 5) {
      setErrorDatos('El código postal debe tener 5 dígitos.')
      return
    }

    setErrorDatos('')
    setEnviando(true)
    try {
      const generada = await api.generarFacturaPublica(ticket.id_venta, {
        ...datos,
        rfc: datos.rfc.trim().toUpperCase(),
        codigo_postal: soloDigitos(datos.codigo_postal),
      })
      setFactura(generada)
      setPaso('listo')
    } catch (err) {
      setErrorDatos(
        err instanceof ApiError ? err.message : 'No se pudo generar la factura. Intenta de nuevo en unos minutos.',
      )
    } finally {
      setEnviando(false)
    }
  }

  const pasoActivo = paso === 'listo' ? 2 : PASOS.findIndex((p) => p.id === paso)

  return (
    <main className="fc">
      <header className="fc__brand">
        <BearMark className="fc__mark" />
        <span>Oso Tostadas</span>
      </header>

      <div className="fc__stage">
        {paso !== 'listo' && (
          <ol className="fc__pasos" aria-label="Progreso">
            {PASOS.map((p, indice) => (
              <li
                key={p.id}
                className={`fc__paso ${indice === pasoActivo ? 'is-activo' : ''} ${indice < pasoActivo ? 'is-hecho' : ''}`}
              >
                <span className="fc__paso-punta" aria-hidden="true" />
                {p.etiqueta}
              </li>
            ))}
          </ol>
        )}

        <section className="recibo">
          <div className="recibo__perforado" aria-hidden="true" />

          {paso === 'buscar' && (
            <>
              <h1 className="recibo__titulo" ref={encabezadoRef} tabIndex={-1}>
                Factura tu ticket
              </h1>
              <p className="recibo__subtitulo">
                Escribe el número que aparece en tu ticket de compra para generar tu factura.
              </p>

              <form onSubmit={handleBuscar} noValidate>
                <div className="folio-campo">
                  <label htmlFor="folio">Número de ticket</label>
                  <input
                    id="folio"
                    name="folio"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="00453"
                    value={folio}
                    onChange={(event) => setFolio(event.target.value)}
                    autoFocus
                  />
                </div>

                {errorBusqueda && (
                  <p className="recibo__error" role="alert">
                    {errorBusqueda}
                  </p>
                )}

                <button type="submit" className="recibo__cta" disabled={buscando}>
                  {buscando ? 'Buscando…' : 'Buscar ticket'}
                </button>
              </form>
            </>
          )}

          {paso === 'confirmar' && ticket && (
            <>
              <h1 className="recibo__titulo" ref={encabezadoRef} tabIndex={-1}>
                Confirma tu compra
              </h1>
              <div className="recibo__meta">
                <span>{formatTicket(ticket.folio)}</span>
                <span>{formatFecha(new Date(ticket.creado_en ?? `${ticket.fecha}T00:00:00`), { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>

              <ul className="recibo__items">
                {ticket.detalles.map((item) => (
                  <li key={item.id_producto}>
                    <span>
                      {item.unidades}× {item.producto}
                    </span>
                    <span>{formatMoney(item.subtotal)}</span>
                  </li>
                ))}
              </ul>

              <div className="recibo__total">
                <span>Total</span>
                <span>{formatMoney(ticket.total)}</span>
              </div>

              {ticket.facturado ? (
                <p className="recibo__nota">
                  Este ticket ya tiene una factura generada. Si no la recibiste, pide ayuda en caja con tu número de
                  ticket.
                </p>
              ) : (
                <button type="button" className="recibo__cta" onClick={() => setPaso('datos')}>
                  Generar factura
                </button>
              )}

              <button type="button" className="recibo__enlace" onClick={handleBuscarOtro}>
                Buscar otro ticket
              </button>
            </>
          )}

          {paso === 'datos' && ticket && (
            <>
              <h1 className="recibo__titulo" ref={encabezadoRef} tabIndex={-1}>
                Datos fiscales
              </h1>
              <p className="recibo__subtitulo">
                {formatTicket(ticket.folio)} · {formatMoney(ticket.total)}
              </p>

              <form className="fiscal" onSubmit={handleGenerarFactura} noValidate>
                <div className="campo campo--ancho">
                  <label htmlFor="razon_social">Razón social o nombre completo</label>
                  <input
                    id="razon_social"
                    value={datos.razon_social}
                    onChange={(event) => setDatos((d) => ({ ...d, razon_social: event.target.value }))}
                    autoFocus
                  />
                </div>

                <div className="campo">
                  <label htmlFor="rfc">RFC</label>
                  <input
                    id="rfc"
                    className="campo--mono"
                    maxLength={13}
                    value={datos.rfc}
                    onChange={(event) => setDatos((d) => ({ ...d, rfc: event.target.value.toUpperCase() }))}
                  />
                </div>

                <div className="campo">
                  <label htmlFor="codigo_postal">Código postal</label>
                  <input
                    id="codigo_postal"
                    className="campo--mono"
                    inputMode="numeric"
                    maxLength={5}
                    value={datos.codigo_postal}
                    onChange={(event) => setDatos((d) => ({ ...d, codigo_postal: soloDigitos(event.target.value) }))}
                  />
                </div>

                <div className="campo campo--ancho">
                  <label htmlFor="correo">Correo electrónico</label>
                  <input
                    id="correo"
                    type="email"
                    autoComplete="email"
                    value={datos.correo}
                    onChange={(event) => setDatos((d) => ({ ...d, correo: event.target.value }))}
                  />
                </div>

                <div className="campo">
                  <label htmlFor="regimen_fiscal">Régimen fiscal</label>
                  <select
                    id="regimen_fiscal"
                    value={datos.regimen_fiscal}
                    onChange={(event) => setDatos((d) => ({ ...d, regimen_fiscal: event.target.value as RegimenFiscal }))}
                  >
                    {REGIMENES.map((r) => (
                      <option key={r.valor} value={r.valor}>
                        {r.etiqueta}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="campo">
                  <label htmlFor="uso_cfdi">Uso de CFDI</label>
                  <select
                    id="uso_cfdi"
                    value={datos.uso_cfdi}
                    onChange={(event) => setDatos((d) => ({ ...d, uso_cfdi: event.target.value as UsoCfdi }))}
                  >
                    {USOS_CFDI.map((u) => (
                      <option key={u.valor} value={u.valor}>
                        {u.etiqueta}
                      </option>
                    ))}
                  </select>
                </div>

                {errorDatos && (
                  <p className="recibo__error campo--ancho" role="alert">
                    {errorDatos}
                  </p>
                )}

                <button type="submit" className="recibo__cta campo--ancho" disabled={enviando}>
                  {enviando ? 'Generando…' : 'Generar factura'}
                </button>
              </form>

              <button type="button" className="recibo__enlace" onClick={() => setPaso('confirmar')}>
                Volver a la compra
              </button>
            </>
          )}

          {paso === 'listo' && ticket && factura && (
            <div className="listo">
              <BearStamp className="listo__stamp" />
              <h1 className="recibo__titulo" ref={encabezadoRef} tabIndex={-1}>
                Factura generada
              </h1>
              <p className="recibo__subtitulo">La enviamos a {factura.correo}.</p>

              <div className="listo__folio">
                <span>Folio fiscal</span>
                <span>{factura.folio_fiscal}</span>
              </div>

              <button type="button" className="recibo__enlace" onClick={handleBuscarOtro}>
                Facturar otro ticket
              </button>
            </div>
          )}
        </section>

        <p className="fc__ayuda">¿Problemas para encontrar tu ticket? Pide ayuda en caja con tu número de orden.</p>
      </div>
    </main>
  )
}

export default FacturaClienteScreen

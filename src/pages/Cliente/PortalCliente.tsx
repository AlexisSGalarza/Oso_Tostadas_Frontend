import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import BearMark from '../../components/BearMark'
import Icono from '../../components/Icono'
import Tostadas from '../../components/Tostadas'
import { formatFecha, formatMoney, ZONA_HORARIA_MX } from '../../lib/format'
import {
  api,
  apiCliente,
  ApiError,
  getAccessToken,
  type ClienteCuenta,
  type DatosFiscales,
  type FacturaGenerada,
  type RegimenFiscal,
  type TicketDeCliente,
  type UsoCfdi,
} from '../../lib/api'
import {
  DATOS_FISCALES_VACIOS,
  errorDeDatosFiscales,
  REGIMENES,
  REGIMENES_SOLO_S01,
  soloDigitos,
  USOS_CFDI,
} from '../../lib/fiscal'
import '../Admin/FacturasScreen.css'
import './PortalCliente.css'

function mensaje(err: unknown, porDefecto: string) {
  return err instanceof ApiError ? err.message : porDefecto
}

function formatFechaHora(iso: string) {
  const fecha = new Date(iso)
  const hora = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: ZONA_HORARIA_MX })
  return `${formatFecha(fecha, { day: 'numeric', month: 'short', year: 'numeric' })}, ${hora}`
}

// ---------- Acceso: entrar o crear cuenta ----------

function Acceso({ onEntrar }: { onEntrar: (cliente: ClienteCuenta) => void }) {
  const [modo, setModo] = useState<'entrar' | 'registro'>('entrar')
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setEnviando(true)
    try {
      const cliente =
        modo === 'entrar'
          ? await apiCliente.login(correo.trim(), password)
          : await apiCliente.registro(nombre.trim(), correo.trim(), password)
      onEntrar(cliente)
    } catch (err) {
      setError(mensaje(err, 'No se pudo conectar con el servidor.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="pc-acceso">
      <div className="pc-acceso__tarjeta entra">
        <div className="pc-marca">
          <BearMark className="pc-marca__oso" />
          Oso Tostadas
        </div>
        <h1>{modo === 'entrar' ? 'Factura tus compras' : 'Crea tu cuenta'}</h1>
        <p className="pc-acceso__sub">
          {modo === 'entrar'
            ? 'Entra para agregar tus tickets y descargar tus facturas.'
            : 'Con tu cuenta guardas tus datos fiscales y tienes todas tus facturas en un lugar.'}
        </p>

        <div className="pc-pestanas" role="tablist">
          <button type="button" role="tab" aria-selected={modo === 'entrar'} onClick={() => setModo('entrar')}>
            Entrar
          </button>
          <button type="button" role="tab" aria-selected={modo === 'registro'} onClick={() => setModo('registro')}>
            Crear cuenta
          </button>
        </div>

        <form className="pc-form" onSubmit={enviar} noValidate>
          {modo === 'registro' && (
            <div className="fcampo">
              <label htmlFor="pc-nombre">Tu nombre</label>
              <input id="pc-nombre" autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
          )}
          <div className="fcampo">
            <label htmlFor="pc-correo">Correo</label>
            <input
              id="pc-correo"
              type="email"
              autoComplete="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
            />
          </div>
          <div className="fcampo">
            <label htmlFor="pc-password">Contraseña</label>
            <input
              id="pc-password"
              type="password"
              autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {modo === 'registro' && <span className="pc-ayuda">Mínimo 8 caracteres, no solo números.</span>}
          </div>
          {error && (
            <p className="facturas__error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="fdialogo__principal" disabled={enviando}>
            {enviando ? 'Un momento…' : modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <p className="pc-acceso__pie">
          ¿Solo quieres una factura sin cuenta? <a href="/factura">Factura un ticket aquí</a>
        </p>
      </div>
    </main>
  )
}

// ---------- Portal: tickets y facturas del cliente ----------

function Portal({ cliente, onSalir }: { cliente: ClienteCuenta; onSalir: () => void }) {
  const [cuenta, setCuenta] = useState(cliente)
  const [tickets, setTickets] = useState<TicketDeCliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  // Agregar un ticket; se puede prellenar desde un enlace /cliente?ticket=24&total=139.20
  const parametros = new URLSearchParams(window.location.search)
  const [folio, setFolio] = useState(parametros.get('ticket') ?? '')
  const [total, setTotal] = useState(parametros.get('total') ?? '')
  const [agregando, setAgregando] = useState(false)
  const [errorAgregar, setErrorAgregar] = useState('')
  const [recienAgregado, setRecienAgregado] = useState<number | null>(null)

  // Dialogo para facturar
  const [ticket, setTicket] = useState<TicketDeCliente | null>(null)
  const [fiscales, setFiscales] = useState<DatosFiscales>(DATOS_FISCALES_VACIOS)
  const [guardar, setGuardar] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [errorFiscal, setErrorFiscal] = useState('')
  const [emitida, setEmitida] = useState<FacturaGenerada | null>(null)

  useEffect(() => {
    apiCliente
      .tickets()
      .then(setTickets)
      .catch((err) => setError(mensaje(err, 'No se pudieron cargar tus tickets.')))
      .finally(() => setCargando(false))
  }, [])

  async function agregar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const numero = Number.parseInt(soloDigitos(folio), 10)
    const monto = Number.parseFloat(total.replace(/[$,\s]/g, ''))
    if (!numero) {
      setErrorAgregar('Escribe el número de tu ticket.')
      return
    }
    if (Number.isNaN(monto) || monto <= 0) {
      setErrorAgregar('Escribe el total de tu compra tal como aparece en el ticket.')
      return
    }
    setErrorAgregar('')
    setAgregando(true)
    try {
      const nuevo = await apiCliente.agregarTicket(numero, monto)
      setTickets((actual) => [nuevo, ...actual.filter((t) => t.id_venta !== nuevo.id_venta)])
      setRecienAgregado(nuevo.id_venta)
      setFolio('')
      setTotal('')
      if (window.location.search) window.history.replaceState(null, '', '/cliente')
    } catch (err) {
      setErrorAgregar(
        err instanceof ApiError && err.status === 404
          ? 'No encontramos un ticket con ese número y ese total. Revisa los datos.'
          : mensaje(err, 'No se pudo agregar el ticket.'),
      )
    } finally {
      setAgregando(false)
    }
  }

  function abrirFactura(elegido: TicketDeCliente) {
    setTicket(elegido)
    setFiscales(cuenta.datos_fiscales ? { ...cuenta.datos_fiscales, correo: cuenta.correo } : { ...DATOS_FISCALES_VACIOS, correo: cuenta.correo })
    setGuardar(true)
    setErrorFiscal('')
    setEmitida(null)
  }

  function cerrar() {
    if (enviando) return
    setTicket(null)
    setEmitida(null)
  }

  async function facturar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ticket) return
    const problema = errorDeDatosFiscales(fiscales, false)
    if (problema) {
      setErrorFiscal(problema)
      return
    }
    setErrorFiscal('')
    setEnviando(true)
    const datos = {
      ...fiscales,
      rfc: fiscales.rfc.trim().toUpperCase(),
      correo: fiscales.correo.trim(),
      codigo_postal: soloDigitos(fiscales.codigo_postal),
    }
    try {
      const generada = await apiCliente.facturar(ticket.id_venta, datos, guardar)
      setEmitida(generada)
      if (guardar) setCuenta((c) => ({ ...c, datos_fiscales: datos }))
      apiCliente.tickets().then(setTickets).catch(() => {})
    } catch (err) {
      setErrorFiscal(mensaje(err, 'No se pudo generar la factura. Intenta de nuevo.'))
    } finally {
      setEnviando(false)
    }
  }

  const porFacturar = tickets.filter((t) => !t.factura && !t.motivo_no_facturable).length

  return (
    <div className="pc">
      <header className="pc-barra">
        <div className="pc-marca">
          <BearMark className="pc-marca__oso" />
          Oso Tostadas
        </div>
        <div className="pc-barra__cuenta">
          <span className="pc-barra__nombre">{cuenta.nombre}</span>
          <button type="button" className="pc-barra__salir" onClick={onSalir}>
            <Icono nombre="salir" />
            <span>Salir</span>
          </button>
        </div>
      </header>

      <main className="pc-main">
        <div>
          <h1>Mis facturas</h1>
          <p className="facturas__subtitulo">
            Agrega tus tickets con el número y el total impresos, y factúralos cuando quieras.
          </p>
        </div>

        <form className="pc-agregar entra" onSubmit={agregar} noValidate>
          <h2>Agregar un ticket</h2>
          <div className="pc-agregar__campos">
            <div className="fcampo">
              <label htmlFor="pc-folio">Número de ticket</label>
              <input
                id="pc-folio"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Ej. 24"
                value={folio}
                onChange={(e) => setFolio(e.target.value)}
              />
            </div>
            <div className="fcampo">
              <label htmlFor="pc-total">Total de la compra</label>
              <input
                id="pc-total"
                inputMode="decimal"
                autoComplete="off"
                placeholder="Ej. 139.20"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
              />
            </div>
            <button type="submit" className="fdialogo__principal" disabled={agregando}>
              {agregando ? 'Buscando…' : 'Agregar ticket'}
            </button>
          </div>
          {errorAgregar && (
            <p className="facturas__error" role="alert">
              {errorAgregar}
            </p>
          )}
          <p className="pc-ayuda">Los dos datos vienen en tu ticket impreso o en el PDF del recibo.</p>
        </form>

        <section aria-labelledby="pc-titulo-tickets">
          <div className="facturas__seccion">
            <h2 id="pc-titulo-tickets">Mis tickets</h2>
            {porFacturar > 0 && <span className="facturas__conteo">{porFacturar} por facturar</span>}
          </div>

          {cargando && <p className="facturas__subtitulo">Cargando…</p>}
          {error && (
            <p className="facturas__error" role="alert">
              {error}
            </p>
          )}
          {!cargando && !error && tickets.length === 0 && (
            <p className="facturas__vacio">Todavía no agregas tickets. Empieza con el de tu última compra.</p>
          )}

          <ul className="pc-tickets">
            {tickets.map((t, indice) => (
              <li
                key={t.id_venta}
                className={`pc-ticket entra ${recienAgregado === t.id_venta ? 'is-nuevo' : ''}`}
                style={{ '--i': Math.min(indice, 10) } as CSSProperties}
              >
                <Tostadas nombre={t.detalles[0]?.producto ?? ''} className="compra__foto" />
                <div className="pc-ticket__texto">
                  <span className="compra__ticket">Ticket #{t.folio}</span>
                  <span className="compra__detalle">
                    {t.detalles.map((d) => `${d.unidades}× ${d.producto}`).join(', ')}
                  </span>
                  <span className="compra__meta">
                    {formatFechaHora(t.creado_en ?? `${t.fecha}T12:00:00`)} · {formatMoney(t.total)}
                  </span>
                </div>
                <div className="pc-ticket__accion">
                  {t.factura ? (
                    <>
                      <span className="pc-estado is-lista">
                        <Icono nombre="palomita" /> Factura {t.factura.serie}-{t.factura.folio}
                      </span>
                      <span className="facturas__descargas">
                        <a href={api.urlArchivoFactura(t.factura.folio_fiscal, 'pdf')}>PDF</a>
                        <a href={api.urlArchivoFactura(t.factura.folio_fiscal, 'xml')}>XML</a>
                      </span>
                    </>
                  ) : t.motivo_no_facturable ? (
                    <span className="pc-estado is-bloqueada">{t.motivo_no_facturable}</span>
                  ) : (
                    <button type="button" className="compra__accion pc-facturar" onClick={() => abrirFactura(t)}>
                      Facturar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>

      {ticket && (
        <div className="fdialogo" onClick={cerrar}>
          <div
            className="fdialogo__hoja"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pc-dialogo-titulo"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="fdialogo__cabeza">
              <div>
                <h2 id="pc-dialogo-titulo">{emitida ? 'Factura generada' : `Facturar ticket #${ticket.folio}`}</h2>
                <p>{formatMoney(ticket.total)}</p>
              </div>
              <button type="button" className="fdialogo__cerrar" onClick={cerrar} aria-label="Cerrar">
                <Icono nombre="cerrar" />
              </button>
            </header>

            {emitida ? (
              <div className="fdialogo__listo">
                <span className="fdialogo__palomita" aria-hidden="true">
                  <Icono nombre="palomita" />
                </span>
                <p className="fdialogo__folio">
                  Factura {emitida.serie}-{emitida.folio}
                  <span>{emitida.folio_fiscal}</span>
                </p>
                <p className="fdialogo__nota">
                  {emitida.correo_enviado ? `También te la enviamos a ${emitida.correo}.` : 'Descárgala y guárdala.'}
                </p>
                <div className="fdialogo__acciones">
                  <a className="fdialogo__principal" href={api.urlArchivoFactura(emitida.folio_fiscal, 'pdf')}>
                    Descargar PDF
                  </a>
                  <a className="fdialogo__secundario" href={api.urlArchivoFactura(emitida.folio_fiscal, 'xml')}>
                    Descargar XML
                  </a>
                </div>
                <button type="button" className="fdialogo__enlace" onClick={cerrar}>
                  Listo
                </button>
              </div>
            ) : (
              <form className="fdialogo__form" onSubmit={facturar} noValidate>
                {cuenta.datos_fiscales && (
                  <p className="fdialogo__compra fcampo--ancho">Usamos los datos fiscales que guardaste. Revísalos.</p>
                )}
                <div className="fcampo fcampo--ancho">
                  <label htmlFor="pc-razon">Razón social o nombre completo</label>
                  <input
                    id="pc-razon"
                    value={fiscales.razon_social}
                    onChange={(e) => setFiscales((f) => ({ ...f, razon_social: e.target.value }))}
                  />
                </div>
                <div className="fcampo">
                  <label htmlFor="pc-rfc">RFC</label>
                  <input
                    id="pc-rfc"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={13}
                    value={fiscales.rfc}
                    onChange={(e) => setFiscales((f) => ({ ...f, rfc: e.target.value.toUpperCase() }))}
                  />
                </div>
                <div className="fcampo">
                  <label htmlFor="pc-cp">Código postal fiscal</label>
                  <input
                    id="pc-cp"
                    inputMode="numeric"
                    maxLength={5}
                    value={fiscales.codigo_postal}
                    onChange={(e) => setFiscales((f) => ({ ...f, codigo_postal: soloDigitos(e.target.value) }))}
                  />
                </div>
                <div className="fcampo">
                  <label htmlFor="pc-regimen">Régimen fiscal</label>
                  <select
                    id="pc-regimen"
                    value={fiscales.regimen_fiscal}
                    onChange={(e) => {
                      const regimen = e.target.value as RegimenFiscal
                      setFiscales((f) => ({
                        ...f,
                        regimen_fiscal: regimen,
                        uso_cfdi: REGIMENES_SOLO_S01.includes(regimen) ? 'S01' : f.uso_cfdi,
                      }))
                    }}
                  >
                    {REGIMENES.map((r) => (
                      <option key={r.valor} value={r.valor}>
                        {r.etiqueta}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fcampo">
                  <label htmlFor="pc-uso">Uso de CFDI</label>
                  <select
                    id="pc-uso"
                    value={fiscales.uso_cfdi}
                    onChange={(e) => setFiscales((f) => ({ ...f, uso_cfdi: e.target.value as UsoCfdi }))}
                  >
                    {USOS_CFDI.filter(
                      (u) => !REGIMENES_SOLO_S01.includes(fiscales.regimen_fiscal) || u.valor === 'S01',
                    ).map((u) => (
                      <option key={u.valor} value={u.valor}>
                        {u.etiqueta}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fcampo fcampo--ancho">
                  <label htmlFor="pc-correo-f">Correo para la factura</label>
                  <input
                    id="pc-correo-f"
                    type="email"
                    value={fiscales.correo}
                    onChange={(e) => setFiscales((f) => ({ ...f, correo: e.target.value }))}
                  />
                </div>
                <label className="pc-guardar fcampo--ancho">
                  <input type="checkbox" checked={guardar} onChange={(e) => setGuardar(e.target.checked)} />
                  Guardar estos datos para mis próximas facturas
                </label>
                {errorFiscal && (
                  <p className="facturas__error fcampo--ancho" role="alert">
                    {errorFiscal}
                  </p>
                )}
                <button type="submit" className="fdialogo__principal fcampo--ancho" disabled={enviando}>
                  {enviando ? 'Generando…' : `Generar factura por ${formatMoney(ticket.total)}`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- Raiz del portal ----------

function PortalCliente() {
  const [cliente, setCliente] = useState<ClienteCuenta | null>(null)
  const [revisando, setRevisando] = useState(() => getAccessToken() !== null)

  // Si ya habia sesion de cliente en este navegador, se recupera sin volver a entrar.
  useEffect(() => {
    if (!revisando) return
    apiCliente
      .me()
      .then(setCliente)
      .catch(() => apiCliente.logout())
      .finally(() => setRevisando(false))
  }, [revisando])

  if (revisando) return <p className="pc-cargando">Cargando…</p>
  if (!cliente) return <Acceso onEntrar={setCliente} />
  return (
    <Portal
      cliente={cliente}
      onSalir={() => {
        apiCliente.logout()
        setCliente(null)
      }}
    />
  )
}

export default PortalCliente

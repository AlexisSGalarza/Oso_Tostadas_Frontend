import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import TopBar from '../../components/TopBar'
import Icono from '../../components/Icono'
import Tostadas from '../../components/Tostadas'
import { formatClock, formatFecha, formatMoney, formatTicket, ZONA_HORARIA_MX } from '../../lib/format'
import {
  api,
  ApiError,
  type DatosFiscales,
  type FacturaGenerada,
  type FacturasAdmin,
  type RegimenFiscal,
  type UsoCfdi,
  type VentaPorFacturar,
} from '../../lib/api'
import {
  DATOS_FISCALES_VACIOS,
  errorDeDatosFiscales,
  REGIMENES,
  REGIMENES_SOLO_S01,
  RFC_PUBLICO_GENERAL,
  soloDigitos,
  USOS_CFDI,
} from '../../lib/fiscal'
import './FacturasScreen.css'

function formatFechaHora(iso: string) {
  const fecha = new Date(iso)
  const hora = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: ZONA_HORARIA_MX })
  return `${formatFecha(fecha, { day: 'numeric', month: 'short' })}, ${hora}`
}

function resumenDe(venta: VentaPorFacturar) {
  return venta.detalles.map((d) => `${d.unidades}× ${d.producto}`).join(', ')
}

type Props = {
  now: Date
  onVolver: () => void
  onCerrarSesion: () => void
}

function FacturasScreen({ now, onVolver, onCerrarSesion }: Props) {
  const [datos, setDatos] = useState<FacturasAdmin | null>(null)
  const [pendientes, setPendientes] = useState<VentaPorFacturar[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [busquedaCompras, setBusquedaCompras] = useState('')

  // Compra elegida para facturar y su formulario
  const [venta, setVenta] = useState<VentaPorFacturar | null>(null)
  const [fiscales, setFiscales] = useState<DatosFiscales>(DATOS_FISCALES_VACIOS)
  const [enviando, setEnviando] = useState(false)
  const [errorFiscal, setErrorFiscal] = useState('')
  const [emitida, setEmitida] = useState<FacturaGenerada | null>(null)

  function cargar() {
    return Promise.all([api.facturasAdmin(), api.ventasPorFacturar()])
      .then(([facturasData, pendientesData]) => {
        setDatos(facturasData)
        setPendientes(pendientesData)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las facturas.'))
  }

  useEffect(() => {
    cargar().finally(() => setCargando(false))
  }, [])

  function elegir(elegida: VentaPorFacturar) {
    setVenta(elegida)
    setFiscales(DATOS_FISCALES_VACIOS)
    setErrorFiscal('')
    setEmitida(null)
  }

  function cerrarDialogo() {
    if (enviando) return
    setVenta(null)
    setEmitida(null)
  }

  useEffect(() => {
    if (!venta) return
    function alPresionar(event: KeyboardEvent) {
      if (event.key === 'Escape' && !enviando) {
        setVenta(null)
        setEmitida(null)
      }
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [venta, enviando])

  function usarPublicoGeneral() {
    setErrorFiscal('')
    setFiscales((f) => ({
      ...f,
      rfc: RFC_PUBLICO_GENERAL,
      razon_social: 'PUBLICO EN GENERAL',
      codigo_postal: datos?.configuracion.lugar_expedicion ?? f.codigo_postal,
      regimen_fiscal: '616',
      uso_cfdi: 'S01',
    }))
  }

  async function facturar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!venta) return
    const problema = errorDeDatosFiscales(fiscales, false)
    if (problema) {
      setErrorFiscal(problema)
      return
    }
    setErrorFiscal('')
    setEnviando(true)
    try {
      const generada = await api.facturarVenta(venta.id_venta, {
        ...fiscales,
        rfc: fiscales.rfc.trim().toUpperCase(),
        correo: fiscales.correo.trim(),
        codigo_postal: soloDigitos(fiscales.codigo_postal),
      })
      setEmitida(generada)
      setPendientes((actual) => actual.filter((p) => p.id_venta !== venta.id_venta))
      api.facturasAdmin().then(setDatos).catch(() => {})
    } catch (err) {
      setErrorFiscal(err instanceof ApiError ? err.message : 'No se pudo generar la factura. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  // Busca por numero de ticket, producto, cajero, forma de pago o total.
  const terminoCompras = busquedaCompras.trim().toLowerCase().replace(/^#/, '')
  const compras = pendientes.filter((p) => {
    if (!terminoCompras) return true
    const pago = p.metodo_pago === 'tarjeta' ? 'tarjeta' : 'efectivo'
    return (
      String(p.id_venta).includes(terminoCompras) ||
      resumenDe(p).toLowerCase().includes(terminoCompras) ||
      p.cajero.toLowerCase().includes(terminoCompras) ||
      pago.includes(terminoCompras) ||
      p.total.toFixed(2).includes(terminoCompras.replace('$', ''))
    )
  })

  const termino = busqueda.trim().toLowerCase()
  const facturas = (datos?.facturas ?? []).filter(
    (f) =>
      !termino ||
      f.razon_social.toLowerCase().includes(termino) ||
      f.rfc_receptor.toLowerCase().includes(termino) ||
      f.folio_fiscal.toLowerCase().includes(termino) ||
      String(f.id_venta) === termino ||
      `${f.serie}-${f.folio}`.toLowerCase() === termino,
  )

  return (
    <div className="facturas">
      <TopBar clock={formatClock(now)} onVolver={onVolver} volverLabel="Panel" onCerrarSesion={onCerrarSesion} />

      <main className="facturas__main">
        <div>
          <h1>Facturas</h1>
          <p className="facturas__subtitulo">Elige una compra y llena los datos de quien la factura</p>
        </div>

        {cargando && <p className="facturas__subtitulo">Cargando…</p>}
        {error && (
          <p className="facturas__error" role="alert">
            {error}
          </p>
        )}

        {datos && (
          <>
            <section aria-labelledby="titulo-pendientes">
              <div className="facturas__seccion">
                <h2 id="titulo-pendientes">Compras por facturar</h2>
                <span className="facturas__conteo">{pendientes.length}</span>
              </div>
              {pendientes.length === 0 ? (
                <p className="facturas__vacio">
                  No hay compras pendientes de factura en los últimos {datos.configuracion.dias_para_facturar} días.
                </p>
              ) : (
                <>
                <input
                  type="search"
                  className="facturas__buscador"
                  placeholder="Buscar por ticket, producto, cajero o total"
                  aria-label="Buscar compras por facturar"
                  value={busquedaCompras}
                  onChange={(event) => setBusquedaCompras(event.target.value)}
                />
                {compras.length === 0 && (
                  <p className="facturas__vacio">Ninguna compra coincide con “{busquedaCompras.trim()}”.</p>
                )}
                <ul className="compras">
                  {compras.map((p, indice) => (
                    <li key={p.id_venta}>
                      <button
                        type="button"
                        className="compra entra"
                        style={{ '--i': terminoCompras ? 0 : Math.min(indice, 12) } as CSSProperties}
                        onClick={() => elegir(p)}
                      >
                        <Tostadas nombre={p.detalles[0]?.producto ?? ''} className="compra__foto" />
                        <span className="compra__texto">
                          <span className="compra__ticket">Ticket #{p.id_venta}</span>
                          <span className="compra__detalle">{resumenDe(p)}</span>
                          <span className="compra__meta">
                            {formatFechaHora(p.creado_en ?? `${p.fecha}T12:00:00`)} ·{' '}
                            {p.metodo_pago === 'tarjeta' ? 'Tarjeta' : 'Efectivo'} · {p.cajero}
                          </span>
                        </span>
                        <span className="compra__total">{formatMoney(p.total)}</span>
                        <span className="compra__accion">Facturar</span>
                      </button>
                    </li>
                  ))}
                </ul>
                </>
              )}
            </section>

            <section aria-labelledby="titulo-emitidas">
              <div className="facturas__seccion">
                <h2 id="titulo-emitidas">Facturas emitidas</h2>
                <span className="facturas__conteo">{datos.facturas.length}</span>
              </div>
              {datos.facturas.length === 0 ? (
                <p className="facturas__vacio">Todavía no se ha emitido ninguna factura.</p>
              ) : (
                <>
                  <input
                    type="search"
                    className="facturas__buscador"
                    placeholder="Buscar por cliente, RFC, folio o número de ticket"
                    aria-label="Buscar facturas"
                    value={busqueda}
                    onChange={(event) => setBusqueda(event.target.value)}
                  />

                  <div className="facturas__tabla-caja">
                    <table className="facturas__tabla">
                      <thead>
                        <tr>
                          <th scope="col">Factura</th>
                          <th scope="col">Cliente</th>
                          <th scope="col">Ticket</th>
                          <th scope="col">Emitida</th>
                          <th scope="col" className="es-numero">
                            Total
                          </th>
                          <th scope="col">Descargar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {facturas.map((f) => (
                          <tr key={f.id_factura}>
                            <td data-label="Factura">
                              <span className="facturas__folio">
                                {f.serie}-{f.folio}
                              </span>
                              {f.modo === 'pruebas' && <span className="facturas__etiqueta">Prueba</span>}
                            </td>
                            <td data-label="Cliente">
                              <span className="facturas__cliente">{f.razon_social}</span>
                              <span className="facturas__rfc">{f.rfc_receptor}</span>
                            </td>
                            <td data-label="Ticket">#{f.id_venta}</td>
                            <td data-label="Emitida">{formatFechaHora(f.fecha_emision)}</td>
                            <td data-label="Total" className="es-numero">
                              {formatMoney(f.total)}
                            </td>
                            <td data-label="Descargar">
                              <span className="facturas__descargas">
                                <a href={api.urlArchivoFactura(f.folio_fiscal, 'pdf')}>PDF</a>
                                <a href={api.urlArchivoFactura(f.folio_fiscal, 'xml')}>XML</a>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {facturas.length === 0 && <p className="facturas__pie">Ninguna factura coincide con la búsqueda.</p>}
                </>
              )}
            </section>

            <p className="facturas__pie">
              Emisor: {datos.configuracion.emisor_nombre} ({datos.configuracion.emisor_rfc}). El cliente también puede
              facturar por su cuenta en <a href="/factura">/factura</a> con el número y el total de su ticket.
            </p>
          </>
        )}
      </main>

      {venta && (
        <div className="fdialogo" onClick={cerrarDialogo}>
          <div
            className="fdialogo__hoja"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fdialogo-titulo"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="fdialogo__cabeza">
              <div>
                <h2 id="fdialogo-titulo">{emitida ? 'Factura generada' : 'Facturar compra'}</h2>
                <p>
                  {formatTicket(venta.id_venta)} · {formatMoney(venta.total)}
                </p>
              </div>
              <button type="button" className="fdialogo__cerrar" onClick={cerrarDialogo} aria-label="Cerrar">
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
                  {emitida.correo_enviado
                    ? `También se envió a ${emitida.correo}.`
                    : 'Descárgala para entregarla al cliente.'}
                </p>
                <div className="fdialogo__acciones">
                  <a className="fdialogo__principal" href={api.urlArchivoFactura(emitida.folio_fiscal, 'pdf')}>
                    Descargar PDF
                  </a>
                  <a className="fdialogo__secundario" href={api.urlArchivoFactura(emitida.folio_fiscal, 'xml')}>
                    Descargar XML
                  </a>
                </div>
                <button type="button" className="fdialogo__enlace" onClick={cerrarDialogo}>
                  Listo
                </button>
              </div>
            ) : (
              <form className="fdialogo__form" onSubmit={facturar} noValidate>
                <p className="fdialogo__compra">{resumenDe(venta)}</p>

                <button type="button" className="fdialogo__atajo" onClick={usarPublicoGeneral}>
                  Llenar como público en general
                </button>

                <div className="fcampo fcampo--ancho">
                  <label htmlFor="f-razon">Razón social o nombre completo</label>
                  <input
                    id="f-razon"
                    autoComplete="off"
                    value={fiscales.razon_social}
                    onChange={(event) => setFiscales((f) => ({ ...f, razon_social: event.target.value }))}
                    autoFocus
                  />
                </div>
                <div className="fcampo">
                  <label htmlFor="f-rfc">RFC</label>
                  <input
                    id="f-rfc"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={13}
                    value={fiscales.rfc}
                    onChange={(event) => setFiscales((f) => ({ ...f, rfc: event.target.value.toUpperCase() }))}
                  />
                </div>
                <div className="fcampo">
                  <label htmlFor="f-cp">Código postal fiscal</label>
                  <input
                    id="f-cp"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={5}
                    value={fiscales.codigo_postal}
                    onChange={(event) => setFiscales((f) => ({ ...f, codigo_postal: soloDigitos(event.target.value) }))}
                  />
                </div>
                <div className="fcampo">
                  <label htmlFor="f-regimen">Régimen fiscal</label>
                  <select
                    id="f-regimen"
                    value={fiscales.regimen_fiscal}
                    onChange={(event) => {
                      const regimen = event.target.value as RegimenFiscal
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
                  <label htmlFor="f-uso">Uso de CFDI</label>
                  <select
                    id="f-uso"
                    value={fiscales.uso_cfdi}
                    onChange={(event) => setFiscales((f) => ({ ...f, uso_cfdi: event.target.value as UsoCfdi }))}
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
                  <label htmlFor="f-correo">Correo del cliente (opcional)</label>
                  <input
                    id="f-correo"
                    type="email"
                    autoComplete="off"
                    value={fiscales.correo}
                    onChange={(event) => setFiscales((f) => ({ ...f, correo: event.target.value }))}
                  />
                </div>

                {errorFiscal && (
                  <p className="facturas__error fcampo--ancho" role="alert">
                    {errorFiscal}
                  </p>
                )}

                <button type="submit" className="fdialogo__principal fcampo--ancho" disabled={enviando}>
                  {enviando ? 'Generando…' : `Generar factura por ${formatMoney(venta.total)}`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default FacturasScreen

import { useEffect, useState } from 'react'
import TopBar from '../../components/TopBar'
import { formatClock, formatFecha, formatMoney, ZONA_HORARIA_MX } from '../../lib/format'
import { api, ApiError, type FacturasAdmin } from '../../lib/api'
import './FacturasScreen.css'

function formatFechaHora(iso: string) {
  const fecha = new Date(iso)
  const hora = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: ZONA_HORARIA_MX })
  return `${formatFecha(fecha, { day: 'numeric', month: 'short', year: 'numeric' })}, ${hora}`
}

type Props = {
  now: Date
  onVolver: () => void
  onCerrarSesion: () => void
}

function FacturasScreen({ now, onVolver, onCerrarSesion }: Props) {
  const [datos, setDatos] = useState<FacturasAdmin | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    api
      .facturasAdmin()
      .then(setDatos)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las facturas.'))
      .finally(() => setCargando(false))
  }, [])

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
  const totalFacturado = facturas.reduce((suma, f) => suma + f.total, 0)
  const enPruebas = datos?.configuracion.modo === 'pruebas'

  return (
    <div className="facturas">
      <TopBar clock={formatClock(now)} onVolver={onVolver} volverLabel="Panel" onCerrarSesion={onCerrarSesion} />

      <main className="facturas__main">
        <div className="facturas__cabeza">
          <div>
            <h1>Facturas</h1>
            <p className="facturas__subtitulo">Facturas que los clientes generaron con su ticket</p>
          </div>
          <a className="facturas__nueva" href="/factura" target="_blank" rel="noreferrer">
            Facturar un ticket
          </a>
        </div>

        {cargando && <p className="facturas__subtitulo">Cargando…</p>}
        {error && (
          <p className="facturas__error" role="alert">
            {error}
          </p>
        )}

        {datos && (
          <>
            {enPruebas && (
              <div className="facturas__aviso" role="note">
                <strong>Modo de prueba.</strong>{' '}
                {datos.configuracion.pac === 'finkok'
                  ? 'Se está timbrando en el ambiente de pruebas de Finkok: estas facturas no tienen validez fiscal.'
                  : 'El timbrado es simulado: estas facturas no llegan al SAT ni tienen validez fiscal. Para emitir facturas reales faltan las credenciales del PAC (Finkok) y los datos fiscales del negocio.'}
              </div>
            )}

            <dl className="facturas__datos">
              <div>
                <dt>Emisor</dt>
                <dd>
                  {datos.configuracion.emisor_nombre} · {datos.configuracion.emisor_rfc}
                </dd>
              </div>
              <div>
                <dt>Facturas emitidas</dt>
                <dd>{datos.facturas.length}</dd>
              </div>
              <div>
                <dt>Plazo para facturar</dt>
                <dd>{datos.configuracion.dias_para_facturar} días desde la compra</dd>
              </div>
            </dl>

            {datos.facturas.length === 0 ? (
              <p className="facturas__vacio">
                Todavía no hay facturas. Los clientes las generan en <strong>/factura</strong> con el número y el total
                de su ticket.
              </p>
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

                <p className="facturas__pie">
                  {facturas.length === 0
                    ? 'Ninguna factura coincide con la búsqueda.'
                    : `${facturas.length} ${facturas.length === 1 ? 'factura' : 'facturas'} · ${formatMoney(totalFacturado)} facturados`}
                </p>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default FacturasScreen

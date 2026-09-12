const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

const ACCESS_KEY = 'oso_tostadas_access'
const REFRESH_KEY = 'oso_tostadas_refresh'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY)
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

async function extraerMensajeError(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data.detail === 'string') return data.detail
    const primerCampo = Object.values(data)[0]
    if (Array.isArray(primerCampo)) return String(primerCampo[0])
    return 'Ocurrio un error al comunicarse con el servidor.'
  } catch {
    return 'Ocurrio un error al comunicarse con el servidor.'
  }
}

async function refrescarToken(): Promise<boolean> {
  const refresh = localStorage.getItem(REFRESH_KEY)
  if (!refresh) return false
  const response = await fetch(`${API_URL}/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })
  if (!response.ok) return false
  const data = await response.json()
  localStorage.setItem(ACCESS_KEY, data.access)
  return true
}

async function request<T>(path: string, options: RequestInit = {}, reintentado = false): Promise<T> {
  const access = getAccessToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (access) headers.Authorization = `Bearer ${access}`

  const response = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (response.status === 401 && !reintentado && getAccessToken()) {
    const refrescado = await refrescarToken()
    if (refrescado) return request<T>(path, options, true)
    clearTokens()
  }

  if (!response.ok) {
    throw new ApiError(response.status, await extraerMensajeError(response))
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export type EmpleadoMe = {
  id_empleado: number
  numero_empleado: string
  nombre: string
  correo: string
  rol: string
  id_sucursal: number
  sucursal: string
  estado: string
}

export type ProductoDisponible = {
  id_producto: number
  nombre: string
  precio: number
  stock: number
}

export type Turno = {
  id_turno: number
  fecha: string
  hora_inicio: string
  hora_fin: string | null
  estado: 'abierto' | 'cerrado'
  monto_inicial: number
  monto_esperado: number | null
  monto_contado: number | null
  diferencia: number | null
  empleado: number
  sucursal: number
}

export type DetalleVentaDto = {
  id_producto: number
  producto: string
  unidades: number
  precio_unitario: number
  subtotal: number
}

export type Pago = {
  id_pago: number
  metodo_pago: string
  monto: number
  fecha: string
  referencia: string
  venta: number
}

export type DevolucionDetalleDto = {
  id_producto: number
  producto: string
  cantidad: number
}

export type DevolucionApi = {
  id_devolucion: number
  fecha: string
  creado_en: string | null
  monto: number
  venta: number
  detalles: DevolucionDetalleDto[]
}

export type VentaApi = {
  id_venta: number
  fecha: string
  creado_en: string | null
  subtotal: number
  impuesto: number
  total: number
  estado: string
  turno: number
  detalles: DetalleVentaDto[]
  pagos: Pago[]
  devoluciones: DevolucionApi[]
}

export type Rol = {
  id_rol: number
  nombre_rol: string
}

export type EmpleadoAdmin = {
  id_empleado: number
  numero_empleado: string
  nombre: string
  correo: string
  telefono: string
  fecha_ingreso: string
  estado: 'activo' | 'inactivo'
  rol: string
  id_rol: number
  horario_dias: string
  horario_hora_inicio: string | null
  horario_hora_fin: string | null
}

export type Sucursal = {
  id_sucursal: number
  nombre: string
  direccion: string
  telefono: string
  estado: string
  hora_apertura: string | null
  hora_cierre: string | null
  fondo_caja_default: number
}

export type ProductoAdmin = {
  id_producto: number
  nombre: string
  precio: number
  estado: string
  stock: number
  stock_minimo: number
}

export type InsumoAdmin = {
  id_insumo: number
  nombre: string
  unidad_medida: string
  estado: string
  stock: number
  stock_minimo: number
  id_proveedor: number | null
  proveedor: string | null
}

export type Proveedor = {
  id_proveedor: number
  nombre: string
  insumo_principal: string
  direccion: string
  correo: string
  telefono: string
  proxima_entrega: string | null
  urgente: boolean
  estado: 'activo' | 'inactivo'
}

export type ReporteSemana = {
  dias: { fecha: string; ventas: number; tickets: number }[]
  productos: { nombre: string; cantidad: number; ingresos: number }[]
}

export type TurnoDashboard = {
  id_turno: number
  empleado: string
  hora_inicio: string
  hora_fin: string | null
  estado: 'abierto' | 'cerrado'
  ventas: number
  diferencia: number | null
}

export type Pendiente = {
  severidad: 'urgente' | 'aviso'
  texto: string
}

export type AdminDashboard = {
  fecha: string
  es_hoy: boolean
  resumen: { ventas_dia: number; turnos_activos: number; cortes_por_revisar: number }
  turnos: TurnoDashboard[]
  pendientes: Pendiente[]
}

export type TurnoDetalleAdmin = Turno & {
  empleado_nombre: string
  ventas: VentaApi[]
}

export type RegistroAuditoria = {
  id_registro: number
  actor: string
  accion: string
  detalle: string
  creado_en: string
}

// --- Cliente: consulta publica de ticket y facturacion ---

export type TicketPublico = {
  id_venta: number
  folio: number
  fecha: string
  creado_en: string | null
  total: number
  detalles: DetalleVentaDto[]
  facturado: boolean
}

export type UsoCfdi = 'G01' | 'G03' | 'P01'
export type RegimenFiscal = '616' | '621' | '612' | '601'

export type DatosFiscales = {
  rfc: string
  razon_social: string
  correo: string
  codigo_postal: string
  regimen_fiscal: RegimenFiscal
  uso_cfdi: UsoCfdi
}

export type FacturaGenerada = {
  folio_fiscal: string
  correo: string
  fecha_emision: string
  url_pdf: string
}

export const api = {
  async login(numeroEmpleado: string, password: string) {
    const data = await request<{ access: string; refresh: string }>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ numero_empleado: numeroEmpleado, password }),
    })
    setTokens(data.access, data.refresh)
    return data
  },

  logout() {
    clearTokens()
  },

  me() {
    return request<EmpleadoMe>('/me/')
  },

  productosDisponibles() {
    return request<ProductoDisponible[]>('/productos/')
  },

  async turnoActual() {
    const turno = await request<Turno | undefined>('/turnos/actual/')
    return turno ?? null
  },

  abrirTurno(montoInicial: number) {
    return request<Turno>('/turnos/abrir/', {
      method: 'POST',
      body: JSON.stringify({ monto_inicial: montoInicial }),
    })
  },

  cerrarTurno(montoContado: number) {
    return request<Turno>('/turnos/cerrar/', {
      method: 'POST',
      body: JSON.stringify({ monto_contado: montoContado }),
    })
  },

  listarVentasTurno() {
    return request<VentaApi[]>('/ventas/')
  },

  crearVenta(detalles: { id_producto: number; unidades: number }[]) {
    return request<VentaApi>('/ventas/', {
      method: 'POST',
      body: JSON.stringify({ detalles }),
    })
  },

  registrarPago(idVenta: number, metodoPago: 'efectivo' | 'tarjeta', monto: number) {
    return request<Pago>(`/ventas/${idVenta}/pagos/`, {
      method: 'POST',
      body: JSON.stringify({ metodo_pago: metodoPago, monto }),
    })
  },

  registrarDevolucion(idVenta: number, detalles: { id_producto: number; cantidad: number }[]) {
    return request<DevolucionApi>(`/ventas/${idVenta}/devoluciones/`, {
      method: 'POST',
      body: JSON.stringify({ detalles }),
    })
  },

  // Descarga el recibo de compra en PDF (no es un CFDI/factura fiscal) y dispara
  // la descarga en el navegador. No usa `request()` porque la respuesta es binaria.
  async descargarRecibo(idVenta: number) {
    const access = getAccessToken()
    const response = await fetch(`${API_URL}/ventas/${idVenta}/recibo/`, {
      headers: access ? { Authorization: `Bearer ${access}` } : undefined,
    })
    if (!response.ok) {
      throw new ApiError(response.status, await extraerMensajeError(response))
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = `recibo-${idVenta}.pdf`
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    URL.revokeObjectURL(url)
  },

  // --- Admin: usuarios ---

  roles() {
    return request<Rol[]>('/roles/')
  },

  empleados() {
    return request<EmpleadoAdmin[]>('/empleados/')
  },

  crearEmpleado(datos: { nombre: string; correo: string; telefono: string; id_rol: number; password?: string }) {
    return request<EmpleadoAdmin & { password_temporal?: string }>('/empleados/', {
      method: 'POST',
      body: JSON.stringify(datos),
    })
  },

  alternarEstadoEmpleado(idEmpleado: number) {
    return request<EmpleadoAdmin>(`/empleados/${idEmpleado}/alternar-estado/`, { method: 'POST' })
  },

  restablecerPasswordEmpleado(idEmpleado: number) {
    return request<{ password_temporal: string }>(`/empleados/${idEmpleado}/restablecer-password/`, {
      method: 'POST',
    })
  },

  actualizarHorarioEmpleado(
    idEmpleado: number,
    datos: { horario_dias: string; horario_hora_inicio: string | null; horario_hora_fin: string | null },
  ) {
    return request<EmpleadoAdmin>(`/empleados/${idEmpleado}/horario/`, {
      method: 'PATCH',
      body: JSON.stringify(datos),
    })
  },

  // --- Admin: sucursal / configuracion ---

  miSucursal() {
    return request<Sucursal>('/sucursales/mia/')
  },

  actualizarMiSucursal(datos: Partial<Pick<Sucursal, 'nombre' | 'direccion' | 'telefono' | 'hora_apertura' | 'hora_cierre' | 'fondo_caja_default'>>) {
    return request<Sucursal>('/sucursales/mia/', {
      method: 'PATCH',
      body: JSON.stringify(datos),
    })
  },

  // --- Admin: inventario ---

  productosAdmin() {
    return request<ProductoAdmin[]>('/admin/productos/')
  },

  registrarProduccion(idProducto: number, cantidad: number) {
    return request<ProductoAdmin>(`/admin/productos/${idProducto}/produccion/`, {
      method: 'POST',
      body: JSON.stringify({ cantidad }),
    })
  },

  insumosAdmin() {
    return request<InsumoAdmin[]>('/admin/insumos/')
  },

  crearInsumo(datos: {
    nombre: string
    unidad_medida: string
    id_proveedor: number | null
    stock_minimo: number
    stock_inicial: number
  }) {
    return request<InsumoAdmin>('/admin/insumos/', {
      method: 'POST',
      body: JSON.stringify(datos),
    })
  },

  registrarEntradaInsumo(idInsumo: number, cantidad: number, idProveedor: number | null) {
    return request<InsumoAdmin>(`/admin/insumos/${idInsumo}/entrada/`, {
      method: 'POST',
      body: JSON.stringify({ cantidad, id_proveedor: idProveedor }),
    })
  },

  // --- Admin: proveedores ---

  proveedores() {
    return request<Proveedor[]>('/proveedores/')
  },

  crearProveedor(datos: { nombre: string; insumo_principal: string; direccion: string; correo: string; telefono: string }) {
    return request<Proveedor>('/proveedores/', {
      method: 'POST',
      body: JSON.stringify(datos),
    })
  },

  alternarEstadoProveedor(idProveedor: number) {
    return request<Proveedor>(`/proveedores/${idProveedor}/alternar-estado/`, { method: 'POST' })
  },

  // --- Admin: reportes y dashboard ---

  reporteSemana() {
    return request<ReporteSemana>('/reportes/semana/')
  },

  dashboardAdmin(fecha?: string) {
    return request<AdminDashboard>(`/admin/dashboard/${fecha ? `?fecha=${fecha}` : ''}`)
  },

  auditoria() {
    return request<RegistroAuditoria[]>('/auditoria/')
  },

  turnoDetalleAdmin(idTurno: number) {
    return request<TurnoDetalleAdmin>(`/admin/turnos/${idTurno}/`)
  },

  // --- Cliente ---

  buscarTicketPublico(folio: string) {
    return request<TicketPublico>(`/publico/tickets/${folio}/`)
  },

  generarFacturaPublica(idVenta: number, datos: DatosFiscales) {
    return request<FacturaGenerada>(`/publico/tickets/${idVenta}/factura/`, {
      method: 'POST',
      body: JSON.stringify(datos),
    })
  },
}

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

export type Venta = {
  id_venta: number
  fecha: string
  subtotal: number
  impuesto: number
  total: number
  estado: string
  turno: number
  detalles: DetalleVentaDto[]
}

export type Pago = {
  id_pago: number
  metodo_pago: string
  monto: number
  fecha: string
  referencia: string
  venta: number
}

export const api = {
  async login(correo: string, password: string) {
    const data = await request<{ access: string; refresh: string }>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ correo, password }),
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

  crearVenta(detalles: { id_producto: number; unidades: number }[]) {
    return request<Venta>('/ventas/', {
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
}

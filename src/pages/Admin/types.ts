export type EstadoTurno = 'abierto' | 'cerrado'
export type EstadoCorte = 'en curso' | 'cuadrada' | 'pendiente' | 'faltante'

export type TurnoResumen = {
  id: string
  cajero: string
  caja: string
  jornada: string
  estado: EstadoTurno
  horario: string
  ventas: number
  corte: EstadoCorte
  diferencia?: number
}

export type Severidad = 'urgente' | 'aviso' | 'info'

export type Pendiente = {
  id: number
  severidad: Severidad
  texto: string
}

export type RolUsuario = 'admin' | 'vendedor'
export type EstadoUsuario = 'activo' | 'inactivo'

export type Usuario = {
  id: string
  nombre: string
  usuario: string
  correo: string
  telefono: string
  rol: RolUsuario
  fechaIngreso: string
  estado: EstadoUsuario
}

export type EstadoInsumo = 'bien' | 'bajo' | 'agotado'

export type Insumo = {
  id: string
  nombre: string
  cantidad: number
  unidad: string
  minimo: number
  proveedorId: string
}

export type EstadoProducto = 'bien' | 'bajo' | 'agotado'

export type Producto = {
  id: string
  nombre: string
  precio: number
  cantidad: number
  minimo: number
}

export type EstadoProveedor = 'activo' | 'inactivo'

export type Proveedor = {
  id: string
  nombre: string
  insumo: string
  contacto: string
  correo: string
  direccion: string
  proximaEntrega: string
  estado: EstadoProveedor
  urgente?: boolean
}

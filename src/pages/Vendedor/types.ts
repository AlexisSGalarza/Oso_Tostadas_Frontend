export type MetodoPago = 'efectivo' | 'tarjeta'

export type ItemVenta = {
  nombre: string
  precio: number
  cantidad: number
}

export type Venta = {
  id: number
  hora: Date
  items: ItemVenta[]
  total: number
  metodoPago: MetodoPago
  efectivoRecibido?: number
  cambio?: number
}

export type Devolucion = {
  id: number
  ventaId: number
  hora: Date
  items: ItemVenta[]
  total: number
  metodoPago: MetodoPago
}

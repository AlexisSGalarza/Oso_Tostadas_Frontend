export type MetodoPago = 'efectivo' | 'tarjeta'

export type ItemVenta = {
  id_producto?: number
  nombre: string
  precio: number
  cantidad: number
}

export type Venta = {
  id: number
  idVenta?: number
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

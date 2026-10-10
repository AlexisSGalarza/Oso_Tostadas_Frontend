// Todas las fechas/horas se muestran en hora de Mexico sin importar la
// zona horaria del dispositivo/navegador de quien las este viendo.
export const ZONA_HORARIA_MX = 'America/Mexico_City'

export function formatClock(date: Date) {
  return date.toLocaleTimeString('es-MX', { hour12: false, timeZone: ZONA_HORARIA_MX })
}

export function formatFecha(date: Date, opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  return date.toLocaleDateString('es-MX', { ...opciones, timeZone: ZONA_HORARIA_MX })
}

// Montos cerrados sin centavos ($120); con centavos siempre a dos decimales ($34.80, no $34.8).
export function formatMoney(amount: number) {
  const tieneCentavos = Math.round(amount * 100) % 100 !== 0
  return amount.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: tieneCentavos ? 2 : 0,
    maximumFractionDigits: 2,
  })
}

export function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

export function formatTicket(numero: number) {
  return `TICKET N.° ${String(numero).padStart(5, '0')}`
}

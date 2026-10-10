import type { DatosFiscales, RegimenFiscal, UsoCfdi } from './api'

// Subconjunto de los catalogos del SAT (CFDI 4.0) que ofrece el punto de venta.
export const USOS_CFDI: { valor: UsoCfdi; etiqueta: string }[] = [
  { valor: 'G03', etiqueta: 'G03 · Gastos en general' },
  { valor: 'G01', etiqueta: 'G01 · Adquisición de mercancías' },
  { valor: 'S01', etiqueta: 'S01 · Sin efectos fiscales' },
]

export const REGIMENES: { valor: RegimenFiscal; etiqueta: string }[] = [
  { valor: '616', etiqueta: '616 · Sin obligaciones fiscales' },
  { valor: '626', etiqueta: '626 · Régimen Simplificado de Confianza' },
  { valor: '612', etiqueta: '612 · Actividades empresariales y profesionales' },
  { valor: '605', etiqueta: '605 · Sueldos y salarios' },
  { valor: '601', etiqueta: '601 · General de ley personas morales' },
  { valor: '603', etiqueta: '603 · Personas morales sin fines de lucro' },
  { valor: '606', etiqueta: '606 · Arrendamiento' },
  { valor: '621', etiqueta: '621 · Incorporación fiscal' },
  { valor: '625', etiqueta: '625 · Plataformas tecnológicas' },
]

// El SAT solo admite el uso S01 para estos regimenes (de los usos que ofrecemos).
export const REGIMENES_SOLO_S01: RegimenFiscal[] = ['616', '605']

export const RFC_PUBLICO_GENERAL = 'XAXX010101000'

export const DATOS_FISCALES_VACIOS: DatosFiscales = {
  rfc: '',
  razon_social: '',
  correo: '',
  codigo_postal: '',
  regimen_fiscal: '616',
  uso_cfdi: 'S01',
}

export function soloDigitos(valor: string) {
  return valor.replace(/\D/g, '')
}

export function rfcValido(rfc: string) {
  return /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc.trim().toUpperCase())
}

export function correoValido(correo: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())
}

// Devuelve el primer problema de los datos, o '' si estan completos.
export function errorDeDatosFiscales(datos: DatosFiscales, correoObligatorio: boolean) {
  if (!datos.razon_social.trim()) return 'Escribe la razón social o el nombre completo de quien recibe la factura.'
  if (!rfcValido(datos.rfc)) return 'Ese RFC no tiene un formato válido. Revísalo e intenta de nuevo.'
  if (soloDigitos(datos.codigo_postal).length !== 5) return 'El código postal debe tener 5 dígitos.'
  if (datos.correo.trim() ? !correoValido(datos.correo) : correoObligatorio) {
    return 'Escribe un correo válido para enviar la factura.'
  }
  return ''
}

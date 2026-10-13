import { useEffect, useRef } from 'react'

// Un lector fisico (USB o Bluetooth) se comporta como un teclado que escribe el
// codigo muy rapido. Lo distinguimos de una persona por la velocidad: una pausa
// mayor a PAUSA_MAXIMA_MS entre teclas reinicia la lectura.
const PAUSA_MAXIMA_MS = 250
const LARGO_MINIMO = 3
// Algunos lectores no mandan Enter al final: si llega una rafaga asi de larga y
// luego silencio, tambien cuenta como lectura.
const LARGO_SIN_ENTER = 6
const SILENCIO_FINAL_MS = 300

function esCampoDeTexto(elemento: EventTarget | null) {
  if (!(elemento instanceof HTMLElement)) return false
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(elemento.tagName) || elemento.isContentEditable
}

/**
 * Escucha lecturas del lector de codigos en toda la pantalla, sin que el cajero
 * tenga que tocar antes ningun campo. Si el foco esta en un campo de texto no
 * interviene: ahi el lector escribe como cualquier teclado.
 */
export function useLectorCodigos(alLeer: (codigo: string) => void, activo = true) {
  const alLeerRef = useRef(alLeer)

  useEffect(() => {
    alLeerRef.current = alLeer
  })

  useEffect(() => {
    if (!activo) return
    let lectura = ''
    let ultimaTecla = 0
    let espera = 0

    function entregar() {
      window.clearTimeout(espera)
      const codigo = lectura
      lectura = ''
      if (codigo.length >= LARGO_MINIMO) alLeerRef.current(codigo)
    }

    function alTeclear(event: KeyboardEvent) {
      if (esCampoDeTexto(event.target) || event.ctrlKey || event.metaKey || event.altKey) return
      const ahora = performance.now()
      if (ahora - ultimaTecla > PAUSA_MAXIMA_MS) lectura = ''
      ultimaTecla = ahora
      window.clearTimeout(espera)

      // El lector termina con Enter o con Tab, segun como venga configurado.
      if (event.key === 'Enter' || event.key === 'Tab') {
        if (lectura.length >= LARGO_MINIMO) {
          // Evita que la tecla final "presione" el ultimo boton que se toco o mueva el foco.
          event.preventDefault()
          event.stopPropagation()
          entregar()
        }
        lectura = ''
      } else if (event.key.length === 1) {
        lectura += event.key
        if (lectura.length >= LARGO_SIN_ENTER) espera = window.setTimeout(entregar, SILENCIO_FINAL_MS)
      }
    }

    window.addEventListener('keydown', alTeclear, true)
    return () => {
      window.clearTimeout(espera)
      window.removeEventListener('keydown', alTeclear, true)
    }
  }, [activo])
}

// Deja solo letras y numeros, en mayusculas. Un lector configurado para teclado
// en ingles escribe otro simbolo en lugar del guion cuando la computadora esta
// en español ("OSO-0010" llega como "OSO'0010"), asi que los simbolos no cuentan.
export function normalizarCodigo(codigo: string) {
  return codigo.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

// Compara lo leido contra el codigo guardado. Ademas de ignorar simbolos, acepta
// que un UPC-A (12 digitos) llegue como EAN-13 con un cero al inicio, o al reves.
export function mismoCodigo(a: string | null | undefined, b: string) {
  if (!a) return false
  const x = normalizarCodigo(a)
  const y = normalizarCodigo(b)
  if (!x || !y) return false
  return x === y || `0${x}` === y || x === `0${y}`
}

// Codigo EAN-13 de uso interno para paquetes sin codigo de fabrica. El prefijo 2
// esta reservado para uso dentro de la tienda, asi que no choca con productos reales.
export function generarEan13Interno(idProducto: number) {
  const doce = `20${String(idProducto).padStart(10, '0')}`
  const suma = [...doce].reduce((total, d, i) => total + Number(d) * (i % 2 ? 3 : 1), 0)
  return `${doce}${(10 - (suma % 10)) % 10}`
}

let contexto: AudioContext | null = null

// Pitido corto para confirmar la lectura sin mirar la pantalla (grave si hubo error).
export function sonarLectura(correcta: boolean) {
  try {
    contexto ??= new AudioContext()
    const oscilador = contexto.createOscillator()
    const volumen = contexto.createGain()
    oscilador.frequency.value = correcta ? 1250 : 240
    volumen.gain.value = 0.08
    oscilador.connect(volumen).connect(contexto.destination)
    oscilador.start()
    oscilador.stop(contexto.currentTime + (correcta ? 0.09 : 0.25))
  } catch {
    // Sin audio disponible: el aviso en pantalla es suficiente.
  }
  navigator.vibrate?.(correcta ? 50 : [80, 60, 80])
}

import { useEffect, useRef } from 'react'

// Un lector fisico (USB o Bluetooth) se comporta como un teclado que escribe el
// codigo muy rapido y termina con Enter. Lo distinguimos de una persona por la
// velocidad: mas de PAUSA_MAXIMA_MS entre teclas reinicia la lectura.
const PAUSA_MAXIMA_MS = 120
const LARGO_MINIMO = 3

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

    function alTeclear(event: KeyboardEvent) {
      if (esCampoDeTexto(event.target) || event.ctrlKey || event.metaKey || event.altKey) return
      const ahora = performance.now()
      if (ahora - ultimaTecla > PAUSA_MAXIMA_MS) lectura = ''
      ultimaTecla = ahora

      if (event.key === 'Enter') {
        if (lectura.length >= LARGO_MINIMO) {
          // Evita que el Enter del lector "presione" el ultimo boton que se toco.
          event.preventDefault()
          event.stopPropagation()
          alLeerRef.current(lectura)
        }
        lectura = ''
      } else if (event.key.length === 1) {
        lectura += event.key
      }
    }

    window.addEventListener('keydown', alTeclear, true)
    return () => window.removeEventListener('keydown', alTeclear, true)
  }, [activo])
}

// Un lector puede entregar un UPC-A (12 digitos) como EAN-13 con un cero al inicio, o al reves.
export function mismoCodigo(a: string | null | undefined, b: string) {
  if (!a) return false
  const x = a.trim().toUpperCase()
  const y = b.trim().toUpperCase()
  return x === y || `0${x}` === y || x === `0${y}`
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

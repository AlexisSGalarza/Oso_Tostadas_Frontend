import { useEffect, useRef, useState } from 'react'

const DURACION_MS = 700

// Lleva una cifra de su valor anterior al nuevo con una animacion corta.
// Con "reducir movimiento" activado muestra el valor final de inmediato.
export function useConteo(valor: number) {
  // Arranca en cero para que la cifra "suba" al cargar la pantalla.
  const [mostrado, setMostrado] = useState(0)
  const desdeRef = useRef(0)

  useEffect(() => {
    const desde = desdeRef.current
    desdeRef.current = valor
    if (desde === valor || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMostrado(valor)
      return
    }
    const inicio = performance.now()
    let cuadro = 0
    const avanzar = (ahora: number) => {
      const t = Math.min((ahora - inicio) / DURACION_MS, 1)
      const suavizado = 1 - (1 - t) ** 3
      setMostrado(desde + (valor - desde) * suavizado)
      if (t < 1) cuadro = requestAnimationFrame(avanzar)
    }
    cuadro = requestAnimationFrame(avanzar)
    return () => cancelAnimationFrame(cuadro)
  }, [valor])

  return mostrado
}

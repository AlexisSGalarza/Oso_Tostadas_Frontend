import { useEffect, useRef, useState } from 'react'
import Icono from './Icono'
import './EscanerCamara.css'

type Aviso = { tipo: 'ok' | 'error'; texto: string }

type Props = {
  titulo?: string
  // Ultimo resultado, para confirmar la lectura sin cerrar la camara.
  aviso?: Aviso | null
  onCodigo: (codigo: string) => void
  onCerrar: () => void
}

// Formatos que puede traer un paquete: los de tienda (EAN/UPC) y los que imprime el sistema.
const FORMATOS = ['EAN13', 'EAN8', 'UPCA', 'UPCE', 'Code128', 'Code39', 'ITF', 'Codabar'] as const
// No registrar dos veces el mismo paquete por dejarlo un instante de mas frente a la camara.
const PAUSA_MISMO_CODIGO_MS = 1800
const PAUSA_ENTRE_CUADROS_MS = 90
// Mas resolucion no mejora la lectura y si la vuelve lenta en telefonos modestos.
const ANCHO_MAXIMO = 1280
const SEGUNDOS_PARA_AYUDA = 8

function mensajeDeError(error: unknown) {
  const nombre = error instanceof DOMException ? error.name : ''
  if (nombre === 'NotAllowedError') {
    return 'No hay permiso para usar la cámara. Actívalo en los ajustes del navegador para este sitio e intenta de nuevo.'
  }
  if (nombre === 'NotFoundError' || nombre === 'OverconstrainedError') {
    return 'Este dispositivo no tiene una cámara disponible.'
  }
  if (nombre === 'NotReadableError') {
    return 'Otra aplicación está usando la cámara. Ciérrala e intenta de nuevo.'
  }
  return 'No se pudo abrir la cámara.'
}

function EscanerCamara({ titulo = 'Escanear con la cámara', aviso, onCodigo, onCerrar }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onCodigoRef = useRef(onCodigo)
  const [estado, setEstado] = useState<'iniciando' | 'leyendo' | 'error'>('iniciando')
  const [error, setError] = useState('')
  const [tardando, setTardando] = useState(false)

  // Si pasan unos segundos sin leer nada, se muestra un consejo; cada lectura lo reinicia.
  useEffect(() => {
    if (estado !== 'leyendo') return
    const id = setTimeout(() => setTardando(true), SEGUNDOS_PARA_AYUDA * 1000)
    return () => {
      clearTimeout(id)
      setTardando(false)
    }
  }, [estado, aviso])

  useEffect(() => {
    onCodigoRef.current = onCodigo
  })

  useEffect(() => {
    let cancelado = false
    let stream: MediaStream | null = null
    let detener: (() => void) | null = null
    let ultimo = { codigo: '', momento: 0 }

    function entregar(codigo: string) {
      const ahora = Date.now()
      if (!codigo || (codigo === ultimo.codigo && ahora - ultimo.momento < PAUSA_MISMO_CODIGO_MS)) return
      ultimo = { codigo, momento: ahora }
      onCodigoRef.current(codigo)
    }

    async function iniciar() {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError(
          'El navegador solo permite usar la cámara en páginas seguras (https) o en localhost. Abre el punto de venta con https para escanear desde el teléfono.',
        )
        setEstado('error')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        })
      } catch (err) {
        if (cancelado) return
        setError(mensajeDeError(err))
        setEstado('error')
        return
      }
      const video = videoRef.current
      if (cancelado || !video) {
        stream.getTracks().forEach((pista) => pista.stop())
        return
      }
      video.srcObject = stream
      await video.play().catch(() => {})

      // Enfoque continuo donde el dispositivo lo permite (casi todos los telefonos).
      const pista = stream.getVideoTracks()[0]
      pista
        ?.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] })
        .catch(() => {})

      // ZXing (compilado a WebAssembly) lee igual en todos los navegadores, tolera
      // etiquetas inclinadas o algo desenfocadas, y se descarga solo al abrir la camara.
      const [{ prepareZXingModule, readBarcodes }, { default: wasmUrl }] = await Promise.all([
        import('zxing-wasm/reader'),
        import('zxing-wasm/reader/zxing_reader.wasm?url'),
      ])
      if (cancelado) return
      prepareZXingModule({
        overrides: { locateFile: (ruta: string, prefijo: string) => (ruta.endsWith('.wasm') ? wasmUrl : prefijo + ruta) },
      })

      const lienzo = document.createElement('canvas')
      const pincel = lienzo.getContext('2d', { willReadFrequently: true })
      let activo = true
      const leer = async () => {
        if (!activo) return
        if (pincel && video.readyState >= 2 && video.videoWidth > 0) {
          const escala = Math.min(1, ANCHO_MAXIMO / video.videoWidth)
          lienzo.width = Math.round(video.videoWidth * escala)
          lienzo.height = Math.round(video.videoHeight * escala)
          pincel.drawImage(video, 0, 0, lienzo.width, lienzo.height)
          const hallados = await readBarcodes(pincel.getImageData(0, 0, lienzo.width, lienzo.height), {
            formats: [...FORMATOS],
            tryHarder: true,
            tryRotate: true,
            tryDownscale: true,
            tryDenoise: true,
            maxNumberOfSymbols: 1,
          }).catch(() => [])
          if (activo && hallados[0]?.text) entregar(hallados[0].text)
        }
        setTimeout(leer, PAUSA_ENTRE_CUADROS_MS)
      }
      leer()
      detener = () => {
        activo = false
      }
      if (!cancelado) setEstado('leyendo')
    }

    iniciar().catch(() => {
      if (cancelado) return
      setError('No se pudo iniciar el lector de códigos.')
      setEstado('error')
    })

    return () => {
      cancelado = true
      detener?.()
      stream?.getTracks().forEach((pista) => pista.stop())
    }
  }, [])

  useEffect(() => {
    function alPresionar(event: KeyboardEvent) {
      if (event.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [onCerrar])

  return (
    <div className="escaner" role="dialog" aria-modal="true" aria-labelledby="escaner-titulo">
      <div className="escaner__hoja">
        <header className="escaner__cabeza">
          <h2 id="escaner-titulo">{titulo}</h2>
          <button type="button" className="escaner__cerrar" onClick={onCerrar} aria-label="Cerrar cámara" autoFocus>
            <Icono nombre="cerrar" />
          </button>
        </header>

        <div className="escaner__visor">
          <video ref={videoRef} muted playsInline />
          {estado === 'leyendo' && <span className="escaner__guia" aria-hidden="true" />}
          {estado === 'iniciando' && <p className="escaner__estado">Abriendo la cámara…</p>}
          {estado === 'error' && (
            <p className="escaner__estado escaner__estado--error" role="alert">
              {error}
            </p>
          )}
        </div>

        <p className={`escaner__aviso ${aviso ? `is-${aviso.tipo}` : ''}`} role="status" aria-live="polite">
          {aviso?.texto ?? (estado === 'leyendo' ? 'Pon el código de barras dentro del recuadro.' : '\u00a0')}
        </p>

        {tardando && (
          <p className="escaner__consejo">
            ¿No lo lee? Acerca o aleja el paquete hasta que las barras se vean nítidas, evita reflejos y busca más luz.
          </p>
        )}

        <button type="button" className="escaner__listo" onClick={onCerrar}>
          Listo
        </button>
      </div>
    </div>
  )
}

export default EscanerCamara

import { useEffect, useRef, useState } from 'react'
import Icono from './Icono'
import './EscanerCamara.css'

export type ResultadoLectura = { tipo: 'ok' | 'error'; texto: string }

type Props = {
  encendida: boolean
  onCambiar: (encendida: boolean) => void
  // Recibe cada codigo leido y responde que paso con el, para confirmarlo sobre la imagen.
  onCodigo: (codigo: string) => ResultadoLectura | null
}

// Formatos que puede traer un paquete: los de tienda (EAN/UPC) y los que imprime el sistema.
const FORMATOS = ['EAN13', 'EAN8', 'UPCA', 'UPCE', 'Code128', 'Code39', 'ITF', 'Codabar'] as const
// Despues de cada lectura la camara descansa este tiempo y muestra que registro.
const PAUSA_TRAS_LECTURA_MS = 1400
// El mismo paquete no vuelve a contar mientras siga a la vista: hay que retirarlo
// (dejar de verlo este tiempo) y mostrarlo otra vez para agregar otro igual.
const AUSENCIA_PARA_REPETIR_MS = 900
const PAUSA_ENTRE_CUADROS_MS = 90
// Mas resolucion no mejora la lectura y si la vuelve lenta en telefonos modestos.
const ANCHO_MAXIMO = 1280

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

function EscanerCamara({ encendida, onCambiar, onCodigo }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onCodigoRef = useRef(onCodigo)
  const onCambiarRef = useRef(onCambiar)
  const [estado, setEstado] = useState<'apagada' | 'iniciando' | 'leyendo'>('apagada')
  const [error, setError] = useState('')
  const [confirmacion, setConfirmacion] = useState<(ResultadoLectura & { clave: number }) | null>(null)

  useEffect(() => {
    onCodigoRef.current = onCodigo
    onCambiarRef.current = onCambiar
  })

  useEffect(() => {
    if (!encendida) return
    let cancelado = false
    let stream: MediaStream | null = null
    let detener: (() => void) | null = null
    let temporizador = 0
    let pausaHasta = 0
    let ultimo = { codigo: '', visto: 0 }

    function fallar(mensaje: string) {
      if (cancelado) return
      setError(mensaje)
      onCambiarRef.current(false)
    }

    function alDetectar(codigo: string) {
      const ahora = Date.now()
      const sigueALaVista = codigo === ultimo.codigo && ahora - ultimo.visto < AUSENCIA_PARA_REPETIR_MS
      if (codigo === ultimo.codigo) ultimo.visto = ahora
      if (ahora < pausaHasta || sigueALaVista) return

      ultimo = { codigo, visto: ahora }
      pausaHasta = ahora + PAUSA_TRAS_LECTURA_MS
      const resultado = onCodigoRef.current(codigo)
      if (!resultado) return
      setConfirmacion({ ...resultado, clave: ahora })
      window.clearTimeout(temporizador)
      temporizador = window.setTimeout(() => setConfirmacion(null), PAUSA_TRAS_LECTURA_MS)
    }

    async function iniciar() {
      setError('')
      setEstado('iniciando')
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        fallar('El navegador solo permite usar la cámara en páginas seguras (https) o en localhost.')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        })
      } catch (err) {
        fallar(mensajeDeError(err))
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
      // etiquetas inclinadas o algo desenfocadas, y se descarga solo al encender la camara.
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
          if (activo && hallados[0]?.text) alDetectar(hallados[0].text)
        }
        setTimeout(leer, PAUSA_ENTRE_CUADROS_MS)
      }
      leer()
      detener = () => {
        activo = false
      }
      setEstado('leyendo')
    }

    iniciar().catch(() => fallar('No se pudo iniciar el lector de códigos.'))

    return () => {
      cancelado = true
      window.clearTimeout(temporizador)
      detener?.()
      stream?.getTracks().forEach((pista) => pista.stop())
      setEstado('apagada')
      setConfirmacion(null)
    }
  }, [encendida])

  return (
    <section className={`camara ${encendida ? 'is-encendida' : ''}`} aria-label="Cámara para leer códigos">
      <div className="camara__visor">
        <video ref={videoRef} muted playsInline hidden={!encendida} />

        {!encendida && (
          <div className="camara__apagada">
            <Icono nombre="camara" />
            <span className={error ? 'camara__error' : ''} role={error ? 'alert' : undefined}>
              {error || 'Cámara apagada'}
            </span>
            <button
              type="button"
              className="camara__boton"
              onClick={() => {
                setError('')
                onCambiar(true)
              }}
            >
              {error ? 'Intentar de nuevo' : 'Encender'}
            </button>
          </div>
        )}

        {encendida && (
          <button type="button" className="camara__boton camara__boton--apagar" onClick={() => onCambiar(false)}>
            <span className={`camara__luz ${estado === 'leyendo' ? 'is-viva' : ''}`} aria-hidden="true" />
            Apagar
          </button>
        )}
        {estado === 'iniciando' && <span className="camara__abriendo">Abriendo la cámara…</span>}
        {estado === 'leyendo' && !confirmacion && <span className="camara__guia" aria-hidden="true" />}
        {confirmacion && (
          <span key={confirmacion.clave} className={`camara__confirmacion is-${confirmacion.tipo}`}>
            <Icono nombre={confirmacion.tipo === 'ok' ? 'palomita' : 'cerrar'} />
            <span>{confirmacion.texto}</span>
            <span className="camara__cuenta" style={{ animationDuration: `${PAUSA_TRAS_LECTURA_MS}ms` }} />
          </span>
        )}
      </div>

      {/* Los lectores de pantalla anuncian cada registro aunque no vean la imagen. */}
      <span className="solo-lectores" role="status" aria-live="polite">
        {confirmacion?.texto}
      </span>
    </section>
  )
}

export default EscanerCamara

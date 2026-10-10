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

// La API nativa aun no viene en los tipos de TypeScript.
type DetectorNativo = { detect: (fuente: HTMLVideoElement) => Promise<{ rawValue: string }[]> }
type ConstructorDetector = {
  new (opciones?: { formats: string[] }): DetectorNativo
  getSupportedFormats?: () => Promise<string[]>
}

const FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'codabar', 'qr_code']
// No registrar dos veces el mismo paquete por dejarlo un instante de mas frente a la camara.
const PAUSA_MISMO_CODIGO_MS = 1800

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
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
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

      const Detector = (window as unknown as { BarcodeDetector?: ConstructorDetector }).BarcodeDetector
      if (Detector) {
        // Chrome y Android traen el lector integrado: es mas rapido y no descarga nada.
        const soportados = (await Detector.getSupportedFormats?.().catch(() => null)) ?? FORMATOS
        const detector = new Detector({ formats: FORMATOS.filter((formato) => soportados.includes(formato)) })
        let activo = true
        const leer = async () => {
          if (!activo) return
          if (video.readyState >= 2) {
            const hallados = await detector.detect(video).catch(() => [])
            if (hallados[0]) entregar(hallados[0].rawValue)
          }
          setTimeout(leer, 160)
        }
        leer()
        detener = () => {
          activo = false
        }
      } else {
        // iPhone, Safari y Firefox no lo traen: se usa ZXing, que se descarga solo cuando hace falta.
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        if (cancelado) return
        const controles = await new BrowserMultiFormatReader().decodeFromStream(stream, video, (resultado) => {
          if (resultado) entregar(resultado.getText())
        })
        detener = () => controles.stop()
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
          {aviso?.texto ?? (estado === 'leyendo' ? 'Acerca el código de barras al recuadro.' : '\u00a0')}
        </p>

        <button type="button" className="escaner__listo" onClick={onCerrar}>
          Listo
        </button>
      </div>
    </div>
  )
}

export default EscanerCamara

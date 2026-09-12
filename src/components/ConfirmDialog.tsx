import { useEffect, useRef } from 'react'
import './ConfirmDialog.css'

type Props = {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  confirming?: boolean
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'default',
  confirming = false,
  onConfirm,
  onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    confirmRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="confirm__overlay" onClick={onCancel}>
      <div
        className="confirm__card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-titulo"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-titulo" className="confirm__titulo">
          {title}
        </h2>
        {message && <p className="confirm__mensaje">{message}</p>}
        <div className="confirm__acciones">
          <button type="button" className="confirm__cancelar" onClick={onCancel} disabled={confirming}>
            {cancelLabel}
          </button>
          <button
            type="button"
            ref={confirmRef}
            className={`confirm__confirmar ${tone === 'danger' ? 'is-peligro' : ''}`}
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? 'Un momento…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog

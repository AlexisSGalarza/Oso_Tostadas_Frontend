import './NumericKeypad.css'

type Props = {
  value: string
  onChange: (value: string) => void
  quickAmounts?: number[]
  onQuickAmount?: (amount: number) => void
  className?: string
}

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫']

function NumericKeypad({ value, onChange, quickAmounts, onQuickAmount, className }: Props) {
  function presionar(tecla: string) {
    if (tecla === '⌫') {
      onChange(value.slice(0, -1))
      return
    }
    if (tecla === '.') {
      if (value.includes('.')) return
      onChange(value === '' ? '0.' : `${value}.`)
      return
    }
    if (value === '0') {
      onChange(tecla)
      return
    }
    const decimales = value.split('.')[1]
    if (decimales && decimales.length >= 2) return
    onChange(value + tecla)
  }

  return (
    <div className={`keypad ${className ?? ''}`}>
      {quickAmounts && quickAmounts.length > 0 && (
        <div className="keypad__rapidos">
          {quickAmounts.map((monto) => (
            <button
              key={monto}
              type="button"
              className="keypad__rapido"
              onClick={() => onQuickAmount?.(monto)}
            >
              ${monto}
            </button>
          ))}
        </div>
      )}
      <div className="keypad__teclas">
        {TECLAS.map((tecla) => (
          <button
            key={tecla}
            type="button"
            className={`keypad__tecla ${tecla === '⌫' ? 'keypad__tecla--borrar' : ''}`}
            onClick={() => presionar(tecla)}
            aria-label={tecla === '⌫' ? 'Borrar' : tecla === '.' ? 'Punto decimal' : `Dígito ${tecla}`}
          >
            {tecla}
          </button>
        ))}
      </div>
    </div>
  )
}

export default NumericKeypad

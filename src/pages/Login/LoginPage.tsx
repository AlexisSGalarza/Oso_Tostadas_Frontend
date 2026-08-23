import { useEffect, useState, type FormEvent } from 'react'
import BearStamp from './BearStamp'
import './LoginPage.css'

function formatClock(date: Date) {
  return date.toLocaleTimeString('es-MX', { hour12: false })
}

function LoginPage() {
  const [usuario, setUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [clock, setClock] = useState(() => formatClock(new Date()))

  useEffect(() => {
    const id = setInterval(() => setClock(formatClock(new Date())), 1000)
    return () => clearInterval(id)
  }, [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!usuario.trim() || !contrasena.trim()) {
      setError('Ingresa tu usuario y contraseña para continuar.')
      return
    }
    setError('')
  }

  return (
    <main className="login">
      <section className="brand">
        <div className="brand__steam" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="brand__content">
          <h1 className="brand__mark">Oso Tostadas</h1>
          <p className="brand__tag">Punto de venta para tu tostadería</p>
        </div>
      </section>

      <section className="stage">
        <form className="ticket" onSubmit={handleSubmit} noValidate>
          <BearStamp className="ticket__stamp" />

          <h2 className="ticket__title">Iniciar sesión</h2>
          <p className="ticket__subtitle">Accede a tu turno en el punto de venta</p>

          <div className="field">
            <label htmlFor="usuario">Usuario</label>
            <input
              id="usuario"
              name="usuario"
              type="text"
              autoComplete="username"
              placeholder="tu.usuario"
              value={usuario}
              onChange={(event) => setUsuario(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="contrasena">Contraseña</label>
            <div className="field__control">
              <input
                id="contrasena"
                name="contrasena"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={contrasena}
                onChange={(event) => setContrasena(event.target.value)}
              />
              <button
                type="button"
                className="field__toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-pressed={showPassword}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          {error && (
            <p className="ticket__error" role="alert">
              {error}
            </p>
          )}

          <div className="ticket__row">
            <label className="remember">
              <input type="checkbox" />
              Recordarme en este equipo
            </label>
          </div>

          <button type="submit" className="ticket__submit">
            Entrar
          </button>

          <div className="ticket__footer">
            <span>TICKET N.&deg; 00427</span>
            <span>{clock}</span>
          </div>
        </form>

        <p className="help">¿No puedes ingresar? Contacta a tu administrador.</p>
      </section>
    </main>
  )
}

export default LoginPage

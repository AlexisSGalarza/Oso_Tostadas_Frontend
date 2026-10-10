import './GraficaBarras.css'

export type PuntoGrafica = {
  clave: string
  // Texto bajo la barra; vacio para no saturar el eje cuando hay muchas barras.
  eje: string
  // Encabezado y renglones del globo que aparece al pasar el cursor o enfocar la barra.
  titulo: string
  detalle: string[]
  valor: number
  activo?: boolean
  onClick?: () => void
}

type Props = {
  puntos: PuntoGrafica[]
  formatear: (valor: number) => string
  // Resumen para lectores de pantalla, por ejemplo "Ventas por hora".
  descripcion: string
  vacio?: string
}

function GraficaBarras({ puntos, formatear, descripcion, vacio = 'Sin datos todavía.' }: Props) {
  const maximo = Math.max(...puntos.map((p) => p.valor), 0)
  if (maximo <= 0) {
    return <p className="grafica__vacio">{vacio}</p>
  }
  // La cifra se muestra sobre el dia elegido; si no hay ninguno, sobre el mas alto.
  const indiceActivo = puntos.findIndex((p) => p.activo && p.valor > 0)
  const indiceEtiqueta = indiceActivo >= 0 ? indiceActivo : puntos.findIndex((p) => p.valor === maximo)

  return (
    <div className="grafica">
      <div className="grafica__lienzo" role="group" aria-label={descripcion}>
        {puntos.map((punto, indice) => {
          const alto = `${Math.max((punto.valor / maximo) * 100, punto.valor > 0 ? 3 : 0)}%`
          const lado = indice < puntos.length / 3 ? 'is-izq' : indice > (puntos.length * 2) / 3 ? 'is-der' : ''
          const contenido = (
            <>
              <span className="grafica__globo" role="tooltip">
                <strong>{punto.titulo}</strong>
                {punto.detalle.map((linea) => (
                  <span key={linea}>{linea}</span>
                ))}
              </span>
              {indice === indiceEtiqueta && (
                <span className="grafica__valor" style={{ bottom: alto }} aria-hidden="true">
                  {formatear(punto.valor)}
                </span>
              )}
              <span className="grafica__barra" style={{ height: alto }} />
            </>
          )
          const clases = `grafica__columna ${lado} ${punto.activo ? 'is-activa' : ''} ${punto.valor === 0 ? 'is-cero' : ''}`
          const nombre = `${punto.titulo}: ${punto.detalle.join(', ')}`
          return punto.onClick ? (
            <button
              type="button"
              key={punto.clave}
              className={clases}
              onClick={punto.onClick}
              aria-label={nombre}
              aria-pressed={punto.activo}
            >
              {contenido}
            </button>
          ) : (
            <div key={punto.clave} className={clases} tabIndex={0} role="img" aria-label={nombre}>
              {contenido}
            </div>
          )
        })}
      </div>
      <div className="grafica__eje" aria-hidden="true">
        {puntos.map((punto) => (
          <span key={punto.clave} className={punto.activo ? 'is-activa' : ''}>
            {punto.eje}
          </span>
        ))}
      </div>
    </div>
  )
}

export default GraficaBarras

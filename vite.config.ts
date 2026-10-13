import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import basicSsl from '@vitejs/plugin-basic-ssl'

// `npm run dev:movil` sirve el punto de venta por https en la red local para
// probarlo desde un telefono: el navegador solo deja usar la camara (lector de
// codigos) en paginas seguras. La API se alcanza por el proxy /api, asi el
// telefono no necesita llegar directo al backend.
const movil = process.env.MOVIL === '1'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    ...(movil ? [basicSsl()] : []),
  ],
  server: movil ? { host: true, proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } } } : undefined,
})

# Oso Tostadas · Punto de Venta

Frontend del punto de venta de Oso Tostadas: registro de ventas y devoluciones para el personal de mostrador, panel administrativo (usuarios, inventario, proveedores, reportes, auditoría) y una pantalla pública de autofacturación para clientes.

React 19 + TypeScript + Vite, sin router ni librería de UI externa: la navegación es una máquina de estados simple en `App.tsx` y cada pantalla trae su propio CSS.

## Requisitos

- Node 20+
- Un backend de Oso Tostadas corriendo (por defecto se espera en `http://localhost:8000/api`)

## Empezar

```bash
npm install
npm run dev
```

La app corre en `http://localhost:5173` (Vite elige otro puerto si está ocupado).

### Variables de entorno

| Variable | Default | Descripción |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:8000/api` | Base URL del backend |

Crea un `.env.local` si necesitas apuntar a otro backend:

**macOS / Linux**

```bash
echo "VITE_API_URL=https://tu-backend/api" > .env.local
```

**Windows (PowerShell)**

```powershell
"VITE_API_URL=https://tu-backend/api" | Out-File -Encoding utf8 .env.local
```

O simplemente crea el archivo `.env.local` a mano en la raíz del proyecto con ese contenido.

### Cuentas de prueba

El login del personal es por **número de empleado**, no por correo. Con el backend sembrado (`python manage.py seed_demo`):

| Rol | Número de empleado | Contraseña |
| --- | --- | --- |
| Vendedor | `800001` | `Demo1234!` |
| Admin | `800002` | `Demo1234!` |

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Type-check (`tsc -b`) + build de producción con Vite |
| `npm run preview` | Sirve el build de `dist/` localmente |
| `npm run lint` | Lint con oxlint |

## Estructura

```
src/
  App.tsx              Máquina de estados de pantallas + sesión/turno activo
  main.tsx             Punto de entrada; enruta /factura a la pantalla de cliente
  components/          TopBar, marca del oso (compartidos entre pantallas)
  lib/
    api.ts             Cliente HTTP: auth, turnos, ventas, catálogo, admin
    format.ts          Helpers de moneda, fecha y hora (zona horaria de México)
  pages/
    Login/             Inicio de sesión del personal
    Vendedor/           Perfil, venta, historial, corte de caja, devoluciones
    Admin/              Perfil admin, usuarios, inventario, proveedores,
                         reportes, configuración, auditoría, detalle de turno
    Cliente/             Autofacturación pública a partir de un ticket (/factura)
  styles/index.css      Tokens de diseño globales (color, tipografía)
```

## Roles y flujos

- **Vendedor / cajero**: abre turno, registra ventas y devoluciones, consulta su historial y hace el corte de caja al cerrar turno.
- **Admin**: gestiona usuarios, inventario, proveedores y configuración; revisa reportes, auditoría y el detalle de cualquier turno (incluyendo devoluciones y recibos).
- **Cliente**: desde `/factura`, busca su ticket por folio y genera su factura sin necesidad de iniciar sesión.

## Diseño

Paleta y tipografía propias de la marca, definidas como tokens CSS en `src/styles/index.css`:

- Color: verdes de salsa/tinta como base, masa y tostado como neutros cálidos, chile como acento de alerta.
- Tipografía: Fraunces (display), Public Sans (texto), IBM Plex Mono (datos/monto/hora).

Todas las pantallas reutilizan estos tokens; evita introducir colores o fuentes sueltas fuera de `:root`.

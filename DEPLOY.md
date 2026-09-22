# Guía de Deploy — Tele Import S.A.

Stack actual: **Next.js 14 (frontend) + Express + TypeScript (backend) + MySQL 8**

---

## Opción recomendada: Railway (backend + MySQL) + Vercel (frontend)

Railway tiene MySQL como addon nativo. No necesitás configurar nada externo.

### 1. Backend en Railway

1. Entrá a [railway.app](https://railway.app) y creá un nuevo proyecto.
2. **Add Service → GitHub Repo** → seleccioná este repo.
3. En la configuración del servicio:
   - **Root Directory**: `backend`
   - El `backend/railway.toml` ya está configurado — Railway lo detecta automático.
4. **Add Service → Database → MySQL** → Railway levanta MySQL y te da las variables.
5. En el servicio del backend, cargá las siguientes variables de entorno:

```env
# Railway las genera automáticamente si usás el addon MySQL:
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}

# Generá uno: openssl rand -hex 32
JWT_SECRET=<cadena-aleatoria-larga>

# URLs (completar después de que Vercel te dé la URL del frontend)
FRONTEND_URL=https://tu-frontend.vercel.app
BACKEND_URL=https://tu-backend.up.railway.app
CORS_ORIGINS=https://tu-frontend.vercel.app

# Mercado Pago
MP_ACCESS_TOKEN=<tu-access-token>
MP_WEBHOOK_SECRET=<secret-opcional>

# SMTP (opcional — si no está, los emails se imprimen en consola)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tucuenta@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM=Tele Import <tucuenta@gmail.com>
```

6. Deploy. El healthcheck está en `/health`.

### 2. Frontend en Vercel

1. Entrá a [vercel.com](https://vercel.com) y creá un nuevo proyecto desde este repo.
2. En la configuración:
   - **Root Directory**: `frontend`
   - Framework: Next.js (auto-detectado)
3. Cargá las variables de entorno:

```env
NEXT_PUBLIC_APP_URL=https://tu-frontend.vercel.app
NEXT_PUBLIC_API_URL=https://tu-backend.up.railway.app
BACKEND_SERVICE_URL=https://tu-backend.up.railway.app
NEXT_PUBLIC_MP_MODE=sandbox
```

4. Deploy.

### 3. Conectar ambos servicios

Una vez que tenés las URLs definitivas de Railway y Vercel:
- Actualizá `FRONTEND_URL`, `BACKEND_URL`, `CORS_ORIGINS` en Railway con las URLs reales.
- Actualizá `NEXT_PUBLIC_API_URL` y `BACKEND_SERVICE_URL` en Vercel.
- Redesplegá ambos servicios.

---

## Opción alternativa: Render (backend) + MySQL externo + Vercel (frontend)

El `render.yaml` ya está configurado en la raíz del repo. Render detecta el blueprint automáticamente.

**Render no tiene MySQL nativo** — necesitás un proveedor externo gratuito:
- [Aiven](https://aiven.io) — MySQL gratis, 1 instancia
- [PlanetScale](https://planetscale.com) — MySQL compatible, plan free

> **Advertencia**: Render en el plan gratuito **duerme el servicio tras 15 minutos de inactividad**. El primer request después de la pausa tarda ~30 segundos en responder. Para una presentación, esto puede ser problemático.

Una vez que tengas el MySQL externo, configurá en el panel de Render las variables `sync: false`:

```env
DB_HOST=<host de Aiven/PlanetScale>
DB_PORT=<puerto>
DB_USER=<usuario>
DB_PASSWORD=<contraseña>
DB_NAME=tele_import
DB_SSL=true          # Obligatorio con proveedores administrados

FRONTEND_URL=https://tu-frontend.vercel.app
CORS_ORIGINS=https://tu-frontend.vercel.app
BACKEND_URL=https://tu-backend.onrender.com
MP_ACCESS_TOKEN=<tu-access-token>
MP_WEBHOOK_SECRET=<opcional>
```

El frontend en Vercel es el mismo proceso que en la opción Railway.

---

## Mercado Pago Webhook

Configurá el webhook en el panel de Mercado Pago apuntando a:

```
https://tu-backend.up.railway.app/webhooks/mercadopago
# o
https://tu-backend.onrender.com/webhooks/mercadopago
```

---

## Checklist post-deploy

- [ ] `GET https://tu-backend/health` responde `{ "status": "ok" }`
- [ ] El frontend carga el catálogo sin errores CORS
- [ ] Login y registro funcionan
- [ ] El checkout crea una preferencia de Mercado Pago
- [ ] El webhook actualiza el estado del pedido tras el pago

---

## Redeploy manual

Con GitHub conectado, cada push a `master` dispara un deploy automático en Railway/Render y Vercel.

Para forzar un redeploy manual sin cambios:

```bash
git commit --allow-empty -m "chore: trigger redeploy"
git push
```

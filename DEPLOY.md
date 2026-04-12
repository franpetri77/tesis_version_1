# Deploy guia rapida

Este proyecto se puede desplegar de forma simple con:
- Frontend Next.js en Vercel
- Backend Express + SQLite en Render (con disco persistente)
- Directus en Directus Cloud o Render/Railway (si todavia no esta online)

## 1) Backend en Render

### Opcion A (recomendada): Blueprint con render.yaml
1. En Render, crear un Blueprint y conectar este repo.
2. Render detecta `render.yaml` en la raiz y crea el servicio `tele-import-backend`.
3. Completar variables `sync: false` en el panel.
4. Deploy.

### Variables obligatorias (backend)
- `PORT=4000`
- `FRONTEND_URL=https://tu-frontend.vercel.app`
- `BACKEND_URL=https://tu-backend.onrender.com`
- `DB_PATH=/var/data/tele_import.db`
- `JWT_SECRET=<valor-largo-y-seguro>`
- `MP_ACCESS_TOKEN=<token-mercadopago>`
- `MP_WEBHOOK_SECRET=<secret-webhook-mercadopago>`
- `DIRECTUS_URL=https://tu-directus`
- `DIRECTUS_SERVICE_TOKEN=<token-de-servicio>`

### Healthcheck
- Endpoint: `/health`

## 2) Frontend en Vercel

1. En Vercel, importar este repo.
2. Configurar Root Directory: `frontend`.
3. Framework: Next.js (auto-detectado).
4. Cargar variables de entorno.
5. Deploy.

### Variables obligatorias (frontend)
- `NEXT_PUBLIC_APP_URL=https://tu-frontend.vercel.app`
- `NEXT_PUBLIC_API_URL=https://tu-backend.onrender.com`
- `NEXT_PUBLIC_DIRECTUS_URL=https://tu-directus`
- `DIRECTUS_SERVICE_TOKEN=<token-de-servicio>`
- `NEXT_PUBLIC_MP_PUBLIC_KEY=<public-key-mp>`
- `MP_ACCESS_TOKEN=<token-mercadopago>`
- `BACKEND_SERVICE_URL=https://tu-backend.onrender.com`

## 3) Mercado Pago Webhook

Configurar webhook en Mercado Pago apuntando a:
- `https://tu-backend.onrender.com/webhooks/mercadopago`

Verificar que `MP_WEBHOOK_SECRET` coincida entre Mercado Pago y backend.

## 4) Checklist post deploy

- `GET https://tu-backend.onrender.com/health` responde `status: ok`.
- Frontend puede listar catalogo sin CORS.
- Login funciona.
- Flujo de checkout crea preferencia.
- Webhook cambia estado de pedido despues del pago.

## 5) Comandos utiles para actualizar cambios

```bash
git add .
git commit -m "feat: ..."
git push
```

Con GitHub conectado, Vercel y Render redeployan automaticamente con cada push a `main` (si asi lo configuraste).

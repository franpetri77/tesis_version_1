# Runbook — Tele Import S.A. (Tesis Prototipo 1)

Guía paso a paso para levantar el proyecto desde cero en un entorno local.

---

## Requisitos previos

| Herramienta | Versión mínima | Verificar con |
|---|---|---|
| Node.js | 20.x LTS | `node -v` |
| npm | 10.x | `npm -v` |
| Docker Desktop | cualquiera | `docker -v` |
| Git | cualquiera | `git --version` |

> **No necesitás instalar MySQL** — Docker levanta la base de datos automáticamente.
> Descargá Docker Desktop desde [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/).

---

## 1. Clonar el repositorio

```bash
git clone https://github.com/<usuario>/tesis_version_1.git
cd tesis_version_1
```

---

## 2. Levantar la base de datos con Docker

```bash
docker compose up -d
```

Esto descarga MySQL 8.0 y crea la base de datos `tele_import` automáticamente. Verificá que esté corriendo:

```bash
docker ps
# Deberías ver: tele_import_db   Up
```

> Las **tablas se crean automáticamente** cuando el backend arranca por primera vez. No necesitás correr migraciones a mano.

Para detener la DB sin perder datos:
```bash
docker compose stop
```

Para eliminar todo (útil para resetear):
```bash
docker compose down -v
```

---

## 3. Configurar el backend

### 3.1 Instalar dependencias

```bash
cd backend
npm install
```

### 3.2 Crear el archivo `.env`

```bash
# En Linux/Mac:
cp .env.example .env

# En Windows (PowerShell):
Copy-Item .env.example .env
```

### 3.3 Completar `.env`

Abrí `backend/.env` y completá los valores. A continuación se listan las variables **obligatorias** y las **opcionales**:

#### Obligatorias

```env
PORT=3001

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=teleimport2024        # Contraseña que usa docker-compose.yml
DB_NAME=tele_import

JWT_SECRET=una-cadena-larga-y-aleatoria-aqui-minimo-32-chars

FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
CORS_ORIGINS=http://localhost:3000
```

#### Opcionales (para pago real con Mercado Pago)

```env
MP_ACCESS_TOKEN=APP_USR-...    # Ver sección 8
MP_WEBHOOK_SECRET=             # Solo necesario con ngrok/producción
```

#### Opcionales (email)

```env
# Si se dejan vacías, los emails se imprimen en la consola del backend
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tucuenta@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # App password de Google, no tu contraseña normal
SMTP_FROM=Tele Import <tucuenta@gmail.com>
```

---

## 4. Configurar el frontend

### 4.1 Instalar dependencias

```bash
cd ../frontend
npm install
```

### 4.2 Crear `.env.local`

Creá el archivo `frontend/.env.local` con este contenido:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
BACKEND_SERVICE_URL=http://localhost:3001
NEXT_PUBLIC_MP_MODE=sandbox
```

> `NEXT_PUBLIC_MP_MODE=sandbox` hace que el checkout use la URL de sandbox de Mercado Pago en lugar de la de producción.

---

## 5. Arrancar los servicios

Necesitás **dos terminales abiertas** (una para backend, otra para frontend).

### Terminal 1 — Backend

```bash
cd backend
npm run dev
```

Deberías ver:
```
[DB] Esquema MySQL inicializado correctamente.
[Backend] Servidor corriendo en puerto 3001
```

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

Deberías ver:
```
▲ Next.js 14.x
- Local: http://localhost:3000
```

Abrí [http://localhost:3000](http://localhost:3000) en el navegador.

### Para producción (build)

```bash
# Backend
cd backend
npm run build   # Compila TypeScript a dist/
npm start       # Corre el build compilado

# Frontend
cd frontend
npm run build
npm start
```

---

## 6. Cargar datos de ejemplo (seed)

Una vez que el backend está corriendo, podés cargar categorías, productos de prueba y un usuario admin con:

```bash
cd backend
npm run db:seed
```

Esto carga:
- Categorías (Televisores, Smartphones, Laptops, etc.)
- ~30 productos de ejemplo con imágenes
- Un usuario **admin** de prueba
- Promociones y cupones de ejemplo

> El seed es **idempotente**: si la DB ya tiene datos, no hace nada.

---

## 7. Crear el primer usuario administrador

### Opción A: via seed (recomendada)

Corré `npm run db:seed` como se indica arriba. El seed crea un admin de prueba.

### Opción B: registrate normalmente y promové a admin via SQL

1. Registrate en [http://localhost:3000](http://localhost:3000) con tu email.
2. Luego promové tu cuenta a admin desde MySQL:

```sql
USE tele_import;
UPDATE users SET role = 'admin' WHERE email = 'tu@email.com';
```

### Opción C: script de usuarios

```bash
cd backend
npm run db:users
```

---

## 8. Obtener credenciales de Mercado Pago (sandbox)

1. Creá una cuenta en [mercadopago.com.ar](https://www.mercadopago.com.ar) (cuenta argentina).
2. Entrá a [developers.mercadopago.com](https://developers.mercadopago.com).
3. Creá una aplicación nueva.
4. En **Credenciales de prueba (sandbox)** copiá el **Access Token** (empieza con `APP_USR-` o `TEST-`).
5. Pegalo en `backend/.env`:
   ```env
   MP_ACCESS_TOKEN=APP_USR-xxxxxxxxx...
   ```
6. Para simular pagos usá las [tarjetas de prueba de MP](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/test/cards).

---

## 9. Troubleshooting

### `Error: EADDRINUSE: address already in use :::3001`
Ya hay una instancia del backend corriendo. Matala y volvé a iniciar:
```bash
# Windows PowerShell — encontrar el proceso en el puerto 3001
netstat -ano | findstr :3001
# Matarlo (reemplazá PID con el número)
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

### `Access denied for user 'root'@'...' (using password: NO)`
Falta la contraseña en el `.env`. Verificá `DB_PASSWORD` en `backend/.env`.

### `Cannot find module 'dist/index.js'`
Hay que compilar primero: `npm run build` dentro de `backend/`.

### `[Auth] JWT_SECRET no está configurado`
Falta definir `JWT_SECRET` en `backend/.env`. Poné cualquier cadena de al menos 32 caracteres.

### El frontend muestra datos vacíos / no carga productos
- Verificá que el backend esté corriendo en el puerto 3001.
- Confirmá que `frontend/.env.local` tiene `NEXT_PUBLIC_API_URL=http://localhost:3001`.
- Corré el seed: `npm run db:seed`.

### El pago de Mercado Pago no funciona
- Verificá que `MP_ACCESS_TOKEN` sea un token de **sandbox** válido.
- En desarrollo, MP no puede llamar al webhook local (necesitás [ngrok](https://ngrok.com/) para eso — no es necesario para la demo).

### Las imágenes de productos no cargan
Las imágenes del seed apuntan a URLs externas (Unsplash/similar). Si no tenés internet, van a fallar. Esto es esperado en desarrollo.

---

## 10. Estructura rápida del proyecto

```
tesis_version_1/
├── backend/                  # API Express + TypeScript
│   ├── src/
│   │   ├── routes/           # auth, payments, webhooks, admin, catalog, reports
│   │   ├── db/               # schema.ts (init), seed.ts, database.ts (pool)
│   │   ├── services/         # email, notifications
│   │   └── index.ts          # entry point
│   ├── .env.example
│   └── package.json
│
├── frontend/                 # Next.js 14 App Router
│   ├── src/
│   │   ├── app/              # rutas (shop, admin, auth, account)
│   │   ├── components/       # Header, Footer, UI, product, catalog
│   │   ├── stores/           # Zustand (cart, auth, modal)
│   │   ├── lib/api/          # clientes HTTP hacia el backend
│   │   └── types/            # tipos TypeScript compartidos
│   ├── .env.local            # ← crear este archivo (ver sección 4.2)
│   └── package.json
│
├── docs/                     # Documentación técnica generada
├── RUNBOOK.md                # Este archivo
└── DEPLOY.md                 # Guía de deploy a Render + Vercel
```

### Puertos por defecto

| Servicio | Puerto |
|---|---|
| Frontend (Next.js) | 3000 |
| Backend (Express) | 3001 |
| MySQL | 3306 |

---

## 11. Checklist de verificación rápida

- [ ] Docker Desktop corriendo y `docker compose up -d` ejecutado
- [ ] `backend/.env` completo con `DB_PASSWORD` y `JWT_SECRET`
- [ ] `frontend/.env.local` con `NEXT_PUBLIC_API_URL=http://localhost:3001`
- [ ] Backend arranca sin errores (`npm run dev` en `backend/`)
- [ ] Seed ejecutado (`npm run db:seed`)
- [ ] Frontend arranca en [http://localhost:3000](http://localhost:3000)
- [ ] Se pueden ver productos en el catálogo
- [ ] Login y registro funcionan
- [ ] Panel admin accesible en [http://localhost:3000/admin](http://localhost:3000/admin) con usuario admin

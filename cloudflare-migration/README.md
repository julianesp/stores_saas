# Tienda POS - Cloudflare Migration

Migración de Firebase/Firestore a Cloudflare Workers + D1 para multi-tenancy perfecto.

## 🏗️ Arquitectura

```
┌───────────────────────────────────────────────┐
│      Next.js Frontend (Sin cambios)           │
│      • Clerk Auth ✓                           │
│      • Cloudinary para imágenes ✓             │
└─────────────────┬─────────────────────────────┘
                  │ HTTPS
                  ▼
┌───────────────────────────────────────────────┐
│    Cloudflare Workers (Nueva API Layer)       │
│    • Valida JWT de Clerk                      │
│    • Identifica tenant → user_profile_id      │
│    • Rutea a la BD correcta del tenant        │
└─────────────────┬─────────────────────────────┘
                  │
     ┌────────────┼────────────┐
     ▼            ▼            ▼
┌─────────┐  ┌─────────┐  ┌─────────┐
│ tienda1 │  │ tienda2 │  │ tienda3 │  (SQLite/D1)
│   .db   │  │   .db   │  │   .db   │
└─────────┘  └─────────┘  └─────────┘
   ↑ Aislamiento Total por Tienda
```

## 📋 Características

✅ **Aislamiento Perfecto** - Cada tienda tiene su propia base de datos D1
✅ **Escalable** - Crear nueva tienda = crear nueva DB
✅ **Seguro** - Imposible que una tienda vea datos de otra
✅ **Económico** - Cloudflare es más barato que Firebase
✅ **Mantenible** - Backups independientes por tienda

## 🚀 Setup Inicial

### 1. Instalar Dependencias

```bash
cd cloudflare-migration
npm install
```

### 2. Autenticación con Cloudflare

```bash
npm install -g wrangler
wrangler login
```

### 3. Crear Recursos en Cloudflare

#### a) Crear KV Namespace para Tenants

```bash
wrangler kv:namespace create "TENANTS"
wrangler kv:namespace create "TENANTS" --preview
```

Copia los IDs generados a `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "TENANTS"
id = "TU_KV_ID_AQUI"
preview_id = "TU_KV_PREVIEW_ID_AQUI"
```

#### b) Crear D1 Database para Gestión de Tenants

```bash
wrangler d1 create tenants-manager
```

Copia el ID a `wrangler.toml`:

```toml
[[d1_databases]]
binding = "TENANTS_DB"
database_name = "tenants-manager"
database_id = "TU_DB_ID_AQUI"
```

#### c) Crear Schema de Tenants

```bash
wrangler d1 execute tenants-manager --file=./scripts/tenants-schema.sql
```

Contenido de `scripts/tenants-schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  clerk_user_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  database_name TEXT NOT NULL,
  database_id TEXT NOT NULL,
  subscription_status TEXT NOT NULL DEFAULT 'trial',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_tenants_clerk ON tenants(clerk_user_id);
```

### 4. Crear Base de Datos D1 por Tienda

**IMPORTANTE**: Cloudflare D1 no permite crear bases de datos dinámicamente desde Workers.
Tienes que crear cada DB manualmente:

```bash
# Para cada tienda nueva
wrangler d1 create store_<TENANT_ID>

# Aplicar schema
wrangler d1 execute store_<TENANT_ID> --file=./schema.sql
```

**Problema**: Esto no escala bien. **Soluciones**:

#### Opción A: Pre-crear Pool de Databases

```bash
# Crear 100 bases de datos de antemano
for i in {1..100}; do
  wrangler d1 create store_pool_$i
  wrangler d1 execute store_pool_$i --file=./schema.sql
done
```

Luego asignar una DB del pool a cada nuevo tenant.

#### Opción B: Usar Cloudflare API para crear dinámicamente

```typescript
// En el Worker, llamar a la API de Cloudflare
const response = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: `store_${tenantId}` })
  }
);
```

#### Opción C (RECOMENDADA): Una DB compartida con aislamiento perfecto

Aunque va contra la arquitectura "una DB por tenant", puedes usar una **sola D1** con
aislamiento por `tenant_id` + **Row Level Security via Workers**:

```sql
-- Todas las tablas tienen tenant_id
ALTER TABLE products ADD COLUMN tenant_id TEXT NOT NULL;

-- Los Workers SIEMPRE filtran por tenant_id
SELECT * FROM products WHERE tenant_id = ?;
```

**Ventajas**:
- Más simple de gestionar
- No hay límite de tenants
- Migrations más fáciles

**Desventajas**:
- No es aislamiento físico completo
- Un bug podría exponer datos (mitigado con buenas prácticas)

## 🔧 Desarrollo

### Ejecutar en Desarrollo

```bash
npm run dev
```

Esto iniciará el Worker en `http://localhost:8787`

### Probar Endpoints

```bash
# Health check
curl http://localhost:8787/health

# API endpoint (requiere auth)
curl http://localhost:8787/api/products \
  -H "Authorization: Bearer TU_TOKEN_DE_CLERK"
```

## 📦 Deployment

### 1. Configurar Variables de Entorno

En el dashboard de Cloudflare Workers, agregar:

```
CLERK_SECRET_KEY=sk_...
CLERK_PUBLISHABLE_KEY=pk_...
```

### 2. Deploy a Producción

```bash
npm run deploy:production
```

### 3. Configurar Dominio Personalizado

En Cloudflare Dashboard:
1. Workers > Tu worker > Settings > Triggers
2. Add Custom Domain: `api.tudominio.com`

## 🔄 Migración de Datos

### Script de Migración de Firebase a D1

```bash
# Instalar dependencies para scripts
npm install firebase-admin dotenv

# Configurar credenciales de Firebase
# Colocar serviceAccountKey.json en la raíz

# Ejecutar migración
node scripts/migrate-from-firebase.js
```

Ver `scripts/migrate-from-firebase.js` para detalles.

## 📝 Actualizar Frontend

Cambiar `lib/firestore-helpers.ts` para llamar a la API de Cloudflare:

```typescript
// Antes (Firebase)
import { collection, getDocs } from 'firebase/firestore';
export async function getAllDocuments(collectionName) {
  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Después (Cloudflare)
export async function getAllDocuments(collectionName) {
  const token = await getClerkToken(); // Obtener token de Clerk
  const response = await fetch(`https://api.tudominio.com/api/${collectionName}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const { data } = await response.json();
  return data;
}
```

## 🔐 Seguridad

### Validación de Tokens de Clerk

El Worker valida tokens JWT de Clerk. Para producción, debes verificar contra JWKS:

```typescript
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('https://CLERK_FRONTEND_API/.well-known/jwks.json')
);

const { payload } = await jwtVerify(token, JWKS, {
  issuer: 'https://CLERK_FRONTEND_API',
});
```

### Row-Level Security

Todos los queries deben filtrar por `tenant_id`:

```typescript
// BIEN ✅
const products = await db
  .prepare('SELECT * FROM products WHERE tenant_id = ?')
  .bind(tenantId)
  .all();

// MAL ❌ - Expone datos de todos los tenants
const products = await db
  .prepare('SELECT * FROM products')
  .all();
```

## 📊 Monitoreo

Ver logs en tiempo real:

```bash
wrangler tail
```

Ver analytics en Cloudflare Dashboard.

## 💰 Costos

**Cloudflare Workers + D1 (Free Tier)**:
- ✅ 100,000 requests/día GRATIS
- ✅ 10 GB de datos en D1 GRATIS
- ✅ Sin cargos de egreso

**Después del free tier**:
- $0.15 por millón de requests
- $0.75 por millón de filas leídas
- $0.50 por millón de filas escritas

**Comparación con Firebase**:
- Firebase cobra por lecturas/escrituras
- Cloudflare es ~10x más barato para alto volumen

## 🐛 Troubleshooting

### Error: "getTenantDatabase not implemented"

Esto es porque necesitas configurar los bindings de D1 para cada tenant.

**Solución temporal**: Usar una sola D1 con `tenant_id` (ver Opción C arriba).

### Error: "CORS"

Actualizar origins permitidos en `src/index.ts`:

```typescript
app.use('/*', cors({
  origin: ['https://tudominio.com'],
  // ...
}));
```

## 📚 Recursos

- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [Hono Framework](https://hono.dev/)
- [Clerk Auth](https://clerk.com/docs)

## 🆘 Soporte

Para problemas, revisar:
1. Logs: `wrangler tail`
2. Dashboard de Cloudflare
3. GitHub Issues del proyecto

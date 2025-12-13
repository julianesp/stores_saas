# 🚀 Guía Completa de Despliegue - Cloudflare Multi-Tenant

Esta guía te llevará paso a paso desde cero hasta tener tu sistema POS funcionando en Cloudflare con aislamiento perfecto de datos.

## 📋 Pre-requisitos

- [x] Cuenta de Cloudflare (gratis)
- [x] Node.js 18+ instalado
- [x] Acceso a Firebase (para migrar datos)
- [x] Cuenta de Clerk (ya la tienes)

## 🎯 Decisión Importante: Arquitectura de Base de Datos

Tienes 2 opciones:

### Opción A: Una Base de Datos por Tienda (Aislamiento Perfecto) ⭐ RECOMENDADO

**Pros:**

- ✅ Aislamiento físico completo
- ✅ Backups independientes
- ✅ Imposible que haya cross-tenant data leak
- ✅ Puedes cobrar por tier según uso de DB

**Contras:**

- ❌ Necesitas pre-crear DBs o usar Cloudflare API
- ❌ Límite de ~1000 databases por cuenta (contactar soporte para más)
- ❌ Más complejo de gestionar

**Cuándo usar:** Si vendes a clientes enterprise que requieren aislamiento total, o si tienes <500 tiendas.

### Opción B: Una Base de Datos Compartida con tenant_id ⚡ MÁS SIMPLE

**Pros:**

- ✅ Súper simple de implementar
- ✅ Sin límite de número de tiendas
- ✅ Migrations más fáciles
- ✅ Un solo schema que mantener

**Contras:**

- ❌ Requiere disciplina estricta en los queries
- ❌ Un bug podría exponer datos (mitigable)
- ❌ No es aislamiento físico

**Cuándo usar:** Si estás empezando, tienes >100 tiendas, o no tienes requisitos de compliance estrictos.

---

## 🛠️ Implementación con Opción A (Una DB por Tienda)

### Paso 1: Setup de Cloudflare

```bash
# Instalar Wrangler
npm install -g wrangler

# Login a Cloudflare
wrangler login

# Obtener tu Account ID
wrangler whoami
```

### Paso 2: Crear Recursos de Cloudflare

```bash
cd cloudflare-migration

# Instalar dependencias
npm install

# Crear KV namespace para tenant metadata
wrangler kv:namespace create "TENANTS"
wrangler kv:namespace create "TENANTS" --preview

# Crear DB central para gestión de tenants
wrangler d1 create tenants-manager

# Aplicar schema a la DB de tenants
wrangler d1 execute tenants-manager --file=./scripts/tenants-schema.sql
```

Actualiza `wrangler.toml` con los IDs que te dio Cloudflare.

### Paso 3: Pre-crear Pool de Databases para Tiendas

**Opción 3A**: Crear manualmente (para pocas tiendas)

```bash
# Para cada tienda que ya existe o vas a migrar
wrangler d1 create store_tenant_abc123
wrangler d1 execute store_tenant_abc123 --file=./schema.sql

# Anotar el database_id que te devuelve
```

**Opción 3B**: Script para crear pool (para muchas tiendas)

```bash
# Crear archivo create-db-pool.sh
cat > create-db-pool.sh << 'EOF'
#!/bin/bash
for i in {1..50}; do
  echo "Creating database $i..."
  wrangler d1 create "store-pool-$i"
  # Anotar los IDs generados
done
EOF

chmod +x create-db-pool.sh
./create-db-pool.sh > db-pool-ids.txt
```

Luego cuando un usuario se registre, asignas una DB del pool.

### Paso 4: Configurar Bindings en wrangler.toml

**PROBLEMA**: D1 bindings son estáticos en `wrangler.toml`. No puedes tener bindings dinámicos.

**SOLUCIÓN**: Usar Cloudflare API en runtime:

```typescript
// En el Worker, acceder a D1 via API
const db = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sql: "SELECT * FROM products WHERE id = ?",
      params: [productId],
    }),
  }
);
```

### Paso 5: Migrar Datos de Firebase

```bash
# Obtener service account key de Firebase
# Dashboard > Project Settings > Service Accounts > Generate new private key
# Guardar como serviceAccountKey.json

# Ejecutar script de migración
node scripts/migrate-from-firebase.js

# Esto genera archivos SQL en migration-output/
```

Para cada tenant:

```bash
cd migration-output

# Ejemplo para tenant abc123
wrangler d1 execute store_abc123 --file=tenant_abc123_migration.sql
```

### Paso 6: Deploy del Worker

```bash
# Deploy a producción
wrangler deploy

# O deploy con secrets
wrangler secret put CLERK_SECRET_KEY
# Pegar tu key cuando te pregunte

wrangler deploy --env production
```

### Paso 7: Configurar Dominio

En Cloudflare Dashboard:

1. Workers & Pages > tu-worker
2. Settings > Triggers > Add Custom Domain
3. `api.tudominio.com`

---

## 🛠️ Implementación con Opción B (DB Compartida) ⚡ RECOMENDADO PARA EMPEZAR

Esta es mucho más simple y la que te recomiendo para empezar.

### Paso 1-2: Igual que Opción A

### Paso 3: Crear UNA sola D1 para todas las tiendas

```bash
# Crear DB compartida
wrangler d1 create tienda-pos-shared

# Modificar schema.sql para agregar tenant_id a TODAS las tablas
```

**Modificación del Schema:**

```sql
-- En schema.sql, agregar tenant_id a cada tabla:

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,  -- ⬅️ AGREGAR ESTO
  barcode TEXT,
  name TEXT NOT NULL,
  -- ...resto de campos
);

CREATE INDEX idx_products_tenant ON products(tenant_id); -- ⬅️ INDEX
```

Hacer esto para TODAS las tablas.

### Paso 4: Actualizar wrangler.toml

```toml
[[d1_databases]]
binding = "DB"  # Binding único para la DB compartida
database_name = "tienda-pos-shared"
database_id = "TU_DB_ID_AQUI"
```

### Paso 5: Modificar el Worker para inyectar tenant_id

En `src/utils/db-helpers.ts`:

```typescript
export class TenantDB {
  private db: D1Database;
  private tenantId: string;

  constructor(db: D1Database, tenantId: string) {
    this.db = db;
    this.tenantId = tenantId;
  }

  // Wrapper que SIEMPRE agrega tenant_id
  async query(sql: string, params: any[] = []) {
    // Reescribir SQL para agregar tenant_id
    // Esto es un ejemplo simplificado
    return this.db
      .prepare(sql)
      .bind(this.tenantId, ...params)
      .all();
  }

  // Métodos helpers
  async getAll(table: string) {
    return this.db
      .prepare(`SELECT * FROM ${table} WHERE tenant_id = ?`)
      .bind(this.tenantId)
      .all();
  }

  async getById(table: string, id: string) {
    return this.db
      .prepare(`SELECT * FROM ${table} WHERE tenant_id = ? AND id = ?`)
      .bind(this.tenantId, id)
      .first();
  }

  async insert(table: string, data: any) {
    data.tenant_id = this.tenantId; // FORZAR tenant_id
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map(() => "?").join(", ");

    return this.db
      .prepare(
        `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`
      )
      .bind(...values)
      .run();
  }

  async update(table: string, id: string, data: any) {
    delete data.tenant_id; // No permitir cambiar tenant_id
    const sets = Object.keys(data)
      .map((k) => `${k} = ?`)
      .join(", ");
    const values = Object.values(data);

    return this.db
      .prepare(`UPDATE ${table} SET ${sets} WHERE tenant_id = ? AND id = ?`)
      .bind(...values, this.tenantId, id)
      .run();
  }

  async delete(table: string, id: string) {
    return this.db
      .prepare(`DELETE FROM ${table} WHERE tenant_id = ? AND id = ?`)
      .bind(this.tenantId, id)
      .run();
  }
}
```

### Paso 6: Usar en las rutas

```typescript
// src/routes/products.ts
import { TenantDB } from "../utils/db-helpers";

app.get("/", async (c) => {
  const tenant = c.get("tenant");
  const tenantDB = new TenantDB(c.env.DB, tenant.id);

  const { results } = await tenantDB.getAll("products");

  return c.json({
    success: true,
    data: results,
  });
});
```

### Paso 7: Migrar datos

Modificar `migrate-from-firebase.js` para agregar `tenant_id`:

```javascript
function generateSQLInserts(documents, tableName, tenantId) {
  // ...
  for (const doc of documents) {
    doc.tenant_id = tenantId; // ⬅️ Agregar tenant_id
    // ... resto del código
  }
}
```

---

## ✅ Verificación Final

### 1. Test del Worker

```bash
# Desarrollo local
wrangler dev

# En otra terminal
curl http://localhost:8787/health
```

### 2. Test con Auth

```bash
# Obtener token de Clerk desde tu frontend
const token = await clerk.session.getToken();

# Probar endpoint
curl https://api.tudominio.com/api/products \
  -H "Authorization: Bearer $token"
```

### 3. Verificar Aislamiento

- Crear 2 usuarios diferentes en Clerk
- Crear productos con cada usuario
- Verificar que usuario A no ve productos de usuario B

---

## 📊 Monitoreo

```bash
# Ver logs en tiempo real
wrangler tail

# Ver analytics
# Ir a Cloudflare Dashboard > Workers > Analytics
```

---

## 🔄 Actualizar Frontend

Ver archivo `/docs/FRONTEND_MIGRATION.md` para migrar el frontend de Firebase a Cloudflare.

---

## 💡 Tips y Best Practices

1. **SIEMPRE usa prepared statements** - Evita SQL injection
2. **NUNCA confíes en el tenant_id del cliente** - Siempre usa el del JWT
3. **Testea cross-tenant isolation** - Es crítico
4. **Logs** - Loguea todos los queries en desarrollo
5. **Backups** - D1 tiene backups automáticos pero haz tus propios también

---

## 🆘 Problemas Comunes

### Error: "Duplicate binding name"

Tienes 2 bindings con el mismo nombre en `wrangler.toml`.

### Error: "Could not connect to D1 database"

El `database_id` en `wrangler.toml` es incorrecto. Verifica con `wrangler d1 list`.

### Los queries son lentos

D1 es SQLite - optimiza con índices. Usa EXPLAIN QUERY PLAN.

---

¿Listo para empezar? 🚀

Recomendación: **Empieza con Opción B (DB Compartida)**, es más simple y puedes migrar a Opción A después si lo necesitas.

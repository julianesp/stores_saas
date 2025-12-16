# Sistema de Reportes Automáticos

## 📊 Descripción

Sistema que genera reportes diarios de ventas en formato Excel automáticamente a las 8:00 PM cada día.

## ✨ Características

- **Generación automática diaria** a las 8:00 PM (hora Colombia)
- **Formato Excel (.xlsx)** listo para análisis
- **Incluye datos completos**:
  - Fecha de compra
  - Número de venta
  - Producto
  - Cantidad
  - Valor unitario
  - Valor total
  - Cliente
  - Teléfono del cliente
  - Método de pago

- **Solicitud de permisos**: Solo se pide una vez
- **Descarga manual**: Opción para descargar reportes cuando se necesite
- **Configuración flexible**: Hora personalizable

## 🚀 Cómo Usar

### 1. Activar Reportes Automáticos

1. Ve a **Dashboard → Configuración**
2. Busca la sección **"Reportes Automáticos de Ventas"**
3. Haz clic en **"Activar Reportes Automáticos"**
4. Los reportes se generarán automáticamente cada día

### 2. Configurar Hora de Generación

1. Una vez activados, verás la opción de **"Hora de generación"**
2. Selecciona la hora deseada (por defecto: 20:00 / 8 PM)
3. Haz clic en **"Guardar"**

### 3. Descargar Reporte Manual

Si necesitas el reporte antes de la hora programada:

1. Ve a **Dashboard → Configuración**
2. En la sección de reportes, haz clic en **"Descargar Reporte de Hoy"**
3. El archivo Excel se descargará automáticamente

## 🔧 Configuración Técnica

### Variables de Entorno

Agrega en tu archivo `.env.local`:

```env
CRON_SECRET=tu-secreto-super-seguro-aqui
```

Y en **Vercel Dashboard** (para producción):

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega `CRON_SECRET` con el mismo valor

### Cron Job en Vercel

El archivo `vercel.json` configura el cron job:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-reports",
      "schedule": "0 20 * * *"
    }
  ]
}
```

**Formato del schedule**: `minuto hora día mes díaDeLaSemana`
- `0 20 * * *` = Todos los días a las 20:00 (8 PM)
- `0 9 * * *` = Todos los días a las 9:00 AM
- `0 18 * * 1-5` = Lunes a viernes a las 6 PM

### Para Otros Servicios (sin Vercel Cron)

Si no usas Vercel, puedes usar servicios como:

1. **cron-job.org**
   - URL: `https://tu-dominio.com/api/cron/daily-reports`
   - Header: `Authorization: Bearer TU_CRON_SECRET`
   - Schedule: `0 20 * * *`

2. **EasyCron**
3. **GitHub Actions** (si está en repo público)

## 📁 Estructura de Archivos

```
app/
├── api/
│   ├── reports/
│   │   ├── daily/route.ts       # API para generar reporte de un día específico
│   │   └── config/route.ts      # API para configuración de reportes
│   └── cron/
│       └── daily-reports/route.ts # Endpoint para cron job
components/
└── config/
    └── auto-reports-config.tsx   # Componente de configuración UI
migrations/
└── add_auto_reports_config.sql   # Migración de base de datos
vercel.json                        # Configuración de cron en Vercel
```

## 🗄️ Base de Datos

### Campos agregados a `user_profiles`:

```sql
ALTER TABLE user_profiles ADD COLUMN auto_reports_enabled INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN auto_reports_time TEXT DEFAULT '20:00';
ALTER TABLE user_profiles ADD COLUMN auto_reports_email TEXT;
```

### Migración

Ya ejecutada en producción. Si necesitas ejecutarla en local:

```bash
wrangler d1 execute tienda-pos-shared --remote --file=migrations/add_auto_reports_config.sql
```

## 📊 Formato del Reporte Excel

El archivo Excel incluye las siguientes columnas:

| Columna | Ejemplo | Descripción |
|---------|---------|-------------|
| Fecha de Compra | 15/12/2024 10:30 | Fecha y hora de la venta |
| N° Venta | VTA-001 | Número de la venta |
| Producto | Coca Cola 1.5L | Nombre del producto |
| Cantidad | 2 | Cantidad vendida |
| Valor Unitario | $3,500 | Precio por unidad |
| Valor Total | $7,000 | Total del item |
| Cliente | Juan Pérez | Nombre del cliente |
| Teléfono | 3001234567 | Teléfono del cliente |
| Método de Pago | Efectivo | Forma de pago |

## 🔒 Seguridad

- El endpoint de cron requiere autenticación con `CRON_SECRET`
- Solo usuarios con `auto_reports_enabled = 1` reciben reportes
- Los archivos se generan dinámicamente (no se guardan en servidor)

## 🛠️ Desarrollo Futuro

- [ ] Envío automático por email
- [ ] Almacenamiento en Cloudflare R2 / AWS S3
- [ ] Reportes semanales y mensuales
- [ ] Dashboard de visualización de reportes históricos
- [ ] Notificaciones push cuando se genera el reporte
- [ ] Personalización de columnas incluidas

## 🐛 Troubleshooting

### El reporte no se genera automáticamente

1. Verifica que `auto_reports_enabled = 1` en la base de datos
2. Revisa los logs de Vercel Cron
3. Confirma que `CRON_SECRET` esté configurado correctamente

### Error al descargar reporte manual

- Verifica que haya ventas en el día seleccionado
- Revisa la consola del navegador para errores
- Confirma que el usuario esté autenticado

### El archivo Excel está vacío

- Confirma que hay ventas registradas para esa fecha
- Verifica que los productos tengan nombres válidos
- Revisa la configuración de zona horaria

## 📞 Soporte

Para reportar problemas o sugerir mejoras, contacta al equipo de desarrollo.

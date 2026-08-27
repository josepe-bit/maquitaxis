# Guía Completa de Configuración e Integración de MCP Supabase para MaquiTaxis

Esta guía explica en detalle cómo configurar, probar y aprovechar el **Servidor MCP (Model Context Protocol) de Supabase** en el proyecto MaquiTaxis.

---

## 1. ¿Qué es MCP Supabase y para qué sirve?

**Model Context Protocol (MCP)** es un estándar abierto desarrollado para conectar modelos de Inteligencia Artificial (como **Antigravity IDE**, **Cursor**, **Claude Desktop** y **VS Code**) con fuentes de datos y herramientas del backend.

Al configurar el servidor MCP de Supabase en este proyecto, la IA obtiene capacidades directas para:
- 🔍 **Inspeccionar la estructura de la base de datos**: Consultar tablas (`terceros`, `vehiculos`, `produccion`, `carreras`, etc.), columnas, tipos de datos y relaciones.
- 🛡️ **Auditar políticas RLS (Row Level Security)**: Verificar reglas de seguridad y permisos de lectura/escritura por nivel de usuario (Nivel 1 SuperAdmin, Nivel 2 Propietario, Nivel 3 Conductor).
- ⚡ **Ejecutar y validar consultas SQL**: Analizar datos de prueba, validar migraciones SQL y depurar errores en tiempo real.
- 🚀 **Gestionar Funciones y Logs**: Inspeccionar Supabase Edge Functions y registros de servidor de forma inmediata.

---

## 2. Archivos de Configuración MCP Creados en el Proyecto

Hemos dejado creados los archivos estándar de configuración MCP en las ubicaciones requeridas:

| Archivo | Ubicación | Propósito |
| :--- | :--- | :--- |
| [`.agents/mcp_config.json`](file:///c:/Users/Omar-pc/OneDrive%20-%20ut.edu.co/syscafe-JOSEOMAR-PC/taxi%20SMR842/maquitaxis/.agents/mcp_config.json) | Raíz de personalización Antigravity (`.agents/`) | Configuración automática en **Antigravity IDE**. |
| [`mcp_config.json`](file:///c:/Users/Omar-pc/OneDrive%20-%20ut.edu.co/syscafe-JOSEOMAR-PC/taxi%20SMR842/maquitaxis/mcp_config.json) | Raíz del monorepo | Configuración global para clientes MCP genéricos. |
| [`.vscode/mcp.json`](file:///c:/Users/Omar-pc/OneDrive%20-%20ut.edu.co/syscafe-JOSEOMAR-PC/taxi%20SMR842/maquitaxis/.vscode/mcp.json) | Carpeta `.vscode/` | Compatibilidad con VS Code y Cursor. |

---

## 3. Servidores MCP Disponibles

Se han configurado 3 modalidades en cada archivo de configuración:

### A. `supabase-official` (`@supabase/mcp-server-supabase`)
- **Propósito**: Conexión con Supabase Cloud Management API.
- **Requiere**: `SUPABASE_ACCESS_TOKEN` y `SUPABASE_PROJECT_REF`.

### B. `supabase-postgres-local` (`@modelcontextprotocol/server-postgres`)
- **Propósito**: Conexión directa a PostgreSQL cuando trabajas localmente con el Supabase CLI (`http://127.0.0.1:54321` / DB en puerto `54322`).
- **Cadena de conexión**: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

### C. `supabase-postgres-env` (`@modelcontextprotocol/server-postgres`)
- **Propósito**: Conexión directa mediante la variable `SUPABASE_DB_URL` (para cambiar fácilmente entre local y producción).

---

## 4. Paso a Paso para la Configuración

### Paso 1: Configurar el archivo `.env`

Abre el archivo [`.env`](file:///c:/Users/Omar-pc/OneDrive%20-%20ut.edu.co/syscafe-JOSEOMAR-PC/taxi%20SMR842/maquitaxis/.env) en la raíz del proyecto y completa los valores:

```bash
# 1. Para Supabase Cloud:
SUPABASE_PROJECT_REF=tu_project_ref_de_supabase
SUPABASE_ACCESS_TOKEN=sbp_tu_token_de_acceso_personal

# 2. Para PostgreSQL directo (Cloud o Local):
SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

> 💡 **Nota**: Puedes usar de referencia el archivo [`.env.example`](file:///c:/Users/Omar-pc/OneDrive%20-%20ut.edu.co/syscafe-JOSEOMAR-PC/taxi%20SMR842/maquitaxis/.env.example).

### Paso 2: Obtener el `SUPABASE_ACCESS_TOKEN` (Supabase Cloud)

1. Inicia sesión en [Supabase Dashboard](https://supabase.com/dashboard).
2. Ve a **Account Settings** -> **Access Tokens** (o ingresa a [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)).
3. Haz clic en **Generate New Token**.
4. Nómbralo (ejemplo: `Antigravity MCP MaquiTaxis`).
5. Copia el token generado (`sbp_...`) y pégalo en tu archivo `.env` en la variable `SUPABASE_ACCESS_TOKEN`.

### Paso 3: Obtener el `SUPABASE_PROJECT_REF`

1. En Supabase Dashboard, abre tu proyecto.
2. Mira la URL en la barra del navegador: `https://supabase.com/dashboard/project/abcdefghijklmnopqrst`
3. El código `abcdefghijklmnopqrst` es tu `SUPABASE_PROJECT_REF`.

---

## 5. Trabajar con Supabase CLI (Desarrollo Local)

Si utilizas Supabase en entorno local mediante Docker y Supabase CLI:

```bash
# Iniciar Supabase Local (Crea la base de datos, ejecuta migraciones y aplica seed.sql)
npm run db:start

# Reiniciar base de datos local
npm run db:reset

# Generar tipos TypeScript automáticos para @maquitaxis/shared
npm run db:types:local

# Detener Supabase Local
npm run db:stop
```

Cuando Supabase Local está activo, el servidor `supabase-postgres-local` se conecta automáticamente a `127.0.0.1:54322` sin necesidad de credenciales remotas.

---

## 6. Comandos Npm para Ejecutar Servidores MCP Manualmente

Si deseas iniciar o probar los servidores MCP desde la terminal del proyecto:

```bash
# Servidor MCP Oficial de Supabase
npm run mcp:supabase

# Servidor MCP de PostgreSQL Directo (Local)
npm run mcp:postgres
```

---

## 7. Tipos TypeScript de Supabase (`@maquitaxis/shared`)

Se han incluido los tipos estáticos generados en [`packages/shared/src/database.types.ts`](file:///c:/Users/Omar-pc/OneDrive%20-%20ut.edu.co/syscafe-JOSEOMAR-PC/taxi%20SMR842/maquitaxis/packages/shared/src/database.types.ts).

Puedes importarlos en cualquier app (`apps/web` o `apps/mobile`) así:

```typescript
import { Database } from '@maquitaxis/shared';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

---

## 8. Ejemplo de Prompts para Probar MCP con la IA

Una vez configurado el MCP, puedes pedirle a la IA cosas como:

- 💬 *"Consulta la lista de tablas en mi base de datos de Supabase y sus relaciones."*
- 💬 *"Muestra las políticas RLS actuales en la tabla `vehiculos` y `terceros`."*
- 💬 *"Ejecuta una consulta SQL para contar el número de carreras registradas hoy."*
- 💬 *"Verifica si el tipo TypeScript de `produccion` coincide con las columnas en la base de datos."*

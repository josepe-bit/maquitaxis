# Registro de Decisiones de Arquitectura (ADR) - MaquiTaxis

Este documento registra las decisiones técnicas y de arquitectura tomadas durante el análisis y desarrollo del proyecto MaquiTaxis, especificando el contexto, las alternativas evaluadas y las razones de cada elección.

---

## ADR-001: Estructura del Proyecto (Estructura Multimodular / Monorepo Liviano)

- **Fecha**: 2026-08-21
- **Estado**: Aprobado

### Problema
El proyecto requiere dos aplicaciones independientes (App Móvil para conductores en React Native/Expo y Panel Administrativo Web en React/Vite), además de compartir tipos e interfaces de TypeScript y configuraciones de Supabase.

### Alternativas Consideradas
1. **Dos repositorios separados totalmente independientes**: Dificulta mantener sincronizados los tipos de TypeScript de la base de datos y la configuración compartida de Supabase.
2. **Monorepo complejo con Turborepo / Nx**: Agrega complejidad innecesaria de herramientas para la fase actual de MVP.
3. **Estructura organizada en carpetas (`apps/mobile`, `apps/web`, `packages/shared`, `supabase`)**: Permite compartir tipos e interfaces sin agregar dependencias complejas de orquestación.

### Decisión Tomada
Adoptar la opción 3 (Estructura organizada en carpetas con `packages/shared`), manteniendo la simplicidad requerida para el MVP pero permitiendo escalar fácilmente.

### Motivo
Maximiza la reutilización de código de TypeScript (interfaces de base de datos, enums de estado de taxi, DTOs de GPS) y facilita la mantenibilidad del proyecto desde un único repositorio.

---

## ADR-002: Estrategia de Captura y Filtrado GPS Móvil (Eficiencia de Batería y Datos)

- **Fecha**: 2026-08-21
- **Estado**: Aprobado

### Problema
Guardar o transmitir la ubicación GPS a la base de datos indiscriminadamente cada segundo agota rápidamente la batería del dispositivo móvil, consume datos celularess innecesarios e infla la base de datos con millones de registros redundantes cuando el taxi está detenido.

### Alternativas Consideradas
1. **Envío continuo por intervalos de tiempo fijos (ej. cada 1 segundo)**: Extremadamente ineficiente en batería, datos y almacenamiento de BD.
2. **Envío basado exclusivamente en distancia (ej. cada 20 metros)**: Eficiente en movimiento, pero el panel web perdería la confirmación de "liveness" (conexión activa) si el taxi se detiene en un semáforo o parqueadero durante minutos u horas.
3. **Estrategia Híbrida Inteligente (Distancia + Tiempo Máximo + Filtro de Precisión)**:
   - Captura continua mediante el API de ubicación de Expo.
   - Descarte de posiciones con precisión pobre (> 30 metros).
   - Envío al backend si el vehículo se desplaza más de 10-15 metros O si transcurre un intervalo máximo (ej. 30 segundos) en reposo.

### Decisión Tomada
Adoptar la Opción 3 (Estrategia Híbrida Inteligente).

### Motivo
Garantiza fluidez y precisión en el seguimiento mientras el vehículo avanza, mantiene el estado de conexión ("liveness") en el panel sin saturar la base de datos con puntos idénticos cada segundo, y optimiza sensiblemente el consumo de batería y datos móviles.

---

## ADR-003: Transmisión y Almacenamiento en Tiempo Real (Supabase Realtime + PostgreSQL)

- **Fecha**: 2026-08-21
- **Estado**: Aprobado

### Problema
El panel administrativo necesita mostrar la ubicación de los taxis en servicio prácticamente en tiempo real sin obligar al usuario a recargar la página manualmente.

### Alternativas Consideradas
1. **Polling HTTP desde el Frontend Web (ej. consulta cada 5 segundos)**: Genera peticiones HTTP innecesarias a la base de datos cuando no hay cambios o cuando hay pocos vehículos.
2. **Servidor WebSocket personalizado (Node.js/Socket.io)**: Requiere mantener y gestionar un servidor Node.js independiente, contradiciendo el requerimiento de evitar servidores dedicados para el MVP.
3. **Supabase Realtime (Postgres Changes / Broadcast)**: Utiliza la infraestructura gestionada de Supabase para transmitir las actualizaciones directamente desde PostgreSQL o canales websockets hacia el panel web.

### Decisión Tomada
Utilizar **Supabase Realtime**.

### Motivo
Aprovecha directamente la infraestructura serverless elegida sin necesidad de construir ni desplegar un servidor backend dedicado.

---

## ADR-004: Proveedor de Mapas para el Panel Administrativo Web (Leaflet + OpenStreetMap)

- **Fecha**: 2026-08-21
- **Estado**: Aprobado

### Problema
El panel web requiere renderizar un mapa interactivo para ubicar los taxis y trazar el historial de recorridos.

### Alternativas Consideradas
1. **Google Maps JavaScript API**: Requiere tarjeta de crédito, cuenta de Google Cloud y puede generar costos impredecibles por consumo.
2. **Mapbox GL JS**: Excelente calidad visual, pero requiere Token de acceso y tiene cuotas gratuitas limitadas.
3. **Leaflet + OpenStreetMap**: Código abierto, gratuito, ligero, sin necesidad de claves de pago directas y ampliamente probado en la industria.

### Decisión Tomada
Adoptar **Leaflet + OpenStreetMap** para la primera versión (MVP).

### Motivo
Cumple 100% con los requerimientos iniciales sin generar costos de API ni dependencias con proveedores de pago. La arquitectura desacoplada permitirá cambiar a Mapbox o Google Maps en el futuro si se requiere.

---

## ADR-005: Seguridad y Protección de Datos mediante Row Level Security (RLS)

- **Fecha**: 2026-08-21
- **Estado**: Aprobado

### Problema
Garantizar que los conductores solo puedan acceder y registrar datos propios, y que los administradores tengan control total, evitando que usuarios malintencionados modifiquen datos a través del API del cliente.

### Alternativas Consideradas
1. **Validación de permisos únicamente en el cliente (Frontend)**: Vulnerable a manipulación de peticiones HTTP desde herramientas como Postman o inspección del navegador.
2. **Políticas de Seguridad a nivel de Base de Datos (Supabase RLS en PostgreSQL)**: Todas las consultas de lectura y escritura son evaluadas directamente por el motor de PostgreSQL según el token JWT autenticado.

### Decisión Tomada
Implementar **Row Level Security (RLS)** obligatoriamente en todas las tablas de PostgreSQL.

### Motivo
Garantiza seguridad real e inexpugnable independiente del cliente que consuma las APIs de Supabase.

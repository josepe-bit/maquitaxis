# **Contexto general del proyecto**

Quiero desarrollar una aplicación para gestionar y monitorear uno o varios taxis.

El sistema debe permitir registrar los taxis, conductores y viajes, y principalmente permitir conocer la ubicación de los taxis mediante GPS mientras están en servicio.

La aplicación tendrá dos partes principales:

1. Una aplicación móvil utilizada por los conductores.  
2. Un panel web administrativo utilizado por administradores o despachadores.

El proyecto debe diseñarse inicialmente como un MVP, pero con una arquitectura que permita crecer posteriormente a una flota de muchos taxis.

# **Objetivo principal**

El objetivo principal es poder visualizar en un mapa la ubicación actual de los taxis y conservar el historial de sus recorridos.

Un conductor debe poder iniciar y finalizar su jornada o seguimiento.

Mientras el seguimiento esté activo, la aplicación móvil debe obtener periódicamente la ubicación GPS del dispositivo y enviarla al backend.

El panel administrativo debe recibir las actualizaciones y mostrar los taxis en un mapa prácticamente en tiempo real.

# **Arquitectura tecnológica**

Quiero utilizar inicialmente el siguiente stack:

## **Aplicación móvil**

* React Native  
* Expo  
* TypeScript

La aplicación móvil estará orientada principalmente a los conductores.

## **Panel administrativo**

* React  
* TypeScript  
* Vite

El panel permitirá administrar taxis, conductores y consultar las ubicaciones y recorridos.

## **Backend**

Quiero utilizar Supabase como backend principal.

Utilizar:

* Supabase Auth para autenticación.  
* PostgreSQL como base de datos.  
* Supabase Realtime para actualizaciones de ubicación.  
* Supabase Storage si posteriormente necesitamos almacenar archivos.  
* Supabase Edge Functions únicamente cuando sea necesario ejecutar lógica del lado del servidor.

No crear inicialmente un backend independiente con Node.js, Python, NestJS u otro framework.

## **Mapas**

Inicialmente utilizar:

* Leaflet para el mapa web.  
* OpenStreetMap como fuente cartográfica.

La arquitectura debe permitir sustituir posteriormente el proveedor de mapas o incorporar servicios de rutas/geocodificación.

# **Principios importantes**

Quiero que el proyecto sea sencillo de mantener, pero correctamente estructurado.

No quiero una arquitectura excesivamente compleja.

Evitar inicialmente:

* Microservicios.  
* Kubernetes.  
* Redis.  
* Kafka.  
* Servidores VPS.  
* Backend separado.  
* Arquitecturas innecesariamente complejas.

El sistema debe estar preparado para crecer, pero el objetivo inicial es construir un MVP funcional.

# **Funcionamiento general**

El flujo básico será:

Conductor:

1. Abre la aplicación.  
2. Inicia sesión.  
3. Visualiza el taxi que tiene asignado.  
4. Puede iniciar el seguimiento.  
5. La aplicación solicita los permisos necesarios para acceder al GPS.  
6. Mientras el seguimiento está activo, obtiene periódicamente la ubicación.  
7. Envía la ubicación al backend.  
8. Puede finalizar el seguimiento.

Administrador:

1. Inicia sesión en el panel web.  
2. Visualiza un dashboard.  
3. Puede visualizar todos los taxis.  
4. Puede ver los taxis sobre un mapa.  
5. Puede consultar el estado de cada taxi.  
6. Puede consultar la última ubicación conocida.  
7. Puede consultar posteriormente el historial de recorridos.

# **Seguimiento GPS**

El sistema debe considerar que no es conveniente guardar una posición GPS cada segundo indefinidamente.

La implementación debe ser eficiente en consumo de:

* batería.  
* datos móviles.  
* almacenamiento.  
* operaciones de base de datos.  
* mensajes Realtime.

La frecuencia de actualización debe ser configurable.

Inicialmente utilizar una estrategia razonable, por ejemplo actualizar aproximadamente cada 5-10 segundos mientras el vehículo está en movimiento, pero no asumir este valor como definitivo.

También se debe poder considerar la distancia recorrida para evitar almacenar posiciones prácticamente idénticas.

La lógica de captura de ubicación debe estar separada del resto de la aplicación para poder modificar posteriormente esta estrategia.

# **Tiempo real**

Cuando un taxi esté transmitiendo su ubicación:

Aplicación móvil  
 → Supabase  
 → PostgreSQL / Realtime  
 → Panel administrativo

El panel debe poder actualizar la posición del taxi sin necesidad de recargar manualmente la página.

La implementación debe estar preparada para múltiples taxis conectados simultáneamente.

# **Estados del taxi**

La arquitectura debe permitir manejar diferentes estados.

Como mínimo considerar:

* Disponible.  
* En servicio.  
* Fuera de servicio.  
* Sin conexión.

No asumir todavía que estos son los estados definitivos. Deben poder modificarse cuando entregue los requerimientos funcionales y de base de datos.

# **Historial**

El sistema debe conservar información suficiente para posteriormente:

* consultar recorridos.  
* visualizar un recorrido sobre el mapa.  
* conocer cuándo comenzó un seguimiento.  
* conocer cuándo terminó.  
* consultar las posiciones registradas durante un recorrido.

La estructura definitiva para almacenar esta información se definirá después de que proporcione los requerimientos de la base de datos.

# **Seguridad**

La aplicación debe utilizar autenticación.

Debe existir separación entre los diferentes tipos de usuario.

El acceso a la información debe estar protegido utilizando las políticas de seguridad de Supabase/PostgreSQL, especialmente Row Level Security (RLS).

No confiar únicamente en las restricciones implementadas en el frontend.

Nunca colocar claves secretas de Supabase en la aplicación móvil o en el frontend.

Las credenciales y variables de entorno deben manejarse correctamente.

# **Código**

Quiero utilizar TypeScript de forma estricta.

Mantener una estructura de proyecto clara y modular.

Separar:

* componentes visuales.  
* lógica de negocio.  
* acceso a Supabase.  
* autenticación.  
* GPS/localización.  
* mapas.  
* tipos/interfaces.  
* utilidades.

Evitar colocar toda la lógica en un único archivo o componente.

Crear funciones y componentes reutilizables.

# **Diseño**

La interfaz debe ser sencilla, profesional y orientada a una aplicación de gestión de taxis.

Priorizar:

* claridad.  
* facilidad de uso.  
* información importante visible.  
* diseño responsive en el panel administrativo.  
* buen funcionamiento en dispositivos móviles.

No agregar funcionalidades que no hayan sido solicitadas.

# **Forma de trabajar**

IMPORTANTE:

Por ahora NO quiero que construyas toda la aplicación.

Primero quiero que entiendas este contexto y arquitectura.

Posteriormente te proporcionaré los requerimientos de la base de datos.

Cuando te entregue los requerimientos de la base de datos:

1. Analiza los requerimientos.  
2. Identifica entidades, relaciones y reglas de negocio.  
3. Propón las tablas necesarias.  
4. Propón claves primarias y foráneas.  
5. Propón índices.  
6. Propón restricciones y validaciones.  
7. Propón las políticas RLS necesarias.  
8. Identifica posibles problemas de escalabilidad relacionados con el almacenamiento de posiciones GPS.  
9. Identifica cualquier ambigüedad o contradicción en los requerimientos.  
10. No ejecutes cambios todavía si existen decisiones importantes que debamos confirmar.

Después de revisar el modelo de datos, construiremos progresivamente la aplicación.

No inventes requerimientos funcionales que no te haya proporcionado.

Si consideras que una decisión técnica es necesaria, explícala y propón alternativas antes de implementarla.

# **Objetivo de la primera versión**

La primera versión funcional deberá permitir posteriormente:

* autenticación de usuarios.  
* gestión de conductores.  
* gestión de taxis.  
* asignación de conductor a taxi.  
* inicio de seguimiento.  
* captura de ubicación GPS.  
* envío de ubicación.  
* visualización de taxis en un mapa.  
* actualización de posiciones en tiempo real.  
* finalización del seguimiento.  
* consulta del historial de recorridos.

La definición exacta de estas funcionalidades se realizará a medida que avancemos con los requerimientos.

Por ahora, considera este documento como el contexto técnico y arquitectónico general del proyecto.

Espera mis siguientes indicaciones sobre los requerimientos de la base de datos antes de comenzar a crear tablas, migraciones o código relacionado con el modelo de datos.


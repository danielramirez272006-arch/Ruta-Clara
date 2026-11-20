# Arquitectura del Sistema — Ruta Clara

## 1. Visión General y Capas

**Ruta Clara** implementa una arquitectura de tres capas desacopladas en JavaScript puro (módulos ES), diseñada para proteger credenciales, garantizar integridad transaccional en MySQL 8.0.16+ y ofrecer una interfaz accesible y completamente en español.

```
[ Navegador: React (.js/.jsx) + Tailwind CSS ]
                     │
                     │ Solicitudes HTTP JSON (sin SQL ni claves secretas)
                     ▼
[ Servidor Backend: Node.js + Express (ESM) ]
       ├── routes/          (Declaración de los 16 endpoints REST)
       ├── controllers/     (Manejo HTTP, códigos de estado y respuestas JSON)
       ├── validators/      (Validación estricta en servidor)
       ├── services/        (Reglas de negocio, métricas y transacciones)
       ├── repositories/    (Consultas SQL parametrizadas con mysql2/promise)
       └── integrations/    (Cliente HTTP hacia Claude / Anthropic sin PII)
             │                                     │
             │ Pool mysql2/promise                 │ HTTPS (x-api-key en servidor)
             ▼                                     ▼
[ Base de Datos: MySQL 8.0.16+ ]        [ API de Claude (Anthropic) ]
```

---

## 2. Decisiones Clave de Ingeniería

1. **Aislamiento de Credenciales**:
   - El frontend jamás recibe `DB_PASSWORD` ni `ANTHROPIC_API_KEY`.
   - La pantalla de Configuración consulta `GET /health` para informar el estado de conexión y ofrece instrucciones para configurar `.env` en el servidor.

2. **Integridad Transaccional y Control de Concurrencia en MySQL**:
   - El avance de etapa (`PATCH /prospectos/:id/etapa`), la creación de oportunidades (`POST /prospectos`) y los cambios de estado comercial (`PATCH /prospectos/:id/estado`) se ejecutan dentro de transacciones `BEGIN ... COMMIT / ROLLBACK`.
   - Al avanzar una etapa o modificar el estado comercial se bloquea el registro con `SELECT ... FOR UPDATE`, impidiendo condiciones de carrera o saltos de etapa ante solicitudes simultáneas.

3. **Preservación de Antigüedad e Historial**:
   - Editar preferencias (`PATCH /prospectos/:id/preferencias`) actualiza `editado_en`, pero conserva intacto `ultimo_avance_en`.
   - Registrar una pérdida conserva la etapa actual y sus filas en `historial_etapas` para no distorsionar los denominadores históricos del embudo.
   - Reabrir una oportunidad restaura `estado_comercial = 'abierta'` conservando `ultimo_avance_en` y registra el evento en `eventos_comerciales`.

4. **Privacidad y Transparencia en IA**:
   - `ClaudeIntegration` construye el prompt únicamente con metadatos operativos del viaje (etapa, sede, siguiente acción, destino, presupuesto/moneda, número de viajeros y fecha de salida), omitiendo el nombre del cliente.
   - Si `ANTHROPIC_API_KEY` no está definida, el backend responde con HTTP `503` y código `CLAUDE_API_KEY_FALTANTE`, sin engañar al usuario con plantillas prefabricadas disfrazadas de IA.

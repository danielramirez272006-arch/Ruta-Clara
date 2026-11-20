# Documentación de la API REST — Ruta Clara

La API REST de **Ruta Clara** está construida con **Node.js**, **Express** (módulos ES) y **mysql2/promise** contra **MySQL 8.0.16+**.

- **URL Base local**: `http://localhost:3001` (también accesible con prefijo `/api`, p. ej. `http://localhost:3001/api/embudo`).
- **Formato de intercambio**: `application/json; charset=utf-8`.
- **Fechas**: Almacenadas y devueltas en UTC (`YYYY-MM-DD HH:MM:SS` o ISO 8601).
- **Monedas soportadas**: **Colón costarricense (`CRC`)** y **Dólar estadounidense (`USD`)**. Nunca se suman monedas diferentes entre sí.
- **Terminología**: En las rutas heredadas del taller, el recurso `/prospectos` representa una **oportunidad de viaje**; `/clientes` representa a la entidad independiente del viajero.

---

## 1. Resumen de Endpoints

| Método | Ruta | Origen | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/prospectos` | Taller (conservada) | Crea una oportunidad de viaje en etapa 1 (con cliente existente o nuevo). |
| `PATCH` | `/prospectos/:id/etapa` | Taller (conservada) | Avanza secuencialmente a la siguiente etapa inmediata dentro de una transacción con `FOR UPDATE`. |
| `GET` | `/embudo` | Taller (conservada) | Devuelve métricas históricas, conversión, fuga observada, brecha, faltantes, motivos de pérdida y comparativas por sede/destino. |
| `GET` | `/atencion?dias=N` | Taller (conservada) | Devuelve oportunidades sin avance durante `N` días (1..365), excluyendo perdidas y cerradas. |
| `POST` | `/prospectos/:id/mensaje` | Taller (conservada) | Solicita a DeepSeek desde Express un borrador de seguimiento (≤ 100 palabras, sin PII, con selector de tono). |
| `GET` | `/clientes` | Agregada | Lista y busca clientes (por nombre, correo o teléfono ficticio) con sus oportunidades. |
| `POST` | `/clientes` | Agregada | Crea un cliente ficticio independiente con datos de contacto opcionales. |
| `GET` | `/clientes/:id` | Agregada | Obtiene el detalle de un cliente y todas sus oportunidades de viaje. |
| `PATCH` | `/clientes/:id` | Agregada | Actualiza nombre, teléfono, correo o preferencia de contacto de un cliente. |
| `GET` | `/prospectos` | Agregada | Lista oportunidades con filtros por sede, canal, etapa, estado comercial y búsqueda. |
| `GET` | `/prospectos/:id` | Agregada | Obtiene la ficha completa de una oportunidad, historial de etapas, eventos y notas del asesor. |
| `PATCH` | `/prospectos/:id/preferencias` | Agregada | Edita preferencias del viaje (`CRC` / `USD`) sin reiniciar `ultimo_avance_en`. |
| `PATCH` | `/prospectos/:id/estado` | Agregada | Registra pérdida con motivo obligatorio o reapertura conservando antigüedad. |
| `POST` | `/prospectos/:id/notas` | Agregada | Agrega una nota comercial a la bitácora de la oportunidad sin reiniciar antigüedad. |
| `GET` | `/resumen` | Agregada | Devuelve KPIs de inicio, resumen del embudo, mayor brecha, canales y seguimientos. |
| `GET` | `/campanas` | Agregada | Lista el historial de campañas de redes sociales generadas y guardadas en MySQL. |
| `POST` | `/campanas` | Agregada | Genera tres borradores para redes sociales con DeepSeek según objetivo y sede, y los guarda en MySQL. |
| `PATCH` | `/campanas/:id/aprobar` | Agregada | Marca una campaña guardada como `"Aprobada por el agente"`. |
| `POST` | `/semilla/restaurar` | Agregada | Restaura en una transacción la semilla académica original de 40 oportunidades (`[4, 4, 3, 18, 2, 2, 3, 2, 2]`). |
| `GET` | `/exportar` | Agregada | Exporta los datos ficticios y catálogos en formato JSON. |
| `GET` | `/health` | Agregada | Verifica el estado real de conexión con MySQL y si `DEEPSEEK_API_KEY` está configurada. |

---

## 2. Detalle de Solicitudes, Respuestas, Validaciones y Códigos HTTP

### 2.1 `GET /health`
Verifica la conectividad real del backend con MySQL y la presencia de la clave de DeepSeek en el entorno del servidor.

- **Códigos HTTP**:
  - `200 OK`: Conexión activa con MySQL.
  - `503 Service Unavailable`: MySQL no disponible.
- **Respuesta (`200 OK`)**:
```json
{
  "ok": true,
  "servicio": "Ruta Clara API REST",
  "timestamp_utc": "2026-11-20T19:30:00.000Z",
  "mysql": {
    "conectado": true,
    "host": "127.0.0.1",
    "port": 3306,
    "database": "ruta_clara",
    "total_oportunidades": 40,
    "mensaje": "Conexión con MySQL verificada correctamente."
  },
  "ia": {
    "proveedor": "DeepSeek",
    "configurado": true,
    "modelo": "deepseek-chat",
    "mensaje": "Clave DEEPSEEK_API_KEY detectada en el servidor Express (deepseek-chat)."
  }
}
```

---

### 2.2 `POST /prospectos` (Crear oportunidad de viaje en `CRC` o `USD`)
Crea una oportunidad en la etapa 1 (`Consulta recibida`) y registra su entrada inicial en `historial_etapas` dentro de una transacción MySQL.

- **Solicitud**:
```json
{
  "cliente_id": 1,
  "sede_id": 1,
  "destino": "Oaxaca",
  "presupuesto_total": 1250000.00,
  "moneda": "CRC",
  "viajeros": 2,
  "fecha_salida": "2027-04-15",
  "canal": "WhatsApp"
}
```
- **Validaciones**:
  - `presupuesto_total` > 0 (`VALIDACION_PRESUPUESTO_INVALIDO`).
  - `moneda` en `['CRC', 'USD']` (`VALIDACION_MONEDA_INVALIDA`).
  - `viajeros` entero entre `1` y `50` (`VALIDACION_VIAJEROS_FUERA_RANGO`).
  - `fecha_salida` calendario real `YYYY-MM-DD` (`VALIDACION_FECHA_INVALIDA`).
  - `canal` en `['Instagram', 'Referido', 'Web', 'WhatsApp']` (`VALIDACION_CANAL_INVALIDO`).
- **Códigos HTTP**: `201 Created`, `400 Bad Request`, `404 Not Found`.

---

### 2.3 `PATCH /prospectos/:id/preferencias`, `PATCH /prospectos/:id/etapa` y `PATCH /prospectos/:id/estado`
- **`PATCH /prospectos/:id/preferencias`**: Actualiza preferencias del viaje (`destino`, `presupuesto_total`, `moneda`, `viajeros`, `fecha_salida`, `sede_id`, `canal`) sin modificar `ultimo_avance_en`. Devuelve `409 Conflict` si la oportunidad está perdida.
- **`PATCH /prospectos/:id/etapa`**: Avanza únicamente a la siguiente etapa inmediata (`orden + 1`) usando transacción y bloqueo `SELECT ... FOR UPDATE`. Si se intenta saltar etapas devuelve `400 AVANCE_NO_SECUENCIAL`.
- **`PATCH /prospectos/:id/estado`**: Registra pérdida con `motivo_perdida_id` obligatorio (`1..6`) o reapertura (`accion: "reabrir"`), conservando etapa, historial y antigüedad (`ultimo_avance_en`).

---

### 2.4 `POST /prospectos/:id/mensaje` y `POST /campanas` (DeepSeek IA)
- **`POST /prospectos/:id/mensaje`**:
  - Recibe opcionalmente `{ "tono": "cálido y consultivo" }`.
  - Envía a DeepSeek exclusivamente: etapa, sede, siguiente acción, destino, presupuesto y moneda (`CRC`/`USD`), número de viajeros, fecha preferida y tono. **Nunca envía nombres, teléfonos ni correos**.
  - Devuelve mensaje en español de máximo 100 palabras en estado `"Pendiente de aprobación humana"`.
- **`POST /campanas`**:
  - Recibe `{ "objetivo": "...", "sede_id": 1 }`.
  - Genera 3 borradores para redes sociales en estado `"Pendiente de aprobación"` y los guarda en la tabla `campanas_guardadas`.
- **Códigos HTTP**:
  - `200 OK`: Borrador generado.
  - `409 Conflict`: Si la oportunidad está marcada como perdida.
  - `503 Service Unavailable`: Si falta `DEEPSEEK_API_KEY` en el servidor (`IA_API_KEY_FALTANTE`).
  - `502 Bad Gateway`: Si el proveedor devuelve error (`IA_PROVEEDOR_ERROR`).

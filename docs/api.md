# Documentación de la API REST — Ruta Clara

La API REST de **Ruta Clara** está construida con **Node.js**, **Express** (módulos ES) y **mysql2/promise** contra **MySQL 8.0.16+**.

- **URL Base local**: `http://localhost:3001` (también accesible con prefijo `/api`, p. ej. `http://localhost:3001/api/embudo`).
- **Formato de intercambio**: `application/json; charset=utf-8`.
- **Fechas**: Almacenadas y devueltas en UTC (`YYYY-MM-DD HH:MM:SS` o ISO 8601).
- **Terminología**: En las rutas heredadas del taller, el recurso `/prospectos` representa una **oportunidad de viaje**; `/clientes` representa a la entidad independiente del viajero.

---

## 1. Resumen de Endpoints

| Método | Ruta | Origen | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/prospectos` | Taller (conservada) | Crea una oportunidad de viaje en etapa 1 (con cliente existente o nuevo). |
| `PATCH` | `/prospectos/:id/etapa` | Taller (conservada) | Avanza secuencialmente a la siguiente etapa inmediata dentro de una transacción con `FOR UPDATE`. |
| `GET` | `/embudo` | Taller (conservada) | Devuelve métricas históricas, conversión, fuga observada, brecha, faltantes y motivos de pérdida. |
| `GET` | `/atencion?dias=N` | Taller (conservada) | Devuelve oportunidades sin avance durante `N` días (1..365), excluyendo perdidas y cerradas. |
| `POST` | `/prospectos/:id/mensaje` | Taller (conservada) | Solicita a Claude desde Express un borrador de seguimiento (≤ 100 palabras, sin PII). |
| `GET` | `/clientes` | Agregada | Lista y busca clientes con sus oportunidades de viaje asociadas. |
| `POST` | `/clientes` | Agregada | Crea un cliente ficticio independiente. |
| `GET` | `/clientes/:id` | Agregada | Obtiene el detalle de un cliente y todas sus oportunidades de viaje. |
| `PATCH` | `/clientes/:id` | Agregada | Actualiza el nombre o marca de un cliente. |
| `GET` | `/prospectos` | Agregada | Lista oportunidades con filtros por sede, canal, etapa, estado comercial y búsqueda. |
| `GET` | `/prospectos/:id` | Agregada | Obtiene la ficha completa de una oportunidad, su historial de etapas y eventos comerciales. |
| `PATCH` | `/prospectos/:id/preferencias` | Agregada | Edita preferencias del viaje sin reiniciar `ultimo_avance_en`. |
| `PATCH` | `/prospectos/:id/estado` | Agregada | Registra pérdida con motivo obligatorio o reapertura conservando antigüedad. |
| `GET` | `/resumen` | Agregada | Devuelve KPIs de inicio, resumen del embudo, mayor brecha, canales y seguimientos. |
| `POST` | `/campanas` | Agregada | Genera tres borradores para redes sociales con Claude según objetivo y sede. |
| `GET` | `/health` | Agregada | Verifica el estado real de conexión con MySQL y si `ANTHROPIC_API_KEY` está configurada. |
| `GET` | `/exportar` | Agregada | Exporta los datos ficticios y catálogos en formato JSON. |

---

## 2. Detalle de Solicitudes, Respuestas, Validaciones y Códigos HTTP

### 2.1 `GET /health`
Verifica la conectividad real del backend con MySQL y la presencia de la clave de Claude en el entorno del servidor.

- **Códigos HTTP**:
  - `200 OK`: Conexión activa con MySQL.
  - `503 Service Unavailable`: MySQL no disponible.
- **Respuesta (`200 OK`)**:
```json
{
  "ok": true,
  "servicio": "Ruta Clara API REST",
  "timestamp_utc": "2026-11-20T17:20:00.000Z",
  "mysql": {
    "conectado": true,
    "host": "127.0.0.1",
    "port": 3306,
    "database": "ruta_clara",
    "total_oportunidades": 40,
    "mensaje": "Conexión con MySQL verificada correctamente."
  },
  "claude": {
    "configurado": false,
    "modelo": "claude-3-5-haiku-latest",
    "mensaje": "ANTHROPIC_API_KEY no configurada en el servidor (.env)."
  }
}
```

---

### 2.2 `GET /clientes` y `POST /clientes`

#### `GET /clientes?busqueda=Valeria`
- **Códigos HTTP**: `200 OK`.
- **Respuesta**: Arreglo de clientes con `total_oportunidades` y arreglo `oportunidades`.

#### `POST /clientes`
- **Validaciones**:
  - `nombre`: cadena obligatoria entre 2 y 140 caracteres.
  - `es_ficticio`: booleano o `0`/`1` (por defecto `1`).
- **Códigos HTTP**:
  - `201 Created`: Cliente creado.
  - `400 Bad Request`: Nombre vacío o inválido (`VALIDACION_NOMBRE_CLIENTE`).

---

### 2.3 `GET /clientes/:id` y `PATCH /clientes/:id`
- **Validaciones**:
  - `:id` entero positivo (`VALIDACION_ID_INVALIDO`).
- **Códigos HTTP**:
  - `200 OK`: Cliente encontrado o actualizado.
  - `404 Not Found`: `CLIENTE_NO_ENCONTRADO`.

---

### 2.4 `GET /prospectos` y `GET /prospectos/:id`
- **Parámetros query opcionales en `GET /prospectos`**:
  - `busqueda` (filtra por nombre de cliente o destino).
  - `sede_id` (`1` Desamparados, `2` Puntarenas).
  - `canal` (`Instagram`, `Referido`, `Web`, `WhatsApp`).
  - `etapa_id` (`1` a `9`).
  - `estado_comercial` (`abierta`, `perdida`, `cerrada`).
- **Códigos HTTP**: `200 OK`, `404 Not Found` (en `/:id` si no existe).

---

### 2.5 `POST /prospectos` (Crear oportunidad de viaje)
Crea una oportunidad en la etapa 1 (`Consulta recibida`) y registra su entrada inicial en `historial_etapas` dentro de una transacción MySQL.

- **Solicitud (con cliente existente)**:
```json
{
  "cliente_id": 1,
  "sede_id": 1,
  "destino": "Oaxaca",
  "presupuesto_total": 46800.00,
  "moneda": "MXN",
  "viajeros": 2,
  "fecha_salida": "2027-04-15",
  "canal": "WhatsApp"
}
```
- **Solicitud (creando cliente nuevo simultáneamente)**:
  Enviar `"cliente_nombre": "Elena Rojas (Ficticio)"` en lugar de `cliente_id`.
- **Validaciones**:
  - `presupuesto_total` > 0 (`VALIDACION_PRESUPUESTO_INVALIDO`).
  - `moneda` en `['MXN', 'USD', 'EUR']` (`VALIDACION_MONEDA_INVALIDA`).
  - `viajeros` entero entre `1` y `50` (`VALIDACION_VIAJEROS_FUERA_RANGO`).
  - `fecha_salida` calendario real `YYYY-MM-DD` (`VALIDACION_FECHA_INVALIDA`).
  - `canal` en `['Instagram', 'Referido', 'Web', 'WhatsApp']` (`VALIDACION_CANAL_INVALIDO`).
- **Códigos HTTP**:
  - `201 Created`: Oportunidad creada con su historial inicial.
  - `400 Bad Request`: Error de validación.
  - `404 Not Found`: Si `cliente_id` no existe.

---

### 2.6 `PATCH /prospectos/:id/preferencias`
Actualiza `destino`, `presupuesto_total`, `moneda`, `viajeros`, `fecha_salida`, `sede_id` o `canal`.
- **Regla de negocio**: Actualiza `editado_en` pero **nunca modifica `ultimo_avance_en`** (no reinicia la antigüedad de la etapa).
- **Códigos HTTP**:
  - `200 OK`: Preferencias actualizadas.
  - `400 Bad Request`: Datos fuera de rango.
  - `404 Not Found`: Oportunidad inexistente.
  - `409 Conflict`: Bloqueado si `estado_comercial === 'perdida'` (`OPORTUNIDAD_PERDIDA_BLOQUEADA`).

---

### 2.7 `PATCH /prospectos/:id/etapa`
Avanza la oportunidad **únicamente a la siguiente etapa inmediata** (`orden + 1`).
- **Transacción y concurrencia**: Abre transacción MySQL, bloquea la fila con `SELECT ... FOR UPDATE`, actualiza `etapa_id` y `ultimo_avance_en`, e inserta en `historial_etapas`. Si ocurre cualquier fallo, ejecuta `ROLLBACK`.
- **Códigos HTTP**:
  - `200 OK`: Etapa avanzada e historial guardado.
  - `400 Bad Request`: Si se intenta saltar o retroceder etapas (`AVANCE_NO_SECUENCIAL`).
  - `404 Not Found`: Oportunidad no encontrada.
  - `409 Conflict`: Si la oportunidad está `perdida` o ya alcanzó la etapa 9 (`ULTIMA_ETAPA_ALCANZADA`).

---

### 2.8 `PATCH /prospectos/:id/estado`
Registra una pérdida con motivo obligatorio o reabre una oportunidad perdida.

- **Solicitud para registrar pérdida**:
```json
{
  "accion": "perder",
  "estado_comercial": "perdida",
  "motivo_perdida_id": 1
}
```
- **Solicitud para reabrir**:
```json
{
  "accion": "reabrir",
  "estado_comercial": "abierta"
}
```
- **Reglas de negocio**:
  - Conserva la etapa actual y todo el historial en `historial_etapas`.
  - Inserta un registro en `eventos_comerciales` (`tipo = 'perdida'` o `'reapertura'`) con fecha UTC.
  - Reabrir conserva `ultimo_avance_en` (mantiene la antigüedad de la etapa).
- **Códigos HTTP**: `200 OK`, `400 Bad Request` (si falta `motivo_perdida_id`), `404 Not Found`, `409 Conflict`.

---

### 2.9 `GET /embudo`
Calcula las métricas de las 9 etapas sobre el historial completo:
- `actuales`, `alcanzaron`, `avanzaron`, `conversion`, `fuga_observada`, `meta`, `brecha`, `faltantes`.
- Incluye `mayor_brecha`, `perdidas_confirmadas` desglosadas por motivo y `explicacion_formulas`.
- **Códigos HTTP**: `200 OK`.

---

### 2.10 `GET /atencion?dias=N`
- **Validaciones**: `dias` entero entre `1` y `365` (por defecto `7`).
- **Reglas**: Excluye oportunidades con `estado_comercial = 'perdida'` o `'cerrada'` (etapa 9). Ordena de mayor a menor antigüedad. Marca `es_prioridad_alta: true` cuando `dias_sin_avance >= 2 * dias`.
- **Códigos HTTP**: `200 OK`, `400 Bad Request` (`VALIDACION_UMBRAL_DIAS`).

---

### 2.11 `POST /prospectos/:id/mensaje` y `POST /campanas`
Llamadas a Claude exclusivamente desde Express:
- `POST /prospectos/:id/mensaje`: Envía únicamente etapa, sede, siguiente acción, destino, presupuesto/moneda, número de viajeros y fecha preferida (sin nombres ni contactos). Máximo 100 palabras.
- `POST /campanas`: Recibe `{ "objetivo": "...", "sede_id": 1 }` y devuelve 3 borradores para redes sociales en estado `"Pendiente de aprobación"`.
- **Códigos HTTP**:
  - `200 OK`: Borrador generado por Claude.
  - `409 Conflict`: Si la oportunidad está marcada como perdida.
  - `503 Service Unavailable`: Si falta `ANTHROPIC_API_KEY` en el servidor (`CLAUDE_API_KEY_FALTANTE`).
  - `502 Bad Gateway`: Si la API de Anthropic devuelve error o falla la red (`CLAUDE_PROVEEDOR_ERROR`).

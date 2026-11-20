# Ruta Clara — CRM para Agentes de Viajes

> **Lema:** *“Cada viaje, un camino claro”*

**Ruta Clara** es un sistema CRM académico y profesional para agencias de viajes boutique. Permite organizar clientes y múltiples oportunidades de viaje independientes por viajero, dar seguimiento consultivo a las cotizaciones a través de un embudo de nueve etapas, detectar matemáticamente dónde se pierden o estancan las ventas y redactar borradores de mensajes y campañas con IA (Claude) para revisión humana.

---

## 1. Tecnologías Utilizadas

- **Frontend**: React 18 con JavaScript (`.js` y `.jsx`), HTML5 semántico, Tailwind CSS y Vite. (Sin TypeScript).
- **Backend**: Node.js y Express con módulos ES (`"type": "module"`), arquitectura en capas (`routes`, `controllers`, `services`, `repositories`, `validators`, `middleware`, `integrations`).
- **Base de datos**: MySQL 8.0.16 o superior mediante `mysql2/promise`, con consultas parametrizadas, restricciones `CHECK`, índices compuestos, fechas en UTC, transacciones y bloqueo de fila (`FOR UPDATE`).
- **Inteligencia Artificial**: API de Claude (Anthropic) invocada **exclusivamente desde Express**, sin exponer claves en el navegador y sin enviar nombres ni datos de contacto.

---

## 2. Estructura del Proyecto

```text
ruta-clara/
├── frontend/
│   └── src/
│       ├── app/
│       ├── features/
│       │   ├── inicio/
│       │   ├── clientes/
│       │   ├── oportunidades/
│       │   ├── seguimientos/
│       │   ├── metricas/
│       │   ├── campanas/
│       │   └── configuracion/
│       ├── components/ui/
│       ├── services/
│       ├── hooks/
│       ├── utils/
│       └── styles/
├── backend/
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/
│       ├── routes/
│       ├── controllers/
│       ├── services/
│       ├── repositories/
│       ├── validators/
│       ├── middleware/
│       └── integrations/
├── database/
│   ├── schema.sql
│   ├── seedData.js
│   └── seed.js
├── tests/
│   ├── unit/
│   └── integration/
├── docs/
│   ├── api.md
│   └── arquitectura.md
├── .env.example
├── package.json
└── README.md
```

---

## 3. Instalación y Ejecución Paso a Paso

### Requisitos previos
- **Node.js** 18+ (probado en Node.js v24).
- **MySQL** 8.0.16 o superior activo localmente.

### Paso 1: Configurar variables de entorno
Copie el archivo `.env.example` a `.env` en la raíz del proyecto y complete los datos de su servidor MySQL local (y opcionalmente su clave de Anthropic):

```bash
cp .env.example .env
```

Variables requeridas en `.env`:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=ruta_clara
DB_USER=root
DB_PASSWORD=su_password_mysql
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-5-haiku-latest
```

### Paso 2: Instalar dependencias
En la raíz del proyecto y en `frontend/`:

```bash
npm install
npm --prefix frontend install
```

### Paso 3: Crear esquema MySQL y cargar la semilla reproducible (40 oportunidades)
```bash
npm run seed
```
> También puede ejecutar directamente el script SQL en su cliente MySQL (`SOURCE database/schema.sql;`) y luego correr `npm run seed`.

### Paso 4: Iniciar el servidor Express y la interfaz React
En una terminal, inicie el backend Express (puerto `3001`):
```bash
npm run dev:backend
```

En una segunda terminal, inicie el servidor de desarrollo de React/Vite (puerto `5173`):
```bash
npm run dev:frontend
```
Abra `http://localhost:5173` en su navegador.

### Paso 5: Ejecutar pruebas automatizadas
```bash
npm test
```

---

## 4. Análisis de la Fuga en Cinco Líneas

1. **Punto crítico del embudo:** La etapa 4 (**Seguimiento de cotización**) presenta la mayor brecha frente a la meta con **42,07 puntos porcentuales** por debajo del objetivo didáctico del 80,00%.
2. **Métricas de control verificadas:** De las **29 oportunidades** cuyo historial alcanzó la etapa 4, únicamente **11 avanzaron** a *Propuesta aceptada*, arrojando una conversión de **37,93%** y una fuga observada de **62,07%**.
3. **Distinción entre fuga observada y pérdida confirmada:** De las 18 oportunidades que permanecen en la etapa 4 sin avanzar, 15 continúan **abiertas y pendientes de gestión** y solo 3 son pérdidas confirmadas (Precio, Eligió otra agencia y Sin respuesta); una oportunidad pendiente no implica abandono definitivo.
4. **Volumen faltante para cumplir la meta:** Aplicando `máximo(0, techo(29 × 80 / 100) − 11)`, se requieren exactamente **13 avances adicionales** hacia la etapa 5 para alcanzar el 80% de conversión.
5. **Plan de acción comercial:** Utilizar la cola de **Seguimientos** (priorizando las oportunidades cuya antigüedad duplica el umbral) y apoyarse en el redactor de **Claude** en la ficha de oportunidad para destrabar objeciones de itinerario o presupuesto antes de que se enfríe el interés del viajero.

---

## 5. Estado Transparente de Componentes y Conexiones

- **Funcionando y verificado con pruebas reales (`npm test`)**:
  - Esquema SQL completo (`database/schema.sql`) con las 7 tablas, claves foráneas, restricciones `CHECK`, `DECIMAL(14,2)` e índices solicitados.
  - Semilla reproducible (`database/seed.js` y `database/seedData.js`) con exactamente 40 oportunidades, distribución `[4, 4, 3, 18, 2, 2, 3, 2, 2]`, historial completo con fechas UTC distintas y valores de control exactos en etapa 4 (`29` alcanzaron, `11` avanzaron, `37,93%` conversión, `62,07%` fuga, `42,07 pp` brecha, `13` faltantes).
  - API REST Express con las 16 rutas documentadas, transacciones atómicas con `ROLLBACK`, bloqueo `FOR UPDATE`, validaciones de servidor y manejo de Claude sin clave.
  - Interfaz React completa en español con las 7 pantallas + ficha de oportunidad, diseño boutique (`#F7F5EF`, `#152D39`, `#126F7C`, `#D98164`), Kanban/Tabla, exportación JSON y accesibilidad por teclado.
- **Requisitos de entorno externo para ejecución en vivo**:
  - **MySQL**: Requiere que el servicio local de MySQL tenga credenciales válidas configuradas en `.env` y ejecutar `npm run seed`.
  - **Claude (Anthropic)**: Requiere configurar una clave real en `ANTHROPIC_API_KEY` dentro de `.env`; mientras esté vacía, el servidor devuelve el error controlado `CLAUDE_API_KEY_FALTANTE` (HTTP 503) sin simular respuestas con plantillas.
# Ruta-Clara

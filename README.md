# Ruta Clara — CRM para Agentes de Viajes

> **Lema:** *“Cada viaje, un camino claro”*

**Ruta Clara** es un sistema CRM académico y profesional para agencias de viajes boutique en Costa Rica (sedes **Desamparados** y **Puntarenas**). Permite organizar clientes y múltiples oportunidades de viaje independientes por viajero, dar seguimiento consultivo a las cotizaciones en **Colones costarricenses (`CRC — ₡`)** y **Dólares (`USD — $`)** a través de un embudo de nueve etapas, detectar matemáticamente dónde se pierden o estancan las ventas y redactar borradores de mensajes y campañas con IA (**DeepSeek**, con soporte alternativo para Claude) exclusivamente desde Express para revisión humana.

---

## 1. Tecnologías Utilizadas

- **Frontend**: React 18 con JavaScript puro (`.js` y `.jsx`), HTML5 semántico, Tailwind CSS, Lucide Icons y Vite. *(Sin TypeScript ni archivos `.ts`/`.tsx`)*.
- **Backend**: Node.js y Express con módulos ES (`"type": "module"`), arquitectura en capas (`config`, `routes`, `controllers`, `services`, `repositories`, `validators`, `middleware`, `integrations`).
- **Base de Datos**: MySQL 8.0.16 o superior mediante `mysql2/promise`, con consultas parametrizadas, presupuestos en `DECIMAL(14,2)`, restricciones `CHECK` para importes positivos y viajeros entre `1` y `50`, índices compuestos, fechas en UTC, transacciones atómicas (`BEGIN ... COMMIT / ROLLBACK`) y bloqueo de fila (`SELECT ... FOR UPDATE`).
- **Inteligencia Artificial**: API de **DeepSeek** (`deepseek-chat`) invocada **exclusivamente desde Express**, sin exponer claves en el navegador y sin enviar nombres, teléfonos ni correos de los clientes.

---

## 2. Estructura del Proyecto

```text
ruta-clara/
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── app/
│       │   └── App.jsx                      # Menú lateral azul tinta, buscador Ctrl+K y estado
│       ├── features/
│       │   ├── inicio/InicioView.jsx        # KPIs, resumen del embudo, canales y mayor brecha
│       │   ├── clientes/ClientesView.jsx    # Clientes ficticios, contactos y múltiples viajes (1:N)
│       │   ├── oportunidades/
│       │   │   ├── OportunidadesView.jsx    # Kanban de 9 etapas (+1 rápido), tabla ordenable y CSV
│       │   │   └── FichaOportunidadView.jsx # Preferencias, checklist, notas, avance, pérdida e IA
│       │   ├── seguimientos/SeguimientosView.jsx # Cola sin avance ≥ N días (1..365) y prioridad 2×N
│       │   ├── metricas/MetricasView.jsx    # Conversión, fuga, brecha, simulador y comparativas
│       │   ├── campanas/CampanasView.jsx    # 3 borradores de redes con IA e historial en MySQL
│       │   └── configuracion/ConfiguracionView.jsx # Salud de API, exportar JSON y restaurar semilla
│       ├── components/ui/BrandComponents.jsx
│       ├── services/api.js                  # Solicitudes HTTP desacopladas hacia Express
│       ├── hooks/useAsyncAction.js          # Prevención de envíos duplicados y preservación de datos
│       ├── utils/formatters.js              # Formateadores de CRC (₡), USD ($), fechas UTC y %
│       └── styles/index.css                 # Paleta de marca, foco accesible y estilos @media print
├── backend/
│   ├── package.json
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/
│       │   ├── env.js                       # Lectura de variables MySQL y DeepSeek
│       │   └── db.js                        # Pool mysql2/promise y helper withTransaction
│       ├── routes/apiRoutes.js              # Rutas del taller + rutas extendidas REST
│       ├── controllers/crmController.js
│       ├── services/
│       │   ├── crmService.js                # Reglas del embudo, pérdidas, reaperturas y transacciones
│       │   └── metricasService.js           # Fórmulas del embudo, cola de seguimiento y comparativas
│       ├── repositories/
│       │   ├── catalogoRepository.js
│       │   ├── clienteRepository.js
│       │   └── oportunidadRepository.js
│       ├── validators/schemas.js
│       ├── middleware/errorHandler.js
│       └── integrations/
│           ├── deepseekIntegration.js       # Cliente DeepSeek desde Express sin PII
│           └── claudeIntegration.js         # Re-export de compatibilidad
├── database/
│   ├── schema.sql                           # Esquema relacional de las 9 tablas y catálogos
│   ├── mysql_completo.sql                   # Script completo (tablas + 40 oportunidades) para Workbench
│   ├── seedData.js                          # Generador determinista de la semilla reproducible
│   └── seed.js                              # Script transaccional (npm run seed)
├── tests/
│   ├── unit/metricasYValidaciones.test.js
│   └── integration/apiFlujoCompleto.test.js
├── docs/
│   ├── api.md                               # Documentación completa de endpoints y códigos HTTP
│   └── arquitectura.md                      # Diagrama y decisiones de ingeniería
├── .env.example
├── package.json
└── README.md
```

---

## 3. Instalación y Ejecución Paso a Paso

### Requisitos previos
- **Node.js** 18 o superior.
- **MySQL** 8.0.16 o superior activo localmente.

### Paso 1: Configurar el archivo `.env` en la raíz
Copie `.env.example` a `.env` y configure sus credenciales locales de MySQL y su clave de DeepSeek:

```env
# Base de Datos MySQL (8.0.16+)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=ruta_clara
DB_USER=root
DB_PASSWORD=su_password_mysql

# Servidor Express
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Inteligencia Artificial — DeepSeek (invocada exclusivamente desde Express)
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

### Paso 2: Instalar dependencias
```bash
npm install
npm --prefix frontend install
```

### Paso 3: Crear la base de datos y poblar las 40 oportunidades en MySQL
```bash
npm run seed
```
*(Alternativamente, puede abrir y ejecutar directamente [database/mysql_completo.sql](file:///c:/Users/calva/taller-cli/Ruta-Clara/database/mysql_completo.sql) en **MySQL Workbench**, o usar el botón **"Restaurar semilla de 40 registros"** dentro de la pantalla **Configuración** de la aplicación).*

### Paso 4: Iniciar el Backend (Express) y el Frontend (React)
En una primera terminal:
```bash
npm run dev:backend
```

En una segunda terminal:
```bash
npm run dev:frontend
```
Abra **`http://localhost:5173/`** en su navegador.

### Paso 5: Ejecutar pruebas automatizadas
```bash
npm test
```

---

## 4. Funcionalidades Principales y Mejoras Operativas

1. **Buscador Global Rápido (`Ctrl + K`)**: Acceso instantáneo desde cualquier pantalla a cualquier oportunidad por ID, nombre del cliente, destino (*Cancún*, *Oaxaca*, *Madrid*, *Bogotá*), sede o etapa.
2. **Tablero Kanban de 9 Etapas y Vista de Tabla Ordenable**:
   - Avance secuencial estricto (`orden + 1`) con diálogo de confirmación obligatorio (*“Cambiar una etapa solo actualiza el CRM: no confirma pagos ni reservas con proveedores”*), disponible tanto desde la ficha como con el botón rápido **`+1 →`** en cada tarjeta del Kanban.
   - Ordenamiento interactivo por columnas en la vista de tabla y botón **Exportar CSV** para descargar la vista filtrada en Excel.
3. **Presupuestos en Colones (`CRC — ₡`) y Dólares (`USD — $`)**:
   - Almacenados en `DECIMAL(14,2)`, con cálculo automático del presupuesto aproximado **por viajero** en su propia divisa. Nunca se suman monedas distintas entre sí ni se presentan como ingresos.
4. **Ficha de Oportunidad Completa**:
   - Barra visual de progreso de las 9 etapas, **Checklist operativa interactiva** según la etapa actual, **Bitácora de notas del asesor** persistida en MySQL, edición de preferencias sin reiniciar `ultimo_avance_en`, registro de pérdida con motivo obligatorio, reapertura conservando antigüedad, historial cronológico en UTC y botón **Imprimir / PDF**.
5. **Redacción con IA (DeepSeek desde Express) y Campañas**:
   - Selector de tono editorial (*Cálido y consultivo*, *Ejecutivo y directo*, *Breve de recordatorio amable*).
   - Editor de borrador con contador de palabras (`/ 100 palabras`), estado **"Pendiente de aprobación humana"** y botón para aprobar antes de copiar.
   - Historial de campañas de redes sociales guardadas en MySQL (`campanas_guardadas`).
6. **Simulador Didáctico de Meta y Restauración en 1 Clic**:
   - Control deslizante en **Métricas** para simular en vivo cómo cambia la conversión de la etapa 4 al destrabar cotizaciones abiertas hasta alcanzar las 13 faltantes.
   - Botón en **Configuración** para restaurar en cualquier momento la semilla original de 40 oportunidades antes de una presentación académica.

---

## 5. Análisis de la Fuga en Cinco Líneas

1. **Punto crítico del embudo:** La etapa 4 (**Seguimiento de cotización**) concentra la mayor brecha frente a la meta con **42,07 puntos porcentuales** por debajo de la meta didáctica del 80,00%.
2. **Valores de control verificados:** De las **29 oportunidades** cuyo historial alcanzó la etapa 4, únicamente **11 avanzaron** a *Propuesta aceptada*, arrojando una conversión de **37,93%** y una fuga observada de **62,07%**.
3. **Distinción entre fuga observada y pérdida confirmada:** De las 18 oportunidades que permanecen en la etapa 4 sin avanzar, **15 siguen abiertas y pendientes de gestión** y solo **3 son pérdidas confirmadas** (*Precio*, *Eligió otra agencia* y *Sin respuesta*); una oportunidad pendiente no implica abandono definitivo.
4. **Faltantes para alcanzar la meta:** Aplicando la fórmula `máximo(0, techo(29 × 80 / 100) − 11)`, se requieren exactamente **13 oportunidades adicionales** que avancen a la etapa 5 para cumplir el objetivo del 80%.
5. **Acción comercial recomendada:** Atender prioritariamente en la cola de **Seguimientos** las cotizaciones de etapa 4 cuya antigüedad duplica el umbral y apoyarse en el redactor de **DeepSeek** en la ficha de oportunidad para resolver dudas de presupuesto o itinerario.

---

## 6. Estado Verificado de Conexiones y Pruebas

- **MySQL 8.0.16+**: Conectado y verificado en vivo (`GET /health` → `mysql.conectado: true`), con las 9 tablas creadas y la semilla de 32 clientes, 40 oportunidades en `CRC` y `USD`, 170 registros de historial, 6 eventos comerciales y notas iniciales cargadas.
- **DeepSeek API**: Conectada y verificada en vivo desde Express (`GET /health` → `ia.configurado: true`, `proveedor: "DeepSeek"`), probada tanto en `POST /prospectos/:id/mensaje` como en `POST /campanas`.
- **Suite de Pruebas (`npm test`) y Build (`npm run build:frontend`)**: 7/7 pruebas unitarias y de integración aprobadas (incluyendo verificación de `ROLLBACK` transaccional, validaciones de rangos y privacidad del prompt de IA).

-- =============================================================================
-- RUTA CLARA — CRM PARA AGENTES DE VIAJES
-- Esquema relacional para MySQL 8.0.16 o superior
-- Fechas almacenadas en UTC. Presupuestos en DECIMAL(14,2).
-- =============================================================================

CREATE DATABASE IF NOT EXISTS ruta_clara
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ruta_clara;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS campanas_guardadas;
DROP TABLE IF EXISTS notas_oportunidad;
DROP TABLE IF EXISTS eventos_comerciales;
DROP TABLE IF EXISTS historial_etapas;
DROP TABLE IF EXISTS oportunidades;
DROP TABLE IF EXISTS motivos_perdida;
DROP TABLE IF EXISTS etapas;
DROP TABLE IF EXISTS sedes;
DROP TABLE IF EXISTS clientes;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Catálogo de sedes
CREATE TABLE sedes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Catálogo de las 9 etapas del embudo
CREATE TABLE etapas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  orden TINYINT UNSIGNED NOT NULL UNIQUE,
  meta_conversion DECIMAL(5,2) NULL,
  CONSTRAINT chk_etapas_orden CHECK (orden BETWEEN 1 AND 9),
  CONSTRAINT chk_etapas_meta CHECK (meta_conversion IS NULL OR (meta_conversion >= 0 AND meta_conversion <= 100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Catálogo de motivos de pérdida
CREATE TABLE motivos_perdida (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Entidad de clientes (un cliente puede tener múltiples oportunidades de viaje)
-- Nota: teléfono y correo son opcionales para gestión del asesor y NUNCA se envían a la IA.
CREATE TABLE clientes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(140) NOT NULL,
  telefono VARCHAR(40) NULL,
  correo VARCHAR(140) NULL,
  preferencia_contacto VARCHAR(40) NOT NULL DEFAULT 'WhatsApp',
  es_ficticio TINYINT NOT NULL DEFAULT 1,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_clientes_nombre CHECK (CHAR_LENGTH(TRIM(nombre)) >= 2),
  CONSTRAINT chk_clientes_ficticio CHECK (es_ficticio IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Entidad de oportunidades de viaje ("prospectos" en rutas legadas de la API)
CREATE TABLE oportunidades (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT UNSIGNED NOT NULL,
  sede_id INT UNSIGNED NOT NULL,
  etapa_id INT UNSIGNED NOT NULL,
  destino VARCHAR(120) NOT NULL,
  presupuesto_total DECIMAL(14,2) NOT NULL,
  moneda CHAR(3) NOT NULL DEFAULT 'CRC',
  viajeros SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  fecha_salida DATE NOT NULL,
  canal VARCHAR(40) NOT NULL,
  estado_comercial VARCHAR(20) NOT NULL DEFAULT 'abierta',
  motivo_perdida_id INT UNSIGNED NULL,
  creado_en DATETIME NOT NULL,
  ultimo_avance_en DATETIME NOT NULL,
  editado_en DATETIME NOT NULL,
  CONSTRAINT fk_oportunidades_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_oportunidades_sede FOREIGN KEY (sede_id) REFERENCES sedes(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_oportunidades_etapa FOREIGN KEY (etapa_id) REFERENCES etapas(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_oportunidades_motivo FOREIGN KEY (motivo_perdida_id) REFERENCES motivos_perdida(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_oportunidades_presupuesto CHECK (presupuesto_total > 0),
  CONSTRAINT chk_oportunidades_moneda CHECK (moneda IN ('CRC', 'USD')),
  CONSTRAINT chk_oportunidades_viajeros CHECK (viajeros BETWEEN 1 AND 50),
  CONSTRAINT chk_oportunidades_canal CHECK (canal IN ('Instagram', 'Referido', 'Web', 'WhatsApp')),
  CONSTRAINT chk_oportunidades_estado CHECK (estado_comercial IN ('abierta', 'perdida', 'cerrada')),
  CONSTRAINT chk_oportunidades_motivo_consistencia CHECK (
    (estado_comercial = 'perdida' AND motivo_perdida_id IS NOT NULL)
    OR (estado_comercial IN ('abierta', 'cerrada') AND motivo_perdida_id IS NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices solicitados: cliente, etapa/sede, estado/último avance y canal/fecha
CREATE INDEX idx_oportunidades_cliente ON oportunidades (cliente_id);
CREATE INDEX idx_oportunidades_etapa_sede ON oportunidades (etapa_id, sede_id);
CREATE INDEX idx_oportunidades_estado_avance ON oportunidades (estado_comercial, ultimo_avance_en);
CREATE INDEX idx_oportunidades_canal_fecha ON oportunidades (canal, creado_en);

-- 6. Historial cronológico de etapas alcanzadas por oportunidad
CREATE TABLE historial_etapas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  oportunidad_id INT UNSIGNED NOT NULL,
  etapa_id INT UNSIGNED NOT NULL,
  fecha DATETIME NOT NULL,
  CONSTRAINT fk_historial_oportunidad FOREIGN KEY (oportunidad_id) REFERENCES oportunidades(id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_historial_etapa FOREIGN KEY (etapa_id) REFERENCES etapas(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  UNIQUE KEY uq_historial_oportunidad_etapa (oportunidad_id, etapa_id),
  INDEX idx_historial_etapa_oportunidad (etapa_id, oportunidad_id),
  INDEX idx_historial_oportunidad_fecha (oportunidad_id, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Eventos comerciales (pérdidas y reaperturas con fecha UTC)
CREATE TABLE eventos_comerciales (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  oportunidad_id INT UNSIGNED NOT NULL,
  etapa_id INT UNSIGNED NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  motivo_perdida_id INT UNSIGNED NULL,
  fecha DATETIME NOT NULL,
  CONSTRAINT fk_eventos_oportunidad FOREIGN KEY (oportunidad_id) REFERENCES oportunidades(id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_eventos_etapa FOREIGN KEY (etapa_id) REFERENCES etapas(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_eventos_motivo FOREIGN KEY (motivo_perdida_id) REFERENCES motivos_perdida(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_eventos_tipo CHECK (tipo IN ('perdida', 'reapertura')),
  CONSTRAINT chk_eventos_motivo CHECK (
    (tipo = 'perdida' AND motivo_perdida_id IS NOT NULL)
    OR (tipo = 'reapertura' AND motivo_perdida_id IS NULL)
  ),
  INDEX idx_eventos_oportunidad_fecha (oportunidad_id, fecha),
  INDEX idx_eventos_tipo_motivo (tipo, motivo_perdida_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Bitácora de notas del agente por oportunidad
CREATE TABLE notas_oportunidad (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  oportunidad_id INT UNSIGNED NOT NULL,
  autor VARCHAR(80) NOT NULL DEFAULT 'Asesor Ruta Clara',
  texto VARCHAR(600) NOT NULL,
  fecha DATETIME NOT NULL,
  CONSTRAINT fk_notas_oportunidad FOREIGN KEY (oportunidad_id) REFERENCES oportunidades(id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT chk_notas_texto CHECK (CHAR_LENGTH(TRIM(texto)) >= 2),
  INDEX idx_notas_oportunidad_fecha (oportunidad_id, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Historial de campañas de redes sociales generadas con IA
CREATE TABLE campanas_guardadas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sede_id INT UNSIGNED NOT NULL,
  sede_nombre VARCHAR(80) NOT NULL,
  objetivo VARCHAR(300) NOT NULL,
  proveedor VARCHAR(40) NOT NULL DEFAULT 'DeepSeek',
  modelo VARCHAR(80) NOT NULL,
  estado VARCHAR(40) NOT NULL DEFAULT 'Pendiente de aprobación',
  borradores_json JSON NOT NULL,
  creado_en DATETIME NOT NULL,
  CONSTRAINT fk_campanas_sede FOREIGN KEY (sede_id) REFERENCES sedes(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  INDEX idx_campanas_fecha (creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Catálogos base obligatorios
INSERT INTO sedes (id, nombre) VALUES
  (1, 'Desamparados'),
  (2, 'Puntarenas');

INSERT INTO etapas (id, nombre, orden, meta_conversion) VALUES
  (1, 'Consulta recibida', 1, 80.00),
  (2, 'Preferencias identificadas', 2, 80.00),
  (3, 'Cotización enviada', 3, 75.00),
  (4, 'Seguimiento de cotización', 4, 80.00),
  (5, 'Propuesta aceptada', 5, 80.00),
  (6, 'Anticipo recibido', 6, 75.00),
  (7, 'Reserva confirmada', 7, 80.00),
  (8, 'Viaje realizado', 8, 90.00),
  (9, 'Seguimiento posviaje', 9, NULL);

INSERT INTO motivos_perdida (id, nombre) VALUES
  (1, 'Precio'),
  (2, 'Fechas'),
  (3, 'Eligió otra agencia'),
  (4, 'Canceló el viaje'),
  (5, 'Sin respuesta'),
  (6, 'Otro');

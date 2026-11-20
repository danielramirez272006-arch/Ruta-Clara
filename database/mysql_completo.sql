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
CREATE TABLE clientes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(140) NOT NULL,
  es_ficticio TINYINT(1) NOT NULL DEFAULT 1,
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
  moneda CHAR(3) NOT NULL DEFAULT 'MXN',
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
  CONSTRAINT chk_oportunidades_moneda CHECK (moneda IN ('MXN', 'USD', 'EUR')),
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
  CONSTRAINT fk_historial_oportunidad FOREIGN KEY (oportunidad_id) REFERENCES oportunidades(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_historial_etapa FOREIGN KEY (etapa_id) REFERENCES etapas(id) ON DELETE RESTRICT ON UPDATE CASCADE,
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

-- =============================================================================
-- SEMILLA DE 32 CLIENTES Y 40 OPORTUNIDADES [4, 4, 3, 18, 2, 2, 3, 2, 2]
-- =============================================================================

INSERT INTO clientes (id, nombre, es_ficticio, creado_en) VALUES
  (1, 'Valeria Mora Quirós (Ficticio)', 1, '2026-08-17 12:00:00'),
  (2, 'Sebastián Solís Araya (Ficticio)', 1, '2026-08-18 11:00:00'),
  (3, 'Camila Vargas Brenes (Ficticio)', 1, '2026-08-19 10:00:00'),
  (4, 'Mateo Jiménez Cordero (Ficticio)', 1, '2026-08-20 09:00:00'),
  (5, 'Lucía Rojas Alvarado (Ficticio)', 1, '2026-08-21 08:00:00'),
  (6, 'Daniel Castro Monge (Ficticio)', 1, '2026-08-22 07:00:00'),
  (7, 'Sofía Herrera Chacón (Ficticio)', 1, '2026-08-23 12:00:00'),
  (8, 'Andrés Navarro Salas (Ficticio)', 1, '2026-08-24 11:00:00'),
  (9, 'Mariana Madrigal Soto (Ficticio)', 1, '2026-08-25 10:00:00'),
  (10, 'Gabriel Quesada Méndez (Ficticio)', 1, '2026-08-26 09:00:00'),
  (11, 'Elena Calderón Vega (Ficticio)', 1, '2026-08-27 08:00:00'),
  (12, 'Diego Pacheco Ureña (Ficticio)', 1, '2026-08-28 07:00:00'),
  (13, 'Adriana Villalobos Fonseca (Ficticio)', 1, '2026-08-29 12:00:00'),
  (14, 'Javier Elizondo Campos (Ficticio)', 1, '2026-08-30 11:00:00'),
  (15, 'Natalia Bolaños Guzmán (Ficticio)', 1, '2026-08-31 10:00:00'),
  (16, 'Fernando Murillo Valverde (Ficticio)', 1, '2026-09-01 09:00:00'),
  (17, 'Carolina Arce Picado (Ficticio)', 1, '2026-09-02 08:00:00'),
  (18, 'Ricardo Zúñiga Paniagua (Ficticio)', 1, '2026-09-03 07:00:00'),
  (19, 'Paula Coto Chavarría (Ficticio)', 1, '2026-09-04 12:00:00'),
  (20, 'Esteban Granados Sancho (Ficticio)', 1, '2026-09-05 11:00:00'),
  (21, 'Alejandra Alfaro Porras (Ficticio)', 1, '2026-09-06 10:00:00'),
  (22, 'Mauricio Bermúdez Núñez (Ficticio)', 1, '2026-09-07 09:00:00'),
  (23, 'Isabel Chaves Mena (Ficticio)', 1, '2026-09-08 08:00:00'),
  (24, 'Roberto Corrales Zamora (Ficticio)', 1, '2026-09-09 07:00:00'),
  (25, 'Claudia Espinoza Fallas (Ficticio)', 1, '2026-09-10 12:00:00'),
  (26, 'Jorge Esquivel Meza (Ficticio)', 1, '2026-09-11 11:00:00'),
  (27, 'Patricia Fernández Leiva (Ficticio)', 1, '2026-09-12 10:00:00'),
  (28, 'Carlos Gamboa Rivera (Ficticio)', 1, '2026-09-13 09:00:00'),
  (29, 'Mónica Gómez Hidalgo (Ficticio)', 1, '2026-09-14 08:00:00'),
  (30, 'Héctor Hernández Barquero (Ficticio)', 1, '2026-09-15 07:00:00'),
  (31, 'Laura León Segura (Ficticio)', 1, '2026-09-16 12:00:00'),
  (32, 'Óscar López Marin (Ficticio)', 1, '2026-09-17 11:00:00');

INSERT INTO oportunidades (id, cliente_id, sede_id, etapa_id, destino, presupuesto_total, moneda, viajeros, fecha_salida, canal, estado_comercial, motivo_perdida_id, creado_en, ultimo_avance_en, editado_en) VALUES
  (1, 1, 1, 1, 'Cancún', 28500.00, 'MXN', 1, '2026-12-30', 'Instagram', 'abierta', NULL, '2026-11-18 11:00:00', '2026-11-18 11:00:00', '2026-11-18 11:00:00'),
  (2, 2, 2, 1, 'Oaxaca', 35700.00, 'MXN', 2, '2027-01-02', 'Referido', 'abierta', NULL, '2026-11-15 10:00:00', '2026-11-15 10:00:00', '2026-11-15 10:00:00'),
  (3, 3, 1, 1, 'Madrid', 49800.00, 'MXN', 3, '2027-01-05', 'Web', 'abierta', NULL, '2026-11-12 09:00:00', '2026-11-12 09:00:00', '2026-11-12 09:00:00'),
  (4, 4, 2, 1, 'Bogotá', 52000.00, 'MXN', 4, '2027-01-08', 'WhatsApp', 'perdida', 1, '2026-11-09 08:00:00', '2026-11-09 08:00:00', '2026-11-09 08:00:00'),
  (5, 5, 1, 2, 'Cancún', 64500.00, 'MXN', 1, '2027-01-11', 'Instagram', 'abierta', NULL, '2026-11-03 07:00:00', '2026-11-06 06:00:00', '2026-11-06 06:00:00'),
  (6, 6, 2, 2, 'Oaxaca', 40400.00, 'MXN', 2, '2027-01-14', 'Referido', 'abierta', NULL, '2026-10-31 06:00:00', '2026-11-03 05:00:00', '2026-11-03 05:00:00'),
  (7, 7, 1, 2, 'Madrid', 78000.00, 'MXN', 3, '2027-01-17', 'Web', 'abierta', NULL, '2026-10-28 05:00:00', '2026-10-31 04:00:00', '2026-10-31 04:00:00'),
  (8, 8, 2, 2, 'Bogotá', 92400.00, 'MXN', 4, '2027-01-20', 'WhatsApp', 'perdida', 2, '2026-11-13 04:00:00', '2026-11-16 12:00:00', '2026-11-16 12:00:00'),
  (9, 9, 1, 3, 'Cancún', 41500.00, 'MXN', 1, '2027-01-23', 'Instagram', 'abierta', NULL, '2026-11-07 03:00:00', '2026-11-13 10:00:00', '2026-11-13 10:00:00'),
  (10, 10, 2, 3, 'Oaxaca', 59800.00, 'MXN', 2, '2027-01-26', 'Referido', 'abierta', NULL, '2026-11-04 02:00:00', '2026-11-10 09:00:00', '2026-11-10 09:00:00'),
  (11, 11, 1, 3, 'Madrid', 31500.00, 'MXN', 3, '2027-01-29', 'Web', 'perdida', 5, '2026-11-01 01:00:00', '2026-11-07 08:00:00', '2026-11-07 08:00:00'),
  (12, 12, 2, 4, 'Bogotá', 34200.00, 'MXN', 4, '2027-02-01', 'WhatsApp', 'abierta', NULL, '2026-11-07 11:00:00', '2026-11-16 06:00:00', '2026-11-16 06:00:00'),
  (13, 13, 1, 4, 'Cancún', 48300.00, 'MXN', 1, '2027-02-04', 'Instagram', 'perdida', 1, '2026-11-05 10:00:00', '2026-11-14 05:00:00', '2026-11-14 05:00:00'),
  (14, 14, 2, 4, 'Oaxaca', 55000.00, 'MXN', 2, '2027-02-07', 'Referido', 'abierta', NULL, '2026-11-03 09:00:00', '2026-11-12 04:00:00', '2026-11-12 04:00:00'),
  (15, 15, 1, 4, 'Madrid', 64500.00, 'MXN', 3, '2027-02-10', 'Web', 'abierta', NULL, '2026-11-01 08:00:00', '2026-11-10 12:00:00', '2026-11-10 12:00:00'),
  (16, 16, 2, 4, 'Bogotá', 40400.00, 'MXN', 4, '2027-02-13', 'WhatsApp', 'perdida', 3, '2026-10-30 07:00:00', '2026-11-08 11:00:00', '2026-11-08 11:00:00'),
  (17, 17, 1, 4, 'Cancún', 78000.00, 'MXN', 1, '2027-02-16', 'Instagram', 'abierta', NULL, '2026-10-28 06:00:00', '2026-11-06 10:00:00', '2026-11-06 10:00:00'),
  (18, 18, 2, 4, 'Oaxaca', 92400.00, 'MXN', 2, '2027-02-19', 'Referido', 'abierta', NULL, '2026-10-26 05:00:00', '2026-11-04 09:00:00', '2026-11-04 09:00:00'),
  (19, 19, 1, 4, 'Madrid', 43000.00, 'MXN', 3, '2027-02-22', 'Web', 'perdida', 5, '2026-10-24 04:00:00', '2026-11-02 08:00:00', '2026-11-02 08:00:00'),
  (20, 20, 2, 4, 'Bogotá', 61300.00, 'MXN', 4, '2027-02-25', 'WhatsApp', 'abierta', NULL, '2026-10-22 03:00:00', '2026-10-31 07:00:00', '2026-10-31 07:00:00'),
  (21, 21, 1, 4, 'Cancún', 28500.00, 'MXN', 1, '2027-02-28', 'Instagram', 'abierta', NULL, '2026-10-20 02:00:00', '2026-10-29 06:00:00', '2026-10-29 06:00:00'),
  (22, 22, 2, 4, 'Oaxaca', 35700.00, 'MXN', 2, '2027-03-03', 'Referido', 'abierta', NULL, '2026-10-18 01:00:00', '2026-10-27 05:00:00', '2026-10-27 05:00:00'),
  (23, 23, 1, 4, 'Madrid', 49800.00, 'MXN', 3, '2027-03-06', 'Web', 'abierta', NULL, '2026-10-16 11:00:00', '2026-10-25 04:00:00', '2026-10-25 04:00:00'),
  (24, 24, 2, 4, 'Bogotá', 52000.00, 'MXN', 4, '2027-03-09', 'WhatsApp', 'abierta', NULL, '2026-10-14 10:00:00', '2026-10-23 12:00:00', '2026-10-23 12:00:00'),
  (25, 25, 1, 4, 'Cancún', 66000.00, 'MXN', 1, '2027-03-12', 'Instagram', 'abierta', NULL, '2026-10-12 09:00:00', '2026-10-21 11:00:00', '2026-10-21 11:00:00'),
  (26, 26, 2, 4, 'Oaxaca', 41900.00, 'MXN', 2, '2027-03-15', 'Referido', 'abierta', NULL, '2026-10-10 08:00:00', '2026-10-19 10:00:00', '2026-10-19 10:00:00'),
  (27, 27, 1, 4, 'Madrid', 75000.00, 'MXN', 3, '2027-03-18', 'Web', 'abierta', NULL, '2026-10-08 07:00:00', '2026-10-17 09:00:00', '2026-10-17 09:00:00'),
  (28, 28, 2, 4, 'Bogotá', 93900.00, 'MXN', 4, '2027-03-21', 'WhatsApp', 'abierta', NULL, '2026-10-06 06:00:00', '2026-10-15 08:00:00', '2026-10-15 08:00:00'),
  (29, 29, 1, 4, 'Cancún', 44500.00, 'MXN', 1, '2027-03-24', 'Instagram', 'abierta', NULL, '2026-10-04 05:00:00', '2026-10-13 07:00:00', '2026-10-13 07:00:00'),
  (30, 30, 2, 5, 'Oaxaca', 58300.00, 'MXN', 2, '2027-03-27', 'Referido', 'abierta', NULL, '2026-10-26 04:00:00', '2026-11-07 05:00:00', '2026-11-07 05:00:00'),
  (31, 31, 1, 5, 'Madrid', 30000.00, 'MXN', 3, '2027-03-30', 'Web', 'abierta', NULL, '2026-10-23 03:00:00', '2026-11-04 04:00:00', '2026-11-04 04:00:00'),
  (32, 32, 2, 6, 'Bogotá', 34200.00, 'MXN', 4, '2027-04-02', 'WhatsApp', 'abierta', NULL, '2026-10-17 02:00:00', '2026-11-01 11:00:00', '2026-11-01 11:00:00'),
  (33, 1, 1, 6, 'Cancún', 48300.00, 'MXN', 1, '2027-04-05', 'Instagram', 'abierta', NULL, '2026-11-02 01:00:00', '2026-11-17 10:00:00', '2026-11-17 10:00:00'),
  (34, 2, 2, 7, 'Oaxaca', 52000.00, 'MXN', 2, '2027-04-08', 'Referido', 'abierta', NULL, '2026-10-27 11:00:00', '2026-11-14 08:00:00', '2026-11-14 08:00:00'),
  (35, 3, 1, 7, 'Madrid', 66000.00, 'MXN', 3, '2027-04-11', 'Web', 'abierta', NULL, '2026-10-24 10:00:00', '2026-11-11 07:00:00', '2026-11-11 07:00:00'),
  (36, 4, 2, 7, 'Bogotá', 41900.00, 'MXN', 4, '2027-04-14', 'WhatsApp', 'abierta', NULL, '2026-10-21 09:00:00', '2026-11-08 06:00:00', '2026-11-08 06:00:00'),
  (37, 5, 1, 8, 'Cancún', 75000.00, 'MXN', 1, '2027-04-17', 'Instagram', 'abierta', NULL, '2026-10-15 08:00:00', '2026-11-05 04:00:00', '2026-11-05 04:00:00'),
  (38, 6, 2, 8, 'Oaxaca', 93900.00, 'MXN', 2, '2027-04-20', 'Referido', 'abierta', NULL, '2026-10-12 07:00:00', '2026-11-02 12:00:00', '2026-11-02 12:00:00'),
  (39, 7, 1, 9, 'Madrid', 41500.00, 'MXN', 3, '2027-04-23', 'Web', 'cerrada', NULL, '2026-10-25 06:00:00', '2026-11-18 10:00:00', '2026-11-18 10:00:00'),
  (40, 8, 2, 9, 'Bogotá', 59800.00, 'MXN', 4, '2027-04-26', 'WhatsApp', 'cerrada', NULL, '2026-10-22 05:00:00', '2026-11-15 09:00:00', '2026-11-15 09:00:00');

INSERT INTO historial_etapas (id, oportunidad_id, etapa_id, fecha) VALUES
  (1, 1, 1, '2026-11-18 11:00:00'),
  (2, 2, 1, '2026-11-15 10:00:00'),
  (3, 3, 1, '2026-11-12 09:00:00'),
  (4, 4, 1, '2026-11-09 08:00:00'),
  (5, 5, 1, '2026-11-03 07:00:00'),
  (6, 5, 2, '2026-11-06 06:00:00'),
  (7, 6, 1, '2026-10-31 06:00:00'),
  (8, 6, 2, '2026-11-03 05:00:00'),
  (9, 7, 1, '2026-10-28 05:00:00'),
  (10, 7, 2, '2026-10-31 04:00:00'),
  (11, 8, 1, '2026-11-13 04:00:00'),
  (12, 8, 2, '2026-11-16 12:00:00'),
  (13, 9, 1, '2026-11-07 03:00:00'),
  (14, 9, 2, '2026-11-10 11:00:00'),
  (15, 9, 3, '2026-11-13 10:00:00'),
  (16, 10, 1, '2026-11-04 02:00:00'),
  (17, 10, 2, '2026-11-07 10:00:00'),
  (18, 10, 3, '2026-11-10 09:00:00'),
  (19, 11, 1, '2026-11-01 01:00:00'),
  (20, 11, 2, '2026-11-04 09:00:00'),
  (21, 11, 3, '2026-11-07 08:00:00'),
  (22, 12, 1, '2026-11-07 11:00:00'),
  (23, 12, 2, '2026-11-10 08:00:00'),
  (24, 12, 3, '2026-11-13 07:00:00'),
  (25, 12, 4, '2026-11-16 06:00:00'),
  (26, 13, 1, '2026-11-05 10:00:00'),
  (27, 13, 2, '2026-11-08 07:00:00'),
  (28, 13, 3, '2026-11-11 06:00:00'),
  (29, 13, 4, '2026-11-14 05:00:00'),
  (30, 14, 1, '2026-11-03 09:00:00'),
  (31, 14, 2, '2026-11-06 06:00:00'),
  (32, 14, 3, '2026-11-09 05:00:00'),
  (33, 14, 4, '2026-11-12 04:00:00'),
  (34, 15, 1, '2026-11-01 08:00:00'),
  (35, 15, 2, '2026-11-04 05:00:00'),
  (36, 15, 3, '2026-11-07 04:00:00'),
  (37, 15, 4, '2026-11-10 12:00:00'),
  (38, 16, 1, '2026-10-30 07:00:00'),
  (39, 16, 2, '2026-11-02 04:00:00'),
  (40, 16, 3, '2026-11-05 12:00:00'),
  (41, 16, 4, '2026-11-08 11:00:00'),
  (42, 17, 1, '2026-10-28 06:00:00'),
  (43, 17, 2, '2026-10-31 12:00:00'),
  (44, 17, 3, '2026-11-03 11:00:00'),
  (45, 17, 4, '2026-11-06 10:00:00'),
  (46, 18, 1, '2026-10-26 05:00:00'),
  (47, 18, 2, '2026-10-29 11:00:00'),
  (48, 18, 3, '2026-11-01 10:00:00'),
  (49, 18, 4, '2026-11-04 09:00:00'),
  (50, 19, 1, '2026-10-24 04:00:00'),
  (51, 19, 2, '2026-10-27 10:00:00'),
  (52, 19, 3, '2026-10-30 09:00:00'),
  (53, 19, 4, '2026-11-02 08:00:00'),
  (54, 20, 1, '2026-10-22 03:00:00'),
  (55, 20, 2, '2026-10-25 09:00:00'),
  (56, 20, 3, '2026-10-28 08:00:00'),
  (57, 20, 4, '2026-10-31 07:00:00'),
  (58, 21, 1, '2026-10-20 02:00:00'),
  (59, 21, 2, '2026-10-23 08:00:00'),
  (60, 21, 3, '2026-10-26 07:00:00'),
  (61, 21, 4, '2026-10-29 06:00:00'),
  (62, 22, 1, '2026-10-18 01:00:00'),
  (63, 22, 2, '2026-10-21 07:00:00'),
  (64, 22, 3, '2026-10-24 06:00:00'),
  (65, 22, 4, '2026-10-27 05:00:00'),
  (66, 23, 1, '2026-10-16 11:00:00'),
  (67, 23, 2, '2026-10-19 06:00:00'),
  (68, 23, 3, '2026-10-22 05:00:00'),
  (69, 23, 4, '2026-10-25 04:00:00'),
  (70, 24, 1, '2026-10-14 10:00:00'),
  (71, 24, 2, '2026-10-17 05:00:00'),
  (72, 24, 3, '2026-10-20 04:00:00'),
  (73, 24, 4, '2026-10-23 12:00:00'),
  (74, 25, 1, '2026-10-12 09:00:00'),
  (75, 25, 2, '2026-10-15 04:00:00'),
  (76, 25, 3, '2026-10-18 12:00:00'),
  (77, 25, 4, '2026-10-21 11:00:00'),
  (78, 26, 1, '2026-10-10 08:00:00'),
  (79, 26, 2, '2026-10-13 12:00:00'),
  (80, 26, 3, '2026-10-16 11:00:00'),
  (81, 26, 4, '2026-10-19 10:00:00'),
  (82, 27, 1, '2026-10-08 07:00:00'),
  (83, 27, 2, '2026-10-11 11:00:00'),
  (84, 27, 3, '2026-10-14 10:00:00'),
  (85, 27, 4, '2026-10-17 09:00:00'),
  (86, 28, 1, '2026-10-06 06:00:00'),
  (87, 28, 2, '2026-10-09 10:00:00'),
  (88, 28, 3, '2026-10-12 09:00:00'),
  (89, 28, 4, '2026-10-15 08:00:00'),
  (90, 29, 1, '2026-10-04 05:00:00'),
  (91, 29, 2, '2026-10-07 09:00:00'),
  (92, 29, 3, '2026-10-10 08:00:00'),
  (93, 29, 4, '2026-10-13 07:00:00'),
  (94, 30, 1, '2026-10-26 04:00:00'),
  (95, 30, 2, '2026-10-29 08:00:00'),
  (96, 30, 3, '2026-11-01 07:00:00'),
  (97, 30, 4, '2026-11-04 06:00:00'),
  (98, 30, 5, '2026-11-07 05:00:00'),
  (99, 31, 1, '2026-10-23 03:00:00'),
  (100, 31, 2, '2026-10-26 07:00:00'),
  (101, 31, 3, '2026-10-29 06:00:00'),
  (102, 31, 4, '2026-11-01 05:00:00'),
  (103, 31, 5, '2026-11-04 04:00:00'),
  (104, 32, 1, '2026-10-17 02:00:00'),
  (105, 32, 2, '2026-10-20 06:00:00'),
  (106, 32, 3, '2026-10-23 05:00:00'),
  (107, 32, 4, '2026-10-26 04:00:00'),
  (108, 32, 5, '2026-10-29 12:00:00'),
  (109, 32, 6, '2026-11-01 11:00:00'),
  (110, 33, 1, '2026-11-02 01:00:00'),
  (111, 33, 2, '2026-11-05 05:00:00'),
  (112, 33, 3, '2026-11-08 04:00:00'),
  (113, 33, 4, '2026-11-11 12:00:00'),
  (114, 33, 5, '2026-11-14 11:00:00'),
  (115, 33, 6, '2026-11-17 10:00:00'),
  (116, 34, 1, '2026-10-27 11:00:00'),
  (117, 34, 2, '2026-10-30 04:00:00'),
  (118, 34, 3, '2026-11-02 12:00:00'),
  (119, 34, 4, '2026-11-05 11:00:00'),
  (120, 34, 5, '2026-11-08 10:00:00'),
  (121, 34, 6, '2026-11-11 09:00:00'),
  (122, 34, 7, '2026-11-14 08:00:00'),
  (123, 35, 1, '2026-10-24 10:00:00'),
  (124, 35, 2, '2026-10-27 12:00:00'),
  (125, 35, 3, '2026-10-30 11:00:00'),
  (126, 35, 4, '2026-11-02 10:00:00'),
  (127, 35, 5, '2026-11-05 09:00:00'),
  (128, 35, 6, '2026-11-08 08:00:00'),
  (129, 35, 7, '2026-11-11 07:00:00'),
  (130, 36, 1, '2026-10-21 09:00:00'),
  (131, 36, 2, '2026-10-24 11:00:00'),
  (132, 36, 3, '2026-10-27 10:00:00'),
  (133, 36, 4, '2026-10-30 09:00:00'),
  (134, 36, 5, '2026-11-02 08:00:00'),
  (135, 36, 6, '2026-11-05 07:00:00'),
  (136, 36, 7, '2026-11-08 06:00:00'),
  (137, 37, 1, '2026-10-15 08:00:00'),
  (138, 37, 2, '2026-10-18 10:00:00'),
  (139, 37, 3, '2026-10-21 09:00:00'),
  (140, 37, 4, '2026-10-24 08:00:00'),
  (141, 37, 5, '2026-10-27 07:00:00'),
  (142, 37, 6, '2026-10-30 06:00:00'),
  (143, 37, 7, '2026-11-02 05:00:00'),
  (144, 37, 8, '2026-11-05 04:00:00'),
  (145, 38, 1, '2026-10-12 07:00:00'),
  (146, 38, 2, '2026-10-15 09:00:00'),
  (147, 38, 3, '2026-10-18 08:00:00'),
  (148, 38, 4, '2026-10-21 07:00:00'),
  (149, 38, 5, '2026-10-24 06:00:00'),
  (150, 38, 6, '2026-10-27 05:00:00'),
  (151, 38, 7, '2026-10-30 04:00:00'),
  (152, 38, 8, '2026-11-02 12:00:00'),
  (153, 39, 1, '2026-10-25 06:00:00'),
  (154, 39, 2, '2026-10-28 08:00:00'),
  (155, 39, 3, '2026-10-31 07:00:00'),
  (156, 39, 4, '2026-11-03 06:00:00'),
  (157, 39, 5, '2026-11-06 05:00:00'),
  (158, 39, 6, '2026-11-09 04:00:00'),
  (159, 39, 7, '2026-11-12 12:00:00'),
  (160, 39, 8, '2026-11-15 11:00:00'),
  (161, 39, 9, '2026-11-18 10:00:00'),
  (162, 40, 1, '2026-10-22 05:00:00'),
  (163, 40, 2, '2026-10-25 07:00:00'),
  (164, 40, 3, '2026-10-28 06:00:00'),
  (165, 40, 4, '2026-10-31 05:00:00'),
  (166, 40, 5, '2026-11-03 04:00:00'),
  (167, 40, 6, '2026-11-06 12:00:00'),
  (168, 40, 7, '2026-11-09 11:00:00'),
  (169, 40, 8, '2026-11-12 10:00:00'),
  (170, 40, 9, '2026-11-15 09:00:00');

INSERT INTO eventos_comerciales (id, oportunidad_id, etapa_id, tipo, motivo_perdida_id, fecha) VALUES
  (1, 4, 1, 'perdida', 1, '2026-11-09 10:00:00'),
  (2, 8, 2, 'perdida', 2, '2026-11-16 14:00:00'),
  (3, 11, 3, 'perdida', 5, '2026-11-07 10:00:00'),
  (4, 13, 4, 'perdida', 1, '2026-11-14 07:00:00'),
  (5, 16, 4, 'perdida', 3, '2026-11-08 13:00:00'),
  (6, 19, 4, 'perdida', 5, '2026-11-02 10:00:00');

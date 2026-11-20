import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { construirSemillaReproducible } from './seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export async function ejecutarSemillaMySQL(customConfig = null) {
  const dbConfig = customConfig || {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    timezone: 'Z'
  };

  const dbName = process.env.DB_NAME || 'ruta_clara';
  const schemaPath = path.resolve(__dirname, './schema.sql');
  const rawSchema = await fs.readFile(schemaPath, 'utf8');
  const schemaSql = rawSchema.replace(/ruta_clara/g, dbName);

  const connection = await mysql.createConnection(dbConfig);
  try {
    await connection.query(schemaSql);
    await connection.changeUser({ database: dbName });

    const data = construirSemillaReproducible(new Date());

    await connection.beginTransaction();

    for (const cliente of data.clientes) {
      await connection.execute(
        'INSERT INTO clientes (id, nombre, telefono, correo, preferencia_contacto, es_ficticio, creado_en) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          cliente.id,
          cliente.nombre,
          cliente.telefono || null,
          cliente.correo || null,
          cliente.preferencia_contacto || 'WhatsApp',
          cliente.es_ficticio,
          cliente.creado_en
        ]
      );
    }

    for (const op of data.oportunidades) {
      await connection.execute(
        `INSERT INTO oportunidades (
          id, cliente_id, sede_id, etapa_id, destino, presupuesto_total,
          moneda, viajeros, fecha_salida, canal, estado_comercial,
          motivo_perdida_id, creado_en, ultimo_avance_en, editado_en
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          op.id,
          op.cliente_id,
          op.sede_id,
          op.etapa_id,
          op.destino,
          op.presupuesto_total,
          op.moneda,
          op.viajeros,
          op.fecha_salida,
          op.canal,
          op.estado_comercial,
          op.motivo_perdida_id,
          op.creado_en,
          op.ultimo_avance_en,
          op.editado_en
        ]
      );
    }

    for (const hist of data.historial_etapas) {
      await connection.execute(
        'INSERT INTO historial_etapas (id, oportunidad_id, etapa_id, fecha) VALUES (?, ?, ?, ?)',
        [hist.id, hist.oportunidad_id, hist.etapa_id, hist.fecha]
      );
    }

    for (const ev of data.eventos_comerciales) {
      await connection.execute(
        'INSERT INTO eventos_comerciales (id, oportunidad_id, etapa_id, tipo, motivo_perdida_id, fecha) VALUES (?, ?, ?, ?, ?, ?)',
        [ev.id, ev.oportunidad_id, ev.etapa_id, ev.tipo, ev.motivo_perdida_id, ev.fecha]
      );
    }

    for (const nota of data.notas_oportunidad || []) {
      await connection.execute(
        'INSERT INTO notas_oportunidad (id, oportunidad_id, autor, texto, fecha) VALUES (?, ?, ?, ?, ?)',
        [nota.id, nota.oportunidad_id, nota.autor, nota.texto, nota.fecha]
      );
    }

    await connection.commit();
    return {
      ok: true,
      database: dbName,
      clientes: data.clientes.length,
      oportunidades: data.oportunidades.length,
      historial_etapas: data.historial_etapas.length,
      eventos_comerciales: data.eventos_comerciales.length
    };
  } catch (err) {
    try {
      await connection.rollback();
    } catch {
      // Ignorar si la transacción aún no había iniciado
    }
    throw err;
  } finally {
    await connection.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  ejecutarSemillaMySQL()
    .then((res) => {
      console.log('[Ruta Clara] Semilla MySQL ejecutada con éxito:', JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Ruta Clara] Error al ejecutar semilla MySQL:', err.message);
      process.exit(1);
    });
}

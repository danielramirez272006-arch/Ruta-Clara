import test from 'node:test';
import assert from 'node:assert/strict';
import { construirSemillaReproducible } from '../../database/seedData.js';
import { crearApp } from '../../backend/src/app.js';

/**
 * Pool transaccional con soporte de snapshot y ROLLBACK para probar
 * toda la arquitectura Express -> Service -> Repository -> Pool transaccional
 * incluso cuando el demonio local de MySQL requiere credenciales externas.
 */
class TransactionalMemoryPool {
  constructor(initialDate = new Date('2026-11-20T12:00:00Z')) {
    this.state = construirSemillaReproducible(initialDate);
    this.snapshot = null;
  }

  _cloneState(st) {
    return JSON.parse(JSON.stringify(st));
  }

  async getConnection() {
    return {
      beginTransaction: async () => {
        this.snapshot = this._cloneState(this.state);
      },
      commit: async () => {
        this.snapshot = null;
      },
      rollback: async () => {
        if (this.snapshot) {
          this.state = this.snapshot;
          this.snapshot = null;
        }
      },
      release: () => {},
      execute: (sql, params = []) => this.execute(sql, params)
    };
  }

  _enrichOportunidadRow(o) {
    const cliente = this.state.clientes.find((c) => c.id === Number(o.cliente_id));
    const sede = this.state.sedes.find((s) => s.id === Number(o.sede_id));
    const etapa = this.state.etapas.find((e) => e.id === Number(o.etapa_id));
    const motivo = o.motivo_perdida_id
      ? this.state.motivos_perdida.find((m) => m.id === Number(o.motivo_perdida_id))
      : null;

    return {
      ...o,
      cliente_nombre: cliente?.nombre || '',
      cliente_es_ficticio: cliente?.es_ficticio ?? 1,
      sede_nombre: sede?.nombre || '',
      etapa_nombre: etapa?.nombre || '',
      etapa_orden: etapa?.orden || o.etapa_id,
      etapa_meta_conversion: etapa?.meta_conversion ?? null,
      motivo_perdida_nombre: motivo?.nombre || null
    };
  }

  async execute(sql, params = []) {
    const q = sql.replace(/\s+/g, ' ').trim();

    if (q === 'SELECT 1 AS ok') {
      return [[{ ok: 1 }]];
    }

    if (q.startsWith('SELECT id, nombre FROM sedes WHERE id = ?')) {
      const row = this.state.sedes.find((s) => s.id === Number(params[0]));
      return [row ? [row] : []];
    }

    if (q.startsWith('SELECT id, nombre FROM sedes WHERE LOWER(nombre) = LOWER(?)')) {
      const row = this.state.sedes.find(
        (s) => s.nombre.toLowerCase() === String(params[0]).toLowerCase()
      );
      return [row ? [row] : []];
    }

    if (q.startsWith('SELECT id, nombre FROM sedes')) {
      return [this.state.sedes];
    }

    if (q.startsWith('SELECT id, nombre, orden, meta_conversion FROM etapas WHERE id = ?')) {
      const row = this.state.etapas.find((e) => e.id === Number(params[0]));
      return [row ? [row] : []];
    }

    if (q.startsWith('SELECT id, nombre, orden, meta_conversion FROM etapas WHERE orden = ?')) {
      const row = this.state.etapas.find((e) => e.orden === Number(params[0]));
      return [row ? [row] : []];
    }

    if (q.startsWith('SELECT id, nombre, orden, meta_conversion FROM etapas')) {
      return [this.state.etapas];
    }

    if (q.startsWith('SELECT id, nombre FROM motivos_perdida WHERE id = ?')) {
      const row = this.state.motivos_perdida.find((m) => m.id === Number(params[0]));
      return [row ? [row] : []];
    }

    if (q.startsWith('SELECT id, nombre FROM motivos_perdida')) {
      return [this.state.motivos_perdida];
    }

    // Clientes
    if (q.includes('FROM clientes c')) {
      let rows = [...this.state.clientes];
      if (q.includes('WHERE (LOWER(c.nombre) LIKE LOWER(?)')) {
        const needle = String(params[0]).replace(/%/g, '').toLowerCase();
        rows = rows.filter(
          (c) =>
            c.nombre.toLowerCase().includes(needle) ||
            String(c.correo || '').toLowerCase().includes(needle) ||
            String(c.telefono || '').toLowerCase().includes(needle)
        );
      }
      rows.sort((a, b) => b.id - a.id);
      return [rows];
    }

    if (q.includes('FROM clientes WHERE id = ?')) {
      const row = this.state.clientes.find((c) => c.id === Number(params[0]));
      return [row ? [row] : []];
    }

    if (q.startsWith('INSERT INTO clientes')) {
      const nextId =
        this.state.clientes.reduce((max, c) => Math.max(max, c.id), 0) + 1;
      this.state.clientes.push({
        id: nextId,
        nombre: params[0],
        telefono: params[1],
        correo: params[2],
        preferencia_contacto: params[3],
        es_ficticio: params[4],
        creado_en: params[5]
      });
      return [{ insertId: nextId }];
    }

    if (q.startsWith('UPDATE clientes SET')) {
      const id = Number(params[params.length - 1]);
      const cliente = this.state.clientes.find((c) => c.id === id);
      if (cliente) {
        if (q.includes('nombre = ?')) cliente.nombre = params[0];
      }
      return [{ affectedRows: cliente ? 1 : 0 }];
    }

    // Oportunidades
    if (q.includes('FROM oportunidades o') && q.includes('FOR UPDATE')) {
      const id = Number(params[0]);
      const op = this.state.oportunidades.find((o) => o.id === id);
      return [op ? [this._enrichOportunidadRow(op)] : []];
    }

    if (q.includes('FROM oportunidades o') && q.includes('WHERE o.id = ?')) {
      const id = Number(params[0]);
      const op = this.state.oportunidades.find((o) => o.id === id);
      return [op ? [this._enrichOportunidadRow(op)] : []];
    }

    if (q.includes('FROM oportunidades o')) {
      let rows = this.state.oportunidades.map((o) => this._enrichOportunidadRow(o));
      if (q.includes('o.cliente_id = ?')) {
        const cId = Number(params[0]);
        rows = rows.filter((r) => Number(r.cliente_id) === cId);
      }
      rows.sort(
        (a, b) =>
          String(a.ultimo_avance_en).localeCompare(String(b.ultimo_avance_en)) ||
          a.id - b.id
      );
      return [rows];
    }

    if (q.startsWith('INSERT INTO oportunidades')) {
      const nextId =
        this.state.oportunidades.reduce((max, o) => Math.max(max, o.id), 0) + 1;
      this.state.oportunidades.push({
        id: nextId,
        cliente_id: Number(params[0]),
        sede_id: Number(params[1]),
        etapa_id: Number(params[2]),
        destino: params[3],
        presupuesto_total: Number(params[4]),
        moneda: params[5],
        viajeros: Number(params[6]),
        fecha_salida: params[7],
        canal: params[8],
        estado_comercial: params[9],
        motivo_perdida_id: params[10],
        creado_en: params[11],
        ultimo_avance_en: params[12],
        editado_en: params[13]
      });
      return [{ insertId: nextId }];
    }

    if (q.startsWith('UPDATE oportunidades SET etapa_id = ?')) {
      const [nuevaEtapaId, nuevoEstado, fechaAvance, fechaEditado, id] = params;
      const op = this.state.oportunidades.find((o) => o.id === Number(id));
      if (op) {
        op.etapa_id = Number(nuevaEtapaId);
        op.estado_comercial = nuevoEstado;
        op.ultimo_avance_en = fechaAvance;
        op.editado_en = fechaEditado;
      }
      return [{ affectedRows: op ? 1 : 0 }];
    }

    if (q.startsWith('UPDATE oportunidades SET estado_comercial = ?')) {
      const [estadoComercial, motivoId, fechaEditado, id] = params;
      const op = this.state.oportunidades.find((o) => o.id === Number(id));
      if (op) {
        op.estado_comercial = estadoComercial;
        op.motivo_perdida_id = motivoId !== null ? Number(motivoId) : null;
        op.editado_en = fechaEditado;
      }
      return [{ affectedRows: op ? 1 : 0 }];
    }

    if (q.startsWith('UPDATE oportunidades SET')) {
      const id = Number(params[params.length - 1]);
      const editadoEn = params[params.length - 2];
      const op = this.state.oportunidades.find((o) => o.id === id);
      if (op) {
        const setPart = q.slice('UPDATE oportunidades SET '.length, q.indexOf(' WHERE id = ?'));
        const assignments = setPart.split(',').map((s) => s.trim());
        assignments.forEach((assign, idx) => {
          const field = assign.split('=')[0].trim();
          if (field !== 'editado_en') {
            op[field] = params[idx];
          }
        });
        op.editado_en = editadoEn;
      }
      return [{ affectedRows: op ? 1 : 0 }];
    }

    // Historial de etapas
    if (q.startsWith('INSERT INTO historial_etapas')) {
      const nextId =
        this.state.historial_etapas.reduce((max, h) => Math.max(max, h.id), 0) + 1;
      this.state.historial_etapas.push({
        id: nextId,
        oportunidad_id: Number(params[0]),
        etapa_id: Number(params[1]),
        fecha: params[2]
      });
      return [{ insertId: nextId }];
    }

    if (q.includes('FROM historial_etapas h') && q.includes('WHERE h.oportunidad_id = ?')) {
      const opId = Number(params[0]);
      const rows = this.state.historial_etapas
        .filter((h) => Number(h.oportunidad_id) === opId)
        .map((h) => {
          const et = this.state.etapas.find((e) => e.id === Number(h.etapa_id));
          return {
            ...h,
            etapa_nombre: et?.nombre || '',
            etapa_orden: et?.orden || h.etapa_id
          };
        })
        .sort((a, b) => a.etapa_orden - b.etapa_orden);
      return [rows];
    }

    if (q.startsWith('SELECT id, oportunidad_id, etapa_id, fecha FROM historial_etapas')) {
      return [this.state.historial_etapas];
    }

    // Eventos comerciales
    if (q.startsWith('INSERT INTO eventos_comerciales')) {
      const nextId =
        this.state.eventos_comerciales.reduce((max, e) => Math.max(max, e.id), 0) + 1;
      this.state.eventos_comerciales.push({
        id: nextId,
        oportunidad_id: Number(params[0]),
        etapa_id: Number(params[1]),
        tipo: params[2],
        motivo_perdida_id: params[3] !== null ? Number(params[3]) : null,
        fecha: params[4]
      });
      return [{ insertId: nextId }];
    }

    if (q.includes('FROM eventos_comerciales ev') && q.includes('WHERE ev.oportunidad_id = ?')) {
      const opId = Number(params[0]);
      const rows = this.state.eventos_comerciales
        .filter((ev) => Number(ev.oportunidad_id) === opId)
        .map((ev) => {
          const et = this.state.etapas.find((e) => e.id === Number(ev.etapa_id));
          const mot = ev.motivo_perdida_id
            ? this.state.motivos_perdida.find((m) => m.id === Number(ev.motivo_perdida_id))
            : null;
          return {
            ...ev,
            etapa_nombre: et?.nombre || '',
            etapa_orden: et?.orden || ev.etapa_id,
            motivo_perdida_nombre: mot?.nombre || null
          };
        });
      return [rows];
    }

    if (q.includes('FROM eventos_comerciales ev')) {
      return [this.state.eventos_comerciales];
    }

    if (q.includes('FROM notas_oportunidad')) {
      const opId = Number(params[0]);
      const rows = (this.state.notas_oportunidad || []).filter(
        (n) => Number(n.oportunidad_id) === opId
      );
      return [rows];
    }

    if (q.startsWith('INSERT INTO notas_oportunidad')) {
      if (!this.state.notas_oportunidad) this.state.notas_oportunidad = [];
      const nextId =
        this.state.notas_oportunidad.reduce((max, n) => Math.max(max, n.id), 0) + 1;
      this.state.notas_oportunidad.push({
        id: nextId,
        oportunidad_id: Number(params[0]),
        autor: params[1],
        texto: params[2],
        fecha: params[3]
      });
      return [{ insertId: nextId }];
    }

    if (q.includes('FROM campanas_guardadas')) {
      return [this.state.campanas_guardadas || []];
    }

    if (q.startsWith('INSERT INTO campanas_guardadas')) {
      if (!this.state.campanas_guardadas) this.state.campanas_guardadas = [];
      const nextId =
        this.state.campanas_guardadas.reduce((max, c) => Math.max(max, c.id), 0) + 1;
      this.state.campanas_guardadas.push({
        id: nextId,
        sede_id: Number(params[0]),
        sede_nombre: params[1],
        objetivo: params[2],
        proveedor: params[3],
        modelo: params[4],
        estado: params[5],
        borradores_json: params[6],
        creado_en: params[7]
      });
      return [{ insertId: nextId }];
    }

    throw new Error(`Consulta SQL no contemplada en pool de prueba: ${q}`);
  }
}

test('Flujo completo de Criterios de Aceptación sobre la API REST de Ruta Clara', async (t) => {
  const pool = new TransactionalMemoryPool(new Date());
  const { app, crmService } = crearApp({ pool });

  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(() => {
    server.close();
  });

  async function api(path, options = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      ...options
    });
    const body = await res.json();
    return { status: res.status, body };
  }

  // 1. Confirmar los 40 registros semilla y las métricas de control desde GET /embudo
  const embudoRes = await api('/embudo');
  assert.equal(embudoRes.status, 200);
  const etapa4 = embudoRes.body.data.etapas.find((e) => e.orden === 4);
  assert.equal(etapa4.alcanzaron, 29);
  assert.equal(etapa4.avanzaron, 11);
  assert.equal(Number(etapa4.conversion.toFixed(2)), 37.93);
  assert.equal(Number(etapa4.fuga_observada.toFixed(2)), 62.07);
  assert.equal(Number(etapa4.brecha.toFixed(2)), 42.07);
  assert.equal(etapa4.faltantes, 13);

  // 2. Crear un cliente con dos oportunidades independientes
  const clienteRes = await api('/clientes', {
    method: 'POST',
    body: JSON.stringify({
      nombre: 'Cliente Prueba Académica (Ficticio)',
      es_ficticio: true
    })
  });
  assert.equal(clienteRes.status, 201);
  const nuevoClienteId = clienteRes.body.data.id;

  const op1Res = await api('/prospectos', {
    method: 'POST',
    body: JSON.stringify({
      cliente_id: nuevoClienteId,
      sede_id: 1,
      destino: 'Oaxaca',
      presupuesto_total: 1250000,
      moneda: 'CRC',
      viajeros: 2,
      fecha_salida: '2027-04-10',
      canal: 'WhatsApp'
    })
  });
  assert.equal(op1Res.status, 201);
  const op1Id = op1Res.body.data.id;

  const op2Res = await api('/prospectos', {
    method: 'POST',
    body: JSON.stringify({
      cliente_id: nuevoClienteId,
      sede_id: 2,
      destino: 'Madrid',
      presupuesto_total: 4200,
      moneda: 'USD',
      viajeros: 3,
      fecha_salida: '2027-09-20',
      canal: 'Web'
    })
  });
  assert.equal(op2Res.status, 201);

  const fichaClienteRes = await api(`/clientes/${nuevoClienteId}`);
  assert.equal(fichaClienteRes.status, 200);
  assert.equal(fichaClienteRes.body.data.oportunidades.length, 2);

  // 3. Editar preferencias sin alterar la fecha del último avance (antigüedad)
  const antesEditar = op1Res.body.data.ultimo_avance_en;
  const editPrefRes = await api(`/prospectos/${op1Id}/preferencias`, {
    method: 'PATCH',
    body: JSON.stringify({
      destino: 'Oaxaca y Monte Albán',
      presupuesto_total: 45500,
      viajeros: 4
    })
  });
  assert.equal(editPrefRes.status, 200);
  assert.equal(editPrefRes.body.data.destino, 'Oaxaca y Monte Albán');
  assert.equal(
    editPrefRes.body.data.ultimo_avance_en,
    antesEditar,
    'Editar preferencias NO debe reiniciar la fecha del último avance'
  );

  // 4. Avanzar una sola etapa y guardar historial; rechazar saltos de etapa
  const intentoSalto = await api(`/prospectos/${op1Id}/etapa`, {
    method: 'PATCH',
    body: JSON.stringify({ etapa_id: 4 }) // está en etapa 1, intenta saltar a 4
  });
  assert.equal(intentoSalto.status, 400);
  assert.equal(intentoSalto.body.error.code, 'AVANCE_NO_SECUENCIAL');

  const avanceRes = await api(`/prospectos/${op1Id}/etapa`, {
    method: 'PATCH',
    body: JSON.stringify({})
  });
  assert.equal(avanceRes.status, 200);
  assert.equal(avanceRes.body.data.etapa_orden, 2);
  assert.equal(avanceRes.body.data.historial_etapas.length, 2);

  // 5. Revertir toda la transacción ante un error durante el avance
  await assert.rejects(() =>
    crmService.avanzarEtapa(op1Id, {}, { simularFalloDespuesDeUpdate: true })
  );
  const verificarDespuesDeRollback = await api(`/prospectos/${op1Id}`);
  assert.equal(
    verificarDespuesDeRollback.body.data.etapa_orden,
    2,
    'El ROLLBACK transaccional debe revertir la etapa a 2 tras un fallo intermedio'
  );
  assert.equal(verificarDespuesDeRollback.body.data.historial_etapas.length, 2);

  // 6. Registrar una pérdida con motivo, bloquear edición/avances/IA y excluirla de seguimientos
  // Usamos la oportunidad #1 de la semilla que tiene antigüedad >= 2 días
  const perderRes = await api('/prospectos/1/estado', {
    method: 'PATCH',
    body: JSON.stringify({
      accion: 'perder',
      motivo_perdida_id: 1 // Precio
    })
  });
  assert.equal(perderRes.status, 200);
  assert.equal(perderRes.body.data.estado_comercial, 'perdida');
  assert.equal(perderRes.body.data.motivo_perdida_nombre, 'Precio');
  const antiguedadAntesDeReabrir = perderRes.body.data.ultimo_avance_en;

  // Verificar que está bloqueada para avanzar, editar preferencias y generar mensaje IA
  const avanceBloqueado = await api('/prospectos/1/etapa', { method: 'PATCH', body: '{}' });
  assert.equal(avanceBloqueado.status, 409);

  const edicionBloqueada = await api('/prospectos/1/preferencias', {
    method: 'PATCH',
    body: JSON.stringify({ destino: 'Intento bloqueado' })
  });
  assert.equal(edicionBloqueada.status, 409);

  const iaBloqueada = await api('/prospectos/1/mensaje', { method: 'POST', body: '{}' });
  assert.equal(iaBloqueada.status, 409);

  // Verificar exclusión de la cola de seguimiento (GET /atencion?dias=1)
  const atencionConPerdida = await api('/atencion?dias=1');
  assert.equal(atencionConPerdida.status, 200);
  const encontradaEnCola = atencionConPerdida.body.data.seguimientos.some((s) => s.id === 1);
  assert.equal(encontradaEnCola, false, 'Una oportunidad perdida debe excluirse de seguimientos');

  // 7. Reabrir la oportunidad conservando historial y antigüedad de la etapa
  const reabrirRes = await api('/prospectos/1/estado', {
    method: 'PATCH',
    body: JSON.stringify({ accion: 'reabrir' })
  });
  assert.equal(reabrirRes.status, 200);
  assert.equal(reabrirRes.body.data.estado_comercial, 'abierta');
  assert.equal(
    reabrirRes.body.data.ultimo_avance_en,
    antiguedadAntesDeReabrir,
    'Reabrir debe conservar intacta la antigüedad de la etapa'
  );
  assert.equal(
    reabrirRes.body.data.eventos_comerciales.length,
    2,
    'Debe registrar tanto el evento de pérdida como el de reapertura con fecha'
  );
});

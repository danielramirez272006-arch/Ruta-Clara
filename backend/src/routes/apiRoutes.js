import { Router } from 'express';

/**
 * Define todas las rutas REST obligatorias del taller y las rutas extendidas de Ruta Clara.
 *
 * Rutas conservadas del taller:
 * - POST /prospectos
 * - PATCH /prospectos/:id/etapa
 * - GET /embudo
 * - GET /atencion?dias=N
 * - POST /prospectos/:id/mensaje
 *
 * Rutas agregadas:
 * - GET /clientes
 * - POST /clientes
 * - GET /clientes/:id
 * - PATCH /clientes/:id
 * - GET /prospectos
 * - GET /prospectos/:id
 * - PATCH /prospectos/:id/preferencias
 * - PATCH /prospectos/:id/estado
 * - GET /resumen
 * - POST /campanas
 * - GET /health
 * - GET /exportar (para la exportación JSON desde Configuración)
 */
export function crearRutasCrm(controller) {
  const router = Router();

  // Salud y configuración
  router.get('/health', controller.health);
  router.get('/exportar', controller.exportarDatos);
  router.post('/semilla/restaurar', controller.restaurarSemilla);

  // Resumen e indicadores de inicio
  router.get('/resumen', controller.obtenerResumen);

  // Embudo y métricas
  router.get('/embudo', controller.obtenerEmbudo);

  // Cola de atención / seguimientos pendientes
  router.get('/atencion', controller.obtenerAtencion);

  // Clientes
  router.get('/clientes', controller.listarClientes);
  router.post('/clientes', controller.crearCliente);
  router.get('/clientes/:id', controller.obtenerCliente);
  router.patch('/clientes/:id', controller.actualizarCliente);

  // Prospectos (oportunidades de viaje)
  router.get('/prospectos', controller.listarProspectos);
  router.post('/prospectos', controller.crearProspecto);
  router.get('/prospectos/:id', controller.obtenerProspecto);
  router.patch('/prospectos/:id/etapa', controller.avanzarEtapaProspecto);
  router.patch('/prospectos/:id/preferencias', controller.editarPreferenciasProspecto);
  router.patch('/prospectos/:id/estado', controller.cambiarEstadoProspecto);
  router.post('/prospectos/:id/mensaje', controller.generarMensajeProspecto);
  router.post('/prospectos/:id/notas', controller.agregarNotaProspecto);

  // Campañas con IA
  router.get('/campanas', controller.listarCampanas);
  router.post('/campanas', controller.generarCampana);
  router.patch('/campanas/:id/aprobar', controller.aprobarCampana);

  return router;
}

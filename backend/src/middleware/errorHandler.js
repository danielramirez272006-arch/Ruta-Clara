export class AppError extends Error {
  constructor(message, statusCode = 400, code = 'BAD_REQUEST', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    ok: false,
    error: {
      code: 'ENDPOINT_NO_ENCONTRADO',
      message: `La ruta solicitada (${req.method} ${req.originalUrl}) no existe en la API de Ruta Clara.`
    }
  });
}

/**
 * Middleware global de errores JSON claros.
 * Nunca expone secretos, contraseñas, claves de API ni trazas internas al cliente.
 */
export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    const payload = {
      ok: false,
      error: {
        code: err.code,
        message: err.message
      }
    };
    if (err.details) {
      payload.error.details = err.details;
    }
    return res.status(err.statusCode).json(payload);
  }

  // Errores de sintaxis JSON en el body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'JSON_INVALIDO',
        message: 'El cuerpo de la solicitud no contiene un formato JSON válido.'
      }
    });
  }

  // Errores de conexión a MySQL
  if (err && (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR' || err.code === 'ER_BAD_DB_ERROR' || err.code === 'PROTOCOL_CONNECTION_LOST')) {
    return res.status(503).json({
      ok: false,
      error: {
        code: 'BASE_DE_DATOS_NO_DISPONIBLE',
        message: 'No fue posible establecer conexión con MySQL. Verifique que el servidor MySQL 8.0.16+ esté activo, que la base de datos exista (npm run seed) y que las variables DB_* en .env sean correctas.'
      }
    });
  }

  // Violaciones de restricciones CHECK o claves foráneas de MySQL
  if (err && (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED' || err.code === 'ER_NO_REFERENCED_ROW_2')) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'RESTRICCION_INTEGRIDAD_SQL',
        message: 'Los datos enviados incumplen una restricción de integridad en la base de datos.'
      }
    });
  }

  return res.status(500).json({
    ok: false,
    error: {
      code: 'ERROR_INTERNO_SERVIDOR',
      message: 'Ocurrió un error inesperado al procesar la solicitud en el servidor.'
    }
  });
}

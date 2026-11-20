import express from 'express';
import cors from 'cors';
import { getEnvConfig } from './config/env.js';
import { getDbPool } from './config/db.js';
import { DeepSeekIntegration } from './integrations/deepseekIntegration.js';
import { CrmService } from './services/crmService.js';
import { CrmController } from './controllers/crmController.js';
import { crearRutasCrm } from './routes/apiRoutes.js';
import { notFoundHandler, errorHandler, AppError } from './middleware/errorHandler.js';

export function crearApp({ pool = null, claudeIntegration = null, iaIntegration = null } = {}) {
  const app = express();
  const env = getEnvConfig();

  // CORS con orígenes autorizados configurables mediante ALLOWED_ORIGINS
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.allowedOrigins.includes('*') || env.allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(
          new AppError(
            `El origen ${origin} no está autorizado por la política CORS del servidor.`,
            403,
            'CORS_ORIGEN_NO_AUTORIZADO'
          )
        );
      },
      methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Accept']
    })
  );

  app.use(express.json({ limit: '256kb' }));

  const dbPool = pool || getDbPool();
  const iaClient = iaIntegration || claudeIntegration || new DeepSeekIntegration();
  const crmService = new CrmService(dbPool, iaClient);
  const crmController = new CrmController(crmService);

  const rutas = crearRutasCrm(crmController);

  // Exponemos las rutas tanto en la raíz (ej. POST /prospectos, GET /embudo) como bajo /api
  app.use('/', rutas);
  app.use('/api', rutas);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return { app, crmService };
}

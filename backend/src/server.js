import { crearApp } from './app.js';
import { getEnvConfig } from './config/env.js';

const { port } = getEnvConfig();
const { app } = crearApp();

app.listen(port, () => {
  console.log(`[Ruta Clara] API REST escuchando en http://localhost:${port}`);
});

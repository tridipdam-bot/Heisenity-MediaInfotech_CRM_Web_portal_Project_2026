import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import express, { Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';

const router = express.Router();

// CommonJS equivalent of __dirname
const swaggerFilePath = path.join(__dirname, 'openapi.yaml');

const swaggerDocument = yaml.load(
  fs.readFileSync(swaggerFilePath, 'utf8')
) as object;

router.get('/json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerDocument);
});

// Swagger UI
router.use(
  '/',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument)
);

export default router;

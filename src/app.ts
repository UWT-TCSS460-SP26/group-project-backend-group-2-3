import express, { Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import fs from 'fs';
import YAML from 'yaml';
import { apiReference } from '@scalar/express-api-reference';
import { v1Router } from './routes/v1';
import { errorHandler } from './middleware/error-handler';

const parseAllowedOrigins = (): string[] =>
  (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigins = parseAllowedOrigins();
const corsOptions: CorsOptions = {
  allowedHeaders: ['Authorization', 'Content-Type'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
};

const app = express();

// Application-level middleware
app.use(cors(corsOptions));
app.use(express.json());

// OpenAPI documentation
const specFile = fs.readFileSync('./openapi.yaml', 'utf8');
const spec = YAML.parse(specFile);
app.get('/openapi.json', (_request: Request, response: Response) => {
  response.json(spec);
});
app.use('/api-docs', apiReference({ spec: { url: '/openapi.json' } }));

// Routes
app.get('/health', (_request: Request, response: Response) => {
  response.json({
    status: 'ok',
    service: 'group-project-backend-group-2-3',
  });
});

// Primary versioned API routes (checkoff-style)
app.use('/v1', v1Router);

// Backward-compatible aliases while clients migrate.
app.use('/api/v1', v1Router);
app.use('/', v1Router);

// 404 handler — must be after all routes
app.use((_request: Request, response: Response) => {
  response.status(404).json({ error: 'Route not found' });
});

// Error handler — must be after all routes and other middleware
app.use(errorHandler);

export { app };

import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import YAML from 'yaml';
import { apiReference } from '@scalar/express-api-reference';
import { moviesRouter } from './routes/movies';
import { showsRouter } from './routes/shows';
import { errorHandler } from './middleware/error-handler';

const app = express();

// Application-level middleware
app.use(cors());
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

// API routes
app.use('/movies', moviesRouter);
app.use('/shows', showsRouter);

// 404 handler — must be after all routes
app.use((_request: Request, response: Response) => {
  response.status(404).json({ error: 'Route not found' });
});

// Error handler — must be after all routes and other middleware
app.use(errorHandler);

export { app };

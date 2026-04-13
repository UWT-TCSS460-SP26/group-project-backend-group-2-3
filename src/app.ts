import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import YAML from 'yaml';
import { apiReference } from '@scalar/express-api-reference';
import collinsRouter from './routes/collins.routes';
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
app.get('/hello', (_request: Request, response: Response) => {
  response.json({ message: 'Hello, TCSS 460!' });
});

app.get('/hello/rudolf', (_request: Request, response: Response) => {
  response.json({ message: 'Hello, Rudolf!' });
});

app.get('/hello/mani', (_request: Request, response: Response) => {
  response.json({ message: 'Hello Mani!' });
});

app.get('/hello/jonathan', (_request: Request, response: Response) => {
  response.json({ message: 'Hello, Jonathan!' });
});

app.use('/', collinsRouter);

// 404 handler — must be after all routes
app.use((_request: Request, response: Response) => {
  response.status(404).json({ error: 'Route not found' });
});

export { app };

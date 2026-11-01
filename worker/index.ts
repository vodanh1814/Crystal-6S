import { Hono } from 'hono';
import { csrf } from 'hono/csrf';
import type { Env, Variables } from './types';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { areasRouter } from './routes/areas';
import { checklistRouter } from './routes/checklist';
import { targetsRouter } from './routes/targets';
import { auditsRouter } from './routes/audits';
import { findingsRouter } from './routes/findings';
import { photosRouter } from './routes/photos';
import { reportsRouter } from './routes/reports';
import { settingsRouter } from './routes/settings';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// CSRF protection on /api/* (allowing same-origin and clients without origin header like curl)
app.use(
  '/api/*',
  csrf({
    origin: (origin, c) => {
      if (!origin) return true;
      try {
        return origin === new URL(c.req.url).origin;
      } catch {
        return false;
      }
    },
  })
);

// Mount API routes
app.route('/api/auth', authRouter);
app.route('/api/users', usersRouter);
app.route('/api/areas', areasRouter);
app.route('/api/checklist', checklistRouter);
app.route('/api/targets', targetsRouter);
app.route('/api/audits', auditsRouter);
app.route('/api/findings', findingsRouter);
app.route('/api/photos', photosRouter);
app.route('/api/reports', reportsRouter);
app.route('/api/settings', settingsRouter);

// JSON 404 handler for API routes
app.notFound((c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json({ error: 'Endpoint not found' }, 404);
  }
  return c.text('Not Found', 404);
});

// JSON Global error handler (never leak stack traces or internal cause to client)
app.onError((err: any, c) => {
  console.error('Unhandled API Error:', err);
  const status = typeof err.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
  const safeMessage = status < 500 && err.message ? String(err.message) : 'Internal Server Error';
  return c.json({ error: safeMessage }, status);
});

export default app;

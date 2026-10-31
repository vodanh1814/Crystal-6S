import { Hono } from 'hono';
import type { Env, Variables, YearlyTarget } from '../types';
import { authMiddleware } from '../lib/auth';
import { isAdmin } from '../lib/permissions';
import { logActivity } from '../lib/activity';

export const targetsRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

targetsRouter.use('/*', authMiddleware);

// GET /api/targets
targetsRouter.get('/', async (c) => {
  const res = await c.env.DB
    .prepare('SELECT year, target FROM yearly_targets ORDER BY year DESC')
    .all<YearlyTarget>();

  return c.json({ targets: res.results || [] });
});

// PUT /api/targets/:year (Admin only)
targetsRouter.put('/:year', async (c) => {
  const user = c.get('user');
  if (!isAdmin(user)) {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }

  const year = parseInt(c.req.param('year'), 10);
  if (isNaN(year) || year < 2000 || year > 2100) {
    return c.json({ error: 'Invalid year' }, 400);
  }

  const body = await c.req.json().catch(() => ({}));
  const target = Number(body.target);
  if (isNaN(target) || target < 0 || target > 100) {
    return c.json({ error: 'Target must be a number between 0 and 100' }, 400);
  }

  await c.env.DB
    .prepare('INSERT INTO yearly_targets (year, target) VALUES (?, ?) ON CONFLICT(year) DO UPDATE SET target = excluded.target')
    .bind(year, target)
    .run();

  await logActivity(c.env.DB, user.id, 'update_target', 'yearly_target', year, `target=${target}`);

  return c.json({ target: { year, target } });
});

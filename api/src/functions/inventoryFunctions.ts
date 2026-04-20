import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { query, queryOne, execute } from '../db';
import { ok, created, noContent, badRequest, unauthorized, notFound, serverError, corsResponse, parseBody, requireAuth } from '../helpers';
import { v4 as uuidv4 } from 'uuid';

app.http('inventoryOptions', { methods: ['OPTIONS'], authLevel: 'anonymous', route: 'inventory/{*rest}', handler: async () => corsResponse() });

app.http('inventoryGetAll', {
  methods: ['GET'], authLevel: 'anonymous', route: 'inventory',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const rows = await query('SELECT * FROM inventory_items ORDER BY item_name ASC');
      return ok(rows);
    } catch (err) { return serverError(err); }
  },
});

app.http('inventoryGetById', {
  methods: ['GET'], authLevel: 'anonymous', route: 'inventory/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const row = await queryOne('SELECT * FROM inventory_items WHERE id = @id', { id: req.params.id });
      if (!row) return notFound();
      return ok(row);
    } catch (err) { return serverError(err); }
  },
});

app.http('inventoryCreate', {
  methods: ['POST'], authLevel: 'anonymous', route: 'inventory',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const body = await parseBody(req);
      const id = body.id || uuidv4();
      body.id = id;
      const cols = Object.keys(body).join(', ');
      const vals = Object.keys(body).map(k => `@${k}`).join(', ');
      await execute(`INSERT INTO inventory_items (${cols}) VALUES (${vals})`, body);
      const row = await queryOne('SELECT * FROM inventory_items WHERE id = @id', { id });
      return created(row);
    } catch (err) { return serverError(err); }
  },
});

app.http('inventoryUpdate', {
  methods: ['PATCH'], authLevel: 'anonymous', route: 'inventory/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const id = req.params.id;
      const body = await parseBody(req); delete body.id;
      const sets = Object.keys(body).map(k => `${k} = @${k}`).join(', ');
      if (!sets) return badRequest('Nothing to update');
      await execute(`UPDATE inventory_items SET ${sets}, updated_at = SYSUTCDATETIME() WHERE id = @id`, { ...body, id });
      const row = await queryOne('SELECT * FROM inventory_items WHERE id = @id', { id });
      return ok(row);
    } catch (err) { return serverError(err); }
  },
});

app.http('inventoryDelete', {
  methods: ['DELETE'], authLevel: 'anonymous', route: 'inventory/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      await execute('DELETE FROM inventory_items WHERE id = @id', { id: req.params.id });
      return noContent();
    } catch (err) { return serverError(err); }
  },
});

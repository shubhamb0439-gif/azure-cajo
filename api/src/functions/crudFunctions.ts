import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { query, queryOne, execute } from '../db';
import { ok, created, noContent, badRequest, unauthorized, notFound, serverError, corsResponse, parseBody, requireAuth } from '../helpers';
import { v4 as uuidv4 } from 'uuid';

// Helper to build a CRUD set of routes for simple tables
function makeCrud(name: string, table: string, orderBy = 'created_at DESC') {
  const route = name;

  app.http(`${name}Options`, { methods: ['OPTIONS'], authLevel: 'anonymous', route: `${route}/{*rest}`, handler: async () => corsResponse() });

  app.http(`${name}GetAll`, {
    methods: ['GET'], authLevel: 'anonymous', route,
    handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
      try {
        if (!requireAuth(req)) return unauthorized();
        const rows = await query(`SELECT * FROM ${table} ORDER BY ${orderBy}`);
        return ok(rows);
      } catch (err) { return serverError(err); }
    },
  });

  app.http(`${name}GetById`, {
    methods: ['GET'], authLevel: 'anonymous', route: `${route}/{id}`,
    handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
      try {
        if (!requireAuth(req)) return unauthorized();
        const id = req.params.id;
        const row = await queryOne(`SELECT * FROM ${table} WHERE id = @id`, { id });
        if (!row) return notFound();
        return ok(row);
      } catch (err) { return serverError(err); }
    },
  });

  app.http(`${name}Create`, {
    methods: ['POST'], authLevel: 'anonymous', route,
    handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
      try {
        if (!requireAuth(req)) return unauthorized();
        const body = await parseBody(req);
        const id = body.id || uuidv4();
        body.id = id;
        const cols = Object.keys(body).join(', ');
        const vals = Object.keys(body).map(k => `@${k}`).join(', ');
        await execute(`INSERT INTO ${table} (${cols}) VALUES (${vals})`, body);
        const row = await queryOne(`SELECT * FROM ${table} WHERE id = @id`, { id });
        return created(row);
      } catch (err) { return serverError(err); }
    },
  });

  app.http(`${name}Update`, {
    methods: ['PATCH'], authLevel: 'anonymous', route: `${route}/{id}`,
    handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
      try {
        if (!requireAuth(req)) return unauthorized();
        const id = req.params.id;
        const body = await parseBody(req);
        delete body.id;
        const sets = Object.keys(body).map(k => `${k} = @${k}`).join(', ');
        if (!sets) return badRequest('Nothing to update');
        await execute(`UPDATE ${table} SET ${sets}, updated_at = SYSUTCDATETIME() WHERE id = @id`, { ...body, id });
        const row = await queryOne(`SELECT * FROM ${table} WHERE id = @id`, { id });
        return ok(row);
      } catch (err) { return serverError(err); }
    },
  });

  app.http(`${name}Delete`, {
    methods: ['DELETE'], authLevel: 'anonymous', route: `${route}/{id}`,
    handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
      try {
        if (!requireAuth(req)) return unauthorized();
        const id = req.params.id;
        await execute(`DELETE FROM ${table} WHERE id = @id`, { id });
        return noContent();
      } catch (err) { return serverError(err); }
    },
  });
}

// Register CRUD for all simple tables
makeCrud('users', 'users', 'name ASC');
makeCrud('vendors', 'vendors', 'vendor_name ASC');
makeCrud('customers', 'customers', 'customer_name ASC');
makeCrud('leads', 'leads', 'created_at DESC');
makeCrud('prospects', 'prospects', 'created_at DESC');
makeCrud('devices', 'devices', 'created_at DESC');

// ─── USERS extra endpoints ────────────────────────────────────────────────────
app.http('usersByAuthId', {
  methods: ['GET'], authLevel: 'anonymous', route: 'users/by-auth/{authUserId}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const row = await queryOne('SELECT * FROM users WHERE auth_user_id = @authUserId', { authUserId: req.params.authUserId });
      if (!row) return notFound();
      return ok(row);
    } catch (err) { return serverError(err); }
  },
});

app.http('usersUpdateProfile', {
  methods: ['PATCH'], authLevel: 'anonymous', route: 'users/{id}/profile',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const id = req.params.id;
      const body = await parseBody(req);
      delete body.id;
      const allowed = ['name', 'profile_picture_url', 'email'];
      const sets = allowed.filter(k => body[k] !== undefined).map(k => `${k} = @${k}`).join(', ');
      if (!sets) return badRequest('Nothing to update');
      const params: any = { id };
      allowed.forEach(k => { if (body[k] !== undefined) params[k] = body[k]; });
      await execute(`UPDATE users SET ${sets}, updated_at = SYSUTCDATETIME() WHERE id = @id`, params);
      const row = await queryOne('SELECT * FROM users WHERE id = @id', { id });
      return ok(row);
    } catch (err) { return serverError(err); }
  },
});

// ─── DEVICES extra endpoints ─────────────────────────────────────────────────
app.http('devicesByCustomer', {
  methods: ['GET'], authLevel: 'anonymous', route: 'devices/customer/{customerId}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const rows = await query('SELECT * FROM devices WHERE customer_id = @customerId ORDER BY created_at DESC', { customerId: req.params.customerId });
      return ok(rows);
    } catch (err) { return serverError(err); }
  },
});

app.http('devicesUpdateStatus', {
  methods: ['PATCH'], authLevel: 'anonymous', route: 'devices/{id}/status',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const { status, note } = await parseBody(req);
      await execute('UPDATE devices SET status = @status, status_note = @note, updated_at = SYSUTCDATETIME() WHERE id = @id', { status, note: note || null, id: req.params.id });
      const row = await queryOne('SELECT * FROM devices WHERE id = @id', { id: req.params.id });
      return ok(row);
    } catch (err) { return serverError(err); }
  },
});

app.http('deviceIssueTypes', {
  methods: ['GET'], authLevel: 'anonymous', route: 'devices/issue-types',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const rows = await query('SELECT * FROM device_issue_types ORDER BY issue_type ASC');
      return ok(rows);
    } catch (err) { return serverError(err); }
  },
});

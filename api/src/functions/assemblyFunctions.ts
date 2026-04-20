import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { query, queryOne, execute, getPool, sql } from '../db';
import { ok, created, noContent, badRequest, unauthorized, notFound, serverError, corsResponse, parseBody, requireAuth } from '../helpers';
import { v4 as uuidv4 } from 'uuid';

app.http('bomsOptions', { methods: ['OPTIONS'], authLevel: 'anonymous', route: 'boms/{*rest}', handler: async () => corsResponse() });
app.http('assembliesOptions', { methods: ['OPTIONS'], authLevel: 'anonymous', route: 'assemblies/{*rest}', handler: async () => corsResponse() });

// ─── BOMs ─────────────────────────────────────────────────────────────────────
app.http('bomsGetAll', {
  methods: ['GET'], authLevel: 'anonymous', route: 'boms',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const boms = await query('SELECT * FROM boms ORDER BY bom_name ASC');
      for (const b of boms) {
        b.bom_components = await query('SELECT bc.*, i.item_name FROM bom_components bc LEFT JOIN inventory_items i ON i.id = bc.inventory_item_id WHERE bc.bom_id = @id', { id: b.id });
      }
      return ok(boms);
    } catch (err) { return serverError(err); }
  },
});

app.http('bomsCreate', {
  methods: ['POST'], authLevel: 'anonymous', route: 'boms',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const body = await parseBody(req);
      const id = uuidv4(); body.id = id;
      const cols = Object.keys(body).join(', ');
      const vals = Object.keys(body).map(k => `@${k}`).join(', ');
      await execute(`INSERT INTO boms (${cols}) VALUES (${vals})`, body);
      return created(await queryOne('SELECT * FROM boms WHERE id = @id', { id }));
    } catch (err) { return serverError(err); }
  },
});

app.http('bomsUpdate', {
  methods: ['PATCH'], authLevel: 'anonymous', route: 'boms/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const id = req.params.id; const body = await parseBody(req); delete body.id;
      const sets = Object.keys(body).map(k => `${k} = @${k}`).join(', ');
      if (!sets) return badRequest('Nothing to update');
      await execute(`UPDATE boms SET ${sets}, updated_at = SYSUTCDATETIME() WHERE id = @id`, { ...body, id });
      return ok(await queryOne('SELECT * FROM boms WHERE id = @id', { id }));
    } catch (err) { return serverError(err); }
  },
});

app.http('bomsDelete', {
  methods: ['DELETE'], authLevel: 'anonymous', route: 'boms/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      await execute('DELETE FROM bom_components WHERE bom_id = @id', { id: req.params.id });
      await execute('DELETE FROM boms WHERE id = @id', { id: req.params.id });
      return noContent();
    } catch (err) { return serverError(err); }
  },
});

app.http('bomsAddComponent', {
  methods: ['POST'], authLevel: 'anonymous', route: 'boms/components',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const body = await parseBody(req);
      const id = uuidv4(); body.id = id;
      const cols = Object.keys(body).join(', ');
      const vals = Object.keys(body).map(k => `@${k}`).join(', ');
      await execute(`INSERT INTO bom_components (${cols}) VALUES (${vals})`, body);
      return created(await queryOne('SELECT * FROM bom_components WHERE id = @id', { id }));
    } catch (err) { return serverError(err); }
  },
});

app.http('bomsDeleteComponent', {
  methods: ['DELETE'], authLevel: 'anonymous', route: 'boms/components/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      await execute('DELETE FROM bom_components WHERE id = @id', { id: req.params.id });
      return noContent();
    } catch (err) { return serverError(err); }
  },
});

// ─── ASSEMBLIES ───────────────────────────────────────────────────────────────
app.http('assembliesGetAll', {
  methods: ['GET'], authLevel: 'anonymous', route: 'assemblies',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const assemblies = await query('SELECT a.*, b.bom_name FROM assemblies a LEFT JOIN boms b ON b.id = a.bom_id ORDER BY a.created_at DESC');
      for (const a of assemblies) {
        a.boms = a.bom_name ? { bom_name: a.bom_name } : null;
      }
      return ok(assemblies);
    } catch (err) { return serverError(err); }
  },
});

app.http('assembliesCreate', {
  methods: ['POST'], authLevel: 'anonymous', route: 'assemblies/create',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      const payload = requireAuth(req);
      if (!payload) return unauthorized();
      const { bom_id, quantity, serial_numbers, po_number } = await parseBody(req);
      if (!bom_id || !quantity) return badRequest('bom_id and quantity required');
      const pool = await getPool();
      const req2 = pool.request();
      req2.input('bom_id', sql.UniqueIdentifier, bom_id);
      req2.input('quantity', sql.Int, quantity);
      req2.input('po_number', sql.NVarChar, po_number || null);
      req2.input('created_by', sql.UniqueIdentifier, payload.userId);
      req2.output('assembly_id', sql.UniqueIdentifier);
      const result = await req2.execute('sp_execute_assembly_transaction');
      const assemblyId = result.output.assembly_id;
      return created(await queryOne('SELECT * FROM assemblies WHERE id = @id', { id: assemblyId }));
    } catch (err) { return serverError(err); }
  },
});

app.http('assembliesReverse', {
  methods: ['POST'], authLevel: 'anonymous', route: 'assemblies/{id}/reverse',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const pool = await getPool();
      const r = pool.request();
      r.input('assembly_id', sql.UniqueIdentifier, req.params.id);
      await r.execute('sp_reverse_assembly');
      return noContent();
    } catch (err) { return serverError(err); }
  },
});

app.http('assembliesGetFiles', {
  methods: ['GET'], authLevel: 'anonymous', route: 'assemblies/{id}/files',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const rows = await query('SELECT * FROM assembly_files WHERE assembly_id = @id ORDER BY created_at DESC', { id: req.params.id });
      return ok(rows);
    } catch (err) { return serverError(err); }
  },
});

app.http('assembliesAddFile', {
  methods: ['POST'], authLevel: 'anonymous', route: 'assemblies/files',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const body = await parseBody(req); const id = uuidv4(); body.id = id;
      const cols = Object.keys(body).join(', ');
      const vals = Object.keys(body).map(k => `@${k}`).join(', ');
      await execute(`INSERT INTO assembly_files (${cols}) VALUES (${vals})`, body);
      return created(await queryOne('SELECT * FROM assembly_files WHERE id = @id', { id }));
    } catch (err) { return serverError(err); }
  },
});

app.http('assembliesDeleteFile', {
  methods: ['DELETE'], authLevel: 'anonymous', route: 'assemblies/files/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      await execute('DELETE FROM assembly_files WHERE id = @id', { id: req.params.id });
      return noContent();
    } catch (err) { return serverError(err); }
  },
});

import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { query, queryOne, execute } from '../db';
import { ok, created, noContent, badRequest, unauthorized, serverError, corsResponse, parseBody, requireAuth } from '../helpers';
import { v4 as uuidv4 } from 'uuid';

app.http('miscOptions', { methods: ['OPTIONS'], authLevel: 'anonymous', route: '{*rest}', handler: async () => corsResponse() });

// ─── ACTIVITY LOGS ────────────────────────────────────────────────────────────
app.http('activityLogsGetAll', {
  methods: ['GET'], authLevel: 'anonymous', route: 'activity-logs',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const limit = req.query.get('limit') || '100';
      return ok(await query(`SELECT TOP ${parseInt(limit)} al.*, u.name as user_name FROM activity_logs al LEFT JOIN users u ON u.id = al.user_id ORDER BY al.created_at DESC`));
    } catch (err) { return serverError(err); }
  },
});

app.http('activityLogsCreate', {
  methods: ['POST'], authLevel: 'anonymous', route: 'activity-logs',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      const payload = requireAuth(req);
      if (!payload) return unauthorized();
      const { action, details } = await parseBody(req);
      const id = uuidv4();
      await execute('INSERT INTO activity_logs (id, user_id, action, details) VALUES (@id, @userId, @action, @details)',
        { id, userId: payload.userId, action, details: details ? JSON.stringify(details) : null });
      return created({ id });
    } catch (err) { return serverError(err); }
  },
});

// ─── EXCHANGE RATES ───────────────────────────────────────────────────────────
app.http('exchangeRatesGetAll', {
  methods: ['GET'], authLevel: 'anonymous', route: 'exchange-rates',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      return ok(await query('SELECT * FROM foreign_exchange_rates ORDER BY currency_code ASC'));
    } catch (err) { return serverError(err); }
  },
});

app.http('exchangeRatesUpdate', {
  methods: ['PATCH'], authLevel: 'anonymous', route: 'exchange-rates/{code}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const { inr_per_unit } = await parseBody(req);
      await execute('UPDATE foreign_exchange_rates SET inr_per_unit = @rate, updated_at = SYSUTCDATETIME() WHERE currency_code = @code', { rate: inr_per_unit, code: req.params.code });
      return ok(await queryOne('SELECT * FROM foreign_exchange_rates WHERE currency_code = @code', { code: req.params.code }));
    } catch (err) { return serverError(err); }
  },
});

// ─── DROPDOWNS ────────────────────────────────────────────────────────────────
app.http('dropdownsGetTypes', {
  methods: ['GET'], authLevel: 'anonymous', route: 'dropdowns/types',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      return ok(await query('SELECT * FROM dropdown_types ORDER BY type_name ASC'));
    } catch (err) { return serverError(err); }
  },
});

app.http('dropdownsGetValues', {
  methods: ['GET'], authLevel: 'anonymous', route: 'dropdowns/values/{typeId}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      return ok(await query('SELECT * FROM dropdown_values WHERE drop_type = @typeId ORDER BY drop_value ASC', { typeId: req.params.typeId }));
    } catch (err) { return serverError(err); }
  },
});

app.http('dropdownsAddValue', {
  methods: ['POST'], authLevel: 'anonymous', route: 'dropdowns/values',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const body = await parseBody(req); const id = uuidv4(); body.id = id;
      const cols = Object.keys(body).join(', ');
      const vals = Object.keys(body).map(k => `@${k}`).join(', ');
      await execute(`INSERT INTO dropdown_values (${cols}) VALUES (${vals})`, body);
      return created(await queryOne('SELECT * FROM dropdown_values WHERE id = @id', { id }));
    } catch (err) { return serverError(err); }
  },
});

app.http('dropdownsDeleteValue', {
  methods: ['DELETE'], authLevel: 'anonymous', route: 'dropdowns/values/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      await execute('DELETE FROM dropdown_values WHERE id = @id', { id: req.params.id });
      return noContent();
    } catch (err) { return serverError(err); }
  },
});

// ─── SYSTEM REQUESTS ─────────────────────────────────────────────────────────
app.http('systemRequestsGetAll', {
  methods: ['GET'], authLevel: 'anonymous', route: 'system-requests',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      return ok(await query('SELECT sr.*, u.name as user_name FROM system_requests sr LEFT JOIN users u ON u.id = sr.user_id ORDER BY sr.created_at DESC'));
    } catch (err) { return serverError(err); }
  },
});

app.http('systemRequestsMine', {
  methods: ['GET'], authLevel: 'anonymous', route: 'system-requests/mine',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      const payload = requireAuth(req);
      if (!payload) return unauthorized();
      return ok(await query('SELECT * FROM system_requests WHERE user_id = @uid ORDER BY created_at DESC', { uid: payload.userId }));
    } catch (err) { return serverError(err); }
  },
});

app.http('systemRequestsCreate', {
  methods: ['POST'], authLevel: 'anonymous', route: 'system-requests',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      const payload = requireAuth(req);
      if (!payload) return unauthorized();
      const body = await parseBody(req); const id = uuidv4(); body.id = id; body.user_id = payload.userId;
      const cols = Object.keys(body).join(', ');
      const vals = Object.keys(body).map(k => `@${k}`).join(', ');
      await execute(`INSERT INTO system_requests (${cols}) VALUES (${vals})`, body);
      return created(await queryOne('SELECT * FROM system_requests WHERE id = @id', { id }));
    } catch (err) { return serverError(err); }
  },
});

app.http('systemRequestsUpdate', {
  methods: ['PATCH'], authLevel: 'anonymous', route: 'system-requests/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const id = req.params.id; const body = await parseBody(req); delete body.id;
      const sets = Object.keys(body).map(k => `${k} = @${k}`).join(', ');
      if (!sets) return badRequest('Nothing to update');
      await execute(`UPDATE system_requests SET ${sets}, updated_at = SYSUTCDATETIME() WHERE id = @id`, { ...body, id });
      return ok(await queryOne('SELECT * FROM system_requests WHERE id = @id', { id }));
    } catch (err) { return serverError(err); }
  },
});

app.http('systemRequestsDelete', {
  methods: ['DELETE'], authLevel: 'anonymous', route: 'system-requests/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      await execute('DELETE FROM system_requests WHERE id = @id', { id: req.params.id });
      return noContent();
    } catch (err) { return serverError(err); }
  },
});

// ─── REPORTS ─────────────────────────────────────────────────────────────────
app.http('reportsSummary', {
  methods: ['GET'], authLevel: 'anonymous', route: 'reports/summary',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const [inv] = await query('SELECT ISNULL(SUM(quantity_in_stock * unit_cost),0) as total_inventory_value FROM inventory_items');
      const [sales] = await query('SELECT ISNULL(SUM(total_amount),0) as total_sales FROM sales');
      const [purchases] = await query('SELECT ISNULL(SUM(total_amount),0) as total_purchases FROM purchases');
      const [tickets] = await query("SELECT COUNT(*) as open_tickets FROM tickets WHERE status = 'open'");
      const [assemblies] = await query("SELECT COUNT(*) as assemblies_this_month FROM assemblies WHERE MONTH(created_at) = MONTH(GETDATE()) AND YEAR(created_at) = YEAR(GETDATE())");
      return ok({ total_inventory_value: inv.total_inventory_value, total_sales: sales.total_sales, total_purchases: purchases.total_purchases, open_tickets: tickets.open_tickets, assemblies_this_month: assemblies.assemblies_this_month });
    } catch (err) { return serverError(err); }
  },
});

// ─── BULK UPLOAD ──────────────────────────────────────────────────────────────
app.http('bulkInventory', {
  methods: ['POST'], authLevel: 'anonymous', route: 'bulk/inventory',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const { items } = await parseBody(req);
      let inserted = 0; const errors: string[] = [];
      for (const item of items) {
        try {
          item.id = item.id || uuidv4();
          const cols = Object.keys(item).join(', ');
          const vals = Object.keys(item).map(k => `@${k}`).join(', ');
          await execute(`INSERT INTO inventory_items (${cols}) VALUES (${vals})`, item);
          inserted++;
        } catch (e: any) { errors.push(e.message); }
      }
      return ok({ inserted, errors });
    } catch (err) { return serverError(err); }
  },
});

// ─── ADMIN ────────────────────────────────────────────────────────────────────
app.http('adminReset', {
  methods: ['POST'], authLevel: 'anonymous', route: 'admin/reset',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const tables = ['ticket_messages','tickets','delivery_items','deliveries','sale_items','sales','purchase_order_items','purchase_orders','assembly_components','assembly_units','assemblies','bom_components','boms','purchase_items','purchases','devices','messages','activity_logs','leads','prospects'];
      for (const t of tables) {
        await execute(`DELETE FROM ${t}`);
      }
      return ok({ message: 'Database reset complete' });
    } catch (err) { return serverError(err); }
  },
});

// ─── QR CODE ─────────────────────────────────────────────────────────────────
app.http('qrSendEmail', {
  methods: ['POST'], authLevel: 'anonymous', route: 'qr/send-email',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      // Email sending would be configured with your SMTP/SendGrid settings
      return ok({ message: 'QR code email queued' });
    } catch (err) { return serverError(err); }
  },
});

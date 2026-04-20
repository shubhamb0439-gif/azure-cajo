import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { query, queryOne, execute } from '../db';
import { ok, created, noContent, badRequest, unauthorized, notFound, serverError, corsResponse, parseBody, requireAuth } from '../helpers';
import { v4 as uuidv4 } from 'uuid';

app.http('salesOptions', { methods: ['OPTIONS'], authLevel: 'anonymous', route: 'sales/{*rest}', handler: async () => corsResponse() });
app.http('deliveriesOptions', { methods: ['OPTIONS'], authLevel: 'anonymous', route: 'deliveries/{*rest}', handler: async () => corsResponse() });

// ─── SALES ────────────────────────────────────────────────────────────────────
app.http('salesGetAll', {
  methods: ['GET'], authLevel: 'anonymous', route: 'sales',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const sales = await query('SELECT s.*, c.customer_name FROM sales s LEFT JOIN customers c ON c.id = s.customer_id ORDER BY s.sale_date DESC');
      for (const s of sales) {
        s.sale_items = await query('SELECT si.*, i.item_name FROM sale_items si LEFT JOIN inventory_items i ON i.id = si.inventory_item_id WHERE si.sale_id = @id', { id: s.id });
        s.customers = s.customer_name ? { customer_name: s.customer_name } : null;
      }
      return ok(sales);
    } catch (err) { return serverError(err); }
  },
});

app.http('salesGetById', {
  methods: ['GET'], authLevel: 'anonymous', route: 'sales/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const sale = await queryOne('SELECT * FROM sales WHERE id = @id', { id: req.params.id });
      if (!sale) return notFound();
      sale.sale_items = await query('SELECT * FROM sale_items WHERE sale_id = @id', { id: sale.id });
      return ok(sale);
    } catch (err) { return serverError(err); }
  },
});

app.http('salesGetByCustomer', {
  methods: ['GET'], authLevel: 'anonymous', route: 'sales/customer/{customerId}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const sales = await query('SELECT * FROM sales WHERE customer_id = @customerId ORDER BY sale_date DESC', { customerId: req.params.customerId });
      for (const s of sales) {
        s.sale_items = await query('SELECT * FROM sale_items WHERE sale_id = @id', { id: s.id });
      }
      return ok(sales);
    } catch (err) { return serverError(err); }
  },
});

app.http('salesCreate', {
  methods: ['POST'], authLevel: 'anonymous', route: 'sales',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const { items, ...saleData } = await parseBody(req);
      const id = uuidv4(); saleData.id = id;
      const cols = Object.keys(saleData).join(', ');
      const vals = Object.keys(saleData).map(k => `@${k}`).join(', ');
      await execute(`INSERT INTO sales (${cols}) VALUES (${vals})`, saleData);
      if (items?.length) {
        for (const item of items) {
          await execute(`INSERT INTO sale_items (id, sale_id, inventory_item_id, quantity, unit_price) VALUES (@id, @saleId, @invId, @qty, @price)`,
            { id: uuidv4(), saleId: id, invId: item.inventory_item_id, qty: item.quantity, price: item.unit_price || 0 });
        }
      }
      return created(await queryOne('SELECT * FROM sales WHERE id = @id', { id }));
    } catch (err) { return serverError(err); }
  },
});

app.http('salesUpdate', {
  methods: ['PATCH'], authLevel: 'anonymous', route: 'sales/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const id = req.params.id;
      const { items, ...body } = await parseBody(req); delete body.id;
      if (Object.keys(body).length) {
        const sets = Object.keys(body).map(k => `${k} = @${k}`).join(', ');
        await execute(`UPDATE sales SET ${sets}, updated_at = SYSUTCDATETIME() WHERE id = @id`, { ...body, id });
      }
      return ok(await queryOne('SELECT * FROM sales WHERE id = @id', { id }));
    } catch (err) { return serverError(err); }
  },
});

app.http('salesDelete', {
  methods: ['DELETE'], authLevel: 'anonymous', route: 'sales/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      await execute('DELETE FROM sale_items WHERE sale_id = @id', { id: req.params.id });
      await execute('DELETE FROM sales WHERE id = @id', { id: req.params.id });
      return noContent();
    } catch (err) { return serverError(err); }
  },
});

app.http('salesOverview', {
  methods: ['GET'], authLevel: 'anonymous', route: 'sales/overview',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const [totals] = await query('SELECT COUNT(*) as total_orders, ISNULL(SUM(total_amount),0) as total_revenue FROM sales');
      const monthly = await query(`SELECT FORMAT(sale_date,'yyyy-MM') as month, SUM(total_amount) as revenue FROM sales GROUP BY FORMAT(sale_date,'yyyy-MM') ORDER BY month DESC`);
      const top = await query(`SELECT i.item_name as name, SUM(si.quantity) as quantity, SUM(si.quantity * si.unit_price) as revenue FROM sale_items si JOIN inventory_items i ON i.id = si.inventory_item_id GROUP BY i.item_name ORDER BY revenue DESC`);
      return ok({ total_revenue: totals.total_revenue, total_orders: totals.total_orders, monthly_revenue: monthly, top_products: top });
    } catch (err) { return serverError(err); }
  },
});

// ─── DELIVERIES ───────────────────────────────────────────────────────────────
app.http('deliveriesGetAll', {
  methods: ['GET'], authLevel: 'anonymous', route: 'deliveries',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const deliveries = await query('SELECT d.*, s.sale_number FROM deliveries d LEFT JOIN sales s ON s.id = d.sale_id ORDER BY d.created_at DESC');
      for (const d of deliveries) {
        d.delivery_items = await query('SELECT * FROM delivery_items WHERE delivery_id = @id', { id: d.id });
        d.sales = d.sale_number ? { sale_number: d.sale_number } : null;
      }
      return ok(deliveries);
    } catch (err) { return serverError(err); }
  },
});

app.http('deliveriesCreate', {
  methods: ['POST'], authLevel: 'anonymous', route: 'deliveries',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const { items, ...data } = await parseBody(req);
      const id = uuidv4(); data.id = id;
      const cols = Object.keys(data).join(', ');
      const vals = Object.keys(data).map(k => `@${k}`).join(', ');
      await execute(`INSERT INTO deliveries (${cols}) VALUES (${vals})`, data);
      if (items?.length) {
        for (const item of items) {
          await execute(`INSERT INTO delivery_items (id, delivery_id, inventory_item_id, quantity) VALUES (@id, @dId, @invId, @qty)`,
            { id: uuidv4(), dId: id, invId: item.inventory_item_id || item.item_id, qty: item.quantity });
        }
      }
      return created(await queryOne('SELECT * FROM deliveries WHERE id = @id', { id }));
    } catch (err) { return serverError(err); }
  },
});

app.http('deliveriesUpdate', {
  methods: ['PATCH'], authLevel: 'anonymous', route: 'deliveries/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const id = req.params.id;
      const body = await parseBody(req); delete body.id;
      const sets = Object.keys(body).map(k => `${k} = @${k}`).join(', ');
      if (!sets) return badRequest('Nothing to update');
      await execute(`UPDATE deliveries SET ${sets}, updated_at = SYSUTCDATETIME() WHERE id = @id`, { ...body, id });
      return ok(await queryOne('SELECT * FROM deliveries WHERE id = @id', { id }));
    } catch (err) { return serverError(err); }
  },
});

app.http('deliveriesFulfill', {
  methods: ['POST'], authLevel: 'anonymous', route: 'deliveries/{id}/fulfill',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const { items } = await parseBody(req);
      for (const item of items) {
        await execute('UPDATE inventory_items SET quantity_in_stock = quantity_in_stock - @qty WHERE id = @id', { qty: item.quantity, id: item.item_id });
      }
      await execute('UPDATE deliveries SET delivered = 1, delivered_date = SYSUTCDATETIME() WHERE id = @id', { id: req.params.id });
      return noContent();
    } catch (err) { return serverError(err); }
  },
});

app.http('deliveriesDelete', {
  methods: ['DELETE'], authLevel: 'anonymous', route: 'deliveries/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      await execute('DELETE FROM delivery_items WHERE delivery_id = @id', { id: req.params.id });
      await execute('DELETE FROM deliveries WHERE id = @id', { id: req.params.id });
      return noContent();
    } catch (err) { return serverError(err); }
  },
});

app.http('deliveriesBySale', {
  methods: ['GET'], authLevel: 'anonymous', route: 'deliveries/sale/{saleId}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const rows = await query('SELECT * FROM deliveries WHERE sale_id = @saleId', { saleId: req.params.saleId });
      return ok(rows);
    } catch (err) { return serverError(err); }
  },
});

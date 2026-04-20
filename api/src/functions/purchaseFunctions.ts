import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { query, queryOne, execute, sql } from '../db';
import { ok, created, noContent, badRequest, unauthorized, notFound, serverError, corsResponse, parseBody, requireAuth } from '../helpers';
import { v4 as uuidv4 } from 'uuid';

app.http('purchasesOptions', { methods: ['OPTIONS'], authLevel: 'anonymous', route: 'purchases/{*rest}', handler: async () => corsResponse() });
app.http('purchaseOrdersOptions', { methods: ['OPTIONS'], authLevel: 'anonymous', route: 'purchase-orders/{*rest}', handler: async () => corsResponse() });

// ─── PURCHASES ────────────────────────────────────────────────────────────────
app.http('purchasesGetAll', {
  methods: ['GET'], authLevel: 'anonymous', route: 'purchases',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const purchases = await query('SELECT * FROM purchases ORDER BY purchase_date DESC');
      for (const p of purchases) {
        p.purchase_items = await query('SELECT pi.*, i.item_name, i.item_id as item_code FROM purchase_items pi LEFT JOIN inventory_items i ON i.id = pi.inventory_item_id WHERE pi.purchase_id = @id', { id: p.id });
        const vendor = await queryOne('SELECT vendor_name FROM vendors WHERE id = @id', { id: p.vendor_id });
        p.vendors = vendor;
      }
      return ok(purchases);
    } catch (err) { return serverError(err); }
  },
});

app.http('purchasesCreate', {
  methods: ['POST'], authLevel: 'anonymous', route: 'purchases',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const body = await parseBody(req);
      const { items, ...purchaseData } = body;
      const id = uuidv4();
      purchaseData.id = id;
      const cols = Object.keys(purchaseData).join(', ');
      const vals = Object.keys(purchaseData).map(k => `@${k}`).join(', ');
      await execute(`INSERT INTO purchases (${cols}) VALUES (${vals})`, purchaseData);
      if (items?.length) {
        for (const item of items) {
          const itemId = uuidv4();
          await execute(`INSERT INTO purchase_items (id, purchase_id, inventory_item_id, quantity, unit_cost, quantity_received) VALUES (@id, @purchase_id, @inventory_item_id, @quantity, @unit_cost, 0)`,
            { id: itemId, purchase_id: id, inventory_item_id: item.inventory_item_id, quantity: item.quantity, unit_cost: item.unit_cost || 0 });
        }
      }
      const row = await queryOne('SELECT * FROM purchases WHERE id = @id', { id });
      return created(row);
    } catch (err) { return serverError(err); }
  },
});

app.http('purchasesUpdate', {
  methods: ['PATCH'], authLevel: 'anonymous', route: 'purchases/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const id = req.params.id;
      const { items, ...body } = await parseBody(req); delete body.id;
      if (Object.keys(body).length) {
        const sets = Object.keys(body).map(k => `${k} = @${k}`).join(', ');
        await execute(`UPDATE purchases SET ${sets}, updated_at = SYSUTCDATETIME() WHERE id = @id`, { ...body, id });
      }
      return ok(await queryOne('SELECT * FROM purchases WHERE id = @id', { id }));
    } catch (err) { return serverError(err); }
  },
});

app.http('purchasesDelete', {
  methods: ['DELETE'], authLevel: 'anonymous', route: 'purchases/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      await execute('DELETE FROM purchase_items WHERE purchase_id = @id', { id: req.params.id });
      await execute('DELETE FROM purchases WHERE id = @id', { id: req.params.id });
      return noContent();
    } catch (err) { return serverError(err); }
  },
});

app.http('purchasesReceive', {
  methods: ['POST'], authLevel: 'anonymous', route: 'purchases/{id}/receive',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const { items } = await parseBody(req);
      for (const item of items) {
        await execute('UPDATE purchase_items SET quantity_received = @qty WHERE id = @id', { qty: item.quantity_received, id: item.id });
        const pi = await queryOne('SELECT * FROM purchase_items WHERE id = @id', { id: item.id });
        if (pi) {
          await execute('UPDATE inventory_items SET quantity_in_stock = quantity_in_stock + @qty, updated_at = SYSUTCDATETIME() WHERE id = @invId', { qty: item.quantity_received, invId: pi.inventory_item_id });
        }
      }
      return noContent();
    } catch (err) { return serverError(err); }
  },
});

app.http('purchasesStockByVendor', {
  methods: ['GET'], authLevel: 'anonymous', route: 'purchases/stock-by-vendor',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const rows = await query(`SELECT v.id as vendor_id, v.vendor_name, i.item_name, SUM(pi.quantity_received) as quantity FROM purchase_items pi JOIN purchases p ON p.id = pi.purchase_id JOIN vendors v ON v.id = p.vendor_id JOIN inventory_items i ON i.id = pi.inventory_item_id GROUP BY v.id, v.vendor_name, i.item_name`);
      return ok(rows);
    } catch (err) { return serverError(err); }
  },
});

// ─── PURCHASE ORDERS ─────────────────────────────────────────────────────────
app.http('purchaseOrdersGetAll', {
  methods: ['GET'], authLevel: 'anonymous', route: 'purchase-orders',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const pos = await query('SELECT po.*, c.customer_name FROM purchase_orders po LEFT JOIN customers c ON c.id = po.customer_id ORDER BY po.created_at DESC');
      for (const po of pos) {
        po.purchase_order_items = await query('SELECT poi.*, i.item_name FROM purchase_order_items poi LEFT JOIN inventory_items i ON i.id = poi.inventory_item_id WHERE poi.purchase_order_id = @id', { id: po.id });
        po.customers = po.customer_name ? { customer_name: po.customer_name } : null;
      }
      return ok(pos);
    } catch (err) { return serverError(err); }
  },
});

app.http('purchaseOrdersCreate', {
  methods: ['POST'], authLevel: 'anonymous', route: 'purchase-orders',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const { items, ...poData } = await parseBody(req);
      const id = uuidv4(); poData.id = id;
      const cols = Object.keys(poData).join(', ');
      const vals = Object.keys(poData).map(k => `@${k}`).join(', ');
      await execute(`INSERT INTO purchase_orders (${cols}) VALUES (${vals})`, poData);
      if (items?.length) {
        for (const item of items) {
          await execute(`INSERT INTO purchase_order_items (id, purchase_order_id, inventory_item_id, quantity, unit_price) VALUES (@id, @poId, @invId, @qty, @price)`,
            { id: uuidv4(), poId: id, invId: item.inventory_item_id, qty: item.quantity, price: item.unit_price || 0 });
        }
      }
      return created(await queryOne('SELECT * FROM purchase_orders WHERE id = @id', { id }));
    } catch (err) { return serverError(err); }
  },
});

app.http('purchaseOrdersUpdate', {
  methods: ['PATCH'], authLevel: 'anonymous', route: 'purchase-orders/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const id = req.params.id;
      const { items, ...body } = await parseBody(req); delete body.id;
      if (Object.keys(body).length) {
        const sets = Object.keys(body).map(k => `${k} = @${k}`).join(', ');
        await execute(`UPDATE purchase_orders SET ${sets}, updated_at = SYSUTCDATETIME() WHERE id = @id`, { ...body, id });
      }
      return ok(await queryOne('SELECT * FROM purchase_orders WHERE id = @id', { id }));
    } catch (err) { return serverError(err); }
  },
});

app.http('purchaseOrdersDelete', {
  methods: ['DELETE'], authLevel: 'anonymous', route: 'purchase-orders/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      await execute('DELETE FROM purchase_order_items WHERE purchase_order_id = @id', { id: req.params.id });
      await execute('DELETE FROM purchase_orders WHERE id = @id', { id: req.params.id });
      return noContent();
    } catch (err) { return serverError(err); }
  },
});

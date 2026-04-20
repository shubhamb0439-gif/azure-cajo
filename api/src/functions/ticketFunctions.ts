import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { query, queryOne, execute } from '../db';
import { ok, created, noContent, badRequest, unauthorized, notFound, serverError, corsResponse, parseBody, requireAuth } from '../helpers';
import { v4 as uuidv4 } from 'uuid';

app.http('ticketsOptions', { methods: ['OPTIONS'], authLevel: 'anonymous', route: 'tickets/{*rest}', handler: async () => corsResponse() });
app.http('messagesOptions', { methods: ['OPTIONS'], authLevel: 'anonymous', route: 'messages/{*rest}', handler: async () => corsResponse() });

app.http('ticketsGetAll', {
  methods: ['GET'], authLevel: 'anonymous', route: 'tickets',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const rows = await query('SELECT t.*, d.device_serial_number, c.customer_name FROM tickets t LEFT JOIN devices d ON d.id = t.device_id LEFT JOIN customers c ON c.id = t.customer_id ORDER BY t.created_at DESC');
      return ok(rows);
    } catch (err) { return serverError(err); }
  },
});

app.http('ticketsGetById', {
  methods: ['GET'], authLevel: 'anonymous', route: 'tickets/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const row = await queryOne('SELECT * FROM tickets WHERE id = @id', { id: req.params.id });
      if (!row) return notFound();
      return ok(row);
    } catch (err) { return serverError(err); }
  },
});

app.http('ticketsCreate', {
  methods: ['POST'], authLevel: 'anonymous', route: 'tickets',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const body = await parseBody(req); const id = uuidv4(); body.id = id;
      const cols = Object.keys(body).join(', ');
      const vals = Object.keys(body).map(k => `@${k}`).join(', ');
      await execute(`INSERT INTO tickets (${cols}) VALUES (${vals})`, body);
      return created(await queryOne('SELECT * FROM tickets WHERE id = @id', { id }));
    } catch (err) { return serverError(err); }
  },
});

app.http('ticketsUpdate', {
  methods: ['PATCH'], authLevel: 'anonymous', route: 'tickets/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const id = req.params.id; const body = await parseBody(req); delete body.id;
      const sets = Object.keys(body).map(k => `${k} = @${k}`).join(', ');
      if (!sets) return badRequest('Nothing to update');
      await execute(`UPDATE tickets SET ${sets}, updated_at = SYSUTCDATETIME() WHERE id = @id`, { ...body, id });
      return ok(await queryOne('SELECT * FROM tickets WHERE id = @id', { id }));
    } catch (err) { return serverError(err); }
  },
});

app.http('ticketsClose', {
  methods: ['PATCH'], authLevel: 'anonymous', route: 'tickets/{id}/close',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      await execute("UPDATE tickets SET status = 'closed', closed_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME() WHERE id = @id", { id: req.params.id });
      return ok(await queryOne('SELECT * FROM tickets WHERE id = @id', { id: req.params.id }));
    } catch (err) { return serverError(err); }
  },
});

app.http('ticketsDelete', {
  methods: ['DELETE'], authLevel: 'anonymous', route: 'tickets/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      await execute('DELETE FROM ticket_messages WHERE ticket_id = @id', { id: req.params.id });
      await execute('DELETE FROM tickets WHERE id = @id', { id: req.params.id });
      return noContent();
    } catch (err) { return serverError(err); }
  },
});

app.http('ticketsByDevice', {
  methods: ['GET'], authLevel: 'anonymous', route: 'tickets/device/{deviceId}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      return ok(await query('SELECT * FROM tickets WHERE device_id = @deviceId ORDER BY created_at DESC', { deviceId: req.params.deviceId }));
    } catch (err) { return serverError(err); }
  },
});

app.http('ticketsByCustomer', {
  methods: ['GET'], authLevel: 'anonymous', route: 'tickets/customer/{customerId}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      return ok(await query('SELECT * FROM tickets WHERE customer_id = @customerId ORDER BY created_at DESC', { customerId: req.params.customerId }));
    } catch (err) { return serverError(err); }
  },
});

app.http('ticketsGetMessages', {
  methods: ['GET'], authLevel: 'anonymous', route: 'tickets/{ticketId}/messages',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      return ok(await query('SELECT tm.*, u.name as sender_name FROM ticket_messages tm LEFT JOIN users u ON u.id = tm.sender_id WHERE tm.ticket_id = @ticketId ORDER BY tm.created_at ASC', { ticketId: req.params.ticketId }));
    } catch (err) { return serverError(err); }
  },
});

app.http('ticketsSendMessage', {
  methods: ['POST'], authLevel: 'anonymous', route: 'tickets/{ticketId}/messages',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      const payload = requireAuth(req);
      if (!payload) return unauthorized();
      const { content } = await parseBody(req);
      const id = uuidv4();
      await execute('INSERT INTO ticket_messages (id, ticket_id, sender_id, content) VALUES (@id, @ticketId, @senderId, @content)',
        { id, ticketId: req.params.ticketId, senderId: payload.userId, content });
      return created(await queryOne('SELECT * FROM ticket_messages WHERE id = @id', { id }));
    } catch (err) { return serverError(err); }
  },
});

// ─── MESSAGES ─────────────────────────────────────────────────────────────────
app.http('messagesGetConversations', {
  methods: ['GET'], authLevel: 'anonymous', route: 'messages/conversations',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      const payload = requireAuth(req);
      if (!payload) return unauthorized();
      const msgs = await query(`SELECT DISTINCT CASE WHEN sender_id = @uid THEN recipient_id ELSE sender_id END as other_user_id FROM messages WHERE sender_id = @uid OR recipient_id = @uid`, { uid: payload.userId });
      const result = [];
      for (const m of msgs) {
        const user = await queryOne('SELECT id, name, email, profile_picture_url FROM users WHERE id = @id', { id: m.other_user_id });
        const lastMsg = await queryOne('SELECT TOP 1 * FROM messages WHERE (sender_id = @uid AND recipient_id = @oid) OR (sender_id = @oid AND recipient_id = @uid) ORDER BY created_at DESC', { uid: payload.userId, oid: m.other_user_id });
        const unread = await queryOne('SELECT COUNT(*) as cnt FROM messages WHERE sender_id = @oid AND recipient_id = @uid AND is_read = 0', { oid: m.other_user_id, uid: payload.userId });
        result.push({ user, lastMessage: lastMsg, unreadCount: unread?.cnt || 0 });
      }
      return ok(result);
    } catch (err) { return serverError(err); }
  },
});

app.http('messagesGetThread', {
  methods: ['GET'], authLevel: 'anonymous', route: 'messages/{userId}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      const payload = requireAuth(req);
      if (!payload) return unauthorized();
      const rows = await query('SELECT * FROM messages WHERE (sender_id = @uid AND recipient_id = @oid) OR (sender_id = @oid AND recipient_id = @uid) ORDER BY created_at ASC', { uid: payload.userId, oid: req.params.userId });
      return ok(rows);
    } catch (err) { return serverError(err); }
  },
});

app.http('messagesSend', {
  methods: ['POST'], authLevel: 'anonymous', route: 'messages',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      const payload = requireAuth(req);
      if (!payload) return unauthorized();
      const { recipient_id, content } = await parseBody(req);
      const id = uuidv4();
      await execute('INSERT INTO messages (id, sender_id, recipient_id, content) VALUES (@id, @senderId, @recipientId, @content)',
        { id, senderId: payload.userId, recipientId: recipient_id, content });
      return created(await queryOne('SELECT * FROM messages WHERE id = @id', { id }));
    } catch (err) { return serverError(err); }
  },
});

app.http('messagesMarkRead', {
  methods: ['POST'], authLevel: 'anonymous', route: 'messages/read',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      const { messageIds } = await parseBody(req);
      for (const mid of (messageIds || [])) {
        await execute('UPDATE messages SET is_read = 1 WHERE id = @id', { id: mid });
      }
      return noContent();
    } catch (err) { return serverError(err); }
  },
});

app.http('messagesDelete', {
  methods: ['DELETE'], authLevel: 'anonymous', route: 'messages/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      if (!requireAuth(req)) return unauthorized();
      await execute('DELETE FROM messages WHERE id = @id', { id: req.params.id });
      return noContent();
    } catch (err) { return serverError(err); }
  },
});

app.http('messagesUnreadCount', {
  methods: ['GET'], authLevel: 'anonymous', route: 'messages/unread-count',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      const payload = requireAuth(req);
      if (!payload) return unauthorized();
      const row = await queryOne('SELECT COUNT(*) as count FROM messages WHERE recipient_id = @uid AND is_read = 0', { uid: payload.userId });
      return ok({ count: row?.count || 0 });
    } catch (err) { return serverError(err); }
  },
});

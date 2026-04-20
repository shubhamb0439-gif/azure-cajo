import { HttpRequest, HttpResponseInit } from '@azure/functions';
import { getTokenFromRequest, TokenPayload } from './auth';

export function ok(data: any): HttpResponseInit {
  return { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders() }, body: JSON.stringify(data) };
}

export function created(data: any): HttpResponseInit {
  return { status: 201, headers: { 'Content-Type': 'application/json', ...corsHeaders() }, body: JSON.stringify(data) };
}

export function noContent(): HttpResponseInit {
  return { status: 204, headers: corsHeaders() };
}

export function badRequest(message: string): HttpResponseInit {
  return { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders() }, body: JSON.stringify({ message }) };
}

export function unauthorized(message = 'Unauthorized'): HttpResponseInit {
  return { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders() }, body: JSON.stringify({ message }) };
}

export function forbidden(message = 'Forbidden'): HttpResponseInit {
  return { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders() }, body: JSON.stringify({ message }) };
}

export function notFound(message = 'Not found'): HttpResponseInit {
  return { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders() }, body: JSON.stringify({ message }) };
}

export function serverError(err: any): HttpResponseInit {
  console.error(err);
  return { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() }, body: JSON.stringify({ message: 'Internal server error', detail: String(err) }) };
}

export function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-functions-key',
  };
}

export function corsResponse(): HttpResponseInit {
  return { status: 204, headers: corsHeaders() };
}

export function requireAuth(req: HttpRequest): TokenPayload | null {
  return getTokenFromRequest(req);
}

export async function parseBody(req: HttpRequest): Promise<any> {
  try {
    const text = await req.text();
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

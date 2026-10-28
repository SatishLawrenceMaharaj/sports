export function GET() {
  return Response.json({ ok: true, at: new Date().toISOString() }, {
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}

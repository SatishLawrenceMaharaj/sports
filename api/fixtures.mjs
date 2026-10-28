import catalog from '../lib/catalog.js';
import schedules from '../lib/schedules.js';

const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const defaults = catalog.LEAGUES.filter(item => item.default).map(item => item.id).join(',');
    const requested = (url.searchParams.get('leagues') || defaults).split(',').map(s => s.trim());
    const ids = [...new Set(requested)].filter(id => Object.hasOwn(catalog.byId, id));
    if (!ids.length) return Response.json({error:'No valid competitions selected'}, { status:400, headers });
    const days = Math.max(1, Math.min(70, Number.parseInt(url.searchParams.get('days') || '30', 10) || 30));
    const pastDays = Math.max(0, Math.min(7, Number.parseInt(url.searchParams.get('past') || '2', 10) || 2));
    const result = await schedules.getFixtures(ids, {days, pastDays});
    return Response.json(result, {headers});
  } catch {
    return Response.json({error:'Schedule service error'}, {status:500, headers});
  }
}

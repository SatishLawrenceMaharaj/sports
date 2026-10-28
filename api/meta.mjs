import catalog from '../lib/catalog.js';
import viewing from '../lib/watch.js';

export function GET() {
  return Response.json({
    app: 'Sports Nexus',
    version: '1.0.0',
    leagues: catalog.LEAGUES,
    watch: viewing.WATCH,
    timezoneDefault: 'America/Port_of_Spain',
    free: true,
    storage: 'browser localStorage',
    privacy: 'Preferences stay in your browser; no account or analytics.',
    providers: ['ESPN public/unofficial API', 'Jolpica F1']
  }, { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

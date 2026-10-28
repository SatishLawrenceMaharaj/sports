'use strict';
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { LEAGUES, byId } = require('./lib/catalog');
const { WATCH } = require('./lib/watch');
const { getFixtures } = require('./lib/schedules');
const PUBLIC = path.resolve(__dirname,'public');
const PORT = Number(process.env.PORT) || 3400;
const HOST = process.env.HOST || '127.0.0.1';
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const headers = {
  'x-content-type-options':'nosniff',
  'referrer-policy':'strict-origin-when-cross-origin',
  'x-frame-options':'DENY',
  'content-security-policy':"default-src 'self'; img-src 'self' https: data:; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
};
function json(res,status,body,extra={}) {
  res.writeHead(status,{...headers,...extra,'content-type':'application/json; charset=utf-8','cache-control':'no-store'});
  res.end(JSON.stringify(body));
}
async function serveStatic(url,res){
  const requestPath = decodeURIComponent(url.pathname);
  const file = path.resolve(PUBLIC,'.'+(requestPath==='/'?'/index.html':requestPath));
  if(!(file===PUBLIC||file.startsWith(PUBLIC+path.sep)))return json(res,403,{error:'Forbidden'});
  try{
    const data=await fs.readFile(file);
    const type=MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200,{...headers,'content-type':type,'cache-control':type.startsWith('text/html')?'no-cache':'public, max-age=3600'});
    res.end(data);
  } catch(e){json(res,e.code==='ENOENT'?404:500,{error:e.code==='ENOENT'?'Not found':'Static file error'});}
}
async function handler(req,res){
  if(req.method!=='GET')return json(res,405,{error:'Only GET is supported'});
  let url;
  try {url=new URL(req.url,'http://localhost');}catch {return json(res,400,{error:'Invalid URL'});}
  try{
    if(url.pathname==='/api/meta')return json(res,200,{app:'Sports Nexus',version:'1.0.0',leagues:LEAGUES,watch:WATCH,timezoneDefault:'America/Port_of_Spain',free:true,storage:'browser localStorage',privacy:'Preferences stay in your browser; no account or analytics.',providers:['ESPN public/unofficial API','Jolpica F1']});
    if(url.pathname==='/api/health')return json(res,200,{ok:true,at:new Date().toISOString()});
    if(url.pathname==='/api/fixtures') {
      const requested=(url.searchParams.get('leagues')||LEAGUES.filter(l=>l.default).map(l=>l.id).join(',')).split(',').map(s=>s.trim());
      const ids=[...new Set(requested)].filter(id=>byId[id]);
      if(!ids.length)return json(res,400,{error:'No valid competitions selected'});
      const days=Math.max(1,Math.min(70,Number.parseInt(url.searchParams.get('days')||'30',10)||30));
      const pastDays=Math.max(0,Math.min(7,Number.parseInt(url.searchParams.get('past')||'2',10)||2));
      const result=await getFixtures(ids,{days,pastDays});
      return json(res,200,result);
    }
    if(url.pathname.startsWith('/api/'))return json(res,404,{error:'Unknown API endpoint'});
    return await serveStatic(url,res);
  } catch(error) {
    return json(res,500,{error:'Request failed',detail:process.env.NODE_ENV==='development'?error.message:undefined});
  }
}
function createServer(){return http.createServer((req,res)=>{handler(req,res).catch(e=>json(res,500,{error:e.message}));});}
if(require.main===module){
  createServer().listen(PORT,HOST,()=>console.log(`\n  SPORTS NEXUS running: http://${HOST}:${PORT}\n  Node ${process.version} · No npm install or database required\n`));
}
module.exports={createServer,handler};

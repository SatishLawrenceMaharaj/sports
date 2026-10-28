'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {LEAGUES}=require('../lib/catalog');
const {WATCH}=require('../lib/watch');
const {createServer}=require('../local-server.cjs');
const {normalizeESPN,normalizeF1Race,normalizeUfcCalendar,monthsInWindow,fetchLeague,getFixtures}=require('../lib/schedules');

test('all requested sports are represented',()=>{
  for(const id of ['nba','epl','laliga','ligue1','seriea','bundesliga','ufc','f1','nfl']){
    assert.ok(LEAGUES.some(l=>l.id===id));
    assert.ok(WATCH[id]?.length);
    assert.ok(WATCH[id].every(link=>link.url.startsWith('https://')));
  }
});
test('cross-year month windows are correct',()=>{
  assert.deepEqual(monthsInWindow(new Date('2026-12-30'),new Date('2027-02-12')),['202612','202701','202702']);
});
test('ESPN team fixture normalization preserves scores and correct away/home order',()=>{
  const l=LEAGUES.find(l=>l.id==='nba');
  const e=normalizeESPN(l,{id:'502',name:'Bulls at Knicks',date:'2026-10-30T23:00Z',
    status:{type:{state:'in',shortDetail:'Q2 - 2:31'}},competitions:[{venue:{fullName:'Madison Square Garden'},competitors:[
      {homeAway:'home',team:{displayName:'New York Knicks',abbreviation:'NYK'},score:'100'},
      {homeAway:'away',team:{displayName:'Chicago Bulls',abbreviation:'CHI'},score:'96'}
    ],broadcasts:[{names:['ESPN']}]}]});
  assert.equal(e.id,'nba:502');assert.equal(e.away.score,'96');assert.equal(e.home.name,'New York Knicks');
  assert.equal(e.state,'in');assert.equal(e.broadcasts[0],'ESPN');
});
test('UFC calendar names and start times normalize without treating them as main card time',()=>{
  const e=normalizeUfcCalendar({label:'UFC Fight Night: Sample vs. Sample',startDate:'2026-11-01T01:00Z',event:{$ref:'http://sports.core.api.espn.pvt/v2/sports/mma/leagues/ufc/events/60000123?lang=en'}});
  assert.equal(e.id,'ufc:60000123');assert.equal(e.state,'pre');assert.match(e.status,/event start/i);
});
test('F1 race start and qualifying sessions are distinct',()=>{
  const e=normalizeF1Race({round:'20',raceName:'Mexico City Grand Prix',date:'2026-11-01',time:'20:00:00Z',Qualifying:{date:'2026-10-31',time:'21:00:00Z'},Circuit:{circuitName:'Autódromo Hermanos Rodríguez',Location:{locality:'Mexico City',country:'Mexico'}}});
  assert.equal(e.date,'2026-11-01T20:00:00.000Z');assert.equal(e.sessions.length,2);assert.equal(e.sessions[0].name,'Qualifying');
});
test('fixture aggregation tolerates one failing provider and includes upcoming events',async()=>{
  const original=global.fetch;
  global.fetch=async url=>{
    const u=String(url);
    if(u.includes('/basketball/nba'))return {ok:true,json:async()=>({events:[{id:'900',date:'2026-10-29T23:00:00Z',name:'NBA Game',competitions:[],status:{type:{state:'pre'}}}]})};
    if(u.includes('/football/nfl'))throw new Error('Upstream offline');
    if(u.includes('jolpi.ca'))return {ok:true,json:async()=>({MRData:{RaceTable:{Races:[{round:'19',date:'2026-11-01',time:'20:00:00Z',raceName:'GP',Circuit:{circuitName:'Track'}}]}}})};
    throw new Error('Unexpected request: '+u);
  };
  try{
    const data=await getFixtures(['nba','nfl','f1'],{now:new Date('2026-10-28T15:00:00Z'),days:30,pastDays:0});
    assert.ok(data.events.some(e=>e.id==='nba:900'));
    assert.ok(data.events.some(e=>e.id==='f1:19'));
    assert.equal(data.health.nfl.ok,false);assert.equal(data.partial,true);
  }finally{global.fetch=original;}
});
test('web server serves UI and metadata and rejects unknown league', async()=>{
  const srv=createServer();await new Promise(res=>srv.listen(0,'127.0.0.1',res));
  const port=srv.address().port;
  const get=(path)=>new Promise((resolve,reject)=>http.get({host:'127.0.0.1',port,path},r=>{let content='';r.on('data',chunk=>content+=chunk);r.on('end',()=>resolve({status:r.statusCode,body:content,headers:r.headers}));}).on('error',reject));
  try{
    const html=await get('/');assert.equal(html.status,200);assert.match(html.body,/SPORTS.*NEXUS/);assert.match(html.headers['content-security-policy'],/script-src/);
    const meta=await get('/api/meta');assert.equal(meta.status,200);assert.ok(JSON.parse(meta.body).leagues.length>=10);
    const bad=await get('/api/fixtures?leagues=not-a-league');assert.equal(bad.status,400);
    const secret=await get('/package.json');assert.equal(secret.status,404);
  }finally{await new Promise(res=>srv.close(res));}
});

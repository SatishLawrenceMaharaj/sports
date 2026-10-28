'use strict';
const { byId } = require('./catalog');
const upstreamCache = new Map();
const requests = new Map();
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/';
const JOLPICA = 'https://api.jolpi.ca/ergast/f1/';

const dateOK = s => Boolean(s && Number.isFinite(new Date(s).getTime()));
const iso = (date, time='00:00:00Z') => dateOK(`${date}T${time}`) ? new Date(`${date}T${time}`).toISOString() : null;
const monthsInWindow = (from, until) => {
  const out=[];
  let y=from.getUTCFullYear(), m=from.getUTCMonth();
  while (y*12+m <= until.getUTCFullYear()*12+until.getUTCMonth()) {
    out.push(`${y}${String(m+1).padStart(2,'0')}`);
    if (++m > 11) { m=0; y++; }
  }
  return out;
};

async function loadJson(url, ttl=300000) {
  const now=Date.now();
  const cached=upstreamCache.get(url);
  if (cached && now-cached.time<ttl) return {value:cached.value, stale:false};
  if (requests.has(url)) return requests.get(url);
  const job=(async()=>{
    try {
      const resp=await fetch(url, { headers:{'accept':'application/json','user-agent':'SportsNexus/1.0 (personal schedule dashboard)'}, signal:AbortSignal.timeout(10500) });
      if (!resp.ok) throw new Error(`Schedule provider returned HTTP ${resp.status}`);
      const value=await resp.json();
      upstreamCache.set(url,{time:Date.now(),value});
      return {value, stale:false};
    } catch(err) {
      if(cached) return {value:cached.value, stale:true, warning:err.message};
      throw err;
    } finally {requests.delete(url);}
  })();
  requests.set(url,job);
  return job;
}

function takeLogo(team) {
  const logo=team?.logo || team?.logos?.[0]?.href || null;
  return typeof logo==='string' && logo.startsWith('https://') ? logo : null;
}
function normalizeESPN(league, event) {
  if(!event || !dateOK(event.date)) return null;
  const competition=event.competitions?.[0] || {};
  const teams=(competition.competitors || []);
  const home=teams.find(c=>c.homeAway==='home') || teams[1];
  const away=teams.find(c=>c.homeAway==='away') || teams[0];
  const pick = c => c ? ({name:c.team?.displayName || c.team?.name || c.athlete?.displayName || '', abbreviation:c.team?.abbreviation || '', logo:takeLogo(c.team), score:c.score != null ? String(c.score) : null}) : null;
  const state=event.status?.type?.state || (event.status?.type?.completed ? 'post' : 'pre');
  const broadcasts = [ ...(competition.broadcasts || []).flatMap(b=>b.names || (b.name?[b.name]:[])),
    ...(competition.geoBroadcasts || []).map(b=>b.media?.shortName || b.media?.name).filter(Boolean) ];
  const links=(event.links||[]);
  const details=links.find(l=>l?.rel?.includes('summary'))?.href || links[0]?.href || null;
  return {
    id:`${league.id}:${event.id}`, providerId:String(event.id), league:league.id, sport:league.sport,
    name:event.name || event.shortName || league.name, shortName:event.shortName || event.name || league.name,
    date:new Date(event.date).toISOString(), state:['in','post','pre'].includes(state)?state:'pre',
    status:event.status?.type?.shortDetail || event.status?.type?.detail || event.status?.type?.description || 'Scheduled',
    home:pick(home), away:pick(away), venue:competition.venue?.fullName || competition.venue?.address?.city || null,
    broadcasts:[...new Set(broadcasts)].slice(0,5),
    detailUrl:typeof details==='string' && details.startsWith('https://') ? details : null,
    source:'ESPN (unofficial)', sourceNote:null, sessions:[]
  };
}
function idFromCalendar(item) {
  const match=String(item?.event?.$ref||'').match(/\/events\/(\d+)/);
  return match?.[1] || String(item?.id||'');
}
function normalizeUfcCalendar(item) {
  const id=idFromCalendar(item);
  if(!id || !dateOK(item.startDate)) return null;
  const label=String(item.label || 'UFC event').replace(/\s+/g,' ').trim();
  return {
    id:`ufc:${id}`, providerId:id, league:'ufc', sport:'MMA', name:label, shortName:label,
    date:new Date(item.startDate).toISOString(), state:'pre',status:'Event start (card times can vary)',
    home:null,away:null,venue:null,broadcasts:[],detailUrl:`https://www.espn.com/mma/fightcenter/_/id/${id}/league/ufc`,
    source:'ESPN calendar (unofficial)',sourceNote:'UFC event start times can differ from the main card and individual fight times.',sessions:[]
  };
}
function normalizeF1Race(race) {
  const date=iso(race.date,race.time||'00:00:00Z');
  if(!date) return null;
  const sessionNames={FirstPractice:'Practice 1',SecondPractice:'Practice 2',ThirdPractice:'Practice 3',Qualifying:'Qualifying',Sprint:'Sprint',SprintQualifying:'Sprint qualifying'};
  const sessions=Object.entries(sessionNames).map(([key,label])=> {
    const s=race[key];
    return s?.date ? {name:label,date:iso(s.date,s.time||'00:00:00Z')} : null;
  }).filter(s=>s?.date).sort((a,b)=>a.date.localeCompare(b.date));
  sessions.push({name:'Race',date});
  return {
    id:`f1:${race.round}`,providerId:String(race.round),league:'f1',sport:'Motorsport',name:race.raceName || 'Grand Prix',shortName:race.raceName || 'Grand Prix',
    date,state:'pre',status:`Round ${race.round} · Race start`,
    home:null,away:null,venue:[race.Circuit?.circuitName, race.Circuit?.Location?.locality, race.Circuit?.Location?.country].filter(Boolean).join(' · '),
    broadcasts:[],detailUrl:race.url?.startsWith('https://') ? race.url : 'https://www.formula1.com/en/racing',
    source:'Jolpica F1 (community)',sourceNote:'Race time is scheduled; check Formula 1 for late changes.',sessions
  };
}
function normalizeF1Calendar(item) {
  const id=idFromCalendar(item);
  if(!dateOK(item.startDate))return null;
  const label=String(item.label||'Formula 1 weekend');
  return {
    id:`f1:${id}`,providerId:id,league:'f1',sport:'Motorsport',name:label,shortName:label,
    date:new Date(item.startDate).toISOString(),state:'pre',status:'Race weekend begins (race time unavailable)',
    home:null,away:null,venue:null,broadcasts:[],detailUrl:'https://www.formula1.com/en/racing',
    source:'ESPN calendar fallback',sourceNote:'Exact race start not available from this source. This is the start of the race weekend.',sessions:[]
  };
}

function uniqueSorted(items) {
  return [...new Map(items.filter(Boolean).map(item=>[item.id,item])).values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function filterWindow(items,from,to) {
  return items.filter(e=> Date.parse(e.date)>=from.getTime() && Date.parse(e.date)<=to.getTime());
}
async function fetchLeague(id,{now=new Date(),days=30,pastDays=2}={}) {
  const league=byId[id];
  if(!league)throw new Error('Unknown competition');
  const from=new Date(now.getTime()-pastDays*86400000);
  const to=new Date(now.getTime()+days*86400000);
  if(league.kind==='ufc') {
    const response=await loadJson(`${ESPN}${league.path}/scoreboard`, 15*60000);
    const list=response.value.leagues?.[0]?.calendar || [];
    const cal=list.filter(item=>/^(UFC\b|Noche UFC\b)/i.test(String(item.label||''))).map(normalizeUfcCalendar);
    const recent=(response.value.events || []).map(ev=>{
      const event=normalizeESPN(league,ev);
      if(!event) return null;
      const fromCalendar=cal.find(item=>item.id===event.id);
      return {...event,date:fromCalendar?.date || event.date,sourceNote:'Event times may differ from main card and individual fight times.'};
    });
    const unique=uniqueSorted([...cal,...recent]);
    return {events:filterWindow(unique,from,to),stale:response.stale,source:'ESPN (unofficial)'};
  }
  if(league.kind==='f1') {
    try {
      const years=[...new Set([now.getUTCFullYear(),to.getUTCFullYear()])];
      const data=await Promise.all(years.map(y=>loadJson(`${JOLPICA}${y}.json?limit=120`, 3*60*60000)));
      const items=data.flatMap(r=>r.value?.MRData?.RaceTable?.Races||[]).map(normalizeF1Race);
      if(!items.length)throw new Error('Formula 1 calendar is empty');
      return {events:filterWindow(uniqueSorted(items),from,to),stale:data.some(r=>r.stale),source:'Jolpica F1'};
    } catch(e) {
      const response=await loadJson(`${ESPN}${league.path}/scoreboard`,60*60000);
      const all=(response.value.leagues?.[0]?.calendar || []).map(normalizeF1Calendar);
      return {events:filterWindow(uniqueSorted(all),from,to),stale:true,source:'ESPN (F1 weekend fallback)',warning:`Exact F1 session times unavailable: ${e.message}`};
    }
  }
  const months=monthsInWindow(from,to);
  const data=await Promise.all(months.map(m=>loadJson(`${ESPN}${league.path}/scoreboard?dates=${m}&limit=500`,6*60000)));
  const all=data.flatMap(result=>(result.value.events||[]).map(event=>normalizeESPN(league,event)));
  return {events:filterWindow(uniqueSorted(all),from,to),stale:data.some(r=>r.stale),source:'ESPN (unofficial)'};
}

async function mapLimit(items,limit,fn) {
  const results=new Array(items.length);let index=0;
  async function worker(){while(index<items.length){const i=index++;try{results[i]={status:'fulfilled',value:await fn(items[i])};}catch(e){results[i]={status:'rejected',reason:e};}}}
  await Promise.all(Array.from({length:Math.min(items.length,limit)},()=>worker()));
  return results;
}
async function getFixtures(ids,{now=new Date(),days=30,pastDays=2}={}) {
  const results=await mapLimit(ids,5,id=>fetchLeague(id,{now,days,pastDays}));
  const events=[];const health={};
  results.forEach((r,i)=>{
    if(r.status==='fulfilled') {
      events.push(...r.value.events);
      health[ids[i]]={ok:true,count:r.value.events.length,stale:r.value.stale,source:r.value.source,warning:r.value.warning||null};
    } else {
      health[ids[i]]={ok:false,count:0,stale:false,error:r.reason?.message || 'Unknown data error'};
    }
  });
  return {events:uniqueSorted(events),health,updatedAt:new Date().toISOString(),window:{days,pastDays}, partial:Object.values(health).some(h=>!h.ok || h.stale)};
}
module.exports={getFixtures,fetchLeague,normalizeESPN,normalizeF1Race,normalizeUfcCalendar,monthsInWindow,filterWindow,loadJson};

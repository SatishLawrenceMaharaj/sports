'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const DEFAULT_STORAGE = 'sports-nexus-prefs-v1';
  const state = {
    meta:null, events:[], health:{}, sport:'All', league:'all', view:'upcoming', days:30,
    search:'', loaded:false, loading:false, updatedAt:null, requestVersion:0,
    prefs:{enabled:[], teams:[], saved:[], timezone:'America/Port_of_Spain', hideScores:false}
  };
  const safe = val => String(val ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const urlSafe = val => {try{const url=new URL(val);return ['https:','http:'].includes(url.protocol) ? url.href : '#';}catch{return '#';}};
  const getTZ = () => state.prefs.timezone === 'local' ? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC') : state.prefs.timezone;
  const fmt = (date,opts={}) => new Intl.DateTimeFormat('en-GB',{timeZone:getTZ(),...opts}).format(new Date(date));
  const parts = date => Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:getTZ(),year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(date)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  const keyFor = date => {const p=parts(date);return `${p.year}-${p.month}-${p.day}`;};
  const shortTime = date => fmt(date,{hour:'numeric',minute:'2-digit',hour12:true}).replace(/\s/g,' ');
  const dayText = date => fmt(date,{weekday:'short',month:'short',day:'numeric'});
  const debounce = (fn,ms=200) => {let timer;return(...args)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...args),ms);};};
  function store(){try{localStorage.setItem(DEFAULT_STORAGE,JSON.stringify(state.prefs));}catch{}}
  function readStore(){try {const p=JSON.parse(localStorage.getItem(DEFAULT_STORAGE)||'null');return p && typeof p==='object' ? p : null;}catch{return null;}}
  function applyStored(){
    const prev=readStore();const ids=state.meta.leagues.map(l=>l.id);
    state.prefs.enabled=Array.isArray(prev?.enabled)?prev.enabled.filter(id=>ids.includes(id)):state.meta.leagues.filter(l=>l.default).map(l=>l.id);
    if(!state.prefs.enabled.length)state.prefs.enabled=state.meta.leagues.filter(l=>l.default).map(l=>l.id);
    state.prefs.teams=Array.isArray(prev?.teams)?prev.teams.filter(x=>typeof x==='string').slice(0,100):[];
    state.prefs.saved=Array.isArray(prev?.saved)?prev.saved.filter(x=>typeof x==='string').slice(0,500):[];
    const tz=prev?.timezone;
    state.prefs.timezone=typeof tz==='string'&&['local','America/Port_of_Spain','America/New_York','Europe/London','Europe/Paris','UTC'].includes(tz)?tz:'America/Port_of_Spain';
    state.prefs.hideScores=Boolean(prev?.hideScores);
  }
  function league(id){return state.meta?.leagues.find(l=>l.id===id)||null;}
  const isFollowed = e => [e.home?.name,e.away?.name].filter(Boolean).some(t=>state.prefs.teams.some(f=>f.toLowerCase()===t.toLowerCase()));
  const isSaved = e => state.prefs.saved.includes(e.id);
  const favourite = e => isSaved(e)||isFollowed(e);
  const stateLabel=e=>e.state==='in'?'LIVE':e.state==='post'?'FINAL':'SCHEDULED';
  function status(phase='Connecting',color=''){
    $('syncStatus').textContent=phase;
    $('onlineIndicator').className=`pulse-dot ${color}`;
  }
  function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600);}
  async function start(){
    attachHandlers();
    updateClock();
    try{
      const resp=await fetch('/api/meta');if(!resp.ok)throw new Error('App metadata unavailable');
      state.meta=await resp.json();applyStored();
      renderNavigation();renderLeagueSelect();renderWatchQuick();renderSettings();renderTeams();
      await loadFixtures();
      setInterval(updateClock,1000);
      setInterval(()=>{if(!document.hidden)loadFixtures(true);},300000);
    }catch(e){status('Disconnected','red');$('fixtures').innerHTML=empty('Cannot connect to Sports Nexus','Make sure the Node.js server is running, then refresh the page.');$('dataAlert').hidden=false;$('dataAlert').textContent=e.message;}
  }
  async function loadFixtures(silent=false){
    if(!state.meta || state.loading)return;
    const current=++state.requestVersion;
    state.loading=true;
    if(!silent)status('Updating…');
    try {
      const ids=state.prefs.enabled.join(',');
      const response=await fetch(`/api/fixtures?leagues=${encodeURIComponent(ids)}&days=${state.days}&past=4`,{cache:'no-store'});
      if(!response.ok)throw new Error(`Data service returned ${response.status}`);
      const data=await response.json();
      if(current!==state.requestVersion)return;
      state.events=Array.isArray(data.events)?data.events:[];
      state.health=data.health||{};state.updatedAt=data.updatedAt||new Date().toISOString();state.loaded=true;
      const failures=Object.values(state.health).filter(h=>!h.ok).length;
      const stale=Object.values(state.health).filter(h=>h.stale).length;
      status(failures||stale?'Partial data':'Live schedules',failures||stale?'red':'green');
      $('dataAlert').hidden=!(failures||stale);
      if(failures||stale)$('dataAlert').textContent=`Some schedules could not update (${failures} unavailable, ${stale} cached/fallback). Missing events are not assumed to be cancelled. You can retry with ↻.`;
      renderEverything();
      if(!silent && failures===0 && stale===0)toast('Fixtures updated');
    }catch(e){status('Offline','red');$('dataAlert').hidden=false;$('dataAlert').textContent=`Could not refresh fixture data: ${e.message}. ${state.loaded?'Showing the last received schedule.':''}`;renderEverything();}
    finally{state.loading=false;}
  }
  function renderEverything(){renderStats();renderSpotlight();renderNextBySport();renderFixtures();renderNavigation();renderTeams();renderSelectOptions();updateClock();}
  function renderNavigation(){
    if(!state.meta)return;
    $('navigation').querySelectorAll('[data-sport]').forEach(btn=>btn.classList.toggle('active',state.sport===btn.dataset.sport && state.league==='all'));
    const lis=state.meta.leagues.filter(l=>state.prefs.enabled.includes(l.id));
    $('leagueLinks').innerHTML=lis.map(l=>`<button class="league-link ${state.league===l.id?'active':''}" data-league-nav="${safe(l.id)}"><span class="league-blob" style="background:${safe(l.color)}"></span>${safe(l.name)}</button>`).join('');
    const up=state.events.filter(e=>e.state!=='post' && Date.parse(e.date)>=Date.now()-600000);
    $('allCount').textContent=up.length;
    $('statLeagues').textContent=state.prefs.enabled.length;
  }
  function renderLeagueSelect(){
    if(!state.meta)return;
    $('leagueSelect').innerHTML='<option value="all">All competitions</option>'+state.meta.leagues.filter(l=>state.prefs.enabled.includes(l.id)).map(l=>`<option value="${safe(l.id)}">${safe(l.name)}</option>`).join('');
    $('leagueSelect').value=state.league;
  }
  function renderSelectOptions(){
    if(!state.meta)return;
    const allowed=state.meta.leagues.filter(l=>state.prefs.enabled.includes(l.id));
    if(state.league!=='all'&&!allowed.some(l=>l.id===state.league))state.league='all';
    renderLeagueSelect();
    $('favTeamCount').textContent=state.prefs.teams.length;
  }
  function renderStats(){
    const now=Date.now();const nextWeek=now+7*86400000;
    const upcoming=state.events.filter(e=>e.state!=='post' && Date.parse(e.date)>=now-600000);
    $('statSoon').textContent=upcoming.filter(e=>Date.parse(e.date)<now+86400000).length;
    $('statSoonText').textContent='Events in the next 24 hours';
    $('statWeek').textContent=upcoming.filter(e=>Date.parse(e.date)<nextWeek).length;
    $('statLive').textContent=state.events.filter(e=>e.state==='in').length;
    $('statLeagues').textContent=state.prefs.enabled.length;
  }
  function chooseSpotlight(){
    const now=Date.now();
    const live=state.events.find(e=>e.state==='in');
    if(live)return live;
    return state.events.filter(e=>e.state!=='post' && Date.parse(e.date)>now-60*60000).sort((a,b)=>(favourite(b)-favourite(a)) * (Date.parse(a.date)<Date.parse(b.date)?-1:1) || Date.parse(a.date)-Date.parse(b.date))[0] || null;
  }
  function renderSpotlight(){
    const e=chooseSpotlight(), panel=$('spotlight');
    if(!e){panel.querySelector('.spotlight-body').innerHTML='<div class="spotlight-heading">The next moment is coming.</div><p class="spotlight-sub">No upcoming events were returned for your enabled competitions. Try a longer date range or check the data-source notice.</p><button class="dark-button" data-action="settings">Adjust leagues →</button>';return;}
    const l=league(e.league);
    const subtitle=e.home&&e.away?`${safe(e.away.name)} vs ${safe(e.home.name)}`:safe(e.venue || e.status);
    const score=(e.state==='in'&&!state.prefs.hideScores&&e.home&&e.away)?`<span class="live-badge">${safe(e.away.score??'–')} — ${safe(e.home.score??'–')}</span>`:'';
    panel.querySelector('.spotlight-body').innerHTML=`
      <div class="spotlight-league"><span>${safe(l?.emoji||'●')}</span>${safe(l?.name||e.league)} <span>·</span> ${safe(dayText(e.date))}${e.state==='in'?'<span class="live-badge">● LIVE</span>':''} ${score}</div>
      <div class="spotlight-heading">${safe(e.name)}</div>
      <div class="spotlight-sub">${subtitle} · ${safe(shortTime(e.date))} ${safe(getTZ().replaceAll('_',' '))}</div>
      <div class="spotlight-footer"><div><div class="timer-label">${e.state==='in'?'HAPPENING NOW':'KICKOFF / EVENT IN'}</div><div class="countdown" data-countdown="${safe(e.date)}">${e.state==='in'?'● Live':relativeTime(e.date)}</div></div><div class="spotlight-actions"><button class="dark-button" data-action="calendar" data-event="${safe(e.id)}">＋ Calendar</button><button class="primary-button" data-action="watch" data-event="${safe(e.id)}">Where to watch <span>↗</span></button></div></div>`;
  }
  function renderNextBySport(){
    const labels=[['Basketball','NBA','🏀'],['Football','Football','⚽'],['MMA','UFC','🥊'],['Motorsport','Formula 1','🏎️'],['American football','NFL','🏈']];
    const now=Date.now();
    $('nextSportCards').innerHTML=labels.map(([sport,label,emoji])=>{
      const events=state.events.filter(e=>e.sport===sport && e.state!=='post' && (e.state==='in'||Date.parse(e.date)>now-600000));
      const e=events[0];
      if(!e)return `<div class="next-sport-card"><div class="next-sport-top"><span class="next-sport-emoji">${emoji}</span><span>${safe(label)}</span></div><div class="next-sport-empty">No upcoming event available</div><span class="next-sport-foot">Check your selected leagues</span></div>`;
      return `<button class="next-sport-card" data-action="focus-sport" data-sport-id="${safe(sport)}"><div class="next-sport-top"><span class="next-sport-emoji">${emoji}</span><span>${safe(label)}</span></div><strong>${safe(e.name)}</strong><div class="next-sport-foot">${safe(dayText(e.date))} · ${safe(shortTime(e.date))}</div><div class="next-sport-view">VIEW FIXTURES ↗</div></button>`;
    }).join('');
  }
  function renderWatchQuick(){
    if(!state.meta)return;
    const featured=['epl','nba','f1','ufc'];
    $('watchQuick').innerHTML=featured.map(id=>{const l=league(id);const provider=state.meta.watch[id]?.[0];if(!provider)return '';
      return `<button class="watch-row" data-action="watch-league" data-league="${safe(id)}"><span class="watch-icon">${safe(l?.emoji||'◉')}</span><span><strong>${safe(provider.name)}</strong><small>${safe(l.name)} · View options</small></span><span class="out-arrow">↗</span></button>`;
    }).join('');
  }
  function statusFilter(e){
    if(state.view==='live')return e.state==='in';
    if(state.view==='results')return e.state==='post';
    if(state.view==='saved')return favourite(e);
    return e.state!=='post' && (e.state==='in' || Date.parse(e.date)>Date.now()-600000);
  }
  function filterEvents(){
    const q=state.search.trim().toLowerCase();
    return state.events.filter(e=>{
      if(state.league!=='all' && e.league!==state.league)return false;
      if(state.sport!=='All' && e.sport!==state.sport)return false;
      if(!statusFilter(e))return false;
      if($('favOnly').checked && !favourite(e))return false;
      if(q && ![e.name,e.shortName,e.home?.name,e.away?.name,e.venue,league(e.league)?.name].some(t=>String(t||'').toLowerCase().includes(q)))return false;
      return true;
    }).sort((a,b)=>state.view==='results'?b.date.localeCompare(a.date):a.date.localeCompare(b.date));
  }
  function sameDate(a,b){return keyFor(a)===keyFor(b);}
  function groupTitle(date){const now=new Date(),tm=new Date(Date.now()+86400000);return sameDate(date,now)?'Today':sameDate(date,tm)?'Tomorrow':fmt(date,{weekday:'long',day:'numeric',month:'long'});}
  function renderFixtures(){
    const items=filterEvents();
    $('matchCount').textContent=items.length;
    $('resultsNote').textContent=`Showing ${items.length} ${state.view==='results'?'recent result':state.view==='live'?'live event':'fixture'}${items.length===1?'':'s'} · ${state.updatedAt?'Updated '+shortTime(state.updatedAt):'Awaiting update'}`;
    if(!items.length){
      let msg='Try another competition, time range or search.';
      if(state.view==='live')msg='No live events are currently reported in your selected competitions.';
      if(state.view==='saved')msg='Save fixtures with the star icon or follow a favourite team.';
      if(state.view==='results')msg='No recent results were returned. Try another competition.';
      if(!state.loaded)msg='Connecting to the schedule sources.';
      $('fixtures').innerHTML=empty(state.view==='live'?'Nothing live right now':state.view==='saved'?'Nothing saved yet':'No matching fixtures',msg);
      return;
    }
    const groups=new Map();
    for(const e of items){const key=keyFor(e.date);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(e);}
    $('fixtures').innerHTML=[...groups.values()].map(grp=>{
      const day=grp[0].date;
      return `<div class="day-heading">${safe(groupTitle(day))}<span>${grp.length} event${grp.length===1?'':'s'}</span></div>${grp.map(eventRow).join('')}`;
    }).join('');
  }
  function eventRow(e){
    const l=league(e.league)||{name:e.league,color:'#8ba4b4',emoji:'●'};
    const marked=favourite(e), saved=isSaved(e);
    const hasTeams=Boolean(e.home && e.away && (e.home.name||e.away.name));
    const logo = p => p?.logo&&/^https:\/\//.test(p.logo) ? `<img loading="lazy" src="${safe(urlSafe(p.logo))}" alt="">`:'';
    const match=hasTeams?`<span class="fixture-team">${logo(e.away)}<span>${safe(e.away.name)}</span></span><span class="versus">vs</span><span class="fixture-team">${logo(e.home)}<span>${safe(e.home.name)}</span></span>`:`<span>${safe(e.name)}</span>`;
    const score=e.state==='post'||e.state==='in';
    const scoreText=score&&hasTeams && !state.prefs.hideScores && e.away.score!=null && e.home.score!=null ? `<span class="scores">${safe(e.away.score)}–${safe(e.home.score)}</span>`:'';
    const statusMarkup=e.state==='in' && !state.prefs.hideScores?'<span class="live-flag">● LIVE</span>':`<span>${state.prefs.hideScores&&e.state==='post'?'Score hidden':safe(e.status)}</span>`;
    const secondary=e.venue||e.sourceNote||'';
    return `<article class="fixture-row ${marked?'favorite-row':''}">
      <div class="fixture-time"><strong class="${e.state==='in'&&!state.prefs.hideScores?'status-live':''}">${safe(shortTime(e.date).replace(/\s?(am|pm)/i,''))}</strong><small>${safe(shortTime(e.date).match(/am|pm/i)?.[0]?.toUpperCase()||'')}</small></div>
      <div class="row-divider"></div>
      <div class="fixture-info"><div class="fixture-meta"><span class="sport-indicator" style="background:${safe(l.color)}"></span><span>${safe(l.name)}</span><span>·</span>${statusMarkup}</div><div class="fixture-names">${match}${scoreText}</div>${secondary?`<div class="fixture-extra">${safe(secondary)}</div>`:''}</div>
      <div class="fixture-day"><strong>${safe(dayText(e.date))}</strong>${safe(stateLabel(e))}</div>
      <div class="fixture-buttons"><button class="small-watch" data-action="watch" data-event="${safe(e.id)}">Watch ↗</button><button class="row-action ${saved?'saved':''}" title="${saved?'Remove saved event':'Save event'}" aria-label="Save event" data-action="save" data-event="${safe(e.id)}">${saved?'★':'☆'}</button><button class="row-action" title="Add to calendar" aria-label="Add to calendar" data-action="calendar" data-event="${safe(e.id)}">▦</button></div>
    </article>`;
  }
  const empty=(title,message)=>`<div class="empty-state"><div class="empty-icon">✦</div><h3>${safe(title)}</h3><p>${safe(message)}</p></div>`;
  function relativeTime(date){
    const delta=Date.parse(date)-Date.now();if(delta<=0)return '<span>Starting now</span>';
    const d=Math.floor(delta/86400000),h=Math.floor(delta%86400000/3600000),m=Math.floor(delta%3600000/60000),s=Math.floor(delta%60000/1000);
    return `${d?`<span>${d}</span>d `:''}<span>${String(h).padStart(2,'0')}</span>h <span>${String(m).padStart(2,'0')}</span>m <span>${String(s).padStart(2,'0')}</span>s`;
  }
  function updateClock(){
    const now=new Date();
    $('dateToday').textContent=fmt(now,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    $('timezoneName').textContent=getTZ().replaceAll('_',' ');
    document.querySelectorAll('[data-countdown]').forEach(el=>{el.innerHTML=relativeTime(el.dataset.countdown);});
  }
  function findEvent(id){return state.events.find(e=>e.id===id);}
  function showWatch(leagueId,event=null){
    const l=league(leagueId);if(!l)return;
    $('watchTitle').textContent=event?event.name:`${l.name} viewing options`;
    $('watchContext').textContent=event?`${l.name} · ${dayText(event.date)} at ${shortTime(event.date)} (${getTZ()})`:`Official viewing links and regional broadcast information for ${l.name}.`;
    const providers=state.meta.watch[leagueId]||[];
    let html='';
    if(event?.broadcasts?.length)html+=`<div class="modal-info"><strong>Broadcast labels from schedule provider:</strong> ${safe(event.broadcasts.join(', '))}. These may reflect US coverage rather than Trinidad & Tobago.</div>`;
    html+=providers.map(p=>`<a class="option-link" href="${safe(urlSafe(p.url))}" target="_blank" rel="noopener noreferrer"><span><strong>${safe(p.name)}</strong><small>${safe(p.note||'')}</small></span><em>${safe(p.type)} ↗</em></a>`).join('');
    if(event?.detailUrl)html+=`<a class="option-link" href="${safe(urlSafe(event.detailUrl))}" target="_blank" rel="noopener noreferrer"><span><strong>Event details</strong><small>Read about this event on the schedule source or organizer site</small></span><em>Schedule ↗</em></a>`;
    $('watchOptions').innerHTML=html||'<p class="modal-muted">No official viewing links are listed for this competition yet.</p>';
    $('watchDialog').showModal();
  }
  function addCalendar(e){
    const stamp=d=>new Date(d).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
    const icsEscape=v=>String(v??'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
    const minutes=e.sport==='Motorsport'?150:e.sport==='MMA'?300:e.sport==='American football'?210:120;
    const end=new Date(Date.parse(e.date)+minutes*60000);
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Sports Nexus//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',`UID:${e.id.replace(/[^a-zA-Z0-9-]/g,'-')}@sports-nexus.local`,`DTSTAMP:${stamp(new Date())}`,`DTSTART:${stamp(e.date)}`,`DTEND:${stamp(end)}`,`SUMMARY:${icsEscape(e.name)}`,`DESCRIPTION:${icsEscape(`${league(e.league)?.name||e.league} - Schedule may change. Viewing information: ${state.meta.watch[e.league]?.[0]?.url||''}`)}`,`LOCATION:${icsEscape(e.venue||'')}`,'BEGIN:VALARM','TRIGGER:-PT30M','ACTION:DISPLAY',`DESCRIPTION:${icsEscape(e.name+' begins soon')}`,'END:VALARM','END:VEVENT','END:VCALENDAR'];
    const blob=new Blob([lines.join('\r\n')+'\r\n'],{type:'text/calendar;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`sports-nexus-${e.id.replace(/[^a-zA-Z0-9-]/g,'-')}.ics`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Calendar reminder downloaded');
  }
  function renderSettings(){
    if(!state.meta)return;
    $('timezoneSelect').value=state.prefs.timezone;
    $('hideScores').checked=state.prefs.hideScores;
    $('settingsLeagues').innerHTML=state.meta.leagues.map(l=>`<label class="league-option"><input type="checkbox" name="league" value="${safe(l.id)}" ${state.prefs.enabled.includes(l.id)?'checked':''}><span>${safe(l.emoji)}</span>${safe(l.name)}</label>`).join('');
  }
  function renderTeams(){
    if(!state.meta)return;
    const names=[...new Set(state.events.flatMap(e=>[e.home?.name,e.away?.name]).filter(Boolean))].sort();
    $('teamSuggestions').innerHTML=names.map(n=>`<option value="${safe(n)}"></option>`).join('');
    $('teamList').innerHTML=state.prefs.teams.length?state.prefs.teams.map(t=>`<div class="follow-tag">${safe(t)}<button data-action="unfollow" data-team="${safe(t)}" title="Unfollow ${safe(t)}">×</button></div>`).join(''):'<span class="follow-empty">No teams added yet.</span>';
    $('favTeamCount').textContent=state.prefs.teams.length;
  }
  function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());}
  function setNavigation(sport='All',leagueId='all'){
    state.sport=sport;state.league=leagueId;
    const label=leagueId!=='all'?league(leagueId)?.name:sport==='All'?'Overview':sport;
    $('crumbTitle').textContent=label||'Overview';
    renderNavigation();renderSelectOptions();renderFixtures();
    $('sidebar').classList.remove('open');
    if(window.innerWidth<820)$('fixturesSection').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function attachHandlers(){
    $('navigation').addEventListener('click',event=>{const b=event.target.closest('[data-sport]');if(b)setNavigation(b.dataset.sport,'all');});
    $('leagueLinks').addEventListener('click',event=>{const b=event.target.closest('[data-league-nav]');if(b)setNavigation('All',b.dataset.leagueNav);});
    $('viewTabs').addEventListener('click',event=>{const b=event.target.closest('[data-view]');if(!b)return;state.view=b.dataset.view;document.querySelectorAll('[data-view]').forEach(tab=>tab.classList.toggle('seg-active',tab===b));renderFixtures();});
    $('searchInput').addEventListener('input',debounce(e=>{state.search=e.target.value;renderFixtures();}));
    $('leagueSelect').addEventListener('change',e=>{state.league=e.target.value;state.sport='All';renderNavigation();renderFixtures();});
    $('daysSelect').addEventListener('change',e=>{state.days=Number(e.target.value);loadFixtures();});
    $('favOnly').addEventListener('change',renderFixtures);
    $('refreshButton').addEventListener('click',()=>loadFixtures());
    $('mobileMenu').addEventListener('click',()=>{$('sidebar').classList.toggle('open');});
    [$('settingsButton'),$('settingsInline'),$('avatarButton')].forEach(b=>b.addEventListener('click',()=>{renderSettings();$('settingsDialog').showModal();}));
    $('teamButton').addEventListener('click',()=>{renderTeams();$('teamsDialog').showModal();});
    document.body.addEventListener('click',e=>{
      const close=e.target.closest('[data-close]');if(close){$(close.dataset.close)?.close();return;}
      const button=e.target.closest('[data-action]');if(!button)return;
      const action=button.dataset.action,ev=findEvent(button.dataset.event);
      if(action==='watch'&&ev)showWatch(ev.league,ev);
      if(action==='watch-league')showWatch(button.dataset.league);
      if(action==='focus-sport'){setNavigation(button.dataset.sportId,'all');$('fixturesSection').scrollIntoView({behavior:'smooth',block:'start'});}
      if(action==='settings'){$('settingsDialog').showModal();}
      if(action==='calendar'&&ev)addCalendar(ev);
      if(action==='save'&&ev){state.prefs.saved=isSaved(ev)?state.prefs.saved.filter(id=>id!==ev.id):[...state.prefs.saved,ev.id];store();renderStats();renderSpotlight();renderFixtures();toast(isSaved(ev)?'Saved to your games':'Removed from saved games');}
      if(action==='unfollow'){state.prefs.teams=state.prefs.teams.filter(t=>t!==button.dataset.team);store();renderTeams();renderFixtures();renderSpotlight();}
    });
    $('teamForm').addEventListener('submit',event=>{
      event.preventDefault();const val=$('teamInput').value.trim();if(!val)return;
      if(!state.prefs.teams.some(t=>t.toLowerCase()===val.toLowerCase()))state.prefs.teams.push(val);
      $('teamInput').value='';store();renderTeams();renderFixtures();renderSpotlight();toast('Team added to favourites');
    });
    $('saveSettings').addEventListener('click',()=>{
      const selected=[...$('settingsLeagues').querySelectorAll('input:checked')].map(e=>e.value);
      if(!selected.length){toast('Choose at least one competition');return;}
      const changed=selected.join(',')!==state.prefs.enabled.join(',');
      state.prefs.enabled=selected;state.prefs.timezone=$('timezoneSelect').value;state.prefs.hideScores=$('hideScores').checked;store();
      $('settingsDialog').close();renderSelectOptions();renderEverything();if(changed)loadFixtures();toast('Preferences saved');
    });
    $('selectDefaults').addEventListener('click',()=>{document.querySelectorAll('#settingsLeagues input').forEach(input=>input.checked=Boolean(league(input.value)?.default));});
    document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close();}));
    window.addEventListener('keydown',e=>{if(e.key==='Escape'){$('sidebar').classList.remove('open');closeDialogs();}});
  }
  start();
})();

'use strict';
const LEAGUES = [
  { id:'nba', name:'NBA', sport:'Basketball', emoji:'🏀', kind:'espn', path:'basketball/nba', color:'#f58a46', default:true },
  { id:'epl', name:'Premier League', sport:'Football', emoji:'⚽', kind:'espn', path:'soccer/eng.1', color:'#a389ff', default:true },
  { id:'laliga', name:'La Liga', sport:'Football', emoji:'⚽', kind:'espn', path:'soccer/esp.1', color:'#ff8d69', default:true },
  { id:'ligue1', name:'Ligue 1', sport:'Football', emoji:'⚽', kind:'espn', path:'soccer/fra.1', color:'#80d5ff', default:true },
  { id:'seriea', name:'Serie A', sport:'Football', emoji:'⚽', kind:'espn', path:'soccer/ita.1', color:'#74c7e8', default:true },
  { id:'bundesliga', name:'Bundesliga', sport:'Football', emoji:'⚽', kind:'espn', path:'soccer/ger.1', color:'#f8ba67', default:true },
  { id:'ucl', name:'Champions League', sport:'Football', emoji:'⚽', kind:'espn', path:'soccer/uefa.champions', color:'#96aaff', default:true },
  { id:'uel', name:'Europa League', sport:'Football', emoji:'⚽', kind:'espn', path:'soccer/uefa.europa', color:'#e9a962', default:false },
  { id:'mls', name:'MLS', sport:'Football', emoji:'⚽', kind:'espn', path:'soccer/usa.1', color:'#9fdfc4', default:false },
  { id:'eredivisie', name:'Eredivisie', sport:'Football', emoji:'⚽', kind:'espn', path:'soccer/ned.1', color:'#f9ae94', default:false },
  { id:'primeira', name:'Primeira Liga', sport:'Football', emoji:'⚽', kind:'espn', path:'soccer/por.1', color:'#abcf92', default:false },
  { id:'championship', name:'EFL Championship', sport:'Football', emoji:'⚽', kind:'espn', path:'soccer/eng.2', color:'#c3b3fb', default:false },
  { id:'ufc', name:'UFC', sport:'MMA', emoji:'🥊', kind:'ufc', path:'mma/ufc', color:'#ff777c', default:true },
  { id:'f1', name:'Formula 1', sport:'Motorsport', emoji:'🏎️', kind:'f1', path:'racing/f1', color:'#fa6675', default:true },
  { id:'nfl', name:'NFL', sport:'American football', emoji:'🏈', kind:'espn', path:'football/nfl', color:'#67b3ff', default:true }
];
const byId = Object.fromEntries(LEAGUES.map(item => [item.id, item]));
module.exports = { LEAGUES, byId };

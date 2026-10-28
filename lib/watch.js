'use strict';
// All URLs are broadcaster, competition, or legitimate streaming-service landing pages.
// A link never represents a guarantee that the particular event is carried there.
const WATCH = {
  nba: [
    {name:'NBA League Pass', url:'https://www.nba.com/league-pass-purchase', type:'Subscription', note:'Most NBA games; regional restrictions can apply'},
    {name:'NBA Watch', url:'https://www.nba.com/watch', type:'Official guide', note:'Check game-specific coverage'}
  ],
  nfl: [
    {name:'NFL Game Pass on DAZN', url:'https://www.dazn.com/en-US/l/nfl-game-pass/', type:'Subscription', note:'International Game Pass availability varies by country'},
    {name:'NFL Ways to Watch', url:'https://www.nfl.com/ways-to-watch/', type:'Official guide', note:'See regional broadcasters and services'}
  ],
  ufc: [
    {name:'UFC Fight Pass', url:'https://ufcfightpass.com/', type:'Subscription', note:'Includes selected events, archives and other combat sports; PPV may be separate'},
    {name:'UFC Watch', url:'https://www.ufc.com/watch', type:'Official guide', note:'Find viewing details for each fight night'}
  ],
  f1: [
    {name:'F1 TV', url:'https://www.formula1.com/en/subscribe-to-f1-tv', type:'Subscription', note:'Live tiers and access depend on country'},
    {name:'F1 Broadcasters', url:'https://www.formula1.com/en/information/f1-broadcast-information.45y3LNsT1D6VoK0ZmX8ciJ', type:'Official guide', note:'Check local broadcast partners'}
  ],
  epl: [
    {name:'ESPN Caribbean', url:'https://www.espn.com/watch/', type:'Regional broadcaster', note:'Premier League lists ESPN as the Caribbean rights holder; access depends on your TV provider'},
    {name:'Premier League broadcasters', url:'https://www.premierleague.com/en/media/broadcasters', type:'Official guide', note:'Check rights holders by country'}
  ],
  laliga: [
    {name:'LaLiga', url:'https://www.laliga.com/en-GB', type:'Official guide', note:'Check local LaLiga viewing options'},
    {name:'ESPN Watch', url:'https://www.espn.com/watch/', type:'Broadcaster platform', note:'Not all territories or matches are available'}
  ],
  ligue1: [
    {name:'Ligue 1', url:'https://ligue1.com/', type:'Official guide', note:'Check local broadcasters and rights'},
    {name:'beIN SPORTS', url:'https://www.beinsports.com/', type:'Broadcaster platform', note:'Availability and rights differ by territory'}
  ],
  seriea: [
    {name:'Lega Serie A', url:'https://www.legaseriea.it/en', type:'Official guide', note:'Check licensed broadcast partners'},
    {name:'CBS Sports', url:'https://www.cbssports.com/watch/', type:'Broadcaster platform', note:'Region-specific availability; may not work in the Caribbean'}
  ],
  bundesliga: [
    {name:'Bundesliga', url:'https://www.bundesliga.com/en/bundesliga', type:'Official guide', note:'Find viewing options in your region'}
  ],
  ucl: [
    {name:'UEFA Champions League', url:'https://www.uefa.com/uefachampionsleague/', type:'Official guide', note:'Find broadcasters for your country'}
  ],
  uel: [
    {name:'UEFA Europa League', url:'https://www.uefa.com/uefaeuropaleague/', type:'Official guide', note:'Find broadcasters for your country'}
  ],
  mls: [{name:'MLS Season Pass', url:'https://tv.apple.com/sports', type:'Broadcaster platform', note:'See regional match availability'}],
  eredivisie: [{name:'Eredivisie', url:'https://eredivisie.eu/', type:'Official guide', note:'Check your local rights holders'}],
  primeira: [{name:'Liga Portugal', url:'https://www.ligaportugal.pt/', type:'Official guide', note:'Check regional coverage'}],
  championship: [{name:'EFL', url:'https://www.efl.com/', type:'Official guide', note:'Check regional coverage'}]
};
module.exports = { WATCH };

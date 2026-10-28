'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const ROOT='https://sports-nexus.test';

test('Vercel configuration deploys static files and functions',()=>{
  const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));
  assert.equal(config.framework,null);
  assert.equal(config.functions['api/fixtures.mjs'].maxDuration,60);
  for(const file of ['api/meta.mjs','api/health.mjs','api/fixtures.mjs','public/index.html','public/styles.css','public/app.js']) {
    assert.ok(fs.existsSync(file),file);
  }
});

test('serverless health and metadata handlers return JSON',async()=>{
  const health=await import('../api/health.mjs');
  const meta=await import('../api/meta.mjs');
  const healthResp=health.GET(new Request(`${ROOT}/api/health`));
  assert.equal(healthResp.status,200);
  assert.equal((await healthResp.json()).ok,true);
  const metaResp=meta.GET(new Request(`${ROOT}/api/meta`));
  assert.equal(metaResp.status,200);
  assert.ok((await metaResp.json()).leagues.length>=10);
});

test('serverless fixtures reject unknown leagues without a provider request',async()=>{
  const fixtures=await import('../api/fixtures.mjs');
  const response=await fixtures.GET(new Request(`${ROOT}/api/fixtures?leagues=invalid`));
  assert.equal(response.status,400);
  assert.match((await response.json()).error,/No valid/);
});

test('serverless fixtures return normalized data using free provider',async()=>{
  const original=global.fetch;
  global.fetch=async url=>({ok:true,json:async()=>({events:[{
      id:'1000',date:new Date(Date.now()+86400000).toISOString(),name:'Test game',competitions:[],status:{type:{state:'pre'}}
  }]})});
  try {
    const fixtures=await import('../api/fixtures.mjs');
    const response=await fixtures.GET(new Request(`${ROOT}/api/fixtures?leagues=nba&days=7&past=0`));
    assert.equal(response.status,200);
    const result=await response.json();
    assert.ok(result.events.some(e=>e.id==='nba:1000'));
  } finally {global.fetch=original;}
});

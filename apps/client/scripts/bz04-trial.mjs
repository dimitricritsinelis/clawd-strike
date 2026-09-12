import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { startQaServer } from './lib/qaServer.mjs';
import { launchBrowserProcess, gotoAgentRuntime, gotoHumanShot, SHIP_QA_SEARCH_PARAMS, attachConsoleRecorder, renderRuntimeFrame, runWaypointRoute } from './lib/runtimePlaywright.mjs';
import { evaluateBazaarPerformance } from './lib/performanceAcceptance.mjs';
import {parseArgs} from 'node:util';
import {sampleTrialPerformance,compareTrialCpu} from './lib/trialPerformance.mjs';
import {normalizeTrialCapturePlan} from './lib/trialCapturePlan.mjs';
const {values}=parseArgs({options:{plan:{type:'string'},output:{type:'string'},phase:{type:'string',default:'capture'},lighting:{type:'string',default:'golden'},baseline:{type:'string'},views:{type:'string'},movement:{type:'boolean',default:false},'capture-only':{type:'boolean',default:false}}});
if(!values.plan||!values.output)throw new Error('Usage: --plan saved-plan.json --output new-directory [--baseline earlier-directory] [--views id,id] [--movement]');
const root=process.cwd(),out=path.resolve(values.output),phase=values.phase;
const plan=normalizeTrialCapturePlan(JSON.parse(await fs.readFile(values.plan,'utf8')));
if(!['golden','flat'].includes(values.lighting))throw new Error('Lighting must be golden or flat');
if(!/^[A-Za-z0-9_-]+$/.test(phase))throw new Error('Invalid phase label');
if(values.movement&&!plan.units[0].zoneIds.includes('SPAWN_B_COURTYARD'))throw new Error('This movement schedule belongs to B courtyard');
for(const v of plan.units[0].views)if(!v.id||path.basename(v.id)!==v.id||['.','..'].includes(v.id))throw new Error('Unsafe camera id');
if(values.views){const ids=values.views.split(',');const selected=plan.units[0].views.filter(v=>ids.includes(v.id));if(selected.length!==ids.length)throw new Error('Unknown or duplicate camera id');plan.units[0].views=selected;}
await fs.mkdir(path.dirname(out),{recursive:true});await fs.mkdir(out);
await fs.copyFile(values.plan,out+'/capture-plan.json');

let server,browser;
const hash=async file=>crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
const inputHashes={plan:await hash(values.plan),runtimeSpec:await hash(root+'/apps/client/public/maps/bazaar-map/map_spec.json'),facadeManifest:await hash(root+'/apps/client/public/assets/models/environment/bazaar/facades/models.json'),productionIndex:await hash(root+'/apps/client/dist/index.html')};
const design=JSON.parse(await fs.readFile(root+'/docs/map-design/construction/design.json','utf8'));
const units=new Set(design.areas.filter(a=>plan.units[0].zoneIds.includes(a.zone)).map(a=>a.outputUnit));
await fs.mkdir(out+'/inputs');
for(const [name,file] of Object.entries({sourceSpec:root+'/docs/map-design/specs/map_spec.json',runtimeSpec:root+'/apps/client/public/maps/bazaar-map/map_spec.json',facadeManifest:root+'/apps/client/public/assets/models/environment/bazaar/facades/models.json',design:root+'/docs/map-design/construction/design.json'})){
 await fs.copyFile(file,out+'/inputs/'+name+'.json');inputHashes[name]=await hash(file);
}
const manifest=JSON.parse(await fs.readFile(out+'/inputs/facadeManifest.json','utf8'));
const assetsRoot=path.resolve(root,'apps/client/public/assets/models/environment/bazaar/facades');
for(const model of manifest.models.filter(m=>[...units].some(u=>m.url.startsWith(u+'/')))){
 const source=path.resolve(assetsRoot,model.url);if(!source.startsWith(assetsRoot+path.sep))throw new Error('Asset path leaves facades directory');
 const destination=out+'/inputs/facades/'+model.url;await fs.mkdir(path.dirname(destination),{recursive:true});await fs.copyFile(source,destination);inputHashes[model.url]=await hash(source);
}
const results={inputHashes,lighting:values.lighting,measurementMode:'raf-full-step',actors:'eliminated for static environment comparison',client:'production dist/build bundles with owned QA API server',physicalMobileDevice:'not tested',runs:[]};
async function pose(page,v){const c=v.camera;await page.evaluate(c=>{window.agent_apply_action?.({moveX:0,moveZ:0});window.__debug_set_player_pose({...c.playerPosition,yawDeg:c.yawDeg,pitchDeg:c.pitchDeg});},c);await renderRuntimeFrame(page);}
try {
 server=await startQaServer({root:root+'/apps/client',profile:'bz04-production-trial',baseUrlOverride:null,allowExternal:false});
 browser=await launchBrowserProcess({headless:true});
 for(const mobile of [false,true]) {
  const label=phase+(mobile?'-mobile':'-desktop');
  const context=await browser.newContext(mobile?{viewport:{width:844,height:390},screen:{width:844,height:390},deviceScaleFactor:1,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36'}:{viewport:{width:1440,height:900}});
  const page=await context.newPage();const recorder=attachConsoleRecorder(page);const network=[];page.on('requestfailed',r=>network.push({url:r.url(),error:r.failure()}));page.on('response',r=>{if(r.status()>=400)network.push({url:r.url(),status:r.status()});});
  // Serve the built client bundle. API endpoints remain the repository's real local QA server.
  await page.route('**/*',async route=>{const req=route.request();const url=new URL(req.url());
   if(req.isNavigationRequest() && req.resourceType()==='document')return route.fulfill({path:root+'/apps/client/dist/index.html',contentType:'text/html'});
   if(url.pathname.startsWith('/build/'))return route.fulfill({path:root+'/apps/client/dist'+url.pathname,contentType:url.pathname.endsWith('.js')?'text/javascript':url.pathname.endsWith('.css')?'text/css':undefined});
   return route.continue();
  });
  await gotoHumanShot(page,{baseUrl:server.baseUrl,mapId:'bazaar-map',shot:'SHOT_12_SPAWN_B_RETURN',spawn:'B',extraSearchParams:{...SHIP_QA_SEARCH_PARAMS,lighting:values.lighting,ao:values.lighting==='flat'?0:1,vm:0,unlimitedHealth:1,perf:1}});

  await page.evaluate(()=>{window.__debug_eliminate_all_bots?.();document.getElementById('runtime-root').dataset.beautyShot='true';});
  const authority=await page.evaluate(()=>window.__qa_gameplay_authority_state());const authorityHash=crypto.createHash('sha256').update(JSON.stringify(authority)).digest('hex');
  const run={label,mobile,authorityHash,colliderCount:authority.colliders.length,views:[],routes:[],console:[],network};results.runs.push(run);
  await fs.mkdir(out+'/'+label+'-final',{recursive:true});await fs.writeFile(out+'/'+label+'-final'+'/authority.json',JSON.stringify(authority,null,2));
  for(const v of plan.units[0].views){
   await pose(page,v);const perf=values['capture-only']?await page.evaluate(()=>{const s=window.__qa_performance_state();return {measurementMode:'capture-only',drawCalls:s.perf.drawCalls,triangles:s.perf.triangles};}):await sampleTrialPerformance(page);const camera=await page.evaluate(()=>window.agent_observe?.()?.camera??null);
   await page.screenshot({path:out+'/'+label+'-final'+'/'+v.id+'.png'});run.views.push({id:v.id,performance:perf,camera});console.log(label,v.id,perf.drawCalls,perf.triangles,perf.medianFrameMs);
  }
  if(values.movement&&!mobile){
   await gotoAgentRuntime(page,{baseUrl:server.baseUrl,mapId:'bazaar-map',agentName:'BZ04Movement',spawn:'B',routeId:'movement',extraSearchParams:{...SHIP_QA_SEARCH_PARAMS,vm:0,unlimitedHealth:1}});
   await page.evaluate(()=>window.__debug_suppress_bot_intel_ms?.(300000));
   const B={zoneId:'SPAWN_B_COURTYARD',x:28,z:85};const routes=[['gateway',[B,{zoneId:'RUG_GATE',x:27.5,z:73}]],['west-link',[B,{zoneId:'SPAWN_B_COURTYARD',x:21,z:79.5},{zoneId:'LINK_NORTH_WEST',x:14,z:79.5}]],['east-link',[B,{zoneId:'SPAWN_B_COURTYARD',x:36,z:79.5},{zoneId:'LINK_NORTH_EAST',x:42,z:79.5}]],['cover-loop',[B,{zoneId:'SPAWN_B_COURTYARD',x:32,z:88.5},{zoneId:'SPAWN_B_COURTYARD',x:37,z:88.5},{zoneId:'SPAWN_B_COURTYARD',x:37,z:83},{zoneId:'SPAWN_B_COURTYARD',x:32,z:83},B]]];
   for(const [id,waypoints] of routes)for(const reverse of id==='cover-loop'?[false]:[false,true]) {
    const points=reverse?[...waypoints].reverse():waypoints;const rid=id+(reverse?'-reverse':'-forward');await pose(page,{camera:{playerPosition:{x:points[0].x,y:0,z:points[0].z},yawDeg:0,pitchDeg:0}});
    try {const summary=await runWaypointRoute(page,{id:rid,waypoints:points},{artifactDir:out+'/routes/'+rid});run.routes.push({id:rid,status:summary.reachedWaypoints.length===points.length-1&&summary.withinPlayableBounds&&summary.endedAlive?'pass':'fail',summary});console.log('ROUTE',rid,run.routes.at(-1).status);}catch(e){run.routes.push({id:rid,status:'fail',error:String(e)});console.log('ROUTE',rid,String(e));}
   }
  }
  run.console=recorder.snapshot();await fs.writeFile(out+'/proof.json',JSON.stringify(results,null,2));await context.close();
 }

 if(values.baseline){
  const prior=JSON.parse(await fs.readFile(path.resolve(values.baseline,'proof.json'),'utf8'));
  const comparison=results.runs.flatMap(run=>run.views.map(view=>{const before=prior.runs.find(r=>r.mobile===run.mobile);const old=before?.views.find(v=>v.id===view.id);return {device:run.label,id:view.id,lightingIdentical:(prior.lighting??'golden')===values.lighting,cameraIdentical:JSON.stringify(old?.camera)===JSON.stringify(view.camera),authorityIdentical:before?.authorityHash===run.authorityHash,cpu:values['capture-only']?{status:'deferred',reason:'User deferred performance work until full implementation'}:compareTrialCpu(old?.performance,view.performance)};}));
  results.comparison=comparison;
  await fs.writeFile(out+'/comparison.json',JSON.stringify(comparison,null,2));
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const rows=comparison.map(c=>{const previous=prior.runs.find(r=>r.mobile===(c.device.endsWith('-mobile')));const before=path.relative(out,path.resolve(values.baseline,previous.label+'-final',c.id+'.png'));const after=c.device+'-final/'+c.id+'.png';return `<h2>${escape(c.device)}: ${escape(c.id)}</h2><div style="display:flex;gap:12px"><img style="width:49%" src="${escape(before)}"><img style="width:49%" src="${escape(after)}"></div>`;});
  await fs.writeFile(out+'/comparisons.html','<!doctype html><meta charset="utf-8"><title>Matched courtyard evidence</title><h1>Before / after</h1>'+rows.join(''));
 }
 const desktop=results.runs.find(r=>!r.mobile),mobile=results.runs.find(r=>r.mobile);
 results.performanceDeferred=values['capture-only'];
 results.measurementMode=values['capture-only']?'capture-only':'raf-full-step';
 results.performance=values['capture-only']?[]:mobile.views.map(v=>({id:v.id,acceptance:evaluateBazaarPerformance({desktop:desktop.views.find(d=>d.id===v.id).performance,mobile:v.performance})}));
 results.baselineMeaning=values['capture-only']?'Matched cameras and collider authority checked; performance deferred by user.':'Absolute checks use repository release references; relative CPU comparison requires --baseline with compatible recorded samples.';
 await fs.writeFile(out+'/proof.json',JSON.stringify(results,null,2));
 const failed=(results.comparison??[]).some(c=>!c.lightingIdentical||!c.cameraIdentical||!c.authorityIdentical||(!values['capture-only']&&c.cpu.status!=='pass'))||results.performance.some(p=>!p.acceptance.passed)||results.runs.some(r=>r.routes.some(p=>p.status==='fail')||r.console.some(e=>e.type==='error'||e.kind==='pageerror')||r.network.some(e=>e.status>=400||(e.error?.errorText!=='net::ERR_ABORTED'||!e.url.endsWith('/loading-screen/assets/loading-ambient.ogg'))));
 if(failed)process.exitCode=1;

}finally{await browser?.close();await server?.close();}

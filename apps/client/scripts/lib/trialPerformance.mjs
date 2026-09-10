/** Measure one deterministic full update + render on each browser animation frame.
 * Never treat the runtime FPS smoothed from zero-delta debug renders as wall-clock FPS.
 */
export async function sampleTrialPerformance(page, {warmupFrames=60, sampleFrames=180}={}) {
  await page.bringToFront();
  return page.evaluate(async ({warmupFrames,sampleFrames})=>{
    const samples=[];let previous=null;
    for(let i=0;i<warmupFrames+sampleFrames;i++){
      const timestamp=await new Promise(requestAnimationFrame);
      const interval=previous===null?1000/60:timestamp-previous;previous=timestamp;
      const start=performance.now();
      await window.advanceTime(interval);
      window.__qa_render_frame();
      const cpuMs=performance.now()-start;
      if(i>=warmupFrames)samples.push({intervalMs:interval,cpuMs});
    }
    const median=values=>{const a=[...values].sort((a,b)=>a-b);return (a[Math.floor((a.length-1)/2)]+a[Math.floor(a.length/2)])/2};
    const cpu=samples.map(s=>s.cpuMs).sort((a,b)=>a-b);
    const runtime=window.__qa_performance_state();
    return {measurementMode:'raf-full-step',sampleCount:samples.length,
      drawCalls:runtime.perf.drawCalls,triangles:runtime.perf.triangles,
      medianFrameMs:median(cpu),medianFps:1000/median(samples.map(s=>s.intervalMs)),
      bootReadyMs:runtime.boot.readyAtMs,cpuIqrMs:[cpu[Math.floor(cpu.length*.25)],cpu[Math.floor(cpu.length*.75)]],
      runtimeTelemetry:runtime,samples,physicalDevice:false};
  },{warmupFrames,sampleFrames});
}

export function compareTrialCpu(before,after) {
  if(before?.measurementMode!=='raf-full-step'||after?.measurementMode!=='raf-full-step'
    ||before.sampleCount<120||after.sampleCount<120||!Number.isFinite(before.medianFrameMs)||before.medianFrameMs<=0||!Number.isFinite(after.medianFrameMs)) {
    return {status:'unverified',reason:'requires matching full-step measurements with at least 120 samples'};
  }
  const ceiling=before.medianFrameMs*1.1;
  // Floating-point roundoff at exactly 10% is not a measured regression.
  const passed=after.medianFrameMs<=ceiling+Number.EPSILON*Math.max(1,ceiling)*8;
  return {status:passed?'pass':'fail',beforeMs:before.medianFrameMs,afterMs:after.medianFrameMs,ceilingMs:ceiling,
    distributionsOverlap:before.cpuIqrMs&&after.cpuIqrMs?after.cpuIqrMs[0]<=before.cpuIqrMs[1]&&before.cpuIqrMs[0]<=after.cpuIqrMs[1]:null};
}

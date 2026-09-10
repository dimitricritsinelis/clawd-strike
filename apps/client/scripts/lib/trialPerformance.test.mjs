import test from 'node:test';
import assert from 'node:assert/strict';
import {compareTrialCpu} from './trialPerformance.mjs';
const sample=ms=>({measurementMode:'raf-full-step',sampleCount:180,medianFrameMs:ms,cpuIqrMs:[ms-.1,ms+.1]});
test('rejects short, mixed or absent benchmark evidence instead of assuming a baseline',()=>{
 assert.equal(compareTrialCpu(sample(3),{...sample(4),sampleCount:15}).status,'unverified');
 assert.equal(compareTrialCpu({...sample(3),measurementMode:'render-only'},sample(3)).status,'unverified');
 assert.equal(compareTrialCpu(undefined,sample(3)).status,'unverified');
});
test('keeps the ten-percent threshold and distinguishes numerical equality from a real regression',()=>{
 assert.equal(compareTrialCpu(sample(3),sample(3.3)).status,'pass');
 assert.equal(compareTrialCpu(sample(3),sample(3.301)).status,'fail');
 assert.equal(compareTrialCpu(sample(2.3),sample(3)).status,'fail');
});

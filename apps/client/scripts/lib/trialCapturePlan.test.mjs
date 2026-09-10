import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { normalizeTrialCapturePlan } from './trialCapturePlan.mjs';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const plans = JSON.parse(execFileSync('python3', ['-c', `
import json,runpy
from pathlib import Path
p=Path('docs/map-design/construction')
d=json.loads((p/'design.json').read_text())
capture=runpy.run_path(str(p/'cameras.py'))['capture_plan']
print(json.dumps({u:capture(d,u) for u in sorted({a['outputUnit'] for a in d['areas']})}))
`], { cwd: root, encoding: 'utf8' }));

test('all 25 authored area plans preserve every pose and accept multiple batches', () => {
  assert.equal(Object.keys(plans).length, 25);
  for (const [id, plan] of Object.entries(plans)) {
    const normalized = normalizeTrialCapturePlan(plan);
    assert.equal(normalized.units.length, 1);
    assert.equal(normalized.units[0].id, id);
    for (const batch of plan.units) for (const view of batch.views) {
      assert.deepEqual(normalized.units[0].views.find(candidate => candidate.id === view.id), view);
    }
    assert.equal(normalized.units[0].views.length, new Set(plan.units.flatMap(batch => batch.views.map(view => view.id))).size);
  }
  for (const id of ['unit-spawn-b-courtyard', 'unit-service-north']) {
    assert.equal(plans[id].units.length, 2);
    assert.equal(normalizeTrialCapturePlan(plans[id]).units[0].views.length, 13);
  }
});

test('rejects conflicting duplicate poses rather than dropping a view', () => {
  const plan = structuredClone(plans['unit-spawn-b-courtyard']);
  plan.units[1].views[0].camera.yawDeg += 1;
  assert.throws(() => normalizeTrialCapturePlan(plan), /Conflicting duplicate camera id: primary/);
});

test('rejects mixed-area and empty plans', () => {
  assert.throws(() => normalizeTrialCapturePlan({ units: [plans['unit-spawn-b-courtyard'].units[0], plans['unit-service-north'].units[0]] }), /mixed-area/);
  assert.throws(() => normalizeTrialCapturePlan({ units: [] }), /no area batches/);
});

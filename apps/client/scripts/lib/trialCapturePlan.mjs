import { isDeepStrictEqual } from 'node:util';

// Camera schedules may split one area's poses into multiple capture batches.
export function normalizeTrialCapturePlan(plan) {
  if (!Array.isArray(plan.units) || plan.units.length === 0) throw new Error('Capture plan has no area batches');
  const areaId = id => typeof id === 'string' ? id.replace(/-batch-\d+$/, '') : null;
  const unitId = areaId(plan.units[0].id);
  if (!unitId || plan.units.some(batch => areaId(batch.id) !== unitId)) throw new Error('One area per trial; mixed-area capture batches');
  const views = new Map();
  const zoneIds = new Set();
  for (const batch of plan.units) {
    for (const zone of batch.zoneIds) zoneIds.add(zone);
    for (const view of batch.views) {
      if (views.has(view.id) && !isDeepStrictEqual(views.get(view.id), view)) throw new Error(`Conflicting duplicate camera id: ${view.id}`);
      views.set(view.id, view);
    }
  }
  return { ...plan, units: [{ id: unitId, zoneIds: [...zoneIds].sort(), views: [...views.values()] }] };
}

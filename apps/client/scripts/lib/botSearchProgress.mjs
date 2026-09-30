/** Track real movement toward a stable assigned goal. Retargeting earns no
 * progress, and reversals subtract progress so waypoint oscillation cannot pass. */
export function recordAssignedSearchProgress(progress, previousState, currentState) {
  const previous = new Map((previousState.bots?.enemies ?? []).map((enemy) => [enemy.id, enemy]));
  for (const enemy of currentState.bots?.enemies ?? []) {
    const before = previous.get(enemy.id);
    const goal = before?.holdPoint;
    if (!goal || !before.targetNodeId || before.targetNodeId !== enemy.targetNodeId) continue;
    if (goal.x !== enemy.holdPoint?.x || goal.z !== enemy.holdPoint?.z) continue;
    const closedM = Math.hypot(before.position.x - goal.x, before.position.z - goal.z)
      - Math.hypot(enemy.position.x - goal.x, enemy.position.z - goal.z);
    const entry = progress[enemy.id] ??= { distanceClosedM: 0, samples: 0 };
    entry.distanceClosedM += closedM;
    entry.samples += 1;
  }
}

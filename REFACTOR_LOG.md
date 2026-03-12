# Refactor Log

## 2026-03-12
- File(s) changed: `apps/shared/highScore.ts`
- Problem: `normalizeRunSeconds` and `normalizeAccuracyPercent` duplicated the same parse/finite-check/round-to-tenths logic, which increases drift risk if one side is edited later.
- Fix: Added a private helper (`normalizeTenths`) and routed both exported functions through it without changing signatures or outputs.
- Risk: Low. Both functions previously implemented identical logic, so this is a behavior-preserving deduplication.

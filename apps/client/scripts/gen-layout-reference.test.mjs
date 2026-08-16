import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveDesignCalloutsByZoneId,
  generateLayoutReference,
  resolveAuthoredFrontages,
} from "./gen-layout-reference.mjs";

test("derives design callouts from authored anchors", () => {
  const byZone = deriveDesignCalloutsByZoneId([
    { id: "ANCHOR_WELL", type: "landmark_well", zone: "COURT", notes: "Offset fountain." },
    { id: "ANCHOR_SIGN", type: "signage", zone: "COURT", notes: "" },
  ]);

  assert.deepEqual(byZone.get("COURT"), [
    { id: "ANCHOR_WELL", name: "Landmark Well", description: "Offset fountain." },
    { id: "ANCHOR_SIGN", name: "Signage", description: "" },
  ]);
});

test("prefers stable v3 frontages and preserves relative spans", () => {
  const frontages = resolveAuthoredFrontages(
    {
      frontages: [
        { id: "FRONT_SPICE_WEST", zoneId: "SPICE", face: "west", start: 0.15, end: 0.85 },
      ],
    },
    {
      building_frontages: [
        { buildingId: "LEGACY", zoneId: "OLD", face: "east", label: "Legacy", shortLabel: "L" },
      ],
    },
  );

  assert.deepEqual(frontages, [
    {
      buildingId: "FRONT_SPICE_WEST",
      zoneId: "SPICE",
      face: "west",
      label: "Front Spice West",
      shortLabel: "F1",
      humanLabel: "Front Spice West",
      notes: "",
      start: 0.15,
      end: 0.85,
    },
  ]);
});

test("keeps the embedded v2 frontage catalog as a compatibility fallback", () => {
  const legacy = [
    { buildingId: "BLDG_A", zoneId: "M1", face: "west", label: "Building A", shortLabel: "A" },
  ];
  assert.equal(resolveAuthoredFrontages({}, { building_frontages: legacy }), legacy);
});

test("validates the authoritative map spec without writing generated outputs", async () => {
  const result = await generateLayoutReference({ write: false });
  assert.match(result.markdown, /Generated from `docs\/map-design\/specs\/map_spec\.json`/u);
  assert.match(result.markdown, /Runtime and this reference consume the same absolute placements/u);
  assert.match(result.markdown, /ARCH_FRONTAGE_SPICE_STREET_WEST_MASSING/u);
  assert.match(result.markdown, /door_fortified_gate/u);
  assert.match(result.svg, /<svg/u);
  assert.match(result.svg, /data-kind="massing"/u);
  assert.match(result.svg, /data-kind="facade_module"/u);
  assert.match(result.svg, /data-kind="dressing"/u);
  assert.match(
    result.svg,
    /id="PLACE_SPICE_CANOPIES_CANOPY_SPICE_01"[^>]*data-span-m="12\.000"[^>]*data-width-m="3\.600"/u,
  );
  assert.match(
    result.markdown,
    /PLACE_SPICE_CANOPIES_CANOPY_SPICE_01.*\(27\.00, 20\.58, 5\.67\), size 3\.60×12\.00×0\.18m, yaw 90\.00deg/u,
  );
  assert.doesNotMatch(result.markdown, /procedural door grid/u);
});

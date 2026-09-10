# R5 | Bazaar architecture and craftsmanship

R5 composes openings from complete room groups, entrances and common storey datums. It removes redundant windows and repeated motifs; B retains its focal balcony and selected upper glass family.

These are source-defined construction recipes for the proposed whole map. They do not authorize extra openings, props or neighboring-area work. Existing gameplay and global runtime limits remain fixed.

## Questions that govern the design

- What should the player notice first?
- Does the room/trade explain each opening, support and object?
- Would this be built, maintained and used this way?
- Does the monochrome elevation explain the building without ornament?
- Do the materials, shade and craft read as a maintained Middle Eastern bazaar?
- What can be removed without losing use, identity or wayfinding?

## Building corners

At a true building end, target at least 0.45 m clear masonry after the complete jamb/head surround; coordinated end stacks move together. Internal drafting parcels are not new corners. Narrow legacy boundary returns do not receive fictitious door/window upgrades.

## Source traditions

| Assembly | Source | Intended use |
|---|---|---|
| Carved portal | [Reference](https://www.nm.gov.om/en/collection/gift/architectural-heritage) | Omani doorway craft; no copied royal animals or inscriptions. |
| Fixed plaster-and-glass upper light | [Reference](https://www.metmuseum.org/essays/the-damascus-room) | Selective Levantine upper-light borrowing, with substantial plaster webs. |
| Timber and colored-glass subdivision | [Reference](https://visitiran.ir/handicraft/gereh-chini-or-trelliswork-tehran) | Selected Persian craft adaptation in fixed upper panes; not an operable orosi reconstruction. |

## Opening families

| Family | Receiver / trim | Joinery |
|---|---|---|
| domestic | Use the owning wall plaster across the outer 0.10 m surround. Ease its exposed arris 0.012 m inside the existing envelope. The opening is cut into plaster; do not apply a bright stone rectangle. Keep a separate stone sill only. | 0.08 m perimeter frame; opening.finishLeafCount timber leaves, 0.025 m thick with a 0.006 m central seam. Each leaf has 0.055 m stiles, 0.07 m top/bottom rails and one 0.05 m midrail. Recess panels 0.008 m behind the rails; ease exposed timber edges 0.003 m. Give each leaf two 0.025 x 0.10 m hinge plates and one restrained latch, all inside the opening envelope. |
| workshop | Return the owning plaster to the 0.08 m timber frame; retain a stone sill with a 0.008 m underside drip groove. Use one plain timber head rather than four dressed-stone bars. Recess depths and outward limits follow the owning opening schedule. | Louvers keep 0.035 m visible height at 0.08 m pitch. Their local cross section relative to closure front c is (out,z): (-0.025,-0.0175),(0, 0.0105),(0, 0.0175),(-0.025,-0.0105). Clip within the frame, close visible ends, and preserve the gap to the opaque back. Instances with panelCount=3 retain their three panels and 0.08 m mullions. |
| stone | Use the owning stone on jambs and reveals, with a restrained dressed sill. Keep civic and principal merchant doors in their scheduled dressed stone. Ease exposed stone arrises 0.008 m; show the head as a coherent lintel or arch ring, not disconnected trim cubes. | Closed receiving/loading leaves use vertical boards with 0.002 m seams and two continuous dark iron straps per leaf. Keep their existing widths and heights. Rings, straps and hinge plates read as dark iron, not bright white or gold bands. |

## Measured craft recipes

### CF-OPEN

Use the exact instance width, height, sill/head, headShape, depth and finishFamily. Frames are 0.08 m, panel leaves 0.025 m, central seam 0.006 m, stile 0.055 m, top/bottom rails 0.07 m and midrail 0.05 m. Rebate panels 0.008 m and ease timber 0.003 m inside the silhouette. The named leaf count follows closure type. Close every reveal/back and trim curved frames to the actual aperture; never put a curved sticker over a rectangular hole. An explicit closureProfile always wins: civic doors stop their leaves at leafTopM and use fixed shaped transoms above; loggias use their fixed stone dado and slats. fixedInfill openings have no operable paneled leaves.

### CF-ENVELOPE

Flush base out=-0.02..0 at the exact floor grade; height is parcel.baseHeightM. No new low projection into routes. Single-drip cornice: below wallTop by 0.16 m, front out=0.16, underside drip recess 0.008; civic stepped cornice has two 0.08 m courses at out=0.10 and 0.16. Service/boundary caps use the existing roof profile without another decorative cornice. Source/export must give each cornice/cap one owner; no duplicate roof-edge or per-clipped-cell parapet. Exposed stone arrises 0.008 m and plaster 0.012 m are eased inside the envelope.

### CF-JOINT

A 0.015 m recessed vertical joint occurs at a real property boundary, plane/height change or named assembly joint. Adjacent drafting parcels of the same building are continuous when their plane and finish agree. Match opposite return materials to that owner. Keep 0.02 m opaque end closures at real exposed edges; no doubled wall face or painted property stripe.

### CF-TIMBER

Use the printed member box, grounded/bearing ends and lengthwise UV grain. Longitudinal grain follows the largest local dimension; rails and stiles must not inherit one wall-world projection. Join visible corners with butt, housed or pinned joints appropriate to the named assembly. Edge easing 0.003 m; no random notch damage.

### CF-COUNTER

The existing counter/chest box owns its total silhouette. Top boards 0.045 m; front boards 0.18 m nominal width with 0.002 m seams; side frames 0.065 m with grounded ends. The visible support reaches the deck. Recess working surfaces and keep the named 1.00 m staff strip and 0.80 m connection clear. Handles/rails are restrained, not decorative straps on every board.

### CF-CLOTH

Thickness 0.008 m where the box permits, bound edge 0.025 m, restrained gravity bow at most min(0.04 m, one-third of available out-depth). Folded lengths have a compressed fold stack, not a beveled block. Hanging ends and ties meet their named receiver; no rigid billboard or unsupported mid-air cloth. Keep all edges inside the printed final silhouette.

### CF-RUG

Use the unmodified licensed Levantine weave at 1.20 m world repeat in the field. Add a 0.035 m plain indigo bound border and 0.020 m end fringe inside the rectangle; do not invent a whole-rug border in the source image. Hanging pieces curve within their thin box, ties meet their rail, and rolled ends show the cloth spiral. Pattern phase is the per-instance UV origin, not random orientation. B alone retains its scheduled rail rug.

### CF-CERAMIC

Use a turned profile appropriate to bowl, cup, plate, jar, bottle or lidded vessel; 32 radial segments, smooth body normals with deliberate rim/foot/lid breaks. Open ware has an inner bowl and 0.015..0.020 m rim; sealed ware has a real lid. Use the named glaze accent as desired albedo, not an extra multiplication by beige. No identical cylinder for every trade item. Apothecary bottles have narrow shoulders/necks and seated stoppers; spice jars have broader shoulders/lids; tea canisters are straighter-sided with fitted lids. Distinguish these profiles before adding glaze color.

### CF-METAL

Use the shared dark iron or brass finish as specified. Iron straps stay dark and restrained, roughness 0.86/metalness 0.15 in the craft copy; brass service ware uses its existing recipe. Disconnect unintended metallic maps. Hardware is receive-only unless its silhouette is large enough to matter; no new material per hinge. An arabian-coffee-pot is service ware, not generic hardware: form a belly, narrow neck, seated lid, continuous tapered spout and joined handle within its printed silhouette; use the specified brass material and actual contact at handle/spout roots.

### CF-PLANT

Root each existing plant at the soil plane inside its trough. Seven tapered leaves have a curved centerline with at least three length segments; rotate around the stem without duplicating one flat triangle fan. Soil is contained; no floating roots, new pot quota or spill into the route. For the existing trough, keep 0.05 m walls/base with a hollow interior, a dressed rim and contained soil. The soil and plant roots occupy their printed boxes; the stone container is not a solid planter cube.

### CF-BASKET

The named box is a woven basket with a hollow mouth, 0.025 m bound rim, 12 shallow vertical ribs and three circumferential hoops. Use the existing neutral textile/wood family; avoid a solid crate or thousands of modeled strands.

### CF-WEAVING

This is a weaving sample frame, not a mechanically complete loom. Existing uprights, head and horizontal lower roller support the weft-panel. Its lower 65 percent is woven cloth; its upper 35 percent shows 12 exposed tensioned warp lines 0.008 m in diameter and a clear horizontal working edge. Roller ends sit in the frame. One small shuttle is contained within the existing shuttle-basket envelope; it does not add a standalone prop group. Keep the closed work gate and staff strip.

### CF-BALANCE

The listed balance is supported on its counter. Use a central post and equal arm, two suspended shallow pans and four short straight chain/rod segments per pan. All fit the named box; pans do not float or intersect nearby sacks. No moving physics is implied.

### CF-SACK

Flatten the base on its receiver, round the shoulder and close the tied or open mouth as named. Keep the printed width/depth/height, with 0.018 m cloth ties. Model one coherent soft volume; do not scale a rigid cube or scatter grain into the walkway. Open grain sacks contain a shallow grain surface 0.025 m below the mouth; the surface is inside the sack, not spilled into the staff route.

### CF-SPICE

The existing spice group has six stocked trays and one listed scoop total. Trays have 0.025 m rims and a contained low stock surface. The wooden scoop has a concave bowl and short joined handle inside its own box. Different spices use restrained authored colors; no extra scoop per tray, loose floor pile or modeled individual grain.

### CF-SHADE

Separate clothBbox from the whole assembly bbox. The latter includes ledger 0.08 m square, arms 0.07 m square at armAxesM, knees with 0.30 m run/rise and all attachments. Cloth drop/sag remain instance values; hem 0.025 m and thickness 0.008 m stay within the whole box. Ledgers bear on the wall; no freestanding post in a protected path. Endpoint ledgers on crossing spans are included in bounds.

### CF-INSCRIPTION

Flush stone/plaster name panel inside its printed box, letters 0.10 m high incised 0.003 m. Use the exact short label at the principal civic threshold. No raised signboard, extra object or repeated house branding. Latin-script trade/place labels serve fictional game readability; they are not facsimiles of historic inscriptions. Do not add pseudo-Arabic ornament or invent religious titles. BLD_MADRASA remains a stable internal ID; its visible place name is guildhall.

### CF-FLOOR

Keep the exact grade, material alias, tile scale and protected floor surface. Finish joints with shallow material/normal detail, not new curbs or steps. Local use/contact is low contrast and receiver-bound; never cover a route with a floating stain card. Roof runoff terminates at its existing scheduled collector/drain, not an invented full-height dirt stripe.

### CF-STONE

Use the listed stone box with flat bearing top/base and 0.008 m eased exposed arrises. Align the licensed stone scale to the physical piece. No timber grain, board seams, unsupported chamfered feet or floating plinth.

### CF-FURNITURE

Construct the named table/bench from a 0.04 m board top, 0.05 m grounded legs and 0.04 m apron inside its existing box. A framed trestle has two grounded legs and one bearing head. Slatted boxes retain visible 0.02 m gaps and a 0.03 m frame; lidded boxes have a 0.01 m lid rebate. Assign timber grain to each member, not the compound bounding box. Do not ship a solid furniture cube.

### CF-DYE-VESSEL

The existing rounded dye vessel is an open sample-preparation container: broad mouth, real inner wall, 0.018 m rim and a contained dark dye surface 0.04 m below it. A narrow low-contrast residue band stays inside the bowl. The lidded companion remains closed. Preserve both boxes; no invented floor spill or bulk-heating installation.

### CF-ROLLED-CLOTH

A rolled bolt has an axial weave, visible cloth roll at the end and a bound outer edge within its existing box. A packing bale has compressed layered folds and two 0.018 m cloth binding bands; bands and knot sit inside the printed silhouette. Keep the exact stock count; do not use cylinder caps or beveled cubes as finished cloth.

### CF-SHELF

A shelf is a 0.04 m board at the top of its printed compound box, with two 0.025 m timber/iron brackets 0.12 m inside its ends. Brackets descend 0.16 m and bear against the rear wall. The expanded box includes the brackets; it is not a thick slab. Grain follows the shelf length; the stock remains at its existing top elevation.

### CF-MORTAR

The named mortar has a real concave bowl and a rounded pestle seated against its inner wall. Keep the bowl rim 0.015 m; the pestle length is at most 0.70 of the box height and diameter 0.03 m, wholly inside the combined box. It is neither a sealed jar nor a separate floating stick.

### CF-R4-PORTAL

Use opening.architecturalDetail. The stated surroundWidthM is measured outward from the actual curved/rectangular aperture. Carved timber portals have two nested frame bands, each 0.035 m wide separated by 0.012 m, a continuous meeting stile and the exact opening.architecturalDetail.carving running-lozenge incision on the outer jambs; the head keeps continuous nested bands. Dressed stone portals have a continuous 0.028 m bead, a 0.012 m recessed band and coherent arch stones; do not construct disconnected trim cubes. Receiving doors use 0.18 m boards, 0.002 m seams, two 0.04 m dark iron straps per leaf and one central latch. Painted domestic doors have a dressed head and raised panel rails. Trim has real jamb bearings; never squeeze it against a building corner.

### CF-R4-GLASS

Glazing occupies only the exact glazingProfile.fromZM..opening.headM area, clipped to each actual arch/light. Use 0.045 m timber or plaster webs and 0.006 m pane thickness. A two-column diamond subdivision per light gives pale glass with one amber and one blue-green accent; plaster-tracery uses three related arched cells with substantial webs. Palette order is fixed, not randomized. Lower shutters remain timber unless the whole opening is explicitly fixedInfill. Back every pane with the scheduled opaque receiver, use no emission/transmission or new view through the wall. Never fill a curved aperture with a colored rectangular decal.

### CF-R4-BALCONY

The named assembly supplies complete deck, joist, brace and balustrade dimensions. Keep the Dogleg deck at z=3.60, its lowest brace z=3.06 and front out=0.55. Both joists enter the wall; braces terminate on their underside. Plain vertical balusters have 0.025 m thickness at 0.14 m pitch, with 0.07 m rails/posts and closed side returns. Upper doors are shut; no playable access or new collider. This assembly has no B star screen, rug or added canopy.

## Material and export bindings

**scope:** Selected R6 source recipes. Reuse one material per source/formula/PBR/shadow class and owner vertex paints; preserve old runtime and source assets until area construction.

**paintFormula:** Convert paint and source albedo from sRGB to linear exactly once. BaseColor = paintLinear * ((1-grainMix) + grainMix*sourceAlbedoLinear). This is a painted finish with retained scan grain, not emission or a global exposure adjustment. Vertex colors are white except explicitly authored local accents. Avoid the old full-strength dark-scan-times-paint multiplication.

### warmTimber

```json
{
  "sourceMaterialId": "ph_bz04_weathered_brown_planks",
  "exportName": "bz04_craft_warm_timber",
  "paintSrgb": "#9c8060",
  "grainMix": 0.28,
  "metalness": 0,
  "roughness": 0.86,
  "normalScale": 0.18,
  "use": "Replace this new R4 timber batch on structural joinery, doors and ordinary shutters. Member grain follows its length."
}
```

### iron

```json
{
  "sourceMaterialId": "ph_bz04_rusty_metal_02",
  "exportName": "bz04_craft_dark_iron",
  "paintSrgb": "#56534b",
  "grainMix": 0.12,
  "metalness": 0.15,
  "roughness": 0.86,
  "normalScale": 0.12,
  "use": "Replace the new R4 hardware batch. Scanned oxide gives close grain; straps must not become bright masonry-like strips."
}
```

### cloth

```json
{
  "sourceMaterialIds": [
    "ph_bz04_hessian_230",
    "ph_bz04_fine_linen"
  ],
  "exportNameRule": "One neutral weave texture/material per source/PBR/shadow class; all owner and stock colors are calibrated vertex colors.",
  "paintSrgb": null,
  "grainMix": 0.12,
  "metalness": 0,
  "roughness": 0.94,
  "normalScale": 0.18,
  "use": "Cream shade and linen. Existing scan weave remains at its physical scale. Colored bound edges use the per-instance hem tint with this same formula.",
  "roughnessMode": "ARM green multiplied by0.94",
  "repeatM": 0.27,
  "baseColor": "#ffffff",
  "vertexPaintRecipe": {
    "mode": "neutral-grain-with-calibrated-vertex-paint",
    "baseColorFactor": "#ffffff",
    "baseTexture": "Bake G=(1-grainMix)+grainMix*linearSourceLuminance as neutral gray; weights0.2126,0.7152,0.0722; encode sRGB once. Do not bake cream/rust into this shared texture.",
    "grainMix": 0.12,
    "representativeNeutralGrainLinear": 0.9054704308536836,
    "vertexFormula": "COLOR_0.rgb=decodeSrgb(desired stock/hem color)/representativeNeutralGrainLinear. glTF material base factor is white. Final=neutralGrainLinear*COLOR_0. No second beige/cream tint.",
    "defaultDesiredSrgb": "#dfcfab",
    "stockRule": "Use existing stockColorSrgb and hem color as desired appearance; solve one calibrated vertex color per existing part. No new material per color.",
    "check": "All selected vertex components must remain <=1; fail rather than silently clamp."
  }
}
```

### ceramic

```json
{
  "replacesExportName": "bz04_ceramic_project_original",
  "exportName": "bz04_craft_ceramic",
  "baseColor": "#ffffff",
  "metalness": 0,
  "roughness": 0.77,
  "use": "New R4 ceramic groups: existing desired stockColorSrgb values become linear vertex colors, not another multiplication by the old beige base. Retain one material batch and smooth normals; lid/rim breaks stay sharp."
}
```

**exportRecipe:** Non-cloth bounded profiles bake exact calibrated source/paint to area-owned sRGB albedo with white base and white default vertices. Cloth exports neutral gray grain with calibrated desired per-part COLOR_0 and white base. Preserve bz06_* and private B named materials through binding; no raw-pack rebind. Original source files unchanged; record formula and hashes. Explicit metallic and ARM-green roughness factors apply. Monolithic trim crops all maps exactly and mirrors tangent normal components per recipe.

**accentRecipe:** Cloth uses shared neutral-grain texture with calibrated desired stock/hem vertex colors on white base, following cloth.vertexPaintRecipe. Ceramics retain desired stock vertex colors on white base. Never multiply a cream bake by a stock color.

### opaqueTimber

```json
{
  "sourceMaterialId": "ph_bz04_rough_pine_door",
  "exportName": "bz04_craft_painted_timber",
  "grainMix": 0,
  "metalness": 0,
  "roughness": 0.86,
  "normalScale": 0.15,
  "use": "Authored teal/indigo painted joinery uses desired linear vertex color on a white base and the licensed normal/roughness maps. Multiple owner colors share one PBR/shadow batch.",
  "baseColorMode": "opaque-paint",
  "paintColorSource": "opening.finishPaintSrgb",
  "ownerPaletteSrgb": {
    "teal": "#5d9c8a",
    "indigo": "#53799f"
  },
  "roughnessMode": "Source ARM green multiplied by0.86; source metallic disconnected",
  "paintSrgbRole": "Desired opaque paint, grainMix0; retain assigned owner openings only."
}
```

### fixedGlass

```json
{
  "exportName": "bz04_r4_fixed_glass",
  "source": "Project-authored opaque glass finish",
  "baseColor": "#ffffff",
  "vertexColorSource": "opening.glazingProfile.paletteSrgb converted once to linear",
  "roughness": 0.32,
  "metalness": 0,
  "emission": 0,
  "transmission": 0,
  "backing": "Opaque scheduled recess back; no new transparency sorting or interior sightline."
}
```

### wallReceiver

```json
{
  "sourceMaterialField": "opening.closureMaterialId",
  "use": "Retain the owning plaster material and physical scale on the full recess back. Bench members use their separately named timber. Recess depth supplies the shade; no teal timber closure or painted fake door."
}
```

### surfaceRecipes

```json
{
  "ph_bz04_painted_plaster_warm": {
    "mode": "bounded-linear-source-paint",
    "desiredAppearanceSrgb": "#d8c4a0",
    "paintSrgb": "#fce8bf",
    "paintLinear": [
      0.9759319078969907,
      0.8080663901978523,
      0.5201984763525123
    ],
    "grainMix": 0.5,
    "formula": "paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once",
    "sourceFiles": {
      "albedo": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/painted_plaster_wall/painted_plaster_wall_diff_1k.jpg",
      "normal": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/painted_plaster_wall/painted_plaster_wall_nor_gl_1k.jpg",
      "arm": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/painted_plaster_wall/painted_plaster_wall_arm_1k.jpg"
    },
    "sourceHashes": {
      "albedo": "ec57d01d27651f483bc090d056b283ff50e7f9e0e2793f6eba5c49d49dc20307",
      "normal": "773161a02c4e3a8b975bd3adbfa5306c44d4658e5d8c3a6a4d66bd8477230109",
      "arm": "ec41a0b413679af0d7a50cda1c9429c7f9a658bfd3cf5df3f772faac04be6f28"
    },
    "exportName": "bz06_cream_plaster",
    "binding": "Bake calibrated base color into area-owned derived albedo during construction, export with white base factor and preserve this named binding. Never rebind it to raw pack albedo or apply tint twice."
  },
  "ph_bz04_beige_wall_002": {
    "mode": "bounded-linear-source-paint",
    "desiredAppearanceSrgb": "#d3bb93",
    "paintSrgb": "#f4dbb0",
    "paintLinear": [
      0.9014739814657824,
      0.7089028117412087,
      0.4348573119144994
    ],
    "grainMix": 0.5,
    "formula": "paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once",
    "sourceFiles": {
      "albedo": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/plastered_wall/plastered_wall_diff_1k.jpg",
      "normal": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/plastered_wall/plastered_wall_nor_gl_1k.jpg",
      "arm": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/plastered_wall/plastered_wall_arm_1k.jpg"
    },
    "sourceHashes": {
      "albedo": "73312ebb6eabc8e0a55addd8a82a8924bcd1e717b9488a887cc77f14b6ea554e",
      "normal": "504e1f7baf4b68714c64b6670e7954bebe99efe31c49f7ce5a2089e4b76023b5",
      "arm": "cd927f46fa85b7e5c1a9747b90258c505529d7347d5f4dd356ae0ed2bda34d4f"
    },
    "exportName": "bz06_sand_plaster",
    "binding": "Bake calibrated base color into area-owned derived albedo during construction, export with white base factor and preserve this named binding. Never rebind it to raw pack albedo or apply tint twice."
  },
  "ph_bz04_plastered_wall": {
    "mode": "bounded-linear-source-paint",
    "desiredAppearanceSrgb": "#ddd0b3",
    "paintSrgb": "#fdf1d4",
    "paintLinear": [
      0.9812088492707967,
      0.8804478356651972,
      0.6552866173193502
    ],
    "grainMix": 0.47422169068066733,
    "formula": "paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once",
    "sourceFiles": {
      "albedo": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/plastered_wall/plastered_wall_diff_1k.jpg",
      "normal": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/plastered_wall/plastered_wall_nor_gl_1k.jpg",
      "arm": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/plastered_wall/plastered_wall_arm_1k.jpg"
    },
    "sourceHashes": {
      "albedo": "73312ebb6eabc8e0a55addd8a82a8924bcd1e717b9488a887cc77f14b6ea554e",
      "normal": "504e1f7baf4b68714c64b6670e7954bebe99efe31c49f7ce5a2089e4b76023b5",
      "arm": "cd927f46fa85b7e5c1a9747b90258c505529d7347d5f4dd356ae0ed2bda34d4f"
    },
    "exportName": "bz06_pale_lime",
    "binding": "Bake calibrated base color into area-owned derived albedo during construction, export with white base factor and preserve this named binding. Never rebind it to raw pack albedo or apply tint twice."
  },
  "ph_bz04_aged_plaster_ochre": {
    "mode": "bounded-linear-source-paint",
    "desiredAppearanceSrgb": "#c6a16c",
    "paintSrgb": "#e5bd82",
    "paintLinear": [
      0.7814988083980416,
      0.5084248113955151,
      0.22350127106028497
    ],
    "grainMix": 0.5,
    "formula": "paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once",
    "sourceFiles": {
      "albedo": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/plastered_wall/plastered_wall_diff_1k.jpg",
      "normal": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/plastered_wall/plastered_wall_nor_gl_1k.jpg",
      "arm": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/plastered_wall/plastered_wall_arm_1k.jpg"
    },
    "sourceHashes": {
      "albedo": "73312ebb6eabc8e0a55addd8a82a8924bcd1e717b9488a887cc77f14b6ea554e",
      "normal": "504e1f7baf4b68714c64b6670e7954bebe99efe31c49f7ce5a2089e4b76023b5",
      "arm": "cd927f46fa85b7e5c1a9747b90258c505529d7347d5f4dd356ae0ed2bda34d4f"
    },
    "exportName": "bz06_faded_ochre",
    "binding": "Bake calibrated base color into area-owned derived albedo during construction, export with white base factor and preserve this named binding. Never rebind it to raw pack albedo or apply tint twice."
  },
  "ph_bz04_red_plaster_weathered": {
    "mode": "bounded-linear-source-paint",
    "desiredAppearanceSrgb": "#b77c62",
    "paintSrgb": "#dea183",
    "paintLinear": [
      0.7282053832884988,
      0.35496713337145963,
      0.2257058556419342
    ],
    "grainMix": 0.5,
    "formula": "paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once",
    "sourceFiles": {
      "albedo": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/red_plaster_weathered/red_plaster_weathered_diff_1k.jpg",
      "normal": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/red_plaster_weathered/red_plaster_weathered_nor_gl_1k.jpg",
      "arm": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/red_plaster_weathered/red_plaster_weathered_arm_1k.jpg"
    },
    "sourceHashes": {
      "albedo": "b49519d865609f137b1796114234183f512d936a51989b74a17a67b47d3bf668",
      "normal": "72ee053a5ea8a0e9c9a33bd6d84ab576cb218961c62f97b08804c3e19f824d5f",
      "arm": "4fed44ce160da630bc6f6e7793a264d5375ad4602bf0d87499ee96eb894b3b7d"
    },
    "exportName": "bz06_faded_earth_red",
    "binding": "Bake calibrated base color into area-owned derived albedo during construction, export with white base factor and preserve this named binding. Never rebind it to raw pack albedo or apply tint twice."
  },
  "ph_bz04_sandstone_blocks_05": {
    "mode": "bounded-linear-source-paint",
    "desiredAppearanceSrgb": "#bda985",
    "paintSrgb": "#eaddbb",
    "paintLinear": [
      0.8214550628297725,
      0.7220556851362163,
      0.4965705233480168
    ],
    "grainMix": 0.7,
    "formula": "paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once",
    "sourceFiles": {
      "albedo": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_diff_1k.jpg",
      "normal": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_nor_gl_1k.jpg",
      "arm": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_arm_1k.jpg"
    },
    "sourceHashes": {
      "albedo": "d17c322d9e793ab9fc198948a34f2632595560471ff8714f2b0e052bc75c9ee3",
      "normal": "ab42361855310d8de9b11470c6b21e512c9926decd5548dc9e9d72bd6cc06f3e",
      "arm": "6bc226c4985aee587db5995754069dc2f01f6295cc997db3ebbebc6a33578e4d"
    },
    "exportName": "bz06_dressed_sandstone",
    "binding": "Bake calibrated base color into area-owned derived albedo during construction, export with white base factor and preserve this named binding. Never rebind it to raw pack albedo or apply tint twice."
  },
  "ph_bz04_sandstone_blocks_06": {
    "mode": "bounded-linear-source-paint",
    "desiredAppearanceSrgb": "#b6a185",
    "paintSrgb": "#f9e7c9",
    "paintLinear": [
      0.946174958515037,
      0.7983868950319168,
      0.5872168732348412
    ],
    "grainMix": 0.6707432788190668,
    "formula": "paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once",
    "sourceFiles": {
      "albedo": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rustic_stone_wall_02/rustic_stone_wall_02_diff_1k.jpg",
      "normal": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rustic_stone_wall_02/rustic_stone_wall_02_nor_gl_1k.jpg",
      "arm": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rustic_stone_wall_02/rustic_stone_wall_02_arm_1k.jpg"
    },
    "sourceHashes": {
      "albedo": "a091e04d73ddf7485d1b99a66d6cfe270e9ba36cdc26f98dbc17934427e43bc9",
      "normal": "a7e5c96b8ba3ab3d066c673c4da9b1b7735f176ed6b6b2b9f74216fc151225f7",
      "arm": "119a2dd5a764d82396e1ea3736aff0c981295ab756847a0bc90d455c182cb411"
    },
    "exportName": "bz06_service_stone",
    "binding": "Bake calibrated base color into area-owned derived albedo during construction, export with white base factor and preserve this named binding. Never rebind it to raw pack albedo or apply tint twice."
  },
  "bz04_court_limestone_flags_01": {
    "mode": "bounded-linear-source-paint",
    "desiredAppearanceSrgb": "#baa47f",
    "paintSrgb": "#eedebd",
    "paintLinear": [
      0.8552869216232429,
      0.7317958404526851,
      0.5079860185422087
    ],
    "grainMix": 0.7,
    "formula": "paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once",
    "sourceFiles": {
      "albedo": "apps/client/public/assets/textures/environment/bazaar/floors/bazaar_floor_textures_pack_v4/court_flagstone_01/court_flagstone_01_diff_1k.jpg",
      "normal": "apps/client/public/assets/textures/environment/bazaar/floors/bazaar_floor_textures_pack_v4/court_flagstone_01/court_flagstone_01_nor_gl_1k.jpg",
      "arm": "apps/client/public/assets/textures/environment/bazaar/floors/bazaar_floor_textures_pack_v4/court_flagstone_01/court_flagstone_01_arm_1k.jpg"
    },
    "sourceHashes": {
      "albedo": "8d2458db374992bef26044610895f7bbf2acfdbbbcaa98cbacbc0ca2e168b7f1",
      "normal": "c73e302b6ffacf5f28dece4d40acfeca854933980e661968e255de4ee07bb283",
      "arm": "93272f7bb1013e7655678aef81ea21382ffce57e66f3641ce7ef3eab1e86cfb8"
    },
    "exportName": "bz06_quiet_flags",
    "binding": "Bake calibrated base color into area-owned derived albedo during construction, export with white base factor and preserve this named binding. Never rebind it to raw pack albedo or apply tint twice."
  },
  "bz04_large_sandstone_blocks_01": {
    "mode": "bounded-linear-source-paint",
    "desiredAppearanceSrgb": "#b29972",
    "paintSrgb": "#e5d8b0",
    "paintLinear": [
      0.7803693662498348,
      0.6862490137981643,
      0.4364997362754391
    ],
    "grainMix": 0.7,
    "formula": "paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once",
    "sourceFiles": {
      "albedo": "apps/client/public/assets/textures/environment/bazaar/floors/bazaar_floor_textures_pack_v4/medieval_blocks_05/medieval_blocks_05_diff_1k.jpg",
      "normal": "apps/client/public/assets/textures/environment/bazaar/floors/bazaar_floor_textures_pack_v4/medieval_blocks_05/medieval_blocks_05_nor_gl_1k.jpg",
      "arm": "apps/client/public/assets/textures/environment/bazaar/floors/bazaar_floor_textures_pack_v4/medieval_blocks_05/medieval_blocks_05_arm_1k.jpg"
    },
    "sourceHashes": {
      "albedo": "b378f21aee692b297a84c6cb6e2c09c2149f192cb93ae7dc14436013c8d3c29f",
      "normal": "b117c89f83372724d409c9d921fa1c8e0f488867ab4029dd98ed20cbce22c18d",
      "arm": "f6217220ec9a33014f17d8e5bd33c92e28e2ec8ccb191cf9a2082d7485bb54b2"
    },
    "exportName": "bz06_rough_service_paving",
    "binding": "Bake calibrated base color into area-owned derived albedo during construction, export with white base factor and preserve this named binding. Never rebind it to raw pack albedo or apply tint twice."
  },
  "ph_bz04_hessian_230": {
    "mode": "neutral-grain-with-calibrated-vertex-paint",
    "desiredAppearanceSrgb": "#dfcfab",
    "paintSrgb": "#e9d8b3",
    "paintLinear": [
      0.8149469973050627,
      0.689100792708164,
      0.4497553956762431
    ],
    "grainMix": 0.12,
    "formula": "Final=neutralGrainLinear*calibratedVertexPaintLinear; neutral grain contains no cream/rust tint. Base factor white.",
    "sourceFiles": {
      "albedo": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/hessian_230/hessian_230_diff_1k.jpg",
      "normal": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/hessian_230/hessian_230_nor_gl_1k.jpg",
      "arm": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/hessian_230/hessian_230_arm_1k.jpg"
    },
    "sourceHashes": {
      "albedo": "ef9ac1a0129b6d0f44b6d5beb68db7be7a0adf11e09fe52fd2cdc9370b27d4ba",
      "normal": "6d5a6d23c880dbaae98477ed33dbd5d7c0eeda910a39319aec2d0014892974aa",
      "arm": "963ba03b3583a9dcc3a10181a9042de63aec019ee1a8a89c8be77d33a2f6b691"
    },
    "exportName": "bz06_cream_woven_cloth",
    "binding": "Preserve neutral-grain derived texture and calibrated COLOR_0. Base factor white; no additional source/cream/stock multiplication.",
    "vertexPaintRecipe": {
      "mode": "neutral-grain-with-calibrated-vertex-paint",
      "baseColorFactor": "#ffffff",
      "baseTexture": "Bake G=(1-grainMix)+grainMix*linearSourceLuminance as neutral gray; weights0.2126,0.7152,0.0722; encode sRGB once. Do not bake cream/rust into this shared texture.",
      "grainMix": 0.12,
      "representativeNeutralGrainLinear": 0.9054704308536836,
      "vertexFormula": "COLOR_0.rgb=decodeSrgb(desired stock/hem color)/representativeNeutralGrainLinear. glTF material base factor is white. Final=neutralGrainLinear*COLOR_0. No second beige/cream tint.",
      "defaultDesiredSrgb": "#dfcfab",
      "stockRule": "Use existing stockColorSrgb and hem color as desired appearance; solve one calibrated vertex color per existing part. No new material per color.",
      "check": "All selected vertex components must remain <=1; fail rather than silently clamp."
    }
  },
  "ph_bz04_fine_linen": {
    "mode": "neutral-grain-with-calibrated-vertex-paint",
    "desiredAppearanceSrgb": "#dfcfab",
    "paintSrgb": "#e9d8b3",
    "paintLinear": [
      0.8149469973050627,
      0.689100792708164,
      0.4497553956762431
    ],
    "grainMix": 0.12,
    "formula": "Final=neutralGrainLinear*calibratedVertexPaintLinear; neutral grain contains no cream/rust tint. Base factor white.",
    "sourceFiles": {
      "albedo": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/hessian_230/hessian_230_diff_1k.jpg",
      "normal": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/hessian_230/hessian_230_nor_gl_1k.jpg",
      "arm": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/hessian_230/hessian_230_arm_1k.jpg"
    },
    "sourceHashes": {
      "albedo": "ef9ac1a0129b6d0f44b6d5beb68db7be7a0adf11e09fe52fd2cdc9370b27d4ba",
      "normal": "6d5a6d23c880dbaae98477ed33dbd5d7c0eeda910a39319aec2d0014892974aa",
      "arm": "963ba03b3583a9dcc3a10181a9042de63aec019ee1a8a89c8be77d33a2f6b691"
    },
    "exportName": "bz06_fine_linen",
    "binding": "Preserve neutral-grain derived texture and calibrated COLOR_0. Base factor white; no additional source/cream/stock multiplication.",
    "vertexPaintRecipe": {
      "mode": "neutral-grain-with-calibrated-vertex-paint",
      "baseColorFactor": "#ffffff",
      "baseTexture": "Bake G=(1-grainMix)+grainMix*linearSourceLuminance as neutral gray; weights0.2126,0.7152,0.0722; encode sRGB once. Do not bake cream/rust into this shared texture.",
      "grainMix": 0.12,
      "representativeNeutralGrainLinear": 0.9054704308536836,
      "vertexFormula": "COLOR_0.rgb=decodeSrgb(desired stock/hem color)/representativeNeutralGrainLinear. glTF material base factor is white. Final=neutralGrainLinear*COLOR_0. No second beige/cream tint.",
      "defaultDesiredSrgb": "#dfcfab",
      "stockRule": "Use existing stockColorSrgb and hem color as desired appearance; solve one calibrated vertex color per existing part. No new material per color.",
      "check": "All selected vertex components must remain <=1; fail rather than silently clamp."
    }
  },
  "ph_bz04_trim_sanded_01": {
    "mode": "crop-mirror-bounded-linear-source-paint",
    "desiredAppearanceSrgb": "#c5b18d",
    "paintSrgb": "#dccba5",
    "paintLinear": [
      0.7175869406315156,
      0.5951917042797605,
      0.3778628251105845
    ],
    "grainMix": 0.4,
    "formula": "Crop and normal-correct mirror first; paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear). Bake sRGB output once.",
    "sourceFiles": {
      "albedo": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_diff_1k.jpg",
      "normal": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_nor_gl_1k.jpg",
      "arm": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_arm_1k.jpg"
    },
    "sourceHashes": {
      "albedo": "d17c322d9e793ab9fc198948a34f2632595560471ff8714f2b0e052bc75c9ee3",
      "normal": "ab42361855310d8de9b11470c6b21e512c9926decd5548dc9e9d72bd6cc06f3e",
      "arm": "6bc226c4985aee587db5995754069dc2f01f6295cc997db3ebbebc6a33578e4d"
    },
    "exportName": "bz06_monolithic_stone_trim",
    "binding": "Preserve derived monolithic trim maps and white export base factor. Crop recipe takes precedence over original whole-wall textures."
  }
}
```

### fineLinen

```json
{
  "sourceMaterialId": "ph_bz04_fine_linen",
  "sourceScanMaterialId": "ph_hessian_230",
  "repeatM": 0.09,
  "normalScale": 0.1,
  "metalness": 0,
  "roughness": 0.94,
  "roughnessMode": "ARM green multiplied by0.94",
  "paintSrgb": null,
  "grainMix": 0.12,
  "use": "Tea/domestic cushions and linen; no leather texture or seam. Existing source weave at one third shade scale.",
  "vertexPaintRecipe": {
    "mode": "neutral-grain-with-calibrated-vertex-paint",
    "baseColorFactor": "#ffffff",
    "baseTexture": "Bake G=(1-grainMix)+grainMix*linearSourceLuminance as neutral gray; weights0.2126,0.7152,0.0722; encode sRGB once. Do not bake cream/rust into this shared texture.",
    "grainMix": 0.12,
    "representativeNeutralGrainLinear": 0.9054704308536836,
    "vertexFormula": "COLOR_0.rgb=decodeSrgb(desired stock/hem color)/representativeNeutralGrainLinear. glTF material base factor is white. Final=neutralGrainLinear*COLOR_0. No second beige/cream tint.",
    "defaultDesiredSrgb": "#dfcfab",
    "stockRule": "Use existing stockColorSrgb and hem color as desired appearance; solve one calibrated vertex color per existing part. No new material per color.",
    "check": "All selected vertex components must remain <=1; fail rather than silently clamp."
  }
}
```

### monolithicStoneTrim

```json
{
  "materialId": "ph_bz04_trim_sanded_01",
  "sourceMaterialId": "ph_bz04_sandstone_blocks_05",
  "sourcePixelCropXYXY": [
    340,
    195,
    740,
    290
  ],
  "sourceImageSizePx": [
    1024,
    1024
  ],
  "cropWorldSizeM": [
    0.78125,
    0.185546875
  ],
  "mirrorTileWorldSizeM": [
    1.5625,
    0.37109375
  ],
  "recipe": "Crop each original map identically; mirror 2x2 in X/Y. For mirrored tangent normal maps invert red on X mirror and green on Y mirror. Preserve originals. Orient crop X along trim member, Y across its face; do not stretch a wall image across sill.",
  "albedoPaintSrgb": "#dccba5",
  "albedoPaintLinear": [
    0.7175869406315156,
    0.5951917042797605,
    0.3778628251105845
  ],
  "grainMix": 0.4,
  "desiredAppearanceSrgb": "#c5b18d",
  "roughness": 0.94,
  "roughnessMode": "ARM green times scalar",
  "metalness": 0,
  "normalScale": 0.12,
  "scope": "Monolithic sills, threshold caps and single-piece trim faces only. Masonry arch rings retain coherent voussoir courses/joints; no mortar-free whole-ring override.",
  "sampleFiles": {
    "albedo": "artifacts/bazaar-material-review/r6-samples/trim-albedo.png",
    "normal": "artifacts/bazaar-material-review/r6-samples/trim-normal.png",
    "arm": "artifacts/bazaar-material-review/r6-samples/trim-arm.png"
  },
  "sourceFiles": {
    "albedo": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_diff_1k.jpg",
    "normal": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_nor_gl_1k.jpg",
    "arm": "apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05/sandstone_blocks_05_arm_1k.jpg"
  },
  "sourceHashes": {
    "albedo": "d17c322d9e793ab9fc198948a34f2632595560471ff8714f2b0e052bc75c9ee3",
    "normal": "ab42361855310d8de9b11470c6b21e512c9926decd5548dc9e9d72bd6cc06f3e",
    "arm": "6bc226c4985aee587db5995754069dc2f01f6295cc997db3ebbebc6a33578e4d"
  },
  "exportName": "bz06_monolithic_stone_trim"
}
```

**sourceToExportAndShadow:** [{'family': 'cream-plaster', 'targetMaterialId': 'ph_bz04_painted_plaster_warm', 'sourceMaterialId': 'ph_painted_plaster_warm', 'exportName': 'bz06_cream_plaster', 'shadowClass': 'Retain owning area shadowSchedule; no extra material per shadow receiver or wear patch'}, {'family': 'sand-plaster', 'targetMaterialId': 'ph_bz04_beige_wall_002', 'sourceMaterialId': 'ph_plastered_wall', 'exportName': 'bz06_sand_plaster', 'shadowClass': 'Retain owning area shadowSchedule; no extra material per shadow receiver or wear patch'}, {'family': 'pale-lime', 'targetMaterialId': 'ph_bz04_plastered_wall', 'sourceMaterialId': 'ph_plastered_wall', 'exportName': 'bz06_pale_lime', 'shadowClass': 'Retain owning area shadowSchedule; no extra material per shadow receiver or wear patch'}, {'family': 'faded-ochre', 'targetMaterialId': 'ph_bz04_aged_plaster_ochre', 'sourceMaterialId': 'ph_aged_plaster_ochre', 'exportName': 'bz06_faded_ochre', 'shadowClass': 'Retain owning area shadowSchedule; no extra material per shadow receiver or wear patch'}, {'family': 'faded-earth-red', 'targetMaterialId': 'ph_bz04_red_plaster_weathered', 'sourceMaterialId': 'ph_red_plaster_weathered', 'exportName': 'bz06_faded_earth_red', 'shadowClass': 'Retain owning area shadowSchedule; no extra material per shadow receiver or wear patch'}, {'family': 'dressed-sandstone', 'targetMaterialId': 'ph_bz04_sandstone_blocks_05', 'sourceMaterialId': 'ph_sandstone_blocks_05', 'exportName': 'bz06_dressed_sandstone', 'shadowClass': 'Retain owning area shadowSchedule; no extra material per shadow receiver or wear patch'}, {'family': 'service-stone', 'targetMaterialId': 'ph_bz04_sandstone_blocks_06', 'sourceMaterialId': 'ph_sandstone_blocks_06', 'exportName': 'bz06_service_stone', 'shadowClass': 'Retain owning area shadowSchedule; no extra material per shadow receiver or wear patch'}, {'family': 'quiet-flags', 'targetMaterialId': 'bz04_court_limestone_flags_01', 'sourceMaterialId': 'court_limestone_flags_01', 'exportName': 'bz06_quiet_flags', 'shadowClass': 'Retain owning area shadowSchedule; no extra material per shadow receiver or wear patch'}, {'family': 'rough-service-paving', 'targetMaterialId': 'bz04_large_sandstone_blocks_01', 'sourceMaterialId': 'large_sandstone_blocks_01', 'exportName': 'bz06_rough_service_paving', 'shadowClass': 'Retain owning area shadowSchedule; no extra material per shadow receiver or wear patch'}, {'family': 'cream-woven-cloth', 'targetMaterialId': 'ph_bz04_hessian_230', 'sourceMaterialId': 'ph_hessian_230', 'exportName': 'bz06_cream_woven_cloth', 'shadowClass': 'Retain owning area shadowSchedule; no extra material per shadow receiver or wear patch'}, {'family': 'fine-linen', 'targetMaterialId': 'ph_bz04_fine_linen', 'sourceMaterialId': 'ph_hessian_230', 'exportName': 'bz06_fine_linen', 'shadowClass': 'Retain owning area shadowSchedule; no extra material per shadow receiver or wear patch'}, {'family': 'monolithic-stone-trim', 'targetMaterialId': 'ph_bz04_trim_sanded_01', 'sourceMaterialId': 'ph_sandstone_blocks_05', 'exportName': 'bz06_monolithic_stone_trim', 'shadowClass': 'Retain owning opening trim shadow class; crop adds no geometry/material per sill.'}]

## Whole-view composition by area

| Area | Primary | Supporting | Quiet fields |
|---|---|---|---|
| [SPAWN_A_COURTYARD](unit-spawn-a-courtyard.md) | Carved ceremonial entrance and a broad registry-room window | Plain related office windows, one central archive vent and the shaded household seat | North return walls belong to the Spice buildings; the open north route remains the route, not a decorative gateway. |
| [SPICE_STREET](unit-spice-street.md) | Spice merchant workfront and broad living-room shutter | Related plain windows and concentrated storage ventilation; no repeated colored-glass pair | Keep two existing overhead cloth spans and their daylight gaps; no new street gate or loose floor stock. |
| [FOUNTAIN_COURT](unit-fountain-court.md) | Guildhall entrance and fixed hall light | Merchant loggia, reception and entrance-side room stacks coordinated with the Souk reverse | Quiet corner returns inherit their buildings; do not pattern every upper window or fill the court with props. |
| [TEXTILE_ARCADE](unit-textile-arcade.md) | One continuous production building with three useful workrooms | One broad central showroom shutter; coordinated merchant rooms opposite; no miniature stair-slot grid | Three drafting parcels on a side are one building. Keep a coherent material/floor system and the protected clear route. |
| [RUG_GATE](unit-rug-gate.md) | Existing large gateway and carved rug-gallery workfront | Plain gatekeeper house and finished rug display | Do not compete with B’s merchant balcony or deepen the narrow stock gallery. |
| [SPAWN_B_COURTYARD](unit-spawn-b-courtyard.md) | Retained merchant balcony and its related upper timber-and-glass pair | Segmental work/guest windows and crafted entrance surrounds | Refine the hoist mounting and loading story; do not restart the window-motif cycle. |
| [SERVICE_SOUTH](unit-service-south.md) | Receiving doors and high working light | Two low warehouse fronts use robust planks, dark straps, clean thresholds and consistent high vents. | No new shop, decorative canopy, stock pile or route obstruction. |
| [CARAVAN_COURT](unit-caravan-court.md) | A grounded receiving entrance and lower store roofline | Packing activity and the enclosed court edges; no palm or new planting obstacle | Keep the full courtyard breathing room and existing cover. No decorative warehouse windows or freestanding carts. |
| [SERVICE_NORTH](unit-service-north.md) | Practical delivery and dry-stock fronts | Wider receiving doors, high upper vents and real masonry/coping joints distinguish stores from homes. | The opposite grade spine is a retaining/service enclosure, not a blank house to decorate. |
| [TEA_RAMP](unit-tea-terrace.md) | Continuous grade and a visible terrace destination | The textile building’s rear and retaining spine meet the actual ramp profile. | No false level thresholds or decorations on the slope; floor and wall contact are the detail. |
| [TEA_TERRACE](unit-tea-terrace.md) | A horizontal timber sitting gallery above tea service and seat | Broad upper room window aligned with the gallery, with one separate side room | Preserve opening head z=4.10 and ceiling 4.28. No new lintel, shelf or hardware through that tight clearance. |
| [TEA_STAIRS](unit-tea-terrace.md) | Legible stair run and turn | Stone base, coping, tread contact and the nearby merchant return share their measured interfaces. | No added door, pot, rail or stock on protected treads. |
| [TEA_LANDING](unit-tea-terrace.md) | The exact open mouths and safe turning space | Returns inherit the same materials and roof edges as their owner buildings. | Keep the landing empty; no invented frontage or new elevation. |
| [DYERS_ALLEY](unit-dyers-alley.md) | A broad preparation-room light above the receiving entrance | Plain domestic windows, sample workfronts and fewer purposeful clerestories | Drying samples stay on their supported frames. Wear follows vessels and handling, not arbitrary wall grunge. |
| [COVERED_SOUK](unit-covered-souk.md) | Larger central rug-showroom bay and related upper daylight | Smaller flanking workfronts and corrected merchant-house corner margins | Daylight breaks and routes stay legible. No extra continuous dark roof or cloned display cabinets. |
| [DYERS_DOGLEG](unit-dyers-dogleg.md) | The centered domestic entrance and simple supported balcony | A plain closed upper door, quiet side rooms and a working annex; no repeated colored glass | Keep drying samples in the serviceable workfront. The former high crossing line is omitted rather than inventing a loading balcony or a speculative hauling mechanism. |
| [NORTH_COURT](unit-north-court.md) | Hammam entrance and a coherent neighboring household | Two upper domestic stacks, fewer drying vents and an actual finishing workfront | Do not imply a full bathhouse in the small pavilion, add a dome, or decorate every north wall. |
| [LINK_WEST_MID](links.md) | Fountain-to-caravan transition | Guildhall and service-house corners retain their own materials, heights and correct coping ends. | Keep both approaches and the protected mouth readable. |
| [LINK_EAST_MID](links.md) | Fountain-to-souk transition | Merchant/loggia and corner-house returns share their actual floor and wall finish. | No decorative gate or added room in the connector. |
| [LINK_WEST_UPPER](links.md) | Tea landing to Rug Gate throat | The narrow merchant gallery return meets its exact roof/coping and stair-side receiver. | Keep the 2 m-wide passage free; no rug or prop used to hide an interface. |
| [LINK_EAST_UPPER](links.md) | Covered trade route to North Court | Textile, gatekeeper and bathhouse-store returns keep real ownership at their joints. | No cloned screens on blind boundary fields. |
| [LINK_SOUTH_WEST](links.md) | Open connection between A and service stores | Continue the actual loading-store/house bases and close the exposed end returns. | No new openings or dressing in the connector. |
| [LINK_SOUTH_EAST](links.md) | Open connection into dye works | Wet-work material bases turn the corner without a repeated false shopfront. | No low hanging line, new post or material curb. |
| [LINK_NORTH_WEST](links.md) | B courtyard to northern service route | The B guest-house return meets the low service boundary and grade honestly. | Preserve the open mouth; no added bench or curtain. |
| [LINK_NORTH_EAST](links.md) | B courtyard to North Court | Receiving-store and gatekeeper returns frame the opening with their actual material and roof ownership. | No loose stock or false frontage inside the link. |

## Required design review

The user requires a dedicated window-design subagent to review and record a decision for each of the 100 zone faces on the frozen R5 source and final drawings. A quiet or zero-build face needs an explicit reason. These are design decisions, not user art acceptance or repeated implementation gates.

## Common-sense placement review

For every visible assembly, trace ground contact, receiving wall, approach and support to an actual source location. Inspect a perspective or section when elevation overlaps can misrepresent depth. Do not accept a hidden root, a material label, or a plausible use paragraph as proof of good placement. Remove a feature that cannot fit without changing gameplay.


## Boundary, background, performance and execution limits

All 100 faces retain a stated role. Open transitions stay open; service and retaining walls are finished boundaries, not fictitious buildings needing windows. The face/parcel schedule owns geometry and grade.

Keep the existing 15 named background targets as a coordinated distant-house family with their authored footprints, stepped heights, window rows and quiet rear faces. Repetition is appropriate at this depth; do not copy foreground balconies or trade displays onto them. Complete roof/side closures, source material scale and reverse-view silhouette still matter. Reuse the installed shared environment when its exact source/hash and interfaces remain compatible; no texture compression or fog/exposure trick substitutes for finish.

Existing per-area triangle/material/primitive limits remain, including the user-authorized B64,000 cap/56,000 working target. Aim for at most 90 percent of each other area cap; finish replaces redundant topology rather than adding unlimited parts. Reuse material/shape families, batch by material/shadow class and preserve actual screen voids. No source polygon count, document pass or AI approval proves runtime quality.

Implement the frozen, wall-reviewed area in one continuous pass. Reuse tools and assets, review the completed implementation once, then correct concrete defects. The 100-face design review is not repeated during construction.

Complete-building plans and sections remain in [the building catalog](building-catalog.md). Area plans/elevations show every face. Per-area roof receiver lists distinguish the completed-map target from what a standalone build can safely install. Existing review manifests and trial images are historical evidence, not R5 visual acceptance.

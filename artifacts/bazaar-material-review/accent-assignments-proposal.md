# Exact proposed accent assignments

Proposal only. Preserve current R5 geometry and stock. Exact assignments below supersede the generic example teal/indigo targets in the earlier palette proposal: retaining the existing slightly faded owner paints is the smaller, more coherent decision.

## Joinery

| Owning building | Proposed paint | Existing opening IDs |
|---|---|---|
| `BLD_A_GATE` | `#8f775d` retained | `A_S_GATE-PRINCIPAL`, `A_S_GATE-L1-W1`, `A_S_GATE-L1-W2`, `A_S_GATE-L1-W3`, `A_S_GATE-L2-W2` |
| `BLD_A_DOMESTIC_REAR` | `#78978d` retained | `A_W_SOUTH-L1-W1`, `A_W_SOUTH-L2-W1`, `A_W_MID-ENTRANCE`, `A_W_MID-L1-W1`, `A_W_MID-L2-W1` |
| `BLD_B_W_HOUSE` | `#78978d` retained | `B_W_HOUSE-DOOR`, `B_W_HOUSE-ground-0`, `B_W_HOUSE-ground-1`, `B_W_HOUSE-L1-B1`, `B_W_HOUSE-L1-B2`, `B_W_HOUSE-L2-B1`, `B_W_HOUSE-L2-B2` |
| `BLD_DOGLEG_EAST_HOUSE` | `#66778c` retained | `dd-e-ENTRANCE`, `dd-e-L1-W1`, `dd-e-L1-W2`, `dd-e-L1-W3`, `dd-e-GROUND-ROOM-0`, `dd-e-GROUND-ROOM-2` |
| `BLD_NORTH_EAST_HOUSE` | `#78978d` retained | `nc-eh-ENTRANCE`, `nc-eh-L1-W1`, `nc-eh-L1-W3`, `nc-eh-L2-W1`, `nc-eh-L2-W3`, `nc-eh-GROUND-ROOM-0`, `nc-eh-GROUND-ROOM-2` |

Every other timber opening retains its exact R5 `#9c8060` warm timber assignment. The JSON enumerates all 247 timber opening rows and their owner, receiver and source binding. Blind plaster panels are excluded from the joinery list. Retain B private material bindings, existing fixed glass palettes, structural timber and counter colors. Teal belongs to the A quiet household, B guest house and North Court family house; indigo belongs to the Dogleg household. Service/store doors remain warm timber.

## Existing shades

| Fixture | Proposed cloth field | Reason |
|---|---|---|
| `R4-SHADE-A_W_SEAT` | `#dfcfab` | Keep the existing cream shade hierarchy; trade stock and assigned joinery carry the local color. |
| `SHADE_S_W_SHOP_1` | `#ae654c` | The first spice retailer owns this existing small working shade; one muted rust cloth field echoes the founding reference and signals its spice counter. Keep its neighboring grain/apothecary shades and both overhead spans cream. |
| `SHADE_S_W_SHOP_2` | `#dfcfab` | Keep the existing cream shade hierarchy; trade stock and assigned joinery carry the local color. |
| `SHADE_S_W_SHOP_3` | `#dfcfab` | Keep the existing cream shade hierarchy; trade stock and assigned joinery carry the local color. |
| `CANOPY_SPICE_S` | `#dfcfab` | Keep the existing cream shade hierarchy; trade stock and assigned joinery carry the local color. |
| `CANOPY_SPICE_N` | `#dfcfab` | Keep the existing cream shade hierarchy; trade stock and assigned joinery carry the local color. |
| `CANOPY_TEXTILE` | `#dfcfab` | Keep the existing cream shade hierarchy; trade stock and assigned joinery carry the local color. |
| `SHADE_R_W_SHOP` | `#dfcfab` | Keep cream: the displayed rug already supplies rust/teal/indigo beneath the large gateway; a second painted shade would compete with those existing focal elements and repeat the Spice cue. |
| `SHADE_B_N_POTTER` | `#dfcfab` | Keep the existing cream shade hierarchy; trade stock and assigned joinery carry the local color. |
| `SHADE_B_N_TEXTILE` | `#dfcfab` | Keep the existing cream shade hierarchy; trade stock and assigned joinery carry the local color. |
| `SHADE_B_W_TEA` | `#dfcfab` | Keep the existing cream shade hierarchy; trade stock and assigned joinery carry the local color. |
| `SHADE_tt-shop` | `#dfcfab` | Keep the existing cream shade hierarchy; trade stock and assigned joinery carry the local color. |
| `R4-SHADE-TT-RECESSED-SEAT` | `#dfcfab` | Keep the existing cream shade hierarchy; trade stock and assigned joinery carry the local color. |
| `SHADE_DA_E_WORK_RECESS` | `#dfcfab` | Keep the existing cream shade hierarchy; trade stock and assigned joinery carry the local color. |
| `CANOPY_SOUK_S` | `#dfcfab` | Keep the existing cream shade hierarchy; trade stock and assigned joinery carry the local color. |
| `CANOPY_SOUK_N` | `#dfcfab` | Keep the existing cream shade hierarchy; trade stock and assigned joinery carry the local color. |

Only `SHADE_S_W_SHOP_1`, on `S_W_SOUTH` serving `S_W_SHOP_1` in `BLD_A_SPICE_WEST`, changes its cloth field to proposed muted rust. This keeps the exact existing shade and support count. The rust marks the spice retailer and recalls the founding image; it is not a requirement for one colored canopy per district. Keep the other two Spice shop shades and both overhead spans cream.

Do not recolor `SHADE_R_W_SHOP` teal in this proposal. Its existing rug stock and carved gallery/gateway already carry the focus; cream leaves those goods visible and avoids a second competing color layer beside B. Keep both Tea shades cream so tea service and the occupied gallery read together. Cream values are desired output appearances, not direct shader multipliers. Existing hem colors remain exact.

All 80 located `stockColorSrgb` entries are enumerated by source path in JSON and retained exactly. This includes the existing color rhythm in textile goods and ceramics. Rugs remain unmodified. No extra colored goods are proposed.

## Reuse versus replacement

| Family | Source status | Condition |
|---|---|---|
| cream/sand/pale-lime walls | Existing sources reusable | Use the inspected existing plaster to replace the dark beige or over-mottled white-plaster source; exact alias/profile application awaits approval. |
| ochre/red plaster | Existing sources reusable | Reuse current scanned sources with calibrated color; no red/ochre spread beyond named owner wall proposal. |
| masonry walls | Existing sources reusable | Existing scans acceptable for stated dressed/service roles; rustic stacked-stone appearance remains a full-wall sample concern. |
| one-piece stone trim | Replacement condition remains open | First verify mortar-free stone-face UV crops at the actual trim size and texel density. If no clean usable patch exists, a licensed fine-grain stone replacement is required. Do not approve full wall repeats as trim; no new source has been selected or inspected. |
| cream/rust awnings and sacks | Existing sources reusable | Existing woven scan and bounded paint recipe suffice. Preserve repeat and hems; leather source removed from cloth role. |
| fine domestic linen/cushions | Replacement condition remains open | Trial tighter physical weave using existing hessian normal/albedo. If coarse burlap character persists at close range, use a licensed linen scan; no replacement candidate has been approved. Leather cannot establish textile quality. |
| public and service paving | Existing sources reusable | Reuse inspected flagstone and robust service stone; consistent physical units and calibrated mortar contrast required. No fresh mossy scan for dry connectors. |
| timber/opaque paint/iron | Existing sources reusable | Retain R5 craft formulas and corrected PBR. Crop/select member grain; raw rust or door-photo crossbars are not finish acceptance. |
| rugs and goods | Existing sources reusable | Retain exact existing rug and all stockColorSrgb values; no new motifs, stock or geometry. |

No new replacement texture is approved. The two conditional gaps are a mortar-free fine-grain stone for monolithic trim and fine linen if rescaled existing hessian still reads as coarse burlap. Resolve these through existing-source samples first; a new download is not inherently needed. Parent calibration swatches remain experimental material comparisons, not exact final shader values or in-game acceptance.


## Bounded primary-source candidate search

Prefer the inspected existing sources. These two CC0 candidates are contingency trials only, not additional material variety. No maps were downloaded, installed or changed. Official preview links were located, but the web tool could not expose their images and CUA reported no browser available; neither candidate has been visually accepted.

**[rough_linen](https://polyhaven.com/a/rough_linen)**. Official page identifies blue linen, fine woven crosshatch, matte surface, and supplies diffuse, normal, roughness and other PBR maps. This is provider description, not an inferred material type from its name. Native scale: 0.3 m tall (official page, rounded). Fine cloth for tea linen/cushions if existing hessian remains visibly coarse. Blue source is not cream linen as-is. Trial existing bounded cloth paint formula on licensed maps; independently inspect normal pattern and any folds/seams at 1k/native scale. Do not enable anisotropy/transmission merely because supplied. [Official preview](https://cdn.polyhaven.com/asset_img/renders/rough_linen/primary_flat.png?height=110&quality=95&v=e0220d40). Candidate only; not downloaded.

**[rock_01](https://polyhaven.com/a/rock_01)**. Official page describes a solid weathered gray stone surface with fine grain, erosion streaks and some rusty speckles. It supplies diffuse, normal, roughness and height maps. This establishes a concrete source candidate, not dressed sandstone identity. Native scale: 1.5 m wide (official page). Continuous mortar-free stone micro-surface on modeled monolithic trim if existing stone-face UV crops fail. Gray stone requires restrained warm calibration and reduced normal relief on sills. Check streaks/speckles and full repeat before adoption; reject if it reads as rough natural rock rather than dressed trim. Do not use displacement to change R5 geometry. [Official preview](https://cdn.polyhaven.com/asset_img/primary/rock_01.png?height=110&quality=95&v=7d245b68). Candidate only; not downloaded.

The primary-source search also found [Sandstone Cracks](https://polyhaven.com/a/sandstone_cracks). Its official description emphasizes cracked/eroded ground, so it is not recommended for maintained monolithic trim merely because its name and beige color sound suitable. A preview/normal inspection remains required for the two candidates above before either can replace the existing-source trial.

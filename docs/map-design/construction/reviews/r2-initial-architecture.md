**CHANGES REQUIRED — Architecture discipline**

Reviewed **BZ-04 / R2-building-first**. Exact package SHA256:

`a5ed1304b5bd49163cf9547b441d41bd28a1845d1c2016ada923eb19d596f821`

All **193 controlled files** match the manifest, including the final recheck. **No frozen-package changes detected.** Inspected all 40 building plans/elevations/sections, all 25 area plans/elevations, and both required reference images.

The B north entrance hierarchy, guildhall’s double-height organization, shared Textile/Tea upper floors, and restrained service/connector faces are credible. These unresolved items prevent document handoff:

1. **Textile displays are not coordinated with their pointed arches.**  
   [design.json](/Users/dimitri2/Desktop/clawdstrike/docs/map-design/construction/design.json:10697), `G_T_E_ARCH2.instanceLayout.parts`: frame corners reach **z=2.49 m**, while SD-11’s arch reaches only **2.079 m** at their ±0.90 m offsets. `G_T_E_ARCH3` similarly reaches **2.39 m** against **2.088 m** at ±0.87 m. The area elevation draws these parts over the solid arch field.  
   **Remedy:** specify the recess’s actual three-dimensional head/cavity and resolve frame fit and visibility. Either revise the arrangement or explicitly detail a larger chamber behind the arch and draw its occlusion correctly. Bounding-box fit alone is insufficient.

2. **Fixed-counter workspaces lack a defined staff connection.**  
   [details.md, SD-08](/Users/dimitri2/Desktop/clawdstrike/docs/map-design/construction/details.md:56) closes both sides, back and ceiling; fixed counters close the front. Examples include `B_N_POTTER_SHOP`, `B_W_TEA_SHOP`, and `S_W_SHOP_2/3`. Their adjacent or rear building entrances do not establish access into the enclosed working strips.  
   **Remedy:** coordinate a credible staff connection with the stock and shelving. A specified closed side/back door can preserve the frozen gameplay envelope; no playable interior is required.

3. **Spawn A retains conflicting whole-building composition instructions.**  
   [design.json](/Users/dimitri2/Desktop/clawdstrike/docs/map-design/construction/design.json:3152), `areas[SPAWN_A_COURTYARD].propertyRelationships[A_W_DOMESTIC_REAR]`, explicitly requires **9.6/10.3/10.7 m stepped additions**. All three current parcels and the neutral drawing instead use **9.9 m** wall tops.  
   **Remedy:** settle and consistently document the intended complete west building. Do not leave the builder to choose between those compositions.

Also correct `G_S_W_SHOP_1.instanceLayout.parts[jar-shelf-1/2].kind`: both are specified as `lidded-ceramic-jar` despite being timber shelves supporting stock.

The read-only building validator passed. Its checks do not resolve the findings above. After correction, implementation-stage conditions remain bounded to assembly fit, neighboring roof/return continuity, and the planned actual-game appearance, collision and performance evidence. This review establishes neither professional certification nor user art acceptance.


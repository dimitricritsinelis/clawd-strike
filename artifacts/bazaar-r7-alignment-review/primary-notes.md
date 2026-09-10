# Primary facade alignment patch

Run `python3 artifacts/bazaar-r7-alignment-review/apply-primary.py --design PATH` once against the selected source. The patch owns primary facade moves only. It does not touch the active design or generated drawings itself.

Spawn A uses the supported parcel host model. Its west building has one continuous 0–8 m front, although its three drafting cells have different rear depths. The south stack stays at1.5 m; the original middle stack moves to6.5 m and is hosted by the north cell. Both levels remain paired about4 m. The wider separation is the supported alternative to crossing drafting seams. The ground seat and middle entrance stay at1.5 m and4.2 m. Existing upper room records become south and north chambers within the actual unchanged building union.

The east dyeworks likewise has one 0–8 m facade. Its compact upper light moves to2.175 m in the vats host and the broad upper light moves to4.9 m in the drying host. Their combined opening envelope is1.85–6.15 m, centered on4 m. The loft vent moves to4 m and narrows from2.1 m to1.4 m, retaining its existing height. Its opening plus0.14 m surround occupies3.16–4.84 m, inside the drying host3.15–8 m. This specific size adjustment follows the root's authorized correction and preserves central placement without false host bounds. The ground workfront4.605 m and staff entrance6.9 m stay fixed.

Spice south loft centers17.78 m; Rug merchant loft68 m; B potter loft20.65 m; B textile loft35 m. Fountain merchant and its Souk reverse keep unequal upper stacks and move them together to33.6/36.6 m. Their existing canonical ENTRY/MAIN rooms already contain the new receivers. No ground entrance or trade group changes.

The existing fixed-stack validator derives stack identity from L1/L2 name fragments. Three independently composed loft openings therefore receive the established COMMON-LOFT-VENT name: A_E_DRYING-L2-W1, S_W_SOUTH-L2-W1 and R_W_MERCHANT-L2-W1. Exact references are synchronized. This preserves the validator's protection for actual repeated window stacks.

Assertions preserve every ground opening, all opening fields except the named upper axes/alignment reasons and authorized dyeworks vent width, every parcel footprint/interval/roof/material, and every building physical footprint and roof record. Existing lookup axes, elevation lists and floor schedules are rebuilt for affected owners. Unchanged top-level data and all unrelated building records are retained.

Fresh temporary-source checks passed: validate.py and validate_buildings.py, with a freshly derived temporary roof schedule. Roof derivation produced78 cells,19 bundles and50 dependency associations. Active design and generated output were not modified. Shared Tea Stairs axis corrections belong to the secondary patch.

# Third-party notices and asset provenance

This file summarizes the source records retained in the repository. License labels below are recorded provenance, not a new license grant or a claim that all rights have been independently verified. Project-specific modifications retain their underlying source obligations. The owner identified the game as noncommercial during cleanup. On September 29, 2026 (UTC), the owner confirmed authorship of the raider donor, older weapon/UI audio, and loading-screen imagery/music; see the [owner declaration](assets/source/owner-created.provenance.json).

Paths in the shipped-path column are relative to `apps/client/public/assets/` unless stated otherwise.

| Asset | Shipped path | Source / author | Recorded license and changes |
|---|---|---|---|
| AK-47 base model and textures | `models/weapons/ak47-next/ak47.glb`; rifle in `models/characters/enemy_raider_next/raider.glb` | [AK-47 by lokeig](https://sketchfab.com/3d-models/ak-47-384565b1779c450b90397232163e4e6d) | [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). Derived geometry/materials, rigging, finish, and animation. |
| Hand topology | Embedded in `models/weapons/ak47-next/ak47.glb` | Dan Ulrich / Blender Studio; [Blender demo files](https://www.blender.org/download/demo-files/) | CC0 according to the weapon provenance; mirrored, rigged, and modified for the glove assembly. |
| Raider character donor | `models/characters/enemy_raider_next/raider.glb` | Owner-created Tripo export | Project-original, confirmed by the owner. New rig/motion are project-original; the rifle has the separate CC BY-NC dependency above. |
| Generated weapon atlas and derived contact occlusion | AK source atlas and derivatives used by the viewmodel pipeline | OpenAI image_gen, user-selected Urban Breacher design | Provenance labels it project-original (AI-generated). The prompt and source hashes are retained; this entry does not make a separate determination of ownership or provider terms. |
| Environmental textures, Poly Haven props, and weapon finish scans | Bazaar surface packs/models and embedded AK materials | [Poly Haven](https://polyhaven.com/) asset pages listed in the catalogs below | CC0 / CC0-1.0 in the source records. Includes processed color, normal, and ORM derivatives. |
| Spice sack | Bazaar prop catalog entry `cc0_spice_sack` | [Free CC0 Medieval Props, 3DmodelsCC0](https://3dmodelscc0.itch.io/free-cc0-medieval-props) | CC0-1.0 in the prop catalog. |
| Stained glass panel | `textures/environment/bazaar/windows/stained_glass_panel_001/` | [Glass Stained Panel 001, 3DTextures](https://3dtextures.me/2026/02/26/glass-stained-panel-001/) | CC0 according to its retained SOURCE.md. |
| Market chatter | `audio/ambient/market-chatter.wav` | [Arabic marketplace crowd, kyles, Freesound 406381](https://freesound.org/people/kyles/sounds/406381/) | CC0 1.0 in the source record; excerpted, filtered, crossfaded, resampled, and gain-adjusted. |
| Reload foley | `audio/weapons/ak47/reload-foley.wav` | Five Freesound recordings listed below | CC0 1.0 in the retained provenance; cut, filtered, normalized, and assembled. |
| Other weapon and UI audio | `audio/weapons/ak47/fire_close_01.mp3`, `fire_tail_01.mp3`, `reload.mp3`; `audio/ui/kill_ding.mp3` | Project owner | Owner-created, confirmed September 29, 2026 (UTC). The separately sourced reload foley retains its CC0 credits above. |
| Loading-screen imagery and music | `apps/client/public/loading-screen/assets/` | Project owner | Owner-created, confirmed September 29, 2026 (UTC); processing sources and outputs are listed in the owner declaration. |

## Reload foley credits

The [reload foley provenance](assets/source/audio/reload-foley.provenance.json) records source pages, retrieval hashes, license text captured at acquisition, and every source cut:

- [A rifle being moved around and handled w/ magazine removals by serøutōnin--deprivəd](https://freesound.org/people/ser%C3%B8ut%C5%8Dnin--depriv%C9%99d/sounds/725403/), CC0 1.0 Universal (Public Domain Dedication).
- [Mag remove.wav by Nanashi](https://freesound.org/people/Nanashi/sounds/104407/), CC0 1.0 Universal (Public Domain Dedication).
- [AK-47 Assault Rifle being unloaded and reloaded by serøutōnin--deprivəd](https://freesound.org/people/ser%C3%B8ut%C5%8Dnin--depriv%C9%99d/sounds/674742/), CC0 1.0 Universal (Public Domain Dedication).
- [AK47 chambering.aif by ceremonialchapstick](https://freesound.org/people/ceremonialchapstick/sounds/142892/), CC0 1.0 Universal (Public Domain Dedication).
- [A gun's magazine being hit once by serøutōnin--deprivəd](https://freesound.org/people/ser%C3%B8ut%C5%8Dnin--depriv%C9%99d/sounds/719244/), CC0 1.0 Universal (Public Domain Dedication).

## Detailed records

- [AK provenance](apps/client/public/assets/models/weapons/ak47-next/provenance.json) and [generated-atlas prompt](assets/source/ak47/imagegen-prompt.txt).
- [Raider provenance](apps/client/public/assets/models/characters/enemy_raider_next/provenance.json). Its historical `Awaiting user design approval` status is retained; the record alone does not prove a later approval.
- [Prop catalog](apps/client/public/assets/models/environment/bazaar/props/models.json) and [facade catalog](apps/client/public/assets/models/environment/bazaar/facades/models.json).
- [Floor sources](apps/client/public/assets/textures/environment/bazaar/floors/bazaar_floor_textures_pack_v4/sources.json), [wall sources](apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sources.json), [palm sources](apps/client/public/assets/textures/environment/bazaar/foliage/palms/sources.json), and [textile sources](apps/client/public/assets/textures/environment/bazaar/textiles/sources.json).
- [Stained glass SOURCE.md](apps/client/public/assets/textures/environment/bazaar/windows/stained_glass_panel_001/SOURCE.md) and [market chatter source](assets/source/audio/market-chatter-source.txt).

The textile and palm records also identify project-original masters. The owner declaration supplies the authorship record for the assets named above; processing hashes describe the derived files. This document does not assign an overall repository software license or extend any third-party license to unrelated files.

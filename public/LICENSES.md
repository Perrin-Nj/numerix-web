# Asset licence ledger

| Asset | Author | Licence | Source | Checked |
|---|---|---|---|---|
| Open Peeps avatars (`@dicebear/open-peeps` 9.4.2, drawn locally) | Pablo Stanley (design), Florian Koerner (DiceBear code) | Design CC0 1.0, code MIT | https://www.openpeeps.com/ , https://www.dicebear.com/styles/open-peeps/ | 2026-10-12 |
| Reaction faces in `public/reactions/*.svg`: happy, sad, thinking, party, hug, thumbs-up, star-struck, pleading, sleepy, wave, clap, hearts | OpenMoji contributors (HfG Schwaebisch Gmuend) | CC BY-SA 4.0 (LICENSE.txt read in the repo) | https://github.com/hfg-gmuend/openmoji (color/svg) | 2026-10-12 |

Decision: Google Noto animated emoji (googlefonts/noto-emoji-animation) were NOT used. The repository and its licence file could not be fetched, and no source confirmed CC BY 4.0. OpenMoji was used instead. Required credit (CC BY-SA 4.0): "Emoji art by OpenMoji (openmoji.org), CC BY-SA 4.0". The SVGs are unmodified; the animation is CSS only.

## Storybook demo media (public/story-media)

Four clips copied from numerix-api/seed/feed-media for the MediaCard stories: honeycomb photo (Openverse, CC0), bee video (Wikimedia Commons, CC BY 3.0), cycloid animation (Commons, public domain). Full credits for every Discover item: numerix-api/docs/FEED_MEDIA.md and seed/feed/items.json.

## Surface textures (public/textures, used by the consequence scenes)

Photographs from Wikimedia Commons, cropped to 384 px WebP by `scripts/fetch-textures.mjs` (licence read from the file page; only CC0, public domain and CC BY are accepted). Machine readable copy: `public/textures/textures.json`. Checked 2026-10-20.

| Texture | Author | Licence | Source |
|---|---|---|---|
| wood.webp (weathered planks) | W.carter | CC0 | https://commons.wikimedia.org/wiki/File:Weatherworn_planks_on_top_of_wooden_table.jpg |
| stone.webp (grey stone) | Sisters.seamless | CC0 | https://commons.wikimedia.org/wiki/File:Grey_boulder_seamless_stone_surface_texture.jpg |
| glass.webp (opaque glass) | Titus Tscharntke | Public domain | https://commons.wikimedia.org/wiki/File:Opaque_glass.jpg |
| water.webp (blue water ripples) | Nenad Stojkovic | CC BY 2.0, credit required | https://commons.wikimedia.org/wiki/File:Blue_water_ripple_surface.jpg |
| cloth.webp (book cover fabric) | Delany Dean, Sanford FL | CC BY 2.0, credit required | https://commons.wikimedia.org/wiki/File:Book_cover_fabric_-_Flickr_-_Delany_Dean.jpg |

Credit line for the two CC BY pictures: "Blue water ripple surface" by Nenad Stojkovic and "Book cover fabric" by Delany Dean, both CC BY 2.0 (https://creativecommons.org/licenses/by/2.0/), cropped and tinted.

## Collectible card photos

- `public/cards/*.webp` (118 photos, 480 px WebP, lazy loaded): the 480 px variant of every approved photo of the 20 worlds in the API seed (`numerix-api/seed/assets`, fetched and licence-checked by `tools/assets/fetch.mjs`). Licences: CC0 (69), Public Domain Mark (17), CC BY 2.0 (22), CC BY 3.0 (3), CC BY 4.0 (7).
- Creator, licence, source link and the exact credit line of each photo are in `public/cards/credits.json` (and on the Credits page through `GET /v1/credits`, same asset ids).
- Rebuild: `node scripts/build-card-photos.mjs <path to numerix-api/seed/assets>`.
- Which photo a card shows: `src/game/story-card/card-pick.ts` (title words against photo topics, then world, no repeat inside a list). A card whose `image_url` is set by the backend shows that picture instead, so an admin can replace one card's art through the card data without a release.

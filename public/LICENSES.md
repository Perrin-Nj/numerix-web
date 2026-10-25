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

## Cartoon pictures in question diagrams

CC0 (public domain dedication) clip art from Wikimedia Commons, converted to 256 px WebP in `public/objects/` (`<name>-256.webp`). Used by `grid` diagrams as `img:<name>` labels. No credit is required by CC0; creators are listed anyway.

- `public/objects/chair-256.webp`: Windsor Chair.svg by Eggib, CC0, https://commons.wikimedia.org/wiki/File%3AWindsor_Chair.svg
- `public/objects/bandage-256.webp`: Apósito adhesivo.svg by Eloy, CC0, https://commons.wikimedia.org/wiki/File%3AAp%C3%B3sito_adhesivo.svg
- `public/objects/solar-panel-256.webp`: Solar energy.svg by gnokii, CC0, https://commons.wikimedia.org/wiki/File%3ASolar_energy.svg
- `public/objects/cat-256.webp`: Black Cat.svg by Lantaire, CC0, https://commons.wikimedia.org/wiki/File%3ABlack_Cat.svg
- `public/objects/stopwatch-256.webp`: Stopwatch.svg by badaman, CC0, https://commons.wikimedia.org/wiki/File%3AStopwatch.svg
- `public/objects/chess-rook-256.webp`: Chess black rook.svg by CyrilKato, CC0, https://commons.wikimedia.org/wiki/File%3AChess_black_rook.svg
- `public/objects/chess-knight-256.webp`: Chess black knight.svg by CyrilKato, CC0, https://commons.wikimedia.org/wiki/File%3AChess_black_knight.svg
- `public/objects/chess-bishop-256.webp`: Chess black bishop.svg by CyrilKato, CC0, https://commons.wikimedia.org/wiki/File%3AChess_black_bishop.svg
- `public/objects/chess-queen-256.webp`: Chess black queen.svg by CyrilKato, CC0, https://commons.wikimedia.org/wiki/File%3AChess_black_queen.svg
- `public/objects/chess-king-256.webp`: Chess black king.svg by CyrilKato, CC0, https://commons.wikimedia.org/wiki/File%3AChess_black_king.svg
- `public/objects/chess-pawn-b-256.webp`: Chess black pawn.svg by CyrilKato, CC0, https://commons.wikimedia.org/wiki/File%3AChess_black_pawn.svg
- `public/objects/person-man-256.webp`: Silhouette of a standing man.svg by Mette Aumala, CC0, https://commons.wikimedia.org/wiki/File%3ASilhouette_of_a_standing_man.svg
- `public/objects/person-woman-256.webp`: Silhouette of a woman.svg by Mette Aumala, CC0, https://commons.wikimedia.org/wiki/File%3ASilhouette_of_a_woman.svg
- `public/objects/dog-256.webp`: Dog Silhouette 01.svg by Amada44, Public domain, https://commons.wikimedia.org/wiki/File%3ADog_Silhouette_01.svg
- `public/objects/mouse-256.webp`: Silhouette-mouse-standing.svg by Mahlzahn, CC0, https://commons.wikimedia.org/wiki/File%3ASilhouette-mouse-standing.svg
- `public/objects/pill-256.webp`: Pill (NIH BioArt 407 - 633314).svg by Courtesy of NIAID Ryan Kissinger, Public domain, https://commons.wikimedia.org/wiki/File%3APill_(NIH_BioArt_407_-_633314).svg
- `public/objects/water-drop-256.webp`: Water drop 2.svg by inky2010, CC0, https://commons.wikimedia.org/wiki/File%3AWater_drop_2.svg

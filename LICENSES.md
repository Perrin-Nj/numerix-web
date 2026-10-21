# Third-party assets

## Music

- Seven calm loops in `public/music/`, by Kevin MacLeod (incompetech.com), licence CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Title, artist, licence and source of each are in `public/music/credits.json` and shown on the Credits page. Loops are cut and encoded by `scripts/build-music.mjs`. Licence verified on https://incompetech.com/music/royalty-free/licenses/ and in the catalog https://incompetech.com/music/royalty-free/pieces.json.

## Mascot

- Numa the owl (`src/game/mascot/Numa.tsx`) is original art drawn in code for Numerix. No third-party artwork, no attribution needed.
- The previous Lottie rabbit (Abdul Latif, Lottie Simple License) and its dotLottie player were removed; git history keeps them.
- Animation runs on `motion` 14.0.0 (`motion/mini`), MIT licence.

## Welcome gift photo

- `public/gift/welcome-gift.webp`: cropped and resized from "Brown gift box with red ribbon and bow" by Shixart1985 on Wikimedia Commons, licence CC BY 2.0 (https://creativecommons.org/licenses/by/2.0). Source: https://commons.wikimedia.org/wiki/File:Brown_gift_box_with_red_ribbon_and_bow.jpg. Cropped, scaled to 420 px, converted to WebP. The credit also shows under the gift in the app.

## Collectible card photos

- `public/cards/*.webp` (118 photos, 480 px WebP, lazy loaded): the 480 px variant of every approved photo of the 20 worlds in the API seed (`numerix-api/seed/assets`, fetched and licence-checked by `tools/assets/fetch.mjs`). Licences: CC0 (69), Public Domain Mark (17), CC BY 2.0 (22), CC BY 3.0 (3), CC BY 4.0 (7).
- Creator, licence, source link and the exact credit line of each photo are in `public/cards/credits.json` (and on the Credits page through `GET /v1/credits`, same asset ids).
- Rebuild: `node scripts/build-card-photos.mjs <path to numerix-api/seed/assets>`.
- Which photo a card shows: `src/game/story-card/card-pick.ts` (title words against photo topics, then world, no repeat inside a list). A card whose `image_url` is set by the backend shows that picture instead, so an admin can replace one card's art through the card data without a release.

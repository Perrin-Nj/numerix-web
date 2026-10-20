# Human visuals

Owner rule: everything the child sees is human like and photographic. No cartoon, flat vector or emoji art. The owl Numa is the only character (narrator and guide) and stays as it is.

## What was removed

- World scene illustrations: `game/world-scene/scenes.tsx` (flat squirrel in trees and 19 other scenes), the emoji hero of each scene, the SVG moods.
- `WORLD_EMOJI`, the emoji `WorldBackdrop`, the 3D emoji counting items (`ITEMS`), the bowl emoji.
- Person avatars (`game/human-avatar`, Open Peeps through `@dicebear`, dependency dropped): hero beside the objects in counting pictures, the outcome sheet, child profile avatars (now a tinted monogram).
- `OutcomeSim` flat animations (`sims.tsx`, 509 lines, 43 emoji), `Reaction` emoji faces, the emoji mascot fallback (`NEXT_PUBLIC_MASCOT_EMOJI`), the flat error illustrations (fox, cable, hourglass), the drawn story-card art (`PostcardArt`, `BadgeArt`, `PresentArt`, emoji motifs), the emoji challenge icons, sparkle glyphs.
- The 75 Fluent 3D emoji sprites (`seed/assets/sprites.json`, 75 files) are no longer referenced by any question and are no longer seeded.

## What replaced it

- World cards, hero, tile, teaser, continue card, outcome moment, story cards and the question stage all use the real photographs already licensed in `numerix-api/seed/assets` (20 heroes bundled in `public/worlds`, 480 and 960 px), under a dark gradient for white text.
- Counting and measuring objects are real photographs of everyday things (`seed/assets/objects.json`, `tools/assets/objects.mjs`): square, soft rounded tiles; plain backgrounds are cut out (flood fill from the border, 8 percent padding) when the photo allows it, other photos are square crops. WebP 256 and 512 px, hashed ids, tags, alt text fr and en, licence and credit per file. Bundled fallbacks for worlds without a question photo are in `public/objects`.
- Errors, outcomes and narration show Numa only.
- Buttons and tabs: no heavy outline or ledge. Solid or softly graded fill, light shadow, scale on press, visible focus ring, 44 px targets. Secondary buttons are a soft brand tint. Selected tab: filled soft tint with icon and label. High contrast theme keeps a 2 px outline as a shadow, not a border.

## Guard

`scripts/no-cartoon-check.mjs` (in `pnpm check`) fails on emoji codepoints, cartoon libraries, flat-scene imports and sprite assets in `src`. With `--url` it also checks the public play routes.

## Research (read before the design decision)

Photos and children:
- Photographs help young children transfer names and use to real objects better than drawings: https://stageslearning.com/connect/articles/why-real-photos-what-about-cartoons
- Early arithmetic visuals: teachers rated realistic and cartoon about equal, realistic helps tie problems to familiar objects, plain backgrounds and identical objects reduce distraction (we cut backgrounds out where possible): https://arxiv.org/pdf/2605.31212
- Realism in teaching images (UNIR): https://investigacion.unir.net/documentos/69d7ed14e14c114826afef58?lang=de
- Preference study, photorealistic version preferred and judged more authentic: https://starfos.tacr.cz/vysledky-vyzkumu/RIV%2F00216208%3A11210%2F14%3A10287838

Counting with pictures:
- Pictures can replace manipulatives for counting tasks in preschool (Purdue): https://docs.lib.purdue.edu/celpubs/14
- Pictorial supports made addition items easier in 2,390 children (Children's Learning Institute, 2026): https://childrenslearninginstitute.org/cli-news/are-manipulatives-necessary-for-assessing-early-operations/
- Perceptually rich objects help when knowledge is low and hurt when it is high (McNeil and Petersen, 2013), so each object is one clean item: https://www.sciencedaily.com/releases/2013/04/130418154405.htm
- Photos help children describe their thinking: https://asset.library.wisc.edu/1711.dl/IMA7JVMMRIIWG8X/R/file-19bd6.pdf

Buttons:
- Soft depth needs a clear pressed state (swap the shadow, about 150 ms) and a visible `:focus-visible` indicator; low contrast edges are the main failure of soft UI, so fills carry the contrast: https://www.setproduct.com/blog/neumorphism-design-guide
- Accessible soft UI, keep accents and focus rings: https://uxdesign.cc/neumorphism-can-we-make-it-more-accessible-15be5fe2ef28
- Soft UI explained, 2026: https://vp0.com/blogs/what-is-soft-ui-design.md

Sources of photos: Wikimedia Commons API (licence read from `extmetadata`: CC0, public domain, CC BY 2.0 to 4.0; SA, NC, ND, GFDL rejected) and the existing Openverse and Pexels picks. Filters reject titles that name people, brands, weapons, artwork, drawings, museum catalogue items.

## Numbers

84 object photos (36 cutouts, 48 square tiles): CC0 23, public domain 31, CC BY 30 (credited). 4.0 MB of WebP (256 and 512 px). 20 world heroes bundled in `public/worlds` (1.8 MB), 33 object photos bundled in `public/objects` (0.35 MB). 575 questions that had no picture got a real scene photo of their world; 22 more got an object photo from their text. 75 sprites and about 220 rejected candidate files were removed from the seed (6 MB).

## Limits

- Picking is automatic plus a human look at contact sheets: some objects are a nearby honest photo (sun is a solar flare, sauropod and T. rex are small museum skeletons, coin is euro coins). Objects without a clean photo were dropped, so 21 questions show the world's bundled object photos instead of their own.
- Photos on a plain background are cut out by flood fill; busy edges can keep a faint halo.
- A rejected pick is remembered in `tools/assets/objects-reject.json`; run `objects.mjs --redo slug` to replace one.
- `scripts/gen-icons.mjs` still draws the app icon from an emoji (not shown in play screens).

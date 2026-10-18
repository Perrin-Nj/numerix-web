# Third-party assets

## Rabbit mascot animation

- File: `public/mascot/rabbit-balloon.lottie` (dotLottie, one animation, "rabbit with a balloon")
- Creator: Abdul Latif
- Source: https://lottiefiles.com/free-animation/nice-rabbit-with-balloon-WJdgRABX8w
- Licence: Lottie Simple License, https://lottiefiles.com/page/license (commercial use allowed, credit optional)
- Downloaded: 2026-10-18
- The file is kept UNMODIFIED. The creator asks that it is not modified and republished, and modifications would be derivative works under the same licence. The app only changes playback speed, the shown frame and CSS (tilt, dim) around it.
- Only one animation exists, so poses are speed and frame variations (see `src/game/mascot/Mascot.tsx`). More distinct poses need more animation files.

## Lottie player runtime

- `@lottiefiles/dotlottie-react` 0.19.16 and `@lottiefiles/dotlottie-web` 0.80.0, MIT licence.
- `public/mascot/dotlottie-player.wasm` is the unmodified player from `@lottiefiles/dotlottie-web` 0.80.0, self-hosted so no CDN is called. Replace it when the package version changes.

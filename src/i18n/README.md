# i18n

`negotiate.ts` picks the locale from the cookie or `Accept-Language` (fr-CA fallback). `generated/` holds the merged message bundles built by `pnpm gen:messages` from the `messages.<locale>.json` fragments that sit next to each component. Duplicate keys fail the build.

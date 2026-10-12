# ADR 0002: Cache Components off

Status: accepted.

Next.js 16 scaffolds `cacheComponents` and `partialPrefetching` on. The app is cookie authenticated and client driven, so almost every route is dynamic and the benefit is small, while the constraints on dynamic access add risk. Both are off. Revisit after the first playtest, when static shells for public routes may pay off.

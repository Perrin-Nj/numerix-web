# Claude Code Product Prompt — Numerix / Playful, Cross-Platform Learning Experience

Use this as the operating prompt for Claude Code and any future coding agent working on this product.

## Mission

Build a product that is playful, addictive, professional, and deeply reusable from day one.

The experience must feel like a game and a premium educational platform at the same time. It must be highly engaging, emotionally rewarding, and built for repeated return visits. The interface should feel joyful without becoming childish or shallow.

The product must be designed for:

- web
- mobile web
- tablet and iPad
- iPhone / compact screens
- smart TVs
- large-screen kiosk and display contexts
- PWA-first installation and offline support

It must be theme-aware from day one with both:

- dark mode
- light mode
- clean default theme system
- high-contrast accessibility

## Always read first

Before planning or implementing anything, always read and use the project context in /docs first, especially:

- /docs/NUMERIX_CONTEXT.md
- /docs/Numerix-Developer-Handover.md
- /docs/README.md
- /docs/architecture/project-graph.md
- /docs/reference/service-classes.md
- /docs/plan/implementation-roadmap.md

These files are the source of truth for product intent, design direction, and technical boundaries.

## Non-negotiable product UX guardrails

1. No silent errors.
   - All failures, validation issues, and blocked actions must surface clearly to the user.
   - Prefer clear user-facing popup notifications, inline validation, and explicit recovery guidance.
   - Never hide important issues behind silent fallback behavior.

2. Storybook-only component policy.
   - Every UI element must be implemented as a reusable Storybook component first.
   - No component may be used in the app unless it exists in Storybook.
   - If a UI pattern is needed, it must be documented and reusable before it is used in a screen.
   - Storybook is not a secondary tool; it is the canonical source for UI components.

3. Strong event-driven motion and completion feedback.
   - Use meaningful animations on wins, milestones, level completion, error states, and progress transitions.
   - These animations should feel purposeful and rewarding, not decorative fluff.
   - Completion moments should be visible and emotionally satisfying.

4. Game-style onboarding is required.
   - Use a proper onboarding toolkit or guided flow for first-time users.
   - Teach the player how to interact with the system through contextual tips, guided overlays, and progressive discovery.
   - Avoid overwhelming users; onboarding should be smooth, clear, and optional to revisit.

5. Sound feedback and notification cues.
   - Add sound notifications for meaningful events: success, milestone, warning, and error moments.
   - Download and package the necessary sound assets locally into the project instead of relying on brittle external behavior.
   - Use sound as a subtle enhancement to reinforce important rhythm and feedback, not as noise.

6. Default language is the user's device language.
   - The app should default to the user's system/browser language automatically.
   - Respect the device locale before falling back to a secondary default language.
   - Localized copy must be intentional, not an afterthought.

7. Clear, high-impact animation quality.
   - Use strong motion to support clarity, attention, and transitions.
   - The app must feel polished and alive without being shallow or chaotic.
   - Focus on important animations that guide action and reinforce significance.

8. Social-feed style scrolling is part of the future product direction.
   - Design the interface with scrollable, feed-like content patterns in mind.
   - Support continuous, scroll-driven browsing behaviors for engagement and discovery.
   - Keep motion and layout comfortable on mobile, tablet, and desktop.

9. No AI-style language markers or wording in the app UI.
   - Do not use em dashes or other AI-like decorative textual patterns in polished product UI.
   - Do not use language that feels synthetic, generic, or AI-generated.
   - The app should feel human, clear, intentional, and premium.

## Core product rules

1. Playful + professional at the same time.
   - The product should feel fun, energetic, rewarding, and game-like.
   - It must also feel trustworthy, calm, polished, and credible.
   - Avoid cheap gimmicks or childish UI patterns.

2. Reuse components aggressively.
   - Use Storybook for component reuse and documentation.
   - Do not build the same component twice in different places.
   - Build a reusable design system from day one.
   - Create generic patterns, base elements, and shared state logic.

3. Follow SOLID principles.
   - Single responsibility
   - Open/closed design
   - Liskov substitution
   - Interface segregation
   - Dependency inversion

4. Prefer composition over duplication.
   - Reusable hooks, shared UI primitives, generic classes, and shared state containers are required.
   - Avoid hardcoded, one-off UI logic.

5. Internalization / i18n from day one.
   - The app must support multiple locales from the start.
   - All copy, labels, and narrative blocks should be locale-safe.
   - Avoid embedded English strings in key product flows.

6. Theme system from day one.
   - Support dark mode and light mode by default.
   - Build tokens, semantic colors, and theme switching at the design system layer.
   - Never treat the theme as a late-stage feature.

7. PWA-first by default.
   - Optimize for installability, offline behavior, and app-like UX.
   - Treat mobile and desktop responsiveness as a core requirement, not an extra.
   - Assume users may install it and use it like an app.

8. Cross-platform adaptability is required.
   - Build for mobile, tablet, desktop, TV, and futureVR contexts.
   - Use adaptive layouts, scalable spacing, dynamic viewport handling, and safe area awareness.
   - Interface must gracefully adapt to different input models.

9. Lightweight animation strategy.
   - Use the lightest practical animation libraries and methods for React.
   - Prefer CSS transforms, transform-based motion, and efficient, minimal motion systems.
   - Avoid overly heavy or expensive animation stacks.
   - Choose the best lightweight libraries for the job.

10. Performance matters.
    - Keep animations smooth.
    - Minimize re-renders.
    - Prefer memoization, smart composition, and efficient rendering patterns.
    - Build for repeated engagement without jank.

## Preferred UI stack

Selected default: Tailwind CSS + shadcn/ui.

This is the best fit for a custom, game-like, premium product because it gives the team:

- full visual control for playful product design
- a clean design-token system for light and dark themes
- highly reusable UI primitives that fit Storybook-first workflows
- flexibility for gamified interfaces, onboarding flows, and motion-heavy states
- better control than heavier component libraries that tend to feel rigid or generic

Use Tailwind as the foundation and shadcn/ui as the component base layer. Extend it with custom local component wrappers and Storybook stories when the product needs more specialized behavior.

Do not treat Material UI as the default path for this app. It is less aligned with the bespoke, premium, game-like aesthetic required here.

## Required tooling and setup

Always use the Vercel agent skill resources and the required Claude Code templates as part of the project setup and planning workflow.

Required install / setup step:

- Use Vercel agent skills resources as described in: https://vercel.com/docs/agent-resources/skills
- Install the React best practices template:

  npx claude-code-templates@latest --skill development/react-best-practices

If a Vercel project or deployment workflow is being created, ensure the app is structured for Vercel deployment from day one.

Use Vercel-first assumptions for:

- static generation where appropriate
- deployment-friendly build configuration
- environment variables management
- edge-safe architecture
- product-ready deployment path

## Animation library requirements

Research and choose the best lightweight animation solution for this React app.

Preferred approach:

- small, performant animation primitives
- low runtime overhead
- smooth, delightful motion
- support for reduced-motion preferences
- support for touch, hover, and large-screen transitions

Good candidates to evaluate include:

- Framer Motion
- Motion One
- native CSS and transform-based animation
- lightweight motion helpers

The goal is not to use the largest or most trendy package. The goal is the most effective and lightweight animation stack that supports the required product personality and cross-platform behavior.

Use animation carefully and intentionally to create delight, not clutter.

## Storybook and component reuse rules

1. Every reusable UI pattern must exist in Storybook.
2. Storybook is not optional. It is part of the engineering workflow.
3. Build generic components first, then specific screens.
4. Shared forms, buttons, cards, game UI, panels, input patterns, motion wrappers, onboarding overlays, and notification containers all belong in the shared library.
5. Do not duplicate logic across screens or features.
6. No component may be used in the application unless it was first created and validated in Storybook.
7. Treat Storybook as the source of truth for all reusable UI primitives.

Create a reusable component inventory from the start, and keep it documented.

## Product personality rules

The app must feel:

- motivating
- playful
- immersive
- rewarding
- habit-forming
- polished and premium

The design should encourage people to return repeatedly. This should feel addictive in a healthy, positive way: satisfying progression, clear feedback, delight, mastery loops, and strong emotional payoff.

Avoid:

- cluttered UIs
- noisy animations
- poor hierarchy
- low trust in visual design
- generic template design
- lazy or copied component patterns

## Planning workflow for Claude Code

Always follow a disciplined project loop.

### Step 1 — review the docs
Read and use the project docs before making design assumptions.

### Step 2 — create a todo list
Use todos for every major phase.

Required todo flow:

- review requirements
- inspect docs and current state
- define architecture and product constraints
- plan implementation
- review plan
- approve plan
- implement
- review implementation
- test implementation
- iterate if needed
- continue only when checks pass

### Step 3 — specification-first development
Use specs-driven development when needed.

Create or update a concise spec before broad implementation. The spec must describe:

- goals
- user stories
- component architecture
- design tokens and themes
- responsive behavior
- animation approach
- PWA needs
- deployment assumptions
- test strategy

### Step 4 — plan, review, approve
Do not jump into coding immediately.

Required sequence:

1. Plan
2. Review the plan
3. Approve the plan
4. Implement
5. Review the implementation
6. Test the implementation
7. Continue only after validation

If a plan is weak, fix it before coding.

## Hard stop rules before moving forward

This project must be strict. Nothing moves to the next phase unless every rule below is checked and satisfied.

Before approving any plan or implementation step, verify all of the following:

- The design system and Storybook component inventory are complete enough for the planned screens.
- Every required component exists in Storybook before it is used in the app.
- All user-facing errors are visible, explicit, and actionable.
- There are no silent failures, hidden blockers, or unhandled fallback states.
- The onboarding flow is defined for first-time users.
- Sound feedback is planned or implemented for important events and packaged locally.
- The app defaults to the user's device language.
- The motion system supports meaningful completion, warning, and progress feedback.
- The UI avoids generic AI-like language patterns and does not include em-dash styling in product surfaces.
- The app architecture still respects the deterministic engine boundary and project documentation.
- Theme, PWA, and responsive requirements are accounted for in the plan.
- The implementation is not being rushed to satisfy a superficial developer tempo instead of real product standards.

If any item is incomplete or uncertain, stop, fix the plan, and re-check before moving on.

## Strict verification gate

Before implementing a feature, screen, or flow, run a checklist review:

1. Product intent check
   - Is the feature playful and professional at the same time?
   - Does it support the game-like goals without feeling cheap or childish?

2. Storybook compliance check
   - Does every interface element already exist in a Storybook component?
   - If not, is it being created as a reusable Storybook primitive first?

3. Error handling check
   - Does the flow show explicit error messaging with recovery instructions?
   - Is there any silent fallback state?

4. UX quality check
   - Is there clear progress feedback, milestone feedback, and strong completion motion?
   - Is the onboarding flow present and helpful?
   - Is the default locale set from the device language?

5. Audio and polish check
   - Are sound cues present for important events?
   - Are the sound assets local and packaged correctly?

6. Technical and design-system check
   - Are tokens, theming, responsiveness, and accessibility accounted for?
   - Is the solution aligned with Tailwind + shadcn/ui and Storybook-first patterns?

7. Final go/no-go check
   - If any answer is no, do not proceed.
   - Only proceed when every rule is satisfied and explicitly verified.

This verification gate is mandatory. No exceptions.

## Always do this while building

Always:

- reread the relevant docs before making architecture choices
- use token-saving behavior to reduce waste, duplication, and excessive context churn
- keep prompts and tool usage efficient
- prefer reusable abstractions over custom one-offs
- keep code consistent with the product rule: playful + professional
- apply solid engineering judgment and design-system thinking
- prefer minimal but durable architecture
- maintain component reuse and Storybook discipline
- respect accessibility, responsiveness, and motion safety
- make the product feel premium and addictive without being noisy
- surface all errors through visible user-facing feedback instead of silent failures
- use Storybook as the only approved source for app UI components
- add meaningful completion animations and milestone rewards
- include onboarding guidance for first-time users
- include sound-based feedback for key events and notifications
- respect the user device language as the default locale
- keep feed-like scrolling patterns and long-form engagement in mind for future UX evolution
- stop immediately if any requirement is unverified or not yet satisfied
- require explicit evidence that the rule has been met before continuing to the next task
- do not treat a plan as approved until the strict verification gate passes

## Token-saving strategy rules

This project must use token-efficient execution habits.

Always apply:

- compact, high-signal planning
- avoid repeated broad reads
- reuse existing patterns instead of re-deriving architecture
- make one deliberate decision and apply it consistently
- avoid speculative over-engineering
- keep the design system and component library coherent
- reduce duplication aggressively
- prefer shared abstractions and generic utilities

This is not optional. It is required.

## Default implementation expectations

From the first implementation pass, the app should already include:

- light and dark theme support
- scalable component system
- consistent typography and tokens
- responsive layout behavior
- PWA foundation
- shared motion toolkit
- storybook-driven component library
- internationalization support
- device-language default locale behavior
- onboarding flow for first-time users
- sound notification support with packaged local assets
- visible error handling with popup and inline recovery patterns
- strong completion animations and milestone feedback
- feed-like scroll patterns for future social browsing engagement
- deployment-ready Vercel assumptions

## Quality bar

This project should be treated as a premium product, not a throwaway prototype.

The expected quality bar includes:

- smooth experience across device classes
- clean architecture
- strong reusability
- polished animations
- no duplicate work
- no component sprawl
- no second-class theme support
- no weak deployment assumptions
- no low-effort implementation disguised as “quick progress”

## Final instruction

Do not build casually.
Do not duplicate components.
Do not use components that are not in Storybook.
Do not hide errors silently.
Do not postpone theme system, responsiveness, PWA, Storybook, onboarding, sound, or animation strategy.
Do not ignore the project docs.
Do not skip the planning-review-approval loop.
Do not act without an explicit todo structure.
Do not forget token efficiency.
Do not weaken the product personality.
Do not use AI-like language patterns or synthetic phrasing in the app.
Do not ignore the user's device language as the default locale.
Do not move to implementation without confirming all rules with the verification gate.
Do not treat any checklist item as optional.
Do not claim success before evidence confirms every requirement is met.

Build something polished, reusable, playful, durable, and technically serious.

This should feel like a premium product people want to return to again and again.

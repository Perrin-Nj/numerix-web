# Test flows

Everything below runs on the live demo or locally. Run it against a local Go API (`pnpm dev`); the demo account is created by `scripts/seed-dev.mjs`.

- App (live): https://numerix-web-snowy.vercel.app
- Local: `pnpm dev` (Go API on :8081, app on :3000)

## Demo data you can rely on

| What | Value |
|---|---|
| Parent account | Register with any email and a password of 10+ characters. Log in with any email and any password, except the password `wrong-password`, which is always refused. |
| Profile Zoé | PIN **1234**, parent permission already given |
| Profile Max | No PIN, **no permission yet** (use it to see the "ask a grown-up" case) |
| Profiles you create | Keep the PIN you choose, start **without** permission until you accept it |
| Where the data lives | In your browser (a cookie). Another browser or a private window starts fresh. Clearing site data resets the demo. |

The small "Demo data" badge at the bottom left opens the failure simulator.

## Fast automated checks (no browser)

```bash
node scripts/flows.mjs https://numerix-web-snowy.vercel.app   # 30 checks in a few seconds
node scripts/ui-checks.mjs https://numerix-web-snowy.vercel.app # the screens in a real browser, one line per check
```

Both passed on the live deployment on 2026-10-12. The one `403` the browser check reports is the deliberate wrong-PIN test.

## A. First screen

1. Open the app. You see two doors: **Je suis un enfant** and **Je suis un adulte**.
2. Tap the kid door with nobody logged in: a screen says a grown-up must log in first, with a button to do it.

## B. Grown-up: account, profile, permission

1. Tap **Je suis un adulte**, then **Créer un compte**. Use `you@example.com` and a 10+ character password.
2. You land on **Nouvel enfant**. Fill the first name, grade, avatar. Turn on **Protéger le profil par un code** and enter 4 digits, for example 4321. Create.
3. The **Autorisation parentale** screen opens. Read it, switch **J'ai lu et j'autorise**, tap **Donner l'autorisation**.
4. Back on **Mes enfants**, the new child is listed with "Code à 4 chiffres requis pour jouer" and "Autorisation donnée".
5. Add another child without a PIN and **skip** the permission: its card shows "Autorisation requise" with a **Donner l'autorisation** button.
6. Open **Suivi** on a child: growth figures, where the child gets stuck, last stories. **Réglages**: daily goal, time limit, sound, read aloud, worlds. Change something, save, reload: it stays.
7. In **Réglages**, **Exporter les données** downloads a JSON file. **Supprimer le profil** needs you to type the first name.
8. The gear icon (account) changes the language, theme, reduced motion and display mode.

## C. Kid: choose a profile

1. From the first screen tap **Je suis un enfant**. Profiles appear as big avatars. A note in demo mode lists the PINs.
2. Tap Zoé: a PIN pad opens. Type a wrong code (0000): "Ce code ne correspond pas". Type 1234: you enter.
3. Tap Max: you get "Un adulte doit d'abord dire oui". Give permission from the grown-up area, then it works.
4. Tap the child you created and use the PIN you chose.

## D. Kid: home, tour, worlds, journey

1. First visit: a guided tour (4 steps) explains the home screen. Close it with the X ("Passer la visite"); it does not come back.
2. Home feed: next adventure, daily quest, streak and goal, worlds, latest cards.
3. **Mondes**: eight world tiles. Tap one: a winding path of chapters with locked, available, in progress, mastered and "to revisit" states.

## E. Kid: play a chapter (the story screen)

Nothing else is on screen: one story, one question, four choices, one pause button.

1. Tap **Jouer**. The story text streams in, then the question and choices appear.
2. Beat 1 (`7 × 8`): **56** is correct, **54** is a typical mistake (a detour in the story), 48 or 63 is a "random" mistake (a surprise). The correct answer is never shown for a mistake and nothing turns red.
3. Beat 2 (`48 ÷ 8`): **6** correct, **8** typical.
4. Beat 3 (`340 ÷ 7` with remainder): **48 remainder 4** correct, **48 remainder 0** typical.
5. After each answer, the consequence streams in. Tap **Continuer**.
6. After the third beat: the chapter-complete screen plays reward moments one by one (chapter, story card, streak, new power, daily goal). Confetti is short and stops with reduced motion.
7. Pause: the icon at the top right. **Faire une pause** returns home; the chapter resumes where you left it.
8. Sounds: you hear different sounds for taps, choices, dialogs, switches, outcomes, rewards, likes and notifications. Turn them off in the grown-up area (Réglages, Sons).

## F. Kid: the endless AI feed

1. Open **Découvrir** in the bottom bar.
2. Scroll or swipe: full-screen cards snap into place with a soft sound. Stories, fun facts, puzzles and challenges, each labeled **Généré par IA**. It never ends: keep going.
3. Tap the heart (like) or bookmark (save): a burst plays. Reload the page: your likes are still there.
4. On a puzzle card, answer: you get a short story line (never red, never the answer for a mistake).
5. On a story or challenge card, the button starts a chapter in that world.

## G. Failures (Demo data badge, bottom left)

Pick a case, then do something in the app. Every case must show a clear message with a way forward.

| Case | Expected message |
|---|---|
| Serveur injoignable | "Le problème vient de nous... Ce n'est pas ta connexion." |
| Session expirée | "Ta session est terminée", with a log-in button |
| Trop de demandes | "Doucement" |
| Erreur du serveur | "Un problème est survenu de notre côté" |
| Limite du jour atteinte | Friendly "C'est assez pour aujourd'hui" panel |
| Histoire de secours | The story shows a short version and says so |
| Histoire lente | "L'histoire prend un moment" with Réessayer and Voir la question |

The messages name the real cause:

- **Your device is offline**: turn on airplane mode, then log in or press Réessayer. "Ton appareil est hors ligne... Le problème vient de ta connexion."
- **We cannot tell which side**: the device says it is online but our app does not answer. The message says so and asks you to check other sites.
- **It is on us**: our servers do not answer. The message says it is not your connection.

## H. Language, themes, install

- Language follows the device (French or English). Change it in the grown-up area, Compte et préférences.
- Themes: system, light, dark, high contrast. Reduced motion switches animations off.
- Install: in Chrome or Edge, use the install icon in the address bar; on iPhone, Share then Add to Home Screen. Turn the network off: the app still opens and shows the offline page for pages it has not cached.

## I. What changed in v2 (try these too)

1. **Gift on first login.** The first time a child reaches the home screen after the tour, a gift box appears. Tap it: it opens and a "Le cadeau de bienvenue" card joins the collection. It never comes back for that child.
2. **One scroll.** The home screen scrolls with the page only (one scrollbar). The Discover feed also scrolls with the page and snaps card to card, silently.
3. **Home menu.** Big tiles: Play, Challenges, Discover, Worlds, Cards, Progress. The Challenges tile shows how many are still open.
4. **Challenges.** Open one, tap **Relever le défi**, then play. Progress counts only after you accept it. When it completes you get a celebration and a card. The grown-up overview lists the challenges and their progress.
5. **Real world map.** Finish a chapter with 3 right answers: that node becomes "Réussi" and the next one unlocks, in that world only. Mistakes keep a node "En cours". After about a week without practice a mastered node says "À revoir".
6. **Every world, its own story.** Play Nature, then Espace, then Cuisine: different heroes, places and wording. Replaying the same node gives different numbers and text.
7. **Leave the game.** In a chapter, the X at the top left asks "Quitter cette histoire ?". Leaving marks the session as left early. The grown-up recap says so, and it does not count for the streak.
8. **Theme switch.** The sun/moon button (home header, welcome screen, parent header) switches system, light, dark and high contrast.
9. **Different voices.** Outcomes use several sounds each. "Une surprise" is a low voice and changes from play to play. The feed makes no sound while scrolling.
10. **Everything stays.** Close the tab and come back: progress, cards, challenges and likes are still there, because the server keeps them.

Shell tests: `bash scripts/test.sh` (all), or `bash scripts/test.sh state|flows|ui|errors|mobile|live`.

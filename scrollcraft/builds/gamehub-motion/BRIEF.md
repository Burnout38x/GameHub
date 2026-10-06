# GameHub motion enhancement brief

Scope: existing multiplayer app, not a new cinematic marketing site. User direction: “use animation where it would make sense add effects and all, improve the overall userexperience and add logs so you know where you stopped.” User already selected warm dark AND bright/colorful themes with saved choice.

Authored implementation decisions under that scope:
- Audience: couples, friends, families gathering locally or online (user's original intent).
- Vibe: warm, playful, welcoming, readable.
- Journey: find a game -> choose a way to play -> gather players -> take turns -> celebrate results.
- Energy: inviting library, calm setup, focused play, a brief rewarding finish.
- Memorable moment: draw a game suggestion when the group cannot decide. Real playable game links, not decorative fake cards.
- Range: playful working interface. Keep familiar controls and existing game emojis. No generated assets required.
- Structure: distinct functional screens; no continuous world, pinned scroll, background video, or scroll hijacking.
- Assets: existing emoji/game names and bundled Geist font. No image/video spend.

Feeling curve: homepage curiosity (a dealt suggestion); library confidence (clear options and hover); setup calm (stable controls); gameplay focus (small score/turn feedback); result satisfaction (short entrance).
Peak: “It's the site where we draw a game and get everyone playing.” The suggestion controls resolve immediately into a real game link.
Motion score: transform-based card dealing, fine-pointer hover lift, opacity/translate route entrance, score-change pulse, transform-based progress. No layout animation. Each under 300ms except intentional brief suggestion deal.
Reduced motion: all controls and content remain usable; remove spatial animation and keep static states.
Verification: run normal/mobile/reduced motion screenshots and functional tests when browser capability permits; never claim visual PASS from source alone.

This is an enhancement pass using Scroll Landing Studio's motion, interaction, accessibility, and verification guidance. Its full new-site film/asset/act pipeline is not applicable to the existing game application scope.

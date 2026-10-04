Blue Yolk is a studio. Its identity is one blue dot, an imperfect circle, placed with intent on a black or white ground. The dot is the essence; the name is small. The only blue in the system is the dot. There is no blue theme.

Name: **Blue Yolk** in English, **بلو يولك** in Arabic. Never "Blue York".

## Symbol and logo

- Use the files in the Logos group as they are. Never redraw, retype or recolor them. Never redraw the dot as a perfect circle: its drift is about 5.3% and the master path is the only correct shape.
- Light grounds: dot in `brand` (#334FDE) with text #1C1C1E. Dark grounds: dot in Yolk Blue Lit (#4262FF) with white text. Files are named `-light` and `-dark` for the ground they are meant for.
- On dark grounds the dot has no ring, outline, shadow or glow. Place it on `bg` or on #1C1C1E only. It falls under 3:1 on #2C2C2E and lighter greys.
- The dot is the unit: d = the dot's own width. Standard lockup (horizontal): dot left, name right, name size 0.5 d, gap 0.5 d, name cap height centered on the dot's center. Large format (name size d/3) only for covers, posters and title cards with a dot of 40px or more. Under about 40px always use the standard lockup.
- Bilingual lockups put English, a thin divider, then Arabic (Arabic 1.15 times the English size, sharing the baseline). The RTL bilingual lockup puts the dot on the right next to the Arabic, for right-to-left layouts. Stacked lockups center the dot above the name.
- Clear space is 0.5 d on every side. Files in the Logos-clear-space group have it built in. Files in Logos are tight.
- Minimum sizes: dot only 12px (4 mm); horizontal and stacked: dot 22px wide (7 mm); bilingual: dot 25px wide (8 mm); large format: dot 40px.
- Do not change the blue, add tints or gradients, add a ring or outline, stretch or squash, add shadows or glows, place on mid-grey or busy grounds, or put the logo on a photograph that is not dark and quiet.
- The favicon (`favicon.svg`) is the dot alone and switches between `brand` and Lit blue with the operating system's dark mode setting.
- The logo and favicon never move.

## Color

- Tokens carry two themes, `light` and `dark`. Set `data-theme="dark"` to switch. Dark means true black and iOS dark greys, never navy.
- Surfaces: `bg`, then `bg-raised` for cards and inputs, then `bg-hover` for hover only. Hairlines use `divider`. Control borders use `line-control`.
- Text: `ink` for primary text, `ink-muted` for secondary text and captions, `ink-faint` only for disabled text and decorative icons on `bg`.
- `brand` is Yolk Blue: the dot, the primary button fill, the focus ring, link underlines and the current-page marker. Use the dark theme value on dark grounds. Never use it as a background, never tint it, never apply opacity to it. White text on it is `on-brand`.
- `accent` is Yolk Gold: 2% of a view or less and one element per view, for example the loader fill or one highlight. Never as text on a light ground. Text on it is `on-accent`.
- `danger`, `success` and `warning` are functional colors outside the brand palette. Use them only for messages and always with an icon and words. Never use them for decoration or layout.
- Links are `ink` text with a 2px `brand` underline, thicker on hover. Do not color link text blue.
- Contrast: body text meets 4.5:1 on its grounds in both themes. `brand` text is not used for body copy. The dark `brand` is 4.42:1 on black, so use it for the dot, fills and the focus ring, not for small text.

## Typography

- English headlines: Bricolage Grotesque, 700 for `h1` and `h2`, 500 for `h3`. Use it at 19px and above only.
- English text: Outfit 400 for `body`, `caption` and UI; labels are Outfit 500 in capitals with +14% tracking (`label`, 11px).
- Accent: Bodoni Moda 500, the `accent` style, one per layout, large sizes only, never in body text and never in the wordmark.
- Arabic: IBM Plex Sans Arabic for everything (`ar-h1` to `ar-caption`): headlines 700, card headings 600, body and captions 400. Arabic runs about 15% larger than Latin in lockups and needs taller line heights, as the `ar-` styles set. Never add letter-spacing to Arabic, never use capitals or tracked labels for it. Leave the dots inside Arabic letters as the font draws them.
- All four families are free on Google Fonts. Load them from there and keep the fallback stacks in `type.families`.
- Scale: `h1` 40/44, `h2` 26/30, `h3` 19/25, `body` 16/26, `caption` 13/19, `label` 11. Do not invent sizes between them.
- Set long English text at about 65 characters per line.

## Shape and layout

- Everything is a circle or a rounded rectangle. Only the dot may be an imperfect circle.
- Radii: inputs `radius-input` 14px, images `radius-image` 16px, cards `radius-card` 24px, buttons and chips `radius-pill`. Photos and avatars are rounded rectangles, never circle crops.
- Spacing runs on a 4px base: `space-1` 4, `space-2` 8, `space-3` 12, `space-4` 16, `space-5` 24, `space-6` 32, `space-7` 48, `space-8` 64, `space-9` 96. Page side gutter is `space-4` on phones and at least `space-5` on larger screens. Use only these steps.
- Separate surfaces by tone (`bg` to `bg-raised`), not by shadow, border or gradient. The system defines no shadows or gradients.
- Interactive targets are at least 44px tall.
- Layouts that carry Arabic mirror for right-to-left: use `dir="rtl"`, logical properties (`margin-inline`, `padding-inline`) and flip the RTL bilingual lockup.

## The dot as a graphic device

- One hero dot per composition. Small functional dots are allowed: list markers (8px), the current-page marker in navigation, the selected-chip marker.
- A single full stop in `brand` may end one headline per layout, for campaign pieces and not for screens where the logo is already prominent.
- Golden point: on an empty field, place the dot at 61.8% across and 38.2% down.
- Any dot used as a graphic is the master path. Never a perfect circle.

## Motion

- Stillness is the default. The logo and favicon never move.
- Loader: Fill (`accent` rises inside the `brand` dot). Special moments only: Wobble (squash capped at 8%, about 1.2 seconds, then the exact master dot). Page loads and intros: Settle (88% to 100% and fade up over 0.5 seconds). Ambient: Swell (106% and back over 4.5 seconds).
- One dot animates at a time on any screen. Animate only scale, position and opacity.
- With reduced motion enabled, all motion stops and the loader becomes a static half-filled gold dot.

## Icons

- UI icons: rounded outline on a 24px grid, 1.75px stroke, round caps and joins, no fills, color `ink` or `ink-muted`.
- Large decorative icons (feature blocks, empty states) may carry one `brand` dot. Never use that variant in dense UI.
- Draw or source every icon at the same stroke weight. Check each at 16px and 20px before use.

## Imagery

- Direction: poetic, dramatic, sometimes graphic and dynamic. See the Image component for the full rules.
- Photos sit in `radius-image` frames, on dark grounds by default.
- Captions are bracketed and lowercase in English (see the Caption component). Arabic captions keep the brackets in a lighter weight.

## Handoff

- Load `tokens.css` first, then `components/bundle.css`. Style by token names, never by literal values.
- Logos are SVG with outlined text, so they need no font files. PNG exports of the dot are 1024px.

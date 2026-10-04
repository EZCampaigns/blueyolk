# Blue Yolk (blueyolk.org)

The production lab and studio of EZ. A small static site in English and Arabic, built with plain Node (no packages to install).

## Run it on your computer

1. Install Node 18 or newer from nodejs.org.
2. In this folder run `npm run dev`.
3. Open http://localhost:4321

`npm run build` writes the finished site to `dist/` and checks it for broken links.

## Where things are

| What | Where |
| --- | --- |
| Exhibits (Work) | `content/work/NN-name.en.md` and `.ar.md` |
| Journal posts | `content/journal/YYYY-MM-DD-name.en.md` and `.ar.md` |
| About and Lab text | `content/pages/` |
| Interface words (menus, buttons) in both languages | `lib/strings.mjs` |
| Colours, type, layout | `src/style.css` (palette is at the top) |
| Motion (living blob, transitions, cursor) | `src/app.js` |
| Generated stand-in artwork | `lib/plates.mjs` |
| Logo and icons | `public/` |

Every exhibit and post needs an English file and an Arabic file with the same name. The build stops with a message if one is missing.

## Replacing the stand-ins

Anything marked `standin: true` shows a yellow "Stand-in" label. To replace one:

1. Edit its `.en.md` and `.ar.md` files (title, year, role, summary, text, credits).
2. Put your image in `public/img/work/` and add `image: /img/work/yourfile.jpg` and `imageAlt: A short description` to the top of the file.
3. Delete the `standin: true` line.

## Publishing on Cloudflare (Workers static assets)

Cloudflare recommends Workers static assets for new static sites. The settings are already in `wrangler.jsonc`.

1. Put this folder in a GitHub repository.
2. In Cloudflare: Workers & Pages, Create application, Import a repository, choose the repository.
3. Worker name: `blueyolk` (it must match `wrangler.jsonc`). Build command: `npm run build`. Deploy command: leave the default (`npx wrangler deploy`). If the build complains about Node, add the variable `NODE_VERSION` = `22`.
4. After the first deploy the site is live on a `workers.dev` address. Check it there first.
5. To use blueyolk.org, the domain's DNS must be on Cloudflare: add the site to Cloudflare, check that the email records were copied (MX, SPF, DKIM, autodiscover), then change the nameservers at Spaceship to the two Cloudflare gives you.
6. In the Worker: Settings, Domains & Routes, Add, Custom Domain: add `blueyolk.org` and `www.blueyolk.org`.

## Before launch

- Replace every stand-in exhibit and post, or remove them.
- Have the Arabic copy reviewed. It is a first draft.
- Check the colours in `src/style.css` against the original logo file.

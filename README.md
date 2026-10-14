# Nepali Type

Type Nepali the easy way, in the browser, on desktop or Android. Works offline and installs as an app.

**Live:** https://nepali-type.chandanshakya.com.np (also at https://nepali-type.pages.dev)

- **Romanized mode:** type how it sounds. `namaste` → नमस्ते, `kaa` → का, `kt` → क्त. Works with any phone keyboard.
- **Built-in dictionary:** about 800 common words, offline. Loose spellings find the right word (`nepal` → नेपाल, `bikas` → विकास). Tap the blue suggestion or press <kbd>Tab</kbd>. In Preeti mode it finishes the word you are typing.
- **Preeti keys mode:** the classic Preeti layout, keystroke for keystroke, as it behaves in Word or LibreOffice with the Preeti font. Comes with an on-screen keyboard.
- **Both outputs at once:** every mode shows Unicode Devanagari and the matching Preeti keystrokes. Copy either one.
- **Live hints:** the bar above the keyboard shows what each key did and what you can type next.
- **Keyboard-style layout:** the mode switch, Chart and ★ Saved sit in the bottom row next to space. The top bar can be hidden.
- **Saved words:** star a word and it stays on your device, ready in the suggestion bar and under **★ Saved**.
- **Chart and cheatsheet:** a quick chart inside the app, plus a full printable cheatsheet at [`/chart/`](https://nepali-type.chandanshakya.com.np/chart/) with the Preeti keyboard, the vowel table, half letters and every Romanized spelling.
- **Light and dark themes**, an installable PWA, and offline use after the first visit.

## Romanized cheat sheet

| Type | Get | Type | Get | Type | Get |
|---|---|---|---|---|---|
| `k` `ka` | क | `kaa` `kA` | का | `ki` / `kii` | कि / की |
| `ku` / `kuu` | कु / कू | `ke` / `kai` | के / कै | `ko` / `kau` | को / कौ |
| `t` / `T` | त / ट | `d` / `D` | द / ड | `n` / `N` | न / ण |
| `sh` / `Sh` | श / ष | `ch` / `chh` | च / छ | `x` `ksh` | क्ष |
| `gy` | ज्ञ | `kRi` | कृ | `M` / `~` / `H` | ं / ँ / ः |
| `\` | ् (halant) | `.` | । | `0`–`9` | ०–९ |

Two consonants in a row join (`kt` → क्त). `n` before k, kh, g or gh becomes ङ (`gangaa` → गङ्गा).

## Preeti notes

- `m` is not a letter in Preeti. It is a hook that changes the letter before it: `km` फ, `pm` ऊ, `em` झ, `qm` क्र, `Qm` क्त. A stray `m` shows in red and is left out of copied text. For म type `d`.
- `l` (ि) is typed before its letter. `{` (reph र्) is typed after it. The converter puts both in the right Unicode order.
- `0f`, `if`, `If` are single letters: ण, ष, क्ष.

## Development

Requires Node 22.12 or newer.

```bash
npm install
npm run dev       # http://localhost:4321
npm test          # converter self-check
npm run build     # static site in dist/
npm run preview   # serve dist/ locally
```

### Project layout

```
src/
  pages/index.astro     the typing app
  pages/chart.astro     printable cheatsheet, rendered at build time
  styles/base.css       theme tokens shared by both pages
  scripts/nepali.js     conversion logic (Preeti ⇄ Unicode, Romanized → Unicode), no DOM
  scripts/app.js        UI: modes, keyboard, hints, dictionary, saved words, theme, install
  data/words.txt        dictionary: one word per line, optional extra spellings after it
public/
  sw.js                 service worker; the build fills in the file list and version
  manifest.webmanifest  PWA manifest
  icon*, og.png         icons and social preview image
astro.config.mjs        site URL and the precache build hook
test.mjs                assertions for the converters
```

## Deploy

`npm run build` writes a fully static site to `dist/`. Host it on any static host (Cloudflare Pages, Netlify, Vercel, GitHub Pages, nginx).

- Build command: `npm run build`
- Output directory: `dist`
- Serve it over HTTPS. Service workers and the Install button need it.
- The site runs on Cloudflare Pages at `nepali-type.pages.dev`, with `nepali-type.chandanshakya.com.np` as its custom domain. Canonical and Open Graph URLs come from `site` in `astro.config.mjs`, so search engines treat the custom domain as the main address. If you move domains, change `site`.
- Don't let a CDN cache `sw.js` for long. Browsers check it for updates. `public/_headers` sets this (and long caching for hashed assets) on Cloudflare Pages and Netlify.

## Adding dictionary words

Add a line to `src/data/words.txt`. Put more common words higher, because order is the ranking. For names and English loanwords, add extra spellings after the word: `काठमाडौं kathmandu ktm`. Then run `npm test`. It lists any word that can't be typed back in Romanized mode.

## Privacy

Everything runs in your browser. Text, saved words and settings are stored only in your browser's local storage. Nothing is sent anywhere.

## License

MIT

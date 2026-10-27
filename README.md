# Nepali Type

Free Nepali typing in the browser, on desktop or Android. Type Romanized Nepali (`ka` → क) with dictionary suggestions, or use the classic Preeti Devanagari font layout. Unicode, Romanized and Preeti text side by side. Works offline and installs as an app.

**Live:** https://nepali-type.chandanshakya.com.np (also at https://nepali-type.pages.dev) · **Guide and cheatsheet:** [/chart/](https://nepali-type.chandanshakya.com.np/chart/)

[![Watch the 46-second demo](public/demo.jpg)](https://nepali-type.pages.dev/demo.mp4)

*Tap the image to watch the demo video.*

## Features

| Feature | How to use it |
|---|---|
| **Romanized typing** | Type how it sounds: `ka` क, `kaa` का, `namaste` नमस्ते. A consonant alone keeps its *a* sound, and two consonants join (`kt` क्त). Works with any phone keyboard. |
| **Dictionary suggestions** | About 800 common words, built in and offline. Loose spellings still find the word: `nepal` → नेपाल, `bikas` → विकास, `kathmandu` → काठमाडौं. Tap the blue suggestion, or press <kbd>Tab</kbd> on a computer. In font keys mode it finishes the word you're typing. |
| **Live hints** | The bar above the keyboard shows what each key did and what can come next. After `k` it offers ख, का, कि and so on. Tap a hint to type it. |
| **Devanagari font keys (Preeti layout)** | The classic font keyboard, keystroke for keystroke, as in Word or LibreOffice with the Preeti font. Use the on-screen keyboard or a physical one. ि is typed before its letter and reph र् after it; the app puts both in the right Unicode order. |
| **Movable cursor** | In font keys mode you can insert anywhere: **tap the text**, **drag the space bar** left or right (like Gboard), or use the arrow keys, Home, End and Delete. Typing, ⌫, hints and dictionary words all work at the cursor. |
| **Three outputs** | Unicode (for the web and modern apps), Romanized spelling (to learn a word or type it again) and Devanagari font keystrokes (to paste into Preeti documents). |
| **Same text in both modes** | Switching between Romanized and font keys converts your text, so nothing is lost. |
| **Copy any box** | Each box has a copy button in its top-right corner. A tick shows which one was copied. |
| **Saved words** | **★ Save** keeps the word before the cursor. Saved words show up in the suggestion bar and under **★ Saved** (tap to type, × to remove). |
| **Chart and cheatsheet** | **Chart** in the bottom row and the printable [`/chart/`](https://nepali-type.chandanshakya.com.np/chart/) page show the same alphabet: vowels, consonants, the full vowel table (बाह्रखरी), half letters, conjuncts, signs, digits and specials (the extra Preeti glyphs with their Windows Alt codes, plus ॐ and ऽ). Every letter is shown with its Romanized spelling and its font keys, and tapping a letter in the app types it in the current mode. A jump bar takes you to any consonant in the vowel table, and **Find** in the app's chart looks up a letter by Romanized spelling (`kha`, `ksh`), font key (`v`, `S`) or Devanagari. The cheatsheet also has the font keyboard and the Romanized rules. |
| **More room** | Hide the top bar with **⌃**. Card titles disappear and the buttons become icons. Bring the bar back with **⌄** in the bottom row. |
| **Welcome video** | Plays once on your first visit. Watch it again from Chart → Help → ▶ Watch the demo. |
| **Dark mode** | Follows your system until you choose with the moon button. |
| **Install and offline** | Install button in Chrome, Edge and Android; on iPhone use Share → Add to Home Screen. After the first visit it works with no internet (the demo video needs a connection). |
| **Private** | Everything runs in your browser. Text, saved words and settings stay on your device. No account, no tracking. |

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

## Font keys notes

- `m` is not a letter in the font layout. It is a hook that changes the letter before it: `km` फ, `pm` ऊ, `em` झ, `qm` क्र, `Qm` क्त. A stray `m` shows in red and is left out of copied text. For म type `d`.
- `l` (ि) is typed before its letter. `{` (reph र्) is typed after it. The converter puts both in the right Unicode order.
- `0f`, `if`, `If` are single letters: ण, ष, क्ष.
- A character the Preeti font has no key for (`!` `-` `:` `;`, ऑ ॉ ऽ ॐ, nukta letters) is shown in red in the font box. Those keys mean something else in the font (`!` is १, `;` is स), so the app never passes them through as if they were keys.

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
  pages/index.astro     the typing app, welcome popup, SEO metadata
  data/site.js          GitHub repo link and icon, shared by both pages
  pages/chart.astro     printable cheatsheet, rendered at build time
  styles/base.css       theme tokens shared by both pages
  scripts/nepali.js     conversion logic (Preeti ⇄ Unicode, Romanized → Unicode), no DOM
  scripts/app.js        UI: modes, keyboard, hints, dictionary, saved words, theme, install
  scripts/charts.js     the alphabet shown by the in-app chart and the cheatsheet
  components/Cell.astro one cheatsheet cell
  data/words.txt        dictionary: one word per line, optional extra spellings after it
public/
  sw.js                 service worker; the build fills in the file list and version
  manifest.webmanifest  PWA manifest
  icon*, og.png         icons and social preview image
  demo.mp4, demo.jpg    demo video (welcome popup, cheatsheet, README) and its poster
  sitemap.xml, robots.txt, _headers   SEO and hosting headers
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

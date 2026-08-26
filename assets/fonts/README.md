# Fonts

The schedule graphic is set in four families:

| Where | Family | Size (on the 900 × 1125 artboard) |
| --- | --- | --- |
| `week schedule` title | Reenie Beanie | 104 |
| Day labels — TUE / THU / SUN | Ekran | 82 |
| Run headline, in capitals | Cygre Light | 21 |
| Dates — AUG 18 | Cygre Black | 20 |
| Time and Location | Cygre Light | 20 |
| The extra note lines | Cygre SemiBold | 19 |
| `LX RUNNING COMMUNITY` wordmark | Montserrat | — |

The graphic exports at 1080 × 1350, so every size above is multiplied by 1.2
when it is drawn. That factor lives in one place — `DESIGN_W` at the top of
`assets/js/poster.js`.

## Two of them you have to add yourself

**Reenie Beanie** and **Montserrat** are bundled here, along with **Anton** and
**Poppins** which the page interface uses. All four are under the SIL Open Font
License, so they can live in this repository.

**Ekran** and **Cygre** are not open-licensed, so their font files are
deliberately not committed here. The graphic looks for them in two places, in
this order:

1. **Installed on the machine** — if you have Ekran and Cygre installed, the
   browser uses them and there is nothing else to do. This covers the usual
   case of exporting the graphic from your own laptop.
2. **A file in this folder** — drop a `woff2` in, with exactly these names:

   ```
   assets/fonts/ekran-400.woff2
   assets/fonts/cygre-300.woff2          Light
   assets/fonts/cygre-600.woff2          SemiBold
   assets/fonts/cygre-600-italic.woff2   SemiBold Italic
   assets/fonts/cygre-900.woff2          Black
   ```

   This is what makes the graphic come out right for anyone opening the page,
   including from GitHub Pages — but it publishes the font files, so only do it
   if your licence for Ekran and Cygre allows web use and redistribution.

Until a face is found, that part of the graphic falls back: Ekran to Anton, and
Cygre to Poppins. Nothing breaks — the type is simply not the club's.

## Converting a `.ttf` or `.otf` to `woff2`

```bash
pip install fonttools brotli
fonttools ttLib.woff2 compress -o assets/fonts/cygre-300.woff2 Cygre-Light.ttf
```

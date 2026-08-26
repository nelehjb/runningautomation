# LXRC Run Automation

A single mobile-first page that turns one week of club runs into the three
things that have to be produced every week:

1. **The schedule graphic** — the 1080 × 1350 Instagram post, drawn to match the
   club's existing layout and exported as a PNG.
2. **The Instagram caption** — in English and Portuguese, following the club's
   caption structure.
3. **Strava club events** — every field pre-filled in the order Strava's form
   asks for it, plus a calendar file for the whole week.

Fill in the week once; all three outputs come from the same data.

---

## What is automatic

Pick a week and the standard schedule is already there — Tuesday social run,
Thursday session, Sunday social run — with the right dates, times, locations and
meeting points.

On top of that, the recurring deals apply themselves:

| Rule | Behaviour |
| --- | --- |
| €1 tacos at Tacos La Malquerida | Third Tuesday of the month |
| €5 runners menu at Sunset Destination Hostel | Every other Tuesday |
| 15% off at Street Smash Burger | The fixed dates agreed with the restaurant |

Change any of it by hand and the caption, the graphic and the Strava events all
follow. Every week you touch is saved in the browser, so you can prepare several
weeks ahead and come back to them.

---

## Running it

It is a static site — no build step, no dependencies, nothing to install.

**Publish it on GitHub Pages**

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Source**, choose **Deploy from a branch**.
4. Pick the branch and the `/ (root)` folder, then **Save**.
5. After a minute the site is live at
   `https://<your-username>.github.io/<repository-name>/`.

Add it to your phone's home screen and it behaves like an app.

**Run it locally**

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

A local web server is needed (rather than opening `index.html` directly) so the
browser will load the fonts.

---

## Making it yours

Almost everything lives in **`assets/js/data.js`** — one file, plain English,
no framework:

- `LXRC.BRAND` — colours, hashtags, and your **Strava club id** (see below).
- `LXRC.DEALS` — each deal's wording and the `applies(date)` rule that decides
  when it is on.
- `LXRC.EVENTS` — the session library: times, locations, map links, bag drop,
  distances, and the caption wording in both languages.
- `LXRC.CAPTION_FRAME` — the fixed intro and closing lines.
- `LXRC.DEFAULT_WEEK` — which sessions a new week starts with.

To link the **Open Strava** button straight to the event form, set
`stravaClubId` in `LXRC.BRAND` to the part of your club URL after
`strava.com/clubs/`.

To change the caption for one session, edit its `caption` block:

```js
caption: {
  en: {
    lead: '🏃‍♂️‍➡️ {date}, we will have our social 6k and 4k runs. …',
    extras: ['Bag drop is available at Sunset Destination Hostel{dealClause}.']
  },
  pt: { … }
}
```

`{date}`, `{time}`, `{location}`, `{distance}`, `{signupUrl}` and `{dealClause}`
are filled in for you. `{dealClause}` disappears on weeks when no deal applies.

---

## About Strava

Strava's public API has no endpoint for creating club events, so this page
cannot post them for you. What it does instead:

- lays every field out in the same order as Strava's **Create an Event** form,
  with a one-tap **Copy all fields**;
- links straight to the form;
- exports the whole week as an `.ics` file for any calendar app, with the times
  correct for Europe/Lisbon including summer time.

---

## Notes

- **Everything stays in your browser.** Weeks and preferences are kept in
  `localStorage` — nothing is uploaded anywhere, and there are no third-party
  requests. Use **Export all weeks** to move your data to another device or to
  keep a backup.
- **The fonts are bundled** in `assets/fonts/` rather than loaded from a font
  CDN, so the graphic always renders with the right typefaces: Anton for the
  week title and the day labels, Poppins for the dates, times, meeting points
  and notes, and Montserrat for the wordmark. All three are licensed under the
  SIL Open Font License — see `assets/fonts/OFL-NOTICE.txt`.
- **Your own logo** can be dropped in under *Club logo & saved weeks*; without
  one, the wordmark is drawn.

---

## Layout

```
index.html               the page
assets/css/app.css       styles, light and dark
assets/css/fonts.css     bundled @font-face rules
assets/js/data.js        club data — edit this one
assets/js/util.js        dates, formatting, helpers
assets/js/week.js        the week model and saved weeks
assets/js/caption.js     caption builder (EN / PT)
assets/js/strava.js      Strava fields and .ics export
assets/js/poster.js      the graphic, drawn on a canvas
assets/js/app.js         screens and interactions
```

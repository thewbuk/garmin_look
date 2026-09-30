# Run films

Turn a run into a film. Drop the `.fit` file your watch recorded (or the `.zip` Garmin Connect
exports) and pick a template; it is drawn from the real data: the route, pace, heart rate, climbing,
splits and weather. The file is read in your browser and never uploaded.

| Template | Output |
|---|---|
| Film | 60 s, 16:9 video: the route draws itself, the run replays on the clock, then the climbing, heart rate, splits and finish |
| Story | 22 s, 9:16 video for a phone |
| Square | 17 s, 1:1 video for a feed |
| Poster | 4:5 PNG |
| Print | 3:4 PNG for the wall |

Every template has five colour looks, metric or imperial units, and weather (clear, cloud, rain,
snow) drawn over the whole picture. Videos export as MP4 (WebM where the browser can't record MP4);
this records the tab, so it needs Chrome or Edge on a desktop. PNGs work in any browser.

## Run it

```
pnpm install
pnpm dev          # http://localhost:3000
pnpm build
```

Next.js 16 (App Router), Tailwind CSS 4, shadcn/ui, anime.js. Every page is static; there is no server
code, so it deploys anywhere that serves a Next.js static build.

## Samples

Each template shows a made-up sample run until a visitor drops in their own.

```
pnpm mock                                   # regenerate the samples (tools/mock.mts)
pnpm sample path/to/activity.fit [story]    # use one of your own runs as a template's sample
```

A FIT file contains your exact routes. `data/` is git-ignored as a place to keep them.

## How it fits together

```
src/lib/fit.js           FIT decoder and zip opener, no dependencies, browser + Node
src/lib/build.js         decoded FIT -> RUN, the one object every template draws from
src/lib/runs.js          which run a page shows: the visitor's file (sessionStorage) or the sample
src/lib/kit.js           shared by templates: formatting, units, looks, weather, sound, transport, PNG export
src/templates/*.js       one module per template
src/components/Player    a template page: mounts the template, the control panel beside it
src/components/Panel     the controls (shadcn/ui), drawn from the template's `controls`
src/components/Landing   the home page
tools/                   sample generators
```

A template is a plain module: `mount(root, signal, resume?, embed?) -> { destroy, controls }`. It draws
with DOM, SVG and anime.js inside `root`, styled with Tailwind classes, and hands its timeline to
`Kit.transport(...)`, which plays it and returns the `controls` the panel draws. `resume` carries on
from a previous mount (after a look or unit change); `embed` mounts it inside a box on another page,
without keyboard shortcuts or file dropping. `src/templates/story.js` is the shortest one to copy.

In a FIT file: the GPS track, time (with the watch's pauses), distance, elevation, heart rate and the
watch's zone boundaries, pace, cadence, power, steps, calories, training effect and load. Not in it:
the activity title, place names and the weather; the home page lets a visitor type the title and
place, and the panel sets the weather.

## License

MIT

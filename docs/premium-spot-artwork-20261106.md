# Premium spot artwork — 2026-11-06

Production method: built-in image generation and precise-object editing. Final WebP assets are stored in `saiko-premium-spot/assets/`. Every edited bitmap is displayed only through authored SVG object masks over the original image; pixels outside those masks always come from A. Answer polygons and hit regions live in the embedded puzzledata configuration. This document is developer documentation, not game UI.

## Prompt set

- `greenhouse_a.webp`: illustration-story; portrait 2:3 Japanese anime storybook greenhouse tea room, red panda gardener, rabbit, stream and flowers; luminous painterly detail. Ten separated objects: yellow watering can, red butterfly, blue clock frame, pink flowerpot, gold apron button, orange bird, green boots, red gingham jar lid, yellow cup/saucer, purple basket bow. No text or panels.
- `greenhouse_b.webp`: precise-object-edit of A. Change those objects respectively to turquoise, blue, red, light blue, silver, blue, red, blue gingham, mint green, pink. Preserve all other geometry and details. Upper level: ten answers.
- `bookshop_a.webp`: illustration-story; portrait 2:3 seaside bookshop at sunset, otter bookseller and kitten, harbor and bougainvillea; seven separated objects: red lantern/tassel, blue parasol stripes, green parrot, yellow top book, purple scarf, terracotta flowerpot, red mug. No lettering or panels.
- `bookshop_b.webp`: precise-object-edit of A. Change those seven objects respectively to blue, red stripes, orange, turquoise, blue, pale blue, green. Preserve all other geometry and details. Middle level: seven answers.

Published question bank after this batch: beginner 4 scenes × 5 differences; intermediate 2 scenes × 7 differences; advanced 1 scene × 10 differences. Total 7 scenes, 44 differences. The original target of 30 scenes per level is not complete.

## Checks

Game tests cover all answer centers on both images, duplicate taps, hints, completion, local records, difficulty filtering and return to gallery. Asset uploads must match `git hash-object` exactly. Browser checks cover the actual deployed images and UI.

## 2026-11-07 additions

Built-in image generation and precise-object edits, with object masks restricting B to the authored changes:
- `assets/canal_florist_a.webp`: portrait 1024×1536, rainy canal-side flower shop, mouse florist and duck, warm window light, hydrangeas and roses. Seven isolated objects: umbrella, awning, lantern glass, watering can, apron bow, flowerpot, boots. No lettering or panels.
- `assets/canal_florist_b.webp`: edit A only: red umbrella→purple, blue awning→green, yellow lantern glass→pale blue, green watering can→turquoise, pink bow→blue, purple pot→yellow, red boots→blue. Everything else retains the original.
- `assets/mountain_station_a.webp`: portrait 1024×1536, sunny mountain railway cafe, tanuki stationmaster and squirrel, vintage train and viaduct, detailed luminous storybook/anime painting. Five isolated objects: clock frame, cafe flag, scarf, teapot, suitcase. No lettering or panels.
- `assets/mountain_station_b.webp`: edit A only: blue clock frame→red, red flag→green, yellow scarf→pale blue, green teapot→red, purple suitcase→turquoise. Everything else retains the original.

Answer coordinates and object polygons are in embedded puzzledata. After these additions: 5 beginner, 3 intermediate, 2 advanced scenes; 10 scenes / 66 differences. Unit tests also verify wraparound stays within each difficulty.

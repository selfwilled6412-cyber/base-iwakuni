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

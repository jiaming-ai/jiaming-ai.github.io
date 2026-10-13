# 今天吃什么 · What to Eat Today

A tiny static site that answers the daily question. Hit **Shuffle** and get 4–8 dishes drawn at random
from a library of ~760 dishes, balanced like a real home meal (mains, an egg or tofu dish, greens, a soup, a staple).
You can set how many of each (meat/fish, egg/tofu, veg, soup, staple), then add the menu to a multi-day **plan**
and get one combined **shopping list** with rough quantities for the number of people.
Every dish has a photo or recipe-video thumbnail, an embedded YouTube recipe, and links to more pictures and recipes.

- Shopping list: add meals for today, tomorrow... (lunch/dinner slots); quantities add up across the plan, scale with the number of people, and can be ticked off; plan and ticks are kept in the browser
- Filters: number of dishes, balanced vs. anything-goes, spice level, cooking time, cuisine
- Lock 🔒 dishes you like, swap 🔄 just one, save ❤️ favourites (kept in the browser), copy the menu as text
- Browse and search the whole library; dark mode; works on phones
- No build step and no dependencies: plain HTML / CSS / JS

## Run locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploy (GitHub Pages)

Everything uses relative paths, so the folder can be served from a repo root or from a sub-path
(for example `https://<user>.github.io/<repo>/` or `<site>/eat/`). Push it and enable Pages.

## Editing the dish library

The source of truth is `tools/dishes.tsv` (tab-separated; one dish per line):

```
中文名  English name  category  emoji  minutes  [wikipedia title]  [youtube query]  [kind]
```

`kind` is one of `meat seafood egg tofu veg soup staple cold snack sweet hotpot` (guessed from the category if omitted).
A dish with the same Chinese name as an earlier line replaces it. Then regenerate the data:

```bash
python3 tools/build_data.py        # data/dishes.js + photos in img/ (needs Pillow; photos from Wikipedia)
python3 tools/fetch_videos.py      # data/videos.json: top YouTube recipe videos per new dish
python3 tools/build_data.py        # merge videos into data/videos.js
# ingredients for the shopping list: add the dish id + tokens to tools/recipes.tsv, then
python3 tools/build_recipes.py --report   # data/recipes.js (vocabulary: tools/ingredients.tsv)
```

Photos are only used when the dish has its own Wikipedia article with a free-licence lead image
(see `SKIP_PHOTO` in `tools/build_data.py` for generic pages that are ignored); other dishes show the
video thumbnail, or a coloured emoji card when there is no video.

## Credits

Photos: Wikipedia / Wikimedia Commons (each card links to its source article). Recipe videos belong to their creators on YouTube.

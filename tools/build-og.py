"""Build one small landing page per product so a shared link previews properly.

The shop is a single page that swaps products behind the `#`, and the crawlers
behind Facebook, Instagram and Messenger neither run JavaScript nor look past
the `#`. Every product link therefore previewed as the same bare address with no
picture, no name and no price — the thing a customer decides on before they tap.

This writes a real page per product at `p/<slug>/`, carrying the Open Graph tags
in the markup where a crawler can read them, and bounces a human straight into
the shop. The catalogue comes from the same sheet the shop itself reads, so a
product added there grows a card without anyone touching the code.

Nothing here may ever take the shop down: every failure path leaves whatever is
already published exactly as it stands.
"""

import hashlib
import io
import json
import os
import re
import shutil
import sys
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES_DIR = os.path.join(ROOT, "p")
OG_DIR = os.path.join(ROOT, "og")
MANIFEST = os.path.join(OG_DIR, "manifest.json")

SITE = "https://starshopping-mn.github.io"
SITE_NAME = "Starshopping"
CARD_W, CARD_H = 1200, 630
# the shop is black; letterboxing to anything else would frame every card in a
# colour the brand never uses
CARD_BG = (8, 8, 10)
TIMEOUT = 45

# a slug becomes a directory name, so anything that could climb out of the tree
# or confuse a URL is refused rather than escaped into something unrecognisable
SAFE_SLUG = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")


def log(msg):
    print(msg, flush=True)


def data_source():
    """Read the feed address out of script.js.

    Keeping it in one place means a redeployed Apps Script never leaves the
    cards pointing at a dead address while the shop itself is fine.
    """
    with io.open(os.path.join(ROOT, "script.js"), encoding="utf-8") as fh:
        js = fh.read()
    m = re.search(r'DATA_SOURCE\s*=\s*\n?\s*"([^"]+)"', js)
    return m.group(1) if m else None


def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "starshopping-og-builder"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return json.loads(resp.read().decode("utf-8"))


def direct_image_url(raw):
    """Mirror of `imageUrl()` in script.js — a sheet holds Drive share links."""
    s = str(raw or "").strip()
    if not s:
        return ""
    m = re.search(r"drive\.google\.com/(?:file/d/|open\?id=|uc\?id=)([\w-]+)", s)
    if m:
        return "https://drive.google.com/thumbnail?id=%s&sz=w1200" % m.group(1)
    if s.startswith("http://") or s.startswith("https://"):
        return s
    return SITE + "/" + s.lstrip("/")


def esc(s):
    return (
        str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def one_line(s, limit=190):
    txt = re.sub(r"\s+", " ", str(s or "")).strip()
    return txt[: limit - 1] + "…" if len(txt) > limit else txt


def money(n):
    try:
        return "{:,}₮".format(int(float(n)))
    except (TypeError, ValueError):
        return ""


def price_of(p):
    """The number a customer would actually pay, discount included."""
    try:
        base = float(p.get("price") or 0)
    except (TypeError, ValueError):
        return 0
    try:
        off = float(p.get("discount") or 0)
    except (TypeError, ValueError):
        off = 0
    if 0 < off < 100:
        base = round(base * (100 - off) / 100)
    return int(base)


def card_image(src_url, dest):
    """Fetch the product shot and letterbox it onto a 1200x630 card.

    Served from our own domain rather than linked off to Drive: a crawler gets
    one hop with no redirects and no third party deciding whether to answer.
    """
    from PIL import Image

    req = urllib.request.Request(src_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        blob = resp.read()

    im = Image.open(io.BytesIO(blob))
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        flat = Image.new("RGB", im.size, CARD_BG)
        flat.paste(im, mask=im.split()[-1])
        im = flat
    else:
        im = im.convert("RGB")

    im.thumbnail((CARD_W, CARD_H), Image.LANCZOS)
    card = Image.new("RGB", (CARD_W, CARD_H), CARD_BG)
    card.paste(im, ((CARD_W - im.width) // 2, (CARD_H - im.height) // 2))
    card.save(dest, "JPEG", quality=86, optimize=True, progressive=True)


PAGE = """<!DOCTYPE html>
<html lang="mn">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} · {site_name}</title>
<link rel="canonical" href="{url}">
<meta name="description" content="{desc}">

<meta property="og:type" content="product">
<meta property="og:site_name" content="{site_name}">
<meta property="og:locale" content="mn_MN">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
{image_tags}
<meta property="product:price:amount" content="{price_raw}">
<meta property="product:price:currency" content="MNT">

<meta name="twitter:card" content="{twitter_card}">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
{twitter_image}

<!-- A crawler stops at the markup above; a person never sees this page. The
     redirect is script-only on purpose, because a meta refresh would send the
     crawler on to the shop, where there is nothing for it to read. -->
<script>location.replace({target});</script>
<style>
  body {{ margin:0; min-height:100vh; display:grid; place-items:center;
          background:#08080a; color:#fff;
          font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }}
  a {{ color:#fff; }}
</style>
</head>
<body>
<p>{title} — <a href="{target_plain}">дэлгүүр рүү орох</a></p>
</body>
</html>
"""


def render(product, image_name):
    slug = product["slug"]
    title = one_line(product.get("name") or slug, 90)
    price = price_of(product)
    bits = [b for b in (money(price), one_line(product.get("desc"), 150)) if b]
    desc = one_line(" · ".join(bits), 200)
    url = "%s/p/%s/" % (SITE, slug)
    target = "%s/#/p/%s" % (SITE, urllib.parse.quote(slug, safe=""))

    if image_name:
        img = "%s/og/%s" % (SITE, image_name)
        image_tags = (
            '<meta property="og:image" content="{i}">\n'
            '<meta property="og:image:secure_url" content="{i}">\n'
            '<meta property="og:image:type" content="image/jpeg">\n'
            '<meta property="og:image:width" content="{w}">\n'
            '<meta property="og:image:height" content="{h}">\n'
            '<meta property="og:image:alt" content="{a}">'
        ).format(i=img, w=CARD_W, h=CARD_H, a=esc(title))
        twitter_image = '<meta name="twitter:image" content="%s">' % img
        twitter_card = "summary_large_image"
    else:
        image_tags = ""
        twitter_image = ""
        twitter_card = "summary"

    return PAGE.format(
        title=esc(title),
        desc=esc(desc),
        url=esc(url),
        site_name=esc(SITE_NAME),
        price_raw=price,
        image_tags=image_tags,
        twitter_image=twitter_image,
        twitter_card=twitter_card,
        target=json.dumps(target),
        target_plain=esc(target),
    )


OFFLINE_NOTE = (
    "Автоматаар үүсдэг — гараар засах шаардлагагүй. tools/build-og.py нь Sheet-ийн "
    "feed-ээс 20 минут тутам хуулна. Сайт эхлэхдээ үүнээс зурж, дараа нь Sheet-ийн "
    "жинхэнэ өгөгдлөөр солино. Хуучирсан байвал зарын холбоосоор ирсэн хүн хоосон "
    "категори эсвэл олдохгүй бараа хардаг."
)


def write_offline_copy(feed):
    """Keep the bundled catalogue in step with the sheet.

    The shop paints from this file before the slow feed answers. When it held a
    different catalogue than the sheet, a category reached from an ad listed
    nothing and a product reached from a reel could not be found at all — the
    visitor met an empty shelf on the way in. Copying the live answer here means
    the first thing painted is already the truth.
    """
    body = {"_note": OFFLINE_NOTE}
    for key in ("shop", "categories", "products", "bundles", "reviews", "stock"):
        if key in feed:
            body[key] = feed[key]

    text = json.dumps(body, ensure_ascii=False, indent=2, sort_keys=False) + "\n"
    target = os.path.join(ROOT, "data", "catalog.json")
    old = ""
    if os.path.exists(target):
        with io.open(target, encoding="utf-8") as fh:
            old = fh.read()
    if old != text:
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with io.open(target, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(text)
        log("  offline catalogue refreshed from the sheet")


def load_manifest():
    try:
        with io.open(MANIFEST, encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return {}


def main():
    src = data_source()
    if not src:
        log("! DATA_SOURCE not found in script.js — leaving the published cards alone")
        return 0

    try:
        feed = fetch_json(src)
    except Exception as err:
        log("! the sheet did not answer (%s) — leaving the published cards alone" % err)
        return 0

    products = [p for p in (feed.get("products") or []) if p.get("active") is not False]
    if not products:
        # an empty answer is far more likely to be a bad deploy than a shop with
        # nothing in it, and acting on it would delete every card at once
        log("! the feed carried no products — leaving the published cards alone")
        return 0

    write_offline_copy(feed)

    os.makedirs(PAGES_DIR, exist_ok=True)
    os.makedirs(OG_DIR, exist_ok=True)
    manifest = load_manifest()
    fresh = {}
    skipped = []

    for p in sorted(products, key=lambda x: str(x.get("slug") or "")):
        slug = str(p.get("slug") or "").strip()
        if not SAFE_SLUG.match(slug):
            skipped.append(slug or "(blank)")
            continue

        raw = (p.get("images") or [None])[0]
        src_img = direct_image_url(raw)
        image_name = "%s.jpg" % slug
        dest = os.path.join(OG_DIR, image_name)
        stamp = hashlib.sha1(src_img.encode("utf-8")).hexdigest() if src_img else ""

        have = manifest.get(slug, {}).get("stamp") == stamp and os.path.exists(dest)
        if src_img and not have:
            try:
                card_image(src_img, dest)
                log("  card image rebuilt: %s" % slug)
            except Exception as err:
                # a page with no picture still beats no page at all
                log("  ! could not fetch the shot for %s (%s)" % (slug, err))
                if not os.path.exists(dest):
                    image_name = ""
                    stamp = ""
        elif not src_img:
            image_name = ""

        if image_name and not os.path.exists(dest):
            image_name = ""

        folder = os.path.join(PAGES_DIR, slug)
        os.makedirs(folder, exist_ok=True)
        page = render(p, image_name)
        target = os.path.join(folder, "index.html")
        old = ""
        if os.path.exists(target):
            with io.open(target, encoding="utf-8") as fh:
                old = fh.read()
        if old != page:
            with io.open(target, "w", encoding="utf-8", newline="\n") as fh:
                fh.write(page)
            log("  page written: p/%s/" % slug)

        fresh[slug] = {"stamp": stamp, "image": image_name}

    # retire anything the sheet no longer lists, now that we know the feed was
    # genuinely answered and genuinely non-empty
    for gone in sorted(set(manifest) - set(fresh)):
        shutil.rmtree(os.path.join(PAGES_DIR, gone), ignore_errors=True)
        old_img = manifest.get(gone, {}).get("image")
        if old_img:
            try:
                os.remove(os.path.join(OG_DIR, old_img))
            except OSError:
                pass
        log("  retired: %s" % gone)

    with io.open(MANIFEST, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(fresh, fh, ensure_ascii=False, indent=2, sort_keys=True)
        fh.write("\n")

    log("cards ready for %d product(s)" % len(fresh))
    if skipped:
        log("! skipped, the slug is not usable as a web address: %s" % ", ".join(skipped))
        log("  use latin letters, digits and hyphens only, e.g. huvtsas-hadgalah-sags")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as err:  # never let this stop the shop from deploying
        log("! card builder failed outright (%s) — published cards left as they are" % err)
        sys.exit(0)

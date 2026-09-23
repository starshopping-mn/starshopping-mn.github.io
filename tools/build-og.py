"""Build one small landing page per product so a shared link previews properly.

The shop is a single page that swaps products behind the `#`, and the crawlers
behind Facebook, Instagram and Messenger neither run JavaScript nor look past
the `#`. Every product link therefore previewed as the same bare address with no
picture, no name and no price — the thing a customer decides on before they tap.

This writes a real page per product at `p/<slug>/`, carrying the Open Graph tags
in the markup where a crawler can read them, and bounces a human straight into
the shop. The catalogue is read exactly as the shop reads it (`catalog.py`):
products from Supabase, shop details from the sheet — so a product registered
in the owner's form grows a card without anyone touching the code.

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

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalog as catalogue  # noqa: E402  (the shop's own reading of the catalogue)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES_DIR = os.path.join(ROOT, "p")
OG_DIR = os.path.join(ROOT, "og")
MANIFEST = os.path.join(OG_DIR, "manifest.json")
PHOTO_DIR = os.path.join(ROOT, "img")
PHOTO_MANIFEST = os.path.join(PHOTO_DIR, "manifest.json")
# what the shop actually draws: a shelf thumbnail about 150 points wide, and a
# gallery photo filling a phone at three times density
PHOTO_WIDTHS = (400, 1200)
PHOTO_QUALITY = 82

SITE = "https://starshopping.mn"
SITE_NAME = "Starshopping"
# public identifier, not a secret: ties shares of these links back to the shop's
# Meta app so they appear in its insights
FB_APP_ID = "3475902549234725"
CARD_W, CARD_H = 1200, 630
# the cream the shop is painted in; letterboxing to anything else would frame
# every card in a colour the brand never uses
CARD_BG = (251, 247, 240)
TIMEOUT = 45

# a slug becomes a directory name, so anything that could climb out of the tree
# or confuse a URL is refused rather than escaped into something unrecognisable
SAFE_SLUG = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")


def log(msg):
    print(msg, flush=True)


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


DRIVE_ID = re.compile(r"drive\.google\.com/(?:file/d/|open\?id=|uc\?id=)([\w-]+)")


def drive_id(raw):
    m = DRIVE_ID.search(str(raw or ""))
    return m.group(1) if m else ""


def photo_name(file_id, width):
    return "%s-%d.webp" % (file_id, width)


def drive_length(file_id):
    """How many bytes Drive says the photo is, without downloading it.

    A file id is stable, so on its own it cannot tell us the owner swapped the
    picture behind it. Asking for the length costs one header round trip and
    catches exactly that. When Drive declines to say, we keep what we have
    rather than re-fetching every photo every twenty minutes.
    """
    url = "https://drive.google.com/thumbnail?id=%s&sz=w%d" % (file_id, max(PHOTO_WIDTHS))
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return int(resp.headers.get("Content-Length") or 0)
    except Exception:
        return 0


def mirror_photo(file_id):
    """Put one product photo on our own domain, as WebP, at both widths.

    The sheet holds Drive share links, so every photo on a product page came
    from a third party as a half-megabyte PNG — measured at 505KB and up to
    four seconds apiece on a wired line, and on a phone that is the whole wait
    before anyone sees what they are buying. Google is not slow; it is a hop
    the shop does not control, and PNG is the wrong format for a photograph.
    Re-encoded here they land around a tenth of the size, served from the same
    host as the page that needs them.

    Raises if Drive will not answer, and the caller leaves the previous mirror
    (or the Drive address itself) in place.
    """
    from PIL import Image

    url = "https://drive.google.com/thumbnail?id=%s&sz=w%d" % (file_id, max(PHOTO_WIDTHS))
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        blob = resp.read()

    im = Image.open(io.BytesIO(blob))
    # a cut-out with transparency is laid on the shop's own cream rather than
    # left to whatever happens to be painted behind it
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        flat = Image.new("RGB", im.size, CARD_BG)
        flat.paste(im, mask=im.split()[-1])
        im = flat
    else:
        im = im.convert("RGB")

    written = []
    for width in PHOTO_WIDTHS:
        out = im.copy()
        # never enlarged: the sheet's photos are often smaller than the box
        # they are drawn in, and upscaling only costs bytes
        if out.width > width:
            out.thumbnail((width, width * 20), Image.LANCZOS)
        name = photo_name(file_id, width)
        out.save(os.path.join(PHOTO_DIR, name), "WEBP", quality=PHOTO_QUALITY, method=6)
        written.append(name)
    return written


def mirror_photos(products):
    """Mirror every photo the shop draws, and retire the ones it no longer does.

    Nothing here is allowed to matter to whether the shop works: each photo
    that cannot be fetched is simply left unmirrored, and the page falls back
    to the Drive address it used before any of this existed.
    """
    try:
        with io.open(PHOTO_MANIFEST, encoding="utf-8") as fh:
            have = json.load(fh)
    except Exception:
        have = {}

    wanted = []
    for p in products:
        for raw in list(p.get("images") or []) + list(p.get("colorImages") or []) + list(
            p.get("sizeImages") or []
        ):
            fid = drive_id(raw)
            if fid and fid not in wanted:
                wanted.append(fid)

    os.makedirs(PHOTO_DIR, exist_ok=True)
    fresh = {}
    built = 0
    for fid in wanted:
        known = have.get(fid) or {}
        files = known.get("files") or []
        on_disk = files and all(os.path.exists(os.path.join(PHOTO_DIR, f)) for f in files)
        length = drive_length(fid)
        # a length of zero means Drive would not say, so we keep what we have
        unchanged = on_disk and (length == 0 or length == known.get("len"))
        if unchanged:
            fresh[fid] = known
            continue
        try:
            files = mirror_photo(fid)
            fresh[fid] = {"len": length, "files": files}
            built += 1
            log("  photo mirrored: %s" % fid)
        except Exception as err:
            log("  ! could not mirror photo %s (%s) — the page will use Drive" % (fid, err))
            if on_disk:
                fresh[fid] = known

    for gone in sorted(set(have) - set(fresh)):
        for f in (have[gone].get("files") or []):
            try:
                os.remove(os.path.join(PHOTO_DIR, f))
            except OSError:
                pass
        log("  photo retired: %s" % gone)

    with io.open(PHOTO_MANIFEST, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(fresh, fh, ensure_ascii=False, indent=2, sort_keys=True)
        fh.write("\n")

    log("photos on our own domain: %d (%d rebuilt this run)" % (len(fresh), built))


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

<meta property="fb:app_id" content="{fb_app_id}">
<!-- `website`, not `product`. Meta validates a typed object against the app
     named above and reports the app id as missing when that app has not
     declared the type — which flagged every product link while the front page,
     typed `website`, passed. The preview is built from title, description and
     image regardless of type, so nothing is lost by saying the plainer thing.
     The price tags below stay: they cost nothing and a catalogue may read them. -->
<meta property="og:type" content="website">
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
     crawler on to the shop, where there is nothing for it to read.
     The query string rides along: an ad link ends in ?ref=<creative>, and a
     redirect that drops it leaves every order unattributed. -->
<!-- Before leaving, it tells the shop which photo it is about to need (W8.4):
     the shop can then start that one file in its <head>, before its catalogue
     arrives, instead of drawing a grey box first. Same origin, so the note
     survives the hop; a refused storage just means no head start. -->
<script>{first_note}location.replace({base} + location.search + {hash});</script>
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


def first_photo(product):
    """The mirrored first photo the product page will draw, as the shop names it
    (img/<id>-1200.webp), or "" when there is none on our domain yet."""
    fid = drive_id((product.get("images") or [None])[0])
    if not fid:
        return ""
    name = photo_name(fid, max(PHOTO_WIDTHS))
    return "img/" + name if os.path.exists(os.path.join(PHOTO_DIR, name)) else ""


def render(product, image_name):
    slug = product["slug"]
    title = one_line(product.get("name") or slug, 90)
    price = price_of(product)
    # a product sold ahead of arrival says so under the reel too: the wait is
    # part of the offer, and someone who learns it only on the form feels tricked
    ahead = ""
    if product.get("fulfillment") in ("preorder", "test"):
        days = product.get("shipsInDays")
        ahead = "Урьдчилсан захиалга" + (" · ~%d хоногт" % days if days else "")
    bits = [b for b in (money(price), ahead, one_line(product.get("desc"), 150)) if b]
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
        fb_app_id=esc(FB_APP_ID),
        price_raw=price,
        image_tags=image_tags,
        twitter_image=twitter_image,
        twitter_card=twitter_card,
        base=json.dumps(SITE + "/"),
        hash=json.dumps("#/p/%s" % urllib.parse.quote(slug, safe="")),
        target_plain=esc(target),
        first_note=(
            'try{sessionStorage.setItem("ss_first",%s)}catch(e){}'
            % json.dumps(slug + "|" + first_photo(product))
            if first_photo(product)
            else ""
        ),
    )


OFFLINE_NOTE = (
    "Автоматаар үүсдэг — гараар засах шаардлагагүй. tools/build-og.py нь 20 минут тутам "
    "барааг Supabase-аас (web_products), дэлгүүрийн мэдээлэл, категори, багц, сэтгэгдлийг "
    "Sheet-ийн feed-ээс хуулна. Сайт эхлэхдээ үүнээс зурж, дараа нь жинхэнэ өгөгдлөөр "
    "солино. Хуучирсан байвал зарын холбоосоор ирсэн хүн хоосон категори эсвэл олдохгүй "
    "бараа хардаг."
)


def write_offline_copy(feed, source):
    """Keep the bundled catalogue in step with the live one.

    The shop paints from this file before the slow backends answer. When it
    held a different catalogue than they did, a category reached from an ad
    listed nothing and a product reached from a reel could not be found at
    all — the visitor met an empty shelf on the way in. Copying the live answer
    here means the first thing painted is already the truth.
    """
    body = {"_note": OFFLINE_NOTE}
    for key in ("shop", "categories", "products", "bundles", "reviews", "stock"):
        if key in feed:
            body[key] = feed[key]
    # The shop draws its phone numbers from its own code, never from here, and
    # the sheet's cell still named two numbers that stopped being the shop's in
    # September 2026. A public file is no place for them to keep coming back.
    if isinstance(body.get("shop"), dict) and "phones" in body["shop"]:
        body["shop"] = dict((k, v) for k, v in body["shop"].items() if k != "phones")

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
        log("  offline catalogue refreshed (products from %s)" % source)


def load_manifest():
    try:
        with io.open(MANIFEST, encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return {}


def main():
    feed, source, notes = catalogue.load_catalog()
    for note in notes:
        log("  ~ " + note)
    if feed is None:
        log("! no catalogue answered — leaving the published cards alone")
        return 0
    source = "Supabase" if source == "supabase" else "the sheet"
    log("catalogue read: products from %s" % source)

    products = [p for p in (feed.get("products") or []) if p.get("active") is not False]
    if not products:
        # an empty answer is far more likely to be a bad deploy than a shop with
        # nothing in it, and acting on it would delete every card at once
        log("! the catalogue carried no products — leaving the published cards alone")
        return 0

    write_offline_copy(feed, source)

    # kept apart from the card build: a photo that will not mirror must not
    # stop a single card from being written
    try:
        mirror_photos(products)
    except Exception as err:
        log("! photo mirroring failed outright (%s) — pages will use Drive" % err)

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

    # retire anything the catalogue no longer lists, now that we know it was
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

"""Walk the shop the way a customer arriving from an advert would, and fail loudly.

Traffic reaches this shop through links sent straight to people — under a reel,
or by the reply automation answering a comment. If a link stops resolving, or a
picture stops loading, or a price on a preview card drifts away from the sheet,
nobody complains: they simply do not buy, and the advert spend goes on regardless.

So this checks the things that actually cost money when they break, on a timer,
and fails the run when they do — GitHub mails the owner on a failed run.

Every check is retried before it is believed: one refused connection somewhere
between here and Ulaanbaatar is not an outage, and an alert that cries wolf gets
ignored, which is worse than no alert at all.
"""

import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://starshopping-mn.github.io"
TIMEOUT = 45
TRIES = 3
UA = "Mozilla/5.0 (compatible; starshopping-health-check)"

problems = []
notes = []


def log(msg):
    print(msg, flush=True)


def fail(what, detail):
    problems.append((what, detail))
    log("  FAIL  %s — %s" % (what, detail))


def ok(what, detail=""):
    log("  ok    %s%s" % (what, (" — " + detail) if detail else ""))


def fetch(url, head=False, as_crawler=False):
    """Return (status, body_or_none). Retries before giving up on the network."""
    last = None
    for attempt in range(TRIES):
        try:
            agent = "facebookexternalhit/1.1" if as_crawler else UA
            req = urllib.request.Request(url, headers={"User-Agent": agent})
            if head:
                req.get_method = lambda: "HEAD"
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                body = b"" if head else resp.read()
                return resp.getcode(), body
        except urllib.error.HTTPError as err:
            return err.code, None
        except Exception as err:  # network wobble — worth another go
            last = err
            if attempt < TRIES - 1:
                time.sleep(3 * (attempt + 1))
    return None, str(last)


def data_source():
    with io.open(os.path.join(ROOT, "script.js"), encoding="utf-8") as fh:
        js = fh.read()
    m = re.search(r'DATA_SOURCE\s*=\s*\n?\s*"([^"]+)"', js)
    return m.group(1) if m else None


def meta(html, prop):
    m = re.search(r'(?:property|name)="%s" content="([^"]*)"' % re.escape(prop), html)
    return m.group(1) if m else None


def drive_direct(raw):
    s = str(raw or "").strip()
    m = re.search(r"drive\.google\.com/(?:file/d/|open\?id=|uc\?id=)([\w-]+)", s)
    if m:
        return "https://drive.google.com/thumbnail?id=%s&sz=w1200" % m.group(1)
    if s.startswith("http"):
        return s
    return SITE + "/" + s.lstrip("/") if s else ""


def price_of(p):
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


def main():
    log("\n== the shop itself ==")
    code, body = fetch(SITE + "/")
    if code != 200:
        fail("home page", "returned %s" % code)
    else:
        html = body.decode("utf-8", "replace")
        ok("home page", "200")
        if not meta(html, "og:image"):
            fail("home page preview", "og:image missing — a shared link shows no picture")
        else:
            ok("home page preview tags")

    log("\n== the catalogue feed ==")
    src = data_source()
    if not src:
        fail("feed address", "DATA_SOURCE not found in script.js")
        return finish()

    code, body = fetch(src)
    if code != 200 or not body:
        fail("sheet feed", "returned %s — the shop is running on its offline copy" % code)
        return finish()
    try:
        feed = json.loads(body.decode("utf-8"))
    except Exception as err:
        fail("sheet feed", "did not return usable data (%s)" % err)
        return finish()

    products = [p for p in (feed.get("products") or []) if p.get("active") is not False]
    if not products:
        fail("sheet feed", "answered with no products at all")
        return finish()
    ok("sheet feed", "%d product(s) on sale" % len(products))

    log("\n== the offline copy the shop opens with ==")
    try:
        code, body = fetch(SITE + "/data/catalog.json")
        offline = json.loads(body.decode("utf-8"))
        live_slugs = sorted(p.get("slug") for p in products)
        off_slugs = sorted(p.get("slug") for p in (offline.get("products") or []))
        if live_slugs != off_slugs:
            # not a failure: the rebuild runs on a timer and catches up shortly
            notes.append("offline copy is behind the sheet — it refreshes within ~20 minutes")
            log("  note  offline copy is behind the sheet (rebuild pending)")
        else:
            ok("offline copy matches the sheet")
    except Exception as err:
        fail("offline copy", "could not be read (%s)" % err)

    log("\n== every product link a customer might be sent ==")
    for p in sorted(products, key=lambda x: str(x.get("slug") or "")):
        slug = str(p.get("slug") or "").strip()
        log("\n  %s" % slug)

        if not re.match(r"^[A-Za-z0-9][A-Za-z0-9._-]*$", slug):
            fail(slug, "slug cannot be a web address, so this product has no preview card")
            continue

        card = "%s/p/%s/" % (SITE, slug)
        code, body = fetch(card, as_crawler=True)
        if code != 200 or not body:
            fail(slug + " card page", "%s returned %s" % (card, code))
            continue
        html = body.decode("utf-8", "replace")
        ok("card page", "200")

        wanted = ("og:title", "og:description", "og:image", "og:url", "fb:app_id")
        missing = [t for t in wanted if not meta(html, t)]
        if missing:
            fail(slug + " preview tags", "missing " + ", ".join(missing))
        else:
            ok("preview tags complete")

        # the price a customer reads on the preview must be the price on sale
        shown = meta(html, "product:price:amount")
        want = str(price_of(p))
        if shown != want:
            fail(slug + " preview price", "card says %s, the sheet says %s" % (shown, want))
        else:
            ok("preview price matches the sheet", want + "₮")

        img = meta(html, "og:image")
        if img:
            code, _ = fetch(img, head=True)
            if code != 200:
                fail(slug + " card image", "%s returned %s" % (img, code))
            else:
                ok("card image loads")

        # the photographs on the product page itself
        shots = [s for s in (p.get("images") or []) if str(s).strip()]
        if not shots:
            fail(slug + " photographs", "this product has no pictures at all")
        else:
            bad = []
            for raw in shots:
                url = drive_direct(raw)
                code, _ = fetch(url, head=True)
                if code != 200:
                    bad.append("%s -> %s" % (str(raw)[:48], code))
            if bad:
                fail(slug + " photographs", "; ".join(bad))
            else:
                ok("all %d photograph(s) load" % len(shots))

    return finish()


def finish():
    log("\n" + "=" * 58)
    for n in notes:
        log("NOTE: " + n)
    if problems:
        log("%d PROBLEM(S) — the shop needs attention:" % len(problems))
        for what, detail in problems:
            log("  · %s: %s" % (what, detail))
        return 1
    log("Everything a customer touches is working.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as err:
        log("health check itself broke: %s" % err)
        # a broken checker is worth knowing about, but say so plainly
        sys.exit(1)

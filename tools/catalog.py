"""One reading of the catalogue for the tools, the same reading the shop makes.

Products and their stock come from Supabase (`web_products`), the database the
order intake prices from. The shop's own details — bank, delivery, categories,
bundles, reviews — still come from the sheet feed, with `data/catalog.json` as
the copy of last resort. `script.js` (`fromSupabase`) applies exactly these
rules, so a preview card, the health check and the page itself agree on every
name, picture and price.

Addresses and the public anon key are read out of `script.js` rather than kept
here twice: a moved backend is then one edit, and the tools cannot go on
reading a catalogue the shop no longer shows.
"""

import io
import json
import os
import re
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TIMEOUT = 45
UA = "starshopping-tools"


def read_constants():
    with io.open(os.path.join(ROOT, "script.js"), encoding="utf-8") as fh:
        js = fh.read()

    def grab(name):
        m = re.search(r'%s\s*=\s*\n?\s*"([^"]+)"' % name, js)
        return m.group(1) if m else ""

    return {"sheet": grab("DATA_SOURCE"), "supabase": grab("SUPABASE_URL"), "anon": grab("SUPABASE_ANON")}


def fetch_json(url, headers=None, data=None, timeout=TIMEOUT):
    hdrs = {"User-Agent": UA}
    hdrs.update(headers or {})
    req = urllib.request.Request(url, data=data, headers=hdrs)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_supabase(consts):
    """The rows `web_products` returns, or None when the shop has no address for it."""
    if not (consts.get("supabase") and consts.get("anon")):
        return None
    url = consts["supabase"].rstrip("/") + "/rest/v1/rpc/web_products"
    hdrs = {
        "apikey": consts["anon"],
        "Authorization": "Bearer " + consts["anon"],
        "Content-Type": "application/json",
    }
    rows = fetch_json(url, hdrs, b"{}")
    if isinstance(rows, list):
        return rows
    return (rows or {}).get("products") or []


def url_list(v):
    if isinstance(v, list):
        return [str(x).strip() for x in v if str(x).strip()]
    return [x for x in re.split(r"[\s,]+", str(v or "")) if x]


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _loosen(s):
    """Mirror of `loosen()` in script.js: the sheet row is found even if the
    slug's capitals drifted between the sheet and the database."""
    t = re.sub(r"[\s_]+", "-", str(s or "").strip().lower())
    return re.sub(r"-+", "-", t).strip("-")


def from_supabase(rows, base):
    """Supabase rows → the catalogue shape every tool and the page already read.

    `base` is the sheet-side catalogue whose shop, categories, bundles and
    reviews are kept as they are. A sheet row of the same slug lends what
    Supabase does not carry yet — colours, sizes, lead time. Stock is the
    intake's to enforce; here a count wins, a plain in_stock:false closes the
    product, and silence leaves it orderable, replacing the sheet's old figure
    rather than letting the two contradict each other.
    """
    src = dict(base or {})
    old = {}
    for p in src.get("products") or []:
        old[_loosen(p.get("slug"))] = p
    stock = dict(src.get("stock") or {})
    products = []
    for r in rows or []:
        slug = str(r.get("slug") or "").strip()
        price = _num(r.get("price_mnt"))
        # no address or no price: the shop could neither show nor sell it
        if not slug or not price or price <= 0:
            continue
        was = old.get(_loosen(slug)) or {}
        p = dict(was)
        images = url_list(r.get("images") if r.get("images") not in (None, "") else r.get("image_urls"))
        cmp = _num(r.get("compare_at_mnt"))
        desc = r.get("description")
        status = r.get("status")
        p.update(
            {
                "slug": slug,
                "product_id": r.get("product_id") or r.get("id") or "",
                "category": str(r.get("category") or was.get("category") or "").strip(),
                "name": r.get("name") or was.get("name") or slug,
                "desc": desc if desc not in (None, "") else (was.get("desc") or ""),
                "price": int(price),
                "discount": None,
                "compareAt": int(cmp) if cmp and cmp > price else None,
                "images": images or list(was.get("images") or []),
                "featured": bool(r.get("featured")),
                "deliveryPaidBy": "included" if r.get("delivery_paid_by") == "included" else "customer",
                "maxPerOrder": int(_num(r.get("max_per_order"))) if (_num(r.get("max_per_order")) or 0) > 0 else None,
                "active": (status == "active") if status else r.get("active") is not False,
            }
        )
        products.append(p)
        qty = _num(r.get("stock_qty")) if r.get("stock_qty") not in (None, "") else None
        if qty is not None:
            stock[slug] = int(qty)
        elif r.get("in_stock") is False:
            stock[slug] = 0
        else:
            stock.pop(slug, None)
    # the sheet still carried counts for products retired long ago
    listed = set(x["slug"] for x in products)
    stock = dict((k, v) for k, v in stock.items() if k in listed)
    src["products"] = products
    src["stock"] = stock
    return src


def load_offline():
    try:
        with io.open(os.path.join(ROOT, "data", "catalog.json"), encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return {}


def load_catalog():
    """Return (catalogue, source, notes).

    `source` is "supabase" when the products came from the database, "sheet"
    when Supabase had none yet, and "" when nothing usable answered — in which
    case `catalogue` is None and the caller leaves everything as it stands.
    Every reason for a fallback is in `notes`, so a run that quietly went on
    with the sheet still says so.
    """
    consts = read_constants()
    notes = []

    feed = None
    if consts["sheet"]:
        try:
            feed = fetch_json(consts["sheet"])
        except Exception as err:
            notes.append("the sheet feed did not answer (%s)" % err)
    else:
        notes.append("DATA_SOURCE not found in script.js")
    if feed is not None and not isinstance(feed, dict):
        notes.append("the sheet feed did not return an object")
        feed = None

    rows = None
    if consts["supabase"] and consts["anon"]:
        try:
            rows = fetch_supabase(consts)
        except Exception as err:
            notes.append("supabase did not answer (%s)" % err)
    else:
        notes.append("SUPABASE_URL / SUPABASE_ANON not found in script.js")

    if rows:
        if feed and feed.get("categories"):
            base = feed
        else:
            base = load_offline()
            notes.append("shop details taken from the offline copy — the sheet was silent")
        return from_supabase(rows, base), "supabase", notes

    if rows is not None:
        notes.append("supabase lists no products yet — products still come from the sheet")
    if feed and (feed.get("products") or []):
        return feed, "sheet", notes
    return None, "", notes

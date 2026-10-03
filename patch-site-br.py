#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Блок BR (B3, 2026-10-03) · Pixel: Purchase зөвхөн ХАЯГТАЙ захиалгад, утас-л үлдээсэн = Lead.
Яагаад: өмнө нь Purchase 1-р алхамд (утас л өгөхөд) буудаг байсан → Meta «утас үлдээдэг» хүмүүс рүү
оновчилж, гар халаагчийн тестэд 19 бүртгэлээс 3 л бодит захиалга гарсан. B1-ийн тодорхойлолттой нэг мөр:
захиалга = хаягтай. Ads Manager-т юу ч өөрчлөхгүй (Sales → Purchase хэвээр) — зөвхөн Purchase цөөн, бодит болно.

Өөрчлөлт (script.js):
  1) 1-р алхам (утас+нэр илгээгдэж захиалга үүсэхэд): Purchase → Lead (eventID = 'lead:'+order_id).
  2) 2-р алхам (хаяг амжилттай хадгалагдахад): Purchase (eventID = order_id, нэг удаа; эзний тест/давхардалд үгүй).
Ажиллуулах: python3 patch-site-br.py <script.js>   (дахин ажиллуулахад аюулгүй — хэрэглэсэн бол алгасна)
v2: зай/мөрийн ялгаанд тэсвэртэй (regex); олдохгүй бол юу олдсоныг хэвлэнэ.
"""
import sys, re

path = sys.argv[1] if len(sys.argv) > 1 else "script.js"
src = open(path, encoding="utf-8").read()
if "BR: Lead at step one" in src:
    print("already patched:", path); sys.exit(0)

def one(pattern, text, label):
    ms = list(re.finditer(pattern, text, re.S))
    if len(ms) != 1:
        print(f"ОЛДСОНГҮЙ ({label}): {len(ms)} таарав. Файлд '\"Purchase\"' байгаа газрууд:")
        for m in re.finditer(r'"Purchase"', text):
            s = text.rfind("\n", 0, max(0, m.start() - 200)); e = text.find("\n", m.end() + 120)
            print("----", text.count("\n", 0, m.start()) + 1, "-р мөр ----"); print(text[s:e])
        sys.exit(1)
    return ms[0]

# 1 · 1-р алхам: Purchase → Lead (ownerTest шалгалтын дараах fbq)
m = one(r'(if \(window\.fbq && !out\.is_duplicate && !ownerTest\)\s*fbq\(\s*"track",\s*)"Purchase"', src, "1-р алхмын Purchase")
src = src[:m.start()] + ('/* BR: Lead at step one. A phone without an address is interest, not an\n'
                         '         order (B1, 2026-10-03): Purchase moved to the address step below, so\n'
                         '         Meta optimises for people who finish, not for people who type a number. */\n      '
                         + m.group(1) + '"Lead"') + src[m.end():]
m = one(r'\{\s*eventID:\s*String\(out\.order_id \|\| ""\)\s*\}', src, "1-р алхмын eventID")
src = src[:m.start()] + '{ eventID: "lead:" + String(out.order_id || "") }' + src[m.end():]

# 1b · placed-д ownerTest, давхардлыг хадгална (2-р алхамд хэрэгтэй)
m = one(r'placed = \{ slug: d\.slug, orderId: target,([^}]*)\};', src, "placed")
src = src[:m.start()] + 'placed = { slug: d.slug, orderId: target,' + m.group(1).rstrip() + ', ownerTest, dup: !!out.is_duplicate };' + src[m.end():]

# 2 · 2-р алхам: хаяг амжилттай → Purchase (saveDone(... noAddress: false) мөрийн өмнө)
m = one(r'(\n[ \t]*)(saveDone\(\{ ship: shipPrice,[^\n]*noAddress: false \}\);)', src, "2-р алхмын saveDone")
ind = m.group(1)
block = (ind + '/* BR: Purchase only now — an address makes it an order (B1). Same eventID'
         + ind + '   as the order id, so a server-side event for the same order dedups. */'
         + ind + 'if (window.fbq && !placed.ownerTest && !placed.dup && !placed.purchased) {'
         + ind + '  placed.purchased = true;'
         + ind + '  fbq('
         + ind + '    "track",'
         + ind + '    "Purchase",'
         + ind + '    {'
         + ind + '      content_ids: [placed.slug],'
         + ind + '      content_type: "product",'
         + ind + '      content_name: d.name,'
         + ind + '      num_items: Number(placed.qty) || 1,'
         + ind + '      ...pixelValue(Number(placed.goods) || goodsNow()),'
         + ind + '    },'
         + ind + '    { eventID: String(placed.orderId || "") }'
         + ind + '  );'
         + ind + '}')
src = src[:m.start()] + block + ind + m.group(2) + src[m.end():]

open(path, "w", encoding="utf-8").write(src)
print("patched:", path)

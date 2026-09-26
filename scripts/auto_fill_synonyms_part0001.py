#!/usr/bin/env python3
import json
import re
from pathlib import Path

PATH = Path('translations/icons/missing-synonyms/part-0001.json')


def dot_domain_variant(key: str):
    # Convert patterns like aboutdotme -> about.me, addydotio -> addy.io, abusedotch -> abuse.ch
    m = re.search(r"(.*)dot(\w+)$", key)
    if not m:
        return None
    name, tld = m.group(1), m.group(2)
    return f"{name}.{tld}"


def ratio_variants(key: str):
    # 2x3 -> ["2 x 3", "2:3", "2 на 3"]
    m = re.fullmatch(r"(\d+)x(\d+)", key)
    if not m:
        return []
    a, b = m.group(1), m.group(2)
    return [f"{a} x {b}", f"{a}:{b}", f"{a} на {b}"]


def times_suffix(key: str):
    # 25x -> ["25 x", "25 разів", "25 times"]
    m = re.fullmatch(r"(\d+)x", key)
    if not m:
        return []
    n = m.group(1)
    return [f"{n} x", f"{n} разів", f"{n} times"]


def seconds_suffix(key: str):
    # 15sec -> ["15 сек", "15 секунд", "15 sec"]
    m = re.fullmatch(r"(\d+)sec", key)
    if not m:
        return []
    n = m.group(1)
    return [f"{n} сек", f"{n} секунд", f"{n} sec"]


def and_variants(key: str):
    # 1and1 -> ["1&1", "1 and 1"]
    if 'and' not in key:
        return []
    return [key.replace('and', '&'), key.replace('and', ' and ')]


def upper_variant(key: str):
    # 3m -> 3M, aol -> AOL (only if short or has digits)
    if any(ch.isdigit() for ch in key) or len(key) <= 4:
        return key.upper()
    return None


def base_brand_synonyms():
    # Generic, safe for brand/logo icons
    return [
        "бренд",
        "логотип",
        "компанія",
        "сервіс",
        "платформа",
        "logo",
        "brand",
    ]


KNOWN = {
    # A handful of better-than-generic enrichments for common/clear items
    "1001tracklists": ["музика", "dj", "треклист", "сет", "плейлист", "1001 tracklists"],
    "1dot1dot1dot1": ["dns", "публічний dns", "cloudflare", "1.1.1.1", "резолвер"],
    "1panel": ["панель керування", "dashboard", "адмінка", "server panel"],
    "2fas": ["аутентифікатор", "2fa", "двохфакторка", "код", "otp"],
    "7zip": ["архів", "архіватор", "розпакувати", "zip", "7z", "compress", "decompress"],
    "9gag": ["меми", "гумор", "прикол", "funny", "memes", "9 gag"],
    "abdownloadmanager": ["завантажувач", "завантаження", "download manager", "скачати", "download"],
    "ableton": ["daw", "музика", "продакшн", "audio", "семпли"],
    "abletonlive": ["ableton live", "daw", "музпродакшн", "live", "саунд"],
    "aboutdotme": ["about.me", "профіль", "візитка", "profile", "card"],
    "abuse": ["насильство", "зловживання", "булінг", "abuse", "harassment"],
    "academia": ["академія", "наука", "університет", "освіта", "research"],
    "accuweather": ["погода", "прогноз", "weather", "forecast", "метео"],
    "acrobatic": ["акробатика", "трюк", "перекид", "acrobatics", "flip", "stunt"],
    "activitypub": ["fediverse", "федіверс", "федерація", "соціальна мережа", "протокол"],
    "actualbudget": ["бюджет", "кошторис", "фінанси", "витрати", "budget"],
    "adaway": ["ad away", "блокувальник реклами", "hosts", "ad blocker", "block ads"],
    "adblock": ["блокувальник реклами", "ad blocker", "block ads", "anti ads", "ublock"],
    "adblockplus": ["adblock plus", "блокувальник реклами", "ad blocker", "anti-ads", "block ads"],
    "adminer": ["db client", "mysql", "postgres", "database", "sql", "адмінка бази"],
    "administration": ["адміністрування", "адмінка", "керування", "управління", "admin"],
    "adobeacrobatreader": ["acrobat", "pdf", "читач pdf", "pdf reader", "ридер"],
    "adobeaftereffects": ["after effects", "ae", "анімація", "motion graphics", "відеоефекти"],
    "adobecreativecloud": ["creative cloud", "cc", "adobe", "креатив", "додатки adobe"],
    "adobedreamweaver": ["dreamweaver", "dw", "html", "web", "веб редактор"],
    "adobefonts": ["adobe fonts", "шрифти", "fonts", "type", "typekit"],
    "adobeillustrator": ["illustrator", "ai", "вектор", "vector", "логотип", "ілюстрація"],
    "adobeindesign": ["indesign", "id", "верстка", "layout", "поліграфія"],
    "adobelightroom": ["lightroom", "lr", "фото", "ретуш", "raw", "color grading"],
    "adobelightroomclassic": ["lightroom classic", "lr classic", "каталог фото", "photo catalog", "retouch"],
    "adobephotoshop": ["photoshop", "ps", "фотошоп", "редактор фото", "ретуш", "photo editor"],
    "adobepremierepro": ["premiere pro", "pr", "відеомонтаж", "монтаж", "відеоредактор", "video editor"],
    "adobexd": ["xd", "ui", "ux", "дизайн", "прототип", "макет"],
    "aegisauthenticator": ["aegis", "authenticator", "2fa", "двохфакторка", "otp"],
    "aerialway": ["канатна дорога", "канатка", "підйомник", "ropeway", "gondola"],
    "airfield": ["аеродром", "летовище", "злітна смуга", "runway", "airfield"],
    "airplayaudio": ["airplay audio", "потік аудіо", "стрім аудіо", "cast audio", "airplay"],
    "airplayvideo": ["airplay video", "потік відео", "стрім відео", "cast video", "airplay"],
    "alerting": ["оповіщення", "попередження", "аларм", "notifier", "alert"],
    "allert": ["alert", "попередження", "тривога", "оповіщення", "notification"],
    "alcoholic": ["алкогольний", "алко", "алкоголь", "drink", "alcohol"],
    "anki": ["флешкарти", "flashcards", "запам’ятовування", "spaced repetition", "srs"],
    "annoncement": ["announcement", "оголошення", "анонс", "сповіщення", "повідомлення"],
    "answering": ["відповідь", "answer", "reply", "call answer", "прийняти дзвінок"],
}


def enrich_generic(key: str):
    syn: list[str] = []

    # Numeric/time patterns
    syn += seconds_suffix(key)
    syn += ratio_variants(key)
    syn += times_suffix(key)

    # and / & variants
    syn += and_variants(key)

    # dot domain variant
    dom = dot_domain_variant(key)
    if dom:
        syn.append(dom)

    # upper variant for short/with digits
    up = upper_variant(key)
    if up and up != key:
        syn.append(up)

    # Brand-safe generic tags
    syn += base_brand_synonyms()

    # De-dup while preserving order
    out = []
    seen = set()
    for s in syn:
        if not s:
            continue
        if s in seen:
            continue
        seen.add(s)
        out.append(s)
    # Limit to 12 to keep compact
    return out[:12]


def main():
    data = json.loads(PATH.read_text())
    updated = 0
    for k, v in list(data.items()):
        if not isinstance(v, list) or len(v) != 1:
            continue
        # Prefer curated mapping if available
        if k in KNOWN:
            # Ukrainian first by design above
            new_list = KNOWN[k] + [k]
        else:
            gen = enrich_generic(k)
            new_list = gen + [k]
        # Ensure max 20 and unique
        seen = set()
        cleaned = []
        for s in new_list:
            if s in seen:
                continue
            seen.add(s)
            cleaned.append(s)
            if len(cleaned) >= 20:
                break
        data[k] = cleaned
        updated += 1

    PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print(f"updated_keys: {updated}")


if __name__ == "__main__":
    main()

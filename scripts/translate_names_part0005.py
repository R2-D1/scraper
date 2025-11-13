#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Одноразовий скрипт перекладу назв іконок для файла:
  translations/missing-translations/names/part-0005.json

Принципи:
- Коротко і по суті, передаємо візуальний сенс.
- Стилі/ваги/форми в дужках після базової назви: (жирна, тонка, двоколірна, контурна, суцільна, кругла, квадратна, горизонтальна, вертикальна, закруглена, гостра, спрощена).
- Бренди не перекладаємо — тільки правильна капіталізація; якщо є варіант (dark/light) — додаємо в дужках «темна/світла».
- Числа/внутрішні службові слова (remix, 16, 20) ігноруємо у базовій фразі.
"""

import json
from pathlib import Path

FILE = Path("translations/missing-translations/names/part-0005.json")

# Стилі ваги/варіанти (жіночий рід)
WEIGHT_STYLES = {
    "bold": "жирна",
    "duotone": "двоколірна",
    "light": "тонка",
    "thin": "тонка",
    "line": "контурна",
    "outline": "контурна",
    "solid": "суцільна",
    "rounded": "закруглена",
    "sharp": "гостра",
}

# Додаткові описові стилі
EXTRA_DESCRIPTORS = {
    "simple": "спрощена",
    "horizontal": "горизонтальна",
    "vertical": "вертикальна",
    "circle": "кругла",
    "square": "квадратна",
    "wavy": "хвиляста",
    # не-стилі, але корисні варіанти, які доречно показати в дужках
    "print": "для друку",
    "ltr": "LTR",
    "rtl": "RTL",
}

# Бренди (не перекладаємо). Список не вичерпний, але покриває більшість у part-0005
BRANDS = {
    # H…
    "hedera": "Hedera",
    "hedgedoc": "HedgeDoc",
    "hellyhansen": "Helly Hansen",
    "hellofresh": "HelloFresh",
    "hearthisdotat": "hearthis.at",
    "hibernate": "Hibernate",
    "hepsiemlak": "Hepsiemlak",
    "heroicgameslauncher": "Heroic Games Launcher",
    "heroui": "HeroUI",
    "hetzner": "Hetzner",
    "hevy": "Hevy",
    "hexlet": "Hexlet",
    "headphonezone": "Headphone Zone",
    "hibob": "HiBob",
    "hilton": "Hilton",
    "hiltonhotelsandresorts": "Hilton Hotels & Resorts",
    "hive": "Hive",
    "hive-blockchain": "Hive Blockchain",
    "honeybadger": "Honeybadger",
    "honeygain": "Honeygain",
    "honda": "Honda",
    "hostinger": "Hostinger",
    "hotelsdotcom": "Hotels.com",
    "hotwire": "Hotwire",
    "hpp": "HPP",
    "hsbc": "HSBC",
    "htc": "HTC",
    "htcvive": "HTC Vive",
    "htmx": "HTMX",
    "htop": "htop",
    "humblebundle": "Humble Bundle",
    "humhub": "HumHub",
    "hungryjacks": "Hungry Jack's",
    "hurl": "Hurl",
    "hurriyetemlak": "Hurriyet Emlak",
    "husqvarna": "Husqvarna",
    "hyperledger": "Hyperledger",
    "hyperskill": "Hyperskill",
    "hyperx": "HyperX",
    "hypothesis": "Hypothesis",
    "hyundai": "Hyundai",
    # I…
    "i18n": "i18n",
    "i18next": "i18next",
    "i3": "i3",
    "ibeacon": "iBeacon",
    "iberia": "Iberia",
    "ibmcloud": "IBM Cloud",
    "ibmwatson": "IBM Watson",
    "iced": "Iced",
    "icicibank": "ICICI Bank",
    "icinga": "Icinga",
    "iconfinder": "Iconfinder",
    "iconify": "Iconify",
    "icons8": "Icons8",
    "ifanr": "ifanr",
    "ifood": "iFood",
    "igdb": "IGDB",
    "ign": "IGN",
    "iheartradio": "iHeartRadio",
    "ikea": "IKEA",
    "iledefrancemobilites": "Ile-de-France Mobilites",
    "ilovepdf": "iLovePDF",
    "imagedotsc": "image.sc",
    "imagej": "ImageJ",
    "imessage": "iMessage",
    "immersivetranslate": "Immersive Translate",
    "immich": "Immich",
    "imou": "Imou",
    "improvmx": "ImprovMX",
    "indiansuperleague": "Indian Super League",
    "indiehackers": "Indie Hackers",
    "indigo": "Indigo",
    "inductiveautomation": "Inductive Automation",
    "inertia": "Inertia",
    "infiniti": "Infiniti",
    "infinityfree": "InfinityFree",
    "infomaniak": "Infomaniak",
    "infoq": "InfoQ",
    "informatica": "Informatica",
    "inkdrop": "Inkdrop",
    "inoreader": "Inoreader",
    "inquirer": "Inquirer",
    "inspire": "Inspire",
    "insta360": "Insta360",
    "instatus": "Instatus",
    "instructables": "Instructables",
    "instructure": "Instructure",
    "integromat": "Integromat",
    "interactiondesignfoundation": "Interaction Design Foundation",
    "interactjs": "InteractJS",
    "interbase": "InterBase",
    # Home… (спільнота/ПЗ)
    "homeadvisor": "HomeAdvisor",
    "homeassistant": "Home Assistant",
    "homeassistantcommunitystore": "Home Assistant Community Store",
    "homebridge": "Homebridge",
}

def style_suffix_general(words):
    styles = []
    is_fingerprint = ("finger" in words and "print" in words) or ("fingerprint" in words)
    for w in words:
        if w in WEIGHT_STYLES:
            styles.append(WEIGHT_STYLES[w])
    for w in words:
        if w == "print" and is_fingerprint:
            # не трактуємо як «для друку» у сполуці "finger print"
            continue
        if w in EXTRA_DESCRIPTORS:
            styles.append(EXTRA_DESCRIPTORS[w])
    # Прибрати дублікати з збереженням порядку
    out, seen = [], set()
    for s in styles:
        if s not in seen:
            seen.add(s)
            out.append(s)
    return f"({', '.join(out)})" if out else ""

def style_suffix_for_brand(words):
    # Для брендів light/dark трактуємо як тему
    styles = []
    for w in words:
        if w == "dark":
            styles.append("темна")
        elif w == "light":
            styles.append("світла")
        elif w in ("bold", "duotone", "thin", "line", "outline", "solid", "rounded", "sharp"):
            # допустимо також стандартні стилі
            styles.append(WEIGHT_STYLES.get(w, w))
    # форми/орієнтації для логотипів зазвичай не застосовуємо
    out, seen = [], set()
    for s in styles:
        if s not in seen:
            seen.add(s)
            out.append(s)
    return f"({', '.join(out)})" if out else ""

def detect_brand(tokens):
    if not tokens:
        return None
    # 1) Точне співпадіння першого токена
    t0 = tokens[0]
    if t0 in BRANDS:
        # Якщо наступний токен — похідне (cloud, logo), беремо з пробілом
        if len(tokens) >= 2 and f"{t0}-{tokens[1]}" in BRANDS:
            return BRANDS[f"{t0}-{tokens[1]}"]
        return BRANDS[t0]
    # 2) Двозначні/складені бренди, відомі як один ключ
    joined = "-".join(tokens)
    if joined in BRANDS:
        return BRANDS[joined]
    # 3) Загальний випадок: *-logo ми тут майже не маємо, пропускаємо
    return None

def pick_direction(words):
    # для arrows/align тощо
    d = []
    if "left" in words:
        d.append("ліворуч")
    if "right" in words:
        d.append("праворуч")
    if "up" in words:
        d.append("вгору")
    if "down" in words:
        d.append("вниз")
    return d

def phrase_translation(base_words):
    s = " ".join(base_words)

    # Пріоритетні багатослівні патерни (longest first)
    patterns = {
        # Heading / текст
        "heading 3": "Заголовок 3",
        "heading": "Заголовок",

        # Audio
        "headphones slash": "Навушники перекреслені",
        "headphones": "Навушники",
        "headset user": "Гарнітура користувача",
        "headset pulse": "Гарнітура пульс",
        "headset": "Гарнітура",
        "headphone": "Навушник",

        # Health / heart
        "heart active": "Серце активне",
        "heart protect": "Захист серця",
        "heart rate search": "Пошук пульсу",
        "heart beat": "Серцебиття",
        "heart calendar": "Календар з серцем",
        "heart circle": "Серце у колі",
        "heart cupid": "Серце Купідона",
        "heart": "Серце",
        "hearth": "Вогнище",
        "hearts symbol": "Черви",
        "health health": "Здоров'я",
        "health medicines": "Ліки",
        "health microscope": "Мікроскоп",
        "health medical": "Медицина",
        "heatmap": "Теплова карта",

        # Transport / places
        "helipad": "Майданчик для гелікоптера",
        "heliport": "Геліопорт",
        "highway rest area": "Зона відпочинку",
        "horse riding": "Верхова їзда",
        "hospital sign circle": "Знак лікарні (у колі)",
        "hospital": "Лікарня",
        "home analytics": "Домашня аналітика",
        "home simple": "Будинок спрощений",
        "home scene": "Домашня сцена",
        "home telephone": "Домашній телефон",
        "home thatched": "Хата",
        "home": "Будинок",

        # Religion
        "hinduism": "Індуїзм",

        # Help
        "help desk": "Служба підтримки",
        "help ltr": "Довідка LTR",
        "help rtl": "Довідка RTL",
        "helpdesk": "Служба підтримки",
        "help notice": "Повідомлення довідки",
        "help notice ltr": "Повідомлення довідки LTR",
        "help notice rtl": "Повідомлення довідки RTL",
        "help question": "Питання довідки",
        "help": "Довідка",
        "hearing deaf": "Глухота",

        # Time
        "hourglass circle": "Пісочний годинник (у колі)",
        "hourglass": "Пісочний годинник",

        # House
        "house circle": "Будинок (у колі)",
        "house": "Будинок",

        # i / id / idea / identification
        "i in circle": "I у колі",
        "id picture": "Фото ID",
        "idea": "Ідея",
        "identification circle": "Ідентифікація (у колі)",
        "identification": "Ідентифікація",

        # Images
        "image add": "Додати зображення",
        "image arrow down": "Зображення зі стрілкою вниз",
        "image arrow up": "Зображення зі стрілкою вгору",
        "image in picture": "Картинка в картинці",
        "image layout thumbnail": "Мініатюра",
        "image layout frame": "Макет із рамкою",
        "image layout frameless": "Макет без рамки",
        "image layout basic": "Базовий макет",
        "image multiple": "Кілька зображень",
        "image open": "Відкрити зображення",
        "image move": "Перемістити зображення",
        "image lock": "Зображення (замок)",
        "image comment": "Коментар до зображення",
        "image exclamation": "Зображення зі знаком оклику",
        "image plus": "Додати зображення",
        "image minus": "Зменшити зображення",
        "image search": "Пошук зображення",
        "image switch": "Перемкнути зображення",
        "image times": "Закрити зображення",
        "image trash": "Видалити зображення",
        "image ban": "Зображення заборонено",
        "image blur": "Розмиття зображення",
        "image frame": "Рамка",
        "image photography": "Фотографія",
        "image picture flower": "Квітка",
        "image picture landscape": "Пейзаж",
        "image picture gallery": "Галерея зображень",
        "image photo composition vertical": "Композиція фото вертикальна",
        "image photo compsition horizontal": "Композиція фото горизонтальна",
        "image photo focus frame": "Рамка фокусу",
        "image photo four": "Чотири фото",
        "image photo polaroid": "Полароїд",
        "image camera setting pin": "Камера (мітка)",
        "image camera tripod": "Камера на штативі",
        "image camera": "Камера",
        "image": "Зображення",

        # Inbox / indent / index / incognito / infinity / info / information
        "inbox tray": "Лоток",
        "inbox favorite": "Входящі у вибраному",
        "inbox lock": "Входящі (замок)",
        "inbox": "Входящі",
        "indent ltr": "Відступ LTR",
        "indent rtl": "Відступ RTL",
        "index settings": "Індекс налаштування",
        "index mapping": "Відповідність індексу",
        "index runtime": "Індекс рантайм",
        "index open": "Індекс відкритий",
        "index close": "Індекс закритий",
        "index flush": "Очистити індекс",
        "incognito": "Інкогніто",
        "infinity": "Нескінченність",
        "info circle": "Інформація у колі",
        "info": "Інформація",
        "information chat right": "Інформація чат праворуч",
        "information desk customer": "Довідка консультант",
        "information circle": "Інформація у колі",

        # Insert / instance / integrations / interface
        "insert cloud video": "Вставити відео з хмари",
        "insert top right": "Вставити вгорі праворуч",
        "instance ltr": "Екземпляр LTR",
        "instance rtl": "Екземпляр RTL",
        "integration security": "Інтеграція безпека",
        "integration observability": "Інтеграція спостережуваність",
        "integration general": "Інтеграція загальна",
        "integration search": "Інтеграція пошук",
        "integrations": "Інтеграції",

        # Hierarchy
        "hierarchy business": "Ієрархія бізнес",
        "hierarchy": "Ієрархія",
    }

    for pat in sorted(patterns, key=lambda x: -len(x)):
        if s.startswith(pat):
            return patterns[pat]

    # Спеціальна логіка для interface …
    if base_words and base_words[0] == "interface":
        w = base_words[1:]
        if w[:2] == ["alert", "alarm"] and "bell" in w:
            return "Дзвінок"
        if w[:2] == ["alert", "warning"]:
            form = ""
            if "triangle" in w:
                form = " у трикутнику"
            elif "circle" in w:
                form = " у колі"
            elif "diamond" in w:
                form = " у ромбі"
            return "Попередження" + form
        if w[:2] == ["alert", "information"]:
            form = " у колі" if "circle" in w else ""
            return "Інформація" + form
        if "radio" in w and ("active" in w or "radioactive" in w):
            return "Радіація"
        if w[:2] == ["align", "back"]:
            return "На задній план"
        if w[:2] == ["align", "front"]:
            return "На передній план"
        if w[:2] == ["align", "horizontal"]:
            if "center" in w:
                return "Вирівнювання горизонтальне по центру"
            if "left" in w:
                return "Вирівнювання горизонтальне ліворуч"
            if "right" in w:
                return "Вирівнювання горизонтальне праворуч"
        if w[:2] == ["align", "vertical"]:
            if "center" in w or "middle" in w:
                return "Вирівнювання вертикальне по центру"
            if "top" in w:
                return "Вирівнювання вертикальне вгорі"
            if "bottom" in w:
                return "Вирівнювання вертикальне внизу"
        # fingerprint/id у гілці interface
        if ("finger" in w and "print" in w) or ("fingerprint" in w):
            return "Скан відбитка пальця" if "scan" in w else "Відбиток пальця"

        # fingerprints / ID
        if ("finger" in w and "print" in w) or ("fingerprint" in w):
            return "Скан відбитка пальця" if "scan" in w else "Відбиток пальця"

        # simple add/remove groups
        if (w and w[0] == "add") or ("plus" in w):
            return "Додати"
        if (w and w[0] == "remove") or ("minus" in w):
            return "Видалити"

        # text formatting quick wins
        if w and w[0] == "text" and "formatting" in w:
            if "italic" in w:
                return "Курсив"
            if "bold" in w:
                return "Жирний"
            if "underline" in w:
                return "Підкреслення"
            if "strikethrough" in w:
                return "Закреслення"
            return "Текстове форматування"

        if w and w[0] == "arrows":
            # arrows family — сформуємо коротку назву
            title = []
            if "double" in w:
                title.append("Подвійна стрілка")
            elif "both" in w or "zigzag" in w:
                title.append("Стрілки")
            else:
                title.append("Стрілка")
            dirs = pick_direction(w)
            if dirs:
                title.append(" ".join(dirs))
            return " ".join(title).strip()
        # align layers
        if w[:2] == ["align", "layers"]:
            return "Вирівняти шари"
        if w and w[0] == "align":
            if "center" in w or "middle" in w:
                return "Вирівнювання по центру"
            if "left" in w:
                return "Вирівнювання ліворуч"
            if "right" in w:
                return "Вирівнювання праворуч"
            if "top" in w:
                return "Вирівнювання вгорі"
            if "bottom" in w:
                return "Вирівнювання внизу"
            return "Вирівнювання"
        # edit tools
        if w and w[0] == "edit":
            if "attachment" in w or "paperclip" in w:
                return "Скріпка"
            if "binocular" in w or "binoculars" in w:
                return "Бінокль"
            if "bomb" in w:
                return "Бомба"
            if "brush" in w:
                return "Пензель"
            if "clip" in w and "binder" in w:
                return "Затискач"
            if ("color" in w and ("drop" in w or "pick" in w)) or "eyedropper" in w or "dropper" in w:
                return "Піпетка"
            if "palette" in w:
                return "Палітра"
            if "color" in w and "triangle" in w:
                return "Кольоровий трикутник"
            if "copy" in w:
                return "Копіювати"
            if "crop" in w:
                return "Обрізати"
            if "cut" in w or "scissors" in w:
                return "Вирізати"
            if "cutter" in w:
                return "Різак"
            if "magic" in w and "wand" in w:
                return "Чарівна паличка"
            if "wand" in w:
                return "Чарівна паличка"
            if "magnet" in w:
                return "Магніт"
            if "drawing" in w or "board" in w or "easel" in w:
                return "Дошка для малювання"
            if "expand" in w:
                return "Збільшити"
            if "flip" in w and "horizontal" in w:
                return "Віддзеркалити горизонтально"
            if "flip" in w and "vertical" in w:
                return "Віддзеркалити вертикально"
            if "flip" in w and ("left" in w or "right" in w):
                return "Віддзеркалити горизонтально"
            if "flip" in w and ("top" in w or "bottom" in w or "down" in w or "up" in w):
                return "Віддзеркалити вертикально"
            if "flip" in w:
                return "Віддзеркалити"
            if "grid" in w:
                return "Сітка"
            if "glue" in w:
                return "Клей"
            if "layer" in w and "add" in w:
                return "Додати шар"
            if "pathfinder" in w and "divide" in w:
                return "Розділити"
            if "pathfinder" in w and "intersect" in w:
                return "Перетин"
            if "pathfinder" in w and "merge" in w:
                return "Об'єднати"
            if "pathfinder" in w and "outline" in w:
                return "Контур"
            if "pathfinder" in w:
                return "Контур"
            if "pen" in w or "quill" in w:
                return "Перо"
            if "pencil" in w:
                return "Олівець"
            if "pin" in w:
                return "Кнопка"
            if "printer" in w:
                return "Принтер"
            if "rotate" in w or "angle" in w:
                return "Повернути"
            if "ruler" in w:
                return "Лінійка"
            if "select" in w and "area" in w:
                return "Виділення"
            if "select" in w and ("back" in w or "behind" in w):
                return "На задній план"
            if "select" in w and ("front" in w or "top" in w):
                return "На передній план"
            if "select" in w and "frame" in w:
                return "Рамка виділення"
            if "spray" in w:
                return "Спрей"
            if "skull" in w:
                return "Череп"
            if "typewriter" in w:
                return "Друкарська машинка"
            if "view" in w and ("eye" in w or "eyeball" in w):
                return "Перегляд"
            if "zoom" in w and "in" in w:
                return "Наблизити"
            if "zoom" in w and "out" in w:
                return "Віддалити"
        # download group
        if w and w[0] == "download":
            return "Завантажити"
        if w and w[0] == "block" and ("remove" in w or "delete" in w):
            return "Видалити"
        if w and w[0] == "upload":
            return "Вивантажити"
        if w and w[0] == "logout":
            return "Вийти"
        if w and w[0] == "lock":
            return "Замок"
        if w and w[0] == "unlock":
            return "Розблокувати"
        if w and w[0] == "link":
            if "broken" in w or "break" in w or "unlink" in w:
                return "Розірване посилання"
            return "Посилання"
        if w and w[0] == "search":
            return "Пошук"
        if w and w[0] == "cursor":
            if "hand" in w:
                return "Курсор (рука)"
            return "Курсор"
        if w and w[0] == "bookmark":
            if "double" in w:
                return "Подвійна закладка"
            return "Закладка"
        if w and w[0] == "award":
            if "trophy" in w:
                return "Кубок"
            return "Нагорода"
        if w and w[0] == "geometric":
            if "pentagon" in w:
                return "П'ятикутник"
            if "polygon" in w:
                return "Багатокутник"
            if "square" in w:
                return "Квадрат"
            if "triangle" in w:
                return "Трикутник"
            return "Фігура"
        if w and w[0] == "hierarchy":
            return "Ієрархія"
        if w and w[0] == "validation":
            return "Перевірка"
        if w and w[0] == "signal":
            return "Сигнал"
        # favorite/like group
        if w and w[0] == "favorite":
            if "dislike" in w:
                return "Не подобається"
            if "give" in w and "heart" in w:
                return "Подобається"
            if "award" in w or "ribbon" in w:
                return "Нагорода"
            return "Вподобання"
        # home group
        if w and w[0] == "home":
            return "Будинок"
        # ID scans
        if w and w[0] == "id":
            if "face" in w and "scan" in w:
                return "Скан обличчя"
            if "iris" in w and "scan" in w:
                return "Скан райдужки"
            if "user" in w:
                return "Ідентифікація користувача"
            if "voice" in w and "scan" in w:
                return "Скан голосу"
            if "voice" in w:
                return "Голос"
        if w and w[0] == "pad" and "lock" in w:
            return "Замок"
        if w and w[0] == "unlink":
            return "Розірване посилання"
        # Прості групи за першим словом
        if w:
            simple = {
                "weather": "Погода",
                "layout": "Макет",
                "setting": "Налаштування",
                "file": "Файл",
                "time": "Час",
                "calendar": "Календар",
                "content": "Вміст",
                "user": "Користувач",
                "page": "Сторінка",
                "delete": "Видалити",
                "help": "Довідка",
                "upload": "Вивантажити",
                "login": "Вхід",
                "security": "Безпека",
                "lighting": "Освітлення",
                "dashboard": "Панель",
                "share": "Поділитися",
                "folder": "Папка",
            }
            if w[0] in simple:
                return simple[w[0]]

        # За замовчуванням
        return "Інтерфейс"

    # Узагальнений мапінг токенів (аккуратно, мінімізуємо багатослівність)
    token_map = {
        # напрямки
        "left": "ліворуч",
        "right": "праворуч",
        "up": "вгору",
        "down": "вниз",

        # дії
        "open": "відкрити",
        "close": "закрити",
        "lock": "замок",
        "unlock": "розблокувати",
        "plus": "плюс",
        "minus": "мінус",
        "times": "закрити",
        "trash": "видалити",
        "search": "пошук",
        "move": "перемістити",
        "switch": "перемкнути",
        "ban": "заборонено",
        "exclamation": "знак оклику",
        "slash": "перекреслений",
        # 'off' не додаємо сюди — обробляється як стан

        # загальні іменники
        "headphones": "навушники",
        "headphone": "навушник",
        "headset": "гарнітура",
        "heart": "серце",
        "calendar": "календар",
        "ribbon": "стрічка",
        "internet": "інтернет",
        "fingerprint": "відбиток пальця",
        "microscope": "мікроскоп",
        "hospital": "лікарня",
        "home": "будинок",
        "house": "будинок",
        "hourglass": "пісочний годинник",
        "idea": "ідея",
        "identification": "ідентифікація",
        "image": "зображення",
        "picture": "зображення",
        "photo": "фото",
        "camera": "камера",
        "frame": "рамка",
        "layout": "макет",
        "gallery": "галерея",
        "flower": "квітка",
        "landscape": "пейзаж",
        "focus": "фокус",
        "polaroid": "полароїд",
        "tray": "лоток",
        "inbox": "входящі",
        "index": "індекс",
        "information": "інформація",
        "warning": "попередження",
        "bell": "дзвінок",
        "diamond": "ромб",
        "triangle": "трикутник",
        "ribbon": "стрічка",

        # додаткові, яких бракувало
        "health": "здоров'я",
        "hearing": "слух",
        "deaf": "глухота",
        "active": "активне",
        "balloon": "кулька",
        "protect": "захист",
        "hexagram": "гексаграма",
    }

    out = []
    for w in base_words:
        if w.isdigit() or w in {"remix"}:
            continue
        out.append(token_map.get(w, w))
    name = " ".join(filter(None, out)).strip()
    if name:
        name = name[0].upper() + name[1:]
    return name

def translate_from_key(key: str) -> str:
    # Токени з ключа надійніші за значення у файлі
    tokens = key.strip().lower().replace("_", " ").replace("-", " ").split()
    if not tokens:
        return key

    brand = detect_brand(tokens)

    # Стилі окремо збираємо
    if brand:
        style = style_suffix_for_brand(tokens)
        return f"{brand} {style}".strip()

    # Базові слова без стилів/службових частин
    # Особливий випадок: для "heading" зберігаємо номер рівня, якщо є
    heading_level = None
    if tokens and tokens[0] == "heading":
        for t in tokens:
            if t.isdigit():
                heading_level = t
                break

    base_words = []
    for t in tokens:
        if t in WEIGHT_STYLES or t in EXTRA_DESCRIPTORS:
            continue
        if t in {"remix", "off", "print", "ltr", "rtl"}:
            continue
        if t.isdigit() and not (tokens and tokens[0] == "heading"):
            continue
        base_words.append(t)

    base = phrase_translation(base_words)
    if base.startswith("Заголовок") and heading_level:
        base = f"Заголовок {heading_level}"
    style = style_suffix_general(tokens)
    # Додаткові стани
    extra = []
    if "off" in tokens:
        if "перекреслен" not in base:
            extra.append("вимкнено")
    if "active" in tokens and "активн" not in base.lower():
        extra.append("активне")
    if "balloon" in tokens and "кульк" not in base.lower() and "серце" in base.lower():
        base = "Серце-кулька"

    result = f"{base} {' '.join(extra)} {style}".strip()
    return " ".join(result.split())

def main():
    data = json.loads(FILE.read_text(encoding="utf-8"))
    out = {}
    for k, _ in data.items():
        out[k] = translate_from_key(k)
    FILE.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__":
    main()

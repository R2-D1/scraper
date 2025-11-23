#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Одноразовий скрипт перекладу назв іконок для файла:
  translations/icons/missing-translations/names/part-0006.json

Правила:
- Стилі виносимо в дужки: (жирна | двоколірна | тонка | суцільна | контурна)
- Бренди не перекладаємо, лише правильно капіталізуємо (і теж додаємо стиль у дужках, якщо є)
- Коротко і по суті; «simple» → «Простий …»
- Без лапок/дефісів у значеннях (окрім стандартних назв типу USB, 3D тощо)
"""

import json
from pathlib import Path

FILE = Path("translations/icons/missing-translations/names/part-0006.json")

# Стилі (жіночий рід для узгодження з «іконка»)
WEIGHT_STYLES = {
    "bold": "жирна",
    "duotone": "двоколірна",
    "light": "тонка",
    "thin": "тонка",
    "solid": "суцільна",
    "line": "контурна",
}

# Токени-стани, які не включаємо у базову фразу
STATE_TOKENS = {"off", "print", "active", "tone1", "tone2", "tone3", "tone4", "tone5", "dark", "light", "remix"}

# Бренди (не перекладаємо назву)
BRANDS = {
    "snapchat": "Snapchat",
    "soundcloud": "SoundCloud",
    "spotify": "Spotify",
    "steam": "Steam",
    "stripe": "Stripe",
    "telegram": "Telegram",
    "threads": "Threads",
    "tidal": "Tidal",
    "tiktok": "TikTok",
    "tumblr": "Tumblr",
    "twitch": "Twitch",
    "twitter": "Twitter",
    "usb": "USB",
    "square": "Square",
    # K…
    "kfc": "KFC",
    "klm": "KLM",
    "kia": "Kia",
    "kodak": "Kodak",
    "koenigsegg": "Koenigsegg",
    "kofax": "Kofax",
    "kofi": "Ko‑fi",
    "komoot": "Komoot",
    "konami": "Konami",
    "kongregate": "Kongregate",
    "konva": "Konva",
    "koreader": "KOReader",
    "kotlin": "Kotlin",
    "koyeb": "Koyeb",
    "kred": "Kred",
    "ktm": "KTM",
    "ktor": "Ktor",
    "kuaishou": "Kuaishou",
    "kubuntu": "Kubuntu",
    "kyocera": "Kyocera",
    "khanacademy": "Khan Academy",
    "khronosgroup": "Khronos Group",
    "kingstontechnology": "Kingston Technology",
    "kinopoisk": "KinoPoisk",
    "knexdotjs": "Knex.js",
    # L…
    "lamborghini": "Lamborghini",
    "landrover": "Land Rover",
    "langchain": "LangChain",
    "langflow": "LangFlow",
    "langgraph": "LangGraph",
    "laragon": "Laragon",
    "laravel": "Laravel",
    "laravelhorizon": "Laravel Horizon",
    "laravelnova": "Laravel Nova",
    "lastdotfm": "Last.fm",
    "lazyvim": "LazyVim",
    "lbry": "LBRY",
    "leaderprice": "Leader Price",
    "leagueoflegends": "League of Legends",
    "leica": "Leica",
    "lemmy": "Lemmy",
    "lemonsqueezy": "Lemon Squeezy",
    "leptos": "Leptos",
    "lequipe": "L'Equipe",
    "leroymerlin": "Leroy Merlin",
    "leslibraires": "Les Libraires",
    "lg": "LG",
    "liara": "Liara",
    "librariesdotio": "Libraries.io",
    "libretranslate": "LibreTranslate",
    "libretube": "LibreTube",
    "librewolf": "LibreWolf",
    "lichess": "Lichess",
    "lidl": "Lidl",
    "limesurvey": "LimeSurvey",
    "linkedin": "LinkedIn",
    "linksys": "Linksys",
    "linktree": "Linktree",
    "linphone": "Linphone",
    "lintcode": "Lintcode",
    "lintstaged": "Lint‑staged",
    "linux": "Linux",
    "linuxfoundation": "Linux Foundation",
    "linuxcontainers": "Linux Containers",
    "linuxprofessionalinstitute": "Linux Professional Institute",
    "linuxserver": "LinuxServer",
    "lionair": "Lion Air",
    "listenhub": "Listenhub",
    "listmonk": "Listmonk",
    "lit": "Lit",
    "litiengine": "LITIengine",
    "livechat": "LiveChat",
    "livekit": "LiveKit",
    "lmms": "LMMS",
    "lobsters": "Lobsters",
    "localsend": "LocalSend",
    "localxpose": "LocalXpose",
    "logitech": "Logitech",
    "logitechg": "Logitech G",
    "logmein": "LogMeIn",
    "logseq": "Logseq",
    "lootcrate": "Loot Crate",
    "lospec": "Lospec",
    "lotpolishairlines": "LOT Polish Airlines",
    "lottie": "Lottie",
}

# Брендова фраза з двох слів
BRAND_PHRASES = {
    ("stack", "overflow"): "Stack Overflow",
}

def detect_brand(words):
    # 1) двослівні бренди
    if len(words) >= 2:
        pair = (words[0], words[1])
        if pair in BRAND_PHRASES and (len(words) == 2 or (len(words) >= 3 and words[2] == "logo")):
            return BRAND_PHRASES[pair]
    # 2) однослово + optional "logo"
    if words:
        w0 = words[0]
        if w0 in BRANDS and (len(words) == 1 or (len(words) >= 2 and words[1] == "logo")):
            return BRANDS[w0]
        # спец-обробка LibreOffice компонентів
        if w0.startswith("libreoffice"):
            suffix = w0.replace("libreoffice", "")
            comp_map = {
                "base": "LibreOffice Base",
                "calc": "LibreOffice Calc",
                "draw": "LibreOffice Draw",
                "impress": "LibreOffice Impress",
                "math": "LibreOffice Math",
                "writer": "LibreOffice Writer",
            }
            if suffix in comp_map:
                return comp_map[suffix]
        if w0 == "latex":
            return "LaTeX"
        if w0 == "latexmk":
            return "latexmk"
    return None

def style_suffix(words):
    styles = []
    for w in words:
        if w in WEIGHT_STYLES:
            styles.append(WEIGHT_STYLES[w])
    # унікалізація порядку
    out = []
    seen = set()
    for s in styles:
        if s not in seen:
            seen.add(s)
            out.append(s)
    return f"({', '.join(out)})" if out else ""

def state_suffix(words):
    sfx = []
    if "off" in words:
        sfx.append("вимкнено")
    if "active" in words:
        sfx.append("активна")
    if "print" in words:
        sfx.append("друк")
    return (" (" + ", ".join(sfx) + ")") if sfx else ""

def phrase_translation(base):
    s = " ".join(base)

    # Багатослівні патерни (спочатку найдовші). Додані K… L… M… та S…–W…
    patterns = {
        # K…
        "key asterisk": "Ключ зірочка",
        "key circle": "Ключ у колі",
        "key lock circle": "Ключ і замок у колі",
        "key": "Ключ",

        "keyboard circle": "Клавіатура у колі",
        "keyboard shortcut": "Гарячі клавіші",
        "keyboard virtual": "Віртуальна клавіатура",
        "keyboard wireless 2": "Бездротова клавіатура 2",

        "kql field": "KQL поле",
        "kql function": "KQL функція",
        "kql operand": "KQL операнд",
        "kql selector": "KQL селектор",
        "kql value": "KQL значення",

        "kubernetes agent": "Агент Kubernetes",
        "kiss woman man": "Поцілунок (жінка і чоловік)",
        "kitchen cabinet": "Кухонна шафа",
        "knive fork circle": "Ніж і виделка у колі",
        "knive fork": "Ніж і виделка",
        "knowledgebase": "База знань",

        # L…
        "lab flask": "Лабораторна колба",
        "label circle": "Мітка у колі",
        "label": "Мітка",
        "labels": "Мітки",
        "lady": "Жінка",
        "landmark jp": "Пам'ятка JP",
        "landscape setting": "Налаштування ландшафту",
        "landuse": "Землекористування",

        "laptop charging": "Ноутбук заряджання",
        "laptop upload": "Ноутбук завантаження",
        "laptop wifi": "Ноутбук Wi‑Fi",
        "laptop": "Ноутбук",

        "larger text": "Більший текст",
        "last quarter moon with face": "Місяць остання чверть",
        "last updates": "Останні оновлення",
        "latest news": "Останні новини",
        "lattern": "Ліхтар",
        "laundry basket": "Кошик для прання",
        "lawn mower": "Газонокосарка",
        "layer hide": "Приховати шар",
        "layers 2": "Шари 2",
        "layout ltr": "Макет зліва направо",
        "layout rtl": "Макет справа наліво",
        "layout window 11": "Макет вікна 11",
        "layout window 8": "Макет вікна 8",

        "leaf 3 angled": "Листок (3-кутий)",
        "leaf circle": "Листок у колі",
        "leafless tree": "Дерево без листя",

        "leave circle": "Вихід у колі",
        "leave": "Вихід",

        "left alt circle": "Alt ліворуч у колі",
        "left direction square": "Напрям ліворуч у квадраті",
        "left direction": "Напрям ліворуч",
        "left pointing magnifying glass": "Лупа ліворуч",
        "left right scroll bar": "Смуга прокрутки вліво‑вправо",
        "left right traffic data transfer hexagon": "Передача даних вліво‑вправо (шестикутник)",
        "left sign": "Знак ліворуч",
        "leftwards pushing hand": "Рука штовхає вліво",

        "legal justice hammer": "Судовий молоток",
        "legal justice scale 2": "Терези справедливості (нерівні)",
        "legal justice scale 1": "Терези справедливості",

        "lemon fruit seasoning": "Лимон (приправи)",
        "life ring": "Рятувальний круг",

        "letter circle": "Літера у колі",
        "letter open circle": "Відкритий лист у колі",
        "letter open": "Відкритий лист",
        "letter": "Лист",
        "lettered list 16": "Список літерами 16",
        "lettered list 20": "Список літерами 20",
        "lettered list": "Список літерами",

        "levelsdotfyi": "Levels.fyi",

        "line height": "Висота рядка",
        "line slant up": "Нахил лінії вгору",
        "line slant down": "Нахил лінії вниз",
        "line x": "Вісь X",
        "line y": "Вісь Y",
        "height": "Висота",
        "slant up": "Нахил вгору",
        "slant down": "Нахил вниз",
        "x circle": "X у колі",
        "y circle": "Y у колі",
        "bulb exclamation": "Лампочка з окликом",
        "bulb": "Лампочка",
        "lightbulb shine": "Лампочка блиск",
        "lightning bolt": "Блискавка",
        "lighthouse jp": "Маяк JP",
        "lidquid drop waves 2": "Крапля з хвилями 2",
        "lidquid drop waves": "Крапля з хвилями",

        "link circle": "Посилання у колі",
        "link external ltr": "Зовнішнє посилання зліва направо",
        "link external rtl": "Зовнішнє посилання справа наліво",
        "link intact": "Ціле посилання",
        "link secure": "Безпечне посилання",
        "linktree": "Linktree",
        "linkfire": "Linkfire",

        "linkedin": "LinkedIn",
        "lineageos": "LineageOS",
        "linuxfoundation": "Linux Foundation",
        "linuxprofessionalinstitute": "Linux Professional Institute",
        "linuxcontainers": "Linux Containers",
        "linuxserver": "LinuxServer",
        "linux": "Linux",

        "lira circle": "Ліра у колі",

        "list add": "Додати до списку",
        "list box": "Список у прямокутнику",
        "list bullet ltr": "Маркований список зліва направо",
        "list bullet rtl": "Маркований список справа наліво",
        "list circle": "Список у колі",
        "list indent": "Відступ списку",
        "list numbered ltr": "Нумерований список зліва направо",
        "list outdent": "Зменшити відступ списку",
        "list print": "Список",
        "list ul": "Маркований список",
        "list": "Список",

        "literal ltr": "Літерал зліва направо",
        "literal rtl": "Літерал справа наліво",
        "literal": "Літерал",

        "live activity": "Жива активність",
        "live preview": "Попередній перегляд",
        "live stream": "Трансляція наживо",
        "live video": "Пряме відео",
        "lyric": "Текст пісні",

        "local storage folder": "Локальна папка збереження",

        "location map": "Мапа локації",
        "location marker line": "Позначка локації",
        "location marker": "Позначка локації",
        "location pin direction": "Шпилька напряму",
        "location target 1": "Мета розташування 1",

        "lock closed circle": "Замок закритий у колі",
        "lock closed": "Замок закритий",
        "lock open circle": "Замок відкритий у колі",
        "lock open": "Замок відкритий",
        "lock semi open": "Замок напіввідкритий",
        "lock close": "Замок закритий",
        "lock opened": "Замок відкритий",
        "lock": "Замок",

        "lodging": "Житло",
        "log in double arrow": "Вхід (подвійна стрілка)",
        "log in ltr": "Вхід зліва направо",
        "log in rtl": "Вхід справа наліво",
        "log out ltr": "Вихід зліва направо",
        "log out rtl": "Вихід справа наліво",
        "login half circle": "Вхід півколо",
        "logout half circle": "Вихід півколо",

        # спец‑випадок: логотипи (далі обробляємо у translate_value_from_key)
        "logo": "Логотип",

        "logstash filter": "Logstash фільтр",
        "logstash if": "Logstash if",
        "logstash input": "Logstash ввід",
        "logstash output": "Logstash вивід",
        "logstash queue": "Logstash черга",

        "long arrow": "Довга стрілка",
        "longread": "Лонгрід",

        "loop minus circle": "Цикл мінус у колі",
        "loop minus": "Цикл мінус",
        "loop plus circle": "Цикл плюс у колі",
        "loop plus": "Цикл плюс",
        "loop square": "Цикл квадрат",
        "loop diamond": "Цикл ромб",
        "loop circle": "Цикл у колі",
        "loop": "Цикл",

        "love playlist": "Улюблений плейлист",
        "love you gesture": "Жест «люблю тебе»",

        # M… (перші, що трапляються у цій частині файла)
        "macro mode": "Макрорежим",
        "make up brush": "Пензлик для макіяжу",
        "magnet circle": "Магніт у колі",
        "magnet": "Магніт",
        "magnifier add": "Лупа плюс",
        "magnifier remove": "Лупа мінус",
        "magnify with plus": "Збільшити плюс",
        "magnify with minus": "Збільшити мінус",
        "mail incoming": "Вхідний лист",
        "mail send": "Надіслати лист",
        "mail sign at": "Символ @",
        "mail smiley happy face": "Лист зі щасливим смайликом",
        "mail smiley happy mask": "Лист із щасливою маскою",
        "mail smiley sad face": "Лист із сумним смайликом",
        "mail smiley sad mask": "Лист із сумною маскою",
        "mail smiley straight face": "Лист із нейтральним смайликом",
        "mailbox empty": "Пуста поштова скринька",
        "mailbox full": "Повна поштова скринька",
        "male male love homosexual": "Пара чоловіки",
        "man climbing": "Чоловік лізе",
        "man elf": "Ельф‑чоловік",
        "man in business suit levitating": "Чоловік у костюмі левітує",
        "man in manual wheelchair facing right": "Чоловік у ручному візку вправо",
        "man in motorized wheelchair facing right": "Чоловік у електровізку вправо",
        "man kneeling facing right": "Чоловік на колінах вправо",
        "man running facing right": "Чоловік біжить вправо",
        "man symbol": "Символ чоловіка",
        "man walking facing right": "Чоловік іде вправо",
        "man with white cane facing right": "Чоловік з білою палицею вправо",

        # Media…
        "media picture in picture": "Картинка в картинці",
        "media playlist add later": "Плейлист додати пізніше",
        "media playlist add next": "Плейлист додати далі",
        "media playlist add": "Плейлист додати",
        "media playlist remove": "Плейлист видалити",
        "media playlist": "Плейлист",
        "media next": "Медіа далі",
        "media previous": "Медіа назад",
        "media play": "Відтворення",
        "media airplay": "AirPlay",
        "media bluetooth": "Bluetooth",
        "media chromecast": "Chromecast",
        "media completed": "Завершено",
        "media incomplete": "Незавершено",
        "media programguide": "Програма передач",
        "media quaver": "Нота",
        "media 404 notfound": "Не знайдено",
        "media agelimit a": "Вікове обмеження A",
        "media agelimit": "Вікове обмеження",
        "media ffw": "Перемотка вперед",
        "media jumpto": "Перейти до",

        # S… (наявні у файлі)
        "slideshow": "Слайдшоу",
        "smiley angry": "Смайл злий",
        "smiley blank": "Смайл без емоцій",
        "smiley meh": "Смайл так собі",
        "smiley melting": "Смайл тане",
        "smiley nervous": "Смайл нервовий",
        "smiley sad": "Смайл сумний",
        "smiley sticker": "Смайл стікер",
        "smiley wink": "Смайл підморгує",
        "smiley": "Смайл",
        "smiley x eyes": "Смайл з хрестиками на очах",

        "sneaker move": "Кросівок у русі",
        "sneaker": "Кросівок",
        "snowflake": "Сніжинка",
        "soccer ball": "Футбольний м’яч",
        "sock": "Шкарпетка",
        "solar panel": "Сонячна панель",
        "solar roof": "Сонячний дах",
        "sort ascending": "Сортування за зростанням",
        "sort descending": "Сортування за спаданням",
        "spade": "Піка",
        "sparkle": "Блиск",
        "speaker hifi": "Динамік HiFi",
        "speaker high": "Динамік гучно",
        "speaker low": "Динамік тихо",
        "speaker none": "Динамік без звуку",
        "speaker simple high": "Простий динамік гучно",
        "speaker simple low": "Простий динамік тихо",
        "speaker simple none": "Простий динамік без звуку",
        "speaker simple slash": "Простий динамік перекреслений",
        "speaker simple x": "Простий динамік без звуку",
        "speaker slash": "Динамік перекреслений",
        "speaker x": "Динамік без звуку",
        "speedometer": "Спідометр",
        "sphere": "Сфера",
        "spinner ball": "Кульовий спінер",
        "spinner gap": "Спінер з розривом",
        "spinner": "Спінер",
        "spiral": "Спіраль",
        "split horizontal": "Розділити горизонтально",
        "split vertical": "Розділити вертикально",
        "spray bottle": "Пляшка з розпилювачем",

        "square half bottom": "Половина квадрата знизу",
        "square half": "Половина квадрата",
        "square split horizontal": "Квадрат розділений горизонтально",
        "square split vertical": "Квадрат розділений вертикально",
        "square": "Квадрат",
        "squares four": "Чотири квадрати",
        "stack simple": "Простий стек",
        "stack minus": "Стек мінус",
        "stack plus": "Стек плюс",
        "stack": "Стек",
        "stairs": "Сходи",
        "stamp": "Печатка",
        "standard definition": "SD",
        "star and crescent": "Зірка і півмісяць",
        "star four": "Зірка з чотирма променями",
        "star half": "Половина зірки",
        "star of david": "Зірка Давида",
        "steering wheel": "Кермо",
        "steps": "Кроки",
        "stethoscope": "Стетоскоп",
        "sticker": "Стікер",
        "stool": "Табурет",
        "stop circle": "Стоп у колі",
        "stop": "Стоп",
        "storefront": "Вітрина",
        "strategy": "Стратегія",
        "student": "Студент",
        "subset proper of": "Сувора підмножина",
        "subset of": "Підмножина",
        "subtitles slash": "Без субтитрів",
        "subtitles": "Субтитри",
        "subtract square": "Мінус у квадраті",
        "subtract": "Мінус",
        "subway": "Метро",
        "suitcase rolling": "Валіза на колесах",
        "suitcase simple": "Проста валіза",
        "suitcase": "Валіза",
        "sun dim": "Тьмяне сонце",
        "sun horizon": "Сонце на горизонті",
        "sun": "Сонце",
        "sunglasses": "Сонцезахисні окуляри",
        "superset proper of": "Сувора надмножина",
        "superset of": "Надмножина",
        "swap": "Обмін",
        "swatches": "Зразки",
        "swimming pool": "Басейн",
        "sword": "Меч",
        "synagogue": "Синагога",
        "syringe": "Шприц",

        # T…
        "t shirt": "Футболка",
        "table": "Таблиця",
        "tabs": "Вкладки",
        "tag chevron": "Ярлик з шевроном",
        "tag simple": "Простий ярлик",
        "tag": "Ярлик",
        "target": "Мішень",
        "taxi": "Таксі",
        "tea bag": "Пакетик чаю",
        "television simple": "Простий телевізор",
        "television": "Телевізор",
        "tennis ball": "Тенісний м’яч",
        "tent": "Намет",
        "terminal window": "Вікно терміналу",
        "terminal": "Термінал",
        "test tube": "Пробірка",

        "text a underline": "A підкреслена",
        "text aa": "AA",
        "text align center": "Вирівнювання по центру",
        "text align justify": "Вирівнювання по ширині",
        "text align left": "Вирівнювання по лівому краю",
        "text align right": "Вирівнювання по правому краю",
        "text bolder": "Жирніше",
        "text b": "B",
        "text columns": "Стовпці тексту",
        "text h one": "H1",
        "text h two": "H2",
        "text h three": "H3",
        "text h four": "H4",
        "text h five": "H5",
        "text h six": "H6",
        "text h": "H",
        "text indent": "Відступ",
        "text italic": "Курсив",
        "text outdent": "Виступ",
        "text strikethrough": "Закреслення",
        "text subscript": "Нижній індекс",
        "text superscript": "Верхній індекс",
        "text t slash": "Літера T перекреслена",
        "text t": "Літера T",
        "text underline": "Підкреслення",
        "textbox": "Текстове поле",

        "thermometer cold": "Термометр холод",
        "thermometer hot": "Термометр спека",
        "thermometer simple": "Простий термометр",
        "thermometer": "Термометр",

        "threads logo": "Threads",
        "three d": "3D",
        "thumbs down": "Палець вниз",
        "thumbs up": "Палець вгору",
        "tilde": "Тильда",
        "timer": "Таймер",
        "tip jar": "Банка для чайових",
        "tipi": "Тіпі",
        "tire": "Шина",
        "toggle left": "Перемикач ліворуч",
        "toggle right": "Перемикач праворуч",
        "toilet paper": "Туалетний папір",
        "toilet": "Туалет",
        "toolbox": "Ящик для інструментів",
        "tooth": "Зуб",
        "tornado": "Торнадо",
        "tote simple": "Простий шопер",
        "tote": "Шопер",
        "towel": "Рушник",
        "tractor": "Трактор",
        "trademark registered": "Зареєстрована марка",
        "trademark": "Торговельна марка",
        "traffic cone": "Дорожній конус",
        "traffic sign": "Дорожній знак",
        "traffic signal": "Світлофор",
        "train regional": "Регіональний потяг",
        "train simple": "Простий потяг",
        "train": "Потяг",
        "tram": "Трамвай",
        "translate": "Переклад",
        "tray arrow down": "Лоток вниз",
        "tray arrow up": "Лоток вгору",
        "tray": "Лоток",
        "treasure chest": "Скриня зі скарбом",
        "tree evergreen": "Вічнозелене дерево",
        "tree palm": "Пальма",
        "tree structure": "Структура дерева",
        "tree view": "Дерево перегляду",
        "tree": "Дерево",
        "trend down": "Тренд вниз",
        "trend up": "Тренд вгору",
        "triangle dashed": "Пунктирний трикутник",
        "triangle": "Трикутник",
        "trolley suitcase": "Візок з валізою",
        "trolley": "Візок",
        "trophy": "Кубок",
        "truck trailer": "Вантажівка з причепом",
        "truck": "Вантажівка",

        # U… V… W…
        "umbrella simple": "Проста парасолька",
        "umbrella": "Парасолька",
        "union": "Об'єднання",
        "unite square": "Об'єднати квадрат",
        "unite": "Об'єднати",
        "upload simple": "Вивантажити",
        "vector three": "Вектор 3",
        "vector two": "Вектор 2",
        "vibrate": "Вібрація",
        "video camera slash": "Відеокамера вимкнена",
        "video camera": "Відеокамера",
        "video conference": "Відеоконференція",
        "video": "Відео",
        "vignette": "Віньєтка",
        "vinyl record": "Вінілова платівка",
        "virtual reality": "Віртуальна реальність",
        "virus": "Вірус",
        "visor": "Козирок",
        "voicemail": "Голосова пошта",
        "volleyball": "Волейбольний м’яч",
        "wall": "Стіна",
        "wallet": "Гаманець",
        "warehouse": "Склад",
        "warning circle": "Попередження у колі",
        "warning diamond": "Попередження у ромбі",
        "warning octagon": "Попередження у восьмикутнику",
        "warning": "Попередження",
        "washing machine": "Пральна машина",
        "watch": "Годинник",
        "user circle check": "Профіль з галочкою",
        "user circle dashed": "Профіль пунктирний",
        "user circle gear": "Профіль налаштування",
        "user circle minus": "Профіль мінус",
        "user circle plus": "Профіль плюс",
        "user circle": "Профіль",
        "user check": "Користувач з галочкою",
        "user focus": "Фокус на користувачі",
        "user gear": "Користувач налаштування",
        "user list": "Список користувачів",
        "user minus": "Видалити користувача",
        "user plus": "Додати користувача",
        "user rectangle": "Прямокутний профіль",
        "user sound": "Голос користувача",
        "user square": "Квадратний профіль",
        "user switch": "Змінити користувача",
        "users four": "Чотири користувачі",
        "users three": "Троє користувачів",
        "users": "Користувачі",
        "user": "Користувач",
        "van": "Фургон",
        "vault": "Сховище",
    }

    for pat in sorted(patterns, key=lambda x: -len(x)):
        if s == pat or s.startswith(pat + " "):
            return patterns[pat]

    # Спеціальна група: line arrow … → детальні варіанти стрілок
    # підтримка як із "line arrow …", так і "arrow …" (бо стилі могли бути прибрані)
    if s.startswith("line arrow ") or s.startswith("arrow "):
        t = s.split()
        if t[0] == "line":
            t = t[2:]
        else:
            t = t[1:]
        # напрями
        dir_map = {"up": "вгору", "down": "вниз", "left": "вліво", "right": "вправо"}
        res = ["Стрілка"]
        i = 0
        while i < len(t):
            w = t[i]
            if w == "crossover":
                # crossover <dir>
                if i + 1 < len(t) and t[i+1] in dir_map:
                    res.append("перехресна " + dir_map[t[i+1]])
                    i += 2
                    continue
                res.append("перехресна")
            elif w == "curve":
                # curve <dir> <dir?>
                part = ["крива"]
                if i + 1 < len(t) and t[i+1] in dir_map:
                    part.append(dir_map[t[i+1]])
                    i += 1
                    if i + 1 < len(t) and t[i+1] in dir_map:
                        part.append(dir_map[t[i+1]])
                        i += 1
                res.append(" ".join(part))
            elif w == "curvy":
                # curvy up down <n>
                part = ["хвиляста"]
                j = i + 1
                seq = []
                while j < len(t) and (t[j] in dir_map or t[j].isdigit()):
                    if t[j] in dir_map:
                        seq.append(dir_map[t[j]])
                    else:
                        part.append(" ".join(seq))
                        part.append(t[j])
                        seq = []
                    j += 1
                if seq:
                    part.append("-".join(seq))
                res.append(" ".join([p for p in part if p]))
                i = j - 1
            elif w in dir_map:
                res.append(dir_map[w])
            elif w == "dashed":
                res.append("пунктирний")
            elif w == "square":
                res.append("(квадрат)")
            elif w == "window":
                res.append("вікно")
            elif w == "expand":
                res.append("розгорнути")
            elif w == "minimize":
                res.append("згорнути")
            elif w == "fit":
                # fit to height square
                if i + 2 < len(t) and t[i+1] == "to" and t[i+2] == "height":
                    res.append("під висоту")
                    i += 2
                else:
                    res.append("підігнати")
            elif w == "infinite" and i + 1 < len(t) and t[i+1] == "loop":
                res.append("нескінченна петля")
                i += 1
            elif w == "move":
                res.append("переміщення")
            elif w == "reload":
                res.append("перезавантаження")
            elif w == "vertical":
                res.append("вертикально")
            elif w == "horizontal":
                res.append("горизонтально")
            elif w == "rotate":
                res.append("обертання")
            elif w == "diagonal":
                res.append("по діагоналі")
            elif w == "split":
                res.append("поділ")
            elif w == "warning":
                res.append("(попередження)")
            elif w.isdigit():
                res.append(w)
            i += 1
        name = " ".join(res)
        name = name.replace(" (", " (")
        return name

    # Запасний варіант — зібрати з токенів (мінімально)
    token_map = {
        "x": "X",
    }
    out = []
    for w in base:
        out.append(token_map.get(w, w))
    name = " ".join(out).strip()
    if name:
        name = name[0].upper() + name[1:]
    return name

def translate_value_from_key(key: str) -> str:
    # Парсимо токени зі службового ключа (в ньому зберігається вихідний зміст)
    words = key.strip().lower().replace("_", " ").replace("-", " ").split()
    if not words:
        return key

    # Спецвипадок: логотипи — формуємо «Логотип <Назва>»
    if words[0] == "logo" and len(words) > 1:
        rest = " ".join(words[1:]).strip()
        pretty = " ".join(p.capitalize() for p in rest.split())
        return f"Логотип {pretty}"

    # Бренд
    brand = detect_brand(words)
    if brand:
        st = style_suffix(words)
        return f"{brand} {st}".strip()

    # Прибираємо стилі та службові стани з базової фрази
    base_words = [w for w in words if w not in WEIGHT_STYLES and w not in STATE_TOKENS]
    base = phrase_translation(base_words)
    st = style_suffix(words)
    st_state = state_suffix(words)
    res = f"{base} {st}{st_state}".strip()
    return " ".join(res.split())

def main():
    data = json.loads(FILE.read_text(encoding="utf-8"))
    out = {}
    for k, v in data.items():
        out[k] = translate_value_from_key(k)
    FILE.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__":
    main()

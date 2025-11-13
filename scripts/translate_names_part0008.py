#!/usr/bin/env python3
import json
import re
from pathlib import Path

# One-off, rule-based translator for names in part-0008.json
# No external translation services; simple token mapping + style handling.

STYLE_MAP = {
    "solid": "суцільна",
    "line": "контурна",
    "outline": "контурна",
    "duotone": "двотонна",
    "thin": "тонка",
    "light": "тонка",
    "bold": "жирна",
    "rounded": "закруглена",
    "sharp": "гостра",
}

# Shapes that should be combined inside parentheses with styles
SHAPE_MAP = {
    "circle": "кругла",
    "square": "квадратна",
    "triangle": "трикутна",
    "shield": "щитова",
}

# State/variant flags appended (later merged into parentheses)
STATE_MAP = {
    "off": "вимкнено",
    "print": "для друку",
    "disable": "вимкнено",
    "ltr": "LTR",
    "rtl": "RTL",
}

# Core noun/verb mapping (frequent tokens only)
WORD_MAP = {
    # UI/actions
    "add": "Додати",
    "plus": "Додати",
    "remove": "Видалити",
    "delete": "Видалити",
    "subtract": "Мінус",
    "minus": "Мінус",
    "save": "Зберегти",
    "search": "Пошук",
    "settings": "Налаштування",
    "setting": "Налаштування",
    "cog": "Шестерня",
    "gear": "Шестерня",
    "share": "Поділитися",
    "warning": "Попередження",
    "error": "Помилка",
    "check": "Галочка",
    "favorite": "Вибране",
    "star": "Зірка",
    "heart": "Серце",
    "key": "Ключ",
    "lock": "Замок",
    "unlock": "Відкрити замок",
    "signin": "Вхід",
    "signout": "Вихід",
    "window": "Вікно",
    "dashboard": "Панель",
    "performance": "Продуктивність",
    "language": "Мова",
    "development": "Розробка",
    "backend": "Бекенд",
    "dev": "Dev",
    "tags": "Теги",
    "tag": "Тег",
    "angle": "Кутові",
    "bracket": "Дужки",
    "checkmark": "Позначка",
    "pass": "успішно",
    "success": "Успіх",
    "hash": "Геш",
    "password": "Пароль",
    "security": "Безпека",
    "secure": "Захист",
    "login": "Вхід",
    "multiple": "Декілька",
    "two": "Два",
    "cascade": "Каскад",
    "query": "Запит",
    "find": "Знайти",
    "magnifying": "Лупа",
    "glass": "Лупа",
    "notification": "Сповіщення",
    "alert": "Тривога",
    "bug": "Баг",
    "symbol": "Символ",
    "wireless": "Бездротовий",
    "feed": "Канал",
    "transmit": "Передача",
    "broadcast": "Трансляція",
    "worldwide": "Світовий",
    "computer": "Комп'ютер",
    "piece": "Частина",
    "build": "Збірка",
    "website": "Вебсайт",
    "arrow": "Стрілка",
    "terminal": "Термінал",
    "shell": "Оболонка",
    "command": "Команда",
    "five": "5",
    "ltr": "LTR",
    "rtl": "RTL",
    # Navigation
    "previous": "Попередній",
    "next": "Наступний",
    "left": "Вліво",
    "right": "Вправо",
    "up": "Вгору",
    "down": "Вниз",
    "rewind": "Перемотка назад",
    # Media
    "play": "Відтворити",
    "pause": "Пауза",
    "stop": "Зупинити",
    "record": "Запис",
    # Common objects
    "podium": "Подіум",
    "pointy": "Загострений",
    "police": "Поліція",
    "post": "Пошта",
    "polygon": "Багатокутник",
    "popcorn": "Попкорн",
    "potted": "У горщику",
    "flower": "Квітка",
    "tulip": "Тюльпан",
    "pound": "Фунт",
    "power": "Живлення",
    "bank": "Банк",
    "present": "Подарунок",
    "presentation": "Презентація",
    "report": "Звіт",
    "counter": "Лічильник",
    "project": "Проєкт",
    "roadmap": "Дорожня карта",
    "symlink": "Символічне посилання",
    "template": "Шаблон",
    "preferences": "Налаштування",
    "prevention": "Профілактика",
    "puzzle": "Пазл",
    "cube": "Куб",
    "three": "Три",
    "modules": "Модулі",
    "printer": "Принтер",
    "printables": "Printables",
    "private": "Приватний",
    "content": "вміст",
    "processing": "Processing",
    "cloud": "Хмара",
    "server": "Сервер",
    "internet": "Інтернет",
    "network": "Мережа",
    "download": "Завантажити",
    "upload": "Вивантажити",
    "wifi": "Wi‑Fi",
    "browser": "Браузер",
    "apps": "Застосунки",
    "app": "Застосунок",
    "module": "Модуль",
    "plugin": "Плагін",
    "file": "Файл",
    "files": "Файли",
    "html": "HTML",
    "css3": "CSS3",
    "script": "Скрипт",
    "code": "Код",
    "rss": "RSS",
    "touchscreen": "Сенсорний екран",
    "web": "Веб",
    "world": "Світ",
    "earth": "Земля",
    "globe": "Глобус",
    "www": "WWW",
    "smartphone": "Смартфон",
    "smartphone2": "Смартфон 2",
    "smartwatch": "Розумний годинник",
    "notch": "виріз",
    "bag": "Сумка",
    "box": "Коробка",
    "cart": "Кошик",
    "shopping": "Покупки",
    "store": "Магазин",
    "delivery": "Доставка",
    "shipment": "Відправлення",
    "ship": "Доставка",
    "receipt": "Чек",
    "qrcode": "QR‑код",
    "qr": "QR‑код",
    "code": "Код",
    "smiley": "Смайлик",
    "smileys": "Смайли",
    "angry": "Злий",
    "cool": "Крутий",
    "crying": "Плач",
    "cute": "Милий",
    "kiss": "Поцілунок",
    "nervous": "Нервовий",
    "terrified": "Наляканий",
    "frown": "Насуплений",
    "frustrated": "Роздратований",
    "grin": "Усмішка",
    "grumpy": "Сердитий",
    "happy": "Щасливий",
    "in": "в",
    "love": "коханні",
    "laughing": "Сміх",
    "mask": "Маска",
    "nauseas": "Нудота",
    "neutral": "Нейтральний",
    "sigh": "Зітхання",
    "surprised": "Здивований",
    "thinking": "Думає",
    "throw": "Блювання",
    "up": "вверх",
    "very": "дуже",
    "shocked": "шокований",
    "yawn": "Позіхання",
    "smoke": "Дим",
    "detector": "Датчик",
    "free": "Без",
    "area": "зона",
    "snorkel": "Снорклінг",
    "snorkle": "Снорклінг",
    "mask": "Маска",
    "soft": "М'який",
    "wrap": "перенос",
    "unwrap": "без переносу",
    "snippet": "Фрагмент",
    "drink": "напій",
    "emoji": "Емодзі",
    "smirk": "Ухмилка",
    "smile": "Усмішка",
    "sad": "Сумний",
    "politics": "Політика",
    "compaign": "Кампанія",
    "push": "push",
    "rules": "правила",
    "python": "Python",
    "misc": "різне",
    "envelope": "конверт",
    "refund": "повернення",
    "text": "текст",
    "recent": "останні",
    "changes": "зміни",
    "recording": "запис",
    "tape": "плівка",
    "bubble": "бульбашка",
    "reference": "посилання",
    "existing": "наявне",
    "reflect": "віддзеркалити",
    "copy": "копія",
    "refresh": "оновити",
    "expressive": "виразний",
    "rel": "відносний",
    "path": "шлях",
    "clese": "закрити",
    "action": "дія",
    "reducer": "редюсер",
    "selector": "селектор",
    "regex": "RegEx",
    "religion": "Релігія",
    "cross": "хрест",
    "culture": "культура",
    "hexagram": "гексаграма",
    "jew": "єврей",
    "jewish": "єврейський",
    "judaism": "юдаїзм",
    "david": "Давида",
    "islam": "іслам",
    "moon": "місяць",
    "crescent": "півмісяць",
    "muslim": "мусульманський",
    "shinto": "синто",
    "gate": "ворота",
    "japan": "японія",
    "japanese": "японський",
    "shrine": "святиня",
    "peace": "мир",
    "war": "війна",
    "all": "все",
    "column": "стовпець",
    "row": "рядок",
    "format": "формат",
    "repo": "Репозиторій",
    "deleted": "видалено",
    "locked": "заблоковано",
    "report": "Звіт",
    "problem": "проблема",
    "interface": "інтерфейс",
    "residential": "житловий",
    "community": "спільнота",
    "restaurant": "ресторан",
    "bbq": "барбекю",
    "noodle": "локшина",
    "pizza": "піца",
    "seafood": "морепродукти",
    "sushi": "суші",
    "direction": "напрямок",
    "scroll": "прокрутка",
    "bar": "смуга",
    "pointing": "вказівний",
    "sign": "знак",
    "rightwards": "праворуч",
    "skin": "шкіра",
    "tone": "відтінок",
    "medium": "середній",
    "road": "дорога",
    "accident": "аварія",
    "rock": "камінь",
    "slide": "зсув",
    "yin": "Інь",
    "yang": "Ян",
    "tao": "Дао",
    "taoism": "Даосизм",
    "store": "сховище",
    "dark": "темний",
    "quality": "якісна",
    "education": "освіта",
    "quick": "Швидкі",
    "actions": "дії",
    "question": "Питання",
    "mark": "знак",
    "quotation": "Лапки",
    "reading": "читання",
    "time": "час",
    "radio": "радіо",
    "active": "активний",
    "list": "список",
    "radioactive": "Радіоактивний",
    "hexagon": "шестикутник",
    "racetrack": "гоночна траса",
    "boat": "човен",
    "cycling": "велоспорт",
    "horse": "кінь",
    "rail": "залізниця",
    "metro": "метро",
    "racket": "ракетка",
    "ball": "м'яч",
    "radial": "радіальні",
    "rays": "промені",
    # extras
    "grow": "Зростання",
    "track": "трек",
    "hand": "Рука",
    "praying": "Молитовна",
    "jp": "Японія",
    "primitive": "Проста",
    "dot": "Точка",
    "present": "Подарунок",
    "box": "Коробка",
    "data": "дані",
    "transfer": "передача",
    "fail": "Збій",
}

# Brands and products that should be left as is (with proper casing)
BRAND_CASE = {
    'pm2': 'PM2',
    'pnpm': 'PNPM',
    'pocketbase': 'PocketBase',
    'pocketcasts': 'Pocket Casts',
    'podcastaddict': 'Podcast Addict',
    'podcastindex': 'Podcast Index',
    'polars': 'Polars',
    'polestar': 'Polestar',
    'polymerproject': 'Polymer',
    'polywork': 'Polywork',
    'pond5': 'Pond5',
    'popos': 'Pop!_OS',
    'porkbun': 'Porkbun',
    'porsche': 'Porsche',
    'portableappsdotcom': 'PortableApps.com',
    'portswigger': 'PortSwigger',
    'posit': 'Posit',
    'posthtml': 'PostHTML',
    'postgresql': 'PostgreSQL',
    'postmates': 'Postmates',
    'primefaces': 'PrimeFaces',
    'primereact': 'PrimeReact',
    'primevideo': 'Prime Video',
    'primevue': 'PrimeVue',
    'printables': 'Printables',
    'privatedivision': 'Private Division',
    'privateinternetaccess': 'Private Internet Access',
    'processingfoundation': 'Processing Foundation',
    'processing': 'Processing',
    'processon': 'ProcessOn',
    'progate': 'Progate',
    'pronounsdotpage': 'Pronouns.page',
    'prosieben': 'ProSieben',
    'proteus': 'Proteus',
    'protocolsdotio': 'Protocols.io',
    'protodotio': 'Proto.io',
    'proton': 'Proton',
    'protoncalendar': 'Proton Calendar',
    'protondb': 'ProtonDB',
    'protondrive': 'Proton Drive',
    'protonvpn': 'ProtonVPN',
    'protools': 'Pro Tools',
    'pterodactyl': 'Pterodactyl',
    'pubg': 'PUBG',
    'publons': 'Publons',
    'pubmed': 'PubMed',
    'pug': 'Pug',
    'puma': 'Puma',
    'purgecss': 'PurgeCSS',
    'purism': 'Purism',
    'pycharm': 'PyCharm',
    'powershell': 'PowerShell',
    'pycqa': 'PyCQA',
    'pydantic': 'Pydantic',
    'pyg': 'PyG',
    'pypy': 'PyPy',
    'pyscaffold': 'PyScaffold',
    'pysyft': 'PySyft',
    'python': 'Python',
    'pythonanywhere': 'PythonAnywhere',
    'pytorch': 'PyTorch',
    'qantas': 'Qantas',
    'qase': 'Qase',
    'qatarairways': 'Qatar Airways',
    'qbittorrent': 'qBittorrent',
    'qemu': 'QEMU',
    'qmk': 'QMK',
    'qnap': 'QNAP',
    'qodo': 'Qodo',
    'qsharp': 'Q#',
    'qt': 'Qt',
    'smartthings': 'SmartThings',
    'smarty': 'Smarty',
    'smashdotgg': 'Smash.gg',
    'smugmug': 'SmugMug',
    'snakemake': 'Snakemake',
    'snapdragon': 'Snapdragon',
    'sncf': 'SNCF',
    'smoothcomp': 'Smoothcomp',
    'socketdotio': 'Socket.io',
    'socialblade': 'Social Blade',
    'softcatala': 'Softcatalà',
    'softpedia': 'Softpedia',
    'powerapps': 'Power Apps',
    'powerautomate': 'Power Automate',
    'powerbi': 'Power BI',
    'powerfx': 'Power Fx',
    'powerpages': 'Power Pages',
    'powervirtualagents': 'Power Virtual Agents',
    'foursqare': 'Foursquare',
    'pintarest': 'Pinterest',
    'soundcloud': 'SoundCloud',
    'vkontakte': 'VKontakte',
    'whatsapp': 'WhatsApp',
    'r': 'R',
    'rabbitmq': 'RabbitMQ',
    'raspberrypi': 'Raspberry Pi',
    'react': 'React',
    'reactivex': 'ReactiveX',
    'ts': 'TS',
    'redis': 'Redis',
    'redhat': 'Red Hat',
    'redux': 'Redux',
    'regex': 'RegEx',
    'rider': 'Rider',
    'replit': 'Replit',
    'rescript': 'ReScript',
}

BRAND_STYLE_THEME = {"dark", "light"}  # when paired with brand, interpret as theme
STOPWORDS = {"remix", "like", "apps", "app"}

def is_brand_like(value: str) -> bool:
    # Only treat as brand if single token AND known brand/product
    v = value.strip()
    return (' ' not in v) and (v.lower() in BRAND_CASE)

def title_case_token(tok: str) -> str:
    if tok in BRAND_CASE:
        return BRAND_CASE[tok]
    if re.fullmatch(r"[a-z]+\d+", tok):
        # like smartphone2 -> Smartphone 2
        m = re.match(r"([a-z]+)(\d+)", tok)
        return m.group(1).capitalize() + " " + m.group(2)
    # defaults: keep lowercase for generic nouns
    return tok.lower()

def translate_generic(value: str) -> str:
    tokens = value.split()
    # Collect styles and shapes for parentheses
    styles = []
    shapes = []
    states = []
    main_parts = []

    for t in tokens:
        tl = t.lower()
        # Special collocations
        # power bank -> Павербанк
        # previous track -> Попередній трек
        # polka dot -> в горошок
        
        if tl == 'programming':
            # drop noisy prefix
            continue
        if tl in STOPWORDS:
            continue
        if tl in STYLE_MAP:
            styles.append(STYLE_MAP[tl])
            continue
        if tl in SHAPE_MAP:
            shapes.append(SHAPE_MAP[tl])
            continue
        if tl in STATE_MAP:
            states.append(STATE_MAP[tl])
            continue
        # Special multiword joins
        if tl in {"qr", "qrcode"}:
            main_parts.append("QR‑код")
            continue
        # numbers keep as is
        if tl.isdigit():
            main_parts.append(t)
            continue
        # default word mapping
        if tl in WORD_MAP:
            main_parts.append(WORD_MAP[tl])
        else:
            # Fallback: Title-case unknown token (likely brand or rare noun)
            main_parts.append(title_case_token(tl))

    # Handle special collocations post-pass
    text = " ".join(main_parts)
    # power bank
    if re.search(r"\bЖивлення\b.*\bБанк\b", text):
        text = re.sub(r"Живлення\s+Банк", "Павербанк", text)
    # previous track
    text = re.sub(r"\bПопередній\s+Трек\b", "Попередній трек", text)
    # polka dot
    text = re.sub(r"\bPolka Dot\b", "В горошок", text)
    text = re.sub(r"\bPolka\s+Точка\b", "В горошок", text)
    text = re.sub(r"\bpolka\s+точка\b", "в горошок", text)
    text = re.sub(r"\bpolka\s+Точка\b", "в горошок", text)
    # soft drink
    text = re.sub(r"\bМ'який\s+напій\b", "Безалкогольний напій", text)
    # throw up -> блювання
    text = re.sub(r"\bБлювання\s+вверх\b", "Блювання", text)
    # favorite star/heart
    text = re.sub(r"\bВибране\s+Зірка\b", "Зірка (вибране)", text)
    text = re.sub(r"\bВибране\s+Серце\b", "Серце (вибране)", text)
    # presentation reorder
    text = re.sub(r"^Презентація\s+Лічильник\b", "Лічильник презентації", text)
    text = re.sub(r"^Презентація\s+Звіт\b", "Звіт презентації", text)
    text = re.sub(r"^Презентація\s+Відтворити\b", "Відтворити презентацію", text)
    # snorkel mask -> Маска для снорклінгу
    text = re.sub(r"\bСнорклінг\s+Маска\b", "Маска для снорклінгу", text)
    # data transfer -> Передача даних
    text = re.sub(r"\bдані\s+передача\b", "Передача даних", text)
    # question mark -> Знак питання
    text = re.sub(r"\bПитання\s+знак\b", "Знак питання", text)
    text = re.sub(r"\bпитання\s+знак\b", "знак питання", text)
    # quotation mark -> Лапки
    text = re.sub(r"\bЛапки\s+знак\b", "Лапки", text)
    # radio list -> Список радіо
    text = re.sub(r"^Радіо\s+список\b", "Список радіо", text)
    # reading time -> Час читання
    text = re.sub(r"\bчитання\s+час\b", "Час читання", text)
    # zoom: remove duplicated 'Лупа'
    text = re.sub(r"\bЛупа\s+Лупа\b", "Лупа", text)
    # direction reorder
    text = re.sub(r"^Вправо\s+напрямок\b", "Напрямок вправо", text)
    text = re.sub(r"^Вліво\s+напрямок\b", "Напрямок вліво", text)
    # ranger station
    text = re.sub(r"^рейнджер\s+станція\b", "Станція рейнджерів", text)
    # cleanup double spaces
    text = re.sub(r"\s+", " ", text).strip()

    # Build parentheses: shapes + states + styles
    paren_bits = []
    if shapes:
        paren_bits.append(" ".join(dict.fromkeys(shapes)))
    if states:
        paren_bits.append(", ".join(dict.fromkeys(states)))
    if styles:
        paren_bits.append(" ".join(dict.fromkeys(styles)))
    paren = f" ({'; '.join(paren_bits)})" if paren_bits else ""

    base = text
    # Normalize double spaces
    base = re.sub(r"\s+", " ", base).strip()
    # Move trailing ' Японія' to parentheses
    if base.endswith(" Японія"):
        base = base[:-7]
        paren = (paren[:-1] + "; Японія)" if paren else " (Японія)")
    # Uppercase first letter
    if base:
        base = base[0].upper() + base[1:]
    return base + paren

def translate_brand(value: str) -> str:
    parts = value.split()
    # Map known brand
    brand = BRAND_CASE.get(parts[0].lower(), title_case_token(parts[0].lower()))
    rest = parts[1:]
    styles = []
    for t in rest:
        tl = t.lower()
        if tl in BRAND_STYLE_THEME:
            styles.append("темна" if tl == "dark" else "світла")
        elif tl in STYLE_MAP:
            styles.append(STYLE_MAP[tl])
        else:
            # Additional words: try translate via WORD_MAP, else Title Case
            brand += " " + (WORD_MAP[tl] if tl in WORD_MAP else title_case_token(tl))
    if styles:
        return f"{brand} (" + " ".join(dict.fromkeys(styles)) + ")"
    return brand

def translate_entry(key: str, value: str) -> str:
    # Prefer using key for stable, idempotent results
    k = key.strip().lower()
    parts = k.split('-') if k else []
    if not parts:
        return translate_generic(value.strip())

    # Handle social-* -> brand + style
    if parts[0] == 'social' and len(parts) > 1:
        brand_tok = parts[1]
        rest = parts[2:]
        brand = BRAND_CASE.get(brand_tok, title_case_token(brand_tok))
        styles = []
        for t in rest:
            if t in BRAND_STYLE_THEME:
                styles.append('темна' if t == 'dark' else 'світла')
            elif t in STYLE_MAP:
                styles.append(STYLE_MAP[t])
        if styles:
            return f"{brand} (" + " ".join(dict.fromkeys(styles)) + ")"
        return brand

    # Special exact keys
    KEY_EXACT_MAP = {
        'smiling-face-with-open-mouth-and-closed-eyes': 'Усміхнене обличчя з відкритим ротом і заплющеними очима',
        'smoke-free-area': 'Зона без паління',
        'primitive-dot': 'Точка',
        'popout': 'Відкрити у новому вікні',
        'present-box': 'Подарункова коробка',
        'present-grow': 'Подарунок (збільшення)',
        'potted-flower-tulip-remix': 'Тюльпан у горщику',
        'potted-flower-tulip-solid': 'Тюльпан у горщику (суцільна)',
        'pm2-ecosystem': 'Екосистема PM2',
        'python-misc': 'Python (різне)',
        'push-rules': 'Правила push',
        'recent-changes-ltr': 'Останні зміни (LTR)',
        'recent-changes-rtl': 'Останні зміни (RTL)',
        'rail-metro': 'Метро',
        'rel-file-path': 'Відносний шлях',
    }
    if k in KEY_EXACT_MAP:
        return KEY_EXACT_MAP[k]

    # Programming-* -> treat as generic condensed
    if parts[0] == 'programming':
        # Rebuild a readable pseudo-value from key tokens
        pseudo = ' '.join(parts)
        return translate_generic(pseudo)

    # Brand-first keys
    first = parts[0]
    if first in BRAND_CASE:
        brand = BRAND_CASE[first]
        rest = parts[1:]
        styles = []
        extra = []
        for t in rest:
            tl = t.lower()
            if tl in BRAND_STYLE_THEME:
                styles.append('темна' if tl == 'dark' else 'світла')
            elif tl in STYLE_MAP:
                styles.append(STYLE_MAP[tl])
            else:
                extra.append(WORD_MAP[tl] if tl in WORD_MAP else title_case_token(tl))
        base = brand + (" " + " ".join(extra) if extra else "")
        if styles:
            return f"{base} (" + " ".join(dict.fromkeys(styles)) + ")"
        return base

    # General case from key tokens
    pseudo = ' '.join(parts)
    return translate_generic(pseudo)

def main():
    path = Path(__file__).parent.parent / 'translations' / 'missing-translations' / 'names' / 'part-0008.json'
    data = json.loads(path.read_text())
    out = {}
    for k, v in data.items():
        out[k] = translate_entry(k, v)
    # Write back
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
    print(f"Translated {len(out)} entries -> {path}")

if __name__ == '__main__':
    main()

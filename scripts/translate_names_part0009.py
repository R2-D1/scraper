#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Одноразовий скрипт перекладу назв іконок для файла:
  translations/missing-translations/names/part-0009.json

Підхід і правила узгоджені з docs/names-translation-instruction.md:
 - Коротка зрозуміла назва українською, що описує видиме
 - Стилі/варіанти/контейнер — у дужках (жіночий рід):
     контурна, заповнена, тонка, двотонова, закруглена, гостра,
     кругла, квадратна, трикутна, ромбова, шестикутна, овальна,
     перекреслена, для друку, світла/темна (для брендів)
 - Бренди не перекладати; для теми логотипів (dark/light) —
   додавати (темна)/(світла).

Скрипт не використовує автоматичні переклади — лише фразові
відповідники й правилa перетворення ключів.
"""

import json
import re
from pathlib import Path

FILE = Path("translations/missing-translations/names/part-0009.json")

# Вагові стилі (узгоджені як у «іконка» — ж. р.)
WEIGHT_STYLES = {
    "bold": "жирна",
    "duotone": "двотонова",
    "light": "тонка",
    "thin": "тонка",
}

# Варіанти відображення
VARIANT_STYLES = {
    "line": "контурна",
    "solid": "заповнена",
    "filled": "заповнена",
    "fill": "заповнена",
    "remix": "контурна",
    "print": "для друку",
    "off": "перекреслена",
    "stroked": "обведена",
    # орієнтація як стиль, щоб не дублювати дужки у фразі
    "horizontal": "горизонтальна",
    "vertical": "вертикальна",
}

# Форми/контейнери (як стиль у дужках)
SHAPE_STYLES = {
    "circle": "кругла",
    # square/triangle залишаємо як предмет (не як стиль)
    # "square": "квадратна",
    # "triangle": "трикутна",
    "diamond": "ромбова",
    "hexagon": "шестикутна",
    "oval": "овальна",
}

# Теми логотипів (для брендів)
THEME_STYLES = {
    "dark": "темна",
    # для брендів light це не «тонка», а «світла»
    "light": "світла",
}

# Напрямки
DIR_MAP = {
    "up": "вгору",
    "down": "вниз",
    "left": "ліворуч",
    "right": "праворуч",
}

# Бренди (не перекладаємо). Для зручності — мінімально необхідні в цій частині.
BRANDS = {
    # S…
    "solidjs": "SolidJS",
    "sololearn": "SoloLearn",
    "sonar": "Sonar",
    "sonicwall": "SonicWall",
    "sonarr": "Sonarr",
    "sonarsource": "SonarSource",
    "sonatype": "Sonatype",
    "sony": "Sony",
    "soundcharts": "Soundcharts",
    "sourcehut": "SourceHut",
    "southwestairlines": "Southwest Airlines",
    "spacy": "spaCy",
    "sparkar": "Spark AR",
    "sparkasse": "Sparkasse",
    "speedtest": "Speedtest",
    "speedypage": "SpeedyPage",
    "sphinx": "Sphinx",
    "spigotmc": "SpigotMC",
    "spinrilla": "Spinrilla",
    "spoj": "SPOJ",
    "spond": "Spond",
    "spotify": "Spotify",
    "spreadshirt": "Spreadshirt",
    "spring": "Spring",
    "springboot": "Spring Boot",
    "springsecurity": "Spring Security",
    "spyderide": "Spyder IDE",
    "squareenix": "Square Enix",
    "srgssr": "SRG SSR",
    "ssrn": "SSRN",
    "stackedit": "StackEdit",
    "stackhawk": "StackHawk",
    "stackoverflow": "Stack Overflow",
    "staffbase": "Staffbase",
    "stagetimer": "StageTimer",
    "standardjs": "StandardJS",
    "standardresume": "Standard Resume",
    "stardock": "Stardock",
    "starlingbank": "Starling Bank",
    "startdotgg": "Start.gg",
    "startpage": "Startpage",
    "startrek": "Star Trek",
    "starz": "Starz",
    "statuspal": "Statuspal",
    "steadybit": "Steadybit",
    "steamdb": "SteamDB",
    "steamdeck": "Steam Deck",
    "steamworks": "Steamworks",
    "steelseries": "SteelSeries",
    "steinberg": "Steinberg",
    "stencyl": "Stencyl",
    "steve": "Steve",  # для "steve-jobs"
    "stmicroelectronics": "STMicroelectronics",
    "stockx": "StockX",
    # T…
    "subaru": "Subaru",
    "sublime": "Sublime",
    "supabase": "Supabase",
    "surfshark": "Surfshark",
    "surveymonkey": "SurveyMonkey",
    "suzuki": "Suzuki",
    "svg": "SVG",
    "svgdotjs": "SVG.js",
    "svgr": "SVGR",
    "swiggy": "Swiggy",
    "swisscows": "Swisscows",
    "symfony": "Symfony",
    "sympy": "SymPy",
    "system76": "System76",
    "systemd": "systemd",
    "tabelog": "Tabelog",
    "tacobell": "Taco Bell",
    "tado": "tado°",
    "tailscale": "Tailscale",
    "tailwindcss": "Tailwind CSS",
    "taketwointeractivesoftware": "Take-Two Interactive",
    "talend": "Talend",
    "talenthouse": "Talenthouse",
    "tamiya": "Tamiya",
    "tampermonkey": "Tampermonkey",
    "tanuki": "Tanuki",
    "tarom": "TAROM",
    "tasmota": "Tasmota",
    "tata": "Tata",
    "tauri": "Tauri",
    "taxbuzz": "TaxBuzz",
    "taze": "Taze",
    "tcs": "TCS",
    "techcrunch": "TechCrunch",
    "teepublic": "TeePublic",
    "tekton": "Tekton",
    "tele5": "Tele 5",
    "telefonica": "Telefónica",
    "telegram": "Telegram",
    "telegraph": "Telegraph",
    "telenor": "Telenor",
    "telequebec": "Télé-Québec",
    "templ": "templ",
    "temporal": "Temporal",
    "tensorflow": "TensorFlow",
    "teradata": "Teradata",
    "teratail": "teratail",
    "termius": "Termius",
    "terraform": "Terraform",
    "tesco": "Tesco",
    "testin": "Testin",
    "testinglibrary": "Testing Library",
    "testrail": "TestRail",
    "textlint": "textlint",
    "textpattern": "Textpattern",
    "tga": "TGA",
    "thangs": "Thangs",
    "thanos": "Thanos",
    "theboringcompany": "The Boring Company",
    "theconversation": "The Conversation",
    "thefinals": "THE FINALS",
    "theguardian": "The Guardian",
    "theirishtimes": "The Irish Times",
    "themighty": "The Mighty",
    "themodelsresource": "The Models Resource",
    "themoviedatabase": "The Movie Database",
    "thenorthface": "The North Face",
    "theodinproject": "The Odin Project",
    "theplanetarysociety": "The Planetary Society",
    "theregister": "The Register",
    "thesoundsresource": "The Sounds Resource",
    "thespritersresource": "The Spriters Resource",
    "thestorygraph": "The StoryGraph",
    "thewashingtonpost": "The Washington Post",
    "theweatherchannel": "The Weather Channel",
    "thingiverse": "Thingiverse",
    "thinkpad": "ThinkPad",
    "thirdweb": "thirdweb",
    "threadless": "Threadless",
    "threema": "Threema",
    "thunderbird": "Thunderbird",
    "thunderstore": "Thunderstore",
    "thurgauerkantonalbank": "Thurgauer Kantonalbank",
    "ticketmaster": "Ticketmaster",
    "ticktick": "TickTick",
    "tiddlywiki": "TiddlyWiki",
    "tide": "Tide",
    "tidyverse": "Tidyverse",
    "tietoevry": "Tietoevry",
    "tiktok": "TikTok",
    "tildapublishing": "Tilda Publishing",
    "tile": "Tile",
    "tilgjengelighet": "Tilgjengelighet",
    "time": "Time",
    "tina": "Tina",
    "tinygrad": "tinygrad",
    "tinyletter": "TinyLetter",
    "tistory": "Tistory",
    "tldraw": "tldraw",
    "tobi": "Tobi",
    "tobimake": "tobimake",
    "toggltrack": "Toggl Track",
    "tokio": "Tokio",
    "tokyometro": "Tokyo Metro",
    "toml": "TOML",
    "tomorrowland": "Tomorrowland",
    "tomtom": "TomTom",
    "torbrowser": "Tor Browser",
    "torizon": "Torizon",
    "torproject": "Tor Project",
    "touchid": "Touch ID",
    "tourbox": "TourBox",
    "tplink": "TP-Link",
    "tqdm": "tqdm",
    "traccar": "Traccar",
    "tradingview": "TradingView",
    "trailforks": "Trailforks",
    "trendmicro": "Trend Micro",
    "tresorit": "Tresorit",
    "treyarch": "Treyarch",
    "topdotgg": "Top.gg",
    # U…
    "uniqlo": "Uniqlo",
    "unitedairlines": "United Airlines",
    "unitednations": "United Nations",
    "unity": "Unity",
    "unpkg": "unpkg",
    "unraid": "Unraid",
    "upcloud": "UpCloud",
    "uphold": "Uphold",
    "uplabs": "UpLabs",
    "upptime": "Upptime",
    "uptimekuma": "Uptime Kuma",
    "uptobox": "Uptobox",
    "transportforireland": "Transport for Ireland",
    "transportforlondon": "Transport for London",
    "studio3t": "Studio 3T",
    "studyverse": "Studyverse",
    "stylelint": "stylelint",
    "tablecheck": "TableCheck",
    "untangle": "Untangle",
    "unstop": "Unstop",
}

# Специфічні брендові фрази (багатослівні ключі)
BRAND_PHRASES = {
    ("stack", "overflow"): "Stack Overflow",
    ("google", "drive"): "Google Drive",
    ("google",): "Google",
    ("spring", "creators"): "Spring Creators",
}

def detect_brand(words):
    # багатослівні спочатку
    if len(words) >= 2:
        pair = (words[0], words[1])
        if pair in BRAND_PHRASES and (len(words) == 2 or words[2] in {"logo", "icon"}):
            return BRAND_PHRASES[pair]
    # однословні
    if words:
        w0 = words[0]
        if w0 in BRANDS:
            return BRANDS[w0]
    return None

def style_suffix(words, brand_mode=False):
    styles = []
    # Теми для брендів
    if brand_mode:
        for w in words:
            if w in THEME_STYLES:
                styles.append(THEME_STYLES[w])
    # Ваги/варіанти
    for w in words:
        if w in WEIGHT_STYLES:
            if brand_mode and w == "light":
                # для логотипів «light» — це тема (світла), а не «тонка»
                pass
            else:
                styles.append(WEIGHT_STYLES[w])
        if w in VARIANT_STYLES:
            styles.append(VARIANT_STYLES[w])
        if w in SHAPE_STYLES:
            styles.append(SHAPE_STYLES[w])
    # унікалізація порядку
    out = []
    seen = set()
    for s in styles:
        if s and s not in seen:
            seen.add(s)
            out.append(s)
    return f" ({', '.join(out)})" if out else ""


def cap(s: str) -> str:
    return s[:1].upper() + s[1:] if s else s


def direction_from(words):
    dirs = [DIR_MAP[w] for w in words if w in DIR_MAP]
    # унікалізація та порядок появи
    out = []
    for d in dirs:
        if d not in out:
            out.append(d)
    return (" " + "-".join(out)) if out else ""


# Фразові відповідники для цієї частини (S… T…)
PHRASES = {
    # S…
    "some email": "Поділитися поштою",
    "some email expressive": "Поділитися поштою",
    "some embed": "Вставити",
    "some facebook": "Facebook",
    "some google": "Google",
    "some instagram": "Instagram",
    "some pinterest": "Pinterest",
    "some share ios": "Поділитися (iOS)",
    "some share": "Поділитися",
    "some snapchat": "Snapchat",
    "some tommelopp active": "Палець вгору (активна)",
    "some tommelopp": "Палець вгору",
    "some tommelned active": "Палець вниз (активна)",
    "some tommelned": "Палець вниз",
    "some twitter": "Twitter",
    "some youtube": "YouTube",
    # SonarQube різновиди як брендові фрази
    "sonarqubecloud": "SonarQube Cloud",
    "sonarqubeforide": "SonarQube for IDE",
    "sonarqubeserver": "SonarQube Server",

    "sort descending": "Сортування за спаданням",
    "sort highest": "Сортування: найбільші",
    "sort lowest": "Сортування: найменші",
    "sort horizontal line": "Сортування",
    "sort horizontal": "Сортування",
    "sort vertical line": "Сортування",
    "sort vertical": "Сортування",
    "sort print": "Сортування",
    "sort": "Сортування",

    "sound": "Звук",
    "sound increase": "Гучність додати",
    "sound reduce": "Гучність зменшити",
    "sound up": "Гучність вгору",
    "sound off": "Звук вимкнено",

    "spades symbol": "Піки",
    "spaghetti fork": "Спагеті на виделці",
    "sparkles": "Блискітки",

    "speaker high": "Динамік гучно",
    "speaker low": "Динамік тихо",
    "speaker off": "Динамік вимкнено",
    "speakerphone": "Гучний зв'язок",

    "special pages ltr": "Спецсторінки (LTR)",
    "special pages rtl": "Спецсторінки (RTL)",

    "speech bubble add": "Хмаринка чату додати",
    "speech bubble": "Хмаринка чату",
    "speech bubbles": "Хмаринки чату",

    "spelling check": "Перевірка правопису",
    "spacing large": "Відступи великі",
    "spacing medium": "Відступи середні",
    "spacing small": "Відступи малі",
    "split view": "Розділений перегляд",
    "split vertical": "Розділити вертикально",
    "split horizontal": "Розділити горизонтально",
    "split": "Розділити",

    "spray paint": "Балончик фарби",
    "sprout": "Проросток",

    "square check": "Квадрат із галочкою",
    "square clock": "Годинник у квадраті",
    "square fill": "Квадрат",
    "square minus": "Квадрат із мінусом",
    "square root": "Квадратний корінь",
    "square stroked": "Квадрат (контур)",

    "star wars darth vader": "Зоряні війни Дарт Вейдер",
    "star wars r2": "Зоряні війни R2",
    "star active": "Зірка активна",
    "star minus": "Зірка мінус",
    "star plus": "Зірка плюс",
    "star empty space": "Порожня зірка",
    "star filled space": "Заповнена зірка",
    "star": "Зірка",
    "stars": "Зірки",

    "status active": "Статус активний",
    "status alert": "Статус попередження",
    "status cancelled": "Статус скасовано",
    "status closed": "Статус закрито",
    "status health": "Статус здоров'я",
    "status neutral": "Статус нейтральний",
    "status offline": "Статус офлайн",
    "status online": "Статус онлайн",
    "status paused": "Статус пауза",
    "status preparing": "Статус підготовка",
    "status stopped": "Статус зупинено",
    "status waiting": "Статус очікування",

    "steering wheel": "Кермо",
    "stethoscope": "Стетоскоп",
    "steve jobs": "Steve Jobs",
    "sticky notes": "Наліпки",

    "stop slash": "Стоп перекреслений",
    "stopwatch": "Хронометр",

    "store computer": "Комп'ютерний магазин",
    "store sale": "Розпродаж",

    "straight face": "Пряме обличчя",

    "stream": "Потік",

    "studio backdrop": "Фон студії",
    "studio light front": "Студійне світло фронт",
    "studio light side": "Студійне світло бік",

    "subgroup": "Підгрупа",
    "submodule": "Підмодуль",
    "subscription list": "Список підписок",
    "subscript": "Нижній індекс",
    "superscript": "Верхній індекс",
    "substitute": "Заміна",

    "subtract": "Мінус",

    "suitcase bag": "Сумка-валіза",

    "sumologic": "Sumo Logic",

    "sun": "Сонце",

    "sword circle": "Меч у колі",
    "sword shield": "Меч і щит",
    "swords": "Мечі",

    "symbol female": "Символ жінки",
    "symbol male": "Символ чоловіка",

    "synchronize diamond": "Синхронізація у ромбі",
    "synchronize triangle": "Синхронізація у трикутнику",
    "synchronize hexagon": "Синхронізація у шестикутнику",
    "synchronize lock encrypt": "Синхронізація (замок)",
    "synchronize loop": "Синхронізація",
    "synchronize find search": "Синхронізація пошук",
    "synchronize warning": "Синхронізація попередження",

    "syringe": "Шприц",
    "string": "Рядок",
    "splatter": "Клякса",
    "sponsor tiers": "Рівні спонсорства",

    # T…
    "t shirt": "Футболка",
    "tab external": "Вкладка зовнішня",
    "table add column": "Додати стовпець",
    "table add row": "Додати рядок",
    "table caption": "Підпис таблиці",
    "table density compact": "Щільність таблиці компактна",
    "table density expanded": "Щільність таблиці розширена",
    "table density normal": "Щільність таблиці звичайна",
    "table heart": "Серце в таблиці",
    "table lamp": "Настільна лампа",
    "table move column": "Перемістити стовпець",
    "table move row": "Перемістити рядок",
    "table plus": "Таблиця плюс",
    "table top": "План зверху",
    "tablet": "Планшет",
    "tag": "Ярлик",
    "task list": "Список завдань",
    "take off": "Зліт",
    "take": "Зліт",
    "taxi": "Таксі",

    "telegram": "Telegram",
    "telegraph": "Telegraph",
    "telescope": "Телескоп",
    "television": "Телевізор",
    "translate": "Переклад",

    "template add": "Додати шаблон",

    "test tube": "Пробірка",

    "text align center": "Вирівнювання по центру",
    "text align justify": "Вирівнювання по ширині",
    "text align left": "Вирівнювання ліворуч",
    "text align right": "Вирівнювання праворуч",
    "text bubble": "Текстова хмаринка",
    "text bubbles": "Текстові хмаринки",
    "text dir ltr": "Напрям тексту LTR",
    "text dir rtl": "Напрям тексту RTL",
    "text flow ltr": "Потік тексту LTR",
    "text flow rtl": "Потік тексту RTL",
    "text formatting": "Форматування тексту",
    "text image": "Текст і зображення",
    "text wrap": "Перенесення тексту",
    "textbox": "Текстове поле",

    "threat browser": "Загроза браузер",
    "threat document": "Загроза документ",
    "threat folder": "Загроза папка",

    "thumb down": "Палець вниз",
    "thumb up": "Палець вгору",
    "thumbs down": "Палець вниз",
    "thumbs up": "Палець вгору",

    "ticket": "Квиток",

    "time clock": "Годинник",
    "time out": "Тайм-аут",
    "time sand": "Пісочний годинник",
    "timer": "Таймер",

    "times": "Хрестик",

    "toggle switch on": "Перемикач увімкнено",

    # Elasticsearch / типи токенів
    "token alias": "Токен псевдонім",
    "token annotation": "Токен анотація",
    "token array": "Токен масив",
    "token binary": "Токен двійковий",
    "token boolean": "Токен булевий",
    "token class": "Токен клас",
    "token completion suggester": "Токен підказка завершення",
    "token constant": "Токен константа",
    "token date": "Токен дата",
    "token dense vector": "Токен щільний вектор",
    "token element": "Токен елемент",
    "token enum member": "Токен елемент переліку",
    "token enum": "Токен перелік",
    "token event": "Токен подія",
    "token exception": "Токен виняток",
    "token field": "Токен поле",
    "token file": "Токен файл",
    "token flattened": "Токен плоский",
    "token function": "Токен функція",
    "token geo": "Токен гео",
    "token histogram": "Токен гістограма",
    "token interface": "Токен інтерфейс",
    "token ip": "Токен IP",
    "token join": "Токен об’єднання",
    "token key": "Токен ключ",
    "token keyword": "Токен ключове слово",
    "token method": "Токен метод",
    "token module": "Токен модуль",
    "token namespace": "Токен простір імен",
    "token nested": "Токен вкладений",
    "token null": "Токен Null",
    "token number": "Токен число",
    "token object": "Токен об’єкт",
    "token operator": "Токен оператор",
    "token package": "Токен пакет",
    "token parameter": "Токен параметр",
    "token percolator": "Токен перколятор",
    "token property": "Токен властивість",
    "token range": "Токен діапазон",
    "token rank feature": "Токен рангова ознака",
    "token rank features": "Токен рангові ознаки",
    "token repo": "Токен репозиторій",
    "token search type": "Токен тип пошуку",
    "token shape": "Токен фігура",
    "token string": "Токен рядок",
    "token struct": "Токен структура",
    "token symbol": "Токен символ",
    "token text": "Токен текст",
    "token token count": "Кількість токенів",
    "token variable": "Токен змінна",

    "toml": "TOML",
    "tooltip": "Підказка",
    "tooltips": "Підказки",
    "top circle": "Вгору",

    "tor": "Tor",

    "transfer folder": "Передати папку",
    "transfer van": "Трансфер мікроавтобус",
    "transfer motorcycle": "Трансфер мотоцикл",

    "train": "Потяг",

    "trend arrow down": "Тренд вниз",
    "trend arrow up": "Тренд вгору",
    "trend static": "Сталий тренд",
    "trending down": "Тренд вниз",
    "trending up": "Тренд вгору",

    "triangle down": "Трикутник вниз",
    "triangle left": "Трикутник ліворуч",
    "triangle right": "Трикутник праворуч",
    # U…
    "unknown flag": "Невідомий прапор",
    "unlock active": "Відкритий замок (активна)",
    "unlock open line": "Відкритий замок (контурна)",
    "unlock open": "Відкритий замок",
    "unlock": "Розблокувати",
    "update ltr": "Оновити LTR",
    "update rtl": "Оновити RTL",
    "upload file": "Вивантажити файл",
    "upload new": "Нове завантаження",
    "upload": "Вивантажити",
    "uploaded": "Завантажено",
    "upload download traffic data transfer": "Передача даних",
    "usb drive": "USB-накопичувач",
    "up trend": "Тренд вгору",
    "up triangle": "Трикутник вгору",
    "up octagon": "Вгору (восьмикутна)",
    "up direction": "Напрям вгору",
    "up junction sign": "Знак розгалуження вгору",
    "up alt": "Вгору (альт.)",
    "telecommunicator": "Оператор",
    "tailless arrow shrink 2": "Стрілка без хвоста зменшити 2",
    "turn around up direction": "Розворот вгору",
    "trash can": "Кошик",
    "trash": "Кошик",
    "unstage all": "Скасувати індексацію всіх",
    "unwrap": "Розгорнути",
}


def phrase_from_tokens(tokens):
    s = " ".join(tokens)

    # Спочатку спроба знайти найдовший збіг у PHRASES
    for n in range(len(tokens), 0, -1):
        sub = " ".join(tokens[:n])
        if sub in PHRASES:
            return PHRASES[sub]

    # Узагальнені побудови для поширених груп
    if tokens and tokens[0] == "square":
        # square ...
        if len(tokens) >= 2 and tokens[1] == "root":
            return "Квадратний корінь"
        if len(tokens) >= 2 and tokens[1] == "check":
            return "Квадрат із галочкою"
        if len(tokens) >= 2 and tokens[1] == "minus":
            return "Квадрат із мінусом"
        # Спробуємо зберегти розмір/номер, якщо він є
        nums = [t for t in tokens[1:] if re.fullmatch(r"\d+", t)]
        if nums:
            return "Квадрат " + " ".join(nums)
        return "Квадрат"

    if tokens and tokens[0] == "star":
        return "Зірка"

    if tokens and tokens[0] == "stars":
        return "Зірки"

    if tokens and tokens[0] == "triangle":
        # triangle ...
        base = "Трикутник"
        # напрям останнім токеном
        dir_text = direction_from(tokens)
        return base + dir_text

    if tokens and tokens[0] == "speaker":
        # speaker [high|low|off] (circle?)
        if len(tokens) >= 2 and tokens[1] == "high":
            base = "Динамік гучно"
        elif len(tokens) >= 2 and tokens[1] == "low":
            base = "Динамік тихо"
        elif len(tokens) >= 2 and tokens[1] == "off":
            base = "Динамік вимкнено"
        else:
            base = "Динамік"
        return base

    if tokens and tokens[0] == "speech" and len(tokens) >= 2 and tokens[1] == "bubble":
        if len(tokens) >= 3 and tokens[2] == "add":
            return "Хмаринка чату додати"
        return "Хмаринка чату"

    if tokens and tokens[0] == "status":
        # status ...
        rest = " ".join(tokens[1:])
        if rest:
            return cap(f"Статус {rest}")
        return "Статус"

    if tokens and tokens[0] == "sword":
        if len(tokens) >= 2 and tokens[1] == "shield":
            return "Меч і щит"
        return "Меч"

    if tokens and tokens[0] == "swords":
        return "Мечі"

    if tokens and tokens[0] == "sun":
        return "Сонце"

    if tokens and tokens[0] == "stopwatch":
        return "Таймер" if "3" in tokens or "7" in tokens else "Хронометр"

    if tokens and tokens[0] == "telescope":
        return "Телескоп"

    if tokens and tokens[0] == "television":
        return "Телевізор"

    if tokens and tokens[0] == "table":
        # багато службових варіантів — спростимо
        if "lamp" in tokens:
            return "Настільна лампа"
        return "Таблиця"

    if tokens and tokens[0] == "tag":
        return "Ярлик"

    if tokens and tokens[0] == "tablet":
        return "Планшет"

    if tokens and tokens[0] == "ticket":
        return "Квиток"

    if tokens and tokens[0] == "text":
        # спробуємо покрити вирівнювання/напрям/обтікання
        if len(tokens) >= 2 and tokens[1] == "align":
            if "center" in tokens:
                return "Вирівнювання по центру"
            if "justify" in tokens:
                return "Вирівнювання по ширині"
            if "left" in tokens:
                return "Вирівнювання ліворуч"
            if "right" in tokens:
                return "Вирівнювання праворуч"
            return "Вирівнювання"
        if tokens[1:3] == ["dir", "ltr"]:
            return "Напрям тексту LTR"
        if tokens[1:3] == ["dir", "rtl"]:
            return "Напрям тексту RTL"
        if tokens[1:3] == ["flow", "ltr"]:
            return "Потік тексту LTR"
        if tokens[1:3] == ["flow", "rtl"]:
            return "Потік тексту RTL"
        if tokens[1] == "wrap":
            return "Перенесення тексту"
        return "Текст"

    if tokens and tokens[0] == "thumbs":
        return "Палець вгору" if "up" in tokens else ("Палець вниз" if "down" in tokens else "Палець")

    if tokens and tokens[0] == "toggle" and tokens[1:3] == ["switch", "on"]:
        return "Перемикач увімкнено"

    if tokens and (tokens[0] == "tooltips" or tokens[0] == "tooltip"):
        return "Підказки" if tokens[0] == "tooltips" else "Підказка"

    if tokens and tokens[0] == "top":
        return "Вгору"

    if tokens and tokens[0] == "train":
        return "Потяг"

    if tokens and tokens[0] == "trend" or (tokens and tokens[0] == "trending"):
        return "Тренд" + (" вниз" if "down" in tokens else (" вгору" if "up" in tokens else ""))

    if tokens and tokens[0] == "travel":
        # дорожні/навігаційні позначки
        s = " ".join(tokens)
        if "sail ship" in s or "boat" in s:
            return "Вітрильник"
        if "sink" in s:
            return "Раковина"
        if "disability" in s or "wheelchair" in s:
            return "Доступність (інвалідний візок)"
        if "fire exit" in s:
            return "Пожежний вихід"
        if "lifebuoy" in s or "life ring" in s:
            return "Рятувальний круг"
        if "lift" in s or "elevator" in s:
            return "Ліфт"
        if "stairs" in s:
            # ліві/праві сходи
            if "left" in s:
                return "Сходи ліворуч"
            if "right" in s:
                return "Сходи праворуч"
            if "up" in s:
                return "Сходи вгору"
            if "down" in s:
                return "Сходи вниз"
            return "Сходи"
        if "toilet sign" in s and "man woman" in s:
            return "Туалет (ч/ж)"
        if "toilet sign" in s and "man" in s:
            return "Туалет (чоловіки)"
        if "toilet sign" in s and "woman" in s:
            return "Туалет (жінки)"
        if "man symbol" in s:
            return "Символ чоловіка"
        if "woman symbol" in s:
            return "Символ жінки"
        return "Навігаційний покажчик"

    # За замовченням — капіталізація токенів (мінімально осмислено)
    name = " ".join(tokens).strip()
    return cap(name)


def translate_value_from_key(key: str) -> str:
    # Нормалізуємо: пробіли/дефіси -> пробіли, нижній регістр для пошуку шаблонів
    words = key.strip().lower().replace("_", " ").replace("-", " ").split()
    if not words:
        return key

    # Бренд
    brand = detect_brand(words)
    if brand:
        st = style_suffix(words, brand_mode=True)
        return f"{brand}{st}"

    # Прибираємо службові слова з базової фрази, але лишаємо їх у стилях
    base_words = [w for w in words if w not in set(WEIGHT_STYLES) | set(VARIANT_STYLES) | set(SHAPE_STYLES)]
    base = phrase_from_tokens(base_words)
    st = style_suffix(words, brand_mode=False)
    return f"{base}{st}".strip()


def main():
    data = json.loads(FILE.read_text(encoding="utf-8"))
    out = {}
    for k in data.keys():
        out[k] = translate_value_from_key(k)
    FILE.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

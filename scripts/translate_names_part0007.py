#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Одноразовий скрипт перекладу назв іконок для файла:
  translations/missing-translations/names/part-0007.json

Підхід:
- Беремо ключ як джерело змісту (розбиваємо за - та _).
- Стилі/стани виносимо в дужки наприкінці (контурна, суцільна, двоколірна, кругла, тощо).
- Бренди не перекладаємо; капіталізуємо та додаємо стиль, якщо є (light/dark → світла/темна для брендів).
- Для типових фраз застосовуємо словник патернів (startswith).
"""

import json
from pathlib import Path

FILE = Path("translations/missing-translations/names/part-0007.json")

# Стилі та їх українські відповідники (жіночий рід — «іконка»)
STYLE_MAP_GENERAL = {
    "line": "контурна",
    "solid": "суцільна",
    "duotone": "двоколірна",
    "bold": "жирна",
    "thin": "тонка",
    "rounded": "закруглена",
    "sharp": "гостра",
    "circle": "кругла",
    "square": "квадратна",
    "hexagon": "шестикутна",
    "print": "друк",
    "off": "вимкнено",
    "on": "увімкнено",
    "rtl": "RTL",
    "ltr": "LTR",
    # маркер варіанта колекції — не відображаємо в назві
    "remix": "",
}

# Для небрендових іконок light → «тонка», для брендів — «світла»
STYLE_LIGHT_NON_BRAND = "тонка"
STYLE_LIGHT_BRAND = "світла"
STYLE_DARK_BRAND = "темна"

# Відомі бренди цього блоку (мінімальний набір для коректної капіталізації + light/dark)
BRANDS = {
    # M…
    "movistar": "Movistar",
    "mpv": "MPV",
    "msi": "MSI",
    "msibusiness": "MSI Business",
    "mtr": "MTR",
    "mubi": "MUBI",
    "mui": "MUI",
    "mulesoft": "MuleSoft",
    "muller": "Müller",
    "mullvad": "Mullvad",
    "multisim": "Multisim",
    "mumble": "Mumble",
    "muo": "MUO",
    "mural": "Mural",
    "musicbrainz": "MusicBrainz",
    "mxml": "MXML",
    "myanimelist": "MyAnimeList",
    "myget": "MyGet",
    "myob": "MYOB",
    "myshows": "MyShows",
    "mysql": "MySQL",

    # N…
    "n26": "N26",
    "n8n": "n8n",
    "namebase": "Namebase",
    "namemc": "NameMC",
    "namesilo": "NameSilo",
    "namuwiki": "Namuwiki",
    "nanostores": "Nanostores",
    "nationalgrid": "National Grid",
    "nationalrail": "National Rail",
    "natsdotio": "NATS.io",
    "naver": "Naver",
    "nba": "NBA",
    "nbb": "NBB",
    "nbc": "NBC",
    "ndr": "NDR",
    "ndst": "NDST",
    "nebula": "Nebula",
    "nederlandsespoorwegen": "Nederlandse Spoorwegen",
    "neovim": "Neovim",
    "nestjs": "NestJS",
    "netapp": "NetApp",
    "netbsd": "NetBSD",
    "netcup": "netcup",
    "netdata": "Netdata",
    "neteasecloudmusic": "NetEase Cloud Music",
    "netflix": "Netflix",
    "netgear": "NETGEAR",
    "netim": "NETIM",
    "netlify": "Netlify",
    "nette": "Nette",
    "netto": "Netto",
    "newbalance": "New Balance",
    "newegg": "Newegg",
    "newjapanprowrestling": "NJPW",
    "newpipe": "NewPipe",
    "newyorktimes": "The New York Times",
    "nexon": "Nexon",
    "nextbike": "Nextbike",
    "nextbilliondotai": "Nextbillion.ai",
    "nextdns": "NextDNS",
    "nextdotjs": "Next.js",
    "nextjs": "Next.js",
    "nextra": "Nextra",
    "nexusmods": "Nexus Mods",
    "nfcore": "nf-core",
    "nginxproxymanager": "Nginx Proxy Manager",
    "nhl": "NHL",
    "niantic": "Niantic",
    "nicehash": "NiceHash",
    "niconico": "Niconico",
    "nikon": "Nikon",
    "nim": "Nim",
    "nintendo3ds": "Nintendo 3DS",
    "nintendods": "Nintendo DS",
    "nintendogamecube": "Nintendo GameCube",
    "nintendonetwork": "Nintendo Network",
    "nintendoswitch": "Nintendo Switch",
    "nix": "Nix",
    "nobaralinux": "Nobara Linux",
    "nodebb": "NodeBB",
    "nodedotjs": "Node.js",
    "nodejs": "Node.js",
    "norco": "Norco",
    "nordicsemiconductor": "Nordic Semiconductor",
    "nordvpn": "NordVPN",
    "normalizedotcss": "Normalize.css",
    "norwegian": "Norwegian",
    "notebooklm": "NotebookLM",
    "notepadplusplus": "Notepad++",
    "notion": "Notion",
    "notist": "Notist",
    "nounproject": "Noun Project",
    "novu": "Novu",
    "npm": "npm",
    "nrwl": "Nrwl",
    "ntfy": "ntfy",
    "nubank": "Nubank",
    "numba": "Numba",
    "nushell": "Nushell",
    "nutanix": "Nutanix",
    "nuxtjs": "Nuxt.js",
    "nxp": "NXP",
    "nzxt": "NZXT",

    # O…
    "o2": "O2",
    "obb": "ÖBB",
    "observable": "Observable",
    "obsidian": "Obsidian",
    "obsstudio": "OBS Studio",
    "obtainium": "Obtainium",
    "oclc": "OCLC",
    "oclif": "oclif",
    "octanerender": "OctaneRender",
    "octave": "GNU Octave",
    "octobercms": "OctoberCMS",
    "octoprint": "OctoPrint",
    "octopusdeploy": "Octopus Deploy",
    "odoo": "Odoo",
    "odysee": "Odysee",
    "ohdear": "Oh Dear",
    "okcupid": "OkCupid",
    "ollama": "Ollama",
    "omadacloud": "Omada Cloud",
    "onnx": "ONNX",
    "onstar": "OnStar",
    "opam": "OPAM",
    "opel": "Opel",
    "open3d": "Open3D",
    "openaccess": "Open Access",
    "openaigym": "OpenAI Gym",
    "openapi": "OpenAPI",
    "openapiinitiative": "OpenAPI Initiative",
    "openbadges": "Open Badges",
    "openbugbounty": "Open Bug Bounty",
    "opencontainersinitiative": "Open Container Initiative",
    "opencritic": "OpenCritic",
    "opencv": "OpenCV",
    "openfaas": "OpenFaaS",
    "openhab": "openHAB",
    "openjdk": "OpenJDK",
    "openjsfoundation": "OpenJS Foundation",
    "openmediavault": "OpenMediaVault",
    "openmined": "OpenMined",
    "opennebula": "OpenNebula",
    "openproject": "OpenProject",
    "opensea": "OpenSea",
    "opensourcehardware": "Open Source Hardware",
    "opensourceinitiative": "Open Source Initiative",
    "openssl": "OpenSSL",
    "openstack": "OpenStack",
    "opentext": "OpenText",
    "opentf": "OpenTF",
    "opentofu": "OpenTofu",
    "openverse": "Openverse",
    "openwrt": "OpenWrt",
    "openzeppelin": "OpenZeppelin",
    "operagx": "Opera GX",
    "oppo": "OPPO",
    "opslevel": "OpsLevel",
    "optuna": "Optuna",
    "orca": "Orca",
    "organicmaps": "Organic Maps",
    "osano": "Osano",
    "osf": "OSF",
    "osgeo": "OSGeo",
    "oshkosh": "Oshkosh",
    "osmand": "OsmAnd",
    "osu": "osu!",
    "otne": "OTNE",
    "owasp": "OWASP",
    "owncloud": "ownCloud",
    "oxc": "OXC",
    "oxlint": "oxlint",
    "oxygen": "Oxygen",
    "oyo": "OYO",

    # P…
    "p5dotjs": "p5.js",
    "packagist": "Packagist",
    "packship": "Packship",
    "packt": "Packt",
    "paddlepaddle": "PaddlePaddle",
    "paddypower": "Paddy Power",
    "padlet": "Padlet",
    "pagespeedinsights": "PageSpeed Insights",
    "pagseguro": "PagSeguro",
    "paloaltonetworks": "Palo Alto Networks",
    "paloaltosoftware": "Palo Alto Software",
    "panasonic": "Panasonic",
    "paperlessngx": "Paperless-ngx",
    "paperspace": "Paperspace",
    "paperswithcode": "Papers with Code",
    "paradoxinteractive": "Paradox Interactive",
    "paramountplus": "Paramount+",
    "paritysubstrate": "Parity Substrate",
    "parrotsecurity": "Parrot Security",
    "parsedotly": "Parse.ly",
    "payback": "Payback",
    "paychex": "Paychex",
    "payhip": "Payhip",
    "payloadcms": "Payload CMS",
    "payload": "Payload",
    "paypal": "PayPal",
    "paysafe": "Paysafe",
    "paytm": "Paytm",
    "pcgamingwiki": "PCGamingWiki",
    "pdm": "PDM",
    "pdq": "PDQ",
    "peakdesign": "Peak Design",
    "pearson": "Pearson",
    "pegasusairlines": "Pegasus Airlines",
    "pelican": "Pelican",
    "peloton": "Peloton",
    # додаткові бренди
    "onlyfans": "OnlyFans",
    "onlyoffice": "ONLYOFFICE",
    "neutralinojs": "Neutralinojs",
    "pihole": "Pi-hole",
    "pixabay": "Pixabay",
    "pixiv": "Pixiv",
    "pixlr": "Pixlr",
    "pkl": "PKL",
    "planetscale": "PlanetScale",
    "platformdotsh": "Platform.sh",
    "plausibleanalytics": "Plausible Analytics",
    "playcanvas": "PlayCanvas",
    "playerdotme": "Player.me",
    "pictogrammers": "Pictogrammers",
    "pioneerdj": "Pioneer DJ",
    "piwigo": "Piwigo",
    "pipx": "pipx",
    "pix": "Pix",
    "pinia": "Pinia",
    "pino": "Pino",
    "playstation2": "PlayStation 2",
    "playstation5": "PlayStation 5",
    "playstationportable": "PlayStation Portable",
    "playstationvita": "PlayStation Vita",
}


from typing import List


def is_brand(words: List[str]) -> bool:
    """Оцінимо, чи перше слово виглядає як бренд із нашого списку."""
    return bool(words) and words[0] in BRANDS


def style_suffix(words: List[str]) -> str:
    styles: list[str] = []
    brand = is_brand(words)
    # для емодзі-подібних назв, де light/dark — про тон шкіри, а не стиль
    is_bunny_ears = len(words) >= 4 and words[:4] == ["people", "with", "bunny", "ears"]
    for idx, w in enumerate(words):
        # "light bulb" — не стиль, а об'єкт
        if w == "light" and idx + 1 < len(words) and words[idx + 1] == "bulb":
            continue
        if w == "light" and not is_bunny_ears:
            styles.append(STYLE_LIGHT_BRAND if brand else STYLE_LIGHT_NON_BRAND)
        elif w == "dark" and not is_bunny_ears:
            styles.append(STYLE_DARK_BRAND)
        elif w in STYLE_MAP_GENERAL:
            styles.append(STYLE_MAP_GENERAL[w])
    # унікалізація порядку
    out: list[str] = []
    seen = set()
    for s in styles:
        if s and s not in seen:
            seen.add(s)
            out.append(s)
    return f"({', '.join(out)})" if out else ""


from typing import Optional


def translate_people_with_bunny_ears(words: List[str]) -> Optional[str]:
    """Спеціальна обробка для довгих ключів виду
    people-with-bunny-ears-…-skin-tone-…
    """
    if not (len(words) >= 4 and words[:4] == ["people", "with", "bunny", "ears"]):
        return None

    # Збираємо згадки тонів шкіри у послідовності токенів
    tones: list[str] = []
    i = 4
    while i < len(words):
        # шукаємо шаблони: (light|medium|dark) [light|dark]? skin tone
        if words[i] in {"light", "medium", "dark"}:
            first = words[i]
            second = None
            j = i + 1
            if j < len(words) and words[j] in {"light", "dark"}:
                second = words[j]
                j += 1
            if j + 1 < len(words) and words[j] == "skin" and words[j + 1] == "tone":
                if first == "light" and second is None:
                    tones.append("світлий тон шкіри")
                elif first == "dark" and second is None:
                    tones.append("темний тон шкіри")
                elif first == "medium" and second is None:
                    tones.append("середній тон шкіри")
                elif first == "medium" and second == "light":
                    tones.append("середньо-світлий тон шкіри")
                elif first == "medium" and second == "dark":
                    tones.append("середньо-темний тон шкіри")
                else:
                    tones.append(f"{first} {second or ''} skin tone".strip())
                i = j + 2
                continue
        i += 1

    base = "Люди з кролячими вушками"
    if tones:
        if len(tones) == 1:
            base = f"{base} — {tones[0]}"
        else:
            base = f"{base} — {', '.join(tones)}"
    return base


def phrase_translation(base_words: List[str]) -> str:
    s = " ".join(base_words)

    patterns = {
        # M
        "move x": "Переміщення по X",
        "move y": "Переміщення по Y",
        "mp3 player": "MP3 плеєр",
        "multi folder": "Кілька папок",
        "multi platform": "Кросплатформа",
        "multiple choice": "Множинний вибір",
        "multiple file 2": "Кілька файлів 2",
        "multiply": "Множення",

        "music disable": "Музика",
        "music equalizer 1": "Еквалайзер 1",
        "music file": "Музичний файл",
        "music folder song": "Музична папка",
        "music note double": "Подвійна нота",
        "music note single": "Одинарна нота",
        "music note 1": "Нота 1",
        "music note 2": "Нота 2",
        "music playlist": "Плейлист",
        "music tone alt": "Музичний тон (альт)",
        "music tone": "Музичний тон",

        "natural": "Природний",
        "nature cat": "Кіт",
        "nature dog": "Собака",
        "nature cloudy": "Хмарно",
        "nature flower": "Квітка",
        "nature fire": "Вогонь",
        "nature lightning": "Блискавка",
        "nature moon": "Місяць",
        "nature plant": "Рослина",
        "nature sea": "Море",
        "nature sun": "Сонце",
        "nature tree": "Дерево",
        "nature umbrella": "Парасолька",
        "nature water": "Вода",
        "nature leaf": "Листок",

        "nature ecology bone pet dog bone food snack": "Кістка для собаки",
        "nature ecology cat head cat pet animals felyne": "Голова кота",
        "nature ecology clover plant leaf tree flower luck lucky": "Конюшина",
        "nature ecology dog head dog pet animals canine": "Голова собаки",
        "nature ecology flower plant tree flower petals bloom": "Квітка",
        "nature ecology green house glass building plants crops produce farm": "Теплиця",
        "nature ecology leaf environment leaf ecology plant plants eco": "Листок",
        "nature ecology leaf protect environment leaf ecology plant plants eco": "Листок (захист)",
        "nature ecology pine tree plant tree farming christmas nature plants pine environment": "Сосна",
        "nature ecology potted cactus tree plant succulent pot": "Кактус у горщику",
        "nature ecology potted flower flower plant tree pot": "Квітка у горщику",
        "nature ecology potted plant tree plant succulent pot": "Рослина у горщику",
        "nature ecology potted tree 1 tree plant pot": "Дерево у горщику 1",
        "nature ecology potted tree 2 tree plant pot": "Дерево у горщику 2",
        # без "circle" (прибирається як стиль)
        "nature ecology rainbow arch rain colorful rainbow curve half": "Веселка",
        "nature ecology rice field sun rise set field crop produce farm": "Рисове поле",
        "nature ecology rose flower rose plant tree": "Троянда",
        "nature ecology tree 1 tree plant pine triangle park": "Дерево 1",
        # без "circle" (прибирається як стиль)
        "nature ecology tree 2 tree plant round park": "Дерево 2",
        "nature ecology volcano eruption erupt mountain volcano lava magma explosion": "Виверження вулкана",

        # NAV / navigation
        "nav administration": "Адміністрування",
        "nav ai flow": "AI потік",
        "nav alerting": "Сповіщення",
        "nav anomaly detection": "Виявлення аномалій",
        "nav dashboards": "Панелі",
        "nav data": "Дані",
        "nav detection rules": "Правила виявлення",
        "nav devtools": "Інструменти розробника",
        "nav discover": "Огляд",
        "nav experiments": "Експерименти",
        "nav get started": "Початок роботи",
        "nav info": "Інформація",
        "nav infra": "Інфраструктура",
        "nav integrations": "Інтеграції",
        "nav judgements": "Оцінки",
        "nav manage": "Керування",
        "nav maps": "Мапи",
        "nav models": "Моделі",
        "nav notebooks": "Нотатники",
        "nav notifications": "Сповіщення",
        "nav overview": "Огляд",
        "nav query sets": "Набори запитів",
        "nav reports": "Звіти",
        "nav search configurationsln": "Налаштування пошуку",
        "nav security cases": "Справи безпеки",
        "nav security findings": "Висновки безпеки",
        "nav service map": "Карта сервісів",
        "nav services": "Сервіси",
        "nav slos": "SLO",
        "nav threat intel": "Розвідка загроз",
        "nav ticketing": "Тікети",
        "nav ui": "Інтерфейс",

        "navigation arrow": "Стрілка навігації",
        "navigation next": "Навігація далі",
        "navigation up arrow": "Стрілка вгору",

        "night mode": "Нічний режим",
        "night rain": "Нічний дощ",
        "night wind": "Нічний вітер",
        "nightclub": "Нічний клуб",

        "no entry": "В'їзд заборонено",
        "no wiki text": "Без тексту вікі",
        "notice": "Примітка",

        "network refresh": "Оновити мережу",
        "network screen imac": "Мережевий екран iMac",

        "not bright": "Не яскраво",
        "not equal sign": "Знак не дорівнює",

        # Notes
        "note book": "Блокнот",
        "note down": "Нотатка вниз",
        "note up": "Нотатка вгору",
        "note nailed": "Нотатка прибита",
        "note text minus": "Текст нотатки мінус",
        "note text plus": "Текст нотатки плюс",
        "note text": "Текст нотатки",

        "noteblock text": "Текст блокнота",
        "noteblock": "Блокнот",

        # Notifications
        "notification alt": "Сповіщення (альт)",
        "notification application 2": "Сповіщення застосунку 2",
        "notification message alert": "Сповіщення про повідомлення",

        # One-finger gestures
        "one finger drag horizontal": "Перетягування одним пальцем горизонтально",
        "one finger drag vertical": "Перетягування одним пальцем вертикально",
        "one finger hold": "Утримання одним пальцем",
        "one vesus one": "Один проти одного",

        "ongoing conversation": "Триває розмова",
        
        # Гайка
        "nut": "Гайка",

        # Online medical
        "online medical call service": "Онлайн медичний дзвінок",
        "online medical web service": "Онлайн медичний веб сервіс",

        # Open…
        "open book": "Відкрита книга",
        "open": "Відкрити",

        # Out…
        "outbox": "Вихідні",
        "outdent": "Зменшити відступ",
        "outgoing call": "Вихідний дзвінок",
        "outline": "Контур",

        # Pack / package / page / pagination / paint / palette / paper
        "pack": "Пакунок",
        "package alt": "Пакунок (альт)",
        "package dependencies": "Залежності пакунка",
        "package dependents": "Залежні від пакунка",
        "package favorite star": "Пакунок із зіркою",
        "package stack": "Стос пакунків",
        "package trolley": "Візок для пакунків",
        "package wooden": "Дерев'яний пакунок",

        "page select": "Вибір сторінки",
        "page settings": "Налаштування сторінки",
        "pages select": "Вибір сторінок",
        "pagespeedinsights": "PageSpeed Insights",
        # payment
        "payment cash out 3": "Виведення коштів 3",
        "payment 10": "Платіж 10",
        "payment link": "Платіжне посилання",

        "pagination alt": "Нумерація сторінок (альт)",
        "pagination": "Нумерація сторінок",

        "paint pallet": "Палітра",
        "paintbrush 1": "Пензель 1",

        "palette": "Палітра",

        "paper airplane": "Паперовий літак",
        "paper binder": "Затискач для паперу",
        "paper clip": "Скрепка",
        "paper clock": "Документ з годинником",
        "paper fold text": "Складений папір текст",
        "paper fold": "Складений папір",
        "paper plane": "Паперовий літак",
        "paper roll 2": "Рулон паперу 2",
        "paperclip": "Скрепка",

        # Paragraph / park / parking / parliament
        "parabolic function": "Параболічна функція",
        "paragraph": "Абзац",
        "park alt1": "Парк (альт 1)",
        "parking garage": "Гараж паркінгу",
        "parking paid": "Платне паркування",
        "parking sign": "Знак паркінгу",
        "parking square": "Паркінг у квадраті",
        "parliament": "Парламент",
        "nebula": "Туманність",
        "neptune": "Нептун",
        "nested": "Вкладений",

        # Partial / partner / pass… / passport / password / paste
        "partial": "Частково",
        "partner verified": "Перевірений партнер",
        "passkey": "Ключ доступу",
        "passport": "Паспорт",
        "password pencil": "Редагування пароля",
        "password": "Пароль",
        "paste": "Вставити",

        # Pathfinder
        "pathfinder divide": "Pathfinder: розділити",
        "pathfinder exclude": "Pathfinder: виключення",
        "pathfinder intersect": "Pathfinder: перетин",
        "pathfinder merge": "Pathfinder: об'єднання",
        "pathfinder minus front 1": "Pathfinder: відняти передній 1",
        "pathfinder square exclude": "Pathfinder: квадрат виключення",
        "pathfinder square intersect": "Pathfinder: квадрат перетину",
        "pathfinder square merge": "Pathfinder: квадрат об'єднання",
        "pathfinder square minus front 1": "Pathfinder: квадрат відняти передній 1",
        "pathfinder square trim": "Pathfinder: квадрат обрізка",
        "pathfinder square union": "Pathfinder: квадрат об'єднати",
        "pathfinder trim": "Pathfinder: обрізка",
        "pathfinder union": "Pathfinder: об'єднати",

        # Pause / peace / pen / pencil / people…
        "pause": "Пауза",
        "peace hand": "Жест миру",
        "peace symbol": "Символ миру",
        "nurse hat": "Ковпак медсестри",
        "pen": "Ручка",
        "pen 3": "Ручка 3",
        "pen circle": "Ручка",
        "pencil alt": "Олівець (альт)",
        "pencil": "Олівець",
        "pencil clipboard": "Олівець і буфер",
        "pencil single": "Олівець",
        "pencil writing": "Написання олівцем",
        "people group": "Група людей",
        "people": "Люди",
        # додаткові короткі патерни
        "necklace": "Намисто",
        "next track": "Наступний трек",
        "next": "Далі",
        "new chat": "Новий чат",
        "new document layer": "Новий шар документа",
        "new window page": "Нове вікно сторінки",
        "new window": "Нове вікно",
        "newline": "Перенос рядка",
        "newspaper": "Газета",
        "objective c": "Objective C",
        "objective cpp": "Objective C++",
        "observation tower": "Оглядова вежа",
        "offline": "Офлайн",
        "options vertical": "Вертикальні параметри",
        "orientation landscape": "Орієнтація альбомна",
        "orientation portrait": "Орієнтація книжкова",
        "origami paper bird": "Орігамі птах",
        "other arrows": "Інші стрілки",
        # other-ui — конкретні назви
        "other ui at": "Символ @",
        "other ui award": "Нагорода",
        "other ui binoculars": "Бінокль",
        "other ui bluetooth": "Bluetooth",
        "other ui call": "Дзвінок",
        "other ui chat": "Чат",
        "other ui color palette": "Палітра кольорів",
        "other ui color picker": "Піпетка",
        "other ui crown": "Корона",
        "other ui graph": "Графік",
        "other ui hand move": "Рух рукою",
        "other ui hand select": "Вибір рукою",
        "other ui hash": "Решітка",
        "other ui inbox": "Вхідні",
        "other ui key": "Ключ",
        "other ui layers": "Шари",
        "other ui light bulb": "Лампочка",
        "other ui location off": "Місцезнаходження (вимкнено)",
        "other ui location": "Місцезнаходження",
        "other ui magnet": "Магніт",
        "other ui mail": "Пошта",
        "other ui maximize": "Розгорнути",
        "other ui megaphone": "Мегафон",
        "other ui minimize": "Згорнути",
        "other ui mouse pointer": "Вказівник миші",
        "other ui pen tool": "Перо",
        "other ui rocket": "Ракета",
        "other ui scanner": "Сканер",
        "other ui send": "Надіслати",
        "other ui skull": "Череп",
        "other ui sparks": "Іскри",
        "other ui target": "Мішень",
        "other ui wi fi off": "Wi‑Fi (вимкнено)",
        "other ui wi fi": "Wi‑Fi",
        "other ui wrench": "Гайковий ключ",
        "other ui zoom in": "Збільшити",
        "other ui zoom out": "Зменшити",
        # fallback для other ui
        "other ui": "Інше UI",
        "outdent": "Зменшити відступ",
        "pack duotone": "Пакунок",
        "pack light": "Пакунок",
        "pack solid": "Пакунок",
        "palette": "Палітра",
        "paper plane": "Паперовий літак",
        "paperplane": "Паперовий літак",
        "paragraph": "Абзац",
        "parking sign": "Знак паркінгу",
        "people group": "Група людей",
        # NgRx підрозділи
        "ngrx actions": "NgRx Дії",
        "ngrx effects": "NgRx Ефекти",
        "ngrx entity": "NgRx Сутності",
        "ngrx reducer": "NgRx Редюсери",
        "ngrx selectors": "NgRx Селектори",
        "ngrx state": "NgRx Стан",

        # Nintendo Switch
        "nintendo switch": "Nintendo Switch",

        # PHP екосистема
        "php": "PHP",
        "php elephant pink": "Слон PHP (рожевий)",
        "phpbb": "phpBB",
        "phpmyadmin": "phpMyAdmin",
        "phpstan": "PHPStan",
        "phpstorm": "PhpStorm",

        # «pin…»
        "pin location": "Позначка локації",
        "pin place": "Позначка",
        "pin": "Шпилька",
        "pinpoint": "Точна позначка",
        "pinwheel": "Вітрячок",

        # Пігулка
        "pill": "Пігулка",

        # Пі-символ
        "pi symbol": "Символ пі",

        # Планета
        "planet ring 2": "Кільце планети 2",
        "planet ring": "Кільце планети",
        "planet rocket": "Планета з ракетою",
        "planet": "Планета",

        # План / планування
        "plan9": "Plan 9",
        "plan": "План",
        "planning": "Планування",

        # Платформа / аналітика
        "platformdotsh": "Platform.sh",
        "plausibleanalytics": "Plausible Analytics",

        # Відтворення
        "play btn": "Кнопка відтворення",
        "playlist": "Плейлист",
        "play list": "Список відтворення",
        "play media video": "Відтворення відео",
        "play store": "Play Store",
        "play station": "Ігрова станція",
        "play": "Відтворення",

        # Зображення
        "picture frame": "Рамка для фото",
        "picture polaroid": "Полароїд",

        # Пікнік
        "picnic basket": "Кошик для пікніка",
        "picnic site": "Місце для пікніка",
        "picnic": "Пікнік",

        # Переробка (помилкове natrue)
        "natrue ecology recycle 1 sign environment protect save arrows": "Переробка",
    }

    # спеціальний обробник довгих «people with bunny ears …»
    pwbe = translate_people_with_bunny_ears(base_words)
    if pwbe:
        return pwbe

    for pat in sorted(patterns, key=lambda x: -len(x)):
        if s.startswith(pat):
            return patterns[pat]

    # Запасний варіант — склеїти слова з мінімальними замінами
    token_map = {
        "x": "X",
        "y": "Y",
        "ui": "UI",
        "wi": "Wi",
        "fi": "Fi",
        "hexagon": "Шестикутник",
        "circle": "Коло",
        "square": "Квадрат",
        "arrow": "Стрілка",
        "next": "Далі",
        "up": "Вгору",
        "down": "Вниз",
        "left": "Вліво",
        "right": "Вправо",
        "at": "@",
        "mail": "Пошта",
        "key": "Ключ",
        "graph": "Графік",
        "layers": "Шари",
        "magnet": "Магніт",
        "rocket": "Ракета",
        "scanner": "Сканер",
        "send": "Надіслати",
        "skull": "Череп",
        "sparks": "Іскри",
        "target": "Мішень",
        "wrench": "Гайковий ключ",
        "zoom": "Масштаб",
        "object": "Об'єкт",
        "plus": "Плюс",
        "minus": "Мінус",
    }
    out = [token_map.get(w, w) for w in base_words]
    name = " ".join(out).strip()
    if name:
        name = name[0].upper() + name[1:]
    return name


def translate_value_from_key(key: str) -> str:
    words = key.strip().lower().replace("_", " ").replace("-", " ").split()
    if not words:
        return key

    # спецвипадок: people-with-bunny-ears-* (потрібні оригінальні токени зі "dark/light skin tone")
    if len(words) >= 4 and words[:4] == ["people", "with", "bunny", "ears"]:
        base = translate_people_with_bunny_ears(words) or "Люди з кролячими вушками"
        st = style_suffix(words)
        res = f"{base} {st}".strip()
        return " ".join(res.split())

    # Якщо це бренд — повертаємо бренд + стиль (dark/light → темна/світла)
    if is_brand(words):
        brand_name = BRANDS[words[0]]
        st = style_suffix(words)
        return f"{brand_name} {st}".strip()

    # Прибираємо стилі з базової фрази
    STYLE_KEYS = set(STYLE_MAP_GENERAL) | {"light", "dark"}
    base_words: List[str] = []
    i = 0
    while i < len(words):
        w = words[i]
        # зберігаємо "light" у словосполученні "light bulb"
        if w == "light" and i + 1 < len(words) and words[i + 1] == "bulb":
            base_words.append(w)
            i += 1
            continue
        if w not in STYLE_KEYS:
            base_words.append(w)
        i += 1

    base = phrase_translation(base_words)
    st = style_suffix(words)
    res = f"{base} {st}".strip()
    return " ".join(res.split())


def main():
    data = json.loads(FILE.read_text(encoding="utf-8"))
    out = {}
    for k, _v in data.items():
        out[k] = translate_value_from_key(k)
    FILE.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

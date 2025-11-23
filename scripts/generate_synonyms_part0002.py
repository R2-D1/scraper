#!/usr/bin/env python3
import json
from pathlib import Path

SRC = Path('translations/icons/missing-synonyms/part-0002.json')


def uniq(seq):
    seen = set()
    out = []
    for x in seq:
        k = x.strip()
        if not k:
            continue
        if k.lower() in seen:
            continue
        seen.add(k.lower())
        out.append(k)
    return out


def order_syns(seq):
    def is_cyr(s: str) -> bool:
        return any('а' <= ch.lower() <= 'я' or ch.lower() in "єіїґ'’" for ch in s)
    ua = [s for s in seq if is_cyr(s)]
    en = [s for s in seq if not is_cyr(s)]
    return ua + en


# Ручні синоніми для відомих ключів цієї частини
manual = {
    # C...
    "citrix": [
        "сітрікс", "цитрікс", "віртуалізація", "віддалений робочий стіл", "remote desktop", "virtualization",
    ],
    "citroen": [
        "сітроен", "цитроен", "авто", "марка авто", "машина", "car", "auto",
    ],
    "civo": [
        "хмара", "клауд", "kubernetes", "k8s", "devops", "cloud",
    ],
    "ckeditor4": [
        "редактор тексту", "wysiwyg", "rich text", "текст", "cms",
    ],
    "clangd": [
        "clang", "c++", "lsp", "language server", "інструменти c/c++",
    ],
    "clarifai": [
        "штучний інтелект", "ai", "комп'ютерний зір", "vision", "аналіз зображень",
    ],
    "clarivate": [
        "наукова аналітика", "web of science", "публікації", "цитування", "research",
    ],
    "clerk": [
        "аутентифікація", "логін", "користувачі", "auth", "sso",
    ],
    "clevercloud": [
        "хостинг", "паас", "деплой", "apps", "cloud",
    ],
    "cliqz": [
        "браузер", "приватність", "пошук", "search", "privacy",
    ],
    "cloud66": [
        "деплой", "docker", "сервери", "хмара", "hosting",
    ],
    "cloudcannon": [
        "статичні сайти", "cms", "jekyll", "хостинг",
    ],
    "cloudflarepages": [
        "cloudflare", "статичні сайти", "хостинг", "deploy", "pages",
    ],
    "cloudnativebuild": [
        "buildpacks", "cncf", "контейнери", "docker", "збірка",
    ],
    "cloudron": [
        "self-hosted", "apps", "сервер", "хостинг",
    ],
    "cloudways": [
        "хостинг", "vps", "managed", "wordpress", "cloud",
    ],
    "clubhouse": [
        "аудіочат", "соцмережа", "voice", "чат", "community",
    ],
    "cnet": [
        "техно новини", "огляди", "гаджети", "news", "tech",
    ],
    "coala": [
        "літеринг коду", "linter", "статичний аналіз", "python",
    ],
    "cocacola": [
        "кока-кола", "напій", "сода", "кола", "brand",
    ],
    "cockroachlabs": [
        "cockroachdb", "база даних", "sql", "розподілена", "database",
    ],
    "coctail": [
        "коктейль", "напої", "бар", "алкоголь", "мікси", "cocktail",
    ],
    "codeblocks": [
        "ide", "c++", "компіляція", "редактор коду",
    ],
    "codeceptjs": [
        "тестування", "e2e", "qa", "javascript", "automation",
    ],
    "codechef": [
        "змагання", "олімпіади", "алгоритми", "competitive programming",
    ],
    "codecrafters": [
        "челенджі", "навчання", "програмування", "курси",
    ],
    "codeforces": [
        "змагання", "олімпіади", "rating", "cp", "алгоритми",
    ],
    "codefresh": [
        "ci/cd", "deploy", "docker", "pipeline",
    ],
    "codeium": [
        "ai код", "автодоповнення", "підказки", "assistant", "coding",
    ],
    "codemagic": [
        "ci/cd", "flutter", "mobile", "build", "deploy",
    ],
    "codementor": [
        "ментор", "репетитор", "допомога", "навчання", "mentoring",
    ],
    "codenewbie": [
        "початківець", "спільнота", "форум", "навчання",
    ],
    "codeproject": [
        "статті", "спільнота", "код", "приклади",
    ],
    "coder": [
        "remote ide", "dev", "код", "сервер",
    ],
    "coderabbit": [
        "code review", "ai", "бот", "github",
    ],
    "codereview": [
        "рев'ю коду", "перевірка", "pull request", "code review",
    ],
    "codes": [
        "коди", "qr", "штрихкод", "codes",
    ],
    "codescan": [
        "скан коду", "безпека", "sast", "аналіз",
    ],
    "codesignal": [
        "інтерв'ю", "тести", "алгоритми", "оцінка", "hiring",
    ],
    "codespaces": [
        "github", "cloud ide", "devcontainer", "розробка",
    ],
    "codestream": [
        "коментарі", "співпраця", "ide", "команда",
    ],
    "codex": [
        "кодекс", "довідник", "посібник", "codex",
    ],
    "codingame": [
        "ігри", "челенджі", "навчання", "алгоритми",
    ],
    "codingninjas": [
        "навчання", "курси", "програмування", "спільнота",
    ],
    "coggle": [
        "майндмеп", "діаграма", "схеми", "нотатки", "mind map",
    ],
    "cognizant": [
        "аутсорс", "іт компанія", "консалтинг", "робота",
    ],
    "coinmarketcap": [
        "крипта", "ціни", "ринок", "bitcoin", "crypto",
    ],
    "collaboraonline": [
        "офіс онлайн", "документи", "редактор", "libreoffice",
    ],
    "coloredpetrinets": [
        "мережі петрі", "моделювання", "діаграми", "системи",
    ],
    "colorful": [
        "видеокарти", "gpu", "залізо", "компоненти",
    ],
    "comicfury": [
        "комікси", "вебкомікс", "автори", "арт",
    ],
    "commerzbank": [
        "банк", "фінанси", "німеччина", "гроші",
    ],
    "commodore": [
        "ретро", "комп'ютер", "c64", "амiга",
    ],
    "commonlisp": [
        "lisp", "мова програмування", "функціональна", "програмування",
    ],
    "commonworkflowlanguage": [
        "cwl", "workflow", "пайплайни", "наука",
    ],
    "comparison": [
        "порівняння", "vs", "таблиця", "діф",
    ],
    "compilerexplorer": [
        "godbolt", "компілятор", "асемблер", "analysis",
    ],
    "completion": [
        "автодоповнення", "autocomplete", "підказки", "код",
    ],
    "compressed": [
        "архів", "zip", "rar", "tar", "стиснення",
    ],
    "comptia": [
        "сертифікація", "екзамен", "it", "security+",
    ],
    "compute": [
        "обчислення", "сервери", "ресурси", "cpu", "клауд",
    ],
    "computerdevicesprogramming": [
        "комп'ютер", "девайси", "програмування", "гаджети", "hardware", "software",
    ],
    "comsol": [
        "моделювання", "фем", "симуляція", "інженерія",
    ],
    "condaforge": [
        "conda", "пакети", "репозиторій", "python",
    ],
    "confectionery": [
        "солодощі", "кондитерка", "цукерки", "шоколад",
    ],
    "configurationsln": [
        "конфігурації", "solution", "налаштування", "профілі",
    ],
    "construct3": [
        "ігровий рушій", "html5", "2d", "ігри",
    ],
    "contabo": [
        "vps", "хостинг", "сервер", "cloud",
    ],
    "contactlesspayment": [
        "безконтактна оплата", "nfc", "термінал", "tap", "pay",
    ],
    "containerd": [
        "контейнери", "docker", "runtime", "kubernetes",
    ],
    "contentlayer": [
        "контент", "markdown", "nextjs", "cms",
    ],
    "contentstack": [
        "headless cms", "контент", "api", "cms",
    ],
    "continente": [
        "супермаркет", "магазин", "ритейл", "food",
    ],
    "continuity": [
        "безперервність", "workflow", "процес", "зв'язність",
    ],
    "contrass": [
        "контраст", "різниця", "відтінки", "contrast",
    ],
    "contribution": [
        "внесок", "участь", "донат", "контриб'юшн",
    ],
    "contributions": [
        "внески", "участь", "донати", "контриб'юшни",
    ],
    "contributorcovenant": [
        "кодекс поведінки", "етика", "community", "open source",
    ],
    "conventionalcommits": [
        "комміти", "git", "semver", "стандарт",
    ],
    "convertio": [
        "конвертер", "pdf", "формати", "файли",
    ],
    "cookiecutter": [
        "шаблон", "генератор", "python", "скелет",
    ],
    "coolermaster": [
        "кулер", "корпус", "периферія", "pc", "залізо",
    ],
    "coolify": [
        "деплой", "self-hosted", "apps", "paas",
    ],
    "coop": [
        "кооператив", "магазин", "супермаркет", "ритейл",
    ],
    "copaairlines": [
        "авіакомпанія", "переліт", "літак", "авіалінії",
    ],
    "coppel": [
        "магазин", "ритейл", "кредит", "товари",
    ],
    "copywriting": [
        "копірайтинг", "тексти", "реклама", "контент",
    ],
    "cora": [
        "супермаркет", "магазин", "ритейл", "гіпермаркет",
    ],
    "cords": [
        "дроти", "кабелі", "шнури", "проводка",
    ],
    "coronaengine": [
        "ігровий рушій", "lua", "мобільні ігри", "game",
    ],
    "coronarenderer": [
        "3d рендер", "візуалізація", "графіка", "архвіз",
    ],
    "corsair": [
        "периферія", "клавіатура", "миша", "пам'ять", "бренд",
    ],
    "couldron": [
        "казан", "котел", "зілля", "чаклунство", "cauldron",
    ],
    "counterstrike": [
        "cs", "шутер", "гра", "кіберспорт", "fps",
    ],
    "countingworkspro": [
        "бухгалтерія", "податки", "професіонали", "фінанси",
    ],
    "coze": [
        "чат", "бот", "ai", "assistant",
    ],
    "cplusplusbuilder": [
        "c++", "компілятор", "збірка", "ide",
    ],
    "craco": [
        "react", "webpack", "конфіг", "override",
    ],
    "craftsman": [
        "майстер", "інструменти", "ремонт", "tool",
    ],
    "cratedb": [
        "база даних", "sql", "timeseries", "database",
    ],
    "creality": [
        "3d принтер", "друк", "пластик", "end3",
    ],
    "createreactapp": [
        "react", "шаблон", "starter", "cli",
    ],
    "creativecommons": [
        "ліцензія", "cc", "відкритий доступ", "право",
    ],
    "creativetechnology": [
        "звук", "аудіо", "sound blaster", "плеєри",
    ],
    "creators": [
        "творці", "контент", "автори", "creator economy",
    ],
    "credly": [
        "бейдж", "сертифікат", "відзнака", "acclaim",
    ],
    "crehana": [
        "курси", "дизайн", "ілюстрація", "навчання",
    ],
    "crewai": [
        "ai агенти", "оркестрація", "workflow", "python",
    ],
    "crewunited": [
        "кіно", "професіонали", "мережа", "актори",
    ],
    "criticalrole": [
        "dnd", "рольова гра", "стрім", "фентезі",
    ],
    "crops": [
        "урожай", "агро", "поля", "ферма",
    ],
    "crt": [
        "кінескоп", "ретро", "монітор", "екран",
    ],
    "cryptomator": [
        "шифрування", "диск", "vault", "безпека",
    ],
    "cryptpad": [
        "шифрований", "нотатки", "документи", "collab",
    ],
    "csdn": [
        "форум", "блоги", "розробники", "китай",
    ],
    "cssdesignawards": [
        "нагороди", "вебдизайн", "awards", "сайт",
    ],
    "cssmodules": [
        "css", "scoped", "модулі", "react",
    ],
    "cultura": [
        "книги", "мистецтво", "магазин", "ритейл",
    ],
    "cupid": [
        "амур", "серце", "любов", "стріла", "валентин",
    ],
    "curseforge": [
        "моди", "mods", "minecraft", "ігри",
    ],
    "customink": [
        "футболки", "друк", "мерч", "одяг",
    ],
    "cyberdefenders": [
        "кібербезпека", "ctf", "навчання", "практика",
    ],
    "cycling74": [
        "max", "msp", "музика", "patching",
    ],
    "cyrl": [
        "кирилиця", "алфавіт", "ua", "ru",
    ],
    "cytoscapedotjs": [
        "граф", "візуалізація", "мережі", "javascript",
    ],

    # D...
    "dacia": [
        "дачія", "авто", "марка авто", "машина", "car",
    ],
    "daf": [
        "вантажівки", "грузовик", "авто", "truck",
    ],
    "dailydotdev": [
        "новини дев", "статті", "розробка", "dev",
    ],
    "daimler": [
        "мерседес", "авто", "концерн", "машини",
    ],
    "dal": [
        "dalle", "ai", "зображення", "генерація",
    ],
    "dapr": [
        "мікросервіси", "event", "sidecar", "cloud",
    ],
    "darkreader": [
        "темна тема", "браузер", "нічний режим", "аддон",
    ],
    "darth": [
        "дарта вейдер", "зоряні війни", "sith", "dark side",
    ],
    "dashboards": [
        "дашборд", "панель", "аналітика", "звіти",
    ],
    "dask": [
        "python", "дані", "паралельність", "розподілені обчислення",
    ],
    "dassaultsystemes": [
        "cad", "інженерія", "3d", "plm",
    ],
    "databasenetwork": [
        "бази даних", "database", "мережа", "sql",
    ],
    "datacamp": [
        "курси", "data", "python", "навчання",
    ],
    "datadotai": [
        "ml", "ai", "дані", "аналітика",
    ],
    "dataiku": [
        "дані", "ml", "аналітика", "pipelines",
    ],
    "datastax": [
        "cassandra", "бд", "nosql", "database",
    ],
    "dataverse": [
        "дані", "каталог", "power platform", "analytics",
    ],
    "datefns": [
        "дати", "бібліотека", "javascript", "час",
    ],
    "datto": [
        "backup", "резервне копіювання", "безпека", "відновлення",
    ],
    "davinciresolve": [
        "монтаж", "відео", "color grading", "відеоредактор",
    ],
    "dcentertainment": [
        "dc", "комікси", "герої", "фільми",
    ],
    "debit": [
        "дебет", "карта", "банк", "гроші",
    ],
    "debridlink": [
        "де-брід", "торренти", "завантаження", "лінки",
    ],
    "decapcms": [
        "cms", "markdown", "git", "headless",
    ],
    "decentraland": [
        "метавсесвіт", "crypto", "земля", "віртуальний світ",
    ],
    "decorators": [
        "декоратори", "патерн", "python", "анотації",
    ],
    "dedge": [
        "хостинг", "cloud", "cdn", "edge",
    ],
    "deepcool": [
        "кулери", "pc", "охолодження", "корпуси",
    ],
    "deepgram": [
        "розпізнавання мови", "стт", "ai", "аудіо",
    ],
    "deepl": [
        "переклад", "ai", "текст", "translator",
    ],
    "deepmind": [
        "ai", "дослідження", "google", "ml",
    ],
    "deepnote": [
        "ноутбуки", "collab", "дані", "аналітика",
    ],
    "deepsource": [
        "аналіз коду", "quality", "static analysis", "security",
    ],
    "defend": [
        "захист", "оборона", "security", "щит",
    ],
    "deletion": [
        "видалення", "remove", "trash", "стирати",
    ],
    "delonghi": [
        "кава", "кавомашина", "кухонна техніка", "бренд",
    ],
    "deluge": [
        "торрент", "клієнт", "завантаження", "p2p",
    ],
    "denizenscript": [
        "скриптинг", "плагіни", "сервер", "minecraft",
    ],
    "denon": [
        "аудіо", "ресивер", "звук", "hi-fi",
    ],
    "doi": [
        "ідентифікатор", "публікація", "наука", "article",
    ],
    "dolibarr": [
        "erp", "crm", "бізнес", "open source",
    ],
    "doordash": [
        "доставка", "їжа", "кур'єр", "ресторани",
    ],
    "dota2": [
        "moba", "гра", "кіберспорт", "steam",
    ],
    "doubanread": [
        "книги", "читання", "китай", "бібліотека",
    ],
    "downdetector": [
        "відключення", "статус", "моніторинг", "збій",
    ],
    "downleft": [
        "вниз ліворуч", "стрілка", "навігація", "іконка",
    ],
    "downloaded": [
        "завантажено", "файл", "готово", "completed",
    ],
    "downright": [
        "вниз праворуч", "стрілка", "навігація", "іконка",
    ],
    "dpd": [
        "доставка", "кур'єр", "служба", "посилки",
    ],
    "dql": [
        "запити", "база даних", "sql", "language",
    ],
    "dragonframe": [
        "стоп-моушн", "анімація", "відео", "камера",
    ],
    "draugiemdotlv": [
        "соцмережа", "латвія", "спільнота", "friend",
    ],
    "drawers": [
        "шухляди", "ящики", "меблі", "зберігання",
    ],
    "dreamstime": [
        "сток", "фото", "зображення", "покупка",
    ],
    "drones": [
        "дрон", "квадрокоптер", "польоти", "камера",
    ],
    "drooble": [
        "музика", "спільнота", "артисти", "мережа",
    ],
    "dsautomobiles": [
        "авто", "франція", "марка", "машина",
    ],
    "dts": [
        "аудіо", "звук", "кіно", "5.1",
    ],
    "duc": [
        "університет", "освіта", "виш", "campus",
    ],
    "ducati": [
        "мото", "байк", "італія", "спортбайк",
    ],
    "dune": [
        "піски", "фентезі", "наукова фантастика", "роман",
    ],
    "dungeonsanddragons": [
        "dnd", "настільна", "рольова гра", "фентезі",
    ],
    "dunked": [
        "портфоліо", "дизайн", "сайт", "галерея",
    ],
    "dunzo": [
        "кур'єр", "доставка", "послуги", " errands",
    ],
    "duoble": [
        "подвійний", "double", "іконка", "дубль",
    ],
    "duolingo": [
        "мови", "курси", "совеня", "навчання",
    ],
    "duplicati": [
        "бекуп", "резервне копіювання", "backup", "шифрування",
    ],
    "dwavesystems": [
        "квантові", "комп'ютери", "дослідження", "квант",
    ],
    "dwm": [
        "віконний менеджер", "tiling", "linux", "x11",
    ],
    "dynamics365": [
        "erp", "crm", "microsoft", "бізнес",
    ],
    "e3": [
        "виставка ігор", "gaming", "expo", "ігри",
    ],
    "eac": [
        "сертифікація", "маркування", "єас", "стандарт",
    ],
    "earphones": [
        "навушники", "in-ear", "музика", "аудіо",
    ],
    "easyeda": [
        "схеми", "pcb", "електроніка", "cad",
    ],
    "easyjet": [
        "авіакомпанія", "перельоти", "лоукост", "літак",
    ],
}


# Патернові синоніми за підрядками в ключі
patterns = [
    ("cloud", ["хмара", "клауд", "хостинг", "deploy", "cloud"]),
    ("code", ["код", "програмування", "розробка", "dev", "coding"]),
    ("data", ["дані", "аналітика", "база", "data"]),
    ("db", ["база даних", "sql", "database"]),
    ("kube", ["kubernetes", "k8s", "кластер", "devops"]),
    ("k8s", ["kubernetes", "кластер", "devops"]),
    ("docker", ["докер", "контейнери", "образи"]),
    ("cms", ["cms", "контент", "редактор", "сайт"]),
    ("css", ["css", "стилі", "веб", "frontend"]),
    ("js", ["javascript", "js", "веб", "скрипти"]),
    ("java", ["java", "jvm", "мова"]),
    ("python", ["python", "пітон", "мова"]),
    ("pay", ["оплата", "платіж", "pay", "кошик"]),
    ("shop", ["магазин", "шоп", "торг", "store"]),
    ("market", ["ринок", "біржа", "магазин", "market"]),
    ("bank", ["банк", "фінанси", "гроші"]),
    ("airline", ["авіакомпанія", "переліт", "літак"]),
    ("airlines", ["авіакомпанія", "переліт", "літак"]),
    ("audio", ["аудіо", "музика", "звук"]),
    ("music", ["музика", "плеєр", "аудіо"]),
    ("photo", ["фото", "зображення", "камера"]),
    ("video", ["відео", "стрім", "відеоредактор"]),
    ("game", ["ігри", "геймінг", "гра"]),
    ("render", ["рендер", "3d", "візуалізація"]),
    ("engine", ["рушій", "engine", "платформа"]),
    ("stack", ["стек", "технології", "платформа"]),
    ("build", ["збірка", "build", "pipeline"]),
]


def guess_generic(key: str):
    # Базові нейтральні синоніми, корисні для логотипів/брендів
    base = ["логотип", "бренд"]
    # Набір із патернів
    for sub, syns in patterns:
        if sub in key:
            base += syns
    return uniq(base)


def enrich(key: str, current: list):
    out = []
    # Ручні, якщо є
    if key in manual:
        out += manual[key]
    # Патернові
    out += guess_generic(key)
    # Додати сам ключ як англ-варіант у кінці
    out += [key]
    # Прибрати дублікати та обмежити 20
    out = uniq(order_syns(out))[:20]
    return out


def main():
    data = json.loads(SRC.read_text(encoding='utf-8'))
    updated = {}
    for k, v in data.items():
        cur = v if isinstance(v, list) else [str(v)]
        updated[k] = enrich(k, cur)
    SRC.write_text(json.dumps(updated, ensure_ascii=False, indent=2) + "\n", encoding='utf-8')


if __name__ == "__main__":
    main()

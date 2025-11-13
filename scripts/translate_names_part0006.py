#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Одноразовий скрипт перекладу назв іконок для файла:
  translations/missing-translations/names/part-0006.json

Правила:
- Стилі ваги виносимо в дужки: (жирна | двоколірна | тонка)
- Бренди не перекладаємо, лише правильно капіталізуємо (і теж додаємо стиль у дужках, якщо є)
- Коротко і по суті; для «simple» у більшості випадків використовуємо «Простий …» як базову фразу
- Без лапок/дефісів у значеннях (окрім стандартних назв типу USB, 3D тощо)
"""

import json
from pathlib import Path

FILE = Path("translations/missing-translations/names/part-0006.json")

# Стилі (жіночий рід, щоб узгоджуватися з «іконка»)
WEIGHT_STYLES = {
    "bold": "жирна",
    "duotone": "двоколірна",
    "light": "тонка",
    "thin": "тонка",
}

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

def phrase_translation(base):
    s = " ".join(base)

    # Багатослівні патерни (спочатку найдовші)
    patterns = {
        # S…
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

        "threads logo": "Threads",  # страхувальний патерн (бренд ловимо окремо)
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
        if s.startswith(pat):
            return patterns[pat]

    # Запасний варіант — зібрати з токенів (мінімально)
    token_map = {
        # тут майже не потрібно, але лишаємо на випадок поодиноких ситуацій
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

    # Бренд
    brand = detect_brand(words)
    if brand:
        st = style_suffix(words)
        return f"{brand} {st}".strip()

    # Прибираємо тільки вагові стилі з базової фрази
    base_words = [w for w in words if w not in WEIGHT_STYLES]
    base = phrase_translation(base_words)
    st = style_suffix(words)
    res = f"{base} {st}".strip()
    return " ".join(res.split())

def main():
    data = json.loads(FILE.read_text(encoding="utf-8"))
    out = {}
    for k, v in data.items():
        out[k] = translate_value_from_key(k)
    FILE.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__":
    main()

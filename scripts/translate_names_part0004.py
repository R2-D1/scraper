#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Переклад назв іконок для файла:
  translations/missing-translations/names/part-0004.json

Правила:
 - Коротко, по суті, без зайвого опису
 - Варіанти/стилі в дужках, жіночий рід: (контурна, заповнена, тонка, двоколірна, кругла, квадратна, перекреслена, для друку)
 - Бренди/сервіси не перекладаємо — лише правильна капіталізація
 - «remix/line/solid/duotone/off/print/circle/square» переносяться у дужки як стиль/форма
"""

import json
from pathlib import Path

FILE = Path("translations/missing-translations/names/part-0004.json")

# Стилі (жіночий рід)
WEIGHT = {
    "duotone": "двоколірна",
    "light": "тонка",
}

VARIANT = {
    "line": "контурна",
    "remix": "контурна",
    "solid": "заповнена",
    "fill": "заповнена",
    "filled": "заповнена",
    "off": "перекреслена",
    "print": "для друку",
}

SHAPE = {
    "circle": "кругла",
    "square": "квадратна",
}

BRANDS = {
    # F… (часто трапляються в цій частині)
    "filedotio": "file.io",
    "filen": "Filen",
    "fineco": "Fineco",
    "fing": "Fing",
    "firefish": "Firefish",
    "fireflyiii": "Firefly III",
    "firefoxbrowser": "Firefox Browser",
    "fireship": "Fireship",
    "firewalla": "Firewalla",
    "flashforge": "Flashforge",
    "flathub": "Flathub",
    "flatpak": "Flatpak",
    "flightaware": "FlightAware",
    "flipkart": "Flipkart",
    "floatplane": "Floatplane",
    "floorp": "Floorp",
    "fluentbit": "Fluent Bit",
    "fluentd": "Fluentd",
    "fluke": "Fluke",
    "flutter": "Flutter",
    "fluxus": "Fluxus",
    "flydotio": "Fly.io",
    "flyway": "Flyway",
    "fmod": "FMOD",
    "flow": "Flow",
    "flow ai": "Flow AI",
    "gmail": "Gmail",
    "google": "Google",
    "google drive": "Google Drive",
    # папки-бренди нижче, але тут достатньо капіталізації
}

def styles_suffix(words):
    parts = []
    for w in words:
        if w in WEIGHT:
            parts.append(WEIGHT[w])
        if w in VARIANT:
            parts.append(VARIANT[w])
        if w in SHAPE:
            parts.append(SHAPE[w])
    out = []
    seen = set()
    for p in parts:
        if p and p not in seen:
            seen.add(p)
            out.append(p)
    return f" ({', '.join(out)})" if out else ""


def cap(s: str) -> str:
    return s[:1].upper() + s[1:] if s else s


def translate_file(words, all_words):
    # file-... сімейство
    s = " ".join(words)
    # дієві дії
    if s.startswith("export"):
        return "Експортувати файл"
    if s.startswith("import"):
        return "Імпортувати файл"
    if s.startswith("duplicate"):
        return "Дублювати файл"
    if s.startswith("print") or "print" in all_words:
        return "Друк файлу"
    if s.startswith("minus") or s.startswith("remove"):
        return "Видалити файл"
    if s.startswith("plus"):
        return "Додати файл"
    if s.startswith("favorite"):
        return "Додати у вибране"
    if s.startswith("report"):
        return "Звіт"
    if s.startswith("loop circle"):
        return "Повтор у колі"
    if s.startswith("loop"):
        return "Повтор"
    if s.startswith("directory open"):
        return "Папка відкрита"
    if s.startswith("directory symlink"):
        return "Папка (символічне посилання)"
    if s == "modified":
        return "Файл змінено"
    if s == "moved":
        return "Файл переміщено"
    if s.startswith("folder approved"):
        return "Папка схвалена"
    if s == "removed":
        return "Файл видалено"
    return "Файл"


def translate_flag(words):
    s = " ".join(words)
    if s == "double":
        return "Подвійний прапор"
    if s == "straight":
        return "Прямий прапор"
    if s.startswith("for flag"):
        # for-flag-country
        country = s.split()[-1]
        mapping = {
            "france": "Франції",
            "germany": "Німеччини",
            "italy": "Італії",
            "russia": "Росії",
            "spain": "Іспанії",
        }
        if country in mapping:
            return f"Прапор {mapping[country]}"
    return "Прапор"


def translate_flip(words):
    # flip vertical circle/square N
    base = "Віддзеркалити вертикально"
    return base


def translate_film(words):
    s = " ".join(words)
    if s.startswith("frame"):
        return "Кадр плівки"
    if s.startswith("roll"):
        # roll 1
        parts = s.split()
        num = parts[1] if len(parts) > 1 else ""
        return f"Котушка плівки {num}".strip()
    if s == "movie":
        return "Фільм"
    return "Плівка"


def translate_fire(words):
    s = " ".join(words)
    if s.startswith("station"):
        return "Пожежна станція"
    if s == "left":
        return "Полум'я ліворуч"
    if s.startswith("extinguisher sign"):
        return "Вогнегасник (знак)"
    return "Полум'я"


def translate_floppy(words):
    # floppy-disk-XX-...
    for i, w in enumerate(words):
        if w.isdigit():
            return f"Дискета {w}"
    if "alert" in words:
        return "Дискета (попередження)"
    return "Дискета"


def translate_folder(words):
    # folder-... (багато брендів/технологій усередині)
    s = " ".join(words)
    # стрілки
    if words[:1] == ["arrow"]:
        dirs = []
        if "up" in words:
            dirs.append("вгору")
        if "down" in words:
            dirs.append("вниз")
        if "left" in words:
            dirs.append("вліво")
        if "right" in words:
            dirs.append("вправо")
        if dirs:
            return f"Папка зі стрілкою {'/'.join(dirs)}"
    # стани
    if s == "add":
        return "Додати папку"
    if s == "delete":
        return "Видалити папку"
    if s == "backup":
        return "Папка Backup"
    if s == "archive open":
        return "Папка Archive (відкрита)"
    if s.endswith("open"):
        name = s[:-4].strip()
        if name:
            name = cap(name)
            tokens = name.split()
            fixed = []
            for t in tokens:
                if t == "Cloud":
                    fixed.append("Cloud")
                elif t == "functions":
                    fixed.append("Functions")
                elif t == "Circleci" or t == "CircleCI":
                    fixed.append("CircleCI")
                elif t == "Ci":
                    fixed.append("CI")
                elif t == "Css":
                    fixed.append("CSS")
                else:
                    fixed.append(t)
            name = " ".join(fixed)
            return f"Папка {name} (відкрита)"
        return "Папка (відкрита)"
    # за замовченням — Папка + капіталізований вміст
    name = cap(s)
    tokens = name.split()
    fixed = []
    for t in tokens:
        if t == "Cloud":
            fixed.append("Cloud")
        elif t == "functions":
            fixed.append("Functions")
        elif t == "Circleci" or t == "CircleCI":
            fixed.append("CircleCI")
        elif t == "Ci":
            fixed.append("CI")
        elif t == "Css":
            fixed.append("CSS")
        else:
            fixed.append(t)
    name = " ".join(fixed)
    return f"Папка {name}" if s else "Папка"


def translate_value_from_key(key: str) -> str:
    raw = key.strip().lower().replace("_", " ").replace("-", " ")
    words = [w for w in raw.split() if w]
    if not words:
        return key

    # Бренди (цильні ключі)
    if key in BRANDS:
        return BRANDS[key]

    # Визначаємо групу
    head = words[0]
    rest = words[1:]

    # Забираємо службові стильові слова для побудови бази
    base_words = [w for w in rest if w not in WEIGHT and w not in VARIANT and w not in SHAPE]
    base = None

    if head == "file":
        base = translate_file(base_words, rest)
    elif head == "film":
        base = translate_film(base_words)
    elif head == "filter":
        base = "Фільтр"
    elif head == "fire":
        base = translate_fire(base_words)
    elif head == "fireworks":
        base = "Феєрверк"
    elif head == "first":
        if base_words[:2] == ["aid", "plaster"]:
            base = "Пластир"
        elif base_words[:1] == ["contribution"]:
            base = "Перший внесок"
        elif base_words[:1] == ["quarter"]:
            base = "Перша чверть місяця"
        else:
            base = cap(" ".join([head] + base_words))
    elif head == "fiscal" and base_words[:1] == ["host"]:
        base = "Фіскальний хост"
    elif head == "fishes":
        base = "Риби"
    elif head == "fist":
        base = "Кулак"
    elif head == "fit":
        # fit-to-height-square-solid → Підігнати по висоті
        base = "Підігнати по висоті"
    elif head == "fitness" and base_words[:1] == ["centre"]:
        base = "Фітнес-центр"
    elif head == "flat":
        base = "Плоский"
    elif head == "flag":
        base = translate_flag(base_words)
    elif head == "flash":
        base = "Спалах"
    elif head == "flask":
        base = "Флакон"
    elif head == "flip":
        base = translate_flip(base_words)
    elif head == "floppy":
        base = translate_floppy(base_words)
    elif head == "flow":
        # flow-ai → Flow AI (бренд)
        base = BRANDS.get("flow ai", "Flow")
    elif head == "flower":
        base = "Брунька" if (base_words and base_words[0] == "bud") else "Квітка"
    elif head == "focus":
        base = "Фокус по центру"
    elif head == "folder":
        base = translate_folder(base_words)
    elif head in ("flutter",):
        # брендовий темний/світлий варіант логотипу
        base = BRANDS.get(head, cap(head))
        theme = []
        if "dark" in words:
            theme.append("темна")
        if "light" in words:
            theme.append("світла")
        st = ""
        if theme:
            st = " (" + ", ".join(theme) + ")"
        return base + st
    # загальна обробка брендів за першим (або першими двома) токенами
    elif head in BRANDS or (len(rest) >= 1 and (head + " " + rest[0]) in BRANDS):
        # перевага двослівному бренду
        brand_key = (head + " " + rest[0]) if (len(rest) >= 1 and (head + " " + rest[0]) in BRANDS) else head
        base = BRANDS[brand_key]
        st = styles_suffix(words)
        return f"{base}{st}"
    elif head == "fork" and base_words[:1] == ["spoon"]:
        base = "Вилка і ложка"
    elif head == "front" and base_words[:1] == ["camera"]:
        base = "Фронтальна камера"
    elif head == "galaxy":
        base = "Галактика" + (f" {base_words[0]}" if base_words and base_words[0].isdigit() else "")
    elif head == "gender" and base_words[:1] == ["equality"]:
        base = "Гендерна рівність"
    elif head == "gif" and base_words[:1] == ["format"]:
        base = "Формат GIF"
    elif head == "gramophone":
        base = "Грамофон"
    elif head == "graph":
        if base_words[:2] == ["arrow", "decrease"]:
            base = "Графік спадання"
        elif base_words[:2] == ["arrow", "increase"]:
            base = "Графік зростання"
        elif base_words[:2] == ["bar", "decrease"]:
            base = "Стовпчикова діаграма спадання"
        else:
            base = "Графік"
    elif head == "group" and base_words[:2] == ["meeting", "call"]:
        base = "Груповий дзвінок"
    elif head == "half" and base_words[:1] == ["star"]:
        # half-star-1 → Половина зірки 1
        num = base_words[1] if len(base_words) > 1 and base_words[1].isdigit() else ""
        base = ("Половина зірки " + num).strip()
    elif head == "hand" and base_words[:1] == ["cursor"]:
        base = "Курсор рука"
    elif head == "hand" and base_words[:1] == ["grab"]:
        base = "Захоплення рукою"
    elif head == "hang" and base_words[:1] == ["up"]:
        # hang-up-1/2
        num = base_words[1] if len(base_words) > 1 and base_words[1].isdigit() else ""
        base = ("Завершити дзвінок " + num).strip()
    elif head == "hard" and base_words[:1] == ["disk"]:
        base = "Жорсткий диск"
    elif head == "heading":
        # heading-1/2/3-...
        num = rest[0] if rest and rest[0].isdigit() else ""
        base = ("Заголовок " + num).strip()
    else:
        # Бренд або fallback (капіталізована фраза)
        brand_key = key
        if brand_key in BRANDS:
            base = BRANDS[brand_key]
        else:
            base = cap(" ".join(words))

    # Особливий випадок: file + print — не дублюємо (для друку)
    words_for_styles = words
    if head == "file" and "print" in words:
        words_for_styles = [w for w in words if w != "print"]
    st = styles_suffix(words_for_styles)
    return f"{base}{st}".strip()


def main():
    data = json.loads(FILE.read_text(encoding="utf-8"))
    out = {}
    for k in data.keys():
        out[k] = translate_value_from_key(k)
    FILE.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

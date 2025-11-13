#!/usr/bin/env python3
import json
from pathlib import Path

# Target file
FILE = Path("translations/missing-translations/names/part-0004.json")

# Style mappings (always feminine form as per instruction examples)
WEIGHT_STYLES = {
    "bold": "жирна",
    "duotone": "двоколірна",
    "light": "тонка",
    "thin": "тонка",
}

# Additional variant/style descriptors that should appear in parentheses
EXTRA_DESCRIPTORS = {
    "simple": "спрощена",
    "line": "контурна",
    "straight": "пряма",
    "horizontal": "горизонтальна",
    "vertical": "вертикальна",
    "rounded": "закруглена",
    "sharp": "гостра",
    "circle": "кругла",
    "square": "квадратна",
    "wavy": "хвиляста",
}

BRANDS = {
    "instagram": "Instagram",
    "linkedin": "LinkedIn",
    "linktree": "Linktree",
    "linux": "Linux",
    "lastfm": "Last.fm",
    "lego": "LEGO",
}

def is_brand_phrase_from_tokens(tokens):
    # Detect *-logo* brands like "instagram logo", "linkedin logo"
    for b in BRANDS:
        if tokens and tokens[0] == b and (len(tokens) == 1 or (len(tokens) >= 2 and tokens[1] == "logo")):
            return BRANDS[b]
    # Generic brand pattern: any-thing-...-logo[-style] -> join and capitalize words before 'logo'
    if tokens and 'logo' in tokens:
        logo_idx = tokens.index('logo')
        parts = tokens[:logo_idx]
        if parts:
            branded = []
            overrides = {
                'excel': 'Excel',
                'outlook': 'Outlook',
                'powerpoint': 'PowerPoint',
                'word': 'Word',
                'teams': 'Teams',
                'messenger': 'Messenger',
                'medium': 'Medium',
                'meta': 'Meta',
                'mastodon': 'Mastodon',
                'matrix': 'Matrix',
                'markdown': 'Markdown',
                'notion': 'Notion',
            }
            for p in parts:
                if p in BRANDS:
                    branded.append(BRANDS[p])
                else:
                    branded.append(overrides.get(p, p.capitalize()))
            return " ".join(branded)
    return None

def pick_hourglass_level(words):
    # Map level words to concise UA
    if "high" in words:
        return "повний"
    if "medium" in words:
        return "середній"
    if "low" in words:
        return "майже порожній"
    return None

def phrase_translation(base_words):
    # Join for easier matching
    s = " ".join(base_words)

    # High-priority multi-word patterns
    patterns = {
        # Hands / gestures
        "hand fist": "Кулак",
        "hand grabbing": "Схоплення",
        "hand heart": "Рука з серцем",
        "hand palm": "Долоня",
        "hand peace": "Знак миру",
        "hand pointing": "Вказівна рука",
        "hand soap": "Мило для рук",
        "hand swipe left": "Провести вліво",
        "hand swipe right": "Провести вправо",
        "hand tap": "Дотик",
        "hand waving": "Помах рукою",
        "hand withdraw": "Прибрати руку",
        "hands clapping": "Оплески",
        "hands praying": "Складені руки",
        "handbag": "Сумка",
        "handshake": "Рукостискання",

        # Devices / objects
        "hard drive": "Жорсткий диск",
        "hard drives": "Жорсткі диски",
        "hard hat": "Каска",
        "head circuit": "Голова зі схемою",
        "headlights": "Фари",
        "headphones": "Навушники",
        "headset": "Гарнітура",
        "heartbeat": "Серцебиття",
        "hexagon": "Шестикутник",
        "high definition": "Висока чіткість",
        "high heel": "Високі підбори",
        "highlighter circle": "Маркер",
        "highlighter": "Маркер",
        "hockey": "Хокей",
        "hoodie": "Худі",
        "horse": "Кінь",
        "hospital": "Лікарня",
        "hourglass": "Пісочний годинник",
        "house": "Будинок",
        "hurricane": "Ураган",
        "ice cream": "Морозиво",
        "identification badge": "Бейдж",
        "identification card": "ID картка",
        "image broken": "Пошкоджене зображення",
        "image square": "Зображення",
        "image": "Зображення",
        "images square": "Зображення",
        "images": "Зображення",
        "infinity": "Нескінченність",
        "info": "Інформація",
        "intersect three": "Перетин",
        "intersect square": "Перетин",
        "intersect": "Перетин",
        "intersection": "Перетинання",
        "island": "Острів",
        "jar label": "Банка",
        "jar": "Банка",
        "jeep": "Джип",
        "joystick": "Джойстик",
        "kanban": "Канбан",
        "key return": "Клавіша Enter",
        "key": "Ключ",
        "keyboard": "Клавіатура",
        "keyhole": "Замкова щілина",
        "knife": "Ніж",
        "ladder": "Драбина",
        "lamp pendant": "Підвісна лампа",
        "lamp": "Лампа",
        "laptop": "Ноутбук",
        "lasso": "Ласо",
        "layout": "Макет",
        "leaf": "Листок",
        "lectern": "Трибуна",
        "lego smiley": "LEGO смайлик",
        "lego": "LEGO",
        "less than or equal": "Менше або дорівнює",
        "less than": "Менше ніж",
        "letter circle": "Літера",
        "lifebuoy": "Рятувальний круг",
        "lightbulb filament": "Лампочка з ниткою",
        "lightbulb": "Лампочка",
        "lighthouse": "Маяк",
        "lightning slash": "Блискавка перекреслена",
        "lightning a": "Блискавка A",
        "lightning": "Блискавка",
        "line segment": "Відрізок",
        "line segments": "Відрізки",
        "line vertical": "Вертикальна лінія",
        "link break": "Розірване посилання",
        "link simple horizontal": "Просте посилання",
        "link simple": "Просте посилання",
        "link": "Посилання",
        # Map / markers
        "mailbox": "Поштова скринька",
        "map pin area": "Область мітки",
        "map pin": "Мітка на мапі",
        "map trifold": "Складена мапа",
        "marker": "Маркер",
        "martini": "Мартіні",
        "mask happy": "Весела маска",
        "mask sad": "Сумна маска",
        "math operations": "Математичні операції",
        "medal military": "Військова медаль",
        "medal": "Медаль",
        "megaphone": "Мегафон",
        "memory": "Пам’ять",
        "member of": "Належить",
        "meteor": "Метеор",
        "metronome": "Метроном",
        "microphone slash": "Мікрофон перекреслений",
        "microphone stage": "Мікрофон на сцені",
        "microscope": "Мікроскоп",
        "monitor arrow up": "Монітор зі стрілкою вгору",
        "monitor play": "Монітор відтворення",
        "monitor": "Монітор",
        "moon stars": "Місяць і зірки",
        "moon": "Місяць",
        "moped front": "Мопед спереду",
        "moped": "Мопед",
        "mosque": "Мечеть",
        "motorcycle": "Мотоцикл",
        "mountains": "Гори",
        "nuclear plant": "Атомна електростанція",
        "money": "Гроші",
        # Locks / magnets / tools
        "lock key open": "Замок з ключем відкритий",
        "lock key": "Замок з ключем",
        "lock laminated open": "Замок ламінований відкритий",
        "lock laminated": "Замок ламінований",
        "lock open": "Замок відкритий",
        "lock simple open": "Замок відкритий",
        "lock simple": "Замок",
        "lock": "Замок",
        "lockers": "Шафки",
        "log": "Колода",
        "magic wand": "Чарівна паличка",
        "magnet straight": "Магніт",
        "magnet": "Магніт",
        "magnifying glass minus": "Лупа мінус",
        "magnifying glass plus": "Лупа плюс",
        "magnifying glass": "Лупа",
        "list bullets": "Список з маркерами",
        "list checks": "Список з позначками",
        "list dashes": "Список з тире",
        "list heart": "Список із серцем",
        "list magnifying glass": "Список з лупою",
        "list": "Список",
        "mouse scroll": "Коліщатко миші",
        "mouse simple": "Миша",
        "mouse": "Миша",
        "music note simple": "Нота",
        "music note": "Нота",
        "music notes simple": "Ноти",
        "music notes minus": "Ноти мінус",
        "music notes plus": "Ноти плюс",
        "music notes": "Ноти",
        "navigation arrow": "Стрілка навігації",
        "needle": "Голка",
        "network slash": "Немає мережі",
        "network x": "Помилка мережі",
        "network": "Мережа",
        "newspaper clipping": "Вирізка з газети",
        "newspaper": "Газета",
        "not equals": "Не дорівнює",
        "not member of": "Не належить",
        "not subset of": "Не є підмножиною",
        "not superset of": "Не є надмножиною",
        "notches": "Вирізи",
        "note blank": "Порожня нотатка",
        "note pencil": "Редагувати нотатку",
        "note": "Нотатка",
        "notebook": "Блокнот",
    }

    # Try longest-first matching by descending key length
    for pat in sorted(patterns, key=lambda x: -len(x)):
        if s.startswith(pat):
            return patterns[pat]

    # Fallback: token-level mapping (very generic)
    token_map = {
        "hand": "Рука",
        "hands": "Руки",
        "fist": "Кулак",
        "grabbing": "Схоплення",
        "heart": "Серце",
        "palm": "Долоня",
        "peace": "Мир",
        "pointing": "Вказівна",
        "soap": "Мило",
        "swipe": "Провести",
        "left": "вліво",
        "right": "вправо",
        "tap": "Дотик",
        "waving": "Помах",
        "withdraw": "Прибрати",
        "handbag": "Сумка",
        "clapping": "Оплески",
        "praying": "Молитва",
        "handshake": "Рукостискання",
        "hard": "Жорсткий",
        "drive": "диск",
        "drives": "диски",
        "hat": "капелюх",
        "hash": "Решітка",
        "head": "Голова",
        "circuit": "схема",
        "headlights": "Фари",
        "headphones": "Навушники",
        "headset": "Гарнітура",
        "break": "розрив",
        "half": "половина",
        "heartbeat": "Серцебиття",
        "hexagon": "Шестикутник",
        "high": "Висока",
        "definition": "чіткість",
        "heel": "каблук",
        "highlighter": "Маркер",
        "hockey": "Хокей",
        "hoodie": "Худі",
        "horse": "Кінь",
        "hospital": "Лікарня",
        "hourglass": "Пісочний годинник",
        "house": "Будинок",
        "hurricane": "Ураган",
        "ice": "Лід",
        "cream": "крем",
        "identification": "Посвідчення",
        "badge": "бейдж",
        "card": "картка",
        "image": "Зображення",
        "broken": "пошкоджене",
        "square": "квадратна",
        "infinity": "Нескінченність",
        "info": "Інформація",
        "intersect": "Перетин",
        "intersection": "Перетинання",
        "three": "три",
        "island": "Острів",
        "jar": "Банка",
        "label": "етикетка",
        "jeep": "Джип",
        "joystick": "Джойстик",
        "kanban": "Канбан",
        "key": "Ключ",
        "return": "Enter",
        "keyboard": "Клавіатура",
        "keyhole": "Замкова щілина",
        "knife": "Ніж",
        "ladder": "Драбина",
        "lamp": "Лампа",
        "pendant": "підвісна",
        "laptop": "Ноутбук",
        "lasso": "Ласо",
        "layout": "Макет",
        "leaf": "Листок",
        "lectern": "Трибуна",
        "lego": "LEGO",
        "smiley": "смайлик",
        "less": "Менше",
        "than": "ніж",
        "or": "або",
        "equal": "дорівнює",
        "letter": "Літера",
        "v": "V",
        "p": "P",
        "h": "H",
        "lifebuoy": "Рятувальний круг",
        "lightbulb": "Лампочка",
        "filament": "нитка",
        "lighthouse": "Маяк",
        "lightning": "Блискавка",
        "slash": "перекреслена",
        "line": "Лінія",
        "segment": "відрізок",
        "segments": "відрізки",
        "vertical": "вертикальна",
        "link": "Посилання",
        "break": "розрив",
        "simple": "просте",
        "horizontal": "горизонтальна",
        "logo": "",
        "list": "Список",
        "bullets": "маркери",
        "checks": "позначки",
        "dashes": "тире",
        "magnifying": "лупа",
        "glass": "лупа",
        "mouse": "Миша",
        "scroll": "коліщатко",
        "music": "Музика",
        "note": "Нота",
        "notes": "Ноти",
        "plus": "плюс",
        "minus": "мінус",
        "navigation": "Навігація",
        "arrow": "стрілка",
        "needle": "Голка",
        "network": "Мережа",
        "newspaper": "Газета",
        "not": "Не",
        "equals": "дорівнює",
        "member": "належить",
        "subset": "підмножина",
        "superset": "надмножина",
        "notches": "Вирізи",
        "blank": "порожня",
        "pencil": "олівець",
        "notebook": "Блокнот",
        "notepad": "Блокнот",
        "lock": "Замок",
        "key": "Ключ",
        "open": "відкритий",
        "laminated": "ламінований",
        "magic": "чарівна",
        "wand": "паличка",
        "magnet": "Магніт",
        "magnifying": "Лупа",
        "glass": "",
    }

    out = []
    for w in base_words:
        out.append(token_map.get(w, w))
    # Join and cleanup extra spaces
    name = " ".join(filter(None, out))
    # Capitalize first letter
    if name:
        name = name[0].upper() + name[1:]
    return name

def build_style(words, base_phrase_hint=None):
    styles = []
    # Weight styles
    for w in words:
        if w in WEIGHT_STYLES:
            styles.append(WEIGHT_STYLES[w])
    # Extra descriptors
    for w in words:
        if w in EXTRA_DESCRIPTORS:
            styles.append(EXTRA_DESCRIPTORS[w])

    # Hourglass levels
    if base_phrase_hint == "Пісочний годинник":
        lvl = pick_hourglass_level(words)
        if lvl:
            styles.insert(0, lvl)
    # Image/images square shape nuance already handled by EXTRA_DESCRIPTORS
    # Collapse duplicates while preserving order
    seen = set()
    uniq = []
    for s in styles:
        if s not in seen:
            seen.add(s)
            uniq.append(s)
    if uniq:
        return "(" + ", ".join(uniq) + ")"
    return ""

def translate_value(key, eng_value):
    words = eng_value.strip().lower().split()
    if not words:
        return eng_value

    # Prefer deriving from key tokens for reliability
    tokens = key.split('-')
    # Special-case for number icons
    if tokens and tokens[0] == 'number':
        num_map = {
            'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
            'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9'
        }
        digit = next((num_map[t] for t in tokens if t in num_map), None)
        # Build styles from remaining tokens
        style_words = []
        for t in tokens:
            if t in WEIGHT_STYLES or t in EXTRA_DESCRIPTORS:
                style_words.append(t)
        base_phrase = f"Цифра {digit if digit is not None else ''}".strip()
        style = build_style(style_words, base_phrase_hint=base_phrase)
        return f"{base_phrase} {style}".strip()
    brand_name = is_brand_phrase_from_tokens(tokens)
    # Identify style tokens from key
    style_words = []
    base_tokens = []
    for i, t in enumerate(tokens):
        if t in WEIGHT_STYLES:
            style_words.append(t)
            continue
        if t in EXTRA_DESCRIPTORS:
            style_words.append(t)
            continue
        # Hourglass level tokens treated as style
        if tokens[0] == 'hourglass' and t in ('high','medium','low'):
            style_words.append(t)
            continue
        base_tokens.append(t)

    # Brand shortcut (keep style if present)
    if brand_name:
        style = build_style(style_words, base_phrase_hint=brand_name)
        return f"{brand_name} {style}".strip()

    # Compute base name from base_tokens
    base_phrase = phrase_translation(base_tokens)
    # Attach style built from style_words
    style = build_style(style_words, base_phrase_hint=base_phrase)
    name = base_phrase

    # Some specific semantic tweaks
    if base_phrase == "Серце" and "break" in words:
        name = "Розбите серце"
    if base_phrase in ("Серце", "Розбите серце") and "straight" in words:
        # 'straight' is already in styles as "пряма"
        pass

    # Plural 'images' specific square adjective plurality is ignored for brevity.

    result = f"{name} {style}".strip()
    # Normalize extra spaces
    return " ".join(result.split())

def main():
    data = json.loads(FILE.read_text(encoding="utf-8"))
    out = {}
    for k, v in data.items():
        out[k] = translate_value(k, v)
    FILE.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__":
    main()

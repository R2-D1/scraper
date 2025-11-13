#!/usr/bin/env python3
import json
from pathlib import Path

# Власноруч укладена мапа базових назв (без стилів bold/light/thin/duotone)
BASE_MAP = {
    # D
    "dna": "ДНК",
    "dog": "Собака",
    "door": "Двері",
    "door-open": "Відчинені двері",
    "dot": "Крапка",
    "dot-outline": "Крапка (контурна)",
    "dots-three": "Три крапки",
    "dots-three-circle": "Три крапки (кругла)",
    "dots-three-circle-vertical": "Три крапки (кругла, вертикальна)",
    "dots-three-outline": "Три крапки (контурна)",
    "dots-three-outline-vertical": "Три крапки (контурна, вертикальна)",
    "dots-three-vertical": "Три крапки (вертикальна)",
    "dots-six": "Шість крапок",
    "dots-six-vertical": "Шість крапок (вертикальна)",
    "dots-nine": "Дев'ять крапок",
    "download-simple": "Завантаження (спрощена)",
    "dress": "Сукня",
    "dresser": "Комод",
    "dribbble-logo": "Dribbble",
    "drone": "Дрон",
    "drop": "Крапля",
    "drop-half": "Крапля (напівзаповнена)",
    "drop-half-bottom": "Крапля (напівзаповнена знизу)",
    "drop-simple": "Крапля (спрощена)",
    "drop-slash": "Крапля (перекреслена)",
    "dropbox-logo": "Dropbox",
    "ear": "Вухо",
    "ear-slash": "Вухо (перекреслене)",
    "egg": "Яйце",
    "egg-crack": "Яйце (тріщина)",
    "eject": "Витяг",
    "eject-simple": "Витяг (спрощена)",
    "elevator": "Ліфт",
    "empty": "Порожньо",
    "engine": "Двигун",
    "envelope": "Конверт",
    "envelope-open": "Конверт (відкрита)",
    "envelope-simple": "Конверт (спрощена)",
    "envelope-simple-open": "Конверт (спрощена, відкрита)",
    "equalizer": "Еквалайзер",
    "equals": "Знак дорівнює",
    "eraser": "Гумка",
    "escalator-down": "Ескалатор вниз",
    "escalator-up": "Ескалатор вгору",
    "exam": "Іспит",
    "exclamation-mark": "Знак оклику",
    "exclude": "Виключення",
    "exclude-square": "Виключення (квадрат)",
    "export": "Експорт",
    "eye-closed": "Око (закрите)",
    "eye-slash": "Око (перекреслене)",
    "eyedropper": "Піпетка",
    "eyedropper-sample": "Піпетка (зразок)",
    "eyeglasses": "Окуляри",
    "eyes": "Очі",
    "face-mask": "Маска",
    "facebook-logo": "Facebook",
    "factory": "Завод",
    "faders": "Повзунки",
    "faders-horizontal": "Повзунки (горизонтальні)",
    "fallout-shelter": "Укриття від радіації",
    "fan": "Вентилятор",
    "farm": "Ферма",
    "fast-forward": "Перемотка вперед",
    "fast-forward-circle": "Перемотка вперед (кругла)",
    "feather": "Перо",
    "fediverse-logo": "Fediverse",
    "figma-logo": "Figma",
    "file-archive": "Архів",
    "file-arrow-down": "Файл (стрілка вниз)",
    "file-arrow-up": "Файл (стрілка вгору)",
    "file-c": "Файл C",
    "file-c-sharp": "Файл C#",
    "file-cloud": "Файл у хмарі",
    "file-code": "Файл з кодом",
    "file-cpp": "Файл C++",
    "file-css": "Файл CSS",
    "file-csv": "Файл CSV",
    "file-dashed": "Файл (пунктирний)",
    "file-doc": "Файл DOC",
    "file-dotted": "Файл (крапковий)",
    "file-html": "Файл HTML",
    "file-ini": "Файл INI",
    "file-jpg": "Файл JPG",
    "file-js": "Файл JS",
    "file-jsx": "Файл JSX",
    "file-lock": "Файл (замок)",
    "file-magnifying-glass": "Пошук у файлі",
    "file-md": "Файл MD",
    "file-minus": "Файл (мінус)",
    "file-pdf": "Файл PDF",
    "file-plus": "Файл (плюс)",
    "file-png": "Файл PNG",
    "file-ppt": "Файл PPT",
    "file-py": "Файл PY",
    "file-rs": "Файл RS",
    "file-search": "Пошук файлу",
    "file-sql": "Файл SQL",
    "file-svg": "Файл SVG",
    "file-text": "Текстовий файл",
    "file-ts": "Файл TS",
    "file-tsx": "Файл TSX",
    "file-txt": "Файл TXT",
    "file-vue": "Файл Vue",
    "file-x": "Файл (хрестик)",
    "file-xls": "Файл XLS",
    "file-zip": "Файл ZIP",
    "files": "Файли",
    "film-reel": "Кіноплівка",
    "film-script": "Сценарій",
    "film-slate": "Кіноклапер",
    "film-strip": "Плівкова стрічка",
    "fingerprint": "Відбиток пальця",
    "fingerprint-simple": "Відбиток пальця (спрощена)",
    "finn-the-human": "Finn the Human",
    "fire": "Вогонь",
    "fire-extinguisher": "Вогнегасник",
    "fire-simple": "Вогонь (спрощена)",
    "fire-truck": "Пожежна машина",
    "first-aid": "Перша допомога",
    "first-aid-kit": "Аптечка",
    "fish": "Риба",
    "fish-simple": "Риба (спрощена)",
    "flag-banner": "Банер",
    "flag-banner-fold": "Банер (зі згином)",
    "flag-checkered": "Картатий прапор",
    "flag-pennant": "Вимпел",
    "flame": "Полум'я",
    "flashlight": "Ліхтарик",
    "flask": "Колба",
    "flip-horizontal": "Віддзеркалити (горизонтально)",
    "flip-vertical": "Віддзеркалити (вертикально)",
    "floppy-disk": "Дискета",
    "floppy-disk-back": "Дискета (назад)",
    "flow-arrow": "Стрілка потоку",
    "flower": "Квітка",
    "flower-lotus": "Лотос",
    "flower-tulip": "Тюльпан",
    "flying-saucer": "Літаюча тарілка",
    "folder-dashed": "Папка (пунктирна)",
    "folder-dotted": "Папка (крапкова)",
    "folder-lock": "Папка (замок)",
    "folder-minus": "Папка (мінус)",
    "folder-notch": "Папка (виріз)",
    "folder-notch-minus": "Папка (виріз, мінус)",
    "folder-notch-open": "Папка (виріз, відкрита)",
    "folder-notch-plus": "Папка (виріз, плюс)",
    "folder-open": "Папка (відкрита)",
    "folder-plus": "Папка (плюс)",
    "folder-simple": "Папка (спрощена)",
    "folder-simple-dashed": "Папка (спрощена, пунктирна)",
    "folder-simple-dotted": "Папка (спрощена, крапкова)",
    "folder-simple-lock": "Папка (спрощена, замок)",
    "folder-simple-minus": "Папка (спрощена, мінус)",
    "folder-simple-plus": "Папка (спрощена, плюс)",
    "folder-simple-star": "Папка (спрощена, зірка)",
    "folder-simple-user": "Папка (спрощена, користувач)",
    "folder-star": "Папка (зірка)",
    "folder-user": "Папка (користувач)",
    "folders": "Папки",
    "football": "Футбольний м'яч",
    "football-helmet": "Футбольний шолом",
    "footprints": "Сліди",
    "fork-knife": "Вилка і ніж",
    "four-k": "4K",
    "frame-corners": "Кути кадру",
    "framer-logo": "Framer",
    "function": "Функція",
    "funnel-simple": "Воронка (спрощена)",
    "funnel-simple-x": "Воронка (спрощена, хрестик)",
    "funnel-x": "Воронка (хрестик)",
    "game-controller": "Ігровий контролер",
    "garage": "Гараж",
    "gas-can": "Каністра",
    "gas-pump": "Паливна колонка",
    "gauge": "Індикатор",
    "gavel": "Суддівський молоток",
    "gear": "Шестерня",
    "gear-fine": "Шестерня (дрібна)",
    "gear-six": "Шестерня 6",
    "gender-female": "Жінка",
    "gender-intersex": "Інтерсекс",
    "gender-male": "Чоловік",
    "gender-neuter": "Нейтральний гендер",
    "gender-nonbinary": "Небінарний гендер",
    "gender-transgender": "Трансгендер",
    "ghost": "Привид",
    "gif": "GIF",
    "git-branch": "Гілка Git",
    "git-commit": "Коміт Git",
    "git-diff": "Diff Git",
    "git-fork": "Форк Git",
    "git-merge": "Злиття Git",
    "git-pull-request": "Pull request Git",
    "github-logo": "GitHub",
    "gitlab-logo": "GitLab",
    "gitlab-logo-simple": "GitLab (спрощена)",
    "globe": "Глобус",
    "globe-hemisphere-east": "Півкуля (східна)",
    "globe-hemisphere-west": "Півкуля (західна)",
    "globe-simple": "Глобус (спрощена)",
    "globe-simple-x": "Глобус (спрощена, хрестик)",
    "globe-stand": "Глобус (підставка)",
    "globe-x": "Глобус (хрестик)",
    "goggles": "Захисні окуляри",
    "golf": "Гольф",
    "goodreads-logo": "Goodreads",
    "google-cardboard-logo": "Google Cardboard",
    "google-chrome-logo": "Google Chrome",
    "google-drive-logo": "Google Drive",
    "google-logo": "Google",
    "google-photos-logo": "Google Photos",
    "google-play-logo": "Google Play",
    "google-podcasts-logo": "Google Podcasts",
    "gps": "GPS",
    "gps-fix": "GPS фіксація",
    "gps-slash": "GPS (перекреслено)",
    "gradient": "Градієнт",
    "graduation-cap": "Академічна шапка",
    "grains": "Зерна",
    "grains-slash": "Зерна (перекреслені)",
    "graph": "Графік",
    "graphics-card": "Відеокарта",
    "greater-than": "Більше ніж",
    "greater-than-or-equal": "Більше або дорівнює",
    "grid-four": "Сітка 4",
    "grid-nine": "Сітка 9",
    "guitar": "Гітара",
    "hair-dryer": "Фен",
    "hamburger": "Гамбургер",
    "hammer": "Молоток",
    "hand": "Рука",
    "hand-arrow-down": "Рука (стрілка вниз)",
    "hand-arrow-up": "Рука (стрілка вгору)",
    "hand-coins": "Рука з монетами",
    "hand-deposit": "Рука (внесення)",
    "hand-eye": "Рука і око",
    "hand-fist": "Кулак",
}

STYLE_MAP = {
    "bold": "жирна",
    "light": "тонка",
    "thin": "тонка",
    "duotone": "двоколірна",
}

def add_style(base: str, style: str) -> str:
    """Додає стиль у дужках, акуратно об'єднуючи з існуючими атрибутами."""
    if not style:
        return base
    style_ua = STYLE_MAP.get(style)
    if not style_ua:
        return base
    if "(" in base:
        # Вже є дужки — додаємо через кому перед закривною дужкою
        return base[:-1] + ", " + style_ua + ")"
    else:
        return f"{base} ({style_ua})"


def normalize_key(key: str):
    for suf in ("-bold", "-light", "-thin", "-duotone"):
        if key.endswith(suf):
            return key[: -len(suf)], suf[1:]
    return key, ""


def main():
    path = Path("translations/missing-translations/names/part-0003.json")
    data = json.loads(path.read_text(encoding="utf-8"))

    missing = []
    updated = {}
    for key, _ in data.items():
        base_key, style = normalize_key(key)
        base = BASE_MAP.get(base_key)
        if base is None:
            missing.append(base_key)
            # Запасний варіант: лишаємо як було, але це сигнал перевірити мапу
            updated[key] = data[key]
            continue
        updated[key] = add_style(base, style)

    if missing:
        # Виводимо, щоб зручно було доповнити мапу при потребі
        print("[WARN] Не вистачає перекладів для базових ключів:")
        for b in sorted(set(missing)):
            print(" -", b)

    # Записуємо назад у той самий файл
    path.write_text(json.dumps(updated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Оновлено {path} — {len(updated)} записів")


if __name__ == "__main__":
    main()


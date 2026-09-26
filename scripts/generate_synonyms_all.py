#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path('translations/icons/missing-synonyms')


def uniq(seq):
    seen = set()
    out = []
    for x in seq:
        k = x.strip()
        if not k:
            continue
        low = k.lower()
        if low in seen:
            continue
        seen.add(low)
        out.append(k)
    return out


def order_syns(seq):
    def is_cyr(s: str) -> bool:
        return any('а' <= ch.lower() <= 'я' or ch.lower() in "єіїґ'’" for ch in s)
    ua = [s for s in seq if is_cyr(s)]
    en = [s for s in seq if not is_cyr(s)]
    return ua + en


# Мінімальний ручний словник для частих брендів/тем, далі добиваємо патернами
manual = {
    # Загальні приклади
    "google": ["гугл", "сервіс google", "пошук", "google"],
    "godaddy": ["домен", "реєстратор", "хостинг", "бренд"],
    "gnubash": ["bash", "шел", "термінал", "командний рядок"],
    "gnuemacs": ["редактор", "emacs", "lisp", "іде"],
    "gnuprivacyguard": ["gpg", "шифрування", "pgp", "ключі"],
    "godotengine": ["ігровий рушій", "2d", "3d", "editor"],
    "7zip": ["архів", "zip", "розпакувати", "архівація"],
    "1password": ["менеджер паролів", "паролі", "vault", "password manager"],
}


patterns = [
    ("google", ["гугл", "сервіс google", "app", "google"]),
    ("cloud", ["хмара", "клауд", "хостинг", "deploy", "cloud"]),
    ("code", ["код", "програмування", "розробка", "dev", "coding"]),
    ("data", ["дані", "аналітика", "база", "data"]),
    ("db", ["база даних", "sql", "database"]),
    ("sql", ["база даних", "sql", "запит"]),
    ("kube", ["kubernetes", "k8s", "кластер", "devops"]),
    ("k8s", ["kubernetes", "кластер", "devops"]),
    ("docker", ["докер", "контейнери", "образи"]),
    ("cms", ["cms", "контент", "редактор", "сайт"]),
    ("css", ["css", "стилі", "веб", "frontend"]),
    ("js", ["javascript", "js", "веб", "скрипти"]),
    ("java", ["java", "jvm", "мова"]),
    ("python", ["python", "пітон", "мова"]),
    ("pay", ["оплата", "платіж", "wallet", "pay"]),
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
    ("report", ["звіт", "репорт", "report", "аналітика"]),
    ("require", ["вимоги", "специфікація", "requirements"]),
    ("replic", ["реплікація", "копія", "дзеркало", "реплікат"]),
    ("admin", ["адмін", "керування", "адміністрування"]),
    ("auth", ["аутентифікація", "логін", "2fa", "otp"]),
]


# Ключі, для яких НЕ додавати "логотип","бренд" (концепти)
concept_hints = [
    "report", "require", "replic", "admin", "auth", "code", "data", "db", "sql", "photo", "video", "audio", "render", "build", "game", "cms", "css", "js"
]


def is_concept(key: str) -> bool:
    k = key.lower()
    return any(h in k for h in concept_hints)


def guess_generic(key: str):
    base = [] if is_concept(key) else ["логотип", "бренд"]
    for sub, syns in patterns:
        if sub in key:
            base += syns
    return uniq(base)


def enrich(key: str, current: list):
    out = []
    if key in manual:
        out += manual[key]
    # зберігаємо наявні синоніми першими
    out += current
    out += guess_generic(key)
    # завжди додаємо сам ключ англійською наприкінці для пошуку
    out += [key]
    out = uniq(order_syns(out))[:20]
    return out


def process_file(path: Path):
    data = json.loads(path.read_text(encoding='utf-8'))
    changed = False
    for k, v in list(data.items()):
        if not isinstance(v, list):
            cur = [str(v)]
        else:
            cur = v
        # Оновлюємо, якщо список убогий (1 елемент) або лише сам ключ
        needs = len(cur) == 0 or (len(cur) == 1 and cur[0].lower() == k.lower())
        if needs:
            data[k] = enrich(k, cur)
            changed = True
        else:
            # Перевпорядкування: українські варіанти спочатку
            ordered = uniq(order_syns(cur))[:20]
            if ordered != cur:
                data[k] = ordered
                changed = True
    if changed:
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding='utf-8')
    return changed


def main():
    files = sorted([p for p in ROOT.glob('part-*.json')])
    total = 0
    for f in files:
        if process_file(f):
            total += 1
            print(f"updated: {f}")
    print(f"done, files changed: {total}")


if __name__ == "__main__":
    main()

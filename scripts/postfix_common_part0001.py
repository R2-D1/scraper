#!/usr/bin/env python3
import json
from pathlib import Path

SRC = Path("translations/icons/missing-translations/names/part-0001.json")

REPLACEMENTS = [
    (" ltr", " LTR"),
    (" rtl", " RTL"),
    (" share", " поділитися"),
    (" active", " активна"),
    (" slash", " перекреслена"),
]


def main():
    data = json.loads(SRC.read_text(encoding="utf-8"))
    changed = 0
    for k, v in list(data.items()):
        new_v = v
        for a, b in REPLACEMENTS:
            new_v = new_v.replace(a, b)
        # Specific fixes for remaining English tokens in translated phrases
        if new_v.startswith("Стрілки") and " crossing" in new_v:
            new_v = new_v.replace(" crossing", " перехресні")
        if new_v.startswith("Стрілки") and " перемкнути" in new_v:
            new_v = new_v.replace(" перемкнути", " перемикання")
        if new_v.startswith("Стрілка") and " перезавантажити" in new_v:
            new_v = new_v.replace(" перезавантажити", " перезавантаження")
        if new_v.startswith("Стрілка") and " перемкнути" in new_v:
            new_v = new_v.replace(" перемкнути", " перемикання")
        if new_v.startswith("Стаття"):
            new_v = new_v.replace(" not found", " не знайдено")
            new_v = new_v.replace(" check", " перевірка")
            new_v = new_v.replace(" alt", " альт")
            # Rephrase to verb-first where it reads better
            if new_v == "Стаття додати":
                new_v = "Додати статтю"
            if new_v == "Стаття плюс" or new_v == "Стаття плюс (контурна)":
                new_v = new_v.replace("Стаття плюс", "Додати статтю")
            if new_v.startswith("Стаття пошук"):
                new_v = new_v.replace("Стаття пошук", "Пошук статті")
            if new_v.startswith("Стаття поділитися"):
                new_v = new_v.replace("Стаття поділитися", "Поділитися статтею")
        if new_v != v:
            data[k] = new_v
            changed += 1
    if changed:
        SRC.write_text(json.dumps(data, ensure_ascii=False, indent=2, sort_keys=False) + "\n", encoding="utf-8")
    print(f"Common post-fixes: {changed}")


if __name__ == "__main__":
    main()

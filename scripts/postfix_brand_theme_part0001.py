#!/usr/bin/env python3
import json
import re
from pathlib import Path

SRC = Path("translations/icons/missing-translations/names/part-0001.json")

RE_THEME = re.compile(r"^([a-z0-9][a-z0-9 ]*[a-z0-9])\s+(dark|light)$")
RE_STYLE = re.compile(r"^([a-z0-9][a-z0-9 ]*[a-z0-9])\s+(solid|remix)$")


def titleize(s: str) -> str:
    return " ".join(w[:1].upper() + w[1:] if w else w for w in s.split(" "))


def main():
    data = json.loads(SRC.read_text(encoding="utf-8"))
    changed = 0
    for k, v in list(data.items()):
        m = RE_THEME.match(v)
        if m:
            brand, theme = m.group(1), m.group(2)
            ua = "темна" if theme == "dark" else "світла"
            data[k] = f"{titleize(brand)} ({ua})"
            changed += 1
            continue
        m2 = RE_STYLE.match(v)
        if m2:
            brand, style = m2.group(1), m2.group(2)
            ua = "заповнена" if style == "solid" else "Remix"
            data[k] = f"{titleize(brand)} ({ua})"
            changed += 1
            continue
    if changed:
        SRC.write_text(json.dumps(data, ensure_ascii=False, indent=2, sort_keys=False) + "\n", encoding="utf-8")
    print(f"Brand/theme post-fixes: {changed}")


if __name__ == "__main__":
    main()

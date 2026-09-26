#!/usr/bin/env python3
import json
import re
from pathlib import Path

SRC = Path("translations/icons/missing-translations/names/part-0001.json")

def fix_value(v: str) -> str:
    if not v.startswith("Стрілка"):
        return v
    out = v
    # shape prepositions
    out = out.replace(" коло (", " у колі (")
    out = out.replace(" коло вимкнено", " у колі вимкнено")
    out = out.replace(" коло друк", " у колі друк")
    out = out.replace(" квадрат (", " у квадраті (")
    out = out.replace(" квадрат вимкнено", " у квадраті вимкнено")
    out = out.replace(" шестикутник (", " у шестикутнику (")

    # directional with shape
    out = out.replace(" вниз вліво коло", " вниз ліворуч у колі")
    out = out.replace(" вниз вправо коло", " вниз праворуч у колі")
    out = out.replace(" вліво коло", " вліво у колі")
    out = out.replace(" вправо коло", " вправо у колі")
    out = out.replace(" вгору коло", " вгору у колі")
    out = out.replace(" вниз коло", " вниз у колі")

    # dashed
    out = out.replace(" dashed квадрат", " штриховий квадрат")

    # dropdown
    out = out.replace("Стрілка dropdown", "Стрілка випадне меню")

    # next/previous with LTR/RTL
    out = out.replace("LTR next", "далі (LTR)")
    out = out.replace("RTL next", "далі (RTL)")
    out = out.replace("LTR previous", "назад (LTR)")
    out = out.replace("RTL previous", "назад (RTL)")

    # clockwise/counterclockwise
    out = out.replace(" clockwise", " за годинниковою")
    out = out.replace(" counterclockwise", " проти годинникової")

    # reload/spin/switch/round/shrink/transfer/diagonal
    out = out.replace(" reload ", " перезавантаження ")
    out = out.replace(" spin у колі", " обертання у колі")
    out = out.replace(" spin ", " обертання ")
    out = out.replace(" switch", " перемикання")
    out = out.replace(" round ", " округла ")
    out = out.replace(" shrink", " стиснення")
    out = out.replace(" transfer diagonal ", " перенесення по діагоналі ")
    out = out.replace(" transfer diagonal", " перенесення по діагоналі")
    out = out.replace("Стрілка spin", "Стрілка обертання")
    out = out.replace(" обертання коло", " обертання у колі")
    out = out.replace(" стиснути diagonal", " стиснути по діагоналі")
    out = out.replace(" шлях годинник", " шлях з годинником")
    return out


def main():
    data = json.loads(SRC.read_text(encoding="utf-8"))
    changed = 0
    for k, v in list(data.items()):
        new_v = fix_value(v)
        if new_v != v:
            data[k] = new_v
            changed += 1
    if changed:
        SRC.write_text(json.dumps(data, ensure_ascii=False, indent=2, sort_keys=False) + "\n", encoding="utf-8")
    print(f"Post-fixed entries: {changed}")

if __name__ == "__main__":
    main()

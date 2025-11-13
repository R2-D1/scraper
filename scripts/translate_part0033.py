#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from part_0033_base_map import base_map

STYLE_LABELS = {
    'regular': 'звичайна',
    'light': 'тонка',
    'bold': 'жирна',
    'thin': 'тонка',
    'solid': 'суцільна',
    'line': 'контурна',
    'duotone': 'двотональна',
    'duotone-line': 'контурна двотональна',
    'f': 'суцільна',
}

STYLE_SUFFIXES = ['duotone-line', 'duotone', 'solid', 'line', 'light', 'bold', 'thin', 'f']
SIZE_STYLE_PATTERN = re.compile(r'-(\d+)-(regular|light|bold|thin)$')

DESCRIPTOR_MAP = {
    'dark-skin-tone': 'темний відтінок шкіри',
    'medium-dark-skin-tone': 'середньо-темний відтінок шкіри',
    'medium-light-skin-tone': 'середньо-світлий відтінок шкіри',
    'medium-skin-tone': 'середній відтінок шкіри',
    'light-skin-tone': 'світлий відтінок шкіри',
    'bald': 'без волосся',
    'beard': 'борода',
    'blond-hair': 'біляве волосся',
    'curly-hair': 'кучеряве волосся',
    'red-hair': 'руде волосся',
    'white-hair': 'біле волосся',
}

DESCRIPTORS_ORDERED = sorted(DESCRIPTOR_MAP, key=len, reverse=True)

WOMAN_BASES = {
    '': 'Жінка',
    'and-man-holding-hands': 'Жінка і чоловік тримаються за руки',
    'artist': 'Жінка-художниця',
    'astronaut': 'Жінка-астронавт',
    'biking': 'Жінка на велосипеді',
    'bouncing-ball': 'Жінка грає з мʼячем',
    'bowing': 'Жінка вклоняється',
    'cartwheeling': 'Жінка робить колесо',
    'climbing': 'Жінка-скелелазка',
    'construction-worker': 'Жінка-будівельниця',
    'cook': 'Жінка-кухар',
    'detective': 'Жінка-детектив',
    'elf': 'Жінка-ельф',
    'facepalming': 'Жінка прикриває обличчя',
    'factory-worker': 'Жінка-працівниця заводу',
    'fairy': 'Жінка-фея',
    'farmer': 'Жінка-фермерка',
    'feeding-baby': 'Жінка годує немовля',
    'firefighter': 'Жінка-пожежниця',
    'frowning': 'Жінка насупилась',
    'genie': 'Жінка-джин',
    'gesturing-no': 'Жінка показує «ні»',
    'gesturing-ok': 'Жінка показує «окей»',
    'getting-haircut': 'Жінка стрижеться',
    'getting-massage': 'Жінка отримує масаж',
    'golfing': 'Жінка грає в гольф',
    'guard': 'Жінка-охоронниця',
    'health-worker': 'Жінка-медик',
    'in-lotus-position': 'Жінка в позі лотоса',
    'in-manual-wheelchair': 'Жінка в ручному візку',
    'in-motorized-wheelchair': 'Жінка в електровізку',
    'in-steamy-room': 'Жінка в сауні',
    'in-suit-levitating': 'Жінка в костюмі левітує',
    'in-tuxedo': 'Жінка в смокінгу',
    'judge': 'Жінка-суддя',
    'juggling': 'Жінка жонглює',
    'kneeling': 'Жінка навколішки',
    'lifting-weights': 'Жінка підіймає штангу',
    'mage': 'Жінка-маг',
    'mechanic': 'Жінка-механік',
    'mountain-biking': 'Жінка на гірському велосипеді',
    'office-worker': 'Жінка-офісна працівниця',
    'pilot': 'Жінка-пілот',
    'playing-handball': 'Жінка грає в гандбол',
}


def extract_meta(key: str) -> tuple[str, int | None, str | None]:
    match = SIZE_STYLE_PATTERN.search(key)
    if match:
        size = int(match.group(1))
        style = match.group(2)
        base = key[: match.start()]
        return base, size, style
    for style in STYLE_SUFFIXES:
        suffix = f'-{style}'
        if key.endswith(suffix):
            base = key[: -len(suffix)]
            return base, None, style
    return key, None, None


def format_meta(size: int | None, style: str | None) -> str:
    parts: list[str] = []
    if size is not None:
        parts.append(str(size))
    if style is not None:
        label = STYLE_LABELS.get(style)
        if not label:
            raise ValueError(f'Unknown style: {style}')
        parts.append(label)
    return f" ({', '.join(parts)})" if parts else ''


def split_woman_descriptors(rest: str) -> tuple[str, list[str]]:
    descriptors: list[str] = []
    working = rest
    while working:
        for token in DESCRIPTORS_ORDERED:
            if working.endswith(token):
                descriptors.append(DESCRIPTOR_MAP[token])
                working = working[: -len(token)]
                if working.endswith('-'):
                    working = working[:-1]
                break
        else:
            break
    descriptors.reverse()
    return working, descriptors


def translate_woman(key: str) -> str:
    rest = key[len('woman-') :]
    base, descriptors = split_woman_descriptors(rest)
    base_text = WOMAN_BASES.get(base)
    if base_text is None:
        raise ValueError(f'Unknown woman base: {base}')
    if not descriptors:
        return base_text
    joiner = ' / ' if base == 'and-man-holding-hands' else ', '
    return f"{base_text} ({joiner.join(descriptors)})"


def main() -> None:
    path = Path('translations/missing-translations/names/part-0033.json')
    data = json.loads(path.read_text(encoding='utf-8'))
    translated = {}
    for key in data:
        if key.startswith('woman-'):
            translated[key] = translate_woman(key)
            continue
        base, size, style = extract_meta(key)
        base_text = base_map.get(base)
        if base_text is None:
            raise KeyError(f'Missing base translation for {base}')
        translated[key] = f"{base_text}{format_meta(size, style)}"
    path.write_text(json.dumps(translated, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()

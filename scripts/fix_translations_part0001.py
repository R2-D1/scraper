#!/usr/bin/env python3
import json
import re
from pathlib import Path

SRC = Path('translations/missing-translations/names/part-0001.json')

STYLE_FROM_TOKEN = {
  'line': 'контурна',
  'outline': 'контурна',
  'o': 'контурна',
  'solid': 'суцільна',
  'rounded': 'закруглена',
  'sharp': 'гостра',
  'simple': 'проста',
  'bold': 'жирна',
  'light': 'тонка',
  'thin': 'тонка',
  'duotone': 'двотонова',
  'circle': 'кругла',
  'square': 'квадратна',
  'alt': 'альтернативна',
}

REPLACEMENTS = [
  (r'\bup\b', 'вгору'),
  (r'\bdown\b', 'вниз'),
  (r'\bleft\b', 'ліворуч'),
  (r'\bright\b', 'праворуч'),
  (r'\bopen\b', 'відкритий'),
  (r'\boff\b', 'вимкнений'),
  (r'\bdouble\b', 'подвійний'),
  (r'\bcaret\b', 'трикутник'),
  (r'\bCaret\b', 'Трикутник'),
  (r'\blightning\b', 'блискавка'),
  (r'\bLightning\b', 'Блискавка'),
  (r'\bcolon\b', 'двокрапка'),
  # Часті англійські слова у значеннях → укр.
  (r'\bChevron\b', 'Шеврон'),
  (r'\bCheveron\b', 'Шеврон'),
  (r'\bCheckmark\b', 'Галочка'),
  (r'\bCloud\b', 'Хмара'),
  (r'\bClock\b', 'Годинник'),
  (r'\bBookmark\b', 'Закладка'),
  (r'\bBook\b', 'Книга'),
  (r'\bBattery\b', 'Батарея'),
  (r'\bCalendar\b', 'Календар'),
  (r'\bBell\b', 'Дзвінок'),
  (r'\bCamera\b', 'Камера'),
  (r'\bUser\b', 'Користувач'),
  (r'\bCar\b', 'Авто'),
  (r'\bBrowser\b', 'Браузер'),
  (r'\bBrightness\b', 'Яскравість'),
  (r'\bCellphone\b', 'Телефон'),
  (r'\bAirline\b', 'Авіалінії'),
  (r'\bAnnoyed\b', 'Роздратований'),
  (r'\bAdd\b', 'Додати'),
  (r'\bBars\b', 'Смуги'),
  (r'\bChart\b', 'Діаграма'),
]

def extract_styles_from_key(key: str) -> list:
    styles = []
    for t in key.split('-'):
        if t in STYLE_FROM_TOKEN:
            styles.append(STYLE_FROM_TOKEN[t])
    # унікальні в порядку появи
    seen = []
    for s in styles:
        if s not in seen:
            seen.append(s)
    return seen

def attach_style(text: str, styles: list) -> str:
    # нормалізація стилів: лишаємо тільки доречні та унікальні
    if styles:
        # якщо присутні і "заповнена", і "суцільна" — лишаємо "суцільна"
        if 'суцільна' in styles and 'заповнена' in styles:
            styles = [s for s in styles if s != 'заповнена']
        # унікальність у порядку
        seen = []
        for s in styles:
            if s not in seen:
                seen.append(s)
        styles = seen
    if not styles:
        return text
    # якщо вже є дужки — додамо туди
    if text.endswith(')') and ' (' in text:
        head, _, tail = text.rpartition('(')
        inside = tail.rstrip(')')
        parts = [p.strip() for p in inside.split(',') if p.strip()]
        for s in styles:
            if s not in parts:
                parts.append(s)
        return head.rstrip() + ' (' + ', '.join(parts) + ')'
    return text + ' (' + ', '.join(styles) + ')'

def cleanup_value_by_key(key: str, value: str) -> str:
    # спецвипадки: хмара + погодні комбінації і бренди
    if key.startswith('cloud-'):
        tokens = key.split('-')
        base_tokens = [t for t in tokens if t not in ('line','outline','o','solid','rounded','sharp','simple','bold','light','thin','duotone','circle','square','alt')]
        rest = base_tokens[1:]
        styles = extract_styles_from_key(key)

        # Брендові/відомі назви
        if key.startswith('cloud-foundry'):
            name = 'Cloud Foundry'
            return attach_style(name, styles)
        if key.startswith('cloud-satellite-services'):
            return attach_style('Cloud Satellite сервіси', styles)
        if key.startswith('cloud-satellite-config'):
            return attach_style('Cloud Satellite конфігурація', styles)
        if key.startswith('cloud-satellite-link'):
            return attach_style('Cloud Satellite посилання', styles)
        if key.startswith('cloud-satellite'):
            return attach_style('Cloud Satellite', styles)

        # Погодні компоненти
        ua = {
            'moon': 'місяць',
            'sun': 'сонце',
            'rain': 'дощ',
            'snow': 'сніг',
            'hail': 'град',
            'drizzle': 'мряка',
            'showers': 'зливи',
            'wind': 'вітер',
            'tear': 'крапля',
            'meatball': 'злива',
        }

        def join_and(items):
            if not items:
                return ''
            if len(items) == 1:
                return items[0]
            if len(items) == 2:
                return f"{items[0]} і {items[1]}"
            return f"{', '.join(items[:-1])} і {items[-1]}"

        parts = []

        # категорії поза погодою
        if rest == ['info']:
            return attach_style('Інформація (хмара)', styles)
        if rest == ['shield']:
            return attach_style('Хмарний щит', styles)
        if rest == ['redo']:
            return attach_style('Оновити (хмара)', styles)
        if rest == ['slash']:
            return attach_style('Хмара (перекреслена)', styles)
        if rest == ['registry']:
            return attach_style('Хмарний реєстр', styles)
        if rest == ['services']:
            return attach_style('Хмарні сервіси', styles)
        if rest[:2] == ['service','management']:
            return attach_style('Керування хмарними сервісами', styles)
        if rest == ['app']:
            return attach_style('Хмарний застосунок', styles)
        if rest == ['auditing']:
            return attach_style('Хмарний аудит', styles)
        if rest == ['logging']:
            return attach_style('Хмарне логування', styles)
        if rest == ['monitoring']:
            return attach_style('Хмарний моніторинг', styles)
        if rest == ['ceiling']:
            return attach_style('Нижня межа хмар', styles)
        if rest == ['data','ops']:
            return attach_style('DataOps у хмарі', styles)
        if rest == ['database','tree']:
            return attach_style('Дерево баз даних у хмарі', styles)

        # погодні комбінації: сформуємо перелік без слова "хмара"
        weather = []
        celestial = []
        for t in rest:
            if t in ('rain','snow','hail','drizzle','showers','wind','tear','meatball'):
                # rain-wind як пара
                weather.append(ua.get(t, t))
            elif t in ('sun','moon'):
                celestial.append(ua[t])

        # Якщо є пара rain-wind — з’єднаємо "дощ і вітер"
        phrase = None
        if weather or celestial:
            # Особливі кейси
            if rest == ['drizzle']:
                phrase = 'Мряка'
            elif rest == ['fog']:
                phrase = 'Туман'
            elif rest == ['snow']:
                phrase = 'Сніг'
            elif rest == ['hail']:
                phrase = 'Град'
            else:
                items = []
                if celestial:
                    items.append(join_and(celestial))
                if weather:
                    items.append(join_and(weather))
                phrase = join_and(items) if items else 'Хмара'
            # Перша літера велика
            phrase = phrase[:1].upper() + phrase[1:] if phrase else phrase
            return attach_style(phrase, styles)

        # fallback для cloud-* якщо не впізнали
        # залишається існуюче значення, але підчистимо стиль
        cleaned = re.sub(r'\b(?:outline|line|solid|o)\b', '', value)
        cleaned = re.sub(r'\s{2,}', ' ', cleaned).strip()
        return attach_style(cleaned, styles)

    # приберемо текстові згадки стилів усередині значення
    value = re.sub(r'\b(?:outline|line|solid|o)\b', '', value)
    value = re.sub(r'\s{2,}', ' ', value).strip()

    # підстановки англ. слів → укр.
    for pat, repl in REPLACEMENTS:
        value = re.sub(pat, repl, value)

    # додамо стилі з ключа у дужках
    styles = extract_styles_from_key(key)
    if styles:
        value = attach_style(value, styles)

    # Вирівняти регістр першої літери
    if value:
        value = value[:1].upper() + value[1:]
    return value

def main():
    data = json.loads(SRC.read_text(encoding='utf-8'))
    out = {}
    for k, v in data.items():
        fixed = cleanup_value_by_key(k, v)
        # фінальна нормалізація дубль-стилів у дужках
        fixed = re.sub(r"\((?:заповнена,\s*суцільна|суцільна,\s*заповнена)\)", "(суцільна)", fixed)
        out[k] = fixed
    SRC.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding='utf-8')

if __name__ == '__main__':
    main()

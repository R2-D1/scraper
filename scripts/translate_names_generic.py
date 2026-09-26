#!/usr/bin/env python3
import argparse
import json
import re
from pathlib import Path

STYLE_MAP = {
    'line': 'контурна',
    'solid': 'суцільна',
    'filled': 'заповнена',
    'alt': 'альтернативна',
    'o': 'контурна',
}

DESCR_MAP = {
    'off': 'вимкнено',
    'on': 'увімкнено',
    'mesh': 'сітка',
    'color': 'колір',
}

SHAPE_DESC = {
    'circle': 'кругла',
    'square': 'квадратна',
    'rectangle': 'прямокутна',
    'diamond': 'ромб',
    'hexagon': 'шестикутна',
    'octagon': 'восьмикутна',
    'pentagon': 'п’ятикутна',
    'waves': 'хвилі',
}

KEEP_UPPER = {
    'ai': 'ШІ', 'api': 'API', 'ar': 'AR', '3d': '3D', 'abs': 'ABS',
    'pdf': 'PDF', 'nfc': 'NFC', 'ndb': 'NDB', 'dme': 'DME', 'vor': 'VOR',
    'dns': 'DNS', 'ip': 'IP', 'id': 'ID', 'mpr': 'MPR', 'ica': 'ICA',
}

T = {
    # directions / common UI
    'arrow': 'Стрілка', 'down': 'вниз', 'up': 'вгору', 'left': 'ліворуч', 'right': 'праворуч',
    'compress': 'стиснути', 'random': 'випадкова', 'resize': 'змінити розмір',
    'thin': 'тонка', 'thick': 'товста',

    # general
    'ad': 'Реклама', 'menu': 'Меню', 'accordion': 'акордеон', 'accessible': 'Доступність', 'icon': 'іконка',
    'accept': 'Прийняти', 'action': 'дія', 'usage': 'використання', 'definition': 'визначення',
    'accumulation': 'Накопичення', 'precipitation': 'опади', 'rain': 'дощ', 'snow': 'сніг', 'ice': 'лід', 'lightning': 'блискавка', 'cloud': 'Хмара', 'sun': 'сонце', 'moon': 'місяць',
    'air': 'Повітря', 'balloon': 'куля', 'condition': 'кондиціонер', 'open': 'відкрито',
    'academic': 'Випускна', 'hat': 'шапка', 'cap': 'шапка',
    'android': 'Android', 'phone': 'телефон', 'slash': 'перекреслено',
    'american': 'Американський', 'football': 'футбол', 'angel': 'Ангел', 'angry': 'Злий',
    'announcement': 'Оголошення', 'announce': 'Оголошення',
    'annotation': 'Анотація', 'visibility': 'видимість', 'color': 'колір',
    'app': 'Застосунок', 'application': 'Застосунок', 'gallery': 'галерея', 'virtual': 'віртуальний', 'mobile': 'мобільний', 'web': 'веб',
    'area': 'Область', 'select': 'вибір', 'custom': 'користувацька',
    'array': 'Масив', 'booleans': 'булевих', 'dates': 'дат', 'numbers': 'чисел', 'objects': 'об’єктів', 'strings': 'рядків',
    'aiming': 'Прицілювання', 'aerial': 'Канатний', 'lift': 'підйомник',
    'align': 'Вирівняти', 'horizontal': 'горизонтально', 'vertical': 'вертикально',
    'browser': 'Browser',  # Arc Browser — продуктова назва
    'apple': 'Apple',  # бренд
    'results': 'результати', 'status': 'статус', 'launch': 'запуск', 'label': 'мітка', 'recommend': 'рекомендація',
    'business': 'бізнес', 'impact': 'вплив', 'assessment': 'оцінка', 'financial': 'фінансова', 'sustainability': 'стійкість', 'check': 'перевірка',
    'governance': 'керування', 'lifecycle': 'життєвий цикл', 'tracked': 'відстежуване', 'untracked': 'не відстежуване',
    'count': 'підрахунок', 'rows': 'рядків', 'recalculation': 'перерахунок', 'aggregator': 'Агрегатор',
    'curve': 'крива', 'auto': 'авто', 'manual': 'ручна', 'colon': 'товста кишка', 'vessels': 'судини', 'print': 'друк', 'mesh': 'сітка', 'software': 'ПЗ',
    'cursor': 'курсор', 'absolute': 'абсолютне', 'position': 'позиціонування', 'academy': 'Академія',
    'add': 'Додати', 'child': 'дочірній', 'parent': 'батьківський', 'node': 'вузол', 'dock': 'док', 'queue': 'черга',
    'adjust': 'Налаштування', 'half': 'половина', 'aeroplane': 'Літак', 'toggle': 'перемикач',
    'agriculture': 'Сільське господарство', 'analytics': 'аналітика',
    'complete': 'завершено', 'failed': 'помилка', 'urgent': 'термінові', 'very': 'дуже', 'high': 'високі', 'low': 'низькі', 'medium': 'середні',
    'airport': 'Аеропорт', 'location': 'локація', 'alarm': 'Будильник', 'check': 'перевірка', 'minus': 'мінус', 'plus': 'плюс', 'smoke': 'дим', 'snooze': 'відкласти', 'subtract': 'відняти',
    'album': 'Альбом', 'alert': 'Попередження', 'audio': 'Аудіо', 'digital': 'цифрова', 'gate': 'брама', 'manage': 'керувати', 'gates': 'брами', 'passenger': 'пасажир', 'care': 'догляд', 'rapid': 'швидка', 'board': 'посадка', 'airline': 'Авіакомпанія',
    'drizzle': 'мряка', 'fog': 'туман', 'hail': 'град', 'wind': 'вітер', 'showers': 'зливи', 'meatball': 'злива', 'tear': 'крапля',
    'redo': 'повторити', 'registry': 'реєстр', 'satellite': 'супутник', 'config': 'конфігурація', 'link': 'посилання', 'services': 'сервіси', 'service': 'сервіс', 'management': 'керування',
    'shield': 'щит', 'data': 'дані', 'ops': 'операції', 'alerting': 'сповіщення', 'auditing': 'аудит', 'ceiling': 'стеля', 'database': 'база даних', 'tree': 'дерево', 'info': 'інфо', 'logging': 'логування', 'monitoring': 'моніторинг',
    'activity': 'Активність', 'clock': 'Годинник', 'clockwise': 'за годинниковою', 'close': 'Закрити', 'closed': 'Закриті', 'captioning': 'субтитри',
    'one': 'один', 'two': 'два', 'three': 'три', 'four': 'чотири', 'five': 'п’ять', 'six': 'шість', 'seven': 'сім', 'eight': 'вісім', 'nine': 'дев’ять', 'ten': 'десять', 'eleven': 'одинадцять', 'twelve': 'дванадцять',
}

LETTER_RE = re.compile(r'^[a-z]$')

def split_tokens(key: str):
    return key.split('-')

def extract_parts(tokens):
    styles = []
    shapes = []
    descr = []
    core = []
    for t in tokens:
        lt = t.lower()
        if lt in STYLE_MAP:
            styles.append(STYLE_MAP[lt])
        elif lt in SHAPE_DESC:
            shapes.append(SHAPE_DESC[lt])
        elif lt in DESCR_MAP:
            descr.append(DESCR_MAP[lt])
        else:
            core.append(t)
    # dedupe preserving order
    def uniq(seq):
        seen=set(); out=[]
        for x in seq:
            if x not in seen: out.append(x); seen.add(x)
        return out
    return core, uniq(shapes), uniq(styles), uniq(descr)

def map_token(t: str) -> str:
    lt = t.lower()
    if lt in KEEP_UPPER:
        return KEEP_UPPER[lt]
    return T.get(lt, t)

def capitalize_first(s: str) -> str:
    return s[:1].upper() + s[1:] if s else s

def join_parts(main: str, shapes, styles, descr):
    meta = []
    meta.extend(shapes)
    meta.extend(descr)
    meta.extend(styles)
    if meta:
        return f"{main} (" + ', '.join(meta) + ")"
    return main

def special_phrases(key: str, tokens, core, shapes, styles, descr):
    ltokens = [t.lower() for t in tokens]

    # keyboard combos like alt-a
    if len(tokens) == 2 and tokens[0].lower() in ('alt','ctrl','shift','cmd','option') and LETTER_RE.match(tokens[1]):
        base = tokens[0].capitalize() + ' + ' + tokens[1].upper()
        return join_parts(base, shapes, styles, descr)

    # a-arrow-down, b-arrow-up, etc.
    if len(core) >= 3 and LETTER_RE.match(core[0]) and core[1] == 'arrow':
        letter = core[0].upper()
        rest = [map_token(t) for t in core[2:]]
        dir_part = ' '.join(rest)
        base = f"{letter} {map_token('arrow')} {dir_part}".strip()
        return join_parts(base, shapes, styles, descr)

    # accumulation-*
    if core and core[0].lower() == 'accumulation':
        GEN = {'rain': 'дощу', 'snow': 'снігу', 'ice': 'льоду', 'precipitation': 'опадів'}
        rest = [GEN.get(t.lower(), map_token(t)) for t in core[1:]]
        base = ' '.join([map_token('accumulation')] + rest).strip()
        base = capitalize_first(base)
        return join_parts(base, shapes, styles, descr)

    # ad-* with shape/off/line
    if core and core[0].lower() == 'ad':
        base = 'Реклама'
        return join_parts(base, shapes, styles, descr)

    # android-phone-slash
    if ltokens[:3] == ['android','phone','slash']:
        return join_parts('Android телефон (перекреслено)', [], styles, descr)

    # accessible-icon*
    if ltokens[:2] == ['accessible','icon']:
        return join_parts('Доступна іконка', shapes, styles, descr)

    # accessibility-*
    if core and core[0].lower() == 'accessibility':
        base = 'Доступність'
        # push the rest to descriptors
        extra = [map_token(t) for t in core[1:]]
        descr2 = descr + extra
        return join_parts(base, shapes, styles, descr2)

    # american-football
    if ltokens[:2] == ['american','football']:
        return join_parts('Американський футбол', shapes, styles, descr)

    # annotation-visibility
    if ltokens[:2] == ['annotation','visibility']:
        return join_parts('Видимість анотацій', shapes, styles, descr)

    # arc-browser
    if ltokens[:2] == ['arc','browser']:
        return join_parts('Arc Browser', shapes, styles, descr)

    # ai-* keep prefix as ШІ ... + handle results/status variants
    if ltokens and ltokens[0] == 'ai':
        if ltokens[:2] == ['ai','results'] and len(tokens) > 2:
            tail = [map_token(t) for t in tokens[2:]]
            base = f"{KEEP_UPPER['ai']} результати " + ' '.join(tail)
            return join_parts(capitalize_first(base), shapes, styles, descr)
        if ltokens[:2] == ['ai','status'] and len(tokens) > 2:
            tail = [map_token(t) for t in tokens[2:]]
            base = f"{KEEP_UPPER['ai']} статус " + ' '.join(tail)
            return join_parts(capitalize_first(base), shapes, styles, descr)
        parts = [KEEP_UPPER['ai']] + [map_token(t) for t in tokens[1:]]
        base = capitalize_first(' '.join(parts))
        return join_parts(base, shapes, styles, descr)

    # array-*
    if ltokens and ltokens[0] == 'array':
        # Масив <чого>
        rest = [map_token(t) for t in tokens[1:]]
        base = 'Масив ' + ' '.join(rest)
        return join_parts(base, shapes, styles, descr)

    # academy-cap
    if ltokens == ['academy','cap']:
        return join_parts('Випускна шапка', shapes, styles, descr)

    # 3rd-party-connected
    if key == '3rd-party-connected':
        return 'Стороння інтеграція підключено'

    # arrow-* variants
    if ltokens and ltokens[0] == 'arrow':
        rest = [map_token(t) for t in core[1:]]
        # combine patterns like down-left
        if len(rest) >= 2 and rest[0] in ('вниз','вгору') and rest[1] in ('ліворуч','праворуч'):
            direction = rest[0] + '-' + rest[1]
            base = 'Стрілка ' + direction
        elif len(rest) >= 2 and rest[0] in ('ліворуч','праворуч') and rest[1] in ('вниз','вгору'):
            direction = rest[1] + '-' + rest[0]
            base = 'Стрілка ' + direction
        elif rest and rest[0] in ('вниз','вгору','ліворуч','праворуч'):
            base = 'Стрілка ' + rest[0]
        else:
            base = ' '.join([map_token('arrow')] + rest)
        return join_parts(capitalize_first(base), shapes, styles, descr)

    # fix: "Додати черга" -> "Додати чергу"
    base_try = ' '.join([map_token(t) for t in core])
    if base_try.startswith('Додати черга'):
        base = base_try.replace('Додати черга', 'Додати чергу', 1)
        return join_parts(capitalize_first(base), shapes, styles, descr)

    # N-plus (e.g., 10-plus) -> N+
    if len(tokens) == 2 and tokens[1] == 'plus' and tokens[0].isdigit():
        return tokens[0] + '+'

    return None

def translate_key(key: str) -> str:
    tokens = split_tokens(key)
    core, shapes, styles, descr = extract_parts(tokens)

    # run special phrase handlers
    s = special_phrases(key, tokens, core, shapes, styles, descr)
    if s is not None:
        return s

    mapped_core = [map_token(t) for t in core]
    if not mapped_core:
        base = ''
    else:
        base = ' '.join(mapped_core)
        base = capitalize_first(base)
    return join_parts(base, shapes, styles, descr)

def process_file(path: Path):
    data = json.loads(path.read_text(encoding='utf-8'))
    out = {}
    for k in data.keys():
        out[k] = translate_key(k)
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return len(out)

def main():
    ap = argparse.ArgumentParser(description='Rule-based natural UA names for icons')
    ap.add_argument('file', help='Path to JSON with key->name mapping to update')
    args = ap.parse_args()
    n = process_file(Path(args.file))
    print(f'Updated {args.file} entries: {n}')

if __name__ == '__main__':
    main()

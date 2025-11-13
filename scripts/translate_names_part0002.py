#!/usr/bin/env python3
import json
from pathlib import Path

SRC = Path('translations/missing-translations/names/part-0002.json')

# Стилі (жіночий рід, як у прикладах інструкції)
STYLE_MAP = {
    'bold': 'жирна',
    'duotone': 'двотонова',
    'light': 'тонка',
    'thin': 'тонка',
    'filled': 'заповнена',
    'fill': 'заповнена',
    'outline': 'контурна',
    'rounded': 'закруглена',
    'sharp': 'гостра',
    'simple': 'проста',
    'fat': 'товста',
    # Форма/контейнер як стиль (для випадків на кшталт caret-circle-...)
    'circle': 'кругла',
    'square': 'квадратна',
    'wavy': 'хвиляста',
}

DIR_MAP = {
    'up': 'вгору',
    'down': 'вниз',
    'left': 'ліворуч',
    'right': 'праворуч',
}

# Бренди/слова, які лишаємо без перекладу як усталені назви
BRANDS = {
    'codepen': 'CodePen',
    'codesandbox': 'CodeSandbox',
    'discord': 'Discord',
    'dev': 'DEV',
}

# Спеціальні фразові відповідники (довші шаблони спершу)
PHRASE_MAP = {
    'building-office': 'Офісна будівля',
    'building': 'Будівля',
    'buildings': 'Будівлі',
    'bulldozer': 'Бульдозер',
    'bus': 'Автобус',
    'butterfly': 'Метелик',
    'cable-car': 'Канатна дорога',
    'cactus': 'Кактус',
    'cake': 'Торт',
    'call-bell': 'Сервісний дзвіночок',
    'camera-rotate': 'Обертання камери',
    'camera-slash': 'Камера перекреслена',
    'camera-plus': 'Камера плюс',
    'campfire': 'Вогнище',
    'car-battery': 'Акумулятор авто',
    'car-profile': 'Профіль авто',
    'car-simple': 'Спрощене авто',
    'car': 'Авто',
    'cardholder': 'Тримач картки',
    'cards-three': 'Три картки',
    'cards': 'Картки',
    'carrot': 'Морква',
    'cash-register': 'Касовий апарат',
    'cassette-tape': 'Аудіокасета',
    'castle-turret': 'Замкова вежа',
    'cat': 'Кішка',
    'cell-signal': 'Сигнал мережі',
    'cell-tower': 'Стільникова вежа',
    'certificate': 'Сертифікат',
    'chair': 'Стілець',
    'chalkboard-simple': 'Спрощена дошка',
    'chalkboard-teacher': 'Дошка викладача',
    'chalkboard': 'Дошка',
    'champagne': 'Шампанське',
    'charging-station': 'Зарядна станція',
    'chart-bar-horizontal': 'Діаграма стовпчикова горизонтальна',
    'chart-bar': 'Діаграма стовпчикова',
    'chart-donut': 'Діаграма кільцева',
    'chart-line-down': 'Лінійна діаграма вниз',
    'chart-line-up': 'Лінійна діаграма вгору',
    'chart-line': 'Діаграма лінійна',
    'chart-pie-slice': 'Сектор кругової діаграми',
    'chart-pie': 'Діаграма кругова',
    'chart-polar': 'Діаграма полярна',
    'chart-scatter': 'Діаграма точкова',
    'chat-centered-dots': 'Чат по центру крапки',
    'chat-centered-text': 'Чат по центру текст',
    'chat-centered-slash': 'Чат по центру перекреслений',
    'chat-centered': 'Чат по центру',
    'chat-circle-dots': 'Чат (у колі) крапки',
    'chat-circle-text': 'Чат (у колі) текст',
    'chat-circle-slash': 'Чат (у колі) перекреслений',
    'chat-circle': 'Чат (у колі)',
    'chat-dots': 'Чат крапки',
    'chat-text': 'Чат текст',
    'chat-slash': 'Чат перекреслений',
    'chat-teardrop-dots': 'Чат (краплевидний) крапки',
    'chat-teardrop-text': 'Чат (краплевидний) текст',
    'chat-teardrop-slash': 'Чат (краплевидний) перекреслений',
    'chat-teardrop': 'Чат (краплевидний)',
    'chat': 'Чат',
    'chats-circle': 'Чати (у колі)',
    'chats-teardrop': 'Чати (краплевидні)',
    'chats': 'Чати',
    'check-square-offset': 'Галочка (з відступом)',
    'check-fat': 'Галочка широка',
    'check': 'Галочка',
    'checkerboard': 'Шахівниця',
    'checks': 'Галочки',
    'cheers': 'Тости',
    'cheese': 'Сир',
    'chef-hat': 'Кухарський ковпак',
    'cherries': 'Вишні',
    'church': 'Церква',
    'cigarette-slash': 'Сигарета перекреслена',
    'cigarette': 'Сигарета',
    'circle-dashed': 'Пунктирне коло',
    'circle-half-tilt': 'Півколо (нахил)',
    'circle-half': 'Півколо',
    'circle-notch': 'Коло з вирізом',
    'circle-wavy-check': 'Хвилясте коло з галочкою',
    'circle-wavy-question': 'Хвилясте коло питання',
    'circle-wavy-warning': 'Хвилясте коло попередження',
    'circle-wavy': 'Хвилясте коло',
    'circle-notch': 'Коло з вирізом',
    'circle': 'Коло',
    'circles-four': 'Чотири кола',
    'circles-three-plus': 'Три кола плюс',
    'circles-three': 'Три кола',
    'circuitry': 'Електросхема',
    'city': 'Місто',
    'clipboard-text': 'Кліпборд текст',
    'clipboard': 'Кліпборд',
    'clock-afternoon': 'Годинник день',
    'clock-clockwise': 'Поворот за годинниковою',
    'clock-counter-clockwise': 'Поворот проти годинникової',
    'clock-countdown': 'Зворотний відлік',
    'clock-user': 'Годинник користувача',
    'clock': 'Годинник',
    'closed-captioning': 'Закриті субтитри',
    'cloud-arrow-down': 'Хмара стрілка вниз',
    'cloud-arrow-up': 'Хмара стрілка вгору',
    'cloud-check': 'Хмара галочка',
    'cloud-fog': 'Туман у хмарі',
    'cloud-lightning': 'Блискавка в хмарі',
    'cloud-moon': 'Місяць і хмара',
    'cloud-rain': 'Дощова хмара',
    'clover': 'Конюшина',
    'club': 'Трефа',
    'computer-tower': 'Системний блок',
    'confetti': 'Конфеті',
    'contactless-payment': 'Безконтактна оплата',
    'control': 'Керування',
    'cookie': 'Печиво',
    'cooking-pot': 'Каструля',
    'copy-simple': 'Копія (спрощена)',
    'copyleft': 'Copyleft',
    'copyright': 'Авторське право',
    'corners-in': 'Кути всередину',
    'corners-out': 'Кути назовні',
    'couch': 'Диван',
    'court-basketball': 'Баскетбольний майданчик',
    'cowboy-hat': 'Ковбойський капелюх',
    'cow': 'Корова',
    'cpu': 'Процесор',
    'crane-tower': 'Баштовий кран',
    'crane': 'Кран',
    'cricket': 'Крикет',
    'crop': 'Кадрування',
    'crosshair-simple': 'Простий приціл',
    'crosshair': 'Приціл',
    'cross': 'Хрест',
    'crown-cross': 'Корона з хрестом',
    'crown-simple': 'Проста корона',
    'crown': 'Корона',
    'cube-focus': 'Куб у фокусі',
    'cube-transparent': 'Прозорий куб',
    'cube': 'Куб',
    'currency-btc': 'Біткоїн',
    'currency-circle-dollar': 'Долар (у колі)',
    'currency-cny': 'Юань',
    'currency-dollar': 'Долар',
    'currency-eur': 'Євро',
    'currency-gbp': 'Фунт',
    'currency-inr': 'Рупія',
    'currency-jpy': 'Єна',
    'currency-krw': 'Вона',
    'currency-kzt': 'Тенге',
    'currency-ngn': 'Найра',
    'currency-rub': 'Рубль',
}

# Базове відображення токенів (fallback, коли PHRASE_MAP не спрацював)
TOKEN_MAP = {
    'afternoon': 'день',
    'arrow': 'стрілка',
    'ball': 'м’яч',
    'bar': 'стовпчикова',
    'basketball': 'баскетбол',
    'battery': 'акумулятор',
    'bean': 'біб',
    'bell': 'дзвіночок',
    'blank': 'порожній',
    'block': 'блок',
    'btc': 'BTC',
    'building': 'будівля',
    'buildings': 'будівлі',
    'bulldozer': 'бульдозер',
    'bus': 'автобус',
    'butterfly': 'метелик',
    'cable': 'канатна',
    'cactus': 'кактус',
    'cake': 'торт',
    'calendar': 'календар',
    'call': 'дзвінок',
    'camera': 'камера',
    'campfire': 'вогнище',
    'captioning': 'субтитри',
    'car': 'авто',
    'cardholder': 'тримач картки',
    'cards': 'картки',
    'caret': 'трикутник',
    'carrot': 'морква',
    'cash': 'каса',
    'cassette': 'касета',
    'castle': 'замок',
    'cat': 'кішка',
    'cell': 'мережа',
    'centered': 'по центру',
    'certificate': 'сертифікат',
    'chair': 'стілець',
    'chalkboard': 'дошка',
    'champagne': 'шампанське',
    'charging': 'зарядна',
    'chart': 'діаграма',
    'chat': 'чат',
    'chats': 'чати',
    'check': 'галочка',
    'checkerboard': 'шахівниця',
    'checks': 'галочки',
    'cheers': 'тости',
    'cheese': 'сир',
    'chef': 'кухар',
    'cherries': 'вишні',
    'church': 'церква',
    'cigarette': 'сигарета',
    'circle': 'коло',
    'circles': 'кола',
    'circuitry': 'електросхема',
    'city': 'місто',
    'click': 'клік',
    'clipboard': 'кліпборд',
    'clock': 'годинник',
    'clockwise': 'за годинниковою',
    'closed': 'закриті',
    'cloud': 'хмара',
    'clover': 'конюшина',
    'club': 'трефа',
    'cny': 'Юань',
    'coat': 'пальто',
    'coda': 'Coda',
    'code': 'код',
    'codepen': 'CodePen',
    'codesandbox': 'CodeSandbox',
    'coffee': 'кава',
    'coin': 'монета',
    'coins': 'монети',
    'columns': 'стовпці',
    'command': 'Command',
    'compass': 'компас',
    'computer': 'комп’ютер',
    'confetti': 'конфеті',
    'contactless': 'безконтактна',
    'control': 'керування',
    'cookie': 'печиво',
    'cooking': 'кулінарний',
    'copy': 'копія',
    'copyleft': 'Copyleft',
    'copyright': 'Авторське право',
    'corners': 'кути',
    'couch': 'диван',
    'countdown': 'зворотний відлік',
    'counter': 'проти',
    'court': 'майданчик',
    'cow': 'корова',
    'cowboy': 'ковбой',
    'cpu': 'процесор',
    'crane': 'кран',
    'cricket': 'крикет',
    'crop': 'кадрування',
    'cross': 'хрест',
    'crosshair': 'приціл',
    'crown': 'корона',
    'cube': 'куб',
    'currency': 'валюта',
    'cursor': 'курсор',
    'cylinder': 'циліндр',
    'dashed': 'пунктирне',
    'database': 'база даних',
    'desk': 'стіл',
    'desktop': 'десктоп',
    'detective': 'детектив',
    'dev': 'DEV',
    'device': 'пристрій',
    'devices': 'пристрої',
    'diamond': 'ромб',
    'diamonds': 'бубни',
    'dice': 'кубик',
    'disc': 'диск',
    'disco': 'диско',
    'discord': 'Discord',
    'divide': 'ділення',
    'dollar': 'долар',
    'donut': 'кільцева',
    'dot': 'крапка',
    'dots': 'крапки',
    'double': 'подвійний',
    'down': 'вниз',
    'eth': 'ETH',
    'eur': 'Євро',
    'fat': 'широка',
    'five': 'п’ять',
    'focus': 'фокус',
    'fog': 'туман',
    'four': 'чотири',
    'full': 'повний',
    'gbp': 'Фунт',
    'half': 'половина',
    'hanger': 'вішак',
    'hat': 'капелюх',
    'heart': 'серце',
    'high': 'високий',
    'horizontal': 'горизонтальна',
    'in': 'всередину',
    'inr': 'Рупія',
    'jpy': 'Єна',
    'krw': 'Вона',
    'kzt': 'Тенге',
    'left': 'ліворуч',
    'lightning': 'блискавка',
    'line': 'з лінією',
    'logo': 'логотип',
    'low': 'низький',
    'medium': 'середній',
    'minus': 'мінус',
    'mobile': 'мобільний',
    'moon': 'місяць',
    'ngn': 'Найра',
    'none': 'відсутній',
    'notch': 'виріз',
    'office': 'офіс',
    'offset': 'зміщення',
    'one': 'один',
    'out': 'назовні',
    'payment': 'оплата',
    'pie': 'кругова',
    'plus': 'плюс',
    'polar': 'полярна',
    'pot': 'каструля',
    'profile': 'профіль',
    'question': 'питання',
    'rain': 'дощ',
    'register': 'каса',
    'right': 'праворуч',
    'rose': 'троянда',
    'rotate': 'поворот',
    'rub': 'Рубль',
    'scatter': 'точкова',
    'signal': 'сигнал',
    'simple': 'проста',
    'six': 'шість',
    'slash': 'перекреслений',
    'slice': 'сектор',
    'snow': 'сніг',
    'speaker': 'динамік',
    'square': 'квадрат',
    'star': 'зірка',
    'station': 'станція',
    'sun': 'сонце',
    'tablet': 'планшет',
    'tape': 'стрічка',
    'teacher': 'викладач',
    'teardrop': 'краплевидний',
    'text': 'текст',
    'three': 'три',
    'tilt': 'нахил',
    'to': 'до',
    'tool': 'інструмент',
    'tower': 'вежа',
    'transparent': 'прозорий',
    'turret': 'вежа',
    'two': 'два',
    'up': 'вгору',
    'user': 'користувач',
    'vertical': 'вертикальна',
    'warning': 'попередження',
    'wavy': 'хвилясте',
    'x': 'хрестик',
}


def join_styles(styles):
    if not styles:
        return ''
    return ' (' + ', '.join(styles) + ')'


def cap(s: str) -> str:
    return s[:1].upper() + s[1:] if s else s


def split_key_and_styles(key):
    tokens = key.split('-')
    styles = []
    # забираємо лише КІНЦЕВІ стилі (вага/контур/тощо)
    while tokens and tokens[-1] in STYLE_MAP:
        # Не знімати базову форму, якщо це самостійний об’єкт
        if len(tokens) == 1 and tokens[0] in ('circle', 'square'):
            break
        styles.append(STYLE_MAP[tokens.pop()])
    styles = list(dict.fromkeys(styles))
    return tokens, styles


def build_direction(tokens):
    dirs = []
    for t in tokens:
        if t in DIR_MAP:
            dirs.append(DIR_MAP[t])
    # унікалізація з збереженням порядку
    seq = []
    for d in dirs:
        if d not in seq:
            seq.append(d)
    if not seq:
        return ''
    # якщо є і вгору, і вниз — склеїмо дефісом
    if 'вгору' in seq and 'вниз' in seq and len(seq) == 2:
        return ' ' + 'вгору-вниз'
    return ' ' + ' '.join(seq)


def translate_caret(tokens, styles):
    # Перенесемо форму/контейнер до стилів
    kept = []
    extra_subject = []
    for t in tokens:
        if t in ('circle', 'square'):
            styles.append(STYLE_MAP[t])
        elif t == 'line':
            extra_subject.append('з лінією')
        elif t == 'double':
            extra_subject.append('подвійний')
        else:
            kept.append(t)

    direction = build_direction(kept)
    phrase = 'Трикутник' + direction
    if extra_subject:
        phrase = ' '.join([phrase] + extra_subject)
    return cap(phrase) + join_styles(list(dict.fromkeys(styles)))


def translate_cell_signal(tokens, styles):
    # cell-signal-[level|none|slash|x]
    base = 'Сигнал мережі'
    rest = [t for t in tokens if t not in ('cell', 'signal')]
    name = base
    if 'full' in rest:
        name += ' повний'
    elif 'high' in rest:
        name += ' високий'
    elif 'medium' in rest:
        name += ' середній'
    elif 'low' in rest:
        name += ' низький'
    elif 'none' in rest:
        name += ' відсутній'

    if 'slash' in rest:
        name += ' перекреслений'
    if 'x' in rest:
        name += ' (хрестик)'

    return cap(name) + join_styles(styles)


def translate_chart(tokens, styles):
    # chart-...
    t = set(tokens)
    # форма контейнера як стиль
    kept = []
    for tok in tokens:
        if tok in ('circle', 'square'):
            styles.append(STYLE_MAP[tok])
        else:
            kept.append(tok)
    tokens = kept

    kind = None
    if 'bar' in tokens:
        kind = 'Стовпчикова діаграма'
    elif 'pie' in tokens:
        kind = 'Кругова діаграма'
    elif 'donut' in tokens:
        kind = 'Кільцева діаграма'
    elif 'line' in tokens:
        kind = 'Лінійна діаграма'
    elif 'polar' in tokens:
        kind = 'Полярна діаграма'
    elif 'scatter' in tokens:
        kind = 'Точкова діаграма'
    else:
        kind = 'Діаграма'

    # напрямки для line up/down
    if 'down' in tokens and 'line' in tokens:
        kind = 'Лінійна діаграма вниз'
    if 'up' in tokens and 'line' in tokens:
        kind = 'Лінійна діаграма вгору'

    return cap(kind) + join_styles(list(dict.fromkeys(styles)))


def translate_chat(tokens, styles):
    plural = tokens[0] == 'chats'
    base = 'Чати' if plural else 'Чат'
    rest = tokens[1:]

    # форма/контейнер у стилі
    kept = []
    extra = []
    for t in rest:
        if t in ('circle',):
            styles.append(STYLE_MAP['circle'])
        elif t == 'teardrop':
            extra.append('(краплевидний)')
        elif t == 'centered':
            extra.append('по центру')
        elif t in ('slash', 'text', 'dots'):
            extra.append(TOKEN_MAP[t])
        else:
            kept.append(t)

    phrase = base
    if extra:
        phrase += ' ' + ' '.join(extra)
    return cap(phrase) + join_styles(list(dict.fromkeys(styles)))


def translate_circle(tokens, styles):
    # circle-... окремо, щоб краще звучало
    rest = tokens[1:]
    if rest[:2] == ['half', 'tilt']:
        return 'Півколо (нахил)' + join_styles(styles)
    if rest and rest[0] == 'half':
        return 'Півколо' + join_styles(styles)
    if rest and rest[0] == 'dashed':
        return 'Пунктирне коло' + join_styles(styles)
    # wavy + модифікатори
    if rest and rest[0] == 'wavy':
        tail = ' '.join(TOKEN_MAP.get(x, x) for x in rest[1:]).strip()
        base = 'Хвилясте коло'
        if tail:
            base += ' ' + tail
        return cap(base) + join_styles(styles)
    # notch
    if rest and rest[0] == 'notch':
        return 'Коло з вирізом' + join_styles(styles)
    # question/check/warning
    if rest and rest[0] in ('question', 'check', 'warning'):
        word = TOKEN_MAP[rest[0]].capitalize()
        return f"Коло {word.lower()}" + join_styles(styles)
    # fallback
    phrase = 'Коло'
    if rest:
        phrase += ' ' + ' '.join(TOKEN_MAP.get(x, x) for x in rest)
    return cap(phrase) + join_styles(styles)


def translate_closed_captioning(tokens, styles):
    return 'Закриті субтитри' + join_styles(styles)


def translate_cloud(tokens, styles):
    rest = tokens[1:]
    phrase = 'Хмара'
    if rest[:2] == ['arrow', 'up']:
        phrase += ' стрілка вгору'
    elif rest[:2] == ['arrow', 'down']:
        phrase += ' стрілка вниз'
    elif rest and rest[0] == 'check':
        phrase += ' галочка'
    elif rest and rest[0] == 'fog':
        phrase = 'Туман у хмарі'
    elif rest and rest[0] == 'lightning':
        phrase = 'Блискавка в хмарі'
    elif rest and rest[0] == 'moon':
        phrase = 'Місяць і хмара'
    elif rest and rest[0] == 'rain':
        phrase = 'Дощова хмара'
    return cap(phrase) + join_styles(styles)


def translate_generic(tokens, styles):
    # Якщо є пряме фразове зіставлення — використаємо його
    joined = '-'.join(tokens)
    for n in range(len(tokens), 0, -1):
        sub = '-'.join(tokens[:n])
        if sub in PHRASE_MAP:
            return cap(PHRASE_MAP[sub]) + join_styles(styles)
    # Бренд на початку
    if tokens and tokens[0] in BRANDS:
        return BRANDS[tokens[0]] + join_styles(styles)
    # Побудова з токенів
    words = [TOKEN_MAP.get(t, t) for t in tokens]
    name = ' '.join(words)
    return cap(name) + join_styles(styles)


def translate_key(key: str) -> str:
    tokens, styles = split_key_and_styles(key)
    if not tokens:
        return ''

    head = tokens[0]
    if head == 'caret':
        return translate_caret(tokens[1:], styles)
    if head == 'cell' and len(tokens) >= 2 and tokens[1] == 'signal':
        return translate_cell_signal(tokens, styles)
    if head == 'chart':
        return translate_chart(tokens[1:], styles)
    if head in ('chat', 'chats'):
        return translate_chat(tokens, styles)
    if head == 'circle':
        return translate_circle(tokens, styles)
    if head == 'closed' and '-'.join(tokens).startswith('closed-captioning'):
        return translate_closed_captioning(tokens, styles)
    if head == 'cloud':
        return translate_cloud(tokens, styles)

    return translate_generic(tokens, styles)


def main():
    data = json.loads(SRC.read_text(encoding='utf-8'))
    out = {}
    for k in data.keys():
        v = translate_key(k)
        out[k] = v
    SRC.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding='utf-8')


if __name__ == '__main__':
    main()

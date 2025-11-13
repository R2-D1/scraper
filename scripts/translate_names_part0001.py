#!/usr/bin/env python3
import json
from pathlib import Path

SRC = Path('translations/missing-translations/names/part-0001.json')

# Стилі (усі у жіночому роді для узгодження зі словом "іконка")
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
    # Форма/контейнер як стиль
    'circle': 'кругла',
    'square': 'квадратна',
    'octagon': 'восьмикутна',
    'diamond': 'ромбовидна',
    'oval': 'овальна',
}

# Напрямки/напрямні
DIR_MAP = {
    'up': 'вгору',
    'down': 'вниз',
    'left': 'ліворуч',
    'right': 'праворуч',
}

# Бренди або слова, які не перекладаємо (тут для цього файлу головне AirPlay)
BRANDS = {
    'airplay': 'AirPlay',
    'amazon': 'Amazon',
    'android': 'Android',
    'angular': 'Angular',
    'apple': 'Apple',
    'behance': 'Behance',
}

# Брендові фрази (декілька токенів)
BRAND_PHRASES = {
    'app-store': 'App Store',
    'apple-podcasts': 'Apple Podcasts',
    'ny-times': 'NY Times',
    'medium': 'Medium',
}

# Готові фразові відповідники (спочатку більш специфічні)
PHRASE_MAP = {
    'address-book-tabs': 'Контакти з вкладками',
    'address-book': 'Контакти',
    'air-traffic-control': 'Диспетчерська вежа',
    'airplane-in-flight': 'Літак у польоті',
    'airplane-landing': 'Приземлення літака',
    'airplane-takeoff': 'Зліт літака',
    'airplane-taxiing': 'Руління літака',
    'airplane-tilt': 'Нахил літака',
    'airplane': 'Літак',
    'acorn': 'Жолудь',
    'activity': 'Пульс',
    'alarm': 'Будильник',
    'alien': 'Прибулець',
    'align-center-horizontal': 'Вирівняти по центру горизонтально',
    'align-center-vertical': 'Вирівняти по центру вертикально',
    'align-left': 'Вирівняти ліворуч',
    'align-right': 'Вирівняти праворуч',
    'align-top': 'Вирівняти вгору',
    'align-bottom': 'Вирівняти вниз',
    'arrow': 'Стрілка',
    'briefcase': 'Портфель',
    'broadcast': 'Трансляція',
    'broom': 'Мітла',
    'browser': 'Браузер',
    'browsers': 'Браузери',
    'bug-beetle': 'Жук',
    'bug-droid': 'Android',  # пізнаванний маскот
    'bug': 'Жук',
    'building-apartment': 'Житлова будівля',
    'building-office': 'Офісна будівля',
    'building': 'Будівля',
    # A-група
    'ambulance': 'Швидка',
    'anchor': 'Якір',
    'anchor-simple': 'Якір',
    'aperture': 'Діафрагма',
    'app-window': 'Вікно застосунку',
    'approximate-equals': 'Приблизно дорівнює',
    'archive': 'Архів',
    'archive-tray': 'Архівний лоток',
    'armchair': 'Крісло',
    'article': 'Стаття',
    'article-medium': 'Medium',
    'article-ny-times': 'NY Times',
    'asclepius': 'Жезл Асклепія',
    'asterisk': 'Зірочка',
    'asterisk-simple': 'Зірочка',
    'at': 'Символ @',
    'atom': 'Атом',
    'avocado': 'Авокадо',
    'axe': 'Сокира',
    # B-група
    'baby': 'Дитина',
    'baby-carriage': 'Дитячий візок',
    'backpack': 'Рюкзак',
    'bag': 'Сумка',
    'bread': 'Хліб',
    'bridge': 'Міст',
    'angle': 'Кут',
    'balloon': 'Повітряна куля',
    'bandaids': 'Пластирі',
    'bank': 'Банк',
    'barbell': 'Штанга',
    'barcode': 'Штрихкод',
    'barn': 'Сарай',
    'barricade': 'Барикада',
    'baseball': 'Бейсбольний м’яч',
    'baseball-cap': 'Бейсболка',
    'baseball-helmet': 'Бейсбольний шолом',
    'basket': 'Кошик',
    'basketball': 'Баскетбольний м’яч',
    'bathtub': 'Ванна',
    'battery': 'Батарея',
    'battery-charging': 'Заряджання батареї',
    'beach-ball': 'Пляжний м’яч',
    'beanie': 'Шапка',
    'bed': 'Ліжко',
    'beer-bottle': 'Пляшка пива',
    'beer-stein': 'Пивний кухоль',
    'bell': 'Дзвінок',
    'bell-ringing': 'Дзвінок (дзвін)',
    'bell-simple': 'Дзвінок',
    'bell-simple-ringing': 'Дзвінок (дзвін, проста)',
    'bell-simple-slash': 'Дзвінок (перекреслений, проста)',
    'bell-slash': 'Дзвінок (перекреслений)',
    'bell-z': 'Дзвінок Z',
    'bell-simple-z': 'Дзвінок Z',
    'bluetooth-connected': 'Bluetooth підключено',
    'bluetooth-slash': 'Bluetooth перекреслено',
    'bluetooth-x': 'Bluetooth ×',
    'boat': 'Човен',
    'bomb': 'Бомба',
    'bone': 'Кістка',
    'book': 'Книга',
    'book-bookmark': 'Книга з закладкою',
    'book-open': 'Відкрита книга',
    'book-open-text': 'Відкрита книга з текстом',
    'book-open-user': 'Відкрита книга з користувачем',
    'bookmark': 'Закладка',
    'bookmark-simple': 'Закладка',
    'bookmarks': 'Закладки',
    'bookmarks-simple': 'Закладки',
    'books': 'Книги',
    'boot': 'Черевик',
    'boules': 'Кулі',
    'bounding-box': 'Обмежувальна рамка',
    'bowl-food': 'Миска з їжею',
    'bowl-steam': 'Миска з парою',
    'belt': 'Пояс',
    'bezier-curve': 'Крива Безьє',
    'bicycle': 'Велосипед',
    'binary': 'Двійковий код',
    'binoculars': 'Бінокль',
    'biohazard': 'Біонебезпека',
    'bird': 'Птах',
    'blueprint': 'Креслення',
    'bowling-ball': 'Куля для боулінгу',
    'box-arrow-down': 'Стрілка вниз у коробку',
    'box-arrow-up': 'Стрілка вгору з коробки',
    'boxing-glove': 'Боксерська рукавичка',
    'brackets': 'Дужки',
    'brackets-angle': 'Кутові дужки',
    'brackets-curly': 'Фігурні дужки',
    'brackets-round': 'Круглі дужки',
    'brackets-square': 'Квадратні дужки',
    'brain': 'Мозок',
    'brandy': 'Бренді',
}

def join_styles(styles):
    if not styles:
        return ''
    return ' (' + ', '.join(styles) + ')'

def cap(s: str) -> str:
    return s[:1].upper() + s[1:] if s else s

def translate_align(tokens, styles):
    # align-...
    t = set(tokens)
    # simple -> стиль
    if 'simple' in t:
        styles.append(STYLE_MAP['simple'])
        t.remove('simple')
        tokens = [tok for tok in tokens if tok != 'simple']

    phrase = None
    if 'center' in t and 'horizontal' in t:
        phrase = 'Вирівняти по центру горизонтально'
    elif 'center' in t and 'vertical' in t:
        phrase = 'Вирівняти по центру вертикально'
    elif 'left' in t:
        phrase = 'Вирівняти ліворуч'
    elif 'right' in t:
        phrase = 'Вирівняти праворуч'
    elif 'top' in t:
        phrase = 'Вирівняти вгору'
    elif 'bottom' in t:
        phrase = 'Вирівняти вниз'

    if phrase is None:
        phrase = 'Вирівняти'

    return cap(phrase) + join_styles(styles)

def build_direction(tokens):
    # будуємо фразу напряму на кшталт "вниз-ліворуч" чи "вгору"
    dirs = []
    for tok in tokens:
        if tok in DIR_MAP:
            dirs.append(DIR_MAP[tok])
    # унікалізація при зчепленні
    seq = []
    for d in dirs:
        if d not in seq:
            seq.append(d)
    if not seq:
        return ''
    return ' ' + '-'.join(seq)

def translate_arrow(tokens, styles):
    # обробляємо спеціальні модифікатори
    subject_extra = []
    subject = 'Стрілка'
    # clockwise / counter-clockwise
    if 'counter' in tokens and 'clockwise' in tokens:
        # приберемо їх та додамо фразу
        tokens = [t for t in tokens if t not in ('counter', 'clockwise')]
        subject_extra.append('проти годинникової')
    elif 'clockwise' in tokens:
        tokens = [t for t in tokens if t != 'clockwise']
        subject_extra.append('за годинниковою')

    # bend / elbow як стиль форми стрілки
    if 'bend' in tokens:
        styles.append('зігнута')
        tokens = [t for t in tokens if t != 'bend']
    if 'elbow' in tokens:
        styles.append('кутова')
        tokens = [t for t in tokens if t != 'elbow']
    if 'arc' in tokens:
        styles.append('вигнута')
        tokens = [t for t in tokens if t != 'arc']
    if 'u' in tokens:
        styles.append('U-подібна')
        tokens = [t for t in tokens if t != 'u']

    # circle/square/... вже обробляються як стиль загалом нижче
    # line/lines -> додаємо до предмету
    if 'line' in tokens:
        subject_extra.append('з лінією')
        tokens = [t for t in tokens if t != 'line']
    if 'lines' in tokens:
        subject_extra.append('зі смужками')
        tokens = [t for t in tokens if t != 'lines']

    # fat -> модифікує сам предмет
    if 'fat' in tokens:
        subject = 'Товста стрілка'
        tokens = [t for t in tokens if t != 'fat']

    # форма-контейнер як стиль (можуть бути всередині)
    kept = []
    for tok in tokens:
        if tok in ('circle', 'square', 'octagon', 'diamond', 'oval'):
            styles.append(STYLE_MAP[tok])
        else:
            kept.append(tok)
    tokens = kept

    # Решта токенів, що відповідають напрямам
    direction = build_direction(tokens)

    phrase = subject + direction
    if subject_extra:
        phrase += ' ' + ' '.join(subject_extra)

    return cap(phrase) + join_styles(styles)

def translate_arrows(tokens, styles):
    # Множина стрілок
    subject = 'Стрілки'
    subject_extra = []

    # clockwise / counter-clockwise
    if 'counter' in tokens and 'clockwise' in tokens:
        tokens = [t for t in tokens if t not in ('counter', 'clockwise')]
        subject_extra.append('проти годинника')
    elif 'clockwise' in tokens:
        tokens = [t for t in tokens if t != 'clockwise']
        subject_extra.append('за годинником')

    # in/out
    if 'in' in tokens:
        tokens = [t for t in tokens if t != 'in']
        subject_extra.append('всередину')
    if 'out' in tokens:
        tokens = [t for t in tokens if t != 'out']
        subject_extra.append('назовні')

    # split
    if 'split' in tokens:
        tokens = [t for t in tokens if t != 'split']
        subject_extra.append('розділені')

    # line/lines
    if 'line' in tokens:
        subject_extra.append('з лінією')
        tokens = [t for t in tokens if t != 'line']
    if 'lines' in tokens:
        subject_extra.append('зі смужками')
        tokens = [t for t in tokens if t != 'lines']

    # простий варіант
    kept = []
    for tok in tokens:
        if tok == 'simple':
            styles.append(STYLE_MAP['simple'])
        elif tok in ('horizontal', 'vertical'):
            subject_extra.append('горизонтально' if tok == 'horizontal' else 'вертикально')
        else:
            kept.append(tok)
    tokens = kept

    # Напрямки
    direction = build_direction(tokens)

    phrase = subject
    if direction:
        phrase += direction
    if subject_extra:
        phrase += ' ' + ' '.join(subject_extra)

    return cap(phrase) + join_styles(styles)

def translate_simple(tokens, styles):
    # Базовий переклад для понять з PHRASE_MAP та брендів
    base_key = '-'.join(tokens)
    # Від найбільшої до найменшої специфічності
    for n in range(len(tokens), 0, -1):
        sub = '-'.join(tokens[:n])
        if sub in PHRASE_MAP:
            phrase = PHRASE_MAP[sub]
            return cap(phrase) + join_styles(styles)
    # Якщо перший токен бренд — повертаємо бренд
    if tokens and tokens[0] in BRANDS:
        return BRANDS[tokens[0]].capitalize() + join_styles(styles)
    # fallback: просто капіталізація перших слів (не ідеально, але краще за англ.)
    return cap(' '.join(tokens)) + join_styles(styles)

def split_key_and_styles(key):
    tokens = key.split('-')
    styles = []
    # Забираємо кінцеві стилі (вага/тон/колір/контурність тощо)
    while tokens and tokens[-1] in STYLE_MAP:
        styles.append(STYLE_MAP[tokens.pop()])
    styles = list(dict.fromkeys(styles))  # унікалізація, зберігаємо порядок
    return tokens, styles

def translate_key(key: str) -> str:
    tokens, styles = split_key_and_styles(key)

    if not tokens:
        return ''

    # Головні гілки за першим токеном
    head = tokens[0]
    rest = tokens[1:]

    # Брендові логотипи на кшталт amazon-logo, app-store-logo, apple-podcasts-logo
    if tokens[-1:] == ['logo'] or tokens[-1:] == ['symbol']:
        brand_tokens = tokens[:-1]
        brand_key = '-'.join(brand_tokens)
        # точні фрази
        if brand_key in BRAND_PHRASES:
            return BRAND_PHRASES[brand_key] + join_styles(styles)
        # однослівні бренди
        if len(brand_tokens) == 1 and brand_tokens[0] in BRANDS:
            return BRANDS[brand_tokens[0]] + join_styles(styles)
        # за замовченням — просто капіталізація фрази бренду
        return cap(' '.join(brand_tokens)) + join_styles(styles)

    if head == 'align':
        return translate_align(tokens[1:], styles)
    if head == 'arrow':
        return translate_arrow(tokens[1:], styles)
    if head == 'arrows':
        return translate_arrows(tokens[1:], styles)
    if head == 'airplay':
        # Брендова назва
        return BRANDS['airplay'] + join_styles(styles)
    if head == 'airplane':
        # Спробуємо знайти фразову відповідність
        joined = '-'.join(tokens)
        for n in range(len(tokens), 0, -1):
            sub = '-'.join(tokens[:n])
            if sub in PHRASE_MAP:
                return cap(PHRASE_MAP[sub]) + join_styles(styles)
        return cap(PHRASE_MAP['airplane']) + join_styles(styles)
    if head == 'address' and len(tokens) >= 2 and tokens[1] == 'book':
        if len(tokens) >= 3 and tokens[2] == 'tabs':
            phrase = PHRASE_MAP['address-book-tabs']
        else:
            phrase = PHRASE_MAP['address-book']
        return cap(phrase) + join_styles(styles)
    if head == 'air' and '-'.join(tokens).startswith('air-traffic-control'):
        return cap(PHRASE_MAP['air-traffic-control']) + join_styles(styles)

    # Інші відомі речі або fallback
    return translate_simple(tokens, styles)

def main():
    data = json.loads(SRC.read_text(encoding='utf-8'))
    out = {}
    for k in data.keys():
        out[k] = translate_key(k)
    SRC.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding='utf-8')

if __name__ == '__main__':
    main()

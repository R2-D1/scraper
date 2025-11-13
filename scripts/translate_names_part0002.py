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
    'line': 'контурна',
    'o': 'контурна',
    'alt': 'альтернативна',
    'rounded': 'закруглена',
    'sharp': 'гостра',
    'simple': 'проста',
    'fat': 'товста',
    # Форма/контейнер як стиль (для випадків на кшталт caret-circle-...)
    'circle': 'кругла',
    'square': 'квадратна',
    'wavy': 'хвиляста',
    'solid': 'суцільна',
    'remix': 'Remix',
    'dark': 'темна',
    'double': 'подвійна',
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
    'britishairways': 'British Airways',
    'browserlist': 'Browserslist',
    'bsd': 'BSD',
    'bspwm': 'bspwm',
    'bugatti': 'Bugatti',
    'bugcrowd': 'Bugcrowd',
    'budibase': 'Budibase',
    'buefy': 'Buefy',
    'bungie': 'Bungie',
    'bunnydotnet': 'Bunny.net',
    'bunq': 'Bunq',
    'burgerking': 'Burger King',
    'bucklescript': 'BuckleScript',
    'buymeacoffee': 'Buy Me a Coffee',
    'bvg': 'BVG',
    'byjus': "BYJU'S",
    'bt': 'BT',
    'cadillac': 'Cadillac',
    'cairographics': 'Cairo Graphics',
    'cairometro': 'Cairo Metro',
    'caixabank': 'CaixaBank',
    'calendly': 'Calendly',
    'calibreweb': 'Calibre Web',
    'camunda': 'Camunda',
    'canonical': 'Canonical',
    'caprover': 'CapRover',
    'cardmarket': 'Cardmarket',
    'carlsberggroup': 'Carlsberg Group',
    'carrd': 'Carrd',
    'carrefour': 'Carrefour',
    'carthrottle': 'Car Throttle',
    'carto': 'Carto',
    'comsol': 'Comsol',
    'condaforge': 'Conda Forge',
    'conduct': 'Conduct',
    'contabo': 'Contabo',
    'construct3': 'Construct 3',
    'containerd': 'containerd',
    'caldotcom': 'Cal.com',
    'capnp': "Cap'n Proto",
    'daze': 'Daze',
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
    'cloud-sun-rain': 'Хмара, сонце і дощ',
    'cloud-sun': 'Хмара і сонце',
    'cloud-wind': 'Хмара з вітром',
    'cloud-unlock': 'Хмара розблокована',
    'cloud-times': 'Хмара з хрестиком',
    'cobb-angle': 'Кут Кобба',
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
    # Додаткові фразові зіставлення
    'brickwall': 'Цегляна стіна',
    'burrito-fastfood': 'Буріто фастфуд',
    'candy-cane': 'Цукрова тростина',
    'camera-film-roll': 'Камера плівка',
    'light-bulb': 'Лампочка',
    'jump-to-date': 'Перехід до дати',
    'camera-user': 'Камера користувача',
    'calendar-jump-to-date': 'Календар перехід до дати',
    'cannabis-leaf': 'Лист конопель',
    'cam-video': 'Відеокамера',
    'cam-web': 'Вебкамера',
    'camera-night': 'Нічна камера',
    'car-allert': 'Сповіщення авто',
    'car-lifter': 'Підіймач авто',
    'car-print': 'Друк авто',
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
    'cam': 'камера',
    'web': 'веб',
    'video': 'відео',
    'disabled': 'вимкнена',
    'loading': 'завантаження',
    'night': 'ніч',
    'polaroid': 'Polaroid',
    'slr': 'SLR',
    'film': 'плівка',
    'roll': 'рулон',
    'campfire': 'вогнище',
    'captioning': 'субтитри',
    'calculator': 'калькулятор',
    'calendar': 'календар',
    'camping': 'кемпінг',
    'gas': 'газ',
    'campsite': 'кемпінг',
    'can': 'банка',
    'canceled': 'скасовано',
    'candy': 'цукерка',
    'cane': 'тростина',
    'alt': 'альт',
    'cannabis': 'канабіс',
    'leaf': 'лист',
    'capitol': 'Капітолій',
    'lifter': 'підіймач',
    'shipping': 'доставка',
    'market': 'ринок',
    'carpet': 'килим',
    'cart': 'кошик',
    'print': 'друк',
    'off': 'вимкнено',
    'edit': 'редагувати',
    'end': 'кінець',
    'nine': 'дев’ять',
    'jump': 'перехід',
    'date': 'дата',
    'star': 'зірка',
    'bright': 'яскравий',
    'briefcase': 'портфель',
    'burger': 'бургер',
    'classic': 'класичний',
    'burrito': 'буріто',
    'fastfood': 'фастфуд',
    'arrow': 'стрілка',
    'deal': 'угода',
    'megaphone': 'мегафон',
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
    'screen': 'екран',
    'device': 'пристрій',
    'electronics': 'електроніка',
    'monitor': 'монітор',
    'display': 'дисплей',
    'imac': 'iMac',
    'download': 'завантаження',
    'tv': 'телевізор',
    'movies': 'фільми',
    'television': 'телебачення',
    'cathode': 'катодний',
    'crt': 'CRT',
    'ray': 'променевий',
    'tube': 'трубка',
    'vintage': 'ретро',
    'smart': 'розумний',
    'watch': 'годинник',
    'timepiece': 'годинник',
    'face': 'циферблат',
    'blank': 'порожній',
    'storage': 'накопичувач',
    'floppy': 'дискета',
    'hard': 'жорсткий',
    'disk': 'диск',
    'drive': 'диск',
    'virtual': 'віртуальна',
    'reality': 'реальність',
    'gaming': 'ігрова',
    'gear': 'пристрій',
    'controller': 'контролер',
    'games': 'ігри',
    'headset': 'гарнітура',
    'technology': 'технологія',
    'vr': 'VR',
    'eyewear': 'окуляри',
    'voice': 'голосова',
    'mail': 'пошта',
    'mic': 'мікрофон',
    'audio': 'аудіо',
    'mike': 'мікрофон',
    'music': 'музика',
    'microphone': 'мікрофон',
    'flash': 'спалах',
    'mute': 'без звуку',
    'webcam': 'вебкамера',
    'future': 'майбутнє',
    'tech': 'тех',
    'skype': 'Skype',
    'contact': 'контакт',
    'contactlesspayment': 'безконтактна оплата',
    'container': 'контейнер',
    'image': 'зображення',
    'content': 'контент',
    'add': 'додати',
    'file': 'файл',
    'folder': 'тека',
    'bookmark': 'закладка',
    'box': 'блок',
    'cone': 'конус',
    'geometric': 'геометричний',
    'shape': 'форма',
    'crane': 'кран',
    'cricket': 'крикет',
    'crop': 'кадрування',
    'confectionery': 'кондитерська',
    'camrecorder': 'відеокамера',
    'alert': 'сповіщення',
    'allert': 'сповіщення',
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
    # Перенесемо форму/контейнер у стилі, якщо зустрічається в середині
    kept = []
    for t in tokens:
        if t in ('circle', 'square'):
            styles.append(STYLE_MAP[t])
        else:
            kept.append(t)
    tokens = kept
    # Побудова з токенів
    words = [TOKEN_MAP.get(t, t) for t in tokens]
    name = ' '.join(words)
    return cap(name) + join_styles(styles)


def translate_key(key: str) -> str:
    tokens, styles = split_key_and_styles(key)
    if not tokens:
        return ''

    head = tokens[0]
    # Спеціальна логіка для псевдографіки (box-drawing)
    if head == 'box':
        return translate_box(tokens, styles)
    if head == 'burger':
        return translate_burger(tokens, styles)
    if head == 'breast':
        return translate_breast(tokens, styles)
    if head == 'browser':
        return translate_browser(tokens, styles)
    if head == 'brightness':
        return translate_brightness(tokens, styles)
    if head == 'bubble':
        return translate_bubble(tokens, styles)
    if head == 'computer':
        return translate_computer(tokens, styles)
    if head == 'bug':
        return translate_bug(tokens, styles)
    if head == 'business':
        return translate_business(tokens, styles)
    if head == 'button':
        return translate_button(tokens, styles)
    if head == 'bullet' or head == 'bulletin':
        return translate_bullet(tokens, styles)
    if head == 'content':
        return translate_content(tokens, styles)
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


def translate_box(tokens, styles):
    # box-* — елементи ліній/кутів/перетинів псевдографіки
    # Зустрічаються маркери стилю всередині назви (light/double/round/dashed/stipple...)
    rest = tokens[1:]

    # Зібрати стилі незалежно від позиції в ключі
    style_terms = []
    extras = []  # не-стилі, які краще дати у дужках, напр. "з колом"
    def add_style(term):
        if term in STYLE_MAP:
            style_terms.append(STYLE_MAP[term])

    for t in rest:
        if t in ('light', 'thin'):
            add_style('light')
        elif t in ('bold', 'fat'):
            add_style('fat')
        elif t in ('double', 'rounded', 'outline', 'filled', 'fill', 'sharp', 'simple'):
            add_style(t)
        elif t == 'dashed':
            # Відрізняємо від stipple
            style_terms.append('штрихова')
        elif t == 'stipple':
            style_terms.append('пунктирна')
        elif t == 'inner':
            style_terms.append('внутрішня')
        elif t == 'outer':
            style_terms.append('зовнішня')
        elif t == 'round':
            # Для кутів: закруглена
            style_terms.append('закруглена')
        elif t == 'circle':
            extras.append('з колом')

    # База (сутність): кут / Т‑перетин / перехрестя / горизонтальна / вертикальна / меню / згин
    has_vert = 'vertical' in rest
    has_horz = 'horizontal' in rest
    has_menu = 'menu' in rest
    has_fold = 'fold' in rest

    # Побудова напрямків, що присутні у ключі
    def dir_phrase(ts):
        return build_direction(ts)

    name = None

    if has_menu:
        if has_horz:
            name = 'Горизонтальне меню' + dir_phrase(rest)
        elif has_vert:
            name = 'Вертикальне меню' + dir_phrase(rest)
        else:
            name = 'Меню' + dir_phrase(rest)
    elif has_vert and has_horz:
        # повне перехрестя
        name = 'Перехрестя' + dir_phrase(rest)
    else:
        # Кути: комбінації up/down з left/right
        has_up = 'up' in rest
        has_down = 'down' in rest
        has_left = 'left' in rest
        has_right = 'right' in rest

        if (has_up or has_down) and (has_left or has_right):
            # Кут з уточненням напряму: "вниз ліворуч" тощо
            dir_parts = []
            if has_up:
                dir_parts.append(DIR_MAP['up'])
            if has_down and not has_up:
                dir_parts.append(DIR_MAP['down'])
            # ліво/право
            if has_left:
                dir_parts.append(DIR_MAP['left'])
            if has_right and not has_left:
                dir_parts.append(DIR_MAP['right'])
            name = 'Кут ' + ' '.join(dir_parts)
        elif has_horz:
            # Горизонтальні лінії або Т‑перетини вгору/вниз
            if has_up or has_down:
                name = 'Т‑перетин' + dir_phrase(rest)
            else:
                name = 'Горизонтальна'
        elif has_vert:
            if has_left or has_right:
                name = 'Т‑перетин' + dir_phrase(rest)
            else:
                name = 'Вертикальна'
        elif has_fold:
            name = 'Згин' + dir_phrase(rest)
        else:
            # загальний елемент
            name = 'Елемент рамки' + dir_phrase(rest)

    # Формування стилів у дужках
    # Злиття стилів, переданих із кінця ключа (styles) і з середини (style_terms)
    merged_styles = list(dict.fromkeys(styles + style_terms + extras))
    return cap(name) + join_styles(merged_styles)


def translate_burger(tokens, styles):
    # burger-...
    rest = tokens[1:]
    name = 'Бургер'
    parts = []
    for t in rest:
        if t in ('duotone', 'light', 'bold', 'thin', 'solid', 'remix'):
            continue
        parts.append(TOKEN_MAP.get(t, t))
    if parts:
        name += ' ' + ' '.join(parts)
    return cap(name) + join_styles(styles)


def translate_computer(tokens, styles):
    # computer-* → стислі назви за головним предметом
    rest = tokens[1:]
    # перенесемо форму у стилі
    kept = []
    for t in rest:
        if t in ('circle', 'square'):
            styles.append(STYLE_MAP[t])
        else:
            kept.append(t)
    tset = set(kept)

    def has(*words):
        return all(w in tset for w in words)

    # Пріоритети
    if 'pc' in tset:
        return 'ПК' + join_styles(styles)
    if 'printer' in tset:
        return 'Принтер' + join_styles(styles)
    if 'ram' in tset:
        return 'Оперативна пам’ять' + join_styles(styles)
    if 'webcam' in tset:
        return 'Вебкамера' + join_styles(styles)
    if has('screen', 'curve') or has('screen', 'curved'):
        return 'Вигнутий екран' + join_styles(styles)
    if has('screen', 'imac'):
        base = 'Екран iMac'
        if 'download' in tset:
            base += ' завантаження'
        return base + join_styles(styles)
    if 'screen' in tset:
        return 'Екран' + join_styles(styles)
    if 'tv' in tset or 'television' in tset:
        return 'Телевізор' + join_styles(styles)
    if has('smart', 'watch'):
        return 'Розумний годинник' + join_styles(styles)
    if has('storage', 'floppy') or has('floppy', 'disk'):
        return 'Дискета' + join_styles(styles)
    if has('storage', 'hard') or has('hard', 'disk') or has('hard', 'drive'):
        return 'Жорсткий диск' + join_styles(styles)
    if has('virtual', 'reality') or 'vr' in tset:
        return 'VR гарнітура' + join_styles(styles)
    if has('voice', 'mail'):
        base = 'Голосова пошта'
        if 'off' in tset or 'mute' in tset:
            base += ' вимкнено'
        return base + join_styles(styles)
    if 'robot' in tset or 'android' in tset:
        return 'Робот' + join_styles(styles)

    # загальний випадок
    return 'Комп’ютер' + join_styles(styles)


def translate_breast(tokens, styles):
    # breast-feeding-toneX
    phrase = 'Грудне вигодовування'
    rest = tokens[1:]
    for t in rest:
        if t.startswith('tone'):
            num = t.replace('tone', '')
            if num:
                phrase += f' (тон {num})'
            break
    return cap(phrase) + join_styles(styles)


def translate_browser(tokens, styles):
    # browser-...-(line|solid|remix)
    rest = tokens[1:]
    tail_styles = []
    name = 'Браузер'
    action_map = {
        'add': 'додати',
        'block': 'блок',
        'check': 'галочка',
        'cookie': 'куки',
        'delete': 'видалити',
        'hash': 'хеш',
        'lock': 'замок',
        'remove': 'видалити',
        'wifi': 'Wi‑Fi',
        'ltr': 'LTR',
        'rtl': 'RTL',
        'line': None,
        'solid': None,
        'remix': None,
    }
    for t in rest:
        if t in ('line', 'solid', 'remix'):
            if t == 'line':
                tail_styles.append('контурна')
            elif t == 'solid':
                tail_styles.append('суцільна')
            else:
                tail_styles.append('Remix')
        elif t in action_map and action_map[t]:
            name += ' ' + action_map[t]
    merged_styles = list(dict.fromkeys(styles + tail_styles))
    return cap(name) + join_styles(merged_styles)


def translate_brightness(tokens, styles):
    # brightness [N] (line|solid|remix)
    rest = tokens[1:]
    name = 'Яскравість'
    tail_styles = []
    for t in rest:
        if t.isdigit():
            name += f' {t}'
        elif t == 'line':
            tail_styles.append('контурна')
        elif t == 'solid':
            tail_styles.append('суцільна')
        elif t == 'remix':
            tail_styles.append('Remix')
    merged = list(dict.fromkeys(styles + tail_styles))
    return cap(name) + join_styles(merged)


def translate_bubble(tokens, styles):
    # bubble chat ... → коротше як «Чат …»
    rest = tokens[1:]
    name = 'Чат'
    tail = []
    style_terms = []
    mapping = {
        'check': 'галочка',
        'text': 'текст',
        'quote': 'цитата',
        'like': 'лайк',
        'typing': 'друк',
        'smiley': 'смайлик',
        # 'face' опускаємо для стислості
        'double': None,
        'forward': 'вперед',
        'setting': 'налаштування',
    }
    if 'double' in rest:
        style_terms.append('подвійна')
    for t in rest:
        if t in mapping and mapping[t]:
            tail.append(mapping[t])
    if tail:
        name += ' ' + ' '.join(tail)
    merged = list(dict.fromkeys(styles + style_terms))
    return cap(name) + join_styles(merged)


def translate_bug(tokens, styles):
    # bug antivirus debugging / bug virus ... (remix|solid)
    rest = tokens[1:]
    name = 'Баг'
    parts = []
    for t in rest:
        if t in ('remix', 'solid', 'line'):
            continue
        parts.append({
            'antivirus': 'антивірус',
            'debugging': 'налагодження',
            'virus': 'вірус',
            'document': 'документ',
            'folder': 'тека',
        }.get(t, t))
    if parts:
        name += ' ' + ' '.join(parts)
    return cap(name) + join_styles(styles)


def translate_business(tokens, styles):
    # business ...
    rest = tokens[1:]
    name = 'Бізнес'
    parts_map = {
        'card': 'картка',
        'chart': 'діаграма',
        'chat': 'чат',
        'dual': 'подвійний',
        'screen': 'екран',
        'window': 'вікно',
        'female': 'жінка',
        'male': 'чоловік',
        'handshake': 'рукостискання',
        'hierarchy': 'ієрархія',
        'idea': 'ідея',
        'laptop': 'ноутбук',
        'magic': 'магія',
        'rabbit': 'кролик',
        'network': 'мережа',
        'pick': 'вибір',
        'profession': 'професія',
        'home': 'дім',
        'office': 'офіс',
        'question': 'питання',
        'scale': 'ваги',
        'startup': 'стартап',
        'mobile': 'мобільний',
        'suitcase': 'валіза',
        'target': 'мішень',
        'user': 'користувач',
        'curriculum': 'резюме',
        'work': 'робоча',
        'station': 'станція',
        'print': 'друк',
        'circle': 'коло',
        'off': 'вимкнено',
        'dollar': 'долар',
    }
    parts = []
    i = 0
    while i < len(rest):
        t = rest[i]
        if t in ('remix', 'solid', 'line'):
            i += 1
            continue
        # комбінація light bulb → лампочка
        if t == 'light' and i + 1 < len(rest) and rest[i+1] == 'bulb':
            parts.append('лампочка')
            i += 2
            continue
        parts.append(parts_map.get(t, t))
        i += 1
    if parts:
        name += ' ' + ' '.join(parts)
    return cap(name) + join_styles(styles)


def translate_button(tokens, styles):
    # button play/stop/next/previous/... (remix|solid)
    rest = tokens[1:]
    name = 'Кнопка'
    parts_map = {
        'play': 'відтворити',
        'stop': 'зупинити',
        'pause': 'пауза',
        'record': 'запис',
        'next': 'далі',
        'previous': 'назад',
        'rewind': 'перемотка',
        'fast': 'швидка',
        'forward': 'перемотка вперед',
    }
    parts = []
    for t in rest:
        if t in ('remix', 'solid', 'line'):
            continue
        parts.append(parts_map.get(t, t))
    if parts:
        name += ' ' + ' '.join(parts)
    return cap(name) + join_styles(styles)


def translate_bullet(tokens, styles):
    # bullet / bulletin ...
    head = tokens[0]
    rest = tokens[1:]
    if head == 'bulletin':
        base = 'Оголошення'
    else:
        base = 'Маркер'
    parts_map = {
        'notice': 'повідомлення',
        'circle': 'коло',
        'off': 'вимкнено',
        'square': 'квадрат',
        'text': 'текст',
    }
    parts = []
    for t in rest:
        if t in ('remix', 'solid', 'line'):
            continue
        parts.append(parts_map.get(t, t))
    name = base
    if parts:
        name += ' ' + ' '.join(parts)
    return cap(name) + join_styles(styles)


def translate_content(tokens, styles):
    # content-... → короткі дії без слова «контент»
    rest = tokens[1:]
    if rest[:2] == ['add', 'file']:
        return 'Додати файл' + join_styles(styles)
    if rest[:2] == ['add', 'folder']:
        return 'Додати теку' + join_styles(styles)
    if rest and rest[0] == 'bookmark':
        return 'Закладка' + join_styles(styles)
    if rest and rest[0] == 'box':
        return 'Блок' + join_styles(styles)
    # загальний випадок
    words = [TOKEN_MAP.get(t, t) for t in rest]
    return cap(' '.join(words)) + join_styles(styles)


def main():
    data = json.loads(SRC.read_text(encoding='utf-8'))
    out = {}
    for k in data.keys():
        v = translate_key(k)
        out[k] = v
    SRC.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding='utf-8')


if __name__ == '__main__':
    main()

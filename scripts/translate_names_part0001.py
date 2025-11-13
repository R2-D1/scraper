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
    'solid': 'суцільна',
    'line': 'контурна',
    'outline': 'контурна',
    'o': 'контурна',
    'rounded': 'закруглена',
    'sharp': 'гостра',
    'simple': 'проста',
    'alt': 'альтернативна',
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
    'airpods': 'AirPods',
    'airdrop': 'AirDrop',
    'airbnb': 'Airbnb',
    'avalanche': 'Avalanche',
    'avax': 'AVAX',
    'binance': 'Binance',
    'bnb': 'BNB',
    'busd': 'BUSD',
    'carplay': 'CarPlay',
}

# Брендові фрази (декілька токенів)
BRAND_PHRASES = {
    'app-store': 'App Store',
    'apple-podcasts': 'Apple Podcasts',
    'apple-intelligence': 'Apple Intelligence',
    'ny-times': 'NY Times',
    'medium': 'Medium',
    'home-assistant': 'Home Assistant',
}

# Готові фразові відповідники (спочатку більш специфічні)
PHRASE_MAP = {
    '3rd-party-connected': 'Стороння інтеграція підключено',
    'absolute-position': 'Абсолютне позиціонування',
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
    'academic-hat': 'Випускна шапка',
    'academy-cap': 'Випускна шапка',
    'ad': 'Реклама',
    'ad-circle': 'Реклама',
    'ad-rectangle': 'Реклама',
    'accordion-menu': 'Меню акордеон',
    'accessible-icon': 'Значок доступності',
    'accessibility': 'Доступність',
    'album': 'Альбом',
    'alert': 'Увага',
    'air-balloon': 'Повітряна куля',
    'air-conditioner': 'Кондиціонер',
    'air-condition': 'Кондиціонер',
    'airline': 'Авіалінії',
    'airport-location': 'Локація аеропорту',
    'american-football': 'Американський футбол',
    'angles-left': 'Подвійний шеврон ліворуч',
    'angles-right': 'Подвійний шеврон праворуч',
    'angles-up': 'Подвійний шеврон вгору',
    'angles-down': 'Подвійний шеврон вниз',
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

def translate_simple_with_vocab(tokens, styles):
    # Простий переклад токенів за словником
    VOC = {
        'ad': 'Реклама',
        'album': 'Альбом',
        'alert': 'Увага',
        'aiming': 'Прицілювання',
        'air': 'Повітря',
        'balloon': 'куля',
        'condition': 'кондиціонер',
        'conditioner': 'кондиціонер',
        'open': 'відкритий',
        'off': 'вимкнено',
        'airport': 'Аеропорт',
        'location': 'локація',
        'airline': 'Авіалінії',
        'digital': 'цифровий',
        'gate': 'вихід',
        'manage': 'керування',
        'passenger': 'пасажир',
        'care': 'догляд',
        'rapid': 'швидка',
        'board': 'посадка',
        'accessibility': 'Доступність',
        'alt': 'альт',
        'color': 'колір',
        'accordion': 'акордеон',
        'menu': 'меню',
        'accumulation': 'накопичення',
        'ice': 'лід',
        'precipitation': 'опади',
        'rain': 'дощ',
        'drizzle': 'мряка',
        'fog': 'туман',
        'snow': 'сніг',
        'wind': 'вітер',
        'lightning': 'блискавка',
        'accept': 'прийняти',
        'action': 'дія',
        'definition': 'визначення',
        'usage': 'використання',
        'add': 'додати',
        'queue': 'черга',
        'child': 'дочірній',
        'parent': 'батьківський',
        'node': 'вузол',
        'adjust': 'налаштування',
        'aerial': 'канатний',
        'lift': 'підйомник',
        'aeroplane': 'літак',
        'aggregator': 'агрегатор',
        'count': 'лічити',
        'rows': 'рядки',
        'recalculation': 'перерахунок',
        'agriculture': 'сільське господарство',
        'analytics': 'аналітика',
        'diamond': 'ромб',
        'octagon': 'восьмикутник',
        'circle': 'коло',
        'square': 'квадрат',
        # 3D та суміжні
        '3d': '3D',
        'cursor': 'курсор',
        'curve': 'крива',
        'auto': 'авто',
        'colon': 'товста кишка',
        'vessels': 'судини',
        'manual': 'ручна',
        'mpr': 'MPR',
        'toggle': 'перемикач',
        'print': 'друк',
        'mesh': 'сітка',
        'software': 'ПЗ',
        # логічні/збірки/масиви/арифметика
        'and': 'і',
        'arithmetic': 'арифметичне',
        'mean': 'середнє',
        'median': 'медіана',
        'arrange': 'упорядкувати',
        'horizontal': 'горизонтально',
        'vertical': 'вертикально',
        'array': 'масив',
        'booleans': 'булеві',
        'dates': 'дати',
        'numbers': 'числа',
        'objects': 'об’єкти',
        'strings': 'рядки',
        # стани/режими
        'asleep': 'спить',
        'awake': 'не спить',
        'async': 'асинхронно',
        # збірки/ресурси
        'assembly': 'збірка',
        'cluster': 'кластер',
        'reference': 'довідка',
        'asset': 'актив',
        'confirm': 'підтвердити',
        'movement': 'рух',
        'view': 'перегляд',
        # аудіо/авто
        'audio': 'аудіо',
        'console': 'пульт',
        'tape': 'касета',
        'auto': 'авто',
        'hold': 'утримання',
        'scroll': 'прокрутка',
        'autoscaling': 'автомасштабування',
        # сортування AZ
        'az': 'А-Я',
        'sort': 'сортування',
        'ascending': 'зростання',
        'descending': 'спадання',
        'letters': 'літери',
        # графіки/смуги
        'bar': 'стовпчикова',
        'chart': 'діаграма',
        'h': 'горизонтальна',
        'v': 'вертикальна',
        'bars': 'смуги',
        'bottom': 'знизу',
        'center': 'центр',
        'left': 'ліворуч',
        'right': 'праворуч',
        'arrow': 'стрілка',
        'filter': 'фільтр',
        'sort': 'сортування',
        # інше
        'base': 'базовий',
        'document': 'документ',
        'set': 'набір',
        'bastion': 'бастіон',
        'host': 'хост',
        'batch': 'пакетне',
        'job': 'завдання',
        'step': 'крок',
        # решта з вибірки
        'anniversary': 'річниця',
        'annotation': 'анотація',
        'visibility': 'видимість',
        'angles': 'кути',
        'ghost': 'привид',
        'annoyed': 'роздратований',
        'app': 'застосунок',
        'connectivity': 'підключення',
        'gallery': 'галерея',
        'archives': 'архіви',
        'area': 'область',
        'custom': 'користувацька',
        'select': 'вибір',
        'backboard': 'щит',
        'backspace': 'Backspace',
        'bare': 'bare',
        'metal': 'metal',
        'server': 'сервер',
        'beachball': 'пляжний м’яч',
        'bee': 'бджола',
        'bat': 'кажан',
        'beverage': 'напій',
        'big': 'Біг',
        'ben': 'Бен',
        'binding': 'зв’язування',
        'black': 'чорний',
        'berry': 'ягода',
        'bland': 'бленд',
        'altman': 'Олтман',
        'plot': 'графік',
        'blessing': 'благословення',
        'bling': 'блиск',
        'bloch': 'Блох',
        'sphere': 'сфера',
        'block': 'блок',
        'storage': 'сховище',
        'bluesky': 'Bluesky',
        'social': 'соціальна',
        'boolean': 'булевий',
        'border': 'рамка',
        'blank': 'порожня',
        'bottle': 'пляшка',
        'glass': 'скло',
        'bottles': 'пляшки',
        'container': 'контейнер',
        'bowknot': 'бант',
        'box': 'коробка',
        'extra': 'дуже',
        'large': 'велика',
        'medium': 'середня',
        'small': 'мала',
        'packed': 'запакована',
        'unpacked': 'розпакована',
        'brand': 'бренд',
        'home': 'Home',
        'assistant': 'Assistant',
        'breaking': 'несумісна',
        'change': 'зміна',
        'brief': 'коротко',
        'brightness': 'яскравість',
        'contrast': 'контраст',
        'bring': 'перенести',
        'front': 'на передній план',
        'brush': 'пензель',
        'big': 'великий',
        'freehand': 'вільна рука',
        'polygon': 'багатокутник',
        'bsam': 'BSAM',
        'qsam': 'QSAM',
        'zedc': 'ZEDC',
        'build': 'зібрати',
        'image': 'образ',
        'run': 'запуск',
        'tool': 'інструмент',
        'burj': 'Бурдж',
        'khalifa': 'Халіфа',
        'tower': 'вежа',
        'business': 'бізнес',
        'metrics': 'метрики',
        'processes': 'процеси',
        'buss': 'buss',
        'button': 'кнопка',
        'centered': 'по центру',
        'cad': 'CAD',
        'calc': 'кальк',
        'calculator': 'калькулятор',
        'check': 'перевірка',
        'calendar': 'календар',
        'briefcase': 'портфель',
        'envelope': 'конверт',
        'heat': 'теплова',
        'map': 'мапа',
        'tools': 'інструменти',
        'calls': 'дзвінки',
        'all': 'усі',
        # камера/авто/пристрої/чат
        'camera': 'камера',
        'car': 'авто',
        'sideview': 'вигляд збоку',
        'window': 'вікно',
        'slash': 'перекреслено',
        'ai': 'ШІ',
        'carbon': 'Carbon',
        'accounting': 'облік',
        'for': 'для',
        'ibm': 'IBM',
        'dotcom': 'dotcom',
        'product': 'продукт',
        'mobile': 'мобільний',
        'ui': 'UI',
        'builder': 'конструктор',
        'card': 'картка',
        'atm': 'банкомат',
        'pay': 'оплата',
        'refund': 'повернення',
        'cardano': 'Cardano',
        'ada': 'ADA',
        'cardboard': 'Cardboard',
        'vr': 'VR',
        'cart': 'кошик',
        'shopping': 'покупки',
        'catalog': 'каталог',
        'publish': 'публікація',
        'categories': 'категорії',
        'category': 'категорія',
        'new': 'нова',
        'each': 'кожна',
        'ccx': 'CCX',
        'cd': 'CD',
        'create': 'створити',
        'exchange': 'обмін',
        'cda': 'CDA',
        'ceiling': 'стельова',
        'lamp': 'лампа',
        'celebrate': 'святкувати',
        'cellphone': 'телефон',
        'vibration': 'вібрація',
        'channels': 'канали',
        'character': 'символ',
        'decimal': 'десятковий',
        'fraction': 'дріб',
        'integer': 'ціле',
        'lower': 'нижній',
        'upper': 'верхній',
        'case': 'регістр',
        'negative': 'від’ємне',
        'number': 'число',
        'whole': 'ціле',
        'patterns': 'шаблони',
        'sentence': 'речення',
        'chat': 'чат',
        'bubble': 'хмаринка',
        'dots': 'крапки',
        'user': 'користувач',
        'launch': 'запуск',
        'chevron': 'шеврон',
        'cheveron': 'шеврон',
        'checkbox': 'прапорець',
        'undeterminate': 'невизначений',
        'indeterminate': 'невизначений',
        'checkmark': 'галочка',
        'error': 'помилка',
        'warning': 'попередження',
        'choices': 'вибір',
        'choose': 'вибрати',
        'item': 'елемент',
        'christ': 'Христос',
        'the': '—',
        'redeemer': 'Спаситель',
        'christmas': 'різдвяна',
        'hat': 'шапка',
        'chines': 'китайський',
        'knot': 'вузол',
        'cics': 'CICS',
        'db2': 'DB2',
        'connection': 'з’єднання',
        'explorer': 'Explorer',
        'program': 'програма',
        'region': 'регіон',
        'routing': 'маршрутизація',
        'target': 'ціль',
        'sit': 'SIT',
        'overrides': 'перевизначення',
        'system': 'система',
        'group': 'група',
        'wui': 'WUI',
        'cicsplex': 'CICSPlex',
        'circuit': 'схема',
        'composer': 'конструктор',
        'classifier': 'класифікатор',
        'language': 'мова',
        'classify': 'класифікувати',
        'clock': 'годинник',
        'eleven': 'одинадцять',
        'four': 'чотири',
        'hand': 'стрілка',
        'hexagon': 'шестикутник',
        'one': 'один',
        # хмара та сервіси
        'cloud': 'Хмара',
        'alerting': 'сповіщення',
        'auditing': 'аудит',
        'data': 'дані',
        'ops': 'операції',
        'database': 'база даних',
        'tree': 'дерево',
        'foundry': 'Foundry',
        'info': 'інфо',
        'logging': 'логування',
        'monitoring': 'моніторинг',
        'moon': 'місяць',
        'hail': 'град',
        'meatball': 'злива',
        'showers': 'зливи',
        'tear': 'крапля',
        'redo': 'повтор',
        'registry': 'реєстр',
        'satellite': 'супутник',
        'config': 'конфігурація',
        'link': 'посилання',
        'service': 'сервіс',
        'management': 'керування',
        'services': 'сервіси',
        'shield': 'щит',
        'sun': 'сонце',
        # акроніми
        'ica': 'ICA',
        'abs': 'ABS',
        # дрібні
        'sign': 'знак',
        'waves': 'хвилі',
        'archive': 'архів',
        'cmas': 'CMAS',
    }
    out = []
    for t in tokens:
        out.append(VOC.get(t, t))
    return cap(' '.join(out)) + join_styles(styles)

def translate_cloud(tokens, styles):
    # Спеціальні погодні та хмарні варіанти для природніших назв
    t = tokens[:]
    if t and t[0] == 'cloud':
        t = t[1:]

    # Варіанти з небесними тілами
    if t[:1] == ['moon']:
        rest = t[1:]
        if rest[:1] == ['hail']:
            return cap('Місяць і град') + join_styles(styles)
        if rest[:1] == ['meatball']:
            return cap('Місяць і злива') + join_styles(styles)
        if rest[:1] == ['rain']:
            return cap('Місяць і дощ') + join_styles(styles)
        if rest[:1] == ['showers']:
            return cap('Місяць і зливи') + join_styles(styles)
        if rest[:1] == ['tear']:
            return cap('Місяць і крапля') + join_styles(styles)
        return cap('Хмара і місяць') + join_styles(styles)

    if t[:1] == ['sun']:
        rest = t[1:]
        if rest[:1] == ['hail']:
            return cap('Сонце і град') + join_styles(styles)
        if rest[:1] == ['meatball']:
            return cap('Сонце і злива') + join_styles(styles)
        if rest[:1] == ['rain']:
            return cap('Сонце і дощ') + join_styles(styles)
        if rest[:1] == ['showers']:
            return cap('Сонце і зливи') + join_styles(styles)

    # Погодні явища
    if t[:1] == ['lightning']:
        return cap('Хмара з блискавкою') + join_styles(styles)
    if t[:1] == ['drizzle']:
        return cap('Мряка') + join_styles(styles)
    if t[:1] == ['fog']:
        return cap('Туман') + join_styles(styles)
    if t[:1] == ['hail']:
        return cap('Град') + join_styles(styles)
    if t[:1] == ['rain']:
        if len(t) >= 2 and t[1] == 'wind':
            return cap('Дощ і вітер') + join_styles(styles)
        return cap('Дощ') + join_styles(styles)
    if t[:1] == ['showers']:
        return cap('Зливи') + join_styles(styles)
    if t[:1] == ['snow']:
        return cap('Сніг') + join_styles(styles)

    # Хмарні сервіси/операції
    SERVICE_MAP = {
        'alerting': 'Хмарні сповіщення',
        'app': 'Хмарний застосунок',
        'auditing': 'Хмарний аудит',
        'ceiling': 'Хмарна стеля',
        'data': 'Хмарні дані',
        'data-ops': 'Хмарні операції з даними',
        'database-tree': 'Дерево хмарної бази даних',
        'info': 'Інфо про хмару',
        'logging': 'Хмарне логування',
        'monitoring': 'Хмарний моніторинг',
        'redo': 'Оновити хмару',
        'registry': 'Хмарний реєстр',
        'satellite': 'Хмарний супутник',
        'satellite-config': 'Конфігурація хмарного супутника',
        'satellite-link': 'Посилання хмарного супутника',
        'satellite-services': 'Сервіси хмарного супутника',
        'service-management': 'Керування хмарними сервісами',
        'services': 'Хмарні сервіси',
        'shield': 'Захист хмари',
    }
    key = '-'.join(t)
    if key in SERVICE_MAP:
        return cap(SERVICE_MAP[key]) + join_styles(styles)
    return None

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
        return BRANDS[tokens[0]] + join_styles(styles)
    # fallback: простий словниковий переклад токенів
    return translate_simple_with_vocab(tokens, styles)

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

    # Спеціальні випадки чисел: N-plus → "N плюс"
    if len(tokens) == 2 and tokens[0].isdigit() and tokens[1] == 'plus':
        return f"{tokens[0]} плюс" + join_styles(styles)

    # Брендові логотипи на кшталт amazon-logo, app-store-logo, apple-pодкасти-logo
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
    if head == 'application':
        tail = [
            {'mobile': 'мобільний', 'virtual': 'віртуальний', 'web': 'веб'}.get(t, t)
            for t in rest
        ]
        phrase = 'Застосунок'
        if tail:
            phrase += ' ' + ' '.join(tail)
        return cap(phrase) + join_styles(styles)
    if head == 'alarm':
        # Будильник з модифікаторами
        rest_map = {
            'check': 'із позначкою',
            'minus': 'мінус',
            'plus': 'плюс',
            'smoke': 'дим',
            'snooze': 'дрімота',
            'subtract': 'мінус',
            'x': 'хрестик',
        }
        parts = []
        for t in rest:
            parts.append(rest_map.get(t, t))
        phrase = 'Будильник'
        if parts:
            phrase += ' ' + ' '.join(parts)
        return cap(phrase) + join_styles(styles)
    if head == 'alert':
        # Увага + форма (як іменник)
        parts = []
        for t in rest:
            if t in ('diamond','octagon','circle','square','hexagon'):
                parts.append({'diamond':'ромб','octagon':'восьмикутник','circle':'коло','square':'квадрат','hexagon':'шестикутник'}[t])
            else:
                parts.append(t)
        phrase = 'Увага'
        if parts:
            phrase += ' ' + ' '.join(parts)
        return cap(phrase) + join_styles(styles)
    if head == 'ad':
        # Реклама + форма
        token_map = {
            'circle': 'коло',
            'square': 'квадрат',
            'octagon': 'восьмикутник',
            'diamond': 'ромб',
            'rectangle': 'прямокутник',
            'off': 'вимкнено',
        }
        parts = []
        for t in rest:
            parts.append(token_map.get(t, t))
        phrase = 'Реклама'
        if parts:
            phrase += ' ' + ' '.join(parts)
        return cap(phrase) + join_styles(styles)
    if head == 'album':
        return cap('Альбом') + join_styles(styles)
    if head == 'airplay':
        # Брендова назва
        return BRANDS['airplay'] + join_styles(styles)
    if head == 'air':
        # air-balloon, air-condition
        if rest[:1] == ['balloon']:
            return cap('Повітряна куля') + join_styles(styles)
        if rest[:1] == ['condition']:
            tail = rest[1:]
            phrase = 'Кондиціонер'
            if tail:
                m = {'open': 'відкритий'}
                mapped = [m.get(t, t) for t in tail if t != 'line']
                if mapped:
                    phrase += ' ' + ' '.join(mapped)
            return cap(phrase) + join_styles(styles)
    if head == 'airplane':
        # Спробуємо знайти фразову відповідність
        joined = '-'.join(tokens)
        for n in range(len(tokens), 0, -1):
            sub = '-'.join(tokens[:n])
            if sub in PHRASE_MAP:
                return cap(PHRASE_MAP[sub]) + join_styles(styles)
        return cap(PHRASE_MAP['airplane']) + join_styles(styles)
    if head == 'airline':
        return cap('Авіалінії ' + ' '.join(rest)) + join_styles(styles)
    if head == 'airport' and rest[:1] == ['location']:
        return cap('Локація аеропорту') + join_styles(styles)
    if head == 'address' and len(tokens) >= 2 and tokens[1] == 'book':
        if len(tokens) >= 3 and tokens[2] == 'tabs':
            phrase = PHRASE_MAP['address-book-tabs']
        else:
            phrase = PHRASE_MAP['address-book']
        return cap(phrase) + join_styles(styles)
    if head == 'air' and '-'.join(tokens).startswith('air-traffic-control'):
        return cap(PHRASE_MAP['air-traffic-control']) + join_styles(styles)
    if head == 'ai':
        # ШІ + опис
        vocab = {
            'business': 'бізнес',
            'impact': 'вплив',
            'assessment': 'оцінка',
            'financial': 'фінансова',
            'sustainability': 'стійкість',
            'check': 'перевірка',
            'governance': 'керування',
            'lifecycle': 'життєвий цикл',
            'tracked': 'відстежуване',
            'untracked': 'не відстежуване',
            'label': 'мітка',
            'launch': 'запуск',
            'recommend': 'рекомендація',
            'results': 'результати',
            'high': 'високі',
            'low': 'низькі',
            'medium': 'середні',
            'very': 'дуже',
            'urgent': 'термінові',
            'status': 'статус',
            'complete': 'завершено',
            'failed': 'помилка',
            'in': 'у',
            'progress': 'процесі',
            'queued': 'в черзі',
            'rejected': 'відхилено',
        }
        parts = [vocab.get(t, t) for t in rest]
        phrase = 'ШІ'
        if parts:
            phrase += ' ' + ' '.join(parts)
        return cap(phrase) + join_styles(styles)

    # Спеціальна обробка хмар
    if head == 'cloud':
        phr = translate_cloud(tokens, styles)
        if phr:
            return phr

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

#!/usr/bin/env python3
import json
import re
from pathlib import Path

# This script performs a controlled, rule-based translation of icon names
# in translations/missing-translations/names/part-0004.json into Ukrainian,
# following translations/names-translation-instruction.md.

SRC = Path('translations/missing-translations/names/part-0004.json')

# Style markers to Ukrainian (appear as suffix tokens)
STYLE_MAP = {
    'line': 'контурна',
    'solid': 'суцільна',
    'filled': 'заповнена',
    'alt': 'альтернативна',
    'o': 'контурна',  # e.g., circle-o, paperplane-o
}

# Abbreviations / tokens to keep (uppercase or canonical)
KEEP_UPPER = {
    'ai': 'AI', 'ml': 'ML', 'pdf': 'PDF', 'nfc': 'NFC', 'mpeg': 'MPEG', 'mpg2': 'MPG2',
    'api': 'API', 'ui': 'UI', 'ux': 'UX', '3d': '3D', 'db': 'DB', 'sql': 'SQL', 'wifi': 'WiFi',
    'r': 'R', 'ibm': 'IBM', 'vmware': 'VMware', 'vpc': 'VPC', 'aws': 'AWS', 'ios': 'iOS',
    'ndb': 'NDB', 'dme': 'DME', 'vor': 'VOR', 'vordme': 'VOR/DME', 'vortac': 'VORTAC', 'tacan': 'TACAN',
    'vhfor': 'VHF/OR', # best-effort
    'dns': 'DNS', 'ip': 'IP', 'id': 'ID', 'cny': 'CNY', 'ppt': 'PPT', 'qc': 'QC', 'qrcode': 'QR-код',
}

# Logo/brand tokens to title-case or canonical brand form
BRAND_CANON = {
    'ansible': 'Ansible',
    'community': 'Community',
    'bluesky': 'Bluesky',
    'delicious': 'Delicious',
    'digg': 'Digg',
    'git': 'Git',
    'glassdoor': 'Glassdoor',
    'invision': 'InVision',
    'jupyter': 'Jupyter',
    'keybase': 'Keybase',
    'kubernetes': 'Kubernetes',
    'livestream': 'Livestream',
    'openshift': 'OpenShift',
    'quora': 'Quora',
    'sketch': 'Sketch',
    'stumbleupon': 'StumbleUpon',
    'svelte': 'Svelte',
    'vmware': 'VMware',
    'yelp': 'Yelp',
    'red': 'Red', 'hat': 'Hat', 'ibm': 'IBM', 'cloud': 'Cloud', 'script': 'Script',
}

# Number word mapping
NUM_WORD = {
    'zero': 'Нуль', 'one': 'Один', 'two': 'Два', 'three': 'Три', 'four': 'Чотири', 'five': 'П’ять',
    'six': 'Шість', 'seven': 'Сім', 'eight': 'Вісім', 'nine': 'Дев’ять', 'ten': 'Десять',
}

# General token translation map (focused, not exhaustive). Keep concise nouns/verbs.
T = {
    # Common actions / states
    'add': 'Додати', 'remove': 'Вилучити', 'edit': 'Редагувати', 'delete': 'Видалити', 'save': 'Збереження',
    'open': 'Відкрити', 'close': 'Закрити', 'closed': 'Закрито', 'opened': 'Відкрито', 'selected': 'Вибране',
    'select': 'Вибір', 'send': 'Надіслати', 'reply': 'Відповісти', 'check': 'Галочка', 'info': 'Інфо',
    'warning': 'Попередження', 'error': 'Помилка', 'danger': 'Небезпека', 'success': 'Успіх', 'alert': 'Сповіщення',
    'new': 'Нова', 'counter': 'Лічильник', 'upload': 'Завантажити', 'download': 'Завантажити',
    'snooze': 'Відкладання', 'share': 'Поділитися', 'cast': 'Трансляція', 'view': 'Перегляд',
    'play': 'Відтворення', 'pause': 'Пауза', 'stop': 'Стоп', 'record': 'Запис', 'shuffle': 'Перемішати',
    'loop': 'Цикл', 'more': 'Більше', 'unite': 'Об’єднати', 'collapse': 'Згорнути', 'expand': 'Розгорнути',
    'maximize': 'Максимізація', 'minimize': 'Мінімізація',

    # General nouns
    'load': 'Завантаження', 'loading': 'Завантаження', 'balancer': 'Балансувальник', 'local': 'Локальний', 'network': 'Мережа', 'pool': 'Пул',
    'action': 'Дія', 'album': 'Альбом', 'annotation': 'Анотація', 'anticlockwise': 'Проти годинникової',
    'application': 'Застосунок', 'architecture': 'Архітектура', 'area': 'Область', 'artifact': 'Артефакт',
    'auto': 'Авто', 'automate': 'Автоматизувати', 'automation': 'Автоматизація', 'backward': 'Назад',
    'bag': 'Сумка', 'bank': 'Банк', 'bar': 'Смуга', 'bay': 'Затока', 'bell': 'Дзвінок', 'block': 'Блок',
    'border': 'Рамка', 'bottle': 'Пляшка', 'box': 'Коробка', 'branch': 'Гілка', 'branches': 'Гілки',
    'call': 'Дзвінок', 'cancelled': 'Скасовано', 'capacity': 'Місткість', 'card': 'Картка', 'cards': 'Картки',
    'cart': 'Кошик', 'catalog': 'Каталог', 'certificate': 'Сертифікат', 'chart': 'Діаграма', 'clear': 'Очистити',
    'clockwise': 'За годинниковою', 'cloud': 'Хмара', 'code': 'Код', 'coin': 'Монета', 'collection': 'Колекція',
    'combat': 'Бій', 'consumption': 'Споживання', 'container': 'Контейнер', 'copy': 'Копія',
    'counterclockwise': 'Проти годинникової', 'crossed': 'Перекреслено', 'crying': 'Плач', 'cursor': 'Курсор',
    'defroster': 'Обігрів', 'desk': 'Стіл', 'diagonal': 'Діагональ', 'diagram': 'Схема', 'direction': 'Напрям',
    'disabled': 'Вимкнено', 'disaster': 'Лихо', 'disk': 'Диск', 'dollar': 'Долар', 'door': 'Двері', 'dot': 'Крапка',
    'draft': 'Чернетка', 'drizzle': 'Мряка', 'enhanced': 'Розширений',
    'evapotranspiration': 'Евапотранспірація', 'except': 'Окрім', 'expansion': 'Розширення', 'failed': 'Невдача',
    'favorite': 'Вподобане', 'file': 'Файл', 'fine': 'Тонкий', 'flash': 'Спалах', 'fleet': 'Флот', 'fly': 'Летіти',
    'forms': 'Форми', 'forward': 'Вперед', 'front': 'Передній', 'ghost': 'Привид', 'happy': 'Щасливий',
    'heated': 'Обігрів', 'hinton': 'Hinton', 'image': 'Зображення', 'in': 'в', 'input': 'Введення',
    'instructlab': 'InstructLab', 'integration': 'Інтеграція', 'join': 'Приєднати', 'language': 'Мова',
    'lantern': 'Ліхтар', 'lasso': 'Ласо', 'launch': 'Запуск', 'levels': 'Рівні', 'lines': 'Лінії',
    'locate': 'Знайти', 'lower': 'Нижче', 'matrix': 'Матриця', 'metered': 'Лічильний', 'modem': 'Модем',
    'moonrise': 'Схід місяця', 'multiple': 'Кілька', 'old': 'Старий', 'on': 'Увімкнено', 'ops': 'Ops',
    'output': 'Вивід', 'packet': 'Пакет', 'panorama': 'Панорама', 'paper': 'Папір', 'partial': 'Частковий',
    'peoples': 'Люди', 'perform': 'Виконати', 'performance': 'Продуктивність', 'perfumer': 'Парфумер',
    'period': 'Період', 'pest': 'Шкідник', 'pet': 'Домашній улюбленець', 'phone': 'Телефон', 'photo': 'Фото',
    'phrase': 'Фраза', 'pic': 'Зображення', 'pickax': 'Кайло', 'picnic': 'Пікнік', 'pie': 'Пиріг', 'pig': 'Свиня',
    'piggy': 'Скарбничка', 'pills': 'Таблетки', 'pingpong': 'Пінг-понг', 'pinwheel': 'Вітрячок',
    'pipelines': 'Пайплайни', 'pisa': 'Піза', 'pisces': 'Риби', 'pivot': 'Поворот', 'pizza': 'Піца', 'plane': 'Літак',
    'platform': 'Платформа', 'platforms': 'Платформи', 'playground': 'Майданчик', 'playlist': 'Плейлист',
    'plot': 'Графік', 'plugin': 'Плагін', 'pokeball': 'Pokeball', 'polkadot': 'Polkadot', 'pools': 'Пули',
    'pop': 'Поп', 'port': 'Порт', 'post': 'Публікація', 'pot': 'Горщик', 'power': 'Живлення', 'pray': 'Молитися',
    'prescription': 'Рецепт', 'presence': 'Присутність', 'presentation': 'Презентація', 'pricetag': 'Цінник',
    'pricing': 'Ціноутворення', 'print': 'Друк', 'process': 'Процес', 'programming': 'Програмування',
    'progress': 'Прогрес', 'progressbar': 'Полоса прогресу', 'projector': 'Проектор', 'promote': 'Просувати',
    'prompt': 'Підказка', 'property': 'Властивість', 'proposal': 'Пропозиція', 'proxy': 'Проксі', 'pumpkin': 'Гарбуз',
    'punctuation': 'Пунктуація', 'purchase': 'Покупка', 'push': 'Надіслати', 'puzzle': 'Пазл', 'puzzled': 'Здивований',
    'quadrant': 'Квадрант', 'quality': 'Якість', 'query': 'Запит', 'question': 'Питання', 'queued': 'У черзі',
    'quick': 'Швидко', 'quote': 'Цитата',
    'location': 'Локація', 'arrow': 'Стрілка', 'company': 'Компанія', 'crosshairs': 'Приціл', 'current': 'Поточне',
    'food': 'Їжа', 'gas': 'АЗС', 'station': '', 'hazard': 'Небезпека', 'home': 'Дім', 'hotel': 'Готель',
    'marina': 'Причал', 'park': 'Парк', 'person': 'Людина', 'pin': 'Пін', 'point': 'Точка', 'restroom': 'Туалет',
    'shopping': 'Покупки', 'user': 'Користувач', 'x': 'X',
    'lock': 'Замок', 'keyhole': 'Замкова щілина', 'password': 'Пароль', 'square': 'Квадрат', 'waves': 'Хвилі', 'gauge': 'Індикатор',
    'diamond': 'Ромб', 'hexagon': 'Шестикутник', 'octagon': 'Восьмикутник', 'circle': 'Коло',
    'map': 'Карта', 'boundary': 'Межа', 'vegetation': 'Рослинність', 'center': 'Центр', 'identify': 'Ідентифікація',
    'marker': 'Мітка', 'shield': 'Щит', 'slash': 'Перекреслено', 'maple': 'Кленовий', 'leaf': 'лист',
    'margin': 'Відступ', 'left': 'Зліва', 'right': 'Справа', 'top': 'Зверху', 'bottom': 'Знизу',
    'marina': 'Причал', 'marine': 'Морський',
    'math': 'Математика', 'curve': 'Крива', 'square': 'Квадрат',
    'maya': 'Майя', 'pyramids': 'Піраміди',
    'media': 'Медіа', 'medical': 'Медичний', 'full': 'Повний', 'medication': 'Ліки', 'reminder': 'Нагадування',
    'meeting': 'Зустріч', 'board': 'Дошка', 'megafone': 'Мегафон', 'merge': 'Злиття', 'node': 'Вузол',
    'message': 'Повідомлення', 'queue': 'Черга', 'meter': 'Лічильник', 'microservices': 'Мікросервіси',
    'middle': 'Середній', 'finger': 'Палець', 'midi': 'MIDI', 'migrate': 'Міграція', 'military': 'Військовий',
    'mind': 'Ментальна', 'map': 'Карта', 'miniplayer': 'Мініплеєр', 'minus': 'Мінус', 'path': 'Шлях',
    'mirror': 'Дзеркало', 'misuse': 'Зловживання', 'mixed': 'Змішаний', 'rain': 'Дощ', 'hail': 'Град',
    'ml': 'ML', 'model': 'Модель', 'reference': 'Довідка', 'moai': 'Moai', 'mobile': 'Мобільний',
    'android': 'Android', 'audio': 'Аудіо', 'browser': 'Браузер', 'crash': 'Збій', 'device': 'Пристрій', 'devices': 'Пристрої',
    'event': 'Подія', 'request': 'Запит', 'retro': 'Ретро', 'session': 'Сесія', 'signal': 'Сигнал',
    'orientation': 'Орієнтація', 'mobility': 'Мобільність', 'services': 'Сервіси', 'modal': 'Модальне',
    'list': 'Список', 'builder': 'Конструктор', 'foundation': 'Фундація', 'tuned': 'Налаштована',
    'moderate': 'Помірний', 'snow': 'Сніг', 'modified': 'Змінено', 'newest': 'Найновіше', 'oldest': 'Найстаріше',
    'moment': 'Момент', 'monero': 'Monero', 'money': 'Гроші', 'bill': 'Купюра', 'stack': 'Стек',
    'deposit': 'Депозит', 'insert': 'Вставлення', 'withdrawal': 'Зняття', 'moneybag': 'Мішок грошей',
    'monitor': 'Монітор', 'heart': 'Серце', 'rate': 'Пульс', 'monument': 'Пам’ятник', 'mood': 'Настрій',
    'neutral': 'Нейтральний', 'moon': 'Місяць', 'fog': 'Туман', 'star': 'Зірка', 'stars': 'Зірки',
    'moonlight': 'Місячне світло', 'morning': 'Ранок', 'mortarboard': 'Капелюх випускника', 'mosaic': 'Мозаїка',
    'mostly': 'Переважно', 'cloudy': 'Хмарно', 'night': 'Ніч', 'mountain': 'Гора', 'mountains': 'Гори',
    'sun': 'Сонце', 'mouse': 'Миша', 'pointer': 'Вказівник', 'mouth': 'Рот', 'move': 'Рух',
    'horizontal': 'Горизонтальний', 'vertical': 'Вертикальний', 'multiselect': 'Мультивибір', 'mushroom': 'Гриб',
    'music': 'Музика', 'tune': 'Тюнінг',
    'native': 'Рідна', 'button': 'Кнопка', 'name': 'Ім’я', 'space': 'Простір', 'navaid': 'Navaid',
    'civil': 'Цивільний', 'helipad': 'Гелікопад', 'private': 'Приватний', 'seaplane': 'Гідролітак',
    'navigation': 'Навігація', 'necktie': 'Краватка', 'need': 'Потрібно', 'network': 'Мережа', 'admin': 'Адмін',
    'control': 'Керування', 'enterprise': 'Підприємство', 'interface': 'Інтерфейс', 'overlay': 'Накладка',
    'public': 'Публічна', 'time': 'Час', 'protocol': 'Протокол', 'new': 'Нова', 'folder': 'Папка',
    'news': 'Новини', 'nine': 'Дев’ять', 'one': 'Один', 'hexagon': 'Шестикутник', 'octagon': 'Восьмикутник',
    'square': 'Квадрат', 'waves': 'Хвилі', 'switch': 'Перемикач', 'ticket': 'Квиток', 'nominal': 'Номінальний',
    'nominate': 'Номінувати', 'non': 'Без', 'certified': 'сертифікації', 'noodle': 'Локшина', 'bowl': 'Миска',
    'nose': 'Ніс', 'available': 'Доступно', 'found': 'Знайдено', 'sent': 'Надіслано', 'not': 'Не',
    'notebook': 'Нотатник', 'notebooks': 'Нотатники', 'notification': 'Сповіщення', 'null': 'Null',
    'sign': 'Знак', 'number': 'Номер', 'numbers': 'Числа', 'sort': 'Сортування', 'ascending': 'за зростанням',
    'descending': 'за спаданням', 'object': 'Об’єктне', 'storage': 'сховище', 'observed': 'Спостережуваний',
    'lightning': 'Блискавка', 'omega': 'Омега', 'omg': 'OMG', 'open': 'Відкрити', 'panel': 'Панель', 'filled': 'заповнена',
    'inactive': 'Неактивна', 'active': 'Активна', 'operation': 'Операція', 'operations': 'Операції', 'field': 'Поле',
    'order': 'Замовлення', 'details': 'Деталі', 'ordinal': 'Порядковий', 'outage': 'Аварія', 'outlook': 'Прогноз',
    'severe': 'Суворий', 'overflow': 'Переповнення', 'menu': 'Меню', 'horizontal': 'Горизонтальне', 'vertical': 'Вертикальне',
    'overlay': 'Накладення', 'package': 'Пакет', 'text': 'Текст', 'analysis': 'Аналіз', 'pad': 'Пад', 'page': 'Сторінка', 'data': 'Дані', 'cards': 'Картки', 'sidebar': 'Бічна панель',
    'scroll': 'Прокрутка', 'paint': 'Фарба', 'brush': 'Пензель', 'tool': 'Інструмент', 'palace': 'Палац',
    'palette': 'Палітра', 'palete': 'Палітра', 'panel': 'Панель', 'parachute': 'Парашут', 'parent': 'Батько', 'child': 'Дитина',
    'parfum': 'Парфум', 'parking': 'Паркувальні', 'lights': 'вогні', 'part': 'Частина', 'definition': 'Визначення',
    'usage': 'Використання', 'partition': 'Розділ', 'repartition': 'Перерозподіл', 'same': 'Однаковий',
    'specific': 'Специфічний', 'partly': 'Мінлива', 'cloud': 'хмарність', 'daytime': 'вдень', 'night': 'вночі',
    'partnership': 'Партнерство', 'passenger': 'Пасажир', 'drinks': 'напої', 'plus': 'плюс', 'paster': 'Paster',
    'path': 'Шлях', 'future': 'Майбутнє', 'past': 'Минуле', 'pavilion': 'Павільйон', 'paw': 'Лапа', 'pcn': 'PCN',
    'pdf': 'PDF', 'pedestrian': 'Пішохід', 'family': 'Сім’я', 'pen': 'Ручка', 'fountain': 'Перо-ручка', 'pencil': 'Олівець',
    'pentagon': 'П’ятикутник', 'people': 'Люди', 'unknown': 'Невідомо', 'upload': 'Завантажити', 'percentage': 'Відсоток',
    'lollipop': 'Льодяник', 'look': 'Погляд', 'down': 'вниз', 'up': 'вгору', 'right': 'вправо', 'left': 'вліво',
    'logical': 'Логічний', 'locked': 'Заблоковано', 'blocked': 'заборонено', 'and': 'та',
    'mac': 'Mac', 'option': 'Option', 'shift': 'Shift', 'machine': 'Машинне', 'learning': 'навчання',
    'mail': 'Пошта', 'multi': 'кілька', 'mailbox': 'Поштова скринька', 'male': 'Чоловік', 'mammogram': 'Мамографія',
    'stacked': 'Складена', 'manage': 'Керування', 'protection': 'захистом', 'managed': 'Керовані', 'solutions': 'рішення',
    'meh': 'Байдуже', 'closed': 'Закриті', 'eye': 'очі', 'camp': 'Табір', 'mingcute': 'MingCute',
    'multiuser': 'Багатокористувацький', 'device': 'Пристрій',
    'netease': 'NetEase', 'music': 'Музика', 'no': 'Без', 'ticket': 'квитка',
    'available': 'Доступно', 'not': 'Не', 'found': 'знайдено', 'sent': 'надіслано',
    'paperplane': 'Паперовий літак', 'low': 'Ближнє', 'beam': 'світло', 'headlights': 'фар', 'temperature': 'температура',
    'luggage': 'Багаж', 'lotus': 'Лотос', 'love': 'Любов', 'lottiefiles': 'LottieFiles', 'magic': 'Магія', 'hat': 'Капелюх',
    'shoe': 'Взуття', 'shop': 'Магазин', 'catalog': 'Каталог', 'cart': 'Кошик', 'shorts': 'Шорти', 'shot': 'Постріл',
    'shovel': 'Лопата', 'show': 'Показати', 'shower': 'Душ', 'gel': 'Гель', 'shrink': 'Зменшити', 'screen': 'Екран',
    'shrub': 'Кущ', 'shutter': 'Затвор', 'shuttle': 'Шатл', 'source': 'Джерело', 'sphere': 'Сфера', 'split': 'Розділити',
    'squint': 'Примружитися', 'subtract': 'Відняти', 'supply': 'Постачання',
    'magnet': 'Магніт', 'marginal': 'Граничний',
}

def is_logo_key(key: str) -> bool:
    return key.startswith('logo-')

def split_tokens(key: str):
    return key.split('-')

def tokens_to_brand(tokens):
    out = []
    for t in tokens:
        lt = t.lower()
        if lt in STYLE_MAP:
            continue
        if lt in KEEP_UPPER:
            out.append(KEEP_UPPER[lt])
        elif lt in BRAND_CANON:
            out.append(BRAND_CANON[lt])
        else:
            # Title case for brand-ish words
            out.append(lt.capitalize())
    return ' '.join(out).strip()

def extract_style(tokens):
    styles = []
    core = []
    for t in tokens:
        lt = t.lower()
        if lt in STYLE_MAP:
            styles.append(STYLE_MAP[lt])
        else:
            core.append(t)
    # Unique styles, preserve order
    seen = set()
    uniq = []
    for s in styles:
        if s not in seen:
            uniq.append(s)
            seen.add(s)
    return core, uniq

def map_token(t: str) -> str:
    lt = t.lower()
    if lt in NUM_WORD:
        return NUM_WORD[lt]
    if lt in KEEP_UPPER:
        return KEEP_UPPER[lt]
    if lt in T:
        return T[lt]
    # Fallback: title case
    return t.capitalize()

def translate_general(tokens):
    # Special phrase-level fixes
    # gas-station => АЗС
    if tokens == ['location','gas','station']:
        phrase_tokens = ['Локація', 'АЗС']
        return ' '.join(phrase_tokens)
    # low-temperature => Низька температура
    if tokens == ['low','temperature']:
        return 'Низька температура'
    # mickeymouse variants
    if tokens and tokens[0] == 'mickeymouse':
        rest = tokens[1:]
        base = 'Mickey Mouse'
        if rest:
            return ' '.join([base] + [map_token(t) for t in rest])
        return base
    # marina-bay-sand (Sands)
    if tokens[:3] == ['marina','bay','sand']:
        rest = tokens[3:]
        base = 'Marina Bay Sands'
        if rest:
            return ' '.join([base] + [map_token(t) for t in rest])
        return base
    # name-space => Простір імен
    if tokens == ['name','space']:
        return 'Простір імен'
    # no-ticket => Без квитка
    if tokens == ['no','ticket']:
        return 'Без квитка'
    # not-available/found/sent => Недоступно / Не знайдено / Не надіслано
    if tokens == ['not','available']:
        return 'Недоступно'
    if tokens == ['not','found']:
        return 'Не знайдено'
    if tokens == ['not','sent']:
        return 'Не надіслано'

    mapped = [map_token(t) for t in tokens]
    # Remove empty placeholders (e.g., station mapped to '')
    mapped = [m for m in mapped if m]
    if not mapped:
        return ''
    # Capitalize first word
    mapped[0] = mapped[0][:1].upper() + mapped[0][1:]
    return ' '.join(mapped)

def translate_key(key: str) -> str:
    tokens = split_tokens(key)

    # Handle logo brands
    if is_logo_key(key):
        core, styles = extract_style(tokens[1:])  # drop 'logo'
        brand = tokens_to_brand(core)
        if styles:
            return f"{brand} (" + ', '.join(styles) + ")"
        return brand

    # Extract styles
    core, styles = extract_style(tokens)

    # Load balancer variants
    if core[:2] == ['load','balancer']:
        tail = core[2:]
        tail_txt = translate_general(tail) if tail else ''
        base = 'Балансувальник навантаження'
        phrase = base + (f" {tail_txt}" if tail_txt else '')
        if styles:
            phrase += ' (' + ', '.join(styles) + ')'
        return phrase

    # Special cases
    # n-a, na
    if key in ('n-a','na'):
        return 'N/A'
    if key == 'na-line':
        return 'N/A (контурна)'

    # Build base phrase
    phrase = translate_general(core)
    if styles:
        phrase += ' (' + ', '.join(styles) + ')'
    return phrase

def main():
    data = json.loads(SRC.read_text(encoding='utf-8'))
    out = {}
    for k, _ in data.items():
        out[k] = translate_key(k)
    # Ensure first letter uppercase, no trailing spaces
    for k in out:
        out[k] = out[k].strip()
    SRC.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"Updated {SRC} with {len(out)} entries.")

if __name__ == '__main__':
    main()

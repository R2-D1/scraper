#!/usr/bin/env python3
import json
from pathlib import Path
import re

SRC = Path('translations/icons/missing-translations/names/part-0002.json')

# Стилі, які треба оформляти у дужках наприкінці
STYLE_TERMS = {
    'line': 'контурна',
    'o': 'контурна',
    'alt': 'альтернативна',
    'solid': 'суцільна',
    'bold': 'жирна',
    'thin': 'тонка',
    'light': 'тонка',
    'rounded': 'закруглена',
    'sharp': 'гостра',
    'simple': 'проста',
    'duotone': 'двотонова',
    'filled': 'заповнена',
    'fill': 'заповнена',
}

# Заміни англійських слів у фразі на українські
WORD_REPLACE = [
    (r'\bClouds\b', 'Хмари'),
    (r'\bCloudy\b', 'Хмарно'),
    (r'\bCoathanger\b', 'Вішак'),
    (r'\bComment\b', 'Коментар'),
    (r'\bData\b', 'Дані'),
    (r'\bDocument\b', 'Документ'),
    (r'\bEnvelope\b', 'Конверт'),
    (r'\bhexagon\b', 'шестикутник'),
    (r'\boctagon\b', 'восьмикутник'),
    (r'\bdiamond\b', 'ромб'),
    (r'\bsquare\b', 'квадрат'),
    (r'\bcircle\b', 'коло'),
    (r'\bcorner\b', 'кут'),
    (r'\breference\b', 'довідка'),
    (r'\bwaves\b', 'хвилі'),
    (r'\bverify\b', 'перевірка'),
    (r'\bmedical\b', 'медичний'),
    (r'\binfo\b', 'інфо'),
    (r'\bmessage\b', 'повідомлення'),
    (r'\bshare\b', 'поділитися'),
    (r'\bsearch\b', 'пошук'),
    (r'\brecord\b', 'запис'),
    (r'\bred[oO]\b', 'повторити'),
    (r'\bupload\b', 'вивантаження'),
    (r'\bdownload\b', 'завантаження'),
    (r'\block\b', 'замок'),
    (r'\blocked\b', 'заблоковано'),
    (r'\blocked\b', 'заблоковано'),
    (r'\bopen\b', 'відкрити'),
    (r'\btimes\b', 'хрестик'),
    (r'\beuro\b', 'євро'),
    (r'\bpound\b', 'фунт'),
    (r'\bDirection\b', 'Напрям'),
    (r'\bEuro\b', 'Євро'),
    (r'\bpoint\b', 'точка'),
    (r'\bdirection\b', 'напрям'),
    (r'\bDoor\b', 'Двері'),
    (r'\bContour\b', 'Контур'),
    (r'\bdata\b', 'дані'),
    (r'\bbitcoin\b', 'біткоїн'),
    (r'\bbaht\b', 'бат'),
    (r'\bDanger\b', 'Небезпека'),
    (r'\bCorner\b', 'Кут'),
    (r'\bEight\b', 'Вісім'),
    (r'\bDeployment\b', 'Розгортання'),
    (r'\bForward\b', 'Вперед'),
    (r'\bEarth\b', 'Земля'),
    (r'\bCog\b', 'Шестерня'),
    (r'\bunit\b', 'одиниця'),
    (r'\bFinger\b', 'Палець'),
    (r'\bFan\b', 'Вентилятор'),
    (r'\bExchange\b', 'Обмін'),
    (r'\bGateway\b', 'Шлюз'),
    (r'\bFunny\b', 'Кумедно'),
    (r'\bFlow\b', 'Потік'),
    (r'\bEdge\b', 'Край'),
    (r'\bEase\b', 'Плавно'),
    (r'\bDanmaku\b', 'Данмаку'),
    (r'\bConnection\b', 'З’єднання'),
    (r'\bPull\b', 'Отримати'),
    (r'\bcard\b', 'картка'),
    (r'\bFlight\b', 'Політ'),
    (r'\bFlag\b', 'Прапор'),
    (r'\bExpand\b', 'Розгорнути'),
    (r'\bConnect\b', 'Підключити'),
    (r'\bCompress\b', 'Стиснути'),
    (r'\bshield\b', 'щит'),
    (r'\bsecurity\b', 'безпека'),
    (r'\bnode\b', 'вузол'),
    (r'\bmore\b', 'більше'),
    (r'\bloop\b', 'петля'),
    (r'\bghost\b', 'привид'),
    (r'\bGhost\b', 'Привид'),
    (r'\bFront\b', 'Передній'),
    (r'\bFork\b', 'Форк'),
    (r'\bFlower\b', 'Квітка'),
    (r'\bEvent\b', 'Подія'),
    (r'\bDrone\b', 'Дрон'),
    (r'\bDistribute\b', 'Розподілити'),
    (r'\bDelivery\b', 'Доставка'),
    (r'\bDelete\b', 'Видалити'),
    (r'\bCredit\b', 'Кредит'),
    (r'\bview\b', 'перегляд'),
    (r'\busage\b', 'використання'),
    (r'\btree\b', 'дерево'),
    (r'\bstraight\b', 'прямо'),
    (r'\brotary\b', 'кільцевий'),
    (r'\brequest\b', 'запит'),
    (r'\bprocessor\b', 'процесор'),
    (r'\bplayer\b', 'програвач'),
    (r'\bnigeria\b', 'Нігерія'),
    (r'\blandscape\b', 'альбомна'),
    (r'\bfront\b', 'передній'),
    (r'\bdoor\b', 'двері'),
    (r'\bdefinition\b', 'визначення'),
    (r'\bGlass\b', 'Скло'),
    (r'\bglass\b', 'скло'),
    (r'\bGame\b', 'Гра'),
    (r'\bFollow\b', 'Стежити'),
    (r'\bFloating\b', 'Плаваючий'),
    (r'\bFlask\b', 'Колба'),
    (r'\bFeature\b', 'Функція'),
    (r'\bFast\b', 'Швидко'),
    (r'\bExposure\b', 'Експозиція'),
    (r'\bExit\b', 'Вихід'),
    (r'\bEnter\b', 'Вхід'),
    (r'\bEllipsis\b', 'Багатокрапка'),
    (r'\bEar\b', 'Вухо'),
    (r'\bDiary\b', 'Щоденник'),
    (r'\bContacts\b', 'Контакти'),
    (r'\bConfig\b', 'Конфігурація'),
    (r'\bvolume\b', 'гучність'),
    (r'\bupper\b', 'верхній'),
    (r'\bunlock\b', 'розблокувати'),
    (r'\bturn\b', 'поворот'),
    (r'\btune\b', 'налаштування'),
    (r'\btriangle\b', 'трикутник'),
    (r'\btap\b', 'дотик'),
    (r'\bsort\b', 'сортування'),
    (r'\bsharing\b', 'спільний доступ'),
    (r'\brock\b', 'камінь'),
    (r'\bConnect\b', 'Підключити'),
    (r'\bconnect\b', 'підключити'),
    (r'\btarget\b', 'ціль'),
    (r'\bsource\b', 'джерело'),
    (r'\bCondition\b', 'Умова'),
    (r'\bcondition\b', 'умова'),
    (r'\bwait\b', 'очікування'),
    (r'\bcontainer\b', 'контейнер'),
    (r'\bengine\b', 'двигун'),
    (r'\bregistry\b', 'реєстр'),
    (r'\bruntime\b', 'середовище виконання'),
    (r'\bmonitor\b', 'монітор'),
    (r'\bservices\b', 'сервіси'),
    (r'\bservice\b', 'сервіс'),
    (r'\bsoftware\b', 'ПЗ'),
    (r'\bimage\b', 'зображення'),
    (r'\bpush\b', 'push'),
    (r'\bpull\b', 'pull'),
    (r'\bContent\b', 'Контент'),
    (r'\bcontent\b', 'контент'),
    (r'\bdelivery\b', 'доставка'),
    (r'\bnetwork\b', 'мережа'),
    (r'\bContinue\b', 'Продовжити'),
    (r'\bcontinue\b', 'продовжити'),
    (r'\bConstant\b', 'Константа'),
    (r'\bconstant\b', 'константа'),
    (r'\bConstructor\b', 'Конструктор'),
    (r'\bconstructor\b', 'конструктор'),
    (r'\bCredentials\b', 'Облікові дані'),
    (r'\bcredentials\b', 'облікові дані'),
    (r'\bCompile\b', 'Компіляція'),
    (r'\bcompile\b', 'компіляція'),
]

SPECIAL_KEYS = {
    'cloud-sun-rain-alt': 'Хмара, сонце і дощ',
    'cloud-sun-rain-solid': 'Хмара, сонце і дощ (суцільна)',
    'cloud-sun-solid': 'Хмара і сонце (суцільна)',
    'cloud-sun-tear': 'Хмара і сонце сльоза',
    'currency-nigeria': 'Найра',
    'currency-nigeria-2-line': 'Найра (контурна)',
    'currency-nigeria-line': 'Найра (контурна)',
}

def attach_style(text, styles):
    if not styles:
        return text
    # якщо вже є дужки — додамо всередину
    if text.endswith(')') and ' (' in text:
        # вставити нові стилі у наявні дужки з унікалізацією
        before, _, tail = text.rpartition('(')
        inside = tail.rstrip(')')
        parts = [p.strip() for p in inside.split(',') if p.strip()]
        for s in styles:
            if s not in parts:
                parts.append(s)
        return before.rstrip() + ' (' + ', '.join(parts) + ')'
    return text + ' (' + ', '.join(dict.fromkeys(styles)) + ')'


def main():
    data = json.loads(SRC.read_text(encoding='utf-8'))
    out = {}
    for k, v in data.items():
        # Спеціальні випадки
        if k in SPECIAL_KEYS:
            out[k] = SPECIAL_KEYS[k]
            continue

        tokens = k.split('-')
        # зняти стилі з хвоста
        styles_raw = []
        while tokens and tokens[-1] in STYLE_TERMS:
            styles_raw.append(STYLE_TERMS[tokens.pop()])
        styles_raw = list(dict.fromkeys(styles_raw))

        name = v
        # прибрати фрагменти виду " з лінією"
        name = re.sub(r"\s+з лінією\b", "", name)

        # Підставити українські слова у назві
        for pat, repl in WORD_REPLACE:
            name = re.sub(pat, repl, name)

        # Деякі ключі з фразами cloud-...
        if k.startswith('cloud-sun-rain'):
            name = 'Хмара, сонце і дощ'
        elif k.startswith('cloud-sun-'):
            name = 'Хмара і сонце'

        # Додати стилі у дужках наприкінці
        if styles_raw:
            name = attach_style(name, styles_raw)

        # Перша літера велика
        if name:
            name = name[:1].upper() + name[1:]
        out[k] = name

    SRC.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding='utf-8')


if __name__ == '__main__':
    main()

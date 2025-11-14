import json
import re
from pathlib import Path
from typing import Dict, Match, Pattern

PHRASES: Dict[str, str] = {
    "bar chart": "стовпчикова діаграма",
    "column chart": "стовпчикова діаграма",
    "pie chart": "кругова діаграма",
    "line chart": "лінійна діаграма",
    "scatter plot": "точкова діаграма",
    "battery charging": "заряд батареї",
    "cloud download": "завантаження з хмари",
    "cloud upload": "вивантаження у хмару",
    "big ben": "Біг-Бен",
    "bank of china": "Банк Китаю",
    "bank of china tower": "Вежа Банку Китаю",
    "burj khalifa": "Бурдж-Халіфа",
    "christ the redeemer": "Христос-Спаситель",
}

WORDS: Dict[str, str] = {
    "and": "і",
    "to": "до",
    "angles": "кути",
    "angle": "кут",
    "diagonal": "діагональна",
    "arrow": "стрілка",
    "arrows": "стрілки",
    "up": "вгору",
    "down": "вниз",
    "left": "ліворуч",
    "right": "праворуч",
    "forward": "вперед",
    "backward": "назад",
    "circle": "кругла",
    "square": "квадратна",
    "triangle": "трикутна",
    "solid": "суцільна",
    "line": "контурна",
    "outline": "контурна",
    "filled": "заповнена",
    "hollow": "порожня",
    "waves": "хвилі",
    "wave": "хвиля",
    "ghost": "примара",
    "anniversary": "річниця",
    "annoyed": "роздратований",
    "angry": "злий",
    "ampersand": "амперсанд",
    "ampersands": "амперсанди",
    "asterisk": "зірочка",
    "brand": "бренд",
    "chart": "діаграма",
    "bar": "стовпчик",
    "column": "стовпець",
    "pie": "кругова",
    "scatter": "точкова",
    "area": "область",
    "stacked": "накладена",
    "bubble": "бульбашка",
    "bubbles": "бульбашки",
    "battery": "батарея",
    "charging": "заряджання",
    "dash": "дефіс",
    "intelligence": "інтелект",
    "application": "застосунок",
    "app": "застосунок",
    "gallery": "галерея",
    "virtual": "віртуальний",
    "web": "веб",
    "mobile": "мобільний",
    "annotation": "анотація",
    "visibility": "видимість",
    "anticlockwise": "проти годинника",
    "clockwise": "за годинником",
    "aperture": "діафрагма",
    "az": "A-Z",
    "mean": "середнє",
    "median": "медіана",
    "arithmetic": "арифметичний",
    "arrange": "упорядкувати",
    "horizontal": "горизонтально",
    "vertical": "вертикально",
    "array": "масив",
    "booleans": "булеві",
    "dates": "дати",
    "numbers": "числа",
    "objects": "об’єкти",
    "strings": "рядки",
    "compress": "стиснути",
    "growth": "зростання",
    "square": "квадратна",
    "star": "зірка",
    "alt": "альтернативна",
    "menu": "меню",
    "bell": "дзвінок",
    "bookmark": "закладка",
    "bookmarks": "закладки",
    "book": "книга",
    "books": "книги",
    "bottle": "пляшка",
    "bottles": "пляшки",
    "blessing": "благословення",
    "bling": "блиск",
    "block": "блок",
    "boot": "завантаження",
    "bowknot": "бант",
    "bowl": "миска",
    "brackets": "дужки",
    "butterfly": "метелик",
    "chat": "чат",
    "border": "рамка",
    "long": "довга",
    "sort": "сортування",
    "character": "символ",
    "for": "для",
    "of": "з",
    "dot": "крапка",
    "home": "дім",
    "user": "користувач",
    "classify": "класифікація",
    "tower": "вежа",
    "box": "коробка",
    "building": "будівля",
    "card": "картка",
    "no": "ні",
    "axes": "осі",
    "region": "регіон",
    "cloud": "хмара",
    "reference": "посилання",
    "letters": "літери",
    "bottom": "низ",
    "window": "вікно",
    "windowed": "віконний",
    "category": "категорія",
    "center": "центр",
    "satellite": "супутник",
    "rotate": "обертання",
    "baby": "дитина",
    "baseball": "бейсбол",
    "base": "база",
    "black": "чорний",
    "blank": "порожній",
    "new": "новий",
    "brush": "пензель",
    "big": "великий",
    "build": "будувати",
    "batch": "пакет",
    "job": "завдання",
    "cabin": "кабіна",
    "calls": "дзвінки",
    "case": "кейс",
    "decreasing": "спадний",
    "increasing": "зростаючий",
    "target": "ціль",
    "error": "помилка",
    "christmas": "різдво",
    "christ": "христос",
    "camcorder": "відеокамера",
    "cart": "кошик",
    "asset": "актив",
    "storage": "сховище",
    "social": "соціальний",
    "image": "зображення",
    "volume": "том",
    "glass": "скло",
    "packed": "щільний",
    "large": "великий",
    "change": "зміна",
    "plot": "графік",
    "bridge": "міст",
    "brief": "короткий",
    "bring": "перемістити",
    "smooth": "плавний",
    "stepper": "кроковий",
    "floating": "плаваючий",
    "gantt": "Ганта",
    "dots": "крапки",
    "messages": "повідомлення",
    "warning": "попередження",
    "break": "розрив",
    "split": "поділ",
    "shift": "зсув",
    "join": "об'єднати",
    "asleep": "спить",
    "awake": "прокинувся",
    "confirm": "підтвердити",
    "twin": "двійник",
    "movement": "рух",
    "view": "перегляд",
    "assignment": "призначення",
    "async": "асинхронний",
    "attachment": "вкладення",
    "console": "консоль",
    "scroll": "прокручування",
    "autoscaling": "автомасштабування",
    "axe": "сокира",
    "carriage": "візок",
    "background": "тло",
    "backpack": "рюкзак",
    "backspace": "Backspace",
    "badge": "бейдж",
    "badminton": "бадмінтон",
    "baggage": "багаж",
    "claim": "заявка",
    "barbell": "штанга",
    "bare": "голий",
    "metal": "метал",
    "filter": "фільтр",
    "document": "документ",
    "set": "набір",
    "station": "станція",
    "basket": "кошик",
    "archives": "архіви",
    "aries": "Овен",
    "aquarius": "Водолій",
    "in": "в",
    "bulb": "лампа",
    "button": "кнопка",
    "calc": "калькулятор",
    "map": "карта",
    "time": "час",
    "candy": "цукерка",
    "canton": "Кантон",
    "pay": "оплата",
    "refund": "повернення",
    "cardboard": "картон",
    "archive": "архів",
    "create": "створити",
    "lamp": "лампа",
    "celebrate": "святкувати",
    "vibration": "вібрація",
    "certificate": "сертифікат",
    "number": "число",
    "chines": "китайський",
    "knot": "вузол",
    "sit": "сидіти",
    "cigarette": "сигарета",
    "clipboard": "буфер обміну",
    "hand": "рука",
    "progress": "прогрес",
    "queued": "у черзі",
    "rejected": "відхилено",
    "conditioner": "кондиціонер",
    "middle": "середній",
    "connectivity": "підключення",
    "frame": "рамка",
    "main": "головний",
    "side": "бічний",
    "trend": "тренд",
    "assembly": "складання",
    "cluster": "кластер",
    "attribute": "атрибут",
    "tape": "стрічка",
    "hold": "утримання",
    "ascending": "зростаючий",
    "descending": "спадний",
    "back": "назад",
    "backboard": "щит",
    "bag": "сумка",
    "shopping": "покупки",
    "bank": "банк",
    "server": "сервер",
    "beachball": "пляжний м'яч",
    "bed": "ліжко",
    "bedside": "приліжковий",
    "table": "стіл",
    "coin": "монета",
}

WORD_RE = re.compile(r"[A-Za-z]+")


def _build_phrase_pattern(source: str) -> Pattern[str]:
    tokens = [re.escape(part) for part in source.split()]
    joined = r"\s+".join(tokens)
    return re.compile(r"\b" + joined + r"\b", re.IGNORECASE)


PHRASE_PATTERNS = [(_build_phrase_pattern(src), dst) for src, dst in PHRASES.items()]


def match_case(src: str, dst: str) -> str:
    if not dst:
        return dst
    if src.isupper():
        return dst.upper()
    if src[0].isupper():
        # Title-case the first letter, keep rest as provided.
        return dst[0].upper() + dst[1:]
    return dst


def replace_phrases(text: str) -> str:
    result = text
    for pattern, translation in PHRASE_PATTERNS:
        result = pattern.sub(lambda m: match_case(m.group(), translation), result)
    return result


def replace_words(text: str) -> str:
    def repl(match: Match[str]) -> str:
        word = match.group()
        lower = word.lower()
        if lower in WORDS:
            return match_case(word, WORDS[lower])
        return word

    return WORD_RE.sub(repl, text)


def main() -> None:
    path = Path("translations/missing-translations/names/part-0001.json")
    data = json.loads(path.read_text())
    needs_change = False
    alpha = re.compile(r"[A-Za-z]")

    for key, val in data.items():
        if not alpha.search(val):
            continue
        new_val = replace_words(replace_phrases(val))
        if new_val != val:
            data[key] = new_val
            needs_change = True

    if needs_change:
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()

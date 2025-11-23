import json
from pathlib import Path
from typing import Dict, List, Set


def main() -> None:
    source = Path("/Users/taras/HOLE/Projects/scraper/translations/icons/missing-synonyms/part-0002.json")
    data = json.loads(source.read_text(encoding="utf-8"))

    synonyms: Dict[str, List[str]] = {
        "choose": [
            "вибрати",
            "обрати",
            "вибір",
            "підбір",
            "select",
            "choose",
            "pick",
        ],
        "chopped": [
            "нарізаний",
            "порізаний",
            "шинкований",
            "кубиками",
            "chopped",
            "diced",
        ],
        "chopper": [
            "гелікоптер",
            "вертоліт",
            "гвинтокрил",
            "повітряна техніка",
            "chopper",
            "helicopter",
        ],
        "choy": [
            "пак-чой",
            "китайська капуста",
            "листова зелень",
            "овочі вок",
            "bok choy",
            "pak choi",
            "choy",
        ],
        "christmastree": [
            "різдвяна ялинка",
            "святкова ялинка",
            "новорічне дерево",
            "ялинкові прикраси",
            "christmas tree",
            "holiday tree",
        ],
        "chronos": [
            "хронос",
            "бог часу",
            "олімпійський титан",
            "грецький час",
            "chronos",
            "god of time",
        ],
        "cigale": [
            "цикада",
            "співоча комаха",
            "літній цвіркун",
            "нічне дзижчання",
            "cigale",
            "cicada",
        ],
        "cigarettes": [
            "сигарети",
            "цигарки",
            "паління",
            "тютюн",
            "cigarettes",
            "smokes",
        ],
        "circledideographaccept": [
            "ідеограма прийнято",
            "японський символ прийняття",
            "канжі мару прийнято",
            "затверджено",
            "circled ideograph accept",
            "accept kanji",
        ],
        "circledideographadvantage": [
            "ідеограма перевага",
            "японський символ вигоди",
            "позначка переваги",
            "виграшна іконка",
            "circled ideograph advantage",
            "advantage kanji",
        ],
        "circledideographcongratulation": [
            "ідеограма вітання",
            "японське привітання",
            "святкова ідеограма",
            "вітання в колі",
            "circled ideograph congratulation",
            "congratulations kanji",
        ],
        "circledideographsecret": [
            "ідеограма секрет",
            "секретний знак",
            "прихований символ",
            "таємниця",
            "circled ideograph secret",
            "secret kanji",
        ],
        "circledlatincapitalletterm": [
            "латинська m у колі",
            "монограма m",
            "значок літера m",
            "окружність з m",
            "circled m",
            "letter m badge",
        ],
        "circling": [
            "обертання",
            "замикання по колу",
            "кружляння",
            "цикл",
            "circling",
            "looping",
        ],
        "circuitry": [
            "електронні схеми",
            "друкована плата",
            "мікросхема",
            "серія контактів",
            "circuitry",
            "electronics circuit",
        ],
        "circumference": [
            "коло",
            "окружність",
            "периметр кола",
            "радіусний контур",
            "circumference",
            "circle perimeter",
        ],
        "circustent": [
            "цирковий намет",
            "шатро цирку",
            "циркова арена",
            "мандруючий цирк",
            "circus tent",
            "big top",
        ],
        "cirle": [
            "коло",
            "округла форма",
            "геометричне кільце",
            "circle outline",
            "circle shape",
            "round icon",
        ],
        "citadel": [
            "цитадель",
            "фортеця",
            "укріплення",
            "замок оборони",
            "citadel",
            "stronghold",
        ],
        "cityscapeatdusk": [
            "місто в сутінках",
            "вечірній мегаполіс",
            "неонова панорама",
            "силует міста",
            "cityscape at dusk",
            "sunset skyline",
        ],
        "cjkunifiedideograph": [
            "уніфікована ідеограма cjk",
            "китайський символ",
            "японське кандзі",
            "ханзи знак",
            "cjk unified ideograph",
            "east asian character",
        ],
        "clamps": [
            "затиски",
            "струбцини",
            "фіксатори",
            "обтискні кліщі",
            "clamps",
            "clamping tools",
        ],
        "clamshellmobile": [
            "розкладний телефон",
            "кнопковий фліп",
            "телефон-розкладачка",
            "класичний мобільний",
            "clamshell phone",
            "flip phone",
        ],
        "clapboard": [
            "кіноклопка",
            "режисерська дошка",
            "початок дубля",
            "кіновиробництво",
            "clapboard",
            "movie slate",
        ],
        "clarinet": [
            "кларнет",
            "дерев'яний духовий",
            "оркестровий духовий",
            "джазовий інструмент",
            "clarinet",
            "woodwind instrument",
        ],
        "clash": [
            "зіткнення",
            "сутичка",
            "конфлікт",
            "двобій",
            "clash",
            "collision",
        ],
        "classicalbuilding": [
            "класична будівля",
            "античний храм",
            "неокласичний фасад",
            "колонада",
            "classical building",
            "greek temple",
        ],
        "claw": [
            "кіготь",
            "пазур",
            "гострий кіготь",
            "claw",
            "talon",
            "beast claw",
        ],
        "claws": [
            "кігті",
            "пазурі",
            "лапи хижака",
            "monster claws",
            "claws",
            "talons",
        ],
        "clay": [
            "глина",
            "глиняна маса",
            "керамічна сировина",
            "леплення",
            "clay",
            "pottery clay",
        ],
        "claymore": [
            "клеймор",
            "шотландський меч",
            "дворучний клинок",
            "лицарська зброя",
            "claymore sword",
            "greatsword",
        ],
        "cleaver": [
            "сікач",
            "топірець для м'яса",
            "м'ясницький ніж",
            "кухонна сокира",
            "cleaver",
            "butcher knife",
        ],
        "cleopatra": [
            "клеопатра",
            "єгипетська цариця",
            "птолемеївна",
            "цариця Нілу",
            "cleopatra",
            "queen of egypt",
        ],
        "cli": [
            "інтерфейс командного рядка",
            "термінал",
            "командна консоль",
            "shell",
            "command line interface",
            "cli",
        ],
        "climb": [
            "лазіння",
            "скелелазіння",
            "карабкатися",
            "альпінізм",
            "climb",
            "climbing",
        ],
        "clinkingbeermugs": [
            "дзвін келихів пива",
            "тост з пивом",
            "чокатися",
            "святкування",
            "clinking beer mugs",
            "cheers beer",
        ],
        "clipper": [
            "кліпер",
            "вітрильник",
            "швидкісний корабель",
            "морська подорож",
            "clipper ship",
            "sailing clipper",
        ],
        "clipping": [
            "обрізання",
            "кропінг",
            "вирізка",
            "редагування кадру",
            "clipping",
            "crop tool",
        ],
        "cloaked": [
            "у плащі",
            "з накидкою",
            "прихований силует",
            "таємничий мандрівник",
            "cloaked figure",
            "hooded person",
        ],
    }

    def set_clock_synonyms(
        key: str,
        base: str,
        extras: List[str],
        english: str,
    ) -> None:
        base_list = [
            base,
            "аналоговий годинник",
            "настінний годинник",
            "стрілки часу",
            "часики",
            *extras,
            english,
            "clock",
        ]
        result: List[str] = []
        seen: Set[str] = set()
        for item in base_list:
            if not item:
                continue
            if item not in seen:
                result.append(item)
                seen.add(item)
        synonyms[key] = result

    clock_entries = [
        (
            "clock12oclock",
            "годинник 12:00",
            ["північ", "ополудні"],
            "twelve o'clock",
        ),
        (
            "clock12thirty",
            "годинник 12:30",
            ["пів на першу"],
            "half past twelve",
        ),
        (
            "clock1oclock",
            "годинник 1:00",
            ["перша година", "перша ночі"],
            "one o'clock",
        ),
        (
            "clock1thirty",
            "годинник 1:30",
            ["пів на другу"],
            "half past one",
        ),
        (
            "clock2oclock",
            "годинник 2:00",
            ["друга година"],
            "two o'clock",
        ),
        (
            "clock2thirty",
            "годинник 2:30",
            ["пів на третю"],
            "half past two",
        ),
        (
            "clock3oclock",
            "годинник 3:00",
            ["третя година"],
            "three o'clock",
        ),
        (
            "clock3thirty",
            "годинник 3:30",
            ["пів на четверту"],
            "half past three",
        ),
        (
            "clock4oclock",
            "годинник 4:00",
            ["четверта година"],
            "four o'clock",
        ),
        (
            "clock4thirty",
            "годинник 4:30",
            ["пів на п'яту"],
            "half past four",
        ),
        (
            "clock5thirty",
            "годинник 5:30",
            ["пів на шосту"],
            "half past five",
        ),
        (
            "clock6oclock",
            "годинник 6:00",
            ["шоста година", "ранкові шість"],
            "six o'clock",
        ),
        (
            "clock6thirty",
            "годинник 6:30",
            ["пів на сьому"],
            "half past six",
        ),
        (
            "clock7oclock",
            "годинник 7:00",
            ["сьома година", "сім ранку"],
            "seven o'clock",
        ),
    ]

    for key, base, extras, english in clock_entries:
        set_clock_synonyms(key, base, extras, english)

    synonyms["clocks"] = [
        "годинники",
        "настінні годинники",
        "аналогові годинники",
        "часомір",
        "clock collection",
        "timepieces",
    ]

    synonyms["clockwisedownupcircledarrows"] = [
        "циклічні стрілки вниз-вгору",
        "обертання за годинниковою",
        "повторення дії",
        "перезавантаження",
        "clockwise loop arrows",
        "refresh arrows",
    ]

    synonyms["clockwiseleftrightarrows"] = [
        "цикл вліво вправо",
        "поворот за годинниковою",
        "двійні стрілки",
        "зміна напрямку",
        "clockwise arrows",
        "swap arrows",
    ]

    synonyms["clockwiserightwardsleftwardscirclearrows"] = [
        "кругові стрілки",
        "циклічний процес",
        "за годинниковою і проти",
        "безкінечний цикл",
        "clockwise counterclockwise arrows",
        "process loop",
    ]

    synonyms["clockwiserightwardsleftwardscirclearrowsone"] = [
        "стрілки кола один",
        "подвійний цикл",
        "за годинниковою стрілкою",
        "кругова синхронізація",
        "clockwise arrows variant",
        "sync arrows",
    ]

    synonyms["clockwork"] = [
        "годинниковий механізм",
        "шестерні",
        "заводний механізм",
        "гвинтики і пружини",
        "clockwork",
        "gearwork",
    ]

    synonyms["clogs"] = [
        "клоги",
        "дерев'яні сабо",
        "традиційне взуття",
        "черевички на платформі",
        "clogs",
        "wooden clogs",
    ]

    synonyms["closedbook"] = [
        "закрита книга",
        "закритий підручник",
        "секретна книга",
        "кінчик знань",
        "closed book",
        "sealed book",
    ]

    synonyms["closedmailboxlowered"] = [
        "закрита поштова скринька",
        "поштова скриня без листів",
        "пошта закрита",
        "опущений прапорець",
        "mailbox closed",
        "no mail",
    ]

    synonyms["closedmailboxraised"] = [
        "закрита скринька з прапорцем",
        "лист у скриньці",
        "сповіщення про пошту",
        "готово до відправки",
        "mailbox flag up",
        "new mail",
    ]

    synonyms["clothesline"] = [
        "сушарка для білизни",
        "мотузка з білизною",
        "вивішування речей",
        "прати та сушити",
        "clothesline",
        "laundry line",
    ]

    synonyms["clothespin"] = [
        "прищіпка",
        "прищіпка для білизни",
        "закріплення тканини",
        "laundry clip",
        "clothespin",
        "peg",
    ]

    synonyms["clound"] = [
        "хмара",
        "похмуре небо",
        "атмосферна хмарність",
        "небесна туча",
        "cloud",
        "weather cloud",
    ]

    synonyms["clout"] = [
        "вплив",
        "авторитет",
        "соціальна вага",
        "сила бренду",
        "clout",
        "influence",
    ]

    synonyms["clownfish"] = [
        "риба-клоун",
        "амфіпріон",
        "морський мешканець",
        "коралова рибка",
        "clownfish",
        "anemone fish",
    ]

    synonyms["coa"] = [
        "герб",
        "емблема",
        "coat of arms",
        "офіційний символ",
        "родовий знак",
        "геральдика",
    ]

    synonyms["coaching"] = [
        "коучинг",
        "особистий наставник",
        "менторство",
        "кар'єрні сесії",
        "coaching",
        "life coaching",
    ]

    synonyms["coal"] = [
        "вугілля",
        "кам'яне паливо",
        "вугільний брикет",
        "паливо печі",
        "coal",
        "fossil fuel",
    ]

    synonyms["cobra"] = [
        "кобра",
        "отруйна змія",
        "зміїний капюшон",
        "індійська змія",
        "cobra",
        "venomous snake",
    ]

    synonyms["cobweb"] = [
        "павутина",
        "павутинка",
        "старий кут",
        "web",
        "cobweb",
        "spiderweb",
    ]

    synonyms["cochlear"] = [
        "равлик вуха",
        "внутрішнє вухо",
        "слуховий апарат",
        "cochlear implant",
        "cochlea",
        "ear anatomy",
    ]

    synonyms["cocktailglass"] = [
        "келих для коктейлів",
        "martini скло",
        "барний келих",
        "приємний вечір",
        "cocktail glass",
        "martini glass",
    ]

    synonyms["cocktails"] = [
        "коктейлі",
        "барні напої",
        "мікси алкоголю",
        "міксологія",
        "cocktails",
        "mixed drinks",
    ]

    synonyms["coconuts"] = [
        "кокоси",
        "кокосові горіхи",
        "тропічний фрукт",
        "кокосова шкарлупа",
        "coconuts",
        "coconut fruit",
    ]

    synonyms["coding"] = [
        "програмування",
        "написання коду",
        "розробка софту",
        "кодинг",
        "coding",
        "software development",
    ]

    synonyms["codingappswebsites"] = [
        "розробка застосунків і сайтів",
        "фронтенд та бекенд",
        "вебдев",
        "мобільна розробка",
        "coding apps websites",
        "app web development",
    ]

    synonyms["cogsplosion"] = [
        "вибух шестерень",
        "механічний вибух",
        "розліт механізмів",
        "steam punk",
        "cogsplosion",
        "gear explosion",
    ]

    synonyms["coiled"] = [
        "скручений",
        "змотаний",
        "спіральний виток",
        "coiled",
        "spiraled",
        "rolled up",
    ]

    synonyms["coiling"] = [
        "намотування",
        "скручування",
        "витки спіралі",
        "згортання кабелю",
        "coiling",
        "spiraling",
    ]

    synonyms["coinflip"] = [
        "підкидання монети",
        "вирішувати жеребом",
        "орел чи решка",
        "випадкове рішення",
        "coin flip",
        "heads or tails",
    ]

    synonyms["coldsweat"] = [
        "холодний піт",
        "паніка",
        "стресова ситуація",
        "переляк",
        "cold sweat",
        "anxious sweat",
    ]

    synonyms["coliseum"] = [
        "колізей",
        "римський амфітеатр",
        "арена гладіаторів",
        "антична арена",
        "coliseum",
        "colosseum",
    ]

    synonyms["collaborate"] = [
        "співпраця",
        "колаборація",
        "працювати разом",
        "командна робота",
        "collaborate",
        "team up",
    ]

    synonyms["collaboration"] = [
        "колаборація",
        "спільний проект",
        "кооперація",
        "робота в команді",
        "collaboration",
        "joint effort",
    ]

    synonyms["collar"] = [
        "комір",
        "комірець",
        "ошийник",
        "шийна прикраса",
        "collar",
        "neckband",
    ]

    synonyms["college"] = [
        "коледж",
        "заклад освіти",
        "campus",
        "студентське життя",
        "college",
        "junior university",
    ]

    synonyms["colombian"] = [
        "колумбійський",
        "Колумбія",
        "латиноамериканський стиль",
        "andino",
        "colombian",
        "colombia culture",
    ]

    synonyms["colon"] = [
        "товста кишка",
        "двоокишечник",
        "кишківник",
        "colon organ",
        "colon",
        "large intestine",
    ]

    synonyms["colorectal"] = [
        "колоректальний",
        "пряма кишка",
        "онкопрофілактика",
        "здоров'я кишківника",
        "colorectal",
        "colorectal cancer",
    ]

    synonyms["cols"] = [
        "колонки",
        "стовпчики таблиці",
        "columns",
        "таблична структура",
        "cols",
        "списки у стовпчик",
    ]

    synonyms["colt"] = [
        "револьвер Colt",
        "пістолет кольт",
        "шестизарядний",
        "вогнепальна зброя",
        "colt revolver",
        "handgun",
    ]

    synonyms["coma"] = [
        "кома",
        "несвідомий стан",
        "медична кома",
        "штучний сон",
        "coma",
        "unconsciousness",
    ]

    synonyms["comfortable"] = [
        "зручно",
        "комфортно",
        "затишно",
        "relax",
        "comfortable",
        "cozy",
    ]

    synonyms["commercial"] = [
        "реклама",
        "комерційний ролик",
        "просування бренду",
        "телереклама",
        "commercial",
        "ad spot",
    ]

    synonyms["commitments"] = [
        "зобов'язання",
        "угоди",
        "обіцяне",
        "робочі плани",
        "commitments",
        "promises",
    ]

    synonyms["communications"] = [
        "комунікації",
        "зв'язок",
        "спілкування",
        "мережі",
        "communications",
        "telecom",
    ]

    synonyms["company"] = [
        "компанія",
        "фірма",
        "бізнес структура",
        "корпорація",
        "company",
        "enterprise",
    ]

    synonyms["completed"] = [
        "завершено",
        "готово",
        "виконано",
        "done deal",
        "completed",
        "finished",
    ]

    synonyms["compliance"] = [
        "комплаєнс",
        "дотримання правил",
        "регуляторні вимоги",
        "policies",
        "compliance",
        "regulatory alignment",
    ]

    synonyms["computed"] = [
        "обчислено",
        "пораховано",
        "результат розрахунку",
        "computed value",
        "computed",
        "calculated",
    ]

    synonyms["computercoding"] = [
        "комп'ютерне програмування",
        "писати код",
        "розробка програм",
        "programming pc",
        "computer coding",
        "software coding",
    ]

    synonyms["computersdeviceselectronics"] = [
        "комп'ютери та гаджети",
        "електроніка",
        "смартфони і ноутбуки",
        "digital devices",
        "computers devices electronics",
        "tech gear",
    ]

    synonyms["concave"] = [
        "увігнутий",
        "увігнута форма",
        "всередину вигнутий",
        "concave shape",
        "concave",
        "inward curve",
    ]

    synonyms["concentration"] = [
        "концентрація",
        "фокус уваги",
        "зосередженість",
        "mental focus",
        "concentration",
        "deep focus",
    ]

    synonyms["concert"] = [
        "концерт",
        "музичний виступ",
        "живий звук",
        "сцена і глядачі",
        "concert",
        "live show",
    ]

    synonyms["concrete"] = [
        "бетон",
        "залізобетон",
        "будівельна суміш",
        "міцна конструкція",
        "concrete",
        "cement mix",
    ]

    synonyms["condition"] = [
        "стан",
        "умова",
        "кондиція",
        "health condition",
        "condition",
        "status",
    ]

    synonyms["condom"] = [
        "презерватив",
        "засіб контрацепції",
        "захист",
        "safe sex",
        "condom",
        "protection",
    ]

    synonyms["condor"] = [
        "кондор",
        "великий гриф",
        "андський птах",
        "птах-хижак",
        "condor",
        "andean condor",
    ]

    synonyms["condylura"] = [
        "зорелопатевий кріт",
        "носовий кріт",
        "стародавній кріт",
        "star-nosed mole",
        "condylura",
        "mole animal",
    ]

    synonyms["confirmed"] = [
        "підтверджено",
        "апрувнуто",
        "затверджено",
        "approved",
        "confirmed",
        "verified",
    ]

    synonyms["confrontation"] = [
        "конфронтація",
        "протистояння",
        "зіткнення",
        "face-off",
        "confrontation",
        "standoff",
    ]

    synonyms["congress"] = [
        "конгрес",
        "парламент",
        "законодавчий орган",
        "політична асамблея",
        "congress",
        "legislature",
    ]

    synonyms["conic"] = [
        "конусний",
        "конічна форма",
        "геометричний конус",
        "conic section",
        "conic",
        "cone shape",
    ]

    synonyms["conqueror"] = [
        "завойовник",
        "переможець",
        "володар",
        "воїн-переможець",
        "conqueror",
        "victor",
    ]

    synonyms["conquest"] = [
        "завоювання",
        "кампанія",
        "підкорення",
        "expansion",
        "conquest",
        "takeover",
    ]

    synonyms["consellation"] = [
        "сузір'я",
        "зоряний малюнок",
        "нічне небо",
        "asterism",
        "constellation",
        "star pattern",
    ]

    synonyms["constructionrealestate"] = [
        "будівництво та нерухомість",
        "девелопмент",
        "новобудови",
        "building projects",
        "construction real estate",
        "property development",
    ]

    synonyms["constructionsign"] = [
        "будівельний знак",
        "попередження роботи",
        "ремонтні роботи",
        "жовтий трикутник",
        "construction sign",
        "road works",
    ]

    synonyms["constuction"] = [
        "будівництво",
        "монтаж",
        "ремонтні роботи",
        "будроботи",
        "construction",
        "building site",
    ]

    synonyms["contact2"] = [
        "контакт",
        "адресна книга",
        "візитка",
        "профіль користувача",
        "contact card",
        "contact info",
    ]

    synonyms["contageous"] = [
        "заразний",
        "інфекційний",
        "передається повітрям",
        "contagious disease",
        "contagious",
        "infectious",
    ]

    synonyms["contentfiles"] = [
        "контент-файли",
        "медіафайли",
        "папка ресурсів",
        "контент бібліотека",
        "content files",
        "asset files",
    ]

    synonyms["contortionist"] = [
        "контурсіоніст",
        "гнучкий артист",
        "цирковий акробат",
        "йога гнучкість",
        "contortionist",
        "flexible performer",
    ]

    synonyms["contour"] = [
        "контур",
        "силует",
        "лінія форми",
        "обрис",
        "contour",
        "outline",
    ]

    synonyms["contraception"] = [
        "контрацепція",
        "планування сім'ї",
        "запобігання вагітності",
        "family planning",
        "contraception",
        "birth control",
    ]

    synonyms["contraceptive"] = [
        "контрацептив",
        "таблетки від вагітності",
        "засіб захисту",
        "contraceptive pill",
        "contraceptive",
        "birth control pill",
    ]

    synonyms["contraceptives"] = [
        "контрацептиви",
        "засоби захисту",
        "планування сім'ї",
        "набір контрацепції",
        "contraceptives",
        "birth control methods",
    ]

    synonyms["controlknob"] = [
        "регулятор",
        "поворотна ручка",
        "кнопка налаштування",
        "dial",
        "control knob",
        "volume knob",
    ]

    synonyms["conveniencestore"] = [
        "магазин біля дому",
        "мінімаркет",
        "цілодобовий кіоск",
        "corner shop",
        "convenience store",
        "mini market",
    ]

    synonyms["convergence"] = [
        "зближення",
        "конвергенція",
        "злиття потоків",
        "спільна точка",
        "convergence",
        "coming together",
    ]

    synonyms["converse"] = [
        "спілкуватись",
        "вести розмову",
        "перекидатися словами",
        "talk",
        "converse",
        "chat",
    ]

    synonyms["convex"] = [
        "опуклий",
        "опукла форма",
        "вигнутий назовні",
        "convex shape",
        "convex",
        "outward curve",
    ]

    synonyms["convict"] = [
        "ув'язнений",
        "засуджений",
        "в'язень",
        "prisoner",
        "convict",
        "inmate",
    ]

    synonyms["convince"] = [
        "переконати",
        "вмовити",
        "завоювати довіру",
        "persuade",
        "convince",
        "win over",
    ]

    synonyms["conway"] = [
        "гра життя Конвея",
        "glider",
        "клітинний автомат",
        "patterns life",
        "Conway's Game of Life",
        "conway",
    ]

    synonyms["cookedrice"] = [
        "варений рис",
        "жасминовий гарнір",
        "рисова миска",
        "відварений рис",
        "cooked rice",
        "steamed rice",
    ]

    synonyms["coord"] = [
        "координата",
        "координація",
        "точка на мапі",
        "coordinate",
        "coord",
        "map point",
    ]

    synonyms["cootie"] = [
        "воша",
        "паразит",
        "неприємний жук",
        "cootie bug",
        "cootie",
        "head louse",
    ]

    synonyms["cop"] = [
        "поліцейський",
        "коп",
        "офіцер поліції",
        "law enforcement",
        "cop",
        "police officer",
    ]

    synonyms["corked"] = [
        "закоркована пляшка",
        "корок вставлено",
        "опечатане вино",
        "sealed bottle",
        "corked",
        "bottle corked",
    ]

    synonyms["cornea"] = [
        "рогівка ока",
        "прозора оболонка",
        "частина ока",
        "eye cornea",
        "cornea",
        "ocular surface",
    ]

    synonyms["cornucopia"] = [
        "ріг достатку",
        "символ урожаю",
        "осінні плоди",
        "horn of plenty",
        "cornucopia",
        "harvest horn",
    ]

    synonyms["coronary"] = [
        "коронарний",
        "серцеві судини",
        "коронарна артерія",
        "серцевий напад",
        "coronary",
        "coronary artery",
    ]

    synonyms["coronation"] = [
        "коронація",
        "вінчання на престол",
        "королівська церемонія",
        "royal coronation",
        "coronation",
        "crowning ceremony",
    ]

    synonyms["corporal"] = [
        "капірал",
        "молодший сержант",
        "армійське звання",
        "corporal rank",
        "corporal",
        "army corporal",
    ]

    synonyms["corpse"] = [
        "труп",
        "мертве тіло",
        "некропол",
        "corpse",
        "dead body",
        "cadaver",
    ]

    synonyms["correction"] = [
        "корекція",
        "виправлення",
        "редагування помилок",
        "adjustment",
        "correction",
        "fix",
    ]

    synonyms["corset"] = [
        "корсет",
        "талієвий пояс",
        "коригуюча білизна",
        "облягаюча підтримка",
        "corset",
        "waist cincher",
    ]

    synonyms["corsica"] = [
        "Корсика",
        "острів Корсика",
        "Середземне море",
        "французький острів",
        "corsica",
        "île de beauté",
    ]

    synonyms["cosmatic"] = [
        "косметичний",
        "beauty догляд",
        "мейкап",
        "cosmetic product",
        "cosmatic",
        "beauty care",
    ]

    synonyms["cosmic"] = [
        "космічний",
        "галактичний",
        "зоряний",
        "space themed",
        "cosmic",
        "outer space",
    ]

    synonyms["cost"] = [
        "вартість",
        "ціна",
        "кошторис",
        "витрати",
        "cost",
        "price tag",
    ]

    synonyms["coughing"] = [
        "кашель",
        "покашлювання",
        "застуда",
        "cough",
        "coughing",
        "sick cough",
    ]

    synonyms["couplekiss"] = [
        "поцілунок пари",
        "романтичний поцілунок",
        "закохані",
        "kiss couple",
        "couple kiss",
        "romantic kiss",
    ]

    synonyms["coupons"] = [
        "купони",
        "знижки",
        "промокоди",
        "coupon book",
        "coupons",
        "discount vouchers",
    ]

    synonyms["courthouse"] = [
        "суд",
        "судова установа",
        "будівля суду",
        "palace of justice",
        "courthouse",
        "court building",
    ]

    synonyms["cowface"] = [
        "морда корови",
        "коров'яче личко",
        "домашня худоба",
        "cow face",
        "cow head",
        "farm animal",
    ]

    synonyms["cowled"] = [
        "у капюшоні",
        "закутаний",
        "каптур",
        "hooded cloak",
        "cowled",
        "hooded figure",
    ]

    synonyms["coworking"] = [
        "коворкінг",
        "спільний офіс",
        "open space",
        "shared workspace",
        "coworking",
        "coworking space",
    ]

    synonyms["cpap"] = [
        "апарат CPAP",
        "сонне апное",
        "маска для дихання",
        "нічна вентиляція",
        "cpap machine",
        "sleep apnea device",
    ]

    synonyms["cpr"] = [
        "серцево-легенева реанімація",
        "штучне дихання",
        "масаж серця",
        "реанімаційні дії",
        "CPR",
        "cardiopulmonary resuscitation",
    ]

    synonyms["cpus"] = [
        "процесори",
        "центральні процесори",
        "cpu чіпи",
        "обчислювальні ядра",
        "CPUs",
        "central processing units",
    ]

    synonyms["crafting"] = [
        "хендмейд",
        "ремесло",
        "DIY творчість",
        "креативні поробки",
        "crafting",
        "handmade crafts",
    ]

    synonyms["crags"] = [
        "скелі",
        "скелясті урвища",
        "гірські виступи",
        "гірський ландшафт",
        "crags",
        "rock cliffs",
    ]

    synonyms["crate"] = [
        "дерев'яний ящик",
        "тарна коробка",
        "ящик для доставки",
        "packing crate",
        "crate",
        "wooden crate",
    ]

    synonyms["crawling"] = [
        "повзання",
        "лазіння",
        "повільний рух",
        "crawling",
        "creeping",
        "crawl motion",
    ]

    synonyms["cream2"] = [
        "вершковий крем",
        "пінка десерту",
        "whipped cream",
        "солодкий крем",
        "cream",
        "dessert cream",
    ]

    synonyms["creativity"] = [
        "креативність",
        "творчий підхід",
        "натхнення",
        "creative thinking",
        "creativity",
        "creative energy",
    ]

    synonyms["creature"] = [
        "істота",
        "створіння",
        "міфічний персонаж",
        "жива істота",
        "creature",
        "being",
    ]

    synonyms["credits"] = [
        "титри",
        "подяки",
        "перелік авторів",
        "movie credits",
        "credits",
        "end titles",
    ]

    synonyms["crenel"] = [
        "бійниця",
        "зубець фортеці",
        "фортечний виріз",
        "crenel",
        "castle embrasure",
        "battlement gap",
    ]

    synonyms["crenulated"] = [
        "зубчастий мур",
        "мерлонований",
        "кренельований",
        "фортеця",
        "crenellated",
        "battlemented",
    ]

    synonyms["crescentmoon"] = [
        "місяць серпик",
        "серп Місяця",
        "нічний місяць",
        "півмісяць",
        "crescent moon",
        "lunar crescent",
    ]

    synonyms["crescents"] = [
        "серпи",
        "півмісяці",
        "ісламський символ",
        "crescent shapes",
        "crescents",
        "moon crescents",
    ]

    synonyms["crest"] = [
        "гребінь",
        "емблема",
        "гербовий знак",
        "crest badge",
        "crest",
        "coat of arms crest",
    ]

    synonyms["crested"] = [
        "з гребенем",
        "чубатий",
        "з емблемою",
        "crested bird",
        "crested",
        "crested symbol",
    ]

    synonyms["crime"] = [
        "злочин",
        "кримінал",
        "правопорушення",
        "crime scene",
        "crime",
        "criminal act",
    ]

    synonyms["crm"] = [
        "CRM система",
        "керування клієнтами",
        "salesforce",
        "customer relationship",
        "CRM",
        "client management",
    ]

    synonyms["croc"] = [
        "крокодил",
        "рептилія",
        "сафарі п'ятнадцять",
        "crocodile",
        "croc",
        "gator",
    ]

    synonyms["croissants"] = [
        "круасани",
        "французька випічка",
        "листковий рогалик",
        "сніданок у Парижі",
        "croissants",
        "buttery pastry",
    ]

    synonyms["crook"] = [
        "шахрай",
        "злодій",
        "кримінальний тип",
        "crook",
        "con artist",
        "criminal",
    ]

    synonyms["crossbar"] = [
        "перекладина",
        "металева планка",
        "ворота футболу",
        "crossbar",
        "goal bar",
        "horizontal bar",
    ]

    synonyms["crossbow"] = [
        "арбалет",
        "лук із спуском",
        "стрілецька зброя",
        "мисливський арбалет",
        "crossbow",
        "bolt launcher",
    ]

    synonyms["crosscut"] = [
        "поперечний розпил",
        "розріз",
        "переріз",
        "saw cut",
        "crosscut",
        "section cut",
    ]

    synonyms["crossedflags"] = [
        "перехрещені прапори",
        "перегони",
        "фінішні прапорці",
        "crossed flags",
        "racing flags",
        "flag ceremony",
    ]

    synonyms["crosses"] = [
        "хрести",
        "релігійні символи",
        "orthodox cross",
        "хрестики",
        "crosses",
        "christian symbols",
    ]

    synonyms["crossmark"] = [
        "хрестик",
        "невірно",
        "помилка",
        "cancel mark",
        "cross mark",
        "wrong symbol",
    ]

    synonyms["crossroad"] = [
        "перехрестя",
        "розвилка",
        "дорожній вибір",
        "crossroad",
        "intersection",
        "road junction",
    ]

    synonyms["crosswalk"] = [
        "пішохідний перехід",
        "зебра на дорозі",
        "пішохідна смуга",
        "crosswalk",
        "pedestrian crossing",
        "zebra crossing",
    ]

    synonyms["crowbar"] = [
        "лом",
        "монтування",
        "монтажка",
        "crowbar",
        "pry bar",
        "wrecking bar",
    ]

    synonyms["crowdfire"] = [
        "Crowdfire",
        "соцмережевий менеджер",
        "SMM інструмент",
        "контент планер",
        "crowdfire app",
        "social media tool",
    ]

    synonyms["crowned"] = [
        "увінчаний",
        "з короною",
        "коронований",
        "королівський титул",
        "crowned",
        "crowned head",
    ]

    synonyms["crpss"] = [
        "хрест символ",
        "релігійний знак",
        "перехрестя ліній",
        "cross symbol",
        "crpss",
        "holy cross",
    ]

    synonyms["crucifix"] = [
        "розп'яття",
        "хрест із Христом",
        "релігійна ікона",
        "crucifix",
        "holy crucifix",
        "cross with christ",
    ]

    synonyms["cruiser"] = [
        "крейсер",
        "військовий корабель",
        "морський патруль",
        "naval cruiser",
        "cruiser",
        "warship",
    ]

    synonyms["crumbling"] = [
        "руйнування",
        "осипання",
        "крихкий стан",
        "crumbling wall",
        "crumbling",
        "falling apart",
    ]

    synonyms["crush"] = [
        "розчавити",
        "придушити",
        "краш закоханість",
        "любовний інтрес",
        "crush",
        "squash",
    ]

    synonyms["cryo"] = [
        "кріогенний",
        "заморожування",
        "кріотерапія",
        "liquid nitrogen",
        "cryo",
        "cryogenic",
    ]

    synonyms["crypt"] = [
        "склеп",
        "підземелля",
        "могильна камера",
        "crypt",
        "catacomb",
        "tomb chamber",
    ]

    synonyms["crystalball"] = [
        "кришталева куля",
        "ворожіння",
        "бачення майбутнього",
        "fortune telling",
        "crystal ball",
        "seer orb",
    ]

    synonyms["crystalize"] = [
        "кристалізуватися",
        "утворювати кристали",
        "затвердіти",
        "crystallize",
        "crystal growth",
        "solidify",
    ]

    synonyms["csw"] = [
        "служба каталогу геоданих",
        "каталог просторових даних",
        "стандарт OGC",
        "Catalog Service for the Web",
        "CSW",
        "геопортал",
    ]

    synonyms["ct"] = [
        "комп'ютерна томографія",
        "КТ-скан",
        "рентген у 3D",
        "діагностика органів",
        "CT scan",
        "computed tomography",
    ]

    synonyms["cuauhtli"] = [
        "куауатлі",
        "ацтекський орел",
        "воїн-орел",
        "символ ацтеків",
        "cuauhtli",
        "aztec eagle warrior",
    ]

    synonyms["cubeforce"] = [
        "кубова сила",
        "енергетичний куб",
        "3D куб енергії",
        "cube power",
        "cube force",
        "energized cube",
    ]

    synonyms["cuckoo"] = [
        "зозуля",
        "кукушка",
        "лісовий птах",
        "cuckoo bird",
        "cuckoo",
        "clock bird",
    ]

    synonyms["cuisses"] = [
        "латне стегно",
        "захист стегон",
        "лицарські поножі",
        "thigh armor",
        "cuisses",
        "plate armor",
    ]

    synonyms["cultist"] = [
        "культіст",
        "послідовник культу",
        "фанатик",
        "cult follower",
        "cultist",
        "dark acolyte",
    ]

    synonyms["cultureholidays"] = [
        "культура і свята",
        "традиційні обряди",
        "святкові фестивалі",
        "ethno holidays",
        "culture holidays",
        "festive culture",
    ]

    synonyms["cupidon"] = [
        "амур",
        "купідон",
        "бог кохання",
        "стріла кохання",
        "cupidon",
        "cupid",
    ]

    synonyms["cured"] = [
        "одужав",
        "вилікуваний",
        "здоровий",
        "позбавився хвороби",
        "cured",
        "healed",
    ]

    synonyms["curiosity"] = [
        "допитливість",
        "цікавість",
        "жагуче пізнання",
        "curiosity",
        "wonder",
        "thirst for knowledge",
    ]

    synonyms["curled"] = [
        "закручений",
        "завитий",
        "пружний локон",
        "curled shape",
        "curled",
        "spiraled",
    ]

    synonyms["curlyloop"] = [
        "завиток",
        "кудрява петля",
        "пружина",
        "curly loop",
        "loop de loop",
        "curly twist",
    ]

    synonyms["currencyexchange"] = [
        "обмін валют",
        "міняйло",
        "курси валют",
        "currency exchange",
        "fx counter",
        "money changer",
    ]

    synonyms["curryandrice"] = [
        "карі з рисом",
        "індійська страва",
        "пряний обід",
        "curry rice",
        "curry and rice",
        "spicy bowl",
    ]

    synonyms["cursed"] = [
        "проклятий",
        "зачарований негативно",
        "темне закляття",
        "cursed",
        "hexed",
        "doomed",
    ]

    synonyms["curved"] = [
        "вигнутий",
        "криволінійний",
        "аркова форма",
        "curved shape",
        "curved",
        "bent",
    ]

    synonyms["custodian"] = [
        "охоронець",
        "доглядач",
        "опікун",
        "building custodian",
        "custodian",
        "caretaker",
    ]

    synonyms["cyclist"] = [
        "велосипедист",
        "велогонщик",
        "велосипедний райдер",
        "bike rider",
        "cyclist",
        "bicyclist",
    ]

    synonyms["cyclop"] = [
        "циклоп",
        "одноокий велетень",
        "міфічний велет",
        "cyclop",
        "cyclops creature",
        "one-eyed giant",
    ]

    synonyms["cyclops"] = [
        "циклопи",
        "плем'я однооких",
        "міфологічні велетні",
        "cyclops",
        "one-eyed giants",
        "mythic cyclops",
    ]

    synonyms["cz"] = [
        "Чехія",
        "Czech Republic",
        "чеський прапор",
        "cz домен",
        "CZ",
        "Czechia",
    ]

    synonyms["daggerknife"] = [
        "кінжал",
        "бойовий ніж",
        "гострий клинок",
        "dagger knife",
        "stiletto",
        "combat dagger",
    ]

    synonyms["daggers"] = [
        "кінжали",
        "парні ножі",
        "гостра зброя",
        "daggers",
        "dual daggers",
        "blades",
    ]

    synonyms["dail"] = [
        "циферблат",
        "диск налаштувань",
        "обертовий регулятор",
        "dial",
        "control dial",
        "gauge face",
    ]

    synonyms["dairy"] = [
        "молочні продукти",
        "молочка",
        "молочна ферма",
        "dairy",
        "dairy products",
        "milk goods",
    ]

    synonyms["daisy"] = [
        "ромашка",
        "польова квітка",
        "маргаритка",
        "daisy flower",
        "daisy",
        "wildflower",
    ]

    synonyms["damaged"] = [
        "пошкоджений",
        "зламаний",
        "з дефектом",
        "damaged",
        "broken",
        "ruined",
    ]

    synonyms["damme"] = [
        "Жан-Клод Ван Дамм",
        "актор бойовиків",
        "кино бойовик",
        "Van Damme",
        "JCVD",
        "action star",
    ]

    synonyms["dandelion"] = [
        "кульбаба",
        "одуванчик",
        "насіннєва парасолька",
        "dandelion",
        "blowball",
        "field flower",
    ]

    synonyms["darksunglasses"] = [
        "темні окуляри",
        "сонцезахисні окуляри",
        "чорні shades",
        "dark sunglasses",
        "sunglasses",
        "shades",
    ]

    synonyms["dartboard"] = [
        "мішень для дартсу",
        "дартс",
        "ігрова мішень",
        "dart board",
        "bullseye",
        "target darts",
    ]

    synonyms["databases"] = [
        "бази даних",
        "сховища даних",
        "таблиці SQL",
        "databases",
        "data storage",
        "db systems",
    ]

    synonyms["databse"] = [
        "база даних",
        "data base",
        "sql база",
        "дата стор",
        "database",
        "db table",
    ]

    synonyms["dataflows"] = [
        "потоки даних",
        "ETL процеси",
        "інтеграція даних",
        "data flows",
        "pipelines",
        "data stream",
    ]

    synonyms["datetime"] = [
        "дата і час",
        "timestamp",
        "календар та годинник",
        "datetime",
        "time stamp",
        "date time",
    ]

    synonyms["deactivate"] = [
        "деактивувати",
        "вимкнути",
        "відключити",
        "deactivate",
        "turn off",
        "disable",
    ]

    synonyms["deadly"] = [
        "смертельний",
        "летальний",
        "фатальний",
        "deadly",
        "lethal",
        "fatal",
    ]

    synonyms["dealer"] = [
        "дилер",
        "торговець",
        "картярський здавач",
        "dealer",
        "vendor",
        "card dealer",
    ]

    synonyms["deathcab"] = [
        "Death Cab for Cutie",
        "інді-рок гурт",
        "американський інді",
        "death cab",
        "indie band",
        "emo indie",
    ]

    synonyms["debt"] = [
        "борг",
        "заборгованість",
        "фінансовий тягар",
        "debt",
        "liability",
        "owed money",
    ]

    synonyms["decapitation"] = [
        "обезголовлення",
        "відтинання голови",
        "страта мечем",
        "decapitation",
        "beheading",
        "execution",
    ]

    synonyms["deciduoustree"] = [
        "листяне дерево",
        "листопадне дерево",
        "осіннє листя",
        "deciduous tree",
        "broadleaf tree",
        "autumn tree",
    ]

    synonyms["declined"] = [
        "відхилено",
        "відмовлено",
        "declined request",
        "відмова",
        "declined",
        "rejected",
    ]

    synonyms["decontamination"] = [
        "дезактивація",
        "знесення зараження",
        "очищення від токсинів",
        "decontamination",
        "hazmat cleanup",
        "decon",
    ]

    synonyms["decreasefontsize"] = [
        "зменшити шрифт",
        "менший текст",
        "font size down",
        "decrease font size",
        "smaller font",
        "text shrink",
    ]

    synonyms["deepfake"] = [
        "діпфейк",
        "підроблене відео",
        "штучний образ",
        "deepfake",
        "ai fake",
        "synthetic media",
    ]

    synonyms["defect"] = [
        "дефект",
        "недолік",
        "шлюб продукту",
        "defect",
        "flaw",
        "fault",
    ]

    synonyms["defense"] = [
        "захист",
        "оборона",
        "defense line",
        "щит",
        "defense",
        "protection",
    ]

    synonyms["defibrilate"] = [
        "дефібриляція",
        "шок серця",
        "перезапуск серця",
        "defibrillate",
        "deliver shock",
        "restart heart",
    ]

    synonyms["defibrilator"] = [
        "дефібрилятор",
        "медичний шокер",
        "апарат відновлення серця",
        "AED",
        "defibrillator",
        "heart shock device",
    ]

    synonyms["deku"] = [
        "Деку",
        "Ідзуку Мідорія",
        "герой My Hero Academia",
        "Izuku Midoriya",
        "Deku",
        "UA hero",
    ]

    synonyms["delicate"] = [
        "ніжний",
        "тендітний",
        "витончений",
        "delicate",
        "fragile",
        "gentle",
    ]

    synonyms["deliver"] = [
        "доставити",
        "привезти",
        "доставляти замовлення",
        "deliver",
        "ship order",
        "drop off",
    ]

    synonyms["deliverytruck"] = [
        "вантажівка доставки",
        "кур'єрська машина",
        "фургон доставки",
        "delivery truck",
        "cargo van",
        "logistics truck",
    ]

    synonyms["demographics"] = [
        "демографія",
        "населення статистика",
        "соціальні показники",
        "demographics",
        "population data",
        "soc demo",
    ]

    synonyms["demolish"] = [
        "знести",
        "демонтувати",
        "зруйнувати",
        "demolish",
        "tear down",
        "raze",
    ]

    synonyms["demon"] = [
        "демон",
        "чорт",
        "темний дух",
        "demon",
        "fiend",
        "evil spirit",
    ]

    synonyms["denied"] = [
        "відмовлено",
        "заборонено",
        "доступ закрито",
        "denied",
        "access denied",
        "rejected",
    ]

    synonyms["departmentstore"] = [
        "універмаг",
        "великий магазин",
        "торговий центр",
        "department store",
        "mall",
        "shopping center",
    ]

    synonyms["dependency"] = [
        "залежність",
        "депенденсі",
        "підпорядкованість",
        "dependency",
        "addiction",
        "dependent module",
    ]

    synonyms["dept"] = [
        "відділ",
        "департамент",
        "служба компанії",
        "dept",
        "department",
        "division",
    ]

    synonyms["dervish"] = [
        "дервіш",
        "суфійський монах",
        "танцюючий дервіш",
        "dervish",
        "sufi dancer",
        "whirling dervish",
    ]

    synonyms["desertisland"] = [
        "безлюдний острів",
        "тропічний острів",
        "острів Робінзона",
        "desert island",
        "castaway island",
        "lonely island",
    ]

    synonyms["deshret"] = [
        "дешрет",
        "червона корона Єгипту",
        "нижній Єгипет",
        "red crown egypt",
        "deshret",
        "pharaoh crown",
    ]

    synonyms["designimages"] = [
        "дизайн ілюстрацій",
        "створення графіки",
        "арт-дизайн",
        "design images",
        "graphic design",
        "visual assets",
    ]

    synonyms["designmodo"] = [
        "Designmodo",
        "веб-дизайн платформа",
        "ресурс UI",
        "designmodo",
        "email builder",
        "web design toolkit",
    ]

    synonyms["desklamp"] = [
        "настільна лампа",
        "лампа для роботи",
        "настільне світло",
        "desk lamp",
        "table lamp",
        "study lamp",
    ]

    synonyms["despair"] = [
        "відчай",
        "пригніченість",
        "безнадія",
        "despair",
        "hopelessness",
        "deep sorrow",
    ]

    synonyms["destination"] = [
        "пункт призначення",
        "фінальна точка",
        "travel destination",
        "destination",
        "end point",
        "arrival spot",
    ]

    synonyms["destiny"] = [
        "доля",
        "призначення",
        "фатум",
        "destiny",
        "fate",
        "kismet",
    ]

    synonyms["detach"] = [
        "від'єднати",
        "відчепити",
        "відокремити",
        "detach",
        "disconnect",
        "unplug",
    ]

    synonyms["determinants"] = [
        "визначники",
        "детермінанти",
        "матриця",
        "determinants",
        "matrix determinant",
        "linear algebra",
    ]

    synonyms["detonator"] = [
        "детонатор",
        "підривник",
        "кнопка вибуху",
        "detonator",
        "trigger charge",
        "blasting cap",
    ]

    synonyms["devastated"] = [
        "спустошений",
        "розбитий",
        "зламаний морально",
        "devastated",
        "heartbroken",
        "shattered",
    ]

    synonyms["devilhorns"] = [
        "жест рок",
        "ріжки диявола",
        "rock on",
        "devil horns",
        "metal horns",
        "rock hand",
    ]

    synonyms["dhis2"] = [
        "платформа охорони здоров'я DHIS2",
        "система моніторингу здоров'я",
        "електронна звітність",
        "health data platform",
        "DHIS2",
        "digital health system",
    ]

    synonyms["diablo"] = [
        "Діабло",
        "Diablo",
        "ігровий демон",
        "франшиза Blizzard",
        "lord of terror",
        "action rpg",
    ]

    synonyms["diagnostic"] = [
        "діагностика",
        "перевірка стану",
        "аналіз",
        "diagnostic",
        "system check",
        "health test",
    ]

    synonyms["diamondshapewithdotinside"] = [
        "ромб із крапкою",
        "геометричний символ",
        "геодезичний знак",
        "diamond with dot",
        "shape indicator",
        "drill hole",
    ]

    synonyms["diaphragm"] = [
        "діафрагма",
        "м'яз дихання",
        "м'язова перегородка",
        "diaphragm muscle",
        "breathing muscle",
        "thoracic diaphragm",
    ]

    synonyms["diarrhea"] = [
        "діарея",
        "розлад шлунка",
        "шлункове отруєння",
        "diarrhea",
        "stomach upset",
        "loose stool",
    ]

    synonyms["diet"] = [
        "дієта",
        "харчування",
        "контроль калорій",
        "diet plan",
        "healthy eating",
        "meal plan",
    ]

    synonyms["digibyte"] = [
        "DigiByte",
        "криптовалюта DGB",
        "блокчейн DigiByte",
        "dgb coin",
        "digibyte crypto",
        "digital byte",
    ]

    synonyms["dilatation"] = [
        "дилатація",
        "розширення",
        "розтягнення",
        "dilation",
        "medical dilation",
        "expansion",
    ]

    synonyms["dimetrodon"] = [
        "діметродон",
        "праісторична рептилія",
        "парусна ящериця",
        "dimetrodon",
        "sail-backed reptile",
        "permian predator",
    ]

    synonyms["dinners"] = [
        "вечері",
        "сімейна вечеря",
        "сервірований стіл",
        "dinners",
        "dinner meals",
        "evening meals",
    ]

    synonyms["dinosaur"] = [
        "динозавр",
        "юра чудовисько",
        "prehistoric reptile",
        "dinosaur",
        "jurassic beast",
        "dino",
    ]

    synonyms["diplodocus"] = [
        "диплодок",
        "довгоший динозавр",
        "травоїдний динозавр",
        "diplodocus",
        "long neck dino",
        "sauropod",
    ]

    synonyms["directhit"] = [
        "пряме влучання",
        "точне попадання",
        "bullseye",
        "direct hit",
        "perfect shot",
        "strike target",
    ]

    synonyms["direwolf"] = [
        "страшний вовк",
        "вовк лютововк",
        "Game of Thrones вовк",
        "direwolf",
        "giant wolf",
        "winterfell wolf",
    ]

    synonyms["disapointed"] = [
        "розчарований",
        "засмутився",
        "без надії",
        "disappointed",
        "sad face",
        "let down",
    ]

    synonyms["disapprove"] = [
        "несхвалення",
        "не погоджуюсь",
        "disapprove",
        "thumbs down",
        "reject idea",
        "strongly disagree",
    ]

    synonyms["disaster"] = [
        "катастрофа",
        "лихо",
        "аварія",
        "disaster",
        "calamity",
        "catastrophe",
    ]

    synonyms["disasters"] = [
        "катастрофи",
        "стихійні лиха",
        "надзвичайні події",
        "disasters",
        "natural disasters",
        "major incidents",
    ]

    synonyms["discharge"] = [
        "розряд",
        "розвантаження",
        "виписка",
        "discharge",
        "release",
        "electric discharge",
    ]

    synonyms["disclaimer"] = [
        "застереження",
        "disclaimer",
        "юридична примітка",
        "відмова від відповідальності",
        "legal notice",
        "disclosure",
    ]

    synonyms["disco"] = [
        "диско",
        "нічний клуб",
        "танцювальна вечірка",
        "disco party",
        "dance floor",
        "70s music",
    ]

    synonyms["discobolus"] = [
        "дискобол",
        "метальник диска",
        "античний атлет",
        "discobolus",
        "greek discus thrower",
        "ancient athlete",
    ]

    synonyms["discotheque"] = [
        "дискотека",
        "нічний клуб",
        "танцювальний зал",
        "discotheque",
        "nightclub",
        "dance hall",
    ]

    synonyms["discriminating"] = [
        "вибагливий",
        "розбірливий",
        "discerning",
        "discriminating taste",
        "selective",
        "critical eye",
    ]

    synonyms["discs"] = [
        "диски",
        "оптичні носії",
        "CD/DVD колекція",
        "discs",
        "optical discs",
        "cds",
    ]

    synonyms["disinfecting"] = [
        "дезінфекція",
        "обробка антисептиком",
        "kill germs",
        "disinfecting",
        "sanitizing",
        "sterilizing",
    ]

    synonyms["disintegrate"] = [
        "розпастися",
        "дезінтегрувати",
        "розсипатися порохом",
        "disintegrate",
        "fall apart",
        "break down",
    ]

    synonyms["disorders"] = [
        "розлади",
        "порушення здоров'я",
        "медичні діагнози",
        "disorders",
        "health disorders",
        "conditions",
    ]

    synonyms["dissapointedrelief"] = [
        "розчароване полегшення",
        "амбівалентні емоції",
        "зітхнув, але сумно",
        "disappointed relief",
        "mixed feelings",
        "awkward sigh",
    ]

    synonyms["dissipation"] = [
        "розсіювання",
        "розпорошення",
        "втрата енергії",
        "dissipation",
        "energy loss",
        "dispersion",
    ]

    synonyms["distraction"] = [
        "відволікання",
        "розсіяність",
        "дистракція",
        "distraction",
        "focus loss",
        "sidetrack",
    ]

    synonyms["distress"] = [
        "страждання",
        "біда",
        "сигнал SOS",
        "distress",
        "emergency",
        "anguish",
    ]

    synonyms["dive"] = [
        "пірнати",
        "занурення",
        "дайвінг",
        "dive",
        "scuba",
        "plunge",
    ]

    synonyms["divergence"] = [
        "розходження",
        "дивергенція",
        "розбіжність",
        "divergence",
        "split path",
        "variance",
    ]

    synonyms["divert"] = [
        "перенаправити",
        "відвести",
        "змінити курс",
        "divert",
        "reroute",
        "redirect",
    ]

    synonyms["divided"] = [
        "поділений",
        "розділений",
        "розколотий",
        "divided",
        "split",
        "separated",
    ]

    synonyms["diviner"] = [
        "ясновидець",
        "віщун",
        "оракул",
        "diviner",
        "fortune teller",
        "seer",
    ]

    synonyms["dizzyface"] = [
        "заморочене обличчя",
        "запаморочення",
        "вираження оніміння",
        "dizzy face",
        "spinning head",
        "woozy",
    ]

    synonyms["djembe"] = [
        "джембе",
        "африканський барабан",
        "ручний барабан",
        "djembe drum",
        "west african drum",
        "hand drum",
    ]

    synonyms["djinn"] = [
        "джин",
        "дух із казки",
        "арабський дух",
        "djinn",
        "genie",
        "desert spirit",
    ]

    synonyms["dna1"] = [
        "ланцюг ДНК",
        "подвійна спіраль",
        "генетичний код",
        "DNA helix",
        "genetics",
        "molecule dna",
    ]

    synonyms["dna2"] = [
        "структура ДНК",
        "спіральна молекула",
        "генетична спіраль",
        "dna strand",
        "double helix",
        "genome",
    ]

    synonyms["dobule"] = [
        "подвоєний",
        "двійний",
        "double",
        "x2",
        "double amount",
        "twofold",
    ]

    synonyms["documant"] = [
        "документ",
        "файл документ",
        "текстовий файл",
        "document",
        "doc file",
        "paperwork",
    ]

    synonyms["documentation"] = [
        "документація",
        "мануал",
        "опис API",
        "documentation",
        "docs",
        "tech docs",
    ]

    synonyms["documenttextpicture"] = [
        "документ з текстом і картинкою",
        "ілюстрований файл",
        "оформлена сторінка",
        "document with text and image",
        "illustrated doc",
        "content page",
    ]

    synonyms["documentwithpicture"] = [
        "документ із зображенням",
        "файл з фото",
        "документ з ілюстрацією",
        "document with picture",
        "image document",
        "picture attachment",
    ]

    synonyms["documentwithtext"] = [
        "текстовий документ",
        "документ із текстом",
        "сторінка тексту",
        "document with text",
        "text page",
        "text document",
    ]

    synonyms["dodge"] = [
        "ухилитися",
        "маневр",
        "відскочити",
        "dodge",
        "sidestep",
        "evade",
    ]

    synonyms["dodging"] = [
        "ухиляючись",
        "доджити",
        "швидкий маневр",
        "dodging",
        "dodging move",
        "quick evade",
    ]

    synonyms["dogs"] = [
        "собаки",
        "песики",
        "домашні улюбленці",
        "dogs",
        "puppies",
        "canines",
    ]

    synonyms["dogside"] = [
        "профіль собаки",
        "собака збоку",
        "силует пса",
        "dog side view",
        "dog profile",
        "canine silhouette",
    ]

    synonyms["doll"] = [
        "лялька",
        "іграшкова подруга",
        "кукла",
        "doll",
        "toy doll",
        "fashion doll",
    ]

    synonyms["dolmen"] = [
        "дольмен",
        "мегаліт",
        "каменна гробниця",
        "dolmen",
        "megalithic tomb",
        "stone monument",
    ]

    synonyms["domed"] = [
        "купольний",
        "з куполом",
        "арочний дах",
        "domed roof",
        "dome structure",
        "vaulted",
    ]

    synonyms["domestic"] = [
        "домашній",
        "побутовий",
        "родинний",
        "domestic",
        "home life",
        "household",
    ]

    synonyms["doner"] = [
        "донер кебаб",
        "лаваш із м'ясом",
        "шаурма",
        "doner kebab",
        "shawarma",
        "gyro",
    ]

    synonyms["donotlittersymbol"] = [
        "знак не смітити",
        "не кидати сміття",
        "еко табличка",
        "do not litter",
        "no littering",
        "keep clean",
    ]

    synonyms["doors"] = [
        "двері",
        "двостулкові двері",
        "вхід",
        "doors",
        "entry doors",
        "double doors",
    ]

    synonyms["doorway"] = [
        "дверний отвір",
        "портал",
        "вхідний прохід",
        "doorway",
        "entryway",
        "threshold",
    ]

    synonyms["dorsal"] = [
        "спинний",
        "дорсальний",
        "верхня частина",
        "dorsal",
        "back side",
        "dorsal fin",
    ]

    synonyms["dottted"] = [
        "пунктир",
        "крапкована лінія",
        "штрих-пунктир",
        "dotted line",
        "dot pattern",
        "stippling",
    ]

    synonyms["doublecurlyloop"] = [
        "подвійна завитушка",
        "декоративна петля",
        "вензель",
        "double curly loop",
        "ornament loop",
        "fancy swirl",
    ]

    synonyms["doubled"] = [
        "подвоєний",
        "двічі більше",
        "double amount",
        "doubled",
        "two times",
        "duplicated",
    ]

    synonyms["doubleexclaimationmark"] = [
        "подвійний знак оклику",
        "!!",
        "емоційний вигук",
        "double exclamation mark",
        "strong emphasis",
        "double bang",
    ]

    synonyms["dough"] = [
        "тісто",
        "заміс",
        "борошняна маса",
        "dough",
        "bread dough",
        "baking mix",
    ]

    synonyms["doveofpeace"] = [
        "голуб миру",
        "оливкова гілка",
        "символ миру",
        "dove of peace",
        "peace dove",
        "olive branch",
    ]

    synonyms["down2"] = [
        "стрілка вниз",
        "рух донизу",
        "опустити",
        "arrow down",
        "down arrow",
        "go down",
    ]

    synonyms["downgrade"] = [
        "понизити",
        "знизити версію",
        "відкотити",
        "downgrade",
        "rollback",
        "lower tier",
    ]

    synonyms["downloadcloud"] = [
        "завантаження з хмари",
        "cloud download",
        "отримати файл",
        "download from cloud",
        "cloud arrow",
        "sync download",
    ]

    synonyms["downpointingredtriangle"] = [
        "червоний трикутник вниз",
        "попередження",
        "берегтись",
        "downward red triangle",
        "warning triangle",
        "red alert icon",
    ]

    synonyms["downpointingsmallredtrisngle"] = [
        "малий червоний трикутник вниз",
        "дрібний маркер",
        "індикатор зниження",
        "small red triangle down",
        "indicator arrow",
        "tiny warning",
    ]

    synonyms["dozen"] = [
        "дюжина",
        "12 штук",
        "пачка яєць",
        "dozen",
        "twelve",
        "twelve pack",
    ]

    synonyms["dracula"] = [
        "Дракула",
        "вампір",
        "граф Дракула",
        "Dracula",
        "vampire lord",
        "count dracula",
    ]

    synonyms["draghandle"] = [
        "ручка перетягування",
        "drag handle",
        "перетягни тут",
        "UI хват",
        "move grip",
        "grab handle",
    ]

    synonyms["dragonfly"] = [
        "бабка комаха",
        "стрекоза",
        "водяна бабка",
        "dragonfly",
        "odonata",
        "damselfly",
    ]

    synonyms["dragonhead"] = [
        "голова дракона",
        "драконячий череп",
        "міфічний дракон",
        "dragon head",
        "wyvern head",
        "dragon skull",
    ]

    synonyms["dragonside"] = [
        "дракон збоку",
        "силует дракона",
        "фентезі дракон",
        "dragon side view",
        "dragon profile",
        "side dragon",
    ]

    synonyms["drakkar"] = [
        "дракар",
        "вікінгський корабель",
        "довгий човен",
        "drakkar",
        "viking longship",
        "norwegian longboat",
    ]

    synonyms["drawbridge"] = [
        "підйомний міст",
        "міст-фортеця",
        "замковий міст",
        "drawbridge",
        "castle bridge",
        "lift bridge",
    ]

    synonyms["dread"] = [
        "жах",
        "страх",
        "передчуття лиха",
        "dread",
        "fear",
        "looming terror",
    ]

    synonyms["dreadnought"] = [
        "дредноут",
        "броненосець",
        "військовий лінкор",
        "dreadnought",
        "battleship",
        "war dreadnought",
    ]

    synonyms["dream"] = [
        "сон",
        "мрія",
        "фантазія",
        "dream",
        "dreaming",
        "vision",
    ]

    synonyms["drink2"] = [
        "напій у склянці",
        "коктейль",
        "прохолодний напій",
        "drink glass",
        "refreshing drink",
        "cocktail glass",
    ]

    synonyms["drinkable"] = [
        "придатний до пиття",
        "можна пити",
        "питна вода",
        "drinkable",
        "safe to drink",
        "potable",
    ]

    synonyms["dripping"] = [
        "крапання",
        "каплі води",
        "протікання",
        "dripping",
        "droplets",
        "leaking",
    ]

    synonyms["dromedarycamel"] = [
        "одногорбий верблюд",
        "дромедар",
        "пустельний верблюд",
        "dromedary",
        "camel",
        "desert camel",
    ]

    synonyms["drown"] = [
        "тонути",
        "захлинатись",
        "топити",
        "drown",
        "sink under water",
        "submerge",
    ]

    synonyms["drowning"] = [
        "утоплення",
        "потопання",
        "нема повітря",
        "drowning",
        "underwater danger",
        "water emergency",
    ]

    synonyms["drug"] = [
        "ліки",
        "препарат",
        "наркотик",
        "drug",
        "medicine",
        "pharma",
    ]

    synonyms["drums"] = [
        "барабани",
        "ударні",
        "біт",
        "drums",
        "drum kit",
        "percussion",
    ]

    synonyms["duality"] = [
        "дуальність",
        "подвійна природа",
        "два в одному",
        "duality",
        "yin yang",
        "dual nature",
    ]

    synonyms["dub1"] = [
        "даб музика",
        "dub",
        "реґі даб",
        "dub mix",
        "dubstep vibes",
        "bass music",
    ]

    synonyms["dub2"] = [
        "даб версія",
        "дубтрек",
        "важкий бас",
        "dub remix",
        "sound system",
        "dub groove",
    ]

    synonyms["duble"] = [
        "подвійний",
        "double",
        "дубль",
        "двохкратний",
        "duplicate",
        "twice",
    ]

    synonyms["dude"] = [
        "чувак",
        "бро",
        "друган",
        "dude",
        "buddy",
        "bro",
    ]

    synonyms["duel"] = [
        "дуель",
        "поєдинок",
        "битва один на один",
        "duel",
        "face-off",
        "sword fight",
    ]

    synonyms["duet"] = [
        "дует",
        "двоголосся",
        "пара виконавців",
        "duet",
        "two singers",
        "musical pair",
    ]

    synonyms["duffel"] = [
        "баул",
        "дюфел сумка",
        "дорожня торба",
        "duffel bag",
        "travel bag",
        "canvas bag",
    ]

    synonyms["dug"] = [
        "викопаний",
        "перекопав",
        "earth dug",
        "dug hole",
        "digged",
        "shovel work",
    ]

    synonyms["dumbell"] = [
        "гантеля",
        "спорт інвентар",
        "залізна гантель",
        "dumbbell",
        "free weight",
        "strength training",
    ]

    synonyms["dunce"] = [
        "дурник",
        "двієчник",
        "конус невдахи",
        "dunce",
        "dunce cap",
        "slow learner",
    ]

    synonyms["dunk"] = [
        "данк",
        "занурити м'яч",
        "слем-данк",
        "dunk",
        "slam dunk",
        "basket jam",
    ]

    synonyms["dutch"] = [
        "голландський",
        "нідерландський",
        "Dutch",
        "нідерланди",
        "Netherlands",
        "holland style",
    ]

    synonyms["duty"] = [
        "обов'язок",
        "служба",
        "чергування",
        "duty",
        "responsibility",
        "on duty",
    ]

    synonyms["dwarf"] = [
        "гном",
        "карлик",
        "фентезі гном",
        "dwarf",
        "dwarven",
        "short folk",
    ]

    synonyms["dwelling"] = [
        "житло",
        "домівка",
        "оселя",
        "dwelling",
        "residence",
        "habitation",
    ]

    synonyms["dwennimmen"] = [
        "двеннімен",
        "ріг барана",
        "адінкра символ смирення",
        "adinkra dwennimmen",
        "ram horns symbol",
        "strength and humility",
    ]

    synonyms["dxc"] = [
        "DXC Technology",
        "IT-аутсорсер",
        "корпорація DXC",
        "dxc",
        "global it services",
        "dxc tech",
    ]

    synonyms["dynamite"] = [
        "динамiт",
        "вибухівка",
        "шнур детонатор",
        "dynamite",
        "explosive",
        "tnt sticks",
    ]

    synonyms["ea"] = [
        "Electronic Arts",
        "EA Games",
        "ігровий видавець",
        "ea sports",
        "EA",
        "video game publisher",
    ]

    synonyms["earofmaize"] = [
        "качан кукурудзи",
        "початок кукурудзи",
        "солодка кукурудза",
        "ear of corn",
        "corn cob",
        "maize ear",
    ]

    synonyms["earofrice"] = [
        "колос рису",
        "рисовий колосок",
        "зерно рису",
        "ear of rice",
        "rice stalk",
        "paddy grain",
    ]

    synonyms["earpod"] = [
        "навушник",
        "earpod",
        "безпровідний навушник",
        "earbud",
        "in-ear",
        "audio pod",
    ]

    synonyms["earring"] = [
        "сережка",
        "вушна прикраса",
        "earring",
        "пірсинг уха",
        "dangling earring",
        "stud",
    ]

    synonyms["earrings"] = [
        "сережки",
        "парні прикраси",
        "earrings",
        "ювелірні сережки",
        "dangly earrings",
        "jewelry earrings",
    ]

    synonyms["earwig"] = [
        "вуховертка",
        "комаха earwig",
        "нічний жук",
        "earwig",
        "forficula",
        "pincher bug",
    ]

    synonyms["eastate"] = [
        "маєток",
        "величезна садиба",
        "заміська нерухомість",
        "estate",
        "manor",
        "country house",
    ]

    synonyms["eat"] = [
        "їсти",
        "харчуватися",
        "перекусити",
        "eat",
        "grab a bite",
        "meal time",
    ]

    synonyms["ebook"] = [
        "електронна книга",
        "e-book",
        "цифрове читання",
        "ebook reader",
        "digital book",
        "online reading",
    ]

    synonyms["echo"] = [
        "ехо",
        "луна",
        "відлуння",
        "echo sound",
        "sound reflection",
        "echo repeat",
    ]

    synonyms["echoes"] = [
        "луни",
        "відлуння",
        "повторні звуки",
        "echoes",
        "sound echoes",
        "reverberations",
    ]

    synonyms["eclipses"] = [
        "затемнення",
        "сонячне затемнення",
        "місячне затемнення",
        "eclipses",
        "solar eclipse",
        "lunar eclipse",
    ]

    synonyms["ecmo"] = [
        "ЕКМО",
        "екстракорпоральна мембранна оксигенація",
        "штучні легені",
        "ECMO",
        "life support",
        "extracorporeal support",
    ]

    synonyms["ecologynature"] = [
        "екологія і природа",
        "збереження довкілля",
        "зелений світ",
        "ecology nature",
        "environmental care",
        "eco friendly",
    ]

    synonyms["edged"] = [
        "з лезом",
        "з краєм",
        "загострений",
        "edged",
        "sharp edge",
        "bordered",
    ]

    synonyms["edi"] = [
        "електронний обмін даними",
        "Electronic Data Interchange",
        "обмін документами",
        "edi",
        "b2b integration",
        "edi workflow",
    ]

    synonyms["edition"] = [
        "видання",
        "тираж",
        "спеціальний випуск",
        "edition",
        "release",
        "special edition",
    ]

    synonyms["eel"] = [
        "вугор",
        "морський вугор",
        "слизька риба",
        "eel",
        "anguilla",
        "eel fish",
    ]

    synonyms["egyptian"] = [
        "єгипетський",
        "стародавній Єгипет",
        "фараонічний стиль",
        "egyptian",
        "pharaonic",
        "ancient egypt",
    ]

    synonyms["eightpointedblackstar"] = [
        "восьмипроменева чорна зірка",
        "зірка-символ",
        "навігаційна зірка",
        "eight-pointed star",
        "black star",
        "compass rose",
    ]

    synonyms["eightspokedasterix"] = [
        "восьмиспицевий астериск",
        "символ астериск",
        "unicode знак",
        "eight spoked asterisk",
        "star symbol",
        "unicode star",
    ]

    synonyms["elderberry"] = [
        "бузина",
        "ягоди бузини",
        "лікарський кущ",
        "elderberry",
        "sambucus",
        "elder berries",
    ]

    synonyms["electricplug"] = [
        "електрична вилка",
        "штекер",
        "підключення до мережі",
        "electric plug",
        "power plug",
        "wall plug",
    ]

    synonyms["electrictorch"] = [
        "ліхтарик",
        "ручний ліхтар",
        "flashlight",
        "electric torch",
        "torchlight",
        "portable light",
    ]

    synonyms["electro"] = [
        "електро музика",
        "електроніка",
        "dance electro",
        "electro",
        "electronic music",
        "club electro",
    ]

    synonyms["electronicscd"] = [
        "електроніка CD",
        "компакт-диск",
        "оптичний диск",
        "electronics cd",
        "cd player",
        "optical media",
    ]

    synonyms["electronicsmicrochip"] = [
        "мікросхема",
        "чіп",
        "кремнієва плата",
        "microchip",
        "electronics chip",
        "integrated circuit",
    ]

    synonyms["electronjs"] = [
        "Electron",
        "кросплатформні десктопні додатки",
        "js фреймворк для desktop",
        "electron js",
        "desktop app framework",
        "html css desktop",
    ]

    synonyms["elipse"] = [
        "еліпс",
        "овальна форма",
        "ellipse shape",
        "математичний еліпс",
        "ellipse",
        "oval",
    ]

    synonyms["elven"] = [
        "ельфійський",
        "ельфійська культура",
        "фентезі ельфи",
        "elven",
        "elvish",
        "elven realm",
    ]

    synonyms["elysium"] = [
        "Елізій",
        "райська долина",
        "міфологічний рай",
        "elysium",
        "elysian fields",
        "afterlife paradise",
    ]

    synonyms["emailmessages"] = [
        "електронні листи",
        "інбокс",
        "ланцюжок повідомлень",
        "email messages",
        "mail thread",
        "inbox mail",
    ]

    synonyms["emailphone"] = [
        "email і телефон",
        "контакти",
        "зв'язок із клієнтом",
        "email plus phone",
        "contact info",
        "support contact",
    ]

    synonyms["emails"] = [
        "імейли",
        "електронна пошта",
        "messages",
        "emails",
        "mailbox",
        "email batch",
    ]

    synonyms["embassy"] = [
        "посольство",
        "дипломатична місія",
        "консульство",
        "embassy",
        "diplomatic office",
        "foreign mission",
    ]

    synonyms["embed"] = [
        "вбудувати",
        "вставити",
        "embed код",
        "embed",
        "insert media",
        "iframe",
    ]

    synonyms["embers"] = [
        "жаринки",
        "тліюче вугілля",
        "вогнище",
        "embers",
        "glowing coals",
        "campfire embers",
    ]

    synonyms["embrassed"] = [
        "зніяковілий",
        "незручно",
        "сором'язливий момент",
        "embarrassed",
        "awkward face",
        "blushing",
    ]

    synonyms["embryo"] = [
        "ембріон",
        "зародок",
        "ранній розвиток",
        "embryo",
        "fetus",
        "prenatal",
    ]

    synonyms["emerald"] = [
        "смарагд",
        "зелений коштовний камінь",
        "emerald",
        "gemstone",
        "precious emerald",
        "green gem",
    ]

    synonyms["emperor"] = [
        "імператор",
        "володар",
        "монарх",
        "emperor",
        "sovereign",
        "ruler",
    ]

    synonyms["employees"] = [
        "працівники",
        "співробітники",
        "команда компанії",
        "employees",
        "staff",
        "workforce",
    ]

    synonyms["empress"] = [
        "імператриця",
        "монархиня",
        "цариця",
        "empress",
        "queen regnant",
        "imperial lady",
    ]

    synonyms["emptydocument"] = [
        "порожній документ",
        "нова сторінка",
        "чистий файл",
        "empty document",
        "blank file",
        "empty page",
    ]

    synonyms["emptynote"] = [
        "порожня нотатка",
        "чиста записка",
        "новий нотатник",
        "empty note",
        "blank note",
        "note draft",
    ]

    synonyms["emptynotepad"] = [
        "порожній нотатник",
        "блокнот без записів",
        "чисті сторінки",
        "empty notepad",
        "blank notebook",
        "new memo pad",
    ]

    synonyms["emptynotepage"] = [
        "порожня сторінка нотатника",
        "чиста сторінка",
        "аркуш без тексту",
        "empty note page",
        "blank sheet",
        "note page empty",
    ]

    synonyms["emptypage"] = [
        "порожня сторінка",
        "білий аркуш",
        "чистий лист",
        "empty page",
        "blank page",
        "new page",
    ]

    synonyms["emptypages"] = [
        "порожні сторінки",
        "чистий блок",
        "пачка аркушів",
        "empty pages",
        "blank pages",
        "stack of paper",
    ]

    synonyms["encirclement"] = [
        "оточення",
        "блокада",
        "кільце",
        "encirclement",
        "surround",
        "envelopment",
    ]

    synonyms["endotracheal"] = [
        "ендотрахеальний",
        "внутрішньотрахейна трубка",
        "intubation",
        "endotracheal tube",
        "airway tube",
        "medical airway",
    ]

    synonyms["endwithleftwardsarrow"] = [
        "кінець зі стрілкою вліво",
        "стрілка завершення",
        "кінець рядка",
        "end left arrow",
        "return arrow",
        "backwards arrow",
    ]

    synonyms["energise"] = [
        "зарядити енергією",
        "підбадьорити",
        "додати сил",
        "energise",
        "energize",
        "boost energy",
    ]

    synonyms["enfield"] = [
        "мотоцикл Royal Enfield",
        "класичний байк",
        "ретро мотоцикл",
        "Royal Enfield",
        "enfield motorcycle",
        "bullet bike",
    ]

    synonyms["engagement"] = [
        "заручини",
        "обручка",
        "перед весіллям",
        "engagement",
        "proposal",
        "betrothal",
    ]

    synonyms["engineer"] = [
        "інженер",
        "технічний спеціаліст",
        "engineer",
        "engineer profession",
        "tech expert",
        "design engineer",
    ]

    synonyms["enlightenment"] = [
        "просвітлення",
        "осяяння",
        "внутрішнє світло",
        "enlightenment",
        "awakening",
        "悟",
    ]

    synonyms["enrage"] = [
        "розлютити",
        "довести до люті",
        "злити",
        "enrage",
        "anger",
        "infuriate",
    ]

    synonyms["enrollment"] = [
        "зарахування",
        "реєстрація",
        "вступ",
        "enrollment",
        "enroll",
        "registration",
    ]

    synonyms["ensign"] = [
        "прапорщик",
        "молодший офіцер",
        "морський прапор",
        "ensign",
        "naval ensign",
        "flag officer",
    ]

    synonyms["entangled"] = [
        "заплутаний",
        "переплетений",
        "entangled",
        "зав'язано вузлом",
        "tangled up",
        "knotted",
    ]

    synonyms["entertainmenteventshobbies"] = [
        "розваги, події та хобі",
        "дозвілля",
        "відпочинок",
        "entertainment events hobbies",
        "leisure",
        "hobby time",
    ]

    synonyms["entities"] = [
        "сутності",
        "об'єкти",
        "тенанти",
        "entities",
        "domain objects",
        "data entities",
    ]

    synonyms["entitlement"] = [
        "право доступу",
        "ентайтлмент",
        "дозвіл",
        "entitlement",
        "access right",
        "privilege",
    ]

    synonyms["entitlements"] = [
        "права доступу",
        "набори дозволів",
        "користувацькі ролі",
        "entitlements",
        "access policies",
        "user privileges",
    ]

    synonyms["envelopedownarrowabove"] = [
        "конверт зі стрілкою вниз",
        "новий лист",
        "отримати пошту",
        "envelope arrow down",
        "incoming mail",
        "mail download",
    ]

    synonyms["envelopewithlightning"] = [
        "конверт із блискавкою",
        "швидка пошта",
        "push повідомлення",
        "flash mail",
        "urgent email",
        "notification mail",
    ]

    synonyms["enviroment"] = [
        "середовище",
        "довкілля",
        "екологія",
        "environment",
        "eco system",
        "work environment",
    ]

    synonyms["enzyme"] = [
        "ензим",
        "фермент",
        "біохімічний каталізатор",
        "enzyme",
        "biocatalyst",
        "protein enzyme",
    ]

    synonyms["episodes"] = [
        "епізоди",
        "серії",
        "телесеріал",
        "episodes",
        "tv episodes",
        "podcast episodes",
    ]

    synonyms["eps"] = [
        "EPS формат",
        "векторний файл",
        "Encapsulated PostScript",
        "eps file",
        "vector eps",
        "graphic eps",
    ]

    synonyms["erased"] = [
        "стерто",
        "видалено",
        "очищено",
        "erased",
        "wiped clean",
        "deleted",
    ]

    synonyms["ereader"] = [
        "читалка",
        "електронний рідер",
        "книжковий рідер",
        "e-reader",
        "ebook reader device",
        "kindle style",
    ]

    synonyms["ericsson"] = [
        "Ericsson",
        "телеком-компанія",
        "шведський виробник мереж",
        "Ericsson telecom",
        "network vendor",
        "ericsson company",
    ]

    synonyms["ermine"] = [
        "горностай",
        "зимовий хутрян",
        "ermine",
        "stoat",
        "white weasel",
        "royal fur",
    ]

    synonyms["erosion"] = [
        "ерозія",
        "розмив ґрунту",
        "підточування",
        "erosion",
        "soil erosion",
        "wearing away",
    ]

    synonyms["eruption"] = [
        "виверження",
        "вулкан вибух",
        "лавовий потік",
        "eruption",
        "volcanic eruption",
        "burst",
    ]

    synonyms["espresso"] = [
        "еспресо",
        "міцна кава",
        "кава-шот",
        "espresso",
        "coffee shot",
        "ristretto",
    ]

    synonyms["esri"] = [
        "Esri",
        "ArcGIS",
        "геоінформаційні системи",
        "esri gis",
        "mapping software",
        "gis vendor",
    ]

    synonyms["eternal"] = [
        "вічний",
        "нескінченний",
        "непоминальний",
        "eternal",
        "forever",
        "everlasting",
    ]

    synonyms["europeafricaglobe"] = [
        "глобус Європа Африка",
        "карта світу",
        "півкуля",
        "europe africa globe",
        "world globe",
        "continent view",
    ]

    synonyms["europeancastle"] = [
        "європейський замок",
        "середньовічний замок",
        "фортеця Європи",
        "european castle",
        "medieval castle",
        "stone fortress",
    ]

    synonyms["europeanpostoffice"] = [
        "європейське поштове відділення",
        "пошта Європи",
        "жовта пошта",
        "european post office",
        "mail office",
        "postal building",
    ]

    synonyms["evacuation"] = [
        "евакуація",
        "спішне покидання",
        "аварійний вихід",
        "evacuation",
        "emergency exit",
        "mass exit",
    ]

    synonyms["evasion"] = [
        "ухилення",
        "обхід",
        "ухилення від податків",
        "evasion",
        "tax evasion",
        "dodging",
    ]

    synonyms["exam"] = [
        "іспит",
        "контрольна",
        "тестування",
        "exam",
        "test",
        "assessment",
    ]

    synonyms["exclaimationquestionmark"] = [
        "знак оклику й питання",
        "!?",
        "подив і емоція",
        "exclamation question mark",
        "interrobang",
        "surprised punctuation",
    ]

    synonyms["executed"] = [
        "виконано",
        "страчено",
        "реалізовано",
        "executed",
        "carried out",
        "completed task",
    ]

    synonyms["executioner"] = [
        "кат",
        "виконавець страти",
        "караючий вирок",
        "executioner",
        "headsman",
        "hooded executioner",
    ]

    synonyms["exertnal"] = [
        "зовнішній",
        "external",
        "зовні",
        "outer layer",
        "exterior",
        "outside",
    ]

    synonyms["exists"] = [
        "існує",
        "наявний",
        "працює",
        "exists",
        "available",
        "present",
    ]

    synonyms["expanded"] = [
        "розширений",
        "збільшено",
        "розгорнутий",
        "expanded",
        "extended",
        "broadened",
    ]

    synonyms["expectorate"] = [
        "відхаркувати",
        "випльовувати мокротиння",
        "кашляти",
        "expectorate",
        "spit phlegm",
        "cough up",
    ]

    synonyms["expense"] = [
        "витрати",
        "видатки",
        "кошти",
        "expense",
        "spending",
        "costs",
    ]

    synonyms["expert"] = [
        "експерт",
        "фахівець",
        "гуру",
        "expert",
        "specialist",
        "pro",
    ]

    synonyms["explode"] = [
        "вибухнути",
        "підрив",
        "вибух",
        "explode",
        "blow up",
        "detonate",
    ]

    synonyms["explosive"] = [
        "вибухівка",
        "експлозив",
        "небезпечний заряд",
        "explosive",
        "explosive material",
        "high explosive",
    ]

    synonyms["extent"] = [
        "масштаб",
        "обсяг",
        "ступінь",
        "extent",
        "range",
        "degree",
    ]

    synonyms["eyeball"] = [
        "очне яблуко",
        "око",
        "зір",
        "eyeball",
        "eye icon",
        "look",
    ]

    synonyms["eyeclosed"] = [
        "закрите око",
        "заплющене",
        "sleepy eye",
        "eye closed",
        "shut eye",
        "resting eye",
    ]

    synonyms["eyed"] = [
        "окомір",
        "спостережливий",
        "зіниця",
        "eyed",
        "keen eye",
        "spotted",
    ]

    synonyms["eyelashes"] = [
        "вії",
        "подовжені вії",
        "lash",
        "eyelashes",
        "beauty lashes",
        "mascara lashes",
    ]

    synonyms["eyepatch"] = [
        "піратська пов'язка",
        "пов'язка на око",
        "eye patch",
        "pirate patch",
        "eye cover",
        "cyclops patch",
    ]

    synonyms["eyestalk"] = [
        "очний стебель",
        "щитковий вусик",
        "равликове око",
        "eye stalk",
        "snail eye",
        "stalked eye",
    ]

    synonyms["ezmeral"] = [
        "HPE Ezmeral",
        "платформа даних",
        "контейнерна аналітика",
        "ezmeral",
        "data fabric",
        "hybrid analytics",
    ]

    synonyms["facbook"] = [
        "Facebook",
        "Meta соцмережа",
        "фейсбук",
        "соціальна мережа",
        "facebook app",
        "fb",
    ]

    synonyms["facility"] = [
        "об'єкт",
        "інфраструктура",
        "комплекс",
        "facility",
        "facility building",
        "amenities",
    ]

    missing = [key for key in data.keys() if key not in synonyms]
    if missing:
        raise SystemExit(f"Не заповнені синоніми для ключів: {', '.join(missing[:10])}...")

    source.write_text(
        json.dumps(synonyms, ensure_ascii=False, indent=2, sort_keys=False),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()


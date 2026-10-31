# Pitak Go — каталог точек и источники

Дата первого сбора: 2026-10-26. Это стартовый исследовательский набор, не исчерпывающий национальный реестр.

## Источники
- Министерство транспорта Узбекистана, официальный перечень автовокзалов и автостанций (название, адрес и опубликованные координаты): https://mintrans.uz/ru/avtovokzal-va-avtostantsiyalar-boyicha-malumot
- Открытый Telegram-пост/лента «Потребитель.Уз» с упоминанием Водий пятака на Куйлюке и Северного вокзала как вариантов отправления в Ферганскую долину: https://t.me/s/potrebitel_uz?after=8609

## Статусы и правила
- `official_source_coordinates_published`: официальный источник публикует точку и координаты; подтверждает статус станции, но не автоматически статус неформального пятака.
- `public_mention_needs_pinpointing`: открытая публикация упоминает пятак, но точный GPS-пин не установлен. Не показывать как точную точку на карте.
- Нулевые координаты, пустые координаты и географически подозрительные координаты не должны автоматически импортироваться в карту как проверенные.
- Маршруты заполняются только при наличии прямого источника. Название региона/города не считается доказательством маршрута.
- Для публикации неформального пятака нужны минимум: точный пин или однозначный ориентир + независимое подтверждение использования как места посадки междугородних такси.


## Public-source research pass — 2026-10-26
- Public Telegram source: https://t.me/s/potrebitel_uz?after=4392 — explicitly names Kuylyuk/Vodiy pitak and Northern Station pitak as departure places toward Fergana.
- Public Telegram source: https://t.me/s/potrebitel_uz/10648?q=%23%D0%A2%D0%B0%D1%88%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C — explicitly mentions Yangi-Yul pitak near South Station, a stop farther toward Sergeli.
- Public Telegram source: https://t.me/s/potrebitel_uz/11183?q=%23%D0%B4%D0%B0%D0%B9%D0%B4%D0%B6%D0%B5%D1%81%D1%82%D1%8B — explicitly mentions the Bekobod pitak at Kuylyuk.
- Public Telegram source: https://t.me/s/potrebitel_uz/10036?q=%23%D1%82%D0%B0%D0%BA%D1%81%D0%B8 — mentions taxis occupying bus stops around Qadysheva; not accepted as an intercity pitak without further evidence.
- Additional public Telegram route/group leads listed in `telegram_route_sources.csv`; these establish active intercity taxi discussion, not specific departure-point coordinates.
- Important: no exact coordinates are invented. Unpinned candidates remain separate from the map-ready catalog.

- Public Telegram source: https://t.me/s/potrebitel_uz?before=11200 — private taxi point near Karvon Bazaar in Bukhara for Khiva/Urganch.
- Public Telegram source: https://t.me/s/potrebitel_uz/6052?q=%23%D0%BF%D1%83%D1%82%D0%B5%D1%88%D0%B5%D1%81%D1%82%D0%B2%D0%B8%D1%8F — local 4x4 taxi stand around Hissarak dam/Miraki (special mountain transfer, not general intercity).
- Public Telegram source: https://t.me/s/ANDIJON_AliExpress?before=98 — historical mention of “VODIY TOSHKENT PITAK” channel for Andijan–Tashkent; physical location not provided.


## Active research pass — 2026-10-28
- Yandex Maps public taxi-rank category: route-named listings include Tashkent–Fergana–Tashkent (Toyona street 12), Tashkent–Khorezm (Beshqurghon mahalla) and Tashkent–Nukus (Beshqurghon mahalla); individual records and limitations are tracked in `web_map_source_inventory.csv`.
- Yandex Maps listing for Angren Hamkor Taxi: Bunyodkor ko'chasi 57, 24/7, taxi-rank/taxi category; intercity route still unconfirmed.
- Samarkand city transport page: new station at 13 Chupon-Ota, opened August 2025; says intercity shared taxis have a separate waiting area.
- Fergana Valley CTN transportation page: shared taxis to the valley leave from parking area in Qo'yliq; exact pin not given.
- Uzbekistan Wanderer shared-taxi guide: Bukhara Sharq stand near airport reported for Shahrisabz, Qarshi and Termez; secondary lead, needs confirmation.
- No new coordinates have been guessed. Route claims and station status are kept separate from exact pickup-pin verification.


## Expanded public-source pass — 2026-10-28
- Yandex Maps identifies **Kuylik, Vodiy Pitak**, Toyona street 12, with published coordinates 41.243757, 69.339582: https://yandex.com/maps/10335/tashkent/house/YkAYdQRpTE0FQFprfX51cntmYg%3D%3D/
- Caravanistan Tashkent transport guide names Kuyluk Bazaar, the area north of the train station, and the central bus terminal as intercity shared-taxi gathering areas: https://caravanistan.com/uzbekistan/center/tashkent/transport/
- Caravanistan border guide documents taxi/shared-taxi movements toward Oybek, Beshariq/Patar, Panjakent/Kaftarxona, Denau, Gulbahor, Farap/Alat, Shavat and Hojayli; many are route leads, not exact stand pins: https://caravanistan.com/border-crossings/uzbekistan/ and https://caravanistan.com/border-crossings/tajikistan/
- Fastbase directory lists 73 Uzbekistan taxi-stand records, including several named candidates and Plus Codes. Treat as a noisy secondary lead list, not verified truth: https://www.fastbase.com/countryindex/Uzbekistan/T/Taxi-stand
- 2026-10-28 update: 21 new research leads were appended to `pitak_research_leads.json`. Of these, several are route/transfer leads rather than verified taxi ranks. No guessed GPS coordinates were added.


## Official geocoded station source — batch 6
- Ministry of Transport Uzbekistan, official station register with addresses and coordinates: https://mintrans.uz/uz/avtovokzal-va-avtostantsiyalar-boyicha-malumot
- Important classification rule: official bus-station coordinates are stored as candidate locations for field/map verification; they are not automatically classified as taxi pitaks.


## Batch 8 — map listings and Samarkand transport descriptions (2026-10-28)
- Google Maps business search results surfaced named taxi stands for Andijon pitak, Toshkent–Jizzax taxi, and Oybek border pitak. These are discovery links; exact pickup pin and active status require verification.
- Samarkand Guide describes the Ulugh Beg Observatory taxi stand (Tashkent/Bukhara) and Kaftarxona (suburban Damas/taxi, Urgut/Jartepa). Source: https://samarkand-guide.com/services/transport
- Kun.uz documents two “Tashkent pitak” departure points in Andijan and the Kuylyuk return stand in Tashkent: https://kun.uz/ru/29382568


## Batch 10 — official transport-route cross-check (2026-10-28)
- Ministry of Transport official tender/route page: https://gov.uz/ru/mintrans/contest/view/204802
- Added 10 route-node research leads: Nukus BatisTrans, Nokis Arka Batis, Turtkul–Gulistan, Denau–Shurchi, Urgench clothing-market station, Romitan–Shohnigor, Karshi–Yakkabag, Siyob–Tugay, Ulughbek Observatory–Urgut, Bostan–Nukus. These are not claimed to be confirmed taxi stands; no coordinates were fabricated.

- Ministry of Transport tender pages used for Batch 12 route-node leads: https://gov.uz/ru/mintrans/contest/view/199907 ; https://gov.uz/ru/mintrans/contest/view/198272 ; https://gov.uz/ru/mintrans/contest/view/175864. Official routes help identify terminals/villages for follow-up but do not by themselves prove a taxi pitak exists.


## Batch 13 — public map candidates and Telegram route-source discovery (2026-10-28)
- Map business search surfaced Namangan Pyatak (Plus Code 68RP+C9J), Intercity Taxi (754R+PXH), and Vodiy Pitak Kukon Qo‘qon (68VR+H2H), all in Tashkent. They are map candidates, not independently field-verified; no GPS coordinates were inferred.
- Public Telegram directory: https://chatcrawler.link/ru/c/t/transport?lang=uz and public channel/group links for Termiz–Toshkent–Samarqand, G‘uzor–Toshkent, Surxondaryo/Termiz/Denov, Rishton–Toshkent, Sayxun–Guliston, Jizzax–Toshkent, Angren–Toshkent, Urganch–Nukus, and Qo‘qon/Toshkent. These provide route leads only; they do not prove pickup addresses.
- Added 12 research records: 3 public map taxi-stand candidates plus 9 public Telegram route-source leads. All lack newly invented GPS coordinates; physical pickup confirmation remains pending.


## Batch 14 — public intercity taxi Telegram leads (2026-10-28)
- TGStat public transport-group directory (route-community discovery; directory page itself is dated July 2025): https://tgstat.org/list/2095/transport/
- Andijon Toshkent Taksi: https://t.me/tashkent_andijon1
- Fargona Yaypan Taxi: https://t.me/fargona_yaypan_taxi_7
- Quva Toshkent Fargona Taxi: https://t.me/Quva_Toshkent_Fargona_Taxil
- Samarqand Taxi / Такси Тошкент Самарканд: https://t.me/SAMARQAND_TAXI_2
- Nukus–Kungrad Taxi: https://t.me/Nukus_kungrad2
- Termez Toshkent Taksi: https://t.me/termez_toshkent_taksi_taxi
- Namangan Toshkent Petak: https://t.me/namangan_toshkent_taxi_1250
- Toshkent–Surxondaryo Taxi M39: https://t.me/surxondaryo_toshkent_taxi24
- Urganch Tashkent Taksi: https://t.me/Toshkent_Xorazim_urganch_taxi
- G‘uzor–Toshkent taxi: https://t.me/guzor_toshkent_taksi
- Kitob–Shahrisabz–Yakkabog‘–Toshkent taxi: https://t.me/kitob_shahrisabz_toshkent
- Mangit–Nukus taxi / poputi: https://t.me/poputimoshin
- Tashkent–Nukus Taxi 24/7: https://t.me/tashkentnokis
- Telegram pages establish a route/community lead only; they do not establish a physical taxi stand unless the page explicitly gives that location.

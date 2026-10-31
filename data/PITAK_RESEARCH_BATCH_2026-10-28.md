# Pitak Go — исследовательский пакет 2026-10-28 (batch 2)

## Что добавлено

В `data/pitak_research_leads.json` добавлено 20 новых исследовательских записей. Это не 20 подтверждённых GPS-точек: часть является следами из стороннего каталога taxi stands, часть — описанными в путеводителях точками отправления к международным границам. Все координаты оставлены `null`, пока не извлечены и не подтверждены.

### Городские/региональные кандидаты из каталога taxi stands
- 77 Pitak, Маргилан
- Taksi Payaryk, Самарканд
- Shakhrisabz Station (географическая привязка спорная)
- Qorajiyda Bekati, Маргилан
- Solijonobod Bekati, Маргилан
- Oktosh Avtobusnaya Ostanovka, Туракурган (может быть обычной остановкой)
- Toshkent Petak, Туракурган (название указывает направление, координаты не подтверждены)
- Bekobod Stoyanka, Туракурган (не подтверждено)
- Stoyanka Akhsi, Туракурган (межгород не подтверждён)
- Chust Avtobusnaya Ostanovka (городская привязка требует проверки)
- Chiroqchi Stoyanka (каталог содержит вероятную ошибку географии)
- Стоянка Такси 001, Карши
- Mezhdugorodnaya Avtostoyanka Taksi, Кунград
- Stoyanka Mezhgortaksistov, Ургенч

### Международные/приграничные кандидаты
- Кафтaрхона, Самарканд → Джартепа/Пенджикент (Таджикистан)
- Куйлюк, Ташкент → Ойбек/Худжанд (Таджикистан)
- Стоянка такси на узбекской стороне Ойбека
- Бекобод → переход Куштегирмон (точка отправления внутри города неизвестна)
- Кунград → Дауыт-Ота/Бейнеу (исторический lead; исключён из действующей карты до проверки статуса пассажирского перехода)

## Источники
- https://www.fastbase.com/countryindex/Uzbekistan/T/Taxi-stand — каталог показывает 73 объекта по категории taxi stand, но включает ошибки географии и не даёт гарантии межгородского назначения.
- https://samarkand-guide.com/services/transport — описывает пятак Кафтaрхона для Ургута и Джартепа, а также другие стоянки Самарканда.
- https://uzbekistanwanderer.com/uzbekistan-to-tajikistan/ — описывает маршруты shared taxi и зоны ожидания у переходов.
- https://note.com/playful_sheph/n/n6f74b67b0378?hl=en — свидетельство путешественника о посадке у Куйлюка для Ойбека.
- https://en.wikivoyage.org/wiki/Uzbekistan — справочные упоминания о такси у границ.

## Правило качества
Не загружать эти записи в видимую пассажиру карту как подтверждённые пятаки до проверки географии, точного pin и междугороднего/международного назначения. Не конвертировать короткие plus codes в координаты без полного кода и проверенной locality.


## Active expansion batch — 2026-10-28

Added 23 new research leads in dataset version 0.5.0. They include intercity taxi stand candidates, international border-route transfer leads, and directory-only candidates. Directory-only records are not map-ready.

| Lead ID | Candidate | Evidence | Status |
|---|---|---|---|
| LEAD-TAS-OLMAZOR-WEST | Ташкент: стоянка у автовокзала «Олмазор» | explicit_travel_guide_mention | needs_exact_pin |
| LEAD-SAM-KAFTARXONA-JARTEPA | Самарканд: Кафтaрхона — международное направление | explicit_travel_guide_mention | needs_exact_pin |
| LEAD-SAM-REGISTAN-KAFTARXONA-CONNECT | Самарканд: Registon bekati — пересадка на Кафтaрхону | explicit_travel_guide_mention | needs_exact_pin |
| LEAD-TAS-OYBEK-TRANSFER | Ташкент: Куйлюк — направление Ойбек/Худжанд | explicit_travel_guide_mention | needs_exact_pin |
| LEAD-OYBEK-UZ-SIDE | Ойбек: стоянка такси на узбекской стороне КПП | explicit_travel_guide_mention | needs_exact_pin |
| LEAD-BESHARIQ-PATAR | Бешарык/Патар: трансграничная пересадка | explicit_travel_guide_mention | needs_exact_pin |
| LEAD-DENAU-SARIOSiyo | Денау: такси к Сариосиё/Турсунзаде | explicit_travel_guide_mention | needs_exact_pin |
| LEAD-TERMEZ-GULBAHOR | Термез: такси/маршрутки к Гулбахору | explicit_travel_guide_mention | needs_exact_pin |
| LEAD-BUKHARA-ALAT-FARAP | Бухара: такси к Алат/Фарап | explicit_travel_guide_mention | needs_exact_pin |
| LEAD-KHIVA-SHAVAT | Хива/Ургенч: такси к Шават—Дашогуз | explicit_travel_guide_mention | needs_exact_pin |
| LEAD-NUKUS-HOJAYLI | Нукус/Ходжейли: такси к КПП Ходжейли | explicit_travel_guide_mention | needs_exact_pin |
| LEAD-KUNGRAD-BEYNEU | Кунград: междугородняя стоянка такси | directory_listing_candidate | needs_map_validation |
| LEAD-MARGILAN-77-PITAK | Маргилан: 77 Pitak | directory_listing_candidate | needs_map_validation |
| LEAD-MARGILAN-QORAJIYDA | Маргилан: Qorajiyda Bekati | directory_listing_candidate | needs_map_validation |
| LEAD-MARGILAN-SOLIJONOBOD | Маргилан: Solijonobod Bekati | directory_listing_candidate | needs_map_validation |
| LEAD-QARSHI-MUSTAQILLIK | Карши: Стоянка такси 001 | directory_listing_candidate | needs_map_validation |
| LEAD-QARSHI-MARSHRUTKI8 | Карши: Avtostoyanka Marshrutki 8 | directory_listing_candidate | needs_map_validation |
| LEAD-URGENCH-MEZHGOROD | Ургенч: стоянка междугородних таксистов | directory_listing_candidate | needs_map_validation |
| LEAD-SAM-PAYARYK | Самарканд: Taksi Payaryk | directory_listing_candidate | needs_map_validation |
| LEAD-TURAKURGAN-TOSHKENT-PETAK | Туракурган: Toshkent Petak | directory_listing_candidate | needs_map_validation |
| LEAD-TURAKURGAN-AKHSI | Туракурган: Stoyanka Akhsi | directory_listing_candidate | needs_map_validation |
| LEAD-TURAKURGAN-BEKOBOD | Туракурган: Bekobod Stoyanka | directory_listing_candidate | needs_map_validation |
| LEAD-NUKUS-KONYEQALA | Нукус: Konye Qala / Gone Kala Bus Stand | directory_listing_candidate | needs_map_validation |

Important: route/transfer leads do not prove a distinct physical taxi rank. Keep them separate from verified pitaks until an exact pickup point is confirmed.


## Batch 5 — Namangan transport directory sweep (2026-10-28)

Added **11** new candidate records from a public transport directory: LEAD-NAM-ANDIJAN-PITAK, LEAD-NAM-NANAY-PITAK, LEAD-NAM-NURABAD-PITAK, LEAD-NAM-UYCHI-PITAK, LEAD-NAM-UCHKORGON-PITAK, LEAD-NAM-HAKKULABAD-PITAK, LEAD-NAM-YANGIKURGAN-PITAK, LEAD-NAM-FARGONA-MARGILON-PITAK, LEAD-NAM-JOMASHUY-TASHBULAQ, LEAD-NAM-KOSONSOY-PATCH, LEAD-NAM-XORAZM-ISUZU-PITAK. Source: https://uzbekistan-streets.openalfa.com/namangan/transport. The directory names these as bus stations/transport services and gives partial street descriptions, but it does not publish coordinates. All are marked `needs_map_validation`; none has been promoted to the production-ready catalog.

Candidates: Andijan pitak (Boburshoh ko‘chasi); Nanay (Beruni); Nurabad (Ququmboy shoh); Uychi and Uchqorgon (Uychi ko‘chasi); Hakkulabad (address absent); Yangikurgan (Uychi ko‘chasi); Fergana–Margilan new pitak (Nodira); Jomashuy–Tashbulaq (address absent); Kosonsoy (Ququmboy shoh); XORAZM ISUZU PITAK (Kosonsoy ko‘chasi, destination ambiguity).


## Batch 6 — official station coordinate sweep (2026-10-28)

Source: Ministry of Transport public register of bus terminals/stations: https://mintrans.uz/uz/avtovokzal-va-avtostantsiyalar-boyicha-malumot

Added 28 geocoded candidates in Andijan, Namangan, Samarkand, Bukhara, Navoi, Kashkadarya, Surkhandarya, Syrdarya, and Fergana regions. These are official bus-station pins, **not confirmed taxi-pitak pins**; all are marked for taxi pickup verification.

- **Узумзор автостанция** — Андижан; Узбекистанская улица, 281; 40.78296, 72.281548. Status: station pin verified from ministry register; taxi stand unconfirmed.
- **GAVS автостанция** — Андижан; Андижан—Асака, дом 1; 40.736332, 72.319989. Status: station pin verified from ministry register; taxi stand unconfirmed.
- **Кушарык автостанция** — Андижан; массив Кушарык, 32-А; 40.814987, 72.331607. Status: station pin verified from ministry register; taxi stand unconfirmed.
- **Жахон автостанция** — Андижан; улица Бутакара, 1; 40.828556, 72.358113. Status: station pin verified from ministry register; taxi stand unconfirmed.
- **Шахрихан автостанция** — Шахрихан; Шох-кочаси, 46; 40.712341, 72.054651. Status: station pin verified from ministry register; taxi stand unconfirmed.
- **Дустлик автостанция** — Наманган; улица 8 Марта, 6; 41.004284, 71.647255. Status: station pin verified from ministry register; taxi stand unconfirmed.
- **Чуст автостанция** — Чуст; махалля Пансада, улица Чустий, 34; 40.99262, 71.228903. Status: station pin verified from ministry register; taxi stand unconfirmed.
- **Поп автостанция** — Поп; улица Назар-Али Ниёзова; 40.871042, 71.081308. Status: station pin verified from ministry register; taxi stand unconfirmed.
- **Мингбулак автостанция** — Жомашуй; улица Озодлик, 110; 40.852472, 71.465037. Status: station pin verified from ministry register; taxi stand unconfirmed.
- **Каттакурган автостанция** — Каттакурган; улица Навои, 1; 39.544752, 66.150199. Status: station pin verified from ministry register; taxi stand unconfirmed.
- **Пайшанба автостанция** — Пайшанба; улица Навои; 40.003802, 66.134938. Status: station pin verified from ministry register; taxi stand unconfirmed.
- **Сиёб автостанция** — Самарканд; махалля Кафтарахона, улица Панджакент; 39.38372, 66.595903. Status: station pin verified from ministry register; taxi stand unconfirmed.
- **Гиждуван автостанция** — Гиждуван; улица Ю. Хамадани, 118; 40.095639, 64.682755. Status: station pin verified from ministry register; taxi stand unconfirmed.
- **Каган автостанция** — Каган; Бухарское шоссе; 39.724135, 64.547734. Status: station pin verified from ministry register; taxi stand unconfirmed.
- **Каракуль автостанция** — Каракуль; улица Бухара, 121; 39.505003, 63.843941. Status: station pin verified from ministry register; taxi stand unconfirmed.
- **Зарафшан автостанция** — Зарафшан; 1-й микрорайон; 41.341489, 64.112723. Status: station pin verified from ministry register; taxi stand unconfirmed.
- **Нурата автостанция** — Нурата; улица Х. Худойкулова; 40.341315, 65.420673. Status: station pin verified from ministry register; taxi stand unconfirmed.
- **Бешкент автостанция** — Бешкент; улица Хамза, 3; 38.49179, 65.3853. Status: station pin verified from ministry register; taxi stand unconfirmed.
- **Дехканабад автостанция** — Дехканабад; улица Навои; 38.20574, 66.29294. Status: station pin verified from ministry register; taxi stand unconfirmed.
- **Шахрисабз автостанция** — Шахрисабз; Кушчинор, кишлак Чоштепа; 39.01038, 66.48148. Status: station pin verified from ministry register; taxi stand unconfirmed.
- **Карши автостанция (новая)** — Карши; Отчопар, дорога Карши—Шахрисабз, 1/1; 38.5142, 65.51303. Status: station pin verified from ministry register; taxi stand unconfirmed.
- **Ангор автостанция** — Ангор; махалля Янги Турмуш, массив Истиклол; 37.444733, 67.154495. Status: station pin verified from ministry register; taxi stand unconfirmed.
- **Термез автостанция** — Термез; массив Фаровон, 2-й квартал; 37.248768, 67.3102. Status: station pin verified from ministry register; taxi stand unconfirmed.
- **Бойсун автостанция** — Бойсун; махалля Газа; 38.184213, 67.210772. Status: station pin verified from ministry register; taxi stand unconfirmed.
- **Гулистан автостанция** — Гулистан; улица Ташкент, 97; 40.498235, 68.762356. Status: station pin verified from ministry register; taxi stand unconfirmed.
- **Янгиер автостанция** — Янгиер; проспект Амира Темура, 4; 40.269941, 68.829241. Status: station pin verified from ministry register; taxi stand unconfirmed.
- **Кува автостанция** — Кува; улица А. Яссави; 40.524681, 72.066516. Status: station pin verified from ministry register; taxi stand unconfirmed.
- **Авто Люкс Фергана автостанция** — Фергана; пересечение улиц Додхох и П. Махмуд; 40.388794, 71.79115. Status: station pin verified from ministry register; taxi stand unconfirmed.


## Batch 7 — additional map/community leads (2026-10-28)
Added four non-duplicated leads: Intercity Taxi (Tashkent, Plus Code 754R+PXH), Jizzakh taksilari (Tashkent, shoe factory no. 2 landmark; routes mentioned in map snippet), Pyatak Taksi (Tashkent, Plus Code 765F+W6), and a Samarkand “Bukhara pitak” reference from public Telegram. None was promoted to the verified main catalog: exact GPS or active taxi-pitak use is incomplete.
Sources: Google Maps search links are retained as map discovery links; public Telegram archive https://t.me/s/potrebitel_uz?before=9458 and https://t.me/s/potrebitel_uz?before=11139.


## Batch 8 — additional map-listed and source-described taxi stands

Added 5 unique research leads (dataset version 0.8.0). They are candidates, not production-verified pickup points. No numeric coordinates were invented where only a Plus Code or textual location was available.

- **Andijon pitak / Андижанский пятак** — Tashkent Ring Automobile Road; Waze/Maps listing Plus Code 68VQ+CXH. Routes: Андижан, Ферганская долина. Status: `candidate_needs_coordinate_and_active_site_verification`. Source: https://www.google.com/maps/search/?api=1&query=Andijon+pitak+68VQ%2BCXH
- **Toshkent–Jizzax taksi / Ташкент—Джизак такси** — Район метро Алмазар; Plus Code 754W+943. Routes: Джизак, Заамин. Status: `candidate_needs_exact_pin_confirmation`. Source: https://www.google.com/maps/search/?api=1&query=Toshkent+Jizzax+taksi+754W%2B943
- **Oybek/Aybek border pitak / пятак на Ойбек** — Ташкент; Plus Code 68QJ+CFH; точный вход/посадку уточнить. Routes: Ойбек, Худжанд, Таджикистан. Status: `candidate_needs_active_site_verification`. Source: https://www.google.com/maps/search/?api=1&query=Pyatak+Taksi+K+Granitse+S+Tadzhikistanom+Aybek+68QJ%2BCFH
- **Пятак у обсерватории Улугбека — Ташкент** — Парковка у обсерватории Улугбека; источник различает верхнюю парковку как основную. Routes: Ташкент, Бухара. Status: `candidate_needs_coordinate_pin`. Source: https://samarkand-guide.com/services/transport
- **Kaftarxona / Кафтархона — пригородный пятак** — Автостанция Кафтархона, Самарканд; место для Damas и такси. Routes: Ургут, Джартепа, Пенджикент. Status: `candidate_needs_coordinate_pin_and_current_confirmation`. Source: https://samarkand-guide.com/services/transport

**Validation note:** coordinate-less records remain separate research leads; no new records were promoted into the main catalogue.


## Пакет 10 — сверка по официальным маршрутным документам
Добавлено новых записей: 10. Источник: https://gov.uz/ru/mintrans/contest/view/204802. Найдены маршрутные узлы/конечные остановки для Нукуса, Турткуля, Денау, Ургенча, Ромитана, Карши и Самарканда. Это зацепки для дальнейшего поиска пятаков, а не подтверждённые стоянки такси. Координаты не добавлялись, поскольку источник их не публикует.


## Batch 12 — official route nodes for nationwide follow-up (2026-10-28)
- Sources: Ministry of Transport tender pages https://gov.uz/ru/mintrans/contest/view/199907, https://gov.uz/ru/mintrans/contest/view/198272, and https://gov.uz/ru/mintrans/contest/view/175864.
- Added 12 distinct route-node research leads across Karakalpakstan, Jizzakh, Kashkadarya, Samarkand, Fergana, Khorezm and Surkhandarya.
- These are leads for discovering local pickup points, not verified informal taxi ranks. Coordinates remain null until supported by a reliable map pin or direct evidence.

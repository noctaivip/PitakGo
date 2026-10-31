# Схема каталога Pitak Go

- `id`: стабильный внутренний идентификатор.
- `region`, `city`: административная привязка.
- `name_ru`, `name_uz`: варианты названия.
- `point_type`: `official_station`, `informal_pitak_lead` или `confirmed_pitak` после подтверждения.
- `address_or_landmark`: адрес/ориентир, отдельно от координат.
- `latitude`, `longitude`: десятичные градусы; пустые, нулевые или подозрительные значения требуют проверки.
- `routes_known`: только документированные направления.
- `source_url`, `source_note`: происхождение сведений.
- `verification_status`, `confidence`: нельзя сводить к одному полю; источник и статус подтверждения различаются.
- `last_checked`: дата последней проверки источника.
- `notes`: оговорки и задачи верификации.


## 2026-10-28 update
- `pitaks_catalog.csv/json` now includes `UZ-TAS-VODIY-PITAK` with a map-published pin (41.243757, 69.339582). It remains a candidate until the exact live pickup area is confirmed on site.
- `pitak_research_leads.json` version 0.5.0 contains 59 leads; not all leads are distinct physical taxi stands.

# PitakGo v0.4 — фирменная иконка

Добавлена выбранная иконка в PWA manifest, favicon, Apple touch icon и набор Android mipmap.

## Первый запуск (PowerShell)
```powershell
cd "$env:USERPROFILE\Downloads\PitakGo_Android_v04"
npm install
powershell -ExecutionPolicy Bypass -File .\SETUP_ANDROID.ps1
```
Скрипт создаёт Android-проект (если отсутствует), синхронизирует www, копирует иконки и открывает Android Studio. Подключите телефон по USB и нажмите Run.

## После изменения HTML/CSS/JS
```powershell
cd "$env:USERPROFILE\Downloads\PitakGo_Android_v04"
npx cap sync android
```
При повторном `npx cap add android` иконки восстановить запуском `SETUP_ANDROID.ps1`.

PWA устанавливается с HTTPS/localhost, а не через file://. Это локальный прототип: онлайн-бронирования и реальные платежи не подключены.


## v0.5
- Зависимые селекторы: область → город/район → пятак для отправления и прибытия.
- Поиск и запрос цены используют одну выбранную пару пятаков.
- Все дополнительные пятаки и географические записи предварительные и требуют полевой проверки.
- Данные и оплата по-прежнему локальные демонстрационные.

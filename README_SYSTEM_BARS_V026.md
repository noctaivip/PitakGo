Пятак Go v0.26 — исправление системных полос Android/iOS.

Android: StatusBar overlaysWebView=false; светлая непрозрачная системная панель #F4F6FB, тёмные системные значки; нижняя navigation bar такого же цвета. Скрипт apply-system-bars.ps1 изменяет только android/app/src/main/res/values/colors.xml и styles.xml, создаёт values-v35/styles.xml для Android 15. Остальная логика приложения скопирована из v0.25 без изменений.

iOS/PWA: safe-area-inset-top/bottom и viewport-fit=cover, светлый фон веб-страницы. Для нативной iOS-сборки статусбар использует плагин @capacitor/status-bar; на реальном iPhone не проверялось.

Установка в существующий PitakGo (не удаляйте android):
cd "$env:USERPROFILE\Downloads\PitakGo"; npm install; npx cap sync android; powershell -ExecutionPolicy Bypass -File .\apply-system-bars.ps1; npx cap open android

Важно: сборка на устройстве и проверка визуального расположения системных кнопок пока не выполнялись.

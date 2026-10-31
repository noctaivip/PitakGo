# PitakGo v0.34 — вход и права Supabase

## Что выявлено
- Auth logs: email successfully confirmed; password sign-in returned HTTP 200.
- Confirmation email redirected to http://localhost:3000 (Supabase Auth Site URL), so mobile browser displayed connection refused AFTER confirmation.
- Database: permission denied for table pitaks. Auth works, but catalog permissions block the UI.

## ОБЯЗАТЕЛЬНО на сервере
1. Откройте https://supabase.com/dashboard/project/frtlpwktiyhfmxcdudfi/sql/new
2. Вставьте BACKEND/FIX_V034_CATALOG_PERMISSIONS.sql и нажмите Run. This is required; ZIP alone cannot change database grants.
3. В Authentication → URL Configuration замените Site URL http://localhost:3000 на реальный HTTPS адрес, который контролируете (не ставьте фиктивный адрес).
4. Для подтверждения внутри приложения в Authentication → Email Templates → Confirm signup используйте шестизначный код `{{ .Token }}` в теле письма вместо ссылки; тогда введите его в новом поле приложения. Также в Email Templates → Reset Password замените ссылку на код `{{ .Token }}` — для восстановления пароля внутри приложения. До изменения шаблонов письма-ссылки могут вести на localhost.

## Приложение
- Успешная авторизация немедленно показывает аккаунт; каталог и профиль загружаются отдельно.
- Не сбрасывает сессию из-за ошибки SELECT.
- Вход, повторная отправка письма, восстановление пароля, код подтверждения.
- Сохраняет предыдущие функции v0.33 (включая схему сидений).

## Сборка
`cd "$env:USERPROFILE\Downloads\PitakGo"; npx cap sync android; npx cap open android`

Внимание: изменения SQL и шаблона писем требуют применения в панели Supabase. Двухпользовательский end-to-end тест не выполнен.

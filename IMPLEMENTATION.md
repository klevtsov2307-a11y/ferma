# Farm-off — выполнение двух списков рекомендаций

Два списка содержат пересекающиеся требования. Ниже единый реестр направлений; статус означает фактическую готовность, а не обещание. Все 200 пунктов НЕ завершены.

| Направление | Состояние | Что осталось |
|---|---|---|
| Пилот, штат, расписание, ответственность | Требуются решения фермы | Участники, часы, сотрудники, регламент сбоев |
| Предмет аренды и экономика | Требуются решения фермы | Условия, сроки, цены, себестоимость, неурожай |
| Личное хозяйство и схема | Частично | Единая навигация, семейные права, улучшения, режим списка |
| Фактическая карта 50 участков | Частично | Проверить размеры, оснащение, фотографии на месте |
| Аренда | Частично | Отдельные записи созданы; интервальная аренда, срок брони и продление ещё не реализованы |
| Каталог услуг | Реализован базовый вариант | Владелец должен утвердить цены и длительность, тарифы закрыты по умолчанию |
| Платежи | Не подключены | Провайдер, серверная проверка уведомлений, возвраты, чеки |
| Заказы работ | Реализован базовый вариант | Цена в копейках, снимок тарифа, идемпотентность, конфликты и статусы; платные задания блокируются до оплаты |
| Планирование сотрудников | Частично | Назначение себе, проверка пересечения; выбор других сотрудников, смены, маршруты и запас времени ещё нужны |
| Исполнение и отчёт | Частично | Выход, начало, текстовый отчёт и приёмка; фотографии, спор и переделка ещё нужны |
| Агрономические правила | Частично | Состояния и утверждаемые интервалы; культура, почва, реальные дозировки и исключения требуют специалиста |
| Камеры | Частично | HTTPS-воспроизведение; нужны оборудование, шлюз приватного доступа и нагрузочные испытания |
| Уведомления | Частично | Внутри сайта и обновление открытой очереди; push, email, настройка каналов ещё нужны |
| Паспорт урожая | Частично | Партия и история движений; нужен отдельный цикл посадки, фото, проверка массы и публичный QR |
| Рейтинг | Не включён | Нужны критерии, доказательства, версия модели и проверка на реальном урожае |
| Запасы | Реализован базовый вариант | Масса в граммах, резерв, выдача, списание; разделение/смешивание партий, приёмка и физическое хранение ещё нужны |
| Маркет | Частично | Объявления; реальные заказы товаров, сделки, резервы покупателей и оплата ещё нужны |
| Доставка | Не подключена | Есть план получения; нужны перевозчик, стоимость, упаковка, подтверждение выдачи и претензии |
| Аккаунты | Частично | Роли, сессии и выход везде; подтверждение контакта, восстановление, семейные права и персональные настройки ещё нужны |
| Безопасность и надёжность | Частично | Транзакции основных операций, тесты правил; полный аудит API, пагинация, резервное восстановление и многопользовательские испытания ещё нужны |
| Приложение | Основа | Общий API и адаптивный сайт; нативный клиент, мобильная авторизация и push ещё нужны |
| Животные | Будущий этап | Отдельный регламент благополучия, ухода, доступов и продукции |

## Проверенная информация фермы
Краснодарский край, Белореченск, ул. Победы, 479.

## Ближайшие зависимости
1. Утвердить реальный прайс и длительность услуг, часы работы, число исполнителей.
2. Подтвердить физические участки, оснащение и планы ухода.
3. Выбрать платёжного провайдера и предоставить подключение через секреты хостинга.
4. Получить модель камер и формат потоков.
5. Установить условия аренды, приёмки урожая и получения.

## Проверка выпуска
Автоматические тесты: пароли, права, состояния ухода, снимок тарифа, идемпотентность, блокировка неоплаченных работ, отмена, история, остатки и резервы. Это не заменяет пилот и проверку сотрудниками на ферме.

## Harvest lifecycle increment (2026-11-06)
Implemented: calendar-month demo storage/care purchases, wallet entries, spend ceiling, vacation preferences, plot zones, typed requests, harvest windows, daily in-app reminders via hourly scheduled function, staff batch acceptance with pantry/fridge conditions and per-batch expiry, multi-batch delivery/gift/charity reservations, guarded delivery state machine, staff disposal, verified charity directory, storage-gated produce listings with stock reservations and owner cancellation.
External dependencies remain: courier price/slots and carrier integration, approved autocare package and automatic execution, actual archive recording/retention/playback and timelapse rendering, external push delivery. Equipment/seedling/kit/ripeness/inspection options currently create staff-review requests, not paid executable jobs. Subscriptions are simulations, not proof of physical service activation. No invented charity recipients or camera recordings. Rental billing still not connected. Monthly ceiling counts gross demo work/subscription outgoings; refunds do not restore it.

## 30 season features (2026-11-06)
1 Calendar combines rental end, work slots, harvest deadlines and custom events.
2 Local crop selector uses farm-admin-authored month/conditions cards; no local rules are invented.
3 Crop cycles retain crop/family history.
4 Compatibility compares water/environment groups; explicit partial-check limitation and area estimates.
5 Next-cycle planning retains existing history; physical planting remains approved work.
6 Plot waitlist with scheduled in-app availability notifications.
7 Atomic demo rental extension with snapshot charge and request-key replay protection.
8 Relocation request/review, not automatic transfer of plants or plot ownership.
9 Multi-plot ownership-checked management groups; actual adjacency not inferred from plot IDs.
10 Equipment passport with ownership/installation/maintenance fields.
11 Equipment rental request and farm review; stock, availability and terms require staff input.
12 Sourced manual weather notices with reminders; no weather-provider integration.
13 Timestamped manual readings with stale-data badge; no hardware telemetry integration.
14 Actual water-volume log with optional work linkage.
15 HTTPS photograph plus percentage-position problem marker.
16 Before/after photographs linked to work, gallery in season report.
17 Owner result acceptance or issue.
18 Issue creates linked rework request with review/result audit; no automatic paid job.
19 Material substitution requires owner's accept/reject decision.
20 Seed/material inventory with units and expiry.
21 Transactional consumption ledger, no negative balance, replay protection.
22 Date-range harvest forecast, staff confirmation and updates.
23 Multiple partial harvest batches linked to an unclosed crop cycle.
24 Packaging choice and admin quote before delivery confirmation.
25 Returnable-crate/deposit accounting and staff confirmation of physical return/refund; no automatic banking.
26 Merge compatible unconfirmed baskets without duplicating stock reservations. Demo market checkout transfers a lineage-preserving batch so purchases can join own-harvest baskets.
27 Future-harvest preorder request without guaranteed yield or charge; staff confirms details.
28 Owner markdown of fresh active listing only.
29 Actual stock-writeoff report with recorded causes.
30 Annual harvest/verified mass, demo expense/revenue/refund, delivered/gift/charity statistics, photo gallery and JSON export. Purchased batches excluded from own-grown yield.

These are application workflows, not confirmation of installed equipment, real weather feeds, agreed local agronomic data or physical work. Photos are HTTPS links supplied by staff/users; photo upload storage is not integrated.

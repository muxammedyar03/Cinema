# Design v2 — ekranlar va API farqi (KAN-32)

Epic: **KAN-27** · Task: **KAN-32** · Iste'molchilar: **KAN-29** (Admin), **KAN-30** (Mini App), **KAN-33** (Super Admin), **KAN-34** (Landing), **KAN-31** (lead API, keyingi task)

Manba: `design/v2/*.html` (main), skrinshotlar `design/v2/screenshots/*.png` (main, PR #7). Solishtirilgan kod: `apps/api` (main `c47c994`), `apps/api/prisma/schema.prisma`, `docs/contracts/*`.

> Bu hujjat **faqat taklif (additive)**. Hech bir mavjud endpoint, maydon yoki Mini App route o'chirilmaydi yoki nomi o'zgarmaydi. Dastlabki gap-review PR da kod o'zgarishi yo'q edi. **KAN-37** quyidagi qatorlarni qo'lladi (qolganlari ochiq).

## KAN-37 — qo'llangan qatorlar

| Qator | Holat |
| --- | --- |
| `POST/GET/PATCH /admin/staff`, `mustChangePassword`, `POST /auth/change-password`, guard `PASSWORD_CHANGE_REQUIRED` | ✅ [staff-accounts.md](./staff-accounts.md) |
| `Movie.isFeatured` + `GET /public/featured` va `GET /public/catalog` → `featured` / `featuredSource` | ✅ |
| `Session.audioLanguage` `ru \| uz \| null` | ✅ |
| Katalog: `rating`, `genres`, `minPriceUzs`; admin seanslar: `sold`, `remaining` | ✅ |
| Dashboard: `comparison` (o'tgan haftaning shu kuni), `stats.ticketsSoldToday`, `todaySessions[].posterUrl` | ✅ |
| `GET /auth/me` va login: `firstName`, `lastName`, `mustChangePassword` | ✅ |
| `Cinema.city`, `Cinema.tagline`, `Hall.format`, `CinemaPhoto.caption` | ✅ |
| To'lov / refund / QR (KAN-36), landing leads (KAN-31), CSV, jonli zal xaritasi, platform summary | ❌ shu taskda yo'q |

---

## Qisqa xulosa (dasturchi bo'lmaganlar uchun)

1. **Ko'p narsa tayyor.** Afisha, film sahifasi, joy tanlash, "nechta joy qoldi", kinoteatr profili (rasm, xarita), seanslar, filmlar, zallar, buyurtmalar ro'yxati, billing va dashboard KPI'lari hozirgi API'dan olinadi.
2. **Muhim topilma (v2 dan oldin ham bor muammo):** Mini App va admin paneli allaqachon **to'lov (Rahmat), QR bilet tekshirish, qaytarish (refund) va buyurtma tafsiloti** API'larini chaqiradi, lekin bu endpointlar `apps/api` da **hali yozilmagan** (kontrakt bor: KAN-6, KAN-7). Ya'ni hozir bu tugmalar serverdan xato oladi. v2 ning "Билеты", "Возвраты", "Проверка билетов" bo'limlari shunga bog'liq. Buni birinchi navbatda alohida backend taski qilish kerak.
3. **v2 da yangi, API'da yo'q ma'lumotlar:** kinoteatr **shahri**, zal **formati** ("3D · Dolby"), rasm **izohi** (caption), "o'tgan hafta bilan farq %", "oldingi davr" grafigi, afishadagi **reyting va janr** (bazada bor, lekin afisha ro'yxatida qaytmaydi), **"В центре внимания"** (featured film), xodimlar (**Команда**) ro'yxati va taklif qilish, **Билеты / Возвраты / Отчёты** ro'yxatlari, admin uchun seans bo'yicha **jonli zal xaritasi**, Super Admin **"Обращения"** (KAN-31 da qilinadi).
4. **Frontend uchun qoida:** jadvalda ❌ bo'lgan element API qo'shilmaguncha **ko'rsatilmaydi** (yashiriladi yoki bo'sh holat "Скоро" emas, umuman chiqmaydi). 🟡 bo'lsa, faqat bor qismi ko'rsatiladi. Soxta/demo raqam qo'yilmaydi.
5. PM va dizaynerga savollar oxirida (**Ochiq savollar**).

Belgilar: ✅ bor · 🟡 qisman · ❌ yo'q

---

## 0. Kontraktda bor, lekin API'da yo'q (v2 dan oldingi qarz)

Frontend (PR #4, KAN-8/KAN-9) quyidagilarni allaqachon chaqiradi; `apps/api/src` da controller yo'q. `PaymentProvider` enum'ida `RAHMAT` ham yo'q (faqat `CLICK | PAYME`).

| Endpoint (frontend chaqiradi) | Kim chaqiradi | Kontrakt | API holati | v2 ekrani | Iste'molchi |
| --- | --- | --- | --- | --- | --- |
| `POST /payments/rahmat/create` | `mini-app/components/rahmat-checkout.tsx` | [rahmat-payment.md](./rahmat-payment.md) | ❌ | Mini: Места → Продолжить | KAN-30 |
| `GET /orders/:orderId/payment`, `GET /payments/:id`, `POST /payments/:id/sync` | `rahmat-checkout.tsx` | rahmat-payment.md | ❌ | Mini: to'lov qaytishi | KAN-30 |
| `POST /orders/:orderId/refunds` (self, qisman ham) | `mini-app/components/self-refund.tsx` | [qr-refund.md](./qr-refund.md) | ❌ | Mini: Мои билеты | KAN-30 |
| `POST /admin/tickets/verify`, `GET /admin/tickets/by-code/:code` | `admin/app/m/tickets/verify/scan-client.tsx` | qr-refund.md | ❌ | Admin: Проверка билетов, staff `m/*` | KAN-29 |
| `GET /admin/orders/:id` | `admin/app/orders/[id]/page.tsx` | qr-refund.md (staff refund) | ❌ | Admin: Заказы → Подробнее | KAN-29 |
| `POST /admin/orders/:orderId/refunds` (qisman: bitta bilet) | `admin/app/orders/[id]/refund-panel.tsx` | qr-refund.md | ❌ | Admin: Заказ dialog, Возвраты | KAN-29 |

**Taklif:** alohida backend task "KAN-6/7 implementatsiyasi" (P0). Kontraktlar o'zgarmaydi; faqat yoziladi. Qisman qaytarish (bitta bilet) — PM qarori, saqlanadi.

---

## 1. Admin panel (`admin-New.html`, rol: CINEMA_ADMIN / STAFF) — KAN-29

### 1.1 Shell (sidebar, header)

| v2 da ko'rinadigan maydon | Holat | Hozirgi manba | Taklif (additive) |
| --- | --- | --- | --- |
| Kinoteatr nomi | ✅ | `GET /auth/me` → `staff[].cinemaName` | — |
| Shahar ("Ташкент") | ✅ KAN-37 | `Cinema.city` | `GET /admin/cinemas*`, profil va `GET /public/cinemas*` da `city` (bo'sh bo'lsa `null`) |
| Zallar soni ("2 зала") | ✅ | `GET /admin/cinemas` → `_count.halls` | — |
| Foydalanuvchi ismi ("Мухаммедияр") | ✅ KAN-37 | `GET /auth/me` va login → `firstName`, `lastName` | bo'sh bo'lsa `null` |
| Rol nomi | ✅ | `/auth/me` → `role`, `staff[].role` | "Режим просмотра" select production'ga kirmaydi (KAN-29) |
| Login sahifasi | ✅ | `POST /auth/login`, `POST /auth/logout` | — |

### 1.2 Обзор (`admin-dash.png`, `admin-mobile-dash.png`)

| Maydon | Holat | Hozirgi manba | Taklif |
| --- | --- | --- | --- |
| Выручка сегодня | ✅ | `GET /admin/dashboard` → `stats.revenueTodayUzs` | — |
| "↗ 18,2% к прошлому понедельнику" | ✅ KAN-37 | `GET /admin/dashboard` → `comparison` | `revenueTodayPrevUzs`, `ticketsSoldTodayPrev`, `deltaPct` (tushum), `ticketsDeltaPct`. Oldingi qiymat 0 bo'lsa foiz `null` |
| Продано билетов (bugun) + "+24" | ✅ KAN-37 | `stats.ticketsSoldToday` + `comparison.ticketsDeltaPct` | `ticketsActive` saqlanadi |
| Заполняемость | ✅ | `kpis.occupancyRate` | — |
| Сеансы сегодня | ✅ | `stats.sessionsToday` | — |
| Динамика выручки (Неделя/Месяц) | 🟡 | `revenueTrend` (7 kun), `kpiTrend` (`?range=daily|weekly`) | `?range=month` + `revenueTrendPrev[]` (oldingi davr seriyasi) |
| "+12,8% за период" | ❌ | — | `revenueTrendSummary: { totalUzs, prevTotalUzs, deltaPct }` |
| Сегодня на экране: film, zal, sotilgan/sig'im, vaqt | ✅ | `todaySessions[]` → `movieTitle, hallName, occupied, capacity, startsAt` | — |
| Сегодня на экране: poster | ✅ KAN-37 | `todaySessions[].posterUrl` | yo'q bo'lsa `null` |
| Последние заказы: №, film, xaridor, summa, status | ✅ | `recentOrders[]` | — |
| Super Admin'da pul yashirin | ✅ | `mode: "platform"` → pul 0 | saqlanadi |

### 1.3 Сеансы (`admin-sessions.png`)

| Maydon | Holat | Hozirgi manba | Taklif |
| --- | --- | --- | --- |
| Film, poster, davomiylik, yosh | ✅ | `GET /admin/sessions` → `movie.*` | — |
| Vaqt, zal, narx, status | ✅ | `startsAt, hall.name, basePriceUzs, status` | — |
| Заполняемость "20 / 48" | ✅ KAN-37 | `GET /admin/sessions` → `sold`, `remaining` | o'tiradigan zal: `sold` = SOLD, `remaining` = AVAILABLE; GA: sotilgan va sig'im minus band |
| Filtr (status), qidiruv | 🟡 | client-side | ixtiyoriy `?status=&q=` |

### 1.4 Фильмы / Залы / Редактор зала

| Maydon | Holat | Hozirgi manba | Taklif |
| --- | --- | --- | --- |
| Film: nom, janr, davomiylik, yosh, poster | ✅ | `GET /admin/movies` | — |
| Zal: nom, sig'im | ✅ | `GET /admin/cinemas/:id/halls` | — |
| Zal formati "3D · Dolby" | ✅ KAN-37 | `Hall.format` | create/update qabul qiladi; `null` bo'lsa badge yashiriladi |
| "N сеанса сегодня" (zal bo'yicha) | 🟡 | `GET /admin/sessions` dan client hisoblaydi | ixtiyoriy `halls[].sessionsToday` |
| Редактор: joylarni bloklash | ✅ | `PUT .../halls/:hallId/layout` (`SeatType.BLOCKED`) | — |

### 1.5 Карта зала (`admin-map.png`) — jonli holat

| Maydon | Holat | Hozirgi manba | Taklif |
| --- | --- | --- | --- |
| Seans tanlash | ✅ | `GET /admin/sessions` | — |
| Joy holati: sotilgan / band (hold) / bloklangan / bo'sh | ❌ (admin uchun) | `GET /public/sessions/:id` faqat `PUBLISHED` seans uchun, auth'siz | `GET /admin/sessions/:id/seats` → `[{ seatId, rowLabel, number, type, x, y, status: AVAILABLE|HELD|SOLD|BLOCKED, orderPublicNumber? }]`, cinema-scoped |
| Seans darajasida joy bloklash | ❌ | `SessionSeatStatus.BLOCKED` bor, endpoint yo'q | `POST /admin/sessions/:id/seats/block`, `.../unblock` `{ seatIds[] }` (faqat AVAILABLE ↔ BLOCKED) |
| "Забронировать" (kassa sotuvi) | ❌ MVP | — | **Qaror 2026-09-25:** kassa bron tugmasi MVP da yo'q; frontend ko'rsatmaydi |

### 1.6 Заказы (`admin-orders.png`)

| Maydon | Holat | Hozirgi manba | Taklif |
| --- | --- | --- | --- |
| №, film, xaridor, summa, status, biletlar soni | ✅ | `GET /admin/orders` → `publicNumber, movieTitle, customer, totalUzs, status, ticketCount` | — |
| Filtr "Оплачен / Ожидает оплаты / Возвращён", qidiruv | 🟡 | client-side, `take: 100` | `?status=&q=&cursor=` (pagination) |
| Подробнее (dialog) + qaytarish | ❌ | §0: `GET /admin/orders/:id`, `POST /admin/orders/:id/refunds` | §0 bo'yicha implementatsiya |

### 1.7 Билеты (`admin-tickets.png`) va Проверка билетов (`admin-scan.png`)

| Maydon | Holat | Hozirgi manba | Taklif |
| --- | --- | --- | --- |
| Bilet kodi, buyurtma №, film, joylar soni, status | ❌ | `Ticket` modeli bor, endpoint yo'q | `GET /admin/tickets?sessionId=&status=&cursor=` → `[{ code, status, usedAt, orderPublicNumber, movieTitle, startsAt, hallName, seatLabel? }]` |
| Kod bo'yicha tekshirish / "Вход разрешён" | ❌ | §0: `POST /admin/tickets/verify` | §0 |
| Staff mobil `m/*` sahifalari | 🟡 | sahifa bor (`m/tickets/verify`), API §0 | §0 |

### 1.8 Возвраты (`admin-refunds.png`)

| Maydon | Holat | Hozirgi manba | Taklif |
| --- | --- | --- | --- |
| Buyurtma №, xaridor, summa, status | ❌ | `Refund` modeli bor, ro'yxat endpointi yo'q | `GET /admin/refunds?status=&cursor=` → `[{ id, orderPublicNumber, customer, amountUzs, status, initiator, createdAt, ticketCodes[] }]` (initiator — schema-deltas KAN-7) |
| Qisman qaytarish (bitta bilet) | ❌ | §0 | saqlanadi (PM qarori) |

### 1.9 Отчёты (`admin-reports.png`)

| Maydon | Holat | Hozirgi manba | Taklif |
| --- | --- | --- | --- |
| Выручка va заполняемость grafigi | 🟡 | `GET /admin/dashboard?range=` → `kpiTrend`, `revenueTrend` | §1.2 dagi `range=month` + `revenueTrendPrev` |
| "Скачать CSV" | ❌ | — | `GET /admin/reports/revenue.csv?from=&to=` (`text/csv; charset=utf-8`, BOM, `;` ajratgich) — yoki birinchi bosqichda frontend `kpiTrend` dan CSV yasaydi |

### 1.10 Команда (`admin-staff.png`)

| Maydon | Holat | Hozirgi manba | Taklif |
| --- | --- | --- | --- |
| Ism, login, rol, status | ✅ KAN-37 | `GET /admin/staff` | `login`, `firstName`, `lastName`, `role`, `active`. Email bo'lsa qaytadi, bo'lmasa `null` |
| Rol nomlari | — | `STAFF` = "Контроль входа", `CINEMA_ADMIN` = "Администратор" | faqat UI mapping |
| "+ Добавить сотрудника" | ✅ KAN-37 | `POST /admin/staff` | login + vaqtinchalik parol + rol. Email yuborilmaydi. Batafsil: [staff-accounts.md](./staff-accounts.md) |
| Status "Активен" | ✅ KAN-37 | `active: boolean` | `PATCH /admin/staff/:id`. `false` bo'lsa login va admin kirishdan chiqadi |

---

## 2. Super Admin (`admin-New.html?role=super`) — KAN-33

| Ekran / maydon | Holat | Hozirgi manba | Taklif |
| --- | --- | --- | --- |
| KPI: Кинотеатров / "N активных" | ✅ | `GET /admin/cinemas` (uzunlik, `status`) | — |
| KPI: Залов | ✅ | `GET /admin/cinemas` → `_count.halls` yig'indisi | — |
| KPI: Администраторов | 🟡 | `_count.staff` (STAFF ham kiradi), `billing/overview` → `admins` (max 3 email) | `GET /admin/platform/summary` → `{ cinemas, cinemasActive, halls, cinemaAdmins, invoicesUnpaid }` (bitta so'rov) |
| KPI: Подписки к оплате | ✅ | `GET /admin/billing/invoices` (`DUE`/`OVERDUE`) | summary'da ham |
| Кинотеатры: nom, zallar soni, status | ✅ | `GET /admin/cinemas` | — |
| Кинотеатры: shahar | ✅ KAN-37 | `Cinema.city` | bo'sh bo'lsa `null` |
| Status "Ожидает подключения" | ✅ qaror | `profileComplete=false` | **Qaror 2026-09-25:** yangi enum yo'q. UI `profileComplete=false` ni shu status deb ko'rsatadi |
| Администраторы: ism, email, rol, status | 🟡 | `GET /admin/cinemas/:id/dossier`, `billing/overview.admins` | `GET /admin/platform/admins?cursor=` → `[{ userId, name, email, cinemaId, cinemaName, role }]` |
| Биллинг: счёт №, kinoteatr, davr, summa, status | ✅ | `GET /admin/billing/invoices` | — |
| Pul/GMV yashirin | ✅ | dashboard `mode: platform`, `GET /admin/orders` 403 | saqlanadi |
| Обращения (landing arizalari) | ❌ | — | **KAN-31** → `docs/contracts/landing-leads.md` (`GET /admin/leads`, `PATCH /admin/leads/:id`). KAN-31 tugaguncha sahifa bo'sh holatda qoladi |

---

## 3. Mini App (`mini-app.html`) — KAN-30

Route URL'lar o'zgarmaydi: `/`, `/movies/[id]`, `/sessions/[id]`, `/cinemas/[id]`, `/orders`, `/orders/[id]`, `/pay/return`. Hech bir taklif route o'zgartirishni talab qilmaydi.

### 3.1 Афиша (`mini-home.png`)

| Maydon | Holat | Hozirgi manba | Taklif |
| --- | --- | --- | --- |
| Kinoteatr + shahar ("Magic Cinema · Ташкент") | ✅ KAN-37 | `GET /public/cinemas` → `city` | `null` bo'lsa shahar yashiriladi |
| Sana chiplari (6 kun) | ✅ | `GET /public/catalog?from&to` → `days[]` | — |
| Poster, nom, yosh, davomiylik | ✅ | `catalog.days[].movies[]` → `posterUrl, title, ageRating, durationMin` | — |
| Reyting "★ 8.5" | ✅ KAN-37 | `GET /public/catalog` movie → `rating` | `null` bo'lsa yashiriladi |
| Janr + janr chiplari | ✅ KAN-37 | catalog movie → `genres` | bo'sh massiv bo'lishi mumkin |
| "от 75 000 сум" | ✅ KAN-37 | catalog movie → `minPriceUzs` | VIP va chegirma hisobga olinadi; narx yo'q bo'lsa `null` |
| "В центре внимания" (featured) | ✅ KAN-37 | `featured` + `featuredSource` | `manual` yoki `nearest`, aks holda `null` |
| "N фильма" soni | ✅ | `movies.length` | — |

### 3.2 Film sahifasi (`mini-detail.png`)

| Maydon | Holat | Hozirgi manba | Taklif |
| --- | --- | --- | --- |
| Reyting, janr, davomiylik, yosh, tavsif | ✅ | `GET /public/movies/:id` | — |
| Kinoteatr kartasi (nom, rasm, manzil, xarita) | ✅ | `GET /public/cinemas/:id` | — |
| Kinoteatr qisqa tavsifi ("Кинотеатр в парке Magic City") | ✅ KAN-37 | `Cinema.tagline` | `null` bo'lsa yashiriladi; `description` saqlanadi |
| Seans vaqti, narx, "N мест" qoldi | ✅ | `movie.sessions[]` → `startsAt, basePriceUzs, remaining, capacity` | — |
| "Зал 01 · Русский" (til) | ✅ KAN-37 | `sessions[].audioLanguage` | `ru` \| `uz` \| `null`. Film `audioLanguages` o'chirilmaydi |

### 3.3 Места (`mini-seats.png`)

| Maydon | Holat | Hozirgi manba | Taklif |
| --- | --- | --- | --- |
| "Свободно на 17:30 — N из M мест" | ✅ | `GET /public/sessions/:id` → `remaining`, `hall.capacity` | — |
| Joy xaritasi, holat, narx | ✅ | `seats[]` → `status, priceUzs, type` | — |
| Hold + TTL | ✅ | `POST /bookings/hold`, `hold-ga`, `holdExpiresAt` | — |
| Продолжить → to'lov | ❌ | §0 Rahmat | §0 |

### 3.4 Kinoteatr profili (`mini-cinema.png`)

| Maydon | Holat | Hozirgi manba | Taklif |
| --- | --- | --- | --- |
| Rasmlar galereyasi | ✅ | `photos[]` → `url, sortOrder` | — |
| Rasm izohi (caption) | ✅ KAN-37 | `CinemaPhoto.caption` | `POST .../photos` qabul qiladi; javobda `caption`, bo'sh bo'lsa `null` |
| Manzil, xarita (Yandex/Google) | ✅ | `map` payload | — |
| Follow tugmasi | ✅ | `/public/cinemas/:id/follow` | — |

### 3.5 Мои билеты / Profil (`mini-tickets.png`, `mini-profile.png`)

| Maydon | Holat | Hozirgi manba | Taklif |
| --- | --- | --- | --- |
| Film, kinoteatr, sana, vaqt, zal, joylar, soni, summa | ✅ | `GET /bookings/orders/:id` | — |
| QR kod | ✅ | `tickets[].code` | — |
| O'zi qaytarish (qisman ham) | ❌ | §0 `POST /orders/:id/refunds` | §0 |
| Profil ismi | ✅ KAN-37 | `GET /auth/me` → `firstName`, `lastName` | `null` bo'lsa klient Telegram ismini o'zi ko'rsatishi mumkin |
| Biletlar soni | ✅ | `GET /bookings/orders` | — |

Bo'sh / yuklanish / xato holatlari (seans yo'q, to'lov xatosi, hold tugadi) API javoblariga bog'liq emas — saqlanadi.

---

## 4. Landing (`landing/index.html`) — KAN-34

| Maydon | Holat | Manba | Taklif |
| --- | --- | --- | --- |
| Forma: `name`, `cinema`, `contact`, `message` | ❌ | — | **KAN-31** (`POST /public/leads`, `docs/contracts/landing-leads.md`) |
| Rozilik checkbox | ⚠️ | prototipda `name` atributi yo'q → serverga yuborilmaydi | KAN-34 da `name="consent"` qo'shiladi; KAN-31 `consent: true` ni talab qiladi |
| Javob | — | prototip `response.ok && result.id` ni tekshiradi | KAN-31 javobi `{ id, status }` bo'lishi kerak |
| Honeypot | — | prototipda yo'q | KAN-31 kontraktida maydon nomi belgilanadi, KAN-34 yashirin input qo'shadi |
| Qolgan bo'limlar (hero, demo zal, FAQ) | ✅ | statik, API kerak emas | — |

---

## 5. Taklif qilingan schema o'zgarishlari (hammasi ixtiyoriy/nullable, additive)

```prisma
model Cinema {
  // ... mavjud maydonlar ...
  city    String?   // Super Admin "Город", sidebar, Mini App header
  tagline String?   // Mini App cinema card qisqa matn (ixtiyoriy)
}

model Hall {
  // ...
  format String?    // "3D · Dolby" badge; null bo'lsa yashiriladi
}

model CinemaPhoto {
  // ...
  caption String?   @db.VarChar(160)
}

model Movie {
  // ...
  isFeatured Boolean @default(false)  // 2-bosqich; 1-bosqichda frontend qoidasi
}

model Session {
  // ...
  audioLanguage String?  // ixtiyoriy, "ru" | "uz" | "en"
}
```

`Lead` modeli — KAN-31 da (`landing-leads.md`). `PaymentProvider.RAHMAT`, `Refund.initiator` — mavjud [schema-deltas.md](./schema-deltas.md) (KAN-6/7), o'zgarmaydi.

## 6. Taklif qilingan API qo'shimchalari (xulosa)

| # | O'zgarish | Turi | Iste'molchi | Muhimlik |
| --- | --- | --- | --- | --- |
| A | Rahmat to'lov, ticket verify, refund (self + staff, qisman), `GET /admin/orders/:id` — mavjud kontrakt bo'yicha implementatsiya | yangi endpointlar (kontrakt bor) | KAN-29, KAN-30 | **P0** |
| B | `GET /public/catalog` movie: `rating`, `genres`, `minPriceUzs` | javobga maydon | KAN-30 | ✅ KAN-37 |
| C | `GET /admin/sessions`: `sold`, `remaining` | javobga maydon | KAN-29 | ✅ KAN-37 |
| D | `GET /admin/dashboard`: `todaySessions[].posterUrl`, `stats.ticketsSoldToday`, `comparison` (o'tgan haftaning shu kuni). `revenueTrendPrev` va `range=month` hali yo'q | javobga maydon | KAN-29 | 🟡 KAN-37 |
| E | `GET /auth/me`: `firstName`, `lastName`, `mustChangePassword` | javobga maydon | KAN-29, KAN-30 | ✅ KAN-37 |
| F | `GET /admin/sessions/:id/seats` (+ block/unblock) | yangi endpoint | KAN-29 (Карта зала) | P1 |
| G | `GET /admin/tickets`, `GET /admin/refunds` | yangi endpoint | KAN-29 | P1 (A dan keyin) |
| H | `GET/POST/PATCH /admin/staff` (login + vaqtinchalik parol, email yo'q) | yangi endpoint | KAN-29 (Команда) | ✅ KAN-37 |
| I | `GET /admin/platform/summary`, `GET /admin/platform/admins` | yangi endpoint | KAN-33 | P2 |
| J | `Cinema.city`, `Cinema.tagline`, `Hall.format`, `CinemaPhoto.caption` (+ javoblarda) | schema + maydon | KAN-29, KAN-30, KAN-33 | ✅ KAN-37 |
| K | `GET /admin/reports/revenue.csv` | yangi endpoint | KAN-29 (Отчёты) | P3 |
| L | Landing lead + `GET/PATCH /admin/leads` | yangi endpoint | KAN-33, KAN-34 | **KAN-31** |

Umumiy qoidalar (hamma yangi endpointlar uchun): mavjud `SessionGuard` + `RolesGuard` + `BillingLockGuard`; cinema-scoped (`canAccessCinema` / `canManageCinema`); Super Admin mijoz PII va pulini ko'rmaydi (mavjud privacy qoidasi); xato formati `{ statusCode, code, message }`; validatsiya `@cinema/validation` (zod).

## 7. Frontend uchun "ko'rsatish / yashirish" qoidasi

| Element | API tayyor bo'lguncha |
| --- | --- |
| Admin: Билеты, Возвраты, Команда, Карта зала (jonli), Отчёты CSV | sidebar'da **ko'rsatilmaydi** (KAN-29 band 4) |
| Admin: "% к прошлому ...", oldingi davr seriyasi, poster "Сегодня на экране"da | element yashiriladi |
| Admin: seanslar "Заполняемость" ustuni | C qo'shilguncha yashiriladi |
| Admin/Super: shahar, zal formati badge | yashiriladi |
| Super: Администраторов KPI | I qo'shilguncha karta yashiriladi (`_count.staff` ishlatilmaydi — unda STAFF ham bor) |
| Super: Обращения | bo'sh holat, KAN-31 dan keyin ulanadi |
| Mini: reyting, janr chiplari afishada | B qo'shilguncha yashiriladi (film sahifasida ko'rsatiladi — u yerda bor) |
| Mini: featured banner | frontend qoidasi (eng yaqin seans) yoki yashiriladi |
| Mini: rasm caption | yashiriladi |

## 8. Ochiq savollar (PM / Product UI UX designer)

1. **§0 (P0):** to'lov/verify/refund API'lari yozilmagan. Alohida backend task ochamizmi (KAN-6/7 implementatsiya)? v2 frontend tasklari bundan oldin tugasa, bu tugmalar xato beradi.
2. **Команда → "Пригласить":** email taklif (xat yuborish) kerakmi yoki admin parol bilan hisob yaratadimi (hozirgi `createClient` kabi)? Email yuborish infratuzilmasi yo'q.
3. **Карта зала → "Забронировать":** kassada joy sotish/bron MVP ga kiradimi? Kirmasa tugma chiqmaydi.
4. **Featured film:** qo'lda belgilanadimi (`isFeatured`) yoki avtomatik qoida yetarlimi?
5. **Super Admin "Ожидает подключения":** `profileComplete=false` bilan tenglashtirish maqulmi?
6. **Обращения:** jadval ustunlari va statuslar dizaynda yo'q (faqat bo'sh holat). KAN-31 da `new / in_progress / done` — dizayner tasdiqlasinmi?
7. **Landing rozilik checkbox:** serverga yuborilishi kerak (`name="consent"`) — KAN-34 ga qo'shish.
8. **Til (Русский)** seans bo'yichami yoki film bo'yicha yetarlimi?

## 9. Decisions 2026-09-25

PM qarorlari. KAN-37 shu bo'yicha yozilgan.

1. **Xodim akkauntlari.** Email infratuzilmasi yo'q. Kinoteatr administratori o'z kinoteatri uchun hisob yaratadi: login, vaqtinchalik parol, mavjud rol (`CINEMA_ADMIN` | `STAFF`). Parol hozirgi admin parollari kabi bcrypt. Javobda hash yo'q. Yaratilgan hisobda `mustChangePassword=true` (ustun defaulti `false`). Admin login javobi flagni qaytaradi. Flag `true` bo'lsa `POST /auth/change-password` flagni `false` qiladi. Shu vaqtgacha login, change-password, `GET /auth/me` va logout dan boshqa so'rovlar `403` `PASSWORD_CHANGE_REQUIRED`.
2. **Kassa «Забронировать».** MVP da yo'q. Backend endpoint yozilmaydi, frontend tugmani ko'rsatmaydi.
3. **Featured film.** Qo'lda: `Movie.isFeatured`. Bir kinoteatrda bittadan — `true` qilish shu tranzaksiyada qolgan filmlarni `false` qiladi. Public karta: featured filmda yaqinlashayotgan `PUBLISHED` seans bo'lsa `featuredSource: "manual"`, aks holda eng yaqin `PUBLISHED` seansli film `featuredSource: "nearest"`, aks holda `null` (karta yashiriladi).
4. **Super Admin «Ожидает подключения».** Yangi `CinemaStatus` yo'q. Bu holat `profileComplete=false` degani. `GET /admin/cinemas` allaqachon `profileComplete` qaytaradi.
5. **Audio til.** Seans bo'yicha, film bo'yicha emas: `Session.audioLanguage` nullable enum `ru | uz`, default yo'q. Belgilanmagan bo'lsa `null`.

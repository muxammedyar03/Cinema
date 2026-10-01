# VPS + Vercel deployment

Target VPS: `109.199.98.232`. Admin va Mini App — ikkita Vercel project.
API, PostgreSQL, Redis, worker, ixtiyoriy Telegram bot — VPS Docker Compose.

## Joriy holat

2026-09-30: VPS backend, baza, Redis, worker va bot o‘rnatildi.

- API: `https://cinema-api.109.199.98.232.sslip.io`
- Admin: `https://cinema-admin-virid.vercel.app`
- Mini App: `https://cinema-mini.vercel.app`
- Telegram bot: `https://t.me/cinemago_nukus_bot`; polling VPS'da.
  Menyu tugmasi yangi Mini App'ga yo‘naltirilgan.
- SSH: `ssh cinemavps` (`root@109.199.98.232`, port 22); lokal kalit `~/.ssh/cinema`.
- VPS Git checkout: `/var/www/cinema`; production env: `/var/www/cinema/deploy/.env.production` (600).
- Admin: `admin@cinema.local`; parol lokal `~/.ssh/cinema-admin-credentials.env` (600),
  serverda `/root/cinema-admin.env` (600). Parol repository yoki chatda saqlanmaydi.
- Vercel project ID'lari: `deploy/vercel-projects.json`. Har ikkala project `muxammedyar03/Cinema` GitHub repository'sining `main` branchiga ulangan; push frontendlarni avtomatik deploy qiladi.
- Production baza yangi; mahalliy demo ma’lumotlar ko‘chirilmagan.

API vaqtinchalik `sslip.io` DNS xizmatiga tayanadi; keyin shaxsiy API domeniga
almashtirish mumkin. HTTPS sertifikati Caddy tomonidan avtomatik yangilanadi.

## VPS tayyorlash

Avval mavjud server servislarini, bo‘sh disk/RAM va 80/443 portlarini tekshiring.
Docker Engine va Compose v2 kerak. Mavjud servislarni to‘xtatmang.
Serverga kodni yuborishda `.env*`, `.git`, `node_modules`, `.next`, `dist`,
`uploads`, SSH kalitlari va mahalliy ma’lumotlar bazasini ko‘chirmang.

1. Kodni serverdagi alohida katalogga joylashtiring, masalan `/opt/cinema`.
2. `cp deploy/.env.production.example deploy/.env.production` va `chmod 600 deploy/.env.production`.
3. `openssl rand -hex 32` bilan `POSTGRES_PASSWORD` yarating. Bu parol birinchi DB
   initialization uchun; keyin env'ni o‘zgartirish mavjud DB parolini almashtirmaydi.
4. API subdomen A record'ini VPS IP'ga yo‘naltiring. `API_DOMAIN=api.your-domain.uz`,
   `PUBLIC_API_URL=https://api.your-domain.uz`. Joriy vaqtinchalik hostname yuqorida ko‘rsatilgan.
   Shaxsiy domen bo‘lmasa, tekshirilgan boshqa HTTPS endpoint yechimi kerak;
   Vercel → VPS bog‘lanishida oddiy HTTP orqali sessiya yubormang.
5. `CORS_ORIGINS` ga faqat ikkita haqiqiy Vercel production origin'ini vergul bilan yozing.
6. Telegram tokenini faqat server env fayliga kiriting. Botni shu token bilan ishlayotgan
   boshqa polling process bor-yo‘qligini tekshirgach yoqing.
7. 80/443 inbound ochiq bo‘lsin. 5432/6379 tashqi portlari kerak emas.

```bash
./deploy/compose.sh build api
./deploy/compose.sh up -d
./deploy/compose.sh ps -a
./deploy/compose.sh logs --tail=100 api worker migrate caddy
curl --fail https://api.your-domain.uz/health
```

`migrate` muvaffaqiyatli tugamaguncha API ishga tushmaydi. API `/health` — liveness;
DB/Redis to‘liq tekshiruvi uchun login va katalog smoke test ham bajariladi.
`caddy` HTTPS sertifikatni avtomatik oladi; DNS, 80/443 va mavjud reverse proxy bilan
konfliktlar tekshirilishi kerak. DB, Redis va uploads named volume'larda saqlanadi.
Image ichida build/migration vositalari ham bor; keyinchalik hajmini kamaytirish mumkin.

## Production admin

Demo seed production'da ishlatilmaydi: uning umumiy paroli va demo userlari bor.
Birinchi super admin uchun VPS terminalida:

```bash
read -r -p 'Admin email: ' ADMIN_EMAIL
read -r -s -p 'Admin password (16+ characters): ' ADMIN_PASSWORD
export ADMIN_EMAIL ADMIN_PASSWORD
./deploy/compose.sh exec -e ADMIN_EMAIL -e ADMIN_PASSWORD api node scripts/create-admin.cjs
unset ADMIN_EMAIL ADMIN_PASSWORD
```

Bu script mavjud userni o‘zgartirmaydi. Parolni chat yoki shell command argument'iga yozmang.

Mavjud superadmin parolini o‘zgartirish uchun VPSda `ssh cinemavps` orqali kiring va quyidagini bajaring. `read -s` parolni ekranda ko‘rsatmaydi; kamida 16 belgi ishlating:

```bash
cd /var/www/cinema
export ADMIN_EMAIL=admin@cinema.local
read -r -s -p 'Yangi superadmin paroli (16+ belgi): ' ADMIN_PASSWORD; printf '\n'
export ADMIN_PASSWORD
./deploy/compose.sh exec -T -e ADMIN_EMAIL -e ADMIN_PASSWORD api node scripts/reset-admin-password.cjs
unset ADMIN_EMAIL ADMIN_PASSWORD
```

Script faqat `SUPER_ADMIN` rolidagi shu emailga tegishli hisobning parolini yangilaydi va uning Redis'dagi eski sessiyalarini bekor qiladi. Login sahifasida `admin@cinema.local` va `read -s` bosqichida kiritilgan oddiy paroldan foydalaning: bcrypt xeshini login maydoniga kiritmang. Script parolni o‘zi xeshlaydi.

## GitHub Actions: CI va VPS auto deploy

`main` branchiga har push va pull requestda lint, typecheck, build, unit testlar hamda Prisma schema/migration tekshiruvlari ishlaydi. Faqat `main`ga push bo‘lganda barcha tekshiruvlar muvaffaqiyatli tugasa, `deploy-vps` job ishga tushadi. U aynan tekshirilgan commitni `/var/www/cinema`ga olib keladi, bazadan backup oladi, Docker image'ni quradi, migration va konteynerlarni yangilaydi, HTTPS healthni tekshiradi. Bir vaqtda ikkita VPS deploy ishlamaydi.

GitHub repository **Settings → Secrets and variables → Actions** sahifasiga ikkita repository secret qo‘shing:

- `CINEMA_VPS_SSH_KEY`: faqat CI uchun yaratilgan `~/.ssh/cinema_actions` private key faylining to‘liq mazmuni. Uni chatga, commitga yoki issue'ga qo‘ymang.
- `CINEMA_VPS_KNOWN_HOSTS`: `~/.ssh/cinema_actions_known_hosts` faylining to‘liq mazmuni. Host fingerprintini VPS provayder konsolidagi fingerprint bilan solishtiring.

CI public key serverdagi `/root/.ssh/authorized_keys`da majburiy `cinema-deploy-ssh` komandasi bilan cheklangan; shell login bera olmaydi. `main`ga har push CI muvaffaqiyatli tugagach VPSga deploy bo‘ladi. Admin va Mini App Vercel projectlari ham shu GitHub repository'siga ulangan; ular `main` pushlarida o‘z build va deploylarini bajaradi.

## Vercel

Bir repository'dan **ikkita** Next.js project yarating. Root directory tashqarisidagi
workspace fayllarini build'ga qo‘shish sozlamasi yoqilgan bo‘lsin. Node.js 22.x.

| Sozlama | Admin | Mini App |
| --- | --- | --- |
| Root Directory | `apps/admin` | `apps/mini-app` |
| Install Command | `cd ../.. && pnpm install --frozen-lockfile` | `cd ../.. && pnpm install --frozen-lockfile` |
| Build Command | `cd ../.. && pnpm exec turbo run build --filter=@cinema/admin...` | `cd ../.. && pnpm exec turbo run build --filter=@cinema/mini-app...` |
| API_URL | `https://api.your-domain.uz` | `https://api.your-domain.uz` |
| NEXT_PUBLIC_API_URL | `/api` | `/api` |
| NEXT_PUBLIC_ADMIN_ORIGIN | — | Admin production HTTPS origin |

Vercel env'ga DB paroli va Telegram bot tokeni kerak emas.
`API_URL` build va runtime'da mavjud bo‘lishi kerak. Uni o‘zgartirgach redeploy qiling.
SSR to‘g‘ridan-to‘g‘ri HTTPS API'ga murojaat qiladi. Browser esa o‘z origin'idagi `/api/*`
rewrite orqali ishlaydi: `sid` cookie shu frontend domenida qoladi, admin SSR ham uni oladi.
API production'da `Secure; HttpOnly; SameSite=Lax` cookie qaytaradi. API response'lari
shared cache'ga tushmasligi uchun `private, no-store` ishlatiladi.

Manbalar: [Vercel rewrites](https://vercel.com/docs/routing/rewrites),
[Vercel monorepos](https://vercel.com/docs/monorepos).

Vercel manzillari ma’lum bo‘lgach VPS env'dagi `CORS_ORIGINS`, `TELEGRAM_MINI_APP_URL`
va BotFather Mini App URL'ini moslang. So‘ng API/worker'ni qayta yarating:

```bash
./deploy/compose.sh up -d api worker
# Token va Mini App URL tayyor bo‘lsa:
./deploy/compose.sh --profile bot up -d bot
```

## Smoke test

- HTTPS `/health` 200; PostgreSQL/Redis internetdan ochilmagan.
- Har ikkala Vercel project'da `/api/health` 200.
- Admin login → sahifani yangilash → cinema ro‘yxati → logout.
- Mini App katalog, film, seans va rasmlar. Telegram ichida haqiqiy initData login.
- Rasm upload → API restart → rasm saqlanib qolganini tekshirish.
- Worker logida Redis/DB xatosi yo‘q; bot bir nusxada ishlaydi.
- To‘lov integratsiyasi alohida yakunlanmaguncha real sotuvga tayyor deb hisoblamang.

## Yangilash va backup

Migratsiya oldidan DB backup oling; uploads volume'ini ham alohida arxivlang.
Backup nusxalarini VPS'dan tashqarida saqlang va test DB'da restore tekshiring.

```bash
mkdir -p deploy/backups
chmod 700 deploy/backups
umask 077
./deploy/compose.sh exec -T postgres pg_dump -U cinema -d cinema -Fc > "deploy/backups/cinema-$(date +%Y%m%d-%H%M%S).dump"
```

Har release uchun `.env.production` dagi `IMAGE_TAG` ga yangi qiymat bering,
oldingi image tag'ini rollback uchun saqlang. Migratsiyalarning orqaga mosligini
tekshiring. Yangilashda `./deploy/compose.sh build api` va `./deploy/compose.sh up -d`.
`down -v` ishlatmang — persistent ma’lumotlarni o‘chiradi.

## Tekshiruv qaydi — 2026-09-30

- API/worker/bot hamda ikkala frontend build'i o‘tdi.
- Docker image build va alohida test DB'da barcha migratsiyalar o‘tdi.
- API unit test fayllari o‘tdi; o‘zgargan kod uchun Biome va diff whitespace tekshiruvi yashil.
- Live API HTTPS health, Admin `/api/health`, login, sessiya, SSR `/cinemas`, logout tekshirildi.
- Live Mini App bosh sahifa, proxy health va public katalog 200.
- Telegram bot uchun Mini App menyusi yangi URL'ga sozlandi.
- Production baza bo‘sh katalog bilan ochildi. Kino/seans kiritish va real to‘lovlarni
  tekshirish keyingi mahsulot ishlari; joylashtirish real sotuv testi o‘rnini bosmaydi.

# KAN-37 request transcript

Captured against a local API (`http://127.0.0.1:3001`) and Postgres after migration `20261002150000_design_v2_kan37`. Seeded cinema admin: `admin@magic.local`. The passwords here are local fixtures.

## Admin login

`POST /auth/login` → **201**

Request:

```json
{
  "email": "admin@magic.local",
  "password": "ChangeMe123!"
}
```

Response:

```json
{
  "user": {
    "id": "cmuktpt0l0001jseumsqh5xv8",
    "email": "admin@magic.local",
    "firstName": "Magic",
    "lastName": "Admin",
    "mustChangePassword": false,
    "role": "CUSTOMER",
    "staff": [
      {
        "cinemaId": "seed-magic-cinema",
        "cinemaName": "Magic Cinema",
        "cinemaStatus": "ACTIVE",
        "role": "CINEMA_ADMIN"
      }
    ]
  }
}
```

## GET /auth/me

`GET /auth/me` → **200**

Response:

```json
{
  "user": {
    "id": "cmuktpt0l0001jseumsqh5xv8",
    "email": "admin@magic.local",
    "firstName": "Magic",
    "lastName": "Admin",
    "mustChangePassword": false,
    "role": "CUSTOMER",
    "staff": [
      {
        "cinemaId": "seed-magic-cinema",
        "cinemaName": "Magic Cinema",
        "cinemaStatus": "ACTIVE",
        "role": "CINEMA_ADMIN"
      }
    ]
  }
}
```

## Public cinemas before city

`GET /public/cinemas` → **200**

Response:

```json
[
  {
    "id": "seed-magic-cinema",
    "name": "Magic Cinema",
    "address": "Toshkent",
    "city": null,
    "tagline": null,
    "logoUrl": null,
    "hasMap": false,
    "profileComplete": false
  }
]
```

## Set city and tagline

`PATCH /admin/cinemas/seed-magic-cinema/profile` → **200**

Request:

```json
{
  "city": "Ташкент",
  "tagline": "Кинотеатр в парке"
}
```

Response:

```json
{
  "id": "seed-magic-cinema",
  "name": "Magic Cinema",
  "address": "Toshkent",
  "phone": null,
  "phones": [],
  "logoUrl": null,
  "description": null,
  "city": "Ташкент",
  "tagline": "Кинотеатр в парке",
  "timezone": "Asia/Tashkent",
  "status": "ACTIVE",
  "lat": null,
  "lng": null,
  "mapProvider": null,
  "instagramUrl": null,
  "telegramContact": null,
  "photos": [],
  "profileCompletion": {
    "profileComplete": false,
    "steps": {
      "photos": false,
      "location": false,
      "instagram": false,
      "phones": false,
      "telegramContact": false,
      "securityEmail": false
    },
    "missing": [
      "photos",
      "location",
      "instagram",
      "phones",
      "telegramContact",
      "securityEmail"
    ]
  },
  "map": null
}
```

## Clear city (empty string is null)

`PATCH /admin/cinemas/seed-magic-cinema/profile` → **200**

Request:

```json
{
  "city": "  "
}
```

Response:

```json
{
  "id": "seed-magic-cinema",
  "name": "Magic Cinema",
  "address": "Toshkent",
  "phone": null,
  "phones": [],
  "logoUrl": null,
  "description": null,
  "city": null,
  "tagline": "Кинотеатр в парке",
  "timezone": "Asia/Tashkent",
  "status": "ACTIVE",
  "lat": null,
  "lng": null,
  "mapProvider": null,
  "instagramUrl": null,
  "telegramContact": null,
  "photos": [],
  "profileCompletion": {
    "profileComplete": false,
    "steps": {
      "photos": false,
      "location": false,
      "instagram": false,
      "phones": false,
      "telegramContact": false,
      "securityEmail": false
    },
    "missing": [
      "photos",
      "location",
      "instagram",
      "phones",
      "telegramContact",
      "securityEmail"
    ]
  },
  "map": null
}
```

## Set city again

`PATCH /admin/cinemas/seed-magic-cinema/profile` → **200**

Request:

```json
{
  "city": "Ташкент"
}
```

Response:

```json
{
  "id": "seed-magic-cinema",
  "name": "Magic Cinema",
  "address": "Toshkent",
  "phone": null,
  "phones": [],
  "logoUrl": null,
  "description": null,
  "city": "Ташкент",
  "tagline": "Кинотеатр в парке",
  "timezone": "Asia/Tashkent",
  "status": "ACTIVE",
  "lat": null,
  "lng": null,
  "mapProvider": null,
  "instagramUrl": null,
  "telegramContact": null,
  "photos": [],
  "profileCompletion": {
    "profileComplete": false,
    "steps": {
      "photos": false,
      "location": false,
      "instagram": false,
      "phones": false,
      "telegramContact": false,
      "securityEmail": false
    },
    "missing": [
      "photos",
      "location",
      "instagram",
      "phones",
      "telegramContact",
      "securityEmail"
    ]
  },
  "map": null
}
```

## Public cinemas with city

`GET /public/cinemas` → **200**

Response:

```json
[
  {
    "id": "seed-magic-cinema",
    "name": "Magic Cinema",
    "address": "Toshkent",
    "city": "Ташкент",
    "tagline": "Кинотеатр в парке",
    "logoUrl": null,
    "hasMap": false,
    "profileComplete": false
  }
]
```

## Hall list

`GET /admin/cinemas/seed-magic-cinema/halls` → **200**

Response:

```json
[
  {
    "id": "cmuktpt0s0005jseulthafab5",
    "cinemaId": "seed-magic-cinema",
    "name": "Hall 1",
    "capacity": 120,
    "format": null,
    "createdAt": "2026-09-28T05:45:16.589Z",
    "updatedAt": "2026-09-28T05:45:16.589Z"
  }
]
```

## Blank format is null

`PATCH /admin/cinemas/seed-magic-cinema/halls/cmuktpt0s0005jseulthafab5` → **200**

Request:

```json
{
  "format": ""
}
```

Response:

```json
{
  "id": "cmuktpt0s0005jseulthafab5",
  "cinemaId": "seed-magic-cinema",
  "name": "Hall 1",
  "capacity": 120,
  "format": null,
  "createdAt": "2026-09-28T05:45:16.589Z",
  "updatedAt": "2026-09-28T05:59:01.656Z"
}
```

## Set hall format

`PATCH /admin/cinemas/seed-magic-cinema/halls/cmuktpt0s0005jseulthafab5` → **200**

Request:

```json
{
  "format": "3D · Dolby"
}
```

Response:

```json
{
  "id": "cmuktpt0s0005jseulthafab5",
  "cinemaId": "seed-magic-cinema",
  "name": "Hall 1",
  "capacity": 120,
  "format": "3D · Dolby",
  "createdAt": "2026-09-28T05:45:16.589Z",
  "updatedAt": "2026-09-28T05:59:01.678Z"
}
```

## Photo with caption

`POST /admin/cinemas/seed-magic-cinema/photos` → **201**

Request:

```json
{
  "url": "https://example.com/foyer.jpg",
  "caption": "Фойе"
}
```

Response:

```json
{
  "id": "seed-magic-cinema",
  "name": "Magic Cinema",
  "address": "Toshkent",
  "phone": null,
  "phones": [],
  "logoUrl": null,
  "description": null,
  "city": "Ташкент",
  "tagline": "Кинотеатр в парке",
  "timezone": "Asia/Tashkent",
  "status": "ACTIVE",
  "lat": null,
  "lng": null,
  "mapProvider": null,
  "instagramUrl": null,
  "telegramContact": null,
  "photos": [
    {
      "id": "cmuku7hol0003jsx2bnnf8nkv",
      "url": "https://example.com/foyer.jpg",
      "sortOrder": 0,
      "caption": "Фойе"
    }
  ],
  "profileCompletion": {
    "profileComplete": false,
    "steps": {
      "photos": true,
      "location": false,
      "instagram": false,
      "phones": false,
      "telegramContact": false,
      "securityEmail": false
    },
    "missing": [
      "location",
      "instagram",
      "phones",
      "telegramContact",
      "securityEmail"
    ]
  },
  "map": null
}
```

## Photo with blank caption

`POST /admin/cinemas/seed-magic-cinema/photos` → **201**

Request:

```json
{
  "url": "https://example.com/hall.jpg",
  "caption": "  "
}
```

Response:

```json
{
  "id": "seed-magic-cinema",
  "name": "Magic Cinema",
  "address": "Toshkent",
  "phone": null,
  "phones": [],
  "logoUrl": null,
  "description": null,
  "city": "Ташкент",
  "tagline": "Кинотеатр в парке",
  "timezone": "Asia/Tashkent",
  "status": "ACTIVE",
  "lat": null,
  "lng": null,
  "mapProvider": null,
  "instagramUrl": null,
  "telegramContact": null,
  "photos": [
    {
      "id": "cmuku7hol0003jsx2bnnf8nkv",
      "url": "https://example.com/foyer.jpg",
      "sortOrder": 0,
      "caption": "Фойе"
    },
    {
      "id": "cmuku7hpd0005jsx2lsrf18nk",
      "url": "https://example.com/hall.jpg",
      "sortOrder": 1,
      "caption": null
    }
  ],
  "profileCompletion": {
    "profileComplete": false,
    "steps": {
      "photos": true,
      "location": false,
      "instagram": false,
      "phones": false,
      "telegramContact": false,
      "securityEmail": false
    },
    "missing": [
      "location",
      "instagram",
      "phones",
      "telegramContact",
      "securityEmail"
    ]
  },
  "map": null
}
```

## Public cinema

`GET /public/cinemas/seed-magic-cinema` → **200**

Response:

```json
{
  "id": "seed-magic-cinema",
  "name": "Magic Cinema",
  "address": "Toshkent",
  "description": null,
  "city": "Ташкент",
  "tagline": "Кинотеатр в парке",
  "logoUrl": null,
  "phones": [],
  "instagramUrl": null,
  "telegramContact": null,
  "photos": [
    {
      "id": "cmuku7hol0003jsx2bnnf8nkv",
      "url": "https://example.com/foyer.jpg",
      "sortOrder": 0,
      "caption": "Фойе"
    },
    {
      "id": "cmuku7hpd0005jsx2lsrf18nk",
      "url": "https://example.com/hall.jpg",
      "sortOrder": 1,
      "caption": null
    }
  ],
  "map": null,
  "timezone": "Asia/Tashkent",
  "followerCount": 0,
  "followedByMe": false
}
```

## Create staff

`POST /admin/staff` → **201**

Request:

```json
{
  "login": "kassir1",
  "password": "TempPass123",
  "role": "STAFF",
  "firstName": "Али",
  "lastName": "Каримов"
}
```

Response:

```json
{
  "id": "cmuku7hsi0008jsx2s5nx740o",
  "userId": "cmuku7hsg0006jsx2su4ixw8y",
  "cinemaId": "seed-magic-cinema",
  "login": "kassir1",
  "email": null,
  "firstName": "Али",
  "lastName": "Каримов",
  "role": "STAFF",
  "active": true,
  "mustChangePassword": true,
  "createdAt": "2026-09-28T05:59:01.842Z"
}
```

## Duplicate login

`POST /admin/staff` → **409**

Request:

```json
{
  "login": "kassir1",
  "password": "TempPass123",
  "role": "STAFF",
  "firstName": "Али",
  "lastName": "Каримов"
}
```

Response:

```json
{
  "statusCode": 409,
  "code": "LOGIN_TAKEN",
  "message": "Такой логин уже занят"
}
```

## Staff login

`POST /auth/login` → **201**

Request:

```json
{
  "login": "kassir1",
  "password": "TempPass123"
}
```

Response:

```json
{
  "user": {
    "id": "cmuku7hsg0006jsx2su4ixw8y",
    "email": null,
    "firstName": "Али",
    "lastName": "Каримов",
    "mustChangePassword": true,
    "role": "CUSTOMER",
    "staff": [
      {
        "cinemaId": "seed-magic-cinema",
        "cinemaName": "Magic Cinema",
        "cinemaStatus": "ACTIVE",
        "role": "STAFF"
      }
    ]
  }
}
```

## Staff /auth/me while password change is required

`GET /auth/me` → **200**

Response:

```json
{
  "user": {
    "id": "cmuku7hsg0006jsx2su4ixw8y",
    "email": null,
    "firstName": "Али",
    "lastName": "Каримов",
    "mustChangePassword": true,
    "role": "CUSTOMER",
    "staff": [
      {
        "cinemaId": "seed-magic-cinema",
        "cinemaName": "Magic Cinema",
        "cinemaStatus": "ACTIVE",
        "role": "STAFF"
      }
    ]
  }
}
```

## Blocked admin route

`GET /admin/movies` → **403**

Response:

```json
{
  "statusCode": 403,
  "code": "PASSWORD_CHANGE_REQUIRED",
  "message": "Сначала смените пароль"
}
```

## Change password

`POST /auth/change-password` → **201**

Request:

```json
{
  "currentPassword": "TempPass123",
  "newPassword": "NewPassword1"
}
```

Response:

```json
{
  "ok": true,
  "mustChangePassword": false
}
```

## Movies after password change

`GET /admin/movies` → **200**

Response:

```json
[
  {
    "id": "seed-movie-dune",
    "cinemaId": "seed-magic-cinema",
    "title": "Dune: Part Two",
    "description": "Seed film — seans uchun.",
    "posterUrl": null,
    "durationMin": 166,
    "rating": 8.5,
    "ageRating": "12+",
    "genres": [
      "Фантастика",
      "Приключения"
    ],
    "audioLanguages": [
      "ru",
      "en"
    ],
    "releasedAt": "2024-03-01T00:00:00.000Z",
    "status": "ACTIVE",
    "isFeatured": false,
    "createdAt": "2026-09-28T05:45:16.591Z",
    "updatedAt": "2026-09-28T05:45:16.591Z"
  }
]
```

## Team list

`GET /admin/staff` → **200**

Response:

```json
[
  {
    "id": "cmuktpt0n0003jseueztyz4q1",
    "userId": "cmuktpt0l0001jseumsqh5xv8",
    "cinemaId": "seed-magic-cinema",
    "login": null,
    "email": "admin@magic.local",
    "firstName": "Magic",
    "lastName": "Admin",
    "role": "CINEMA_ADMIN",
    "active": true,
    "mustChangePassword": false,
    "createdAt": "2026-09-28T05:45:16.583Z"
  },
  {
    "id": "cmuku7hsi0008jsx2s5nx740o",
    "userId": "cmuku7hsg0006jsx2su4ixw8y",
    "cinemaId": "seed-magic-cinema",
    "login": "kassir1",
    "email": null,
    "firstName": "Али",
    "lastName": "Каримов",
    "role": "STAFF",
    "active": true,
    "mustChangePassword": false,
    "createdAt": "2026-09-28T05:59:01.842Z"
  }
]
```

## Promote staff role

`PATCH /admin/staff/cmuku7hsi0008jsx2s5nx740o` → **200**

Request:

```json
{
  "role": "CINEMA_ADMIN"
}
```

Response:

```json
{
  "id": "cmuku7hsi0008jsx2s5nx740o",
  "userId": "cmuku7hsg0006jsx2su4ixw8y",
  "cinemaId": "seed-magic-cinema",
  "login": "kassir1",
  "email": null,
  "firstName": "Али",
  "lastName": "Каримов",
  "role": "CINEMA_ADMIN",
  "active": true,
  "mustChangePassword": false,
  "createdAt": "2026-09-28T05:59:01.842Z"
}
```

## Mark seed movie featured

`PATCH /admin/movies/seed-movie-dune` → **200**

Request:

```json
{
  "isFeatured": true
}
```

Response:

```json
{
  "id": "seed-movie-dune",
  "cinemaId": "seed-magic-cinema",
  "title": "Dune: Part Two",
  "description": "Seed film — seans uchun.",
  "posterUrl": null,
  "durationMin": 166,
  "rating": 8.5,
  "ageRating": "12+",
  "genres": [
    "Фантастика",
    "Приключения"
  ],
  "audioLanguages": [
    "ru",
    "en"
  ],
  "releasedAt": "2024-03-01T00:00:00.000Z",
  "status": "ACTIVE",
  "isFeatured": true,
  "createdAt": "2026-09-28T05:45:16.591Z",
  "updatedAt": "2026-09-28T05:59:02.224Z"
}
```

## Create second featured movie

`POST /admin/movies` → **201**

Request:

```json
{
  "title": "В центре внимания",
  "durationMin": 110,
  "genres": [
    "Драма"
  ],
  "rating": 7.4,
  "ageRating": "16+",
  "isFeatured": true
}
```

Response:

```json
{
  "id": "cmuku7i3t000ajsx2nb1drohr",
  "cinemaId": "seed-magic-cinema",
  "title": "В центре внимания",
  "description": null,
  "posterUrl": null,
  "durationMin": 110,
  "rating": 7.4,
  "ageRating": "16+",
  "genres": [
    "Драма"
  ],
  "audioLanguages": [],
  "releasedAt": null,
  "status": "ACTIVE",
  "isFeatured": true,
  "createdAt": "2026-09-28T05:59:02.249Z",
  "updatedAt": "2026-09-28T05:59:02.249Z"
}
```

## Movies after featuring the second film

`GET /admin/movies` → **200**

Response:

```json
[
  {
    "id": "seed-movie-dune",
    "cinemaId": "seed-magic-cinema",
    "title": "Dune: Part Two",
    "description": "Seed film — seans uchun.",
    "posterUrl": null,
    "durationMin": 166,
    "rating": 8.5,
    "ageRating": "12+",
    "genres": [
      "Фантастика",
      "Приключения"
    ],
    "audioLanguages": [
      "ru",
      "en"
    ],
    "releasedAt": "2024-03-01T00:00:00.000Z",
    "status": "ACTIVE",
    "isFeatured": false,
    "createdAt": "2026-09-28T05:45:16.591Z",
    "updatedAt": "2026-09-28T05:59:02.248Z"
  },
  {
    "id": "cmuku7i3t000ajsx2nb1drohr",
    "cinemaId": "seed-magic-cinema",
    "title": "В центре внимания",
    "description": null,
    "posterUrl": null,
    "durationMin": 110,
    "rating": 7.4,
    "ageRating": "16+",
    "genres": [
      "Драма"
    ],
    "audioLanguages": [],
    "releasedAt": null,
    "status": "ACTIVE",
    "isFeatured": true,
    "createdAt": "2026-09-28T05:59:02.249Z",
    "updatedAt": "2026-09-28T05:59:02.249Z"
  }
]
```

## Session with audioLanguage ru

`POST /admin/sessions` → **201**

Request:

```json
{
  "movieId": "seed-movie-dune",
  "cinemaId": "seed-magic-cinema",
  "hallId": "cmuktpt0s0005jseulthafab5",
  "startsAt": "2026-10-20T18:00:00.000Z",
  "basePriceUzs": 75000,
  "vipPriceUzs": 90000,
  "generalAdmission": true,
  "audioLanguage": "ru"
}
```

Response:

```json
{
  "id": "cmuku7i57000cjsx2r0xaez59",
  "movieId": "seed-movie-dune",
  "cinemaId": "seed-magic-cinema",
  "hallId": "cmuktpt0s0005jseulthafab5",
  "startsAt": "2026-10-20T18:00:00.000Z",
  "status": "DRAFT",
  "basePriceUzs": 75000,
  "discountPercent": 0,
  "audioLanguage": "ru",
  "cancelledAt": null,
  "notifiedAt": null,
  "createdAt": "2026-09-28T05:59:02.299Z",
  "updatedAt": "2026-09-28T05:59:02.299Z",
  "movie": {
    "id": "seed-movie-dune",
    "cinemaId": "seed-magic-cinema",
    "title": "Dune: Part Two",
    "description": "Seed film — seans uchun.",
    "posterUrl": null,
    "durationMin": 166,
    "rating": "8.5",
    "ageRating": "12+",
    "genres": [
      "Фантастика",
      "Приключения"
    ],
    "audioLanguages": [
      "ru",
      "en"
    ],
    "releasedAt": "2024-03-01T00:00:00.000Z",
    "status": "ACTIVE",
    "isFeatured": false,
    "createdAt": "2026-09-28T05:45:16.591Z",
    "updatedAt": "2026-09-28T05:59:02.248Z"
  },
  "cinema": {
    "id": "seed-magic-cinema",
    "name": "Magic Cinema",
    "address": "Toshkent",
    "phone": null,
    "logoUrl": null,
    "description": null,
    "city": "Ташкент",
    "tagline": "Кинотеатр в парке",
    "timezone": "Asia/Tashkent",
    "status": "ACTIVE",
    "createdAt": "2026-09-28T05:45:16.580Z",
    "updatedAt": "2026-09-28T05:59:01.733Z",
    "lat": null,
    "lng": null,
    "mapProvider": null,
    "instagramUrl": null,
    "telegramContact": null,
    "phones": [],
    "stepPhotosDone": true,
    "stepLocationDone": false,
    "stepInstagramDone": false,
    "stepPhonesDone": false,
    "stepTelegramContactDone": false,
    "stepSecurityEmailDone": false,
    "profileComplete": false
  },
  "hall": {
    "id": "cmuktpt0s0005jseulthafab5",
    "cinemaId": "seed-magic-cinema",
    "name": "Hall 1",
    "capacity": 120,
    "format": "3D · Dolby",
    "createdAt": "2026-09-28T05:45:16.589Z",
    "updatedAt": "2026-09-28T05:59:01.678Z"
  },
  "pricing": [
    {
      "id": "cmuku7i57000djsx2hof0qla9",
      "sessionId": "cmuku7i57000cjsx2r0xaez59",
      "seatType": "STANDARD",
      "priceUzs": 75000
    },
    {
      "id": "cmuku7i57000ejsx25it71ids",
      "sessionId": "cmuku7i57000cjsx2r0xaez59",
      "seatType": "VIP",
      "priceUzs": 90000
    },
    {
      "id": "cmuku7i57000fjsx2dad8sl1v",
      "sessionId": "cmuku7i57000cjsx2r0xaez59",
      "seatType": "BLOCKED",
      "priceUzs": 0
    }
  ],
  "_count": {
    "sessionSeats": 0
  }
}
```

## Publish nearest-film session

`POST /admin/sessions/cmuku7i57000cjsx2r0xaez59/publish` → **201**

Response:

```json
{
  "id": "cmuku7i57000cjsx2r0xaez59",
  "movieId": "seed-movie-dune",
  "cinemaId": "seed-magic-cinema",
  "hallId": "cmuktpt0s0005jseulthafab5",
  "startsAt": "2026-10-20T18:00:00.000Z",
  "status": "PUBLISHED",
  "basePriceUzs": 75000,
  "discountPercent": 0,
  "audioLanguage": "ru",
  "cancelledAt": null,
  "notifiedAt": null,
  "createdAt": "2026-09-28T05:59:02.299Z",
  "updatedAt": "2026-09-28T05:59:02.327Z",
  "movie": {
    "id": "seed-movie-dune",
    "cinemaId": "seed-magic-cinema",
    "title": "Dune: Part Two",
    "description": "Seed film — seans uchun.",
    "posterUrl": null,
    "durationMin": 166,
    "rating": "8.5",
    "ageRating": "12+",
    "genres": [
      "Фантастика",
      "Приключения"
    ],
    "audioLanguages": [
      "ru",
      "en"
    ],
    "releasedAt": "2024-03-01T00:00:00.000Z",
    "status": "ACTIVE",
    "isFeatured": false,
    "createdAt": "2026-09-28T05:45:16.591Z",
    "updatedAt": "2026-09-28T05:59:02.248Z"
  },
  "cinema": {
    "id": "seed-magic-cinema",
    "name": "Magic Cinema",
    "address": "Toshkent",
    "phone": null,
    "logoUrl": null,
    "description": null,
    "city": "Ташкент",
    "tagline": "Кинотеатр в парке",
    "timezone": "Asia/Tashkent",
    "status": "ACTIVE",
    "createdAt": "2026-09-28T05:45:16.580Z",
    "updatedAt": "2026-09-28T05:59:01.733Z",
    "lat": null,
    "lng": null,
    "mapProvider": null,
    "instagramUrl": null,
    "telegramContact": null,
    "phones": [],
    "stepPhotosDone": true,
    "stepLocationDone": false,
    "stepInstagramDone": false,
    "stepPhonesDone": false,
    "stepTelegramContactDone": false,
    "stepSecurityEmailDone": false,
    "profileComplete": false
  },
  "hall": {
    "id": "cmuktpt0s0005jseulthafab5",
    "cinemaId": "seed-magic-cinema",
    "name": "Hall 1",
    "capacity": 120,
    "format": "3D · Dolby",
    "createdAt": "2026-09-28T05:45:16.589Z",
    "updatedAt": "2026-09-28T05:59:01.678Z"
  },
  "pricing": [
    {
      "id": "cmuku7i57000djsx2hof0qla9",
      "sessionId": "cmuku7i57000cjsx2r0xaez59",
      "seatType": "STANDARD",
      "priceUzs": 75000
    },
    {
      "id": "cmuku7i57000ejsx25it71ids",
      "sessionId": "cmuku7i57000cjsx2r0xaez59",
      "seatType": "VIP",
      "priceUzs": 90000
    },
    {
      "id": "cmuku7i57000fjsx2dad8sl1v",
      "sessionId": "cmuku7i57000cjsx2r0xaez59",
      "seatType": "BLOCKED",
      "priceUzs": 0
    }
  ],
  "_count": {
    "sessionSeats": 0
  }
}
```

## Admin sessions

`GET /admin/sessions?cinemaId=seed-magic-cinema` → **200**

Response:

```json
[
  {
    "id": "cmuku7i57000cjsx2r0xaez59",
    "movieId": "seed-movie-dune",
    "cinemaId": "seed-magic-cinema",
    "hallId": "cmuktpt0s0005jseulthafab5",
    "startsAt": "2026-10-20T18:00:00.000Z",
    "status": "PUBLISHED",
    "basePriceUzs": 75000,
    "discountPercent": 0,
    "audioLanguage": "ru",
    "cancelledAt": null,
    "notifiedAt": null,
    "createdAt": "2026-09-28T05:59:02.299Z",
    "updatedAt": "2026-09-28T05:59:02.327Z",
    "movie": {
      "id": "seed-movie-dune",
      "cinemaId": "seed-magic-cinema",
      "title": "Dune: Part Two",
      "description": "Seed film — seans uchun.",
      "posterUrl": null,
      "durationMin": 166,
      "rating": "8.5",
      "ageRating": "12+",
      "genres": [
        "Фантастика",
        "Приключения"
      ],
      "audioLanguages": [
        "ru",
        "en"
      ],
      "releasedAt": "2024-03-01T00:00:00.000Z",
      "status": "ACTIVE",
      "isFeatured": false,
      "createdAt": "2026-09-28T05:45:16.591Z",
      "updatedAt": "2026-09-28T05:59:02.248Z"
    },
    "cinema": {
      "id": "seed-magic-cinema",
      "name": "Magic Cinema"
    },
    "hall": {
      "id": "cmuktpt0s0005jseulthafab5",
      "name": "Hall 1",
      "capacity": 120,
      "format": "3D · Dolby"
    },
    "_count": {
      "sessionSeats": 0
    },
    "sold": 0,
    "remaining": 120
  }
]
```

## Featured falls back to nearest (featured film has no session)

`GET /public/featured?cinemaId=seed-magic-cinema` → **200**

Response:

```json
{
  "featured": {
    "featuredSource": "nearest",
    "id": "seed-movie-dune",
    "cinemaId": "seed-magic-cinema",
    "title": "Dune: Part Two",
    "posterUrl": null,
    "description": "Seed film — seans uchun.",
    "durationMin": 166,
    "ageRating": "12+",
    "rating": 8.5,
    "genres": [
      "Фантастика",
      "Приключения"
    ],
    "minPriceUzs": 75000,
    "nextStartsAt": "2026-10-20T18:00:00.000Z"
  }
}
```

## Session for the featured movie

`POST /admin/sessions` → **201**

Request:

```json
{
  "movieId": "cmuku7i3t000ajsx2nb1drohr",
  "cinemaId": "seed-magic-cinema",
  "hallId": "cmuktpt0s0005jseulthafab5",
  "startsAt": "2026-10-21T15:00:00.000Z",
  "basePriceUzs": 80000,
  "discountPercent": 10,
  "generalAdmission": true,
  "audioLanguage": "uz"
}
```

Response:

```json
{
  "id": "cmuku7i8a000hjsx21leujtcb",
  "movieId": "cmuku7i3t000ajsx2nb1drohr",
  "cinemaId": "seed-magic-cinema",
  "hallId": "cmuktpt0s0005jseulthafab5",
  "startsAt": "2026-10-21T15:00:00.000Z",
  "status": "DRAFT",
  "basePriceUzs": 80000,
  "discountPercent": 10,
  "audioLanguage": "uz",
  "cancelledAt": null,
  "notifiedAt": null,
  "createdAt": "2026-09-28T05:59:02.411Z",
  "updatedAt": "2026-09-28T05:59:02.411Z",
  "movie": {
    "id": "cmuku7i3t000ajsx2nb1drohr",
    "cinemaId": "seed-magic-cinema",
    "title": "В центре внимания",
    "description": null,
    "posterUrl": null,
    "durationMin": 110,
    "rating": "7.4",
    "ageRating": "16+",
    "genres": [
      "Драма"
    ],
    "audioLanguages": [],
    "releasedAt": null,
    "status": "ACTIVE",
    "isFeatured": true,
    "createdAt": "2026-09-28T05:59:02.249Z",
    "updatedAt": "2026-09-28T05:59:02.249Z"
  },
  "cinema": {
    "id": "seed-magic-cinema",
    "name": "Magic Cinema",
    "address": "Toshkent",
    "phone": null,
    "logoUrl": null,
    "description": null,
    "city": "Ташкент",
    "tagline": "Кинотеатр в парке",
    "timezone": "Asia/Tashkent",
    "status": "ACTIVE",
    "createdAt": "2026-09-28T05:45:16.580Z",
    "updatedAt": "2026-09-28T05:59:01.733Z",
    "lat": null,
    "lng": null,
    "mapProvider": null,
    "instagramUrl": null,
    "telegramContact": null,
    "phones": [],
    "stepPhotosDone": true,
    "stepLocationDone": false,
    "stepInstagramDone": false,
    "stepPhonesDone": false,
    "stepTelegramContactDone": false,
    "stepSecurityEmailDone": false,
    "profileComplete": false
  },
  "hall": {
    "id": "cmuktpt0s0005jseulthafab5",
    "cinemaId": "seed-magic-cinema",
    "name": "Hall 1",
    "capacity": 120,
    "format": "3D · Dolby",
    "createdAt": "2026-09-28T05:45:16.589Z",
    "updatedAt": "2026-09-28T05:59:01.678Z"
  },
  "pricing": [
    {
      "id": "cmuku7i8a000ijsx2qwaxov4p",
      "sessionId": "cmuku7i8a000hjsx21leujtcb",
      "seatType": "STANDARD",
      "priceUzs": 80000
    },
    {
      "id": "cmuku7i8a000jjsx2a4mr2ifn",
      "sessionId": "cmuku7i8a000hjsx21leujtcb",
      "seatType": "VIP",
      "priceUzs": 80000
    },
    {
      "id": "cmuku7i8a000kjsx2x5acmh24",
      "sessionId": "cmuku7i8a000hjsx21leujtcb",
      "seatType": "BLOCKED",
      "priceUzs": 0
    }
  ],
  "_count": {
    "sessionSeats": 0
  }
}
```

## Publish featured session

`POST /admin/sessions/cmuku7i8a000hjsx21leujtcb/publish` → **201**

Response:

```json
{
  "id": "cmuku7i8a000hjsx21leujtcb",
  "movieId": "cmuku7i3t000ajsx2nb1drohr",
  "cinemaId": "seed-magic-cinema",
  "hallId": "cmuktpt0s0005jseulthafab5",
  "startsAt": "2026-10-21T15:00:00.000Z",
  "status": "PUBLISHED",
  "basePriceUzs": 80000,
  "discountPercent": 10,
  "audioLanguage": "uz",
  "cancelledAt": null,
  "notifiedAt": null,
  "createdAt": "2026-09-28T05:59:02.411Z",
  "updatedAt": "2026-09-28T05:59:02.439Z",
  "movie": {
    "id": "cmuku7i3t000ajsx2nb1drohr",
    "cinemaId": "seed-magic-cinema",
    "title": "В центре внимания",
    "description": null,
    "posterUrl": null,
    "durationMin": 110,
    "rating": "7.4",
    "ageRating": "16+",
    "genres": [
      "Драма"
    ],
    "audioLanguages": [],
    "releasedAt": null,
    "status": "ACTIVE",
    "isFeatured": true,
    "createdAt": "2026-09-28T05:59:02.249Z",
    "updatedAt": "2026-09-28T05:59:02.249Z"
  },
  "cinema": {
    "id": "seed-magic-cinema",
    "name": "Magic Cinema",
    "address": "Toshkent",
    "phone": null,
    "logoUrl": null,
    "description": null,
    "city": "Ташкент",
    "tagline": "Кинотеатр в парке",
    "timezone": "Asia/Tashkent",
    "status": "ACTIVE",
    "createdAt": "2026-09-28T05:45:16.580Z",
    "updatedAt": "2026-09-28T05:59:01.733Z",
    "lat": null,
    "lng": null,
    "mapProvider": null,
    "instagramUrl": null,
    "telegramContact": null,
    "phones": [],
    "stepPhotosDone": true,
    "stepLocationDone": false,
    "stepInstagramDone": false,
    "stepPhonesDone": false,
    "stepTelegramContactDone": false,
    "stepSecurityEmailDone": false,
    "profileComplete": false
  },
  "hall": {
    "id": "cmuktpt0s0005jseulthafab5",
    "cinemaId": "seed-magic-cinema",
    "name": "Hall 1",
    "capacity": 120,
    "format": "3D · Dolby",
    "createdAt": "2026-09-28T05:45:16.589Z",
    "updatedAt": "2026-09-28T05:59:01.678Z"
  },
  "pricing": [
    {
      "id": "cmuku7i8a000ijsx2qwaxov4p",
      "sessionId": "cmuku7i8a000hjsx21leujtcb",
      "seatType": "STANDARD",
      "priceUzs": 80000
    },
    {
      "id": "cmuku7i8a000jjsx2a4mr2ifn",
      "sessionId": "cmuku7i8a000hjsx21leujtcb",
      "seatType": "VIP",
      "priceUzs": 80000
    },
    {
      "id": "cmuku7i8a000kjsx2x5acmh24",
      "sessionId": "cmuku7i8a000hjsx21leujtcb",
      "seatType": "BLOCKED",
      "priceUzs": 0
    }
  ],
  "_count": {
    "sessionSeats": 0
  }
}
```

## Featured is manual

`GET /public/featured?cinemaId=seed-magic-cinema` → **200**

Response:

```json
{
  "featured": {
    "featuredSource": "manual",
    "id": "cmuku7i3t000ajsx2nb1drohr",
    "cinemaId": "seed-magic-cinema",
    "title": "В центре внимания",
    "posterUrl": null,
    "description": null,
    "durationMin": 110,
    "ageRating": "16+",
    "rating": 7.4,
    "genres": [
      "Драма"
    ],
    "minPriceUzs": 72000,
    "nextStartsAt": "2026-10-21T15:00:00.000Z"
  }
}
```

## Catalog

`GET /public/catalog?cinemaId=seed-magic-cinema&from=2026-10-20T00:00:00.000Z&to=2026-10-22T00:00:00.000Z` → **200**

Response:

```json
{
  "from": "2026-10-20T00:00:00.000Z",
  "to": "2026-10-22T00:00:00.000Z",
  "featured": {
    "featuredSource": "manual",
    "id": "cmuku7i3t000ajsx2nb1drohr",
    "cinemaId": "seed-magic-cinema",
    "title": "В центре внимания",
    "posterUrl": null,
    "description": null,
    "durationMin": 110,
    "ageRating": "16+",
    "rating": 7.4,
    "genres": [
      "Драма"
    ],
    "minPriceUzs": 72000,
    "nextStartsAt": "2026-10-21T15:00:00.000Z"
  },
  "days": [
    {
      "date": "2026-10-20",
      "movies": [
        {
          "id": "seed-movie-dune",
          "title": "Dune: Part Two",
          "posterUrl": null,
          "durationMin": 166,
          "ageRating": "12+",
          "rating": 8.5,
          "genres": [
            "Фантастика",
            "Приключения"
          ],
          "minPriceUzs": 75000,
          "sessions": [
            {
              "id": "cmuku7i57000cjsx2r0xaez59",
              "startsAt": "2026-10-20T18:00:00.000Z",
              "cinemaId": "seed-magic-cinema",
              "cinemaName": "Magic Cinema",
              "hallName": "Hall 1",
              "hallFormat": "3D · Dolby",
              "audioLanguage": "ru",
              "basePriceUzs": 75000,
              "capacity": 120,
              "remaining": 120,
              "bookingMode": "GENERAL_ADMISSION"
            }
          ]
        }
      ]
    },
    {
      "date": "2026-10-21",
      "movies": [
        {
          "id": "cmuku7i3t000ajsx2nb1drohr",
          "title": "В центре внимания",
          "posterUrl": null,
          "durationMin": 110,
          "ageRating": "16+",
          "rating": 7.4,
          "genres": [
            "Драма"
          ],
          "minPriceUzs": 72000,
          "sessions": [
            {
              "id": "cmuku7i8a000hjsx21leujtcb",
              "startsAt": "2026-10-21T15:00:00.000Z",
              "cinemaId": "seed-magic-cinema",
              "cinemaName": "Magic Cinema",
              "hallName": "Hall 1",
              "hallFormat": "3D · Dolby",
              "audioLanguage": "uz",
              "basePriceUzs": 80000,
              "capacity": 120,
              "remaining": 120,
              "bookingMode": "GENERAL_ADMISSION"
            }
          ]
        }
      ]
    }
  ]
}
```

## Public session

`GET /public/sessions/cmuku7i57000cjsx2r0xaez59` → **200**

Response:

```json
{
  "id": "cmuku7i57000cjsx2r0xaez59",
  "startsAt": "2026-10-20T18:00:00.000Z",
  "basePriceUzs": 75000,
  "discountPercent": 0,
  "audioLanguage": "ru",
  "pricing": [
    {
      "id": "cmuku7i57000djsx2hof0qla9",
      "sessionId": "cmuku7i57000cjsx2r0xaez59",
      "seatType": "STANDARD",
      "priceUzs": 75000
    },
    {
      "id": "cmuku7i57000ejsx25it71ids",
      "sessionId": "cmuku7i57000cjsx2r0xaez59",
      "seatType": "VIP",
      "priceUzs": 90000
    },
    {
      "id": "cmuku7i57000fjsx2dad8sl1v",
      "sessionId": "cmuku7i57000cjsx2r0xaez59",
      "seatType": "BLOCKED",
      "priceUzs": 0
    }
  ],
  "bookingMode": "GENERAL_ADMISSION",
  "movie": {
    "id": "seed-movie-dune",
    "cinemaId": "seed-magic-cinema",
    "title": "Dune: Part Two",
    "description": "Seed film — seans uchun.",
    "posterUrl": null,
    "durationMin": 166,
    "rating": "8.5",
    "ageRating": "12+",
    "genres": [
      "Фантастика",
      "Приключения"
    ],
    "audioLanguages": [
      "ru",
      "en"
    ],
    "releasedAt": "2024-03-01T00:00:00.000Z",
    "status": "ACTIVE",
    "isFeatured": false,
    "createdAt": "2026-09-28T05:45:16.591Z",
    "updatedAt": "2026-09-28T05:59:02.248Z"
  },
  "cinema": {
    "id": "seed-magic-cinema",
    "name": "Magic Cinema"
  },
  "hall": {
    "id": "cmuktpt0s0005jseulthafab5",
    "name": "Hall 1",
    "capacity": 120,
    "format": "3D · Dolby"
  },
  "remaining": 120,
  "seats": []
}
```

## Clear audio language on a published session

`PATCH /admin/sessions/cmuku7i8a000hjsx21leujtcb` → **200**

Request:

```json
{
  "audioLanguage": null
}
```

Response:

```json
{
  "id": "cmuku7i8a000hjsx21leujtcb",
  "movieId": "cmuku7i3t000ajsx2nb1drohr",
  "cinemaId": "seed-magic-cinema",
  "hallId": "cmuktpt0s0005jseulthafab5",
  "startsAt": "2026-10-21T15:00:00.000Z",
  "status": "PUBLISHED",
  "basePriceUzs": 80000,
  "discountPercent": 10,
  "audioLanguage": null,
  "cancelledAt": null,
  "notifiedAt": null,
  "createdAt": "2026-09-28T05:59:02.411Z",
  "updatedAt": "2026-09-28T05:59:02.530Z",
  "movie": {
    "id": "cmuku7i3t000ajsx2nb1drohr",
    "cinemaId": "seed-magic-cinema",
    "title": "В центре внимания",
    "description": null,
    "posterUrl": null,
    "durationMin": 110,
    "rating": "7.4",
    "ageRating": "16+",
    "genres": [
      "Драма"
    ],
    "audioLanguages": [],
    "releasedAt": null,
    "status": "ACTIVE",
    "isFeatured": true,
    "createdAt": "2026-09-28T05:59:02.249Z",
    "updatedAt": "2026-09-28T05:59:02.249Z"
  },
  "cinema": {
    "id": "seed-magic-cinema",
    "name": "Magic Cinema",
    "address": "Toshkent",
    "phone": null,
    "logoUrl": null,
    "description": null,
    "city": "Ташкент",
    "tagline": "Кинотеатр в парке",
    "timezone": "Asia/Tashkent",
    "status": "ACTIVE",
    "createdAt": "2026-09-28T05:45:16.580Z",
    "updatedAt": "2026-09-28T05:59:01.733Z",
    "lat": null,
    "lng": null,
    "mapProvider": null,
    "instagramUrl": null,
    "telegramContact": null,
    "phones": [],
    "stepPhotosDone": true,
    "stepLocationDone": false,
    "stepInstagramDone": false,
    "stepPhonesDone": false,
    "stepTelegramContactDone": false,
    "stepSecurityEmailDone": false,
    "profileComplete": false
  },
  "hall": {
    "id": "cmuktpt0s0005jseulthafab5",
    "cinemaId": "seed-magic-cinema",
    "name": "Hall 1",
    "capacity": 120,
    "format": "3D · Dolby",
    "createdAt": "2026-09-28T05:45:16.589Z",
    "updatedAt": "2026-09-28T05:59:01.678Z"
  },
  "pricing": [
    {
      "id": "cmuku7i8a000ijsx2qwaxov4p",
      "sessionId": "cmuku7i8a000hjsx21leujtcb",
      "seatType": "STANDARD",
      "priceUzs": 80000
    },
    {
      "id": "cmuku7i8a000jjsx2a4mr2ifn",
      "sessionId": "cmuku7i8a000hjsx21leujtcb",
      "seatType": "VIP",
      "priceUzs": 80000
    },
    {
      "id": "cmuku7i8a000kjsx2x5acmh24",
      "sessionId": "cmuku7i8a000hjsx21leujtcb",
      "seatType": "BLOCKED",
      "priceUzs": 0
    }
  ],
  "_count": {
    "sessionSeats": 0
  }
}
```

## Dashboard

`GET /admin/dashboard` → **200**

Response:

```json
{
  "mode": "cinema",
  "period": {
    "range": "daily",
    "timezone": "Asia/Tashkent",
    "start": "2026-09-21T19:00:00.000Z",
    "end": "2026-09-28T19:00:00.000Z"
  },
  "kpis": {
    "occupancyRate": null,
    "soldSeats": 0,
    "sellableSeats": 0,
    "sessions": 0,
    "conversionRate": null,
    "paidOrders": 0,
    "holdsResolved": 0,
    "pendingHolds": 0,
    "gmvUzs": 0,
    "refundRate": null,
    "refundedAmountUzs": 0,
    "refundedOrders": 0
  },
  "kpiTrend": [
    {
      "bucket": "2026-09-22",
      "occupancyRate": null,
      "conversionRate": null,
      "refundRate": null,
      "gmvUzs": 0,
      "refundedUzs": 0,
      "soldSeats": 0,
      "sellableSeats": 0,
      "paidOrders": 0,
      "holdsResolved": 0
    },
    {
      "bucket": "2026-09-23",
      "occupancyRate": null,
      "conversionRate": null,
      "refundRate": null,
      "gmvUzs": 0,
      "refundedUzs": 0,
      "soldSeats": 0,
      "sellableSeats": 0,
      "paidOrders": 0,
      "holdsResolved": 0
    },
    {
      "bucket": "2026-09-24",
      "occupancyRate": null,
      "conversionRate": null,
      "refundRate": null,
      "gmvUzs": 0,
      "refundedUzs": 0,
      "soldSeats": 0,
      "sellableSeats": 0,
      "paidOrders": 0,
      "holdsResolved": 0
    },
    {
      "bucket": "2026-09-25",
      "occupancyRate": null,
      "conversionRate": null,
      "refundRate": null,
      "gmvUzs": 0,
      "refundedUzs": 0,
      "soldSeats": 0,
      "sellableSeats": 0,
      "paidOrders": 0,
      "holdsResolved": 0
    },
    {
      "bucket": "2026-09-26",
      "occupancyRate": null,
      "conversionRate": null,
      "refundRate": null,
      "gmvUzs": 0,
      "refundedUzs": 0,
      "soldSeats": 0,
      "sellableSeats": 0,
      "paidOrders": 0,
      "holdsResolved": 0
    },
    {
      "bucket": "2026-09-27",
      "occupancyRate": null,
      "conversionRate": null,
      "refundRate": null,
      "gmvUzs": 0,
      "refundedUzs": 0,
      "soldSeats": 0,
      "sellableSeats": 0,
      "paidOrders": 0,
      "holdsResolved": 0
    },
    {
      "bucket": "2026-09-28",
      "occupancyRate": null,
      "conversionRate": null,
      "refundRate": null,
      "gmvUzs": 0,
      "refundedUzs": 0,
      "soldSeats": 0,
      "sellableSeats": 0,
      "paidOrders": 0,
      "holdsResolved": 0
    }
  ],
  "comparison": {
    "revenueTodayPrevUzs": 0,
    "ticketsSoldTodayPrev": 0,
    "deltaPct": null,
    "ticketsDeltaPct": null
  },
  "stats": {
    "sessionsToday": 0,
    "sessionsPublished": 2,
    "sessionsTotal": 2,
    "ticketsActive": 0,
    "ticketsSoldToday": 0,
    "ordersPending": 0,
    "ordersPaid": 0,
    "paymentsCount": 0,
    "revenueTodayUzs": 0,
    "revenueTotalUzs": 0,
    "refundsPending": 0,
    "cinemas": 1,
    "movies": 2,
    "halls": 1
  },
  "cashflow": {
    "incomeUzs": 0,
    "expenseUzs": 0,
    "netUzs": 0
  },
  "todaySessions": [
    {
      "id": "cmuku7i57000cjsx2r0xaez59",
      "startsAt": "2026-10-20T18:00:00.000Z",
      "status": "PUBLISHED",
      "movieTitle": "Dune: Part Two",
      "posterUrl": null,
      "hallName": "Hall 1",
      "cinemaName": "Magic Cinema",
      "capacity": 120,
      "occupied": 0,
      "remaining": 120
    },
    {
      "id": "cmuku7i8a000hjsx21leujtcb",
      "startsAt": "2026-10-21T15:00:00.000Z",
      "status": "PUBLISHED",
      "movieTitle": "В центре внимания",
      "posterUrl": null,
      "hallName": "Hall 1",
      "cinemaName": "Magic Cinema",
      "capacity": 120,
      "occupied": 0,
      "remaining": 120
    }
  ],
  "recentOrders": [],
  "recentPayments": [],
  "revenueTrend": [
    {
      "date": "2026-09-22",
      "incomeUzs": 0,
      "expenseUzs": 0,
      "netUzs": 0
    },
    {
      "date": "2026-09-23",
      "incomeUzs": 0,
      "expenseUzs": 0,
      "netUzs": 0
    },
    {
      "date": "2026-09-24",
      "incomeUzs": 0,
      "expenseUzs": 0,
      "netUzs": 0
    },
    {
      "date": "2026-09-25",
      "incomeUzs": 0,
      "expenseUzs": 0,
      "netUzs": 0
    },
    {
      "date": "2026-09-26",
      "incomeUzs": 0,
      "expenseUzs": 0,
      "netUzs": 0
    },
    {
      "date": "2026-09-27",
      "incomeUzs": 0,
      "expenseUzs": 0,
      "netUzs": 0
    },
    {
      "date": "2026-09-28",
      "incomeUzs": 0,
      "expenseUzs": 0,
      "netUzs": 0
    }
  ]
}
```

## Wrong current password

`POST /auth/change-password` → **400**

Request:

```json
{
  "currentPassword": "nope",
  "newPassword": "NewPassword1"
}
```

Response:

```json
{
  "statusCode": 400,
  "code": "INVALID_CURRENT_PASSWORD",
  "message": "Текущий пароль неверен"
}
```

# Staff accounts (KAN-37)

**Status:** implemented  
**Depends on:** PM decisions 2026-09-25 in [design-v2-gaps.md](./design-v2-gaps.md) §9  
**Locale:** user-facing errors are Russian

Cinema admin creates a teammate with a login and a temporary password. There is no email invite. The new account must change that password before any other authenticated request succeeds.

Existing email/password login for super admins and cinema admins created by `POST /admin/cinemas` is unchanged.

## Schema

```prisma
model User {
  login              String?  @unique
  mustChangePassword Boolean  @default(false)
  passwordHash       String?
}

model CinemaStaff {
  active Boolean @default(true)
}
```

- `mustChangePassword` defaults to `false`. Only `POST /admin/staff` sets it `true`.
- `login` is stored lowercased. It is not an email (`A–Z`, `a–z`, digits, `.`, `_`, `-`, length 3–64).
- `CinemaStaff.active = false` drops that membership from the session. A user with no active staff row and who is not `SUPER_ADMIN` cannot log in.

Passwords use bcrypt (cost 10), the same helper as cinema-admin creation. Responses never include `passwordHash` or the plaintext password. Do not log either value.

## `POST /auth/login`

Additive: `email` still works. Staff may send `login` instead.

```json
{ "login": "kassir1", "password": "TempPass123" }
```

```json
{ "email": "admin@cinema.uz", "password": "ChangeMe123!" }
```

If both are sent, `email` wins.

Response body (`201`, Nest's default for `POST`; cookie unchanged):

```json
{
  "user": {
    "id": "…",
    "email": null,
    "firstName": "Али",
    "lastName": null,
    "mustChangePassword": true,
    "role": "CUSTOMER",
    "staff": [
      {
        "cinemaId": "…",
        "cinemaName": "Magic Cinema",
        "cinemaStatus": "ACTIVE",
        "role": "STAFF"
      }
    ]
  }
}
```

`firstName` / `lastName` are `null` when unset. `mustChangePassword` is always present.

## `POST /auth/change-password`

Session required. Allowed while `mustChangePassword` is true.

```json
{ "currentPassword": "TempPass123", "newPassword": "NewPassword1" }
```

`newPassword` length is 8–128 (same rule as other admin passwords).

`200`:

```json
{ "ok": true, "mustChangePassword": false }
```

| HTTP | Code | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Password shorter than 8, or body invalid |
| 400 | `NO_PASSWORD` | Account has no password hash |
| 400 | `INVALID_CURRENT_PASSWORD` | Current password does not match |
| 401 | — | No session |

## Password-change guard

While `mustChangePassword` is true, every authenticated request except the allow-list returns:

```json
{
  "statusCode": 403,
  "code": "PASSWORD_CHANGE_REQUIRED",
  "message": "Сначала смените пароль"
}
```

Allow-list:

| Method | Path |
| --- | --- |
| `POST` | `/auth/login` |
| `POST` | `/auth/logout` |
| `GET` | `/auth/me` |
| `POST` | `/auth/change-password` |

`GET /auth/me` returns the same `user` shape as login, including `firstName`, `lastName`, and `mustChangePassword`.

Requests without a session cookie are not blocked by this guard (the route's own `SessionGuard` still applies).

## `GET /admin/staff`

Roles: `SUPER_ADMIN`, `CINEMA_ADMIN`, `STAFF`. Cinema staff see only their cinemas. Super admin may pass `?cinemaId=`.

```json
[
  {
    "id": "staff_row_id",
    "userId": "…",
    "cinemaId": "…",
    "login": "kassir1",
    "email": null,
    "firstName": "Али",
    "lastName": null,
    "role": "STAFF",
    "active": true,
    "mustChangePassword": true,
    "createdAt": "2026-09-28T00:00:00.000Z"
  }
]
```

`id` is the `CinemaStaff` id (used by PATCH). Inactive rows are included so the team page can show status. `email` is `null` for login-only accounts.

## `POST /admin/staff`

Roles: `SUPER_ADMIN`, `CINEMA_ADMIN`. A cinema admin is scoped to their own cinema. Super admin must send `cinemaId`.

```json
{
  "login": "kassir1",
  "password": "TempPass123",
  "role": "STAFF",
  "firstName": "Али",
  "lastName": "Каримов",
  "cinemaId": "only-for-super-admin"
}
```

`role` is the existing staff enum: `CINEMA_ADMIN` | `STAFF`.

`201` (Nest default for `POST`):

```json
{
  "id": "…",
  "userId": "…",
  "cinemaId": "…",
  "login": "kassir1",
  "email": null,
  "firstName": "Али",
  "lastName": "Каримов",
  "role": "STAFF",
  "active": true,
  "mustChangePassword": true,
  "createdAt": "…"
}
```

| HTTP | Code | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Login/password/role invalid |
| 400 | `CINEMA_REQUIRED` | Super admin omitted `cinemaId` |
| 403 | `NOT_CINEMA_STAFF` | Cinema admin targeted another cinema |
| 404 | `CINEMA_NOT_FOUND` | Unknown cinema |
| 409 | `LOGIN_TAKEN` | Login already used (`Такой логин уже занят`) |

## `PATCH /admin/staff/:id`

`:id` is `CinemaStaff.id`. Roles: `SUPER_ADMIN`, `CINEMA_ADMIN` of that cinema.

```json
{ "role": "CINEMA_ADMIN", "active": false }
```

At least one of `role` or `active` is required. Response shape matches one `GET` element.

| HTTP | Code | When |
| --- | --- | --- |
| 400 | `STAFF_SELF_UPDATE` | Actor edits their own row |
| 400 | `VALIDATION_ERROR` | Empty body |
| 403 | `NOT_CINEMA_STAFF` | Out of scope |
| 404 | `STAFF_NOT_FOUND` | Unknown id |
| 409 | `LAST_CINEMA_ADMIN` | Would remove the last active cinema admin |

Deactivated staff disappear from `GET /auth/me` `staff[]` on the next request. They cannot pass admin role checks.

# [Basics] Log in & call a protected endpoint

> **Labels:** `area:backend` · `auth` · `good first issue` · `difficulty:easy`
> **Depends on:** #01
> **Good for:** every student.

## Background

Every data endpoint in `crm-api` is **protected** — it depends on `CurrentUser`. In
the default `AUTH_MODE=local`, you log in with a username/password and get back a
signed **JWT bearer token**; you then send that token on every request. A demo user
is seeded on first start: **`admin` / `admin`**.

This is the standard OAuth2 "password" flow. Understanding it now makes the later
CRUD tasks (which all reuse the same `CurrentUser` guard) click into place.

## What you'll learn

- The OAuth2 password → bearer-token flow (`POST /auth/token`)
- How to call a protected route with an `Authorization: Bearer <token>` header
- How `/docs`'s **Authorize** button works

## Task

1. **Get a token:**

   ```bash
   curl -s -X POST http://localhost:8000/auth/token \
     -d "username=admin&password=admin"
   # -> {"access_token":"eyJhbG...","token_type":"bearer"}
   ```

2. **Call a protected endpoint** with the token:

   ```bash
   TOKEN=$(curl -s -X POST http://localhost:8000/auth/token \
     -d "username=admin&password=admin" | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

   curl -s http://localhost:8000/auth/me   -H "Authorization: Bearer $TOKEN"
   curl -s http://localhost:8000/customers -H "Authorization: Bearer $TOKEN"
   ```

3. **Confirm protection works** — call without a token and observe the 401:

   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/customers   # -> 401
   ```

4. In **`/docs`**, click **Authorize**, enter `admin` / `admin`, then expand
   `GET /customers` and hit **Try it out → Execute**. It should now return 200.

## Acceptance criteria

- [ ] `POST /auth/token` with `admin`/`admin` returns an `access_token`.
- [ ] `GET /auth/me` with the bearer token returns the admin user.
- [ ] `GET /customers` returns `200` **with** the token and `401` **without** it.
- [ ] You can authorize in `/docs` and call a protected route from the browser.

## Hints & references

- Worked auth route: [`app/api/routes/auth.py`](../../apps/crm-api/app/api/routes/auth.py)
- The guard that protects routes: `CurrentUser` in
  [`app/api/deps.py`](../../apps/crm-api/app/api/deps.py)
- Token signing/verifying: `create_access_token` / `decode_access_token` in
  [`app/core/security.py`](../../apps/crm-api/app/core/security.py)

## Definition of done

You can mint a token and use it to reach a protected endpoint, and you understand
why a request without a token is rejected.
Next: [03 — Connect the UI to the API](03-connect-ui-to-api.md).
</content>

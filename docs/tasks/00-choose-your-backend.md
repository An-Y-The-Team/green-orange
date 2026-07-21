# 00 — Choose your backend: NestJS (production) or Python (learning)

There are now **two** CRM backends behind the same UI. They serve the identical
HTTP contract, so `apps/crm-web` talks to whichever one `CRM_API_URL` points at —
no UI changes, ever.

| Backend                          | Port | Role                                                                      |
| -------------------------------- | ---- | ------------------------------------------------------------------------- |
| **`apps/crm-api-nest`** (NestJS) | 8001 | **Production** — implements the _whole_ contract, all pages live          |
| `apps/crm-api` (Python/FastAPI)  | 8000 | **Learning sandbox** — the backlog below; unbuilt pages fall back to mock |

## Switching

One line in `apps/crm-web/.env`:

```bash
CRM_API_URL=http://localhost:8001   # NestJS — full production mode
# CRM_API_URL=http://localhost:8000 # Python — the backend you're building below
```

Restart crm-web after changing it. `turbo run dev` runs crm-web, both backends, at
once — so you can flip between them freely. See
[`apps/crm-api-nest/README.md`](../../apps/crm-api-nest/README.md) for the NestJS
backend; everything below (tasks 01–14) is the **Python** learning track.

> Tip: keep `CRM_API_URL` on `:8001` when you want the app fully working for a
> demo, and switch to `:8000` when you're working through the tasks below and want
> to see _your_ endpoints light up.

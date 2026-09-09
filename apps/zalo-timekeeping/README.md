# @yan/zalo-timekeeping — Zalo Mini App "Chấm công"

Worker time tracking inside Zalo. Login = the worker's Zalo phone number
(must match a pre-registered `CrewMember.phone` in the CRM); they pick an
assigned công trình, enter ngày + giờ vào/ra (odd hours, overnight supported),
and the log lands in the CRM as a **pending** `TimekeepingRecord`
(`source: zalo_app`) for the operator to duyệt/từ chối on the Nhân sự → Chấm
công tab.

A plain Vite + React app following Zalo's "convert web app to mini app" guide
(relative `base`, `.module.js` chunk names, `app-config.json`, output in
`www/`) — the interactive `create-zalo-mini-app` scaffold requires a Zalo
login, so this project is hand-rolled to the same shape. On Zalo the platform
serves **its own `index.html`** and loads exactly what `app-config.json`'s
`listCSS`/`listSyncJS` name, mounting into `#app` — which is why asset
filenames are deliberately **unhashed** (`assets/index.css`,
`assets/index.module.js`) and why our own `index.html` uses `#app` too. Add a
new entry or CSS file and `app-config.json` has to list it, or it silently
never loads. Docs live at `docs.zaloplatforms.com/docs/MA/` (the old
`mini.zalo.me` links now redirect there). `zmp-sdk` provides
`getPhoneNumber`/`getAccessToken`; the pair is exchanged at
`POST /auth/zalo-token` (crm-api-nest) for a crew JWT that only unlocks
`/worker/*` routes.

## Local loop

```bash
bun dev                  # vite on :3003 — API_BASE points at localhost:8001 in dev
```

Run crm-api-nest locally with `http://localhost:3003` in `CORS_ORIGINS`.
`getPhoneNumber` only works inside Zalo (simulator or real device); in a plain
browser the login button will fail — smoke the API path with a hand-signed
crew JWT instead (see `src/auth/jwt.guard.ts` in crm-api-nest).

## Deploy (operator, from a machine with Zalo access)

1. Zalo Developers console: create the Mini App under the company Zalo App,
   register the **getPhoneNumber** permission (justification + screenshot —
   review takes time, start early), and whitelist the public CRM API domain in
   the request-domain list.
2. Set the production `API_BASE` in `src/constants/config.ts` if the domain
   differs.
3. `bun run build` → bundle in `www/`.
4. `bunx zmp-cli login` then `bunx zmp-cli deploy` — choose "Deploy your
   existing project", point it at `www/`, and pick the **Testing** version
   status, not the default _Development_ (development versions are hidden from
   version management and overwritten by the next deploy, so they cannot be
   submitted for review). Testing versions are numbered and reachable by
   registered testers via the deep link `https://zalo.me/s/<miniAppId>`.
5. Submit the version for Zalo review in the Mini App Center, then publish.

No Docker/Dockhand involvement — Zalo hosts the bundle; only the CRM API needs
public reachability.

# crm-api — student task backlog

Backend exercises on **`apps/crm-api`** (FastAPI + SQLModel + Postgres). Each
file here is written like a **GitHub issue** — copy one into a new issue, title
and body, and assign it.

## Read this first

`apps/crm-api` is **not** a half-built app any more. It implements the whole v2
contract, endpoint for endpoint, alongside `apps/crm-api-nest` (NestJS, port
8001, the production default). `crm-web` runs against either one — that's what
`CRM_API_URL` picks. So there are no `501` stubs left to fill in, and no
"implement resource X like `clients`" tasks.

What that changes about the exercises: they are about **logic and judgement**
now, not scaffolding. A ticket here gives you a problem and a failing test
suite, and the interesting part is the reasoning, not the typing.

> **The old backlog (01–14) is retired.** It built the v1 contract and was
> deleted at `10f445d` when the Python backend was brought to v2 parity. Its
> issues (#14–#26, #60) are all closed. Numbering restarts here at `01`; the old
> files are still in git history if you want them:
> `git show 10f445d^:docs/tasks/README.md`.

## The backlog

| #                                    | Task                                                  | Issue | Shape                           |
| ------------------------------------ | ----------------------------------------------------- | ----- | ------------------------------- |
| [01](01-document-code-sequencing.md) | Fix document code sequencing / Đánh số hồ sơ theo năm | #70   | pure logic + one judgement call |

More get added one at a time, as the one in flight lands.

## How a task works

1. **The tests are the spec.** A ticket ships its acceptance tests already
   written and already failing, behind a pytest marker so they don't turn CI
   red for everyone else. Run yours with `uv run pytest -m exercise`; run
   everything else with `uv run pytest -q` and keep it green the whole time.
2. **Deleting the marker is part of the job.** The PR that makes them pass also
   removes `addopts` and `markers` from `apps/crm-api/pyproject.toml` and the
   `pytestmark` line from the test module, so the tests guard the behaviour from
   then on.
3. **Some questions have no answer, only a defence.** Tickets with a
   "Decide and defend" section want your reasoning written into the ticket
   before you're done. A reviewer will push on the trade-off, not tick a spec.
4. **Both backends, one contract.** [AGENTS.md](../../AGENTS.md): a behaviour in
   only one backend is a bug. You write Python; the maintainer mirrors your
   design into `apps/crm-api-nest` once your PR merges. Read the TypeScript twin
   anyway — each ticket links it.

## Conventions used in these issues

- **Labels** — `area:backend`, plus one of `logic` / `crud` / `requirements`,
  plus `domain:greenorange` and a `difficulty:`.
- **`Depends on: #NN`** — the issue that must land first, if any.
- Every command runs from `apps/crm-api/` and starts with `uv run`
  (see [`apps/crm-api/README.md`](../../apps/crm-api/README.md)).
- Vietnamese domain nouns stay Vietnamese — công trình, báo giá, hợp đồng,
  quyết toán, đợt thanh toán. The glossary is in
  [`docs/features/crm-database-schema.md`](../features/crm-database-schema.md).
- The business truth doc is
  [`docs/features/crm-business-flow.md`](../features/crm-business-flow.md).
  Code follows that doc, not the other way around.

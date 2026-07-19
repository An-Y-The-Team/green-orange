# [Intermediate] Link Client to Project / Gắn Khách hàng vào Công trình

> **Labels:** `area:backend` · `requirements` · `domain:greenorange` · `difficulty:medium`
> **Depends on:** #07 (Projects)
> **Good for:** 1 student — a **requirements-first** ticket, not a spec to copy.

## Background

Right now a **Công trình (Project)** stores its client as a **free-text string**
(`client: str` in [`app/models/project.py`](../../apps/crm-api/app/models/project.py)) —
just a name typed into the form. Meanwhile there is a real **Client** resource
(the fully-worked reference: [`app/models/client.py`](../../apps/crm-api/app/models/client.py),
`/clients` routes, and the crm-web `clients` feature). The two are **not linked**:
nothing stops a project from naming a client that doesn't exist, and you can't
click from a project to its client record.

We want a project to be **linked to a Client row**, not just carry its name.

## This ticket is deliberately underspecified

**Do not start coding.** Your first job is **requirements gathering**, not
implementation. The interesting part of "link A to B" is the edge cases, and
the product decisions are yours to surface, propose, and get signed off — then
build.

Think through every scenario. At minimum, answer these — and add the ones we
haven't thought of:

- [ ] The UI sends a **`client_id` that doesn't exist** — what should happen?
      `404`? `422`? Silently ignore? What message does the user see?
- [ ] The UI sends **no `client_id`, only a `client` name** — reject it? Match
      an existing client by name? Store the name and leave it unlinked?
- [ ] Should the API **auto-create a Client** when the name isn't found, or is
      creating clients a separate, explicit action?
- [ ] Is a client **required** on a project, or optional? (Note task #07 just
      made several project fields optional — where does client land?)
- [ ] What about the **existing projects** that already have a free-text
      `client` string — how do they get linked (backfill / migration)? What
      happens to ones whose name matches no client?
- [ ] Can a project be **re-assigned** to a different client later (PATCH)?
- [ ] If a **Client is deleted** while projects reference it — block it,
      null it out, or cascade?
- [ ] Cardinality: one client → many projects? Can two clients share a name?
- [ ] What does `GET /projects` **return** — just `client_id`, or the nested
      client object? Does the list page need the client name without an extra
      round-trip? (Watch the N+1.)

## Task

1. **Gather requirements.** Work through the scenarios above (plus your own).
   Write your decisions **into this ticket** — edit the "Requirements" section
   below and fill it in. Note the trade-off behind each choice, not just the
   choice.
2. **Get sign-off** on the requirements before implementing (ask the reviewer /
   in the PR). Requirements changing after review is fine — that's the point —
   but they must be written down first.
3. **Implement** to match the agreed requirements: model/relationship, the
   route behaviour for each scenario, validation, and a migration (remember
   the existing free-text `client` data).
4. **Test** — one test per decided scenario (`tests/test_projects.py`), so the
   behaviour you specified is the behaviour that ships.

## Requirements (fill this in — this is the deliverable)

> Replace this block with your decisions. One line per scenario: what happens,
> the HTTP status / behaviour, and why. Leave open questions marked `TODO` until
> resolved.

- Client on a project is: `required` / `optional` — …
- Bad `client_id` → …
- Name only, no id → …
- Auto-create client? → …
- Existing free-text data → …
- Deleting a referenced client → …
- Response shape (`client_id` vs nested) → …
- …

## Acceptance criteria

- [ ] The **Requirements** section above is filled in, each decision has a
      one-line rationale, and it was reviewed **before** the implementation PR.
- [ ] Project ↔ Client is a real relationship (FK), not a duplicated string.
- [ ] Every scenario you decided on has a test proving that behaviour.
- [ ] Migration handles the existing free-text `client` data (documented, even
      if the answer is "left unlinked").
- [ ] `GET /projects` / `/projects/{id}` return the agreed shape and the
      crm-web Công trình pages still render (no N+1 regressions).

## Hints & references

- Reference resources: [`clients.py`](../../apps/crm-api/app/api/routes/clients.py),
  [`projects.py`](../../apps/crm-api/app/api/routes/projects.py).
- SQLModel relationships & foreign keys: read
  `node_modules`-free — see the SQLModel docs section on relationships. A FK is
  `Field(foreign_key="client.id")`.
- There are no "right" answers here — there are *defended* answers. A reviewer
  will push on the trade-offs, not tick a spec.

## Definition of done

The requirements are written down and agreed, the implementation matches them
scenario-for-scenario with tests, and a Công trình links to a real Client.

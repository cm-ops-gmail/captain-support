# Cap10 Support

10 Minute School's issue-reporting platform for **Class 6, 7, 8, 9, SSC 27, SSC 28, HSC 27 and HSC 28**.
Students report App, Website, Product and learning-experience issues; class captains send
improvement ideas, experiences and proposals ("Captain Voice"); the support team works every
class from its own dashboard.

Built from the Student Support Hub codebase (same stack, design system and data/issue format):
TanStack Start + React 19, Supabase (Postgres + Storage), Tailwind v4, shadcn/ui, Bangla/English UI.

## Setup

1. Create a **new** Supabase project (do not reuse the Student Support Hub project).
2. In its SQL Editor, run `supabase/migrations/20261109000000_cap10_init.sql`.
   It creates every table, the private `ticket-attachments` storage bucket, and demo data.
3. `cp .env.example .env` and fill in the values from the new project
   (Project Settings → API). Generate `SESSION_SECRET` with `openssl rand -hex 32`.
4. `npm install` (or `bun install`), then `npm run dev`.

Staff login: **TENMS / tenten10** (created on first staff login; change it in Settings).

## How accounts work

There is **no open registration**. Staff add students in **Student Database** (CSV import or form).

| CSV column | Required | Notes |
|---|---|---|
| `name` | yes | |
| `login_number` (or `phone` / `contact`) | yes | Digits only are kept |
| `class` | yes | `Class 6`…`Class 9`, `SSC 27`, `SSC 28`, `HSC 27`, `HSC 28` (Bangla labels and ids like `hsc_28` also accepted) |
| `student_id` and/or `tms_transaction_id` | at least one | Used to verify the student at first-time setup |
| `email`, `role` (`student`/`captain`), `status` | no | |

A student then opens the site → **First-time setup** → login number + Student ID/TMS ID + new
password. After that they log in with login number + password.

Demo accounts (seeded): login `01700002801` + Student ID `H28-001` (HSC 28 student), and
`01700002899` + `H28-CAP` (HSC 28 captain). Remove them with `DELETE FROM students WHERE is_demo;`.

## Features

**Students** — Dashboard with quick-report tiles · Report an issue (category → sub-type, platform,
app version, page/feature, link, up to 5 attachments) · My issues with conversation thread ·
Notices for their class · Profile (email, password).

**Captains** (students with `role = captain`) — everything above plus **Captain Voice**
(Improvement / Experience / Proposal), **My Submissions** with the team's reply, and a read-only
**Class Issues** view of their own class.

**Staff** — Overview with one card per class · **Class Dashboards** (status, category, platform,
14-day trend, latest issues) · **Issue Desk** (class tabs, filters, reply, status/priority,
internal notes, CSV export) · **Captain Voice** review desk · Student Database · class-targeted
Notices · Activity Log · Settings.

## Where things live

| What | File |
|---|---|
| Class list & labels | `src/lib/class-segments.ts` (+ CHECK constraints in the migration) |
| Issue categories, sub-types, platforms, Captain Voice types | `src/lib/support-constants.ts` |
| Auth, sessions, first-time setup | `src/lib/auth.functions.ts`, `src/lib/session.server.ts` |
| Student / staff / captain server functions | `src/lib/{student,staff,captain}.functions.ts` |

Security model: RLS is enabled on every table with no policies, so the public key cannot read
data. All access goes through server functions that use the service-role key and check the
signed session cookie (`requireStudent` / `requireCaptain` / `requireStaff`).

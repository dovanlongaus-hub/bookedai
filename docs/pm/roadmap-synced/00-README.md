# BookedAI Roadmap-Synced Pack — Index (00)

Date: `2026-04-27`

Status: `active SSOT — phase + roadmap synchronization, anchored 2026-04-27`

> **Latest scope updates (2026-04-27)**: AI Mentor 1-1 added to go-live ([CR-009](05-CHANGE-REQUESTS.md)); Telegram-only channel pre go-live, post-go-live communication-layer research scheduled ([CR-010](05-CHANGE-REQUESTS.md)); Stripe subscription deferred to Phase 21 ([CR-011](05-CHANGE-REQUESTS.md)); Zoho CRM live activation awaits tenant credentials ([CR-012](05-CHANGE-REQUESTS.md)).

Owner lane: `Product/PM` (xem [phase-execution-operating-system-2026-04-26.md](../../development/phase-execution-operating-system-2026-04-26.md))

## 1. Mục tiêu (Purpose)

`docs/pm/roadmap-synced/` là **Single Source of Truth (SSOT)** cho toàn bộ phase, sprint, và roadmap của BookedAI tính đến `2026-04-27`. Pack này được tạo ra để giải quyết tình trạng `~50+` tài liệu phase/sprint/roadmap chồng chéo trong `docs/architecture/` và `docs/development/` đang mâu thuẫn về:

- cách đánh số phase (`Phase 0-9` baseline vs `Phase 17-23` active vs `Coding Phase 0-N` cũ vs `Phase 1-4` 4-band thu gọn)
- ngày bắt đầu / kết thúc của từng phase và sprint
- mapping `Sprint X -> Phase Y` (đặc biệt cho `Sprint 11-16`)
- trạng thái (planned vs in-progress vs shipped vs closed)
- tên gọi của cùng một phase (ví dụ Phase 17 = `Full-flow stabilization` trong roadmap mới nhưng bị gọi là `Stabilization closeout` ở vài nơi)

Pack này **không xoá** tài liệu nào. Nó chỉ:

- Synthesize một danh sách phase chuẩn duy nhất ([01-MASTER-ROADMAP-SYNCED.md](01-MASTER-ROADMAP-SYNCED.md))
- Ghi rõ mọi mâu thuẫn đã phát hiện và cách hoà giải ([02-RECONCILIATION-LOG.md](02-RECONCILIATION-LOG.md))
- Gán nhãn `CANONICAL` / `SUPERSEDED-BY` / `STILL-VALID-DETAIL` / `STALE-ARCHIVE` / `PARTIAL-MERGE` cho từng tài liệu cũ ([03-DOC-AUTHORITY-MAP.md](03-DOC-AUTHORITY-MAP.md))
- Cấp một file chi tiết cho mỗi phase ([phases/](phases/))
- Cập nhật [docs/pm/08-MERGE-MAP.md](../08-MERGE-MAP.md) với 1 dòng tham chiếu ngược về pack này

## 2. Authority statement

Kể từ `2026-04-27`, bất kỳ câu hỏi nào liên quan tới:

- "Phase nào đang chạy?"
- "Sprint X nằm ở Phase nào?"
- "Phase Y kết thúc ngày nào?"
- "Phase Z đã ship chưa?"

phải được trả lời bằng:

1. [01-MASTER-ROADMAP-SYNCED.md](01-MASTER-ROADMAP-SYNCED.md) cho tổng quan phase × sprint × ngày
2. [phases/phase-NN-detail.md](phases/) cho chi tiết một phase cụ thể
3. [02-RECONCILIATION-LOG.md](02-RECONCILIATION-LOG.md) khi cần biết tại sao một tài liệu cũ nói khác

Tài liệu gốc trong `docs/architecture/` và `docs/development/` được giữ nguyên cho lịch sử và detail-level engineering, nhưng khi chúng mâu thuẫn với pack này thì pack này thắng.

**Code reality vẫn thắng pack này** — nếu code đã ship khác với pack mô tả, closeout pass tiếp theo phải cập nhật pack thay vì rollback code.

## 3. Quan hệ với các pack hiện hữu

- [`docs/pm/00-README.md`](../00-README.md) — PM pack (FR/NFR/RACI/test/UAT) vẫn là SSOT cho requirements, stories, tests. Pack `roadmap-synced/` là SSOT cho **phase + roadmap + sprint mapping**.
- [`docs/pm/03-EXECUTION-PLAN.md`](../03-EXECUTION-PLAN.md) — vẫn là PM execution baseline cấp pack; `01-MASTER-ROADMAP-SYNCED.md` là phiên bản kiểm tra/đối chiếu kĩ hơn (mọi claim đều có citation).
- [`docs/pm/08-MERGE-MAP.md`](../08-MERGE-MAP.md) — crosswalk PM-side; pack này thêm thông tin authority labelling cho các tài liệu phase/sprint.
- [`docs/pm/09-OPEN-QUESTIONS.md`](../09-OPEN-QUESTIONS.md) — leadership decisions; pack này tham chiếu OQ-IDs trong từng phase detail file.

## 4. Cấu trúc pack

| File | Nội dung |
|---|---|
| [00-README.md](00-README.md) | (file này) Index, authority statement, update procedure |
| [01-MASTER-ROADMAP-SYNCED.md](01-MASTER-ROADMAP-SYNCED.md) | Danh sách phase chuẩn `0 → 23`, ngày (re-anchored), status, sprint range, deliverable; Gantt 8 tuần `2026-04-11 → 2026-06-07` |
| [02-RECONCILIATION-LOG.md](02-RECONCILIATION-LOG.md) | Mọi mâu thuẫn được phát hiện và cách hoà giải, group theo phase (incl. RC-100..RC-102 re-anchor) |
| [03-DOC-AUTHORITY-MAP.md](03-DOC-AUTHORITY-MAP.md) | Nhãn authority cho từng tài liệu phase/sprint/roadmap cũ |
| [04-VISION-TARGET-MILESTONES.md](04-VISION-TARGET-MILESTONES.md) | (NEW) Vision, North-Star, target outcomes 90/180/365 days, milestones M-01..M-08 |
| [05-CHANGE-REQUESTS.md](05-CHANGE-REQUESTS.md) | (NEW) Change Request register: workflow, types, status legend, CR-001..CR-008 |
| [06-BIG-PICTURE.md](06-BIG-PICTURE.md) | (NEW) One-page visual: timeline strip, Mermaid Gantt, swim-lanes, critical path, decision points |
| [07-PAST-WORK-LOG.md](07-PAST-WORK-LOG.md) | (NEW `2026-04-27`) Snapshot Phase 0 → today: week-by-week timeline, phase-by-phase status, confidence assessment for go-live `2026-04-30` |
| [08-IMPLEMENT-FIX-PLAN.md](08-IMPLEMENT-FIX-PLAN.md) | (NEW `2026-04-27`) Action plan to hit go-live `2026-04-30`: Gate A/B/C/D/E fix backlog with countdown D-3 → D-0 + fallback/rollback procedure |
| [phases/phase-00-detail.md](phases/phase-00-detail.md) → [phase-23-detail.md](phases/phase-23-detail.md) | 1 file chi tiết / phase theo template chuẩn |
| [zz-CHANGELOG.md](zz-CHANGELOG.md) | Changelog cho riêng pack này |

## 5. Quy ước (Conventions)

- **Anchor today** = `2026-04-27`. **Re-anchored** `2026-04-27` per user input: Phase 0 start = `2026-04-11`; M-01 chess+swim demo = `2026-04-29`; M-02 go-live = `2026-04-30`; weekly Mon-Sun cadence post-go-live; Phase 23 end = `2026-06-07` = total project completion. Xem [02-RECONCILIATION-LOG.md §RC-100](02-RECONCILIATION-LOG.md), [05-CHANGE-REQUESTS.md §CR-001](05-CHANGE-REQUESTS.md), [04-VISION-TARGET-MILESTONES.md](04-VISION-TARGET-MILESTONES.md), [06-BIG-PICTURE.md](06-BIG-PICTURE.md).
- Mọi cụm từ tương đối ("next sprint", "soon") đã được quy đổi sang ISO date hoặc đánh dấu `[date pending]`.
- **Phase numbering**: pack này dùng `Phase 0` → `Phase 23` đúng theo [bookedai-master-roadmap-2026-04-26.md](../../architecture/bookedai-master-roadmap-2026-04-26.md). `Phase 10-16` không tồn tại trong product roadmap mới — `Sprint 11-16` map vào `Phase 7`, `Phase 8`, `Phase 9` (xem `01-MASTER-ROADMAP-SYNCED.md` §Sprint Map).
- **Sprint numbering**: `Sprint 1` → `Sprint 22` đã commit; `Sprint 23` và `Sprint 24` là indicative post-22 horizon.
- **Status vocabulary**:
  - `Shipped` — code ở production, closeout đã ký
  - `In-Progress` — đang execute trong active sprint window
  - `Planned` — scope locked, chưa start
  - `Deferred` — bị dời ra ngoài Sprint 22 horizon
- **Citation rule**: mọi date / status / deliverable claim phải có `[source name](relative-path)` link. Khi không có nguồn, đánh dấu `[date pending]` và mở entry ở [09-OPEN-QUESTIONS.md](../09-OPEN-QUESTIONS.md).
- **Không gold-plate**: pack này hợp nhất tài liệu hiện hữu, không sáng tạo phase/scope mới.

## 6. Update procedure

Khi 1 phase đóng, hoặc khi roadmap thay đổi:

1. Cập nhật trạng thái phase trong [01-MASTER-ROADMAP-SYNCED.md](01-MASTER-ROADMAP-SYNCED.md) (cả bảng và Gantt).
2. Cập nhật mục `Status`, `Closeout summary` trong file phase detail tương ứng (ví dụ `phases/phase-19-detail.md`).
3. Nếu có conflict mới phát sinh, thêm entry mới vào [02-RECONCILIATION-LOG.md](02-RECONCILIATION-LOG.md).
4. Nếu một tài liệu cũ vừa được superseded, cập nhật nhãn trong [03-DOC-AUTHORITY-MAP.md](03-DOC-AUTHORITY-MAP.md).
5. Mirror entry vào [docs/development/implementation-progress.md](../../development/implementation-progress.md) và [docs/architecture/bookedai-master-roadmap-2026-04-26.md](../../architecture/bookedai-master-roadmap-2026-04-26.md).
6. Thêm 1-line entry vào [zz-CHANGELOG.md](zz-CHANGELOG.md) ở pack này.

## 7. Reading order theo audience

- **Leadership / Investor**: [04-VISION-TARGET-MILESTONES.md](04-VISION-TARGET-MILESTONES.md) → [06-BIG-PICTURE.md](06-BIG-PICTURE.md) → [01-MASTER-ROADMAP-SYNCED.md](01-MASTER-ROADMAP-SYNCED.md) (sections §0 Date Anchor, §1 Snapshot, §6 Gantt) → [phases/phase-19-detail.md](phases/phase-19-detail.md) → [phases/phase-21-detail.md](phases/phase-21-detail.md) → [09-OPEN-QUESTIONS.md](../09-OPEN-QUESTIONS.md).
- **Engineering leads**: [01-MASTER-ROADMAP-SYNCED.md](01-MASTER-ROADMAP-SYNCED.md) (sections §3 Sprint Map và §5 P0/P1 anchors) → file detail của phase đang làm → [phase-execution-operating-system-2026-04-26.md](../../development/phase-execution-operating-system-2026-04-26.md) cho gates.
- **PM/Operations**: [05-CHANGE-REQUESTS.md](05-CHANGE-REQUESTS.md) → [02-RECONCILIATION-LOG.md](02-RECONCILIATION-LOG.md) → [03-DOC-AUTHORITY-MAP.md](03-DOC-AUTHORITY-MAP.md) → [zz-CHANGELOG.md](zz-CHANGELOG.md).

## Changelog

- `2026-04-27` (scope update) — Added top-of-file callout for CR-009 (AI Mentor 1-1) + CR-010 (Telegram-only pre go-live; post-go-live comms-layer research) + CR-011 (Stripe defer) + CR-012 (Zoho CRM defer).
- `2026-04-27` (re-anchor) — Added files 04, 05, 06; updated index, conventions section with re-anchor note; updated reading order to start with Vision/Big-Picture for leadership audience.
- `2026-04-27` initial publication of `docs/pm/roadmap-synced/` pack synthesizing Phase 0-23 + post-Sprint-22 horizon from 50+ source documents in `docs/architecture/` and `docs/development/`.

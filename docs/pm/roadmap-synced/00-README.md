# BookedAI Roadmap-Synced Pack — Index (00)

Date: `2026-04-27`

Status: `active SSOT — phase + roadmap synchronization, anchored 2026-04-27`

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
| [01-MASTER-ROADMAP-SYNCED.md](01-MASTER-ROADMAP-SYNCED.md) | Danh sách phase chuẩn `0 → 23`, ngày, status, sprint range, deliverable; Gantt 26 tuần |
| [02-RECONCILIATION-LOG.md](02-RECONCILIATION-LOG.md) | Mọi mâu thuẫn được phát hiện và cách hoà giải, group theo phase |
| [03-DOC-AUTHORITY-MAP.md](03-DOC-AUTHORITY-MAP.md) | Nhãn authority cho từng tài liệu phase/sprint/roadmap cũ |
| [phases/phase-00-detail.md](phases/phase-00-detail.md) → [phase-23-detail.md](phases/phase-23-detail.md) | 1 file chi tiết / phase theo template chuẩn |
| [zz-CHANGELOG.md](zz-CHANGELOG.md) | Changelog cho riêng pack này |

## 5. Quy ước (Conventions)

- **Anchor today** = `2026-04-27`. Mọi cụm từ tương đối ("next sprint", "soon") đã được quy đổi sang ISO date hoặc đánh dấu `[date pending]`.
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

- **Leadership / Investor**: [01-MASTER-ROADMAP-SYNCED.md](01-MASTER-ROADMAP-SYNCED.md) (sections §1 Snapshot và §6 Gantt) → [phases/phase-19-detail.md](phases/phase-19-detail.md) → [phases/phase-21-detail.md](phases/phase-21-detail.md) → [09-OPEN-QUESTIONS.md](../09-OPEN-QUESTIONS.md).
- **Engineering leads**: [01-MASTER-ROADMAP-SYNCED.md](01-MASTER-ROADMAP-SYNCED.md) (sections §3 Sprint Map và §5 P0/P1 anchors) → file detail của phase đang làm → [phase-execution-operating-system-2026-04-26.md](../../development/phase-execution-operating-system-2026-04-26.md) cho gates.
- **PM/Operations**: [02-RECONCILIATION-LOG.md](02-RECONCILIATION-LOG.md) → [03-DOC-AUTHORITY-MAP.md](03-DOC-AUTHORITY-MAP.md) → [zz-CHANGELOG.md](zz-CHANGELOG.md).

## Changelog

- `2026-04-27` initial publication of `docs/pm/roadmap-synced/` pack synthesizing Phase 0-23 + post-Sprint-22 horizon from 50+ source documents in `docs/architecture/` and `docs/development/`.

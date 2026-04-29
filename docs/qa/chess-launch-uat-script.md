# Chess Academy Launch — UAT Script (Non-Tech Testers)

**For:** Vietnamese parents and adult students, friends/family acting as launch UAT testers.
**Time per persona:** 10–15 minutes.
**Setup:** open `https://chess.bookedai.au` in a fresh Chrome or Safari window. Have your phone ready (banking app installed). No login required to start.

If anything looks off, screenshot it and reply to the launch group with the persona name + step number. Don't worry about technical jargon — describe what you saw vs what you expected.

---

## Persona A — Vietnamese parent, child age 8, beginner

**Story:** Chị Linh là phụ huynh ở TP.HCM, có con trai 8 tuổi mới bắt đầu học cờ vua. Chị muốn tìm lớp online nhóm nhỏ và đăng ký buổi học thử miễn phí.

### Bilingual instructions

**EN:** Sister Linh is a parent in HCMC. Her 8-year-old son is just starting chess. She wants a small online group class and a free 30-minute trial.

### Steps

1. **Mở trang / Open the page**
   - Truy cập `https://chess.bookedai.au` trên trình duyệt mới.
   - Visit `https://chess.bookedai.au` in a fresh browser tab.
   - *Screenshot placeholder: hero section with promo banner.*

2. **Đổi sang tiếng Việt / Switch to Vietnamese**
   - Trên đầu trang, bấm nút **VI**.
   - Click the **VI** toggle in the top-right of the navigation bar.
   - **Should happen:** toàn bộ chữ trên trang chuyển sang tiếng Việt. Tiêu đề lớn ghi *"Học cờ vua cùng Đại kiện tướng Việt Nam"*.
   - **Flag if:** any section is still in English, or text is broken/cut off.

3. **Xem khuyến mãi / See the launch promo**
   - Cuộn xuống một chút và xem banner đếm ngược "Ưu đãi 20% học phí tháng đầu — còn X ngày".
   - Scroll a little — confirm the 20% off countdown banner is visible and counting down.
   - **Flag if:** đồng hồ đếm ngược không chạy, hoặc số ngày sai.

4. **Tìm lớp phù hợp / Use the concierge**
   - Cuộn tới mục **"Tư vấn lớp học"**. Chọn câu mẫu *"Bé nhà em 8 tuổi, mới bắt đầu học cờ. Lộ trình phù hợp là gì?"*. Bấm **"Tìm lộ trình phù hợp"**.
   - Scroll to the concierge section. Click the suggested prompt about an 8-year-old beginner. Press the search button.
   - **Should happen:** trợ lý trả lời gợi ý lớp **"Nền tảng cờ vua"** trong vòng vài giây.
   - *Screenshot placeholder: assistant bubble with the recommended program.*

5. **Điền form đăng ký lớp thử / Fill the trial booking form**
   - Cuộn xuống mục **"Giữ chỗ"**. Chọn **"Nền tảng cờ vua"**.
   - Điền: Tên = *Linh Nguyễn*, Email = your real email, Điện thoại = *+84 90 123 4567*, Tuổi học viên = *8*, Mục tiêu = *Nền tảng cơ bản*, Hình thức = *Nhóm online*.
   - **Quan trọng:** chọn **Ngày học** = ngày mai, **Giờ học** = 18:00 (để giữ một slot thật).
   - Ghi chú = *"Đăng ký buổi học thử miễn phí 30 phút"*.
   - Bấm **"Giữ chỗ cho tôi"**.

6. **Xác nhận chỗ giữ / Confirm the held slot**
   - **Should happen:** banner xanh lá hiện ra: *"Chỗ học của bạn đã được giữ với mã CHESS-XXXXXXXX. Mã đăng ký … đã chuyển cho giáo viên."*
   - **Flag if:** banner đỏ xuất hiện, hoặc không có mã `CHESS-` nào.

7. **Mở email xác nhận / Check email**
   - Mở hộp thư email Linh đã nhập. Trong vòng 1–2 phút, có email *"Học viện Cờ vua GM Mai Hùng — Đã ghi nhận đăng ký"*.
   - Open inbox — confirmation email *"GM Mai Hung Chess Academy enquiry received"* arrives within 1–2 minutes.
   - **Flag if:** không có email sau 5 phút (kiểm tra cả thư mục Spam).

8. **Thoát / Close**
   - Đóng tab. Persona A hoàn tất.

---

## Persona B — Adult expat, English UI, tournament prep, Stripe payment

**Story:** Tom is an Australian expat living in HCMC. He plays at club level and wants tournament prep coaching. He pays in AUD by card.

### Steps

1. **Open the page**
   - Visit `https://chess.bookedai.au` in a fresh browser tab. Page may default to Vietnamese — click the **EN** toggle in the top-right.
   - **Should happen:** all sections render in English. Hero reads *"Train chess with a real Vietnamese grandmaster."*
   - *Screenshot placeholder: hero in EN.*

2. **Skim the four programs**
   - Scroll to the **Programs & pricing** section. Confirm four cards: Beginner Foundations, Private Grandmaster Coaching (marked *Most popular*), Tournament Preparation, At-Home Elite Training.
   - **Flag if:** any card is missing, has no price, or shows broken text.

3. **Pick Tournament Preparation**
   - Click **"Save my spot"** on the *Tournament Preparation* card.
   - **Should happen:** smooth scroll to the enrollment form.

4. **Fill the form**
   - Name = *Tom Wright*, Email = real test email you can read, Phone = *+61 400 000 000*, Student age = *Adult*, Training goal = *Tournament preparation*, Format = *Online private*.
   - Preferred date = next Saturday. Preferred time = 10:00.
   - Click **"Save my spot"**.

5. **Reach the payment chooser**
   - Green banner: *"Your spot is held with reference CHESS-XXXXXXXX."*
   - Below: a **Choose how to pay** panel appears with **three** cards: Pay by card (AUD via Stripe), Pay by VND bank QR, Pay by AUD bank transfer.
   - **Flag if:** payment panel does not appear, or any card is missing.
   - *Screenshot placeholder: 3-card payment chooser.*

6. **Click "Pay now" on Stripe card**
   - Browser opens Stripe Checkout (URL begins `https://checkout.stripe.com/...`).
   - **Should happen:** the page shows the program name *"Chess Tournament Preparation"* and amount in AUD ($80.00).

7. **Pay with the test card**
   - Card number = `4242 4242 4242 4242`
   - Expiry = any future date (e.g. `12 / 30`)
   - CVC = `123`
   - Postcode = `2000`
   - Click **Pay**.
   - **Should happen:** redirect to `chess.bookedai.au/account?payment=success`, which then forwards to `portal.bookedai.au/student-account` within a moment.

8. **Verify Stripe Dashboard**
   - In a separate tab, log into Stripe **TEST mode** dashboard → Payments → most recent.
   - Confirm: amount = 80.00 AUD, status = Succeeded, metadata contains `bookedai_kind=chess_student_payment` and `lead_id=<the lead uuid from step 5>`.
   - **Flag if:** payment is missing, in wrong currency, or metadata is empty.

9. **Verify portal shows paid status**
   - On `portal.bookedai.au/student-account`, sign in with the same email Tom used.
   - Bookings table → row for the Tournament Prep booking shows **Payment = Paid** (green pill).
   - **Flag if:** payment column shows pending after 60 seconds.

---

## Persona C — Local family, sibling discount, VND bank transfer

**Story:** Anh Bình ở Hà Nội đã đăng ký một bé học rồi. Giờ anh đăng ký bé thứ hai và muốn áp dụng ưu đãi anh chị em (-15%). Anh muốn chuyển khoản VND qua app ngân hàng.

### Bilingual instructions

**EN:** Mr Bình already enrolled one child. He's enrolling the second to claim the 15% sibling discount. He wants to pay by Vietnamese bank QR transfer.

### Steps

1. **Mở trang / Open the page**
   - Truy cập `https://chess.bookedai.au`. Đảm bảo đang ở **VI**.
   - Visit the page in Vietnamese.

2. **Xem ưu đãi / See the discount note**
   - Cuộn xuống xem ghi chú ưu đãi: *"Anh chị em học cùng — giảm 15% cho bé thứ hai"*.
   - Confirm the sibling discount card or note is visible somewhere on the programs section.
   - **Flag if:** không thấy ghi chú nào về anh chị em.

3. **Chọn lớp Beginner cho bé thứ hai / Pick Beginner Foundations for the second child**
   - Bấm **"Giữ chỗ ngay"** trên thẻ *"Nền tảng cờ vua"*.

4. **Điền form / Fill the form**
   - Tên = *Bình Trần*, Email = email thật của bạn, Điện thoại = *+84 91 222 3333*, Tuổi = *10*, Mục tiêu = *Nền tảng cơ bản*, Hình thức = *Nhóm online*.
   - Ngày học = thứ Bảy tới, Giờ học = 09:00.
   - Ghi chú = *"Bé thứ hai trong gia đình. Bé đầu đã học lớp Kèm riêng. Áp dụng ưu đãi anh chị em -15%."*
   - Bấm **"Giữ chỗ cho tôi"**.

5. **Lên màn hình thanh toán / Reach payment screen**
   - **Should happen:** banner xanh lá xuất hiện với mã `CHESS-XXXXXXXX`. Bên dưới hiện 3 thẻ thanh toán.
   - *Screenshot placeholder: payment cards.*

6. **Chọn QR VND / Pick the VND QR card**
   - Trong thẻ **"Chuyển khoản VND qua mã QR"**, kiểm tra:
     - Ngân hàng = **Vietcombank**
     - Chủ tài khoản = **DO VAN LONG**
     - Số tài khoản = **0071000985789**
     - Mã tham chiếu = **CHESS-XXXXXXXX** (giống mã trên banner)
     - Số tiền = **260.000 ₫** (đúng giá lớp Beginner)
   - Bank = Vietcombank, account holder = DO VAN LONG, account = 0071000985789, reference matches the banner code, amount = 260,000 VND.
   - **Flag if:** mã tham chiếu khác mã banner, hoặc số tiền sai.

7. **Quét QR bằng app ngân hàng / Scan the QR with your banking app**
   - Mở app ngân hàng Vietcombank/MB/Techcombank (hoặc bất kỳ app hỗ trợ VietQR).
   - Bấm chức năng **"Quét QR"** → đưa camera vào màn hình máy tính → quét mã QR.
   - **KHÔNG bấm xác nhận chuyển tiền** — đây chỉ là test.
   - Open your bank app → Scan QR → point camera at the QR on screen. **Do NOT confirm transfer** — this is only a UAT verification.
   - **Should happen:** app điền sẵn: Người nhận = DO VAN LONG, Số tiền = 260.000, Nội dung = CHESS-XXXXXXXX.
   - **Flag if:** app không nhận diện được QR, hoặc thông tin sai.

8. **Sao chép mã / Copy buttons**
   - Quay lại trình duyệt. Bấm nút **"Sao chép"** bên cạnh số tài khoản → dán vào ô ghi chú để kiểm tra.
   - Bấm **"Sao chép"** bên cạnh mã tham chiếu → cũng dán để kiểm tra.
   - **Should happen:** label đổi thành *"Đã sao chép"* trong ~1.8 giây.

9. **Đóng / Close**
   - Đóng tab. Persona C hoàn tất.

---

## Tester sign-off

| Persona | Tester name | Date | Pass / Fail | Notes |
|---|---|---|---|---|
| A — VI parent | | | | |
| B — EN expat Stripe | | | | |
| C — VI sibling QR | | | | |

If 2 of 3 personas pass with no critical flags, the launch is good for soft-launch traffic. Persona B failure (Stripe) blocks paid traffic. Persona C failure (QR) blocks Vietnam channel marketing.

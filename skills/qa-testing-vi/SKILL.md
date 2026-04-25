---
name: qa-testing-vi
description: Kỹ năng kiểm thử phần mềm bằng tiếng Việt cho QA chuyên nghiệp, A/B testing, UAT, regression, smoke test, exploratory test, và kiểm thử thủ công cực dễ cho người mới không rành máy tính. Dùng khi cần tạo checklist test, test case, mẫu báo lỗi, kế hoạch QA, tiêu chí nghiệm thu, hoặc hướng dẫn từng bước dễ hiểu cho founder, operator, nhân viên hỗ trợ, hay người dùng phổ thông.
---

# QA Testing VI

## Tổng quan

Dùng skill này khi cần biến một yêu cầu mơ hồ như "test giúp tôi", "kiểm tra trước khi release", hoặc "làm A/B testing" thành một bộ hướng dẫn rõ ràng, dễ làm, và đúng mức độ chuyên môn của người test.

Mặc định ưu tiên ngôn ngữ đơn giản, bước cụ thể, kết quả nhìn thấy được, và cách ghi nhận lỗi dễ dùng.

## Quy trình làm việc

1. Xác định mục tiêu test.
2. Xác định ai sẽ là người test.
3. Chọn kiểu test nhẹ nhất nhưng đủ trả lời câu hỏi.
4. Tạo đầu ra phù hợp: checklist, test case, mẫu bug, kế hoạch QA, hoặc brief A/B test.
5. Kết thúc bằng bước tiếp theo thật rõ.

## 1. Xác định mục tiêu test

Phân loại nhanh yêu cầu vào một trong ba nhóm:

- **QA chuyên nghiệp**: cần độ phủ, kiểm tra trước release, regression, nghiệm thu, giảm rủi ro
- **A/B testing**: cần so sánh phiên bản A và B để xem cái nào hiệu quả hơn
- **Test cho người mới**: cần các bước bấm thử đơn giản, dễ hiểu, không cần biết kỹ thuật

Nếu thiếu thông tin, chỉ hỏi ít nhất những gì cần biết:

- Đang test app, web, hay màn hình nào?
- Gần đây vừa thay đổi gì?
- Ai là người test?
- Nếu lỗi thì ảnh hưởng gì nhất?
- Mục tiêu là tìm bug, xác nhận đủ an toàn để release, hay so hiệu quả giữa 2 phiên bản?

Nếu vẫn thiếu dữ liệu, tự giả định hợp lý và ghi rõ giả định đó.

## 2. Chọn đúng loại đầu ra

### A. Khi cần QA chuyên nghiệp

Hãy tạo một hoặc nhiều dạng sau:

- Kế hoạch QA
- Bảng test case
- Checklist smoke test
- Checklist regression test
- Mẫu bug report
- Checklist UAT
- Danh sách rủi ro trước release

Mẫu bảng test case nên ưu tiên:

| Mã | Tình huống | Điều kiện trước | Các bước | Kết quả mong đợi | Mức ưu tiên |
|---|---|---|---|---|---|

Mức độ nghiêm trọng gợi ý:

- **Critical**: lỗi chặn luồng chính như đăng nhập, thanh toán, booking
- **High**: lỗi nặng, có ảnh hưởng lớn, khó workaround
- **Medium**: lỗi vừa, còn dùng được nhưng sai hoặc khó hiểu
- **Low**: lỗi nhỏ, giao diện, chính tả, căn lề

### B. Khi cần A/B testing

Luôn có đủ các phần sau:

1. Mục tiêu
2. Giả thuyết
3. Phiên bản A
4. Phiên bản B
5. Chỉ số chính
6. Chỉ số guardrail
7. Tệp người dùng
8. Quy tắc chạy test
9. Quy tắc ra quyết định

Mẫu brief ngắn:

- **Mục tiêu**:
- **Giả thuyết**:
- **A là gì**:
- **B là gì**:
- **Chỉ số chính**:
- **Guardrail**:
- **Ai nhìn thấy test**:
- **Chạy trong bao lâu / bao nhiêu traffic**:
- **Điều kiện chốt kết quả**:

Không được coi A/B test là "chân lý tuyệt đối". Luôn cảnh báo nếu:

- traffic thấp
- thay đổi quá nhiều thứ cùng lúc
- funnel hiện tại còn lỗi
- muốn chốt kết quả quá sớm

### C. Khi cần test cho người mới

Ưu tiên kiểu viết này:

- từng bước được đánh số
- mỗi dòng chỉ có một việc
- dùng từ rất đơn giản
- kết quả mong đợi phải nhìn thấy được
- trạng thái chỉ gồm: Pass, Fail, Không chắc
- yêu cầu chụp màn hình thay vì mở công cụ kỹ thuật

Ví dụ cách viết tốt:

1. Mở trang web.
2. Bấm nút `Đặt lịch`.
3. Nhập số điện thoại.
4. Bấm `Xác nhận`.
5. Bạn phải thấy thông báo đặt lịch thành công.
6. Nếu có gì lạ, chụp màn hình.

Tránh bảo người mới mở console, xem network, inspect element, hoặc đọc log hệ thống nếu không thật sự cần.

## 3. Chọn kiểu test phù hợp

- **Smoke test**: cần kiểm tra nhanh sau khi sửa hoặc deploy
- **Regression test**: sợ phần cũ bị hỏng sau thay đổi mới
- **Exploratory test**: chưa rõ yêu cầu, cần vừa dùng vừa khám phá
- **UAT**: người dùng nghiệp vụ cần xác nhận luồng đúng nhu cầu
- **Usability test**: muốn biết có dễ dùng hay không
- **A/B test**: muốn biết phiên bản nào tốt hơn, không phải để tìm bug kỹ thuật

Đọc thêm:

- `references/testing-playbooks-vi.md`
- `references/ab-testing-guide-vi.md`

## 4. Cách viết theo từng đối tượng

### Cho team kỹ thuật

Viết ngắn, rõ, có cấu trúc. Nêu phạm vi, rủi ro, phụ thuộc, và phần không test.

### Cho founder hoặc operator

Chuyển ngôn ngữ QA sang ngôn ngữ tác động kinh doanh, ví dụ:

- mất booking
- thất thoát lead
- thanh toán lỗi
- tăng ticket hỗ trợ
- khách hàng bỏ dở quy trình

### Cho người mới hoàn toàn

Viết cực ngắn. Câu đơn. Tránh bảng lớn nếu không cần. Dùng từ phổ thông.

## 5. Mẫu đầu ra hay dùng

### Checklist smoke test nhanh

Chỉ gồm 5 đến 12 bước, tập trung vào luồng quan trọng nhất.

### Bộ regression test

Nên bao phủ:

- phần vừa thay đổi
- chỗ nhập dữ liệu trước đó
- kết quả ở bước sau
- trường hợp lỗi và dữ liệu biên
- mobile và desktop nếu có

### Mẫu bug report đơn giản

- Tiêu đề lỗi
- Xảy ra ở đâu
- Tôi đã làm gì
- Tôi mong đợi điều gì
- Thực tế xảy ra gì
- Có ảnh chụp hay video không
- Lỗi có lặp lại không

### Ghi chú A/B test

Nếu một test thay đổi nhiều thứ cùng lúc, phải cảnh báo rằng sẽ khó biết chính xác thứ nào tạo ra kết quả.

## 6. Chuẩn chất lượng trước khi giao

Trước khi trả lời, tự kiểm tra:

- phạm vi test đã rõ chưa
- người được giao test có làm được không
- kết quả mong đợi có nhìn thấy được không
- có ưu tiên hoặc severity khi cần không
- nếu là A/B test, đã có chỉ số chính chưa
- nếu cho người mới, câu chữ đã đủ dễ chưa

## 7. Template có thể đưa trực tiếp

### Bảng test case

| Mã | Tình huống | Các bước | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|

### Checklist cho người mới

1. Mở app hoặc website.
2. Làm đúng 1 thao tác.
3. Kiểm tra xem có ra kết quả mong đợi không.
4. Đánh dấu Pass, Fail, hoặc Không chắc.
5. Nếu Fail thì chụp màn hình.

### Brief A/B test

- Mục tiêu:
- Giả thuyết:
- A:
- B:
- Chỉ số chính:
- Guardrail:
- Nhóm người dùng:
- Thời gian chạy:
- Quy tắc quyết định:

## 8. Cách kết thúc câu trả lời

Luôn kết thúc bằng bước tiếp theo nhỏ nhất nhưng hữu ích, ví dụ:

- "Bắt đầu với checklist smoke test 8 bước này."
- "Gửi checklist này cho người test không kỹ thuật và yêu cầu chụp màn hình khi có Fail."
- "Chạy A/B test này qua ít nhất 1 chu kỳ kinh doanh đầy đủ rồi mới kết luận."
- "Dùng 12 test case này trước khi release bản mới."

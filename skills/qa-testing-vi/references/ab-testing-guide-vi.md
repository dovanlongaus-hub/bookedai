# A/B Testing Guide VI

## Quy tắc cốt lõi

A/B testing để trả lời câu hỏi "phiên bản nào hiệu quả hơn", không phải để thay thế QA cơ bản. Hãy kiểm tra bug trước khi chạy A/B test.

## Thành phần bắt buộc

- giả thuyết
- chỉ số chính
- chỉ số guardrail
- tệp người dùng rõ ràng
- mô tả rõ A và B
- quy tắc chạy tối thiểu
- quy tắc quyết định

## Ví dụ chỉ số chính tốt

- tỷ lệ đăng ký
- tỷ lệ hoàn tất booking
- tỷ lệ hoàn tất thanh toán
- tỷ lệ bấm sang bước tiếp theo
- tỷ lệ hoàn thành tác vụ

## Ví dụ guardrail tốt

- tỷ lệ thoát
- tỷ lệ lỗi
- tỷ lệ hủy hoặc refund
- số lượng ticket hỗ trợ
- tốc độ tải hoặc tỷ lệ fail tải trang

## Sai lầm thường gặp

- dừng quá sớm
- đổi nhiều thứ cùng lúc
- sample quá nhỏ
- bỏ qua khác biệt theo nhóm người dùng
- kết luận từ dữ liệu nhiễu
- test trên một funnel đang lỗi

## Cách giải thích cho người mới

Hãy nói đơn giản như sau:

- A là phiên bản hiện tại.
- B là phiên bản mới.
- Người dùng sẽ thấy ngẫu nhiên một trong hai phiên bản.
- Ta so xem phiên bản nào giúp nhiều người hoàn thành mục tiêu hơn.
- Không được kết luận quá sớm.

## Quy tắc quyết định đơn giản

Khi đội chưa trưởng thành về analytics, có thể dùng cách này:

- chạy ít nhất qua một chu kỳ kinh doanh đầy đủ
- không chọn người thắng trước khi đạt mức chuyển đổi tối thiểu đã thống nhất
- dừng sớm chỉ khi một phiên bản rõ ràng bị lỗi hoặc gây hại

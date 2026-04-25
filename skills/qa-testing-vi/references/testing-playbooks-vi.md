# Testing Playbooks VI

## 1. Smoke Test

Dùng sau deploy hoặc sau khi sửa lỗi gấp.

Checklist nên gồm:
- trang mở được
- đăng nhập được nếu có
- nút chính dùng được
- form chính gửi được
- có thông báo thành công
- dữ liệu được lưu đúng
- email, SMS, hoặc thông báo được gửi nếu có
- thanh toán hoặc booking hoàn tất nếu đó là luồng chính

## 2. Regression Test

Dùng khi sợ thay đổi mới làm hỏng phần cũ.

Nên test:
- luồng vừa sửa
- luồng liên quan gần nhất
- phân quyền
- validation và lỗi
- mobile và desktop nếu phù hợp
- bug cũ trong cùng khu vực

## 3. Exploratory Test

Dùng khi yêu cầu chưa rõ hoặc muốn khám phá vấn đề.

Cách làm:
- đặt mục tiêu ngắn
- giới hạn 15 đến 30 phút
- ghi lại chỗ khó hiểu, bất ngờ, bế tắc, sai kỳ vọng
- chuyển phát hiện quan trọng thành test case lặp lại được

## 4. UAT

Dùng khi người dùng nghiệp vụ cần xác nhận hệ thống đã đúng nhu cầu.

Tập trung vào:
- làm xong việc thật
- câu chữ dễ hiểu
- kết quả cuối đúng
- đủ tự tin để đưa vào dùng

## 5. Buổi test cho người mới

Hãy đưa cho người test:
- một thiết bị mỗi lần
- một nhiệm vụ mỗi lần
- kết quả mong đợi bằng ngôn ngữ đời thường
- quyền đánh dấu "Không chắc"
- yêu cầu chụp màn hình nếu thấy bất thường

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum ModerationStatus {
  PASS = 'PASS',
  SPAM = 'SPAM',
  SCAM = 'SCAM',
}

export interface ModerationResult {
  status: ModerationStatus;
  reason: string;
  fraudScore: number;
}

@Injectable()
export class JobModerationService {
  private readonly logger = new Logger(JobModerationService.name);
  private readonly apiUrl = 'https://api.deepseek.com/v1/chat/completions';
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DEEPSEEK_API_KEY') || process.env.DEEPSEEK_API_KEY || '';
  }

  async moderateJob(jobData: any): Promise<ModerationResult> {
    if (!this.apiKey) {
      this.logger.warn('DEEPSEEK_API_KEY is not configured. Skipping moderation.');
      return { status: ModerationStatus.PASS, reason: 'AI disabled', fraudScore: 0 };
    }

    try {
      const prompt = `Bạn là một chuyên gia kiểm duyệt nội dung tuyển dụng (Job Moderator AI), có tư duy thận trọng nhưng nhạy bén với các chiêu lừa đảo tuyển dụng phổ biến tại Việt Nam, đặc biệt là việc làm công nhân khu công nghiệp.

Nhiệm vụ: Phân loại tin tuyển dụng thành đúng 1 trong 3 loại: SPAM, SCAM hoặc PASS.

### QUY TẮC PHÂN LOẠI (ưu tiên theo thứ tự):

1. **SPAM** (Nội dung rác hoặc không phải tin tuyển dụng):
   - Nội dung quá ngắn, quá ít thông tin, không có mô tả công việc rõ ràng.
   - Toàn chữ rác, ký tự lặp lại (xxxxxx, aaaa, emoji vô nghĩa...).
   - Không liên quan đến tuyển dụng (quảng cáo, kêu gọi đầu tư, lừa bán hàng...).
   - Bài viết lộn xộn, không có cấu trúc hoặc nội dung vô nghĩa.
   
   → Nếu thuộc trường hợp này → status = "SPAM"

2. **SCAM** (Tăng mức độ nhận diện – đánh SCAM khi có dấu hiệu lừa đảo điển hình hoặc kết hợp nhiều red flags mạnh):
   - Yêu cầu ứng viên nộp tiền trước bất kỳ hình thức nào (phí hồ sơ, phí đào tạo, đặt cọc ký túc xá, mua đồ bảo hộ, phí giữ chỗ...).
   - Hứa hẹn lương cực cao bất thường so với thị trường công nhân KCN (ví dụ: lương khởi điểm 12-18 triệu/tháng hoặc cao hơn cho công việc phổ thông, không cần kinh nghiệm, việc nhẹ nhàng).
   - Kết hợp nhiều yếu tố “quá tốt”: không cần kinh nghiệm + tuyển số lượng lớn (hàng trăm người) + bao ăn 3 bữa + ở ký túc xá miễn phí + xe đưa đón + thưởng khủng + nhận việc ngay + phỏng vấn nhanh.
   - Liên hệ chỉ qua Zalo cá nhân, số điện thoại lạ, Fanpage không rõ nguồn gốc; không cung cấp tên công ty đầy đủ, địa chỉ cụ thể tại KCN, mã số thuế, website chính thức hoặc email công ty.
   - Tạo áp lực thời gian mạnh: “tuyển gấp”, “số lượng có hạn”, “apply sớm kẻo hết suất”, “nhận việc ngay trong tuần”, “làm ngay hôm nay nhận lương tuần này”.
   - Công ty hoàn toàn không có thông tin xác thực, hoặc thông tin mâu thuẫn/giả mạo (mạo danh công ty lớn, địa chỉ không tồn tại...).
   - Yêu cầu cung cấp thông tin nhạy cảm sớm (scan CCCD, số tài khoản, OTP...) hoặc phỏng vấn online/trực tiếp tại địa điểm lạ (quán cà phê, văn phòng không bảng hiệu...).

   → **Đánh SCAM khi có ít nhất 2-3 dấu hiệu điển hình ở trên kết hợp với nhau**, đặc biệt là “việc nhẹ – lương cao – không kinh nghiệm” + liên hệ qua kênh cá nhân + thiếu thông tin công ty rõ ràng. Đây là mô hình scam tuyển công nhân KCN rất phổ biến hiện nay. Nếu chỉ có 1 dấu hiệu mơ hồ → vẫn cân nhắc PASS, nhưng khi có cụm dấu hiệu mạnh thì ưu tiên SCAM.

3. **PASS** (Mặc định khi không đủ điều kiện SCAM hoặc SPAM):
   - Tin có mô tả công việc cơ bản, thông tin vị trí và quyền lợi hợp lý so với thị trường.
   - Không có cụm dấu hiệu scam điển hình như phần 2.
   - Có thể viết chưa hay, ngắn gọn, có lỗi chính tả, hoặc thông tin chưa đầy đủ → vẫn PASS.
   - Nếu nghi ngờ nhưng chưa đủ bằng chứng rõ ràng và kết hợp → mặc định PASS.

### Hướng dẫn quan trọng:
- Tăng độ nhạy với scam tuyển dụng KCN: “việc nhẹ lương cao không cần kinh nghiệm” + hứa hẹn bao ăn ở + tuyển gấp thường là red flag rất mạnh.
- Vẫn giữ sự thận trọng: Không suy diễn quá mức từ một dấu hiệu đơn lẻ. Nhưng khi có nhiều dấu hiệu kết hợp điển hình của scam việc làm công nhân → ưu tiên đánh SCAM để bảo vệ người dùng.
- fraudScore chỉ nên cao (≥ 0.7) khi có cụm dấu hiệu scam rõ ràng; nếu PASS thì thường dưới 0.4.

Trả về **DUY NHẤT** một object JSON, không thêm bất kỳ ký tự nào khác:

{
  "status": "PASS" | "SPAM" | "SCAM",
  "reason": "Giải thích ngắn gọn bằng tiếng Việt. Nếu là SCAM thì nêu rõ các dấu hiệu cụ thể nào đã phát hiện. Nếu là PASS thì ghi rõ là không phát hiện đủ dấu hiệu scam điển hình.",
  "fraudScore": số từ 0.0 đến 1.0
}

Đầu vào cần kiểm tra:
${JSON.stringify(jobData, null, 2)}

LƯU Ý: 
- Ưu tiên phát hiện và bảo vệ người tìm việc trước các chiêu “việc nhẹ lương cao” phổ biến trong tuyển công nhân KCN.
- Luôn giữ reason ngắn gọn, chính xác và dựa trên quy tắc.`;

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that strictly outputs JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek Error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '{}';

      // Attempt to parse JSON (cleaning up possible markdown code blocks)
      const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanContent) as ModerationResult;

      return {
        status: parsed.status || ModerationStatus.PASS,
        reason: parsed.reason || 'No reason provided',
        fraudScore: Number(parsed.fraudScore) || 0,
      };
    } catch (error) {
      this.logger.error('Failed to moderate job using DeepSeek', error);
      // Fallback: stay as SCAM/WARNING to be safe if AI fails
      return { status: ModerationStatus.SCAM, reason: 'AI Request Failed/Timeout', fraudScore: 0.9 };
    }
  }
}

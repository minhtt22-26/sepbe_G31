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

  async moderateJob(title: string, description: string): Promise<ModerationResult> {
    if (!this.apiKey) {
      this.logger.warn('DEEPSEEK_API_KEY is not configured. Skipping moderation.');
      return { status: ModerationStatus.PASS, reason: 'AI disabled', fraudScore: 0 };
    }

    try {
      const prompt = `Bạn là một chuyên gia kiểm duyệt nội dung tuyển dụng (Job Moderator AI).
Nhiệm vụ của bạn là kiểm tra xem tin tuyển dụng này có bị SPAM hoặc SCAM (lừa đảo/đáng ngờ) hay không.

QUY TẮC ĐÁNH GIÁ (CỰC KỲ KHẮT KHE):
1. SPAM: 
   - Nội dung vô nghĩa, hoặc chứa các chuỗi ký tự lặp đi lặp lại (VD: xxxxxxxxxx, abcabcabc).
   - Nội dung quá ngắn, sơ sài (VD: chỉ có vài từ), không có thông tin tuyển dụng thực tế.
   - Quảng cáo bán hàng, giới thiệu sản phẩm thay vì tuyển dụng.
2. SCAM: 
   - "Việc nhẹ lương cao" (VD: Lương 50-100tr mà không yêu cầu bằng cấp/kinh nghiệm).
   - Yêu cầu ứng viên nộp phí, mua vật tư, làm nhiệm vụ online kiếm tiền.
   - Nội dung hứa hẹn thu nhập không thực tế cho các công việc không có tên tuổi công ty rõ ràng.
3. PASS: Tin hợp lệ, chuyên nghiệp.

Trả về kết quả dưới định dạng JSON TỒN TẠI DUY NHẤT 3 field:
{
  "status": "PASS" | "SPAM" | "SCAM",
  "reason": "Giải thích vắn tắt vì sao bị từ chối bằng tiếng Việt",
  "fraudScore": Từ 0.0 đến 1.0 (0.0 là hoàn toàn an toàn, 1.0 là rác/lừa đảo)
}

Đầu vào kiểm tra:
Tiêu đề: ${title}
Mô tả: ${description}

LƯU Ý: CHỈ TRẢ VỀ JSON. NẾU NỘI DUNG LÀ RÁC (VD: xxxxxxx), PHẢI CHỌN STATUS LÀ SPAM.`;

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

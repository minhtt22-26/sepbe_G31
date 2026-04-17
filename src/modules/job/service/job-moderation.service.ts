import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum ModerationStatus {
  PASS = 'PASS',
  SPAM = 'SPAM',
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
      const prompt = `Bạn là một chuyên gia kiểm duyệt nội dung tuyển dụng (Job Moderator AI). Nhiệm vụ DUY NHẤT là phát hiện nội dung SPAM (rác / không phải tin tuyển dụng thật sự).

KHÔNG phân loại SCAM. KHÔNG đánh giá dấu hiệu lừa đảo. Chỉ xét nội dung có phải là tin tuyển dụng có nghĩa hay không.

### QUY TẮC PHÂN LOẠI (chỉ 2 loại):

1. **SPAM** (Nội dung rác hoặc không phải tin tuyển dụng):
   - Nội dung quá ngắn, quá ít thông tin, không có mô tả công việc rõ ràng.
   - Toàn chữ rác, ký tự lặp lại (xxxxxx, aaaa, emoji vô nghĩa, "test test test"...).
   - Không liên quan đến tuyển dụng (quảng cáo bán hàng, kêu gọi đầu tư, giới thiệu website...).
   - Bài viết lộn xộn, không có cấu trúc, nội dung vô nghĩa hoặc chỉ copy-paste văn bản không liên quan.

   → Nếu thuộc trường hợp này → status = "SPAM"

2. **PASS** (Mặc định):
   - Là một tin tuyển dụng có nội dung cơ bản (vị trí, mô tả công việc, hoặc yêu cầu / quyền lợi).
   - Có thể viết chưa hay, ngắn gọn, có lỗi chính tả, thông tin chưa đầy đủ → vẫn PASS.
   - KHÔNG xét các dấu hiệu scam/lừa đảo (lương cao bất thường, yêu cầu nộp tiền, liên hệ qua Zalo…). Dù có các dấu hiệu này, nếu nội dung là tin tuyển dụng thật sự → vẫn PASS.

Trả về **DUY NHẤT** một object JSON, không thêm bất kỳ ký tự nào khác:

{
  "status": "PASS" | "SPAM",
  "reason": "Giải thích ngắn gọn bằng tiếng Việt vì sao SPAM hoặc PASS.",
  "fraudScore": số từ 0.0 đến 1.0 (chỉ dùng để biểu thị mức độ 'rác' của bài viết, PASS thường dưới 0.4)
}

Đầu vào cần kiểm tra:
${JSON.stringify(jobData, null, 2)}

LƯU Ý:
- Chỉ đánh SPAM khi nội dung rõ ràng là rác / không phải tin tuyển dụng.
- Mọi trường hợp còn lại → PASS.`;

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

      const status =
        parsed.status === ModerationStatus.SPAM
          ? ModerationStatus.SPAM
          : ModerationStatus.PASS;

      return {
        status,
        reason: parsed.reason || 'No reason provided',
        fraudScore: Number(parsed.fraudScore) || 0,
      };
    } catch (error) {
      this.logger.error('Failed to moderate job using DeepSeek', error);
      // Fallback: PASS to avoid blocking users when AI fails
      return { status: ModerationStatus.PASS, reason: 'AI Request Failed/Timeout', fraudScore: 0 };
    }
  }
}

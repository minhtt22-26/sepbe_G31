import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import embeddingConfig from 'src/config/embedding.config'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { IJobSections } from '../interfaces/embedding.interface'

@Injectable()
export class EmbeddingService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingService.name)
  private genAI: GoogleGenerativeAI

  constructor(
    @Inject(embeddingConfig.KEY)
    private readonly config: ConfigType<typeof embeddingConfig>,
  ) {}

  async onModuleInit() {
    this.genAI = new GoogleGenerativeAI(this.config.apiKey)
    await this.validateConnection()
  }

  private async validateConnection() {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.config.embeddingModel,
      })

      await model.embedContent('ping')

      this.logger.log('Gemini embedding connected successfully')
    } catch (error) {
      this.logger.error('Gemini embedding connection failed', error)
      throw error
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    this.logger.log(
      `Generating embedding with model: ${this.config.embeddingModel}`,
    )
    const model = this.genAI.getGenerativeModel({
      model: this.config.embeddingModel,
    })

    const result = await model.embedContent(text)
    this.logger.log(`Embedding dimension: ${result.embedding.values.length}`)
    return result.embedding.values
  }

  // async extractJobSections(description: string): Promise<IJobSections> {
  //   const model = this.genAI.getGenerativeModel({
  //     model: this.config.llmModel,
  //     generationConfig: {
  //       temperature: this.config.llmTemperature,
  //       responseMimeType: 'application/json', //Trả về json
  //     },
  //   })

  //   const prompt = `Bạn là một hệ thống tiền xử lý dữ liệu tuyển dụng.\n\n' +
  //     'Nhiệm vụ của bạn là trích xuất thông tin từ Mô tả công việc (JD) để phục vụ cho hệ thống AI Vector Semantic Search.\n\n' +
  //     'Quy tắc BẮT BUỘC:\n' +
  //     '1. CHỈ giữ lại các từ khóa về kỹ năng chuyên môn, công nghệ, công cụ, thái độ làm việc và văn hóa môi trường.\n' +
  //     '2. TUYỆT ĐỐI LOẠI BỎ các thông tin định lượng (vì hệ thống đã có bộ lọc cứng SQL cho các thông tin này). Các thông tin phải xóa bao gồm:\n' +
  //     '- Mức lương cụ thể bằng số.\n' +
  //     '- Số năm kinh nghiệm bằng số.\n' +
  //     '- Thời gian, ca kíp làm việc.\n' +
  //     '- Địa điểm làm việc.\n' +
  //     "3. Trả về định dạng JSON gồm 2 key: 'requirements' (toàn bộ nội dung về yêu cầu ứng viên, kinh nghiệm, kỹ năng) \n' +
  //      và 'benefits' (toàn bộ nội dung về quyền lợi, chế độ đãi ngộ, môi trường làm việc). Giá trị của mỗi key là \n' +
  //       một đoạn văn bản (String) liền mạch, KHÔNG dùng mảng (Array).\n\n" +
  //     'Nội dung JD: [${description.trim()}]`

  //   const result = await model.generateContent(prompt)
  //   const text = result.response.text()

  //   try {
  //     return JSON.parse(text) as IJobSections
  //   } catch (error) {
  //     this.logger.error('Failed to parse Gemini response', error)
  //     throw new Error('Gemini trả về response không hợp lệ')
  //   }
  // }

  async extractJobSections(description: string): Promise<IJobSections> {
    const model = this.genAI.getGenerativeModel({
      model: this.config.llmModel,
      generationConfig: {
        temperature: this.config.llmTemperature,
        responseMimeType: 'application/json',
      },
    })

    //     const prompt = `Bạn là một hệ thống tiền xử lý dữ liệu tuyển dụng.

    // Nhiệm vụ của bạn là trích xuất thông tin từ Mô tả công việc (JD) để phục vụ cho hệ thống AI Vector Semantic Search.

    // Quy tắc BẮT BUỘC:
    // 1. CHỈ giữ lại các từ khóa về kỹ năng chuyên môn, công nghệ, công cụ, thái độ làm việc và văn hóa môi trường.
    // 2. TUYỆT ĐỐI LOẠI BỎ các thông tin định lượng (vì hệ thống đã có bộ lọc cứng SQL cho các thông tin này). Các thông tin phải xóa bao gồm:
    //    - Mức lương cụ thể bằng số.
    //    - Số năm kinh nghiệm bằng số.
    //    - Thời gian, ca kíp làm việc.
    //    - Địa điểm làm việc.
    // 3. Trả về JSON gồm 2 key:
    //    - "requirements": toàn bộ nội dung về yêu cầu ứng viên, kinh nghiệm, kỹ năng.
    //    - "benefits": toàn bộ nội dung về quyền lợi, chế độ đãi ngộ, môi trường làm việc.
    //    Giá trị của mỗi key là một đoạn văn bản (String) liền mạch, KHÔNG dùng mảng (Array).

    // Nội dung JD: [${description.trim()}]`

    // const prompt = `Bạn là một hệ thống tiền xử lý dữ liệu tuyển dụng.
    //
    // Nhiệm vụ của bạn là trích xuất thông tin từ Mô tả công việc (JD) để phục vụ cho hệ thống AI Vector Semantic Search.
    //
    // Quy tắc BẮT BUỘC:
    // 1. TUYỆT ĐỐI LOẠI BỎ các thông tin định lượng (hệ thống đã có bộ lọc SQL riêng). Bao gồm:
    //   - Mức lương, phụ cấp cụ thể bằng số.
    //   - Số năm kinh nghiệm bằng số.
    //   - Thời gian, ca kíp làm việc.
    //   - Địa điểm làm việc.
    //
    // 2. Trả về JSON gồm 2 key:
    //   - "requirements": bao gồm TẤT CẢ các nội dung sau:
    //       + Nhiệm vụ và công việc cụ thể phải thực hiện.
    //       + Kỹ năng, công nghệ, công cụ, máy móc cần có.
    //       + Yêu cầu về bằng cấp, thái độ, đặc điểm cá nhân.
    //   - "benefits": bao gồm TẤT CẢ các nội dung sau:
    //       + Quyền lợi tài chính (thưởng, phụ cấp, bảo hiểm).
    //       + Phúc lợi phi tài chính (cơm, ký túc xá, du lịch).
    //       + Môi trường và điều kiện làm việc.
    //       + Cơ hội phát triển nghề nghiệp.
    //
    // 3. Giá trị của mỗi key là một đoạn văn bản (String) liền mạch, KHÔNG dùng mảng (Array).
    //
    // Nội dung JD: [${description.trim()}]`

    const prompt = `Bạn là một chuyên gia phân tích dữ liệu tuyển dụng (HR Data Analyst).
    Nhiệm vụ của bạn là chuẩn hóa nội dung Mô tả công việc (JD) thành dữ liệu chất lượng cao cho hệ thống AI Vector Search (Semantic Search).

    ### QUY TẮC XỬ LÝ:
    1. **Lọc nội dung**: 
        - GIỮ LẠI: Kỹ năng chuyên môn, kỹ năng mềm, công cụ, máy móc, trách nhiệm công việc, phẩm chất cá nhân, các loại phúc lợi, môi trường làm việc.
        - ĐẶC BIỆT: Giữ lại yêu cầu về bậc thâm niên hoặc số năm kinh nghiệm dưới dạng mô tả (ví dụ: "có kinh nghiệm", "trên 3 năm", "mới tốt nghiệp") để có thể so khớp với thâm niên của người lao động.
        - LOẠI BỎ: Mức lương cụ thể bằng số (ví dụ: "10-15tr"), thời gian ca kíp, địa điểm làm việc, các câu chào hỏi xã giao, thông tin liên hệ, hướng dẫn nộp hồ sơ.
    2. **Chuẩn hóa (Normalization)**: 
        - Viết lại các ý thành câu văn hoàn chỉnh, súc tích và giàu ngữ nghĩa. 
        - Sử dụng các thuật ngữ chuyên môn chuẩn xác. Ví dụ: thay vì "biết dùng máy tính", hãy dùng "Sử dụng thành thạo các phần mềm văn phòng và công cụ làm việc trên máy tính".
    3. **Định dạng đầu ra**: Trả về duy nhất một đối tượng JSON với 2 khóa:
        - "requirements": Tóm tắt các yêu cầu về kỹ năng, thâm niên, kinh nghiệm, trình độ học vấn và trách nhiệm công việc.
        - "benefits": Tóm tắt các chế độ đãi ngộ, phúc lợi, môi trường và cơ hội phát triển.

    ### GIỚI HẠN:
    - Mỗi giá trị phải là một CHUỖI VĂN BẢN (String) duy nhất, không dùng mảng.
    - Không thêm bất kỳ văn bản giải thích nào ngoài JSON.

    Nội dung JD: [${description.trim()}]`

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    try {
      return JSON.parse(text) as IJobSections
    } catch (error) {
      this.logger.error('Failed to parse Gemini response', {
        error,
        rawText: text,
      })
      throw new Error('Gemini trả về response không hợp lệ')
    }
  }
}

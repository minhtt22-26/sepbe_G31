import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { GoogleGenerativeAI } from '@google/generative-ai'
import * as dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DATABASE_URL
const apiKey = process.env.GEMINI_API_KEY
const embeddingModel = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004'
const llmModel = process.env.GEMINI_LLM_MODEL || 'gemini-1.5-flash'
const llmTemp = Number(process.env.GEMINI_LLM_TEMPERATURE) || 0

if (!apiKey) {
  console.error('❌ Thiếu GEMINI_API_KEY trong file .env')
  process.exit(1)
}

const adapter = new PrismaPg({ connectionString: connectionString! })
const prisma = new PrismaClient({ adapter })
const genAI = new GoogleGenerativeAI(apiKey)

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))

// Logic trích xuất phần JD (Đồng bộ hoàn toàn với EmbeddingService)
async function extractJobSections(description: string) {
  const model = genAI.getGenerativeModel({
    model: llmModel,
    generationConfig: {
      temperature: llmTemp,
      responseMimeType: 'application/json',
    },
  })

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
  return JSON.parse(result.response.text())
}

// Logic tạo Vector (Sử dụng model từ config)
async function getEmbedding(text: string) {
  if (!text || text.trim() === '') return null
  const model = genAI.getGenerativeModel({ model: embeddingModel })
  const result = await model.embedContent(text)
  return result.embedding.values
}

// Cập nhật Database (SQL Raw cho pgvector)
async function updateWorkerVector(userId: number, skillVec: number[], cultureVec: number[] | null) {
  const skillStr = `[${skillVec.join(',')}]`
  const cultureStr = cultureVec ? `[${cultureVec.join(',')}]` : null

  await prisma.$executeRawUnsafe(
    `UPDATE "WorkerProfile" SET "skillEmbedding" = $1::vector, "cultureEmbedding" = CASE WHEN $2::text IS NULL THEN NULL ELSE $2::text::vector END, "embeddingUpdatedAt" = NOW() WHERE "userId" = $3`,
    skillStr,
    cultureStr,
    userId
  )
}

async function updateJobVector(jobId: number, reqVec: number[], benefitVec: number[] | null) {
  const reqStr = `[${reqVec.join(',')}]`
  const benefitStr = benefitVec ? `[${benefitVec.join(',')}]` : null

  await prisma.$executeRawUnsafe(
    `UPDATE "Job" SET "reqEmbedding" = $1::vector, "benefitEmbedding" = CASE WHEN $2::text IS NULL THEN NULL ELSE $2::text::vector END, "embeddingUpdatedAt" = NOW() WHERE id = $3`,
    reqStr,
    benefitStr,
    jobId
  )
}

async function run() {
  console.log('🚀 Bắt đầu quá trình tạo Embedding (Safe Mode cho API Free)...')

  // 1. CHỈNH SỬA WORKER PROFILES
  const workers = await prisma.workerProfile.findMany({
    where: { embeddingUpdatedAt: null },
    include: { user: true, occupation: true },
    orderBy: { user: { userName: 'asc' } } // Ưu tiên tài khoản test (minh, loc...)
  })

  console.log(`👷 Tìm thấy ${workers.length} worker cần xử lý.`)
  for (const wp of workers) {
    try {
      console.log(`  -> Đang xử lý Worker: ${wp.user.userName || wp.user.fullName}...`)
      
      const skillText = `${wp.occupation?.name} | ${wp.experienceYear} năm kinh nghiệm | ${wp.bio}`
      const cultureText = wp.desiredJobText

      const [sVec, cVec] = await Promise.all([
        getEmbedding(skillText),
        cultureText ? getEmbedding(cultureText) : Promise.resolve(null)
      ])

      if (sVec) {
        await updateWorkerVector(wp.userId, sVec, cVec)
        console.log(`     ✅ Xong!`)
      }

      await sleep(4000) // Nghỉ 4s để tránh Rate Limit (15 RPM)
    } catch (err: any) {
      console.error(`     ❌ Lỗi: ${err.message}`)
      if (err.message.includes('429')) {
        console.log('🛑 Hết hạn ngạch API. Đang tạm dừng 30s...')
        await sleep(30000)
      }
    }
  }

  // 2. CHỈNH SỬA JOBS
  const jobs = await prisma.job.findMany({
    where: { embeddingUpdatedAt: null },
    include: { occupation: true }
  })

  console.log(`🏭 Tìm thấy ${jobs.length} job cần xử lý.`)
  for (const job of jobs) {
    try {
      console.log(`  -> Đang xử lý Job: ${job.title}...`)
      
      // Phải qua bước trích xuất nội dung bằng LLM trước
      const sections = await extractJobSections(job.description)
      const reqText = `${job.occupation?.name} | ${sections.requirements}`
      const benefitText = sections.benefits

      const [rVec, bVec] = await Promise.all([
        getEmbedding(reqText),
        benefitText ? getEmbedding(benefitText) : Promise.resolve(null)
      ])

      if (rVec) {
        await updateJobVector(job.id, rVec, bVec)
        console.log(`     ✅ Xong!`)
      }

      await sleep(4000)
    } catch (err: any) {
      console.error(`     ❌ Lỗi: ${err.message}`)
      if (err.message.includes('429')) {
        console.log('🛑 Hết hạn ngạch API. Đang tạm dừng 30s...')
        await sleep(30000)
      }
    }
  }

  console.log('🎉 Hoàn tất quá trình tạo Embedding!')
  process.exit(0)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})

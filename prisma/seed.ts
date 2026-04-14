import {
  PrismaClient,
  EnumUserRole,
  EnumUserStatus,
  EnumUserGender,
  EnumShift,
  CompanyStatus,
  JobStatus,
  JobApplicationStatus,
  ReviewStatus,
  ReportReason,
  ReportStatus,
  MatchingWeightKey,
} from '../src/generated/prisma/client'

import { PrismaPg } from '@prisma/adapter-pg'
import { fakerVI as faker } from '@faker-js/faker'
import * as bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// ================================================
// 34 TỈNH THÀNH VIỆT NAM
// ================================================

const VIETNAM_PROVINCES = [
  'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ',
  'Bình Dương', 'Đồng Nai', 'Bắc Ninh', 'Bắc Giang', 'Thái Nguyên',
  'Vĩnh Phúc', 'Hải Dương', 'Hưng Yên', 'Long An', 'Tây Ninh',
  'Bà Rịa - Vũng Tàu', 'Quảng Ninh', 'Thanh Hóa', 'Nghệ An', 'Quảng Nam',
  'Bình Định', 'Khánh Hòa', 'Lâm Đồng', 'Bình Phước', 'Tiền Giang',
  'Đồng Tháp', 'An Giang', 'Phú Thọ', 'Nam Định', 'Ninh Bình',
  'Hà Nam', 'Thái Bình', 'Quảng Ngãi', 'Bình Thuận',
]

const WARD_NAMES = [
  'Xã Kim Chung', 'Phường Đông Anh', 'Xã Nam Sơn', 'Phường Tiên Du',
  'Xã Đại Đồng', 'Phường Yên Phong', 'Xã Quế Võ', 'Xã Song Khê',
  'Phường Đình Bảng', 'Xã Từ Sơn', 'Xã Việt Yên', 'Phường Bích Động',
  'Phường Hòa Khánh', 'Xã Hòa Vang', 'Phường Liên Chiểu',
  'Xã Điện Ngọc', 'Phường Núi Thành', 'Xã Tam Hiệp',
  'Xã Phú Mỹ', 'Phường Thuận Giao', 'Xã Bình Chuẩn',
  'Phường Dĩ An', 'Xã Tân Đông Hiệp', 'Phường An Phú',
  'Xã Long Bình', 'Phường Tam Phước', 'Xã Phước Tân',
  'Xã An Điền', 'Phường Mỹ Phước', 'Xã Tân Uyên',
  'Xã Long Thành', 'Phường Nhơn Trạch', 'Xã Phú Hội',
  'Xã Tân Hiệp', 'Phường Đức Hòa', 'Xã Bến Lức',
]

const KCN_NAMES = [
  'KCN VSIP', 'KCN VSIP II-A', 'KCN Amata', 'KCN Biên Hòa II',
  'KCN Sóng Thần I', 'KCN Sóng Thần II', 'KCN Mỹ Phước I',
  'KCN Mỹ Phước III', 'KCN Đại Đồng – Hoàn Sơn', 'KCN Quế Võ',
  'KCN Yên Phong', 'KCN Thăng Long', 'KCN Bắc Thăng Long',
  'KCN Nội Bài', 'KCN Hòa Khánh', 'KCN Liên Chiểu',
  'KCN Long Hậu', 'KCN Tân Tạo', 'KCN Hiệp Phước',
  'KCN Nhơn Trạch I', 'KCN Long Thành', 'KCN Giang Điền',
  'KCN Đồng Văn', 'KCN Phố Nối A', 'KCN Tân Trường',
  'KCN Bỉm Sơn', 'KCN Chu Lai', 'KCN Phú Mỹ III',
]

const LOGO_URL = 'https://github.com/shadcn.png'

// ================================================
// 30 CÔNG TY
// ================================================

const COMPANY_NAMES = [
  'Công ty TNHH Samsung Electronics Việt Nam',
  'Công ty TNHH Canon Việt Nam',
  'Công ty TNHH Foxconn Việt Nam',
  'Công ty TNHH Luxshare-ICT Việt Nam',
  'Công ty TNHH JA Solar Việt Nam',
  'Công ty TNHH Hana Micron Việt Nam',
  'Công ty TNHH LG Electronics Việt Nam',
  'Công ty TNHH Pegatron Việt Nam',
  'Công ty TNHH Kyocera Việt Nam',
  'Công ty TNHH Panasonic Việt Nam',
  'Công ty TNHH Sumitomo Electric Việt Nam',
  'Công ty TNHH Yamaha Motor Parts Việt Nam',
  'Công ty TNHH Foster Electric Việt Nam',
  'Công ty TNHH Goertek Vina',
  'Công ty TNHH Yazaki EDS Việt Nam',
  'Công ty TNHH Bosch Việt Nam',
  'Công ty TNHH Intel Products Việt Nam',
  'Công ty TNHH Nidec Việt Nam',
  'Công ty TNHH Juki Việt Nam',
  'Công ty TNHH Nestlé Việt Nam',
  'Công ty CP Thép Hòa Phát',
  'Công ty TNHH Kumho Tire Việt Nam',
  'Công ty TNHH Hyosung Việt Nam',
  'Công ty CP Dệt May Thành Công',
  'Công ty TNHH Mabuchi Motor Việt Nam',
  'Công ty TNHH Wonderful Saigon Electrics',
  'Công ty TNHH Brotex Việt Nam',
  'Công ty TNHH Groz-Beckert Việt Nam',
  'Công ty CP Nhựa Bình Minh',
  'Công ty TNHH Acecook Việt Nam',
]

// ================================================
// 10 NGÀNH NGHỀ & VỊ TRÍ
// ================================================

const SECTORS_DATA = [
  {
    name: 'Điện tử – Linh kiện',
    occupations: [
      'Công nhân lắp ráp linh kiện điện tử', 'Công nhân vận hành máy SMT',
      'Nhân viên QC điện tử', 'Kỹ thuật viên sửa chữa bo mạch',
      'Công nhân đóng gói sản phẩm điện tử', 'Nhân viên test sản phẩm',
    ],
    taskPool: [
      'Lắp ráp các linh kiện điện tử siêu nhỏ vào bo mạch theo bản vẽ WI.',
      'Sử dụng kính hiển vi để kiểm tra các mối hàn và chân chip.',
      'Vận hành máy gắp chip tự động (SMT) và xử lý lỗi dừng máy đơn giản.',
      'Làm việc trong môi trường phòng sạch (Cleanroom), tuân thủ quy định chống tĩnh điện (ESD).',
      'Kiểm thử bo mạch bằng máy ICT hoặc FCT để đảm bảo chức năng.',
      'Dán tem nhãn và đóng gói sản phẩm vào khay nhựa/thùng carton theo tiêu chuẩn.',
    ],
    reqPool: [
      'Mắt tốt, không cận nặng, nhanh tay nhanh mắt.',
      'Có khả năng tập trung cao độ khi làm việc với linh kiện nhỏ.',
      'Chấp nhận mặc quần áo phòng sạch toàn thân suốt ca làm việc.',
      'Không dị ứng với các hóa chất tẩy rửa hoặc mùi thiếc hàn.',
    ],
  },
  {
    name: 'Dệt may – Giày da',
    occupations: [
      'Công nhân may công nghiệp', 'Thợ cắt vải công nghiệp',
      'Chuyền trưởng may', 'Công nhân kiểm hóa thành phẩm',
      'Thợ ủi hoàn thiện', 'Công nhân đế giày', 'Thợ gò giày',
    ],
    taskPool: [
      'Vận hành máy may 1 kim, 2 kim hoặc máy vắt sổ công nghiệp.',
      'Thực hiện các công đoạn may cổ, túi, sườn theo yêu cầu của chuyền trưởng.',
      'Dùng máy cắt vải đứng hoặc máy cắt tự động để cắt theo sơ đồ.',
      'Kiểm tra lỗi đường may, mũi chỉ (KCS) trên thành phẩm trước khi xuất xưởng.',
      'Ủi phẳng và gấp sản phẩm vào túi nilon theo quy cách.',
      'Vận hành máy gò đế, bôi keo và ép đế giày.',
    ],
    reqPool: [
      'Biết sử dụng máy may công nghiệp cơ bản.',
      'Chịu được tiếng ồn của máy móc trong xưởng may.',
      'Có sự khéo léo và tỉ mỉ trong từng đường kim mũi chỉ.',
      'Có thể ngồi làm việc liên tục trong thời gian dài.',
    ],
  },
  {
    name: 'Cơ khí – Chế tạo',
    occupations: [
      'Công nhân đứng máy CNC', 'Thợ hàn MIG/MAG/TIG',
      'Thợ tiện cơ khí', 'Thợ phay cơ khí',
      'Kỹ thuật viên bảo trì cơ khí', 'Công nhân mài – đánh bóng',
      'Kỹ thuật viên điện công nghiệp',
    ],
    taskPool: [
      'Gá phôi và vận hành máy phay/tiện CNC theo chương trình đã lập sẵn.',
      'Thực hiện các mối hàn khung sắt, inox bằng máy hàn Mig hoặc Tig.',
      'Sử dụng thước kẹp, panme để kiểm tra kích thước chi tiết sau khi gia công.',
      'Bảo trì, tra dầu mỡ định kỳ cho hệ thống máy móc sản xuất.',
      'Mài ba via và đánh bóng bề mặt sản phẩm kim loại.',
      'Lắp đặt và sửa chữa hệ thống tủ điện điều khiển trong nhà máy.',
    ],
    reqPool: [
      'Có bằng nghề hoặc am hiểu cơ bản về bản vẽ kỹ thuật.',
      'Sức khỏe tốt, chịu được môi trường làm việc có nhiệt độ cao và khói hàn.',
      'Ưu tiên ứng viên biết sử dụng các dụng cụ đo lường cơ khí.',
      'Cẩn thận, tuân thủ nghiêm ngặt quy định an toàn cháy nổ.',
    ],
  },
  {
    name: 'Chế biến thực phẩm – Đồ uống',
    occupations: [
      'Công nhân chế biến thực phẩm', 'Nhân viên QC thực phẩm',
      'Công nhân đóng gói thực phẩm', 'Nhân viên vận hành dây chuyền',
      'Công nhân kho lạnh', 'Nhân viên vệ sinh công nghiệp',
    ],
    taskPool: [
      'Thực hiện sơ chế, cắt thái và tẩm ướp nguyên liệu thực phẩm.',
      'Vận hành hệ thống hầm sấy, chiên rán hoặc đóng hộp tự động.',
      'Làm việc trong khu vực chế biến thủy hải sản/thực phẩm đông lạnh.',
      'Kiểm tra cảm quan và lấy mẫu xét nghiệm vi sinh thực phẩm định kỳ.',
      'Sắp xếp hàng hóa vào kho lạnh và theo dõi nhiệt độ bảo quản.',
      'Thực hiện vệ sinh, khử trùng máy móc và xưởng sản xuất cuối mỗi ca.',
    ],
    reqPool: [
      'Có giấy khám sức khỏe đạt tiêu chuẩn làm việc trong ngành thực phẩm.',
      'Tính tình sạch sẽ, ngăn nắp, tuân thủ Nội quy vệ sinh an toàn thực phẩm.',
      'Chịu được môi trường làm việc lạnh hoặc ẩm ướt (tùy bộ phận).',
      'Không mắc các bệnh về da hoặc bệnh truyền nhiễm.',
    ],
  },
  {
    name: 'Logistics – Kho vận',
    occupations: [
      'Nhân viên kho', 'Lái xe nâng', 'Nhân viên kiểm kho',
      'Nhân viên điều phối kho', 'Nhân viên giao nhận hàng hóa',
      'Nhân viên bốc xếp',
    ],
    taskPool: [
      'Xếp dỡ hàng hóa từ container và sắp xếp vào vị trí trong kho.',
      'Vận hành xe nâng điện hoặc xe nâng dầu để di chuyển pallet hàng.',
      'Quét mã vạch (barcode) để nhập/xuất kho trên hệ thống máy tính.',
      'Soạn hàng (picking) theo đơn đặt hàng của khách hàng.',
      'Kiểm kê số lượng hàng tồn thực tế và đối chiếu với sổ sách.',
      'Đóng màng co (palleting) và dán nhãn địa chỉ giao hàng.',
    ],
    reqPool: [
      'Ưu tiên ứng viên có chứng chỉ vận hành xe nâng.',
      'Biết sử dụng máy tính cơ bản là một lợi thế.',
      'Sức khỏe tốt, có thể bê vác hàng hóa (nếu cần).',
      'Tính cách cẩn thận, không để xảy ra sai sót khi đếm hàng.',
    ],
  },
  {
    name: 'Nhựa – Cao su – Bao bì',
    occupations: [
      'Công nhân vận hành máy ép nhựa', 'Công nhân thổi màng nhựa',
      'Công nhân in ống đồng', 'Nhân viên QC nhựa – bao bì',
      'Công nhân pha chế cao su', 'Công nhân đùn ống nhựa',
    ],
    taskPool: [
      'Lấy sản phẩm nhựa từ khuôn máy ép và cắt bỏ phần nhựa thừa (ba via).',
      'Điều chỉnh các thông số áp suất, nhiệt độ trên máy thổi màng nilon.',
      'Pha trộn hạt nhựa màu với nguyên liệu theo đúng tỷ lệ công thức.',
      'Theo dõi chất lượng in ấn bề mặt túi nilon/bao bì giấy.',
      'Vận hành máy cán luyện cao su và cắt phôi cao su.',
      'Đóng gói cuộn màng hoặc sản phẩm nhựa vào bao tải/thùng.',
    ],
    reqPool: [
      'Chịu được mùi nhựa hoặc cao su nung nóng trong xưởng.',
      'Nhanh tay, mắt tốt để phát hiện các lỗi bong tróc, sai màu in.',
      'Ưu tiên người đã từng làm việc tại xưởng nhựa hoặc bao bì.',
      'Có thể làm việc môi trường hơi nóng.',
    ],
  },
  {
    name: 'Xây dựng – Vật liệu',
    occupations: [
      'Công nhân xây dựng', 'Thợ sắt', 'Thợ mộc công trình',
      'Thợ điện công trình', 'Thợ sơn nước', 'Nhân viên giám sát thi công',
    ],
    taskPool: [
      'Thực hiện các công việc xây, trát, ốp lát gạch tại công trình.',
      'Lắp dựng giàn giáo và thi công sắt thép móng, cột, sàn.',
      'Lắp đặt hệ thống ống nước và thiết bị vệ sinh.',
      'Thi công hệ thống điện âm tường và đấu nối tủ điện gia đình.',
      'Bả ma tít và sơn hoàn thiện bề mặt tường nhà.',
      'Lắp đặt trần thạch cao và các cấu kiện gỗ nội thất công trình.',
    ],
    reqPool: [
      'Sức khỏe cực tốt, chịu được nắng bụi và làm việc trên cao.',
      'Trung thực, chịu khó, có tinh thần trách nhiệm với chất lượng công trình.',
      'Ưu tiên ứng viên có chứng chỉ nghề xây dựng hoặc cơ điện.',
      'Tự túc phương tiện đi lại giữa các công trình.',
    ],
  },
  {
    name: 'Gỗ – Nội thất',
    occupations: [
      'Thợ mộc nội thất', 'Công nhân sơn gỗ', 'Công nhân lắp ráp nội thất',
      'Nhân viên QC gỗ', 'Công nhân chà nhám', 'Công nhân vận hành máy CNC gỗ',
    ],
    taskPool: [
      'Sử dụng máy cầm tay (khoan, đục, bào) để gia công gỗ tự nhiên và gỗ công nghiệp.',
      'Lắp ráp các chi tiết tủ, giường, bàn ghế theo bản vẽ thiết kế.',
      'Pha chế và phun sơn (PU/NC) bề mặt gỗ đảm bảo độ bóng, mịn.',
      'Chà nhám thủ công hoặc bằng máy để làm sạch bề mặt phôi gỗ.',
      'Kiểm tra độ ẩm, vết nứt, cong vênh của sản phẩm gỗ.',
      'Vận hành máy cắt, máy dán cạnh tự động.',
    ],
    reqPool: [
      'Khéo tay, tỉ mỉ, có gu thẩm mỹ tốt.',
      'Không dị ứng với bụi gỗ hoặc mùi hóa chất sơn.',
      'Ưu tiên thợ có kinh nghiệm đứng máy sản xuất đồ nội thất.',
      'Có thể đọc hiểu bản vẽ triển khai sản xuất.',
    ],
  },
  {
    name: 'Ô tô – Xe máy – Phụ tùng',
    occupations: [
      'Công nhân lắp ráp ô tô', 'Công nhân sản xuất linh kiện xe máy',
      'Kỹ thuật viên sơn xe', 'Công nhân dập khuôn',
      'Nhân viên QC phụ tùng', 'Thợ hàn khung xe',
    ],
    taskPool: [
      'Lắp ráp các bộ phận động cơ, nội thất vào khung thân xe ô tô.',
      'Đứng máy dập các chi tiết vỏ nhựa, khung sắt xe máy.',
      'Sử dụng súng phun sơn tự động hoặc thủ công cho các linh kiện.',
      'Kiểm soát sai số lắp ráp bằng hệ thống máy đo laser.',
      'Hàn điểm khung xe bằng cánh tay robot hoặc hàn tay.',
      'Kiểm tra ngoại quan sản phẩm sau khi ra khỏi dây chuyền sơn.',
    ],
    reqPool: [
      'Yêu thích lĩnh vực kỹ thuật, ô tô, xe máy.',
      'Cẩn thận, tuân thủ tuyệt đối quy trình lắp ráp khắt khe.',
      'Ưu tiên ứng viên tốt nghiệp trung cấp cơ khí động lực.',
      'Sức khỏe tốt để làm việc theo dây chuyền tốc độ cao.',
    ],
  },
  {
    name: 'Hóa chất – Dược phẩm',
    occupations: [
      'Công nhân sản xuất dược phẩm', 'Nhân viên QC hóa chất',
      'Công nhân đóng gói dược phẩm', 'Nhân viên phòng thí nghiệm',
      'Công nhân vận hành lò phản ứng', 'Nhân viên an toàn hóa chất',
    ],
    taskPool: [
      'Cân đo nguyên liệu hóa chất/dược liệu theo đúng lệnh sản xuất.',
      'Vận hành máy dập viên, máy ép vỉ hoặc máy đóng chai thuốc.',
      'Kiểm soát nhiệt độ, áp suất trong tháp chưng cất hoặc bồn phản ứng.',
      'Lấy mẫu dung dịch/bột để phân tích các chỉ số hóa lý.',
      'Đóng gói sản phẩm vào bao bì vô trùng, dán tem nhãn đúng quy định.',
      'Thực hiện các quy trình phòng chống cháy nổ và rò rỉ hóa chất.',
    ],
    reqPool: [
      'Tính kỷ luật và sự chính xác cực cao, không được sai số khi pha trộn.',
      'Chấp nhận mặc đồ bảo hộ chống độc chuyên dụng (nếu cần).',
      'Ưu tiên tốt nghiệp trung cấp hóa, dược hoặc sinh học.',
      'Không bị dị ứng mùi hóa chất hoặc bụi thuốc bột.',
    ],
  },
]

const VIETNAM_SCHOOLS = [
  'Trường Cao đẳng Công thương TP.HCM',
  'Trường Cao đẳng Kỹ thuật Cao Thắng',
  'Trường Cao đẳng Công nghệ quốc tế LILAMA 2',
  'Trường Trung cấp Cơ khí I Hà Nội',
  'Trường Cao đẳng Kỹ thuật Lý Tự Trọng',
  'Trường Cao đẳng Kinh tế - Kỹ thuật Cần Thơ',
  'Trường Cao đẳng Công nghiệp Hải Phòng',
  'Trường Cao đẳng nghề Đà Nẵng',
  'Trường Cao đẳng Cơ điện Hà Nội',
  'Trường Trung cấp nghề Giao thông Vận tải',
  'Đại học Công nghiệp Hà Nội',
  'Đại học Công thương TP.HCM',
]

const SKILL_POOL = [
  'Vận hành máy CNC', 'Hàn CO2/Mig/Tig', 'Đọc bản vẽ cơ khí', 'Sửa chữa điện công nghiệp',
  'Vận hành máy may công nghiệp', 'Kiểm hàng KCS/QC', 'Đóng gói sản phẩm tốc độ cao',
  'Sắp xếp kho bãi', 'Lái xe nâng', 'Quản lý chuyền sản xuất', 'Tuân thủ 5S/ISO',
  'Làm việc xoay ca', 'Chịu áp lực sản lượng', 'Lắp ráp linh kiện PCB', 'Vận hành máy dập',
  'Pha chế hóa chất', 'Vận hành lò hơi', 'Sử dụng thước kẹp/panme', 'Kiểm tra ngoại quan',
  'Tin học văn phòng cơ bản', 'Tiếng Anh giao tiếp công xưởng', 'Tiếng Hàn/Nhật cơ bản',
  'Kỹ năng giải quyết vấn đề', 'Làm việc nhóm', 'Trung thực/Cẩn thận',
]

function generateUltraRealisticBio(occupation: string, years: number): string {
  const company = faker.company.name()
  const province = faker.helpers.arrayElement(VIETNAM_PROVINCES)

  const templates = [
    `Tôi đã có ${years} năm làm vị trí ${occupation} tại công ty ${company} khu vực ${province}. Tôi nắm vững quy trình sản xuất, làm việc có trách nhiệm và sẵn sàng tăng ca khi có đơn hàng gấp.`,
    `Gần ${years} năm gắn bó với nghề ${occupation}, tôi tự tin về tay nghề của mình. Từng làm việc trong môi trường FDI Nhật/Hàn nên tôi rất coi trọng kỷ luật, đúng giờ và tiêu chuẩn 5S.`,
    `Kinh nghiệm ${years} năm làm ${occupation}. Hiện tại tôi đang tìm kiếm một công việc ổn định lâu dài tại ${faker.helpers.arrayElement(VIETNAM_PROVINCES)} để gắn bó. Tôi có sức khỏe tốt, không ngại việc khó.`,
    `Tốt nghiệp từ ${faker.helpers.arrayElement(VIETNAM_SCHOOLS)}, tôi đã tham gia vào lĩnh vực ${occupation} được ${years} năm. Tôi có khả năng sử dụng các loại máy móc chuyên dụng và xử lý sự cố dây truyền cơ bản.`,
    `Tôi là công nhân lành nghề với ${years} năm kinh nghiệm. Trước đây làm tại ${company}, tôi luôn đạt chỉ tiêu sản lượng và được quản lý đánh giá cao về thái hiệu tích cực.`,
  ]
  return faker.helpers.arrayElement(templates)
}

function generateDesiredJobText(): string {
  const salary = faker.number.int({ min: 7, max: 15 }) + (Math.random() < 0.5 ? 0.5 : 0)
  const templates = [
    `Mong muốn tìm việc ${faker.helpers.arrayElement(['hành chính', 'xoay ca'])} với mức lương từ ${salary} triệu/tháng. Cần công ty có đóng bảo hiểm đầy đủ và bao cơm trưa.`,
    `Tìm vị trí công nhân sản xuất gần khu vực trọ. Ưu tiên công ty có xe đưa đón và thưởng chuyên cần hàng tháng hấp dẫn.`,
    `Cần tìm việc ổn định lâu dài, môi trường làm việc thoải mái, không quá áp lực. Mong muốn thu nhập khoảng ${salary} triệu đồng.`,
    `Tìm việc có ký túc xá cho nhân viên xa nhà. Chấp nhận tăng ca nhiều (từ 40-50h/tháng) để nâng cao thu nhập. Lương mong muốn ${salary}tr +.`,
    `Ưu tiên công ty có chế độ phúc lợi tốt cho lao động nữ, nghỉ phép năm và thưởng lễ tết rõ ràng.`,
  ]
  return faker.helpers.arrayElement(templates)
}

const GLOBAL_TASK_POOL = [
  'Thực hiện các nhiệm vụ khác theo sự phân công của quản lý bộ phận.',
  'Duy trì thực hiện 5S tại khu vực làm việc hàng ngày.',
  'Tuân thủ tuyệt đối các quy định về An toàn lao động và Nội quy nhà máy.',
  'Báo cáo ngay cho tổ trưởng các bất thường phát sinh trên chuyền sản xuất.',
  'Tham gia đầy đủ các buổi họp đầu giờ và đào tạo kỹ năng tại xưởng.',
]

const GLOBAL_REQ_POOL = [
  'Độ tuổi: Nam/Nữ từ 18 – 45 tuổi.',
  'Sức khỏe tốt, không mắc bệnh truyền nhiễm.',
  'Nhanh nhẹn, trung thực, chịu khó học hỏi.',
  'Ưu tiên người muốn gắn bó lâu dài với công ty.',
  'Chấp nhận làm ca theo sự sắp xếp của công ty.',
]

const GLOBAL_BEN_POOL = [
  'Tổng thu nhập: 8 – 15 triệu/tháng (gồm lương cơ bản + tăng ca + phụ cấp).',
  'Được tham gia đầy đủ BHXH, BHYT, BHTN theo Luật Lao động.',
  'Có xe đưa đón công nhân tại nhiều tuyến điểm.',
  'Bao cơm giữa ca sạch sẽ, đảm bảo dinh dưỡng.',
  'Thưởng chuyên cần, nhà ở, xăng xe, độc hại hàng tháng.',
  'Thưởng lương tháng 13 và các dịp lễ, Tết, sinh nhật.',
  'Khám sức khỏe định kỳ và tham gia du lịch công ty hàng năm.',
  'Có ký túc xá miễn phí hoặc hỗ trợ nhà trọ cho công nhân xa nhà.',
]


// ================================================
// TEMPLATE DATA - ĐA DẠNG MÔ TẢ
// ================================================

function generateCompanyDescription(name: string, province: string): string {
  const intros = [
    `${name} là doanh nghiệp 100% vốn đầu tư nước ngoài (FDI)`,
    `${name} thuộc tập đoàn đa quốc gia với hơn 50 chi nhánh trên toàn thế giới`,
    `${name} là một trong những nhà sản xuất hàng đầu tại Việt Nam`,
    `${name} là doanh nghiệp liên doanh quốc tế`,
    `${name} là công ty công nghiệp có uy tín lâu năm tại Việt Nam`,
  ]
  const scales = [
    `Nhà máy đặt tại ${province} với quy mô hơn ${faker.number.int({ min: 500, max: 50000 })} công nhân.`,
    `Hiện tại có ${faker.number.int({ min: 2, max: 8 })} nhà máy trên toàn quốc, trụ sở chính tại ${province}.`,
    `Hoạt động tại ${province} từ năm ${faker.number.int({ min: 2005, max: 2020 })}, hiện có hơn ${faker.number.int({ min: 300, max: 10000 })} lao động.`,
  ]
  const cultures = [
    'Chúng tôi cam kết mang đến môi trường làm việc an toàn, chuyên nghiệp và nhiều cơ hội phát triển.',
    'Công ty luôn đặt phúc lợi người lao động lên hàng đầu với chế độ đãi ngộ cạnh tranh nhất khu vực.',
    'Với phương châm "Con người là tài sản quý giá nhất", chúng tôi không ngừng đầu tư vào đào tạo và phát triển nhân lực.',
    'Môi trường làm việc hiện đại, tuân thủ tiêu chuẩn ISO 14001 về an toàn và bảo vệ môi trường.',
  ]
  const benefits = [
    'Phúc lợi: xe đưa đón miễn phí, bao cơm 3 bữa, ký túc xá cho công nhân xa nhà.',
    'Chế độ: BHXH đầy đủ, thưởng chuyên cần, thưởng Tết 2-3 tháng lương, du lịch hàng năm.',
    'Đãi ngộ hấp dẫn: lương cạnh tranh, thưởng sản lượng, phụ cấp thâm niên, khám sức khỏe định kỳ.',
    'Quyền lợi: tăng lương 2 lần/năm, hỗ trợ nhà ở, phụ cấp xăng xe, bảo hiểm sức khỏe 24/7.',
  ]
  return [
    faker.helpers.arrayElement(intros),
    faker.helpers.arrayElement(scales),
    faker.helpers.arrayElement(cultures),
    faker.helpers.arrayElement(benefits),
  ].join(' ')
}

const BULLET_STYLES = ['-', '•', '*', '➢', '✔', '+']
const SECTION_HEADERS = {
  tasks: ['【MÔ TẢ CÔNG VIỆC】', '1. Nhiệm vụ chính:', '❖ MÔ TẢ CÔNG VIỆC:', '--- CÔNG VIỆC ---'],
  reqs: ['【YÊU CẦU】', '2. Tiêu chuẩn ứng tuyển:', '❖ ĐIỀU KIỆN TUYỂN DỤNG:', '--- YÊU CẦU ---'],
  bens: ['【QUYỀN LỢI】', '3. Chế độ được hưởng:', '❖ CHẾ ĐỘ PHÚC LỢI:', '--- QUYỀN LỢI ---'],
  time: ['【THỜI GIAN LÀM VIỆC】', '4. Lịch làm việc:', '❖ THỜI GIAN:', '--- THỜI GIAN ---'],
}

function generateJobDescription(occupation: string, sectorName: string, province: string): string {
  const sector = SECTORS_DATA.find(s => s.name === sectorName) || SECTORS_DATA[0]
  const b = faker.helpers.arrayElement(BULLET_STYLES)
  const headerIdx = faker.number.int({ min: 0, max: 3 })

  // Tạo các pool nội dung đã mix
  const mixedTasks = faker.helpers.shuffle([
    ...sector.taskPool.map(t => t.replace('${occupation}', occupation)),
    ...GLOBAL_TASK_POOL,
  ])
  const mixedReqs = faker.helpers.shuffle([
    ...sector.reqPool.map(r => r.replace('${province}', province)),
    ...GLOBAL_REQ_POOL,
  ])
  const mixedBens = faker.helpers.shuffle([...GLOBAL_BEN_POOL])

  const workingTimes = [
    `${b} Làm việc theo ca (xoay ca hàng tuần):\n   + Ca 1: 06:00 - 14:00\n   + Ca 2: 14:00 - 22:00\n   + Ca 3 (Ca đêm): 22:00 - 06:00\n${b} Tăng ca tối đa 40h/tháng.`,
    `${b} Giờ hành chính: 08:00 - 17:00 (Nghỉ trưa 1 tiếng).\n${b} Nghỉ Chủ nhật và các ngày lễ theo quy định.`,
    `${b} Chế độ làm việc 3 ca 4 kíp, nghỉ luân phiên trong tuần.\n${b} Thời gian tăng ca linh hoạt theo đơn hàng.`,
  ]

  // Chọn số lượng ý ngẫu nhiên từ 3-6
  const numTasks = faker.number.int({ min: 4, max: 6 })
  const numReqs = faker.number.int({ min: 3, max: 5 })
  const numBens = faker.number.int({ min: 4, max: 6 })

  const taskList = mixedTasks.slice(0, numTasks).map(t => `${b} ${t}`).join('\n')
  const reqList = mixedReqs.slice(0, numReqs).map(r => `${b} ${r}`).join('\n')
  const benList = mixedBens.slice(0, numBens).map(bn => `${b} ${bn}`).join('\n')
  const workTime = faker.helpers.arrayElement(workingTimes)

  // Ngẫu nhiên kiểu văn phong (Styles)
  const style = faker.helpers.arrayElement(['FDI', 'URGENT', 'BENEFIT', 'SHORT'])

  if (style === 'SHORT' || Math.random() < 0.1) {
    const salary = faker.helpers.arrayElement(['8 - 15 triệu', '9 - 13 triệu', 'lương thỏa thuận', 'thu nhập hấp dẫn'])
    return `TUYỂN GẤP ${occupation.toUpperCase()} TẠI ${province.toUpperCase()}\n\n` +
      `Công ty đang cần tuyển số lượng lớn lao động ngành ${sectorName} cho vị trí ${occupation}. ` +
      `Yêu cầu: ${mixedReqs[0].toLowerCase()} Sức khỏe tốt, chịu khó, ưu tiên đi làm ngay. ` +
      `Quyền lợi: Mức lương ${salary}, bao cơm, xe đưa đón, đầy đủ bảo hiểm. ` +
      `Liên hệ phỏng vấn trực tiếp tại cổng công ty hoặc nộp hồ sơ online. MIỄN PHÍ TRUNG GIAN!`
  }

  const sections = [
    { header: SECTION_HEADERS.tasks[headerIdx], content: taskList },
    { header: SECTION_HEADERS.reqs[headerIdx], content: reqList },
    { header: SECTION_HEADERS.bens[headerIdx], content: benList },
    { header: SECTION_HEADERS.time[headerIdx], content: workTime },
  ]

  // FDI style: Giữ nguyên thứ tự chuẩn
  // BENEFIT style: Đưa Quyền lợi lên đầu
  // URGENT style: Đưa Yêu cầu lên đầu
  if (style === 'BENEFIT') {
    const bens = sections.splice(2, 1)[0]
    sections.unshift(bens)
  } else if (style === 'URGENT') {
    const reqs = sections.splice(1, 1)[0]
    sections.unshift(reqs)
  }

  return sections.map(s => `${s.header}\n${s.content}`).join('\n\n')
}

const JOB_TITLE_PREFIXES = [
  'Tuyển gấp', 'Cần tuyển', 'Tuyển', 'Tuyển dụng', 'Cần tuyển gấp',
  'Nhà máy tuyển', 'KCN tuyển', 'Tuyển số lượng lớn',
]

function generateUltraRealisticReview(): { title: string, content: string } {
  const ctx = faker.helpers.arrayElement([
    'Đã làm ở đây hơn 1 năm.',
    'Vừa nghỉ việc sau 2 năm gắn bó.',
    'Mới vào làm được 6 tháng.',
    'Gắn bó 3 năm từ lúc xưởng mới mở.',
    'Trải nghiệm làm công nhân thời vụ tại đây.',
  ])
  const pos = faker.helpers.arrayElement([
    'Lương thưởng trả rất đúng hạn, không bao giờ trễ. Cơm canteen sạch sẽ và ngon.',
    'Môi trường làm việc chuyên nghiệp, Sếp người nước ngoài rất công bằng.',
    'Phúc lợi tốt, có xe đưa đón và ký túc xá sạch sẽ. Công ty đóng bảo hiểm đầy đủ.',
    'Hệ thống quản lý 5S tốt, nhà xưởng có điều hòa nên không bị nóng.',
    'Đồng nghiệp thân thiện, hay giúp đỡ lẫn nhau trong công việc.',
  ])
  const neg = faker.helpers.arrayElement([
    'Tuy nhiên tăng ca hơi nhiều, mùa đơn hàng gấp là làm đến tối muộn.',
    'Quản lý người Việt đôi khi còn hơi hắc ám, hay la mắng công nhân.',
    'Áp lực sản lượng khá cao, phải đứng liên tục 8 tiếng rất mỏi chân.',
    'Điểm trừ là nhà vệ sinh đôi khi còn bẩn, vào giờ cao điểm rất đông.',
    'Lương cơ bản hơi thấp, phải dựa vào tăng ca mới đủ trang trải.',
  ])
  const verdict = faker.helpers.arrayElement([
    'Đáng để gắn bó nếu muốn thu nhập ổn định.',
    'Phù hợp cho bạn nào chịu khó cầy tiền.',
    'Nói chung là 8/10 điểm, nên vào.',
    'Ai không chịu được áp lực thì đừng nên ứng tuyển.',
    'Tôi đã có kỷ niệm đẹp tại đây.',
  ])

  const titles = [
    'Công ty tốt, thu nhập ổn định',
    'Cơm ngon nhưng tăng ca nhiều',
    'Môi trường FDI chuyên nghiệp',
    'Quản lý hơi hắc ám',
    'Nên vào làm nếu muốn gắn bó lâu dài',
    'Review chân thực sau 2 năm',
    'Điểm 10 cho phúc lợi xe đưa đón',
  ]

  return {
    title: faker.helpers.arrayElement(titles),
    content: `${ctx} ${pos} ${neg} ${verdict}`,
  }
}

// ================================================
// HELPER FUNCTIONS
// ================================================

function randomPhone(): string {
  const prefixes = [
    '032', '033', '034', '035', '036', '037', '038', '039',
    '070', '076', '077', '078', '079',
    '081', '082', '083', '084', '085', '086', '088', '089',
    '090', '091', '092', '093', '094', '096', '097', '098', '099',
  ]
  return faker.helpers.arrayElement(prefixes) + faker.string.numeric(7)
}

function getRandomDate() {
  const start = new Date('2026-02-01T00:00:00Z')
  const end = new Date('2026-04-04T00:00:00Z')
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return date
}

function randomAddress(province: string): string {
  const kcn = faker.helpers.arrayElement(KCN_NAMES)
  const lotNumber = faker.number.int({ min: 1, max: 50 })
  const streetNumber = faker.number.int({ min: 1, max: 30 })
  const formats = [
    `Lô ${lotNumber}, ${kcn}, ${province}`,
    `Đường số ${streetNumber}, ${kcn}, ${province}`,
    `Lô ${lotNumber}-${lotNumber + 1}, Đường D${streetNumber}, ${kcn}, ${province}`,
    `Số ${faker.number.int({ min: 1, max: 999 })}, Đại lộ Bình Dương, ${province}`,
    `Khu phố ${faker.number.int({ min: 1, max: 10 })}, ${faker.helpers.arrayElement(WARD_NAMES)}, ${province}`,
  ]
  return faker.helpers.arrayElement(formats)
}

// ================================================
// MAIN SEED
// ================================================

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu...')
  const hashedPassword = await bcrypt.hash('12345678', 10)

  // ======================
  // SECTOR & OCCUPATION
  // ======================
  console.log('📂 Tạo ngành nghề và vị trí...')

  interface OccupationRecord { id: number; name: string; sectorName: string }
  interface UserRecord { id: number }
  interface CompanyRecord { id: number }
  interface JobRecord { id: number }

  const occupations: OccupationRecord[] = []
  const workers: UserRecord[] = []
  const companies: CompanyRecord[] = []
  const jobs: JobRecord[] = []

  for (const sector of SECTORS_DATA) {
    const createdSector = await prisma.sector.create({
      data: { name: sector.name },
    })

    for (const occ of sector.occupations) {
      const createdOcc = await prisma.occupation.create({
        data: { name: occ, sectorId: createdSector.id },
      })
      occupations.push({ id: createdOcc.id, name: createdOcc.name, sectorName: sector.name })
    }
  }
  console.log(`✅ Đã tạo ${SECTORS_DATA.length} ngành và ${occupations.length} vị trí`)

  // ======================
  // ADMIN & MANAGER
  // ======================
  console.log('👤 Tạo Admin & Manager...')

  await prisma.user.create({
    data: {
      fullName: 'Admin Hệ Thống',
      email: 'admin@sepjob.vn',
      phone: '0901000001',
      password: hashedPassword,
      role: EnumUserRole.ADMIN,
      status: EnumUserStatus.ACTIVE,
      isVerified: true,
      createdAt: getRandomDate(),
      updatedAt: getRandomDate(),
    },
  })

  await prisma.user.create({
    data: {
      fullName: 'Quản Lý Nội Dung',
      email: 'manager@sepjob.vn',
      phone: '0901000002',
      password: hashedPassword,
      role: EnumUserRole.MANAGER,
      status: EnumUserStatus.ACTIVE,
      isVerified: true,
      createdAt: getRandomDate(),
      updatedAt: getRandomDate(),
    },
  })

  // ======================
  // 400 WORKERS
  // ======================
  console.log('👷 Tạo 400 workers...')

  const TEST_NAMES = ['minh', 'loc', 'phong', 'doan', 'sang']
  const usedPhones = new Set<string>(['0901000001', '0901000002'])
  const usedUserNames = new Set<string>(['minhworker', 'locworker', 'phongworker', 'doanworker', 'sangworker'])

  for (let i = 0; i < 400; i++) {
    let email: string | null = null
    let userName: string | null = null

    // Tài khoản test dễ nhớ
    if (i < TEST_NAMES.length) {
      userName = `${TEST_NAMES[i]}worker`.toLowerCase()
      email = `${userName}@test.com`
    } else {
      // 50% có email, 50% chỉ có username (phù hợp thực tế công nhân)
      if (Math.random() < 0.5) {
        email = faker.internet.email().toLowerCase()
      } else {
        let u: string
        do {
          u = faker.internet.username().toLowerCase().replace(/[^a-z0-9]/g, '')
        } while (usedUserNames.has(u))
        userName = u
        usedUserNames.add(u)
      }
    }

    let phone: string
    do {
      phone = randomPhone()
    } while (usedPhones.has(phone))
    usedPhones.add(phone)

    const user = await prisma.user.create({
      data: {
        fullName: faker.person.fullName(),
        email,
        userName,
        phone,
        password: hashedPassword,
        role: EnumUserRole.WORKER,
        status: EnumUserStatus.ACTIVE,
        isVerified: true,
        createdAt: getRandomDate(),
      updatedAt: getRandomDate(),
    },
    })

    // 90% có profile
    if (Math.random() < 0.9) {
      const occ = faker.helpers.arrayElement(occupations)
      const expYear = faker.number.int({ min: 0, max: 15 })
      await prisma.workerProfile.create({
        data: {
          userId: user.id,
          occupationId: occ.id,
          bio: generateUltraRealisticBio(occ.name, expYear),
          experienceYear: expYear,
          province: faker.helpers.arrayElement(VIETNAM_PROVINCES),
          ward: faker.helpers.arrayElement(WARD_NAMES),
          gender: faker.helpers.arrayElement([EnumUserGender.MALE, EnumUserGender.FEMALE]),
          birthYear: faker.number.int({ min: 1980, max: 2005 }),
          desiredJobText: generateDesiredJobText(),
          expectedSalary: faker.number.int({ min: 6, max: 18 }) * 1000000 + (Math.random() < 0.5 ? 500000 : 0),
          shift: faker.helpers.arrayElement([
            EnumShift.MORNING, EnumShift.AFTERNOON, EnumShift.FULL_DAY,
            EnumShift.NIGHT, EnumShift.FLEXIBLE,
          ]),
        },
      })
    }
    workers.push({ id: user.id })
  }
  console.log('✅ Đã tạo 400 workers (với 5 tài khoản test)')

  // ======================
  // 30 COMPANIES & 300+ JOBS
  // ======================
  console.log('🏭 Tạo 30 công ty và jobs...')

  for (const name of COMPANY_NAMES) {
    const companyProvince = faker.helpers.arrayElement(VIETNAM_PROVINCES)
    const idx = COMPANY_NAMES.indexOf(name)

    let email: string | null = null
    let userName: string | null = null // Employer sẽ không có username

    if (idx < TEST_NAMES.length) {
      email = `${TEST_NAMES[idx]}employer@test.com`.toLowerCase().trim()
    } else {
      email = `employer_${faker.string.alphanumeric(6)}@company.vn`.toLowerCase().trim()
    }

    let ownerPhone = randomPhone()
    while (usedPhones.has(ownerPhone)) ownerPhone = randomPhone()
    usedPhones.add(ownerPhone)

    const owner = await prisma.user.create({
      data: {
        fullName: faker.person.fullName(),
        email,
        userName,
        phone: ownerPhone,
        password: hashedPassword,
        role: EnumUserRole.EMPLOYER,
        status: EnumUserStatus.ACTIVE,
        isVerified: true,
        createdAt: getRandomDate(),
      updatedAt: getRandomDate(),
    },
    })

    const company = await prisma.company.create({
      data: {
        ownerId: owner.id,
        name,
        taxCode: faker.string.numeric(10),
        logoUrl: LOGO_URL,
        address: randomAddress(companyProvince),
        website: `https://${faker.internet.domainWord()}.com.vn`,
        status: faker.helpers.weightedArrayElement([
          { value: CompanyStatus.APPROVED, weight: 85 },
          { value: CompanyStatus.PENDING, weight: 10 },
          { value: CompanyStatus.REJECTED, weight: 5 },
        ]),
        description: generateCompanyDescription(name, companyProvince),
        createdAt: getRandomDate(),
      updatedAt: getRandomDate(),
    },
    })

    companies.push({ id: company.id })

    // Mỗi công ty có 10-18 jobs → tổng ~300-540 jobs
    const jobCount = faker.number.int({ min: 10, max: 18 })

    for (let i = 0; i < jobCount; i++) {
      const occ = faker.helpers.arrayElement(occupations)
      const jobProvince = Math.random() < 0.7
        ? companyProvince
        : faker.helpers.arrayElement(VIETNAM_PROVINCES)

      const salaryMin = faker.number.int({ min: 6000000, max: 12000000 })
      const salaryMax = salaryMin + faker.number.int({ min: 1000000, max: 8000000 })

      const hasAgeReq = Math.random() < 0.6
      const ageMin = hasAgeReq ? faker.number.int({ min: 18, max: 25 }) : null
      const ageMax = hasAgeReq && ageMin ? ageMin + faker.number.int({ min: 10, max: 22 }) : null

      const title = `${faker.helpers.arrayElement(JOB_TITLE_PREFIXES)} ${occ.name}`

      const job = await prisma.job.create({
        data: {
          companyId: company.id,
          occupationId: occ.id,
          title,
          description: generateJobDescription(occ.name, occ.sectorName, jobProvince),
          status: faker.helpers.weightedArrayElement([
            { value: JobStatus.PUBLISHED, weight: 60 },
            { value: JobStatus.WARNING, weight: 20 },
            { value: JobStatus.EXPIRED, weight: 20 },
          ]),
          address: randomAddress(jobProvince),
          province: jobProvince,
          district: faker.helpers.arrayElement(WARD_NAMES),
          salaryMin,
          salaryMax,
          workingShift: faker.helpers.arrayElement([
            EnumShift.MORNING, EnumShift.AFTERNOON,
            EnumShift.FULL_DAY, EnumShift.NIGHT, EnumShift.FLEXIBLE,
          ]),
          quantity: faker.number.int({ min: 3, max: 100 }),
          genderRequirement: Math.random() < 0.5
            ? faker.helpers.arrayElement([EnumUserGender.MALE, EnumUserGender.FEMALE])
            : null,
          ageMin,
          ageMax,
          expiredAt: faker.date.future({ years: 1 }),
          isBoosted: Math.random() < 0.15,
          isFlagged: Math.random() < 0.03,
          fraudScore: Math.random() < 0.03
            ? faker.number.float({ min: 0.5, max: 0.95 })
            : 0,
          createdAt: getRandomDate(),
      updatedAt: getRandomDate(),
    },
      })

      jobs.push({ id: job.id })
    }
  }
  console.log(`✅ Đã tạo ${companies.length} công ty và ${jobs.length} jobs`)

  // ======================
  // JOB APPLICATIONS
  // ======================
  console.log('📝 Tạo đơn ứng tuyển...')
  let applicationCount = 0
  const vipWorkers = workers.slice(0, TEST_NAMES.length)
  const vipJobs = jobs.filter((j, idx) => idx < TEST_NAMES.length * 15)

  for (let i = 0; i < 1500; i++) {
    const worker = Math.random() < 0.7 
      ? faker.helpers.arrayElement(vipWorkers) 
      : faker.helpers.arrayElement(workers)
    const job = Math.random() < 0.7 
      ? faker.helpers.arrayElement(vipJobs) 
      : faker.helpers.arrayElement(jobs)

    try {
      await prisma.jobApplication.create({
        data: {
          jobId: job.id,
          userId: worker.id,
          status: faker.helpers.weightedArrayElement([
            { value: JobApplicationStatus.APPLIED, weight: 40 },
            { value: JobApplicationStatus.VIEWED, weight: 25 },
            { value: JobApplicationStatus.SUITABLE, weight: 15 },
            { value: JobApplicationStatus.UNSUITABLE, weight: 10 },
            { value: JobApplicationStatus.CANCELLED, weight: 10 },
          ]),
          updatedAt: getRandomDate(),
        },
      })
      applicationCount++
    } catch {
      // unique constraint violation - skip
    }
  }
  console.log(`✅ Đã tạo ${applicationCount} đơn ứng tuyển`)

  // ======================
  // SAVED JOBS
  // ======================
  console.log('💾 Tạo saved jobs...')
  let savedCount = 0
  for (let i = 0; i < 500; i++) {
    const worker = Math.random() < 0.7 
      ? faker.helpers.arrayElement(vipWorkers) 
      : faker.helpers.arrayElement(workers)
    const job = Math.random() < 0.7 
      ? faker.helpers.arrayElement(vipJobs) 
      : faker.helpers.arrayElement(jobs)
    try {
      await prisma.savedJob.create({
        data: { userId: worker.id, jobId: job.id },
      })
      savedCount++
    } catch {
      // unique constraint violation - skip
    }
  }
  console.log(`✅ Đã tạo ${savedCount} saved jobs`)

  // ======================
  // COMPANY REVIEWS + REPORTS
  // ======================
  console.log('⭐ Tạo đánh giá công ty...')

  let reviewCount = 0
  for (const company of companies) {
    if (Math.random() < 0.7) {
      const count = faker.number.int({ min: 3, max: 12 })

      for (let i = 0; i < count; i++) {
        const worker = Math.random() < 0.7 
          ? faker.helpers.arrayElement(vipWorkers) 
          : faker.helpers.arrayElement(workers)

        try {
          const { title, content } = generateUltraRealisticReview()
          const review = await prisma.companyReview.create({
            data: {
              companyId: company.id,
              userId: worker.id,
              rating: faker.number.int({ min: 1, max: 5 }),
              title,
              content,
              salaryRating: faker.number.int({ min: 1, max: 5 }),
              environmentRating: faker.number.int({ min: 1, max: 5 }),
              overtimeRating: faker.number.int({ min: 1, max: 5 }),
              managementRating: faker.number.int({ min: 1, max: 5 }),
              isAnonymous: Math.random() < 0.4,
              status: Math.random() < 0.1 ? ReviewStatus.DELETED : ReviewStatus.ACTIVE,
              createdAt: getRandomDate(),
      updatedAt: getRandomDate(),
    },
          })
          reviewCount++

          // 5% review bị report
          if (Math.random() < 0.05) {
            const reporter = faker.helpers.arrayElement(workers)
            try {
              await prisma.companyReviewReport.create({
                data: {
                  reviewId: review.id,
                  reporterId: reporter.id,
                  reason: faker.helpers.arrayElement(Object.values(ReportReason)),
                  description: faker.helpers.arrayElement([
                    'Nội dung sai sự thật, bịa đặt.',
                    'Ngôn ngữ phản cảm, xúc phạm.',
                    'Đánh giá trùng lặp, spam.',
                    'Nội dung không liên quan đến công ty.',
                    'Nghi ngờ đánh giá giả, cạnh tranh không lành mạnh.',
                  ]),
                  status: faker.helpers.arrayElement([
                    ReportStatus.PENDING, ReportStatus.RESOLVED, ReportStatus.REJECTED,
                  ]),
                  createdAt: getRandomDate(),
                },
              })
            } catch {
              // unique constraint violation
            }
          }
        } catch {
          // unique constraint violation (companyId, userId)
        }
      }
    }
  }
  console.log(`✅ Đã tạo ${reviewCount} đánh giá`)

  // ======================
  // JOB REPORTS
  // ======================
  console.log('🚩 Tạo báo cáo tin tuyển dụng...')

  let jobReportCount = 0
  for (const job of jobs) {
    if (Math.random() < 0.04) {
      const reporter = faker.helpers.arrayElement(workers)
      try {
        await prisma.jobReport.create({
          data: {
            jobId: job.id,
            reporterId: reporter.id,
            reason: faker.helpers.arrayElement(Object.values(ReportReason)),
            description: faker.helpers.arrayElement([
              'Tin tuyển dụng có dấu hiệu lừa đảo, yêu cầu đặt cọc.',
              'Thông tin lương không đúng thực tế, quảng cáo sai sự thật.',
              'Công ty không tồn tại tại địa chỉ đã đăng.',
              'Nội dung trùng lặp với tin đã đăng trước đó.',
              'Tin tuyển dụng chứa nội dung vi phạm pháp luật.',
              'Yêu cầu ứng viên nộp phí trước khi phỏng vấn.',
            ]),
            status: faker.helpers.arrayElement([
              ReportStatus.PENDING, ReportStatus.RESOLVED, ReportStatus.REJECTED,
            ]),
            createdAt: getRandomDate(),
          },
        })
        jobReportCount++
      } catch {
        // unique constraint violation
      }
    }
  }
  console.log(`✅ Đã tạo ${jobReportCount} báo cáo`)

  // ======================
  // MATCHING WEIGHT
  // ======================
  console.log('⚖️ Tạo trọng số matching...')

  await prisma.matchingWeight.createMany({
    data: [
      { key: MatchingWeightKey.SKILL_WEIGHT, label: 'Kỹ năng', weight: 0.4 },
      { key: MatchingWeightKey.BENEFIT_WEIGHT, label: 'Phúc lợi', weight: 0.2 },
      { key: MatchingWeightKey.SALARY_WEIGHT, label: 'Lương', weight: 0.15 },
      { key: MatchingWeightKey.LOCATION_WEIGHT, label: 'Địa điểm', weight: 0.1 },
      { key: MatchingWeightKey.SHIFT_WEIGHT, label: 'Ca làm', weight: 0.05 },
      { key: MatchingWeightKey.GENDER_WEIGHT, label: 'Giới tính', weight: 0.05 },
      { key: MatchingWeightKey.AGE_WEIGHT, label: 'Độ tuổi', weight: 0.05 },
    ],
  })

  console.log('✅ Đã tạo trọng số matching')
  console.log('🎉 Seed hoàn tất!')
}

main()
  .catch((e) => console.error('❌ Seed thất bại:', e))
  .finally(() => prisma.$disconnect())

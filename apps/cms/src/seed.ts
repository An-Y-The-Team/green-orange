import config from '@payload-config'
import { getPayload } from 'payload'

/**
 * One-time content migration: lifts the static arrays that used to live in
 * apps/web/src/data.ts into Payload. Idempotent — re-running upserts by `slug`,
 * so it is safe to run repeatedly during development.
 *
 * Run with:  bun run seed     (from apps/cms)
 *
 * Source shapes mirror apps/web/src/types.ts (benefits/features/tags as plain
 * string arrays); the loop converts them to Payload's array-of-objects shape.
 */

type SourceService = {
  id: string
  title: string
  description: string
  category: 'cleaning' | 'construction'
  duration: string
  benefits: string[]
  features: string[]
  iconName: string
  popular?: boolean
}

type SourceProject = {
  id: string
  title: string
  client: string
  category: 'cleaning' | 'construction'
  location: string
  area: string
  completionTime: string
  description: string
  achievement: string
  imageUrl: string
  tags: string[]
  testimonial?: {
    author: string
    role: string
    content: string
    avatarUrl?: string
    rating: number
  }
}

type SourceTestimonial = {
  id: string
  author: string
  role: string
  company: string
  content: string
  rating: number
  avatarUrl: string
  category: 'cleaning' | 'construction' | 'both'
}

const SERVICES: SourceService[] = [
  {
    id: 'cleaning_deep',
    title: 'Vệ Sinh Sau Xây Dựng & Hậu Thi Công',
    description:
      'Xử lý triệt để bụi mịn thạch cao, keo silicon thừa, vết sơn bám và rác thải công nghiệp. Chuẩn bị bàn giao không gian sạch bóng, thơm mát sẵn sàng cho ngày khai trương cửa hàng.',
    category: 'cleaning',
    duration: '1 - 2 ngày (tùy diện tích)',
    benefits: [
      'Sử dụng hóa chất sinh học organic cam kết nhập khẩu chính hãng, an toàn sức khỏe.',
      'Đội ngũ nhân công chuyên nghiệp trang bị máy chà sàn công nghiệp, máy hút bụi công suất lớn.',
      'Dọn sạch từ trần nhà, tường, quầy kệ đến ngóc ngách khe cửa và sàn nhà.',
    ],
    features: [
      'Hút bụi mịn 3 lớp màng lọc HEPA',
      'Tẩy sạch keo bám kính & sàn gỗ',
      'Khử mùi sơn mới bằng ozone tự nhiên',
      'Đánh bóng gương kính cường lực',
    ],
    iconName: 'Sparkles',
    popular: true,
  },
  {
    id: 'cleaning_periodic',
    title: 'Vệ Sinh Định Kỳ Chuỗi Cửa Hàng & Office',
    description:
      'Bảo dưỡng diện mạo cửa hiệu định kỳ hàng tuần/hàng tháng. Đảm bảo mặt kính, quầy kệ và sàn nhà luôn ở trạng thái lộng lẫy nhất để thu hút khách hàng vãng lai.',
    category: 'cleaning',
    duration: 'Định kỳ theo lịch hẹn',
    benefits: [
      'Tối ưu chi phí vận hành cho chủ doanh nghiệp so với việc thuê nhân viên lao công full-time.',
      'Lịch trình linh hoạt (ca đêm hoặc sáng sớm trước giờ mở cửa) để không làm gián đoạn việc kinh doanh.',
      'Dịch vụ đi kèm bảo hiểm rủi ro tài sản nghiêm túc.',
    ],
    features: [
      'Lau kính mặt tiền & biển hiệu showroom',
      'Giặt thảm, ghế sofa đón khách chuyên nghiệp',
      'Đánh bóng phục hồi bảo dưỡng sàn đá',
      'Dọn dẹp khu vực vệ sinh & pantry của shop',
    ],
    iconName: 'CalendarClock',
  },
  {
    id: 'cleaning_façade',
    title: 'Vệ Sinh Biển Hiệu & Kính Cao Tầng',
    description:
      'Tẩy mốc kính, loại bỏ rêu phong bám bẩn biển quảng cáo ngoài trời bằng thiết bị đu dây chuyên nghiệp hoặc giàn giáo an toàn.',
    category: 'cleaning',
    duration: '4 - 8 giờ',
    benefits: [
      'Thi công đu dây có đầy đủ chứng chỉ an toàn lao động và bảo hiểm trọn gói.',
      'Giải quyết triệt để tình trạng ố kính (mưa axit, cặn canxi) làm tối mờ mặt tiền cửa hàng.',
      'Giúp cửa hàng lấy lại ánh sáng tự nhiên và vẻ sang trọng ban đầu.',
    ],
    features: [
      'Đu dây lau kính đu dây chuyên nghiệp',
      'Rửa Alu mặt tiền bằng vòi phun áp lực cao',
      'Xử lý vết ố mốc lâu năm cứng đầu',
      'Khôi phục độ sáng bóng của chữ nổi LED quảng cáo',
    ],
    iconName: 'ShieldCheck',
  },
  {
    id: 'construction_interior',
    title: 'Thi Công & Cải Tạo Nội Thất Cửa Hàng',
    description:
      'Nhận cải tạo mặt bằng thô hoặc cửa hàng cũ: đóng trần thạch cao, dựng sơn bả vách ngăn, lát sàn gỗ, sàn nhựa giả đá SPC bền bỉ, thi công quầy bar thu ngân chuyên nghiệp.',
    category: 'construction',
    duration: '5 - 15 ngày',
    benefits: [
      'Khảo sát hiện trạng mặt bằng và báo giá chi tiết từng hạng mục, không phát sinh chi phí phát sinh.',
      'Đội ngũ thợ mộc, thợ sơn bả lành nghề làm việc chuẩn chỉ theo bản vẽ kỹ thuật.',
      'Bảo hành kỹ thuật công trình 12 tháng kể từ ngày giao nhận.',
    ],
    features: [
      'Thi công vách thạch cao ngăn phòng',
      'Lát sàn nhựa hèm khóa chịu nước cao cấp',
      'Sơn bả tường hiệu ứng nghệ thuật',
      'Gia công kệ gỗ, tủ kình trưng bày sản phẩm',
    ],
    iconName: 'Wrench',
    popular: true,
  },
  {
    id: 'construction_light',
    title: 'Lắp Đặt Hệ Thống Điện & Ánh Sáng Shop',
    description:
      'Bố trí hệ thống đèn rọi ray (tracklight), đèn downlight âm trần tạo hiệu ứng thị giác đỉnh cao giúp sản phẩm trong cửa hàng trông lung linh, nổi bật cá tính.',
    category: 'construction',
    duration: '1 - 3 ngày',
    benefits: [
      'Tính toán kỹ lưỡng công suất phụ tải, cam kết sử dụng dây điện Cadivi và thiết bị bảo vệ Panasonic.',
      'Đáp ứng nghiêm ngặt tiêu chuẩn PCCC cho cửa hàng kinh doanh, shop trung tâm thương mại.',
      'Kiến tạo nhiệt độ màu ánh sáng phù hợp cho từng ngành hàng (thời trang, đồ da, mỹ phẩm, cafe).',
    ],
    features: [
      'Đi ống gen luồn dây điện chống cháy âm tường/trần',
      'Lắp đặt hệ thống đèn rọi ray tiêu điểm xoay góc',
      'Tủ điện điều khiển thông minh tự đóng tắt theo giờ',
      'Đèn LED trang trí chạy âm tủ kệ trưng bày',
    ],
    iconName: 'Lightbulb',
  },
  {
    id: 'construction_brand',
    title: 'Thi Công Biển Hiệu & Mặt Tiền Alu',
    description:
      'Sản xuất thiết kế và ốp mặt dựng nhôm Alu chống chịu tác động thời tiết, thi công lắp ráp chữ nổi Mica, Inox sáng đèn LED sang trọng nổi bật thương hiệu cửa bạn.',
    category: 'construction',
    duration: '3 - 5 ngày',
    benefits: [
      'Thiết kế bố cục chữ và màu phối chuẩn nhận diện thương hiệu độc quyền.',
      'Khung xương sắt hộp mạ kẽm vô cùng kiên cố, chống bão và các loại gió lớn ngoài trời.',
      'Bảo hành đèn LED và nguồn quảng cáo 18 tháng lỗi 1 đổi 1 nhanh chóng.',
    ],
    features: [
      'Hút nổi Mica chữ quảng cáo 3D',
      'Hàn khung sắt gia cố mặt tiền Alu',
      'Lắp đầu nguồn chống nước, hẹn giờ thông minh',
      'Đèn Neon Sign trang trí chụp ảnh check-in',
    ],
    iconName: 'LayoutTemplate',
  },
]

const PROJECTS: SourceProject[] = [
  {
    id: 'proj_hig_coffee',
    title: 'Highlands Coffee - Chi Nhánh Thảo Điền',
    client: 'Công ty Cổ phần Dịch vụ Cà phê Cao Nguyên',
    category: 'construction',
    location: 'Thảo Điền, Quận 2, TP. Hồ Chí Minh',
    area: '180 m²',
    completionTime: 'Tháng 03/2026',
    description:
      'Cải tạo toàn bộ mặt bằng thô thành quán cafe hiện đại. Thi công đóng trần thạch cao kết hợp hệ lam gỗ nghệ thuật, lắp đặt tủ quầy bar bằng vật liệu đá nhân tạo và đi mới toàn bộ hệ thống đèn rọi ray ấm áp. Sau khi hoàn thiện xây dựng, chúng tôi tiến hành giặt thảm và vệ sinh sạch bụi sơn bám trần sàn đá trước khi bàn giao.',
    achievement:
      'Thi công hoàn thành đúng tiến độ 14 ngày, bàn giao không gian sạch sẽ khang trang chuẩn hướng dẫn thiết kế thương hiệu toàn quốc.',
    imageUrl:
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80',
    tags: ['Cải tạo trọn gói', 'Vệ sinh sâu khai trương', 'Hệ thống điện'],
    testimonial: {
      author: 'Mr. Nguyễn Hoàng Nam',
      role: 'Giám đốc Vận hành Miền Nam',
      content:
        'Đội ngũ làm việc rất có trách nhiệm. Vừa thi công nhanh lại có gói vệ sinh đi kèm chuẩn sạch sẽ, giúp chúng tôi tiết kiệm thời gian liên hệ bên thứ ba dọn dẹp trước ngày chạy thử.',
      rating: 5,
    },
  },
  {
    id: 'proj_lyn_fashion',
    title: 'Cửa Hàng Thời Trang LYN Boutique',
    client: 'Hệ thống Bán lẻ Quần áo cao cấp LYN',
    category: 'cleaning',
    location: 'Tràng Tiền, Quận Hoàn Kiếm, Hà Nội',
    area: '120 m²',
    completionTime: 'Tháng 04/2026',
    description:
      'Nhận bàn giao shop sau thi công tràn ngập bụi bẩn xi măng và keo dán sàn. Chúng tôi sử dụng máy hút bụi công suất lớn công nghệ màng lọc HEPA để bóc tách bụi mịn lơ lửng, cẩn thận tẩy sạch vết sơn bám trên mặt gỗ sồi nhập khẩu và đánh bóng mặt dựng kính showroom cao 4m.',
    achievement:
      'Tẩy sạch toàn bộ bề mặt kính và sàn, đem lại hiệu ứng phản chiếu gương lung linh tuyệt đối cho cửa hiệu trước ngày Grand Opening.',
    imageUrl:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80',
    tags: ['Tẩy bụi mịn xây dựng', 'Lau kính mặt tiền', 'Xử lý sàn gỗ'],
    testimonial: {
      author: 'Mrs. Phạm Thu Trang',
      role: 'Quản lý Cửa hàng',
      content:
        'Kính showroom cực kỳ bóng loáng, không còn một vết tì hay vạch xước silicone nào. Phục vụ chu đáo, bàn giao đúng 2 giờ sáng để chúng tôi kịp móc quần áo trưng bày kịp giờ cắt băng khánh thành.',
      rating: 5,
    },
  },
  {
    id: 'proj_cosmetic_organic',
    title: 'Showroom Mỹ Phẩm EcoBeauty',
    client: 'Công ty TNHH Mỹ Phẩm Thiên Nhiên Việt Nam',
    category: 'construction',
    location: 'Hai Bà Trưng, Quận 1, TP. Hồ Chí Minh',
    area: '85 m²',
    completionTime: 'Tháng 05/2026',
    description:
      'Thiết kế thi công mặt tiền Alu xanh lá cây pastel phối trắng tinh tế, lắp đặt chữ nổi Mica hắt sáng chân LED ban đêm. Bên trong cửa hàng được gia công kệ gỗ thông sáng màu xếp nhiều tầng và lắp đặt đèn LED rọi chuẩn màu 4000K ấm tự nhiên giúp giữ màu son phấn cực nịnh mắt.',
    achievement:
      'Công trình nổi bật sáng rực cả khu phố, thu hút lượng khách hàng ghé chụp ảnh check-in tăng 45% nhờ biển hiệu đẹp.',
    imageUrl:
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    tags: ['Mặt tiền Alu', 'Chữ nổi Mica LED', 'Kệ tủ trưng bày Mỹ phẩm'],
    testimonial: {
      author: 'Dược sĩ Lê Thị Mỹ Hạnh',
      role: 'Sáng lập chuỗi EcoBeauty',
      content:
        'Màu xanh Alu thi công chuẩn chỉ như cam kết bản vẽ 3D. Hệ thống đèn LED rọi ánh sáng trung tính giúp trưng bày sản phẩm làm nổi hẳn cả thương hiệu thiên nhiên của chúng tôi.',
      rating: 5,
    },
  },
  {
    id: 'proj_zen_spa',
    title: 'Cải Tạo & Vệ Sinh Thường Niên Zen Spa',
    client: 'Hệ thống Chăm sóc Sức khỏe & Thẩm mỹ Zen Spa',
    category: 'cleaning',
    location: 'Khu Đô Thị Phú Mỹ Hưng, Quận 7, TP. HCM',
    area: '250 m²',
    completionTime: 'Tháng 02/2026',
    description:
      'Nhận sửa chữa nhẹ nhàng phần sơn tường mốc ẩm mốc do khí hậu phía Nam, thay thế đèn rọi cũ và tiến hành bảo dưỡng tổng thể: Giặt sạch 45 giường thảm spa bằng công nghệ phun hút hơi nước nóng diệt khuẩn, đánh sàn đá Marble sảnh đón tiếp để tạo hương thơm thảo mộc tự nhiên dễ chịu.',
    achievement:
      'Spa lấy lại vẻ yên bình thanh thoát, khử sạch mùi ẩm và mang lại không gian sạch tuyệt đối cho khách hàng cao cấp.',
    imageUrl:
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
    tags: ['Giặt thảm sofa nước nóng', 'Sơn sửa chống mốc tường', 'Đánh bóng sàn sảnh'],
    testimonial: {
      author: 'Ms. Hoàng Thanh Vân',
      role: 'Giám đốc Điều hành Trung tâm',
      content:
        'Hơi nước nóng giặt xong thảm thơm lắm, tẩy được cả vết dầu tinh dầu sả lâu ngày. Khách hàng của chúng tôi khen không gian rất thoáng và sạch. Rất yên tâm lựa chọn dịch vụ trọn gói này định kỳ.',
      rating: 5,
    },
  },
]

const TESTIMONIALS: SourceTestimonial[] = [
  {
    id: 'testi_1',
    author: 'Anh Trần Minh Quân',
    role: 'Chủ Sáng lập Chuỗi Cafe Muối Sài Gòn',
    company: 'Chuỗi Café Muối Phong Cách Trẻ',
    content:
      'Tôi thích sự nhanh gọn bên các bạn. Từ lúc khảo sát mặt thô đến vẽ bản hiệu, đi dây điện và dọn rác xây dựng bàn giao chỉ mất đúng 8 ngày. Tiết kiệm được cả tuần tiền thuê mặt bằng showroom.',
    rating: 5,
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80',
    category: 'both',
  },
  {
    id: 'testi_2',
    author: 'Chị Nguyễn Thị Mai Anh',
    role: 'Giám đốc Hành chính Nhân sự',
    company: 'Tập Đoàn Tài Chính TechVN',
    content:
      'Đội ngũ vệ sinh kính bên này chuyên nghiệp. Đu dây kính tầng 15 cực kỳ gọn gàng, có rào chắn cảnh báo bên dưới, hồ sơ bảo hiểm nhân công cung cấp đầy đủ khiến ban quản lý toà nhà rất hài lòng và phê duyệt ngay.',
    rating: 5,
    avatarUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80',
    category: 'cleaning',
  },
  {
    id: 'testi_3',
    author: 'Anh Nguyễn Khắc Hiệp',
    role: 'Giám đốc Phát triển Mặt bằng',
    company: 'Chuỗi Cửa Hàng Thể Thao KingSport',
    content:
      'Trước giờ tôi mệt mỏi nhất là bàn giao shop xong thì phải đi tìm đội dọn vệ sinh nữa vì đội thợ xây thường dọn rất qua loa. Từ ngày hợp tác thi công trọn gói kèm vệ sinh sâu bên các bạn, tôi hoàn toàn rảnh tay đầu tư vào khâu vận hành.',
    rating: 5,
    avatarUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80',
    category: 'construction',
  },
]

// Defaults for the SiteSettings global. Mirror apps/web/src/data.ts
// DEFAULT_SETTINGS so a fresh CMS produces the same chrome the web app falls
// back to. Editors can then tweak any field individually in the admin UI.
const SITE_SETTINGS = {
  company: {
    name: 'CÔNG TY TNHH GREENORANGE - GIẢI PHÁP THI CÔNG & VỆ SINH DOANH NGHIỆP',
    shortName: 'GreenOrange Services',
    founded: '2019',
    phone: '',
    email: 'contact@greenorange.vn',
    address: 'Tầng 5, Tòa Nhà Sông Đà, Phạm Hùng, Mỹ Đình, Nam Từ Liêm, Hà Nội',
    branch: 'Chi nhánh Nam Bộ: 145 Điện Biên Phủ, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh',
    motto: 'Sạch sẽ từ gốc - Đẹp đẽ từ khâu dựng xây - Đồng hành tin cậy cùng doanh nghiệp Việt',
    certification:
      'Chứng nhận Hệ thống Quản lý Chất lượng ISO 9001:2015 & Đạt tiêu chuẩn Vệ sinh Môi trường Xanh Eco-Safe.',
  },
  social: { facebook: '', zalo: '', messenger: '' },
  branding: {
    logoTextPrimary: 'Green',
    logoTextSecondary: 'Orange',
    headerTagline: 'Thi Công & Vệ Sinh',
    footerTagline: 'Xây dựng & Dọn sạch',
  },
  navigation: {
    items: [
      { label: 'Giới Thiệu', sectionId: 'introduction' },
      { label: 'Dịch Vụ', sectionId: 'services' },
      { label: 'Dự Án Đã Làm', sectionId: 'projects' },
      { label: 'Đánh Giá', sectionId: 'testimonials' },
      { label: 'Liên Hệ', sectionId: 'contact' },
    ],
    headerCtaLabel: 'Đặt lịch khảo sát',
    mobileCtaLabel: 'Yêu cầu khảo sát miễn phí',
  },
  hero: {
    subheadline:
      'Hợp tác toàn diện 2-trong-1 thiết kế, cải tạo trần vách, ánh sáng rọi, mặt dựng Alu cho chuỗi showroom toàn quốc. Kết hợp gói dọn dẹp vệ sinh sâu bóc bụi mịn sơn bả trước giờ cắt băng bàn giao, giúp bạn sở hữu cửa hiệu sang trọng, sạch bóng tươm tất nhanh chóng nhất.',
  },
  stats: [
    { value: '500+', label: 'Cửa hàng & Văn phòng Đã Bàn Giao', color: 'text-green-600' },
    { value: '120+', label: 'Dự án Thi Công Cải Tạo Trọn Gói', color: 'text-orange-600' },
    { value: '99.4%', label: 'Khách Hàng Đánh Giá Hài Lòng 5★', color: 'text-green-600' },
    { value: '35+', label: 'Trang thiết bị & Hóa chất Đạt Chuẩn', color: 'text-orange-600' },
  ],
  footer: {
    brandDescription:
      'Đơn vị trọn gói uy tín hàng đầu cung cấp dịch vụ cải tạo, lắp đặt ánh sáng nội thất và vệ sinh bàn giao cho chuỗi retail, văn phòng và các thương hiệu cao cấp tại Việt Nam.',
    quickLinksHeading: 'Đường Dẫn Nhanh',
    quickLinks: [
      { label: 'Về chúng tôi', sectionId: 'introduction' },
      { label: 'Giải pháp dịch vụ', sectionId: 'services' },
      { label: 'Dự án tiêu biểu', sectionId: 'projects' },
      { label: 'Phản hồi khách hàng', sectionId: 'testimonials' },
      { label: 'Yêu cầu khảo sát', sectionId: 'contact' },
    ],
    officesHeading: 'Hệ Thống Văn Phòng',
    headquartersLabel: 'Trụ Sở Hà Nội:',
    branchLabel: 'Chi Nhánh TP. HCM:',
    supportHeading: 'Hỗ Trợ Trực Tuyến',
    hotlinePrefix: 'Hotline:',
    emailPrefix: 'Email:',
    copyrightSuffix: 'Tất cả các quyền được bảo lưu.',
    backToTopLabel: 'Về đầu trang',
  },
  seo: {
    metaTitle: 'GreenOrange - Dịch vụ Thi công, Cải tạo & Vệ sinh Cửa hàng Chuyên nghiệp',
    metaDescription: 'Dịch vụ Thi công, Cải tạo & Vệ sinh Cửa hàng Chuyên nghiệp',
  },
}

const seed = async () => {
  const payload = await getPayload({ config })

  // Generic upsert-by-slug helper keeps the script idempotent.
  const upsert = async (
    collection: 'services' | 'projects' | 'testimonials',
    slug: string,
    data: Record<string, unknown>,
  ) => {
    const existing = await payload.find({
      collection,
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
    })
    // `data` is built dynamically from the source arrays; cast to `never` so it
    // satisfies Payload's per-collection create/update overloads without `any`.
    // `_status: 'published'` makes seeded docs live immediately — these
    // collections have drafts enabled, and the public web only reads published.
    const published = { ...data, _status: 'published' }
    if (existing.docs.length > 0) {
      await payload.update({ collection, id: existing.docs[0].id, data: published as never })
      return 'updated'
    }
    await payload.create({ collection, data: published as never })
    return 'created'
  }

  let created = 0
  let updated = 0
  const tally = (result: string) => (result === 'created' ? created++ : updated++)

  for (const [i, s] of SERVICES.entries()) {
    tally(
      await upsert('services', s.id, {
        slug: s.id,
        title: s.title,
        description: s.description,
        category: s.category,
        duration: s.duration,
        benefits: s.benefits.map((item) => ({ item })),
        features: s.features.map((item) => ({ item })),
        iconName: s.iconName,
        popular: s.popular ?? false,
        order: i,
      }),
    )
  }

  for (const [i, p] of PROJECTS.entries()) {
    tally(
      await upsert('projects', p.id, {
        slug: p.id,
        title: p.title,
        client: p.client,
        category: p.category,
        location: p.location,
        area: p.area,
        completionTime: p.completionTime,
        description: p.description,
        achievement: p.achievement,
        imageUrl: p.imageUrl,
        tags: p.tags.map((item) => ({ item })),
        testimonial: p.testimonial
          ? {
              author: p.testimonial.author,
              role: p.testimonial.role,
              content: p.testimonial.content,
              avatarUrl: p.testimonial.avatarUrl ?? null,
              rating: p.testimonial.rating,
            }
          : undefined,
        order: i,
      }),
    )
  }

  for (const [i, t] of TESTIMONIALS.entries()) {
    tally(
      await upsert('testimonials', t.id, {
        slug: t.id,
        author: t.author,
        role: t.role,
        company: t.company,
        content: t.content,
        rating: t.rating,
        avatarUrl: t.avatarUrl,
        category: t.category,
        order: i,
      }),
    )
  }

  // Seed the SiteSettings global so a fresh CMS comes up with the same copy
  // the web app falls back to. `updateGlobal` is upsert-by-design.
  await payload.updateGlobal({
    slug: 'site-settings',
    data: SITE_SETTINGS as never,
  })
  payload.logger.info('Seed: site-settings global updated.')

  payload.logger.info(`Seed complete: ${created} created, ${updated} updated.`)
  process.exit(0)
}

await seed()

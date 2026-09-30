/**
 * Phase 3 — Content seed for the Green-Orange Directus CMS.
 *
 * Ports the old Payload seed (apps/cms/src/seed.ts) to Directus via the REST
 * API. Idempotent: content is upserted by `slug`; the site_settings singleton is
 * patched; its O2M child rows are reset (delete + recreate) each run. Remote
 * images are imported into the Directus file library (deduped per URL) only when
 * an item is first created, so re-runs don't pile up duplicate files.
 *
 * Run (Bun, per AGENTS.md):
 *   DIRECTUS_PUBLIC_URL=http://localhost:8055 \
 *   DIRECTUS_ADMIN_EMAIL=admin@example.com \
 *   DIRECTUS_ADMIN_PASSWORD=admin \
 *   bun apps/cms/seed/seed.ts
 */

const BASE = process.env.DIRECTUS_PUBLIC_URL ?? 'http://localhost:8055'
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL ?? 'admin@example.com'
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD ?? 'admin'

// Closed enums (per the frontend style guide — no inline string unions).
enum Category {
  CLEANING = 'cleaning',
  CONSTRUCTION = 'construction',
  BOTH = 'both',
}
enum ContentStatus {
  PUBLISHED = 'published',
  DRAFT = 'draft',
}

let token = ''

const api = async (method: string, path: string, body?: unknown): Promise<unknown> => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text}`)
  return text ? JSON.parse(text) : null
}

// ─── Source data (verbatim from the old Payload seed) ────────────────────────
interface SourceService {
  id: string
  title: string
  description: string
  category: Category
  duration: string
  benefits: string[]
  features: string[]
  iconName: string
  popular?: boolean
}
interface SourceProject {
  id: string
  title: string
  client: string
  category: Category
  location: string
  area: string
  completionTime: string
  description: string
  achievement: string
  imageUrl: string
  tags: string[]
  testimonial?: { author: string; role: string; content: string; rating: number }
}
interface SourceTestimonial {
  id: string
  author: string
  role: string
  company: string
  content: string
  rating: number
  avatarUrl: string
  category: Category
}

const SERVICES: SourceService[] = [
  {
    id: 'cleaning_deep',
    title: 'Vệ Sinh Sau Xây Dựng & Hậu Thi Công',
    description:
      'Xử lý triệt để bụi mịn thạch cao, keo silicon thừa, vết sơn bám và rác thải công nghiệp. Chuẩn bị bàn giao không gian sạch bóng, thơm mát sẵn sàng cho ngày khai trương cửa hàng.',
    category: Category.CLEANING,
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
    category: Category.CLEANING,
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
    category: Category.CLEANING,
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
    category: Category.CONSTRUCTION,
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
    category: Category.CONSTRUCTION,
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
    category: Category.CONSTRUCTION,
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
    category: Category.CONSTRUCTION,
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
    category: Category.CLEANING,
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
    category: Category.CONSTRUCTION,
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
    category: Category.CLEANING,
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
    category: Category.BOTH,
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
    category: Category.CLEANING,
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
    category: Category.CONSTRUCTION,
  },
]

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
    headerTagline: 'Thi công & vệ sinh',
    footerTagline: 'Xây dựng & dọn sạch',
  },
  typography: {
    headingFont: 'barlow-condensed',
    heroDisplayFont: 'barlow-condensed',
    bodyFont: 'be-vietnam-pro',
  },
  colorTheme: 'green-orange',
  navigation: {
    items: [
      { label: 'Giới thiệu', sectionId: 'introduction' },
      { label: 'Dịch vụ', sectionId: 'services' },
      { label: 'Dự án đã làm', sectionId: 'projects' },
      { label: 'Đánh giá', sectionId: 'testimonials' },
      { label: 'Liên hệ', sectionId: 'contact' },
    ],
    headerCtaLabel: 'Đặt lịch khảo sát',
    mobileCtaLabel: 'Yêu cầu khảo sát miễn phí',
  },
  hero: {
    trustBadge: 'Quản lý chất lượng theo chuẩn ISO 9001:2015',
    headlineSegments: [
      { text: 'Dựng xong là sạch,', color: 'white', italic: false, newLineBefore: false },
      { text: 'sạch xong là mở cửa.', color: 'orange', italic: false, newLineBefore: true },
    ],
    subheadline:
      'Anh/chị chỉ cần gọi, GreenOrange lo trọn từ thi công, lắp biển hiệu đến dọn dẹp sạch sẽ trước ngày khai trương.',
    benefits: [
      { item: 'Khảo sát và báo giá trong ngày, không mất phí' },
      { item: 'Báo giá rõ từng hạng mục, đã ký là không phát sinh' },
      { item: 'Thi công chuẩn kỹ thuật, bảo hành 12 tháng' },
      { item: 'Hoá chất an toàn cho nhân viên và khách' },
    ],
    primaryCta: { label: 'Đặt lịch khảo sát miễn phí', href: '#contact' },
    secondaryCta: { label: 'Xem dịch vụ', href: '#services' },
    trustStrap: 'Hà Nội · TP. Hồ Chí Minh · Nhận công trình toàn quốc',
  },
  stats: [
    { value: '500+', label: 'Cửa hàng & văn phòng đã bàn giao', color: 'text-green-600' },
    { value: '120+', label: 'Công trình cải tạo trọn gói', color: 'text-orange-600' },
    { value: '99.4%', label: 'Khách hàng đánh giá 5★', color: 'text-green-600' },
    { value: '35+', label: 'Trang thiết bị & hoá chất đạt chuẩn', color: 'text-orange-600' },
  ],
  introduction: {
    eyebrow: 'Về chúng mình',
    heading: 'Một đội lo cả dựng lẫn dọn',
    narrative:
      'Từ năm {founded}, GreenOrange làm hai việc cho các cửa hàng: thi công cải tạo và vệ sinh công nghiệp. Cùng một đội lo từ lúc dựng vách đến lúc lau sạch kính, nên anh/chị không phải tìm thêm bên dọn dẹp và cửa hàng luôn kịp ngày khai trương.',
    mottoEyebrow: 'Phương châm làm nghề',
    brandStoryHeading: 'Ba màu, ba lời hứa',
    brandStoryIntro:
      'Cam, trắng và xanh lá không chỉ là màu logo. Mỗi màu là một điều chúng mình hứa với anh/chị:',
    brandValues: [
      {
        title: 'Cam · Làm kỹ, làm nhiệt tình',
        description: 'Chăm chút từng đường điện, kệ tủ trưng bày và biển hiệu Alu.',
        icon: 'Wrench',
        accent: 'orange',
      },
      {
        title: 'Trắng · Sạch và minh bạch',
        description: 'Bàn giao sạch bóng, đúng hẹn, báo giá rõ ràng từ đầu.',
        icon: 'ShieldCheck',
        accent: 'slate',
      },
      {
        title: 'Xanh lá · An toàn',
        description: 'Dùng hoá chất sinh học, an toàn cho nhân viên và khách của anh/chị.',
        icon: 'Trees',
        accent: 'emerald',
      },
    ],
    processEyebrow: 'Quy trình',
    processHeading: '5 bước, anh/chị không phải lo',
    processIntro:
      'Thi công và dọn dẹp nối tiếp nhau, mặt bằng không phải chờ, cửa hàng mở đúng ngày.',
    processSteps: [
      {
        num: '01',
        title: 'Khảo sát miễn phí',
        description:
          'Có mặt trong 2 giờ sau khi anh/chị gọi, đo đạc tận nơi và xem kỹ hiện trạng mặt bằng.',
      },
      {
        num: '02',
        title: 'Báo giá rõ ràng',
        description:
          'Bóc tách từng hạng mục: vật tư, thiết bị điện, nhân công, hoá chất. Đã ký hợp đồng là không phát sinh.',
      },
      {
        num: '03',
        title: 'Thi công đúng hẹn',
        description:
          'Ốp Alu, dựng vách, sơn bả, đi điện chiếu sáng. Làm cả ca đêm nếu tòa nhà yêu cầu.',
      },
      {
        num: '04',
        title: 'Vệ sinh thật kỹ',
        description:
          'Mài sàn, hút bụi mịn, tẩy silicone trên kính, lau biển hiệu và khử mùi sơn mới.',
      },
      {
        num: '05',
        title: 'Nghiệm thu, bàn giao',
        description:
          'Kiểm tra từng chi tiết cùng anh/chị theo checklist, giao chìa khoá và bảo hành 12 tháng.',
      },
    ],
  },
  servicesSection: {
    eyebrow: 'Dịch vụ',
    heading: 'Chúng mình làm gì cho anh/chị',
    description:
      'Chọn riêng thi công, riêng vệ sinh, hoặc gộp trọn gói để tiết kiệm hơn và chỉ làm việc với một đầu mối.',
  },
  projectsSection: {
    eyebrow: 'Công trình đã làm',
    heading: 'Cửa hàng đã bàn giao',
    description:
      'Một số showroom, quán cà phê và cửa hàng chúng mình đã thi công và dọn sạch ở Hà Nội và TP. Hồ Chí Minh.',
  },
  testimonialsSection: {
    eyebrow: 'Khách hàng nói gì',
    heading: 'Chủ cửa hàng kể lại',
    description: 'Ý kiến từ các chủ cửa hàng đã làm việc cùng GreenOrange.',
  },
  footer: {
    brandDescription:
      'Thi công, cải tạo và vệ sinh cửa hàng trọn gói cho chuỗi bán lẻ, showroom và văn phòng trên toàn quốc.',
    quickLinksHeading: 'Xem nhanh',
    quickLinks: [
      { label: 'Về chúng tôi', sectionId: 'introduction' },
      { label: 'Giải pháp dịch vụ', sectionId: 'services' },
      { label: 'Dự án tiêu biểu', sectionId: 'projects' },
      { label: 'Phản hồi khách hàng', sectionId: 'testimonials' },
      { label: 'Yêu cầu khảo sát', sectionId: 'contact' },
    ],
    officesHeading: 'Văn phòng',
    headquartersLabel: 'Trụ sở chính:',
    branchLabel: 'Chi nhánh TP. HCM:',
    supportHeading: 'Liên hệ',
    hotlinePrefix: 'Hotline:',
    emailPrefix: 'Email:',
    copyrightSuffix: 'Tất cả các quyền được bảo lưu.',
    backToTopLabel: 'Về đầu trang',
  },
  seo: {
    metaTitle: 'GreenOrange – Thi công, cải tạo & vệ sinh cửa hàng',
    metaDescription:
      'Thi công, cải tạo và vệ sinh cửa hàng trọn gói. Khảo sát và báo giá trong ngày, miễn phí. Hà Nội, TP. Hồ Chí Minh và toàn quốc.',
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const imageCache = new Map<string, string>()

// Import a remote image into the Directus file library; dedupe per URL.
const importImage = async ({ url }: { url: string }): Promise<string> => {
  const cached = imageCache.get(url)
  if (cached) return cached
  const res = (await api('POST', '/files/import', { url })) as { data: { id: string } }
  imageCache.set(url, res.data.id)
  return res.data.id
}

const findIdBySlug = async ({
  collection,
  slug,
}: {
  collection: string
  slug: string
}): Promise<string | null> => {
  const res = (await api(
    'GET',
    `/items/${collection}?filter[slug][_eq]=${encodeURIComponent(slug)}&fields=id&limit=1`,
  )) as { data: { id: string }[] }
  return res.data[0]?.id ?? null
}

// Replace all rows of an O2M child collection for the singleton.
const resetChildren = async ({
  collection,
  settingsId,
  rows,
}: {
  collection: string
  settingsId: number
  rows: Record<string, unknown>[]
}): Promise<void> => {
  const existing = (await api('GET', `/items/${collection}?fields=id&limit=-1`)) as {
    data: { id: number }[]
  }
  const ids = existing.data.map((r) => r.id)
  if (ids.length > 0) await api('DELETE', `/items/${collection}`, ids)
  let sort = 0
  for (const row of rows) {
    await api('POST', `/items/${collection}`, { ...row, site_settings: settingsId, sort })
    sort += 1
  }
}

const main = async (): Promise<void> => {
  console.log(`Logging in to ${BASE}…`)
  const login = (await api('POST', '/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  })) as {
    data: { access_token: string }
  }
  token = login.data.access_token

  // ── Services ───────────────────────────────────────────────────────────────
  console.log('Seeding services…')
  for (const [i, s] of SERVICES.entries()) {
    const data = {
      slug: s.id,
      title: s.title,
      description: s.description,
      category: s.category,
      duration: s.duration,
      benefits: s.benefits,
      features: s.features,
      icon_name: s.iconName,
      popular: s.popular ?? false,
      status: ContentStatus.PUBLISHED,
      sort: i,
    }
    const id = await findIdBySlug({ collection: 'services', slug: s.id })
    if (id) await api('PATCH', `/items/services/${id}`, data)
    else await api('POST', '/items/services', data)
  }

  // ── Projects (import cover image on first create) ───────────────────────────
  console.log('Seeding projects…')
  for (const [i, p] of PROJECTS.entries()) {
    const base = {
      slug: p.id,
      title: p.title,
      client: p.client,
      category: p.category,
      location: p.location,
      area: p.area,
      completion_time: p.completionTime,
      description: p.description,
      achievement: p.achievement,
      tags: p.tags,
      testimonial_author: p.testimonial?.author ?? null,
      testimonial_role: p.testimonial?.role ?? null,
      testimonial_content: p.testimonial?.content ?? null,
      testimonial_rating: p.testimonial?.rating ?? null,
      status: ContentStatus.PUBLISHED,
      sort: i,
    }
    const id = await findIdBySlug({ collection: 'projects', slug: p.id })
    if (id) {
      await api('PATCH', `/items/projects/${id}`, base)
    } else {
      const image = await importImage({ url: p.imageUrl })
      await api('POST', '/items/projects', { ...base, image })
    }
  }

  // ── Testimonials (import avatar on first create) ────────────────────────────
  console.log('Seeding testimonials…')
  for (const [i, t] of TESTIMONIALS.entries()) {
    const base = {
      slug: t.id,
      author: t.author,
      role: t.role,
      company: t.company,
      content: t.content,
      rating: t.rating,
      category: t.category,
      status: ContentStatus.PUBLISHED,
      sort: i,
    }
    const id = await findIdBySlug({ collection: 'testimonials', slug: t.id })
    if (id) {
      await api('PATCH', `/items/testimonials/${id}`, base)
    } else {
      const avatar = await importImage({ url: t.avatarUrl })
      await api('POST', '/items/testimonials', { ...base, avatar })
    }
  }

  // ── site_settings singleton (flat fields) ───────────────────────────────────
  console.log('Seeding site_settings…')
  const s = SITE_SETTINGS
  await api('PATCH', '/items/site_settings', {
    company_name: s.company.name,
    company_short_name: s.company.shortName,
    company_founded: s.company.founded,
    company_phone: s.company.phone,
    company_email: s.company.email,
    company_address: s.company.address,
    company_branch: s.company.branch,
    company_motto: s.company.motto,
    company_certification: s.company.certification,
    social_facebook: s.social.facebook,
    social_zalo: s.social.zalo,
    social_messenger: s.social.messenger,
    branding_logo_text_primary: s.branding.logoTextPrimary,
    branding_logo_text_secondary: s.branding.logoTextSecondary,
    branding_header_tagline: s.branding.headerTagline,
    branding_footer_tagline: s.branding.footerTagline,
    navigation_header_cta_label: s.navigation.headerCtaLabel,
    navigation_mobile_cta_label: s.navigation.mobileCtaLabel,
    typography_heading_font: s.typography.headingFont,
    typography_hero_display_font: s.typography.heroDisplayFont,
    typography_body_font: s.typography.bodyFont,
    color_theme: s.colorTheme,
    hero_trust_badge: s.hero.trustBadge,
    hero_subheadline: s.hero.subheadline,
    hero_benefits: s.hero.benefits.map((b) => b.item),
    hero_primary_cta_label: s.hero.primaryCta.label,
    hero_primary_cta_href: s.hero.primaryCta.href,
    hero_secondary_cta_label: s.hero.secondaryCta.label,
    hero_secondary_cta_href: s.hero.secondaryCta.href,
    hero_trust_strap: s.hero.trustStrap,
    introduction_eyebrow: s.introduction.eyebrow,
    introduction_heading: s.introduction.heading,
    introduction_narrative: s.introduction.narrative,
    introduction_motto_eyebrow: s.introduction.mottoEyebrow,
    introduction_brand_story_heading: s.introduction.brandStoryHeading,
    introduction_brand_story_intro: s.introduction.brandStoryIntro,
    introduction_process_eyebrow: s.introduction.processEyebrow,
    introduction_process_heading: s.introduction.processHeading,
    introduction_process_intro: s.introduction.processIntro,
    services_section_eyebrow: s.servicesSection.eyebrow,
    services_section_heading: s.servicesSection.heading,
    services_section_description: s.servicesSection.description,
    projects_section_eyebrow: s.projectsSection.eyebrow,
    projects_section_heading: s.projectsSection.heading,
    projects_section_description: s.projectsSection.description,
    testimonials_section_eyebrow: s.testimonialsSection.eyebrow,
    testimonials_section_heading: s.testimonialsSection.heading,
    testimonials_section_description: s.testimonialsSection.description,
    footer_brand_description: s.footer.brandDescription,
    footer_quick_links_heading: s.footer.quickLinksHeading,
    footer_offices_heading: s.footer.officesHeading,
    footer_headquarters_label: s.footer.headquartersLabel,
    footer_branch_label: s.footer.branchLabel,
    footer_support_heading: s.footer.supportHeading,
    footer_hotline_prefix: s.footer.hotlinePrefix,
    footer_email_prefix: s.footer.emailPrefix,
    footer_copyright_suffix: s.footer.copyrightSuffix,
    footer_back_to_top_label: s.footer.backToTopLabel,
    seo_meta_title: s.seo.metaTitle,
    seo_meta_description: s.seo.metaDescription,
  })

  const settings = (await api('GET', '/items/site_settings?fields=id')) as { data: { id: number } }
  const settingsId = settings.data.id

  console.log('Seeding site_settings children…')
  await resetChildren({
    collection: 'site_nav_items',
    settingsId,
    rows: s.navigation.items.map((n) => ({ label: n.label, section_id: n.sectionId })),
  })
  await resetChildren({
    collection: 'site_footer_links',
    settingsId,
    rows: s.footer.quickLinks.map((n) => ({ label: n.label, section_id: n.sectionId })),
  })
  await resetChildren({
    collection: 'site_hero_segments',
    settingsId,
    rows: s.hero.headlineSegments.map((h) => ({
      text: h.text,
      color: h.color,
      italic: h.italic,
      new_line_before: h.newLineBefore,
    })),
  })
  await resetChildren({
    collection: 'site_stats',
    settingsId,
    rows: s.stats.map((st) => ({ value: st.value, label: st.label, color: st.color })),
  })
  await resetChildren({
    collection: 'site_brand_values',
    settingsId,
    rows: s.introduction.brandValues.map((b) => ({
      title: b.title,
      description: b.description,
      icon: b.icon,
      accent: b.accent,
    })),
  })
  await resetChildren({
    collection: 'site_process_steps',
    settingsId,
    rows: s.introduction.processSteps.map((p) => ({
      num: p.num,
      title: p.title,
      description: p.description,
    })),
  })

  console.log('\nSeed complete.')
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('\nSeed failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  })

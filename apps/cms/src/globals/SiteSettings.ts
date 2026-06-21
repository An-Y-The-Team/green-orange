import type { GlobalConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'

// Editable site-wide content the business owner controls without a code deploy:
// company contact details, headline stats, hero copy, branding text, nav links,
// footer columns, and SEO defaults. The web app reads this via
// GET /api/globals/site-settings and falls back to hardcoded defaults
// (apps/web/src/data.ts) if the global is empty/unreachable.
//
// Intentionally NOT drafts-enabled: settings (phone, address, stats) should go
// live the moment they're saved, not wait behind a separate publish step. Only
// admins can edit them.

// Options for nav/footer section-anchor pickers. Must stay in sync with
// apps/web/src/constants/section.ts (SectionId enum).
const SECTION_OPTIONS = [
  { label: { en: 'Hero', vi: 'Trang chủ' }, value: 'hero' },
  { label: { en: 'Introduction', vi: 'Giới thiệu' }, value: 'introduction' },
  { label: { en: 'Services', vi: 'Dịch vụ' }, value: 'services' },
  { label: { en: 'Projects', vi: 'Dự án' }, value: 'projects' },
  { label: { en: 'Testimonials', vi: 'Đánh giá' }, value: 'testimonials' },
  { label: { en: 'Contact', vi: 'Liên hệ' }, value: 'contact' },
] as const

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: { en: 'Site Settings', vi: 'Cài đặt trang' },
  access: {
    read: () => true,
    update: isAdmin,
  },
  admin: {
    group: { en: 'Settings', vi: 'Cài đặt' },
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: { en: 'Company', vi: 'Công ty' },
          fields: [
            {
              name: 'company',
              type: 'group',
              fields: [
                {
                  name: 'name',
                  type: 'text',
                  label: { en: 'Company Name', vi: 'Tên công ty' },
                  admin: {
                    description: {
                      en: 'Full legal company name.',
                      vi: 'Tên pháp lý đầy đủ của công ty.',
                    },
                  },
                },
                {
                  name: 'shortName',
                  type: 'text',
                  label: { en: 'Short Name', vi: 'Tên viết tắt' },
                },
                {
                  name: 'founded',
                  type: 'text',
                  label: { en: 'Founded', vi: 'Năm thành lập' },
                  admin: {
                    description: {
                      en: 'Year founded, e.g. "2019".',
                      vi: 'Năm thành lập, ví dụ: "2019".',
                    },
                  },
                },
                {
                  name: 'phone',
                  type: 'text',
                  label: { en: 'Phone', vi: 'Số điện thoại' },
                  admin: {
                    description: {
                      en: 'Primary contact number — the main call-to-action channel.',
                      vi: 'Số liên hệ chính — kênh liên lạc chủ đạo.',
                    },
                  },
                },
                {
                  name: 'email',
                  type: 'text',
                  label: { en: 'Email', vi: 'Email' },
                },
                {
                  name: 'address',
                  type: 'textarea',
                  label: { en: 'Address', vi: 'Địa chỉ' },
                  admin: {
                    description: {
                      en: 'Head office address.',
                      vi: 'Địa chỉ trụ sở chính.',
                    },
                  },
                },
                {
                  name: 'branch',
                  type: 'textarea',
                  label: { en: 'Branch', vi: 'Chi nhánh' },
                  admin: {
                    description: {
                      en: 'Secondary branch address.',
                      vi: 'Địa chỉ chi nhánh.',
                    },
                  },
                },
                {
                  name: 'motto',
                  type: 'textarea',
                  label: { en: 'Motto', vi: 'Phương châm' },
                },
                {
                  name: 'certification',
                  type: 'textarea',
                  label: { en: 'Certification', vi: 'Chứng nhận' },
                },
              ],
            },
            {
              name: 'social',
              type: 'group',
              label: { en: 'Social Links', vi: 'Liên kết mạng xã hội' },
              admin: {
                description: {
                  en: 'Optional social / messaging links — rendered as icons in the footer when set.',
                  vi: 'Liên kết mạng xã hội / nhắn tin (tùy chọn) — hiển thị dưới dạng biểu tượng ở chân trang.',
                },
              },
              fields: [
                {
                  name: 'facebook',
                  type: 'text',
                  label: { en: 'Facebook', vi: 'Facebook' },
                },
                {
                  name: 'zalo',
                  type: 'text',
                  label: { en: 'Zalo', vi: 'Zalo' },
                },
                {
                  name: 'messenger',
                  type: 'text',
                  label: { en: 'Messenger', vi: 'Messenger' },
                },
              ],
            },
          ],
        },
        {
          label: { en: 'Branding & Nav', vi: 'Thương hiệu & Điều hướng' },
          fields: [
            {
              name: 'branding',
              type: 'group',
              label: { en: 'Branding', vi: 'Thương hiệu' },
              admin: {
                description: {
                  en: 'Wordmark text and short taglines shown in the header and footer.',
                  vi: 'Chữ thương hiệu và khẩu hiệu ngắn hiển thị ở đầu và chân trang.',
                },
              },
              fields: [
                {
                  name: 'logoTextPrimary',
                  type: 'text',
                  label: { en: 'Logo Text (Primary)', vi: 'Chữ logo (phần 1)' },
                  admin: {
                    description: {
                      en: 'First half of the wordmark, e.g. "Green".',
                      vi: 'Phần đầu của chữ thương hiệu, ví dụ: "Green".',
                    },
                  },
                },
                {
                  name: 'logoTextSecondary',
                  type: 'text',
                  label: { en: 'Logo Text (Secondary)', vi: 'Chữ logo (phần 2)' },
                  admin: {
                    description: {
                      en: 'Second half of the wordmark, e.g. "Orange".',
                      vi: 'Phần sau của chữ thương hiệu, ví dụ: "Orange".',
                    },
                  },
                },
                {
                  name: 'headerTagline',
                  type: 'text',
                  label: { en: 'Header Tagline', vi: 'Khẩu hiệu đầu trang' },
                  admin: {
                    description: {
                      en: 'Small line under the logo in the header.',
                      vi: 'Dòng nhỏ dưới logo ở đầu trang.',
                    },
                  },
                },
                {
                  name: 'footerTagline',
                  type: 'text',
                  label: { en: 'Footer Tagline', vi: 'Khẩu hiệu chân trang' },
                  admin: {
                    description: {
                      en: 'Small line under the logo in the footer.',
                      vi: 'Dòng nhỏ dưới logo ở chân trang.',
                    },
                  },
                },
              ],
            },
            {
              name: 'navigation',
              type: 'group',
              label: { en: 'Navigation', vi: 'Điều hướng' },
              admin: {
                description: {
                  en: 'Primary navigation links and header CTAs.',
                  vi: 'Liên kết điều hướng chính và nút kêu gọi hành động.',
                },
              },
              fields: [
                {
                  name: 'items',
                  type: 'array',
                  label: { en: 'Nav Items', vi: 'Mục điều hướng' },
                  admin: {
                    description: {
                      en: 'Links shown in the desktop nav and mobile drawer.',
                      vi: 'Liên kết hiển thị trên thanh điều hướng desktop và menu di động.',
                    },
                  },
                  fields: [
                    {
                      name: 'label',
                      type: 'text',
                      required: true,
                      label: { en: 'Label', vi: 'Nhãn' },
                    },
                    {
                      name: 'sectionId',
                      type: 'select',
                      required: true,
                      options: [...SECTION_OPTIONS],
                      label: { en: 'Section', vi: 'Phần' },
                      admin: {
                        description: {
                          en: 'Page section this link scrolls to.',
                          vi: 'Phần trang mà liên kết này cuộn đến.',
                        },
                      },
                    },
                  ],
                },
                {
                  name: 'headerCtaLabel',
                  type: 'text',
                  label: { en: 'Header CTA Label', vi: 'Nhãn nút đầu trang' },
                  admin: {
                    description: {
                      en: 'Desktop header button label.',
                      vi: 'Nhãn nút trên đầu trang desktop.',
                    },
                  },
                },
                {
                  name: 'mobileCtaLabel',
                  type: 'text',
                  label: { en: 'Mobile CTA Label', vi: 'Nhãn nút di động' },
                  admin: {
                    description: {
                      en: 'Mobile drawer button label (typically longer).',
                      vi: 'Nhãn nút trên menu di động (thường dài hơn).',
                    },
                  },
                },
              ],
            },
          ],
        },
        {
          label: { en: 'Typography', vi: 'Kiểu chữ' },
          fields: [
            {
              name: 'typography',
              type: 'group',
              label: { en: 'Font settings', vi: 'Cài đặt font' },
              admin: {
                description: {
                  en: 'Font family for headings, the hero display headline, and body text. Changes apply site-wide on the next request.',
                  vi: 'Phông chữ cho tiêu đề, dòng tiêu đề lớn ở khu vực Hero, và nội dung. Thay đổi áp dụng cho toàn site ở lần tải kế tiếp.',
                },
              },
              fields: [
                {
                  name: 'headingFont',
                  type: 'select',
                  required: true,
                  defaultValue: 'playfair-display',
                  label: { en: 'Heading Font', vi: 'Phông tiêu đề' },
                  admin: {
                    description: {
                      en: 'Applied to all section headings (h2/h3/h4) via the font-heading utility.',
                      vi: 'Áp dụng cho tất cả tiêu đề mục (h2/h3/h4) qua tiện ích font-heading.',
                    },
                  },
                  options: [
                    {
                      label: { en: 'Be Vietnam Pro (sans)', vi: 'Be Vietnam Pro (sans)' },
                      value: 'be-vietnam-pro',
                    },
                    { label: { en: 'Manrope (sans)', vi: 'Manrope (sans)' }, value: 'manrope' },
                    {
                      label: { en: 'Playfair Display (serif)', vi: 'Playfair Display (serif)' },
                      value: 'playfair-display',
                    },
                    { label: { en: 'Lora (serif)', vi: 'Lora (serif)' }, value: 'lora' },
                  ],
                },
                {
                  name: 'heroDisplayFont',
                  type: 'select',
                  required: true,
                  defaultValue: 'lora',
                  label: { en: 'Hero Display Font', vi: 'Phông Hero' },
                  admin: {
                    description: {
                      en: 'Applied to the hero h1 + stat numbers via the font-serif utility. Should pair with the heading font.',
                      vi: 'Áp dụng cho dòng tiêu đề h1 và các con số thống kê ở Hero, qua tiện ích font-serif.',
                    },
                  },
                  options: [
                    {
                      label: { en: 'Playfair Display (serif)', vi: 'Playfair Display (serif)' },
                      value: 'playfair-display',
                    },
                    { label: { en: 'Lora (serif)', vi: 'Lora (serif)' }, value: 'lora' },
                    {
                      label: { en: 'DM Serif Display (serif)', vi: 'DM Serif Display (serif)' },
                      value: 'dm-serif-display',
                    },
                  ],
                },
                {
                  name: 'bodyFont',
                  type: 'select',
                  required: true,
                  defaultValue: 'lora',
                  label: { en: 'Body Font', vi: 'Phông nội dung' },
                  admin: {
                    description: {
                      en: 'Applied to paragraphs and UI labels via the font-sans utility. Be Vietnam Pro has the best Vietnamese diacritic rendering.',
                      vi: 'Áp dụng cho đoạn văn và nhãn UI qua tiện ích font-sans. Be Vietnam Pro hiển thị dấu tiếng Việt tốt nhất.',
                    },
                  },
                  options: [
                    {
                      label: { en: 'Be Vietnam Pro', vi: 'Be Vietnam Pro' },
                      value: 'be-vietnam-pro',
                    },
                    { label: { en: 'Inter', vi: 'Inter' }, value: 'inter' },
                    { label: { en: 'Lexend', vi: 'Lexend' }, value: 'lexend' },
                    { label: { en: 'Nunito Sans', vi: 'Nunito Sans' }, value: 'nunito-sans' },
                    { label: { en: 'Lora', vi: 'Lora' }, value: 'lora' },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: { en: 'Hero', vi: 'Trang chủ' },
          fields: [
            {
              name: 'hero',
              type: 'group',
              label: { en: 'Hero', vi: 'Phần hero' },
              admin: {
                description: {
                  en: 'Landing hero section copy, headline, CTAs, and benefits.',
                  vi: 'Nội dung phần hero trang chủ: tiêu đề, nút kêu gọi hành động và lợi ích.',
                },
              },
              fields: [
                {
                  name: 'backgroundImage',
                  type: 'upload',
                  relationTo: 'media',
                  label: { en: 'Background Image', vi: 'Ảnh nền' },
                  admin: {
                    description: {
                      en: 'Full-bleed background photo behind the hero card. Leave empty to fall back to the default Unsplash photo.',
                      vi: 'Ảnh nền toàn trang phía sau thẻ hero. Để trống để dùng ảnh mặc định từ Unsplash.',
                    },
                  },
                },
                {
                  name: 'trustBadge',
                  type: 'text',
                  label: { en: 'Trust Badge', vi: 'Huy hiệu uy tín' },
                  admin: {
                    description: {
                      en: 'Pill label above the headline (e.g. "Tiêu chuẩn quốc tế ISO 9001:2015 ...").',
                      vi: 'Nhãn nhỏ phía trên tiêu đề (ví dụ: "Tiêu chuẩn quốc tế ISO 9001:2015 ...").',
                    },
                  },
                },
                {
                  name: 'headlineSegments',
                  type: 'array',
                  label: { en: 'Headline Segments', vi: 'Đoạn tiêu đề' },
                  admin: {
                    description: {
                      en: 'The decorated multi-line headline, broken into colored pieces. The renderer will join segments with a space and respect "new line before".',
                      vi: 'Tiêu đề nhiều dòng, chia thành các đoạn có màu. Trình hiển thị sẽ nối các đoạn bằng khoảng trắng và tôn trọng "xuống dòng trước".',
                    },
                  },
                  fields: [
                    {
                      name: 'text',
                      type: 'text',
                      required: true,
                      label: { en: 'Text', vi: 'Nội dung' },
                    },
                    {
                      name: 'color',
                      type: 'select',
                      required: true,
                      defaultValue: 'white',
                      label: { en: 'Color', vi: 'Màu sắc' },
                      options: [
                        { label: { en: 'White (plain)', vi: 'Trắng (thường)' }, value: 'white' },
                        {
                          label: { en: 'Emerald (brand)', vi: 'Xanh ngọc (thương hiệu)' },
                          value: 'emerald',
                        },
                        {
                          label: { en: 'Orange (brand)', vi: 'Cam (thương hiệu)' },
                          value: 'orange',
                        },
                      ],
                    },
                    {
                      name: 'italic',
                      type: 'checkbox',
                      label: { en: 'Italic', vi: 'In nghiêng' },
                      admin: {
                        description: {
                          en: 'Render this segment in italic.',
                          vi: 'Hiển thị đoạn này dạng in nghiêng.',
                        },
                      },
                    },
                    {
                      name: 'newLineBefore',
                      type: 'checkbox',
                      label: { en: 'New Line Before', vi: 'Xuống dòng trước' },
                      admin: {
                        description: {
                          en: 'Start a new line before this segment.',
                          vi: 'Bắt đầu dòng mới trước đoạn này.',
                        },
                      },
                    },
                  ],
                },
                {
                  name: 'subheadline',
                  type: 'textarea',
                  label: { en: 'Subheadline', vi: 'Phụ đề' },
                  admin: {
                    description: {
                      en: 'The paragraph under the main hero heading.',
                      vi: 'Đoạn văn dưới tiêu đề hero chính.',
                    },
                  },
                },
                {
                  name: 'benefits',
                  type: 'array',
                  label: { en: 'Benefits', vi: 'Lợi ích' },
                  admin: {
                    description: {
                      en: 'Selling points shown in the 2x2 grid inside the hero card.',
                      vi: 'Điểm bán hàng hiển thị trong lưới 2x2 bên trong thẻ hero.',
                    },
                  },
                  fields: [
                    {
                      name: 'item',
                      type: 'text',
                      required: true,
                      label: { en: 'Item', vi: 'Mục' },
                    },
                  ],
                },
                {
                  name: 'primaryCta',
                  type: 'group',
                  label: { en: 'Primary CTA', vi: 'Nút chính' },
                  admin: {
                    description: {
                      en: 'Filled orange button.',
                      vi: 'Nút cam nổi bật.',
                    },
                  },
                  fields: [
                    {
                      name: 'label',
                      type: 'text',
                      label: { en: 'Label', vi: 'Nhãn' },
                    },
                    {
                      name: 'href',
                      type: 'text',
                      label: { en: 'Link', vi: 'Liên kết' },
                      admin: {
                        description: {
                          en: 'Anchor like "#contact" or an external URL.',
                          vi: 'Liên kết neo như "#contact" hoặc URL bên ngoài.',
                        },
                      },
                    },
                  ],
                },
                {
                  name: 'secondaryCta',
                  type: 'group',
                  label: { en: 'Secondary CTA', vi: 'Nút phụ' },
                  admin: {
                    description: {
                      en: 'Outline button next to the primary CTA.',
                      vi: 'Nút viền bên cạnh nút chính.',
                    },
                  },
                  fields: [
                    {
                      name: 'label',
                      type: 'text',
                      label: { en: 'Label', vi: 'Nhãn' },
                    },
                    {
                      name: 'href',
                      type: 'text',
                      label: { en: 'Link', vi: 'Liên kết' },
                    },
                  ],
                },
                {
                  name: 'trustStrap',
                  type: 'textarea',
                  label: { en: 'Trust Strap', vi: 'Dòng cam kết' },
                  admin: {
                    description: {
                      en: 'Mini line below the CTAs (e.g. "Cam kết đồng hành tin cậy...").',
                      vi: 'Dòng nhỏ dưới các nút (ví dụ: "Cam kết đồng hành tin cậy...").',
                    },
                  },
                },
              ],
            },
            {
              name: 'stats',
              type: 'array',
              label: { en: 'Stats', vi: 'Thống kê' },
              admin: {
                description: {
                  en: 'Headline counters (e.g. "500+" projects delivered).',
                  vi: 'Bộ đếm nổi bật (ví dụ: "500+" dự án đã bàn giao).',
                },
              },
              fields: [
                {
                  name: 'value',
                  type: 'text',
                  required: true,
                  label: { en: 'Value', vi: 'Giá trị' },
                  admin: {
                    description: {
                      en: 'e.g. "500+"',
                      vi: 'ví dụ: "500+"',
                    },
                  },
                },
                {
                  name: 'label',
                  type: 'text',
                  required: true,
                  label: { en: 'Label', vi: 'Nhãn' },
                },
                {
                  name: 'color',
                  type: 'text',
                  label: { en: 'Color', vi: 'Màu sắc' },
                  admin: {
                    description: {
                      en: 'Tailwind text-color class, e.g. "text-green-600".',
                      vi: 'Lớp màu chữ Tailwind, ví dụ: "text-green-600".',
                    },
                  },
                },
              ],
            },
          ],
        },
        {
          label: { en: 'Introduction', vi: 'Giới thiệu' },
          fields: [
            {
              name: 'introduction',
              type: 'group',
              label: { en: 'Introduction', vi: 'Giới thiệu' },
              admin: {
                description: {
                  en: 'Company introduction section: brand story, brand-color meanings, and the 5-step process.',
                  vi: 'Phần giới thiệu công ty: câu chuyện thương hiệu, ý nghĩa màu sắc và quy trình 5 bước.',
                },
              },
              fields: [
                {
                  name: 'eyebrow',
                  type: 'text',
                  label: { en: 'Eyebrow', vi: 'Tiêu đề phụ' },
                  admin: {
                    description: {
                      en: 'Small label above the heading.',
                      vi: 'Nhãn nhỏ phía trên tiêu đề.',
                    },
                  },
                },
                {
                  name: 'heading',
                  type: 'text',
                  label: { en: 'Heading', vi: 'Tiêu đề' },
                },
                {
                  name: 'narrative',
                  type: 'textarea',
                  label: { en: 'Narrative', vi: 'Câu chuyện' },
                  admin: {
                    description: {
                      en: 'Long company-narrative paragraph. Use **text** for bold; the placeholder {founded} expands to the founding year from Company tab.',
                      vi: 'Đoạn kể chuyện công ty. Dùng **chữ** để in đậm; chỗ giữ {founded} sẽ được thay bằng năm thành lập từ tab Công ty.',
                    },
                  },
                },
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  label: { en: 'Image', vi: 'Hình ảnh' },
                  admin: {
                    description: {
                      en: 'Square photo shown next to the brand-color story.',
                      vi: 'Ảnh vuông hiển thị bên cạnh câu chuyện màu thương hiệu.',
                    },
                  },
                },
                {
                  name: 'mottoEyebrow',
                  type: 'text',
                  label: { en: 'Motto Eyebrow', vi: 'Tiêu đề phương châm' },
                  admin: {
                    description: {
                      en: 'Label above the motto overlay on the photo (e.g. "Phương châm làm nghề").',
                      vi: 'Nhãn phía trên phương châm trên ảnh (ví dụ: "Phương châm làm nghề").',
                    },
                  },
                },
                {
                  name: 'brandStoryHeading',
                  type: 'text',
                  label: { en: 'Brand Story Heading', vi: 'Tiêu đề câu chuyện thương hiệu' },
                  admin: {
                    description: {
                      en: 'Heading next to the photo.',
                      vi: 'Tiêu đề bên cạnh ảnh.',
                    },
                  },
                },
                {
                  name: 'brandStoryIntro',
                  type: 'textarea',
                  label: { en: 'Brand Story Intro', vi: 'Giới thiệu câu chuyện thương hiệu' },
                  admin: {
                    description: {
                      en: 'Paragraph under the brand-story heading.',
                      vi: 'Đoạn văn dưới tiêu đề câu chuyện thương hiệu.',
                    },
                  },
                },
                {
                  name: 'brandValues',
                  type: 'array',
                  label: { en: 'Brand Values', vi: 'Giá trị thương hiệu' },
                  admin: {
                    description: {
                      en: 'The three brand colors and the meaning each represents. Recommend exactly 3 entries.',
                      vi: 'Ba màu thương hiệu và ý nghĩa của mỗi màu. Nên có đúng 3 mục.',
                    },
                  },
                  fields: [
                    {
                      name: 'title',
                      type: 'text',
                      required: true,
                      label: { en: 'Title', vi: 'Tiêu đề' },
                    },
                    {
                      name: 'description',
                      type: 'textarea',
                      required: true,
                      label: { en: 'Description', vi: 'Mô tả' },
                    },
                    {
                      name: 'icon',
                      type: 'select',
                      required: true,
                      label: { en: 'Icon', vi: 'Biểu tượng' },
                      options: [
                        { label: { en: 'Wrench', vi: 'Cờ lê' }, value: 'Wrench' },
                        {
                          label: { en: 'ShieldCheck', vi: 'Khiên kiểm tra' },
                          value: 'ShieldCheck',
                        },
                        { label: { en: 'Trees', vi: 'Cây xanh' }, value: 'Trees' },
                      ],
                    },
                    {
                      name: 'accent',
                      type: 'select',
                      required: true,
                      label: { en: 'Accent Color', vi: 'Màu nhấn' },
                      options: [
                        { label: { en: 'Orange', vi: 'Cam' }, value: 'orange' },
                        { label: { en: 'Slate', vi: 'Xám' }, value: 'slate' },
                        { label: { en: 'Emerald', vi: 'Xanh ngọc' }, value: 'emerald' },
                      ],
                    },
                  ],
                },
                {
                  name: 'processEyebrow',
                  type: 'text',
                  label: { en: 'Process Eyebrow', vi: 'Tiêu đề phụ quy trình' },
                  admin: {
                    description: {
                      en: 'Label above the process heading (e.g. "Khép kín & Hoàn hảo").',
                      vi: 'Nhãn phía trên tiêu đề quy trình (ví dụ: "Khép kín & Hoàn hảo").',
                    },
                  },
                },
                {
                  name: 'processHeading',
                  type: 'text',
                  label: { en: 'Process Heading', vi: 'Tiêu đề quy trình' },
                },
                {
                  name: 'processIntro',
                  type: 'textarea',
                  label: { en: 'Process Intro', vi: 'Giới thiệu quy trình' },
                },
                {
                  name: 'processSteps',
                  type: 'array',
                  label: { en: 'Process Steps', vi: 'Các bước quy trình' },
                  admin: {
                    description: {
                      en: 'Service-delivery process steps. Recommend exactly 5 entries.',
                      vi: 'Các bước quy trình cung cấp dịch vụ. Nên có đúng 5 mục.',
                    },
                  },
                  fields: [
                    {
                      name: 'num',
                      type: 'text',
                      required: true,
                      label: { en: 'Step Number', vi: 'Số bước' },
                      admin: {
                        description: {
                          en: 'Two-digit string e.g. "01".',
                          vi: 'Chuỗi hai chữ số, ví dụ: "01".',
                        },
                      },
                    },
                    {
                      name: 'title',
                      type: 'text',
                      required: true,
                      label: { en: 'Title', vi: 'Tiêu đề' },
                    },
                    {
                      name: 'description',
                      type: 'textarea',
                      required: true,
                      label: { en: 'Description', vi: 'Mô tả' },
                    },
                  ],
                },
              ],
            },
          ],
        },
        // ── Services Section ─────────────────────────────────────
        {
          label: { en: 'Services', vi: 'Dịch vụ' },
          fields: [
            {
              name: 'servicesSection',
              type: 'group',
              label: { en: 'Services Section', vi: 'Phần dịch vụ' },
              admin: {
                description: {
                  en: 'Section heading copy for the Services catalog.',
                  vi: 'Nội dung tiêu đề phần Dịch vụ.',
                },
              },
              fields: [
                {
                  name: 'eyebrow',
                  type: 'text',
                  label: { en: 'Eyebrow', vi: 'Tiêu đề phụ' },
                  admin: {
                    description: {
                      en: 'Small badge label above the heading (e.g. "Danh Mục Giải Pháp").',
                      vi: 'Nhãn nhỏ phía trên tiêu đề (ví dụ: "Danh Mục Giải Pháp").',
                    },
                  },
                },
                {
                  name: 'heading',
                  type: 'text',
                  label: { en: 'Heading', vi: 'Tiêu đề' },
                  admin: {
                    description: {
                      en: 'Main section heading (e.g. "Dịch Vụ Thi Công & Vệ Sinh Chuyên Sâu").',
                      vi: 'Tiêu đề chính (ví dụ: "Dịch Vụ Thi Công & Vệ Sinh Chuyên Sâu").',
                    },
                  },
                },
                {
                  name: 'description',
                  type: 'textarea',
                  label: { en: 'Description', vi: 'Mô tả' },
                  admin: {
                    description: {
                      en: 'Paragraph under the heading describing the service offering.',
                      vi: 'Đoạn văn dưới tiêu đề mô tả dịch vụ.',
                    },
                  },
                },
              ],
            },
          ],
        },
        // ── Projects Section ─────────────────────────────────────
        {
          label: { en: 'Projects', vi: 'Dự án' },
          fields: [
            {
              name: 'projectsSection',
              type: 'group',
              label: { en: 'Projects Section', vi: 'Phần dự án' },
              admin: {
                description: {
                  en: 'Section heading copy for the Projects gallery.',
                  vi: 'Nội dung tiêu đề phần Dự án.',
                },
              },
              fields: [
                {
                  name: 'eyebrow',
                  type: 'text',
                  label: { en: 'Eyebrow', vi: 'Tiêu đề phụ' },
                  admin: {
                    description: {
                      en: 'Small badge label above the heading (e.g. "Hồ Sơ Năng Lực Real").',
                      vi: 'Nhãn nhỏ phía trên tiêu đề (ví dụ: "Hồ Sơ Năng Lực Real").',
                    },
                  },
                },
                {
                  name: 'heading',
                  type: 'text',
                  label: { en: 'Heading', vi: 'Tiêu đề' },
                  admin: {
                    description: {
                      en: 'Main section heading (e.g. "Dự Án Đã Bàn Giao Thành Công").',
                      vi: 'Tiêu đề chính (ví dụ: "Dự Án Đã Bàn Giao Thành Công").',
                    },
                  },
                },
                {
                  name: 'description',
                  type: 'textarea',
                  label: { en: 'Description', vi: 'Mô tả' },
                  admin: {
                    description: {
                      en: 'Paragraph under the heading describing the projects portfolio.',
                      vi: 'Đoạn văn dưới tiêu đề mô tả danh mục dự án.',
                    },
                  },
                },
              ],
            },
          ],
        },
        // ── Testimonials Section ─────────────────────────────────
        {
          label: { en: 'Testimonials', vi: 'Đánh giá' },
          fields: [
            {
              name: 'testimonialsSection',
              type: 'group',
              label: { en: 'Testimonials Section', vi: 'Phần đánh giá' },
              admin: {
                description: {
                  en: 'Section heading copy for the Testimonials section.',
                  vi: 'Nội dung tiêu đề phần Đánh giá.',
                },
              },
              fields: [
                {
                  name: 'eyebrow',
                  type: 'text',
                  label: { en: 'Eyebrow', vi: 'Tiêu đề phụ' },
                  admin: {
                    description: {
                      en: 'Small badge label above the heading (e.g. "Ý Kiến Đối Tác").',
                      vi: 'Nhãn nhỏ phía trên tiêu đề (ví dụ: "Ý Kiến Đối Tác").',
                    },
                  },
                },
                {
                  name: 'heading',
                  type: 'text',
                  label: { en: 'Heading', vi: 'Tiêu đề' },
                  admin: {
                    description: {
                      en: 'Main section heading (e.g. "Đánh Giá Từ Khách Hàng Đã Trải Nghiệm").',
                      vi: 'Tiêu đề chính (ví dụ: "Đánh Giá Từ Khách Hàng Đã Trải Nghiệm").',
                    },
                  },
                },
                {
                  name: 'description',
                  type: 'textarea',
                  label: { en: 'Description', vi: 'Mô tả' },
                  admin: {
                    description: {
                      en: 'Paragraph under the heading describing customer feedback.',
                      vi: 'Đoạn văn dưới tiêu đề mô tả phản hồi khách hàng.',
                    },
                  },
                },
              ],
            },
          ],
        },
        // ── Footer ─────────────────────────────────────────────
        {
          label: { en: 'Footer', vi: 'Chân trang' },
          fields: [
            {
              name: 'footer',
              type: 'group',
              label: { en: 'Footer', vi: 'Chân trang' },
              admin: {
                description: {
                  en: 'Footer copy, column headings, and quick links.',
                  vi: 'Nội dung chân trang, tiêu đề cột và liên kết nhanh.',
                },
              },
              fields: [
                {
                  name: 'brandDescription',
                  type: 'textarea',
                  label: { en: 'Brand Description', vi: 'Mô tả thương hiệu' },
                  admin: {
                    description: {
                      en: 'Short paragraph under the footer logo.',
                      vi: 'Đoạn ngắn dưới logo chân trang.',
                    },
                  },
                },
                {
                  name: 'quickLinksHeading',
                  type: 'text',
                  label: { en: 'Quick Links Heading', vi: 'Tiêu đề liên kết nhanh' },
                  admin: {
                    description: {
                      en: 'Heading above the quick-links column.',
                      vi: 'Tiêu đề phía trên cột liên kết nhanh.',
                    },
                  },
                },
                {
                  name: 'quickLinks',
                  type: 'array',
                  label: { en: 'Quick Links', vi: 'Liên kết nhanh' },
                  admin: {
                    description: {
                      en: 'Anchor links listed in the quick-links column.',
                      vi: 'Liên kết neo liệt kê trong cột liên kết nhanh.',
                    },
                  },
                  fields: [
                    {
                      name: 'label',
                      type: 'text',
                      required: true,
                      label: { en: 'Label', vi: 'Nhãn' },
                    },
                    {
                      name: 'sectionId',
                      type: 'select',
                      required: true,
                      options: [...SECTION_OPTIONS],
                      label: { en: 'Section', vi: 'Phần' },
                    },
                  ],
                },
                {
                  name: 'officesHeading',
                  type: 'text',
                  label: { en: 'Offices Heading', vi: 'Tiêu đề văn phòng' },
                  admin: {
                    description: {
                      en: 'Heading above the addresses column.',
                      vi: 'Tiêu đề phía trên cột địa chỉ.',
                    },
                  },
                },
                {
                  name: 'headquartersLabel',
                  type: 'text',
                  label: { en: 'Headquarters Label', vi: 'Nhãn trụ sở chính' },
                  admin: {
                    description: {
                      en: 'Label above the head-office address (e.g. "Trụ sở chính:").',
                      vi: 'Nhãn phía trên địa chỉ trụ sở chính (ví dụ: "Trụ sở chính:").',
                    },
                  },
                },
                {
                  name: 'branchLabel',
                  type: 'text',
                  label: { en: 'Branch Label', vi: 'Nhãn chi nhánh' },
                  admin: {
                    description: {
                      en: 'Label above the branch address.',
                      vi: 'Nhãn phía trên địa chỉ chi nhánh.',
                    },
                  },
                },
                {
                  name: 'supportHeading',
                  type: 'text',
                  label: { en: 'Support Heading', vi: 'Tiêu đề hỗ trợ' },
                  admin: {
                    description: {
                      en: 'Heading above the phone/email column.',
                      vi: 'Tiêu đề phía trên cột điện thoại/email.',
                    },
                  },
                },
                {
                  name: 'hotlinePrefix',
                  type: 'text',
                  label: { en: 'Hotline Prefix', vi: 'Tiền tố hotline' },
                  admin: {
                    description: {
                      en: 'Text shown before the phone number (e.g. "Hotline:").',
                      vi: 'Chữ hiển thị trước số điện thoại (ví dụ: "Hotline:").',
                    },
                  },
                },
                {
                  name: 'emailPrefix',
                  type: 'text',
                  label: { en: 'Email Prefix', vi: 'Tiền tố email' },
                  admin: {
                    description: {
                      en: 'Text shown before the email address (e.g. "Email:").',
                      vi: 'Chữ hiển thị trước địa chỉ email (ví dụ: "Email:").',
                    },
                  },
                },
                {
                  name: 'copyrightSuffix',
                  type: 'text',
                  label: { en: 'Copyright Suffix', vi: 'Hậu tố bản quyền' },
                  admin: {
                    description: {
                      en: 'Text after "© YEAR Company Name." in the footer base.',
                      vi: 'Chữ sau "© NĂM Tên Công Ty." ở cuối chân trang.',
                    },
                  },
                },
                {
                  name: 'backToTopLabel',
                  type: 'text',
                  label: { en: 'Back to Top Label', vi: 'Nhãn về đầu trang' },
                  admin: {
                    description: {
                      en: 'Label on the back-to-top link in the footer base.',
                      vi: 'Nhãn trên liên kết về đầu trang ở cuối chân trang.',
                    },
                  },
                },
              ],
            },
          ],
        },
        {
          label: { en: 'SEO', vi: 'SEO' },
          fields: [
            {
              name: 'seo',
              type: 'group',
              label: { en: 'SEO', vi: 'SEO' },
              admin: {
                description: {
                  en: 'Default metadata used when a page has no specific SEO entry.',
                  vi: 'Dữ liệu meta mặc định khi trang không có mục SEO riêng.',
                },
              },
              fields: [
                {
                  name: 'metaTitle',
                  type: 'text',
                  label: { en: 'Meta Title', vi: 'Tiêu đề Meta' },
                },
                {
                  name: 'metaDescription',
                  type: 'textarea',
                  label: { en: 'Meta Description', vi: 'Mô tả Meta' },
                },
                {
                  name: 'ogImage',
                  type: 'upload',
                  relationTo: 'media',
                  label: { en: 'OG Image', vi: 'Ảnh OG' },
                  admin: {
                    description: {
                      en: 'Social share image (Open Graph / Twitter card).',
                      vi: 'Ảnh chia sẻ mạng xã hội (Open Graph / Twitter card).',
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}

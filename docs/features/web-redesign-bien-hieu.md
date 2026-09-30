# Web redesign "Biển hiệu": prod rollout

The public site (`apps/web`) now uses a Vietnamese shop-signboard look: an orange sign panel, tall condensed capitals, and outlined cards. Its copy addresses customers as "anh/chị" and speaks as "chúng mình".

The new fonts and copy live in the code **defaults**, but prod's `site_settings` singleton already holds its own saved values, and saved values win. Prod keeps the old serif fonts and old copy until the steps below are done in Directus Studio (Content → Site settings). Prod is only reachable over the VPN, so the operator does this from the authorized machine.

## 1. Fonts (required for the new look)

| Field                          | Set to             |
| ------------------------------ | ------------------ |
| `typography_heading_font`      | `barlow-condensed` |
| `typography_hero_display_font` | `barlow-condensed` |
| `typography_body_font`         | `be-vietnam-pro`   |

The `barlow-condensed` choice appears in the dropdowns once the updated `snapshots/snapshot.yaml` has been applied. This happens automatically on CMS container start.

## 2. Hero photo

The hero's "Cam kết với anh/chị" panel shows `hero_background_image` as a 16:9 photo above the checklist.

- Upload a real photo of the crew or a finished shop.
- Or clear the field. The panel then shows only the checklist; the code no longer falls back to a stock photo.

Also check `introduction` → image, which is shown with a charcoal outline beside the brand story.

## 3. Copy

Paste each value below over the current one. A field left empty falls back to the same text from the code, so clearing a field also works. None of these fields should contain `**bold**` markers: the site doesn't render markdown, so they appear as literal asterisks.

| Field                               | New value                                                                                                                                                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `branding_header_tagline`           | Thi công & vệ sinh                                                                                                                                                                                                                               |
| `branding_footer_tagline`           | Xây dựng & dọn sạch                                                                                                                                                                                                                              |
| `hero_trust_badge`                  | Quản lý chất lượng theo chuẩn ISO 9001:2015                                                                                                                                                                                                      |
| `hero_subheadline`                  | Anh/chị chỉ cần gọi, GreenOrange lo trọn từ thi công, lắp biển hiệu đến dọn dẹp sạch sẽ trước ngày khai trương.                                                                                                                                  |
| `hero_primary_cta_label`            | Đặt lịch khảo sát miễn phí                                                                                                                                                                                                                       |
| `hero_secondary_cta_label`          | Xem dịch vụ                                                                                                                                                                                                                                      |
| `hero_trust_strap`                  | Hà Nội · TP. Hồ Chí Minh · Nhận công trình toàn quốc                                                                                                                                                                                             |
| `introduction_eyebrow`              | Về chúng mình                                                                                                                                                                                                                                    |
| `introduction_heading`              | Một đội lo cả dựng lẫn dọn                                                                                                                                                                                                                       |
| `introduction_narrative`            | Từ năm {founded}, GreenOrange làm hai việc cho các cửa hàng: thi công cải tạo và vệ sinh công nghiệp. Cùng một đội lo từ lúc dựng vách đến lúc lau sạch kính, nên anh/chị không phải tìm thêm bên dọn dẹp và cửa hàng luôn kịp ngày khai trương. |
| `introduction_brand_story_heading`  | Ba màu, ba lời hứa                                                                                                                                                                                                                               |
| `introduction_brand_story_intro`    | Cam, trắng và xanh lá không chỉ là màu logo. Mỗi màu là một điều chúng mình hứa với anh/chị:                                                                                                                                                     |
| `introduction_process_eyebrow`      | Quy trình                                                                                                                                                                                                                                        |
| `introduction_process_heading`      | 5 bước, anh/chị không phải lo                                                                                                                                                                                                                    |
| `introduction_process_intro`        | Thi công và dọn dẹp nối tiếp nhau, mặt bằng không phải chờ, cửa hàng mở đúng ngày.                                                                                                                                                               |
| `services_section_eyebrow`          | Dịch vụ                                                                                                                                                                                                                                          |
| `services_section_heading`          | Chúng mình làm gì cho anh/chị                                                                                                                                                                                                                    |
| `services_section_description`      | Chọn riêng thi công, riêng vệ sinh, hoặc gộp trọn gói để tiết kiệm hơn và chỉ làm việc với một đầu mối.                                                                                                                                          |
| `projects_section_eyebrow`          | Công trình đã làm                                                                                                                                                                                                                                |
| `projects_section_heading`          | Cửa hàng đã bàn giao                                                                                                                                                                                                                             |
| `projects_section_description`      | Một số showroom, quán cà phê và cửa hàng chúng mình đã thi công và dọn sạch ở Hà Nội và TP. Hồ Chí Minh.                                                                                                                                         |
| `testimonials_section_eyebrow`      | Khách hàng nói gì                                                                                                                                                                                                                                |
| `testimonials_section_heading`      | Chủ cửa hàng kể lại                                                                                                                                                                                                                              |
| `testimonials_section_description`  | Ý kiến từ các chủ cửa hàng đã làm việc cùng GreenOrange.                                                                                                                                                                                         |
| `contact_section_eyebrow`           | Liên hệ                                                                                                                                                                                                                                          |
| `contact_section_heading`           | Đặt lịch khảo sát miễn phí                                                                                                                                                                                                                       |
| `contact_section_description`       | Để lại tên và số điện thoại, chúng mình gọi lại và báo giá trong ngày. Thông tin của anh/chị chỉ dùng để liên hệ.                                                                                                                                |
| `contact_section_success_heading`   | Đã nhận yêu cầu của anh/chị                                                                                                                                                                                                                      |
| `contact_section_success_body`      | Chúng mình sẽ gọi lại cho anh/chị trong vòng 15 phút để hẹn lịch khảo sát.                                                                                                                                                                       |
| `contact_section_cta_label`         | Gửi yêu cầu khảo sát                                                                                                                                                                                                                             |
| `contact_form_label_full_name`      | Họ và tên                                                                                                                                                                                                                                        |
| `contact_form_label_phone`          | Số điện thoại                                                                                                                                                                                                                                    |
| `contact_form_label_email`          | Email                                                                                                                                                                                                                                            |
| `contact_form_label_company`        | Tên cửa hàng / thương hiệu                                                                                                                                                                                                                       |
| `contact_form_label_address`        | Địa chỉ mặt bằng cần khảo sát                                                                                                                                                                                                                    |
| `contact_form_label_service_group`  | Anh/chị cần làm gì?                                                                                                                                                                                                                              |
| `contact_form_label_service_select` | Gói dịch vụ                                                                                                                                                                                                                                      |
| `contact_form_label_message`        | Mô tả thêm (diện tích, hiện trạng, ngày muốn bàn giao)                                                                                                                                                                                           |
| `footer_brand_description`          | Thi công, cải tạo và vệ sinh cửa hàng trọn gói cho chuỗi bán lẻ, showroom và văn phòng trên toàn quốc.                                                                                                                                           |
| `footer_quick_links_heading`        | Xem nhanh                                                                                                                                                                                                                                        |
| `footer_offices_heading`            | Văn phòng                                                                                                                                                                                                                                        |
| `footer_branch_label`               | Chi nhánh TP. HCM:                                                                                                                                                                                                                               |
| `footer_support_heading`            | Liên hệ                                                                                                                                                                                                                                          |
| `seo_meta_title`                    | GreenOrange – Thi công, cải tạo & vệ sinh cửa hàng                                                                                                                                                                                               |
| `seo_meta_description`              | Thi công, cải tạo và vệ sinh cửa hàng trọn gói. Khảo sát và báo giá trong ngày, miễn phí. Hà Nội, TP. Hồ Chí Minh và toàn quốc.                                                                                                                  |

### `hero_headline_segments` (replace all rows)

The `color` choice still carries its old name from the dark hero: `white` now renders as the default dark ink, and `orange` / `emerald` render as the brand colors.

1. text **Dựng xong là sạch,** · color `white` · italic off · new line before: off
2. text **sạch xong là mở cửa.** · color `orange` · italic off · new line before: on

### `hero_benefits` (tags, in order)

1. Khảo sát và báo giá trong ngày, không mất phí
2. Báo giá rõ từng hạng mục, đã ký là không phát sinh
3. Làm cả ca đêm để kịp ngày khai trương
4. Hoá chất an toàn cho nhân viên và khách, bảo hành 12 tháng

### `nav_items` → label

1. `introduction`: Giới thiệu
2. `services`: Dịch vụ
3. `projects`: Dự án đã làm
4. `testimonials`: Đánh giá
5. `contact`: Liên hệ

### `stats` → label (values unchanged)

1. 500+: Cửa hàng & văn phòng đã bàn giao
2. 120+: Công trình cải tạo trọn gói
3. 99.4%: Khách hàng đánh giá 5★
4. 35+: Loại thiết bị & hoá chất đạt chuẩn

### `brand_values` → title / description

1. **Cam · Làm kỹ, làm nhiệt tình**: Chăm chút từng đường điện, kệ tủ trưng bày và biển hiệu Alu.
2. **Trắng · Sạch và minh bạch**: Bàn giao sạch bóng, đúng hẹn, báo giá rõ ràng từ đầu.
3. **Xanh lá · An toàn**: Dùng hoá chất sinh học, an toàn cho nhân viên và khách của anh/chị.

### `process_steps` → title / description

1. 01 **Khảo sát miễn phí**: Có mặt trong 2 giờ sau khi anh/chị gọi, đo đạc tận nơi và xem kỹ hiện trạng mặt bằng.
2. 02 **Báo giá rõ ràng**: Bóc tách từng hạng mục: vật tư, thiết bị điện, nhân công, hoá chất. Đã ký hợp đồng là không phát sinh.
3. 03 **Thi công đúng hẹn**: Ốp Alu, dựng vách, sơn bả, đi điện chiếu sáng. Làm cả ca đêm nếu tòa nhà yêu cầu.
4. 04 **Vệ sinh thật kỹ**: Mài sàn, hút bụi mịn, tẩy silicone trên kính, lau biển hiệu và khử mùi sơn mới.
5. 05 **Nghiệm thu, bàn giao**: Kiểm tra từng chi tiết cùng anh/chị theo checklist, giao chìa khoá và bảo hành 12 tháng.

## 4. Empty lists on prod

On dichvuyan.com (checked 2026-09-30), the services, projects and testimonials sections render **empty**. Before this redesign the projects grid said "Không tìm thấy dự án nào…"; after it, projects says "Chưa có công trình nào trong mục này." and services and testimonials show only their heading and filter buttons. The site reads them server-side with `DIRECTUS_STATIC_TOKEN`, or as the public role if that variable is empty, and shows only `published` items. Any failed read renders as an empty list rather than an error. Check:

- the web container logs for `CMS fetch error for services` / `projects` / `testimonials`, which point to a bad token, an unreachable CMS URL, or a permissions problem;
- the three collections have items with status `published`;
- the token's user (or the public role) can read them. `bun run setup-access` configures the public role.

Do **not** run `bun run seed` against prod to fix this. It overwrites the collections with demo content (sample clients and reviews).

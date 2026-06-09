import { ShieldCheck, Trees, Wrench } from "lucide-react";

import { BrandValue, ProcessStep } from "./types";

// Photo shown in the brand-narrative block.
export const INTRODUCTION_IMAGE_URL =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80";

// The three brand colors and the meaning each one represents.
export const BRAND_VALUES: BrandValue[] = [
  {
    title: "Màu Cam: Thi Công Nhiệt Huyết",
    description:
      "Sáng tạo, tinh xảo trong từng đường điện, kệ tủ trưng bày và biển hiệu quảng cáo Alu nổi bật.",
    icon: Wrench,
    iconColor: "text-orange-500",
    bgColor: "bg-orange-50",
    triColors: {
      left: "fill-orange-500 stroke-orange-600",
      right: "fill-orange-100 stroke-orange-200",
      bottom: "fill-orange-300 stroke-orange-400",
    },
  },
  {
    title: "Màu Trắng: Sạch Sẽ & Minh Bạch",
    description:
      "Cam kết không gian sạch bóng chuyên sâu, bàn giao đúng tiến độ và minh bạch trong báo giá.",
    icon: ShieldCheck,
    iconColor: "text-slate-500",
    bgColor: "bg-slate-50",
    triColors: {
      left: "fill-slate-400 stroke-slate-550",
      right: "fill-slate-100 stroke-slate-200",
      bottom: "fill-slate-300 stroke-slate-400",
    },
  },
  {
    title: "Màu Xanh: Thân Thiện & An Toàn",
    description:
      "Dọn dẹp bằng hóa chất sinh học sinh thái Organic tuyệt đối an toàn cho nhân viên và quý khách.",
    icon: Trees,
    iconColor: "text-emerald-600",
    bgColor: "bg-emerald-50",
    triColors: {
      left: "fill-emerald-620 stroke-emerald-700",
      right: "fill-emerald-100 stroke-emerald-200",
      bottom: "fill-emerald-350 stroke-emerald-400",
    },
  },
];

// The 5-step service delivery process.
export const PROCESS_STEPS: ProcessStep[] = [
  {
    num: "01",
    title: "Khảo Sát & Đo Đạc Hiện Trạng",
    desc: "Chuyên viên của chúng tôi sẽ đến trực tiếp mặt bằng thô hoặc shop cũ của bạn trong 2 giờ kể từ khi tiếp nhận để khảo sát diện tích, đặc thù kết cấu và đo đạt chính xác.",
  },
  {
    num: "02",
    title: "Lên Dự Toán & Bản Vẽ Khớp Thật",
    desc: "Bóc tách chi tiết từng hạng mục: số lượng thạch cao, sàn nhựa, thiết bị điện, số lượng nhân công dọn dẹp và hóa chất cần dùng. Ký kết hợp đồng cam kết không phát sinh.",
  },
  {
    num: "03",
    title: "Thi Công Lắp Đặt Gấp Rút",
    desc: "Tiến hành ốp Alu, dựng vách, sơn bả tường và đi dây nguồn điện rọi, điện trang trí. Hoạt động liên tục cả ca đêm nếu ban quản lý tòa nhà yêu cầu để kịp tiến độ.",
  },
  {
    num: "04",
    title: "Mài Sàn & Vệ Sinh Sâu Chi Tiết",
    desc: "Triển khai máy đánh sàn công nghiệp, hút bụi mịn, bóc tẩy mọi silicone còn dính trên kính, lau chùi biển hiệu, tẩy mốc khử mùi sơn mới bám trần vách.",
  },
  {
    num: "05",
    title: "Nghiệm Thu Khắt Khe & Bàn Giao",
    desc: "Tiến hành nghiệm thu từng chi tiết cùng chủ đầu tư theo checklist kỹ thuật chuẩn mực. Bàn giao chìa khóa để chủ shop yên tâm khai trương và hưởng bảo hành 12 tháng.",
  },
];

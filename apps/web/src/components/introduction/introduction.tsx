import Image from "next/image";

import { COMPANY_INFO } from "../../data";
import {
  BRAND_VALUES,
  INTRODUCTION_IMAGE_URL,
  PROCESS_STEPS,
} from "./constants";

export default function Introduction() {
  return (
    <section id="introduction" className="py-16 md:py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-sm font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3.5 py-1 rounded-full">
            Giới Thiệu Doanh Nghiệp
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black font-heading text-slate-900 tracking-tight mt-3 mb-4">
            Về GreenOrange Services
          </h2>
          <div className="h-1.5 w-24 bg-gradient-to-r from-emerald-500 to-orange-500 mx-auto rounded-full" />
          <p className="text-slate-500 font-medium mt-6 text-base md:text-lg">
            Được thành lập từ năm {COMPANY_INFO.founded}, **GreenOrange
            Services** tự hào là đơn vị tiên phong kết hợp hai dịch vụ cốt lõi:
            **Thi Công Cửa Hàng** sắc bén và **Vệ Sinh Công Nghiệp** chuẩn mực.
            Chúng tôi kiến tạo không gian kinh doanh đầy ấn tượng và bảo dưỡng
            sự khang trang đó vẹn nguyên theo thời gian.
          </p>
        </div>

        {/* Narrative & Brand Color Meanings */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-20">
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden border border-gray-100 shadow-xl aspect-square">
              <Image
                src={INTRODUCTION_IMAGE_URL}
                alt="Đội ngũ GreenOrange làm việc chuyên nghiệp"
                fill
                unoptimized
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-emerald-950/20 to-transparent" />

              {/* Dynamic stats banner on top of image */}
              <div className="absolute bottom-6 left-6 right-6 text-white text-left">
                <span className="block text-xs font-bold text-orange-400 uppercase tracking-widest mb-1">
                  Phương châm làm nghề
                </span>
                <span className="text-lg md:text-xl font-bold italic leading-tight">
                  &ldquo;{COMPANY_INFO.motto}&rdquo;
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <h3 className="text-3xl md:text-4xl font-black font-heading text-slate-800 tracking-tight">
              Ý Nghĩa Sứ Mệnh Qua Sắc Màu Nhận Diện
            </h3>
            <p className="text-slate-500 text-sm md:text-base leading-relaxed">
              Chúng tôi không chọn màu ngẫu nhiên. Bộ nhận diện **Màu Cam -
              Trắng - Xanh lá** đại diện cho lời cam kết toàn diện của chúng tôi
              về năng lực kỹ thuật và chất lượng vệ sinh bảo dưỡng:
            </p>

            <div className="space-y-5">
              {BRAND_VALUES.map((v, idx) => {
                const IconComp = v.icon;
                return (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl border border-gray-100 bg-linear-to-r from-gray-50/50 to-white hover:border-gray-200 transition-all shadow-xs hover:shadow-md"
                  >
                    {/* The 3-Isosceles Equilateral Triangles rotating module */}
                    <div className="relative flex items-center justify-center size-20 shrink-0 select-none">
                      {/* Slow spinning background shape composed of 3 isosceles triangles */}
                      <div className="absolute inset-0 animate-spin [animation-duration:10s] hover:[animation-duration:4s] transition-all">
                        <svg
                          viewBox="0 0 100 100"
                          className="w-full h-full drop-shadow-sm overflow-visible"
                        >
                          {/* Isosceles 1 (Left) */}
                          <path
                            d="M 50 6 L 50 52 L 10 75 Z"
                            className={`${v.triColors.left} stroke-linejoin-round stroke-[6]`}
                          />
                          {/* Isosceles 2 (Right) */}
                          <path
                            d="M 50 6 L 50 52 L 90 75 Z"
                            className={`${v.triColors.right} stroke-linejoin-round stroke-[6]`}
                          />
                          {/* Isosceles 3 (Bottom) */}
                          <path
                            d="M 10 75 L 50 52 L 90 75 Z"
                            className={`${v.triColors.bottom} stroke-linejoin-round stroke-[6]`}
                          />
                        </svg>
                      </div>

                      {/* Magnified Glassmorphism Icon Layer on Top */}
                      <div className="relative z-10 p-3.5 bg-slate-900/85 backdrop-blur-xs text-white rounded-full border border-white/20 shadow-md transform hover:scale-110 transition-transform duration-300">
                        <IconComp className="size-7 text-white shrink-0 animate-pulse" />
                      </div>
                    </div>

                    {/* Concise narrative text contents */}
                    <div className="text-center sm:text-left flex-1">
                      <h4 className="font-black font-heading text-slate-800 text-lg mb-1.5 flex items-center justify-center sm:justify-start gap-2">
                        <span
                          className={`inline-block size-2 rounded-full ${idx === 0 ? "bg-orange-500" : idx === 1 ? "bg-slate-400" : "bg-emerald-500"}`}
                        />
                        {v.title}
                      </h4>
                      <p className="text-slate-500 text-sm md:text-base leading-relaxed max-w-xl">
                        {v.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 5 step delivery process */}
        <div className="mt-16 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl -z-0 animate-float-ambient" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl -z-0 animate-float-ambient-alt" />

          <div className="max-w-3xl mx-auto text-center mb-12 relative z-10">
            <span className="text-sm font-black text-orange-400 uppercase tracking-widest bg-orange-400/15 px-4 py-1.5 rounded-full inline-block scale-110 mb-2">
              Khép kín & Hoàn hảo
            </span>
            <h3 className="text-3xl md:text-4xl font-black font-heading tracking-tight mt-3 mb-4 text-white">
              Quy Trình 5 Bước Phục Vụ Chuyên Nghiệp
            </h3>
            <p className="text-slate-300 text-base md:text-lg">
              Tối ưu hóa thời gian mở showroom cho chủ đầu tư. Phối hợp nhịp
              nhàng giữa thi công hoàn thiện và dọn sạch tinh tươm.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 relative z-10">
            {PROCESS_STEPS.map((step, idx) => (
              <div
                key={idx}
                className="relative bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 hover:border-white/20 transition-all flex flex-col items-start text-left"
              >
                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-orange-400 to-emerald-400 leading-none mb-3 transform hover:scale-110 transition-transform">
                  {step.num}
                </div>
                <h4 className="text-base font-black mb-2 text-white leading-snug">
                  {step.title}
                </h4>
                <p className="text-sm text-slate-400 leading-normal mt-auto">
                  {step.desc}
                </p>
                {idx < 4 && (
                  <div className="hidden lg:block absolute top-[40px] -right-[15%] w-[30%] h-[1px] bg-gradient-to-r from-orange-400/40 to-emerald-400/40 z-20 pointer-events-none" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

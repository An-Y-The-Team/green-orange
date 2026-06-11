import { ArrowRight, Check, ShieldCheck, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

import { SiteSettings } from "../../data";
import {
  HERO_BACKGROUND_IMAGE_URL,
  HERO_BENEFITS,
  HERO_CARD_STYLE,
} from "./constants";

export default function Hero({ settings }: { settings: SiteSettings }) {
  const { stats, hero } = settings;
  return (
    <section
      id="hero"
      className="relative min-h-[90vh] md:min-h-screen pt-32 pb-20 overflow-hidden flex items-center justify-center bg-slate-950"
    >
      {/* 1. Large background image with high depth layer */}
      <div className="absolute inset-0 z-0">
        <Image
          src={HERO_BACKGROUND_IMAGE_URL}
          alt="Không gian thi công và vệ sinh chuyên nghiệp"
          fill
          unoptimized
          className="object-cover opacity-60 scale-105 filter brightness-75 transition-transform duration-10000 uppercase"
        />
        {/* Subtle overlays to create intense contrast and premium style */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/30" />
        <div className="absolute inset-0 bg-linear-to-r from-emerald-950/20 via-transparent to-orange-950/20" />
      </div>

      {/* Decorative floating blurred lights behind content for supreme depth perception */}
      <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-emerald-500/25 rounded-full blur-3xl z-0 animate-float-ambient" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/15 rounded-full blur-3xl z-0 animate-float-ambient-alt" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 w-full flex flex-col items-center">
        {/* 2. Concentrated centered box, custom premium styling, dark background, 75% opacity */}
        <div
          id="hero-main-card"
          className="w-full max-w-5xl mx-auto bg-slate-950/75 backdrop-blur-md border border-white/10 rounded-3xl p-10 md:p-14 lg:p-16 text-center flex flex-col items-center shadow-2xl transition-all duration-500 hover:border-emerald-500/30 transform hover:scale-[1.01]"
          style={HERO_CARD_STYLE}
        >
          {/* Trust badge with glowing element */}
          <div className="inline-flex items-center gap-2 py-2 px-4 bg-white/10 border border-white/15 shadow-sm rounded-full text-emerald-300 text-sm font-bold mb-8 animate-fade-in">
            <ShieldCheck className="size-5 text-emerald-400" />
            <span className="tracking-wide">
              Tiêu chuẩn quốc tế ISO 9001:2015 & chuẩn Eco-Safe
            </span>
          </div>

          {/* 3. Luxury Headings using Serif font */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif text-white tracking-normal leading-tight mb-8 max-w-4xl">
            Thi Công{" "}
            <span className="text-linear bg-linear-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent italic">
              Kiến Tạo
            </span>{" "}
            Cửa Hiệu <br />
            <span className="text-linear bg-linear-to-r from-emerald-400 to-emerald-500 bg-clip-text text-transparent">
              Chuyên Nghiệp & Sạch Sẽ
            </span>
          </h1>

          {/* Subtext description conforming to core business details */}
          <p className="text-slate-200 text-base md:text-lg lg:text-xl font-normal max-w-3xl leading-relaxed mb-10">
            {hero.subheadline}
          </p>

          {/* Dynamic Core Benefits Grid (2x2) inside centered panel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-10 mb-10 text-left border-t border-b border-white/10 py-8 w-full max-w-3xl">
            {HERO_BENEFITS.map((value, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="flex items-center justify-center size-6 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-emerald-400">
                  <Check className="size-4" />
                </div>
                <span className="text-slate-200 text-sm md:text-base font-medium">
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Call to action action buttons */}
          <div className="flex flex-col sm:flex-row gap-5 w-full justify-center items-center">
            <Link
              id="hero-primary-cta"
              href="#contact"
              className={
                buttonVariants({ variant: "default" }) +
                " w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-5 rounded-2xl text-base shadow-xl shadow-orange-500/20 hover:shadow-orange-500/45 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
              }
            >
              Đặt lịch khảo sát ngay{" "}
              <ArrowRight className="size-5 animate-bounce-horizontal" />
            </Link>
            <Link
              id="hero-secondary-cta"
              href="#services"
              className={
                buttonVariants({ variant: "outline" }) +
                " w-full sm:w-auto border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold px-8 py-5 rounded-2xl text-base shadow-sm hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
              }
            >
              Tìm hiểu dịch vụ <Sparkles className="size-5 text-orange-400" />
            </Link>
          </div>

          {/* Mini trust label */}
          <span className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-8">
            ✓ Cam kết đồng hành tin cậy • Khảo sát lập phương án & báo giá trong
            ngày miễn phí
          </span>
        </div>

        {/* Counters ribbon below with rich depth backdrop */}
        <div className="mt-12 bg-slate-950/60 backdrop-blur-xs border border-white/10 rounded-2xl p-6 md:p-8 w-full max-w-4xl shadow-xl">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className={`flex flex-col items-center justify-center text-center ${idx > 1 ? "pt-4 lg:pt-0" : ""} ${idx === 1 ? "pt-0 lg:pt-0" : ""}`}
              >
                <span className="text-2xl md:text-3xl font-serif font-black text-white mb-1">
                  {stat.value}
                </span>
                <span className="text-slate-400 text-[10px] md:text-xs font-bold leading-snug max-w-[160px]">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

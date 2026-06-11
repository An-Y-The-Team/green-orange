import {
  ArrowUpCircle,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Wrench,
} from "lucide-react";
import Link from "next/link";

import { SiteSettings } from "../../data";
import { QUICK_LINKS } from "./constants";

export default function Footer({ settings }: { settings: SiteSettings }) {
  const { company } = settings;
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 border-t border-slate-800 relative">
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-emerald-500/50 via-white/10 to-orange-500/50" />

      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 mb-12">
          {/* Brand Presentation Footer Area */}
          <div className="lg:col-span-4 space-y-6">
            <Link
              href="#hero"
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="flex items-center justify-center size-9 rounded-lg bg-linear-to-br from-emerald-500 via-white to-orange-400 p-[1.5px] shadow-sm">
                <div className="flex items-center justify-center w-full h-full bg-slate-900 rounded-[7px] gap-[1px]">
                  <Sparkles className="size-4 text-emerald-400 animate-pulse" />
                  <Wrench className="size-4 text-orange-400" />
                </div>
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-white flex items-center gap-1 leading-none">
                  <span className="text-emerald-400">Green</span>
                  <span className="text-orange-400">Orange</span>
                </span>
                <span className="block text-[8px] font-bold uppercase tracking-widest text-slate-450 leading-none mt-1">
                  Xây dựng & Dọn sạch
                </span>
              </div>
            </Link>

            <p className="text-slate-400 text-xs md:text-sm leading-relaxed font-semibold">
              Đơn vị trọn gói uy tín hàng đầu cung cấp dịch vụ cải tạo, lắp đặt
              ánh sáng nội thất và vệ sinh bàn giao cho chuỗi retail, văn phòng
              và các thương hiệu cao cấp tại Việt Nam.
            </p>
          </div>

          {/* Quick Links Anchors */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-white text-xs font-black uppercase tracking-widest">
              Đường Dẫn Nhanh
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold text-slate-400">
              {QUICK_LINKS.map((link) => (
                <li key={link.id}>
                  <Link
                    href={`#${link.id}`}
                    className="hover:text-emerald-400 hover:underline cursor-pointer transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Branch & Coordinate Addresses */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-white text-xs font-black uppercase tracking-widest">
              Hệ Thống Văn Phòng
            </h4>
            <div className="space-y-3.5 text-xs font-semibold text-slate-400 leading-relaxed">
              <div className="flex gap-2.5 items-start">
                <MapPin className="size-4 text-orange-400 shrink-0 mt-0.5" />
                <p>
                  <span className="text-white font-bold block mb-0.5 text-[11px]">
                    Trụ Sở Hà Nội:
                  </span>
                  {company.address}
                </p>
              </div>
              <div className="flex gap-2.5 items-start">
                <MapPin className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  <span className="text-white font-bold block mb-0.5 text-[11px]">
                    Chi Nhánh TP. HCM:
                  </span>
                  {company.branch}
                </p>
              </div>
            </div>
          </div>

          {/* Support Channels */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-white text-xs font-black uppercase tracking-widest">
              Hỗ Trợ Trực Tuyến
            </h4>
            <div className="pt-2 space-y-3.5 text-xs font-semibold">
              {company.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="size-4 text-orange-400" />
                  <a
                    href={`tel:${company.phone.replace(/\s+/g, "")}`}
                    className="hover:text-orange-400 transition-colors text-slate-300"
                  >
                    Hotline: {company.phone}
                  </a>
                </div>
              )}
              {company.email && (
                <div className="flex items-center gap-2.5">
                  <Mail className="size-4 text-emerald-400" />
                  <a
                    href={`mailto:${company.email}`}
                    className="hover:text-emerald-400 transition-colors text-slate-300"
                  >
                    Email: {company.email}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Closing details and copy */}
        <div className="border-t border-slate-800/80 pt-8 mt-8 flex flex-col md:flex-row items-center justify-between text-slate-500 text-[11px] font-bold">
          <p>
            © {new Date().getFullYear()} {company.name}. Tất cả các quyền được
            bảo lưu.
          </p>

          <Link
            href="#hero"
            className="flex items-center gap-1 hover:text-white cursor-pointer mt-4 md:mt-0"
          >
            <ArrowUpCircle className="size-4 text-emerald-400" />
            Về đầu trang
          </Link>
        </div>
      </div>
    </footer>
  );
}

"use client";

import { ClipboardCheck, Send } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useState } from "react";

import { Button } from "@yan/ui/components/button";
import { Input } from "@yan/ui/components/input";
import { Label } from "@yan/ui/components/label";
import { Textarea } from "@yan/ui/components/textarea";

import { Category, isCategory } from "@/constants/category";
import { SubmissionStatus } from "@/constants/submission-status";

import { CMS_URL } from "../../data";
import { ContactSubmission, Service } from "../../types";
import {
  SEARCH_PARAM,
  SERVICE_CATEGORY_OPTIONS,
  SUBMISSIONS_STORAGE_KEY,
  SUCCESS_BANNER_DURATION_MS,
} from "./constants";

// Reads previously saved submissions from localStorage (client-only). Used as
// the lazy initializer for the submissions state so no effect is needed.
function readStoredSubmissions(): ContactSubmission[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(SUBMISSIONS_STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as ContactSubmission[];
  } catch {
    console.error("Failed to parse submissions");
    return [];
  }
}

export default function ContactForm({ services }: { services: Service[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [serviceCategory, setServiceCategory] = useState<Category>(
    Category.BOTH
  );
  const [serviceId, setServiceId] = useState("");
  const [message, setMessage] = useState("");

  const [submissions, setSubmissions] = useState<ContactSubmission[]>(
    readStoredSubmissions
  );
  const [isSubmittedSuccessfully, setIsSubmittedSuccessfully] = useState(false);

  // Prefill the form from URL params during render whenever they change. This
  // replaces a useEffect: the guard ensures the prefill runs once per param
  // change rather than on every render, avoiding cascading re-renders.
  const paramsKey = searchParams.toString();
  const [syncedParamsKey, setSyncedParamsKey] = useState<string | null>(null);
  if (paramsKey !== syncedParamsKey) {
    setSyncedParamsKey(paramsKey);

    const paramCategory = searchParams.get(SEARCH_PARAM.CATEGORY);
    const paramServiceId = searchParams.get(SEARCH_PARAM.SERVICE_ID);
    const quoteProject = searchParams.get(SEARCH_PARAM.QUOTE_PROJECT);

    if (isCategory(paramCategory)) {
      setServiceCategory(paramCategory);
    }

    if (paramServiceId) {
      setServiceId(paramServiceId);
      const matchedService = services.find((s) => s.id === paramServiceId);
      if (matchedService) {
        setMessage(
          `Tôi cần đăng ký tư vấn và khảo sát cho gói dịch vụ: ${matchedService.title}. Mong các bạn liên hệ sớm.`
        );
      }
    } else if (quoteProject) {
      setServiceCategory(Category.BOTH);
      setServiceId("");
      setMessage(
        `Tôi muốn đăng ký tư vấn giải pháp cải tạo & làm sạch tương tự như dự án: [${quoteProject}]. Xin gửi báo giá chi tiết.`
      );
    }
  }

  const clearURLParams = () => {
    router.replace(pathname, { scroll: false });
  };

  // Filter detailed services based on selected category in form
  const availableServices = services.filter(
    (s) => serviceCategory === Category.BOTH || s.category === serviceCategory
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !phone) {
      alert(
        "Vui lòng điền đủ Họ và tên, Số điện thoại để chúng tôi có liên hệ sớm nhất."
      );
      return;
    }

    // Persist the lead to the Payload CMS. Optional fields are omitted when
    // blank so the CMS doesn't reject an empty email against its format check.
    const payload: Record<string, unknown> = {
      fullName,
      phone,
      serviceCategory,
    };
    if (email) payload.email = email;
    if (companyName) payload.companyName = companyName;
    if (address) payload.address = address;
    if (serviceId) payload.serviceId = serviceId;
    if (message) payload.message = message;

    try {
      const res = await fetch(`${CMS_URL}/api/contact-submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`CMS responded ${res.status}`);
    } catch (err) {
      console.error("Contact submission failed:", err);
      alert(
        "Gửi yêu cầu thất bại. Vui lòng thử lại hoặc liên hệ trực tiếp qua hotline."
      );
      return;
    }

    const newSubmission: ContactSubmission = {
      id: "sub_" + Date.now(),
      fullName,
      email,
      phone,
      companyName,
      address,
      serviceCategory,
      serviceId,
      message,
      submittedAt:
        new Date().toLocaleDateString("vi-VN") +
        " " +
        new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      status: SubmissionStatus.NEW,
    };

    const updated = [newSubmission, ...submissions];
    setSubmissions(updated);
    localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(updated));

    // Success response state
    setIsSubmittedSuccessfully(true);
    clearURLParams();

    // Reset fields except submissions list
    setFullName("");
    setEmail("");
    setPhone("");
    setCompanyName("");
    setAddress("");
    setServiceId("");
    setMessage("");

    // Reset status banner after the configured delay
    setTimeout(() => {
      setIsSubmittedSuccessfully(false);
    }, SUCCESS_BANNER_DURATION_MS);
  };

  const handleClearInbox = () => {
    localStorage.removeItem(SUBMISSIONS_STORAGE_KEY);
    setSubmissions([]);
  };

  // Service-group toggle — switches the active category and clears the
  // previously selected service so it can't mismatch the new category.
  const handleSelectCategory = (category: Category) => {
    setServiceCategory(category);
    setServiceId("");
  };

  return (
    <section id="contact" className="py-16 md:py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-sm font-black text-orange-500 uppercase tracking-widest bg-orange-50 px-3.5 py-1 rounded-full">
            Liên Hệ Đăng Ký
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black font-heading text-slate-900 tracking-tight mt-3 mb-4">
            Đăng Ký Khảo Sát & Tư Vấn Miễn Phí
          </h2>
          <div className="h-1.5 w-24 bg-gradient-to-r from-emerald-500 to-orange-500 mx-auto rounded-full" />
          <p className="text-slate-500 font-medium mt-6 text-base md:text-lg lg:text-xl leading-relaxed">
            Chỉ với 1 phút điền thông tin, chúng tôi sẽ cử kỹ sư chuyên môn đến
            khảo sát đo đạc thực tế hoàn toàn miễn phí. Cam kết bảo mật thông
            tin tối đa.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Grid: Form inputs block (7 cols) */}
          <div className="lg:col-span-7 bg-slate-50 p-6 md:p-8 rounded-3xl border border-gray-100 shadow-xs relative">
            {isSubmittedSuccessfully && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4.5 mb-6 text-left flex gap-3 animate-in fade-in slide-in-from-top duration-300">
                <ClipboardCheck className="size-5 shrink-0 text-emerald-600 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-sm mb-1">
                    Gửi yêu cầu thành công!
                  </h4>
                  <p className="text-xs">
                    Đơn của bạn đã được chuyển đến phòng dự án GreenOrange.
                    Chuyên viên kỹ sư sẽ liên hệ với bạn qua điện thoại trong
                    vòng **15 phút** tới.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full name input */}
                <div>
                  <Label
                    htmlFor="fullname"
                    className="text-slate-700 font-extrabold text-xs mb-2 block"
                  >
                    Họ và Tên Khách Hàng <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    required
                    id="fullname"
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-white border-gray-200 focus:border-emerald-500 rounded-xl font-semibold h-10 w-full"
                  />
                </div>

                {/* Phone number input */}
                <div>
                  <Label
                    htmlFor="phone"
                    className="text-slate-700 font-extrabold text-xs mb-2 block"
                  >
                    Số Điện Thoại Liên Hệ{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    required
                    id="phone"
                    type="tel"
                    placeholder="0988 123 456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-white border-gray-200 focus:border-emerald-500 rounded-xl font-semibold h-10 w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Email input */}
                <div>
                  <Label
                    htmlFor="email"
                    className="text-slate-700 font-extrabold text-xs mb-2 block"
                  >
                    Địa Chỉ Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="nguyenvana@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white border-gray-200 focus:border-emerald-500 rounded-xl font-semibold h-10 w-full"
                  />
                </div>

                {/* Company Name */}
                <div>
                  <Label
                    htmlFor="company"
                    className="text-slate-700 font-extrabold text-xs mb-2 block"
                  >
                    Tên Doanh Nghiệp / Thương Hiệu
                  </Label>
                  <Input
                    id="company"
                    type="text"
                    placeholder="Highlands, Highlands, EcoBeauty..."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="bg-white border-gray-200 focus:border-emerald-500 rounded-xl font-semibold h-10 w-full"
                  />
                </div>
              </div>

              {/* Address input */}
              <div>
                <Label
                  htmlFor="address"
                  className="text-slate-700 font-extrabold text-xs mb-2 block"
                >
                  Địa Chỉ Mặt Bằng / Công Trình Cần Khảo Sát
                </Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="Số 123, Đường Nguyễn Huệ, Quận 1, TP. HCM"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="bg-white border-gray-200 focus:border-emerald-500 rounded-xl font-semibold h-10 w-full"
                />
              </div>

              {/* Service group toggler */}
              <div>
                <Label className="text-slate-700 font-extrabold text-xs mb-3 block">
                  Nhóm Dịch Vụ Cần Đăng Ký
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  {SERVICE_CATEGORY_OPTIONS.map((cat) => {
                    const CatIcon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectCategory(cat.id)}
                        className={`py-3 px-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer text-center flex flex-col items-center gap-1.5 ${
                          serviceCategory === cat.id
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                            : "bg-white border-gray-200 text-slate-600 hover:border-gray-300"
                        }`}
                      >
                        <CatIcon
                          className={`size-4 ${serviceCategory === cat.id ? "text-white" : cat.color}`}
                        />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Specific custom selection input */}
              <div>
                <Label
                  htmlFor="service-select"
                  className="text-slate-700 font-extrabold text-xs mb-2 block"
                >
                  Chọn Gói Dịch Vụ Cụ Thể (Bắt buộc)
                </Label>
                <select
                  id="service-select"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full bg-white border border-gray-200 focus:border-emerald-500 focus:outline-none rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 h-10"
                >
                  <option value="">
                    -- Vui lòng chọn gói dịch vụ cần hỗ trợ --
                  </option>
                  {availableServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      [
                      {s.category === Category.CLEANING
                        ? "VỆ SINH"
                        : "THI CÔNG"}
                      ] {s.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Message block */}
              <div>
                <Label
                  htmlFor="message"
                  className="text-slate-700 font-extrabold text-xs mb-2 block"
                >
                  Mô Tả Yêu Cầu Chi Tiết (Kích thước mặt bằng, tình trạng hiện
                  tại, thời gian bàn giao mong muốn)
                </Label>
                <Textarea
                  id="message"
                  placeholder="Ví dụ: Cần vệ sinh gấp 150m2 sàn gỗ và kính mặt tiền shop quần áo tại Hoàn Kiếm, bàn giao trước 20/06 để khai trương..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="bg-white border-gray-200 focus:border-emerald-500 rounded-xl font-semibold min-h-[100px] w-full"
                />
              </div>

              {/* Submit CTA button */}
              <Button
                id="contact-form-submit"
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black text-base md:text-lg rounded-xl py-4.5 cursor-pointer shadow-md flex items-center justify-center gap-2 transform hover:scale-[1.03] transition-all active:scale-95 duration-250"
              >
                <Send className="size-4" />
                Gửi Đăng Ký Khảo Sát Ngay (Miễn Phí)
              </Button>
            </form>
          </div>

          {/* Grid: Support coordinates and CRM Inbox (5 cols) */}
          <div className="lg:col-span-5 space-y-8 flex flex-col text-left">
            {/* Simulated Live CRM Inbox */}
            <div className="bg-slate-50 border border-gray-100 rounded-3xl p-6 relative flex-grow">
              <div className="flex justify-between items-center mb-5 border-b pb-4">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800">
                    Yêu Cầu Gần Đây Của Bạn
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Dữ liệu được lưu trữ trực tiếp trên thiết bị (LocalDB)
                  </p>
                </div>
                {submissions.length > 0 && (
                  <button
                    onClick={handleClearInbox}
                    className="p-1 inset-y-0 text-[10px] text-red-500 hover:text-red-600 flex items-center gap-0.5 font-bold border border-red-100 rounded-md bg-white shadow-xs cursor-pointer"
                  >
                    Xóa tất cả
                  </button>
                )}
              </div>

              {submissions.length > 0 ? (
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {submissions.map((sub) => {
                    const matchedService = services.find(
                      (s) => s.id === sub.serviceId
                    );

                    return (
                      <div
                        key={sub.id}
                        className="bg-white border rounded-xl p-3.5 shadow-2xs border-l-4 border-l-emerald-600 animate-in slide-in-from-bottom duration-300"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-extrabold text-slate-800 truncate max-w-[120px]">
                            {sub.fullName}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400">
                            {sub.submittedAt}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 font-bold mb-2">
                          SĐT: {sub.phone} |{" "}
                          {matchedService
                            ? matchedService.title
                            : "Tư vấn trọn gói"}
                        </p>

                        <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-lg border text-[10px]">
                          <span className="text-slate-450 font-bold">
                            Trạng thái:
                          </span>
                          <span className="flex items-center gap-1 font-bold text-emerald-700 uppercase tracking-wider text-[9px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            Mới tiếp nhận / Đang sắp xếp thợ
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 flex flex-col items-center justify-center text-slate-400">
                  <ClipboardCheck className="size-10 text-slate-300 mb-2 stroke-1" />
                  <p className="text-xs font-bold leading-normal">
                    Chưa có yêu cầu nào được gửi trong phiên này.
                  </p>
                  <p className="text-[10px] text-slate-400 leading-normal max-w-[200px] mx-auto mt-1">
                    Hãy điền thông tin và đăng ký khảo sát ở bảng bên cạnh để
                    kiểm thử CRM.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import {
  ClipboardCheck,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useState } from "react";

import { Button } from "@yan/ui/components/button";
import { Input } from "@yan/ui/components/input";
import { Label } from "@yan/ui/components/label";
import { Textarea } from "@yan/ui/components/textarea";

import { Category, isCategory } from "@/constants/category";
import { CMS_URL } from "@/lib/cms-url";
import { editAttr } from "@/lib/visual-editor/edit-attr";

import type { SiteSettings } from "../../data";
import { Service } from "../../types";
import SectionHeading from "../section-heading/section-heading";
import {
  SEARCH_PARAM,
  SERVICE_CATEGORY_OPTIONS,
  SUCCESS_BANNER_DURATION_MS,
} from "./constants";

// The removed on-device "inbox" kept past submissions (name, phone, address…)
// in localStorage. Clear what earlier visitors left behind, once per page load.
// ponytail: one-off cleanup (added 2026-09-30); delete after a few months.
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("greenorange_submissions");
  } catch {
    // Storage blocked (private mode etc.): nothing to clear.
  }
}

export default function ContactForm({
  services,
  settings,
}: {
  services: Service[];
  settings: SiteSettings;
}) {
  const { company, social, footer } = settings;
  const tel = company.phone.replace(/\s+/g, "");
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
        "Anh/chị vui lòng điền họ tên và số điện thoại để chúng mình liên hệ."
      );
      return;
    }

    // Persist the lead to Directus (public create on `contact_submissions`).
    // snake_case field names; optional fields omitted when blank. `status`
    // defaults to `new` server-side and is never sent from the client.
    const payload: Record<string, unknown> = {
      full_name: fullName,
      phone,
      service_category: serviceCategory,
    };
    if (email) payload.email = email;
    if (companyName) payload.company_name = companyName;
    if (address) payload.address = address;
    if (serviceId) payload.service_id = serviceId;
    if (message) payload.message = message;

    try {
      const res = await fetch(`${CMS_URL}/items/contact_submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`CMS responded ${res.status}`);
    } catch (err) {
      console.error("Contact submission failed:", err);
      alert(
        "Chưa gửi được yêu cầu. Anh/chị thử lại, hoặc gọi hotline giúp chúng mình."
      );
      return;
    }

    // Success response state
    setIsSubmittedSuccessfully(true);
    clearURLParams();

    // Reset the form fields
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

  // Service-group toggle — switches the active category and clears the
  // previously selected service so it can't mismatch the new category.
  const handleSelectCategory = (category: Category) => {
    setServiceCategory(category);
    setServiceId("");
  };

  return (
    <section id="contact" className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <SectionHeading
          cmsId={settings.cmsId}
          fields={[
            "contact_section_eyebrow",
            "contact_section_heading",
            "contact_section_description",
          ]}
          eyebrow={settings.contactSection.eyebrow}
          heading={settings.contactSection.heading}
          description={settings.contactSection.description}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Grid: Form inputs block (7 cols) */}
          <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-[4px] ring-2 ring-sign-ink">
            {isSubmittedSuccessfully && (
              <div
                role="status"
                className="bg-brand-primary-50 border-l-4 border-brand-primary-600 text-brand-primary-900 rounded-[4px] p-4 mb-6 text-left flex gap-3 animate-in fade-in slide-in-from-top-2 duration-300"
              >
                <ClipboardCheck className="size-5 shrink-0 text-brand-primary-600 mt-0.5" />
                <div>
                  <h4
                    className="font-bold text-sm mb-1"
                    data-directus={editAttr({
                      collection: "site_settings",
                      item: settings.cmsId,
                      fields: "contact_section_success_heading",
                    })}
                  >
                    {settings.contactSection.successHeading}
                  </h4>
                  <p
                    className="text-sm"
                    data-directus={editAttr({
                      collection: "site_settings",
                      item: settings.cmsId,
                      fields: "contact_section_success_body",
                    })}
                  >
                    {settings.contactSection.successBody}
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
                    className="text-sign-ink font-semibold text-sm mb-2 block"
                    data-directus={editAttr({
                      collection: "site_settings",
                      item: settings.cmsId,
                      fields: "contact_form_label_full_name",
                    })}
                  >
                    {settings.contactSection.labelFullName}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    required
                    id="fullname"
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-white border-stone-300 focus-visible:border-sign-ink rounded-md h-11 w-full"
                  />
                </div>

                {/* Phone number input */}
                <div>
                  <Label
                    htmlFor="phone"
                    className="text-sign-ink font-semibold text-sm mb-2 block"
                    data-directus={editAttr({
                      collection: "site_settings",
                      item: settings.cmsId,
                      fields: "contact_form_label_phone",
                    })}
                  >
                    {settings.contactSection.labelPhone}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    required
                    id="phone"
                    type="tel"
                    placeholder="0988 123 456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-white border-stone-300 focus-visible:border-sign-ink rounded-md h-11 w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Email input */}
                <div>
                  <Label
                    htmlFor="email"
                    className="text-sign-ink font-semibold text-sm mb-2 block"
                    data-directus={editAttr({
                      collection: "site_settings",
                      item: settings.cmsId,
                      fields: "contact_form_label_email",
                    })}
                  >
                    {settings.contactSection.labelEmail}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="nguyenvana@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white border-stone-300 focus-visible:border-sign-ink rounded-md h-11 w-full"
                  />
                </div>

                {/* Company Name */}
                <div>
                  <Label
                    htmlFor="company"
                    className="text-sign-ink font-semibold text-sm mb-2 block"
                    data-directus={editAttr({
                      collection: "site_settings",
                      item: settings.cmsId,
                      fields: "contact_form_label_company",
                    })}
                  >
                    {settings.contactSection.labelCompany}
                  </Label>
                  <Input
                    id="company"
                    type="text"
                    placeholder="Ví dụ: Highlands Coffee"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="bg-white border-stone-300 focus-visible:border-sign-ink rounded-md h-11 w-full"
                  />
                </div>
              </div>

              {/* Address input */}
              <div>
                <Label
                  htmlFor="address"
                  className="text-sign-ink font-semibold text-sm mb-2 block"
                  data-directus={editAttr({
                    collection: "site_settings",
                    item: settings.cmsId,
                    fields: "contact_form_label_address",
                  })}
                >
                  {settings.contactSection.labelAddress}
                </Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="Số 123, Đường Nguyễn Huệ, Quận 1, TP. HCM"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="bg-white border-stone-300 focus-visible:border-sign-ink rounded-md h-11 w-full"
                />
              </div>

              {/* Service group toggler */}
              <div>
                <Label
                  className="text-sign-ink font-semibold text-sm mb-3 block"
                  data-directus={editAttr({
                    collection: "site_settings",
                    item: settings.cmsId,
                    fields: "contact_form_label_service_group",
                  })}
                >
                  {settings.contactSection.labelServiceGroup}
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  {SERVICE_CATEGORY_OPTIONS.map((cat) => {
                    const CatIcon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectCategory(cat.id)}
                        aria-pressed={serviceCategory === cat.id}
                        className={`py-3 px-2 rounded-md text-sm font-semibold transition-colors cursor-pointer text-center flex flex-col items-center gap-1.5 ${
                          serviceCategory === cat.id
                            ? "bg-sign-ink text-white"
                            : "bg-white text-sign-ink ring-1 ring-inset ring-stone-300 hover:ring-sign-ink"
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
                  className="text-sign-ink font-semibold text-sm mb-2 block"
                  data-directus={editAttr({
                    collection: "site_settings",
                    item: settings.cmsId,
                    fields: "contact_form_label_service_select",
                  })}
                >
                  {settings.contactSection.labelServiceSelect}
                </Label>
                <select
                  id="service-select"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full bg-white border border-stone-300 focus:border-sign-ink focus:outline-none rounded-md px-3 text-sm text-sign-ink h-11"
                >
                  <option value="">Chọn gói dịch vụ</option>
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
                  className="text-sign-ink font-semibold text-sm mb-2 block"
                  data-directus={editAttr({
                    collection: "site_settings",
                    item: settings.cmsId,
                    fields: "contact_form_label_message",
                  })}
                >
                  {settings.contactSection.labelMessage}
                </Label>
                <Textarea
                  id="message"
                  placeholder="Ví dụ: shop quần áo 150m² ở Hoàn Kiếm, cần vệ sinh sàn gỗ và kính mặt tiền, khai trương ngày 20/06"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="bg-white border-stone-300 focus-visible:border-sign-ink rounded-md min-h-[110px] w-full"
                />
              </div>

              {/* Submit CTA button */}
              <Button
                id="contact-form-submit"
                type="submit"
                className="w-full h-12 bg-brand-secondary-600 hover:bg-brand-secondary-700 text-white font-bold text-base rounded-md cursor-pointer flex items-center justify-center gap-2 transition-colors"
                data-directus={editAttr({
                  collection: "site_settings",
                  item: settings.cmsId,
                  fields: "contact_section_cta_label",
                })}
              >
                <Send className="size-4" />
                {settings.contactSection.ctaLabel}
              </Button>
            </form>
          </div>

          {/* Direct contact panel */}
          <aside className="lg:col-span-5 bg-sign-ink text-white rounded-[4px] overflow-hidden">
            <div className="p-6 md:p-8 space-y-5">
              <h3 className="font-heading font-bold uppercase text-2xl text-tape">
                Gọi hoặc nhắn trực tiếp
              </h3>
              {tel && (
                <a
                  href={`tel:${tel}`}
                  className="flex items-center gap-3 font-heading font-extrabold text-3xl hover:underline"
                >
                  <Phone className="size-6 text-brand-secondary-500 shrink-0" />
                  {company.phone}
                </a>
              )}
              {social.zalo && (
                <a
                  href={social.zalo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 h-11 rounded-md bg-[#0068ff] hover:bg-[#0057d6] font-bold transition-colors"
                >
                  <MessageCircle className="size-5" />
                  Nhắn Zalo
                </a>
              )}
              {company.email && (
                <a
                  href={`mailto:${company.email}`}
                  className="flex items-center gap-3 text-sm text-stone-200 hover:text-white"
                >
                  <Mail className="size-4 text-brand-primary-400 shrink-0" />
                  {company.email}
                </a>
              )}
              <div className="space-y-3 text-sm text-stone-300 border-t border-white/15 pt-5">
                <p className="flex gap-3">
                  <MapPin className="size-4 text-brand-secondary-500 shrink-0 mt-0.5" />
                  <span>
                    <span className="block font-semibold text-white">
                      {footer.headquartersLabel}
                    </span>
                    {company.address}
                  </span>
                </p>
                {company.branch && (
                  <p className="flex gap-3">
                    <MapPin className="size-4 text-brand-primary-400 shrink-0 mt-0.5" />
                    <span>
                      <span className="block font-semibold text-white">
                        {footer.branchLabel}
                      </span>
                      {company.branch}
                    </span>
                  </p>
                )}
              </div>
            </div>
            <div className="tape" aria-hidden />
          </aside>
        </div>
      </div>
    </section>
  );
}

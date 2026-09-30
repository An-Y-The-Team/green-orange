import { CategoryFilter } from "@/constants/category";

// Category filter row shared by services, projects and testimonials.
export default function FilterChips({
  label,
  tabs,
  value,
  onChange,
}: {
  /** Accessible name for the filter group, e.g. "Lọc dịch vụ". */
  label: string;
  tabs: { id: CategoryFilter; label: string }[];
  value: CategoryFilter;
  onChange: (id: CategoryFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-10" role="group" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          aria-pressed={value === tab.id}
          className={`h-10 px-4 rounded-md text-sm font-semibold transition-colors cursor-pointer ${
            value === tab.id
              ? "bg-sign-ink text-white"
              : "bg-white text-sign-ink ring-1 ring-inset ring-stone-300 hover:ring-sign-ink"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

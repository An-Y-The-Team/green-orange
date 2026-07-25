import { PageSkeleton } from "@/components/page-skeleton/page-skeleton";

// Group-level fallback: wraps every child page.tsx and nested layout, so routes
// without their own loading.tsx get this. Note it cannot cover this segment's
// own layout — that layout awaits auth() (runtime data), which Next resolves
// before any fallback renders.
export default function DashboardLoading() {
  return <PageSkeleton />;
}

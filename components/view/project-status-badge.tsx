import type { ProjectStatus } from "@/lib/drizzle/project-status";
import { cn } from "@/lib/utils";

// Colour-coded so statuses are easy to scan in a long table.
const statusStyling: Record<ProjectStatus, string> = {
  Current: "border-primary/30 bg-primary/10 text-primary",
  Secured: "border-emerald-300 bg-emerald-50 text-emerald-800",
  Lost: "border-red-300 bg-red-50 text-red-800",
};

export default function ProjectStatusBadge({
  status,
}: {
  status: ProjectStatus;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold",
        statusStyling[status],
      )}
    >
      {status}
    </span>
  );
}

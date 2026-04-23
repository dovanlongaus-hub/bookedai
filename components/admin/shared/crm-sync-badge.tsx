import { AdminBadge } from "@/components/ui/admin-badge";

function toneForStatus(status?: string) {
  switch (status) {
    case "synced":
      return "success";
    case "retrying":
      return "info";
    case "failed":
      return "danger";
    case "manual_review_required":
      return "warning";
    case "pending":
      return "default";
    default:
      return "default";
  }
}

export function CrmSyncBadge({ status }: { status?: string | null }) {
  return (
    <AdminBadge tone={toneForStatus(status || undefined)}>
      CRM {status ? status.replace(/_/g, " ") : "not started"}
    </AdminBadge>
  );
}

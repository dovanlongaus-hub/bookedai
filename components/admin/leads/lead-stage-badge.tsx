import { AdminBadge } from "@/components/ui/admin-badge";

export function LeadStageBadge({
  status,
  pipelineStage,
}: {
  status: string;
  pipelineStage: string;
}) {
  const tone =
    status === "WON"
      ? "success"
      : status === "LOST"
        ? "danger"
        : pipelineStage === "follow_up"
          ? "warning"
          : "info";

  return (
    <AdminBadge tone={tone}>
      {pipelineStage.replace(/_/g, " ")} · {status.toLowerCase()}
    </AdminBadge>
  );
}

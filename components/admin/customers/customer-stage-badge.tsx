import { AdminBadge } from "@/components/ui/admin-badge";

export function CustomerStageBadge({ stage }: { stage: string }) {
  const tone =
    stage === "vip" ? "success" : stage === "at_risk" ? "warning" : "default";

  return <AdminBadge tone={tone}>{stage.replace(/_/g, " ")}</AdminBadge>;
}

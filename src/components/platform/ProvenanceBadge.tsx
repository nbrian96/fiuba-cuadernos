import type { Provenance } from "@/schemas/academic";
import { getProvenanceMeta } from "@/utils/provenance";

export interface ProvenanceBadgeProps {
  provenance: Provenance;
  showFullLabel?: boolean;
  className?: string;
}

export function ProvenanceBadge({
  provenance,
  showFullLabel = false,
  className = "",
}: ProvenanceBadgeProps) {
  const meta = getProvenanceMeta(provenance);
  return (
    <span
      className={`provenance-badge ${meta.badgeClass} ${className}`.trim()}
      title={meta.description}
      data-provenance={provenance}
    >
      {showFullLabel ? meta.label : meta.shortLabel}
    </span>
  );
}

export default ProvenanceBadge;

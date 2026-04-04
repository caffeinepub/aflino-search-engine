import type { WebsiteStatus } from "../backend.d";

// Runtime values from ICP backend are variant objects; cast for in-operator checks
function statusHas(status: WebsiteStatus, key: string): boolean {
  return key in (status as unknown as object);
}

interface StatusBadgeProps {
  status: WebsiteStatus;
  isSeed?: boolean;
  isVerified?: boolean;
  showSeed?: boolean;
  showVerified?: boolean;
}

function getStatusLabel(status: WebsiteStatus): string {
  if (statusHas(status, "approved")) return "Approved";
  if (statusHas(status, "rejected")) return "Rejected";
  return "Pending";
}

function getStatusClasses(status: WebsiteStatus, isSeed?: boolean): string {
  if (statusHas(status, "approved")) {
    return "bg-green-100 text-green-800 border border-green-200";
  }
  if (statusHas(status, "rejected")) {
    return "bg-red-100 text-red-700 border border-red-200";
  }
  // pending
  if (isSeed) {
    return "bg-amber-100 text-amber-800 border border-amber-200";
  }
  return "bg-yellow-100 text-yellow-800 border border-yellow-200";
}

export default function StatusBadge({
  status,
  isSeed,
  isVerified,
  showSeed = true,
  showVerified = true,
}: StatusBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(status, isSeed)}`}
      >
        {getStatusLabel(status)}
        {isSeed && statusHas(status, "pending") && " (Seed)"}
      </span>
      {showSeed &&
        isSeed &&
        (statusHas(status, "approved") || statusHas(status, "rejected")) && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
            Seed
          </span>
        )}
      {showVerified && isVerified && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
          ✓ Verified
        </span>
      )}
    </span>
  );
}

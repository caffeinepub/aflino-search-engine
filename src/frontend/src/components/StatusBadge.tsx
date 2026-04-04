import type { WebsiteStatus } from "../backend.d";

interface StatusBadgeProps {
  status: WebsiteStatus;
  isSeed?: boolean;
  isVerified?: boolean;
  showSeed?: boolean;
  showVerified?: boolean;
}

function getStatusLabel(status: WebsiteStatus): string {
  if ("approved" in status) return "Approved";
  if ("rejected" in status) return "Rejected";
  return "Pending";
}

function getStatusClasses(status: WebsiteStatus, isSeed?: boolean): string {
  if ("approved" in status) {
    return "bg-green-100 text-green-800 border border-green-200";
  }
  if ("rejected" in status) {
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
        {isSeed && "pending" in status && " (Seed)"}
      </span>
      {showSeed && isSeed && ("approved" in status || "rejected" in status) && (
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

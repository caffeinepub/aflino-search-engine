import { ExternalLink } from "lucide-react";
import type { Website } from "../backend.d";
import StatusBadge from "./StatusBadge";

interface WebsiteCardProps {
  website: Website;
  index: number;
}

export default function WebsiteCard({ website, index }: WebsiteCardProps) {
  const displayUrl = website.url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <article
      className="py-4 border-b border-border last:border-b-0"
      data-ocid={`results.item.${index}`}
    >
      <div className="mb-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="font-medium text-green-700 truncate max-w-xs">
          {displayUrl}
        </span>
      </div>
      <a
        href={website.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-link hover:underline text-lg font-medium leading-snug mb-1"
        data-ocid={`results.link.${index}`}
      >
        {website.title}
        <ExternalLink className="h-3.5 w-3.5 opacity-60" />
      </a>
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
        {website.description}
      </p>
      {website.keywords.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {website.keywords.slice(0, 5).map((kw) => (
            <span
              key={kw}
              className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground"
            >
              {kw}
            </span>
          ))}
        </div>
      )}
      <div className="mt-1.5">
        <StatusBadge
          status={website.status}
          isSeed={website.isSeed}
          isVerified={website.isVerified}
        />
      </div>
    </article>
  );
}

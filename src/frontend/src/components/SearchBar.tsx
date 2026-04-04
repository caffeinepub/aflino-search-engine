import { Search } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import { sanitizeText, validateSearchQuery } from "../utils/security";

interface SearchBarProps {
  defaultValue?: string;
  placeholder?: string;
  onSearch: (query: string) => void;
  size?: "default" | "large";
  className?: string;
}

export default function SearchBar({
  defaultValue = "",
  placeholder = "Aflino Search...",
  onSearch,
  size = "default",
  className = "",
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && value.trim()) {
      const sanitized = sanitizeText(value.trim());
      if (validateSearchQuery(sanitized) !== null) return;
      onSearch(sanitized);
    }
  };

  const handleSearch = () => {
    if (value.trim()) {
      const sanitized = sanitizeText(value.trim());
      if (validateSearchQuery(sanitized) !== null) return;
      onSearch(sanitized);
    }
  };

  const isLarge = size === "large";

  return (
    <div
      className={`relative flex items-center bg-white border border-[#E5E7EB] rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.07)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.10)] focus-within:border-[#006AFF] focus-within:shadow-[0_0_0_3px_rgba(0,106,255,0.12)] transition-all ${isLarge ? "h-14" : "h-11"} ${className}`}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`flex-1 bg-transparent outline-none rounded-full ${
          isLarge ? "pl-5 pr-3 text-base" : "pl-4 pr-3 text-sm"
        } text-foreground placeholder:text-muted-foreground`}
        data-ocid="search.input"
      />
      <button
        type="button"
        onClick={handleSearch}
        className={`mr-1 flex items-center justify-center rounded-full bg-[#006AFF] hover:bg-[#0052CC] text-white font-medium transition-colors ${
          isLarge ? "h-9 w-9" : "h-7 w-7"
        }`}
        aria-label="Search"
        data-ocid="search.button"
      >
        <Search className={isLarge ? "h-4 w-4" : "h-3 w-3"} />
      </button>
    </div>
  );
}

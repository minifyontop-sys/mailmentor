import { cn } from "@/lib/utils";

interface BrandProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
}

const SIZES = {
  sm: { mark: 16, gap: "gap-1.5", text: "text-[13px]" },
  md: { mark: 22, gap: "gap-2", text: "text-[15px]" },
  lg: { mark: 36, gap: "gap-3", text: "text-3xl" },
};

export function Brand({ size = "md", showWordmark = true, className }: BrandProps) {
  const s = SIZES[size];
  return (
    <div className={cn("flex items-center", s.gap, className)}>
      <BrandMark size={s.mark} />
      {showWordmark && (
        <span
          className={cn(
            "font-semibold tracking-tight text-foreground",
            size === "lg" && "font-serif-italic",
            s.text
          )}
        >
          MailMentor
        </span>
      )}
    </div>
  );
}

export function BrandMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="brand-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="hsl(36 65% 55%)" />
          <stop offset="100%" stopColor="hsl(18 55% 45%)" />
        </linearGradient>
        <linearGradient id="brand-spark" x1="20" y1="6" x2="28" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="hsl(38 92% 60%)" />
          <stop offset="100%" stopColor="hsl(18 55% 45%)" />
        </linearGradient>
      </defs>
      <rect
        x="2"
        y="6"
        width="22"
        height="18"
        rx="4"
        fill="url(#brand-grad)"
      />
      <path
        d="M3.5 9.5L13 16.5L22.5 9.5"
        stroke="hsl(35 18% 96% / 0.9)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M25 4L27 9L25 14L23 9Z"
        fill="url(#brand-spark)"
      />
      <circle cx="25" cy="9" r="1.2" fill="hsl(35 18% 96%)" />
    </svg>
  );
}

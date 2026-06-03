import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  width,
  height,
}: {
  className?: string;
  width?: string | number;
  height?: string | number;
}) {
  return (
    <div
      className={cn("shimmer rounded-md", className)}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
      }}
    />
  );
}

export function EmailRowSkeleton() {
  return (
    <div className="flex flex-col gap-2 border-b border-border/40 px-4 py-3.5">
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="ml-auto h-3 w-10" />
      </div>
      <Skeleton className="h-3.5 w-3/4" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

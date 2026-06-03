"use client";

import Link from "next/link";

import type { ExtractedTask } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { useTaskStore } from "@/store/taskStore";
import { cn } from "@/lib/utils";

export function TaskCard({ task }: { task: ExtractedTask }) {
  const toggleDone = useTaskStore((s) => s.toggleDone);

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/40",
        task.done && "opacity-60"
      )}
    >
      <Checkbox
        checked={task.done}
        onCheckedChange={() => toggleDone(task.id)}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[13.5px] leading-snug",
            task.done
              ? "text-muted-foreground line-through"
              : "text-foreground"
          )}
        >
          {task.description}
        </p>
        <div className="mt-1 flex items-center gap-3 text-[11.5px] text-muted-foreground">
          {task.deadline && (
            <span className="tabular-nums">{task.deadline}</span>
          )}
          <Link
            href={`/inbox?email=${task.sourceEmailId}`}
            className="truncate text-muted-foreground transition-colors hover:text-foreground"
          >
            ← {task.sourceEmailSubject}
          </Link>
        </div>
      </div>
    </div>
  );
}

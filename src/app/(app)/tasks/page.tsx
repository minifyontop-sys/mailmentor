"use client";

import { Fragment, useMemo } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

import type { ExtractedTask } from "@/types";
import { TaskCard } from "@/components/TaskCard";
import { useTaskStore, selectUndoneCount } from "@/store/taskStore";

export default function TasksPage() {
  const tasks = useTaskStore((s) => s.tasks);
  const undone = useTaskStore(selectUndoneCount);

  const grouped = useMemo(() => {
    const open = tasks.filter((t) => !t.done);
    const done = tasks.filter((t) => t.done);
    return { open, done };
  }, [tasks]);

  return (
    <div className="h-full w-full overflow-y-auto bg-background/30">
      <div className="mx-auto w-full max-w-2xl px-6 py-10">
        <motion.header
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
          className="mb-8"
        >
          <h1 className="font-serif-italic text-[28px] font-normal leading-none tracking-tight text-foreground">
            Tasks
          </h1>
          <p className="mt-2 text-[12.5px] text-muted-foreground">
            <span className="tabular-nums">{undone}</span> open
            <span className="mx-1.5 opacity-50">·</span>
            <span className="tabular-nums">{grouped.done.length}</span> completed
            <span className="mx-1.5 opacity-50">·</span>
            <span className="tabular-nums">{tasks.length}</span> total
          </p>
        </motion.header>

        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-px flex-1 bg-border/60" />
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Open
            </h2>
            <span className="h-px flex-1 bg-border/60" />
          </div>
          {grouped.open.length === 0 ? (
            <TasksEmptyState
              title="Inbox zero."
              body="Nothing open. Extract more from your inbox."
            />
          ) : (
            <TaskList tasks={grouped.open} />
          )}
        </section>

        {grouped.done.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-px flex-1 bg-border/60" />
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Completed
              </h2>
              <span className="h-px flex-1 bg-border/60" />
            </div>
            <TaskList tasks={grouped.done} />
          </section>
        )}
      </div>
    </div>
  );
}

function TaskList({ tasks }: { tasks: ExtractedTask[] }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 1 },
        show: {
          opacity: 1,
          transition: { staggerChildren: 0.025, delayChildren: 0.05 },
        },
      }}
      className="overflow-hidden rounded-lg border border-border bg-card/40 backdrop-blur-sm"
    >
      {tasks.map((t, i) => (
        <Fragment key={t.id}>
          {i > 0 && <div className="h-px bg-border/60" />}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 4 },
              show: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          >
            <TaskCard task={t} />
          </motion.div>
        </Fragment>
      ))}
    </motion.div>
  );
}

function TasksEmptyState({ title, body }: { title: string; body: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/20 px-6 py-12 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-secondary/30">
        <CheckCircle2
          className="h-5 w-5 text-primary"
          strokeWidth={1.5}
        />
      </div>
      <h3 className="mt-5 font-serif-italic text-2xl text-foreground">
        {title}
      </h3>
      <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed text-muted-foreground">
        {body}
      </p>
    </motion.div>
  );
}

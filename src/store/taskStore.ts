"use client";

import { create } from "zustand";
import seedTasks from "@/data/seedTasks.json";
import type { ExtractedTask } from "@/types";

interface TaskState {
  tasks: ExtractedTask[];
  toggleDone: (id: string) => void;
  addTasks: (
    items: { description: string; deadline?: string }[],
    sourceEmailId: string,
    sourceEmailSubject: string
  ) => void;
}

const tasks = seedTasks as ExtractedTask[];

export const useTaskStore = create<TaskState>((set) => ({
  tasks,
  toggleDone: (id) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    })),
  addTasks: (items, sourceEmailId, sourceEmailSubject) =>
    set((s) => {
      const existing = new Set(
        s.tasks
          .filter((t) => t.sourceEmailId === sourceEmailId)
          .map((t) => t.description.toLowerCase().trim())
      );
      const fresh: ExtractedTask[] = items
        .filter(
          (it) => !existing.has(it.description.toLowerCase().trim())
        )
        .map((it) => ({
          id: `tk-${sourceEmailId}-${Math.random().toString(36).slice(2, 8)}`,
          description: it.description,
          deadline: it.deadline,
          sourceEmailId,
          sourceEmailSubject,
          done: false,
          createdAt: new Date().toISOString(),
        }));
      return { tasks: [...s.tasks, ...fresh] };
    }),
}));

export function selectUndoneCount(s: TaskState): number {
  return s.tasks.filter((t) => !t.done).length;
}

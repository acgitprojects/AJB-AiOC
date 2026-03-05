"use client";

import { useState, useCallback, useEffect } from "react";
import { type MyTask, type Agent } from "@ajb/contract";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { TaskDetailModal } from "@/components/TaskDetailModal";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

const MONO  = "font-mono-jet";
const LABEL = "text-xs text-slate-500 font-medium uppercase tracking-widest";

type KanbanCol = "backlog" | "in-progress" | "review" | "done";

const TASK_TO_BOARD: Record<MyTask["status"], KanbanCol> = {
  pending:       "backlog",
  "in-progress": "in-progress",
  delegated:     "review",
  done:          "done",
};
const BOARD_TO_TASK: Record<KanbanCol, MyTask["status"]> = {
  backlog:       "pending",
  "in-progress": "in-progress",
  review:        "delegated",
  done:          "done",
};

const kanbanCols: { key: KanbanCol; label: string; accent: string }[] = [
  { key: "backlog",     label: "Backlog",     accent: "#475569" },
  { key: "in-progress", label: "In Progress", accent: "#00d4ff" },
  { key: "review",      label: "Review",      accent: "#f59e0b" },
  { key: "done",        label: "Done",        accent: "#10d6a0" },
];

const PRIORITY_COLOR: Record<MyTask["priority"], string> = {
  high:   "#ef4444",
  medium: "#f59e0b",
  low:    "#475569",
};

// ─── Card ─────────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  agentName,
  onClick,
  isDragging = false,
}: {
  task: MyTask;
  agentName: (id: string) => string;
  onClick?: () => void;
  isDragging?: boolean;
}) {
  const pc = PRIORITY_COLOR[task.priority];
  return (
    <div
      onClick={onClick}
      className={`glass rounded-lg p-2.5 transition-all cursor-pointer ${
        isDragging
          ? "opacity-50 shadow-none"
          : "hover:border-[rgba(0,212,255,0.25)] shadow-card"
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Priority dot */}
        <span
          className="w-2 h-2 rounded-full shrink-0 mt-1"
          style={{ background: pc, boxShadow: `0 0 5px ${pc}80` }}
        />
        <p className="text-slate-200 text-xs font-medium leading-snug flex-1">{task.title}</p>
      </div>
      <div className="flex items-center justify-between mt-2 pl-4">
        <span className={`${MONO} text-[11px] text-slate-500 truncate`}>
          {agentName(task.createdByAgent)}
        </span>
        {task.tags[0] && (
          <span
            className={`${MONO} text-[11px] px-1.5 py-0.5 rounded shrink-0 ml-1`}
            style={{ background: "rgba(255,255,255,0.05)", color: "#64748b" }}
          >
            {task.tags[0]}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Draggable card wrapper ────────────────────────────────────────────────────

function DraggableCard({
  task,
  agentName,
  onDetail,
}: {
  task: MyTask;
  agentName: (id: string) => string;
  onDetail: (t: MyTask) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <TaskCard
        task={task}
        agentName={agentName}
        onClick={isDragging ? undefined : () => onDetail(task)}
        isDragging={isDragging}
      />
    </div>
  );
}

// ─── Droppable column ─────────────────────────────────────────────────────────

function DroppableColumn({
  col,
  tasks,
  agentName,
  onDetail,
}: {
  col: (typeof kanbanCols)[number];
  tasks: MyTask[];
  agentName: (id: string) => string;
  onDetail: (t: MyTask) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <div
      className="rounded-xl border transition-colors"
      style={{
        borderColor: isOver ? `${col.accent}60` : `${col.accent}25`,
        background: isOver ? `${col.accent}12` : `${col.accent}06`,
      }}
    >
      <div
        className="px-3 py-2.5 flex items-center justify-between border-b"
        style={{ borderColor: `${col.accent}20` }}
      >
        <span
          className={`${MONO} text-xs font-semibold uppercase tracking-widest`}
          style={{ color: col.accent }}
        >
          {col.label}
        </span>
        <span
          className={`${MONO} text-xs px-1.5 py-0.5 rounded-full`}
          style={{ background: `${col.accent}18`, color: col.accent }}
        >
          {tasks.length}
        </span>
      </div>

      <div ref={setNodeRef} className="p-2 space-y-2 min-h-[120px]">
        {tasks.length === 0 && (
          <p className="text-slate-700 text-xs p-2">No tasks</p>
        )}
        {tasks.map(t => (
          <DraggableCard key={t.id} task={t} agentName={agentName} onDetail={onDetail} />
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BoardPage() {
  const [tasks,      setTasks]      = useState<MyTask[]>([]);
  const [agents,     setAgents]     = useState<Agent[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [detailTask, setDetailTask] = useState<MyTask | null>(null);
  const [activeTask, setActiveTask] = useState<MyTask | null>(null);

  useEffect(() => {
    Promise.all([apiClient.tasks.list({}), apiClient.agents.list({})])
      .then(([tr, ar]) => {
        if (tr.status === 200) setTasks(tr.body);
        if (ar.status === 200) setAgents(ar.body);
      })
      .finally(() => setLoading(false));
  }, []);

  const agentMap  = Object.fromEntries(agents.map(a => [a.id, a.name]));
  const agentName = (id: string) => agentMap[id] ?? id;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragStart = useCallback((e: DragStartEvent) => {
    const t = tasks.find(x => x.id === e.active.id);
    if (t) setActiveTask(t);
  }, [tasks]);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;
    const col = over.id as KanbanCol;
    const taskStatus = BOARD_TO_TASK[col];
    if (!taskStatus) return;
    const task = tasks.find(t => t.id === active.id);
    if (!task || task.status === taskStatus) return;
    setTasks(prev => prev.map(t => t.id === active.id ? { ...t, status: taskStatus } : t));
    apiClient.tasks.patch({ params: { id: active.id as string }, body: { status: taskStatus } })
      .catch(() => {});
  }, [tasks]);

  return (
    <div className="p-4 lg:p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className={`${MONO} text-xl font-bold text-slate-100 tracking-widest uppercase`}>
          Task Board
        </h1>
        <p className={`${LABEL} mt-1`}>Kanban — drag tasks across columns</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-slate-500">
          <Loader2 size={20} className="animate-spin text-[#00d4ff]" />
          <span className="text-sm">Loading board…</span>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
            {kanbanCols.map(col => {
              const colTasks = tasks.filter(t => TASK_TO_BOARD[t.status] === col.key);
              return (
                <DroppableColumn
                  key={col.key}
                  col={col}
                  tasks={colTasks}
                  agentName={agentName}
                  onDetail={setDetailTask}
                />
              );
            })}
          </div>

          <DragOverlay>
            {activeTask && (
              <div className="rotate-2 opacity-90 w-full">
                <TaskCard task={activeTask} agentName={agentName} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          agents={agents}
          agentName={agentName}
          onClose={() => setDetailTask(null)}
          onPatched={(t) => {
            setTasks(prev => prev.map(x => x.id === t.id ? t : x));
            setDetailTask(t);
          }}
        />
      )}
    </div>
  );
}

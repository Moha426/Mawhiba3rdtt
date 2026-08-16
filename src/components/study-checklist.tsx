import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Plus, Trash2, CheckSquare, Sparkles } from "lucide-react";

const TASKS_STORAGE_KEY = "talented_study_checklist_tasks_v2";

const DEFAULT_TASKS = [
  { id: 1, text: "حل أسئلة نهاية الفصل", done: false },
  { id: 2, text: "مراجعة تلخيص المفاهيم", done: true },
  { id: 3, text: "حل نماذج الاختبار التجريبي", done: false },
];

export function StudyChecklist({ onShareList }: { onShareList?: (tasksSummary: string) => void }) {
  const [tasks, setTasks] = useState<Array<{ id: number; text: string; done: boolean }>>(() => {
    try {
      const saved = localStorage.getItem(TASKS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_TASKS;
    } catch {
      return DEFAULT_TASKS;
    }
  });
  const [newText, setNewText] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    } catch {}
  }, [tasks]);

  const toggleTask = (id: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const addTask = () => {
    if (!newText.trim()) return;
    setTasks((prev) => [...prev, { id: Date.now(), text: newText.trim(), done: false }]);
    setNewText("");
  };

  const deleteTask = (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const completedCount = tasks.filter((t) => t.done).length;

  return (
    <div className="flex flex-col h-full min-h-[300px] w-full gap-3 p-1.5 overflow-hidden">
      {/* Progress summary */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/25 border border-white/5 text-xs shrink-0">
        <div className="flex items-center gap-1.5 text-[#949ba4]">
          <Sparkles className="h-3.5 w-3.5 text-[#5865f2]" />
          <span className="font-medium">المهام المنجزة:</span>
        </div>
        <span className="font-bold text-[#23a55a] bg-[#23a55a]/15 border border-[#23a55a]/30 px-2.5 py-0.5 rounded-full">
          {completedCount} من {tasks.length}
        </span>
      </div>

      {/* Input */}
      <div className="flex items-center gap-1.5 shrink-0">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addTask();
          }}
          placeholder="أضف مهمة مذاكرة جديدة..."
          className="flex-1 h-9 px-3 rounded-xl bg-[#383a40] text-xs text-[#dbdee1] placeholder-[#80848e] outline-none border border-white/5 focus:border-[#5865f2] transition-colors"
          dir="rtl"
        />
        <button
          onClick={addTask}
          disabled={!newText.trim()}
          className="h-9 px-3 rounded-xl bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center transition-all shrink-0 shadow-sm"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Task items list - flexible with full scroll */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar">
        {tasks.map((task) => (
          <div
            key={task.id}
            onClick={() => toggleTask(task.id)}
            className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 cursor-pointer transition-all group"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {task.done ? (
                <CheckCircle2 className="h-4 w-4 text-[#23a55a] shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-[#80848e] shrink-0 group-hover:text-[#dbdee1]" />
              )}
              <span
                className={`text-xs break-words leading-relaxed select-none ${
                  task.done ? "line-through text-[#80848e]" : "text-[#dbdee1]"
                }`}
              >
                {task.text}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteTask(task.id);
              }}
              title="حذف المهمة"
              className="opacity-0 group-hover:opacity-100 text-[#80848e] hover:text-[#ed4245] p-1.5 rounded-lg hover:bg-white/5 transition-all shrink-0 ml-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-6 text-xs text-[#80848e]">
            لا توجد مهام حالياً. أضف مهمة جديدة للبدء!
          </div>
        )}
      </div>

      {/* Share list button */}
      {onShareList && tasks.length > 0 && (
        <button
          onClick={() => {
            const summary = `📋 قائمة مهامي للمذاكرة:\n` + tasks.map(t => `${t.done ? "✅" : "⏳"} ${t.text}`).join("\n");
            onShareList(summary);
          }}
          className="w-full py-2 rounded-xl bg-[#5865f2]/10 hover:bg-[#5865f2]/20 text-xs font-semibold text-[#c9cdfb] border border-[#5865f2]/20 flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-sm"
        >
          <CheckSquare className="h-3.5 w-3.5" />
          <span>مشاركة القائمة في الدردشة</span>
        </button>
      )}
    </div>
  );
}

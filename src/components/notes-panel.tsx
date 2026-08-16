import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NotebookPen, X, Trash2, Check, Loader2, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useListNotes, useCreateNote, useUpdateNote, useDeleteNote } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface NotesPanelProps {
  entityType: "assignment" | "quiz";
  entityId: number;
  label?: string;
}

export function NotesPanel({ entityType, entityId, label }: NotesPanelProps) {
  const { isSignedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const queryClient = useQueryClient();
  const notesKey = ["notes", entityType, entityId];

  const { data: notes = [], isLoading } = useListNotes(
    { entityType, entityId },
    { query: { enabled: !!isSignedIn && open, queryKey: notesKey } }
  );

  const createNote = useCreateNote({
    mutation: {
      onSuccess: () => {
        setNewContent("");
        queryClient.invalidateQueries({ queryKey: notesKey });
      },
    },
  });

  const updateNote = useUpdateNote({
    mutation: {
      onSuccess: () => {
        setEditingId(null);
        queryClient.invalidateQueries({ queryKey: notesKey });
      },
    },
  });

  const deleteNote = useDeleteNote({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: notesKey });
      },
    },
  });

  if (!isSignedIn) return null;

  const handleCreate = () => {
    if (!newContent.trim()) return;
    createNote.mutate({ data: { entityType, entityId, content: newContent.trim() } });
  };

  const handleUpdate = (id: number) => {
    if (!editContent.trim()) return;
    updateNote.mutate({ id, data: { content: editContent.trim() } });
  };

  const startEdit = (id: number, content: string) => {
    setEditingId(id);
    setEditContent(content);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors py-0.5"
        title="ملاحظاتي"
      >
        <NotebookPen className="h-3.5 w-3.5" />
        {notes.length > 0 && (
          <span className="bg-primary/15 text-primary rounded-full px-1.5 py-0 text-[10px] font-bold">
            {notes.length}
          </span>
        )}
        {label && <span>{label}</span>}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:left-auto sm:right-8 sm:w-[380px] z-50 bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/30">
                <div className="flex items-center gap-2">
                  <NotebookPen className="h-4 w-4 text-primary" />
                  <span className="font-bold text-sm">ملاحظاتي الخاصة</span>
                  {notes.length > 0 && (
                    <span className="text-xs text-muted-foreground">({notes.length})</span>
                  )}
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
                {isLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : notes.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">لا توجد ملاحظات بعد</p>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="group bg-muted/30 rounded-xl p-3 space-y-1.5 border border-border/30">
                      {editingId === note.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="text-sm rounded-lg min-h-[80px] resize-none"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="h-7 text-xs rounded-lg flex-1"
                              onClick={() => handleUpdate(note.id)}
                              disabled={updateNote.isPending}
                            >
                              {updateNote.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              حفظ
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs rounded-lg"
                              onClick={() => setEditingId(null)}
                            >
                              إلغاء
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.content}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(note.createdAt), "d MMM، HH:mm", { locale: ar })}
                              {note.updatedAt && " (محرر)"}
                            </span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => startEdit(note.id, note.content)}
                                className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                              >
                                <PencilLine className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => deleteNote.mutate({ id: note.id })}
                                className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="px-4 pb-4 pt-1 space-y-2 border-t border-border/40">
                <Textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="اكتب ملاحظة..."
                  className="text-sm rounded-xl min-h-[72px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleCreate();
                  }}
                />
                <Button
                  className="w-full h-9 rounded-xl text-sm gap-2"
                  onClick={handleCreate}
                  disabled={!newContent.trim() || createNote.isPending}
                >
                  {createNote.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <NotebookPen className="h-3.5 w-3.5" />}
                  إضافة ملاحظة
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

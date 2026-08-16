import { useState, useRef, useEffect } from "react";
import { 
  useListAssignments, 
  useCreateAssignment, 
  useUpdateAssignment, 
  useDeleteAssignment,
  useListSubjects,
  useReorderAssignments,
  useListEvents,
  getListAssignmentsQueryKey,
  Assignment,
} from "@workspace/api-client-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Link as LinkIcon, Trash, Upload, FileText, X, Loader2, Search, Tag, Folder, GripVertical, ListChecks, Sparkles, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-state";
import { ASSIGNMENT_TYPE_LABELS, ASSIGNMENT_PRIORITY_LABELS, TYPE_COLORS, PRIORITY_COLORS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { ar } from "date-fns/locale";

function SortableAssignmentRow({
  item,
  onEdit,
  onDelete,
}: {
  item: Assignment;
  onEdit: (item: Assignment) => void;
  onDelete: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`hover:bg-muted/30 transition-colors ${isDragging ? "bg-muted/50 shadow-lg" : ""}`}
    >
      <td className="px-2 py-3 w-8">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none flex items-center justify-center w-6 h-6"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="px-4 py-3 font-medium">
        {item.title}
        {item.attachmentLinks && item.attachmentLinks.length > 0 && (
          <span className="mr-2 text-xs text-muted-foreground">
            ({item.attachmentLinks.length} مرفق)
          </span>
        )}
        {(item as any).checklistItems && (item as any).checklistItems.length > 0 && (
          <span className="mr-1 inline-flex items-center gap-0.5 text-xs text-violet-500">
            <ListChecks className="h-3 w-3" />
            {(item as any).checklistItems.length}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.subjectColor || '#000' }} />
          {item.subjectName}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1 flex-wrap">
          <Badge className={`text-[10px] border-0 ${TYPE_COLORS[item.type] || ""}`}>{ASSIGNMENT_TYPE_LABELS[item.type]}</Badge>
          <Badge className={`text-[10px] border-0 ${PRIORITY_COLORS[item.priority] || ""}`}>{ASSIGNMENT_PRIORITY_LABELS[item.priority]}</Badge>
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {format(parseISO(item.dueDate), "d MMM yyyy", { locale: ar })}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => onEdit(item)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(item.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

const ASSIGNMENT_TYPE_OPTIONS = ["homework", "exam", "project", "reading", "other"];
const ASSIGNMENT_PRIORITY_OPTIONS = ["low", "normal", "high", "urgent"];

const PRIORITY_LEVELS = ["low", "normal", "high", "urgent"] as const;

const TYPE_BASE_LEVEL: Record<string, number> = {
  exam: 2,
  project: 2,
  class_activity: 1,
  homework: 1,
  reading: 0,
  other: 1,
};

function calcAutoPriority(type: string, dueDate: string, _subjectName?: string): string {
  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.ceil((new Date(dueDate).setHours(23, 59, 59, 999) - Date.now()) / msPerDay);
  let level = TYPE_BASE_LEVEL[type] ?? 1;
  if (days <= 1) level = 3;
  else if (days <= 3) level = Math.max(level, 2);
  else if (days <= 7) level = Math.max(level, 1);
  return PRIORITY_LEVELS[Math.min(level, 3)];
}

const FILE_CATEGORIES = [
  "كتاب مقرر",
  "ورقة عمل",
  "شرح وملخص",
  "اختبار سابق",
  "حل نموذجي",
  "مقاطع مرئية",
  "روابط مفيدة",
  "أخرى",
];

function CategoryCombobox({
  value,
  onChange,
  placeholder = "التصنيف (اختياري)",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value);

  useEffect(() => { setInputVal(value); }, [value]);

  const filtered = FILE_CATEGORIES.filter(
    (c) => !inputVal.trim() || c.includes(inputVal.trim())
  );

  return (
    <div className="relative">
      <Input
        value={inputVal}
        onChange={(e) => {
          setInputVal(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={`text-xs ${className}`}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-[200] top-full mt-1 right-0 left-0 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
          {filtered.map((cat) => (
            <button
              key={cat}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setInputVal(cat);
                onChange(cat);
                setOpen(false);
              }}
              className="w-full text-right px-3 py-2 text-xs hover:bg-muted transition-colors"
            >
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface UploadedFile {
  name: string;
  label: string;
  category: string;
  objectPath: string;
  url: string;
}

interface AttachmentLink {
  url: string;
  label?: string;
  category?: string;
}

function encodeAttachment(att: AttachmentLink): string {
  if (!att.label && !att.category) return att.url;
  return JSON.stringify(att);
}

function decodeAttachment(raw: string): AttachmentLink {
  if (raw.startsWith("{")) {
    try {
      return JSON.parse(raw) as AttachmentLink;
    } catch {
      return { url: raw };
    }
  }
  return { url: raw };
}

async function requestUploadUrl(file: File): Promise<{ uploadURL: string; objectPath: string; contentType: string }> {
  const contentType = file.type || "application/octet-stream";
  const res = await fetch("/api/storage/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType }),
  });
  if (!res.ok) throw new Error("فشل في الحصول على رابط الرفع");
  const data = await res.json();
  return { ...data, contentType };
}

async function uploadToGcs(uploadURL: string, file: File, contentType: string): Promise<void> {
  const res = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!res.ok) throw new Error(`فشل رفع الملف (${res.status})`);
}

export function AssignmentsTab() {
  const { data: rawAssignments, isLoading } = useListAssignments();
  const { data: subjects } = useListSubjects();
  
  const createAssignment = useCreateAssignment();
  const updateAssignment = useUpdateAssignment();
  const deleteAssignment = useDeleteAssignment();
  const reorderAssignments = useReorderAssignments();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [localOrder, setLocalOrder] = useState<Assignment[]>([]);

  useEffect(() => {
    if (rawAssignments) setLocalOrder(rawAssignments as Assignment[]);
  }, [rawAssignments]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localOrder.findIndex((a) => a.id === active.id);
    const newIndex = localOrder.findIndex((a) => a.id === over.id);
    const reordered = arrayMove(localOrder, oldIndex, newIndex);
    setLocalOrder(reordered);

    reorderAssignments.mutate({
      data: {
        items: reordered.map((a, idx) => ({ id: a.id, sortOrder: idx })),
      },
    } as any, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAssignmentsQueryKey() });
      },
      onError: () => {
        setLocalOrder(rawAssignments as Assignment[]);
        toast({ title: "فشل حفظ الترتيب", variant: "destructive" });
      },
    });
  };

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [adminSearch, setAdminSearch] = useState("");
  
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [type, setType] = useState<string>("homework");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>(() =>
    calcAutoPriority("homework", new Date(Date.now() + 86400000).toISOString().split('T')[0])
  );
  const [isAutoPriority, setIsAutoPriority] = useState(true);
  const [assignedDate, setAssignedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [attachmentLinks, setAttachmentLinks] = useState<AttachmentLink[]>([]);
  const [newLink, setNewLink] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkCategory, setNewLinkCategory] = useState("");
  const [examType, setExamType] = useState("");
  const [pageNumber, setPageNumber] = useState("");
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [eventId, setEventId] = useState<string>("");

  const { data: events } = useListEvents({});

  useEffect(() => {
    if (isOpen && !editingId && !subjectId && subjects?.length) {
      setSubjectId(subjects[0].id.toString());
    }
  }, [isOpen, subjects, editingId, subjectId]);

  useEffect(() => {
    if (isAutoPriority && isOpen) {
      const subjectName = subjects?.find(s => s.id.toString() === subjectId)?.name;
      setPriority(calcAutoPriority(type, dueDate, subjectName));
    }
  }, [type, dueDate, subjectId, isAutoPriority, isOpen, subjects]);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setIsUploading(true);
    const succeeded: typeof uploadedFiles = [];
    const failed: string[] = [];
    try {
      for (const file of files) {
        try {
          const { uploadURL, objectPath, contentType } = await requestUploadUrl(file);
          await uploadToGcs(uploadURL, file, contentType);
          const url = `/api/storage${objectPath}`;
          succeeded.push({ name: file.name, label: file.name, category: "أخرى", objectPath, url });
        } catch (fileErr: any) {
          failed.push(`${file.name}: ${fileErr.message}`);
        }
      }
      if (succeeded.length) {
        setUploadedFiles(prev => [...prev, ...succeeded]);
        toast({ title: `تم رفع ${succeeded.length} ملف بنجاح ✓` });
      }
      if (failed.length) {
        toast({ title: "فشل رفع بعض الملفات", description: failed.join("\n"), variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "خطأ في رفع الملف", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const updateFileLabel = (idx: number, label: string) => {
    setUploadedFiles(prev => prev.map((f, i) => i === idx ? { ...f, label } : f));
  };

  const updateFileCategory = (idx: number, category: string) => {
    setUploadedFiles(prev => prev.map((f, i) => i === idx ? { ...f, category } : f));
  };

  const removeUploadedFile = (idx: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const resetForm = () => {
    const defaultType = "homework";
    const defaultDue = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setTitle("");
    setSubjectId(subjects?.[0]?.id.toString() || "");
    setType(defaultType);
    setDescription("");
    setIsAutoPriority(true);
    setPriority(calcAutoPriority(defaultType, defaultDue));
    setAssignedDate(new Date().toISOString().split('T')[0]);
    setDueDate(defaultDue);
    setAttachmentLinks([]);
    setNewLink("");
    setNewLinkLabel("");
    setNewLinkCategory("");
    setExamType("");
    setPageNumber("");
    setEventId("");
    setUploadedFiles([]);
    setChecklistItems([]);
    setNewChecklistItem("");
  };

  const handleOpenNew = () => {
    setEditingId(null);
    resetForm();
    setIsOpen(true);
  };

  const handleOpenEdit = (assignment: any) => {
    setEditingId(assignment.id);
    setTitle(assignment.title);
    setSubjectId(assignment.subjectId.toString());
    setType(assignment.type);
    setDescription(assignment.description || "");
    setIsAutoPriority(false);
    setPriority(assignment.priority);
    setAssignedDate(assignment.assignedDate.split('T')[0]);
    setDueDate(assignment.dueDate.split('T')[0]);
    
    const allLinks: string[] = assignment.attachmentLinks || [];
    const fileLinks = allLinks.filter((l: string) => {
      const decoded = decodeAttachment(l);
      return decoded.url.startsWith("/api/storage");
    });
    const urlLinks = allLinks.filter((l: string) => {
      const decoded = decodeAttachment(l);
      return !decoded.url.startsWith("/api/storage");
    });
    
    setUploadedFiles(fileLinks.map((raw: string) => {
      const decoded = decodeAttachment(raw);
      const name = decoded.url.split("/").pop() || decoded.url;
      return {
        name,
        label: decoded.label || name,
        category: decoded.category || "أخرى",
        objectPath: decoded.url.replace("/api/storage", ""),
        url: decoded.url,
      };
    }));
    setAttachmentLinks(urlLinks.map(decodeAttachment));
    setExamType(assignment.examType || "");
    setPageNumber(assignment.pageNumber || "");
    setEventId((assignment as any).eventId?.toString() || "");
    setChecklistItems((assignment as any).checklistItems || []);
    setNewChecklistItem("");
    setIsOpen(true);
  };

  const addLink = () => {
    if (newLink.trim()) {
      setAttachmentLinks(prev => [...prev, {
        url: newLink.trim(),
        label: newLinkLabel.trim() || undefined,
        category: newLinkCategory.trim() || undefined,
      }]);
      setNewLink("");
      setNewLinkLabel("");
      setNewLinkCategory("");
    }
  };

  const updateLinkField = (idx: number, field: keyof AttachmentLink, value: string) => {
    setAttachmentLinks(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const removeLink = (idx: number) => {
    setAttachmentLinks(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "العنوان مطلوب", variant: "destructive" });
      return;
    }
    if (!subjectId) {
      toast({ title: "يرجى اختيار المادة", variant: "destructive" });
      return;
    }

    const allLinks = [
      ...attachmentLinks.map(encodeAttachment),
      ...uploadedFiles.map(f => encodeAttachment({ url: f.url, label: f.label, category: f.category })),
    ];

    const data = {
      title: title.trim(),
      subjectId: parseInt(subjectId),
      type,
      description: description || undefined,
      priority,
      assignedDate,
      dueDate,
      attachmentLinks: allLinks.length > 0 ? allLinks : undefined,
      checklistItems: checklistItems.length > 0 ? checklistItems : undefined,
      examType: type === 'exam' ? examType || undefined : undefined,
      pageNumber: type === 'homework' ? pageNumber || undefined : undefined,
      eventId: eventId ? parseInt(eventId) : null,
    };

    if (editingId) {
      updateAssignment.mutate({ id: editingId, data } as any, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAssignmentsQueryKey() });
          setIsOpen(false);
          toast({ title: "تم تحديث المهمة بنجاح" });
        },
        onError: (err: any) => {
          toast({ title: "فشل تحديث المهمة", description: err?.message ?? "خطأ غير معروف", variant: "destructive" });
        },
      });
    } else {
      createAssignment.mutate({ data } as any, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAssignmentsQueryKey() });
          setIsOpen(false);
          toast({ title: "تم إنشاء المهمة بنجاح" });
        },
        onError: (err: any) => {
          toast({ title: "فشل إنشاء المهمة", description: err?.message ?? "خطأ غير معروف", variant: "destructive" });
        },
      });
    }
  };

  const handleDelete = (id: number) => {
    setLocalOrder((prev) => prev.filter((item) => String(item.id) !== String(id)));
    deleteAssignment.mutate({ id } as any, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAssignmentsQueryKey() });
        toast({ title: "تم حذف المهمة بنجاح 🗑️" });
      },
      onError: (err: any) => {
        toast({ title: "فشل الحذف", description: err?.message ?? "خطأ غير معروف", variant: "destructive" });
      },
    });
  };

  if (isLoading) return <div className="py-12 flex justify-center"><LoadingSpinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h2 className="text-xl font-bold">قائمة المهام</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="ابحث عن مهمة..."
              value={adminSearch}
              onChange={(e) => setAdminSearch(e.target.value)}
              className="w-full h-9 pr-9 pl-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              dir="rtl"
            />
          </div>
          <Button onClick={handleOpenNew} size="sm">
            <Plus className="h-4 w-4 ml-1" />
            إضافة
          </Button>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table className="w-full text-sm text-right">
              <thead className="text-xs text-muted-foreground bg-muted/50 uppercase">
                <tr>
                  <th className="px-2 py-3 w-8"></th>
                  <th className="px-4 py-3">المهمة</th>
                  <th className="px-4 py-3">المادة</th>
                  <th className="px-4 py-3">التصنيف</th>
                  <th className="px-4 py-3">التسليم</th>
                  <th className="px-4 py-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <SortableContext
                items={localOrder.filter(item =>
                  !adminSearch.trim() ||
                  item.title.includes(adminSearch) ||
                  item.subjectName.includes(adminSearch)
                ).map(a => a.id)}
                strategy={verticalListSortingStrategy}
              >
                <tbody className="divide-y">
                  {localOrder.filter(item =>
                    !adminSearch.trim() ||
                    item.title.includes(adminSearch) ||
                    item.subjectName.includes(adminSearch)
                  ).map(item => (
                    <SortableAssignmentRow
                      key={item.id}
                      item={item}
                      onEdit={handleOpenEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                  {localOrder.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        لا توجد مهام مضافة.
                      </td>
                    </tr>
                  )}
                </tbody>
              </SortableContext>
            </table>
          </DndContext>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? "تعديل المهمة" : "إضافة مهمة جديدة"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">عنوان المهمة</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="مثال: الواجب الأول" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">المادة</label>
                <Select value={subjectId} onValueChange={setSubjectId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المادة" />
                  </SelectTrigger>
                  <SelectContent dir="rtl" position="popper">
                    {subjects?.map(sub => (
                      <SelectItem key={sub.id} value={sub.id.toString()}>{sub.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">تاريخ الإسناد</label>
                <Input type="date" value={assignedDate} onChange={e => setAssignedDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">تاريخ التسليم</label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">النوع</label>
                <Select value={type} onValueChange={setType} required>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent dir="rtl" position="popper">
                    {Object.entries(ASSIGNMENT_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">الأهمية</label>
                  {isAutoPriority ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full">
                      <Sparkles className="h-2.5 w-2.5" />
                      محسوبة تلقائياً
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAutoPriority(true)}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                      إعادة الحساب
                    </button>
                  )}
                </div>
                <Select
                  value={priority}
                  onValueChange={(v) => { setPriority(v); setIsAutoPriority(false); }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl" position="popper">
                    {Object.entries(ASSIGNMENT_PRIORITY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {type === 'homework' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">رقم الصفحة</label>
                  <Input value={pageNumber} onChange={e => setPageNumber(e.target.value)} placeholder="مثال: 45" />
                </div>
              )}

              {type === 'exam' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">نوع الاختبار</label>
                  <Select value={examType} onValueChange={setExamType}>
                    <SelectTrigger><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                    <SelectContent dir="rtl" position="popper">
                      <SelectItem value="دوري">دوري</SelectItem>
                      <SelectItem value="شهري">شهري</SelectItem>
                      <SelectItem value="نهائي">نهائي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Tag className="h-4 w-4" />
                  ربط بحدث (اختياري)
                </label>
                <Select value={eventId || "none"} onValueChange={v => setEventId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="بدون حدث" /></SelectTrigger>
                  <SelectContent dir="rtl" position="popper">
                    <SelectItem value="none">بدون حدث</SelectItem>
                    {events?.map(ev => (
                      <SelectItem key={ev.id} value={ev.id.toString()}>
                        {ev.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {events?.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">لا توجد أحداث. أضفها من تبويب "التقويم".</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">الوصف التفصيلي</label>
              <Textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                rows={3}
                placeholder="أضف تفاصيل المهمة هنا..."
              />
            </div>

            {/* ── File Upload Section ── */}
            <div className="space-y-3 border p-4 rounded-xl bg-muted/20">
              <label className="text-sm font-medium flex items-center gap-2">
                <Upload className="h-4 w-4" />
                رفع ملفات مرفقة
              </label>

              <label
                htmlFor="assignment-file-upload"
                className="block border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                {isUploading ? (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">جاري الرفع...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Upload className="h-7 w-7 mb-1 opacity-40" />
                    <span className="text-sm font-medium">اضغط لاختيار الملفات</span>
                    <span className="text-xs">PDF, صور, مستندات...</span>
                  </div>
                )}
              </label>
              <input
                id="assignment-file-upload"
                ref={fileInputRef}
                type="file"
                multiple
                className="sr-only"
                onChange={handleFileSelect}
              />

              {uploadedFiles.length > 0 && (
                <div className="space-y-3">
                  {uploadedFiles.map((f, idx) => (
                    <div key={idx} className="bg-background border rounded-xl p-3 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="h-4 w-4 shrink-0 text-primary" />
                          <span className="text-xs text-muted-foreground truncate">{f.name}</span>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0" onClick={() => removeUploadedFile(idx)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            اسم الملف
                          </label>
                          <Input
                            value={f.label}
                            onChange={e => updateFileLabel(idx, e.target.value)}
                            placeholder="مثال: كتاب الرياضيات"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                            <Folder className="h-3 w-3" />
                            التصنيف
                          </label>
                          <CategoryCombobox
                            value={f.category}
                            onChange={v => updateFileCategory(idx, v)}
                            placeholder="اكتب أو اختر تصنيفاً"
                            className="h-8"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Checklist Items Section ── */}
            <div className="space-y-3 border p-4 rounded-xl bg-muted/20">
              <label className="text-sm font-medium flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                قائمة مهام جزئية (اختياري)
              </label>
              <p className="text-xs text-muted-foreground -mt-1">الطلاب يمكنهم وضع علامة على كل جزء على حدة لتتبع تقدمهم</p>

              <div className="flex gap-2">
                <Input
                  value={newChecklistItem}
                  onChange={e => setNewChecklistItem(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newChecklistItem.trim()) {
                        setChecklistItems(prev => [...prev, newChecklistItem.trim()]);
                        setNewChecklistItem("");
                      }
                    }
                  }}
                  placeholder="مثال: حل التمارين 1-5، اقرأ الصفحات 10-20..."
                  className="text-sm flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (newChecklistItem.trim()) {
                      setChecklistItems(prev => [...prev, newChecklistItem.trim()]);
                      setNewChecklistItem("");
                    }
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              {checklistItems.length > 0 && (
                <div className="space-y-1.5">
                  {checklistItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 border border-border/50">
                      <div className="w-4 h-4 rounded border-2 border-muted-foreground/40 shrink-0" />
                      <span className="text-sm flex-1">{item}</span>
                      <button
                        type="button"
                        onClick={() => setChecklistItems(prev => prev.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── External Links Section ── */}
            <div className="space-y-3 border p-4 rounded-xl bg-muted/20">
              <label className="text-sm font-medium flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                روابط خارجية
              </label>

              {/* New link form */}
              <div className="space-y-2 p-3 bg-background rounded-lg border border-border/60">
                <div className="flex gap-2">
                  <Input
                    value={newLink}
                    onChange={e => setNewLink(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLink())}
                    placeholder="https://drive.google.com/..."
                    dir="ltr"
                    className="text-left flex-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={newLinkLabel}
                    onChange={e => setNewLinkLabel(e.target.value)}
                    placeholder="الاسم (اختياري)"
                    className="text-xs h-8"
                  />
                  <CategoryCombobox
                    value={newLinkCategory}
                    onChange={setNewLinkCategory}
                    placeholder="التصنيف (اختياري)"
                    className="h-8"
                  />
                </div>
                <Button type="button" onClick={addLink} variant="secondary" size="sm" className="w-full">
                  <Plus className="h-3.5 w-3.5 ml-1" />
                  إضافة رابط
                </Button>
              </div>

              {attachmentLinks.length > 0 && (
                <div className="space-y-2">
                  {attachmentLinks.map((link, idx) => (
                    <div key={idx} className="bg-background border rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate flex-1" dir="ltr">
                          {link.url}
                        </a>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0" onClick={() => removeLink(idx)}>
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={link.label || ""}
                          onChange={e => updateLinkField(idx, "label", e.target.value)}
                          placeholder="الاسم"
                          className="h-7 text-xs"
                        />
                        <CategoryCombobox
                          value={link.category || ""}
                          onChange={v => updateLinkField(idx, "category", v)}
                          placeholder="التصنيف"
                          className="h-7"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full sm:w-auto" disabled={createAssignment.isPending || updateAssignment.isPending || isUploading}>
                {(createAssignment.isPending || updateAssignment.isPending) && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                {editingId ? "تحديث المهمة" : "إضافة المهمة"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

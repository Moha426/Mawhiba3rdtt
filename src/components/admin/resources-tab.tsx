import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useListAssignments,
  useListSubjects,
  useListResourceSections,
  useCreateResourceSection,
  useUpdateResourceSection,
  useDeleteResourceSection,
  useReorderAssignments,
  useUpdateAssignment,
  useDeleteAssignment,
  useCreateAssignment,
  getListAssignmentsQueryKey,
  getListResourceSectionsQueryKey,
  Assignment,
  ResourceSection,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  GripVertical,
  Folder,
  FolderOpen,
  Trash2,
  Edit,
  MoreHorizontal,
  FileText,
  Link,
  ChevronDown,
  ChevronUp,
  FolderPlus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-state";

function SortableItem({
  item,
  onEdit,
  onDelete,
  onMoveSection,
  sections,
}: {
  item: Assignment;
  onEdit: (item: Assignment) => void;
  onDelete: (id: number) => void;
  onMoveSection: (id: number, sectionId: number | null) => void;
  sections: ResourceSection[];
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
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2.5 p-3 rounded-xl glass border border-border/40 group ${
        isDragging ? "shadow-lg" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
        )}
        {item.attachmentLinks && item.attachmentLinks.length > 0 && (
          <div className="flex items-center gap-1 mt-0.5">
            <Link className="h-3 w-3 text-primary/60" />
            <span className="text-xs text-primary/70">{item.attachmentLinks.length} رابط</span>
          </div>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onEdit(item)}>
            <Edit className="h-3.5 w-3.5 ml-2" />
            تعديل
          </DropdownMenuItem>
          {sections.length > 0 && (
            <>
              <DropdownMenuItem onClick={() => onMoveSection(item.id, null)}>
                <Folder className="h-3.5 w-3.5 ml-2" />
                بدون قسم
              </DropdownMenuItem>
              {sections.map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={() => onMoveSection(item.id, s.id)}
                >
                  <FolderOpen className="h-3.5 w-3.5 ml-2" />
                  {s.name}
                </DropdownMenuItem>
              ))}
            </>
          )}
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="h-3.5 w-3.5 ml-2" />
            حذف
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SectionCard({
  section,
  items,
  onEditSection,
  onDeleteSection,
  onEditItem,
  onDeleteItem,
  onMoveSection,
  allSections,
}: {
  section: ResourceSection | null;
  items: Assignment[];
  onEditSection?: (s: ResourceSection) => void;
  onDeleteSection?: (id: number) => void;
  onEditItem: (item: Assignment) => void;
  onDeleteItem: (id: number) => void;
  onMoveSection: (id: number, sectionId: number | null) => void;
  allSections: ResourceSection[];
}) {
  const [collapsed, setCollapsed] = useState(false);
  const sortedItems = [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <div className="border border-border/50 rounded-2xl overflow-hidden">
      {/* Section header */}
      <div
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
          section ? "bg-muted/30 hover:bg-muted/50" : "bg-transparent hover:bg-muted/20"
        }`}
        onClick={() => setCollapsed(!collapsed)}
      >
        {section ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-primary/70" />
        ) : (
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="font-semibold text-sm flex-1">
          {section ? section.name : "بدون قسم"}
        </span>
        <span className="text-xs text-muted-foreground">
          {items.length} ملف
        </span>
        {section && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); onEditSection?.(section); }}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-md text-muted-foreground hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDeleteSection?.(section.id); }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
        {collapsed ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </div>

      {/* Items */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-2 space-y-2">
              {sortedItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 italic">
                  لا توجد ملفات في هذا القسم
                </p>
              ) : (
                <SortableContext
                  items={sortedItems.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {sortedItems.map((item) => (
                    <SortableItem
                      key={item.id}
                      item={item}
                      onEdit={onEditItem}
                      onDelete={onDeleteItem}
                      onMoveSection={onMoveSection}
                      sections={allSections}
                    />
                  ))}
                </SortableContext>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ResourcesTab() {
  const { data: subjects } = useListSubjects();
  const [subjectId, setSubjectId] = useState<number | null>(null);

  const { data: allResources, isLoading: loadingResources } = useListAssignments(
    subjectId ? { subjectId, type: "resource" as any } : { type: "resource" as any },
  );
  const { data: allSectionsRaw, isLoading: loadingSections } = useListResourceSections();

  const reorderAssignments = useReorderAssignments();
  const updateAssignment = useUpdateAssignment();
  const deleteAssignment = useDeleteAssignment();
  const createSection = useCreateResourceSection();
  const updateSection = useUpdateResourceSection();
  const deleteSection = useDeleteResourceSection();

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Local state for drag
  const [localItems, setLocalItems] = useState<Assignment[]>([]);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  // Sync local items
  const resources = allResources ?? [];
  const visibleItems = localItems.length > 0 ? localItems : resources;

  // Section dialog
  const [sectionOpen, setSectionOpen] = useState(false);
  const [editSectionId, setEditSectionId] = useState<number | null>(null);
  const [sectionName, setSectionName] = useState("");

  // Edit item dialog
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Assignment | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const handleOpenEditItem = useCallback((item: Assignment) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditDescription(item.description ?? "");
    setEditItemOpen(true);
  }, []);

  const handleSaveEditItem = () => {
    if (!editingItem) return;
    updateAssignment.mutate(
      {
        id: editingItem.id,
        data: {
          title: editTitle,
          description: editDescription || undefined,
          subjectId: editingItem.subjectId,
          type: editingItem.type as any,
          priority: editingItem.priority as any,
          assignedDate: editingItem.assignedDate,
          dueDate: editingItem.dueDate,
          sectionId: (editingItem as any).sectionId ?? undefined,
        },
      } as any,
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAssignmentsQueryKey() });
          setEditItemOpen(false);
          setEditingItem(null);
          toast({ title: "تم تحديث الملف" });
        },
        onError: () => {
          toast({ title: "فشل التحديث", variant: "destructive" });
        },
      },
    );
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const grouped = (() => {
    const allSections = allSectionsRaw ?? [];
    const sectionMap: Record<number | "none", Assignment[]> = { none: [] };
    allSections.forEach((s) => { sectionMap[s.id] = []; });
    visibleItems.forEach((item) => {
      const sId = (item as any).sectionId;
      if (sId && sectionMap[sId]) {
        sectionMap[sId].push(item);
      } else {
        sectionMap["none"].push(item);
      }
    });
    return sectionMap;
  })();

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id);
    if (localItems.length === 0) setLocalItems([...resources]);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    setLocalItems((prev) => {
      const oldIdx = prev.findIndex((i) => i.id === active.id);
      const newIdx = prev.findIndex((i) => i.id === over.id);
      const updated = arrayMove(prev, oldIdx, newIdx).map((item, idx) => ({
        ...item,
        sortOrder: idx,
      }));

      reorderAssignments.mutate(
        {
          data: {
            items: updated.map((i) => ({
              id: i.id,
              sortOrder: i.sortOrder ?? 0,
              sectionId: (i as any).sectionId ?? null,
            })),
          },
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListAssignmentsQueryKey() });
          },
        },
      );

      return updated;
    });
  };

  const handleMoveSection = (itemId: number, newSectionId: number | null) => {
    const item = resources.find((r) => r.id === itemId);
    if (!item) return;

    updateAssignment.mutate(
      {
        id: itemId,
        data: {
          title: item.title,
          subjectId: item.subjectId,
          type: item.type as any,
          priority: item.priority as any,
          assignedDate: item.assignedDate,
          dueDate: item.dueDate,
          description: item.description ?? undefined,
          sectionId: newSectionId ?? undefined,
        },
      } as any,
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAssignmentsQueryKey() });
          setLocalItems([]);
          toast({ title: "تم نقل الملف" });
        },
      },
    );
  };

  const handleDeleteItem = (id: number) => {
    deleteAssignment.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAssignmentsQueryKey() });
        setLocalItems([]);
        toast({ title: "تم الحذف" });
      },
    });
  };

  const openNewSection = () => {
    setEditSectionId(null);
    setSectionName("");
    setSectionOpen(true);
  };

  const openEditSection = (s: ResourceSection) => {
    setEditSectionId(s.id);
    setSectionName(s.name);
    setSectionOpen(true);
  };

  const handleDeleteSection = (id: number) => {
    deleteSection.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListResourceSectionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListAssignmentsQueryKey() });
        toast({ title: "تم حذف القسم" });
      },
    });
  };

  const handleSaveSection = () => {
    if (!sectionName) return;

    if (editSectionId) {
      updateSection.mutate(
        { id: editSectionId, data: { name: sectionName } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListResourceSectionsQueryKey() });
            setSectionOpen(false);
            toast({ title: "تم تحديث القسم" });
          },
        },
      );
    } else {
      if (!subjectId) {
        toast({ title: "يرجى اختيار مادة أولاً", variant: "destructive" });
        return;
      }
      createSection.mutate(
        { data: { name: sectionName } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListResourceSectionsQueryKey() });
            setSectionOpen(false);
            toast({ title: "تم إنشاء القسم" });
          },
        },
      );
    }
  };

  const isLoading = loadingResources || loadingSections;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold">ملفات المواد</h2>
        <div className="flex gap-2 flex-wrap">
          <Select
            value={subjectId ? String(subjectId) : "all"}
            onValueChange={(v) => {
              setSubjectId(v === "all" ? null : parseInt(v));
              setLocalItems([]);
            }}
          >
            <SelectTrigger className="w-36 h-9 text-sm rounded-xl">
              <SelectValue placeholder="جميع المواد" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المواد</SelectItem>
              {subjects?.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {subjectId && (
            <Button
              variant="outline"
              size="sm"
              onClick={openNewSection}
              className="gap-1.5 rounded-xl h-9"
            >
              <FolderPlus className="h-4 w-4" />
              قسم جديد
            </Button>
          )}
        </div>
      </div>

      {/* Info banner */}
      {visibleItems.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 border border-primary/15 rounded-xl px-3 py-2">
          <GripVertical className="h-3.5 w-3.5 text-primary/60" />
          اسحب الملفات لإعادة ترتيبها. استخدم قائمة الخيارات لنقل الملف لقسم آخر.
        </div>
      )}

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed">
          <FileText className="h-10 w-10 mx-auto opacity-30 mb-3" />
          <p>لا توجد ملفات موارد بعد.</p>
          <p className="text-xs mt-1">
            أضف مهاماً من نوع "مرجع" من تبويب المهام.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-3">
            {/* Sections first */}
            {(allSectionsRaw ?? []).map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                items={grouped[section.id] ?? []}
                onEditSection={openEditSection}
                onDeleteSection={handleDeleteSection}
                onEditItem={handleOpenEditItem}
                onDeleteItem={handleDeleteItem}
                onMoveSection={handleMoveSection}
                allSections={allSectionsRaw ?? []}
              />
            ))}

            {/* Unsectioned */}
            {grouped["none"].length > 0 && (
              <SectionCard
                section={null}
                items={grouped["none"]}
                onEditItem={handleOpenEditItem}
                onDeleteItem={handleDeleteItem}
                onMoveSection={handleMoveSection}
                allSections={allSectionsRaw ?? []}
              />
            )}
          </div>

          <DragOverlay>
            {activeId ? (
              <div className="flex items-center gap-2.5 p-3 rounded-xl glass-glow shadow-2xl opacity-90">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {resources.find((r) => r.id === activeId)?.title}
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Edit item dialog */}
      <Dialog open={editItemOpen} onOpenChange={setEditItemOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل الملف</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">العنوان</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="عنوان الملف"
                onKeyDown={(e) => e.key === "Enter" && handleSaveEditItem()}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">الوصف (اختياري)</label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="وصف مختصر"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditItemOpen(false)} className="rounded-xl">
              إلغاء
            </Button>
            <Button
              onClick={handleSaveEditItem}
              disabled={!editTitle || updateAssignment.isPending}
              className="rounded-xl"
            >
              {updateAssignment.isPending ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section dialog */}
      <Dialog open={sectionOpen} onOpenChange={setSectionOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editSectionId ? "تعديل القسم" : "إنشاء قسم جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">اسم القسم</label>
              <Input
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                placeholder="مثال: الوحدة الأولى"
                onKeyDown={(e) => e.key === "Enter" && handleSaveSection()}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSectionOpen(false)} className="rounded-xl">
              إلغاء
            </Button>
            <Button
              onClick={handleSaveSection}
              disabled={!sectionName || createSection.isPending || updateSection.isPending}
              className="rounded-xl"
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

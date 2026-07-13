import { useEffect, useMemo, useRef, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { createRoom, deleteRoom, getRooms, Room, updateRoom } from "@/lib/api/rooms";
import { Plus, Pencil, Trash2, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { runWithSaveFeedback } from "@/lib/saveFeedback";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { TablePagination, readPageSize } from "@/components/tables/TablePagination";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type RoomForm = {
  name: string;
  capacity: number;
  description: string;
  isActive: boolean;
};

const EMPTY_FORM: RoomForm = {
  name: "",
  capacity: 20,
  description: "",
  isActive: true,
};

const ROOM_DELETE_UNDO_MS = 5000;
const ROOM_PAGE_SIZE_KEY = "rooms-table-page-size";
const ROOM_COLUMN_KEY = "rooms-table-columns";
const ROOM_DEFAULT_COLS = { capacity: true, description: true };

type RoomSortKey = "name" | "capacity" | "status";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  // Table state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortKey, setSortKey] = useState<RoomSortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(() => readPageSize(ROOM_PAGE_SIZE_KEY));
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try { const r = window.localStorage.getItem(ROOM_COLUMN_KEY); return r ? JSON.parse(r) as Record<string, boolean> : ROOM_DEFAULT_COLS; } catch { return ROOM_DEFAULT_COLS; }
  });

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);
  const [form, setForm] = useState<RoomForm>(EMPTY_FORM);
  const [searchParams, setSearchParams] = useSearchParams();
  const pendingDeleteRef = useRef<{ room: Room; index: number } | null>(null);
  const pendingDeleteTimerRef = useRef<number | null>(null);
  const submittingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);

  const activeCount = useMemo(() => rooms.filter((r) => r.isActive).length, [rooms]);
  const totalCapacity = useMemo(() => rooms.reduce((sum, room) => sum + room.capacity, 0), [rooms]);

  const filtered = useMemo(() => {
    return rooms.filter((r) => {
      const matchSearch = !search.trim() ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        (r.description || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || (statusFilter === "active" ? r.isActive : !r.isActive);
      return matchSearch && matchStatus;
    });
  }, [rooms, search, statusFilter]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "name": return a.name.localeCompare(b.name, "es") * dir;
        case "capacity": return (a.capacity - b.capacity) * dir;
        case "status": return (Number(b.isActive) - Number(a.isActive)) * dir;
        default: return 0;
      }
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (key: RoomSortKey) => {
    if (sortKey === key) { setSortDir((d) => d === "asc" ? "desc" : "asc"); }
    else { setSortKey(key); setSortDir("asc"); }
    setPage(0);
  };

  const SortHead = ({ label, k, className }: { label: string; k: RoomSortKey; className?: string }) => (
    <TableHead className={cn("text-xs", className)}>
      <button type="button" onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        {sortKey !== k ? <ArrowUpDown className="h-3 w-3 text-muted-foreground" /> : sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
    </TableHead>
  );
  const formHasUnsavedChanges = useMemo(() => {
    if (!formOpen) {
      return false;
    }

    const source = editingRoom
      ? {
          name: editingRoom.name,
          capacity: editingRoom.capacity,
          description: editingRoom.description,
          isActive: editingRoom.isActive,
        }
      : EMPTY_FORM;

    return (
      form.name.trim() !== source.name.trim()
      || form.capacity !== source.capacity
      || form.description.trim() !== source.description.trim()
      || form.isActive !== source.isActive
    );
  }, [editingRoom, form, formOpen]);

  useUnsavedChangesGuard({
    enabled: formHasUnsavedChanges,
    message: "Tienes cambios sin guardar en Aulas. Si sales ahora, se perderán. ¿Quieres continuar?",
  });

  useEffect(() => {
    const loadRooms = async () => {
      setLoading(true);
      try {
        const data = await getRooms();
        setRooms(data);
      } catch (error) {
        if (import.meta.env.DEV) console.error("Error loading rooms:", error);
        toast.error("No se pudieron cargar las aulas");
      } finally {
        setLoading(false);
      }
    };

    loadRooms();
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    const targetId = searchParams.get("id");
    const action = searchParams.get("action");

    if (!targetId || !action) {
      return;
    }

    const targetRoom = rooms.find((room) => room.id === targetId);
    if (!targetRoom) {
      return;
    }

    if (action === "edit" || action === "preview") {
      openEdit(targetRoom);
    } else if (action === "delete") {
      openDelete(targetRoom);
    }

    setSearchParams({}, { replace: true });
  }, [loading, rooms, searchParams, setSearchParams]);

  useEffect(() => {
    return () => {
      if (pendingDeleteTimerRef.current) {
        window.clearTimeout(pendingDeleteTimerRef.current);
      }
    };
  }, []);

  const openCreate = () => {
    setEditingRoom(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (room: Room) => {
    setEditingRoom(room);
    setForm({
      name: room.name,
      capacity: room.capacity,
      description: room.description,
      isActive: room.isActive,
    });
    setFormOpen(true);
  };

  const openDelete = (room: Room) => {
    setDeletingRoom(room);
    setDeleteOpen(true);
  };

  const handleSave = async () => {
    if (submittingRef.current) return;
    if (!form.name.trim()) {
      toast.error("El nombre del aula es obligatorio");
      return;
    }
    if (form.capacity <= 0) {
      toast.error("La capacidad debe ser mayor a 0");
      return;
    }
    if (!Number.isInteger(form.capacity)) {
      toast.error("La capacidad debe ser un número entero");
      return;
    }

    submittingRef.current = true;
    setIsSaving(true);
    try {
      if (editingRoom) {
        const updated = await runWithSaveFeedback(
          {
            loading: "Guardando aula...",
            success: "Aula guardada correctamente",
            error: "No se pudo guardar el aula",
            successDescription: "Los cambios ya están disponibles en Horarios.",
            errorHint: "Revisa los datos e inténtalo nuevamente.",
          },
          async () => {
            const result = await updateRoom(editingRoom.id, {
              name: form.name,
              capacity: form.capacity,
              description: form.description,
              isActive: form.isActive,
            });

            if (!result) {
              throw new Error("sin respuesta del servidor");
            }

            return result;
          }
        );

        setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        const created = await runWithSaveFeedback(
          {
            loading: "Creando aula...",
            success: "Aula creada correctamente",
            error: "No se pudo crear el aula",
            successDescription: "Ya puedes asignarla a clases y horarios.",
            errorHint: "Comprueba el nombre y la capacidad.",
          },
          async () => {
            const result = await createRoom({
              name: form.name,
              capacity: form.capacity,
              description: form.description,
              isActive: form.isActive,
            });

            if (!result) {
              throw new Error("sin respuesta del servidor");
            }

            return result;
          }
        );

        setRooms((prev) => [created, ...prev]);
      }

      setFormOpen(false);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error saving room:", error);
      toast.error(error instanceof Error ? error.message : "Error al guardar el aula");
    } finally {
      submittingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRoom) return;

    const roomToDelete = deletingRoom;
    const roomIndex = rooms.findIndex((room) => room.id === roomToDelete.id);

    if (roomIndex === -1) {
      setDeleteOpen(false);
      setDeletingRoom(null);
      return;
    }

    if (pendingDeleteTimerRef.current) {
      window.clearTimeout(pendingDeleteTimerRef.current);
      pendingDeleteTimerRef.current = null;
      pendingDeleteRef.current = null;
    }

    pendingDeleteRef.current = { room: roomToDelete, index: roomIndex };
    setRooms((prev) => prev.filter((room) => room.id !== roomToDelete.id));
    setDeleteOpen(false);
    setDeletingRoom(null);

    toast.warning("Aula preparada para eliminar", {
      description: "Puedes deshacer durante unos segundos.",
      action: {
        label: "Deshacer",
        onClick: () => {
          if (!pendingDeleteRef.current) {
            return;
          }

          if (pendingDeleteTimerRef.current) {
            window.clearTimeout(pendingDeleteTimerRef.current);
            pendingDeleteTimerRef.current = null;
          }

          const { room, index } = pendingDeleteRef.current;
          setRooms((prev) => {
            const next = [...prev];
            next.splice(Math.min(index, next.length), 0, room);
            return next;
          });
          pendingDeleteRef.current = null;
          toast.success("Eliminación cancelada");
        },
      },
    });

    pendingDeleteTimerRef.current = window.setTimeout(() => {
      const pending = pendingDeleteRef.current;
      pendingDeleteRef.current = null;
      pendingDeleteTimerRef.current = null;

      if (!pending) {
        return;
      }

      void runWithSaveFeedback(
        {
          loading: "Eliminando aula...",
          success: "Aula eliminada",
          error: "No se pudo eliminar el aula",
          successDescription: "La quitamos del listado y de futuras asignaciones.",
          errorHint: "Puede estar en uso. Revisa clases y vuelve a intentarlo.",
        },
        async () => {
          const ok = await deleteRoom(pending.room.id);
          if (!ok) {
            throw new Error("sin respuesta del servidor");
          }
        }
      ).catch((error) => {
        if (import.meta.env.DEV) console.error("Error deleting room:", error);
        setRooms((prev) => {
          const next = [...prev];
          next.splice(Math.min(pending.index, next.length), 0, pending.room);
          return next;
        });
      });
    }, ROOM_DELETE_UNDO_MS);
  };

  return (
    <PageContainer
      title="Aulas"
      actions={
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> Nueva aula
        </Button>
      }
    >

      <div className="space-y-3">
        <TableToolbar
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(0); }}
          searchPlaceholder="Buscar por nombre o descripción..."
          filtersOpen={filtersOpen}
          onFiltersOpenChange={setFiltersOpen}
          activeFilterCount={statusFilter !== "all" ? 1 : 0}
          columns={[{ key: "capacity", label: "Capacidad" }, { key: "description", label: "Descripción" }]}
          visibleColumns={visibleColumns}
          onColumnToggle={(key, v) => {
            const n = { ...visibleColumns, [key]: v };
            setVisibleColumns(n);
            window.localStorage.setItem(ROOM_COLUMN_KEY, JSON.stringify(n));
          }}
        />

        {filtersOpen && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
            {[
              { value: "all", label: "Todas" },
              { value: "active", label: "Activas" },
              { value: "inactive", label: "Inactivas" },
            ].map(({ value, label }) => (
              <button key={value} type="button"
                onClick={() => { setStatusFilter(value); setPage(0); }}
                className={cn("rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                  statusFilter === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground")}>
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="rounded-lg border border-border bg-card shadow-soft overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <SortHead label="Nombre" k="name" />
                {visibleColumns.capacity !== false && <SortHead label="Capacidad" k="capacity" />}
                {visibleColumns.description !== false && <TableHead className="text-xs hidden md:table-cell">Descripción</TableHead>}
                <SortHead label="Estado" k="status" />
                <TableHead className="text-xs text-right w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-sm text-muted-foreground">Cargando aulas...</TableCell></TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <EmptyState type="classes" message={search || statusFilter !== "all" ? "Sin resultados para esta búsqueda." : "No hay aulas creadas todavía."} actionLabel={!search ? "Crear aula" : undefined} onAction={!search ? openCreate : undefined} />
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((room, rowIdx) => (
                  <TableRow key={room.id} className={cn("hover:bg-accent/50", rowIdx % 2 !== 0 && "bg-muted")}>
                    <TableCell className="font-medium text-sm">{room.name}</TableCell>
                    {visibleColumns.capacity !== false && <TableCell className="text-sm">{room.capacity}</TableCell>}
                    {visibleColumns.description !== false && <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{room.description || "—"}</TableCell>}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] font-medium",
                          room.isActive
                            ? "bg-success/15 text-success border-success/20"
                            : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {room.isActive ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Tooltip><TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(room)} aria-label={`Editar ${room.name}`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger><TooltipContent side="bottom">Editar</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => openDelete(room)} aria-label={`Eliminar ${room.name}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger><TooltipContent side="bottom">Eliminar</TooltipContent></Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!loading && filtered.length > 0 && (
          <TablePagination
            page={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(0); window.localStorage.setItem(ROOM_PAGE_SIZE_KEY, String(s)); }}
            itemLabel="aulas"
          />
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRoom ? "Editar aula" : "Nueva aula"}</DialogTitle>
            <DialogDescription>
              {editingRoom ? "Actualiza los datos del aula" : "Crea una nueva aula para tus horarios"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div>
              <Label htmlFor="room-name">Nombre</Label>
              <Input
                id="room-name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Aula Principal"
              />
            </div>
            <div>
              <Label htmlFor="room-capacity">Capacidad</Label>
              <Input
                id="room-capacity"
                type="number"
                value={form.capacity}
                onChange={(e) => setForm((prev) => ({ ...prev, capacity: Number(e.target.value) || 0 }))}
                min={1}
                step={1}
              />
            </div>
            <div>
              <Label htmlFor="room-description">Descripción</Label>
              <Textarea
                id="room-description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Piso, espejos, sonido..."
                rows={3}
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              />
              Aula activa
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Guardando..." : editingRoom ? "Guardar" : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Aula</DialogTitle>
            <DialogDescription>
              ¿Seguro que deseas eliminar {deletingRoom?.name}? Tendrás unos segundos para deshacer la acción.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
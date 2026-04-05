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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { runWithSaveFeedback } from "@/lib/saveFeedback";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";

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

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);
  const [form, setForm] = useState<RoomForm>(EMPTY_FORM);
  const [searchParams, setSearchParams] = useSearchParams();
  const pendingDeleteRef = useRef<{ room: Room; index: number } | null>(null);
  const pendingDeleteTimerRef = useRef<number | null>(null);

  const activeCount = useMemo(() => rooms.filter((r) => r.isActive).length, [rooms]);
  const totalCapacity = useMemo(() => rooms.reduce((sum, room) => sum + room.capacity, 0), [rooms]);
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
        console.error("Error loading rooms:", error);
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
      console.error("Error saving room:", error);
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
        console.error("Error deleting room:", error);
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
      description="Espacios listos para operar clases sin fricción"
      actions={
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> Nueva aula
        </Button>
      }
    >
      <section className="mb-4 rounded-lg border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">Menos gestión. Más control.</p>
        <p className="mt-1 text-xs text-muted-foreground">Mantén capacidad y disponibilidad claras para planificar mejor.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-md border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Aulas activas</p>
            <p className="text-lg font-semibold text-foreground">{activeCount}</p>
          </div>
          <div className="rounded-md border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Aulas totales</p>
            <p className="text-lg font-semibold text-foreground">{rooms.length}</p>
          </div>
          <div className="rounded-md border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Capacidad total</p>
            <p className="text-lg font-semibold text-foreground">{totalCapacity}</p>
          </div>
        </div>
      </section>

      <div className="rounded-lg border border-border bg-card shadow-soft overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Capacidad</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[120px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState
                    type="classes"
                    message="No hay aulas creadas todavía."
                    actionLabel="Crear aula"
                    onAction={openCreate}
                  />
                </TableCell>
              </TableRow>
            ) : (
              rooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell className="font-medium">{room.name}</TableCell>
                  <TableCell>{room.capacity}</TableCell>
                  <TableCell className="text-muted-foreground">{room.description || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={room.isActive ? "default" : "secondary"}>
                      {room.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(room)}
                        aria-label={`Editar aula ${room.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openDelete(room)}
                        aria-label={`Eliminar aula ${room.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingRoom ? "Guardar" : "Crear"}</Button>
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
import { useEffect, useMemo, useState } from "react";
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

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);
  const [form, setForm] = useState<RoomForm>(EMPTY_FORM);
  const [searchParams, setSearchParams] = useSearchParams();

  const activeCount = useMemo(() => rooms.filter((r) => r.isActive).length, [rooms]);

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
        const updated = await updateRoom(editingRoom.id, {
          name: form.name,
          capacity: form.capacity,
          description: form.description,
          isActive: form.isActive,
        });
        if (!updated) throw new Error("No se pudo actualizar el aula");

        setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        toast.success("Aula actualizada");
      } else {
        const created = await createRoom({
          name: form.name,
          capacity: form.capacity,
          description: form.description,
          isActive: form.isActive,
        });
        if (!created) throw new Error("No se pudo crear el aula");

        setRooms((prev) => [created, ...prev]);
        toast.success("Aula creada");
      }

      setFormOpen(false);
    } catch (error) {
      console.error("Error saving room:", error);
      const message = error instanceof Error ? error.message : "No se pudo guardar el aula";
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    if (!deletingRoom) return;

    try {
      const success = await deleteRoom(deletingRoom.id);
      if (!success) throw new Error("No se pudo eliminar el aula");

      setRooms((prev) => prev.filter((r) => r.id !== deletingRoom.id));
      setDeleteOpen(false);
      setDeletingRoom(null);
      toast.success("Aula eliminada");
    } catch (error) {
      console.error("Error deleting room:", error);
      toast.error("No se pudo eliminar el aula");
    }
  };

  return (
    <PageContainer
      title="Aulas"
      description={`Gestiona las aulas disponibles. ${activeCount}/${rooms.length} activas`}
      actions={
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> Nueva Aula
        </Button>
      }
    >
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
                  <EmptyState type="classes" message="No hay aulas creadas todavía." />
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
                      <Button size="icon" variant="ghost" onClick={() => openEdit(room)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openDelete(room)}>
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
            <DialogTitle>{editingRoom ? "Editar Aula" : "Nueva Aula"}</DialogTitle>
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
              ¿Seguro que deseas eliminar {deletingRoom?.name}? Esta acción no se puede deshacer.
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
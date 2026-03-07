import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import type { CreateRoomInput, UpdateRoomInput } from "@/lib/validators/roomSchemas";

export interface Room {
  id: string;
  tenant_id: string;
  name: string;
  capacity: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const roomService = {
  async listRooms(tenantId: string): Promise<Room[]> {
    const { data, error } = await supabaseAdmin
      .from("rooms")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch rooms: ${error.message}`);
    }

    return data ?? [];
  },

  async getRoom(tenantId: string, roomId: string): Promise<Room | null> {
    const { data, error } = await supabaseAdmin
      .from("rooms")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", roomId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Failed to fetch room: ${error.message}`);
    }

    return data;
  },

  async createRoom(tenantId: string, input: CreateRoomInput): Promise<Room> {
    const { data, error } = await supabaseAdmin
      .from("rooms")
      .insert({
        tenant_id: tenantId,
        name: input.name,
        capacity: input.capacity,
        description: input.description ?? null,
        is_active: input.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create room: ${error.message}`);
    }

    return data;
  },

  async updateRoom(tenantId: string, roomId: string, input: UpdateRoomInput): Promise<Room> {
    const { data, error } = await supabaseAdmin
      .from("rooms")
      .update({
        name: input.name,
        capacity: input.capacity,
        description: input.description,
        is_active: input.is_active,
      })
      .eq("tenant_id", tenantId)
      .eq("id", roomId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update room: ${error.message}`);
    }

    return data;
  },

  async deleteRoom(tenantId: string, roomId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("rooms")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", roomId);

    if (error) {
      throw new Error(`Failed to delete room: ${error.message}`);
    }
  },
};

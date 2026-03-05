// TODO: Replace with actual API calls to backend
export interface DanceClass {
  id: string;
  name: string;
  teacher: string;
  discipline: string;
  category: string;
  price: number;
  capacity: number;
  status: "active" | "inactive" | "draft";
}

export async function getClasses(): Promise<DanceClass[]> {
  // TODO: GET /api/classes
  return [];
}

export async function createClass(data: Omit<DanceClass, "id">): Promise<DanceClass> {
  // TODO: POST /api/classes
  return { id: "mock-id", ...data };
}

export async function updateClass(id: string, data: Partial<DanceClass>): Promise<DanceClass> {
  // TODO: PUT /api/classes/:id
  return { id, ...data } as DanceClass;
}

export async function deleteClass(id: string): Promise<void> {
  // TODO: DELETE /api/classes/:id
}

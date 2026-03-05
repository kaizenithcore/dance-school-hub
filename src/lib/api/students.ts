// TODO: Replace with actual API calls to backend
export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  classes: string[];
  status: "active" | "inactive";
}

export async function getStudents(): Promise<Student[]> {
  return [];
}

export async function getStudent(id: string): Promise<Student | null> {
  return null;
}

export async function updateStudent(id: string, data: Partial<Student>): Promise<Student> {
  return { id, ...data } as Student;
}

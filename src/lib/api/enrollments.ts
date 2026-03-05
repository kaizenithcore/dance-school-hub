// TODO: Replace with actual API calls to backend
export interface Enrollment {
  id: string;
  studentId: string;
  studentName: string;
  classes: string[];
  status: "pending" | "confirmed" | "declined" | "cancelled";
  price: number;
  paymentMethod: string;
  date: string;
}

export async function getEnrollments(): Promise<Enrollment[]> {
  return [];
}

export async function createEnrollment(data: Omit<Enrollment, "id">): Promise<Enrollment> {
  return { id: "mock-id", ...data };
}

export async function updateEnrollmentStatus(id: string, status: Enrollment["status"]): Promise<Enrollment> {
  return { id, status } as Enrollment;
}

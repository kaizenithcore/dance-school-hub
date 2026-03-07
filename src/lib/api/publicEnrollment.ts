const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface PublicClass {
  id: string;
  name: string;
  discipline: string;
  category: string;
  price_cents: number;
  capacity: number;
  enrolled_count: number;
}

export interface PublicFormData {
  tenantName: string;
  availableClasses: PublicClass[];
}

export interface EnrollmentFormData {
  // Student info
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  
  // Guardian info
  guardian_name?: string;
  guardian_email?: string;
  guardian_phone?: string;
  
  // Address
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  
  // Enrollment
  class_id: string;
  
  // Emergency/Medical
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_conditions?: string;
  
  // Notes
  notes?: string;
}

export interface EnrollmentResponse {
  success: boolean;
  enrollmentId: string;
  studentId: string;
  message: string;
}

export async function getPublicFormData(tenantSlug: string): Promise<PublicFormData | null> {
  try {
    const response = await fetch(`${API_URL}/api/public/form/${tenantSlug}`);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error("Error fetching public form data:", error);
    return null;
  }
}

export async function submitPublicEnrollment(
  tenantSlug: string,
  formData: EnrollmentFormData
): Promise<EnrollmentResponse | null> {
  try {
    const response = await fetch(`${API_URL}/api/public/enroll`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tenantSlug,
        ...formData,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to submit enrollment");
    }
    
    return data.data;
  } catch (error) {
    console.error("Error submitting enrollment:", error);
    throw error;
  }
}

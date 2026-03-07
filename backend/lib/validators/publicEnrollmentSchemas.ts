import { z } from "zod";

const emptyToNull = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }
  return value;
};

const optionalString = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).optional().nullable());

const optionalEmail = () => z.preprocess(emptyToNull, z.string().email().optional().nullable());

// Schema for public enrollment submission
export const publicEnrollmentSchema = z.object({
  // Student info
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  email: z.string().email(),
  phone: optionalString(50),
  date_of_birth: optionalString(20),
  
  // Guardian info (required for minors)
  guardian_name: optionalString(150),
  guardian_email: optionalEmail(),
  guardian_phone: optionalString(50),
  
  // Address
  address_line1: optionalString(200),
  address_line2: optionalString(200),
  city: optionalString(100),
  state: optionalString(100),
  postal_code: optionalString(20),
  country: optionalString(100),
  
  // Enrollment info
  class_id: z.string().uuid(),
  
  // Medical/emergency info
  emergency_contact_name: optionalString(150),
  emergency_contact_phone: optionalString(50),
  medical_conditions: optionalString(1000),
  
  // Additional notes
  notes: optionalString(2000),
});

export type PublicEnrollmentInput = z.infer<typeof publicEnrollmentSchema>;

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
  class_id: z.string().uuid().optional(),
  class_ids: z.array(z.string().uuid()).optional(),
  class_selections: z.array(z.object({
    class_id: z.string().uuid(),
    schedule_id: z.string().uuid().optional(),
  })).optional(),
  form_values: z.record(z.string(), z.unknown()).optional().default({}),

  // Student info
  first_name: optionalString(100),
  last_name: optionalString(100),
  email: optionalEmail(),
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
  
  // Medical/emergency info
  emergency_contact_name: optionalString(150),
  emergency_contact_phone: optionalString(50),
  medical_conditions: optionalString(1000),
  
  // Additional notes
  notes: optionalString(2000),
}).refine((data) => Boolean(data.class_id) || (Array.isArray(data.class_ids) && data.class_ids.length > 0), {
  message: "At least one class must be selected",
  path: ["class_ids"],
});

export type PublicEnrollmentInput = z.infer<typeof publicEnrollmentSchema>;

// Schema for joint/family enrollment (multiple students)
export const jointEnrollmentSchema = z.object({
  is_joint_enrollment: z.literal(true),
  
  // Payer/responsible person info
  payer_info: z.object({
    name: z.string().min(1).max(150),
    email: z.string().email(),
    phone: z.string().min(1).max(50),
  }),
  
  // Array of students
  students: z.array(
    z.object({
      form_values: z.record(z.string(), z.unknown()),
      class_ids: z.array(z.string().uuid()).min(1, "Each student must select at least one class"),
      class_selections: z.array(z.object({
        class_id: z.string().uuid(),
        schedule_id: z.string().uuid().optional(),
      })).optional(),
 
      // Core student fields
      first_name: optionalString(100),
      last_name: optionalString(100),
      email: optionalEmail(),
      phone: optionalString(50),
      date_of_birth: optionalString(20),
      
      // Optional fields
      address_line1: optionalString(200),
      address_line2: optionalString(200),
      city: optionalString(100),
      state: optionalString(100),
      postal_code: optionalString(20),
      country: optionalString(100),
      emergency_contact_name: optionalString(150),
      emergency_contact_phone: optionalString(50),
      medical_conditions: optionalString(1000),
      notes: optionalString(2000),
    })
  ).min(1, "At least one student is required").max(10, "Maximum 10 students per joint enrollment"),
});

export type JointEnrollmentInput = z.infer<typeof jointEnrollmentSchema>;

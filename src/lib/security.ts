export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

export function validateStrongPassword(password: string): PasswordPolicyResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Debe tener al menos 8 caracteres");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Debe incluir al menos una mayúscula");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Debe incluir al menos una minúscula");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Debe incluir al menos un número");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Debe incluir al menos un símbolo");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function parseSessionTimeoutMinutes(value: unknown, fallback = 480): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 15) {
    return Math.floor(value);
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= 15) {
      return parsed;
    }
  }

  return fallback;
}

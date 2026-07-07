export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export const validateEmail = (email: string): ValidationResult => {
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }
  return { valid: true };
};

export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' };
  }
  return { valid: true };
};

export const validateRequired = (value: string, fieldName: string): ValidationResult => {
  if (!value || !value.trim()) {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true };
};

export const validatePhone = (phone: string): ValidationResult => {
  if (!phone) {
    return { valid: false, error: 'Phone number is required' };
  }
  const phoneRegex = /^[+]?[\d\s()-]{10,15}$/;
  if (!phoneRegex.test(phone)) {
    return { valid: false, error: 'Please enter a valid phone number' };
  }
  return { valid: true };
};

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
// @ts-ignore: No types for validator import
import validator from "validator";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitizes a string input to prevent XSS and SQL injection.
 * Trims, escapes HTML, and removes dangerous characters.
 */
export function sanitizeInput(input: string): string {
  let sanitized = validator.trim(input);
  sanitized = validator.escape(sanitized); // Escape HTML
  sanitized = sanitized.replace(/[\$'"`]/g, ""); // Remove SQL special chars
  return sanitized;
}

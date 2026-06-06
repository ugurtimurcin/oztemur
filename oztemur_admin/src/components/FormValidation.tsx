"use client";
import { useState, useCallback } from "react";
import Icon from "@/components/Icon";

/* ═══════════════════════════════════════════════
   useFormValidation — Premium field-level validation
   Animated inline errors with shake + glow effects
   ═══════════════════════════════════════════════ */

export type ValidationRule = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  patternMessage?: string;
  custom?: (value: unknown) => string | null;
};

export type ValidationSchema<T> = Partial<Record<keyof T, ValidationRule>>;

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export function useFormValidation<T extends Record<string, unknown>>(schema: ValidationSchema<T>) {
  const [errors, setErrors] = useState<FieldErrors<T>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const validateField = useCallback((key: keyof T, value: unknown): string | null => {
    const rule = schema[key];
    if (!rule) return null;

    const strVal = typeof value === "string" ? value.trim() : String(value ?? "");

    if (rule.required && (!strVal || strVal.length === 0)) {
      return "This field is required.";
    }
    if (rule.minLength && strVal.length < rule.minLength) {
      return `Must be at least ${rule.minLength} characters.`;
    }
    if (rule.maxLength && strVal.length > rule.maxLength) {
      return `Cannot exceed ${rule.maxLength} characters.`;
    }
    if (rule.pattern && strVal.length > 0 && !rule.pattern.test(strVal)) {
      return rule.patternMessage || "Invalid format.";
    }
    if (rule.custom) {
      return rule.custom(value);
    }
    return null;
  }, [schema]);

  const onBlur = useCallback((key: keyof T, value: unknown) => {
    setTouched(t => ({ ...t, [key]: true }));
    const err = validateField(key, value);
    setErrors(prev => {
      const next = { ...prev };
      if (err) next[key] = err;
      else delete next[key];
      return next;
    });
  }, [validateField]);

  const validateAll = useCallback((data: T): boolean => {
    const newErrors: FieldErrors<T> = {};
    const newTouched: Partial<Record<keyof T, boolean>> = {};
    let valid = true;

    for (const key of Object.keys(schema) as (keyof T)[]) {
      newTouched[key] = true;
      const err = validateField(key, data[key]);
      if (err) {
        newErrors[key] = err;
        valid = false;
      }
    }

    setErrors(newErrors);
    setTouched(newTouched);
    return valid;
  }, [schema, validateField]);

  const clearErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const getFieldState = useCallback((key: keyof T) => ({
    error: touched[key] ? errors[key] || null : null,
    hasError: !!(touched[key] && errors[key]),
    touched: !!touched[key],
  }), [errors, touched]);

  return { errors, touched, onBlur, validateAll, clearErrors, getFieldState };
}

/* ═══════════════════════════════════════════════
   FormField — Wrapper with animated error display
   ═══════════════════════════════════════════════ */

interface FormFieldProps {
  error?: string | null;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function FormField({ error, children, style }: FormFieldProps) {
  return (
    <div style={{ position: "relative", ...style }}>
      <div style={{
        animation: error ? "fieldShake 0.4s ease-in-out" : undefined,
      }}>
        {children}
      </div>
      <div style={{
        overflow: "hidden",
        maxHeight: error ? 28 : 0,
        opacity: error ? 1 : 0,
        transition: "max-height 0.25s ease, opacity 0.2s ease",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          marginTop: 5, fontSize: 11, fontWeight: 500,
          color: "var(--error)",
        }}>
          <Icon name="error" style={{ fontSize: 13 }} />
          {error}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   getInputStyle — Returns input style with error glow
   ═══════════════════════════════════════════════ */

export function getValidatedInputStyle(
  baseStyle: React.CSSProperties,
  hasError: boolean
): React.CSSProperties {
  if (!hasError) return baseStyle;
  return {
    ...baseStyle,
    borderColor: "var(--error)",
    boxShadow: "0 0 0 3px rgba(179,38,30,0.08)",
  };
}

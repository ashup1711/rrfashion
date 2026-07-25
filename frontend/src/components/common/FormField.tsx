import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useId } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement>;
type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;
type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

interface FormFieldBaseProps {
  label: string;
  error?: string;
  success?: string;
  hint?: string;
  required?: boolean;
  children?: ReactNode;
}

interface FormFieldInputProps extends FormFieldBaseProps {
  as?: 'input';
  inputProps?: InputProps;
}

interface FormFieldSelectProps extends FormFieldBaseProps {
  as: 'select';
  inputProps?: SelectProps;
}

interface FormFieldTextareaProps extends FormFieldBaseProps {
  as: 'textarea';
  inputProps?: TextareaProps;
}

type FormFieldProps = FormFieldInputProps | FormFieldSelectProps | FormFieldTextareaProps;

/**
 * Reusable form field component with label, validation feedback, and accessibility.
 *
 * Usage:
 * ```tsx
 * <FormField label="Email" error={errors.email} required>
 *   <input
 *     id="email"
 *     className="form-input"
 *     aria-invalid={!!errors.email}
 *     aria-describedby={errors.email ? 'email-error' : undefined}
 *   />
 * </FormField>
 * ```
 */
const FormField = (props: FormFieldProps) => {
  const generatedId = useId();
  const { label, error, success, hint, required, children } = props;
  const fieldId = props.as === 'input'
    ? (props.inputProps?.id || generatedId)
    : props.as === 'select'
    ? (props.inputProps?.id || generatedId)
    : props.as === 'textarea'
    ? (props.inputProps?.id || generatedId)
    : generatedId;

  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;

  return (
    <div className="space-y-1">
      <label
        htmlFor={fieldId}
        className="form-label"
      >
        {label}
        {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
      </label>

      {children}

      {/* Hint text */}
      {hint && !error && (
        <p id={hintId} className="text-xs text-gray-400">{hint}</p>
      )}

      {/* Error message */}
      {error && (
        <p id={errorId} className="form-error" role="alert">
          {error}
        </p>
      )}

      {/* Success feedback */}
      {success && !error && (
        <p className="form-success" role="status">{success}</p>
      )}
    </div>
  );
};

export default FormField;

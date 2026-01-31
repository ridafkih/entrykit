"use client";

import { useState, type ReactNode, type InputHTMLAttributes } from "react";
import { tv } from "tailwind-variants";
import { Eye, EyeOff, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

const label = tv({
  base: "text-xs text-text-secondary",
});

function FormInputLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className={label()}>
      {children}
      {required && <span className="text-text-muted ml-0.5">*</span>}
    </label>
  );
}

const input = tv({
  base: "w-full px-2 py-1 text-xs bg-bg border border-border text-text placeholder:text-text-muted focus:outline-none focus:border-text-muted",
});

type FormInputTextProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  type?: "text" | "email" | "url";
};

function FormInputText({ type = "text", className, ...props }: FormInputTextProps) {
  return <input type={type} className={input({ className })} {...props} />;
}

function FormInputPassword({
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        className={input({ className: "pr-7" })}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
      >
        {visible ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
    </div>
  );
}

type SelectOption = {
  value: string;
  label: string;
};

type FormInputSelectProps = {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
};

function FormInputSelect({
  options,
  value,
  onChange,
  placeholder,
  className,
}: FormInputSelectProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(input(), "appearance-none pr-6 cursor-pointer", className)}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-bg text-text">
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={12}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
      />
    </div>
  );
}

type FormInputCheckboxProps = {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
};

function FormInputCheckbox({ checked = false, onChange, label }: FormInputCheckboxProps) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="w-3 h-3 accent-text cursor-pointer"
      />
      {label && <span className="text-xs text-text">{label}</span>}
    </label>
  );
}

function FormInputHelper({ children }: { children: ReactNode }) {
  return <p className="text-xs text-text-muted">{children}</p>;
}

function FormInputError({ children }: { children: ReactNode }) {
  return <p className="text-xs text-red-500">{children}</p>;
}

const FormInput = {
  Label: FormInputLabel,
  Text: FormInputText,
  Password: FormInputPassword,
  Select: FormInputSelect,
  Checkbox: FormInputCheckbox,
  Helper: FormInputHelper,
  Error: FormInputError,
};

export { FormInput };

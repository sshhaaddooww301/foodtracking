import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost" | "link";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const base = "inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none";
    
    const variants = {
      primary: "bg-[#0A192F] hover:bg-[#132A4A] text-white shadow-sm border border-[#0A192F] focus:ring-[#0A192F]",
      secondary: "bg-slate-700 hover:bg-slate-800 text-white shadow-sm focus:ring-slate-600",
      outline: "border border-slate-300 dark:border-slate-700 bg-card hover:bg-muted text-slate-800 dark:text-slate-100 shadow-sm focus:ring-slate-400",
      danger: "bg-rose-700 hover:bg-rose-800 text-white shadow-sm focus:ring-rose-500",
      ghost: "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200",
      link: "bg-transparent underline-offset-4 hover:underline text-[#0A192F] dark:text-blue-400 p-0 font-medium",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-9 px-4 text-xs font-semibold sm:text-sm gap-2",
      lg: "h-11 px-5 text-sm sm:text-base gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-0.5 mr-2 h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn("bg-card text-card-foreground rounded-lg border border-border shadow-sm p-5", className)} {...props}>
    {children}
  </div>
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs sm:text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0A192F] dark:focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs sm:text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0A192F] dark:focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

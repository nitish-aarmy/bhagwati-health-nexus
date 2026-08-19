import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onChange, autoCapitalize, ...props }, ref) => {
    const normalizedType = type ?? "text";
    const shouldUppercase = ![
      "password",
      "email",
      "number",
      "tel",
      "date",
      "time",
      "datetime-local",
      "month",
      "week",
      "url",
    ].includes(normalizedType);

    return (
      <input
        type={type}
        autoCapitalize={autoCapitalize}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          shouldUppercase && "uppercase placeholder:uppercase",
          className,
        )}
        ref={ref}
        onChange={(event) => {
          onChange?.(event);
        }}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

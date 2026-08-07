import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, onChange, autoCapitalize, ...props }, ref) => {
    return (
      <textarea
        autoCapitalize={autoCapitalize ?? "characters"}
        className={cn(
          "flex min-h-15 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base uppercase shadow-sm placeholder:uppercase placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        onChange={(event) => {
          const upper = event.target.value.toUpperCase();
          if (upper !== event.target.value) {
            event.target.value = upper;
          }
          onChange?.(event);
        }}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };

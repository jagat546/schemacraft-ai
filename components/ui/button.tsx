import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-300 outline-none select-none disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-4 focus-visible:ring-primary/20 active:scale-[0.98] active:translate-y-px [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 shadow-sm",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20 hover:shadow-xl hover:shadow-violet-500/30 hover:scale-[1.02]",

        outline:
          "border border-violet-200 bg-white/80 backdrop-blur text-violet-700 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-800",

        secondary:
          "bg-violet-100 text-violet-700 hover:bg-violet-200",

        ghost:
          "text-violet-700 hover:bg-violet-100 hover:text-violet-800",

        destructive:
          "bg-gradient-to-r from-red-500 to-rose-600 text-white hover:opacity-95",

        link:
          "text-violet-700 underline-offset-4 hover:text-violet-900 hover:underline",
      },

      size: {
        default: "h-11 px-5 gap-2",

        xs: "h-7 px-2 text-xs rounded-lg",

        sm: "h-9 px-4 text-sm rounded-lg",

        lg: "h-12 px-8 text-base rounded-xl",

        icon: "h-11 w-11 rounded-xl",

        "icon-xs": "h-7 w-7 rounded-lg",

        "icon-sm": "h-9 w-9 rounded-lg",

        "icon-lg": "h-12 w-12 rounded-xl",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
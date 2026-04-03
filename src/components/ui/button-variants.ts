import { cva, type VariantProps } from "class-variance-authority";

// Notion-inspired button styles customized for HostingInfo
// Features: Soft rounded corners, gentle shadows, smooth transitions, professional feel
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary button - Notion-style with your app's primary color
        // Optimized: only animates background-color and box-shadow (works without GPU)
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md transition-[background-color,box-shadow] duration-200 ease-in-out",

        // Destructive - Smooth red with Notion feel
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm hover:shadow-md transition-[background-color,box-shadow] duration-200 ease-in-out",

        // Outline - Clean border with subtle hover
        // Optimized: only animates colors (perfect for non-GPU browsers)
        outline:
          "border border-input bg-transparent hover:bg-accent/50 hover:text-accent-foreground shadow-sm transition-[background-color,border-color,color] duration-200 ease-in-out",

        // Secondary - Softer alternative with gentle hover
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm hover:shadow-md transition-[background-color,box-shadow] duration-200 ease-in-out",

        // Ghost - Minimal with smooth hover transition
        ghost:
          "hover:bg-accent/50 hover:text-accent-foreground transition-[background-color,color] duration-200 ease-in-out",

        // Link - Clean underline style
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-lg px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

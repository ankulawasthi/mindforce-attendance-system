import * as React from "react"
import { cn } from "../../lib/utils"

const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => {
  const variants = {
    default:     "bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 shadow-[0_1px_2px_rgba(0,0,0,0.12)] border border-transparent",
    destructive: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-[0_1px_2px_rgba(0,0,0,0.10)] border border-transparent",
    outline:     "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
    secondary:   "bg-slate-100 text-slate-800 hover:bg-slate-150 active:bg-slate-200 border border-transparent",
    ghost:       "text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-150 border border-transparent",
    link:        "text-slate-800 underline-offset-4 hover:underline border-none shadow-none",
  }
  const sizes = {
    default: "h-9 px-4 py-2 text-sm",
    sm:      "h-8 rounded-md px-3 text-xs",
    lg:      "h-10 rounded-md px-6 text-sm",
    icon:    "h-9 w-9",
  }

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium tracking-tight ring-offset-white transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        sizes[size],
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button }

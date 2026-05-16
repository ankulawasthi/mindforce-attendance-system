import * as React from "react"
import { cn } from "../../lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-offset-white transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:border-slate-400",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }

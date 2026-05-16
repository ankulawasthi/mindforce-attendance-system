import * as React from "react"
import { cn } from "../../lib/utils"

function Badge({ className, variant = "default", ...props }) {
  const variants = {
    default:     "bg-slate-900 text-white border-transparent",
    secondary:   "bg-slate-100 text-slate-700 border-slate-200",
    destructive: "bg-red-50 text-red-700 border-red-200",
    outline:     "bg-transparent text-slate-700 border-slate-300",
    success:     "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning:     "bg-amber-50 text-amber-700 border-amber-200",
    blue:        "bg-blue-50 text-blue-700 border-blue-200",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }

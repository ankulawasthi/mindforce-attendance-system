// Shift definitions with start/end times (24hr, IST)
// Overnight shifts: end hour < start hour means it crosses midnight
export const SHIFTS = {
  "Standard": {
    name: "Standard",
    label: "Standard — 09:00 AM – 06:00 PM",
    start: { h: 9,  m: 0  },
    end:   { h: 18, m: 0  },
    overnight: false,
    graceMins: 15,
  },
  "UK Shift": {
    name: "UK Shift",
    label: "UK Shift — 01:00 PM – 10:00 PM",
    start: { h: 13, m: 0  },
    end:   { h: 22, m: 0  },
    overnight: false,
    graceMins: 15,
  },
  "US Shift": {
    name: "US Shift",
    label: "US Shift — 06:30 PM – 03:30 AM",
    start: { h: 18, m: 30 },
    end:   { h:  3, m: 30 },
    overnight: true,
    graceMins: 15,
  },
}

// List for <select> dropdowns
export const SHIFT_OPTIONS = Object.values(SHIFTS).map(s => ({
  value: s.name,
  label: s.label,
}))

/**
 * Given a shift name and a clock-in Date, return:
 *   { onTime: bool, lateByMins: number, lateByLabel: string }
 * Returns null if shift is unknown.
 */
export function calcLate(shiftName, clockInDate) {
  const def = SHIFTS[shiftName]
  if (!def || !clockInDate) return { onTime: true, lateByMins: 0, lateByLabel: "—" }

  const ci = new Date(clockInDate)

  // Build shift-start DateTime on the same calendar day as clock-in
  const shiftStart = new Date(ci)
  shiftStart.setHours(def.start.h, def.start.m, 0, 0)

  // Grace window deadline
  const deadline = new Date(shiftStart)
  deadline.setMinutes(deadline.getMinutes() + def.graceMins)

  const diffMs  = ci - deadline          // positive = late
  const lateMins = Math.ceil(diffMs / 60000)

  if (lateMins <= 0) {
    return { onTime: true, lateByMins: 0, lateByLabel: "On Time" }
  }

  const h = Math.floor(lateMins / 60)
  const m = lateMins % 60
  const lateByLabel = h > 0 ? `${h}h ${m}m late` : `${m}m late`
  return { onTime: false, lateByMins: lateMins, lateByLabel }
}

/**
 * Determine if `now` is within the active window of a shift (+ 4h buffer after end).
 */
export function isShiftActive(shiftName, now = new Date()) {
  const def = SHIFTS[shiftName]
  if (!def) return false

  const start = new Date(now)
  start.setHours(def.start.h, def.start.m, 0, 0)

  const end = new Date(now)
  end.setHours(def.end.h, def.end.m, 0, 0)

  if (def.overnight && end <= start) {
    end.setDate(end.getDate() + 1)
  }

  // Add 4h buffer so widget stays "active" after shift ends
  const bufferEnd = new Date(end)
  bufferEnd.setHours(bufferEnd.getHours() + 4)

  return now >= start && now <= bufferEnd
}

/** Detect shift from shift_timing string stored on user */
export function resolveShift(shiftTiming) {
  if (!shiftTiming) return null
  // Exact match on key
  if (SHIFTS[shiftTiming]) return SHIFTS[shiftTiming]
  // Fallback: fuzzy search
  const lower = shiftTiming.toLowerCase()
  if (lower.includes("uk")) return SHIFTS["UK Shift"]
  if (lower.includes("us")) return SHIFTS["US Shift"]
  if (lower.includes("09:00") || lower.includes("9:00")) return SHIFTS["Standard"]
  return null
}

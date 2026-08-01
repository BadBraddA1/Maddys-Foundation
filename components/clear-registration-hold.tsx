"use client"

import { useEffect } from "react"
import { clearRegistrationHold } from "@/lib/registration-hold-shared"

/** Clears the form timer after a successful payment return. */
export function ClearRegistrationHold({ eventSlug }: { eventSlug: string }) {
  useEffect(() => {
    clearRegistrationHold(eventSlug)
  }, [eventSlug])
  return null
}

/** Client-safe sample ticket codes (no DB / Next cache imports). */

export const SAMPLE_TEAM_CODE = "OV-TEST01"
export const SAMPLE_PLAYER_CODE = "OV-P-TEST01"

export function isSampleTeamCode(code: string): boolean {
  return code.trim().toUpperCase() === SAMPLE_TEAM_CODE
}

export function isSamplePlayerCode(code: string): boolean {
  return code.trim().toUpperCase() === SAMPLE_PLAYER_CODE
}

export function isSampleTicketCode(code: string): boolean {
  return isSampleTeamCode(code) || isSamplePlayerCode(code)
}

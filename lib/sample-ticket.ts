import { formatEventDate } from "@/lib/event-helpers"
import {
  SAMPLE_PLAYER_CODE,
  SAMPLE_TEAM_CODE,
} from "@/lib/sample-ticket-codes"
import type { PublicPlayerTicket, PublicTicket } from "@/lib/ticket"

export {
  SAMPLE_PLAYER_CODE,
  SAMPLE_TEAM_CODE,
  isSamplePlayerCode,
  isSampleTeamCode,
  isSampleTicketCode,
} from "@/lib/sample-ticket-codes"

function sampleStartsAt(): string {
  const starts = new Date()
  starts.setUTCDate(starts.getUTCDate() + 21)
  return starts.toISOString()
}

export function getSamplePublicTicket(): PublicTicket {
  const startsAt = sampleStartsAt()
  const playerDetails = [
    {
      id: -1,
      displayName: "Alex Captain",
      email: "alex@example.com",
      checkInCode: SAMPLE_PLAYER_CODE,
      ticketEmailSentAt: null,
      sortOrder: 0,
    },
    {
      id: -2,
      displayName: "Sam Player",
      email: "",
      checkInCode: "OV-P-TEST02",
      ticketEmailSentAt: null,
      sortOrder: 1,
    },
    {
      id: -3,
      displayName: "Jordan Lee",
      email: "",
      checkInCode: "OV-P-TEST03",
      ticketEmailSentAt: null,
      sortOrder: 2,
    },
    {
      id: -4,
      displayName: "Casey Nguyen",
      email: "",
      checkInCode: "OV-P-TEST04",
      ticketEmailSentAt: null,
      sortOrder: 3,
    },
  ]
  return {
    code: SAMPLE_TEAM_CODE,
    registrationId: 0,
    teamName: "Sample Fairway Four",
    captainName: "Alex Captain",
    captainEmail: "alex@example.com",
    eventTitle: "Oak Valley Golf Scramble (sample)",
    eventSlug: "oak-valley-golf-scramble",
    eventLocation: "Oak Valley Golf Club, Pevely, MO",
    eventWhen: formatEventDate(startsAt),
    eventStartsAt: startsAt,
    venueLatitude: null,
    venueLongitude: null,
    players: playerDetails.map((p) => p.displayName),
    playerDetails,
  }
}

export function getSamplePublicPlayerTicket(): PublicPlayerTicket {
  const team = getSamplePublicTicket()
  return {
    code: SAMPLE_PLAYER_CODE,
    playerId: -1,
    playerName: "Sam Player",
    teamName: team.teamName,
    captainName: team.captainName,
    teamCode: SAMPLE_TEAM_CODE,
    eventTitle: team.eventTitle,
    eventSlug: team.eventSlug,
    eventLocation: team.eventLocation,
    eventWhen: team.eventWhen,
    eventStartsAt: team.eventStartsAt,
    venueLatitude: null,
    venueLongitude: null,
    checkedIn: false,
  }
}

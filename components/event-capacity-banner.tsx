import {
  capacityUnitLabel,
  isTeamEvent,
  type EventRow,
} from "@/lib/event-helpers"
import { CHECKOUT_HOLD_MINUTES } from "@/lib/registration-hold-shared"

type Props = {
  event: Pick<
    EventRow,
    "capacity" | "registration_count" | "confirmed_count" | "team_size"
  >
}

export function EventCapacityBanner({ event }: Props) {
  if (event.capacity == null) return null

  const held = event.registration_count ?? 0
  const paid = event.confirmed_count ?? 0
  const left = Math.max(0, event.capacity - held)
  const filledPct = Math.min(
    100,
    Math.round((held / Math.max(1, event.capacity)) * 100),
  )
  const unit = capacityUnitLabel(event)
  const unitOne = capacityUnitLabel(event, 1)
  const team = isTeamEvent(event)
  const fillingFast = left > 0 && (left <= 10 || filledPct >= 40)

  return (
    <div className="mt-6 border border-line bg-surface px-5 py-5">
      <p className="text-sm font-medium uppercase tracking-wide text-muted">
        Capacity
      </p>
      <p className="mt-1 font-display text-2xl text-ink tabular-nums">
        {held} / {event.capacity} {unit}
      </p>
      <p className="mt-1 text-sm text-muted">
        {left === 0
          ? team
            ? "No team spots left — this scramble is full."
            : "This event is full."
          : (
              <>
                <span className="font-medium text-ink tabular-nums">
                  {left}
                </span>{" "}
                {left === 1 ? unitOne : unit} still open
                {paid > 0 ? (
                  <>
                    {" "}
                    ·{" "}
                    <span className="tabular-nums">{paid}</span> paid
                  </>
                ) : null}
                {held > paid ? (
                  <>
                    {" "}
                    ·{" "}
                    <span className="tabular-nums">{held - paid}</span> held in
                    checkout
                  </>
                ) : null}
              </>
            )}
      </p>

      <div
        className="mt-4 h-2 overflow-hidden bg-line"
        role="progressbar"
        aria-valuenow={filledPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${filledPct}% of ${unit} filled`}
      >
        <div
          className="h-full bg-accent transition-[width] duration-500"
          style={{ width: `${filledPct}%` }}
        />
      </div>

      {left > 0 && fillingFast ? (
        <p className="mt-4 text-sm font-medium text-ink">
          {team ? "Teams are filling up fast." : "Spots are filling up fast."}{" "}
          <span className="font-normal text-muted">
            After you register, you have{" "}
            <strong className="text-ink">{CHECKOUT_HOLD_MINUTES} minutes</strong>{" "}
            to pay and keep your {unitOne} — otherwise it goes back in the pool.
          </span>
        </p>
      ) : left > 0 ? (
        <p className="mt-4 text-sm text-muted">
          Checkout holds your {unitOne} for{" "}
          <strong className="text-ink">{CHECKOUT_HOLD_MINUTES} minutes</strong>.
          Pay in time or the spot returns to the pool.
        </p>
      ) : null}
    </div>
  )
}

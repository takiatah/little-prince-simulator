# Searches for an efficient transfer between two planets.
# Reports live calculation progress to the frontend.

from datetime import datetime, timedelta, timezone
from math import sqrt

from app.game.planet_service import PlanetService
from app.game.lambert_solver import LambertSolver


class TrajectoryPlanner:

    def __init__(self):
        self.planet_service = PlanetService()
        self.lambert_solver = LambertSolver()

    def calculate_delta_v(self, transfer_velocity, planet_state):

        # Calculate the difference between spacecraft and planet velocity.
        vx = transfer_velocity[0] - planet_state["vx"]
        vy = transfer_velocity[1] - planet_state["vy"]
        vz = transfer_velocity[2] - planet_state["vz"]

        # Calculate the magnitude of the velocity difference.
        return sqrt(vx ** 2 + vy ** 2 + vz ** 2)

    def find_best_transfer(
        self,
        from_planet,
        to_planet,
        departure_start,
        departure_end,
        flight_duration_min,
        flight_duration_max,
        departure_step_days=5,
        duration_step_days=10,
        progress_callback=None
    ):

        # Make sure all dates have timezones.
        if departure_start.tzinfo is None or departure_end.tzinfo is None:
            raise ValueError("Departure dates must include timezones")

        if departure_end < departure_start:
            raise ValueError("Departure end must be after departure start")

        if departure_step_days <= 0 or duration_step_days <= 0:
            raise ValueError("Search steps must be positive")

        if flight_duration_min <= 0 or flight_duration_max < flight_duration_min:
            raise ValueError("Invalid flight duration range")

        departure_start = departure_start.astimezone(timezone.utc)
        departure_end = departure_end.astimezone(timezone.utc)

        best_transfer = None
        best_delta_v = float("inf")

        # Calculate the total number of combinations to test.
        departure_count = (
            int(
                (departure_end - departure_start).total_seconds()
                // (departure_step_days * 86400)
            ) + 1
        )

        duration_count = (
            (flight_duration_max - flight_duration_min)
            // duration_step_days
        ) + 1

        total_checks = departure_count * duration_count
        completed_checks = 0

        # Cache states so the same planet/date is not requested repeatedly.
        state_cache = {}

        departure_date = departure_start

        # Report that the search has started.
        if progress_callback:
            progress_callback({
                "stage": "starting",
                "completed": 0,
                "total": total_checks,
                "departure_date": None,
                "flight_duration_days": None,
                "best_delta_v": None,
                "departure_delta_v": None,
                "arrival_delta_v": None
            })

        # Try different departure dates.
        while departure_date <= departure_end:

            departure_key = (from_planet.lower(), departure_date)

            if departure_key not in state_cache:
                state_cache[departure_key] = (
                    self.planet_service.get_planet_position(
                        from_planet,
                        departure_date
                    )
                )

            departure_state = state_cache[departure_key]

            flight_days = flight_duration_min

            # Try different flight durations.
            while flight_days <= flight_duration_max:

                arrival_date = departure_date + timedelta(days=flight_days)

                arrival_key = (to_planet.lower(), arrival_date)

                if arrival_key not in state_cache:
                    state_cache[arrival_key] = (
                        self.planet_service.get_planet_position(
                            to_planet,
                            arrival_date
                        )
                    )

                arrival_state = state_cache[arrival_key]

                # Reset candidate values for this calculation.
                candidate_departure_delta_v = None
                candidate_arrival_delta_v = None

                try:
                    # Calculate spacecraft transfer velocities.
                    transfer = self.lambert_solver.solve_transfer(
                        departure_state,
                        arrival_state,
                        flight_days
                    )

                    # Calculate departure and arrival delta-v.
                    departure_delta_v = self.calculate_delta_v(
                        transfer["departure_velocity"],
                        departure_state
                    )

                    arrival_delta_v = self.calculate_delta_v(
                        transfer["arrival_velocity"],
                        arrival_state
                    )

                    candidate_departure_delta_v = departure_delta_v
                    candidate_arrival_delta_v = arrival_delta_v

                    total_delta_v = departure_delta_v + arrival_delta_v

                    # Keep the transfer with the lowest total delta-v.
                    if total_delta_v < best_delta_v:
                        best_delta_v = total_delta_v

                        best_transfer = {
                            "from_planet": from_planet,
                            "to_planet": to_planet,
                            "departure_date": departure_date.isoformat(),
                            "arrival_date": arrival_date.isoformat(),
                            "flight_duration_days": flight_days,
                            "departure_delta_v": departure_delta_v,
                            "arrival_delta_v": arrival_delta_v,
                            "total_delta_v": total_delta_v,
                            "departure_velocity": transfer["departure_velocity"],
                            "arrival_velocity": transfer["arrival_velocity"],
                            "velocity_unit": "AU/day"
                        }

                except Exception as error:
                    print("Transfer calculation failed:", error)

                # Update search progress.
                completed_checks += 1

                if progress_callback:
                    progress_callback({
                        "stage": "searching",
                        "completed": completed_checks,
                        "total": total_checks,
                        "departure_date": departure_date.isoformat(),
                        "flight_duration_days": flight_days,
                        "best_delta_v": (
                            best_delta_v
                            if best_transfer is not None
                            else None
                        ),
                        "departure_delta_v": candidate_departure_delta_v,
                        "arrival_delta_v": candidate_arrival_delta_v
                    })

                flight_days += duration_step_days

            departure_date += timedelta(days=departure_step_days)

        if best_transfer is None:
            raise RuntimeError("Could not find a valid transfer")

        # Report that the best transfer has been found.
        if progress_callback:
            progress_callback({
                "stage": "generating",
                "completed": total_checks,
                "total": total_checks,
                "departure_date": best_transfer["departure_date"],
                "flight_duration_days": best_transfer["flight_duration_days"],
                "best_delta_v": best_transfer["total_delta_v"],
                "departure_delta_v": best_transfer["departure_delta_v"],
                "arrival_delta_v": best_transfer["arrival_delta_v"]
            })

        return best_transfer

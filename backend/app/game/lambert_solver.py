import numpy as np
from lamberthub import izzo2015


# Sun's gravitational parameter
# Units: AU^3 / day^2
SUN_MU = 0.0002959122082855911


class LambertSolver:

    def solve_transfer(self, departure_state, arrival_state, tof_days):
        """
        Calculates the spacecraft transfer velocities using
        Lambert's problem.

        Inputs:
            departure_state: NASA state vector of departure planet
            arrival_state: NASA state vector of destination planet
            tof_days: Flight duration in days

        Returns:
            Departure and arrival transfer velocity vectors
        """

        if tof_days <= 0:
            raise ValueError("Time of flight must be greater than zero.")

        # Extract departure position
        r1 = np.array([
            departure_state["x"],
            departure_state["y"],
            departure_state["z"]
        ], dtype=float)

        # Extract arrival position
        r2 = np.array([
            arrival_state["x"],
            arrival_state["y"],
            arrival_state["z"]
        ], dtype=float)

        # Make sure positions are valid
        if np.linalg.norm(r1) == 0 or np.linalg.norm(r2) == 0:
            raise ValueError("Planet position cannot be zero.")

        # Solve Lambert's problem using the Izzo 2015 algorithm
        departure_velocity, arrival_velocity = izzo2015(
            SUN_MU,
            r1,
            r2,
            float(tof_days),
            M=0,
            prograde=True
        )

        return {
            "departure_velocity": departure_velocity.tolist(),
            "arrival_velocity": arrival_velocity.tolist(),
            "velocity_unit": "AU/day",
            "flight_duration_days": tof_days
        }

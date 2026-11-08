#scientifically grounded
#uses planet positions, velocities and orbital transfer
#lambert's problem to find the best transfer between two planets
#propagte now the spacecraft by using the Sun's gravitational influence 
#to generate its path

# generates the spacecraft's path using the sun's gravity
"""
uses RK4 to continually estimate how the
spacecraft is changing positions and plots points
along that path. The returned points r used by
the frontend to display the trajectory of the spacecraft (hopefully)
"""

from datetime import datetime, timedelta

import numpy as np

from app.game.lambert_solver import SUN_MU


class TrajectoryGenerator:

    def calculate_acceleration(self, position):

        # calculate the distance from the spacecraft to the sun
        distance = np.linalg.norm(position)

        if distance == 0:
            raise ValueError("Spacecraft cannot be at the sun's center")

        # calculate gravitational acceleration
        acceleration = -SUN_MU * position / distance ** 3

        return acceleration

    def derivatives(self, state):

        # state contains position and velocity
        position = state[:3]
        velocity = state[3:]

        acceleration = self.calculate_acceleration(position)

        # position changes according to velocity
        # velocity changes according to acceleration
        return np.concatenate((velocity, acceleration))

    def generate_trajectory(
        self,
        departure_state,
        arrival_state,
        transfer,
        num_points=201
    ):

        if num_points < 2:
            raise ValueError("At least two trajectory points are required")

        flight_days = transfer["flight_duration_days"]

        if flight_days <= 0:
            raise ValueError("Flight duration must be positive")

        # get the starting position from NASA
        position = np.array([
            departure_state["x"],
            departure_state["y"],
            departure_state["z"]
        ], dtype=float)

        # get the departure velocity from Lambert's solver
        velocity = np.array(
            transfer["departure_velocity"],
            dtype=float
        )

        if position.shape != (3,) or velocity.shape != (3,):
            raise ValueError("Position and velocity must each have 3 values")

        # combine position and velocity into one state
        state = np.concatenate((position, velocity))

        # calculate the time between generated points
        step_days = flight_days / (num_points - 1)

        departure_date = datetime.fromisoformat(
            transfer["departure_date"]
        )

        points = []

        # generate the spacecraft's position at each time step
        for i in range(num_points):

            current_date = departure_date + timedelta(
                days=i * step_days
            )

            points.append({
                "x": float(state[0]),
                "y": float(state[1]),
                "z": float(state[2]),
                "date": current_date.isoformat()
            })

            if i == num_points - 1:
                break

            # Runge-Kutta 4 integration
            k1 = self.derivatives(state)
            k2 = self.derivatives(state + step_days * k1 / 2)
            k3 = self.derivatives(state + step_days * k2 / 2)
            k4 = self.derivatives(state + step_days * k3)

            state = state + (step_days / 6) * (
                k1 + 2 * k2 + 2 * k3 + k4
            )

        # compare the simulated arrival position with NASA's destination
        expected_arrival = np.array([
            arrival_state["x"],
            arrival_state["y"],
            arrival_state["z"]
        ], dtype=float)

        actual_arrival = state[:3]

        arrival_error = float(
            np.linalg.norm(actual_arrival - expected_arrival)
        )

        return {
            "points": points,
            "num_points": len(points),
            "flight_duration_days": flight_days,
            "position_unit": "AU",
            "arrival_position": actual_arrival.tolist(),
            "expected_arrival_position": expected_arrival.tolist(),
            "arrival_error_au": arrival_error
        }

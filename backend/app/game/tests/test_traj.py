from datetime import datetime, timezone

from app.game.planet_service import PlanetService
from app.game.traj_planner import TrajectoryPlanner
from app.game.traj_gen import TrajectoryGenerator


def test_trajectory_planner():

    print("\n===================================")
    print("TEST 1: TRAJECTORY PLANNER")
    print("===================================")

    planner = TrajectoryPlanner()

    # Search for an Earth-to-Mars transfer
    best_transfer = planner.find_best_transfer(
        from_planet="earth",
        to_planet="mars",
        departure_start=datetime(2027, 1, 1, tzinfo=timezone.utc),
        departure_end=datetime(2027, 1, 15, tzinfo=timezone.utc),
        flight_duration_min=180,
        flight_duration_max=220,
        departure_step_days=5,
        duration_step_days=10
    )

    if best_transfer is None:
        raise AssertionError("No valid transfer was found.")

    print("\nBEST EARTH TO MARS TRANSFER")
    print("-----------------------------------")

    for key, value in best_transfer.items():
        print(f"{key}: {value}")

    assert best_transfer["total_delta_v"] > 0
    assert best_transfer["flight_duration_days"] > 0

    print("\nTrajectory planner test PASSED!")

    return best_transfer


def test_trajectory_generator(best_transfer):

    print("\n===================================")
    print("TEST 2: TRAJECTORY GENERATOR")
    print("===================================")

    planet_service = PlanetService()
    generator = TrajectoryGenerator()

    # Convert the selected transfer dates into datetime objects
    departure_date = datetime.fromisoformat(
        best_transfer["departure_date"]
    )

    arrival_date = datetime.fromisoformat(
        best_transfer["arrival_date"]
    )

    # Get NASA state vectors for the departure and arrival planets
    departure_state = planet_service.get_planet_position(
        best_transfer["from_planet"],
        departure_date
    )

    arrival_state = planet_service.get_planet_position(
        best_transfer["to_planet"],
        arrival_date
    )

    # Generate the spacecraft trajectory
    trajectory = generator.generate_trajectory(
        departure_state=departure_state,
        arrival_state=arrival_state,
        transfer=best_transfer,
        num_points=201
    )

    print("\nGENERATED TRAJECTORY")
    print("-----------------------------------")

    print("Number of points:", trajectory["num_points"])
    print("Flight duration:", trajectory["flight_duration_days"], "days")
    print("Position unit:", trajectory["position_unit"])
    print("Arrival error:", trajectory["arrival_error_au"], "AU")

    print("\nFirst trajectory point:")
    print(trajectory["points"][0])

    print("\nLast trajectory point:")
    print(trajectory["points"][-1])

    # Check trajectory generation
    assert trajectory["num_points"] == 201
    assert len(trajectory["points"]) == 201

    # Check that the spacecraft reaches approximately the destination
    assert trajectory["arrival_error_au"] < 0.00001

    print("\nTrajectory generator test PASSED!")

    return trajectory


if __name__ == "__main__":

    # First find the best transfer
    transfer = test_trajectory_planner()

    # Then generate the spacecraft trajectory
    trajectory = test_trajectory_generator(transfer)

    print("\n===================================")
    print("ALL TRAJECTORY TESTS PASSED!")
    print("===================================")

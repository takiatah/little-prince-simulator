
import csv
import io
import time
from datetime import datetime, timedelta, timezone

import requests


HORIZONS_URL = "https://ssd.jpl.nasa.gov/api/horizons.api"

# Official NASA IDs for the planets
PLANETS = {
    "earth": "399",
    "mars": "499",
    "venus": "299",
    "jupiter": "599"
}


class PlanetService:

    def get_planet_position(self, planet_name, date_time=None):

        try:
            # Check whether the planet exists
            planet_name = planet_name.lower()

            if planet_name not in PLANETS:
                raise ValueError(f"Unknown planet: {planet_name}")

            # Use current UTC time if no date is provided
            if date_time is None:
                date_time = datetime.now(timezone.utc)

            if date_time.tzinfo is None:
                raise ValueError("date_time must include a timezone")

            start_time = date_time.astimezone(timezone.utc)
            stop_time = start_time + timedelta(minutes=1)

            # Prepare the NASA Horizons request
            params = {
                "format": "json",
                "COMMAND": PLANETS[planet_name],
                "OBJ_DATA": "NO",
                "MAKE_EPHEM": "YES",
                "EPHEM_TYPE": "VECTORS",
                "CENTER": "500@10",
                "REF_PLANE": "ECLIPTIC",
                "OUT_UNITS": "AU-D",

                # VEC_TABLE 2 returns position AND velocity
                "VEC_TABLE": "2",

                "VEC_LABELS": "NO",
                "CSV_FORMAT": "YES",
                "START_TIME": start_time.strftime("%Y-%m-%d %H:%M"),
                "STOP_TIME": stop_time.strftime("%Y-%m-%d %H:%M"),
                "STEP_SIZE": "1m"
            }

            # Try NASA up to 3 times for temporary server failures
            response = None

            for attempt in range(3):
                try:
                    response = requests.get(
                        HORIZONS_URL,
                        params=params,
                        timeout=30
                    )

                    response.raise_for_status()
                    break

                except requests.exceptions.HTTPError as e:

                    if (
                        response is not None
                        and response.status_code == 503
                        and attempt < 2
                    ):
                        print(
                            f"NASA temporarily unavailable for {planet_name}. "
                            f"Retrying ({attempt + 1}/2)..."
                        )

                        time.sleep(2)
                    else:
                        raise e

            data = response.json()

            print("\n========== NASA DEBUG ==========")
            print("Planet:", planet_name)
            print("HTTP Status:", response.status_code)

            # Check for errors returned by Horizons
            if "error" in data:
                raise RuntimeError(data["error"])

            result = data["result"]

            # Extract coordinate data
            if "$$SOE" not in result or "$$EOE" not in result:
                raise RuntimeError(
                    f"NASA did not return state-vector data:\n{result}"
                )

            position_data = result.split("$$SOE")[1].split("$$EOE")[0]

            rows = csv.reader(io.StringIO(position_data))

            for row in rows:

                if len(row) < 8:
                    continue

                try:
                    # NASA CSV columns:
                    # 0 = Julian date
                    # 1 = Date and time
                    # 2 = X position
                    # 3 = Y position
                    # 4 = Z position
                    # 5 = X velocity
                    # 6 = Y velocity
                    # 7 = Z velocity

                    x = float(row[2])
                    y = float(row[3])
                    z = float(row[4])

                    vx = float(row[5])
                    vy = float(row[6])
                    vz = float(row[7])

                    print(
                        f"Parsed state vector for {planet_name}: "
                        f"position=({x}, {y}, {z}), "
                        f"velocity=({vx}, {vy}, {vz})"
                    )

                    return {
                        "planet": planet_name,

                        "x": x,
                        "y": y,
                        "z": z,

                        "vx": vx,
                        "vy": vy,
                        "vz": vz,

                        "position_unit": "AU",
                        "velocity_unit": "AU/day",

                        # Keep the original unit field for compatibility
                        "unit": "AU",

                        "date": start_time.isoformat()
                    }

                except (ValueError, IndexError) as e:
                    print("STATE VECTOR PARSING ERROR:", repr(e))
                    continue

            raise RuntimeError(
                f"Could not read planetary state vector. "
                f"Raw data: {repr(position_data)}"
            )

        except Exception as e:
            print("\n========== NASA REQUEST FAILED ==========")
            print("Planet:", planet_name)
            print("Exception type:", type(e).__name__)
            print("Exception message:", str(e))

            raise

    def get_all_planet_positions(self):

        # Use one timestamp so all planets are calculated
        # for the same moment.
        current_time = datetime.now(timezone.utc)

        planet_names = ["earth", "mars", "venus", "jupiter"]

        positions = []

        for planet_name in planet_names:

            position = self.get_planet_position(
                planet_name,
                date_time=current_time
            )

            positions.append(position)

        return {
            "date": current_time.isoformat(),
            "planets": positions
        }

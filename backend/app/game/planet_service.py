#we request positions COORDI relative to the sun from NASA
#

import csv
import io
from datetime import datetime, timedelta, timezone

import requests


HORIZONS_URL = "https://ssd.jpl.nasa.gov/api/horizons.api"

#official NASA IDs for planets in here 
#each no. refers to the center of tht planetary object
PLANETS = {
    "earth": "399",
    "mars": "499",
    "venus": "299",
    "jupiter": "599"
}


class PlanetService:

    def get_planet_position(self, planet_name, date_time=None):

        # check whether the planet exists
        planet_name = planet_name.lower()

        if planet_name not in PLANETS:
            raise ValueError(f"Unknown planet: {planet_name}")

        # use the current UTC time if no date is provided
        if date_time is None:
            date_time = datetime.now(timezone.utc)

        if date_time.tzinfo is None:
            raise ValueError("date_time must include a timezone")

        start_time = date_time.astimezone(timezone.utc)
        stop_time = start_time + timedelta(minutes=1)

        # prepare the NASA Horizons request
        params = {
            "format": "json",
            "COMMAND": PLANETS[planet_name],
            "OBJ_DATA": "NO",
            "MAKE_EPHEM": "YES",
            "EPHEM_TYPE": "VECTORS",
            "CENTER": "500@10",
            "REF_PLANE": "ECLIPTIC",
            "OUT_UNITS": "AU-D",
            "VEC_TABLE": "1",
            "VEC_LABELS": "NO",
            "CSV_FORMAT": "YES",
            "START_TIME": start_time.strftime("%Y-%m-%d %H:%M"),
            "STOP_TIME": stop_time.strftime("%Y-%m-%d %H:%M"),
            "STEP_SIZE": "1m"
        }

        # send the request to NASA
        response = requests.get(
            HORIZONS_URL,
            params=params,
            timeout=30
        )

        response.raise_for_status()

        data = response.json()

        # check for errors returned by Horizons
        if "error" in data:
            raise RuntimeError(data["error"])

        result = data["result"]

        # extract the coordinate data
        if "$$SOE" not in result or "$$EOE" not in result:
            raise RuntimeError("NASA did not return position data")

        position_data = result.split("$$SOE")[1].split("$$EOE")[0]

        rows = csv.reader(io.StringIO(position_data))

        for row in rows:
            if len(row) < 5:
                continue

            try:
                x = float(row[-3])
                y = float(row[-2])
                z = float(row[-1])

                return {
                    "planet": planet_name,
                    "x": x,
                    "y": y,
                    "z": z,
                    "unit": "AU",
                    "date": start_time.isoformat()
                }

            except ValueError:
                continue

        raise RuntimeError("Could not read planetary coordinates")

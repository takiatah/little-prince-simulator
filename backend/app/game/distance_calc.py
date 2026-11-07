import math

class DistanceCalculator:

    def calculate_distance(self, position1, position2):

        # calculate coordinate differences
        dx = position2["x"] - position1["x"]
        dy = position2["y"] - position1["y"]
        dz = position2["z"] - position1["z"]

        # calculate 3d distance
        distance_au = math.sqrt(
            dx ** 2 + dy ** 2 + dz ** 2
        )

        # convert au to kilometers
        distance_km = distance_au * 149597870.7

        return {
            "distance_au": distance_au,
            "distance_km": distance_km
        }

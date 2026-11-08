import Phaser from "phaser";
import GalaxyBackground from "../components/GalaxyBackground";

type PlanetName = "earth" | "mars" | "venus" | "jupiter";

interface PlanetPosition {
  planet: PlanetName;
  x: number;
  y: number;
  z: number;
  unit: string;
  date: string;
}

interface TravelData {
  from: PlanetName;
  to: PlanetName;
}

export default class SolarSystemScene extends Phaser.Scene {
  private planetPositions: Map<
    PlanetName,
    Phaser.Math.Vector2
  > = new Map();

  private from!: PlanetName;
  private to!: PlanetName;

  constructor() {
    super("SolarSystemScene");
  }

  create(data: TravelData) {
    this.from = data?.from ?? "earth";
    this.to = data?.to ?? "mars";

    new GalaxyBackground(this).create();

    const loadingText = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      "Mapping the solar system...",
      {
        fontSize: "24px",
        color: "#ffffff"
      }
    ).setOrigin(0.5);

    this.loadPlanetPositions(loadingText);
  }

  private async loadPlanetPositions(
    loadingText: Phaser.GameObjects.Text
  ) {
    try {
      const response = await fetch(
        "http://localhost:8000/planets/positions"
      );

      if (!response.ok) {
        throw new Error("Could not retrieve planet positions");
      }

      const data: { planets: PlanetPosition[] } =
        await response.json();

      loadingText.destroy();

      this.drawSolarSystem(data.planets);
      this.drawTravelInfo(data.planets);
      this.animateRocket();

    } catch (error) {
      console.error(error);

      loadingText.setText(
        "Could not load the solar system. Please try again."
      );
    }
  }


  private drawSolarSystem(planets: PlanetPosition[]) {
    const width = this.scale.width;
    const height = this.scale.height;

    const centerX = width / 2;
    const centerY = height / 2 + 50;

    // Custom visual distances from the Sun.
    // These are screen pixels, not actual astronomical distances.
    const displayDistances: Record<PlanetName, number> = {
        venus: 150,
        earth: 230,
        mars: 320,
        jupiter: 440
    };

    // Draw the Sun.
    this.add.circle(
        centerX,
        centerY,
        38,
        0xffcc55
    ).setStrokeStyle(4, 0xffe8a3);

    this.add.text(
        centerX,
        centerY + 55,
        "SUN",
        {
        fontSize: "16px",
        color: "#ffffff"
        }
    ).setOrigin(0.5);

    const imageKeys: Record<PlanetName, string> = {
        earth: "startingPlanet",
        mars: "planetB612",
        venus: "planetKing",
        jupiter: "planetBusinessman"
    };

    for (const planet of planets) {

        // Calculate the planet's direction using NASA coordinates.
        const angle = Math.atan2(planet.y, planet.x);

        // Use our custom display distance instead of actual distance.
        const distance = displayDistances[planet.planet];

        const x = centerX + Math.cos(angle) * distance;
        const y = centerY - Math.sin(angle) * distance;

        // Store the adjusted positions for rocket travel.
        this.planetPositions.set(
        planet.planet,
        new Phaser.Math.Vector2(x, y)
        );

        const image = this.add.image(
        x,
        y,
        imageKeys[planet.planet]
        );

        const size = planet.planet === "jupiter" ? 85 : 65;

        image.setDisplaySize(size, size);

        // Highlight departure and destination planets.
        if (
        planet.planet === this.from ||
        planet.planet === this.to
        ) {
        image.setTint(0xffffff);
        }

        this.add.text(
        x,
        y + 55,
        planet.planet.toUpperCase(),
        {
            fontSize: "16px",
            color: "#ffffff"
        }
        ).setOrigin(0.5);
    }
  }

    private drawTravelInfo(planets: PlanetPosition[]) {
    const planetNames: Record<PlanetName, string> = {
        earth: "Davis Hall (Earth)",
        mars: "Asteroid B-612 (Mars)",
        venus: "King's Planet (Venus)",
        jupiter: "Businessman's Planet (Jupiter)"
    };

    const startPlanet = planets.find(
        (planet) => planet.planet === this.from
    );

    const destinationPlanet = planets.find(
        (planet) => planet.planet === this.to
    );

    if (!startPlanet || !destinationPlanet) return;

    // Calculate real distance using NASA coordinates.
    const dx = destinationPlanet.x - startPlanet.x;
    const dy = destinationPlanet.y - startPlanet.y;
    const dz = destinationPlanet.z - startPlanet.z;

    const distanceAU = Math.sqrt(
        dx * dx + dy * dy + dz * dz
    );

    const distanceKM = distanceAU * 149597870.7;

    // Box dimensions and position.
    const boxWidth = 380;
    const boxHeight = 230;
    const margin = 25;

    const boxX = this.scale.width - boxWidth - margin;
    const boxY = margin;

    // Background panel.
    const panel = this.add.rectangle(
        boxX,
        boxY,
        boxWidth,
        boxHeight,
        0x10152d,
        0.92
    );

    panel.setOrigin(0, 0);
    panel.setStrokeStyle(2, 0xe8d5ad);
    panel.setScrollFactor(0);
    panel.setDepth(1000);

    // Information text.
    const infoText = [
        "TRAVEL INFORMATION",
        "",
        `FROM: ${planetNames[this.from]}`,
        "",
        `TO: ${planetNames[this.to]}`,
        "",
        "REAL DISTANCE:",
        `${distanceAU.toFixed(3)} AU`,
        `${Math.round(distanceKM).toLocaleString("en-US")} km`
    ].join("\n");

    const text = this.add.text(
        boxX + 24,  // More left padding
        boxY + 20,  // More top padding
        infoText,
        {
            fontSize: "14px",
            color: "#ffffff",
            fontFamily: "Georgia",
            lineSpacing: 4,
            wordWrap: {
            width: boxWidth - 48
            }
        }
    );
    
    text.setScrollFactor(0);
    text.setDepth(1001);
    }

  private animateRocket() {
    const start = this.planetPositions.get(this.from);
    const end = this.planetPositions.get(this.to);

    if (!start || !end) {
      console.error("Could not find the travel route.");
      return;
    }

    // Create a curved route.
    const control = new Phaser.Math.Vector2(
      (start.x + end.x) / 2,
      Math.min(start.y, end.y) - 100
    );

    const curve = new Phaser.Curves.QuadraticBezier(
      start,
      control,
      end
    );

    // Draw the route.
    const graphics = this.add.graphics();

    graphics.lineStyle(3, 0xe8d5ad, 0.8);
    graphics.strokePoints(curve.getPoints(50));

    // Create the rocket.
    const rocket = this.add.image(
      start.x,
      start.y,
      "rocket"
    );

    rocket.setScale(0.35);
    rocket.setDepth(10);

    const progress = { value: 0 };

    this.tweens.add({
      targets: progress,
      value: 1,
      duration: 4000,
      ease: "Sine.easeInOut",

      onUpdate: () => {
        const point = curve.getPoint(progress.value);
        const tangent = curve.getTangent(progress.value);

        rocket.setPosition(point.x, point.y);

        // Adjust the rotation offset if your rocket faces
        // a different direction in its original image.
        rocket.setRotation(
          tangent.angle() + Math.PI / 2
        );
      },

      onComplete: () => {
        if (this.to === "earth") {
            this.scene.start("DavisScene", {
            planet: "earth"
            });
        } else {
            this.scene.start("PlanetScene", {
            planet: this.to
            });
        }
      }
    });
  } 
}

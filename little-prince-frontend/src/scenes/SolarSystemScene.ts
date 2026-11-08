import Phaser from "phaser";
import GalaxyBackground from "../components/GalaxyBackground";

// ================================================================
// TYPES
// ================================================================

type PlanetName = "earth" | "mars" | "venus" | "jupiter";

interface PlanetPosition {
  planet: PlanetName;
  x: number;
  y: number;
  z: number;
  unit: string;
  date: string;
  source?: string;
}

interface TravelData {
  from: PlanetName;
  to: PlanetName;
}

interface TrajectoryPoint {
  x: number;
  y: number;
  z: number;
  date: string;
}

interface TransferData {
  from_planet: string;
  to_planet: string;
  departure_date: string;
  arrival_date: string;
  flight_duration_days: number;
  departure_delta_v: number;
  arrival_delta_v: number;
  total_delta_v: number;
  velocity_unit: string;
}

interface TrajectoryData {
  points: TrajectoryPoint[];
  num_points: number;
  flight_duration_days: number;
  position_unit: string;
  arrival_error_au: number;
}

interface TrajectoryResponse {
  transfer: TransferData;
  trajectory: TrajectoryData;
  departure_state?: PlanetPosition;
  arrival_state?: PlanetPosition;
}

interface TrajectoryProgress {
  stage: string;
  completed: number;
  total: number;
  departure_date?: string | null;
  flight_duration_days?: number | null;
  best_delta_v?: number | null;
  departure_delta_v?: number | null;
  arrival_delta_v?: number | null;
  message?: string;
  cached?: boolean;
}

// ================================================================
// SOLAR SYSTEM SCENE
// ================================================================

export default class SolarSystemScene extends Phaser.Scene {
  private planetPositions: Map<
    PlanetName,
    Phaser.Math.Vector2
  > = new Map();

  private from!: PlanetName;
  private to!: PlanetName;

  // Progress panel.
  private progressEvent?: Phaser.Time.TimerEvent;
  private progressText?: Phaser.GameObjects.Text;
  private progressBar?: Phaser.GameObjects.Graphics;
  private progressPanel?: Phaser.GameObjects.Rectangle;

  private isFetchingProgress = false;
  private loadingText?: Phaser.GameObjects.Text;

  // Panel dimensions.
  private readonly panelMargin = 25;
  private readonly progressPanelWidth = 340;
  private readonly progressPanelHeight = 480;

  constructor() {
    super("SolarSystemScene");
  }

  // ================================================================
  // CREATE SCENE
  // ================================================================

  create(data: TravelData) {
    this.from = data?.from ?? "earth";
    this.to = data?.to ?? "mars";

    this.planetPositions.clear();
    this.isFetchingProgress = false;

    new GalaxyBackground(this).create();

    this.loadingText = this.add.text(
      this.scale.width / 2,
      this.scale.height - 60,
      "Mapping the solar system...",
      {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: "Georgia",
        align: "center"
      }
    ).setOrigin(0.5);

    this.loadPlanetPositions();
  }

  // ================================================================
  // LOAD PLANET POSITIONS AND TRAJECTORY
  // ================================================================

  private async loadPlanetPositions() {
    try {
      // --------------------------------------------------
      // LOAD PLANET POSITIONS
      // --------------------------------------------------

      const response = await fetch(
        "http://localhost:8000/planets/positions"
      );

      if (!response.ok) {
        throw new Error(
          "Could not retrieve planetary positions."
        );
      }

      const data: {
        planets: PlanetPosition[];
      } = await response.json();

      if (!data.planets || data.planets.length === 0) {
        throw new Error(
          "No planetary positions were returned."
        );
      }

      this.drawSolarSystem(data.planets);

      this.loadingText?.setText(
        "Finding the best orbital transfer..."
      );

      // --------------------------------------------------
      // START PROGRESS POLLING
      // --------------------------------------------------

      this.startProgressPolling();

      // --------------------------------------------------
      // REQUEST TRAJECTORY
      // --------------------------------------------------

      const trajectoryResponse = await fetch(
        `http://localhost:8000/trajectory?from_planet=${this.from}&to_planet=${this.to}`
      );

      if (!trajectoryResponse.ok) {
        const errorData = await trajectoryResponse.json();

        throw new Error(
          errorData.detail ??
          "Could not calculate the orbital transfer."
        );
      }

      const trajectoryData: TrajectoryResponse =
        await trajectoryResponse.json();

      const points = trajectoryData.trajectory?.points;

      if (!points || points.length < 2) {
        throw new Error(
          "The trajectory did not contain enough points."
        );
      }

      // --------------------------------------------------
      // DISPLAY TRAVEL INFORMATION
      // --------------------------------------------------

      this.loadingText?.destroy();
      this.loadingText = undefined;

      this.drawTravelInfo(
        data.planets,
        trajectoryData.transfer,
        trajectoryData.trajectory.arrival_error_au
      );

      // Do NOT stop progress polling here.
      // A cached trajectory returns immediately, but its
      // progress replay continues in the background.

      // --------------------------------------------------
      // ANIMATE ROCKET
      // --------------------------------------------------

      this.animateRocket(points);

    } catch (error) {
      console.error(
        "Solar system error:",
        error
      );

      this.stopProgressPolling(false);

      const message = error instanceof Error
        ? error.message
        : "Unknown error";

      if (this.loadingText?.active) {
        this.loadingText.setText(
          `Could not calculate the orbital transfer.\n\n${message}`
        );

        this.loadingText.setVisible(true);
      } else {
        this.loadingText = this.add.text(
          this.scale.width / 2,
          this.scale.height / 2,
          `Could not calculate the orbital transfer.\n\n${message}`,
          {
            fontSize: "20px",
            color: "#ffffff",
            fontFamily: "Georgia",
            align: "center",
            wordWrap: {
              width: this.scale.width - 80
            }
          }
        ).setOrigin(0.5);
      }
    }
  }

  // ================================================================
  // LIVE ORBITAL CALCULATION PANEL
  // ================================================================

  private startProgressPolling() {
    const panelWidth = this.progressPanelWidth;
    const panelHeight = this.progressPanelHeight;

    const panelX = this.panelMargin;
    const panelY =
      this.scale.height - panelHeight - this.panelMargin;

    // Panel background.
    this.progressPanel = this.add.rectangle(
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      0x10152d,
      0.96
    );

    this.progressPanel.setOrigin(0, 0);
    this.progressPanel.setStrokeStyle(
      2,
      0xe8d5ad
    );
    this.progressPanel.setScrollFactor(0);
    this.progressPanel.setDepth(1000);

    // Progress information.
    this.progressText = this.add.text(
      panelX + 24,
      panelY + 22,
      [
        "ORBITAL MISSION CONTROL",
        "",
        "Initializing orbital calculations..."
      ].join("\n"),
      {
        fontSize: "14px",
        color: "#ffffff",
        fontFamily: "Georgia",
        lineSpacing: 6,
        wordWrap: {
          width: panelWidth - 48
        }
      }
    );

    this.progressText.setScrollFactor(0);
    this.progressText.setDepth(1002);

    // Progress bar.
    this.progressBar = this.add.graphics();

    this.progressBar.setScrollFactor(0);
    this.progressBar.setDepth(1001);

    // Poll the backend every 500 milliseconds.
    this.progressEvent = this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        void this.fetchTrajectoryProgress();
      }
    });

    void this.fetchTrajectoryProgress();
  }

  // ================================================================
  // FETCH LIVE CALCULATION PROGRESS
  // ================================================================

  private async fetchTrajectoryProgress() {
    if (this.isFetchingProgress) return;

    this.isFetchingProgress = true;

    try {
      const response = await fetch(
        `http://localhost:8000/trajectory/progress?from_planet=${this.from}&to_planet=${this.to}`
      );

      if (!response.ok) {
        throw new Error(
          "Could not retrieve calculation progress."
        );
      }

      const progress: TrajectoryProgress =
        await response.json();

      this.updateProgressPanel(progress);

      // Stop polling only when the backend has finished.
      if (
        progress.stage === "complete" ||
        progress.stage === "error"
      ) {
        this.stopProgressPolling(false);
      }

    } catch (error) {
      console.error(
        "Progress polling error:",
        error
      );

    } finally {
      this.isFetchingProgress = false;
    }
  }

  // ================================================================
  // UPDATE LIVE CALCULATION PANEL
  // ================================================================

  private updateProgressPanel(
    progress: TrajectoryProgress
  ) {
    if (!this.progressText || !this.progressBar) {
      return;
    }

    const panelWidth = this.progressPanelWidth;
    const panelHeight = this.progressPanelHeight;

    const panelX = this.panelMargin;
    const panelY =
      this.scale.height - panelHeight - this.panelMargin;

    // Progress bar positioning.
    const barX = panelX + 24;
    const barY = panelY + panelHeight - 38;
    const barWidth = panelWidth - 48;
    const barHeight = 10;

    // Calculate percentage.
    const percentage = progress.total > 0
      ? Math.min(
          100,
          Math.round(
            (progress.completed / progress.total) * 100
          )
        )
      : 0;

    // Format delta-v values.
    const formatDeltaV = (
      value?: number | null
    ): string => {
      return value !== null && value !== undefined
        ? `${value.toFixed(6)} AU/day`
        : "Calculating...";
    };

    const departureDate = progress.departure_date
      ? new Date(
          progress.departure_date
        ).toLocaleDateString()
      : "Searching...";

    // --------------------------------------------------
    // STATUS
    // --------------------------------------------------

    let status = "Searching for efficient orbital transfers...";

    if (progress.cached) {
      if (progress.stage === "complete") {
        status = "Saved orbital transfer loaded!";
      } else if (progress.stage === "generating") {
        status = "Loading saved trajectory...";
      } else {
        status = "Replaying saved calculation progress...";
      }

    } else if (progress.stage === "starting") {
      status = "Initializing transfer search...";

    } else if (progress.stage === "searching") {
      status = "Evaluating possible orbital transfers...";

    } else if (progress.stage === "generating") {
      status = "Best transfer found! Generating trajectory...";

    } else if (progress.stage === "complete") {
      status = "Orbital calculations complete!";

    } else if (progress.stage === "error") {
      status = `Calculation failed: ${
        progress.message ?? "Unknown error"
      }`;

    } else if (progress.stage === "waiting") {
      status = "Waiting for orbital calculations...";
    }

    // --------------------------------------------------
    // CALCULATION DESCRIPTION
    // --------------------------------------------------

    const calculationDescription = progress.cached
      ? "Using previously saved orbital calculations"
      : "Running new orbital transfer calculations";

    // --------------------------------------------------
    // INFORMATION TEXT
    // --------------------------------------------------

    const infoText = [
      "ORBITAL MISSION CONTROL",
      "",
      status,
      "",
      calculationDescription,
      "",
      "TRANSFER SEARCH",
      `Search progress: ${progress.completed ?? 0} / ${progress.total ?? 0}`,
      `Completion: ${percentage}%`,
      `Departure date: ${departureDate}`,
      `Flight duration: ${
        progress.flight_duration_days != null
          ? `${progress.flight_duration_days} days`
          : "Calculating..."
      }`,
      "",
      "VELOCITY CALCULATIONS",
      `Best total delta-v: ${formatDeltaV(progress.best_delta_v)}`,
      `Candidate departure: ${formatDeltaV(progress.departure_delta_v)}`,
      `Candidate arrival: ${formatDeltaV(progress.arrival_delta_v)}`,
      "",
      "Lower total delta-v indicates a more efficient transfer."
    ].join("\n");

    this.progressText.setText(infoText);

    // --------------------------------------------------
    // DRAW PROGRESS BAR
    // --------------------------------------------------

    this.progressBar.clear();

    // Background.
    this.progressBar.fillStyle(
      0x39435a,
      1
    );

    this.progressBar.fillRoundedRect(
      barX,
      barY,
      barWidth,
      barHeight,
      5
    );

    // Completed portion.
    this.progressBar.fillStyle(
      0xe8d5ad,
      1
    );

    if (percentage > 0) {
      this.progressBar.fillRoundedRect(
        barX,
        barY,
        barWidth * (percentage / 100),
        barHeight,
        5
      );
    }
  }

  // ================================================================
  // STOP PROGRESS POLLING
  // ================================================================

  private stopProgressPolling(
    destroyPanel = false
  ) {
    if (this.progressEvent) {
      this.progressEvent.remove();
      this.progressEvent = undefined;
    }

    if (destroyPanel) {
      this.progressPanel?.destroy();
      this.progressText?.destroy();
      this.progressBar?.destroy();

      this.progressPanel = undefined;
      this.progressText = undefined;
      this.progressBar = undefined;
    }
  }

  // ================================================================
  // DRAW SOLAR SYSTEM
  // ================================================================

  private drawSolarSystem(
    planets: PlanetPosition[]
  ) {
    const width = this.scale.width;
    const height = this.scale.height;

    const centerX = width / 2;
    const centerY = height / 2 + 50;

    // Visual distances are intentionally not to scale.
    const displayDistances: Record<PlanetName, number> = {
      venus: 150,
      earth: 230,
      mars: 320,
      jupiter: 440
    };

    // --------------------------------------------------
    // SUN
    // --------------------------------------------------

    this.add.circle(
      centerX,
      centerY,
      38,
      0xffcc55
    ).setStrokeStyle(
      4,
      0xffe8a3
    ).setDepth(1);

    this.add.text(
      centerX,
      centerY + 55,
      "SUN",
      {
        fontSize: "16px",
        color: "#ffffff",
        fontFamily: "Georgia"
      }
    ).setOrigin(0.5).setDepth(3);

    // --------------------------------------------------
    // PLANETS
    // --------------------------------------------------

    const imageKeys: Record<PlanetName, string> = {
      earth: "startingPlanet",
      mars: "planetB612",
      venus: "planetKing",
      jupiter: "planetBusinessman"
    };

    for (const planet of planets) {
      const angle = Math.atan2(
        planet.y,
        planet.x
      );

      const distance = displayDistances[planet.planet];

      const x = centerX + Math.cos(angle) * distance;
      const y = centerY - Math.sin(angle) * distance;

      this.planetPositions.set(
        planet.planet,
        new Phaser.Math.Vector2(x, y)
      );

      const image = this.add.image(
        x,
        y,
        imageKeys[planet.planet]
      );

      const size = planet.planet === "jupiter"
        ? 85
        : 65;

      image.setDisplaySize(size, size);
      image.setDepth(2);

      // Planet labels.
      this.add.text(
        x,
        y + 55,
        planet.planet.toUpperCase(),
        {
          fontSize: "16px",
          color: "#ffffff",
          fontFamily: "Georgia"
        }
      ).setOrigin(0.5).setDepth(3);
    }
  }

  // ================================================================
  // TRAVEL INFORMATION PANEL
  // ================================================================

  private drawTravelInfo(
    planets: PlanetPosition[],
    transfer: TransferData,
    arrivalError: number
  ) {
    const planetNames: Record<PlanetName, string> = {
      earth: "Davis Hall (Earth)",
      mars: "Asteroid B-612 (Mars)",
      venus: "King's Planet (Venus)",
      jupiter: "Businessman's Planet (Jupiter)"
    };

    const startPlanet = planets.find(
      planet => planet.planet === this.from
    );

    const destinationPlanet = planets.find(
      planet => planet.planet === this.to
    );

    if (!startPlanet || !destinationPlanet) {
      return;
    }

    // Calculate current planetary separation.
    const dx = destinationPlanet.x - startPlanet.x;
    const dy = destinationPlanet.y - startPlanet.y;
    const dz = destinationPlanet.z - startPlanet.z;

    const distanceAU = Math.sqrt(
      dx * dx + dy * dy + dz * dz
    );

    const distanceKM = distanceAU * 149597870.7;

    // Panel dimensions.
    const boxWidth = 340;
    const boxHeight = 420;
    const margin = 25;

    const boxX = this.scale.width - boxWidth - margin;
    const boxY = margin;

    const panel = this.add.rectangle(
      boxX,
      boxY,
      boxWidth,
      boxHeight,
      0x10152d,
      0.96
    );

    panel.setOrigin(0, 0);
    panel.setStrokeStyle(
      2,
      0xe8d5ad
    );
    panel.setScrollFactor(0);
    panel.setDepth(1000);

    const infoText = [
      "TRAVEL INFORMATION",
      "",
      `FROM: ${planetNames[this.from]}`,
      `TO: ${planetNames[this.to]}`,
      "",
      "CURRENT PLANET SEPARATION",
      `${distanceAU.toFixed(4)} AU`,
      `${Math.round(distanceKM).toLocaleString("en-US")} km`,
      "",
      "CALCULATED TRANSFER",
      `Flight duration: ${transfer.flight_duration_days} days`,
      `Departure delta-v: ${transfer.departure_delta_v.toFixed(5)} ${transfer.velocity_unit}`,
      `Arrival delta-v: ${transfer.arrival_delta_v.toFixed(5)} ${transfer.velocity_unit}`,
      `Total delta-v: ${transfer.total_delta_v.toFixed(5)} ${transfer.velocity_unit}`,
      "",
      "TRAJECTORY ACCURACY",
      `Arrival error: ${arrivalError.toFixed(6)} AU`
    ].join("\n");

    const text = this.add.text(
      boxX + 25,
      boxY + 22,
      infoText,
      {
        fontSize: "14px",
        color: "#ffffff",
        fontFamily: "Georgia",
        lineSpacing: 6,
        wordWrap: {
          width: boxWidth - 48
        }
      }
    );

    text.setScrollFactor(0);
    text.setDepth(1001);
  }

  // ================================================================
  // CONVERT NASA TRAJECTORY POINTS TO SCREEN POSITIONS
  // ================================================================

  private mapTrajectoryToScreen(
    points: TrajectoryPoint[]
  ): Phaser.Math.Vector2[] {
    const start = this.planetPositions.get(this.from);
    const end = this.planetPositions.get(this.to);

    if (!start || !end) {
      throw new Error(
        "Could not find the displayed planet positions."
      );
    }

    const first = points[0];
    const last = points[points.length - 1];

    const sourceX = last.x - first.x;
    const sourceY = last.y - first.y;

    const targetX = end.x - start.x;
    const targetY = end.y - start.y;

    const denominator =
      sourceX * sourceX +
      sourceY * sourceY;

    if (denominator < 1e-12) {
      throw new Error(
        "Invalid trajectory displacement."
      );
    }

    // Calculate a 2D rotation and scale transformation.
    const a = (
      targetX * sourceX +
      targetY * sourceY
    ) / denominator;

    const b = (
      targetY * sourceX -
      targetX * sourceY
    ) / denominator;

    return points.map(point => {
      const relativeX = point.x - first.x;
      const relativeY = point.y - first.y;

      const screenX =
        start.x +
        a * relativeX -
        b * relativeY;

      const screenY =
        start.y +
        b * relativeX +
        a * relativeY;

      return new Phaser.Math.Vector2(
        screenX,
        screenY
      );
    });
  }

  // ================================================================
  // ANIMATE ROCKET ALONG CALCULATED TRAJECTORY
  // ================================================================

  private animateRocket(
    points: TrajectoryPoint[]
  ) {
    try {
      const screenPoints =
        this.mapTrajectoryToScreen(points);

      // --------------------------------------------------
      // DRAW TRAJECTORY PATH
      // --------------------------------------------------

      const graphics = this.add.graphics();

      graphics.lineStyle(
        3,
        0xe8d5ad,
        0.8
      );

      graphics.beginPath();

      graphics.moveTo(
        screenPoints[0].x,
        screenPoints[0].y
      );

      for (
        let i = 1;
        i < screenPoints.length;
        i++
      ) {
        graphics.lineTo(
          screenPoints[i].x,
          screenPoints[i].y
        );
      }

      graphics.strokePath();
      graphics.setDepth(5);

      // --------------------------------------------------
      // CREATE ROCKET
      // --------------------------------------------------

      const rocket = this.add.image(
        screenPoints[0].x,
        screenPoints[0].y,
        "rocket"
      );

      rocket.setScale(0.35);
      rocket.setDepth(10);

      // --------------------------------------------------
      // ANIMATE ROCKET
      // --------------------------------------------------

      const progress = {
        value: 0
      };

      this.tweens.add({
        targets: progress,
        value: 1,
        duration: 8000,
        ease: "Linear",

        onUpdate: () => {
          const totalSegments =
            screenPoints.length - 1;

          const segment = Math.min(
            Math.floor(
              progress.value * totalSegments
            ),
            totalSegments - 1
          );

          const localProgress =
            progress.value * totalSegments - segment;

          const current = screenPoints[segment];
          const next = screenPoints[segment + 1];

          const x = Phaser.Math.Linear(
            current.x,
            next.x,
            localProgress
          );

          const y = Phaser.Math.Linear(
            current.y,
            next.y,
            localProgress
          );

          rocket.setPosition(x, y);

          const angle = Math.atan2(
            next.y - current.y,
            next.x - current.x
          );

          rocket.setRotation(
            angle + Math.PI / 2
          );
        },

        onComplete: () => {
          // Stop polling and clean up the progress panel
          // before moving to the next scene.
          this.stopProgressPolling(true);

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

    } catch (error) {
      console.error(
        "Rocket animation error:",
        error
      );
    }
  }
}

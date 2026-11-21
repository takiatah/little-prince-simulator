import Phaser from "phaser";

export default class BackendLoadingScene extends Phaser.Scene {
  private readonly API_URL = (
    import.meta.env.VITE_API_URL || "http://localhost:8000"
  ).replace(/\/$/, "");

  private cancelled = false;

  constructor() {
    super("BackendLoadingScene");
  }

  create() {
    this.cancelled = false;

    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#0B1025");

    this.add.text(
      width / 2,
      height / 2 - 60,
      "Preparing your journey...",
      {
        fontSize: "32px",
        color: "#FFFFFF",
        fontFamily: "Arial",
      }
    ).setOrigin(0.5);

    const status = this.add.text(
      width / 2,
      height / 2,
      "Waking up mission control...",
      {
        fontSize: "18px",
        color: "#B5C5E5",
        fontFamily: "Arial",
        align: "center",
        wordWrap: { width: width * 0.8 },
      }
    ).setOrigin(0.5);

    const loading = this.add.text(
      width / 2,
      height / 2 + 50,
      "Connecting...",
      {
        fontSize: "16px",
        color: "#F2C37A",
      }
    ).setOrigin(0.5);

    this.tweens.add({
      targets: loading,
      alpha: { from: 1, to: 0.3 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    this.events.once("shutdown", () => {
      this.cancelled = true;
    });

    void this.waitForBackend(status, loading);
  }

  private async waitForBackend(
    status: Phaser.GameObjects.Text,
    loading: Phaser.GameObjects.Text
  ) {
    console.log("Backend URL:", this.API_URL);

    for (let attempt = 1; attempt <= 20; attempt++) {
      if (this.cancelled) return;

      status.setText(
        `Connecting to mission control...\nAttempt ${attempt} of 20`
      );

      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        10000
      );

      try {
        const response = await fetch(
          `${this.API_URL}/health`,
          {
            signal: controller.signal,
            cache: "no-store",
          }
        );

        if (response.ok) {
          console.log("Backend connected!");

          if (!this.cancelled) {
            this.scene.start("DavisScene");
          }

          return;
        }

        console.error(
          "Backend returned:",
          response.status
        );
      } catch (error) {
        console.error(
          "Backend connection failed:",
          error
        );
      } finally {
        clearTimeout(timeout);
      }

      if (this.cancelled) return;

      await new Promise<void>((resolve) => {
        setTimeout(resolve, 3000);
      });
    }

    if (this.cancelled) return;

    loading.setVisible(false);

    status.setText(
      "Unable to connect to mission control.\nPlease try again."
    );

    const retry = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 + 80,
      "Retry Connection",
      {
        fontSize: "22px",
        color: "#F2C37A",
        backgroundColor: "#263452",
        padding: { x: 20, y: 12 },
      }
    )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    retry.on("pointerdown", () => {
      this.scene.restart();
    });
  }
}

import Phaser from "phaser";

export class BackendLoadingScene extends Phaser.Scene {
  private readonly API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:8000";

  constructor() {
    super("BackendLoadingScene");
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#0B1025");

    this.add.text(width / 2, height / 2 - 60,
      "Preparing your journey...", {
        fontSize: "32px",
        color: "#FFFFFF",
        fontFamily: "Arial",
      }
    ).setOrigin(0.5);

    const status = this.add.text(
      width / 2,
      height / 2,
      "Waking up mission control. This may take a minute...", {
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
      "Connecting...", {
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

    void this.waitForBackend(status);
  }

  private async waitForBackend(
    status: Phaser.GameObjects.Text
  ) {
    for (let attempt = 0; attempt < 20; attempt++) {
      try {
        const response = await fetch(`${this.API_URL}/health`);

        if (response.ok) {
          this.scene.start("StoryScene");
          return;
        }
      } catch {
        // Backend may still be waking up.
      }

      status.setText("Mission control is starting up...");
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    status.setText(
      "Unable to connect to mission control. Please refresh to retry."
    );
  }
}
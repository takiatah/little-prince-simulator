import Phaser from "phaser";

export default class GalaxyBackground {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create() {
    const { width, height } = this.scene.scale;

    // Expanded galaxy dimensions
    const galaxyWidth = width * 6;
    const galaxyHeight = height * 4;

    // Center galaxy around the original screen
    const startX = width / 2 - galaxyWidth / 2;
    const startY = height / 2 - galaxyHeight / 2;

    // Deep navy galaxy background
    this.scene.add.rectangle(
      width / 2,
      height / 2,
      galaxyWidth,
      galaxyHeight,
      0x080d24
    ).setDepth(-100);

    // Stars spread throughout the expanded galaxy
    for (let i = 0; i < 2000; i++) {
      const x = Phaser.Math.Between(
        Math.floor(startX),
        Math.floor(startX + galaxyWidth)
      );

      const y = Phaser.Math.Between(
        Math.floor(startY),
        Math.floor(startY + galaxyHeight)
      );

      const star = this.scene.add.circle(
        x,
        y,
        Phaser.Math.FloatBetween(0.8, 2.5),
        0xffffff,
        Phaser.Math.FloatBetween(0.3, 1)
      ).setDepth(-98);

      this.scene.tweens.add({
        targets: star,
        alpha: 0.2,
        duration: Phaser.Math.Between(800, 2000),
        yoyo: true,
        repeat: -1,
      });
    }
  }
}

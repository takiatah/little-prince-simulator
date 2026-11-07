import Phaser from "phaser";

export default class GalaxyBackground {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create() {
    const { width, height } = this.scene.scale;

    // Deep navy galaxy background
    this.scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x080d24
    ).setDepth(-100);

    // Stars
    for (let i = 0; i < 250; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);

      const star = this.scene.add.circle(
        x,
        y,
        Phaser.Math.FloatBetween(1, 2.5),
        0xffffff,
        Phaser.Math.FloatBetween(0.3, 1)
      ).setDepth(-98);

      this.scene.tweens.add({
        targets: star,
        alpha: 0.2,
        duration: Phaser.Math.Between(800, 2000),
        yoyo: true,
        repeat: -1
      });
    }
  }
}
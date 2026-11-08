import Phaser from "phaser";
import DialogueBox from "../components/DialogueBox";
import GalaxyBackground from "../components/GalaxyBackground";
import StoryManager from "../managers/StoryManager";
import type {
    StoryChoice,
    StoryData
} from "../managers/StoryManager";


export type PlanetName = "earth" | "mars" | "venus" | "jupiter";


export default class StoryChapterScene extends Phaser.Scene {
    protected story!: StoryManager;
    protected dialogue!: DialogueBox;


    private loadingText!: Phaser.GameObjects.Text;
    private uiCamera!: Phaser.Cameras.Scene2D.Camera;


    private planetImage?: Phaser.GameObjects.Image;
    private princeImage?: Phaser.GameObjects.Image;
    private characterImage?: Phaser.GameObjects.Image;
    private introPrompt?: Phaser.GameObjects.Text;
    private castleImage?: Phaser.GameObjects.Image;
    private davisHallImage?: Phaser.GameObjects.Image;
    private girlWithLaptopImage?: Phaser.GameObjects.Image;
    private wateringCanImage?: Phaser.GameObjects.Image;

    private minigameButtons: Phaser.GameObjects.Text[] = [];
    private introComplete = false;


    protected currentPlanet!: PlanetName;


    constructor(sceneKey: string) {
        super(sceneKey);
    }


    create(data: { planet?: PlanetName } = {}) {
        // DavisScene defaults to Earth.
        // PlanetScene receives its destination from SolarSystemScene.
        this.currentPlanet = data.planet ?? "earth";


        new GalaxyBackground(this).create();


        const mainCamera = this.cameras.main;
        mainCamera.setZoom(1);


        this.uiCamera = this.cameras.add(
            0,
            0,
            this.scale.width,
            this.scale.height
        );


        this.uiCamera.setScroll(0, 0);
        this.uiCamera.setZoom(1);


        // UI camera ignores all existing world objects.
        this.uiCamera.ignore(this.children.list);


        const { width, height } = this.scale;


        this.loadingText = this.add.text(
            width / 2,
            height / 2,
            "Loading story...",
            {
                fontSize: "24px",
                color: "#E0D3B7",
                fontFamily: "Indie Flower"
            }
        ).setOrigin(0.5);


        this.uiCamera.ignore(this.loadingText);


        // Reuse the existing manager when moving between scenes.
        const savedStory = this.registry.get("storyManager");


        if (savedStory) {
            this.story = savedStory;
            this.loadingText.destroy();
            this.showPlanetIntro();
        } else {
            this.loadStory();
        }
    }


    private async loadStory() {
        try {
            const response = await fetch(
                "http://localhost:8000/story"
            );


            if (!response.ok) {
                throw new Error("Could not load story JSON");
            }


            const data: StoryData = await response.json();


            this.story = new StoryManager(data);


            // Preserve story progress across scene transitions.
            this.registry.set("storyManager", this.story);


            this.loadingText.destroy();


            this.showPlanetIntro();


        } catch (error) {
            console.error("Story loading error:", error);


            this.loadingText.setText(
                "Could not load the story. Is the backend running?"
            );
        }
    }


    private showPlanetIntro() {
        this.createPlanetVisuals();


        const { width, height } = this.scale;


        this.introPrompt = this.add.text(
            width / 2,
            height - 100,
            "PRESS ENTER TO BEGIN",
            {
                fontSize: "22px",
                color: "#E0D3B7",
                fontFamily: "Indie Flower"
            }
        )
            .setOrigin(0.5)
            .setDepth(10);


        this.uiCamera.ignore(this.introPrompt);


        this.input.keyboard?.once("keydown-ENTER", () => {
            // Only play the click if it loaded, so a missing sound never blocks the game.
            if (this.cache.audio.exists("sfx_click")) {
                this.sound.play("sfx_click", { volume: 0.6 });
            }
            this.introPrompt?.destroy();
            this.zoomIntoPlanet();
        });
    }


    private zoomIntoPlanet() {
        if (!this.planetImage) {
            this.startDialogue();
            return;
        }


        const camera = this.cameras.main;


        camera.pan(
            this.planetImage.x,
            this.planetImage.y -
            this.planetImage.displayHeight * 0.25,
            1200,
            "Sine.easeInOut"
        );


        camera.once("camerapancomplete", () => {
            camera.zoomTo(
                1.4,
                1000,
                "Sine.easeInOut"
            );


            camera.once("camerazoomcomplete", () => {
                this.introComplete = true;
                this.startDialogue();
            });
        });
    }




    private createPlanetVisuals() {
        const width = this.scale.width;
        const height = this.scale.height;


        const planetConfig: Record<
            PlanetName,
            { image: string; character: string }
        > = {
            earth: {
                image: "startingPlanet",
                character: ""
            },
            mars: {
                image: "planetB612",
                character: "rose"
            },
            venus: {
                image: "planetKing",
                character: "king"
            },
            jupiter: {
                image: "planetBusinessman",
                character: "businessman"
            }
        };


        const config = planetConfig[this.currentPlanet];


        // Planet background
        this.planetImage = this.add.image(
            width / 2,
            height / 2 - 40,
            config.image
        );


        const scale = Math.min(
            (width * 0.65) / this.planetImage.width,
            (height * 0.85) / this.planetImage.height
        );


        this.planetImage.setScale(scale);
        this.planetImage.setDepth(-5);
        this.uiCamera.ignore(this.planetImage);


        const radius = this.planetImage.displayWidth / 2;
        const characterY = height / 2 - 40 - radius * 0.45;


    // --------------------------------
    // EARTH: Davis Hall, Prince, and Girl with Laptop
    // --------------------------------
    if (this.currentPlanet === "earth") {


        // Davis Hall in the background
        this.davisHallImage = this.add.image(
            width / 2,
            height / 2 - 320,
            "davisHall"
        );


        this.davisHallImage.setScale(0.9);
        this.davisHallImage.setDepth(0);
        this.uiCamera.ignore(this.davisHallImage);


        // Little Prince
        this.princeImage = this.add.sprite(
            width / 2 - radius * 0.25,
            characterY,
            "prince",
            1
        );


        this.princeImage.setOrigin(0.5, 1);
        this.princeImage.setScale(1.2);
        this.princeImage.setDepth(2);
        this.uiCamera.ignore(this.princeImage);


        // Girl with Laptop (single image)
        this.girlWithLaptopImage = this.add.image(
            width / 2 + radius * 0.15,
            characterY,
            "girlWithLaptop"
        );


        this.girlWithLaptopImage.setOrigin(0.5, 1);
        this.girlWithLaptopImage.setScale(.25);
        this.girlWithLaptopImage.setDepth(2);
        this.uiCamera.ignore(this.girlWithLaptopImage);
    }


        // --------------------------------
        // VENUS: Castle, Prince, and King
        // --------------------------------
        else if (this.currentPlanet === "venus") {
            // Castle in the background
            this.castleImage = this.add.image(
                width / 2,
                height / 2 - 300,
                "castle"
            );


            this.castleImage.setScale(0.7);
            this.castleImage.setDepth(-1);
            this.uiCamera.ignore(this.castleImage);


            // Little Prince
            this.princeImage = this.add.sprite(
                width / 2 - radius * 0.18,
                characterY,
                "prince",
                1
            );


            this.princeImage.setOrigin(0.5, 1);
            this.princeImage.setScale(1.2);
            this.princeImage.setDepth(2);
            this.uiCamera.ignore(this.princeImage);


            // King
            this.characterImage = this.add.sprite(
                width / 2 + radius * 0.10,
                characterY,
                "king",
                0
            );


            this.characterImage.setOrigin(0.5, 1);
            this.characterImage.setScale(0.8);
            this.characterImage.setDepth(2);
            this.uiCamera.ignore(this.characterImage);
        }


        // --------------------------------
        // JUPITER: Prince and Businessman
        // --------------------------------
        else if (this.currentPlanet === "jupiter") {
            // Little Prince
            this.princeImage = this.add.sprite(
                width / 2 - radius * 0.18,
                characterY,
                "prince",
                1
            );


            this.princeImage.setOrigin(0.5, 1);
            this.princeImage.setScale(1.2);
            this.princeImage.setDepth(2);
            this.uiCamera.ignore(this.princeImage);


            // Businessman
            this.characterImage = this.add.sprite(
                width / 2 + radius * 0.10,
                characterY,
                "businessman",
                0
            );


            this.characterImage.setOrigin(0.5, 1);
            this.characterImage.setScale(0.8);
            this.characterImage.setDepth(2);
            this.uiCamera.ignore(this.characterImage);
        }


        // --------------------------------
        // MARS: Prince, Watering Can, and Rose
        // --------------------------------
        else if (this.currentPlanet === "mars") {

            // Little Prince
            this.princeImage = this.add.sprite(
                width / 2 - radius * 0.18,
                characterY,
                "prince",
                1
            );

            this.princeImage.setOrigin(0.5, 1);
            this.princeImage.setScale(1.2);
            this.princeImage.setDepth(2);
            this.uiCamera.ignore(this.princeImage);


            // Rose
            this.characterImage = this.add.image(
                width / 2 + radius * 0.10,
                characterY,
                "rose"
            );

            this.characterImage.setOrigin(0.5, 1);
            this.characterImage.setScale(1.5);
            this.characterImage.setDepth(2);
            this.uiCamera.ignore(this.characterImage);


            // Watering can between the Prince and Rose
            this.wateringCanImage = this.add.image(
                width / 2 - radius * 0.04,
                characterY - 5,
                "wateringCan"
            );

            this.wateringCanImage.setOrigin(0.5, 1);
            this.wateringCanImage.setScale(0.1);
            this.wateringCanImage.setDepth(3);
            this.uiCamera.ignore(this.wateringCanImage);
        }
    }




    private startDialogue() {
        this.dialogue = new DialogueBox(
            this,
            () => this.advanceDialogue(),
            (choice) => this.makeChoice(choice)
        );


        // Main camera should not render UI.
        this.cameras.main.ignore(
            this.dialogue.getGameObjects()
        );


        this.showCurrentNode();
    }


    private getDestination(
        sceneId: string
    ): PlanetName | null {
        if (sceneId.startsWith("b612")) return "mars";
        if (sceneId.startsWith("king")) return "venus";


        if (
            sceneId.startsWith("biz") ||
            sceneId.startsWith("businessman")
        ) {
            return "jupiter";
        }


        if (sceneId.startsWith("finale")) return "earth";


        return "earth";
    }


    private showCurrentNode() {
        if (!this.introComplete) return;


        const sceneId = this.story.getCurrentSceneId();
        const destination = this.getDestination(sceneId);


        // If the story has entered another planet's chapter,
        // travel there before showing the next dialogue.
        if (destination !== this.currentPlanet) {
            this.scene.start("SolarSystemScene", {
                from: this.currentPlanet,
                to: destination
            });


            return;
        }


        const node = this.story.getCurrentNode();
        const line = this.story.getCurrentLine();


        if (node.type === "branch") {
            this.finishNode();
            return;
        }


        if (line) {
            const speaker = this.story.getSpeaker(line.speaker);


            this.dialogue.showLine(
                line,
                speaker?.name || line.speaker
            );
        } else {
            this.finishNode();
        }
    }


    private advanceDialogue() {
        const node = this.story.getCurrentNode();


        if (!this.story.isLastLine()) {
            const line = this.story.nextLine()!;
            const speaker = this.story.getSpeaker(line.speaker);


            this.dialogue.showLine(
                line,
                speaker?.name || line.speaker
            );


            return;
        }


        if (node.type === "ending") {
            this.dialogue.showMessage(
                `THE END\n\nHeart score: ${this.story.getHeartScore()} / 8`
            );
            return;
        }


        if (node.type === "choice" && node.choices) {
            this.dialogue.showChoices(node.choices);
            return;
        }


        if (node.type === "minigame") {
            this.startMinigamePlaceholder();
            return;
        }


        this.finishNode();
    }


    private makeChoice(choice: StoryChoice) {
        this.story.choose(choice);

        // Check whether the player chose to water the rose.
        if (
            this.currentPlanet === "mars" &&
            choice.id === "water"
        ) {
            this.animateWateringCan();
        }

        this.showCurrentNode();
    }

    private finishNode() {
        const nextNode = this.story.completeDialogue();


        if (nextNode) {
            this.showCurrentNode();
        } else {
            this.dialogue.showMessage(
                "The story has ended. Thank you for playing!"
            );
        }
    }


    private startMinigamePlaceholder() {
        this.clearMinigameButtons();


        const node = this.story.getCurrentNode();


        const outcomes = Object.keys(
            node.minigame?.outcomes ?? {}
        );


        this.dialogue.showMessage(
            `Minigame: ${node.minigame?.id}\n\nChoose an outcome to test the story progression.`
        );


        const { width, height } = this.scale;


        outcomes.forEach((outcome, index) => {
            const button = this.add.text(
                width / 2,
                height - 65 - index * 48,
                outcome.replaceAll("_", " ").toUpperCase(),
                {
                    fontSize: "16px",
                    color: "#ffffff",
                    backgroundColor: "#526b83",
                    padding: { x: 14, y: 10 }
                }
            )
                .setOrigin(0.5)
                .setScrollFactor(0)
                .setInteractive({ useHandCursor: true })
                .setDepth(110);


            this.cameras.main.ignore(button);


            button.on("pointerdown", () => {
                this.clearMinigameButtons();


                this.story.resolveMinigame(outcome);


                this.showCurrentNode();
            });


            this.minigameButtons.push(button);
        });
    }

    private animateWateringCan() {
        if (!this.wateringCanImage) return;

        // Prevent the can from being animated more than once.
        this.tweens.killTweensOf(this.wateringCanImage);

        const can = this.wateringCanImage;

        // Remember its original position and rotation.
        const originalY = can.y;
        const originalRotation = can.rotation;

        // Lift the can and tilt it toward the rose.
        this.tweens.add({
            targets: can,
            y: originalY - 45,
            angle: 55,
            duration: 700,
            ease: "Sine.easeInOut",
            yoyo: true,
            hold: 900,
            onComplete: () => {
                can.setY(originalY);
                can.setRotation(originalRotation);
            }
        });
    }

    private clearMinigameButtons() {
        this.minigameButtons.forEach(button => button.destroy());
        this.minigameButtons = [];
    }
}


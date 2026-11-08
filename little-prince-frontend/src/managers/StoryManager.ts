export interface StoryLine {
  speaker: string;
  text: string;
}

export interface StoryChoice {
  id: string;
  text: string;
  next: string;
  effects?: StoryEffects;
}

export interface StoryEffects {
  add?: Record<string, number>;
  set?: Record<string, boolean | number | string>;
}

export interface StoryOutcome {
  next: string;
  effects?: StoryEffects;
}

export interface StoryNode {
  chapter: string;
  type: "dialogue" | "choice" | "minigame" | "branch" | "ending";
  lines?: StoryLine[];
  choices?: StoryChoice[];
  next?: string;
  unlockLesson?: string;
  minigame?: {
    id: string;
    tasks?: { id: string; label: string }[];
    outcomes: Record<string, StoryOutcome>;
  };
  branches?: {
    if: {
      var: string;
      op: string;
      value: number | string | boolean;
    };
    next: string;
  }[];
  default?: string;
  ending?: string;
  showJournal?: boolean;
}

export interface StoryData {
  meta: {
    title: string;
    startScene: string;
    heartThreshold: number;
  };
  variables: Record<string, boolean | number | string>;
  speakers: Record<string, {
    name: string;
    sprite: string | null;
  }>;
  chapters: {
    id: string;
    title: string;
    background: string;
    music: string;
  }[];
  lessons: Record<string, {
    title: string;
    text: string;
  }>;
  scenes: Record<string, StoryNode>;
}

export default class StoryManager {
  private data: StoryData;
  private currentSceneId: string;
  private lineIndex = 0;

  public variables: Record<string, boolean | number | string>;
  public unlockedLessons: string[] = [];

  constructor(data: StoryData) {
    this.data = data;
    this.currentSceneId = data.meta.startScene;
    this.variables = { ...data.variables };
  }

  getCurrentNode(): StoryNode {
    return this.data.scenes[this.currentSceneId];
  }

  getCurrentSceneId(): string {
    return this.currentSceneId;
  }

  getCurrentLine(): StoryLine | undefined {
    return this.getCurrentNode().lines?.[this.lineIndex];
  }

  getLineIndex(): number {
    return this.lineIndex;
  }

  isLastLine(): boolean {
    const lines = this.getCurrentNode().lines ?? [];
    return this.lineIndex >= lines.length - 1;
  }

  nextLine(): StoryLine | undefined {
    const lines = this.getCurrentNode().lines ?? [];

    if (this.lineIndex < lines.length - 1) {
      this.lineIndex++;
    }

    return lines[this.lineIndex];
  }

  getSpeaker(speakerId: string) {
    return this.data.speakers[speakerId];
  }

  getChapter(chapterId: string) {
    return this.data.chapters.find(
      chapter => chapter.id === chapterId
    );
  }

  getLessons() {
    return this.unlockedLessons.map(
      id => this.data.lessons[id]
    );
  }

  private applyEffects(effects?: StoryEffects) {
    if (!effects) return;

    // Add numerical values
    if (effects.add) {
      for (const [key, amount] of Object.entries(effects.add)) {
        const current = this.variables[key];

        if (typeof current === "number") {
          this.variables[key] = current + amount;
        }
      }
    }

    // Set variables
    if (effects.set) {
      Object.assign(this.variables, effects.set);
    }

    // Keep heart within its intended range
    if (typeof this.variables.heart === "number") {
      this.variables.heart = Math.min(
        8,
        Math.max(0, this.variables.heart)
      );
    }
  }

  private moveTo(sceneId: string): StoryNode {
    const nextNode = this.data.scenes[sceneId];

    if (!nextNode) {
      throw new Error(`Story node not found: ${sceneId}`);
    }

    this.currentSceneId = sceneId;
    this.lineIndex = 0;

    if (
      nextNode.unlockLesson &&
      !this.unlockedLessons.includes(nextNode.unlockLesson)
    ) {
      this.unlockedLessons.push(nextNode.unlockLesson);
    }

    return nextNode;
  }

  choose(choice: StoryChoice): StoryNode {
    this.applyEffects(choice.effects);
    return this.moveTo(choice.next);
  }

  completeDialogue(): StoryNode | null {
    const node = this.getCurrentNode();

    // Resolve conditional branches
    if (node.type === "branch") {
      const branch = node.branches?.find(item => {
        const actual = this.variables[item.if.var];
        const expected = item.if.value;

        switch (item.if.op) {
          case ">=": return Number(actual) >= Number(expected);
          case "<=": return Number(actual) <= Number(expected);
          case ">": return Number(actual) > Number(expected);
          case "<": return Number(actual) < Number(expected);
          case "==": return actual === expected;
          case "!=": return actual !== expected;
          default: return false;
        }
      });

      const destination = branch?.next ?? node.default;

      return destination ? this.moveTo(destination) : null;
    }

    // Ending nodes have no next scene
    if (node.type === "ending") {
      return null;
    }

    // Minigames must be completed separately
    if (node.type === "minigame") {
      return null;
    }

    return node.next ? this.moveTo(node.next) : null;
  }

  resolveMinigame(outcomeId: string): StoryNode {
    const node = this.getCurrentNode();
    const outcome = node.minigame?.outcomes[outcomeId];

    if (!outcome) {
      throw new Error(`Unknown minigame outcome: ${outcomeId}`);
    }

    this.applyEffects(outcome.effects);
    return this.moveTo(outcome.next);
  }

  getHeartScore(): number {
    return Number(this.variables.heart ?? 0);
  }
}

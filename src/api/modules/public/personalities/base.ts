export interface Personality {
  name: string;
  styleInstructions: string;
  apply(message: string): string;
}

export abstract class BasePersonality implements Personality {
  constructor(public name: string, public styleInstructions: string) {}

  apply(message: string): string {
    return `【${this.name} Style】 ${message}\nInstructions: ${this.styleInstructions}`;
  }
}

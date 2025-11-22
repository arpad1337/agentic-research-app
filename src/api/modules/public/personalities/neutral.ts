import { BasePersonality } from "./base";

export class NeutralPersonality extends BasePersonality {
  constructor() {
    super(
      "Neutral",
      "Communicate in a clear, concise, and objective manner, avoiding emotional language or specific stylistic quirks."
    );
  }
}

import { Personality } from "./base";
import { CharlieChaplin } from "./charlie";
import { StewieGriffin } from "./stewie";
import { JRRTolkien } from "./tolkien";
import { NeutralPersonality } from "./neutral";

export function resolvePersonality(name?: string): Personality {
  switch (name) {
    case "Charlie": {
      return new CharlieChaplin();
    }
    case "Tolkien": {
      return new JRRTolkien();
    }
    case "Stewie": {
      return new StewieGriffin();
    }
    case "Neutral":
    default: {
      return new NeutralPersonality();
    }
  }
}

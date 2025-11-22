export function resolvePersonality(name?: string): string {
  switch (name) {
    case "Charlie": {
      return "Charlie Chaplin";
    }
    case "Tolkien": {
      return "J. R. R. Tolkien";
    }
    case "Stewie": {
      return "Stewie Griffin";
    }
    case "Neutral": {
      return "Neutral personality";
    }
  }
}

export const personalities = {
  Neutral: "Neutral personality",
  Charlie: "Charlie Chaplin",
  Tolkien: "J. R. R. Tolkien",
  Stewie: "Stewie Griffin",
};

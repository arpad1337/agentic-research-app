import { Singleton, SingletonError } from "@greeneyesai/api-utils";
import { DatabaseMemoryManager } from "../memory/database-memory-manager";
import { Personality } from "../personalities/base";
import { Tool } from "../adapters/tool";
import { MemoryModelType } from "../../../lib/models/memory";

export interface GenerateOptions {
  personality?: Personality;
  tools?: Tool[];
  memoryQuery?: boolean;
  onData?: (fragment: string) => void;
}

export abstract class BaseAssistant extends Singleton {
  protected constructor(
    protected memory: DatabaseMemoryManager,
    protected defaultPersonality: Personality
  ) {
    super();
  }

  async generate(
    userId: number,
    message: string,
    options: GenerateOptions = {}
  ): Promise<MemoryModelType> {
    const personality = options.personality ?? this.defaultPersonality;

    const embedding = await this.embed(message);

    let memoryResults: any[] = [];
    if (options.memoryQuery) {
      memoryResults = await this.memory.query(userId, embedding);
    }

    let toolResults: Record<string, string> = {};
    if (options.tools) {
      for (const tool of options.tools) {
        toolResults[tool.name] = await tool.run(message);
      }
    }

    const contextualPrompt = `Context Memory: ${JSON.stringify(
      memoryResults
    )}\nTools: ${JSON.stringify(toolResults)}\nUser: ${message}`;

    const personalityWrapped = personality.apply(contextualPrompt);

    const result = await this.llm(
      personalityWrapped,
      options.onData ? options.onData : () => {}
    );

    return await this.memory.store(userId, message, result, embedding);
  }

  abstract embed(text: string): Promise<number[]>;

  abstract llm(
    prompt: string,
    onData?: (fragment: string) => void
  ): Promise<string>;
}

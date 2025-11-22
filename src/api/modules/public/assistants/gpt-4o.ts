import { SingletonClassType } from "@greeneyesai/api-utils";
import { BaseAssistant, GenerateOptions } from "./base";
import { DatabaseMemoryManager } from "../memory/database-memory-manager";
import { resolvePersonality } from "../personalities/resolver";
import { BingAPISearchTool } from "../adapters/bing";
import { Multer } from "multer";
import { MemoryModelType } from "../../../lib/models/memory";
import OpenAI from "openai";
import { getenv } from "../../../lib/config";

export class GPT4oAssistant extends BaseAssistant {
  public static get Dependencies(): [
    SingletonClassType<DatabaseMemoryManager>,
    SingletonClassType<BingAPISearchTool>
  ] {
    return [DatabaseMemoryManager, BingAPISearchTool];
  }

  public static create(
    databaseMemoryManager: DatabaseMemoryManager,
    bingAPISearchTool: BingAPISearchTool
  ) {
    const client = new OpenAI({
      apiKey: getenv("OPENAI_API_KEY"),
    });
    return new this(databaseMemoryManager, bingAPISearchTool, client);
  }

  constructor(
    protected databaseMemoryManager: DatabaseMemoryManager,
    protected bingAPISearchTool: BingAPISearchTool,
    protected client: OpenAI
  ) {
    super(databaseMemoryManager, resolvePersonality());
  }

  async generate(
    userId: number,
    message: string,
    options: GenerateOptions = {}
  ): Promise<MemoryModelType> {
    this.logger!.info(`generating response`);

    return super.generate(userId, message, {
      tools: [this.bingAPISearchTool],
      memoryQuery: true,
      ...options,
    });
  }

  async embed(text: string): Promise<number[]> {
    const res = await this.client.embeddings.create({
      model: "text-embedding-3-large",
      input: text,
      dimensions: 768,
    });

    return res.data[0].embedding;
  }

  async addFileToMemoryAndSummarizeIt(
    userId: number,
    file: Multer.File,
    options: GenerateOptions = {}
  ): Promise<MemoryModelType> {
    this.logger!.info(`adding file`);

    const text = await this.extractFileText(file);
    const embedding = await this.embed(text);

    await this.memory.store(
      userId,
      `FILE_UPLOAD: ${file.originalname}`,
      text,
      embedding,
      true
    );

    const summary = await this.llm(`
      Summarize this:
      
      ${text}
      `);

    const embedding2 = await this.embed(summary);

    const memoryItem = await this.memory.store(
      userId,
      `Summary of ${file.originalname}`,
      summary,
      embedding2
    );

    return memoryItem;
  }

  protected async extractFileText(file: Multer.File): Promise<string> {
    this.logger!.info(`extracting file`);

    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Extract all readable text from this file." },
            { type: "file", file },
          ],
        },
      ],
    });

    return response.choices[0]?.message?.content ?? "";
  }

  async llm(
    prompt: string,
    onData?: (fragment: string) => void
  ): Promise<string> {
    this.logger!.info(`calling LLM`);

    const stream = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });

    let result = "";

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (choice.delta?.content) {
        onData && onData(choice.delta.content);
        result += choice.delta.content;
      }
    }

    return result;
  }
}

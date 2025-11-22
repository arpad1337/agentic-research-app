import { SingletonClassType } from "@greeneyesai/api-utils";
import { BaseAssistant, GenerateOptions } from "./base";
import { DatabaseMemoryManager } from "../memory/database-memory-manager";
import { resolvePersonality } from "../personalities/resolver";
import { BingAPISearchTool } from "../adapters/bing";
import { Multer } from "multer";
import { MemoryModelType } from "../../../lib/models/memory";
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { getenv } from "../../../lib/config";

export class GeminiAssistant extends BaseAssistant {
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
    const client = new GoogleGenerativeAI(getenv("GEMINI_API_KEY"));
    return new this(databaseMemoryManager, bingAPISearchTool, client);
  }

  constructor(
    protected databaseMemoryManager: DatabaseMemoryManager,
    protected bingAPISearchTool: BingAPISearchTool,
    protected client: GoogleGenerativeAI
  ) {
    super(databaseMemoryManager, resolvePersonality());
  }

  async generate(
    userId: number,
    message: string,
    options: GenerateOptions = {}
  ): Promise<MemoryModelType> {
    this.logger!.info(`generating response via Gemini`);

    return super.generate(userId, message, {
      tools: [this.bingAPISearchTool],
      memoryQuery: true,
      ...options,
    });
  }

  async embed(text: string): Promise<number[]> {
    const model = this.client.getGenerativeModel({
      model: "text-embedding-004",
    });

    const result = await model.embedContent(text);

    return result.embedding.values;
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
    this.logger!.info(`extracting file via Gemini Multimodal`);

    const model = this.client.getGenerativeModel({ model: "gemini-2.5-flash" });

    const base64Data = file.buffer.toString("base64");
    const mimeType = file.mimetype;

    const result = await model.generateContent([
      "Extract all readable text from this file. Output only the raw text.",
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
    ]);

    return result.response.text();
  }

  async llm(
    prompt: string,
    onData?: (fragment: string) => void
  ): Promise<string> {
    this.logger!.info(`calling LLM (Gemini)`);

    const model = this.client.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContentStream(prompt);

    let fullText = "";

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        onData && onData(chunkText);
        fullText += chunkText;
      }
    }

    return fullText;
  }
}

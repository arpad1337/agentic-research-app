export interface Tool {
  name: string;
  run(prompt: string): Promise<string>;
}

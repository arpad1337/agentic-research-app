import { getJson } from "serpapi";
import { getenv } from "../../../lib/config";
import { Tool } from "./tool";
import { Singleton } from "@greeneyesai/api-utils";

export class BingAPISearchTool extends Singleton implements Tool {
  public name: string = "bing_search";

  async run(query: string): Promise<string> {
    const json = await getJson({
      engine: "bing",
      api_key: getenv("SERPAPI_API_KEY"),
      q: query,
      ai: true
    });
    return JSON.stringify(json.answer_box);
  }
}

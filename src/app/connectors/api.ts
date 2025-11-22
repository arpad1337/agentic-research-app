import * as yup from "yup";
import * as events from "events";
import * as uuid from "uuid";
import axios, { AxiosHeaders, AxiosInstance } from "axios";

export class APIConnector extends events.EventEmitter {
  protected httpClient: AxiosInstance;
  protected eventSource: EventSource | null = null;

  constructor(driver: AxiosInstance) {
    super();
    this.httpClient = driver.create({
      baseURL: `http://localhost:${8200}/api/v1`,
    });

    this.httpClient.interceptors.request.use((config) => {
      if (!config.headers) config.headers = {} as AxiosHeaders;
      if (!config.headers["X-Correlation-ID"]) {
        config.headers["X-Correlation-ID"] = uuid.v4();
      }
      return config;
    });
  }

  async status(): Promise<"ok" | "error"> {
    return (
      await this.httpClient.get("/status", {
        baseURL: `http://localhost:${8200}/common`,
      })
    ).data.status;
  }

  async createOrFetchUser(
    username: string,
    personality: string
  ): Promise<{
    id: string;
  }> {
    const data = {
      username,
      personality,
    };

    const schema: yup.Schema = yup.object({
      username: yup.string().min(1).max(256).required("Username missing"),
      personality: yup
        .string()
        .oneOf(["Charlie", "Tolkien", "Stewie", "Neutral"])
        .required("Personality missing"),
    });

    await schema.validate(data, { strict: true });

    return (await this.httpClient.post("/user", data)).data.data;
  }

  async getUserById(
    userId: string
  ): Promise<{ id: string; username: string; personality: string }> {
    return (await this.httpClient.get(`/user/${userId}`)).data.data;
  }

  async changePersonalityForUser(
    userId: string,
    personality: string
  ): Promise<void> {
    const data = {
      personality,
    };

    const schema: yup.Schema = yup.object({
      personality: yup
        .string()
        .oneOf(["Charlie", "Tolkien", "Stewie", "Neutral"])
        .required("Personality missing"),
    });

    await schema.validate(data, { strict: true });

    await this.httpClient.post(`/user/${userId}`, data);
  }

  async getMemoryForUser(userId: string): Promise<
    {
      content: string;
      response: string;
      createdAt: string;
    }[]
  > {
    return (await this.httpClient.get(`/user/${userId}/chat`)).data.data;
  }

  async promptByUser(
    userId: string,
    prompt: string
  ): Promise<{
    content: string;
    response: string;
    createdAt: string;
  }> {
    const data = {
      prompt,
    };

    const schema: yup.Schema = yup.object({
      prompt: yup.string().min(1).required("Prompt missing"),
    });

    await schema.validate(data, { strict: true });

    return (await this.httpClient.post(`/user/${userId}/chat`, data)).data.data;
  }

  async uploadFileForUser(userId: string, file: File): Promise<string> {
    const data = {
      file,
    };

    const schema: yup.Schema = yup.object({
      file: yup.mixed().required("File missing"),
    });

    await schema.validate(data, { strict: true });

    const form = new FormData();
    form.append("file", data.file);

    return (await this.httpClient.post(`/user/${userId}/chat/file`, form)).data
      .data;
  }

  async connectToEventSourceByUserId(userId: number): Promise<void> {
    if (this.eventSource) {
      this.eventSource.close();
    }

    this.eventSource = new EventSource(`/user/${userId}/live-feed`);
    this.eventSource.onmessage = (event: MessageEvent<string>) => {
      const payload = JSON.parse(event.data);
      this.emit("event", payload);
    };
    this.eventSource.onerror = () => {
      this.connectToEventSourceByUserId(userId);
    };
  }
}

export default new APIConnector(axios);

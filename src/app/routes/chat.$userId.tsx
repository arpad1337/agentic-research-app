import { useLoaderData } from "@remix-run/react";
import React, { useCallback, useRef, useState, useEffect } from "react";
import apiConnector from "@/connectors/api";
import { LoaderFunctionArgs } from "@remix-run/node";
import { CenteredForm } from "@/components/CenteredForm";
import { Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Markdown from "react-markdown";
import { PersonalitySelector } from "~/components/PersonalitySelector";

export async function loader({ params }: LoaderFunctionArgs) {
  const userId = params.userId;

  const [user, memory] = await Promise.all([
    apiConnector.getUserById(userId),
    apiConnector.getMemoryForUser(userId),
  ]);

  const memoryMapped = memory
    .map((m) => [
      { type: "user", text: m.content },
      { type: "agent", text: m.response },
    ])
    .flat();

  return { user, memory: memoryMapped, userId };
}

const PendingBubble = () => (
  <div className="flex justify-start bubble">
    <div className="bg-muted p-3 rounded-2xl rounded-bl-sm text-muted-foreground max-w-2xl shadow-md animate-pulse">
      <div className="flex space-x-1">
        <div className="h-2 w-2 bg-muted-foreground/50 rounded-full"></div>
        <div className="h-2 w-2 bg-muted-foreground/50 rounded-full"></div>
        <div className="h-2 w-2 bg-muted-foreground/50 rounded-full"></div>
      </div>
    </div>
  </div>
);

const ChatBubble = ({
  type,
  text,
}: {
  type: "user" | "agent";
  text: string;
}) => {
  const isUser = type === "user";
  const bubbleClasses = isUser
    ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
    : "bg-card text-foreground rounded-2xl rounded-tl-sm"; // aligned with card background

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`${bubbleClasses} bubble p-4 max-w-3xl shadow-sm whitespace-pre-wrap`}
      >
        <Markdown>{text}</Markdown>
      </div>
    </div>
  );
};

export default function Chat() {
  const {
    userId,
    memory: memoryFromLoader,
    user: userFromMemory,
  } = useLoaderData<typeof loader>();

  const [history, setHistory] = useState(memoryFromLoader);
  const [user, setUser] = useState(userFromMemory);
  const [isPending, setIsPending] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputValue.trim() || isPending) return;

      const prompt = inputValue.trim();

      setHistory((prev) => [...prev, { type: "user", text: prompt }]);
      setInputValue("");
      setIsPending(true);

      try {
        const result = await apiConnector.promptByUser(userId, prompt);
        setHistory((prev) => [
          ...prev,
          { type: "agent", text: result.response },
        ]);
      } catch (error: any) {
        setHistory((prev) => [
          ...prev,
          { type: "agent", text: `Error: ${error.message || "Unknown error"}` },
        ]);
      } finally {
        setIsPending(false);
      }
    },
    [inputValue, isPending, userId]
  );

  const changePersonality = useCallback(
    async (value: string) => {
      await apiConnector.changePersonalityForUser(userId, value);
      setUser((prev) => ({ ...prev, personality: value }));
    },
    [userId]
  );

  return (
    <CenteredForm title="Chat">
      <div
        className="flex flex-col bg-background"
        style={{ height: "calc(100vh - 240px) !important" }}
      >
        {/* Header */}
        <div className="sticky top-0 w-full bg-card border-b border-border p-4 z-10 shadow-sm">
          <div className="max-w-lg mx-auto">
            <PersonalitySelector
              currentPersonality={user.personality}
              onPersonalityChange={changePersonality}
            />
          </div>
        </div>

        {/* Chat Messages */}
        <main
          ref={chatContainerRef}
          className="flex-grow overflow-y-auto p-6 space-y-4 max-w-[800px] w-full mx-auto h-full"
        >
          {history.map((msg, idx) => (
            <ChatBubble
              key={idx}
              type={msg.type as "user" | "agent"}
              text={msg.text}
            />
          ))}
          {isPending && <PendingBubble />}
          <div className="h-20" />
        </main>

        {/* Input Area */}
        <div className="sticky bottom-0 w-full bg-card border-t border-border p-4 z-20 shadow-sm">
          <form
            onSubmit={handleSubmit}
            className="flex justify-center max-w-lg mx-auto"
          >
            <div className="w-full bg-input border border-border rounded-xl p-2 flex items-end shadow-sm focus-within:ring-2 focus-within:ring-primary transition-all">
              <Textarea
                name="question"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Message Agentic Research App..."
                rows={1}
                onInput={(e) => {
                  e.currentTarget.style.height = "auto";
                  e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                }}
                className="flex-grow resize-none bg-transparent text-foreground placeholder-muted-foreground focus:outline-none overflow-hidden max-h-40 px-2 py-1"
              />
              <Button
                type="submit"
                disabled={isPending || !inputValue.trim()}
                className={`p-3 ml-2 rounded-lg transition-colors shadow-sm ${
                  isPending || !inputValue.trim()
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </CenteredForm>
  );
}

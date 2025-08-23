import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { sendChatMessage } from "@/lib/api";
import ResponseRenderer from "@/components/ResponseRenderer";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const FloatingChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // 🔥 Toggle chat with Option + Space
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.altKey) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  // 🔥 Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage: Message = { role: "user", content: query };
    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setIsLoading(true);

    try {
      const result = await sendChatMessage(query);
      const assistantMessage: Message = {
        role: "assistant",
        content: result.response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error instanceof Error ? error.message : "Something went wrong",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-end justify-center z-50 px-4 py-8">
      <div
        className="relative shadow-2xl border border-white/20 bg-white/10 backdrop-blur-xl
                   transition-all duration-700 ease-[cubic-bezier(0.25,1,0.3,1)]
                   flex flex-col"
        style={{
          width: "700px",
          maxWidth: "90vw",
          height: "70vh",
          borderRadius: "20px",
        }}
      >
        {/* Messages Section */}
        <div
          className="flex-1 overflow-y-auto p-6 space-y-4 
                     scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent
                     hover:scrollbar-thumb-white/30"
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`
                  max-w-[75%] px-4 py-2 rounded-2xl shadow-md backdrop-blur-lg
                  text-base leading-relaxed
                  ${msg.role === "user"
                    ? "bg-white/20 text-foreground rounded-br-sm"
                    : "bg-white/15 text-foreground rounded-bl-sm"}
                `}
              >
                {msg.role === "assistant" ? (
                  <ResponseRenderer response={msg.content} />
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="text-muted-foreground text-sm animate-pulse">
              Assistant is typing...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Section */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-3 p-4 border-t border-white/10 bg-white/5 backdrop-blur-lg"
        >
          <Input
            type="text"
            placeholder="Ask anything..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0
                       text-foreground placeholder:text-muted-foreground text-base px-4 h-10"
            disabled={isLoading}
          />

          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-white/20 rounded-full
                       transition-all duration-300 ease-[cubic-bezier(0.25,1,0.3,1)]
                       hover:scale-110 active:scale-95 shrink-0"
            disabled={isLoading || !query.trim()}
          >
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default FloatingChat;

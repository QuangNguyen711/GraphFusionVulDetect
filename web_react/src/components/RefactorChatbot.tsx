import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, X, Send, Square, Loader2, CheckCircle, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { refactorBotService, ConversationMessage } from "@/services/refactorbot";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useT } from "@/i18n";

interface VulnerableFunction {
  function_name: string;
  prediction: number;
  confidence: string;
  function_code: string;
}

interface RefactorChatbotProps {
  vulnerableFunctions: VulnerableFunction[];
}

const lastSolidityBlock = (messages: ConversationMessage[]) => {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== "assistant") continue;
    const blocks = [...messages[i].content.matchAll(/```(?:solidity|sol)?\s*\n([\s\S]*?)```/g)];
    if (blocks.length) return blocks[blocks.length - 1][1].trim();
  }
  return "";
};

export const RefactorChatbot = ({ vulnerableFunctions }: RefactorChatbotProps) => {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState<VulnerableFunction | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const cacheRef = useRef<Record<string, ConversationMessage[]>>({});
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const vulnerableOnly = vulnerableFunctions.filter(f => f.prediction === 1);
  const suggestedCode = useMemo(() => (isLoading ? "" : lastSolidityBlock(conversationHistory)), [conversationHistory, isLoading]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [conversationHistory, error, isLoading]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // history must end with a user message; streams the reply into a new assistant message
  const requestReply = async (func: VulnerableFunction, history: ConversationMessage[]) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setError("");
    setIsLoading(true);
    setConversationHistory(history);
    let reply = "";
    const show = () => {
      const next = reply ? [...history, { role: "assistant" as const, content: reply }] : history;
      cacheRef.current[func.function_name] = next;
      setConversationHistory(next);
    };
    try {
      await refactorBotService.streamChat(func.function_code, history, (delta) => {
        reply += delta;
        show();
      }, controller.signal);
    } catch (err) {
      if (controller.signal.aborted) {
        show();
      } else {
        console.error("RefactorBot stream failed:", err);
        cacheRef.current[func.function_name] = history;
        setConversationHistory(history);
        setError(err instanceof Error ? err.message : t("Failed to send message"));
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsLoading(false);
      }
    }
  };

  const handleSelectFunction = (functionName: string) => {
    const func = vulnerableOnly.find(f => f.function_name === functionName);
    if (!func) return;
    abortRef.current?.abort();
    setSelectedFunction(func);
    setError("");
    const cached = cacheRef.current[functionName];
    if (cached && cached.length > 1) {
      setIsLoading(false);
      setConversationHistory(cached);
      return;
    }
    requestReply(func, [{
      role: "user",
      content: `The function "${func.function_name}" was flagged as vulnerable. Explain why, then give the fixed function.`
    }]);
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !selectedFunction || isLoading) return;
    const history = [...conversationHistory, { role: "user" as const, content: inputMessage.trim() }];
    setInputMessage("");
    requestReply(selectedFunction, history);
  };

  const handleRetry = () => {
    if (selectedFunction) requestReply(selectedFunction, conversationHistory);
  };

  const handleValidateCode = async () => {
    if (!selectedFunction || !suggestedCode) return;
    try {
      const response = await refactorBotService.validateRefactoring(selectedFunction.function_code, suggestedCode);
      if (response.is_valid) toast.success(response.message);
      else toast.warning(response.message);
    } catch (err) {
      console.error("Error validating code:", err);
      toast.error(err instanceof Error ? err.message : t("Failed to validate code"));
    }
  };

  if (vulnerableOnly.length === 0) {
    return null; // Don't show chatbot if no vulnerable functions
  }

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          variant="secondary"
          className="fixed bottom-6 right-6 z-50 h-12 gap-2 px-5"
          aria-label={t("Open Refactor Assistant")}
        >
          <MessageSquare className="h-4 w-4" />
          {t("Refactor Assistant")}
          <span className="measured rounded-sm bg-bad-soft px-1.5 text-xs text-bad">{vulnerableOnly.length}</span>
        </Button>
      )}

      {isOpen && (
        <section
          aria-label={t("Refactor Assistant")}
          className="land fixed inset-x-3 bottom-3 top-20 z-50 flex flex-col overflow-hidden rounded-lg border border-rule-2 bg-paper-2 sm:inset-x-auto sm:right-6 sm:top-auto sm:h-[min(700px,calc(100dvh-7rem))] sm:w-[min(800px,calc(100%-3rem))]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-base">{t("Refactor Assistant")}</h3>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsOpen(false)} aria-label={t("Close Refactor Assistant")}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="border-b border-rule px-4 py-3">
            <Select
              value={selectedFunction?.function_name || ""}
              onValueChange={handleSelectFunction}
            >
              <SelectTrigger aria-label={t("Vulnerable function")}>
                <SelectValue placeholder={t("Select a vulnerable function to analyze…")} />
              </SelectTrigger>
              <SelectContent>
                {vulnerableOnly.map((func) => (
                  <SelectItem key={func.function_name} value={func.function_name}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-bad" aria-hidden="true" />
                      <span className="code-text text-xs">{func.function_name}</span>
                      <span className="measured ml-auto text-xs text-cool">{func.confidence}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="flex-1 px-4 py-4 [&>[data-radix-scroll-area-viewport]>div]:!block">
            {!selectedFunction ? (
              <div className="flex h-full flex-col items-start justify-center gap-2 py-16 text-sm text-muted-foreground">
                <p className="text-ink-2">{t("Select a vulnerable function to start analysis")}</p>
                <p>{t("{n} flagged in this contract.", { n: vulnerableOnly.length })}</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-xs text-muted-foreground">{t("Analyzing")}</p>
                  <p className="code-text mt-1 break-all text-sm text-ink">{selectedFunction.function_name}</p>
                  <pre className="code-text well mt-2 overflow-x-auto p-3 text-xs text-ink-2">
                    {selectedFunction.function_code.slice(0, 200)}…
                  </pre>
                </div>

                {conversationHistory.slice(1).map((message, idx) => (
                  <div key={idx} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    {message.role === "user" ? (
                      <p className="max-w-[85%] whitespace-pre-wrap rounded-lg bg-paper-3 px-3 py-2 text-sm text-ink">{message.content}</p>
                    ) : (
                      <div className="chat-prose max-w-[92%] border-l border-rule-2 pl-4">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({node, inline, className, children, ...props}: any) {
                              const match = /language-(\w+)/.exec(className || '')
                              return !inline && match ? (
                                <pre>
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                </pre>
                              ) : (
                                <code {...props}>
                                  {children}
                                </code>
                              )
                            }
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                ))}

                {suggestedCode && (
                  <div className="rounded-md bg-ok-soft p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-xs text-ok">{t("Suggested Refactored Code")}</p>
                      <Button size="sm" variant="outline" onClick={handleValidateCode}>
                        <CheckCircle className="h-3 w-3" />
                        {t("Validate")}
                      </Button>
                    </div>
                    <pre className="code-text overflow-x-auto rounded-sm bg-paper p-3 text-xs text-ink-2">
                      {suggestedCode}
                    </pre>
                  </div>
                )}

                {isLoading && conversationHistory[conversationHistory.length - 1]?.role === "user" && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                    <Loader2 className="keep-motion h-4 w-4 animate-spin" aria-hidden="true" />
                    {t("Thinking…")}
                  </p>
                )}

                {error && (
                  <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-bad-soft p-3">
                    <p className="min-w-0 break-words text-sm text-ink-2">
                      <span className="text-bad">{t("RefactorBot could not reply.")}</span> {error}
                    </p>
                    <Button size="sm" variant="outline" onClick={handleRetry}>
                      <RotateCcw className="h-3 w-3" />
                      {t("Try again")}
                    </Button>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </ScrollArea>

          {selectedFunction && (
            <div className="border-t border-rule p-3">
              <div className="flex items-end gap-2">
                <Textarea
                  aria-label={t("Follow-up question")}
                  placeholder={t("Ask follow-up questions…")}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="min-h-[3.75rem] resize-none"
                />
                {isLoading ? (
                  <Button size="icon" variant="outline" onClick={() => abortRef.current?.abort()} aria-label={t("Stop")}>
                    <Square className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button size="icon" onClick={handleSendMessage} disabled={!inputMessage.trim()} aria-label={t("Send")}>
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
};

import { useState } from "react";
import { MessageSquare, X, Send, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { refactorBotService, ConversationMessage, RefactoringSuggestion } from "@/services/refactorbot";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface VulnerableFunction {
  function_name: string;
  prediction: number;
  confidence: string;
  function_code: string;
}

interface RefactorChatbotProps {
  vulnerableFunctions: VulnerableFunction[];
}

export const RefactorChatbot = ({ vulnerableFunctions }: RefactorChatbotProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState<VulnerableFunction | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<RefactoringSuggestion[]>([]);
  const [explanation, setExplanation] = useState("");
  const [suggestedCode, setSuggestedCode] = useState("");
  const [analysisCache, setAnalysisCache] = useState<Record<string, {
    history: ConversationMessage[],
    suggestions: RefactoringSuggestion[],
    explanation: string,
    code: string
  }>>({});

  // Filter only vulnerable functions (prediction === 1)
  const vulnerableOnly = vulnerableFunctions.filter(f => f.prediction === 1);

  const handleSelectFunction = async (functionName: string) => {
    const func = vulnerableOnly.find(f => f.function_name === functionName);
    if (!func) return;

    setSelectedFunction(func);

    // Check cache
    if (analysisCache[functionName]) {
      const cached = analysisCache[functionName];
      setConversationHistory(cached.history);
      setSuggestions(cached.suggestions);
      setExplanation(cached.explanation);
      setSuggestedCode(cached.code);
      return;
    }

    setConversationHistory([]);
    setSuggestions([]);
    setExplanation("");
    setSuggestedCode("");
    setIsLoading(true);

    try {
      // Get initial refactoring advice
      const response = await refactorBotService.getRefactoringAdvice(
        func.function_code,
        `This function "${func.function_name}" has been flagged as vulnerable. Please analyze and suggest refactoring.`
      );

      setSuggestions(response.suggestions);
      setExplanation(response.explanation);
      
      // Extract code from suggestions if available
      let codeSnippet = response.suggestions.find(s => s.code)?.code || "";
      if (codeSnippet) {
        setSuggestedCode(codeSnippet);
      }

      const initialHistory: ConversationMessage[] = [
        {
          role: "assistant",
          content: response.explanation
        }
      ];

      // Add to conversation history
      setConversationHistory(initialHistory);

      // Save to cache
      setAnalysisCache(prev => ({
        ...prev,
        [functionName]: {
          history: initialHistory,
          suggestions: response.suggestions,
          explanation: response.explanation,
          code: codeSnippet
        }
      }));

      toast.success("Analysis complete!");
    } catch (error) {
      console.error("Error getting refactoring advice:", error);
      toast.error(error instanceof Error ? error.message : "Failed to analyze function");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedFunction) return;

    const userMessage: ConversationMessage = {
      role: "user",
      content: inputMessage
    };

    // Add user message to history
    const newHistory = [...conversationHistory, userMessage];
    setConversationHistory(newHistory);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Continue conversation
      const response = await refactorBotService.continueConversation(
        suggestedCode || selectedFunction.function_code,
        newHistory
      );

      // Add assistant response to history
      const assistantMessage: ConversationMessage = {
        role: "assistant",
        content: response.bot_message
      };
      
      const updatedHistory = [...newHistory, assistantMessage];
      setConversationHistory(updatedHistory);

      // Update suggested code if provided
      let newCode = suggestedCode;
      if (response.suggested_code) {
        newCode = response.suggested_code;
        setSuggestedCode(newCode);
      }
      
      // Update Cache
      setAnalysisCache(prev => ({
        ...prev,
        [selectedFunction.function_name]: {
            ...prev[selectedFunction.function_name],
            history: updatedHistory,
            code: newCode
        }
      }));

    } catch (error) {
      console.error("Error continuing conversation:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidateCode = async () => {
    if (!selectedFunction || !suggestedCode) return;

    setIsLoading(true);
    try {
      const response = await refactorBotService.validateRefactoring(
        selectedFunction.function_code,
        suggestedCode
      );

      if (response.is_valid) {
        toast.success(response.message);
      } else {
        toast.warning(response.message);
      }
    } catch (error) {
      console.error("Error validating code:", error);
      toast.error(error instanceof Error ? error.message : "Failed to validate code");
    } finally {
      setIsLoading(false);
    }
  };

  if (vulnerableOnly.length === 0) {
    return null; // Don't show chatbot if no vulnerable functions
  }

  const extraSuggestions = suggestions.filter(s => {
    if (s.content && explanation && s.content.trim() === explanation.trim()) return false;
    if (s.content && explanation && explanation.includes(s.content)) return false;
    if (s.type === 'code_fix') return false;
    return true;
  });

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          variant="secondary"
          className="fixed bottom-6 right-6 z-50 h-12 gap-2 px-5"
          aria-label="Open Refactor Assistant"
        >
          <MessageSquare className="h-4 w-4" />
          Refactor Assistant
          <span className="measured rounded-sm bg-bad-soft px-1.5 text-xs text-bad">{vulnerableOnly.length}</span>
        </Button>
      )}

      {isOpen && (
        <section
          aria-label="Refactor Assistant"
          className="land fixed inset-x-3 bottom-3 top-20 z-50 flex flex-col overflow-hidden rounded-lg border border-rule-2 bg-paper-2 sm:inset-x-auto sm:right-6 sm:top-auto sm:h-[min(700px,calc(100dvh-7rem))] sm:w-[min(800px,calc(100%-3rem))]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-base">Refactor Assistant</h3>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsOpen(false)} aria-label="Close Refactor Assistant">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="border-b border-rule px-4 py-3">
            <Select
              value={selectedFunction?.function_name || ""}
              onValueChange={handleSelectFunction}
              disabled={isLoading}
            >
              <SelectTrigger aria-label="Vulnerable function">
                <SelectValue placeholder="Select a vulnerable function to analyze…" />
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

          <ScrollArea className="flex-1 px-4 py-4">
            {!selectedFunction ? (
              <div className="flex h-full flex-col items-start justify-center gap-2 py-16 text-sm text-muted-foreground">
                <p className="text-ink-2">Select a vulnerable function to start analysis</p>
                <p>{vulnerableOnly.length} flagged in this contract.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-xs text-muted-foreground">Analyzing</p>
                  <p className="code-text mt-1 break-all text-sm text-ink">{selectedFunction.function_name}</p>
                  <pre className="code-text well mt-2 overflow-x-auto p-3 text-xs text-ink-2">
                    {selectedFunction.function_code.slice(0, 200)}…
                  </pre>
                </div>

                {conversationHistory.map((message, idx) => (
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
                      <p className="text-xs text-ok">Suggested Refactored Code</p>
                      <Button size="sm" variant="outline" onClick={handleValidateCode} disabled={isLoading}>
                        <CheckCircle className="h-3 w-3" />
                        Validate
                      </Button>
                    </div>
                    <pre className="code-text overflow-x-auto rounded-sm bg-paper p-3 text-xs text-ink-2">
                      {suggestedCode}
                    </pre>
                  </div>
                )}

                {extraSuggestions.length > 0 && (
                  <ul className="divide-y divide-rule border-y border-rule">
                    {extraSuggestions.map((suggestion, idx) => (
                      <li key={idx} className="py-3">
                        <p className="text-sm text-ink">{suggestion.description}</p>
                        {suggestion.content && (
                          <p className="mt-1 text-xs text-muted-foreground">{suggestion.content.slice(0, 150)}…</p>
                        )}
                        {suggestion.url && (
                          <a
                            href={suggestion.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-xs text-cool underline decoration-rule-2 underline-offset-4 hover:text-signal"
                          >
                            Read the reference
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {isLoading && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                    <Loader2 className="keep-motion h-4 w-4 animate-spin" aria-hidden="true" />
                    Thinking…
                  </p>
                )}
              </div>
            )}
          </ScrollArea>

          {selectedFunction && (
            <div className="border-t border-rule p-3">
              <div className="flex items-end gap-2">
                <Textarea
                  aria-label="Follow-up question"
                  placeholder="Ask follow-up questions…"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="min-h-[3.75rem] resize-none"
                  disabled={isLoading}
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  aria-label="Send"
                  aria-busy={isLoading}
                >
                  {isLoading ? <Loader2 className="keep-motion h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
};

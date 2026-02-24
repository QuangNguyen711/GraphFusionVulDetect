import { useState } from "react";
import { MessageSquare, X, Send, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { refactorBotService, ConversationMessage, RefactoringSuggestion } from "@/services/refactorbot";

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

  // Filter only vulnerable functions (prediction === 1)
  const vulnerableOnly = vulnerableFunctions.filter(f => f.prediction === 1);

  const handleSelectFunction = async (functionName: string) => {
    const func = vulnerableOnly.find(f => f.function_name === functionName);
    if (!func) return;

    setSelectedFunction(func);
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
      const codeSnippet = response.suggestions.find(s => s.code)?.code;
      if (codeSnippet) {
        setSuggestedCode(codeSnippet);
      }

      // Add to conversation history
      setConversationHistory([
        {
          role: "assistant",
          content: response.explanation
        }
      ]);

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
      
      setConversationHistory([...newHistory, assistantMessage]);

      // Update suggested code if provided
      if (response.suggested_code) {
        setSuggestedCode(response.suggested_code);
      }

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

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
          size="icon"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}

      {/* Chatbot Panel */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[450px] h-[600px] shadow-2xl z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <h3 className="font-semibold">Refactor Assistant</h3>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="hover:bg-primary-foreground/20 text-primary-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Function Selector */}
          <div className="p-4 border-b bg-muted/30">
            <Select
              value={selectedFunction?.function_name || ""}
              onValueChange={handleSelectFunction}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a vulnerable function to analyze..." />
              </SelectTrigger>
              <SelectContent>
                {vulnerableOnly.map((func) => (
                  <SelectItem key={func.function_name} value={func.function_name}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                      <span>{func.function_name}</span>
                      <Badge variant="outline" className="text-xs ml-auto">
                        {func.confidence}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-4">
            {!selectedFunction ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm">Select a vulnerable function to start analysis</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Initial Function Display */}
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-semibold mb-2 text-muted-foreground">Analyzing:</p>
                  <p className="text-sm font-medium mb-2">{selectedFunction.function_name}</p>
                  <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                    {selectedFunction.function_code.slice(0, 200)}...
                  </pre>
                </div>

                {/* Conversation Messages */}
                {conversationHistory.map((message, idx) => (
                  <div
                    key={idx}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg p-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}

                {/* Suggested Code */}
                {suggestedCode && (
                  <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-green-800 dark:text-green-200">
                        Suggested Refactored Code:
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleValidateCode}
                        disabled={isLoading}
                        className="h-7 text-xs"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Validate
                      </Button>
                    </div>
                    <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                      {suggestedCode}
                    </pre>
                  </div>
                )}

                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div className="space-y-2">
                    {suggestions.filter(s => s.type !== 'code_fix').map((suggestion, idx) => (
                      <div key={idx} className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1">
                          {suggestion.description}
                        </p>
                        {suggestion.content && (
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            {suggestion.content.slice(0, 150)}...
                          </p>
                        )}
                        {suggestion.url && (
                          <a
                            href={suggestion.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                          >
                            Learn more →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Loading */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          {selectedFunction && (
            <div className="p-4 border-t bg-muted/30">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Ask follow-up questions..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="min-h-[60px] resize-none"
                  disabled={isLoading}
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </>
  );
};

# RefactorBot Chatbot UI Integration

## Overview
A floating chatbot UI has been integrated into the Analysis and ProjectAnalysis pages to provide AI-powered smart contract refactoring assistance.

## Features

### 1. Floating Chat Button
- Located in the bottom-right corner of the screen
- Only appears when vulnerable functions are detected
- Click to open the chatbot panel

### 2. Vulnerable Function Selection
- Dropdown selector showing all detected vulnerable functions
- Each function displays:
  - Function name
  - Vulnerability indicator icon
  - Confidence score badge

### 3. AI-Powered Analysis
- Automatic analysis upon function selection
- Displays:
  - Original vulnerable code snippet
  - Detailed explanation of vulnerabilities
  - Refactoring suggestions
  - Suggested refactored code

### 4. Interactive Conversation
- Ask follow-up questions about the refactoring
- Conversational UI with message bubbles
- Real-time responses from the AI assistant

### 5. Code Validation
- Validate suggested refactored code
- Check for syntax errors and potential issues
- Get confirmation before applying changes

## Components Created

### Frontend Components

#### `web_react/src/components/RefactorChatbot.tsx`
Main chatbot component with:
- Floating button UI
- Chatbot panel with conversation interface
- Function selection dropdown
- Message history display
- Code snippet rendering
- Validation controls

#### `web_react/src/services/refactorbot.ts`
TypeScript API service with methods:
- `getRefactoringAdvice(code, issueDescription)` - Initial analysis
- `continueConversation(code, conversationHistory)` - Follow-up questions
- `validateRefactoring(originalCode, suggestedCode)` - Code validation

### Integration Points

#### `web_react/src/pages/Analysis.tsx`
- Imports `RefactorChatbot` component
- Extracts vulnerable functions from `streamingResults`
- Passes functions to chatbot via props
- Automatically deduplicates functions by name

#### `web_react/src/pages/ProjectAnalysis.tsx`
- Imports `RefactorChatbot` component
- Extracts vulnerable functions from `selectedSession.steps`
- Passes functions to chatbot via props
- Shows chatbot when a session is selected

## Usage Flow

### For Users

1. **Start Analysis**
   - Upload a smart contract for analysis
   - Wait for vulnerability detection to complete

2. **Open Chatbot**
   - Click the floating chat icon in the bottom-right corner
   - The panel opens showing all vulnerable functions

3. **Select Function**
   - Choose a vulnerable function from the dropdown
   - AI automatically analyzes the function
   - View the explanation and suggestions

4. **Ask Questions**
   - Type follow-up questions in the text area
   - Press Enter or click Send
   - Get detailed responses from the AI

5. **Validate Code**
   - Review the suggested refactored code
   - Click the "Validate" button
   - Get confirmation of code correctness

### Example Conversation

```
User: [Selects function "transfer"]

AI: This function "transfer" has been flagged as vulnerable. The main issue is 
the lack of protection against reentrancy attacks. Here are my suggestions:

1. Use the Checks-Effects-Interactions pattern
2. Add a reentrancy guard
3. Update state before making external calls

[Shows suggested refactored code]

User: Can you explain the reentrancy guard pattern in more detail?

AI: Sure! A reentrancy guard is a mutex-like mechanism that prevents a function 
from being called while it's still executing...

User: What's the gas cost impact?

AI: The reentrancy guard adds approximately 2,900 gas for the first call...
```

## Data Flow

```
Analysis Result
    ↓
func_vulnerability_predictions[]
    ↓
RefactorChatbot Component
    ↓
User Selects Function
    ↓
POST /api/v1/refactor/advice
    ↓
ChatbotWorkflow (LangGraph)
    ↓
analyze_code → generate_suggestions
    ↓
Display Results
    ↓
User Asks Question
    ↓
POST /api/v1/refactor/conversation
    ↓
handle_conversation node
    ↓
Display Response
```

## Backend API Endpoints

### POST `/api/v1/refactor/advice`
Get initial refactoring advice for vulnerable code.

**Request:**
```json
{
  "code": "function transfer(...) { ... }",
  "issue_description": "Vulnerable to reentrancy"
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "type": "security",
      "description": "Add reentrancy guard",
      "code": "modifier nonReentrant() { ... }"
    }
  ],
  "explanation": "The main vulnerabilities are..."
}
```

### POST `/api/v1/refactor/conversation`
Continue conversation with follow-up questions.

**Request:**
```json
{
  "code": "function transfer(...) { ... }",
  "conversation_history": [
    { "role": "user", "content": "Explain reentrancy" }
  ]
}
```

**Response:**
```json
{
  "bot_message": "Reentrancy occurs when...",
  "suggested_code": "Updated code if applicable"
}
```

### POST `/api/v1/refactor/validate`
Validate the suggested refactored code.

**Request:**
```json
{
  "original_code": "function transfer(...) { ... }",
  "suggested_code": "function transfer(...) with guards { ... }"
}
```

**Response:**
```json
{
  "is_valid": true,
  "message": "Code is valid and secure"
}
```

## Architecture

### LangGraph Workflow
The chatbot uses a LangGraph state machine with 4 nodes:

1. **analyze_code** - Analyzes code structure and identifies vulnerabilities
2. **generate_suggestions** - Generates AI-powered refactoring suggestions
3. **handle_conversation** - Manages iterative conversation flow
4. **validate_refactoring** - Validates suggested code changes

### State Management
```python
class ChatbotState(TypedDict):
    code: str
    issue_description: str
    conversation_history: List[Dict[str, str]]
    suggested_code: Optional[str]
    analysis_result: Optional[str]
    validation_result: Optional[str]
    next: str
```

## Styling

The chatbot uses:
- **shadcn/ui** components for consistent design
- **Tailwind CSS** for responsive layout
- **Lucide icons** for visual elements
- **Animations** for loading states and transitions

### Theme Support
- Automatically adapts to light/dark mode
- Color coding for different message types
- Syntax highlighting for code snippets

## Error Handling

- Network errors show toast notifications
- Invalid code displays warning messages
- Failed validations provide detailed feedback
- Loading states prevent duplicate requests

## Future Enhancements

Potential improvements:
- [ ] Save conversation history to database
- [ ] Export refactored code to file
- [ ] Compare original vs refactored code side-by-side
- [ ] Apply refactoring directly to smart contract
- [ ] Multi-function batch refactoring
- [ ] Integration with code editor
- [ ] Custom refactoring patterns library
- [ ] Performance metrics before/after refactoring

## Testing

To test the chatbot:

1. Start the backend server:
   ```bash
   cd d:\Projects\PersonalProject\DeepLearning\GraphFusionVulDetect
   python -m uvicorn src.main:app --reload
   ```

2. Start the frontend dev server:
   ```bash
   cd web_react
   npm run dev
   ```

3. Upload a contract with vulnerabilities
4. Wait for analysis to complete
5. Click the floating chat icon
6. Select a vulnerable function
7. Interact with the AI suggestions

## Dependencies

### Frontend
- React 18+
- TypeScript
- shadcn/ui components
- Tailwind CSS
- Lucide icons
- sonner (toast notifications)

### Backend
- FastAPI
- LangGraph
- LangChain
- Google Gemini API
- Pydantic

## Configuration

Make sure your `.env` file contains:
```env
VITE_API_BASE_URL=http://localhost:8000
GEMINI_API_KEY1=your_gemini_api_key_here
```

## Support

For issues or questions:
- Check backend logs for API errors
- Check browser console for frontend errors
- Verify API endpoints are accessible
- Ensure authentication tokens are valid

# RefactorBot API Documentation

API endpoints for AI-powered smart contract refactoring assistance.

## Base URL
```
/api/v1/refactor
```

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### 1. Get Refactoring Advice

Get AI-powered refactoring suggestions for your smart contract code.

**Endpoint:** `POST /api/v1/refactor/advice`

**Request Body:**
```json
{
  "code": "pragma solidity ^0.8.0;\n\ncontract Example {\n    function withdraw() public {\n        msg.sender.call{value: balance}(\"\");\n    }\n}",
  "issue_description": "reentrancy vulnerability"
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "type": "code_fix",
      "description": "Refactored code for reentrancy vulnerability",
      "code": "modifier noReentrancy() {\n    require(!locked, \"Reentrant call\");\n    locked = true;\n    _;\n    locked = false;\n}",
      "content": null,
      "url": null
    },
    {
      "type": "pattern_advice",
      "description": "Design pattern or best practice recommendation",
      "code": null,
      "content": "Implement checks-effects-interactions pattern...",
      "url": null
    },
    {
      "type": "resource_link",
      "description": "External resource",
      "code": null,
      "content": null,
      "url": "https://docs.soliditylang.org/en/latest/security-considerations.html"
    }
  ],
  "explanation": "The current code is vulnerable to reentrancy attacks because...",
  "analysis": {
    "analysis": "Code analysis results...",
    "code_length": 150,
    "has_issue": true
  },
  "validation": {
    "is_valid": true,
    "warnings": [],
    "suggestions": []
  }
}
```

**Status Codes:**
- `200 OK` - Successfully generated refactoring advice
- `401 Unauthorized` - Missing or invalid authentication token
- `422 Unprocessable Entity` - Invalid request body
- `500 Internal Server Error` - Failed to generate advice

---

### 2. Continue Conversation

Engage in iterative conversation to refine code suggestions.

**Endpoint:** `POST /api/v1/refactor/conversation`

**Request Body:**
```json
{
  "code": "pragma solidity ^0.8.0;\n\ncontract Example {\n    // current code\n}",
  "conversation_history": [
    {
      "role": "user",
      "content": "How can I fix the reentrancy issue?"
    },
    {
      "role": "assistant",
      "content": "You can use a reentrancy guard..."
    },
    {
      "role": "user",
      "content": "Can you show me a complete example?"
    }
  ]
}
```

**Response:**
```json
{
  "bot_message": "Here's a complete example with a reentrancy guard implemented...",
  "suggested_code": "pragma solidity ^0.8.0;\n\ncontract SafeExample {\n    bool private locked;\n    \n    modifier noReentrancy() {\n        require(!locked, \"Reentrant call\");\n        locked = true;\n        _;\n        locked = false;\n    }\n    \n    function withdraw() public noReentrancy {\n        // safe withdrawal logic\n    }\n}"
}
```

**Status Codes:**
- `200 OK` - Successfully processed conversation
- `401 Unauthorized` - Missing or invalid authentication token
- `422 Unprocessable Entity` - Invalid request body
- `500 Internal Server Error` - Failed to process conversation

---

### 3. Validate Refactoring

Validate suggested refactored code for syntax and basic security checks.

**Endpoint:** `POST /api/v1/refactor/validate`

**Request Body:**
```json
{
  "original_code": "pragma solidity ^0.8.0;\n\ncontract Original {\n    // original code\n}",
  "suggested_code": "pragma solidity ^0.8.0;\n\ncontract Refactored {\n    // refactored code\n}"
}
```

**Response:**
```json
{
  "is_valid": true,
  "message": "Validation passed successfully."
}
```

Or if validation fails:
```json
{
  "is_valid": false,
  "message": "Syntax validation failed: Unbalanced braces: 3 opening, 2 closing"
}
```

**Status Codes:**
- `200 OK` - Validation completed
- `401 Unauthorized` - Missing or invalid authentication token
- `422 Unprocessable Entity` - Invalid request body
- `500 Internal Server Error` - Validation process failed

---

## Usage Examples

### Python Example

```python
import requests

# Configuration
API_BASE_URL = "http://localhost:8000/api/v1"
TOKEN = "your_jwt_token_here"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# 1. Get refactoring advice
advice_request = {
    "code": """
        pragma solidity ^0.8.0;
        
        contract VulnerableContract {
            mapping(address => uint) public balances;
            
            function withdraw(uint _amount) public {
                require(balances[msg.sender] >= _amount);
                msg.sender.call{value: _amount}("");
                balances[msg.sender] -= _amount;
            }
        }
    """,
    "issue_description": "reentrancy vulnerability"
}

response = requests.post(
    f"{API_BASE_URL}/refactor/advice",
    json=advice_request,
    headers=headers
)

if response.status_code == 200:
    result = response.json()
    print("Suggestions:", result["suggestions"])
    print("Explanation:", result["explanation"])

# 2. Continue conversation
conversation_request = {
    "code": advice_request["code"],
    "conversation_history": [
        {
            "role": "user",
            "content": "Can you show me how to implement OpenZeppelin's ReentrancyGuard?"
        }
    ]
}

response = requests.post(
    f"{API_BASE_URL}/refactor/conversation",
    json=conversation_request,
    headers=headers
)

if response.status_code == 200:
    result = response.json()
    print("Bot:", result["bot_message"])
    if result["suggested_code"]:
        print("Suggested Code:", result["suggested_code"])

# 3. Validate refactored code
validation_request = {
    "original_code": advice_request["code"],
    "suggested_code": """
        pragma solidity ^0.8.0;
        
        contract SafeContract {
            mapping(address => uint) public balances;
            bool private locked;
            
            modifier noReentrancy() {
                require(!locked, "No reentrancy");
                locked = true;
                _;
                locked = false;
            }
            
            function withdraw(uint _amount) public noReentrancy {
                require(balances[msg.sender] >= _amount);
                balances[msg.sender] -= _amount;
                (bool success, ) = msg.sender.call{value: _amount}("");
                require(success);
            }
        }
    """
}

response = requests.post(
    f"{API_BASE_URL}/refactor/validate",
    json=validation_request,
    headers=headers
)

if response.status_code == 200:
    result = response.json()
    print(f"Valid: {result['is_valid']}")
    print(f"Message: {result['message']}")
```

### JavaScript/TypeScript Example

```typescript
const API_BASE_URL = "http://localhost:8000/api/v1";
const TOKEN = "your_jwt_token_here";

const headers = {
  "Authorization": `Bearer ${TOKEN}`,
  "Content-Type": "application/json"
};

// 1. Get refactoring advice
async function getRefactoringAdvice() {
  const response = await fetch(`${API_BASE_URL}/refactor/advice`, {
    method: "POST",
    headers: headers,
    body: JSON.stringify({
      code: `
        pragma solidity ^0.8.0;
        
        contract VulnerableContract {
          function withdraw() public {
            msg.sender.call{value: balance}("");
          }
        }
      `,
      issue_description: "reentrancy vulnerability"
    })
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log("Suggestions:", data.suggestions);
    console.log("Explanation:", data.explanation);
  }
}

// 2. Continue conversation
async function continueConversation(code: string, history: any[]) {
  const response = await fetch(`${API_BASE_URL}/refactor/conversation`, {
    method: "POST",
    headers: headers,
    body: JSON.stringify({
      code: code,
      conversation_history: history
    })
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log("Bot:", data.bot_message);
    if (data.suggested_code) {
      console.log("Code:", data.suggested_code);
    }
  }
}

// 3. Validate refactoring
async function validateRefactoring(original: string, suggested: string) {
  const response = await fetch(`${API_BASE_URL}/refactor/validate`, {
    method: "POST",
    headers: headers,
    body: JSON.stringify({
      original_code: original,
      suggested_code: suggested
    })
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log(`Valid: ${data.is_valid}`);
    console.log(`Message: ${data.message}`);
  }
}
```

### cURL Examples

```bash
# 1. Get refactoring advice
curl -X POST "http://localhost:8000/api/v1/refactor/advice" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "pragma solidity ^0.8.0;\n\ncontract Example {\n  function withdraw() public {\n    msg.sender.call{value: balance}(\"\");\n  }\n}",
    "issue_description": "reentrancy vulnerability"
  }'

# 2. Continue conversation
curl -X POST "http://localhost:8000/api/v1/refactor/conversation" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "pragma solidity ^0.8.0;\n\ncontract Example { }",
    "conversation_history": [
      {
        "role": "user",
        "content": "How can I improve this code?"
      }
    ]
  }'

# 3. Validate refactoring
curl -X POST "http://localhost:8000/api/v1/refactor/validate" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "original_code": "pragma solidity ^0.8.0;\n\ncontract Original { }",
    "suggested_code": "pragma solidity ^0.8.0;\n\ncontract Refactored { }"
  }'
```

## Error Handling

All endpoints follow the same error response format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

Common error scenarios:
- **401 Unauthorized**: Token is missing or invalid - re-authenticate
- **422 Unprocessable Entity**: Request body validation failed - check required fields
- **500 Internal Server Error**: Server-side error - check logs or try again

## Rate Limiting

Consider implementing rate limiting for production use to prevent abuse of the LLM-powered endpoints.

## Best Practices

1. **Batch Requests**: For multiple files, consider batching requests or implementing async processing
2. **Conversation Context**: Keep conversation history concise - only include relevant messages
3. **Code Validation**: Always validate suggestions before applying them to production code
4. **Error Handling**: Implement proper retry logic with exponential backoff for 500 errors
5. **Token Management**: Refresh tokens before they expire to maintain uninterrupted service

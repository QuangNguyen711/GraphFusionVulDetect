# RefactorBot API - Quick Start Guide

## Tổng quan

Đã tạo thành công API Router cho RefactorBot Service với 3 endpoints chính để hỗ trợ AI-powered smart contract refactoring.

## Các file đã tạo/cập nhật

### 1. Router API
- **File**: [src/api/v1/refactorbot_router.py](src/api/v1/refactorbot_router.py)
- **Chức năng**: Định nghĩa 3 API endpoints
- **Prefix**: `/api/v1/refactor`
- **Tags**: `refactorbot`

### 2. Main Router
- **File**: [src/api/router.py](src/api/router.py)
- **Cập nhật**: Thêm refactorbot_router vào API router chính

### 3. Model Loader
- **File**: [src/services/model_loader.py](src/services/model_loader.py)
- **Cập nhật**: Initialize chatbot workflow khi app startup

### 4. Workflow Fix
- **File**: [src/workflows/chatbot_workflow/workflow.py](src/workflows/chatbot_workflow/workflow.py)
- **Fix**: Sửa lỗi tên biến GEMINI_API_KEY1

### 5. Documentation
- **File**: [src/api/v1/REFACTORBOT_API.md](src/api/v1/REFACTORBOT_API.md)
- **Nội dung**: Full API documentation với examples

## API Endpoints

### 1. POST /api/v1/refactor/advice
**Mục đích**: Nhận gợi ý refactoring từ AI

**Request**:
```json
{
  "code": "pragma solidity ^0.8.0;\n\ncontract Example {...}",
  "issue_description": "reentrancy vulnerability"
}
```

**Response**:
```json
{
  "suggestions": [...],
  "explanation": "...",
  "analysis": {...},
  "validation": {...}
}
```

### 2. POST /api/v1/refactor/conversation
**Mục đích**: Chat với AI để refine code

**Request**:
```json
{
  "code": "pragma solidity ^0.8.0;...",
  "conversation_history": [
    {"role": "user", "content": "How to fix this?"},
    {"role": "assistant", "content": "You can..."}
  ]
}
```

**Response**:
```json
{
  "bot_message": "Here's how...",
  "suggested_code": "pragma solidity ^0.8.0;..."
}
```

### 3. POST /api/v1/refactor/validate
**Mục đích**: Validate code đã refactor

**Request**:
```json
{
  "original_code": "pragma solidity ^0.8.0;...",
  "suggested_code": "pragma solidity ^0.8.0;..."
}
```

**Response**:
```json
{
  "is_valid": true,
  "message": "Validation passed successfully."
}
```

## Authentication

Tất cả endpoints yêu cầu JWT token:
```
Authorization: Bearer <your_jwt_token>
```

## Test nhanh

### 1. Start server
```bash
# Activate virtual environment
.venv\Scripts\activate

# Run server
uvicorn src.api.app:app --reload --host 0.0.0.0 --port 8000
```

### 2. Test với cURL

```bash
# Đăng nhập để lấy token
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "your_username", "password": "your_password"}'

# Lưu token vào biến
TOKEN="your_jwt_token_here"

# Test refactoring advice
curl -X POST "http://localhost:8000/api/v1/refactor/advice" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "pragma solidity ^0.8.0;\n\ncontract Example {\n  function withdraw() public {\n    msg.sender.call{value: balance}(\"\");\n  }\n}",
    "issue_description": "reentrancy vulnerability"
  }'
```

### 3. Test với Python

```python
import requests

# Login
login_response = requests.post(
    "http://localhost:8000/api/v1/auth/login",
    json={"username": "your_username", "password": "your_password"}
)
token = login_response.json()["access_token"]

# Get refactoring advice
headers = {"Authorization": f"Bearer {token}"}
response = requests.post(
    "http://localhost:8000/api/v1/refactor/advice",
    json={
        "code": """
            pragma solidity ^0.8.0;
            
            contract VulnerableContract {
                function withdraw() public {
                    msg.sender.call{value: balance}("");
                }
            }
        """,
        "issue_description": "reentrancy vulnerability"
    },
    headers=headers
)

print(response.json())
```

## Swagger UI

Truy cập API documentation tại:
```
http://localhost:8000/docs
```

Tìm section "refactorbot" để test trực tiếp trên UI.

## Configuration

Cần các settings sau trong `.env`:

```env
# Primary API key
GEMINI_API_KEY1=your_api_key_here

# Optional: Additional keys for load balancing
GEMINI_API_KEY2=another_key
GEMINI_API_KEY3=yet_another_key

# LLM Configuration
BASE_URL=https://api.openai.com/v1
MODEL_NAME=gpt-4

# Optional: Chatbot specific settings
CHATBOT_TEMPERATURE=0.7
CHATBOT_MAX_TOKENS=4096
CHATBOT_TOP_P=1.0
```

## Workflow Integration

RefactorBot service tự động được initialize khi server start:

1. `app.py` → `startup_event()`
2. `load_all_models()` → Initialize cả gfd_workflow và chatbot_workflow
3. Chatbot workflow load LLM client pool từ config
4. Ready to handle requests!

## Response Models

### RefactoringSuggestion
```python
{
    "type": str,           # code_fix, pattern_advice, resource_link
    "description": str,    # Mô tả suggestion
    "code": str | None,    # Code snippet nếu có
    "content": str | None, # Additional content
    "url": str | None      # Link tài liệu nếu có
}
```

### ConversationMessage
```python
{
    "role": str,     # "user" hoặc "assistant"
    "content": str   # Nội dung message
}
```

## Error Handling

- **401 Unauthorized**: Token invalid → Đăng nhập lại
- **422 Unprocessable Entity**: Request body sai → Check required fields
- **500 Internal Server Error**: LLM error → Check logs, retry

## Monitoring

Check logs để theo dõi:
```bash
# Server logs sẽ hiển thị:
# - Refactoring advice requests
# - Conversation interactions
# - Validation requests
# - LLM client pool status
```

## Next Steps

1. **Test**: Test các endpoints với different scenarios
2. **Frontend Integration**: Tích hợp vào React frontend
3. **Rate Limiting**: Thêm rate limiting cho production
4. **Caching**: Cache frequent requests
5. **Monitoring**: Setup monitoring/alerting

## Troubleshooting

### LLM client không khởi tạo được
- Check `GEMINI_API_KEY1` trong `.env`
- Verify API key valid
- Check network connectivity

### Workflow errors
- Check logs trong console
- Verify all dependencies installed
- Check LangGraph version compatibility

### 401 Unauthorized
- Token expired → Đăng nhập lại
- Token format wrong → Check "Bearer " prefix

## Support

Xem chi tiết documentation tại:
- [REFACTORBOT_API.md](src/api/v1/REFACTORBOT_API.md) - Full API docs
- [chatbot_workflow/README.md](src/workflows/chatbot_workflow/README.md) - Workflow architecture

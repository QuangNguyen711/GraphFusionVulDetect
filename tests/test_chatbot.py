import asyncio
from types import SimpleNamespace

from src.infrastructure.chat_model.llm_client import LLMClient
from src.services.refactorbot_service import RefactorBotService
from src.workflows.chatbot_workflow.nodes.handle_conversation import handle_conversation
from src.workflows.chatbot_workflow.utils.helper import build_chat_messages

HISTORY = [
    {"role": "user", "content": "call this fix PLAN-B"},
    {"role": "bot", "content": "ok"},
    {"role": "user", "content": "what is the name?"},
]


class FakeLLM:
    def __init__(self, fail=False):
        self.calls, self.fail = [], fail

    def invoke(self, messages):
        self.calls.append(messages)
        if self.fail:
            raise RuntimeError("429 rate limited")
        return SimpleNamespace(content="answer")

    async def astream(self, messages):
        self.calls.append(messages)
        for part in ("Hel", "", "lo"):
            yield SimpleNamespace(content=part)
        if self.fail:
            raise RuntimeError("boom")


class FakePool:
    def __init__(self, llm):
        self.clients = [llm]

    def get_instance(self):
        return self.clients[0]

    def remove_instance(self, llm):
        self.clients.remove(llm)


def test_default_client_has_no_stop_tokens():
    client = LLMClient(api_keys=["k"], base_url="http://x", model="m")
    assert not client.clients[0].stop


def test_messages_carry_code_language_and_whole_history():
    messages = build_chat_messages("function f() {}", HISTORY, "vi")
    assert messages[0]["role"] == "system"
    assert "function f() {}" in messages[0]["content"] and "Vietnamese" in messages[0]["content"]
    assert [m["role"] for m in messages[1:]] == ["user", "assistant", "user"]
    assert messages[1]["content"] == "call this fix PLAN-B"


def test_conversation_node_sends_the_whole_history():
    llm = FakeLLM()
    state = {"code": "function f() {}", "language": "en", "conversation_history": list(HISTORY)}
    out = handle_conversation(state, {"configurable": {"llm_client": FakePool(llm)}})
    assert any("PLAN-B" in m["content"] for m in llm.calls[0])
    assert out["bot_message"] == "answer"


def test_a_failed_call_keeps_the_client_in_the_pool():
    pool = FakePool(FakeLLM(fail=True))
    state = {"code": "function f() {}", "language": "en", "conversation_history": list(HISTORY)}
    handle_conversation(state, {"configurable": {"llm_client": pool}})
    assert len(pool.clients) == 1


def collect(service, **kw):
    async def run():
        return [event async for event in service.stream_chat(**kw)]
    return asyncio.run(run())


def test_stream_chat_yields_deltas_then_done():
    service = RefactorBotService()
    service.workflow = SimpleNamespace(llm_client=FakePool(FakeLLM()))
    events = collect(service, code="function f() {}", conversation_history=HISTORY, language="en")
    assert events == [{"delta": "Hel"}, {"delta": "lo"}, {"done": True}]


def test_stream_chat_reports_an_error_event():
    service = RefactorBotService()
    service.workflow = SimpleNamespace(llm_client=FakePool(FakeLLM(fail=True)))
    events = collect(service, code="function f() {}", conversation_history=HISTORY, language="en")
    assert events[-1] == {"error": "boom"} and {"done": True} not in events

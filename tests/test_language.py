from types import SimpleNamespace

from src.utils.language import language_instruction, normalize_language
from src.workflows.gfd_workflow.nodes.func_vul_explainer import explain_vulnerability_func
from src.workflows.chatbot_workflow.nodes.handle_conversation import handle_conversation


class FakeLLM:
    def __init__(self):
        self.prompts = []

    def invoke(self, prompt):
        self.prompts.append(prompt)
        return SimpleNamespace(content="ok")


def test_normalize_language_falls_back_to_english():
    assert normalize_language("vi") == "vi"
    assert normalize_language("fr") == "en"
    assert normalize_language(None) == "en"


def test_instruction_names_the_language():
    assert "Vietnamese" in language_instruction("vi")
    assert "English" in language_instruction("en")


def test_explainer_prompt_follows_language():
    llm = FakeLLM()
    state = {
        "language": "vi",
        "func_vulnerability_predictions": [
            {"function_name": "withdraw", "function_code": "function withdraw() {}", "prediction": 1},
            {"function_name": "deposit", "function_code": "function deposit() {}", "prediction": 0},
        ],
    }
    out = explain_vulnerability_func(state, {"configurable": {"llm": llm}})
    assert len(llm.prompts) == 1
    assert "Vietnamese" in llm.prompts[0]
    assert out["func_vulnerability_explanations"][0]["function_name"] == "withdraw"


def test_conversation_prompt_follows_language():
    llm = FakeLLM()
    client = SimpleNamespace(get_instance=lambda: llm)
    state = {"code": "contract A {}", "language": "vi", "conversation_history": [{"role": "user", "content": "fix it"}]}
    handle_conversation(state, {"configurable": {"llm_client": client}})
    assert llm.prompts and "Vietnamese" in llm.prompts[0][0]["content"]

LANGUAGES = {"en": "English", "vi": "Vietnamese"}


def normalize_language(value) -> str:
    return value if value in LANGUAGES else "en"


def language_instruction(value) -> str:
    """Line appended to every LLM prompt so the answer follows the user's language setting."""
    if normalize_language(value) == "vi":
        return (
            "\n\nWrite the whole answer in Vietnamese (tiếng Việt). "
            "Keep code, identifiers, function names and Solidity keywords exactly as they are."
        )
    return "\n\nWrite the whole answer in English."

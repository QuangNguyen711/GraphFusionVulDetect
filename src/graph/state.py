from typing import Annotated, TypedDict, Optional, List, Any

# State TypedDict including new fields for the subquery workflow
class State(TypedDict):
    sol_file_path: str
    fcg_save_dir: str
    fcg_file_path: Optional[str]
    predicted_class: Optional[str]
    confidence_score: Optional[float]
    func_vulnerability_predictions: Optional[List[dict]]
    func_vulnerability_explanations: Optional[List[dict]]
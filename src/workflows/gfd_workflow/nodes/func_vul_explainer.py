# File: src/nodes/func_vul_explainer.py

import json
import os

import dgl
import torch
import torch.nn.functional as F
from langchain_core.runnables import RunnableConfig
import logging
from src.workflows.gfd_workflow.graph.state import State


def explain_vulnerability_func(state: State, config: RunnableConfig) -> State:
    llm = config["configurable"]["llm"]
    func_vulnerability_predictions = state.get("func_vulnerability_predictions", [])
    
    if not llm or not func_vulnerability_predictions:
        state["func_vulnerability_explanations"] = []
        return state

    explanations = []
    for func_info in func_vulnerability_predictions:
        if func_info["prediction"] != 1:
            continue  # Only explain functions predicted as vulnerable
        func_name = func_info["function_name"]
        func_code = func_info["function_code"]
        prompt = (
            "You are a world-class smart contract security auditor. "
            f"The following Solidity function has been flagged by a machine learning model as potentially vulnerable to a **Timestamp Dependency** attack. "
            "Please analyze the code and provide a concise, expert explanation.\n\n"
            f"Function Name: `{func_name}`\n"
            f"```solidity\n{func_code}\n```\n\n"
            "Your analysis should be short and only include these headings:\n"
            "1.  **Vulnerability Explaination:** Explain why this function have vulnerability.\n"
            "2.  **Impact:** Describe the potential consequences if this vulnerability is exploited (e.g., unfair advantage, locked funds).\n"
        )
        try:
            response = llm.invoke(prompt)
            answer = response.content.strip()
            if "</think>" in answer:
                answer = answer.split("</think>")[1].strip()
            explanations.append({"function_name": func_name, "explanation": answer})
        except Exception as e:
            explanations.append({"function_name": func_name, "explanation": f"Error generating explanation: {e}"})

    state["func_vulnerability_explanations"] = explanations
    return state
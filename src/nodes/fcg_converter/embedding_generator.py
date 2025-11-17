import torch
import re

def clean_function(function_list):
    """Clean function names by removing address prefix and replacing underscores."""
    cleaned_functions = [re.sub(r"0x[0-9a-z]+\.sol_\d+_", "", func).replace("_", ".") for func in function_list]
    return cleaned_functions

def get_embeddings(tokenizer, model, text):
    # Tokenize the input text
    inputs = tokenizer(text, return_tensors='pt', truncation=True, padding=True)

    # Get the model output
    with torch.no_grad():
        outputs = model(**inputs)

    # Get the embeddings (we use the embeddings of the [CLS] token)
    embeddings = outputs.last_hidden_state[:, 0, :].squeeze().cpu().numpy()

    return embeddings

def extract_function_code(source_file, start, length):
    with open(source_file, 'r') as f:
        source_code = f.read()

    # Extract the function's code
    function_code = source_code[start:start + length]

    return function_code
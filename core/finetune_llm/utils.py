from __future__ import absolute_import, division, print_function
import random
import shutil
import numpy as np
import torch

def set_seed(args):
    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)
    if args.n_gpu > 0:
        torch.cuda.manual_seed_all(args.seed)

def push_to_huggingface(model, tokenizer, args, repo_name="my-codebert-model", token=None):
    from transformers import AutoModel
    import os

    # Use provided token or fall back to environment variable
    hf_token = token or os.environ.get("HF_TOKEN")
    if not hf_token:
        raise ValueError("No token provided and HF_TOKEN environment variable not set")
        
    # Create a temporary directory
    temp_dir = "./temp_hf_model"
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
    
    # Save the encoder (RobertaModel) portion
    model.encoder.save_pretrained(temp_dir)
    tokenizer.save_pretrained(temp_dir)
    
    # Login to Hugging Face (you'll need to have huggingface-cli installed and be logged in)
    try:
        from huggingface_hub import HfApi
        api = HfApi()
        
        # Create repository if it doesn't exist
        api.create_repo(repo_id=repo_name, exist_ok=True, token=hf_token)
        
        # Upload the model
        api.upload_folder(
            folder_path=temp_dir,
            repo_id=repo_name,
            repo_type="model",
            commit_message="Upload CodeBERT encoder model",
            token=hf_token
        )
        print(f"Successfully pushed model to https://huggingface.co/{repo_name}")
        
    except Exception as e:
        print(f"Error pushing to Hugging Face: {str(e)}")
        print("Make sure you have huggingface_hub installed and are logged in via `huggingface-cli login`")
    
    # Clean up temporary directory
    shutil.rmtree(temp_dir)

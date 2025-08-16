from __future__ import absolute_import, division, print_function
import os
from core.finetune_llm.components.bertmodel import CodeBERTModel
from core.finetune_llm.dataset import CodeDataset
from core.finetune_llm.phase import train
from core.finetune_llm.phase.eval import evaluate
from core.finetune_llm.utils import push_to_huggingface, set_seed
import torch
from transformers import (RobertaConfig, RobertaModel, RobertaTokenizer)

class RuntimeContext(object):
    """ runtime environment """

    def __init__(self):
        """ initialization """
        # Set default configuration
        self.dataset_name = "Quangnguyen711/Qualified_Syntax_Reentrancy_Dataset" # "Quangnguyen711/Qualified_Syntax_TimestampDependency_Dataset"
        self.output_dir = "./codebert-output"
        self.model_name_or_path = "microsoft/codebert-base"  # Use CodeBERT model
        self.config_name = "microsoft/codebert-base"
        self.tokenizer_name = "microsoft/codebert-base"
        self.max_seq_length = 512  # CodeBERT standard sequence length
        self.train_batch_size = 16
        self.eval_batch_size = 32
        self.gradient_accumulation_steps = 1
        self.learning_rate = 5e-5
        self.weight_decay = 0.0
        self.adam_epsilon = 1e-8
        self.max_grad_norm = 1.0
        self.max_steps = -1
        self.warmup_steps = 0
        self.seed = 42
        self.epochs = 10
        self.n_gpu = torch.cuda.device_count()
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.save_steps = 1000

class PipelineFinetuning:

    @staticmethod
    def runtime(mode, dataset_name="Quangnguyen711/Qualified_Syntax_Reentrancy_Dataset"):
        if mode == "train":
            PipelineFinetuning.runtime_training(dataset_name)
        elif mode == "eval":
            PipelineFinetuning.runtime_evaluation(dataset_name)

    @staticmethod
    def runtime_training(dataset_name="Quangnguyen711/Qualified_Syntax_Reentrancy_Dataset"):
        args = RuntimeContext()
        args.dataset_name = dataset_name
        print("device: %s, n_gpu: %s" %(args.device, args.n_gpu))

        # Set seed
        set_seed(args)

        # Load model components - Use CodeBERT instead of GraphCodeBERT
        config = RobertaConfig.from_pretrained(
            args.config_name if args.config_name else args.model_name_or_path)
        config.num_labels = 2  # Binary classification
        tokenizer = RobertaTokenizer.from_pretrained(args.tokenizer_name)

        # Load CodeBERT base model
        encoder = RobertaModel.from_pretrained(args.model_name_or_path, config=config)
        model = CodeBERTModel(encoder, config, tokenizer, args)

        # Create output directory if it doesn't exist
        if not os.path.exists(args.output_dir):
            os.makedirs(args.output_dir)

        # Load and prepare training dataset
        train_dataset = CodeDataset(tokenizer, args, split='train')
        print(f"Loaded {len(train_dataset)} training examples")

        # Train the model
        train(args, train_dataset, model, tokenizer)


    @staticmethod
    def runtime_evaluation(dataset_name):
        args = RuntimeContext()
        args.dataset_name = dataset_name
        print("device: %s, n_gpu: %s" %(args.device, args.n_gpu))
        # Set seed
        set_seed(args)

        # Load model components - Use CodeBERT instead of GraphCodeBERT
        config = RobertaConfig.from_pretrained(
            args.config_name if args.config_name else args.model_name_or_path)
        config.num_labels = 2  # Binary classification
        tokenizer = RobertaTokenizer.from_pretrained(args.tokenizer_name)

        # Load CodeBERT base model
        encoder = RobertaModel.from_pretrained(args.model_name_or_path, config=config)
        model = CodeBERTModel(encoder, config, tokenizer, args)

        # Load best model for testing
        checkpoint_prefix = 'checkpoint-best-loss/model.bin'
        output_dir = os.path.join(args.output_dir, '{}'.format(checkpoint_prefix))
        model.load_state_dict(torch.load(output_dir))
        model.to(args.device)

        # Test the model
        evaluate(args, model, tokenizer)

        push_to_huggingface(model, tokenizer, args, repo_name="Quangnguyen711/codebert-syntax-solidity-re-entrancy", 
                       token="<TOKEN>")
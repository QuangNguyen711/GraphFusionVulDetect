from __future__ import absolute_import, division, print_function
import random
import torch
from torch.utils.data import Dataset
from datasets import load_dataset
from tqdm import tqdm, trange
import torch

class InputFeatures(object):
    """A single training/test features for a example."""

    def __init__(self,
                 input_ids,
                 attention_mask,
                 label,
                 idx
                 ):
        self.input_ids = input_ids
        self.attention_mask = attention_mask
        self.label = label
        self.idx = idx

def convert_examples_to_features(item):
    # Simplified conversion - no graph processing
    idx, code, label, tokenizer, args, cache = item
    
    if idx not in cache:
        tokens = tokenizer.tokenize(code)
        tokens = tokens[:args.max_seq_length - 2]  # -2 for [CLS] and [SEP]
        tokens = [tokenizer.cls_token] + tokens + [tokenizer.sep_token]
        
        input_ids = tokenizer.convert_tokens_to_ids(tokens)
        attention_mask = [1] * len(input_ids)
        
        # Padding
        padding_length = args.max_seq_length - len(input_ids)
        input_ids += [tokenizer.pad_token_id] * padding_length
        attention_mask += [0] * padding_length
        
        assert len(input_ids) == args.max_seq_length
        assert len(attention_mask) == args.max_seq_length
        
        cache[idx] = (input_ids, attention_mask)
    
    input_ids, attention_mask = cache[idx]
    return InputFeatures(input_ids, attention_mask, label, idx)

class CodeDataset(Dataset):
    def __init__(self, tokenizer, args, split='train'):
        self.examples = []
        self.args = args
        
        # Load dataset from Hugging Face
        print(f"Loading {split} split from dataset {args.dataset_name}")
        dataset = load_dataset(args.dataset_name, split=split)
        
        # Process the dataset
        data = []
        cache = {}
        
        for i, example in enumerate(dataset):
            code = example['function']
            label = int(example['label'])
            data.append((i, code, label, tokenizer, args, cache))
        
        # Only use a subset of validation data if needed
        if split == 'validation' and len(data) > 1000:
            data = random.sample(data, int(len(data)*0.1))
        
        # Convert examples to features
        self.examples = [convert_examples_to_features(x) for x in tqdm(data, total=len(data))]

    def __len__(self):
        return len(self.examples)

    def __getitem__(self, item):
        return (torch.tensor(self.examples[item].input_ids),
                torch.tensor(self.examples[item].attention_mask),
                torch.tensor(self.examples[item].label))
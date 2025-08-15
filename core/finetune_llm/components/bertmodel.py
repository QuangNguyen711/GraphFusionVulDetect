from __future__ import absolute_import, division, print_function
from core.finetune_llm.components.classify_head import CodeBERTClassificationHead
import torch.nn as nn
import torch.nn.functional as F
from torch.nn import CrossEntropyLoss

class CodeBERTModel(nn.Module):   
    def __init__(self, encoder, config, tokenizer, args):
        super(CodeBERTModel, self).__init__()
        self.encoder = encoder
        self.config = config
        self.tokenizer = tokenizer
        self.classifier = CodeBERTClassificationHead(config)
        self.args = args
    
    def forward(self, input_ids, attention_mask=None, labels=None): 
        # CodeBERT uses standard input format, not the graph format
        outputs = self.encoder(input_ids=input_ids, attention_mask=attention_mask)
        sequence_output = outputs[0]
        logits = self.classifier(sequence_output)
        prob = F.softmax(logits, dim=1)
        
        if labels is not None:
            loss_fct = CrossEntropyLoss()
            loss = loss_fct(logits, labels)
            return loss, prob
        else:
            return prob
from __future__ import absolute_import, division, print_function
from core.finetune_llm.dataset import CodeDataset
import numpy as np
from torch.utils.data import DataLoader, SequentialSampler
import torch

def evaluate(args, model, tokenizer, eval_when_training=False):
    # Build dataloader for validation data
    eval_dataset = CodeDataset(tokenizer, args, split='test')
    eval_sampler = SequentialSampler(eval_dataset)
    eval_dataloader = DataLoader(
        eval_dataset, sampler=eval_sampler, batch_size=args.eval_batch_size, num_workers=4)

    # Multi-GPU evaluate
    if args.n_gpu > 1 and eval_when_training is False:
        model = torch.nn.DataParallel(model)

    # Eval!
    print("***** Running evaluation *****")
    print("  Num examples = %d" % len(eval_dataset))
    print("  Batch size = %d" % args.eval_batch_size)

    eval_loss = 0.0
    nb_eval_steps = 0
    model.eval()
    logits = []
    y_trues = []
    best_loss = float('inf')  # Initialize best loss as infinity
    
    for batch in eval_dataloader:
        (input_ids, attention_mask, labels) = [x.to(args.device) for x in batch]
        with torch.no_grad():
            lm_loss, logit = model(input_ids, attention_mask, labels)
            eval_loss += lm_loss.mean().item()
            logits.append(logit.cpu().numpy())
            y_trues.append(labels.cpu().numpy())
        nb_eval_steps += 1

    # Calculate average loss
    avg_eval_loss = eval_loss / nb_eval_steps
    
    # Calculate scores
    logits = np.concatenate(logits, 0)
    y_trues = np.concatenate(y_trues, 0)
    best_threshold = 0.5
    # best_f1 = 0

    y_preds = logits[:, 1] > best_threshold
    from sklearn.metrics import recall_score
    recall = recall_score(y_trues, y_preds, average='macro')
    from sklearn.metrics import precision_score
    precision = precision_score(y_trues, y_preds, average='macro')
    from sklearn.metrics import f1_score
    f1 = f1_score(y_trues, y_preds, average='macro')
    result = {
        "eval_recall": float(recall),
        "eval_precision": float(precision),
        "eval_f1": float(f1),
        "eval_loss": float(avg_eval_loss),
        "eval_threshold": best_threshold,
    }

    print("***** Eval results *****")
    for key in sorted(result.keys()):
        print("  %s = %s" %(key, str(round(result[key], 4))))

    return result
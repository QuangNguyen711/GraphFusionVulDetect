from __future__ import absolute_import, division, print_function
import os
from core.finetune_llm.phase.eval import evaluate
import numpy as np
import torch
from torch.utils.data import DataLoader, RandomSampler
from transformers import (WEIGHTS_NAME, AdamW, get_linear_schedule_with_warmup)
from tqdm import tqdm, trange

def train(args, train_dataset, model, tokenizer):
    """ Train the model """

    # Build dataloader
    print(f"Training with {len(train_dataset)} examples")
    train_sampler = RandomSampler(train_dataset)
    train_dataloader = DataLoader(
        train_dataset, sampler=train_sampler, batch_size=args.train_batch_size, num_workers=4)

    args.max_steps = args.epochs*len(train_dataloader)
    args.save_steps = len(train_dataloader)//10
    args.warmup_steps = args.max_steps//5
    model.to(args.device)

    # Prepare optimizer and schedule (linear warmup and decay)
    no_decay = ['bias', 'LayerNorm.weight']
    optimizer_grouped_parameters = [
        {'params': [p for n, p in model.named_parameters() if not any(nd in n for nd in no_decay)],
         'weight_decay': args.weight_decay},
        {'params': [p for n, p in model.named_parameters() if any(
            nd in n for nd in no_decay)], 'weight_decay': 0.0}
    ]
    optimizer = AdamW(optimizer_grouped_parameters,
                      lr=args.learning_rate, eps=args.adam_epsilon)
    scheduler = get_linear_schedule_with_warmup(optimizer, num_warmup_steps=args.warmup_steps,
                                                num_training_steps=args.max_steps)

    # Multi-GPU training
    if args.n_gpu > 1:
        model = torch.nn.DataParallel(model)

    # Train!
    print("***** Running training *****")
    print("  Num examples = %d" % len(train_dataset))
    print("  Num Epochs = %d" % args.epochs)
    print("  Total train batch size = %d" %
                args.train_batch_size*args.gradient_accumulation_steps)
    print("  Gradient Accumulation steps = %d" %
                args.gradient_accumulation_steps)
    print("  Total optimization steps = %d" % args.max_steps)

    global_step = 0
    tr_loss, logging_loss, avg_loss, tr_nb, tr_num, train_loss = 0.0, 0.0, 0.0, 0, 0, 0
    lowest_test_loss = 1e9

    model.zero_grad()

    for idx in range(args.epochs):
        bar = tqdm(train_dataloader, total=len(train_dataloader))
        tr_num = 0
        train_loss = 0
        for step, batch in enumerate(bar):
            (input_ids, attention_mask, labels) = [x.to(args.device) for x in batch]
            model.train()
            loss, logits = model(input_ids, attention_mask, labels)

            if args.n_gpu > 1:
                loss = loss.mean()

            if args.gradient_accumulation_steps > 1:
                loss = loss / args.gradient_accumulation_steps

            loss.backward()
            torch.nn.utils.clip_grad_norm_(
                model.parameters(), args.max_grad_norm)

            tr_loss += loss.item()
            tr_num += 1
            train_loss += loss.item()
            if avg_loss == 0:
                avg_loss = tr_loss

            avg_loss = round(train_loss/tr_num, 5)
            bar.set_description("epoch {} loss {}".format(idx, avg_loss))

            if (step + 1) % args.gradient_accumulation_steps == 0:
                optimizer.step()
                optimizer.zero_grad()
                scheduler.step()
                global_step += 1
                output_flag = True
                avg_loss = round(
                    np.exp((tr_loss - logging_loss) / (global_step - tr_nb)), 4)

                if global_step % args.save_steps == 0:
                    results = evaluate(args, model, tokenizer,
                                       eval_when_training=True)

                    # Save model checkpoint
                    if results['eval_loss'] < lowest_test_loss:
                        lowest_test_loss = results['eval_loss']
                        print("  "+"*"*20)
                        print("  Lowest Test Loss:%s" % round(lowest_test_loss, 4))
                        print("  "+"*"*20)

                        checkpoint_prefix = 'checkpoint-best-loss'
                        output_dir = os.path.join(
                            args.output_dir, '{}'.format(checkpoint_prefix))
                        if not os.path.exists(output_dir):
                            os.makedirs(output_dir)
                        model_to_save = model.module if hasattr(
                            model, 'module') else model
                        output_dir = os.path.join(
                            output_dir, '{}'.format('model.bin'))
                        torch.save(model_to_save.state_dict(), output_dir)
                        print(
                            "Saving model checkpoint to %s" % output_dir)

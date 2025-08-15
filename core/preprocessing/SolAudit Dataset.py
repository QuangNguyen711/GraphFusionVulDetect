soliaudit_reentrancy_files = {}
soliaudit_timedep_files = {}
soliaudit_non_timedep_files = {}

for index, row in df.iterrows():
    sc = remove_comments(row['source_code'])
    if row['Reentracy'] == 1:
        # soliaudit_reentrancy_files.append((row['source_code'], row['source_code']))
        soliaudit_reentrancy_files[sc] = row['Addr']
    if row['BlockTimestamp'] == 1:
        # soliaudit_timedep_files.append((row['source_code'], row['source_code']))
        soliaudit_timedep_files[sc] = row['Addr']
    if row['TimeDep'] == 1:
        # soliaudit_timedep_files.append((row['source_code'], row['source_code']))
        soliaudit_timedep_files[sc] = row['Addr']
    if row['TimeDep'] == 0 and row['BlockTimestamp'] == 0:
        soliaudit_non_timedep_files[sc] = row['Addr']


print("Reentrancy files:", len(soliaudit_reentrancy_files))
print("Time Dependency files:", len(soliaudit_timedep_files))
print("Non Time Dependency files:", len(soliaudit_non_timedep_files))

from types import new_class
import re

soliaudit_timedep_count = []
for file_content, adr in soliaudit_timedep_files.items():
    if file_content:  # Check if file_content is not empty
        lines = file_content.splitlines(keepends=True)
        for i, line in enumerate(lines):
            if "now" in line or "block.timestamp" in line:
              try:
                  soliaudit_timedep_count.append(remove_comments(find_function(lines, i)))
              except:
                  pass

tmp_cnt = {}
for file_content in deescv_timedep_count:
    if file_content not in tmp_cnt:
        tmp_cnt[file_content] = 1
    else:
        tmp_cnt[file_content] += 1

cnt_more_than_one = 0
for file_content, cnt in tmp_cnt.items():
    if cnt > 1:
        cnt_more_than_one += 1

print("Number of time dependency function with 'now' or 'block.timestamp':", len(set(soliaudit_timedep_count)))
print(f"Ratio of diff functions appear more than 1 with number of diff functions with 'now' or 'block.timestamp':", cnt_more_than_one / len(tmp_cnt) * 100)
len(soliaudit_timedep_count)

import random
from collections import defaultdict

print("#" * 30 + " SolAudit Ratios " + "#" * 30)

vulnerability = "Timestamp"
print(f"\n--- {vulnerability} ---")
vuln_funcs =  soliaudit_timedep_count
total_funcs = len(vuln_funcs)

soliaudit_ratio = []

# Task 1: Internal Duplication Ratio
if total_funcs > 0:
    func_counts = defaultdict(int)
    for func in vuln_funcs:
        func_counts[func] += 1

    repeated_funcs = [func for func, count in func_counts.items() if count > 1]
    repeated_count = sum(func_counts[func] for func in repeated_funcs)
    internal_ratio = (repeated_count / total_funcs * 100) if total_funcs > 0 else 0.0

    print(f"Task 1 - Internal Duplication Ratio: {internal_ratio:.2f}% ({repeated_count}/{total_funcs} funcs in repeated list)")
else:
    print("Task 1 - Internal Duplication Ratio: 0.00% (0/0 funcs in repeated list)")

soliaudit_ratio.append(internal_ratio)

# Task 2: Train/Test Overlap Ratio
if total_funcs > 0:
    sources_list = list( soliaudit_timedep_files.keys())
    source_count = len(sources_list)

    if source_count >= 2:
        random.seed(42)
        random.shuffle(sources_list)
        split_idx = int(source_count * 0.8)
        train_sources = sources_list[:split_idx]
        test_sources = sources_list[split_idx:]

        train_funcs = []
        test_funcs = []
        for func in set(vuln_funcs):
            for src in train_sources:
                if func in src:
                    train_funcs.append(func)
            for src in test_sources:
                if func in src:
                    test_funcs.append(func)

        overlap_funcs = set(train_funcs).intersection(set(test_funcs))
        overlap_count = sum(vuln_funcs.count(func) for func in overlap_funcs)
        overlap_ratio = (overlap_count / total_funcs * 100) if total_funcs > 0 else 0.0

        print(f"Task 2 - Train/Test Overlap Ratio: {overlap_ratio:.2f}% ({overlap_count}/{total_funcs} funcs overlap)")
    else:
        print("Task 2 - Train/Test Overlap Ratio: 0.00% (Not enough sources for split)")
else:
    print("Task 2 - Train/Test Overlap Ratio: 0.00% (0/0 funcs overlap)")

soliaudit_ratio.append(overlap_ratio)

print("\n" + "#" * 70)
soliaudit_ratio
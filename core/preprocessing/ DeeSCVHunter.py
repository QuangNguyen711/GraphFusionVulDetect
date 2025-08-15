reentrancy_files = os.listdir("/content/DeeSCVHunter/preprocessing/data/reentrancy/solidity_contract")
timedep_files =  os.listdir("/content/DeeSCVHunter/preprocessing/data/timestamp/solidity_contract")

def get_mapping(root, name_file, label_file):
    name_list = open(f"{root}/{name_file}", "r").readlines()
    label_list = open(f"{root}/{label_file}", "r").readlines()
    mapping = {}
    for name, label in zip(name_list, label_list):
        mapping[name.strip()] = int(label.strip())
    return mapping

reentrancy_mapping = get_mapping("/content/DeeSCVHunter/preprocessing/label/reentrancy", "reentrancy_contract_name.txt", "reentrancy_contract_label.txt")
timedep_mapping = get_mapping("/content/DeeSCVHunter/preprocessing/label/timestamp", "timestamp_contract_name.txt", "timestamp_contract_label.txt")

print(len(reentrancy_mapping))
print(len(timedep_mapping))

deescv_files = {
    "reentrancy": {},
    "timestamp": {}
}

nondeescv_files = {
    "reentrancy": {},
    "timestamp": {}
}


cnt = 0
for vul in deescv_files.keys():
    files = os.listdir(f"/content/DeeSCVHunter/preprocessing/data/{vul}/solidity_contract")
    for file in files:
        with open(f"/content/DeeSCVHunter/preprocessing/data/{vul}/solidity_contract/{file}", "r") as f:
            code = f.read()
        file_name = file.split(".")[0]
        code = remove_comments(code)
        if vul == "reentrancy":
            if reentrancy_mapping[file_name + ".sol"] == 1:
                deescv_files[vul][code] = file_name
            else:
                nondeescv_files[vul][code] = file_name
        if vul == "timestamp":
            if timedep_mapping[file_name + ".sol"] == 1:
                deescv_files[vul][code] = file_name
            else:
                nondeescv_files[vul][code] = file_name

deescv_reentrancy_count = []
nondeescv_reentrancy_count = []

for file_content, address in deescv_files["reentrancy"].items():
    if file_content:  # Check if file_content is not empty
        lines = file_content.splitlines(keepends=True)
        for i, line in enumerate(lines):
            if "call.value" in line:
              try:
                  address = address + ".sol"
                  if reentrancy_mapping[address] == 1:
                      deescv_reentrancy_count.append(remove_comments(find_function(lines, i)))
              except:
                  pass

for file_content, address in nondeescv_files["reentrancy"].items():
    if file_content:  # Check if file_content is not empty
        lines = file_content.splitlines(keepends=True)
        for i, line in enumerate(lines):
            if "call.value" in line:
              try:
                  address = address + ".sol"
                  if reentrancy_mapping[address] == 1:
                      nondeescv_reentrancy_count.append(remove_comments(find_function(lines, i)))
              except:
                  pass

tmp_cnt, tmp_cnt_non = {}, {}
for file_content in deescv_reentrancy_count:
    if file_content not in tmp_cnt:
        tmp_cnt[file_content] = 1
    else:
        tmp_cnt[file_content] += 1

for file_content in nondeescv_reentrancy_count:
    if file_content not in tmp_cnt_non:
        tmp_cnt_non[file_content] = 1
    else:
        tmp_cnt_non[file_content] += 1

cnt_more_than_one = 0
for file_content, cnt in tmp_cnt.items():
    if cnt > 1:
        cnt_more_than_one += 1

cnt_more_than_one_non = 0
for file_content, cnt in tmp_cnt_non.items():
    if cnt > 1:
        cnt_more_than_one_non += 1

print("Number of reentrancy functions with 'call.value':", len((deescv_reentrancy_count)))
print(f"Ratio of diff functions appear more than 1 with number of diff functions with 'call.value':", (cnt_more_than_one + cnt_more_than_one_non) / (len(tmp_cnt) + len(tmp_cnt_non)) * 100)

import random
from collections import defaultdict

print("#" * 30 + " DeeSCVHunter Ratios " + "#" * 30)

DeeSCVHunter_ratio = []

for vulnerability in ["reentrancy", "timestamp"]:
    print(f"\n--- {vulnerability.capitalize()} ---")
    vuln_funcs = deescv_reentrancy_count if vulnerability == "reentrancy" else deescv_timedep_count
    total_funcs = len(vuln_funcs)
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

    DeeSCVHunter_ratio.append(internal_ratio)

    # Task 2: Train/Test Overlap Ratio
    if total_funcs > 0:
        sources_list = list(deescv_files[vulnerability].keys())
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

    DeeSCVHunter_ratio.append(overlap_ratio)

print("\n" + "#" * 70)
DeeSCVHunter_ratio
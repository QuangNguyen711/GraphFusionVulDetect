import json

with open("/content/smartbugs-curated/vulnerabilities.json") as f:
    data = json.load(f)

smartbugs_files, smartbugs_functions = {}, {}

for file_dis in data:
    vulnerability = file_dis["path"].split("/")[1]
    file_name = file_dis["path"].split("/")[-1]
    file_name = file_name.split(".")[0]
    if vulnerability not in smartbugs_files:
        smartbugs_files[vulnerability] = {}
        smartbugs_functions[vulnerability] = {
            "vulnerable": [],
            "non-vulnerable": []
        }
    with open(f"/content/smartbugs-curated/{file_dis['path']}", "r") as f:
        code = f.read()
    ok = 0
    lines = code.splitlines(keepends=True)
    # code = "\n".join(lines)
    code = remove_comments(code)
    for er_line in file_dis["vulnerabilities"]:
        try:
            func = find_function(lines, er_line["lines"][0])
            if vulnerability == "reentrancy":
                if "call.value" in func:
                    ok = 1
            elif vulnerability == "time_manipulation":
                if "now" in func or "block.timestamp" in func:
                    ok = 1
            if ok == 1:
                smartbugs_functions[vulnerability]["vulnerable"].append(remove_comments(func).strip())
                # print(remove_comments(func).strip() in code)
        except Exception as e:
            print(e)
            pass
    if ok == 1:
        smartbugs_files[vulnerability][code] = file_name

for vulnerability in smartbugs_files.keys():
    tmp_cnt = {}
    if vulnerability == "reentrancy" or vulnerability == "time_manipulation":
        # print(f"Number of source code with {vulnerability} before", len(smartbugs_files[vulnerability]))
        print(f"Number of vulnerable functions with {vulnerability} before", len(smartbugs_functions[vulnerability]["vulnerable"]))
        print("-" * 100)
        cnt_more_than_one_content = []
        for file_content in smartbugs_functions[vulnerability]["vulnerable"]:
            if file_content not in tmp_cnt:
                tmp_cnt[file_content] = 1
            else:
                tmp_cnt[file_content] += 1

        for file_content in smartbugs_functions[vulnerability]["vulnerable"]:
            if tmp_cnt[file_content] > 1:
                cnt_more_than_one_content.append(file_content)

        print(f"Ratio of diff functions appear more than 1 with number of diff functions with {vulnerability} before", len(cnt_more_than_one_content) / len(smartbugs_functions[vulnerability]["vulnerable"]) * 100)
        print("-" * 100)
    # smartbugs_functions[vulnerability]["vulnerable"] = list(set(smartbugs_functions[vulnerability]["vulnerable"]))
    # if vulnerability == "reentrancy" or vulnerability == "time_manipulation":
    #     # print(f"Number of source code with {vulnerability} after", len(smartbugs_files[vulnerability]))
    #     print(f"Number of vulnerable functions with {vulnerability} after", len(smartbugs_functions[vulnerability]["vulnerable"]))
    #     print("-" * 100)

import random
from collections import defaultdict

print("#" * 30 + " SmartBugs-Curated Ratios " + "#" * 30)

SmartBugs_ratio = []

# Duyệt qua các loại lỗ hổng trong smartbugs_functions
for vulnerability in smartbugs_functions.keys():
    if vulnerability in ["reentrancy", "time_manipulation"]:
        print(f"\n--- {vulnerability.capitalize()} ---")
        vuln_funcs = smartbugs_functions[vulnerability]["vulnerable"]
        total_funcs = len(vuln_funcs)

        # Task 1: Internal Duplication Ratio
        if total_funcs > 0:
            func_counts = defaultdict(int)
            for func in vuln_funcs:
                func_counts[func] += 1

            # Danh sách các hàm lặp
            repeated_funcs = [func for func, count in func_counts.items() if count > 1]
            repeated_count = sum(func_counts[func] for func in repeated_funcs)
            internal_ratio = (repeated_count / total_funcs * 100) if total_funcs > 0 else 0.0

            print(f"Task 1 - Internal Duplication Ratio: {internal_ratio:.2f}% ({repeated_count}/{total_funcs} funcs in repeated list)")
        else:
            print("Task 1 - Internal Duplication Ratio: 0.00% (0/0 funcs in repeated list)")

        SmartBugs_ratio.append(internal_ratio)

        # Task 2: Train/Test Overlap Ratio (chỉ tính hàm lỗi)
        if total_funcs > 0:
            sources_list = list(smartbugs_files[vulnerability].keys())
            source_count = len(sources_list)

            if source_count >= 2:
                random.seed(42)
                random.shuffle(sources_list)
                split_idx = int(source_count * 0.8)
                train_sources = sources_list[:split_idx]
                test_sources = sources_list[split_idx:]

                # Xác định hàm lỗi trong train và test
                train_funcs = []
                test_funcs = []
                for func in vuln_funcs:
                    for src in train_sources:
                        if func in src and func in vuln_funcs:  # Đảm bảo là hàm lỗi
                            train_funcs.append(func)
                            break
                    for src in test_sources:
                        if func in src and func in vuln_funcs:  # Đảm bảo là hàm lỗi
                            test_funcs.append(func)
                            break

                # Tìm hàm lỗi trùng lặp giữa train và test
                overlap_funcs = set(train_funcs).intersection(set(test_funcs))
                overlap_count = sum(vuln_funcs.count(func) for func in overlap_funcs)
                overlap_ratio = (overlap_count / total_funcs * 100) if total_funcs > 0 else 0.0

                print(f"Task 2 - Train/Test Overlap Ratio: {overlap_ratio:.2f}% ({overlap_count}/{total_funcs} funcs overlap)")
            else:
                print("Task 2 - Train/Test Overlap Ratio: 0.00% (Not enough sources for split)")
        else:
            print("Task 2 - Train/Test Overlap Ratio: 0.00% (0/0 funcs overlap)")

        SmartBugs_ratio.append(overlap_ratio)
print("\n" + "#" * 70)
SmartBugs_ratio
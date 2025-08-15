import json

def read_jsonl(file_path):
  data = []
  try:
    with open(file_path, 'r') as f:
      for line in f:
        try:
          data.append(json.loads(line))
        except json.JSONDecodeError as e:
          print(f"Skipping invalid JSON line: {line.strip()}. Error: {e}")
    return data
  except FileNotFoundError:
    print(f"Error: File not found at {file_path}")
    return None

# Example usage:
file_path = '/content/data.jsonl' # replace with actual path
data = read_jsonl(file_path)

def merge_contracts(contracts):
    if not contracts:
        return ""

    pragma_set = set()
    extracted_contracts = []

    # Helper functions to extract contracts and their names
    def extract_contracts(code):
        contracts = []
        current_contract = []
        in_contract = False
        brace_count = 0
        lines = code.split('\n')
        for line in lines:
            stripped_line = line.strip()
            if not in_contract:
                if stripped_line.startswith(('contract ', 'interface ', 'library ')):
                    in_contract = True
                    current_contract = [line]
                    brace_count = line.count('{') - line.count('}')
            else:
                current_contract.append(line)
                brace_count += line.count('{') - line.count('}')
            if in_contract and brace_count == 0:
                contracts.append('\n'.join(current_contract).strip())
                current_contract = []
                in_contract = False
        return contracts

    def get_contract_name(contract_code):
        lines = contract_code.split('\n')
        first_line = lines[0].strip() if lines else ''
        parts = first_line.split()
        if len(parts) < 2 or parts[0] not in ['contract', 'interface', 'library']:
            return None
        name_part = parts[1]
        name = name_part.split('{')[0].split('is')[0].strip()
        return name

    # Process each contract to extract pragma and contracts
    for contract in contracts:
        code = contract.strip()
        lines = code.split('\n')
        pragma_lines = []
        in_pragma = False

        # Extract pragma lines
        for line in lines:
            stripped = line.strip()
            if stripped.startswith('pragma'):
                pragma_lines.append(line)
                in_pragma = True
            elif in_pragma:
                break  # Stop after first non-pragma line following pragma

        # Add pragma to set
        pragma_str = '\n'.join(pragma_lines).strip()
        if pragma_str:
            pragma_set.add(pragma_str)

        # Extract rest of the code and process contracts
        rest_code = '\n'.join(lines[len(pragma_lines):]).strip()
        if rest_code:
            contracts_in_rest = extract_contracts(rest_code)
            extracted_contracts.extend(contracts_in_rest)

    # Deduplicate contracts by name, preserving order
    seen = set()
    deduped_contracts = []
    for contract in extracted_contracts:
        name = get_contract_name(contract)
        if name and name not in seen:
            seen.add(name)
            deduped_contracts.append(contract)

    # Build merged code
    merged_code = []
    # Handle pragma directives
    if len(pragma_set) == 1:
        merged_code.append(next(iter(pragma_set)))
    else:
        merged_code.extend(sorted(pragma_set))  # Sort for consistency if multiple pragmas

    # Add deduplicated contracts
    merged_code.extend(deduped_contracts)

    return '\n\n'.join(merged_code).strip()

sol_dict = {}
for info in data:
    sol_dict[info['idx']] = (info['address'], info['contract'])

def process_data(filepath):
    """Processes a data file and returns lists of contracts classified as 0 and 1."""
    with open(filepath, 'r') as f:
        for line in f:
            try:
                index, label = line.strip().split()
                label = int(label)
                address, contract = sol_dict[index]
                sol_dict[index] = (address, contract, label)
            except ValueError:
                print(f"Skipping invalid line: {line.strip()}")

# Example usage:
process_data('train.txt')
process_data('valid.txt')
process_data('test.txt')

contract_groups = []
current_address = ""
current_group = []
for idx in range(len(sol_dict)):
    address, contract, label = sol_dict[str(idx)]
    if address != current_address:
        if current_address != "":
            contract_groups.append((current_address, current_group))
        current_address = address
        current_group = []
    current_group.append((contract, label))

import random
from collections import defaultdict

print("#" * 30 + " Peculiar Ratios " + "#" * 30)

print("\n--- Reentrancy ---")
vuln_funcs = peculiar_reentrancy_count
total_funcs = len(vuln_funcs)

peculiar_ratio = []

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

peculiar_ratio.append(internal_ratio)

# Task 2: Train/Test Overlap Ratio (chỉ tính hàm lỗi)
if total_funcs > 0:
    sources_list = list(peculiar_files.keys())
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
                if func in src:
                    train_funcs.append(func)
                    break
            for src in test_sources:
                if func in src:
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

peculiar_ratio.append(overlap_ratio)

print("\n" + "#" * 70)

peculiar_ratio
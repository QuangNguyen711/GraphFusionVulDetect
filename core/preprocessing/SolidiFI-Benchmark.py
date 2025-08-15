import os

root = "/content/SolidiFI-benchmark/buggy_contracts"
vulnerabilities = os.listdir(root)
solidiFI_files =  {}
for vulnerability in vulnerabilities:
  solidiFI_files[vulnerability] = {}

for vulnerability in vulnerabilities:
    for file in os.listdir(f"{root}/{vulnerability}"):
        if file.endswith(".sol"):
            sol_code = open(f"{root}/{vulnerability}/{file}", "r").readlines()
            sol_code = "\n".join(sol_code)
            file_name = file.split(".")[0]
            solidiFI_files[vulnerability][file_name] = sol_code

for vulnerability in vulnerabilities:
    tmp = [solidiFI_files[vulnerability][i] for i in solidiFI_files[vulnerability].keys()]
    print(f"Number of source code with {vulnerability}", len(set(tmp)))

import re
import pandas as pd

def find_function(lines, error_line):
    function_pattern = re.compile(r'\bfunction\s+\w+\s*\([^)]*\)\s*(\{[^}]*\})?')
    modifier_pattern = re.compile(r'\bmodifier\s+\w+\s*\([^)]*\)\s*(\{[^}]*\})?')
    constructor_pattern = re.compile(r'\bconstructor\s*\([^)]*\)\s*(\{[^}]*\})?')
    start_line = None

    # Search backward for the start of the function
    for i in range(error_line - 1, -1, -1):
        if function_pattern.search(lines[i]) or modifier_pattern.search(lines[i]) or constructor_pattern.search(lines[i]):
            start_line = i
            break

    if start_line is None:
        raise Exception("Function definition not found.")

    # Search forward for the end of the function
    end_line = None
    brace_count = 0
    in_function = False

    for i in range(start_line, len(lines)):
        line = lines[i]
        brace_count += line.count('{')
        brace_count -= line.count('}')

        if brace_count > 0:
            in_function = True
        elif brace_count == 0 and in_function:
            end_line = i
            break

    if end_line is None:
        raise Exception("Function end not found.")

    # Extract the function code
    function_code = "".join(lines[start_line:end_line + 1])
    return function_code


solidiFI_funcs =  {}
for vulnerability in vulnerabilities:
    solidiFI_funcs[vulnerability] = {
        "vulnerable": [],
        "non-vulnerable": []
    }


for vulnerability in vulnerabilities:
    for name, file in solidiFI_files[vulnerability].items():
        lines = file.splitlines(keepends=True)
        file_num = name[6:]
        csv_path = f"/content/SolidiFI-benchmark/buggy_contracts/{vulnerability}/BugLog_{file_num}.csv"
        tdf = pd.read_csv(csv_path)
        vul_line_num = list(tdf['loc'])

        vul_funcs = []
        all_funcs = []

        for line in range(len(lines)):
            try:
                func = find_function(lines, line)
                if "contract" not in func:
                    func = remove_comments(func).replace("\n\n\n\n\n", "\n").replace("\n\n\n\n", "\n").replace("\n\n\n", "\n").replace("\n\n", "\n")
                    all_funcs.append(func.strip())
            except:
                pass
        for er_line in vul_line_num:
            try:
                func = find_function(lines, er_line)
                if file_num == "21" and vulnerability == "Timestamp-Dependency":
                    print(func)
                    print("-" * 100)
                if "contract" not in func:
                    func = remove_comments(func).replace("\n\n\n\n\n", "\n").replace("\n\n\n\n", "\n").replace("\n\n\n", "\n").replace("\n\n", "\n")
                    vul_funcs.append(func.strip())
            except:
                pass

        vul_funcs = list(set(vul_funcs))
        all_funcs = list(set(all_funcs) - set(vul_funcs))
        solidiFI_funcs[vulnerability]["vulnerable"].extend(vul_funcs)
        solidiFI_funcs[vulnerability]["non-vulnerable"].extend(all_funcs)


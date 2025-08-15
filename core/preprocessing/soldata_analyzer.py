# Source Dataset
# !git clone https://github.com/DependableSystemsLab/SolidiFI-benchmark.git
# !git clone https://github.com/smartbugs/smartbugs-curated.git
# !git clone https://github.com/wuhongjun15/Peculiar.git
# !git clone https://github.com/MRdoulestar/DeeSCVHunter.git
# !git clone https://github.com/smartbugs/smartbugs-wild.git
# !git clone https://github.com/MANDO-Project/ge-sc


import re
import random
import os
random.seed(42)

# Keywords of Solidity; immutable set
keywords = frozenset({
    'bool', 'break', 'case', 'catch', 'const', 'continue', 'default', 'do', 'double', 'struct',
    'else', 'enum', 'payable', 'function', 'modifier', 'emit', 'export', 'extern', 'false', 'constructor',
    'float', 'if', 'contract', 'int', 'long', 'string', 'super', 'or', 'private', 'protected', 'noReentrancy',
    'public', 'return', 'returns', 'assert', 'event', 'indexed', 'using', 'require', 'uint', 'onlyDaoChallenge',
    'transfer', 'Transfer', 'Transaction', 'switch', 'pure', 'view', 'this', 'throw', 'true', 'try', 'revert',
    'bytes', 'bytes4', 'bytes32', 'internal', 'external', 'union', 'constant', 'while', 'for', 'notExecuted',
    'NULL', 'uint256', 'uint128', 'uint8', 'uint16', 'address', 'call', 'msg', 'value', 'sender', 'notConfirmed',
    'private', 'onlyOwner', 'internal', 'onlyGovernor', 'onlyCommittee', 'onlyAdmin', 'onlyPlayers', 'ownerExists',
    'onlyManager', 'onlyHuman', 'only_owner', 'onlyCongressMembers', 'preventReentry', 'noEther', 'onlyMembers',
    'onlyProxyOwner', 'confirmed', 'mapping', 'solidity'
})

global_vars = frozenset({
    'block.timestamp', 'now', 'msg.sender', 'msg.value', 'block.number', 'block.difficulty',
    'block.coinbase', 'block.gaslimit', 'tx.origin', 'tx.gasprice', 'gasleft', 'this', 'super'
})

# Known non-user-defined functions; immutable set
main_set = frozenset({'function', 'constructor', 'modifier', 'contract'})
main_args = frozenset({'argc', 'argv'})

def clean_fragment(fragment):
    fun_symbols = {}
    var_symbols = {}
    fun_count = 1
    var_count = 1

    rx_fun = re.compile(r'\b([_A-Za-z]\w*)\b(?=\s*\()')
    rx_var = re.compile(r'\b([_A-Za-z]\w*)\b(?:(?=\s*\w+\()|(?!\s*\w+))(?!\s*\()')

    cleaned_fragment = []

    for line in fragment:
        # Skip lines that are comments (single-line or multi-line)
        if line.strip().startswith('//') or line.strip().startswith('/*') or line.strip().endswith('*/'):
            cleaned_fragment.append(line)
            continue

        # Remove string literals and non-ASCII chars from the code part
        nostrlit_line = re.sub(r'".*?"', '""', line)
        nocharlit_line = re.sub(r"'.*?'", "''", nostrlit_line)
        ascii_line = re.sub(r'[^\x00-\x7f]', '', nocharlit_line)

        # Process function and variable names
        user_fun = rx_fun.findall(ascii_line)
        user_var = rx_var.findall(ascii_line)

        for fun_name in user_fun:
            if fun_name not in main_set and fun_name not in keywords:
                if fun_name not in fun_symbols:
                    fun_symbols[fun_name] = f'FUN{fun_count}'
                    fun_count += 1
                ascii_line = re.sub(r'\b' + fun_name + r'\b(?=\s*\()', fun_symbols[fun_name], ascii_line)

        for var_name in user_var:
            if var_name not in keywords and var_name not in main_args and var_name not in global_vars:
                if var_name not in var_symbols:
                    var_symbols[var_name] = f'VAR{var_count}'
                    var_count += 1
                ascii_line = re.sub(r'\b' + var_name + r'\b(?:(?=\s*\w+\()|(?!\s*\w+))(?!\s*\()', var_symbols[var_name], ascii_line)

        cleaned_fragment.append(ascii_line)

    return cleaned_fragment

def remove_comments(solidity_code):
    # Regex patterns to match single-line and multi-line comments
    single_line_comment_pattern = r"//.*?(?=\n|$)"
    multi_line_comment_pattern = r"/\*.*?\*/"

    # Remove single-line comments
    code_without_single_line_comments = re.sub(single_line_comment_pattern, '', solidity_code, flags=re.DOTALL)

    # Remove multi-line comments
    cleaned_code = re.sub(multi_line_comment_pattern, '', code_without_single_line_comments, flags=re.DOTALL)

    return cleaned_code.strip()

def clean_code_formatting(code):
    # Split code into lines
    lines = code.split('\n')

    cleaned_lines = []
    for line in lines:
        # Remove trailing whitespace
        line = line.rstrip()

        # Skip empty lines (preserve newlines with content)
        if not line.strip():
            continue

        # Collapse multiple spaces/tabs (except in string literals)
        line = re.sub(r'(?<!")\s{2,}(?!")', ' ', line)

        cleaned_lines.append(line)

    # Join lines while preserving single newlines
    return '\n'.join(cleaned_lines)



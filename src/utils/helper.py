import numpy as np
import subprocess
import os
import shutil
import random
import torch
import re
import pandas as pd
import pickle
import sys
import time
import glob # Use glob to find all downloaded versions
import stat # Import the stat module


def seed_everything(seed: int):
    # Hàm đặt seed cố định cho tất cả các thư viện để kết quả có thể tái tạo lại được
    random.seed(seed)  # Cố định seed cho thư viện random
    # os.environ['PYTHONHASHSEED'] = str(seed)  # Cố định hash seed của Python
    np.random.seed(seed)  # Cố định seed cho NumPy
    torch.manual_seed(seed)  # Cố định seed cho PyTorch CPU
    torch.cuda.manual_seed(seed)  # Cố định seed cho PyTorch GPU
    torch.backends.cudnn.deterministic = True  # Đảm bảo tính nhất quán của thuật toán cuDNN
    torch.backends.cudnn.benchmark = True  # Tối ưu hóa tốc độ tính toán

# get sol version
def get_solc_version(source):
    pattern =  re.compile(r'\d.\d.\d+')
    with open(source, 'r') as f:
        line = f.readline()
        while line:
            if 'pragma solidity' in line:
                if len(pattern.findall(line)) > 0:
                    return pattern.findall(line)[0]
                else:
                    return '0.4.25'
            line = f.readline()
    return '0.4.25'

def prepare_solc_artifacts(destination_path: str = 'ge-sc-artifacts'):
    """
    Copies all previously downloaded solc compiler artifacts from the central
    '~/.solc-select/artifacts' directory to a local project directory.

    After copying, it ensures the 'solc.exe' (on Windows) or 'solc' (on Linux/macOS)
    file has execute permissions.
    """
    print("--- Preparing Local SOLC Artifacts ---")
    os.makedirs(destination_path, exist_ok=True)

    home_dir = os.path.expanduser('~')
    solc_select_artifacts_path = os.path.join(home_dir, '.solc-select', 'artifacts')

    if not os.path.isdir(solc_select_artifacts_path):
        print(f"Error: Source directory not found: '{solc_select_artifacts_path}'")
        print("Please run 'python setup.py' first from your terminal to download the compilers.")
        return

    source_dirs = glob.glob(os.path.join(solc_select_artifacts_path, 'solc-*'))
    
    if not source_dirs:
        print(f"No downloaded compilers found in '{solc_select_artifacts_path}'.")
        print("Please run 'python setup.py' to download them.")
        return

    print(f"Found {len(source_dirs)} downloaded compiler versions to copy.")

    for source_dir in source_dirs:
        if os.path.isdir(source_dir):
            version_name = os.path.basename(source_dir)
            dest_dir = os.path.join(destination_path, version_name)
            print(f"Copying {version_name} to '{destination_path}'...")
            try:
                shutil.copytree(source_dir, dest_dir, dirs_exist_ok=True)
                
                # --- NEW CODE BLOCK TO FIX PERMISSIONS ---
                # Determine the executable name based on the operating system
                exe_name = 'solc.exe' if sys.platform == 'win32' else 'solc'
                solc_exe_path = os.path.join(dest_dir, exe_name)

                if os.path.exists(solc_exe_path):
                    # Get current permissions
                    current_permissions = os.stat(solc_exe_path).st_mode
                    # Add execute permission for the owner
                    new_permissions = current_permissions | stat.S_IEXEC
                    os.chmod(solc_exe_path, new_permissions)
                    print(f"  - Ensured execute permission for {solc_exe_path}")
                # ----------------------------------------

            except Exception as e:
                print(f"Failed to copy or set permissions for {version_name}. Error: {e}")
    
    print("--- Artifact preparation complete. ---")


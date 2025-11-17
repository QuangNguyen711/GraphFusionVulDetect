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

def install_solc_versions(file_path: str = 'datasets/SmartContractVulnerabilityDetection/sc_versions.pkl', destination_path: str = 'ge-sc-artifacts'):
    # Tạo thư mục đích nếu nó chưa tồn tại
    os.makedirs(destination_path, exist_ok=True)
    
    with open(file_path, 'rb') as f:
        sc_versions = pickle.load(f)

    home_dir = os.path.expanduser('~')

    # Xác định đường dẫn gốc của solc-select dựa trên hệ điều hành
    if sys.platform == 'win32' or os.name == 'nt':
        # Trên Windows, thường là %LOCALAPPDATA%\solc-select
        # os.path.join(home_dir, 'AppData', 'Local') tương đương %LOCALAPPDATA%
        solc_select_base_path = os.path.join(home_dir, 'AppData', 'Local', 'solc-select')
    else:
        # Trên Linux/macOS, là ~/.solc-select
        solc_select_base_path = os.path.join(home_dir, '.solc-select')
    
    print(f"Using solc-select base path: {solc_select_base_path}")

    for sc_version in sc_versions:
        print(f"Processing SOL version {sc_version}")
        try:
            # 1. Chạy lệnh cài đặt
            print(f"Attempting to install solc {sc_version}...")
            # Dùng capture_output để ẩn output thành công, chỉ hiện khi có lỗi
            subprocess.run(['solc-select', 'install', sc_version], check=True, capture_output=True, text=True)
            print(f"Successfully installed solc {sc_version}.")

            # 2. Xây dựng đường dẫn nguồn chính xác từ đường dẫn gốc đã xác định
            solc_compiler_source = os.path.join(solc_select_base_path, 'artifacts', f'solc-{sc_version}')
            
            # 3. Sao chép thư mục
            print(f"Copying from '{solc_compiler_source}' to '{destination_path}'")
            if not os.path.isdir(solc_compiler_source):
                # Thêm một bước kiểm tra để đảm bảo thư mục nguồn tồn tại trước khi copy
                raise FileNotFoundError(f"Source directory does not exist after installation: {solc_compiler_source}")
                
            shutil.copytree(solc_compiler_source, destination_path, dirs_exist_ok=True)
            print(f"Successfully copied version {sc_version}.")

        except subprocess.CalledProcessError as e:
            print(f"Failed to install SOL version {sc_version}. It might not be a valid version.")
            print(f"solc-select stderr: {e.stderr.strip()}")
        except FileNotFoundError as e:
            print(f"Error copying version {sc_version}. Path not found: {e}")
        except Exception as e:
            print(f"An unexpected error occurred for SOL version {sc_version}: {e}")
        print("-" * 20)


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
    os.environ['PYTHONHASHSEED'] = str(seed)  # Cố định hash seed của Python
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
    Sao chép tất cả các trình biên dịch solc đã được tải về từ thư mục
    '~/.solc-select/artifacts' vào thư mục cục bộ của dự án.
    Hàm này cũng đảm bảo các file có quyền thực thi.
    """
    print("--- Chuẩn bị các trình biên dịch SOLC cho dự án ---")
    os.makedirs(destination_path, exist_ok=True)
    home_dir = os.path.expanduser('~')
    solc_select_artifacts_path = os.path.join(home_dir, '.solc-select', 'artifacts')

    if not os.path.isdir(solc_select_artifacts_path):
        print(f"Lỗi: Không tìm thấy thư mục nguồn: '{solc_select_artifacts_path}'")
        print("Vui lòng chạy hàm setup_solc_versions() trước để tải về các trình biên dịch.")
        return

    source_dirs = glob.glob(os.path.join(solc_select_artifacts_path, 'solc-*'))
    if not source_dirs:
        print(f"Không tìm thấy trình biên dịch nào đã được tải về trong '{solc_select_artifacts_path}'.")
        return

    print(f"Tìm thấy {len(source_dirs)} phiên bản trình biên dịch để sao chép.")
    for source_dir in source_dirs:
        if os.path.isdir(source_dir):
            version_name = os.path.basename(source_dir)
            dest_dir = os.path.join(destination_path, version_name)
            try:
                shutil.copytree(source_dir, dest_dir, dirs_exist_ok=True)
                # Đặt quyền thực thi, rất quan trọng trên Linux/macOS
                if sys.platform != 'win32':
                    # Tên file thực thi trên Linux là solc-x.y.z
                    exe_name = f'solc-{version_name.split("-")[1]}'
                    solc_exe_path = os.path.join(dest_dir, exe_name)
                    if os.path.exists(solc_exe_path):
                        st = os.stat(solc_exe_path)
                        # Thêm cờ thực thi (x) cho chủ sở hữu (user)
                        os.chmod(solc_exe_path, st.st_mode | stat.S_IXUSR)
            except Exception as e:
                print(f"Không thể sao chép hoặc đặt quyền cho {version_name}. Lỗi: {e}")
    print("--- Hoàn tất chuẩn bị. ---")


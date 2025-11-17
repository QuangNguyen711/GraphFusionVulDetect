import numpy as np
import matplotlib.pyplot as plt
import pickle
import subprocess
import os
import shutil
import random
import torch
import re
from concurrent.futures import ThreadPoolExecutor
from random import sample
import json
import multiprocessing
import traceback
import pandas as pd
import os
from pathlib import Path
import networkx as nx
import matplotlib.pyplot as plt
import dgl
import shutil
import random
import re
import logging
from copy import deepcopy
from os.path import join
from scipy.integrate._ivp.radau import C
from slither.slither import Slither
from collections import defaultdict
from networkx.algorithms import cluster
from slither.core.cfg.node import Node, NodeType
from slither.printers.call import call_graph
from slither.printers.abstract_printer import AbstractPrinter
from slither.core.declarations.solidity_variables import SolidityFunction
from slither.core.declarations.function import Function
from slither.core.variables.variable import Variable
import glob
from multiprocessing import Pool as ThreadPool
from functools import partial
import torch.nn as nn
from torch import Tensor
import torch.nn.functional as F
from dgl.nn import GraphConv
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
import pandas as pd
from torch.utils.data import DataLoader, TensorDataset
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestClassifier
import pickle
import random
import numpy as np
from tqdm import tqdm
from shutil import copy
from re import L
from typing import Pattern

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

def plot(x: list, y: list):
    x = np.array(x)
    y = np.array(y)

    plt.plot(x, y)
    plt.title("Decrease of loss over epochs")
    plt.xlabel("Epochs")
    plt.ylabel("Loss")
    plt.show()
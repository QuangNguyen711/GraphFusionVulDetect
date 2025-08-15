from concurrent.futures import ThreadPoolExecutor
import json
import dgl
import os
import torch
import pandas as pd
def readData(path: str, n_nscam: int, n_scam: int):
  dic = {
      "filename": [],
      "label": []
  }
  cnt0, cnt1 = 0, 0
  for label in ["NonVulnerable_Fcg", "Vulnerable_Fcg"]:
    for file in sorted(os.listdir(path + "/" + label)):
      if file.endswith(".fcg"):
        if label == "NonVulnerable_Fcg":
          if cnt0 <= n_nscam:
            dic['filename'].append("/".join([path, label, file]))
            dic['label'].append(0)
            cnt0 += 1
        else:
          if cnt1 <= n_scam:
            dic['filename'].append("/".join([path, label, file]))
            dic['label'].append(1)
            cnt1 += 1
  df = pd.DataFrame(dic)
  return df

def loadfeatureGraph_5(path):
    """
    path: path to fcg file
    
    return: dgl.DGLGraph with feature size of 5
    """
    g = dgl.load_graphs(path)[0][0]
    label = None
    if "NonVulnerable_Fcg" in path:
        label = 0
    else:
        label = 1        
    file_path_split = path.split("/")
    info_path = "/".join(file_path_split[:-1]) + "/" + file_path_split[-1].replace(".fcg", "_mapping.json")
    info_data = json.load(open(info_path, "r"))

    new_node_label = []
    for name, code in info_data['code'].items():
        if "Reentrancy" in info_path:
            if "call.value" in code:
                new_node_label.append(1)
            else:
                new_node_label.append(0)
        else:
            if "block.timestamp" in code or "now" in code:
                new_node_label.append(1)
            else:
                new_node_label.append(0)

    g.ndata['node_label'] = torch.tensor(new_node_label)
    
    return g, label

def loadfeatureGraph_100(path):
    """
    path: path to fcg file
    
    return: dgl.DGLGraph with feature size of 100
    """
    g = dgl.load_graphs(path)[0][0]

    label = None
    if "NonVulnerable_Fcg" in path:
        label = 0
    else:
        label = 1        
    file_path_split = path.split("/")
    info_path = "/".join(file_path_split[:-1]) + "/" + file_path_split[-1].replace(".fcg", "_mapping.json")
    info_data = json.load(open(info_path, "r"))

    new_node_label = []
    for name, code in info_data['code'].items():
        if "Reentrancy" in info_path:
            if "call.value" in code:
                new_node_label.append(1)
            else:
                new_node_label.append(0)
        else:
            if "block.timestamp" in code or "now" in code:
                new_node_label.append(1)
            else:
                new_node_label.append(0)

    g.ndata['node_label'] = torch.tensor(new_node_label)
    
    g.ndata["features"] = g.ndata["featuresH"]
    return g, label

def loadfeatureGraph_105(path):
    """
    path: path to fcg file
    
    return: dgl.DGLGraph with feature size of 105
    """
    g = dgl.load_graphs(path)[0][0]
    template = g.ndata["features"]
    
    label = None
    if "NonVulnerable_Fcg" in path:
        label = 0
    else:
        label = 1        
    file_path_split = path.split("/")
    info_path = "/".join(file_path_split[:-1]) + "/" + file_path_split[-1].replace(".fcg", "_mapping.json")
    info_data = json.load(open(info_path, "r"))

    new_node_label = []
    for name, code in info_data['code'].items():
        if "Reentrancy" in info_path:
            if "call.value" in code:
                new_node_label.append(1)
            else:
                new_node_label.append(0)
        else:
            if "block.timestamp" in code or "now" in code:
                new_node_label.append(1)
            else:
                new_node_label.append(0)

    g.ndata['node_label'] = torch.tensor(new_node_label)
    
    g.ndata["features"] = torch.cat([g.ndata["featuresH"], template], dim=1)
    return g, label

def createBatchMulThread_MultiOp(data, max_works, nfeatures):
    """
    data: Graph paths,
    nfeatures: Size of node feature
    max_works: number of thread use
    
    return list[DGLGraph]
    """
    pathfiles = data
    if nfeatures == 5:
        with ThreadPoolExecutor(max_works) as executor:
            graph_n_label = list(executor.map(loadfeatureGraph_5, pathfiles))
    elif nfeatures == 768:
        with ThreadPoolExecutor(max_works) as executor:
            graph_n_label = list(executor.map(loadfeatureGraph_100, pathfiles))
    elif nfeatures == 773:
        with ThreadPoolExecutor(max_works) as executor:
            graph_n_label = list(executor.map(loadfeatureGraph_105, pathfiles))

    graphs, labels = [], []
    for g, label in graph_n_label:
        cnt = 0
        for nlabel in g.ndata['node_label'].tolist():
            if nlabel == 1:
                cnt += 1
        num_classes = len(torch.unique(g.ndata['node_label']))
        if cnt == 1:
            graphs.append(g)
            labels.append(label)
    # graphs, labels = [], []
    # for graph, label in graph_n_label:
    #     graphs.append(graph)
    #     labels.append(label)
            
    return graphs, labels

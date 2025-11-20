from typing import Optional
import torch.nn as nn
import torch
import torch.nn.functional as F
from dgl.nn import GraphConv, GATConv, TAGConv, SAGEConv, GINConv
import pandas as pd
import random


def get_convolution_layer(
        input_dimension: int,
        output_dimension: int,
        name: list,
        agg_hidden_dimension: int = 1024, # Only use for GINConv
        heads: int = 0 # Only use for GATConv
) -> Optional[nn.Module]:
    mlp, gin_agg, sage_agg = None, 'sum', 'mean'
    if name[0] == "GIN":
        mlp = nn.Sequential()
        mlp.append(nn.Linear(input_dimension, agg_hidden_dimension))
        mlp.append(nn.ReLU())
        mlp.append(nn.Linear(agg_hidden_dimension, output_dimension))
        gin_agg = name[1]

    if name[0] == "SAGE":
        sage_agg = name[1]

    return {"GCN": GraphConv(input_dimension, output_dimension, activation=F.relu),
            "SAGE": SAGEConv(input_dimension, output_dimension, activation=F.relu, norm=F.normalize, aggregator_type=sage_agg),
            "GAT": GATConv(input_dimension, output_dimension, num_heads=heads, activation=F.relu, feat_drop=0.0, attn_drop=0.0),
            "TAG": TAGConv(input_dimension, output_dimension, k=4, activation=F.relu),
            "GIN": GINConv(apply_func=mlp, activation=F.relu, aggregator_type=gin_agg)
            }.get(name[0], None)

class NodeClassifierGNN(nn.Module):
    def __init__(self, mtype, infeats, hfeats: list, fc1_layer, fc2_layer, outclass, ginfeat=None):
        super(NodeClassifierGNN, self).__init__()
        self.mtype = mtype
        self.hfeats = hfeats
        # self.device = torch.device("cuda") if torch.cuda.is_available() else torch.device("cpu")
        self.device = torch.device("cpu")

        # Define convolutional layers
        self.conv_layers = nn.ModuleList()
        current_dim = infeats
        
        for i, hdim in enumerate(hfeats):
            if mtype[0] == "GAT":
                # For GAT, the output dimension is hdim * num_heads
                num_heads = 8 if i < len(hfeats) -1 else 1 # Last layer with 1 head
                conv = get_convolution_layer(current_dim, hdim, name=mtype, heads=num_heads)
                current_dim = hdim * num_heads
            else:
                conv = get_convolution_layer(current_dim, hdim, name=mtype, agg_hidden_dimension=ginfeat if mtype[0] == "GIN" else None)
                current_dim = hdim
            self.conv_layers.append(conv)
            
        # Classifier layers
        self.fc1 = nn.Linear(current_dim, fc1_layer)
        self.fc2 = nn.Linear(fc1_layer, fc2_layer)
        self.fc3 = nn.Linear(fc2_layer, outclass)

        nn.init.xavier_uniform_(self.fc1.weight)
        nn.init.xavier_uniform_(self.fc2.weight)
        nn.init.xavier_uniform_(self.fc3.weight)

    def forward(self, g, infeats):
        h = infeats
        for i, layer in enumerate(self.conv_layers):
            h = layer(g, h)
            if self.mtype[0] == "GAT":
                # Reshape from [num_nodes, num_heads, out_dim] to [num_nodes, num_heads * out_dim]
                h = h.reshape(h.shape[0], -1)
        
        # Node-level features are now ready for classification
        # No pooling is applied
        
        ans = self.fc1(h)
        ans = F.relu(ans)
        ans = self.fc2(ans)
        ans = F.relu(ans)
        return self.fc3(ans)

    def save(self, path):
        torch.save(self.state_dict(), path)

    def load(self, path):
        self.load_state_dict(torch.load(path))
from typing import Tuple, Optional, Dict
import torch.nn as nn
import torch.nn.functional as F
from dgl.nn import GraphConv, GATConv, TAGConv, SAGEConv, GINConv, SumPooling, AvgPooling, MaxPooling, SortPooling, GlobalAttentionPooling, WeightAndSum, Set2Set, SetTransformerEncoder, SetTransformerDecoder

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

def get_pooling_method(
            method_name: str,
            hidden_dim: int = None  # Add hidden_dim parameter
    ):
        return {"max": MaxPooling(),
                "mean": AvgPooling(),
                "sum": SumPooling(),
                "sort": SortPooling(k=3),
                "transformer": (SetTransformerEncoder(5, 4, 4, 20), SetTransformerDecoder(5, 4, 4, 20, 1, 3)),
                "global_attention": GlobalAttentionPooling(gate_nn=nn.Linear(hidden_dim, 1),
                                                         feat_nn=nn.Linear(hidden_dim, hidden_dim))
                }.get(method_name, None)

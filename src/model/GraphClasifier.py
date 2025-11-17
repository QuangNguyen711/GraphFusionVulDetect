import dgl
import dgl.nn.pytorch as dglnn
from dgl.nn import GraphConv, GATConv, TAGConv, SAGEConv, GINConv, SumPooling,\
        AvgPooling, MaxPooling, SortPooling, GlobalAttentionPooling,\
        SetTransformerEncoder, SetTransformerDecoder
import torch.nn as nn
import torch
from typing import Optional
import torch.nn.functional as F
from torch.nn import Sequential


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

class MultiHeadCrossAttentionPooling(nn.Module):
    def __init__(self, hidden_dim, num_query_vectors=1, num_heads=4):
        super(MultiHeadCrossAttentionPooling, self).__init__()
        self.num_query_vectors = num_query_vectors
        self.hidden_dim = hidden_dim
        self.num_heads = num_heads
        
        # Single set of query vectors, will be reshaped for multi-head
        self.query = nn.Parameter(torch.randn(num_query_vectors, hidden_dim))
        
        # Single transformations that will be reshaped for multi-head attention
        self.key_transform = nn.Linear(hidden_dim, hidden_dim)
        self.value_transform = nn.Linear(hidden_dim, hidden_dim)
        
        # Output projection
        self.output_projection = nn.Linear(hidden_dim, hidden_dim)
        
        # Final output dimension
        self.output_dim = hidden_dim * num_query_vectors
        
    def forward(self, g, h):
        graph_splits = g.batch_num_nodes()
        batch_size = len(graph_splits)
        device = h.device
        output = torch.zeros(batch_size, self.output_dim, device=device)
        
        # Transform once for all heads
        keys = self.key_transform(h)      # (total_nodes x hidden_dim)
        values = self.value_transform(h)   # (total_nodes x hidden_dim)
        
        # Reshape for multi-head attention
        # Reshape to: [num_nodes, num_heads, hidden_dim/num_heads]
        keys = keys.view(-1, self.num_heads, self.hidden_dim // self.num_heads)
        values = values.view(-1, self.num_heads, self.hidden_dim // self.num_heads)
        query = self.query.view(self.num_query_vectors, self.num_heads, -1)
        
        start_idx = 0
        for i, num_nodes in enumerate(graph_splits):
            end_idx = start_idx + num_nodes
            
            # Get current graph's nodes
            graph_keys = keys[start_idx:end_idx]    # (num_nodes x num_heads x head_dim)
            graph_values = values[start_idx:end_idx] # (num_nodes x num_heads x head_dim)
            
            # Calculate attention scores (for all heads simultaneously)
            scores = torch.matmul(query.permute(1, 0, 2), graph_keys.permute(1, 2, 0))
            # scores shape: [num_heads, num_queries, num_nodes]
            
            attention_weights = F.softmax(scores / (self.hidden_dim // self.num_heads) ** 0.5, dim=-1)
            
            # Apply attention
            head_outputs = torch.matmul(attention_weights, graph_values.permute(1, 0, 2))
            # head_outputs shape: [num_heads, num_queries, head_dim]
            
            # Concatenate heads and reshape
            multi_head_output = head_outputs.permute(1, 0, 2).reshape(self.num_query_vectors, -1)
            
            # Project output
            projected_output = self.output_projection(multi_head_output)
            
            # Store result
            output[i] = projected_output.reshape(-1)
            
            start_idx = end_idx
        
        return output

class GraphNN(nn.Module):
    def __init__(self, mtype, infeats, hfeats: list, fc1_layer, fc2_layer, n_gph, outclass, gptype='max', ginfeat=None, num_query_vectors=1):
        super(GraphNN, self).__init__()
        self.mtype = mtype
        self.gptype = gptype
        self.hfeats = hfeats
        self.device = torch.device("cuda") if torch.cuda.is_available() else torch.device("cpu")

        if mtype[0] == "GIN":          
          self.conv1 = get_convolution_layer(input_dimension=infeats, output_dimension=hfeats[0],
                                             name=mtype, agg_hidden_dimension=ginfeat)
          
          if len(hfeats) >= 2:
            self.conv2 = get_convolution_layer(input_dimension=hfeats[0], output_dimension=hfeats[1],
                                               name=mtype, agg_hidden_dimension=ginfeat)
          if len(hfeats) >= 3:
            self.conv3 = get_convolution_layer(input_dimension=hfeats[1], output_dimension=hfeats[2],
                                               name=mtype, agg_hidden_dimension=ginfeat)
        else:          
          if mtype != ["GAT"]:
            self.conv1 = get_convolution_layer(input_dimension=infeats, output_dimension=hfeats[0], name=mtype)
            if len(hfeats) >= 2:
                self.conv2 = get_convolution_layer(input_dimension=hfeats[0], output_dimension=hfeats[1], name=mtype)
            if len(hfeats) >= 3:
                self.conv3 = get_convolution_layer(input_dimension=hfeats[1], output_dimension=hfeats[2], name=mtype)
          else:
            if len(hfeats) > 1:
              self.conv1 = get_convolution_layer(input_dimension=infeats, output_dimension=hfeats[0], name=mtype, heads=8)
            elif len(hfeats) == 1:
              self.conv1 = get_convolution_layer(input_dimension=infeats, output_dimension=hfeats[0], name=mtype, heads=1)
              # self.GPH_1 = get_convolution_layer(input_dimension=hfeats[-1], output_dimension=hfeats[-1], name=mtype, heads=1)
            if len(hfeats) > 2:
              self.conv2 = get_convolution_layer(input_dimension=(hfeats[0] * 8), output_dimension=hfeats[1], name=mtype, heads=8)
            elif len(hfeats) == 2:
              self.conv2 = get_convolution_layer(input_dimension=(hfeats[0] * 8), output_dimension=hfeats[1], name=mtype, heads=1)
              # self.GPH_2 = get_convolution_layer(input_dimension=hfeats[-1], output_dimension=hfeats[-1], name=mtype, heads=1)
            if len(hfeats) == 3:
              self.conv3 = get_convolution_layer(input_dimension=(hfeats[1] * 8), output_dimension=hfeats[2], name=mtype, heads=1)
              # self.GPH_3 = get_convolution_layer(input_dimension=hfeats[-1], output_dimension=hfeats[-1], name=mtype, heads=1)

        if mtype == ["GIN"]:
            self.GPH = Sequential(*[get_convolution_layer(input_dimension=hfeats[-1], output_dimension=hfeats[-1],
                                                            name=mtype, agg_hidden_dimension=ginfeat) for i in range(n_gph)])
        else:
            if mtype != ["GAT"]:
                self.GPH = Sequential(*[get_convolution_layer(input_dimension=hfeats[-1], 
                                                                output_dimension=hfeats[-1], name=mtype) for i in range(n_gph)])
            else:
                self.GPH = Sequential(*[get_convolution_layer(input_dimension=hfeats[-1], 
                                                                output_dimension=hfeats[-1], name=mtype, heads=1) for i in range(n_gph)])
        
        # In GraphNN's __init__
        if gptype == 'cross_attention':
            self.pooling = MultiHeadCrossAttentionPooling(hidden_dim=hfeats[-1], num_query_vectors=num_query_vectors)
            fc1_input_dim = hfeats[-1] * num_query_vectors
        else:
            self.pooling = get_pooling_method(gptype, hidden_dim=hfeats[-1])  # Pass the hidden dimension
            fc1_input_dim = hfeats[-1]

        # Adjust FC layers for concatenated output
        self.fc1 = nn.Linear(fc1_input_dim, fc1_layer)
        self.fc2 = nn.Linear(fc1_layer, fc2_layer)
        self.fc3 = nn.Linear(fc2_layer, outclass)

        nn.init.xavier_uniform_(self.fc1.weight)
        nn.init.xavier_uniform_(self.fc2.weight)
        nn.init.xavier_uniform_(self.fc3.weight)
    
    def create_graph_adjacency(self, num_nodes):
        src = []
        dest = []
        for i in range(num_nodes):
            for j in range(num_nodes):
                if i != j:
                    src.append(i)
                    dest.append(j)
        src = torch.tensor(src)
        dest = torch.tensor(dest)
        return dgl.graph((src, dest), num_nodes=num_nodes)

    def create_graph(self, features):
        g = self.create_graph_adjacency(features.shape[0])
        g = g.add_self_loop().to(self.device)
        g.ndata["features"] = features
        return g.add_self_loop().to(self.device)
        
    def forward(self, g, infeats):
        # Apply graph convolution and activation.
        h = self.conv1(g, infeats)
        if self.mtype == ["GAT"]: h = h.reshape(h.shape[0], -1)
        if len(self.hfeats) >= 2:
          h = self.conv2(g, h)
          if self.mtype == ["GAT"]: h = h.reshape(h.shape[0], -1)
        if len(self.hfeats) >= 3:
          h = self.conv3(g, h)
          if self.mtype == ["GAT"]: h = h.reshape(h.shape[0], -1)
        # with g.local_scope():

        g.ndata['features'] = h
        if self.gptype == "cross_attention":
            h = self.pooling(g, g.ndata['features'])
        elif self.gptype == "transformer":
            enc_nodes, dec_nodes = get_pooling_method(self.gptype)
            h = enc_nodes(g, g.ndata['features'])
            h = dec_nodes(g, g.ndata['features'])
        else:
            h = self.pooling(g, g.ndata['features'])

        if len(self.GPH) != 0:
            g = self.create_graph(h.clone())
            h_gph = self.GPH(g, g.ndata['features'])
            h += h_gph.squeeze()
        ans = self.fc1(h)
        ans = F.relu(ans)
        ans = self.fc2(ans)
        ans = F.relu(ans)
        return self.fc3(ans)

    def save(self, path):
      torch.save(self.state_dict(), path)

    def load(self, path):
      self.load_state_dict(torch.load(path))
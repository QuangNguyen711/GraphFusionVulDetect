from core.GFD.module.get_layer import get_convolution_layer, get_pooling_method
from core.GFD.module.msap import MultiHeadCrossAttentionPooling
import dgl
import torch.nn as nn
import torch
import torch.nn.functional as F
from dgl.nn.pytorch import Sequential

class GFD(nn.Module):
    def __init__(self, mtype, infeats, hfeats: list, fc1_layer, fc2_layer, n_gph, outclass, gptype='max', ginfeat=None, num_query_vectors=1):
        super(GFD, self).__init__()
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
        
        # In GFD's __init__
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
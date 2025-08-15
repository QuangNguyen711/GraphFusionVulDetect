import torch.nn as nn
import torch
import torch.nn.functional as F

#---------------------------------------------------------------------------------------------------------------------
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
from dgl.data import DGLDataset

class GraphDataset(DGLDataset):
    def __init__(self, graphs, labels):
        super().__init__(name='graph_dataset')
        self.graphs = graphs
        self.labels = labels
    def process(self):
        # Here, you could preprocess the data if needed.
        pass

    def __getitem__(self, idx):
        return self.graphs[idx], self.labels[idx]

    def __len__(self):
        return len(self.graphs)
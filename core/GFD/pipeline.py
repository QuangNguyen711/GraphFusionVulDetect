import os
import dgl
import os
import torch
from dgl.dataloading import GraphDataLoader
from torch import Tensor
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
import numpy as np
from core.GFD.data.data_utils import createBatchMulThread_MultiOp, readData
from core.GFD.data.dataset import GraphDataset
from core.GFD.module.gfd import GFD
from core.utils.utils import plot, seed_everything


class PipelineGFD:
    def runtime(self, mode="train"):
        data_path = "/kaggle/input/sol2graphconverter/SmartContractVulnerabilityDetection/SourceCodeSyntaxDataset/TimestampDependencyDataset"
        self.data_path = data_path
        train_df = readData(f"{data_path}/Train", 2047, 2047)
        train_df = train_df.sample(frac=1).reset_index(drop=True)

        test_df = readData(f"{data_path}/Test", 2047, 2047)
        test_df = test_df.sample(frac=1).reset_index(drop=True)

        X_train, y_train = train_df.drop(['label'], axis=1), train_df['label']
        X_test, y_test = test_df.drop(['label'], axis=1), test_df['label']

        graphs, y_train  = createBatchMulThread_MultiOp(X_train['filename'].tolist(), 16, 768)
        print(f"Train Dataset size: {len(graphs)} files")
        graphs = [dgl.add_self_loop(g) for g in graphs]
        dataset = GraphDataset(graphs, Tensor(list(y_train)).long())
        dataloader = GraphDataLoader(
            dataset,
            batch_size=128,
            drop_last=False,
            shuffle=True)

        tgraphs, y_test = createBatchMulThread_MultiOp(X_test['filename'].tolist(), 16, 768)
        print(f"Test Dataset size: {len(tgraphs)} files")
        tgraphs = [dgl.add_self_loop(g) for g in tgraphs]
        tdataset = GraphDataset(tgraphs, Tensor(list(y_test)).long())
        tdataloader = GraphDataLoader(
            tdataset,
            batch_size=512,
            drop_last=False,
            shuffle=True)

        n_feats = 768
        n_batch=128
        if mode == "train":
            result = self.runtime_training(dataloader=dataloader, tdataloader=tdataloader, mtype=['GCN'],
                                            s_epoch=0, e_epoch=200, n_workers=64, n_gph=1, n_feats=n_feats,
                                            hfeats=[2048, 2048], gptype='max', ginfeat=1024, num_query_vectors=2)
        elif mode == "eval":
            result = self.runtime_evaluation(tdataloader=tdataloader, mtype=['GCN'],
                                            n_feats=n_feats,hfeats=[2048, 2048], n_gph=1, gptype='max', ginfeat=1024)
        return result
        
    def runtime_training(self, dataloader, tdataloader, mtype, s_epoch, e_epoch, n_workers, n_feats, hfeats, n_gph, gptype, ginfeat, num_query_vectors):
        seed_everything(42)
        model = GFD(mtype=mtype, infeats=n_feats, hfeats=hfeats, fc1_layer=256, fc2_layer=64, n_gph=n_gph, outclass=2, gptype=gptype, ginfeat=ginfeat)
        model.to(model.device)
        print(model)
        optimizer = torch.optim.Adam(model.parameters(), lr=0.0005)
        criterion = torch.nn.CrossEntropyLoss()

        result = {
            "data": os.path.basename(self.data_path),
            "loss":[],
            "val_acc": [],
            "val_f1": [],
            "epoch": []
        }

        for epoch in (range(s_epoch, e_epoch)):
            bloss, bpred, blabel = [], [], []
            for batched_graph, label_batch in dataloader:
                batched_graph, label_batch = batched_graph.to(model.device), label_batch.to(model.device)
                feats = batched_graph.ndata['features']
                model.train()
                pred_batch = model(batched_graph, feats)
                loss = criterion(pred_batch, label_batch)
                out_batch = pred_batch.argmax(dim=1).long()
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()
                bloss.append(loss.item())
                bpred.extend(out_batch.tolist())
                blabel.extend(label_batch.tolist())


            result['loss'].append(sum(bloss)/len(bloss))
            result['epoch'].append(epoch)
            print("Epoch:", epoch, "   Loss:", sum(bloss)/len(bloss),f"   Accuracy: {(accuracy_score(bpred, blabel)* 100):.4f}%")
            if os.path.exists(f"/ScamSolidityCodeDetection/ModelWeights/{mtype[0]}_{mtype[0]}_{len(hfeats)}_{gptype}_f{n_feats}") == False:
                os.mkdir(f"/ScamSolidityCodeDetection/ModelWeights/{mtype[0]}_{mtype[0]}_{len(hfeats)}_{gptype}_f{n_feats}")
            model.save(f"/ScamSolidityCodeDetection/ModelWeights/{mtype[0]}_{mtype[0]}_{len(hfeats)}_{gptype}_f{n_feats}/model_{os.path.basename(self.data_path)}_{str(epoch).zfill(2)}.pt")
            model.eval()
            with torch.no_grad():
                tpred, tlabel = [], []
                for tbatched_graph, tlabels in (tdataloader):
                    tbatched_graph, tlabels = tbatched_graph.to(model.device), tlabels.to(model.device)
                    tfeats = tbatched_graph.ndata['features']
                    out = model(tbatched_graph, tfeats)
                    preds = out.argmax(dim=1).long()
                    tpred.extend(preds.tolist())
                    tlabel.extend(tlabels.tolist())

                print(f'Val Accuracy: {(accuracy_score(tlabel, tpred) * 100):.2f}%')
                print(f'Val F1 Score: {(f1_score(np.array(tlabel), np.array(tpred)) * 100):.2f}%')
                print(f'Val Precision: {(precision_score(tlabel, tpred) * 100):.2f}%')
                print(f'Val Recall: {(recall_score(tlabel, tpred) * 100):.2f}%')
                result['val_acc'].append(accuracy_score(tlabel, tpred))
                result['val_f1'].append(f1_score(np.array(tlabel), np.array(tpred)))

        print("loss")
        plot(result["epoch"], result["loss"])
        print("val_acc")
        plot(result["epoch"], result["val_acc"])
        print("val_f1")
        plot(result["epoch"], result["val_f1"])
        return result
    
    def runtime_evaluation(self, tdataloader, mtype, n_feats, hfeats, n_gph, gptype, ginfeat):
        model = GFD(mtype=mtype, infeats=n_feats, hfeats=hfeats, fc1_layer=256, fc2_layer=64, n_gph=n_gph, outclass=2, gptype=gptype, ginfeat=ginfeat)
        model.to(model.device)
        print(model)
        # You need to change the model loading path
        model.load(f"/ScamSolidityCodeDetection/ModelWeights/{mtype[0]}_{mtype[0]}_{len(hfeats)}_{gptype}_f{n_feats}/model_{os.path.basename(self.data_path)}_00.pt")
        result = {
            "data": os.path.basename(self.data_path),
            "loss":[],
            "val_acc": [],
            "val_f1": [],
            "epoch": []
        }
        model.eval()
        with torch.no_grad():
            tpred, tlabel = [], []
            for tbatched_graph, tlabels in (tdataloader):
                tbatched_graph, tlabels = tbatched_graph.to(model.device), tlabels.to(model.device)
                tfeats = tbatched_graph.ndata['features']
                out = model(tbatched_graph, tfeats)
                preds = out.argmax(dim=1).long()
                tpred.extend(preds.tolist())
                tlabel.extend(tlabels.tolist())

            print(f'Val Accuracy: {(accuracy_score(tlabel, tpred) * 100):.2f}%')
            print(f'Val F1 Score: {(f1_score(np.array(tlabel), np.array(tpred)) * 100):.2f}%')
            print(f'Val Precision: {(precision_score(tlabel, tpred) * 100):.2f}%')
            print(f'Val Recall: {(recall_score(tlabel, tpred) * 100):.2f}%')
            result['val_acc'].append(accuracy_score(tlabel, tpred))
            result['val_f1'].append(f1_score(np.array(tlabel), np.array(tpred)))
        return result

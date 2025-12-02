#  Notebooks Folder
Welcome to the Notebooks section of the GraphFusionVulDetect project. This section lists the Jupyter notebooks used in various stages of the project.

## 1. Data Collecting & Preprocessing
Notebooks related to the collecting of data including Solidity Source Codes and Functions with Vulnerabilities.
- **[1.1 Data Collecting - Solidity SCs & Funcs from Papers's Data sources](SolDatasetCollection.ipynb)** - Run on Colab

## 2. Data Analysis
Notebooks related to the analysis of preprocessed data.
- **[2.1 Data Analysis - Solidity Source Codes](SolDataAnalyzer.ipynb)** - Run on Colab

## 3. Training CodeBERT to Extract Function's code Embeddings
Notebooks related to the training of CodeBERT to extract function's code embeddings.
- **[3.1 Node Feature Generation - Finetune CodeBERT on Reentrancy Function Dataset](FineTuneCodeBERT_Reen.ipynb)** - Run on Kaggle
- **[3.2 Node Feature Generation - Finetune CodeBERT on Timestamp Dependency Function Dataset](FineTuneCodeBERT_Time.ipynb)** - Run on Kaggle

## 4. Convert Solidity Source Codes to Graphs
Notebooks related to the conversion of Solidity Source Codes to Graphs.
- **[4.1 Data Modeling - Solidity Source Codes](Sol2GraphConverter.ipynb)** - Run on Kaggle

## 5. Training and Evaluating GNN Models on Smart Contracts Vulnerabilities Detection
Notebooks related to the training and evaluation of GNN models on Smart Contracts Vulnerabilities Detection.
- **[5.1 Data Evaluation - Solidity Source Codes](TrainingGFDModels.ipynb)** - Run on Kaggle

## 6. Running AI Agents to Detect Vulnerability Function and Generate Explanations
Notebooks related to the running of AI agents to detect vulnerability functions and generate explanations.
- **[6.1 Run AI Agents - Detect Reentrancy Vulnerability Functions](GenerateClassifyDataset_Reen.ipynb)** - Run on Kaggle
- **[6.2 Run AI Agents - Detect Timestamp Dependency Vulnerability Functions](GenerateClassifyDataset_Time.ipynb)** - Run on Kaggle

## 7. Training and Evaluating GNN Models on Function Vulnerabilities Detection / Node Classification
Notebooks related to the training and evaluation of GNN models on Function Vulnerabilities Detection / Node Classification.
- **[6.1 Data Evaluation - Solidity Functions](TrainingNodeClassification.ipynb)** - Run on Kaggle

## 9. Finetuning Qwen2.5-Coder-1.5B on Vulnerability Function Explanation
Notebooks related to the finetuning of Qwen2.5-Coder-1.5B on Vulnerability Function Explanation.
- **[7.1 Finetune Qwen2.5-Coder-1.5B on Vulnerability Function Explanation](FinetuneQwen25Coder.ipynb)** - Run on Colab

## 9. Apply GNNExplainer to Explain GNN Models Prediction Behavior
Notebooks related to the application of GNNExplainer to explain GNN models prediction behavior.
- **[8.1 GNNExplainer - Solidity Source Codes](GNNExplainerImplement.ipynb)** - Run on Kaggle

## 10. Compare to other State-of-the-Art Models on Smart Contracts Vulnerabilities Detection
Notebooks related to the comparison of current method with other state-of-the-art models on Smart Contracts Vulnerabilities Detection.
- **[6.1 Baseline Comparison - Peculiar](baselines/Peculiar/Peculiar.ipynb)** - Run on Kaggle
- **[6.2 Baseline Comparison - VulBERTa](VulBERTa.ipynb)** - Run on Kaggle
- **[6.3 Baseline Comparison - TMP](baselines/TMP/GNNSCVulDetector.ipynb)** - Run on Colab
- **[6.4 Baseline Comparison - AME](baselines/AME/AME.ipynb)** - Run on Colab
- **[6.5 Baseline Comparison - EARGCN](baselines/EA-RGCN/)** - Run on Kaggle
    - **[6.5.1 Training Dataset Processing - EARGCN](baselines/EA-RGCN/Data_processing/ea-rgcn-timestamp-sg-train.ipynb)** - Run on Kaggle
    - **[6.5.2 Testing Dataset Processing - EARGCN](baselines/EA-RGCN/Data_processing/ea-rgcn-timestamp-sg-test.ipynb)** - Run on Kaggle
    - **[6.5.3 Word2Vec Processing - EARGCN](baselines/EA-RGCN/Data_processing/ea-rgcn-timestamp-word2vec.ipynb)** - Run on Kaggle
    - **[6.5.4 Training EA-RGCN Model Processing - EARGCN](baselines/EA-RGCN/Training/ea-rgcn-timestamp-train.ipynb)** - Run on Kaggle
- **[6.7 Baseline Comparison - DeeSCVHunter](DeeSCVHunter.ipynb)** - Run on Kaggle

**Note:**
**+ 3 and 4 require a dataset on kaggle to run: [SC VulDetection Dataset](https://www.kaggle.com/datasets/quangnguyen711/sc-vuldetection-dataset), if you don't have permission to access please contact to nguyenquang71103@gmail.com.**
**+ 6.1 require a dataset on kaggle to run: [peculiar_dataset](https://www.kaggle.com/datasets/quangnguyen11037/peculiar-dataset), if you don't have permission to access please contact to nguyenquang9a3@gmail.com.**

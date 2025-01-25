#  Notebooks Folder
Welcome to the Notebooks section of the GraphFusionVulDetect project. This section lists the Jupyter notebooks used in various stages of the project.

## 1. Data Collecting & Preprocessing
Notebooks related to the collecting of data including Solidity Source Codes and Functions with Vulnerabilities.
- **[1.1 Data Collecting - Solidity SCs & Funcs from SmartBugs](notebooks/SolDataDownloaderSmartBugs.ipynb)** - Run on Colab
- **[1.2 Data Collecting - Solidity SCs & Funcs from HuggingFace](notebooks/SolDataDownloaderHuggingFace.ipynb)** - Run on Colab

## 2. Data Analysis
Notebooks related to the analysis of preprocessed data.
- **[2.1 Data Analysis - Solidity Source Codes](notebooks/SolDataAnalyzer.ipynb)** - Run on Colab

## 3. Training CodeBERT to Extract Function's code Embeddings
Notebooks related to the training of CodeBERT to extract function's code embeddings.
- **[3.1 Data Visualization - Solidity Source Codes](notebooks/FinetuneCodeBERTforNodeFeatureExtract.ipynb)** - Run on Kaggle

## 4. Convert Solidity Source Codes to Graphs
Notebooks related to the conversion of Solidity Source Codes to Graphs.
- **[4.1 Data Modeling - Solidity Source Codes](notebooks/Sol2GraphConverter.ipynb)** - Run on Colab

## 5. Training and Evaluating GNN Models on Smart Contracts Vulnerabilities Detection
Notebooks related to the training and evaluation of GNN models on Smart Contracts Vulnerabilities Detection.
- **[5.1 Data Evaluation - Solidity Source Codes](notebooks/TrainingGNNModels.ipynb)** - Run on Colab

## 6. Compare to other State-of-the-Art Models on Smart Contracts Vulnerabilities Detection
Notebooks related to the comparison of current method with other state-of-the-art models on Smart Contracts Vulnerabilities Detection.
- **[6.1 Baseline Comparison - Peculiar](notebooks/Peculiar.ipynb)** - Run on Kaggle
- **[6.2 Baseline Comparison - VulBERTa](notebooks/VulBERTa.ipynb)** - Run on Kaggle
- **[6.3 Baseline Comparison - TMP](notebooks/TMP.ipynb)** - Run on Colab
- **[6.4 Baseline Comparison - AME](notebooks/AME.ipynb)** - Run on Colab
- **[6.5 Baseline Comparison - MANDO](notebooks/MANDO.ipynb)** - Run on Colab
- **[6.6 Baseline Comparison - MANDO-HGT](notebooks/MANDO_HGT.ipynb)** - Run on Colab
- **[6.7 Baseline Comparison - DeeSCVHunter](notebooks/DeeSCVHunter.ipynb)** - Run on Colab
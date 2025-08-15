import matplotlib.pyplot as plt

# 1. Reentrancy - Internal Duplication
plt.figure(figsize=(8, 5))
categories = ['SmartBugs', 'Peculiar', 'DeeSCVHunter']
values = [SmartBugs_ratio[0], peculiar_ratio[0], DeeSCVHunter_ratio[0]]
plt.bar(categories, values, color=['#1f77b4', '#ff7f0e', '#2ca02c'])
plt.ylabel('Tỷ lệ (%)')
plt.title('Reentrancy - Internal Duplication')
plt.ylim(0, 100)
for i, v in enumerate(values):
    plt.text(i, v + 1, f'{v:.1f}%', ha='center', va='bottom')
plt.show()

# 2. Reentrancy - Train/Test Overlap
plt.figure(figsize=(8, 5))
values = [SmartBugs_ratio[1], peculiar_ratio[1], DeeSCVHunter_ratio[1]]
plt.bar(categories, values, color=['#1f77b4', '#ff7f0e', '#2ca02c'])
plt.ylabel('Tỷ lệ (%)')
plt.title('Reentrancy - Train/Test Overlap')
plt.ylim(0, 100)
for i, v in enumerate(values):
    plt.text(i, v + 0.5, f'{v:.1f}%', ha='center', va='bottom')
plt.show()

# 3. Timestamp - Internal Duplication
plt.figure(figsize=(10, 5))
categories = ['SmartBugs', 'DeeSCVHunter', 'SolAudit']
values = [SmartBugs_ratio[2], DeeSCVHunter_ratio[2], soliaudit_ratio[0]]
plt.bar(categories, values, color=['#1f77b4', '#2ca02c', '#d62728'])
plt.ylabel('Tỷ lệ (%)')
plt.title('Timestamp - Internal Duplication')
plt.ylim(0, 100)
for i, v in enumerate(values):
    plt.text(i, v + 1, f'{v:.1f}%', ha='center', va='bottom')
plt.show()

# 4. Timestamp - Train/Test Overlap
plt.figure(figsize=(10, 5))
values = [SmartBugs_ratio[3], DeeSCVHunter_ratio[3], soliaudit_ratio[1]]
plt.bar(categories, values, color=['#1f77b4', '#2ca02c', '#d62728'])
plt.ylabel('Tỷ lệ (%)')
plt.title('Timestamp - Train/Test Overlap')
plt.ylim(0, 100)
for i, v in enumerate(values):
    plt.text(i, v + 0.5, f'{v:.1f}%', ha='center', va='bottom')
plt.show()

from datasets import load_dataset

DATASET_NAME = "HuggingFaceH4/ultrachat_200k"

print(f"Downloading {DATASET_NAME}...")

dataset = load_dataset(DATASET_NAME)

print(dataset)
print("Dataset downloaded!")

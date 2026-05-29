from datasets import load_dataset

print("Downloading RP-Opus...")

dataset = load_dataset("taozi555/rp-opus")

print(dataset)
print("Dataset downloaded and cached!")
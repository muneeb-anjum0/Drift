#!/usr/bin/env python3
"""CPU-only cold-load/index/warm-query timings for the pinned research encoder."""

import argparse
import json
import os
import resource
import time
from pathlib import Path

from phase3e_semantic_dev import MODEL, REVISION


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    if os.environ.get("CUDA_VISIBLE_DEVICES") != "":
        raise SystemExit("set CUDA_VISIBLE_DEVICES='' for CPU-only probe")
    import torch
    import torch.nn.functional as functional
    from transformers import AutoModel, AutoTokenizer

    torch.set_num_threads(2)
    project = json.loads(args.dataset.read_bytes())["projects"][-1]
    requirements = [r["title"] + ". " + r["description"] for r in project["requirements"]]
    queries = [q["message"] for q in project["queries"]]
    start = time.perf_counter()
    tokenizer = AutoTokenizer.from_pretrained(MODEL, revision=REVISION, local_files_only=True)
    model = AutoModel.from_pretrained(MODEL, revision=REVISION, local_files_only=True).to("cpu").eval()
    cold_load = time.perf_counter() - start

    def encode(texts):
        vectors = []
        with torch.inference_mode():
            for offset in range(0, len(texts), 16):
                batch = tokenizer(texts[offset:offset + 16], padding=True, truncation=True,
                                  max_length=256, return_tensors="pt")
                output = model(**batch).last_hidden_state
                mask = batch["attention_mask"].unsqueeze(-1)
                pooled = (output * mask).sum(dim=1) / mask.sum(dim=1).clamp(min=1)
                vectors.extend(functional.normalize(pooled, p=2, dim=1).tolist())
        return vectors

    start = time.perf_counter()
    index = encode(requirements)
    index_seconds = time.perf_counter() - start
    start = time.perf_counter()
    warm = encode(queries)
    query_batch_seconds = time.perf_counter() - start
    start = time.perf_counter()
    for query in queries:
        vector = encode([query])[0]
        _ = [sum(a * b for a, b in zip(vector, req)) for req in index]
    sequential_query_seconds = time.perf_counter() - start
    output = {"role": "DEVELOPMENT_CPU_RESOURCE_PROBE", "model": MODEL, "revision": REVISION,
              "device": "cpu", "threads": 2, "requirements": len(requirements), "queries": len(queries),
              "dimension": len(index[0]), "model_load_after_import_seconds": cold_load,
              "requirement_index_seconds": index_seconds, "warm_query_batch_seconds": query_batch_seconds,
              "warm_query_sequential_with_similarity_seconds": sequential_query_seconds,
              "warm_query_sequential_mean_seconds": sequential_query_seconds / len(queries),
              "index_vector_bytes_float32": len(index) * len(index[0]) * 4,
              "peak_process_maxrss_kib": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
              "artifact_note": "Pinned weights already cached outside Git; approximately 88 MiB on this host.",
              "startup_note": "Python/torch/transformers import and OS disk-cache cold-start are excluded; this is not a true cold process startup measurement.",
              "cache_invalidation": "Rebuild requirement vectors when authorized project, baseline version, requirement text, encoder revision or pooling/normalization changes.",
              "failure_policy": "Research fails explicitly if pinned artifact is missing/corrupt; no silent algorithm fallback."}
    if len(warm) != len(queries):
        raise SystemExit("embedding count mismatch")
    args.output.write_text(json.dumps(output, indent=2) + "\n")
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()

# Label-Only 600-Case Kaggle Runbook

**Status: development baseline package prepared; no model calls or training have occurred.** The new 150-case locked test and old Phase III final are outside this workflow. Keep the Kaggle dataset and notebook **private**. On 10 November 2026, the user confirmed they can use the 600 reviewed cases; this authorizes the private Kaggle workflow, not public dataset publication.

## Why this model

The first baseline uses the unmodified, text-only [Qwen3-1.7B](https://huggingface.co/Qwen/Qwen3-1.7B) at revision `70d244cc86ccca08cf5af4e1e306ecf908b1ad5e`, under Apache 2.0. The two safetensors shards total about 4.06 GB. Float16 weights therefore leave appreciable room on an 8 GB GPU for the KV cache and runtime, unlike a 4B float16 model whose weights alone approach 8 GB. This is a **capacity rationale, not a claim of measured laptop fit or task accuracy**. The pinned hashes and non-thinking chat-template switch are in [`model_freeze_v1.json`](../ai_model/label_only_600/model_freeze_v1.json). Qwen's [model card](https://huggingface.co/Qwen/Qwen3-1.7B) documents the non-thinking switch. The frozen protocol still requires greedy decoding, so the baseline follows that protocol even though Qwen recommends sampling for general conversation.

## Local preparation

The normalized private split is at `evaluation/label_only_new/local_review/v1/`. Its reviewed, development, and train hashes matched [`protocol_freeze_v1.json`](../evaluation/label_only_new/protocol_freeze_v1.json) on 10 November 2026. The locked-test file was **not opened** for this preparation. The 36-case pilot, old closed development set, and old sealed final are excluded.

Build or verify the baseline ZIP locally:

```bash
cd /path/to/Drift
python ai_model/label_only_600/build_kaggle_baseline_bundle.py \
  --output .local/label_only_600/baseline_bundle_v1.zip
sha256sum .local/label_only_600/baseline_bundle_v1.zip
```

The existing local ZIP is `.local/label_only_600/baseline_bundle_v1.zip`, SHA-256 `57a3f1d07609a2d71a3f920eed8cbd09c5feb2684580bd194da7a22e9fe2d2e8`. The builder refuses to overwrite it. Its eight files are `development.csv`, frozen prompt, gate, protocol, parser/scorer, model freeze, Kaggle requirements, and baseline runner. It contains **no training or locked-test rows**. `.local/` and the private split are ignored by Git; never add them to a commit.

## Kaggle: private development baseline

1. On Kaggle, create a **private** dataset named, for example, `drift-label-only-600-dev-baseline`. Upload only `baseline_bundle_v1.zip`. Check that the dataset visibility says Private before saving. Do not upload the source review sheets, the 300 training rows, or the locked-test file at this stage.
2. Create a **private** notebook, attach that private dataset as Input, select one GPU accelerator, and enable Internet for the Hugging Face model download. Do not put tokens in code or output cells. If Kaggle asks for Hugging Face credentials, use its private Secrets facility; this public model should not require a token.
3. In a notebook cell, locate the ZIP and extract it. Expect exactly one match:

   ```python
   from pathlib import Path
   import zipfile

   matches = list(Path('/kaggle/input').rglob('baseline_bundle_v1.zip'))
   assert len(matches) == 1, matches
   with zipfile.ZipFile(matches[0]) as archive:
       assert archive.testzip() is None
       archive.extractall('/kaggle/working')
   bundle = Path('/kaggle/working/label_only_600_baseline')
   print('Bundle ready:', bundle)
   ```

4. Install the pinned user-space dependencies. Keep Kaggle's CUDA-compatible PyTorch build rather than installing a different CUDA stack:

   ```python
   import subprocess, sys
   subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', str(bundle / 'requirements-kaggle.txt')], check=True)
   ```

5. Run **preflight only**. It downloads the pinned public model and verifies its shard/config hashes, tokenizer template, dataset/protocol hashes, package versions, and GPU. It makes zero model calls and writes a manifest for inspection:

   ```python
   output = Path('/kaggle/working/label_only_600_baseline_run_v1')
   subprocess.run([sys.executable, str(bundle / 'kaggle_baseline.py'), 'preflight',
                   '--bundle', str(bundle), '--output', str(output)], check=True)
   print((output / 'preflight_manifest.json').read_text())
   ```

   Check the model revision, file hashes, `model_dtype: float16`, GPU, runtime versions, chat-template hash, and `model_calls: 0`. Keep this manifest with the result. If the model is unavailable or a hash differs, stop; do not substitute weights or edit the frozen prompt.

6. Once preflight is accepted, run the first-pass baseline and its fixed 30 repeats in the **same notebook runtime**:

   ```python
   subprocess.run([sys.executable, str(bundle / 'kaggle_baseline.py'), 'run',
                   '--bundle', str(bundle), '--output', str(output)], check=True)
   import json
   result = json.loads((output / 'score.json').read_text())
   print(result['decision'], result['correct'], result['macro_f1'],
         result['structurally_valid'], result['repeat']['label_agreement'])
   ```

   Do not edit, retry, repair, or cherry-pick model outputs. If the run fails partway through, preserve the incomplete evidence and diagnose it; the runner refuses to overwrite the first-pass files. Keep `primary.jsonl`, `repeat.jsonl`, `score.json`, and `preflight_manifest.json` private. Do not publish a notebook version with those outputs visible.

## Interpret the development gate

Read the full `score.json` confusion matrix and per-class scores, then apply the **already frozen** [`gate_v1.json`](../evaluation/label_only_new/gate_v1.json) result. `NO_TRAINING_JUSTIFIED` means stop the fine-tuning path. `TRAINING_EXPERIMENT_JUSTIFIED` permits a separately frozen, bounded LoRA experiment on the 300 training cases; it does not approve deployment. `INCONCLUSIVE` means fix the specific identity, format, repeatability, or gray-zone issue without changing the threshold after observing predictions. Do not use the locked test to resolve an inconclusive development result.

## If training is justified

Prepare a **separate private** training-only Kaggle dataset containing the 300-row `train.csv` with the frozen hash. Use the same model revision and same one-field label output contract. A training plan must freeze adapter rank, learning rate, batch/accumulation, epochs, seed, checkpoint selection, and exact software versions **before** any updates. Train label-only targets such as `{"label":"removed"}`; do not fabricate confidence, reasoning, or changed elements. Evaluate the adapter against the same 150 development IDs with the same prompt/parser/decoding, then compare paired class confusions and stability. Preserve raw evidence. The new locked test is reserved for a later separately approved final comparison, after all tuning and candidate selection are closed.

Before using a resulting adapter on the laptop, load the merged float16 model on the RTX 5050 and record peak VRAM, latency, and sustained power. Existing production weights and routes remain unchanged until a separate product integration and acceptance decision.

## Custody and reporting

The source review record says Muhammad Malik reviewed all 600, but the available final-only CSVs cannot establish who authored them or whether any proposed labels changed. Do not invent that history. The user confirmed the cases may be used on private Kaggle; the revision-history discrepancy remains unresolved. The synthetic, balanced 600-case set is useful for a controlled experiment but does not demonstrate performance on real customer traffic. Do not put private data, tokens, raw Kaggle outputs, or trained weights into Git.

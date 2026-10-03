"""Run frozen R0 and R5 retrieval on one human-reviewed dataset.

This is retrieval only. It never contacts the model. It refuses review drafts,
unreviewed labels, changed R5 source, and mismatched dataset hashes.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
R0_COMMIT = "d07fbb1544a9f190b314d264bb9c9a787b27fbe3"
R5_SOURCE_SHA256 = "04565fc32884031355c796a752c0b1691ff0dc4eb8c894f76d7ecb6e813b89ec"
GO_IMAGE = "golang:1.26.6-alpine"


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def run(args: list[str], **kwargs: object) -> None:
    subprocess.run(args, check=True, **kwargs)


def validate(dataset_path: Path, trail_path: Path, output_dir: Path) -> str:
    if output_dir.exists():
        raise ValueError("output directory exists; create a new run directory")
    raw = dataset_path.read_bytes()
    data = json.loads(raw)
    trail = json.loads(trail_path.read_bytes())
    if data.get("role") != "PROTECTED_INDEPENDENT_EVALUATION":
        raise ValueError("dataset is not a human-reviewed protected evaluation set")
    if trail.get("dataset_sha256") != sha256(raw):
        raise ValueError("review trail and dataset SHA-256 do not match")
    if not trail.get("reviewer") or trail.get("included_query_count", 0) < 20:
        raise ValueError("review is missing or too few cases remain")
    if any(item["decision"] not in {"CONFIRMED", "REVISED", "AMBIGUOUS", "EXCLUDE"} for item in trail["cases"]):
        raise ValueError("invalid review decision")
    if sha256((ROOT / "server-go/internal/modules/drift/drift_service.go").read_bytes()) != R5_SOURCE_SHA256:
        raise ValueError("R5 source differs from the Phase III-C freeze")
    if data.get("threshold") != 0.25 or data.get("max_selected") != 3:
        raise ValueError("retrieval threshold or cap differs from the freeze")
    return sha256(raw)


def evaluate(checkout: Path, dataset_path: Path, output_dir: Path, identity: str) -> None:
    docker_args = [
        "docker", "run", "--rm",
        "--mount", f"type=bind,src={checkout},dst=/repo,readonly",
        "--mount", f"type=bind,src={dataset_path},dst=/input/dataset.json,readonly",
        "--mount", f"type=bind,src={output_dir},dst=/output",
        "--mount", "type=volume,src=drift_go_mod_cache,dst=/go/pkg/mod",
        "--mount", "type=volume,src=drift_go_build_cache,dst=/root/.cache/go-build",
        "--workdir", "/repo/server-go",
        GO_IMAGE,
        "/usr/local/go/bin/go", "run", "./cmd/eval-retrieval",
        "--input", "/input/dataset.json",
        "--output", f"/output/{identity}.json",
        "--evaluation-id", f"phase-iii-d-{identity}",
    ]
    run(docker_args)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True, type=Path)
    parser.add_argument("--review-trail", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()
    dataset_path = args.dataset.resolve(strict=True)
    trail_path = args.review_trail.resolve(strict=True)
    output_dir = args.output_dir.resolve()
    dataset_hash = validate(dataset_path, trail_path, output_dir)
    output_dir.mkdir(parents=True, exist_ok=False)
    with tempfile.TemporaryDirectory(prefix="drift-phase3d-r0-") as temporary:
        checkout = Path(temporary) / "checkout"
        run(["git", "worktree", "add", "--detach", str(checkout), R0_COMMIT], cwd=ROOT)
        try:
            evaluate(checkout, dataset_path, output_dir, "R0")
        finally:
            run(["git", "worktree", "remove", str(checkout)], cwd=ROOT)
    evaluate(ROOT, dataset_path, output_dir, "R5")
    results = {}
    for identity in ("R0", "R5"):
        report = json.loads((output_dir / f"{identity}.json").read_bytes())
        if report["dataset"]["sha256"] != dataset_hash:
            raise ValueError(f"{identity} report dataset hash differs from reviewed freeze")
        results[identity] = report["metrics"]
    manifest = {
        "schema_version": 1,
        "dataset_sha256": dataset_hash,
        "r0_commit": R0_COMMIT,
        "r5_source_sha256": R5_SOURCE_SHA256,
        "reports": {"R0": "R0.json", "R5": "R5.json"},
        "metrics": results,
    }
    (output_dir / "comparison.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"dataset_sha256": dataset_hash, "r0_all": results["R0"]["all_expected_reached_count"], "r5_all": results["R5"]["all_expected_reached_count"]}))


if __name__ == "__main__":
    main()

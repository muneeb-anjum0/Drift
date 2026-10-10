"""Fail-closed, read-only check before a separately authorized staging run.

The checker never prints secret values. It does not start containers or deploy.
"""

from __future__ import annotations

import argparse
import hashlib
import ipaddress
import re
import subprocess
from pathlib import Path
from urllib.parse import urlparse


REPO = Path(__file__).resolve().parents[2]
MODEL_NAME = "DriftLedger-Qwen2.5-7B-Q4_K_M.gguf"
MODEL_SHA256 = "11e2ca8d10f6b52693256addca9b8f0d5bb01eebc53594b531586ea992419ac9"
SAFE_MONGO_CREDENTIAL = re.compile(r"[A-Za-z0-9._~-]+\Z")


def read_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for number, raw in enumerate(path.read_text().splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            raise ValueError(f"Invalid env line {number}")
        key, value = line.split("=", 1)
        key = key.strip()
        if not re.fullmatch(r"[A-Z][A-Z0-9_]*", key) or key in values:
            raise ValueError(f"Invalid or duplicate env key on line {number}")
        values[key] = value.strip()
    return values


def validate(values: dict[str, str]) -> Path:
    release_id = values.get("STAGING_RELEASE_ID", "")
    if not re.fullmatch(r"[0-9a-f]{40}", release_id):
        raise ValueError("STAGING_RELEASE_ID must be a full reviewed Git commit SHA")
    origin = urlparse(values.get("STAGING_CLIENT_ORIGIN", ""))
    if (
        origin.scheme != "https"
        or not origin.hostname
        or origin.hostname in {"localhost", "127.0.0.1", "staging.example.invalid"}
        or origin.path not in {"", "/"}
        or origin.query
        or origin.fragment
        or origin.username
        or origin.password
    ):
        raise ValueError("STAGING_CLIENT_ORIGIN must be a dedicated HTTPS origin")
    for key in ("STAGING_JWT_SECRET", "STAGING_INFERENCE_API_KEY"):
        value = values.get(key, "")
        if len(value) < 32 or any(marker in value.lower() for marker in ("replace", "example", "changeme")):
            raise ValueError(f"{key} must be a distinct non-placeholder secret of at least 32 characters")
    if values["STAGING_JWT_SECRET"] == values["STAGING_INFERENCE_API_KEY"]:
        raise ValueError("Staging JWT and inference secrets must differ")
    user = values.get("STAGING_MONGO_USER", "")
    password = values.get("STAGING_MONGO_PASSWORD", "")
    if not SAFE_MONGO_CREDENTIAL.fullmatch(user) or not SAFE_MONGO_CREDENTIAL.fullmatch(password) or len(password) < 24:
        raise ValueError("Staging Mongo credentials must be URL-safe; password must be at least 24 characters")
    if values.get("STAGING_FIREBASE_STORAGE_ENABLED", "false").lower() != "false":
        raise ValueError("Initial staging requires uploaded-file storage disabled until separately reviewed")
    if values.get("STAGING_FIREBASE_STORAGE_BUCKET", "") or values.get("STAGING_GOOGLE_APPLICATION_CREDENTIALS", ""):
        raise ValueError("Initial staging must not reference any cloud-storage bucket or credential")
    try:
        port = int(values.get("STAGING_HTTP_PORT", "5174"))
    except ValueError as exc:
        raise ValueError("STAGING_HTTP_PORT must be an integer") from exc
    if not 1024 <= port <= 65535:
        raise ValueError("STAGING_HTTP_PORT must be an unprivileged port")
    try:
        subnet = ipaddress.ip_network(values.get("STAGING_NETWORK_SUBNET", ""), strict=True)
        addresses = {
            key: ipaddress.ip_address(values.get(key, ""))
            for key in (
                "STAGING_DB_IP",
                "STAGING_LLAMA_IP",
                "STAGING_INFERENCE_IP",
                "STAGING_BACKEND_IP",
                "STAGING_FRONTEND_IP",
                "STAGING_TLS_PROXY_IP",
            )
        }
    except ValueError as exc:
        raise ValueError("Staging network and service/ingress IPs must be valid") from exc
    if subnet.version != 4 or subnet.prefixlen < 24 or any(ip not in subnet.hosts() for ip in addresses.values()):
        raise ValueError("Staging service/ingress IPs must be IPv4 hosts in a /24-or-narrower subnet")
    if len(set(addresses.values())) != len(addresses) or subnet.network_address + 1 in addresses.values():
        raise ValueError("Staging service/ingress IPs must be unique and must not use the Docker gateway")
    source = Path(values.get("STAGING_ORIGINAL_GGUF", ""))
    if not source.is_absolute() or source.name != MODEL_NAME or source.is_symlink() or not source.is_file():
        raise ValueError("STAGING_ORIGINAL_GGUF must be an existing absolute, non-symlink original-GGUF file")
    source = source.resolve()
    if source.is_relative_to(REPO):
        raise ValueError("Staging model must be a separately custodied copy outside the repository")
    return source


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", type=Path, default=Path(".env.staging"))
    args = parser.parse_args()
    try:
        values = read_env(args.env_file)
        source = validate(values)
        if sha256(source) != MODEL_SHA256:
            raise ValueError("Staging GGUF SHA-256 does not match the selected original model")
        head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=REPO, text=True).strip()
        if head != values["STAGING_RELEASE_ID"]:
            raise ValueError("Staging release ID does not match the source checkout")
        if subprocess.check_output(["git", "status", "--porcelain", "--untracked-files=all"], cwd=REPO, text=True).strip():
            raise ValueError("Staging source checkout must be clean")
    except (OSError, ValueError, subprocess.CalledProcessError) as exc:
        parser.exit(1, f"STAGING_PREFLIGHT_FAIL: {exc}\n")
    print(f"STAGING_PREFLIGHT_PASS: original GGUF SHA-256 {MODEL_SHA256}; no services started")


if __name__ == "__main__":
    main()

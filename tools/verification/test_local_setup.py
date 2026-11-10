"""Exercise the first-run script without starting Docker or touching real data."""

import base64
import os
import shutil
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_first_run_creates_private_unique_config_and_preserves_it(tmp_path):
    (tmp_path / "scripts").mkdir()
    (tmp_path / "bin").mkdir()
    shutil.copy2(ROOT / "scripts/setup-local.sh", tmp_path / "scripts/setup-local.sh")
    shutil.copy2(ROOT / ".env.example", tmp_path / ".env.example")
    docker = tmp_path / "bin/docker"
    docker.write_text(
        '#!/bin/sh\ncase "$1 $2" in\n'
        '  "info "|"compose version"|"compose config"|"compose up") exit 0;;\n'
        '  *) exit 1;;\nesac\n'
    )
    docker.chmod(0o755)
    env = {**os.environ, "PATH": f"{tmp_path / 'bin'}:{os.environ['PATH']}"}

    def run_setup():
        return subprocess.run(
            [str(tmp_path / "scripts/setup-local.sh")],
            env=env,
            text=True,
            capture_output=True,
            check=True,
        )

    first = run_setup()
    contents = (tmp_path / ".env").read_bytes()
    settings = dict(
        line.split("=", 1)
        for line in contents.decode().splitlines()
        if "=" in line and not line.startswith("#")
    )
    assert len(settings["JWT_SECRET"]) == 64
    assert len(settings["DRIFT_INFERENCE_API_KEY"]) == 64
    assert settings["JWT_SECRET"] != settings["DRIFT_INFERENCE_API_KEY"]
    assert len(base64.b64decode(settings["DRIFT_PROVIDER_MASTER_KEY"])) == 32
    assert settings["COMPOSE_PROJECT_NAME"].startswith("drift-")
    assert (tmp_path / ".env").stat().st_mode & 0o777 == 0o600
    assert settings["JWT_SECRET"] not in first.stdout

    run_setup()
    assert (tmp_path / ".env").read_bytes() == contents

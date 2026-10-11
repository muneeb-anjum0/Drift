import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_local_compose_exposes_only_loopback_ui_and_api():
    result = subprocess.run(
        [
            "docker",
            "compose",
            "--env-file",
            ".env.example",
            "--profile",
            "model",
            "config",
            "--format",
            "json",
        ],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    services = json.loads(result.stdout)["services"]

    for service in services.values():
        assert "container_name" not in service

    for name in ("db", "inference", "llama"):
        assert not services[name].get("ports")

    for name in ("frontend", "backend"):
        ports = services[name]["ports"]
        assert len(ports) == 1
        assert ports[0]["host_ip"] == "127.0.0.1"

    assert services["frontend"]["ports"][0]["published"] == "5173"
    assert services["backend"]["ports"][0]["published"] == "5000"


def test_gpu_override_does_not_keep_cpu_only_flags():
    result = subprocess.run(
        [
            "docker",
            "compose",
            "--env-file",
            ".env.example",
            "-f",
            "docker-compose.yml",
            "-f",
            "docker-compose.gpu.yml",
            "--profile",
            "model",
            "config",
            "--format",
            "json",
        ],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    command = json.loads(result.stdout)["services"]["llama"]["command"]
    assert "--device" not in command
    layers = command[command.index("--n-gpu-layers") + 1]
    assert int(layers) > 0

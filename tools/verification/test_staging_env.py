from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from tools.verification.check_staging_env import MODEL_NAME, validate


class StagingEnvTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory(prefix="drift-staging-env-test-")
        self.addCleanup(self.temp.cleanup)
        self.model = Path(self.temp.name) / MODEL_NAME
        self.model.write_bytes(b"synthetic test bytes, not a GGUF")
        self.values = {
            "STAGING_CLIENT_ORIGIN": "https://staging.test.example.org",
            "STAGING_RELEASE_ID": "a" * 40,
            "STAGING_JWT_SECRET": "unit-test-jwt-secret-longer-than-32-characters",
            "STAGING_INFERENCE_API_KEY": "unit-test-inference-key-longer-than-32-characters",
            "STAGING_MONGO_USER": "drift_staging_admin",
            "STAGING_MONGO_PASSWORD": "unit-test-mongo-password-long-enough",
            "STAGING_ORIGINAL_GGUF": str(self.model),
            "STAGING_NETWORK_SUBNET": "172.30.41.0/24",
            "STAGING_DB_IP": "172.30.41.2",
            "STAGING_LLAMA_IP": "172.30.41.3",
            "STAGING_INFERENCE_IP": "172.30.41.4",
            "STAGING_BACKEND_IP": "172.30.41.5",
            "STAGING_FRONTEND_IP": "172.30.41.6",
            "STAGING_TLS_PROXY_IP": "172.30.41.11",
            "STAGING_FIREBASE_STORAGE_ENABLED": "false",
        }

    def test_valid_shape_resolves_dedicated_model_path(self) -> None:
        self.assertEqual(validate(self.values), self.model)

    def test_placeholder_origin_is_rejected(self) -> None:
        self.values["STAGING_CLIENT_ORIGIN"] = "https://staging.example.invalid"
        with self.assertRaisesRegex(ValueError, "dedicated HTTPS origin"):
            validate(self.values)

    def test_shared_secrets_are_rejected(self) -> None:
        self.values["STAGING_INFERENCE_API_KEY"] = self.values["STAGING_JWT_SECRET"]
        with self.assertRaisesRegex(ValueError, "must differ"):
            validate(self.values)

    def test_non_original_model_name_is_rejected(self) -> None:
        self.values["STAGING_ORIGINAL_GGUF"] = str(Path(self.temp.name) / "rejected.gguf")
        with self.assertRaisesRegex(ValueError, "original-GGUF"):
            validate(self.values)

    def test_cloud_storage_requires_separate_review(self) -> None:
        self.values["STAGING_FIREBASE_STORAGE_ENABLED"] = "true"
        with self.assertRaisesRegex(ValueError, "storage disabled"):
            validate(self.values)

    def test_proxy_peer_must_be_inside_dedicated_subnet(self) -> None:
        self.values["STAGING_TLS_PROXY_IP"] = "198.51.100.2"
        with self.assertRaisesRegex(ValueError, "IPv4 hosts"):
            validate(self.values)

    def test_proxy_cannot_overlap_backend(self) -> None:
        self.values["STAGING_TLS_PROXY_IP"] = self.values["STAGING_BACKEND_IP"]
        with self.assertRaisesRegex(ValueError, "must be unique"):
            validate(self.values)

    def test_service_cannot_claim_docker_gateway(self) -> None:
        self.values["STAGING_DB_IP"] = "172.30.41.1"
        with self.assertRaisesRegex(ValueError, "Docker gateway"):
            validate(self.values)


if __name__ == "__main__":
    unittest.main()

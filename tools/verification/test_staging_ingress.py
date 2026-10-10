from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_staging_ingress_template_preserves_security_boundaries():
    config = (ROOT / "deploy/staging-ingress.nginx.example.conf").read_text()
    assert "return 301 https://staging.example.invalid$request_uri;" in config
    assert "location /api/ {\n        proxy_pass http://backend:5000;" in config
    assert "location / {\n        proxy_pass http://frontend:80;" in config
    assert "proxy_set_header X-Forwarded-For $remote_addr;" in config
    assert "$proxy_add_x_forwarded_for" not in config
    assert "add_header Strict-Transport-Security" in config
    assert "ssl_certificate_key /run/secrets/staging_tls.key;" in config
    assert "http://inference:" not in config
    assert "http://db:" not in config

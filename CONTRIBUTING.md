# Contributing to Drift

Thanks for helping improve Drift. The normal first run needs Git and Docker Compose:

```sh
git clone https://github.com/muneeb-anjum0/Drift.git
cd Drift
./scripts/setup-local.sh
```

Open `http://localhost:5173`. The core project and scope workflow works without a model. The source repository does not distribute the original GGUF, provider keys, private research archives, or final holdout material. Do not add any of these to a commit or issue. See [development](docs/development.md) for manual setup and verification commands.

For a code change, describe the user-facing behavior and the boundary it touches. Run `npm run lint` and `npm run build` for frontend changes. The [CI workflow](.github/workflows/verify.yml) also runs Go, Python, Mongo integration, security checks, and model-free browser tests. Keep tests that cover authorization, tenant isolation, preview replay, and failure behavior intact.

The model's output is advisory. A contribution must not present estimated effort or model confidence as verified fact, bypass a human decision, weaken the frozen research gates, or promote the rejected Phase III-J candidate. Changes to the model contract or evaluation require a separately reviewed plan and independent evidence.

Drift is licensed under [Apache 2.0](LICENSE). Contributions intentionally submitted for inclusion follow that license's contribution terms.

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TARGETS = [ROOT / "automation" / "sales", ROOT / "automation" / "sns"]
TEXT_SUFFIXES = {".py", ".js", ".json", ".md", ".yml", ".yaml", ".toml", ".txt", ".html", ".gs"}

# Only flag high-confidence secret material, not variable names or documentation placeholders.
FORBIDDEN = [
    ("LINE channel secret assignment", re.compile(r"LINE_CHANNEL_SECRET\s*[:=]\s*['\"][A-Za-z0-9+/=_-]{20,}['\"]")),
    ("LINE access token assignment", re.compile(r"LINE_CHANNEL_ACCESS_TOKEN\s*[:=]\s*['\"][A-Za-z0-9+/=._-]{30,}['\"]")),
    ("private sink shared secret assignment", re.compile(r"PRIVATE_SINK_SHARED_SECRET\s*[:=]\s*['\"][^'\"]{12,}['\"]")),
    ("generic private key", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
]

SKIP_PARTS = {"output", "node_modules", "__pycache__"}


def iter_files():
    for base in TARGETS:
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
                continue
            if any(part in SKIP_PARTS for part in path.parts):
                continue
            yield path


def scan() -> list[str]:
    findings: list[str] = []
    for path in iter_files():
        text = path.read_text(encoding="utf-8", errors="ignore")
        for label, pattern in FORBIDDEN:
            if pattern.search(text):
                findings.append(f"{path.relative_to(ROOT)}: {label}")
    return findings


def main() -> None:
    findings = scan()
    if findings:
        print("High-confidence secret material detected:", file=sys.stderr)
        for finding in findings:
            print(f"- {finding}", file=sys.stderr)
        raise SystemExit(1)
    print("sales/sns secret safety scan passed")


if __name__ == "__main__":
    main()

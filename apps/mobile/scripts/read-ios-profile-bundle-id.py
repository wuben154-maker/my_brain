#!/usr/bin/env python3
"""Extract bundle identifier from an Apple mobileprovision file."""
from __future__ import annotations

import plistlib
import subprocess
import sys


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: read-ios-profile-bundle-id.py <profile.mobileprovision>", file=sys.stderr)
        return 1

    profile_path = sys.argv[1]
    profile = subprocess.check_output(["security", "cms", "-D", "-i", profile_path])
    data = plistlib.loads(profile)
    entitlements = data.get("Entitlements") or {}

    app_id = entitlements.get("application-identifier")
    if not app_id:
        for value in entitlements.values():
            if isinstance(value, str) and value.count(".") >= 2:
                app_id = value
                break

    if not app_id or "." not in app_id:
        print("Could not resolve application-identifier from profile", file=sys.stderr)
        return 1

    print(app_id.split(".", 1)[1])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

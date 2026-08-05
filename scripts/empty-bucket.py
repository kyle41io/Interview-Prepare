#!/usr/bin/env python3
"""Delete every object, version and delete marker in an S3 bucket.

Used by .github/workflows/destroy-legacy.yml. Terraform cannot delete a
non-empty bucket unless force_destroy was set at apply time, and setting it now
would mean applying the legacy stack purely in order to tear it down.

Why not `aws s3 rm --recursive`: the content bucket is versioned, so removing
current objects leaves noncurrent versions and delete markers behind and the
bucket stays non-empty. Versions and delete markers are therefore swept
together.

Why a loop: list-object-versions returns at most 1000 entries per page and
delete-objects accepts at most 1000 per call, so a single pass would silently
leave the remainder in place.

Shells out to the AWS CLI rather than using boto3, which is not guaranteed to be
present on the runner.
"""

import json
import subprocess
import sys

BATCH = 1000


def aws_json(*args: str) -> dict:
    out = subprocess.run(
        ["aws", *args, "--output", "json"],
        check=True, capture_output=True, text=True,
    ).stdout.strip()
    return json.loads(out) if out else {}


def list_entries(bucket: str) -> list[dict]:
    page = aws_json("s3api", "list-object-versions", "--bucket", bucket)
    return [
        {"Key": o["Key"], "VersionId": o["VersionId"]}
        # A versioned bucket needs both: deleting only Versions leaves the
        # delete markers, which still count as content.
        for key in ("Versions", "DeleteMarkers")
        for o in page.get(key) or []
    ]


def delete(bucket: str, entries: list[dict]) -> None:
    for i in range(0, len(entries), BATCH):
        payload = json.dumps({"Objects": entries[i:i + BATCH], "Quiet": True})
        subprocess.run(
            ["aws", "s3api", "delete-objects", "--bucket", bucket, "--delete", payload],
            check=True, stdout=subprocess.DEVNULL,
        )


def empty(bucket: str) -> int:
    total = 0
    while True:
        entries = list_entries(bucket)
        if not entries:
            return total
        delete(bucket, entries)
        total += len(entries)
        print(f"  removed {len(entries)} entries ({total} total)", flush=True)


def main() -> int:
    if len(sys.argv) != 2:
        print(f"usage: {sys.argv[0]} BUCKET", file=sys.stderr)
        return 2
    bucket = sys.argv[1]
    print(f"emptying {bucket}", flush=True)
    print(f"{bucket} is empty ({empty(bucket)} entries removed)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

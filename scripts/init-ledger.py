import os
import subprocess

os.chdir("/mnt/c/Users/moham/Documents/GitHub/drunix/drunix/drunix-network/test-network")
env = os.environ.copy()
env["PATH"] = "/home/haris/.local/go/bin:/home/haris/.local/bin:" + env.get("PATH", "")
env.pop("DOCKER_HOST", None)
subprocess.check_call(
    [
        "./network.sh",
        "cc",
        "invoke",
        "-c",
        "mychannel",
        "-ccn",
        "escrow",
        "-ccic",
        '{"Args":["InitLedger"]}',
    ],
    env=env,
)
print("INIT_OK")

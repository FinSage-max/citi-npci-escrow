import os
import subprocess

os.chdir("/mnt/c/Users/moham/Documents/GitHub/drunix/drunix/drunix-network/test-network")
env = os.environ.copy()
env["PATH"] = "/home/haris/.local/go/bin:/home/haris/.local/bin:" + env.get("PATH", "")
env.pop("DOCKER_HOST", None)


def run(args):
    print("\n===", " ".join(args[3:8]), "===")
    subprocess.check_call(args, env=env)


run(
    [
        "./network.sh",
        "cc",
        "query",
        "-c",
        "mychannel",
        "-ccn",
        "escrow",
        "-ccqc",
        '{"Args":["GetAllEscrows"]}',
    ]
)
run(
    [
        "./network.sh",
        "cc",
        "query",
        "-c",
        "mychannel",
        "-ccn",
        "escrow",
        "-ccqc",
        '{"Args":["GetEscrowHistory","ESC-1001"]}',
    ]
)

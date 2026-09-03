#!/usr/bin/env python3
"""Validate the exported ONNX mask against the reference PyTorch model.

Runs both the PyTorch ISNet primary-mask model and the exported ONNX model on a
batch of deterministic random inputs (fixed seed, so runs are reproducible) and
compares the resulting masks. Fails (non-zero exit) unless:

    mean absolute error  <= 0.005
    99th-percentile error <= 0.03

These bounds mirror the project's accuracy gate for the fp16 export: small
average drift is fine, but no pixel should be wildly off.

Usage (deps resolved from tooling/pyproject.toml via uv):
  uv run validate_onnx.py \
    --weights /path/to/isnet-general-use.pth \
    --onnx ./build/isnet-general-use-1024.onnx \
    --resolution 1024 --samples 4
"""

import argparse
import os
import sys

import numpy as np
import torch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "dis"))
from isnet import ISNetDIS  # noqa: E402

INPUT_NAME = "input"
OUTPUT_NAME = "output"
MAE_THRESHOLD = 0.005
P99_THRESHOLD = 0.03


def load_torch_model(weights_path: str) -> torch.nn.Module:
    net = ISNetDIS(in_ch=3, out_ch=1)
    state = torch.load(weights_path, map_location="cpu")
    if isinstance(state, dict) and "model" in state and isinstance(state["model"], dict):
        state = state["model"]
    net.load_state_dict(state)
    net.eval()
    return net


def torch_mask(net: torch.nn.Module, x: np.ndarray) -> np.ndarray:
    with torch.no_grad():
        side_outputs, _ = net(torch.from_numpy(x))
    return side_outputs[0].cpu().numpy()


def onnx_mask(session, x: np.ndarray) -> np.ndarray:
    outputs = session.run([OUTPUT_NAME], {INPUT_NAME: x})
    return outputs[0]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--weights", required=True)
    parser.add_argument("--onnx", required=True)
    parser.add_argument("--resolution", type=int, default=1024)
    parser.add_argument("--samples", type=int, default=4)
    parser.add_argument("--seed", type=int, default=1234)
    args = parser.parse_args()

    import onnxruntime as ort

    rng = np.random.default_rng(args.seed)
    net = load_torch_model(args.weights)
    session = ort.InferenceSession(args.onnx, providers=["CPUExecutionProvider"])

    abs_errors = []
    for i in range(args.samples):
        # Inputs in the same normalized range the frontend produces: v/255 - 0.5.
        x = (rng.random((1, 3, args.resolution, args.resolution), dtype=np.float32) - 0.5)
        ref = torch_mask(net, x)
        got = onnx_mask(session, x)
        if ref.shape != got.shape:
            print(f"shape mismatch: torch {ref.shape} vs onnx {got.shape}", file=sys.stderr)
            return 2
        err = np.abs(ref - got).ravel()
        abs_errors.append(err)
        print(f"sample {i}: mae={err.mean():.6f} p99={np.percentile(err, 99):.6f}")

    all_err = np.concatenate(abs_errors)
    mae = float(all_err.mean())
    p99 = float(np.percentile(all_err, 99))

    print(f"\nOverall MAE={mae:.6f} (threshold {MAE_THRESHOLD})")
    print(f"Overall P99={p99:.6f} (threshold {P99_THRESHOLD})")

    if mae > MAE_THRESHOLD or p99 > P99_THRESHOLD:
        print("FAIL: ONNX export deviates from PyTorch beyond allowed tolerance.", file=sys.stderr)
        return 1

    print("PASS: ONNX export matches PyTorch within tolerance.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

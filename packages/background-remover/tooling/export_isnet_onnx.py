#!/usr/bin/env python3
"""Export the DIS ISNet general-use checkpoint to a fixed 1024x1024 ONNX model.

The exported graph:
  * takes a single float32 input "input" of shape [1, 3, 1024, 1024]
    (RGB, normalized by the *frontend* as v/255 - 0.5; this script does not
    bake normalization into the graph),
  * emits a single float32 output "output" of shape [1, 1, 1024, 1024], the
    primary sigmoid mask (side output d1) — all other side outputs are dropped,
  * has FP16 internal weights/compute (via onnxconverter-common), while keeping
    the graph's input and output in float32 so callers never deal with fp16
    tensors in JavaScript.

This script does NOT download weights. Point --weights at a local copy of
`isnet-general-use.pth` obtained from the DIS project. See tooling/README.md for
model provenance and the upstream licensing record.

Usage (deps resolved from tooling/pyproject.toml via uv):
  uv run export_isnet_onnx.py \
    --weights /path/to/isnet-general-use.pth \
    --out ./build/isnet-general-use-1024.onnx \
    --resolution 1024
"""

import argparse
import os
import sys

import torch
import torch.nn as nn

# Import the pinned, Apache-2.0 DIS architecture vendored alongside this script.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "dis"))
from isnet import ISNetDIS  # noqa: E402

INPUT_NAME = "input"
OUTPUT_NAME = "output"


class ISNetPrimaryMask(nn.Module):
    """Wrap ISNetDIS so the graph has a single tensor output (the d1 sigmoid mask).

    ISNetDIS.forward returns (side_outputs, features); side_outputs[0] is the
    highest-resolution mask and the only one used for cutouts.
    """

    def __init__(self, net: ISNetDIS) -> None:
        super().__init__()
        self.net = net

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        side_outputs, _features = self.net(x)
        return side_outputs[0]


def load_model(weights_path: str) -> ISNetPrimaryMask:
    net = ISNetDIS(in_ch=3, out_ch=1)
    state = torch.load(weights_path, map_location="cpu")
    # Checkpoints in the wild are sometimes nested under a key; accept either.
    if isinstance(state, dict) and "model" in state and isinstance(state["model"], dict):
        state = state["model"]
    net.load_state_dict(state)
    net.eval()
    return ISNetPrimaryMask(net).eval()


def make_webgpu_compatible(model: nn.Module) -> int:
    """Disable ceil-mode pooling, which ONNX Runtime WebGPU cannot execute.

    The published graph has a fixed power-of-two input resolution, so every
    MaxPool receives even spatial dimensions and floor/ceil mode are equivalent.
    Validation against the untouched reference model still guards that
    assumption before a model can be published.
    """
    changed = 0
    for module in model.modules():
        if isinstance(module, nn.MaxPool2d) and module.ceil_mode:
            module.ceil_mode = False
            changed += 1
    return changed


def export_fp32(model: nn.Module, out_path: str, resolution: int) -> None:
    dummy = torch.zeros(1, 3, resolution, resolution, dtype=torch.float32)
    export_kwargs = dict(
        input_names=[INPUT_NAME],
        output_names=[OUTPUT_NAME],
        opset_version=17,
        do_constant_folding=True,
        dynamic_axes=None,  # fixed 1x3xRxR input, fixed 1x1xRxR output
    )
    # ISNet uses deprecated ops (F.upsample, F.sigmoid); the legacy TorchScript
    # exporter handles this graph reliably. Newer torch defaults to the dynamo
    # exporter (dynamo=True) which needs onnxscript and is finickier here, so
    # pin to the legacy path when this torch version supports the flag.
    try:
        torch.onnx.export(model, dummy, out_path, dynamo=False, **export_kwargs)
    except TypeError:
        # Older torch without a `dynamo` parameter: legacy exporter is default.
        torch.onnx.export(model, dummy, out_path, **export_kwargs)


def to_fp16_internal(fp32_path: str, fp16_path: str) -> None:
    """Convert internal compute to FP16 while keeping graph I/O in float32."""
    import onnx
    from onnxconverter_common import float16

    model = onnx.load(fp32_path)
    converted = float16.convert_float_to_float16(
        model,
        keep_io_types=True,  # input/output stay float32
        disable_shape_infer=False,
    )
    onnx.save(converted, fp16_path)


def maybe_simplify(path: str) -> None:
    try:
        import onnx
        from onnxsim import simplify
    except ImportError:
        print("onnxsim not installed; skipping simplification.")
        return
    model = onnx.load(path)
    simplified, ok = simplify(model)
    if ok:
        onnx.save(simplified, path)
        print("Simplified ONNX graph.")
    else:
        print("onnxsim could not validate the simplified model; keeping original.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--weights", required=True, help="Path to isnet-general-use.pth")
    parser.add_argument("--out", required=True, help="Output .onnx path (fp16 internals)")
    parser.add_argument("--resolution", type=int, default=1024)
    parser.add_argument("--keep-fp32", action="store_true", help="Also keep the intermediate fp32 model")
    parser.add_argument("--no-simplify", action="store_true")
    args = parser.parse_args()

    os.makedirs(os.path.dirname(os.path.abspath(args.out)) or ".", exist_ok=True)
    fp32_path = args.out.replace(".onnx", ".fp32.onnx")

    print(f"Loading weights from {args.weights} ...")
    model = load_model(args.weights)
    changed_pools = make_webgpu_compatible(model)
    print(f"Rewrote {changed_pools} ceil-mode pools for ONNX Runtime WebGPU.")

    print(f"Exporting fp32 ONNX at {args.resolution}x{args.resolution} ...")
    export_fp32(model, fp32_path, args.resolution)

    print("Converting internal compute to fp16 (float32 I/O preserved) ...")
    to_fp16_internal(fp32_path, args.out)

    if not args.no_simplify:
        maybe_simplify(args.out)

    if not args.keep_fp32:
        os.remove(fp32_path)

    print(f"Wrote {args.out}")
    print("Next: validate with validate_onnx.py, then build a manifest with build_manifest.mjs.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

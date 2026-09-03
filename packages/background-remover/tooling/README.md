# Model export & publishing tooling

This directory produces the ONNX model and manifest that
`@sardrobe/background-remover` loads at runtime. It is **isolated tooling**: it is
not bundled into the package's runtime code and is only run by a maintainer when
cutting a new model release.

The model is the DIS **ISNet general-use** network. The architecture is vendored
verbatim under [`dis/isnet.py`](./dis/isnet.py) (Apache-2.0, © the DIS authors —
see the header in that file). Nothing here downloads weights for you.

## Model provenance and licensing

The checkpoint used for export is the official `isnet-general-use.pth` released
by the DIS authors and linked from the upstream DIS README:

- Project: https://github.com/xuebinqin/DIS
- License: https://github.com/xuebinqin/DIS/blob/main/LICENSE.md
- Weight announcement and download links:
  https://github.com/xuebinqin/DIS#updates-

The upstream README expressly says that the DIS code and evaluation metric use
Apache License 2.0. The checkpoint is hosted separately on Google Drive and
Baidu Pan, and the upstream project does not state a separate license for that
file. Accordingly, Sardrobe attributes the model to the DIS authors but does
not independently label the pretrained weights as Apache-2.0.

The published ONNX file is a mechanical conversion of that official checkpoint:
FP16 internal tensors, float32 input/output, a single primary-mask output, and
WebGPU-compatible pooling. Keep the source checkpoint, conversion command,
manifest checksum, and validation result with each immutable model release.

## Prerequisites

A machine with the `isnet-general-use.pth` checkpoint and [uv](https://docs.astral.sh/uv/).
Dependencies are declared in `pyproject.toml`; `uv run` resolves and installs
them into an isolated environment on first use — no manual venv/activate.

```sh
uv sync   # optional: pre-resolve the environment; `uv run` does this on demand
```

## 1. Export to ONNX (1024², fp16 internals, float32 I/O)

```sh
uv run export_isnet_onnx.py \
  --weights isnet-general-use.pth \
  --out ./build/isnet-general-use-1024.onnx \
  --resolution 1024
```

The exported graph has one input `input` (`float32[1,3,1024,1024]`) and one
output `output` (`float32[1,1,1024,1024]`), the primary sigmoid mask (DIS side
output `d1`). All other side outputs are dropped. Internal weights/compute are
fp16; the graph I/O stays float32 so the JS runtime never handles fp16 tensors.
The export wrapper disables MaxPool ceil mode for ONNX Runtime WebGPU
compatibility. At the fixed power-of-two resolution those pools receive even
spatial dimensions, and the validation step below compares the result against
the untouched DIS reference model.

The frontend normalizes pixels as `v / 255 - 0.5` *before* inference — the graph
does not bake normalization in. Keep this contract in sync with
`src/image-ops.ts` (`rgbaToNchwFloat32`).

## 2. Validate ONNX vs PyTorch

```sh
uv run validate_onnx.py \
  --weights isnet-general-use.pth \
  --onnx ./build/isnet-general-use-1024.onnx \
  --resolution 1024 --samples 4
```

Gate: mean absolute error ≤ `0.005` **and** 99th-percentile error ≤ `0.03`. A
non-zero exit means the fp16 export drifted too far — do not publish it.

## 3. Build the manifest

```sh
node build_manifest.mjs \
  --model ./build/isnet-general-use-1024.onnx \
  --model-id isnet-general-use-1024-v1 \
  --resolution 1024 \
  --out ./build/manifest.json
```

This emits the byte size and SHA-256 alongside the tensor names and resolution,
matching `ModelManifestSchema` in `src/manifest.ts`. The runtime verifies the
downloaded model against `byteSize` and `sha256`, so the manifest must be built
from the exact bytes you publish.

From the repository root, `pnpm dev` starts a small CORS-restricted development
server for `tooling/build` at `http://localhost:8790`. The frontend example
configuration points at that local manifest, so ordinary photos can use the
exported model without copying its 80+ MB weights into the app bundle.

The two pieces are intentionally separate: ONNX Runtime Web's JavaScript and
WASM glue ship with the frontend, while the DIS `.onnx` model and manifest are
served locally during development and from private Cloudflare R2 in production.

## 4. Publish to the private model bucket

Releases are **immutable**: never overwrite an existing model or manifest.
Publish a new versioned directory and change the configured manifest path only
after both objects are present.

Sardrobe binds a private `sardrobe-models` R2 bucket to the frontend Worker.
The Worker streams those objects from `/models/*`, so the bucket needs neither
a public domain nor a CORS policy. From the repository root, upload the release
using the commands in [`docs/DEPLOYMENT.md`](../../../docs/DEPLOYMENT.md).

Keep the source checkpoint, conversion command, validation output, manifest,
and SHA-256 together in the release record. The browser verifies both the byte
length and checksum before creating an inference session.

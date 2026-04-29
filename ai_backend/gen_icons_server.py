#!/usr/bin/env python3
"""Batch-generate project icons using SD-Turbo on GPU.
Usage: python3 gen_icons_server.py '{"project": "prompt", ...}'
"""
import sys
import json
import torch
from diffusers import AutoPipelineForText2Image
from pathlib import Path

projects = json.loads(sys.argv[1])
output_dir = Path("/tmp/claude-icons")
output_dir.mkdir(exist_ok=True)

print("Loading SD-Turbo model...", flush=True)
pipe = AutoPipelineForText2Image.from_pretrained(
    "stabilityai/sd-turbo",
    torch_dtype=torch.float16,
    variant="fp16",
)
pipe.to("cuda")
print("Model loaded!", flush=True)

for name, prompt in projects.items():
    full_prompt = f"{prompt}, app icon style, centered, clean, professional, dark background"
    image = pipe(
        full_prompt,
        num_inference_steps=1,
        guidance_scale=0.0,
        width=256,
        height=256,
    ).images[0]
    image.save(output_dir / f"{name}.png")
    print(f"OK:{name}", flush=True)

print("DONE", flush=True)

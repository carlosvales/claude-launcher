# AI Backend (optional)

Claude Launcher uses **fallback gradient icons** out of the box. They look great and need no setup.

If you want **AI-generated unique icons per project**, you can deploy this backend on a machine with an NVIDIA GPU. The launcher will SSH into it, generate icons with Stable Diffusion Turbo, and download them.

## Requirements

- A Linux machine with an NVIDIA GPU (~6GB VRAM minimum for SD-Turbo)
- Python 3.10+
- SSH access from your launcher machine
- [Ollama](https://ollama.ai) running locally on the GPU machine (used to enrich the icon prompts)

## Setup

On the GPU machine:

```bash
# 1. Install dependencies
pip install torch diffusers transformers accelerate pillow

# 2. Pull a small Ollama model for prompt generation
ollama pull gemma3:4b

# 3. Copy gen_icons_server.py to /tmp (or any path you prefer)
scp gen_icons_server.py user@gpu-host:/tmp/gen_icons_server.py
```

On your launcher machine, edit `config.json`:

```json
{
  "ai_backend": {
    "enabled": true,
    "ollama_url": "http://gpu-host:11434",
    "ollama_model": "gemma3:4b",
    "ssh_host": "gpu-host",
    "ssh_user": "your-user",
    "ssh_key_path": "~/.ssh/id_rsa",
    "remote_script_path": "/tmp/gen_icons_server.py",
    "remote_output_dir": "/tmp/claude-icons"
  }
}
```

Restart the launcher. Click **Regenerate icons** and it will use your GPU.

## How it works

1. Launcher asks your local Ollama for a short image prompt per project name (e.g. *"polymarket"* → *"dice rolling with branching fractal pattern"*).
2. Launcher uploads the prompts JSON to your GPU server via `scp`.
3. Launcher runs `gen_icons_server.py` over SSH, which loads SD-Turbo and generates one PNG per project.
4. Launcher downloads the PNGs back into the local `icons/` cache.

Generation takes ~1-2 seconds per icon on a modern GPU.

## Security

- The launcher only runs `python3 <remote_script_path>` over SSH. Use a dedicated, restricted user if you don't fully trust the launch chain.
- `config.json` is gitignored — your SSH host, user and key path stay local.
- No image data leaves your network.

## Disabling

Set `"enabled": false` in `config.json` to fall back to gradient icons. The launcher detects this automatically and hides remote progress messages.

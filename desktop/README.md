# ARIA Desktop — Windows MVP scaffold

This folder is the first Windows desktop foundation for ARIA. It is intentionally separate from the existing mobile/PWA prototype.

## Current scope

- Native desktop chat window built with PySide6.
- Local conversation history and memory stored in SQLite under the user's local application data directory.
- Optional backend connection using `ARIA_API_BASE_URL`.
- Mock mode when no backend URL is configured.
- No unrestricted computer control. Future Windows actions must go through an explicit permission/approval layer.

## Requirements

- Python 3.11+
- Windows is recommended for local testing and packaging.

Install dependencies:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r desktop/requirements.txt
python desktop/aria_desktop.py
```

If you are running from the repository root, the commands above apply. The app starts in clearly labelled local demo mode until a backend is configured.

## Backend contract

Set `ARIA_API_BASE_URL` to the base URL of a backend you control, for example a local development server. The app sends a POST request to `{ARIA_API_BASE_URL}/chat` with:

```json
{
  "messages": [
    {"role": "user", "content": "Hello"}
  ]
}
```

Expected successful JSON response:

```json
{"reply": "Hello. How can I help?"}
```

This is a proposed client contract, not a claim that the existing Cloudflare Worker already implements it. Verify/adapt the Worker before setting this variable. The desktop app deliberately contains no model-provider API key.

## Build a single-file Windows executable

On a Windows machine:

```powershell
pip install -r desktop/requirements.txt
pip install pyinstaller
pyinstaller --noconfirm --clean --onefile --windowed --name ARIA desktop/aria_desktop.py
```

The executable should appear at `dist/ARIA.exe`. The GitHub Actions workflow uses the same `--onefile` option and checks that the expected file exists before uploading it. A successful CI build confirms packaging, not that the GUI has been manually tested on a real Windows machine.

## Security and limitations

- Never embed model-provider API keys in the desktop executable or public repository.
- Treat the backend URL as configuration, not as a secret.
- Local memory is stored on the current Windows user profile and is not encrypted by this scaffold.
- No file, shell, browser, keyboard, mouse, or other computer-control tools are implemented yet.
- Do not connect this prototype to a production backend until authentication, rate limiting, input validation, and abuse protection are implemented.

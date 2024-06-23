
# LMAO Pilot README
LMAO Pilot is a barebones "DIY" style single-file LLM "copilot" for VSCode.

This is for my personal use, but you can take it and make it your own. Feel free to send PRs!

## Install?

DIY

- Manually update the endpoint as needed. Default: `https://localhost:8080` and it's hardcoded in `extension.js` file, at the top.
- You'll need to build this yourself. Run `make` (or directly: `npx vsce package`).  Unfortunately, you need `node` and `npx`.
- Output should be a `.vsix` file which you can install with `Extensions: Install from VSIX` command.

## Use?

Open a file and type some prompt text/code. Select it and run "LMAO" command.  If nothing is selected, whole file is used.

LLM completions will be added at the end of the file.

## Gotchas?

Mainly barebones functionality and rough edges.

- Hardcoded defaults
- Minimal error checking
- No way to stop the LLM while it's working
- If you change the active document (i.e. going to another tab, closing the doc etc.) process will fail.
- Only tested with local llama.cpp server OpenAI endpoint. Should work with other OpenAI compatible endpoints, but not tested.

**Enjoy!**

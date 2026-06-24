#!/bin/bash
# Writes the complete patched index.html to /home/claude/lexdesk_v4/index.html
python3 /home/claude/lexdesk_v4/generate_index.py
echo "Done: $(wc -l < /home/claude/lexdesk_v4/index.html) lines"

import sys

OUT = "/home/claude/lexdesk_v4/index.html"

with open('/home/claude/lexdesk_v4/new_css_additions.css') as f:   CSS_ADD = f.read()
with open('/home/claude/lexdesk_v4/new_auth_section.js') as f:     AUTH_JS = f.read()
with open('/home/claude/lexdesk_v4/users_hierarchy_section.js') as f: USERS_JS = f.read()
with open('/home/claude/lexdesk_v4/chatbot_section.js') as f:       CHATBOT_JS = f.read()

parts = []

# ── PART 1: HEAD + all original CSS (unchanged) ───────────────────────────
parts.append(open('/home/claude/lexdesk_v4/part1_head_css.html').read())

print(f"Part 1: {len(parts[-1]):,} chars")

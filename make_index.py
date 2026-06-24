import os, sys

OUT = "/home/claude/lexdesk_v4/index.html"

# ─────────────────────────────────────────────────────────────────────────────
# We write each logical section as a string and join them.
# Sections marked NEW are additions; others are modifications of originals.
# ─────────────────────────────────────────────────────────────────────────────

HEAD = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0"/>
<title>LexDesk – Legal Practice Manager</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"/>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
"""

print(f"HEAD: {len(HEAD)} chars")
with open(OUT, 'w', encoding='utf-8') as f:
    f.write(HEAD)
print("Written HEAD")

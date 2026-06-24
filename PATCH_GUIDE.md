# LexDesk V4 Patch Guide

This file documents exactly what to add/change in your index.html.
The new JS files contain all new functionality.

## Step 1: Add new CSS
Find: `</style>` (the LAST closing style tag, before `</head>`)
Insert BEFORE it: [contents of new_css_additions.css]

## Step 2: Add Forgot Password screen
Find: `<!-- ══ PENDING APPROVAL SCREEN ══ -->`
Insert BEFORE it: [FORGOT_SCREEN_HTML below]

## Step 3: Add Reset Password screen  
Find: `<!-- ══ CLIENT PORTAL LOGIN ══ -->`
Insert BEFORE it: [RESET_PW_SCREEN_HTML below]

## Step 4: Add Hierarchy Perms view inside #page
Find: `<!-- ACTIVITY LOG -->`
Insert BEFORE it: [HIERARCHY_PERMS_VIEW_HTML below]

## Step 5: Update Users view (add tabs for Active/Archived)
Find: `<!-- USERS (admin only) -->`
Replace the entire block with: [UPDATED_USERS_VIEW_HTML below]

## Step 6: Add Chatbot HTML before </body>
Find: `<div id="toast-container"></div>`
Insert AFTER it: [CHATBOT_HTML below]

## Step 7: Replace auth JS
Find: the script block containing `async function doSignIn()`
Replace entire block with: [contents of new_auth_section.js wrapped in <script></script>]

## Step 8: Replace users JS
Find: the script block containing `function renderUsers()`
Replace entire block with: [contents of users_hierarchy_section.js wrapped in <script></script>]

## Step 9: Add chatbot + hierarchy perms JS
Find: the last `</script>` before `</body>`
Insert AFTER it: [contents of chatbot_section.js wrapped in <script></script>]

## Step 10: Update sidebar buildSidebar() function
Find: `function buildSidebar(){`
Replace the entire function with: [UPDATED_BUILD_SIDEBAR below]

## Step 11: Update navigate() for finance restriction
Find: the navigate() function
Add at the start: [FINANCE_RESTRICTION_CHECK below]

## Step 12: Update initApp() to call initChatbot()
Find: `await checkForNewItems();`
Add after: `initChatbot();`

## Step 13: Update Settings page - add Password Reset + Chatbot toggle
Find: the Password change section in settings
Replace with: [UPDATED_SETTINGS_SECURITY below]

## Step 14: Update isAdmin() to use new role system
Find: `function isAdmin(){ return S.profile?.role==='admin'; }`
Replace with: (already in new_auth_section.js)

## Step 15: Update doSignUp() first-user to use senior_advocate role
Find: `role:isFirstUser?'admin':'pending'`
Replace: `role:isFirstUser?'senior_advocate':'junior_assistant'`
Also: add `is_founder:isFirstUser` to the insert payload

## Step 16: Update sidebar role display
Find: `isAdmin()?'Admin':'Assistant Lawyer'`
Replace: `getRoleInfo(S.profile?.role)?.label || 'Team Member'`

## Step 17: Finance nav restriction in buildSidebar  
In buildSidebar(), the finances nav item should be:
`${canSeeFinances() ? \`<button class="nav-item" onclick="navigate('finances')">...\` : ''}`


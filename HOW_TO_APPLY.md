# LexDesk V4 — How to Apply All Changes

## What's Included
- `RUN_MIGRATION_V4.sql` — Run this in Supabase SQL Editor FIRST
- `new_css_additions.css` — New CSS for hierarchy badges, chatbot, forgot password
- `new_auth_section.js` — Complete replacement for auth JS (roles, forgot password, reset password)
- `users_hierarchy_section.js` — Complete replacement for users management + hierarchy perms page
- `chatbot_section.js` — New floating chatbot assistant
- `js_patches.js` — Small patches to existing functions (sidebar, navigate, initApp, settings)
- `snippets.html` — HTML snippets to insert at specific points

## Apply Order

### 1. Run the SQL Migration
In Supabase Dashboard → SQL Editor → New Query → paste `RUN_MIGRATION_V4.sql` → Run

### 2. Add new CSS
In your `index.html`, find the LAST `</style>` tag (there are two style blocks).
BEFORE that `</style>`, paste the entire contents of `new_css_additions.css`.

### 3. Add forgot-screen HTML
Find: `<!-- ══ PENDING APPROVAL SCREEN ══ -->`
Insert BEFORE it: Snippet 1 from `snippets.html`

### 4. Add reset-pw-screen HTML  
Find: `<!-- ══ CLIENT PORTAL LOGIN ══ -->`
Insert BEFORE it: Snippet 2 from `snippets.html`

### 5. Add hierarchy-perms view
Find: `<!-- ACTIVITY LOG -->`
Insert BEFORE it: Snippet 3 from `snippets.html`

### 6. Replace users view
Find: `<!-- USERS (admin only) -->` down to the closing `</div>`
Replace the ENTIRE block with: Snippet 5 from `snippets.html`

### 7. Add forgot password link to login screen
In the login screen HTML, find:
  `<div id="auth-signin">`
  After the `<button ...>Sign In</button>` line, add:
  `<div class="auth-link-row"><a onclick="showForgotPassword()">Forgot your password?</a></div>`

### 8. Add chatbot HTML + floating button
Find: `<div id="toast-container"></div>`
Insert AFTER it: Snippet 4 from `snippets.html` (chatbot FAB + panel)

### 9. Replace the auth script block
Find the `<script>` block that contains `async function doSignIn()`.
Replace the ENTIRE script block contents (between `<script>` and `</script>`) 
with the contents of `new_auth_section.js`.

### 10. Replace the users management block  
Find the `<script>` block that contains `function renderUsers()`.
Replace the ENTIRE script block contents with the contents of `users_hierarchy_section.js`.

### 11. Add chatbot JS
Find the LAST `</script>` before `</body>`.
Insert AFTER it:
```html
<script>
[paste contents of chatbot_section.js here]
</script>
```

### 12. Update buildSidebar() function
In your existing code, find `function buildSidebar(){` and replace the ENTIRE 
function with the version in `js_patches.js` (marked "JS PATCH 1").

### 13. Update updateSidebarProfile()
Replace with the version in `js_patches.js` (marked "JS PATCH 2").

### 14. Update navigate() 
In the `navigate()` function, add at the very top (before `document.querySelectorAll`):
```javascript
if(view==='finances' && !canSeeFinances()){
  showToast('Finances are restricted to the Senior Advocate only.','error');
  return;
}
```
Also add `'hierarchy-perms':'Role Permissions'` to the NAV_TITLES object, and add:
`if(view==='hierarchy-perms') renderHierarchyPermissions();`
after the existing view-specific `if()` calls.

### 15. Update isAdmin() (already in new_auth_section.js but verify it's there)
`function isAdmin(){ return isSeniorAdvocate() && S.profile?.approved; }`

### 16. Add sendPasswordResetEmail() and chatbot settings helpers
Find the last `<script>` block before `</body>`.
Add the functions from `js_patches.js` marked "JS PATCH 7".

### 17. Update doSignUp() role for first user
Find: `role:isFirstUser?'admin':'pending'`
Change to: `role:isFirstUser?'senior_advocate':'junior_assistant'`
Also add `is_founder:isFirstUser,` to the same object.

### 18. Update loadAllData() user query
Replace the single user query with the admin/non-admin split from `js_patches.js` "JS PATCH 5".

### 19. Update initApp() to init chatbot
After `startPolling();` add:
```javascript
initChatbot();
if(isAdmin()){
  const {data:allU}=await sb.from('profiles').select('*').order('created_at');
  S.allUsers=allU||[];
}
```

### 20. Handle password reset redirect in boot
In `window.addEventListener('DOMContentLoaded')`, BEFORE the portal check, add:
```javascript
const wasReset = await handlePasswordResetRedirect();
if(wasReset) return;
```

### 21. Add settings UI items
In the `view-settings` HTML, add to the "Data & Security" section inside the settings-section-body:
- Change Password row (sends reset email)
- LexBot toggle row
(See `js_patches.js` "JS PATCH 6" for the HTML)

Also add `loadChatbotToggleUI();` to the `loadSettingsUI()` function.

## Summary of New Features
✅ First signup = Senior Advocate (Admin/Founder), cannot be removed
✅ Forgot Password email flow  
✅ Password reset redirect handler
✅ 4-tier hierarchy: Senior Advocate → Junior Advocate → Senior Assistant → Junior Assistant
✅ Hierarchy Permissions Matrix (Admin controls what each tier can do)
✅ Archive / Restore / Permanently Delete users
✅ Finances = Senior Advocate ONLY (blocked at sidebar + navigation level)
✅ Floating draggable LexBot chatbot with preset Q&A
✅ Chatbot 2-day history, enable/disable toggle in settings
✅ Change Password from Settings page

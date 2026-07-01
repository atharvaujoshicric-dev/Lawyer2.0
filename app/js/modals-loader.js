// modals-loader.js — injects all modal HTML into the DOM
// Auto-generated from index.html modal blocks

(function() {
  var container = document.getElementById('modals-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'modals-container';
    document.body.appendChild(container);
  }
  container.innerHTML = `<div class="modal-backdrop" id="modal-detail">
  <div class="modal" style="max-width:820px;">
    <div class="modal-header">
      <div><div class="modal-title" id="det-title">Client</div><div class="modal-sub" id="det-sub"></div></div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button class="btn btn-gold btn-sm" id="det-edit-btn" onclick="editCurrentClient()"><i class="fas fa-edit"></i> Edit</button>
        <button class="modal-close" onclick="closeModal('modal-detail')">&times;</button>
      </div>
    </div>
    <div class="modal-body">
      <div class="detail-meta-grid" id="det-meta"></div>
      <div class="tabs">
        <button class="tab-btn active" onclick="switchTab('overview')">Overview</button>
        <button class="tab-btn" onclick="switchTab('case-details')">Case Details</button>
        <button class="tab-btn" onclick="switchTab('payments')">Payments</button>
        <button class="tab-btn" onclick="switchTab('documents')">Documents</button>
        <button class="tab-btn" onclick="switchTab('deadlines')">Deadlines</button>
        <button class="tab-btn" onclick="switchTab('history')">History</button>
      </div>
      <div class="tab-panel active" id="tab-overview"></div>
      <div class="tab-panel" id="tab-case-details"></div>
      <div class="tab-panel" id="tab-payments"></div>
      <div class="tab-panel" id="tab-documents"></div>
      <div class="tab-panel" id="tab-deadlines"></div>
      <div class="tab-panel" id="tab-history"><div class="timeline" id="det-history"></div></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-danger btn-sm" id="det-delete-btn" onclick="deleteCurrentClient()"><i class="fas fa-trash"></i> Delete</button>
      <button class="btn btn-outline btn-sm" onclick="generateInvoice(S.detailClientId)" title="Generate PDF Invoice"><i class="fas fa-file-invoice"></i> Invoice</button>
      <button class="btn btn-outline btn-sm" id="det-portal-btn" onclick="generatePortalLink(S.detailClientId)" title="Generate Client Portal Link"><i class="fas fa-link"></i> Portal Link</button>
      <button class="btn btn-outline" onclick="closeModal('modal-detail')">Close</button>
    </div>
  </div>
</div>

<!-- ADD/EDIT CLIENT MODAL -->
<div class="modal-backdrop" id="modal-client">
  <div class="modal" style="max-width:760px;">
    <div class="modal-header">
      <div><div class="modal-title" id="mc-title">Add New Client</div><div class="modal-sub">Fields marked <span style="color:var(--danger);">*</span> are required</div></div>
      <button class="modal-close" onclick="closeModal('modal-client')">&times;</button>
    </div>
    <div class="modal-body">
      <div class="section-divider">Case Type</div>
      <div class="case-type-selector" id="client-case-type-tabs"></div>

      <div class="section-divider"><i class="fas fa-link"></i> New Case for an Existing Client?</div>
      <div class="form-group" style="margin-bottom:14px;">
        <label class="form-label">Search existing clients (optional — leave blank for a brand-new client)</label>
        <input class="form-control" id="f-link-existing" type="text" list="existing-clients-list" placeholder="Start typing a client name…" oninput="onLinkExistingClientInput()" autocomplete="off"/>
        <datalist id="existing-clients-list"></datalist>
        <span class="form-hint" id="f-link-hint"></span>
      </div>

      <div class="section-divider">Conflict of Interest Check</div>
      <div class="form-group" style="margin-bottom:14px;">
        <label class="form-label">Opposite Party / Company Name</label>
        <input class="form-control" id="f-conflict-check" type="text" placeholder="Enter opposite party name to check for conflicts…" oninput="renderConflictCheck()"/>
        <div id="conflict-results" style="margin-top:8px;"></div>
      </div>
      <div class="section-divider">Client Information</div>
      <div class="form-grid form-grid-2" style="gap:13px;margin-bottom:14px;">
        <div class="form-group"><label class="form-label">Full Name <span class="required">*</span></label><input class="form-control" id="f-name" type="text" placeholder="John Doe"/></div>
        <div class="form-group"><label class="form-label">Client ID</label><input class="form-control" id="f-id" type="text" disabled/></div>
        <div class="form-group"><label class="form-label">Phone</label><input class="form-control" id="f-phone" type="tel"/></div>
        <div class="form-group"><label class="form-label">Email</label><input class="form-control" id="f-email" type="email"/></div>
        <div class="form-group" style="grid-column:1/-1;"><label class="form-label">Address</label><input class="form-control" id="f-address" type="text"/></div>
        <div class="form-group"><label class="form-label">Status</label><select class="form-control" id="f-status"><option value="active">Active</option><option value="pending">Pending</option><option value="closed">Closed</option></select></div>
        <div class="form-group"><label class="form-label">Total Fee Quoted (₹)</label><input class="form-control" id="f-fee" type="number"/></div>
        <div class="form-group" id="f-assignee-wrap"><label class="form-label">Assigned Lawyer</label><select class="form-control" id="f-assignee"></select></div>
      </div>
      <div id="dynamic-case-fields"></div>
      <div class="section-divider"><i class="fas fa-paperclip"></i> Attach Documents</div>
      <div class="file-drop-zone" id="file-drop-zone" onclick="document.getElementById('file-input').click()" ondragover="event.preventDefault();this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="handleFileDrop(event)">
        <i class="fas fa-cloud-upload-alt" style="font-size:26px;margin-bottom:8px;display:block;"></i>
        <strong>Click to upload or drag & drop</strong><br/><span style="font-size:12.5px;">PDF, DOCX, XLSX, JPG, PNG — max 20MB</span>
      </div>
      <input type="file" id="file-input" multiple style="display:none;" onchange="handleFileSelect(event)" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"/>
      <div class="file-list" id="file-list"></div>
      <div class="section-divider" style="margin-top:14px;"><i class="fas fa-sticky-note"></i> Internal Notes</div>
      <textarea class="form-control" id="f-notes" rows="3" placeholder="Private notes…"></textarea>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-client')">Cancel</button>
      <button class="btn btn-primary" id="mc-save-btn" onclick="saveClient()"><i class="fas fa-save"></i> <span id="mc-save-txt">Save Client</span></button>
    </div>
  </div>
</div>

<!-- FILE PREVIEW MODAL -->
<div class="modal-backdrop" id="modal-preview">
  <div class="modal" style="max-width:760px;">
    <div class="modal-header">
      <div><div class="modal-title" id="prev-title">File</div><div class="modal-sub" id="prev-sub"></div></div>
      <button class="modal-close" onclick="closeModal('modal-preview')">&times;</button>
    </div>
    <div class="modal-body">
      <div class="preview-body" id="prev-body"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-preview')">Close</button>
      <button class="btn btn-gold" id="prev-download-btn" onclick="downloadPreviewFile()"><i class="fas fa-download"></i> Download</button>
    </div>
  </div>
</div>

<!-- NOTE EDITOR MODAL -->
<div class="modal-backdrop" id="modal-note">
  <div class="modal" style="max-width:780px;">
    <div class="modal-header">
      <div><div class="modal-title" id="note-modal-title">New Note</div></div>
      <button class="modal-close" onclick="closeModal('modal-note')">&times;</button>
    </div>
    <div class="modal-body">
      <div class="form-group" style="margin-bottom:12px;">
        <label class="form-label">Title <span class="required">*</span></label>
        <input class="form-control" id="note-title-input" type="text" placeholder="Note title…"/>
      </div>
      <div class="rich-toolbar" id="note-rich-toolbar">
        <button onclick="noteCmd('bold')"><i class="fas fa-bold"></i></button>
        <button onclick="noteCmd('italic')"><i class="fas fa-italic"></i></button>
        <button onclick="noteCmd('underline')"><i class="fas fa-underline"></i></button>
        <button onclick="noteCmd('insertUnorderedList')"><i class="fas fa-list-ul"></i></button>
        <button onclick="noteCmd('insertOrderedList')"><i class="fas fa-list-ol"></i></button>
      </div>
      <div class="rich-editor" id="note-content-editor" contenteditable="true" style="min-height:220px;"></div>
      <div id="note-history-section" style="display:none;margin-top:18px;">
        <div class="section-divider"><i class="fas fa-history"></i> Edit History</div>
        <div id="note-history-list"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-note')">Close</button>
      <button class="btn btn-gold" id="note-save-btn" onclick="saveNote()"><i class="fas fa-save"></i> Save</button>
    </div>
  </div>
</div>

<!-- NOTE SHARE MODAL -->
<div class="modal-backdrop" id="modal-note-share">
  <div class="modal" style="max-width:480px;">
    <div class="modal-header">
      <div><div class="modal-title" id="note-share-title">Share Note</div></div>
      <button class="modal-close" onclick="closeModal('modal-note-share')">&times;</button>
    </div>
    <div class="modal-body">
      <div class="section-divider">Add Person</div>
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
        <select class="form-control" id="note-share-user" style="flex:1;min-width:150px;"></select>
        <select class="form-control" id="note-share-perm" style="width:auto;">
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
        </select>
        <button class="btn btn-gold btn-sm" onclick="addNoteShare()"><i class="fas fa-plus"></i> Share</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:13px;">
        <input type="checkbox" id="note-share-send-chat" style="width:16px;height:16px;"/>
        <label for="note-share-send-chat">Also send a message to this person in chat</label>
      </div>
      <div class="section-divider">Currently Shared With</div>
      <div id="note-current-shares"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-note-share')">Done</button>
    </div>
  </div>
</div>

<!-- RECORD PAYMENT MODAL -->
<div class="modal-backdrop" id="modal-payment">
  <div class="modal" style="max-width:440px;">
    <div class="modal-header"><div><div class="modal-title">Record Payment</div><div class="modal-sub" id="pay-client-name"></div></div><button class="modal-close" onclick="closeModal('modal-payment')">&times;</button></div>
    <div class="modal-body">
      <div class="form-grid" style="gap:13px;">
        <div class="form-group"><label class="form-label">Amount Received (₹) <span class="required">*</span></label><input class="form-control" id="pay-amount" type="number" min="0" step="0.01" placeholder="e.g. 20000"/></div>
        <div class="form-group"><label class="form-label">Payment Date <span class="required">*</span></label><input class="form-control" id="pay-date" type="date"/></div>
        <div class="form-group"><label class="form-label">Method</label><select class="form-control" id="pay-method"><option value="Cash">Cash</option><option value="Bank Transfer">Bank Transfer</option><option value="UPI">UPI</option><option value="Cheque">Cheque</option><option value="Card">Card</option><option value="Other">Other</option></select></div>
        <div class="form-group"><label class="form-label">Note</label><input class="form-control" id="pay-note" type="text" placeholder="Optional reference / remarks"/></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-payment')">Cancel</button>
      <button class="btn btn-gold" onclick="savePayment()"><i class="fas fa-save"></i> Record Payment</button>
    </div>
  </div>
</div>

<!-- ADD/EDIT USER MODAL (role assignment for pending or existing users) -->
<div class="modal-backdrop" id="modal-add-user">
  <div class="modal" style="max-width:480px;">
    <div class="modal-header">
      <div><div class="modal-title" id="au-title">Assign Role</div>
      <div class="modal-sub">Set the team member's base role and custom permission level</div></div>
      <button class="modal-close" onclick="closeModal('modal-add-user')">&times;</button>
    </div>
    <div class="modal-body">
      <div class="form-grid" style="gap:13px;">
        <div class="form-group"><label class="form-label">Name</label><input class="form-control" id="au-name" type="text" disabled/></div>
        <div class="form-group"><label class="form-label">Email</label><input class="form-control" id="au-email" type="email" disabled/></div>
        <div class="form-group">
          <label class="form-label">Base Role</label>
          <select class="form-control" id="au-role">
            <option value="assistant">Team Member (Non-Admin)</option>
            <option value="admin">Admin / Senior Advocate (Full Access)</option>
          </select>
          <div style="font-size:11.5px;color:var(--text-muted);margin-top:4px;">Admin gets full access regardless of custom role below.</div>
        </div>
        <div class="form-group">
          <label class="form-label">Custom Role / Hierarchy Position</label>
          <select class="form-control" id="au-custom-role">
            <option value="">— No custom role assigned —</option>
          </select>
          <div style="font-size:11.5px;color:var(--text-muted);margin-top:4px;">Custom roles define specific permissions (view clients, finances, etc.). Create roles in <strong>Admin → Roles</strong>.</div>
        </div>
        <div class="form-group"><label class="form-label">Bar Registration No.</label><input class="form-control" id="au-bar" type="text"/></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-add-user')">Cancel</button>
      <button class="btn btn-gold" onclick="approveUser()"><i class="fas fa-check"></i> Approve & Save</button>
    </div>
  </div>
</div>

<!-- TEMPLATE MODAL -->
<div class="modal-backdrop" id="modal-template">
  <div class="modal" style="max-width:700px;">
    <div class="modal-header">
      <div><div class="modal-title" id="tpl-modal-title">New Draft Template</div><div class="modal-sub">Use <code>{{CLIENT_NAME}}</code>, <code>{{CLIENT_ID}}</code>, <code>{{DATE}}</code>, <code>{{CASE_TYPE}}</code></div></div>
      <button class="modal-close" onclick="closeModal('modal-template')">&times;</button>
    </div>
    <div class="modal-body">
      <div class="form-grid" style="gap:13px;margin-bottom:14px;">
        <div class="form-group"><label class="form-label">Template Name <span class="required">*</span></label><input class="form-control" id="tpl-name" type="text" placeholder="e.g. NDA Draft"/></div>
        <div class="form-group"><label class="form-label">Category</label><select class="form-control" id="tpl-category"></select></div>
      </div>
      <div class="form-group" style="margin-bottom:6px;"><label class="form-label">Content <span class="required">*</span></label></div>
      <div class="rich-toolbar">
        <button onclick="richCmd('bold')"><i class="fas fa-bold"></i></button>
        <button onclick="richCmd('italic')"><i class="fas fa-italic"></i></button>
        <button onclick="richCmd('underline')"><i class="fas fa-underline"></i></button>
        <button onclick="richCmd('insertUnorderedList')"><i class="fas fa-list-ul"></i></button>
        <button onclick="richCmd('insertOrderedList')"><i class="fas fa-list-ol"></i></button>
        <button onclick="insertPlaceholder('{{CLIENT_NAME}}')" style="width:auto;padding:0 8px;font-size:11px;">{{NAME}}</button>
        <button onclick="insertPlaceholder('{{DATE}}')" style="width:auto;padding:0 8px;font-size:11px;">{{DATE}}</button>
        <button onclick="insertPlaceholder('{{CLIENT_ID}}')" style="width:auto;padding:0 8px;font-size:11px;">{{ID}}</button>
      </div>
      <div class="rich-editor" id="tpl-content" contenteditable="true"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-template')">Cancel</button>
      <button class="btn btn-gold" onclick="saveTemplate()"><i class="fas fa-save"></i> Save</button>
    </div>
  </div>
</div>

<!-- TEMPLATE USE MODAL -->
<div class="modal-backdrop" id="modal-use-template">
  <div class="modal" style="max-width:700px;">
    <div class="modal-header">
      <div><div class="modal-title" id="ut-title">Use Template</div></div>
      <button class="modal-close" onclick="closeModal('modal-use-template')">&times;</button>
    </div>
    <div class="modal-body">
      <div class="form-group" style="margin-bottom:14px;"><label class="form-label">Select Client</label><select class="form-control" id="ut-client" onchange="previewTemplate()"></select></div>
      <div class="form-group" style="margin-bottom:6px;"><label class="form-label">Preview</label></div>
      <div id="ut-preview" class="template-preview" style="max-height:300px;overflow-y:auto;"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-use-template')">Close</button>
      <button class="btn btn-primary" onclick="copyTemplateText()"><i class="fas fa-copy"></i> Copy</button>
      <button class="btn btn-gold" onclick="downloadTemplateText()"><i class="fas fa-download"></i> Download .txt</button>
    </div>
  </div>
</div>

<!-- NEW CATEGORY MODAL -->
<div class="modal-backdrop" id="modal-new-cat">
  <div class="modal" style="max-width:480px;">
    <div class="modal-header"><div><div class="modal-title">New Case Category</div></div><button class="modal-close" onclick="closeModal('modal-new-cat')">&times;</button></div>
    <div class="modal-body">
      <div class="form-grid" style="gap:13px;">
        <div class="form-group"><label class="form-label">Category Name <span class="required">*</span></label><input class="form-control" id="nc-name" type="text" placeholder="e.g. Immigration"/></div>
        <div class="form-group"><label class="form-label">Icon (Font Awesome class)</label><input class="form-control" id="nc-icon" type="text" placeholder="fas fa-globe"/></div>
        <div class="form-group"><label class="form-label">Color</label><select class="form-control" id="nc-color"><option value="blue">Blue</option><option value="green">Green</option><option value="purple">Purple</option><option value="orange">Orange</option><option value="red">Red</option></select></div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal('modal-new-cat')">Cancel</button><button class="btn btn-gold" onclick="createCategory()"><i class="fas fa-plus"></i> Create</button></div>
  </div>
</div>

<!-- TASK MODAL -->
<div class="modal-backdrop" id="modal-task">
  <div class="modal" style="max-width:560px;">
    <div class="modal-header"><div><div class="modal-title" id="task-modal-title">New Task</div></div><button class="modal-close" onclick="closeModal('modal-task')">&times;</button></div>
    <div class="modal-body">
      <div id="task-locked-banner" style="display:none;align-items:center;gap:8px;background:var(--warning-bg);color:var(--warning);border:1px solid #fbd38d;border-radius:8px;padding:9px 12px;font-size:12.5px;margin-bottom:14px;">
        <i class="fas fa-lock"></i> This task has started — details are locked. Use the actions below to move it forward.
      </div>
      <div class="form-grid" style="gap:13px;">
        <div class="form-group"><label class="form-label">Title <span class="required">*</span></label><input class="form-control" id="task-title" type="text" placeholder="e.g. Draft reply to opposite counsel"/></div>
        <div class="form-group"><label class="form-label">Description</label><textarea class="form-control" id="task-desc" rows="3"></textarea></div>
        <div class="form-group"><label class="form-label">Related Client (optional)</label><select class="form-control" id="task-client"></select></div>
        <div class="form-group" id="task-assignee-row"><label class="form-label">Assign To <span class="required">*</span></label><select class="form-control" id="task-assignee"></select></div>
        <div class="form-grid form-grid-2" style="gap:13px;">
          <div class="form-group"><label class="form-label">Priority</label><select class="form-control" id="task-priority"><option value="medium">Medium</option><option value="high">High</option><option value="low">Low</option></select></div>
          <div class="form-group"><label class="form-label">Due Date</label><input class="form-control" id="task-due" type="date"/></div>
        </div>
      </div>
      <div id="task-comments-section" style="display:none;margin-top:18px;">
        <div class="section-divider">Comments</div>
        <div id="task-comments-list" style="max-height:180px;overflow-y:auto;margin-bottom:10px;"></div>
        <div style="display:flex;gap:8px;">
          <input class="form-control" id="task-comment-input" type="text" placeholder="Add a comment…" onkeydown="if(event.key==='Enter')addTaskComment()"/>
          <button class="btn btn-outline btn-sm" onclick="addTaskComment()"><i class="fas fa-paper-plane"></i></button>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <div id="task-status-actions" style="display:flex;gap:8px;margin-right:auto;"></div>
      <button class="btn btn-outline" onclick="closeModal('modal-task')">Cancel</button>
      <button class="btn btn-gold" id="task-save-btn" onclick="saveTask()"><i class="fas fa-save"></i> <span id="task-save-txt">Create Task</span></button>
    </div>
  </div>
</div>

<!-- PORTAL LINK MODAL -->
<div class="modal-backdrop" id="modal-portal-link">
  <div class="modal" style="max-width:520px;">
    <div class="modal-header"><div><div class="modal-title">Client Portal Link</div><div class="modal-sub">Share the link and PIN separately for security</div></div><button class="modal-close" onclick="closeModal('modal-portal-link')">&times;</button></div>
    <div class="modal-body">
      <div style="background:var(--warning-bg);border:1px solid #fbd38d;border-radius:8px;padding:12px 14px;margin-bottom:16px;font-size:13px;">
        <i class="fas fa-shield-alt" style="color:#d69e2e;margin-right:6px;"></i>
        <strong>Important:</strong> Send the link and PIN through <em>separate</em> channels (e.g. link via email, PIN via SMS) for security.
      </div>
      <div class="form-group" style="margin-bottom:14px;">
        <label class="form-label">Portal Link (send this to the client)</label>
        <div style="display:flex;gap:8px;">
          <input class="form-control" id="portal-link-url" type="text" readonly style="font-size:12px;"/>
          <button class="btn btn-outline btn-sm" onclick="navigator.clipboard.writeText(document.getElementById('portal-link-url').value).then(()=>showToast('Link copied!','success'))"><i class="fas fa-copy"></i></button>
        </div>
      </div>
      <div style="text-align:center;padding:16px;background:var(--navy);border-radius:10px;color:var(--gold);">
        <div style="font-size:12px;opacity:.7;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Client PIN (share separately)</div>
        <div id="portal-link-pin" style="font-size:36px;font-weight:700;letter-spacing:12px;"></div>
        <div style="font-size:11px;opacity:.5;margin-top:6px;">Valid for 90 days</div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-portal-link')">Close</button>
      <button class="btn btn-gold" onclick="copyPortalLink()"><i class="fas fa-copy"></i> Copy Both</button>
    </div>
  </div>
</div>

<!-- DEADLINE RULE MODAL -->
<div class="modal-backdrop" id="modal-deadline-rule">
  <div class="modal" style="max-width:560px;">
    <div class="modal-header"><div><div class="modal-title" id="dr-modal-title">New Deadline Rule</div></div><button class="modal-close" onclick="closeModal('modal-deadline-rule')">&times;</button></div>
    <div class="modal-body">
      <div class="form-grid form-grid-2" style="gap:13px;">
        <div class="form-group"><label class="form-label">Rule Name <span class="required">*</span></label><input class="form-control" id="dr-name" type="text" placeholder="e.g. Written Statement"/></div>
        <div class="form-group"><label class="form-label">Statute / Citation</label><input class="form-control" id="dr-statute" type="text" placeholder="e.g. CPC Order VIII Rule 1"/></div>
        <div class="form-group"><label class="form-label">Case Category</label><select class="form-control" id="dr-category"></select></div>
        <div class="form-group"><label class="form-label">Trigger Field ID</label><input class="form-control" id="dr-trigger" type="text" placeholder="e.g. created_at, nextHearing, incidentDate"/></div>
        <div class="form-group"><label class="form-label">Days</label><input class="form-control" id="dr-days" type="number" min="1" value="30"/></div>
        <div class="form-group"><label class="form-label">Direction</label><select class="form-control" id="dr-direction"><option value="after">After trigger date</option><option value="before">Before trigger date</option></select></div>
        <div class="form-group" style="grid-column:1/-1;"><label class="form-label">Description</label><input class="form-control" id="dr-description" type="text" placeholder="Brief explanation of this rule"/></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-deadline-rule')">Cancel</button>
      <button class="btn btn-gold" onclick="saveDeadlineRule()"><i class="fas fa-save"></i> Save Rule</button>
    </div>
  </div>
</div>

<!-- CREATE GROUP MODAL -->
<div class="modal-backdrop" id="modal-create-group">
  <div class="modal" style="max-width:480px;">
    <div class="modal-header"><div><div class="modal-title">New Group Chat</div></div><button class="modal-close" onclick="closeModal('modal-create-group')">&times;</button></div>
    <div class="modal-body">
      <div class="form-group" style="margin-bottom:14px;"><label class="form-label">Group Name <span class="required">*</span></label><input class="form-control" id="new-group-name" type="text" placeholder="e.g. Cyber Team" onkeydown="if(event.key==='Enter')createGroup()"/></div>
      <div class="form-group"><label class="form-label">Add Members</label><div class="form-hint mb-3">Senior Advocates are always included as group admins.</div><div id="new-group-members" style="max-height:200px;overflow-y:auto;padding:4px 0;"></div></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-create-group')">Cancel</button>
      <button class="btn btn-gold" onclick="createGroup()"><i class="fas fa-users"></i> Create Group</button>
    </div>
  </div>
</div>

<!-- MANAGE GROUP MODAL -->
<div class="modal-backdrop" id="modal-manage-group">
  <div class="modal" style="max-width:480px;">
    <div class="modal-header"><div><div class="modal-title">Manage Group</div></div><button class="modal-close" onclick="closeModal('modal-manage-group')">&times;</button></div>
    <div class="modal-body">
      <div id="manage-grp-admin-controls">
        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label">Group Name</label>
          <div style="display:flex;gap:8px;"><input class="form-control" id="manage-grp-name" type="text"/><button class="btn btn-outline btn-sm" onclick="saveGroupName()">Save</button></div>
        </div>
        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label">Add Member</label>
          <div style="display:flex;gap:8px;"><select class="form-control" id="manage-grp-add-user"></select><button class="btn btn-gold btn-sm" onclick="addToGroup()"><i class="fas fa-plus"></i></button></div>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Members</label><div id="manage-grp-members"></div></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-danger btn-sm" onclick="leaveGroup()"><i class="fas fa-sign-out-alt"></i> Leave Group</button>
      <button class="btn btn-outline" onclick="closeModal('modal-manage-group')">Close</button>
    </div>
  </div>
</div>

<!-- CHANGE PASSWORD MODAL -->
<div class="modal-backdrop" id="modal-change-password">
  <div class="modal" style="max-width:420px;">
    <div class="modal-header"><div><div class="modal-title">Change Password</div></div><button class="modal-close" onclick="closeModal('modal-change-password')">&times;</button></div>
    <div class="modal-body">
      <div class="form-grid" style="gap:13px;">
        <div class="form-group"><label class="form-label">Current Password</label><input class="form-control" id="pwd-current" type="password" onkeydown="if(event.key==='Enter')changePassword()"/></div>
        <div class="form-group"><label class="form-label">New Password</label><input class="form-control" id="pwd-new" type="password" placeholder="Min. 8 characters" onkeydown="if(event.key==='Enter')changePassword()"/></div>
        <div class="form-group"><label class="form-label">Confirm New Password</label><input class="form-control" id="pwd-confirm" type="password" onkeydown="if(event.key==='Enter')changePassword()"/></div>
      </div>
      <p id="pwd-err" style="color:var(--danger);font-size:12px;margin-top:8px;display:none;"></p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-change-password')">Cancel</button>
      <button class="btn btn-gold" onclick="changePassword()"><i class="fas fa-key"></i> Update Password</button>
    </div>
  </div>
</div>

<!-- FORGOT PASSWORD MODAL -->
<div class="modal-backdrop" id="modal-forgot-password">
  <div class="modal" style="max-width:400px;">
    <div class="modal-header"><div><div class="modal-title">Reset Password</div><div class="modal-sub">We'll send a reset link to your email</div></div><button class="modal-close" onclick="closeModal('modal-forgot-password')">&times;</button></div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Email Address</label>
        <input class="form-control" id="forgot-email" type="email" onkeydown="if(event.key==='Enter')forgotPassword()"/>
      </div>
      <p id="forgot-err" style="color:var(--danger);font-size:12px;margin-top:8px;display:none;"></p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-forgot-password')">Cancel</button>
      <button class="btn btn-gold" onclick="forgotPassword()"><i class="fas fa-envelope"></i> Send Reset Link</button>
    </div>
  </div>
</div>

<!-- SET NEW PASSWORD (after reset link) -->
<div class="modal-backdrop" id="modal-set-new-password">
  <div class="modal" style="max-width:400px;">
    <div class="modal-header"><div><div class="modal-title">Set New Password</div></div></div>
    <div class="modal-body">
      <div class="form-grid" style="gap:13px;">
        <div class="form-group"><label class="form-label">New Password <span class="required">*</span></label><input class="form-control" id="reset-new-pwd" type="password" placeholder="Min. 8 characters"/></div>
        <div class="form-group"><label class="form-label">Confirm Password <span class="required">*</span></label><input class="form-control" id="reset-confirm-pwd" type="password"/></div>
      </div>
      <p id="reset-pwd-err" style="color:var(--danger);font-size:12px;margin-top:8px;display:none;"></p>
    </div>
    <div class="modal-footer"><button class="btn btn-gold w-full" style="justify-content:center;" onclick="setNewPasswordFromReset()"><i class="fas fa-lock"></i> Set Password</button></div>
  </div>
</div>


<!-- CHANGE PASSWORD MODAL -->
</div>

<!-- CREATE GROUP MODAL -->
</div>

<!-- GROUP SETTINGS MODAL -->
<div class="modal-backdrop" id="modal-group-settings">
  <div class="modal" style="max-width:480px;">
    <div class="modal-header"><div><div class="modal-title">Group Settings</div></div><button class="modal-close" onclick="closeModal('modal-group-settings')">&times;</button></div>
    <div class="modal-body">
      <div class="form-group" style="margin-bottom:14px;">
        <label class="form-label">Group Name</label>
        <div style="display:flex;gap:8px;"><input class="form-control" id="gs-name" type="text"/><button class="btn btn-outline btn-sm" onclick="saveGroupName()"><i class="fas fa-save"></i></button></div>
      </div>
      <div class="section-divider">Members</div>
      <div id="gs-members" style="max-height:200px;overflow-y:auto;margin-bottom:12px;"></div>
      <div style="display:flex;gap:8px;">
        <select class="form-control" id="gs-add-member"></select>
        <button class="btn btn-gold btn-sm" onclick="addGroupMember()"><i class="fas fa-plus"></i> Add</button>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-danger btn-sm" onclick="deleteGroup()" title="Delete group permanently"><i class="fas fa-trash"></i> Delete Group</button>
      <button class="btn btn-outline" onclick="closeModal('modal-group-settings')">Done</button>
    </div>
  </div>
</div>

<!-- CUSTOM ROLE MODAL -->
<div class="modal-backdrop" id="modal-role">
  <div class="modal" style="max-width:560px;">
    <div class="modal-header"><div><div class="modal-title" id="role-modal-title">New Role</div></div><button class="modal-close" onclick="closeModal('modal-role')">&times;</button></div>
    <div class="modal-body">
      <div class="form-group" style="margin-bottom:16px;"><label class="form-label">Role Name <span class="required">*</span></label><input class="form-control" id="role-name-input" type="text" placeholder="e.g. Junior Advocate, Senior Assistant"/></div>
      <div class="form-group"><label class="form-label">Permissions</label>
        <div id="role-permissions" style="max-height:320px;overflow-y:auto;border:1px solid var(--border);border-radius:6px;padding:0 12px;"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-role')">Cancel</button>
      <button class="btn btn-gold" onclick="saveCustomRole()"><i class="fas fa-save"></i> Save Role</button>
    </div>
  </div>`;
})();

/*
  Simple front-end logic:
  - Branching: if Reviewed = No => show message and prevent submit
  - File checks: max files 5, max 8MB per file (client-side)
  - Validation: required HTML + extra checks
  - Submission: demo POST to endpoint (configure below). If endpointURL is empty, form will show preview JSON instead.
*/

// CONFIG: set your real submission endpoint here (POST). If left blank, the code will show preview only.
const endpointURL = ""; // e.g. "https://yourdomain.com/api/submit" (must accept multipart/form-data if files included)

const form = document.getElementById('reviewForm');
const reviewedRadios = form.elements['reviewed'];
const pleaseReviewMsg = document.getElementById('pleaseReviewMsg');
const section3 = document.getElementById('section3');
const filesInput = document.getElementById('files');
const statusMsg = document.getElementById('statusMsg');

function updateBranching(){
  const reviewed = form.elements['reviewed'].value || (Array.from(reviewedRadios).find(r=>r.checked)?.value);
  // if no radio selected, value will be undefined - keep sections visible but block submit
  const checked = Array.from(reviewedRadios).find(r=>r.checked);
  if(!checked){
    // nothing selected yet - hide message and keep going but disable submit via validity
    pleaseReviewMsg.classList.add('hidden');
    pleaseReviewMsg.setAttribute('aria-hidden','true');
    section3.style.display = '';
    return;
  }
  if(checked.value === 'no'){
    pleaseReviewMsg.classList.remove('hidden');
    pleaseReviewMsg.setAttribute('aria-hidden','false');
    // hide the rest of the required sections — or keep visible but disable submit
    section3.style.display = 'none';
  } else {
    pleaseReviewMsg.classList.add('hidden');
    pleaseReviewMsg.setAttribute('aria-hidden','true');
    section3.style.display = '';
  }
}

// enforce file limits client-side
filesInput.addEventListener('change', (e)=>{
  const files = Array.from(e.target.files || []);
  const maxFiles = 5;
  const maxSize = 8 * 1024 * 1024; // 8 MB
  if(files.length > maxFiles){
    alert(`Please select up to ${maxFiles} files only.`);
    filesInput.value = "";
    return;
  }
  for(const f of files){
    if(f.size > maxSize){
      alert(`The file "${f.name}" exceeds the maximum size of 8MB.`);
      filesInput.value = "";
      return;
    }
  }
});

// watch radios
Array.from(reviewedRadios).forEach(r => r.addEventListener('change', updateBranching));
updateBranching(); // initial

// Preview button - show JSON summary
const previewModal = document.getElementById('previewModal');
const previewBody = document.getElementById('previewBody');
const closePreview = document.getElementById('closePreview');
const editBtn = document.getElementById('editBtn');
const confirmSubmitBtn = document.getElementById('confirmSubmitBtn');

function showPreviewModal(payload){
  // Build friendly HTML (label/value rows)
  const rows = [];

  function addRow(label, value){
    const safe = value === undefined || value === null || value === '' ? '<span style="color:#9aa5b1;font-style:italic;">(not provided)</span>' : escapeHtml(String(value));
    rows.push(`<div class="preview-row"><div class="preview-label">${escapeHtml(label)}</div><div class="preview-value">${safe}</div></div>`);
  }

  addRow('Organization Name', payload.orgName);
  addRow('Reviewed the Summary?', payload.reviewed === 'yes' ? 'Yes' : (payload.reviewed === 'no' ? 'No' : ''));
  addRow('Changes (if any)', payload.changes || 'No changes.');
  // files: present names or none
  const filesList = (payload.files && payload.files.length) ? payload.files.map(f=>escapeHtml(f.name)).join(', ') : '(no files)';
  addRow('Uploaded files', filesList);
  addRow('Confirmed accuracy', payload.agree ? 'I agree' : 'Not confirmed');
  addRow('Signature (Full name)', payload.fullName);
  addRow('Submitted at', payload.submittedAt);

  previewBody.innerHTML = rows.join('');
  previewModal.classList.remove('hidden');

  // trap focus to modal (simple)
  closePreview.focus();
}

// close handlers
closePreview.addEventListener('click', closePreviewModal);
editBtn.addEventListener('click', closePreviewModal);
function closePreviewModal(){
  previewModal.classList.add('hidden');
  // return focus to preview button
  document.getElementById('previewBtn').focus();
}

// Confirm & Submit: trigger same submit pipeline as main form
confirmSubmitBtn.addEventListener('click', async ()=>{
  // close modal and submit
  previewModal.classList.add('hidden');
  // trigger programmatic submit (use existing form submit handler)
  document.getElementById('reviewForm').dispatchEvent(new Event('submit', {cancelable:true, bubbles:true}));
});

// override Preview button (use our modal)
document.getElementById('previewBtn').addEventListener('click', (ev)=>{
  ev.preventDefault();
  // validate visible fields quickly, but do not submit
  const ok = validateForm(true);
  if(!ok) return;
  const payload = buildPayload();
  showPreviewModal(payload);
});

// escapeHtml utility (same as in your script; reuse if already present)
function escapeHtml(str){
  return (str+'').replace(/[&<>"]/g, (s)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[s]));
}


// form submit
form.addEventListener('submit', async (ev)=>{
  ev.preventDefault();
  statusMsg.classList.add('hidden'); statusMsg.setAttribute('aria-hidden','true');

  // check branching: if reviewed === no then block
  const checked = Array.from(reviewedRadios).find(r=>r.checked);
  if(!checked){
    alert('Please confirm whether you reviewed the summary (Yes/No).');
    return;
  }
  if(checked.value === 'no'){
    alert('Please review the Summary first, then re-open the form and submit.');
    return;
  }

  const valid = validateForm();
  if(!valid) return;

  if(!endpointURL){
    const payload = buildPayload();
    statusMsg.classList.remove('hidden'); statusMsg.setAttribute('aria-hidden','false');
    statusMsg.innerHTML = `<strong>No endpoint configured.</strong> Preview playback shown below:<pre style="white-space:pre-wrap;">${escapeHtml(JSON.stringify(payload,null,2))}</pre><div style="margin-top:8px;color:var(--muted);">Provide a backend submission endpoint to enable real submissions.</div>`;
    window.scrollTo({top: statusMsg.offsetTop - 20, behavior: 'smooth'});
    return;
  }

  // If endpointURL is set, do a multipart/form-data POST
  try {
    const formData = new FormData();
    const payload = buildPayload();
    formData.append('payload', JSON.stringify(payload));
    // Append files
    const files = filesInput.files;
    for(let i=0;i<files.length;i++){
      formData.append('file' + (i+1), files[i], files[i].name);
    }

    // POST to your endpoint
    const res = await fetch(endpointURL, { method:'POST', body:formData });
    if(!res.ok) throw new Error('Server returned ' + res.status);
    const data = await res.json().catch(()=>({success:true}));
    statusMsg.classList.remove('hidden'); statusMsg.setAttribute('aria-hidden','false');
    statusMsg.style.borderLeftColor = 'green';
    statusMsg.innerHTML = `<strong>Submitted successfully.</strong><div style="margin-top:6px;">${escapeHtml(JSON.stringify(data))}</div>`;
    // optionally reset
    form.reset();
    updateBranching();
  } catch (err) {
    statusMsg.classList.remove('hidden'); statusMsg.setAttribute('aria-hidden','false');
    statusMsg.style.borderLeftColor = 'red';
    statusMsg.innerHTML = `<strong>Submission error:</strong> ${escapeHtml(err.message)}`;
  }

});

// Build payload
function buildPayload(){
  const formEl = form;
  const formData = {};
  formData.orgName = (formEl.orgName.value || '').trim();
  const reviewed = Array.from(reviewedRadios).find(r=>r.checked)?.value || '';
  formData.reviewed = reviewed;
  formData.changes = (formEl.changes?.value || '').trim();
  formData.agree = formEl.agree?.checked ? true : false;
  formData.fullName = (formEl.fullName?.value || '').trim();
  // files list (names only client-side)
  formData.files = Array.from(filesInput.files || []).map(f=>({name:f.name, size:f.size}));
  formData.submittedAt = new Date().toISOString();
  return formData;
}

// simple validation function (checks required visible fields)
function validateForm(quiet=false){
  // check orgName
  if(!form.orgName.value.trim()){
    if(!quiet) alert('Please enter Organization Name.');
    form.orgName.focus();
    return false;
  }
  // reviewed checked
  const checked = Array.from(reviewedRadios).find(r=>r.checked);
  if(!checked){
    if(!quiet) alert('Please confirm whether you reviewed the Summary (Yes/No).');
    return false;
  }
  if(checked.value === 'yes'){
    // require changes
    if(!form.changes.value.trim()){
      if(!quiet) alert('Please describe any changes or type "No changes."');
      form.changes.focus();
      return false;
    }
  }
  // agree checkbox
  if(!form.agree.checked){
    if(!quiet) alert('Please confirm the accuracy by checking "I agree".');
    return false;
  }
  // fullName
  if(!form.fullName.value.trim()){
    if(!quiet) alert('Please type your full name as signature.');
    form.fullName.focus();
    return false;
  }

  // file count already enforced on change; but double-check
  if(filesInput.files.length > 5){
    if(!quiet) alert('Please upload up to 5 files only.');
    return false;
  }
  return true;
}

function escapeHtml(str){
  return (str+'').replace(/[&<>"]/g, (s)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[s]));
}
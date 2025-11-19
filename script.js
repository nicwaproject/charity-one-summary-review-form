/* CONFIG */
const endpointURL = ""; // set when ready to accept submissions (POST multipart/form-data)

/* ELEMENTS */
const form = document.getElementById('reviewForm');
const reviewedRadios = form.elements['reviewed'];
const pleaseReviewMsg = document.getElementById('pleaseReviewMsg');
const section3 = document.getElementById('sec3');
const filesInput = document.getElementById('files');
const statusMsg = document.getElementById('statusMsg');

/* Branching logic: if reviewed=no -> show message & hide section3 */
function updateBranching(){
  const checked = Array.from(reviewedRadios).find(r=>r.checked);
  if(!checked){
    pleaseReviewMsg.classList.add('hidden');
    pleaseReviewMsg.setAttribute('aria-hidden','true');
    section3.style.display = '';
    return;
  }
  if(checked.value === 'no'){
    pleaseReviewMsg.classList.remove('hidden');
    pleaseReviewMsg.setAttribute('aria-hidden','false');
    section3.style.display = 'none';
  } else {
    pleaseReviewMsg.classList.add('hidden');
    pleaseReviewMsg.setAttribute('aria-hidden','true');
    section3.style.display = '';
  }
}

/* File constraints */
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

/* watch radios */
Array.from(reviewedRadios).forEach(r => r.addEventListener('change', updateBranching));
updateBranching();

/* build payload */
function buildPayload(){
  const formEl = form;
  const payload = {};
  payload.orgName = (formEl.orgName.value || '').trim();
  payload.reviewed = Array.from(reviewedRadios).find(r=>r.checked)?.value || '';
  payload.changes = (formEl.changes?.value || '').trim();
  payload.changeType = (formEl.changeType?.value || '').trim();
  payload.agree = formEl.agree?.checked ? true : false;
  payload.fullName = (formEl.fullName?.value || '').trim();
  payload.files = Array.from(filesInput.files || []).map(f=>({name:f.name,size:f.size}));
  payload.submittedAt = new Date().toISOString();
  return payload;
}

/* validation */
function validateForm(quiet=false){
  if(!form.orgName.value.trim()){
    if(!quiet) alert('Please enter Organization Name.');
    form.orgName.focus();
    return false;
  }
  const checked = Array.from(reviewedRadios).find(r=>r.checked);
  if(!checked){
    if(!quiet) alert('Please confirm whether you reviewed the Summary (Yes/No).');
    return false;
  }
  if(checked.value === 'yes'){
    if(!form.changes.value.trim()){
      if(!quiet) alert('Please describe any changes or type "No changes."');
      form.changes.focus();
      return false;
    }
  }
  if(!form.agree.checked){
    if(!quiet) alert('Please confirm the accuracy by checking "I agree".');
    return false;
  }
  if(!form.fullName.value.trim()){
    if(!quiet) alert('Please type your full name as signature.');
    form.fullName.focus();
    return false;
  }
  if(filesInput.files.length > 5){
    if(!quiet) alert('Please upload up to 5 files only.');
    return false;
  }
  return true;
}

/* Preview modal logic */
const previewModal = document.getElementById('previewModal');
const previewBody = document.getElementById('previewBody');
const closePreview = document.getElementById('closePreview');
const editBtn = document.getElementById('editBtn');
const confirmSubmitBtn = document.getElementById('confirmSubmitBtn');

function escapeHtml(str){ return (str+'').replace(/[&<>"]/g, (s)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[s])); }

function showPreviewModal(payload){
  const rows = [];
  function addRow(label, value){
    const safe = value === undefined || value === null || value === '' ? '<span style="color:#9aa5b1;font-style:italic;">(not provided)</span>' : escapeHtml(String(value));
    rows.push(`<div class="preview-row"><div class="preview-label">${escapeHtml(label)}</div><div class="preview-value">${safe}</div></div>`);
  }
  addRow('Organization Name', payload.orgName);
  addRow('Reviewed the Summary?', payload.reviewed === 'yes' ? 'Yes' : (payload.reviewed === 'no' ? 'No' : ''));
  addRow('Changes (if any)', payload.changes || 'No changes.');
  addRow('Type of change (optional)', payload.changeType || '(not provided)');
  const filesList = (payload.files && payload.files.length) ? payload.files.map(f=>escapeHtml(f.name)).join(', ') : '(no files)';
  addRow('Uploaded files', filesList);
  addRow('Confirmed accuracy', payload.agree ? 'I agree' : 'Not confirmed');
  addRow('Signature (Full name)', payload.fullName);
  addRow('Submitted at', payload.submittedAt);
  previewBody.innerHTML = rows.join('');
  previewModal.classList.remove('hidden');
  closePreview.focus();
}

closePreview.addEventListener('click', closePreviewModal);
editBtn.addEventListener('click', closePreviewModal);
function closePreviewModal(){ previewModal.classList.add('hidden'); document.getElementById('previewBtn').focus(); }

confirmSubmitBtn.addEventListener('click', async ()=>{
  previewModal.classList.add('hidden');
  document.getElementById('reviewForm').dispatchEvent(new Event('submit', {cancelable:true, bubbles:true}));
});

/* Preview button */
document.getElementById('previewBtn').addEventListener('click', (ev)=>{
  ev.preventDefault();
  const ok = validateForm(true);
  if(!ok) return;
  const payload = buildPayload();
  showPreviewModal(payload);
});

/* form submit */
form.addEventListener('submit', async (ev)=>{
  ev.preventDefault();
  statusMsg.classList.add('hidden'); statusMsg.setAttribute('aria-hidden','true');

  const checked = Array.from(reviewedRadios).find(r=>r.checked);
  if(!checked){
    alert('Please confirm whether you reviewed the Summary (Yes/No).');
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
    statusMsg.style.borderLeftColor = 'var(--dark-blue)';
    statusMsg.innerHTML = `<strong>No endpoint configured.</strong> Preview data:<pre style="white-space:pre-wrap;">${escapeHtml(JSON.stringify(payload,null,2))}</pre><div style="margin-top:8px;color:var(--muted);">Provide a backend submission endpoint to enable real submissions.</div>`;
    window.scrollTo({top: statusMsg.offsetTop - 20, behavior: 'smooth'});
    return;
  }

  try {
    const formData = new FormData();
    const payload = buildPayload();
    formData.append('payload', JSON.stringify(payload));
    const files = filesInput.files;
    for(let i=0;i<files.length;i++){ formData.append('file' + (i+1), files[i], files[i].name); }

    const res = await fetch(endpointURL, { method:'POST', body:formData });
    if(!res.ok) throw new Error('Server returned ' + res.status);
    const data = await res.json().catch(()=>({success:true}));
    statusMsg.classList.remove('hidden'); statusMsg.setAttribute('aria-hidden','false');
    statusMsg.style.borderLeftColor = 'green';
    statusMsg.innerHTML = `<strong>Submitted successfully.</strong><div style="margin-top:6px;">${escapeHtml(JSON.stringify(data))}</div>`;
    form.reset();
    updateBranching();
  } catch (err) {
    statusMsg.classList.remove('hidden'); statusMsg.setAttribute('aria-hidden','false');
    statusMsg.style.borderLeftColor = 'red';
    statusMsg.innerHTML = `<strong>Submission error:</strong> ${escapeHtml(err.message)}`;
  }
});

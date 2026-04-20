/* ====================== SUPABASE SETUP ====================== */
let supabase = null;
function initSupabase() {
  try {
    if (window.supabase && window.supabase.createClient) {
      const supabaseUrl = 'https://ilxzzmsqtzvjvkkdqhbe.supabase.co';
      const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlseHp6bXNxdHp2anZra2RxaGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDgwMjYsImV4cCI6MjA5MjE4NDAyNn0.l4zkNBGopLdE8Wt3KMHnfxySHwFHyEoto8txBgh4wMY';
      supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    }
  } catch(e) {
    console.warn('Supabase init failed, running in local demo mode.', e);
    supabase = null;
  }
}
// Try to init immediately and also after DOM ready (CDN may load late)
initSupabase();
document.addEventListener('DOMContentLoaded', initSupabase);

/* ====================== STATIC DATA ====================== */
const USERS = {
  STU001:{role:'student',name:'Ama Korkor',initials:'AK',class:'6B',id:'STU001'},
  STU002:{role:'student',name:'Kofi Asante',initials:'KA',class:'6B',id:'STU002'},
  TCH001:{role:'teacher',name:'Abena Boateng',initials:'AB',class:'Class 6B Teacher',id:'TCH001'}
};
const PASSWORDS = {STU001:'student123',STU002:'student456',TCH001:'teacher123'};

const SUBJECTS = [
  {name:'Mathematics',teacher:'Mr. Asare',progress:82,emoji:'➕',color:'gold'},
  {name:'English Language',teacher:'Ms. Owusu',progress:75,emoji:'📝',color:'blue'},
  {name:'Science',teacher:'Mr. Boateng',progress:88,emoji:'🔬',color:'green'},
  {name:'Social Studies',teacher:'Ms. Ofori',progress:70,emoji:'🌍',color:'purple'},
  {name:'Creative Arts',teacher:'Ms. Acheampong',progress:91,emoji:'🎨',color:'gold'},
  {name:'RME',teacher:'Mr. Frimpong',progress:66,emoji:'📖',color:'purple'},
  {name:'French',teacher:'Mme. Kusi',progress:60,emoji:'🇫🇷',color:'blue'},
  {name:'ICT',teacher:'Ms. Mensah',progress:94,emoji:'💻',color:'green'},
];

const GRADES = [
  {subject:'Mathematics',classScore:'38/40',examScore:'52/60',total:90,grade:'A',remark:'Excellent'},
  {subject:'English Language',classScore:'32/40',examScore:'45/60',total:77,grade:'B',remark:'Good'},
  {subject:'Science',classScore:'35/40',examScore:'48/60',total:83,grade:'A',remark:'Excellent'},
  {subject:'Social Studies',classScore:'30/40',examScore:'40/60',total:70,grade:'B',remark:'Good'},
  {subject:'Creative Arts',classScore:'36/40',examScore:'50/60',total:86,grade:'A',remark:'Excellent'},
  {subject:'RME',classScore:'28/40',examScore:'38/60',total:66,grade:'C',remark:'Average'},
  {subject:'French',classScore:'25/40',examScore:'35/60',total:60,grade:'C',remark:'Average'},
  {subject:'ICT',classScore:'39/40',examScore:'55/60',total:94,grade:'A',remark:'Excellent'},
];

const STUDENTS = [
  'Ama Korkor','Kofi Asante','Adwoa Mensah','Kweku Boateng','Efua Ofori',
  'Yaw Frimpong','Abena Darko','Kwame Agyei','Afia Nyarko','Nana Osei',
  'Akosua Appiah','Kojo Twumasi','Adwoa Sarpong','Fiifi Quansah','Esi Asare',
  'Kwabena Duku','Maame Serwaa','Kwesi Asamoah','Akua Owusu','Yaa Amankwah',
];

const TIMETABLE = [
  ['Maths','English','Science','Maths','French'],
  ['Science','Maths','English','ICT','Maths'],
  ['English','BREAK','Creative Arts','Social Studies','RME'],
  ['LUNCH','LUNCH','LUNCH','LUNCH','LUNCH'],
  ['ICT','Science','RME','French','Science'],
  ['Social Studies','Creative Arts','Maths','English','ICT'],
];
const TT_TIMES = ['7:30–8:20','8:20–9:10','9:10–10:00','10:00–10:30','10:30–11:20','11:20–12:10'];
const TT_COLORS = {
  'Maths':'filled-gold','English':'filled-blue','Science':'filled-green',
  'ICT':'filled-green','French':'filled-purple','Social Studies':'filled-purple',
  'Creative Arts':'filled-gold','RME':'filled-red','BREAK':'break','LUNCH':'lunch'
};

/* ====================== LIVE STATE ====================== */
let currentUser = null, currentRole = 'student';
let ASSIGNMENTS = [], SUBMISSIONS = [], NOTICES = [], RESOURCES = [], ATTENDANCE_RECORDS = [];
let attState = {};
let aiHistory = [];

/* ====================== LOGIN ====================== */
window.setRole = function(r){
  currentRole = r;
  document.getElementById('role-student').classList.toggle('active', r==='student');
  document.getElementById('role-teacher').classList.toggle('active', r==='teacher');
  document.getElementById('id-label').textContent = r==='student' ? 'Student ID' : 'Teacher ID';
  document.getElementById('login-id').placeholder = r==='student' ? 'e.g. STU001' : 'e.g. TCH001';
};

window.doLogin = async function(){
  // Try init again in case CDN loaded late
  if (!supabase) initSupabase();

  const id = document.getElementById('login-id').value.trim().toUpperCase();
  const pw = document.getElementById('login-pass').value;
  const btn = document.getElementById('login-btn-text');

  document.getElementById('login-error').style.display = 'none';

  if(!id || !pw){ showErr('Please enter your ID and password.'); return; }
  if(!USERS[id]){ showErr('ID not found. Please check and try again.'); return; }
  if(PASSWORDS[id] !== pw){ showErr('Incorrect password. Please try again.'); return; }

  // Prevent double-click
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading Portal…';
  btn.parentElement.disabled = true;

  currentRole = USERS[id].role;
  window.setRole(currentRole);
  currentUser = USERS[id];

  try {
    await fetchAllData();
  } catch (error) {
    console.warn("Database fetch failed, continuing with local demo data.", error);
  }

  btn.innerHTML = '<i class="fas fa-check-circle"></i> Welcome!';
  setTimeout(()=>{
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Log In';
    btn.parentElement.disabled = false;

    // Show dashboard, hide login page chrome
    document.getElementById('login-section').classList.add('hidden');
    const dash = document.getElementById('lms-dashboard');
    dash.classList.add('active');

    const navbar = document.querySelector('.navbar');
    const footer = document.querySelector('footer');
    const wa = document.querySelector('.whatsapp-btn');
    const btt = document.getElementById('backToTop');
    if(navbar) navbar.style.display = 'none';
    if(footer) footer.style.display = 'none';
    if(wa) wa.style.display = 'none';
    if(btt) btt.style.display = 'none';

    buildDashboard();
  }, 600);
};

async function fetchAllData(){
  if(!supabase) return;
  try {
    const [asgn, subs, noticesRes, resRes, attRes] = await Promise.all([
      supabase.from('assignments').select('*').order('created_at',{ascending:false}),
      supabase.from('submissions').select('*').order('created_at',{ascending:false}),
      supabase.from('notices').select('*').order('created_at',{ascending:false}),
      supabase.from('resources').select('*').order('created_at',{ascending:false}),
      supabase.from('attendance').select('*').order('date',{ascending:false}),
    ]);
    if(asgn.data) ASSIGNMENTS = asgn.data.map(mapAssignment);
    if(subs.data) SUBMISSIONS = subs.data;
    if(noticesRes.data) NOTICES = noticesRes.data;
    if(resRes.data) RESOURCES = resRes.data;
    if(attRes.data) ATTENDANCE_RECORDS = attRes.data;
  } catch (e) {
    console.error("Supabase Error:", e);
    throw e;
  }
}

function mapAssignment(item){
  return {
    id:item.id, title:item.title, subject:item.subject,
    desc:item.description, due:item.due, status:item.status||'open',
    color:item.color||'blue', type:item.assignment_type||'standard',
    content:item.content, created_at:item.created_at
  };
}

function showErr(msg){
  const e = document.getElementById('login-error');
  e.textContent = msg;
  e.style.display = 'block';
  e.scrollIntoView({behavior:'smooth', block:'center'});
}

window.doLogout = function doLogout(){
  const dash = document.getElementById('lms-dashboard');
  dash.classList.remove('active');

  document.getElementById('login-section').classList.remove('hidden');

  const navbar = document.querySelector('.navbar');
  const footer = document.querySelector('footer');
  const wa = document.querySelector('.whatsapp-btn');
  const btt = document.getElementById('backToTop');
  if(navbar) navbar.style.display = '';
  if(footer) footer.style.display = '';
  if(wa) wa.style.display = '';
  if(btt) btt.style.display = '';

  document.getElementById('login-id').value = '';
  document.getElementById('login-pass').value = '';
  currentUser = null;
  aiHistory = [];
  window.scrollTo({top:0, behavior:'smooth'});
}

/* ====================== DASHBOARD BUILDER ====================== */
function buildDashboard(){
  const u = currentUser;
  document.getElementById('sb-avatar').textContent = u.initials;
  document.getElementById('sb-name').textContent = u.name;
  document.getElementById('sb-sub').textContent = u.role==='student'?`Class ${u.class} · ${u.id}`:`${u.class} · ${u.id}`;
  document.getElementById('sb-role-label').textContent = u.role==='student'?'Student Portal':'Teacher Portal';

  const nav = document.getElementById('sidebar-nav');
  const pending = ASSIGNMENTS.filter(a=>a.status==='open'||a.status==='pending').length;
  const newNotices = NOTICES.filter(n=>!n.read).length;

  const items = u.role==='student' ? [
    {section:'Overview', links:[
      {icon:'th-large',label:'Dashboard',page:'s-dashboard'},
      {icon:'book-open',label:'My Subjects',page:'s-subjects'},
    ]},
    {section:'Academics', links:[
      {icon:'tasks',label:'Assignments',page:'s-assignments',badge:pending||null},
      {icon:'chart-bar',label:'My Grades',page:'s-grades'},
      {icon:'calendar-alt',label:'Timetable',page:'s-timetable'},
      {icon:'user-check',label:'Attendance',page:'s-attendance'},
    ]},
    {section:'Learning', links:[
      {icon:'question-circle',label:'Quizzes',page:'s-quiz'},
      {icon:'book',label:'Resources',page:'s-resources',badge:RESOURCES.length||null},
      {icon:'robot',label:'AI Tutor',page:'s-ai'},
      {icon:'bell',label:'Notices',page:'s-notices',badge:newNotices||null},
    ]},
  ] : [
    {section:'Overview', links:[
      {icon:'th-large',label:'Dashboard',page:'t-dashboard'},
      {icon:'users',label:'My Class',page:'t-class'},
    ]},
    {section:'Academics', links:[
      {icon:'tasks',label:'Assignments',page:'t-assignments'},
      {icon:'inbox',label:'Submissions',page:'t-submissions',badge:SUBMISSIONS.filter(s=>!s.graded).length||null},
      {icon:'chart-bar',label:'Grade Book',page:'t-grades'},
      {icon:'clipboard-list',label:'Attendance',page:'t-attendance'},
    ]},
    {section:'Communication', links:[
      {icon:'bullhorn',label:'Notices',page:'t-notices'},
      {icon:'file-upload',label:'Resources',page:'t-resources'},
      {icon:'calendar-alt',label:'Timetable',page:'t-timetable'},
    ]},
  ];

  nav.innerHTML = items.map(s=>` <div class="sb-section">${s.section}</div> ${s.links.map(l=>`
  <div class="sb-item${l.page===(u.role==='student'?'s-dashboard':'t-dashboard')?' active':''}" onclick="showPage('${l.page}',this)">
  <i class="fas fa-${l.icon}"></i> ${l.label}
  ${l.badge?`<span class="sb-badge">${l.badge}</span>`:''}
  </div>`).join('')} `).join('');

  renderPage(u.role==='student'?'s-dashboard':'t-dashboard');
}

function showPage(page, el){
  document.querySelectorAll('.sb-item').forEach(n=>n.classList.remove('active'));
  if(el) el.classList.add('active');
  const titles = {
    's-dashboard':'Dashboard','s-subjects':'My Subjects','s-assignments':'Assignments',
    's-grades':'My Grades','s-timetable':'Timetable','s-quiz':'Quizzes',
    's-attendance':'Attendance','s-resources':'Study Resources','s-ai':'AI Tutor',
    's-notices':'School Notices','t-dashboard':'Dashboard','t-class':'My Class',
    't-assignments':'Manage Assignments','t-submissions':'Submissions Inbox',
    't-grades':'Grade Book','t-attendance':'Attendance','t-notices':'School Notices',
    't-timetable':'Timetable','t-resources':'Learning Resources',
  };
  document.getElementById('topbar-title').textContent = titles[page]||page;
  renderPage(page);
  closeSidebar();
  window.scrollTo({top:0,behavior:'smooth'});
}

function openSidebar(){document.getElementById('lms-sidebar').classList.add('open');document.getElementById('sb-overlay').classList.add('open');}
function closeSidebar(){document.getElementById('lms-sidebar').classList.remove('open');document.getElementById('sb-overlay').classList.remove('open');}
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.addEventListener('click',e=>{if(e.target.classList.contains('lms-modal')) e.target.classList.remove('open');});
function toast(msg,type='success'){
  const t=document.getElementById('lms-toast');
  const icon=t.querySelector('i');
  document.getElementById('toast-msg').textContent=msg;
  icon.className = type==='error'?'fas fa-times-circle':'fas fa-check-circle';
  t.style.background = type==='error'?'#dc2626':'var(--primary)';
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3500);
}

function renderPage(page){
  const c = document.getElementById('pages-container');
  c.innerHTML='';
  const div = document.createElement('div');
  div.className='lms-page active';
  div.innerHTML = pages[page] ? pages[page]() : renderEmptyState('tools', 'Coming Soon', 'This section is being built.');
  c.appendChild(div);
  afterRender(page);
}

/* ====================== HELPERS ====================== */
function getAvgGrade(){
  const sum = GRADES.reduce((a,g)=>a+g.total,0);
  return Math.round(sum/GRADES.length);
}
function getSubColor(col){
  return col==='gold'?'var(--accent)':col==='blue'?'#3b82f6':col==='green'?'#22c55e':'#8b5cf6';
}
function gradeColor(g){return g==='A'?'green':g==='B'?'blue':g==='C'?'gold':'red';}
function getStudentSubmission(aId){return SUBMISSIONS.find(s=>s.assignment_id===aId&&s.student_id===currentUser.id);}
function getUngraded(){return SUBMISSIONS.filter(s=>!s.graded);}
function fmtDate(d){if(!d)return'—';try{return new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});}catch(e){return d;}}

function getInitials(name) {
  if (!name) return '';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2);
}

function renderEmptyState(icon, title, desc) {
  return `<div class="empty-state"><i class="fas fa-${icon}"></i><h3>${title}</h3><p>${desc}</p></div>`;
}

function renderEmptyStateSm(icon, text) {
  return `<div class="empty-state-sm"><i class="fas fa-${icon}"></i><span>${text}</span></div>`;
}

function renderProgressBar(percentage, color = '') {
  const bgStyle = color ? `background:${color};` : '';
  return `<div class="prog-bar"><div class="fill" style="width:${percentage}%;${bgStyle}"></div></div>`;
}

/* ====================== PAGE DEFINITIONS ====================== */
const pages = {

/* ─────── STUDENT DASHBOARD ─────── */
's-dashboard':()=>{
  const avg = getAvgGrade();
  const pct = Math.round(avg/100*100);
  const pending = ASSIGNMENTS.filter(a=>(a.status==='open'||a.status==='pending')&&!getStudentSubmission(a.id)).length;
  const recent = SUBMISSIONS.filter(s=>s.student_id===currentUser.id&&s.graded).slice(0,3);
  const hour = new Date().getHours();
  const greet = hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';

  return `
    <div class="welcome-banner">
      <div class="wb-text">
        <div class="wb-tag">📚 Term 2 — 2025/26</div>
        <h2>${greet}, ${currentUser.name.split(' ')[0]}! 👋</h2>
        <p>${pending>0?`You have <strong style="color:var(--accent)">${pending} assignment${pending>1?'s':''}</strong> waiting for submission.`:'All assignments submitted. Great work! 🎉'}</p>
      </div>
      <div class="wb-icon"><i class="fas fa-graduation-cap"></i></div>
    </div>

    <div class="stats-row">
      <div class="sc gold" onclick="showPage('s-subjects',document.querySelector('[onclick*=s-subjects]'))" style="cursor:pointer;">
        <div class="sc-icon gold"><i class="fas fa-book"></i></div>
        <div class="sc-info"><label>Subjects</label><div class="val">8</div><div class="sub">This term</div></div>
      </div>
      <div class="sc ${pending>0?'red':'green'}" onclick="showPage('s-assignments',document.querySelector('[onclick*=s-assignments]'))" style="cursor:pointer;">
        <div class="sc-icon ${pending>0?'red':'green'}"><i class="fas fa-${pending>0?'exclamation-circle':'check-circle'}"></i></div>
        <div class="sc-info"><label>Pending</label><div class="val">${pending}</div><div class="sub">Assignments</div></div>
      </div>
      <div class="sc blue">
        <div class="sc-icon blue"><i class="fas fa-chart-line"></i></div>
        <div class="sc-info"><label>Avg Grade</label><div class="val">${avg}%</div><div class="sub">All subjects</div></div>
      </div>
      <div class="sc purple">
        <div class="sc-icon purple"><i class="fas fa-bell"></i></div>
        <div class="sc-info"><label>Notices</label><div class="val">${NOTICES.length}</div><div class="sub">This term</div></div>
      </div>
    </div>

    <div class="two-col">
      <div>
        <div class="panel">
          <div class="panel-head"><h3>📋 Upcoming Assignments</h3><button class="ph-action" onclick="showPage('s-assignments',null)">View all →</button></div>
          ${ASSIGNMENTS.length===0? renderEmptyStateSm('check-double', 'No assignments yet') :`
          <table class="lms-tbl"><thead><tr><th>Subject</th><th>Task</th><th>Due</th><th>Status</th></tr></thead>
          <tbody>${ASSIGNMENTS.slice(0,5).map(a=>{
            const sub = getStudentSubmission(a.id);
            const badge = sub?`<span class="chip green">Submitted</span>`:a.status==='open'?`<span class="chip blue">Open</span>`:`<span class="chip gold">${a.status}</span>`;
            return `<tr><td>${a.subject}</td><td>${a.title}</td><td>${a.due}</td><td>${badge}</td></tr>`;
          }).join('')}</tbody></table>`}
        </div>

    <div class="panel">
      <div class="panel-head"><h3>📢 Latest Notices</h3><button class="ph-action" onclick="showPage('s-notices',null)">See all →</button></div>
      ${NOTICES.length===0? renderEmptyStateSm('bell-slash', 'No notices posted yet') :`
      <ul class="notice-list">${NOTICES.slice(0,3).map(n=>`
        <li class="notice-item">
          <div class="nd" style="background:var(--accent);"></div>
          <div><h4>${n.title}</h4><p>${n.body}</p><div class="notice-date">${fmtDate(n.created_at)}</div></div>
        </li>`).join('')}</ul>`}
    </div>
  </div>

  <div>
    <div class="panel">
      <div class="panel-head"><h3>🎯 Performance</h3></div>
      <div class="perf-ring-wrap">
        <div class="perf-ring" style="--pct:${pct*3.6}deg;">
          <div class="perf-ring-inner">
            <strong>${avg}%</strong>
            <span>Average</span>
          </div>
        </div>
        <div style="width:100%;padding:0 1.3rem;">
          ${GRADES.slice(0,5).map(g=>`
            <div style="margin-bottom:.75rem;">
              <div style="display:flex;justify-content:space-between;font-size:.76rem;font-weight:600;color:var(--primary);margin-bottom:.3rem;">
                <span>${g.subject}</span><span class="grade-${g.grade}">${g.total}%</span>
              </div>
              ${renderProgressBar(g.total)}
            </div>`).join('')}
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><h3>✅ Recent Results</h3></div>
      ${recent.length===0? renderEmptyStateSm('inbox', 'No graded work yet') :`
      ${recent.map(s=>`
        <div class="activity-item">
          <div class="act-icon" style="background:#f0fdf4;color:#15803d;"><i class="fas fa-check-double"></i></div>
          <div class="act-info">
            <p><strong>${s.assignment_title||'Assignment'}</strong> — ${s.subject||''}</p>
            <p>Score: <strong style="color:var(--lms-green);">${s.score!==null&&s.score!==undefined?s.score+'/100':'Pending'}</strong> ${s.feedback?`· <em>${s.feedback}</em>`:''}</p>
            <span>${fmtDate(s.graded_at)}</span>
          </div>
        </div>`).join('')}`}
    </div>
  </div>
    </div>`;
},

/* ─────── STUDENT SUBJECTS ─────── */
's-subjects':()=>`
  <div class="page-header"><h2>My Subjects</h2><span>${SUBJECTS.length} courses enrolled</span></div>
  <div class="cards-grid">
    ${SUBJECTS.map(s=>`
      <div class="asgn-card" style="border-top-color:${getSubColor(s.color)};">
        <div style="font-size:2rem;margin-bottom:.6rem;">${s.emoji}</div>
        <h4>${s.name}</h4>
        <p style="margin-bottom:.8rem;">👤 ${s.teacher}</p>
        <div>
          <div style="display:flex;justify-content:space-between;font-size:.74rem;color:var(--lms-muted);margin-bottom:.3rem;">
            <span>Progress</span><span style="font-weight:700;color:var(--primary);">${s.progress}%</span>
          </div>
          ${renderProgressBar(s.progress)}
        </div>
      </div>`).join('')}
  </div>`,

/* ─────── STUDENT ASSIGNMENTS ─────── */
's-assignments':()=>`
  <div class="page-header"><h2>Assignments</h2><span>${ASSIGNMENTS.length} total · ${ASSIGNMENTS.filter(a=>!getStudentSubmission(a.id)&&a.status==='open').length} pending</span></div>
  ${ASSIGNMENTS.length===0? renderEmptyState('tasks', 'No Assignments Yet', 'Your teacher hasn\'t posted any assignments yet.') :`
  <div class="cards-grid">
    ${ASSIGNMENTS.map(a=>{
      const sub = getStudentSubmission(a.id);
      const statusBadge = sub?`<span class="chip green"><i class="fas fa-check"></i> Submitted</span>`:a.status==='open'?`<span class="chip blue">Open</span>`:`<span class="chip gold">${a.status}</span>`;
      const scoreTag = sub&&sub.score!==null?`<div style="margin-top:.5rem;font-size:.75rem;color:var(--lms-muted);">Score: <strong style="color:var(--lms-green);">${sub.score}/100</strong>${sub.feedback?` · <em>${sub.feedback}</em>`:''}</div>`:'';
      const actionBtn = !sub&&(a.status==='open'||a.status==='pending')
        ? (a.type==='mcq'
            ? `<button class="btn-gold" onclick="startQuizModal('${a.id}')"><i class="fas fa-play"></i> Start Quiz</button>`
            : `<button class="btn-gold" onclick="openSubmitModal('${a.id}')"><i class="fas fa-paper-plane"></i> Submit</button>`)
        : '';
      return `<div class="asgn-card">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:.5rem;margin-bottom:.5rem;">
          <h4>${a.title}</h4>
          <span class="chip grey" style="flex-shrink:0;">${a.type==='mcq'?'Quiz':'Task'}</span>
        </div>
        <p><strong>${a.subject}</strong> — ${a.desc||'No description'}</p>
        ${scoreTag}
        <div class="asgn-meta" style="margin-top:.8rem;">
          <span class="asgn-due"><i class="fas fa-calendar-day"></i> Due: ${a.due}</span>
          <div style="display:flex;gap:.4rem;align-items:center;">${statusBadge}${actionBtn}</div>
        </div>
      </div>`;
    }).join('')}
  </div>`}`,

/* ─────── STUDENT GRADES ─────── */
's-grades':()=>`
  <div class="page-header"><h2>My Grades</h2><span>Term 2 · 2025/26</span></div>
  <div class="two-col" style="margin-bottom:1.3rem;">
    <div class="panel">
      <div class="panel-head"><h3>Term Summary</h3></div>
      <div style="padding:1.3rem;display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div style="text-align:center;padding:1rem;background:var(--lms-surface);border-radius:10px;">
          <div style="font-family:'Poppins',sans-serif;font-size:2rem;font-weight:800;color:var(--primary);">${getAvgGrade()}%</div>
          <div style="font-size:.75rem;color:var(--lms-muted);font-weight:600;margin-top:.2rem;">Overall Average</div>
        </div>
        <div style="text-align:center;padding:1rem;background:var(--lms-surface);border-radius:10px;">
          <div style="font-family:'Poppins',sans-serif;font-size:2rem;font-weight:800;color:var(--lms-green);">${GRADES.filter(g=>g.grade==='A').length}</div>
          <div style="font-size:.75rem;color:var(--lms-muted);font-weight:600;margin-top:.2rem;">A Grades</div>
        </div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Grade Distribution</h3></div>
      <div style="padding:1.3rem;">
        ${['A','B','C','D'].map(g=>{
          const cnt = GRADES.filter(gr=>gr.grade===g).length;
          const pct = Math.round(cnt/GRADES.length*100);
          return `<div style="margin-bottom:.7rem;">
            <div style="display:flex;justify-content:space-between;font-size:.78rem;font-weight:700;margin-bottom:.25rem;">
              <span class="grade-${g}">Grade ${g}</span><span>${cnt} subject${cnt!==1?'s':''} (${pct}%)</span>
            </div>
            ${renderProgressBar(pct, g==='A'?'#22c55e':g==='B'?'#3b82f6':g==='C'?'#f59e0b':'#ef4444')}
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>
  <div class="panel">
    <div class="panel-head"><h3>Full Results</h3></div>
    <table class="lms-tbl">
      <thead><tr><th>Subject</th><th>Class Score</th><th>Exam Score</th><th>Total</th><th>Grade</th><th>Remark</th></tr></thead>
      <tbody>${GRADES.map(g=>`
        <tr>
          <td><strong>${g.subject}</strong></td>
          <td>${g.classScore}</td><td>${g.examScore}</td>
          <td><strong>${g.total}/100</strong></td>
          <td><span class="grade-${g.grade}">${g.grade}</span></td>
          <td><span class="chip ${gradeColor(g.grade)}">${g.remark}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
  ${SUBMISSIONS.filter(s=>s.student_id===currentUser.id&&s.graded).length>0?`
  <div class="panel">
    <div class="panel-head"><h3>Graded Submissions</h3></div>
    <table class="lms-tbl">
      <thead><tr><th>Assignment</th><th>Subject</th><th>Score</th><th>Feedback</th><th>Date</th></tr></thead>
      <tbody>${SUBMISSIONS.filter(s=>s.student_id===currentUser.id&&s.graded).map(s=>`
        <tr>
          <td><strong>${s.assignment_title||'—'}</strong></td>
          <td>${s.subject||'—'}</td>
          <td><strong style="color:var(--lms-green);">${s.score!==null?s.score+'/100':'—'}</strong></td>
          <td><em style="color:var(--lms-muted);">${s.feedback||'—'}</em></td>
          <td>${fmtDate(s.graded_at)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`:''}`,

/* ─────── STUDENT TIMETABLE ─────── */
's-timetable':()=>`
  <div class="page-header"><h2>Weekly Timetable</h2><span>Class 6B · Term 2</span></div>
  <div class="panel">
    <div class="tt-wrap">
      <div class="tt-grid" style="grid-template-columns:80px repeat(5,1fr);">
        <div class="tt-head">Time</div>
        ${['Monday','Tuesday','Wednesday','Thursday','Friday'].map(d=>`<div class="tt-head">${d}</div>`).join('')}
        ${TIMETABLE.map((row,ri)=>`
          <div class="tt-cell" style="font-size:.62rem;color:var(--lms-muted);font-weight:700;">${TT_TIMES[ri]}</div>
          ${row.map(sub=>`<div class="tt-cell ${TT_COLORS[sub]||''}">
            ${sub}<div class="tt-sub">${['Maths','English','Science','ICT','French','Social Studies','Creative Arts','RME'].includes(sub)?'Class 6B':''}</div>
          </div>`).join('')}`).join('')}
      </div>
    </div>
    <div style="padding:1rem 1.3rem;border-top:1px solid var(--lms-border);display:flex;gap:1.5rem;flex-wrap:wrap;">
      ${[['filled-gold','Core Subjects'],['filled-blue','Languages'],['filled-green','Sciences'],['filled-purple','Humanities'],['break','Break'],['lunch','Lunch']].map(([cls,label])=>
        `<div style="display:flex;align-items:center;gap:.4rem;font-size:.75rem;color:var(--lms-muted);font-weight:600;">
          <div style="width:12px;height:12px;border-radius:3px;" class="${cls}"></div>${label}
        </div>`).join('')}
    </div>
  </div>`,

/* ─────── STUDENT ATTENDANCE ─────── */
's-attendance':()=>{
  const myRecords = ATTENDANCE_RECORDS.filter(r=>r.student_id===currentUser.id);
  const present = myRecords.filter(r=>r.status==='present').length;
  const absent = myRecords.filter(r=>r.status==='absent').length;
  const total = myRecords.length;
  const pct = total>0?Math.round(present/total*100):100;
  return `
  <div class="page-header"><h2>My Attendance</h2><span>Term 2 · 2025/26</span></div>
  <div class="stats-row" style="margin-bottom:1.3rem;">
    <div class="sc green"><div class="sc-icon green"><i class="fas fa-check-circle"></i></div>
      <div class="sc-info"><label>Present Days</label><div class="val">${present||'—'}</div></div></div>
    <div class="sc red"><div class="sc-icon red"><i class="fas fa-times-circle"></i></div>
      <div class="sc-info"><label>Absent Days</label><div class="val">${absent||'—'}</div></div></div>
    <div class="sc blue"><div class="sc-icon blue"><i class="fas fa-percentage"></i></div>
      <div class="sc-info"><label>Attendance Rate</label><div class="val">${pct}%</div></div></div>
  </div>
  <div class="panel">
    <div class="panel-head"><h3>Attendance Record</h3></div>
    ${myRecords.length===0? renderEmptyStateSm('calendar-check', 'No attendance records yet') :`
    <table class="lms-tbl">
      <thead><tr><th>Date</th><th>Status</th><th>Notes</th></tr></thead>
      <tbody>${myRecords.map(r=>`
        <tr>
          <td>${fmtDate(r.date)}</td>
          <td><span class="chip ${r.status==='present'?'green':'red'}">${r.status==='present'?'✓ Present':'✗ Absent'}</span></td>
          <td style="color:var(--lms-muted);font-size:.8rem;">${r.notes||'—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>`}
  </div>`;
},

/* ─────── STUDENT QUIZZES ─────── */
's-quiz':()=>{
  const quizzes = ASSIGNMENTS.filter(a=>a.type==='mcq');
  return `
  <div class="page-header"><h2>Quizzes</h2><span>${quizzes.length} available</span></div>
  ${quizzes.length===0? renderEmptyState('question-circle', 'No Quizzes Yet', 'Your teacher hasn\'t posted any quizzes. Check back soon!') :`
  <div class="cards-grid">
    ${quizzes.map(q=>{
      const sub = getStudentSubmission(q.id);
      const qCount = Array.isArray(q.content)?q.content.length:0;
      return `<div class="asgn-card" style="border-top-color:#8b5cf6;">
        <div style="font-size:1.8rem;margin-bottom:.5rem;">📝</div>
        <h4>${q.title}</h4>
        <p>${q.subject} · ${qCount} question${qCount!==1?'s':''}</p>
        <div class="asgn-meta" style="margin-top:.8rem;">
          <span class="asgn-due"><i class="fas fa-calendar-day"></i> Due: ${q.due}</span>
          ${sub?`<span class="chip green">Done · ${sub.score!==null?sub.score+'/'+qCount:''}</span>`:
            `<button class="btn-gold" onclick="startQuizModal('${q.id}')"><i class="fas fa-play"></i> Start</button>`}
        </div>
      </div>`;
    }).join('')}
  </div>`}`;
},

/* ─────── STUDENT RESOURCES ─────── */
's-resources':()=>`
  <div class="page-header"><h2>Study Resources</h2><span>${RESOURCES.length} files shared</span></div>
  ${RESOURCES.length===0? renderEmptyState('book-open', 'No Resources Yet', 'Your teacher hasn\'t uploaded any resources yet.') :`
  <div style="display:flex;flex-direction:column;gap:.9rem;">
    ${RESOURCES.map(r=>`
      <div class="resource-card">
        <div class="res-icon" style="background:${r.type==='PDF'?'#fee2e2':r.type==='Video'?'#dbeafe':'#f0fdf4'};color:${r.type==='PDF'?'#b91c1c':r.type==='Video'?'#1e40af':'#15803d'};">
          <i class="fas fa-${r.type==='PDF'?'file-pdf':r.type==='Video'?'video':'file-alt'}"></i>
        </div>
        <div class="res-info">
          <strong>${r.title}</strong>
          <span>${r.subject||''} ${r.type?'· '+r.type:''} ${r.description?'· '+r.description:''}</span>
        </div>
        ${r.url?`<a href="${r.url}" target="_blank" rel="noopener" class="res-dl" title="Open Resource"><i class="fas fa-external-link-alt"></i></a>`:''}
      </div>`).join('')}
  </div>`}`,

/* ─────── STUDENT AI TUTOR ─────── */
's-ai':()=>`
  <div class="page-header"><h2>AI Study Tutor</h2><span>Powered by Claude</span></div>
  <div class="panel" style="max-width:720px;">
    <div class="panel-head">
      <h3>🤖 Ask me anything about your subjects</h3>
      <button class="btn-outline" style="font-size:.75rem;padding:.35rem .8rem;" onclick="clearAiChat()"><i class="fas fa-redo"></i> Reset</button>
    </div>
    <div class="modal-body" style="padding:1.2rem;">
      <div class="ai-chat" id="ai-chat" style="max-height:420px;">
        <div class="ai-msg ai">
          <div class="ai-av bot">🤖</div>
          <div class="ai-bubble">Hi ${currentUser.name.split(' ')[0]}! I'm your AI Study Tutor. I can help you understand any subject — Maths, Science, English, Social Studies, or anything from your syllabus. What would you like to learn today?</div>
        </div>
      </div>
      <div class="ai-input-row" style="margin-top:1rem;">
        <input class="ai-input" id="ai-input" placeholder="Ask a question, e.g. 'Explain fractions with examples'" onkeydown="if(event.key==='Enter')sendAiMsg()">
        <button class="btn-gold" onclick="sendAiMsg()"><i class="fas fa-paper-plane"></i></button>
      </div>
      <div style="margin-top:.8rem;display:flex;gap:.5rem;flex-wrap:wrap;" id="ai-suggestions">
        ${['What are fractions?','Explain photosynthesis','How do I write an essay?','What is the water cycle?'].map(s=>
          `<button class="ai-suggestion" onclick="setAiInput('${s}')">${s}</button>`).join('')}
      </div>
    </div>
  </div>`,

/* ─────── STUDENT NOTICES ─────── */
's-notices':()=>`
  <div class="page-header"><h2>School Notices</h2><span>${NOTICES.length} published</span></div>
  ${NOTICES.length===0? renderEmptyState('bell-slash', 'No Notices', 'No notices have been posted yet.') :`
  <div style="display:flex;flex-direction:column;gap:1rem;max-width:720px;">
    ${NOTICES.map(n=>`
      <div class="panel" style="margin-bottom:0;">
        <div style="padding:1.2rem;">
          <div style="display:flex;align-items:flex-start;gap:.75rem;">
            <div style="width:36px;height:36px;border-radius:10px;background:#fffbeb;color:#b45309;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:.9rem;"><i class="fas fa-bullhorn"></i></div>
            <div style="flex:1;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-bottom:.4rem;">
                <h4 style="font-family:'Poppins',sans-serif;font-size:.92rem;font-weight:700;color:var(--primary);">${n.title}</h4>
                <span style="font-size:.7rem;color:var(--lms-muted);">${fmtDate(n.created_at)}</span>
              </div>
              <p style="font-size:.84rem;color:var(--text);line-height:1.6;">${n.body}</p>
              ${n.posted_by?`<div style="margin-top:.5rem;font-size:.72rem;color:var(--lms-muted);">Posted by: <strong>${n.posted_by}</strong></div>`:''}
            </div>
          </div>
        </div>
      </div>`).join('')}
  </div>`}`,

/* ─────── TEACHER DASHBOARD ─────── */
't-dashboard':()=>{
  const ungraded = getUngraded().length;
  return `
  <div class="welcome-banner">
    <div class="wb-text">
      <div class="wb-tag">📋 Class Teacher — 6B</div>
      <h2>Good day, ${currentUser.name.split(' ')[1]||currentUser.name}! 👩‍🏫</h2>
      <p>${ungraded>0?`<strong style="color:var(--accent)">${ungraded} submission${ungraded>1?'s':''}</strong> awaiting grading.`:'All submissions graded. Excellent work!'}</p>
    </div>
    <div class="wb-icon"><i class="fas fa-chalkboard-teacher"></i></div>
  </div>

  <div class="stats-row">
    <div class="sc gold"><div class="sc-icon gold"><i class="fas fa-users"></i></div>
      <div class="sc-info"><label>Students</label><div class="val">34</div><div class="sub">Class 6B</div></div></div>
    <div class="sc blue"><div class="sc-icon blue"><i class="fas fa-tasks"></i></div>
      <div class="sc-info"><label>Assignments</label><div class="val">${ASSIGNMENTS.length}</div><div class="sub">Published</div></div></div>
    <div class="sc ${ungraded>0?'red':'green'}"><div class="sc-icon ${ungraded>0?'red':'green'}"><i class="fas fa-inbox"></i></div>
      <div class="sc-info"><label>To Grade</label><div class="val">${ungraded}</div><div class="sub">Submissions</div></div></div>
    <div class="sc purple"><div class="sc-icon purple"><i class="fas fa-bullhorn"></i></div>
      <div class="sc-info"><label>Notices</label><div class="val">${NOTICES.length}</div><div class="sub">Posted</div></div></div>
  </div>

  <div class="two-col">
    <div class="panel">
      <div class="panel-head"><h3>Recent Assignments</h3><button class="ph-action" onclick="showPage('t-assignments',null)">Manage →</button></div>
      ${ASSIGNMENTS.length===0? renderEmptyStateSm('plus-circle', 'No assignments yet. Create one!') :`
      <table class="lms-tbl">
        <thead><tr><th>Task</th><th>Subject</th><th>Due</th><th>Subs</th></tr></thead>
        <tbody>${ASSIGNMENTS.slice(0,5).map(a=>{
          const subs = SUBMISSIONS.filter(s=>s.assignment_id===a.id).length;
          return `<tr><td><strong>${a.title}</strong></td><td>${a.subject}</td><td>${a.due}</td>
          <td><span class="chip ${subs>0?'green':'grey'}">${subs} student${subs!==1?'s':''}</span></td></tr>`;
        }).join('')}</tbody>
      </table>`}
    </div>

<div class="panel">
  <div class="panel-head"><h3>Ungraded Submissions</h3><button class="ph-action" onclick="showPage('t-submissions',null)">View all →</button></div>
  ${getUngraded().length===0? renderEmptyStateSm('check-double', 'All submissions graded!') :`
  ${getUngraded().slice(0,5).map(s=>`
    <div class="activity-item">
      <div class="act-icon" style="background:#fef3c7;color:#b45309;"><i class="fas fa-file-alt"></i></div>
      <div class="act-info">
        <p><strong>${s.student_name||'Student'}</strong> submitted <em>${s.assignment_title||'an assignment'}</em></p>
        <span>${fmtDate(s.created_at)}</span>
      </div>
      <button class="btn-gold" style="font-size:.72rem;padding:.35rem .8rem;margin-left:auto;flex-shrink:0;" onclick="openGraderFor('${s.id}')">Grade</button>
    </div>`).join('')}`}
</div>

  </div>

  <div class="two-col">
    <div class="panel">
      <div class="panel-head"><h3>Quick Attendance</h3><button class="ph-action" onclick="showPage('t-attendance',null)">Full View →</button></div>
      <div id="t-quick-att"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Latest Notices</h3><button class="ph-action" onclick="showPage('t-notices',null)">Post Notice →</button></div>
      ${NOTICES.length===0? renderEmptyStateSm('bell-slash', 'No notices yet') :`
      <ul class="notice-list">${NOTICES.slice(0,3).map(n=>`
        <li class="notice-item">
          <div class="nd" style="background:var(--accent);"></div>
          <div><h4>${n.title}</h4><div class="notice-date">${fmtDate(n.created_at)}</div></div>
        </li>`).join('')}</ul>`}
    </div>
  </div>`;
},

/* ─────── TEACHER CLASS ─────── */
't-class':()=>`
  <div class="page-header"><h2>My Class</h2><span>${STUDENTS.length} students enrolled · Class 6B</span></div>
  <div class="panel">
    <div class="panel-head">
      <h3>Student Roster</h3>
      <input type="text" id="student-search" placeholder="Search student…" onkeyup="filterStudents()" style="padding:.4rem .9rem;border:1.5px solid var(--lms-border);border-radius:8px;font-family:var(--font-lms);font-size:.82rem;outline:none;width:200px;">
    </div>
    <div id="student-list">
      ${STUDENTS.map((s,i)=>`
        <div class="std-row" data-name="${s.toLowerCase()}">
          <div class="std-av">${getInitials(s)}</div>
          <div class="std-info"><strong>${s}</strong><span>STU${String(i+1).padStart(3,'0')}</span></div>
          <div class="ml-auto" style="display:flex;gap:.5rem;">
            <span class="chip ${i%7===2?'red':i%5===0?'gold':'green'}">${i%7===2?'Absent Today':i%5===0?'Needs Support':'On Track'}</span>
          </div>
        </div>`).join('')}
    </div>
  </div>`,

/* ─────── TEACHER ASSIGNMENTS ─────── */
't-assignments':()=>`
  <div class="page-header"><h2>Manage Assignments</h2><span>${ASSIGNMENTS.length} published</span></div>
  <div class="panel" style="margin-bottom:1.3rem;">
    <div class="panel-head"><h3>➕ Create New Assignment</h3></div>
    <div style="padding:1.2rem;display:grid;grid-template-columns:1fr 1fr;gap:.9rem;">
      <div class="lms-form-group"><label>Title</label><input type="text" id="asgn-title" placeholder="e.g. Fractions Worksheet"></div>
      <div class="lms-form-group"><label>Subject</label>
        <select id="asgn-subj">${SUBJECTS.map(s=>`<option>${s.name}</option>`).join('')}</select>
      </div>
      <div class="lms-form-group"><label>Due Date</label><input type="date" id="asgn-due"></div>
      <div class="lms-form-group"><label>Format</label>
        <select id="asgn-type" onchange="toggleFormat()">
          <option value="standard">📝 Written Task</option>
          <option value="mcq">🔘 Multiple Choice Quiz</option>
        </select>
      </div>
      <div class="lms-form-group" id="fmt-standard" style="grid-column:span 2;">
        <label>Instructions / Description</label>
        <textarea id="asgn-desc" rows="4" placeholder="Describe the assignment clearly…"></textarea>
      </div>
      <div class="lms-form-group" id="fmt-mcq" style="grid-column:span 2; display:none;">
        <label>Quiz Builder</label>
        <div id="mcq-list" style="display:flex;flex-direction:column;gap:.8rem;"></div>
        <button class="btn-outline" style="margin-top:.8rem;" onclick="addMcq()"><i class="fas fa-plus"></i> Add Question</button>
      </div>
    </div>
    <div style="padding:0 1.2rem 1.2rem;display:flex;gap:.7rem;">
      <button class="btn-lms-primary" style="width:auto;padding:.65rem 1.6rem;" onclick="publishAssignment()" id="btn-publish"><i class="fas fa-paper-plane"></i> Publish to Class</button>
      <button class="btn-outline" onclick="renderPage('t-assignments')">Cancel</button>
    </div>
  </div>
  <div class="panel">
    <div class="panel-head"><h3>Active Assignments</h3></div>
    ${ASSIGNMENTS.length===0? renderEmptyStateSm('inbox', 'No assignments published yet') :`
    <table class="lms-tbl">
      <thead><tr><th>Title</th><th>Subject</th><th>Due</th><th>Type</th><th>Submissions</th><th>Action</th></tr></thead>
      <tbody>${ASSIGNMENTS.map(a=>{
        const subs = SUBMISSIONS.filter(s=>s.assignment_id===a.id).length;
        return `<tr>
          <td><strong>${a.title}</strong></td><td>${a.subject}</td><td>${a.due}</td>
          <td><span class="chip grey">${a.type==='mcq'?'Quiz':'Task'}</span></td>
          <td><span class="chip ${subs>0?'green':'grey'}">${subs} / ${STUDENTS.length}</span></td>
          <td><button class="btn-gold" style="font-size:.75rem;padding:.4rem .8rem;" onclick="viewSubmissions('${a.id}')">View Submissions</button></td>
        </tr>`;
      }).join('')}</tbody>
    </table>`}
  </div>`,

/* ─────── TEACHER SUBMISSIONS ─────── */
't-submissions':()=>`
  <div class="page-header"><h2>Submissions Inbox</h2><span>${SUBMISSIONS.length} total · ${getUngraded().length} to grade</span></div>
  ${SUBMISSIONS.length===0? renderEmptyState('inbox', 'No Submissions Yet', 'Students haven\'t submitted any work yet.') :`
  <div class="panel">
    <div class="panel-head">
      <h3>All Submissions</h3>
      <div style="display:flex;gap:.5rem;">
        <button class="btn-outline" style="font-size:.75rem;padding:.35rem .8rem;" onclick="filterSubs('all')" id="f-all">All (${SUBMISSIONS.length})</button>
        <button class="btn-outline" style="font-size:.75rem;padding:.35rem .8rem;" onclick="filterSubs('ungraded')" id="f-ungraded">To Grade (${getUngraded().length})</button>
        <button class="btn-outline" style="font-size:.75rem;padding:.35rem .8rem;" onclick="filterSubs('graded')" id="f-graded">Graded (${SUBMISSIONS.filter(s=>s.graded).length})</button>
      </div>
    </div>
    <table class="lms-tbl" id="subs-table">
      <thead><tr><th>Student</th><th>Assignment</th><th>Subject</th><th>Submitted</th><th>Status</th><th>Score</th><th>Action</th></tr></thead>
      <tbody id="subs-tbody">${renderSubsRows(SUBMISSIONS)}</tbody>
    </table>
  </div>`}`,

/* ─────── TEACHER GRADES ─────── */
't-grades':()=>`
  <div class="page-header"><h2>Grade Book</h2><span>Class 6B · Term 2</span></div>
  <div class="panel">
    <div class="panel-head">
      <h3>Term Results</h3>
      <button class="ph-action" onclick="toast('CSV export coming soon!')"><i class="fas fa-download"></i> Export CSV</button>
    </div>
    <table class="lms-tbl">
      <thead><tr><th>Student</th><th>Maths</th><th>English</th><th>Science</th><th>Social Studies</th><th>Average</th><th>Grade</th></tr></thead>
      <tbody>${STUDENTS.slice(0,15).map((s,i)=>{
        const sc=[75+i%15,68+i%18,80+i%12,72+i%10];
        const avg=Math.round(sc.reduce((a,b)=>a+b,0)/sc.length);
        const g=avg>=80?'A':avg>=70?'B':avg>=60?'C':'D';
        return `<tr><td><div style="display:flex;align-items:center;gap:.6rem;"><div class="std-av" style="width:26px;height:26px;font-size:.68rem;">${getInitials(s)}</div><span>${s}</span></div></td>
        ${sc.map(v=>`<td>${v}%</td>`).join('')}<td><strong>${avg}%</strong></td><td><span class="grade-${g}">${g}</span></td></tr>`;
      }).join('')}
      </tbody>
    </table>
  </div>`,

/* ─────── TEACHER ATTENDANCE ─────── */
't-attendance':()=>`
  <div class="page-header"><h2>Attendance</h2><span>${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span></div>
  <div class="panel">
    <div class="panel-head">
      <h3>Mark Today's Attendance</h3>
      <div style="display:flex;gap:.5rem;">
        <button class="btn-gold" onclick="markAllPresent()"><i class="fas fa-check-double"></i> All Present</button>
        <button class="btn-lms-primary" style="width:auto;padding:.5rem 1.2rem;font-size:.82rem;" onclick="saveAttendance()"><i class="fas fa-save"></i> Save</button>
      </div>
    </div>
    <div id="att-mark-list"></div>
  </div>`,

/* ─────── TEACHER NOTICES ─────── */
't-notices':()=>`
  <div class="page-header"><h2>School Notices</h2><span>${NOTICES.length} published</span></div>
  <div class="two-col">
    <div class="panel">
      <div class="panel-head"><h3>📢 Post New Notice</h3></div>
      <div style="padding:1.2rem;display:flex;flex-direction:column;gap:.9rem;">
        <div class="lms-form-group"><label>Notice Title</label><input type="text" id="notice-title" placeholder="e.g. End-of-Term Reminder"></div>
        <div class="lms-form-group"><label>Message</label><textarea id="notice-body" rows="5" placeholder="Write the full notice here…"></textarea></div>
        <button class="btn-lms-primary" style="width:auto;padding:.65rem 1.6rem;" onclick="publishNotice()"><i class="fas fa-bullhorn"></i> Publish to All Students</button>
      </div>
    </div>
    <div>
      <div class="panel">
        <div class="panel-head"><h3>Published Notices</h3></div>
        ${NOTICES.length===0? renderEmptyStateSm('bell-slash', 'No notices posted yet') :`
        ${NOTICES.map(n=>`
          <div class="activity-item">
            <div class="act-icon" style="background:#fffbeb;color:#b45309;"><i class="fas fa-bullhorn"></i></div>
            <div class="act-info" style="flex:1;">
              <p><strong>${n.title}</strong></p>
              <span>${n.body.length>80?n.body.slice(0,80)+'…':n.body}</span>
              <span style="display:block;margin-top:.2rem;">${fmtDate(n.created_at)}</span>
            </div>
            <button onclick="deleteItem('notice', '${n.id}')" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:.9rem;" title="Delete"><i class="fas fa-trash"></i></button>
          </div>`).join('')}`}
      </div>
    </div>
  </div>`,

/* ─────── TEACHER RESOURCES ─────── */
't-resources':()=>`
  <div class="page-header"><h2>Learning Resources</h2><span>${RESOURCES.length} files shared</span></div>
  <div class="two-col">
    <div class="panel">
      <div class="panel-head"><h3>📤 Share New Resource</h3></div>
      <div style="padding:1.2rem;display:flex;flex-direction:column;gap:.9rem;">
        <div class="lms-form-group"><label>Resource Title</label><input type="text" id="res-title" placeholder="e.g. Maths Textbook Chapter 4"></div>
        <div class="lms-form-group"><label>Subject</label>
          <select id="res-subj">${SUBJECTS.map(s=>`<option>${s.name}</option>`).join('')}</select>
        </div>
        <div class="lms-form-group"><label>Type</label>
          <select id="res-type"><option>PDF</option><option>Video</option><option>Link</option><option>Document</option></select>
        </div>
        <div class="lms-form-group"><label>URL / Link</label><input type="url" id="res-url" placeholder="https://…"></div>
        <div class="lms-form-group"><label>Description (optional)</label><textarea id="res-desc" rows="2" placeholder="Brief description…"></textarea></div>
        <button class="btn-lms-primary" style="width:auto;padding:.65rem 1.6rem;" onclick="publishResource()"><i class="fas fa-share-alt"></i> Share with Students</button>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Shared Resources</h3></div>
      ${RESOURCES.length===0? renderEmptyStateSm('folder-open', 'No resources shared yet') :`
      <div style="display:flex;flex-direction:column;">
        ${RESOURCES.map(r=>`
          <div class="resource-card" style="border-radius:0;box-shadow:none;border-bottom:1px solid var(--lms-border);padding:.9rem 1.3rem;">
            <div class="res-icon" style="background:${r.type==='PDF'?'#fee2e2':r.type==='Video'?'#dbeafe':'#f0fdf4'};color:${r.type==='PDF'?'#b91c1c':r.type==='Video'?'#1e40af':'#15803d'};">
              <i class="fas fa-${r.type==='PDF'?'file-pdf':r.type==='Video'?'video':'link'}"></i>
            </div>
            <div class="res-info">
              <strong>${r.title}</strong>
              <span>${r.subject||''} · ${r.type}</span>
            </div>
            <button onclick="deleteItem('resource', '${r.id}')" style="background:none;border:none;color:#ef4444;cursor:pointer;margin-left:auto;" title="Delete"><i class="fas fa-trash"></i></button>
          </div>`).join('')}
      </div>`}
    </div>
  </div>`,

/* ─────── TEACHER TIMETABLE ─────── */
't-timetable':()=>`
  <div class="page-header"><h2>Class Timetable</h2><span>Class 6B · Term 2</span></div>
  <div class="panel">
    <div class="tt-wrap">
      <div class="tt-grid" style="grid-template-columns:80px repeat(5,1fr);">
        <div class="tt-head">Time</div>
        ${['Monday','Tuesday','Wednesday','Thursday','Friday'].map(d=>`<div class="tt-head">${d}</div>`).join('')}
        ${TIMETABLE.map((row,ri)=>`
          <div class="tt-cell" style="font-size:.62rem;color:var(--lms-muted);font-weight:700;">${TT_TIMES[ri]}</div>
          ${row.map(sub=>`<div class="tt-cell ${TT_COLORS[sub]||''}">${sub}</div>`).join('')}`).join('')}
      </div>
    </div>
  </div>`,
};

/* ====================== SUBMISSION RENDERING ====================== */
function renderSubsRows(subs){
  return subs.map(s=>` <tr> <td><strong>${s.student_name||'—'}</strong><br><span style="font-size:.72rem;color:var(--lms-muted);">${s.student_id||''}</span></td> <td>${s.assignment_title||'—'}</td> <td>${s.subject||'—'}</td> <td>${fmtDate(s.created_at)}</td> <td><span class="chip ${s.graded?'green':'gold'}">${s.graded?'Graded':'Pending'}</span></td> <td>${s.score!==null&&s.score!==undefined?`<strong style="color:var(--lms-green);">${s.score}/100</strong>`:'<span style="color:var(--lms-muted);">—</span>'}</td> <td><button class="btn-gold" style="font-size:.75rem;padding:.4rem .8rem;" onclick="openGraderFor('${s.id}')">${s.graded?'Update':'Grade'}</button></td> </tr>`).join('');
}

window.filterSubs = function(type){
  const filtered = type==='ungraded'?SUBMISSIONS.filter(s=>!s.graded):type==='graded'?SUBMISSIONS.filter(s=>s.graded):SUBMISSIONS;
  document.getElementById('subs-tbody').innerHTML = renderSubsRows(filtered);
  ['all','ungraded','graded'].forEach(k=>{
    const btn = document.getElementById('f-'+k);
    if(btn) btn.style.background = k===type?'var(--primary)':'';
    if(btn) btn.style.color = k===type?'#fff':'';
  });
};

window.viewSubmissions = function(aId){
  showPage('t-submissions', document.querySelector('[onclick*=t-submissions]'));
};

/* ====================== GRADER MODAL ====================== */
window.openGraderFor = function(subId){
  const sub = SUBMISSIONS.find(s=>s.id===subId);
  if(!sub) return;
  const gl = document.getElementById('grader-list');
  gl.innerHTML = ` <div style="background:var(--lms-surface);padding:1rem;border-radius:10px;margin-bottom:1rem;"> <div style="font-size:.75rem;color:var(--lms-muted);font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-bottom:.3rem;">Student</div> <strong>${sub.student_name||'Unknown'}</strong> · ${sub.assignment_title||'Assignment'} ${sub.answer?`<div style="margin-top:.8rem;font-size:.82rem;color:var(--text);line-height:1.6;padding:.8rem;background:#fff;border-radius:8px;border:1px solid var(--lms-border);">
  <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--lms-muted);margin-bottom:.3rem;">Submitted Answer</div>
  ${sub.answer}
  </div>`:'<div style="margin-top:.5rem;font-size:.8rem;color:var(--lms-muted);">No written answer provided.</div>'} </div> <div class="lms-form-group"><label>Score (out of 100)</label> <input type="number" id="grade-score" min="0" max="100" value="${sub.score||''}" placeholder="e.g. 85"> </div> <div class="lms-form-group"><label>Feedback to Student</label> <textarea id="grade-feedback" rows="3" placeholder="Write encouraging feedback…">${sub.feedback||''}</textarea> </div>`;
  document.getElementById('grader-modal').dataset.subId = subId;
  openModal('grader-modal');
};

window.openGrader = function(){
  const sub = SUBMISSIONS[0];
  if(sub) openGraderFor(sub.id);
  else { toast('No submissions to grade yet.', 'error'); }
};

window.saveGrades = async function(){
  const subId = document.getElementById('grader-modal').dataset.subId;
  const score = parseInt(document.getElementById('grade-score').value);
  const feedback = document.getElementById('grade-feedback').value.trim();
  if(isNaN(score)||score<0||score>100){toast('Enter a valid score (0–100).', 'error');return;}

  if(supabase){
    const {error} = await supabase.from('submissions').update({
      score, feedback, graded:true, graded_at:new Date().toISOString()
    }).eq('id',subId);
    if(error){toast('Failed to save grade.', 'error'); console.error(error); return;}
  }

  const idx = SUBMISSIONS.findIndex(s=>s.id===subId);
  if(idx>-1){SUBMISSIONS[idx]={...SUBMISSIONS[idx],score,feedback,graded:true,graded_at:new Date().toISOString()};}
  closeModal('grader-modal');
  toast(`Grade saved — ${score}/100`);
  renderPage('t-submissions');
};

/* ====================== SUBMIT ASSIGNMENT MODAL ====================== */
window.openSubmitModal = function(aId){
  const a = ASSIGNMENTS.find(x=>x.id===aId);
  if(!a) return;
  const gl = document.getElementById('submit-modal-body');
  if(!gl) return openSubmitModalFallback(aId);
  gl.innerHTML = ` <div style="background:var(--lms-surface);padding:.9rem;border-radius:10px;margin-bottom:1rem;"> <strong>${a.title}</strong> · ${a.subject}<br> <span style="font-size:.78rem;color:var(--lms-muted);">Due: ${a.due}</span> ${a.desc?`<p style="font-size:.82rem;margin-top:.5rem;">${a.desc}</p>`:''} </div> <div class="lms-form-group"><label>Your Answer / Work</label> <textarea id="submit-answer" rows="6" placeholder="Type your answer or paste your work here…"></textarea> </div>`;
  document.getElementById('submit-modal').dataset.aId = aId;
  openModal('submit-modal');
};

function openSubmitModalFallback(aId){
  const answer = prompt('Type your answer:');
  if(answer) submitAssignment(aId, answer);
}

window.doSubmit = async function(){
  const aId = document.getElementById('submit-modal').dataset.aId;
  const answer = document.getElementById('submit-answer').value.trim();
  if(!answer){toast('Please write your answer before submitting.', 'error');return;}
  await submitAssignment(aId, answer);
  closeModal('submit-modal');
};

async function submitAssignment(aId, answer){
  const a = ASSIGNMENTS.find(x=>x.id===aId);
  const payload = {
    assignment_id: aId,
    assignment_title: a?.title||'',
    subject: a?.subject||'',
    student_id: currentUser.id,
    student_name: currentUser.name,
    answer: answer,
    graded: false,
    score: null,
    feedback: null,
    created_at: new Date().toISOString()
  };
  if(supabase){
    const {data,error} = await supabase.from('submissions').insert([payload]).select();
    if(error){toast('Submission failed. Please try again.', 'error'); console.error(error); return;}
    if(data) SUBMISSIONS.unshift(data[0]);
  } else {
    SUBMISSIONS.unshift({...payload, id:'local-'+Date.now()});
  }
  toast('Assignment submitted successfully! ✅');
  renderPage('s-assignments');
}

/* ====================== QUIZ ENGINE ====================== */
let activeQuiz = {questions:[], idx:0, score:0, answered:false};

window.startQuizModal = function(aId){
  const a = ASSIGNMENTS.find(x=>x.id===aId);
  if(!a||!Array.isArray(a.content)||a.content.length===0){toast('Quiz has no questions yet.', 'error');return;}
  activeQuiz = {aId, questions:a.content, idx:0, score:0, answered:false, startTime:Date.now()};
  renderQuizQuestion();
  openModal('quiz-modal');
};

function renderQuizQuestion(){
  const {questions,idx} = activeQuiz;
  const q = questions[idx];
  const pct = Math.round((idx/questions.length)*100);
  document.getElementById('quiz-body').innerHTML = ` <div class="quiz-counter">Question ${idx+1} of ${questions.length}</div> <div class="quiz-prog">${renderProgressBar(pct)}</div> <div class="quiz-q">${q.question}</div> <div class="quiz-opts"> ${q.options.filter(o=>o).map((o,i)=>`
  <div class="quiz-opt" onclick="selectQuizOpt(${i})" id="qopt-${i}">${String.fromCharCode(65+i)}. ${o}</div>`).join('')} </div> <button class="btn-gold" id="quiz-next-btn" style="display:none;" onclick="nextQuizQ()"> ${idx+1<questions.length?'Next Question →':'See Results'} </button>`;
}

window.selectQuizOpt = function(i){
  if(activeQuiz.answered) return;
  activeQuiz.answered = true;
  const {questions,idx} = activeQuiz;
  const correct = questions[idx].answerIndex;
  if(i===correct) activeQuiz.score++;
  document.querySelectorAll('.quiz-opt').forEach((el,j)=>{
    if(j===correct) el.classList.add('correct');
    else if(j===i) el.classList.add('wrong');
    el.style.pointerEvents='none';
  });
  document.getElementById('quiz-next-btn').style.display='block';
};

window.nextQuizQ = async function(){
  activeQuiz.idx++;
  activeQuiz.answered=false;
  if(activeQuiz.idx>=activeQuiz.questions.length){
    const {score,questions,aId} = activeQuiz;
    const pct = Math.round(score/questions.length*100);
    document.getElementById('quiz-body').innerHTML=` <div class="quiz-result"> <div style="font-size:2.5rem;margin-bottom:.5rem;">${pct>=80?'🎉':pct>=60?'👍':'📚'}</div> <div class="quiz-score">${score}<span>/${questions.length}</span></div> <p style="color:var(--lms-muted);margin:.5rem 0 1.2rem;">${pct}% · ${pct>=80?'Excellent!':pct>=60?'Good effort!':'Keep studying!'}</p> <button class="btn-gold" onclick="closeModal('quiz-modal');renderPage('s-quiz')">Done</button> </div>`;
    await submitAssignment(aId, `Quiz completed: ${score}/${questions.length} (${pct}%)`);
    return;
  }
  renderQuizQuestion();
};

/* ====================== AI TUTOR ====================== */
window.sendAiMsg = async function(){
  const inp = document.getElementById('ai-input');
  const chat = document.getElementById('ai-chat');
  if(!inp||!chat||!inp.value.trim()) return;
  const msg = inp.value.trim();
  inp.value='';

  document.getElementById('ai-suggestions') && (document.getElementById('ai-suggestions').style.display='none');

  chat.innerHTML += `<div class="ai-msg user"><div class="ai-av usr">👤</div><div class="ai-bubble">${msg}</div></div>`;
  chat.innerHTML += `<div class="ai-msg ai" id="ai-typing-indicator"><div class="ai-av bot">🤖</div><div class="ai-bubble"><div class="ai-typing"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div></div></div>`;
  chat.scrollTop = chat.scrollHeight;

  aiHistory.push({role:'user',content:msg});

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:1000,
        system:`You are a friendly, encouraging AI Study Tutor for De-Bright Talented Kids School in Ghana — a primary school. You help students in Class 6 with their subjects: Mathematics, English Language, Science, Social Studies, Creative Arts, RME, French, and ICT.

        Key guidelines:
        - Use simple, age-appropriate language (students are ~11-12 years old)
        - Be warm, encouraging, and patient
        - Give practical examples using Ghanaian context where possible
        - If explaining Maths, show step-by-step workings
        - Keep responses concise but complete
        - Use emojis sparingly to be friendly
        - If a student is struggling, break concepts into smaller steps
        - The Ghanaian curriculum follows the NaCCA framework
        - Current term is Term 2, 2025/26 academic year`,
        messages: aiHistory.slice(-10)
      })
    });
    const data = await res.json();
    const reply = data.content?.[0]?.text || "I'm sorry, I couldn't generate a response. Please try again!";
    aiHistory.push({role:'assistant',content:reply});
  
    document.getElementById('ai-typing-indicator')?.remove();
    chat.innerHTML += `<div class="ai-msg ai"><div class="ai-av bot">🤖</div><div class="ai-bubble">${reply.replace(/\n/g,'<br>')}</div></div>`;
    chat.scrollTop = chat.scrollHeight;
  } catch(e){
    document.getElementById('ai-typing-indicator')?.remove();
    chat.innerHTML += `<div class="ai-msg ai"><div class="ai-av bot">🤖</div><div class="ai-bubble">Sorry, I'm having trouble connecting. Please check your internet and try again.</div></div>`;
    chat.scrollTop = chat.scrollHeight;
  }
};

window.setAiInput = function(text){
  const inp = document.getElementById('ai-input');
  if(inp){inp.value=text;inp.focus();}
};

window.clearAiChat = function(){
  aiHistory=[];
  renderPage('s-ai');
};

/* ====================== TEACHER ACTIONS ====================== */
window.publishNotice = async function(){
  const title = document.getElementById('notice-title').value.trim();
  const body = document.getElementById('notice-body').value.trim();
  if(!title||!body){toast('Please fill in both fields.', 'error');return;}
  const payload = {title, body, posted_by:currentUser.name, created_at:new Date().toISOString()};
  if(supabase){
    const {data,error}=await supabase.from('notices').insert([payload]).select();
    if(error){toast('Failed to post notice.', 'error'); console.error(error); return;}
    if(data) NOTICES.unshift(data[0]);
  } else {
    NOTICES.unshift({...payload,id:'local-'+Date.now()});
  }
  toast('Notice published to all students! 📢');
  renderPage('t-notices');
};

window.publishResource = async function(){
  const title=document.getElementById('res-title').value.trim();
  const subject=document.getElementById('res-subj').value;
  const type=document.getElementById('res-type').value;
  const url=document.getElementById('res-url').value.trim();
  const description=document.getElementById('res-desc').value.trim();
  if(!title){toast('Please enter a resource title.', 'error');return;}
  const payload={title,subject,type,url,description,created_at:new Date().toISOString()};
  if(supabase){
    const {data,error}=await supabase.from('resources').insert([payload]).select();
    if(error){toast('Failed to share resource.', 'error'); console.error(error); return;}
    if(data) RESOURCES.unshift(data[0]);
  } else {
    RESOURCES.unshift({...payload,id:'local-'+Date.now()});
  }
  toast('Resource shared with students! 📚');
  renderPage('t-resources');
};

window.deleteItem = async function(type, id) {
  const isNotice = type === 'notice';
  const itemName = isNotice ? 'notice' : 'resource';
  
  if(!confirm(`Delete this ${itemName}?`)) return;
  
  if(supabase) await supabase.from(isNotice ? 'notices' : 'resources').delete().eq('id', id);
  
  if (isNotice) {
    NOTICES = NOTICES.filter(n => n.id !== id);
  } else {
    RESOURCES = RESOURCES.filter(r => r.id !== id);
  }
  
  toast(`${itemName.charAt(0).toUpperCase() + itemName.slice(1)} deleted.`);
  renderPage(isNotice ? 't-notices' : 't-resources');
};

/* ====================== ATTENDANCE ====================== */
window.saveAttendance = async function(){
  const today = new Date().toISOString().split('T')[0];
  const records = STUDENTS.map((s,i)=>({
    student_id:`STU${String(i+1).padStart(3,'0')}`,
    student_name:s,
    date:today,
    status:attState[i]||'present',
    notes:'',
    class:'6B'
  }));
  if(supabase){
    const {error}=await supabase.from('attendance').upsert(records,{onConflict:'student_id,date'});
    if(error){toast('Failed to save attendance.', 'error'); console.error(error); return;}
    const {data}=await supabase.from('attendance').select('*').order('date',{ascending:false});
    if(data) ATTENDANCE_RECORDS=data;
  }
  toast(`Attendance saved for ${records.length} students! ✅`);
};

function renderAttList(){
  const el=document.getElementById('att-mark-list');
  if(!el) return;
  el.innerHTML=STUDENTS.map((s,i)=>` <div class="std-row"> <div class="std-av">${getInitials(s)}</div> <div class="std-info"><strong>${s}</strong><span>STU${String(i+1).padStart(3,'0')}</span></div> <div class="ml-auto" style="display:flex;gap:.4rem;"> <button onclick="setAtt(${i},'present')" class="att-btn ${attState[i]==='present'?'att-present':''}" style="padding:4px 14px;border-radius:999px;font-size:.72rem;font-weight:700;cursor:pointer;border:1.5px solid;transition:all .2s;${attState[i]==='present'?'background:#22c55e;color:#fff;border-color:#22c55e;':'background:transparent;color:var(--lms-muted);border-color:var(--lms-border);'}">P</button> <button onclick="setAtt(${i},'absent')" style="padding:4px 14px;border-radius:999px;font-size:.72rem;font-weight:700;cursor:pointer;border:1.5px solid;transition:all .2s;${attState[i]==='absent'?'background:#ef4444;color:#fff;border-color:#ef4444;':'background:transparent;color:var(--lms-muted);border-color:var(--lms-border);'}">A</button> </div> </div>`).join('');
}

window.setAtt=function(i,v){attState[i]=v;renderAttList();};
window.markAllPresent=function(){STUDENTS.forEach((_,i)=>{attState[i]='present';});renderAttList();toast('All students marked present!');};

/* ====================== ASSIGNMENT BUILDER ====================== */
window.toggleFormat=function(){
  const type=document.getElementById('asgn-type').value;
  document.getElementById('fmt-standard').style.display=type==='standard'?'block':'none';
  document.getElementById('fmt-mcq').style.display=type==='mcq'?'block':'none';
  if(type==='mcq'&&document.getElementById('mcq-list').children.length===0) addMcq();
};

let mcqCount=0;
window.addMcq=function(){
  mcqCount++;
  const list=document.getElementById('mcq-list');
  const div=document.createElement('div');
  div.style.cssText='background:var(--lms-surface);padding:1.2rem;border-radius:10px;border:1px solid var(--lms-border);position:relative;';
  div.innerHTML=` <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem;"> <strong style="font-size:.8rem;color:var(--primary);">Question ${mcqCount}</strong> <button onclick="this.closest('div[style]').remove()" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:.85rem;"><i class="fas fa-times"></i></button> </div> <input type="text" class="mcq-q" placeholder="Enter your question…" style="width:100%;padding:.65rem;border:1.5px solid var(--lms-border);border-radius:8px;font-family:var(--font-lms);font-size:.85rem;margin-bottom:.6rem;outline:none;background:#fff;"> <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-bottom:.7rem;"> <input type="text" class="mcq-o0" placeholder="Option A" style="padding:.6rem;border:1.5px solid var(--lms-border);border-radius:8px;font-family:var(--font-lms);font-size:.8rem;outline:none;background:#fff;"> <input type="text" class="mcq-o1" placeholder="Option B" style="padding:.6rem;border:1.5px solid var(--lms-border);border-radius:8px;font-family:var(--font-lms);font-size:.8rem;outline:none;background:#fff;"> <input type="text" class="mcq-o2" placeholder="Option C" style="padding:.6rem;border:1.5px solid var(--lms-border);border-radius:8px;font-family:var(--font-lms);font-size:.8rem;outline:none;background:#fff;"> <input type="text" class="mcq-o3" placeholder="Option D (optional)" style="padding:.6rem;border:1.5px solid var(--lms-border);border-radius:8px;font-family:var(--font-lms);font-size:.8rem;outline:none;background:#fff;"> </div> <div style="display:flex;align-items:center;gap:.6rem;font-size:.8rem;font-weight:600;color:var(--primary);"> <label>Correct:</label> <select class="mcq-ans" style="padding:.4rem .8rem;border:1.5px solid var(--lms-border);border-radius:8px;font-family:var(--font-lms);outline:none;"> <option value="0">Option A</option><option value="1">Option B</option><option value="2">Option C</option><option value="3">Option D</option> </select> </div>`;
  list.appendChild(div);
};

window.publishAssignment=async function(){
  const title=document.getElementById('asgn-title').value.trim();
  const subject=document.getElementById('asgn-subj').value;
  const dueRaw=document.getElementById('asgn-due').value;
  const type=document.getElementById('asgn-type').value;
  const btn=document.getElementById('btn-publish');
  if(!title||!dueRaw){toast('Please fill in Title and Due Date.', 'error');return;}

  let due=dueRaw;
  try{const d=new Date(dueRaw);if(!isNaN(d))due=d.toLocaleDateString('en-US',{month:'short',day:'numeric'});}catch(e){}

  let description='',contentPayload=null;
  if(type==='standard'){
    description=document.getElementById('asgn-desc').value.trim()||'Complete the assigned work.';
  } else {
    description='Multiple Choice Quiz';
    const blocks=document.getElementById('mcq-list').children;
    const questions=[];
    Array.from(blocks).forEach(block=>{
      const qText=block.querySelector('.mcq-q').value.trim();
      const opts=[0,1,2,3].map(j=>block.querySelector(`.mcq-o${j}`)?.value.trim()||'').filter(Boolean);
      const ans=parseInt(block.querySelector('.mcq-ans').value);
      if(qText&&opts.length>=2) questions.push({question:qText,options:opts,answerIndex:ans});
    });
    if(questions.length===0){toast('Add at least one complete question.', 'error');return;}
    contentPayload=questions;
  }

  btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Publishing…';
  const payload={title,subject,description,due,status:'open',color:'blue',assignment_type:type,content:contentPayload};

  if(supabase){
    const {data,error}=await supabase.from('assignments').insert([payload]).select();
    if(error){toast('Failed to publish.', 'error'); console.error(error); btn.innerHTML='<i class="fas fa-paper-plane"></i> Publish to Class';return;}
    if(data) ASSIGNMENTS.unshift(mapAssignment(data[0]));
  } else {
    ASSIGNMENTS.unshift({...payload,id:'local-'+Date.now(),desc:description,type:payload.assignment_type});
  }

  toast(`"${title}" published to all students! 🎉`);
  renderPage('t-assignments');
};

/* ====================== AFTER RENDER HOOKS ====================== */
function afterRender(page){
  if(page==='t-dashboard'){
    const el=document.getElementById('t-quick-att');
    if(el) el.innerHTML=STUDENTS.slice(0,6).map((s,i)=>` <div class="std-row"> <div class="std-av">${getInitials(s)}</div> <div class="std-info"><strong>${s}</strong><span>STU${String(i+1).padStart(3,'0')}</span></div> <div class="ml-auto"><span class="chip ${i===2?'red':'green'}">${i===2?'Absent':'Present'}</span></div> </div>`).join('');
  }
  if(page==='t-attendance'){
    STUDENTS.forEach((_,i)=>{if(attState[i]===undefined) attState[i]='present';});
    renderAttList();
  }
}

/* ====================== STUDENT SEARCH ====================== */
window.filterStudents=function(){
  const q=document.getElementById('student-search').value.toLowerCase();
  document.querySelectorAll('#student-list .std-row').forEach(row=>{
    row.style.display=row.dataset.name.includes(q)?'':'none';
  });
};

/* ====================== INIT ====================== */
document.addEventListener('DOMContentLoaded',()=>{
  // Year in footer
  const y=document.getElementById('year');
  if(y) y.textContent=new Date().getFullYear();

  // Try Supabase init once DOM is ready (CDN may have loaded by now)
  initSupabase();

  // Mobile nav menu toggle
  const menuBtn = document.getElementById('mobile-menu');
  const navLinks = document.getElementById('nav-menu');
  const menuIcon = menuBtn?.querySelector('i');
  const closeMenu = () => {
    if(navLinks) navLinks.classList.remove('active');
    if(menuIcon){ menuIcon.classList.add('fa-bars'); menuIcon.classList.remove('fa-times'); }
  };
  if(menuBtn && navLinks){
    menuBtn.addEventListener('click', ()=>{
      navLinks.classList.toggle('active');
      if(menuIcon){ menuIcon.classList.toggle('fa-bars'); menuIcon.classList.toggle('fa-times'); }
    });
    navLinks.querySelectorAll('a').forEach(a=>a.addEventListener('click', closeMenu));
  }

  // Back-to-top button
  const btt = document.getElementById('backToTop');
  if(btt){
    window.addEventListener('scroll', ()=>{ btt.style.display = window.scrollY > 300 ? 'flex' : 'none'; });
    btt.addEventListener('click', ()=>window.scrollTo({top:0, behavior:'smooth'}));
  }

  // Enter key support for login
  ['login-id','login-pass'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener('keydown', e=>{ if(e.key==='Enter') window.doLogin(); });
  });
});
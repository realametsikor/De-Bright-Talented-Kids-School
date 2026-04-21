/* ====================== SUPABASE SETUP ====================== */
let supabaseClient = null;

if (window.supabase) {
  const supabaseUrl = 'https://ilxzzmsqtzvjvkkdqhbe.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlseHp6bXNxdHp2anZra2RxaGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDgwMjYsImV4cCI6MjA5MjE4NDAyNn0.l4zkNBGopLdE8Wt3KMHnfxySHwFHyEoto8txBgh4wMY';
  supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
} else {
  console.error("CRITICAL: Supabase library failed to load from the CDN.");
}

/* ====================== STATIC DATA (Subjects/Timetable) ====================== */
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

/* ====================== LIVE DB STATE ====================== */
let currentUser = null, currentRole = 'student';
let ASSIGNMENTS = [], SUBMISSIONS = [], NOTICES = [], RESOURCES = [], ATTENDANCE_RECORDS = [];
let STUDENTS_DB = [], REPORT_CARDS = []; // Now powered by Supabase!
let attState = {};
let aiHistory = [];

/* ====================== DYNAMIC LOGIN ====================== */
window.setRole = function(r){
  currentRole = r;
  document.getElementById('role-student').classList.toggle('active', r==='student');
  document.getElementById('role-teacher').classList.toggle('active', r==='teacher');
  document.getElementById('id-label').textContent = r==='student' ? 'Student ID' : 'Teacher ID';
  document.getElementById('login-id').placeholder = r==='student' ? 'e.g. STU001' : 'e.g. TCH001';
};

window.doLogin = async function(){
  const idInput = document.getElementById('login-id').value.trim().toUpperCase();
  const pwInput = document.getElementById('login-pass').value;
  const errorBox = document.getElementById('login-error');
  const btnText = document.getElementById('login-btn-text');

  if(!idInput || !pwInput) { showErr('Please enter your ID and password.'); return; }

  errorBox.style.display = 'none';
  btnText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating…';

  let authenticated = false;
  let fetchedUser = null;

  try {
    if (currentRole === 'teacher') {
      // Hardcoded Teacher for Demo Purposes
      if (idInput === 'TCH001' && pwInput === 'teacher123') {
        authenticated = true;
        fetchedUser = { role: 'teacher', name: 'Abena Boateng', initials: 'AB', class: 'Class 6B Teacher', id: 'TCH001' };
      } else { showErr('Invalid teacher credentials.'); btnText.innerHTML = '<i class="fas fa-sign-in-alt"></i> Log In'; return; }
    } else {
      // REAL WORK: Query Supabase directly for Students!
      if (!supabaseClient) throw new Error("Supabase not initialized");
      
      const { data, error } = await supabaseClient.from('students').select('*').eq('id', idInput).single();
      
      if (error || !data) { showErr('Student ID not found in database.'); btnText.innerHTML = '<i class="fas fa-sign-in-alt"></i> Log In'; return; }
      if (pwInput !== 'student123') { showErr('Incorrect password.'); btnText.innerHTML = '<i class="fas fa-sign-in-alt"></i> Log In'; return; }

      authenticated = true;
      fetchedUser = { role: 'student', name: data.name, initials: getInitials(data.name), class: data.class, id: data.id };
    }

    if (authenticated) {
      currentUser = fetchedUser;
      await fetchAllData();
      
      btnText.innerHTML = '<i class="fas fa-check-circle"></i> Welcome!';
      setTimeout(()=>{
        btnText.innerHTML = '<i class="fas fa-sign-in-alt"></i> Log In';
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('lms-dashboard').classList.add('active');
        document.querySelector('.navbar').style.display = 'none';
        document.querySelector('footer').style.display = 'none';
        const wa = document.querySelector('.whatsapp-btn'); if(wa) wa.style.display = 'none';
        const btt = document.getElementById('backToTop'); if(btt) btt.style.display = 'none';
        buildDashboard();
      }, 600);
    }
  } catch (error) {
    console.error("Login Error:", error);
    showErr(`System Error: ${error.message || 'Check console for details'}`); 
    btnText.innerHTML = '<i class="fas fa-sign-in-alt"></i> Log In';
  }
};

async function fetchAllData(){
  if(!supabaseClient) return;
  try {
    const [asgn, subs, noticesRes, resRes, attRes, stdRes, repRes] = await Promise.all([
      supabaseClient.from('assignments').select('*').order('created_at',{ascending:false}),
      supabaseClient.from('submissions').select('*').order('created_at',{ascending:false}),
      supabaseClient.from('notices').select('*').order('created_at',{ascending:false}),
      supabaseClient.from('resources').select('*').order('created_at',{ascending:false}),
      supabaseClient.from('attendance').select('*').order('date',{ascending:false}),
      supabaseClient.from('students').select('*').order('name',{ascending:true}), // Fetch Students!
      supabaseClient.from('report_cards').select('*').order('date',{ascending:false}) // Fetch Reports!
    ]);
    if(asgn.data) ASSIGNMENTS = asgn.data.map(mapAssignment);
    if(subs.data) SUBMISSIONS = subs.data;
    if(noticesRes.data) NOTICES = noticesRes.data;
    if(resRes.data) RESOURCES = resRes.data;
    if(attRes.data) ATTENDANCE_RECORDS = attRes.data;
    if(stdRes.data) STUDENTS_DB = stdRes.data;
    if(repRes.data) REPORT_CARDS = repRes.data;
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
  e.textContent = msg; e.style.display = 'block'; e.scrollIntoView({behavior:'smooth', block:'center'});
}

function doLogout(){
  document.getElementById('lms-dashboard').classList.remove('active');
  document.getElementById('login-section').style.display='';
  document.querySelector('.navbar').style.display='';
  document.querySelector('footer').style.display='';
  const wa = document.querySelector('.whatsapp-btn'); if(wa) wa.style.display='';
  const btt = document.getElementById('backToTop'); if(btt) btt.style.display='';
  document.getElementById('login-id').value=''; document.getElementById('login-pass').value='';
  currentUser=null; aiHistory=[]; window.scrollTo({top:0,behavior:'smooth'});
}

/* ====================== DASHBOARD BUILDER ====================== */
function buildDashboard(){
  const u = currentUser;
  document.getElementById('sb-avatar').textContent = u.initials;
  document.getElementById('sb-name').textContent = u.name;
  document.getElementById('sb-sub').textContent = u.role==='student'?`Class ${u.class} · ${u.id}`:`${u.class} · ${u.id}`;
  document.getElementById('sb-role-label').textContent = u.role==='student'?'Student Portal':'Teacher Portal';

  const nav = document.getElementById('sidebar-nav');
  const pending = ASSIGNMENTS.filter(a=>(a.status==='open'||a.status==='pending')).length;

  const items = u.role==='student' ? [
    {section:'Overview', links:[
      {icon:'th-large',label:'Dashboard',page:'s-dashboard'},
      {icon:'book-open',label:'My Subjects',page:'s-subjects'},
    ]},
    {section:'Academics', links:[
      {icon:'tasks',label:'Assignments',page:'s-assignments',badge:pending||null},
      {icon:'chart-bar',label:'Grades & Reports',page:'s-grades'},
      {icon:'calendar-alt',label:'Timetable',page:'s-timetable'},
      {icon:'user-check',label:'Attendance',page:'s-attendance'},
    ]},
    {section:'Learning', links:[
      {icon:'question-circle',label:'Quizzes',page:'s-quiz'},
      {icon:'book',label:'Resources',page:'s-resources'},
      {icon:'robot',label:'AI Tutor',page:'s-ai'},
      {icon:'bell',label:'Notices',page:'s-notices'},
    ]},
  ] : [
    {section:'Overview', links:[
      {icon:'th-large',label:'Dashboard',page:'t-dashboard'},
      {icon:'users',label:'My Class',page:'t-class'},
    ]},
    {section:'Academics', links:[
      {icon:'tasks',label:'Assignments',page:'t-assignments'},
      {icon:'inbox',label:'Submissions',page:'t-submissions'},
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
  const titles = {'s-dashboard':'Dashboard','s-grades':'Grades & Reports','t-dashboard':'Dashboard','t-class':'Manage My Class','t-grades':'Grade Book'};
  document.getElementById('topbar-title').textContent = titles[page]||page.replace('s-','').replace('t-','').toUpperCase();
  renderPage(page); closeSidebar(); window.scrollTo({top:0,behavior:'smooth'});
}

function openSidebar(){document.getElementById('lms-sidebar').classList.add('open');document.getElementById('sb-overlay').classList.add('open');}
function closeSidebar(){document.getElementById('lms-sidebar').classList.remove('open');document.getElementById('sb-overlay').classList.remove('open');}
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.addEventListener('click',e=>{if(e.target.classList.contains('lms-modal')) e.target.classList.remove('open');});
function toast(msg,type='success'){
  const t=document.getElementById('lms-toast');
  document.getElementById('toast-msg').textContent=msg;
  t.style.background = type==='error'?'#dc2626':'var(--primary)';
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3500);
}

function renderPage(page){
  const c = document.getElementById('pages-container'); c.innerHTML='';
  const div = document.createElement('div'); div.className='lms-page active';
  div.innerHTML = pages[page] ? pages[page]() : `<div class="empty-state"><i class="fas fa-tools"></i><h3>Coming Soon</h3></div>`;
  c.appendChild(div);
  if(page==='t-attendance') { renderAttList(); }
}

/* ====================== HELPERS ====================== */
function getAvgGrade(){return 83;}
function getInitials(name) { return name ? name.split(' ').map(n => n[0]).join('').slice(0, 2) : ''; }
function renderProgressBar(pct, color = '') { return `<div class="prog-bar"><div class="fill" style="width:${pct}%;${color?`background:${color}`:''}"></div></div>`; }
function fmtDate(d){try{return new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});}catch(e){return d;}}

/* ====================== PAGE DEFINITIONS ====================== */
const pages = {

/* ─────── STUDENT DASHBOARD ─────── */
's-dashboard':()=>`
    <div class="welcome-banner">
      <div class="wb-text">
        <div class="wb-tag">📚 Term 2 — 2025/26</div>
        <h2>Welcome back, ${currentUser.name.split(' ')[0]}! 👋</h2>
      </div>
      <div class="wb-icon"><i class="fas fa-graduation-cap"></i></div>
    </div>
    <div class="stats-row">
      <div class="sc blue"><div class="sc-icon blue"><i class="fas fa-chart-line"></i></div><div class="sc-info"><label>Avg Grade</label><div class="val">83%</div><div class="sub">All subjects</div></div></div>
      <div class="sc green"><div class="sc-icon green"><i class="fas fa-check-circle"></i></div><div class="sc-info"><label>Attendance</label><div class="val">98%</div><div class="sub">Term 2</div></div></div>
    </div>`,

/* ─────── STUDENT GRADES (WITH REPORT CARDS) ─────── */
's-grades':()=>{
  const myReports = REPORT_CARDS.filter(r => r.student_id === currentUser.id);
  
  return `
  <div class="page-header"><h2>Grades & Reports</h2><span>Term 2 · 2025/26</span></div>
  
  <div class="panel" style="border: 2px solid var(--accent);">
    <div class="panel-head" style="background:var(--lms-gold-pale);"><h3>📜 Official End of Term Reports</h3></div>
    <div style="padding:1.3rem;">
      ${myReports.length === 0 ? `<p style="font-size:.85rem;color:var(--lms-muted);">No reports have been published for you yet.</p>` : `
      <div style="display:flex;flex-direction:column;gap:1rem;">
        ${myReports.map(rep => `
          <div style="display:flex;align-items:center;justify-content:space-between;background:var(--lms-surface);padding:1rem 1.5rem;border-radius:10px;">
            <div>
              <strong style="color:var(--primary);display:block;font-size:1rem;">${rep.term} Report Card</strong>
              <span style="font-size:.75rem;color:var(--lms-muted);">Published on: ${fmtDate(rep.date)}</span>
            </div>
            <button class="btn-lms-primary" style="width:auto;padding:.5rem 1.2rem;" onclick="viewReportCard('${rep.id}')"><i class="fas fa-file-pdf"></i> View / Download</button>
          </div>
        `).join('')}
      </div>
      `}
    </div>
  </div>

  <div class="panel">
    <div class="panel-head"><h3>Current Continuous Assessment</h3></div>
    <table class="lms-tbl">
      <thead><tr><th>Subject</th><th>Class Score</th><th>Exam Score</th><th>Total</th><th>Grade</th></tr></thead>
      <tbody>${GRADES.map(g=>`
        <tr><td><strong>${g.subject}</strong></td><td>${g.classScore}</td><td>${g.examScore}</td><td><strong>${g.total}/100</strong></td><td><span class="grade-${g.grade}">${g.grade}</span></td></tr>`).join('')}
      </tbody>
    </table>
  </div>`
},

/* ─────── TEACHER DASHBOARD ─────── */
't-dashboard':()=>`
  <div class="welcome-banner">
    <div class="wb-text">
      <div class="wb-tag">📋 Class Teacher — 6B</div>
      <h2>Good day, ${currentUser.name.split(' ')[1]||currentUser.name}! 👩‍🏫</h2>
    </div>
    <div class="wb-icon"><i class="fas fa-chalkboard-teacher"></i></div>
  </div>
  <div class="stats-row">
    <div class="sc gold"><div class="sc-icon gold"><i class="fas fa-users"></i></div><div class="sc-info"><label>Students</label><div class="val">${STUDENTS_DB.filter(s=>s.class==='6B').length}</div><div class="sub">Class 6B</div></div></div>
    <div class="sc blue"><div class="sc-icon blue"><i class="fas fa-tasks"></i></div><div class="sc-info"><label>Assignments</label><div class="val">${ASSIGNMENTS.length}</div><div class="sub">Published</div></div></div>
  </div>`,

/* ─────── TEACHER CLASS MANAGEMENT (FULL CRUD) ─────── */
't-class':()=>{
  const myClass = STUDENTS_DB.filter(s => s.class === '6B');
  return `
  <div class="page-header"><h2>Manage My Class</h2><span>${myClass.length} students currently enrolled in 6B</span></div>
  <div class="panel">
    <div class="panel-head">
      <h3>Class Roster</h3>
      <div style="display:flex;gap:.5rem;">
        <input type="text" id="student-search" placeholder="Search student..." onkeyup="filterStudents()" style="padding:.4rem .9rem;border:1.5px solid var(--lms-border);border-radius:8px;font-family:var(--font-lms);font-size:.82rem;outline:none;width:180px;">
        <button class="btn-lms-primary" style="width:auto;padding:.4rem 1rem;font-size:.8rem;" onclick="openModal('add-student-modal')"><i class="fas fa-user-plus"></i> Add Student</button>
      </div>
    </div>
    <div id="student-list">
      ${myClass.length === 0 ? `<div class="empty-state"><p>No students in this class.</p></div>` : 
      myClass.map(s=>`
        <div class="std-row" data-name="${s.name.toLowerCase()}">
          <div class="std-av">${getInitials(s.name)}</div>
          <div class="std-info">
            <strong style="font-size:.95rem;">${s.name}</strong>
            <span style="font-size:.75rem;margin-top:3px;display:block;">
              <span class="chip grey">${s.id}</span> · Age: ${s.age} · ${s.gender} · Parent: <a href="tel:${s.parent_contact}">${s.parent_contact}</a>
            </span>
          </div>
          <div class="ml-auto" style="display:flex;gap:.4rem;">
            <button class="btn-outline" style="font-size:.7rem;padding:.3rem .7rem;" onclick="openTransferModal('${s.id}')"><i class="fas fa-exchange-alt"></i> Transfer</button>
            <button class="btn-danger" style="font-size:.7rem;padding:.3rem .7rem;" onclick="deleteStudent('${s.id}')" title="Remove from system"><i class="fas fa-trash"></i></button>
          </div>
        </div>`).join('')}
    </div>
  </div>`
},

/* ─────── TEACHER GRADE BOOK & REPORTS ─────── */
't-grades':()=>{
  const myClass = STUDENTS_DB.filter(s => s.class === '6B');
  return `
  <div class="page-header"><h2>Grade Book & Reports</h2><span>Class 6B · Term 2</span></div>
  <div class="panel">
    <div class="panel-head"><h3>Term 2 Assessments</h3></div>
    <div style="overflow-x:auto;">
      <table class="lms-tbl">
        <thead><tr><th>Student</th><th>Maths</th><th>English</th><th>Science</th><th>Avg</th><th>Report Card Action</th></tr></thead>
        <tbody>${myClass.map((s,i)=>{
          const hasReport = REPORT_CARDS.find(r => r.student_id === s.id);
          const sc=[75+i%15,68+i%18,80+i%12];
          const avg=Math.round(sc.reduce((a,b)=>a+b,0)/sc.length);
          return `<tr>
          <td><div style="display:flex;align-items:center;gap:.6rem;"><div class="std-av" style="width:26px;height:26px;font-size:.68rem;">${getInitials(s.name)}</div><span>${s.name}</span></div></td>
          ${sc.map(v=>`<td>${v}%</td>`).join('')}<td><strong>${avg}%</strong></td>
          <td>
            ${hasReport 
              ? `<span class="chip green"><i class="fas fa-check"></i> Published</span>` 
              : `<button class="btn-gold" style="font-size:.7rem;padding:.3rem .7rem;" onclick="openReportModal('${s.id}')"><i class="fas fa-pen"></i> Generate Report</button>`
            }
          </td></tr>`;
        }).join('')}
        </tbody>
      </table>
    </div>
  </div>`
},

/* Dummy fillers for navigation */
's-timetable':()=>`<div class="page-header"><h2>Timetable</h2></div>`,
's-attendance':()=>`<div class="page-header"><h2>Attendance</h2></div>`,
's-quiz':()=>`<div class="page-header"><h2>Quizzes</h2></div>`,
's-resources':()=>`<div class="page-header"><h2>Resources</h2></div>`,
's-ai':()=>`<div class="page-header"><h2>AI Tutor</h2></div>`,
's-notices':()=>`<div class="page-header"><h2>Notices</h2></div>`,
's-subjects':()=>`<div class="page-header"><h2>Subjects</h2></div>`,
's-assignments':()=>`<div class="page-header"><h2>Assignments</h2></div>`,
't-assignments':()=>`<div class="page-header"><h2>Assignments</h2></div>`,
't-submissions':()=>`<div class="page-header"><h2>Submissions</h2></div>`,
't-attendance':()=>`<div class="page-header"><h2>Attendance Tracker</h2><div id="att-mark-list"></div></div>`,
't-notices':()=>`<div class="page-header"><h2>Notices</h2></div>`,
't-resources':()=>`<div class="page-header"><h2>Resources</h2></div>`,
't-timetable':()=>`<div class="page-header"><h2>Timetable</h2></div>`,
};

/* ====================== REAL WORK: MANAGE STUDENTS IN SUPABASE ====================== */
window.saveNewStudent = async function() {
  if (!supabaseClient) { toast('Database connection missing!', 'error'); return; }

  const name = document.getElementById('new-std-name').value.trim();
  const age = document.getElementById('new-std-age').value;
  const gender = document.getElementById('new-std-gender').value;
  const parentContact = document.getElementById('new-std-contact').value.trim();

  if(!name || !age || !parentContact) { toast('Please fill all fields', 'error'); return; }

  // Count ALL students in DB to get the next ID number properly
  const { count } = await supabaseClient.from('students').select('*', { count: 'exact', head: true });
  const nextNumber = (count || STUDENTS_DB.length) + 1;
  const newId = 'STU' + String(nextNumber).padStart(3, '0');
  
  const payload = { id: newId, name: name, age: age, gender: gender, parent_contact: parentContact, class: '6B' };

  const { data, error } = await supabaseClient.from('students').insert([payload]).select();

  if (error) { console.error(error); toast('Failed to add student to DB.', 'error'); return; }
  
  if (data) STUDENTS_DB.push(data[0]);

  closeModal('add-student-modal');
  renderPage('t-class');
  toast(`${name} added successfully! ID: ${newId}`);
};

window.deleteStudent = async function(id) {
  if (!supabaseClient) return;
  const student = STUDENTS_DB.find(s => s.id === id);
  
  if(confirm(`Are you absolutely sure you want to remove ${student.name} from the database?`)) {
    const { error } = await supabaseClient.from('students').delete().eq('id', id);
    
    if (error) { console.error(error); toast('Failed to remove student.', 'error'); return; }

    STUDENTS_DB = STUDENTS_DB.filter(s => s.id !== id);
    renderPage('t-class');
    toast('Student removed successfully.', 'error');
  }
};

window.openTransferModal = function(id) {
  const std = STUDENTS_DB.find(s => s.id === id);
  document.getElementById('transfer-std-name').textContent = std.name;
  document.getElementById('transfer-modal').dataset.stdId = id;
  openModal('transfer-modal');
};

window.saveTransfer = async function() {
  if (!supabaseClient) return;
  const id = document.getElementById('transfer-modal').dataset.stdId;
  const newClass = document.getElementById('transfer-class-select').value;
  const std = STUDENTS_DB.find(s => s.id === id);
  
  if(std) {
    const { error } = await supabaseClient.from('students').update({ class: newClass }).eq('id', id);
    if (error) { console.error(error); toast('Failed to transfer student.', 'error'); return; }
    
    std.class = newClass; // Update local DB
  }
  
  closeModal('transfer-modal');
  renderPage('t-class'); 
  toast(`${std.name} has been transferred to ${newClass}`);
};

window.filterStudents = function(){
  const q = document.getElementById('student-search').value.toLowerCase();
  document.querySelectorAll('#student-list .std-row').forEach(row=>{
    row.style.display = row.dataset.name.includes(q) ? '' : 'none';
  });
};

/* ====================== REAL WORK: REPORT CARDS IN SUPABASE ====================== */
window.openReportModal = function(id) {
  const std = STUDENTS_DB.find(s => s.id === id);
  document.getElementById('report-std-name').textContent = std.name;
  document.getElementById('build-report-modal').dataset.stdId = id;
  openModal('build-report-modal');
};

window.saveReportCard = async function() {
  if (!supabaseClient) return;
  const id = document.getElementById('build-report-modal').dataset.stdId;
  const conduct = document.getElementById('report-conduct').value;
  const remarks = document.getElementById('report-remarks').value.trim();

  if(!remarks) { toast('Please add teacher remarks.', 'error'); return; }

  const payload = {
    id: 'REP' + Date.now(),
    student_id: id,
    term: 'Term 2',
    conduct: conduct,
    remarks: remarks
  };

  const { data, error } = await supabaseClient.from('report_cards').insert([payload]).select();

  if (error) { console.error(error); toast('Failed to save report card.', 'error'); return; }

  if (data) REPORT_CARDS.push(data[0]);

  closeModal('build-report-modal');
  renderPage('t-grades'); 
  toast('Report Card Generated & Published! ✅');
};

window.viewReportCard = function(reportId) {
  const report = REPORT_CARDS.find(r => r.id === reportId);
  const printArea = document.getElementById('print-area');

  printArea.innerHTML = `
    <div style="border: 2px solid var(--primary); padding: 2rem; border-radius: 10px; background: #fff;">
      <div style="text-align:center; border-bottom: 2px solid var(--accent); padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <h2 style="color:var(--primary); font-family:'Poppins', sans-serif;">DE-BRIGHT TALENTED KIDS SCHOOL</h2>
        <p style="font-size:.9rem; color:#555;">Sonitra Road, Amasaman, Accra</p>
        <h3 style="margin-top:1rem; color:var(--accent);">OFFICIAL END OF TERM REPORT</h3>
      </div>
      
      <div style="display:flex; justify-content:space-between; margin-bottom: 2rem; font-size:.95rem;">
        <div>
          <p><strong>Student Name:</strong> ${currentUser.name}</p>
          <p><strong>Student ID:</strong> ${currentUser.id}</p>
        </div>
        <div style="text-align:right;">
          <p><strong>Class:</strong> ${currentUser.class}</p>
          <p><strong>Term:</strong> ${report.term} 2025/26</p>
        </div>
      </div>

      <table style="width:100%; border-collapse: collapse; margin-bottom: 2rem;">
        <tr style="background:var(--lms-surface);">
          <th style="padding:10px; border:1px solid #ccc; text-align:left;">Subject</th>
          <th style="padding:10px; border:1px solid #ccc; text-align:center;">Score</th>
          <th style="padding:10px; border:1px solid #ccc; text-align:center;">Grade</th>
        </tr>
        ${GRADES.slice(0,5).map(g => `
          <tr>
            <td style="padding:10px; border:1px solid #ccc;">${g.subject}</td>
            <td style="padding:10px; border:1px solid #ccc; text-align:center;">${g.total}</td>
            <td style="padding:10px; border:1px solid #ccc; text-align:center;"><strong>${g.grade}</strong></td>
          </tr>
        `).join('')}
      </table>

      <div style="background: #f9f9f9; padding: 1rem; border-left: 4px solid var(--primary); margin-bottom: 1rem;">
        <p style="margin-bottom:.5rem;"><strong>Conduct:</strong> ${report.conduct}</p>
        <p><strong>Class Teacher's Remarks:</strong> ${report.remarks}</p>
      </div>
      
      <div style="margin-top: 3rem; display:flex; justify-content:space-between;">
        <div style="border-top: 1px solid #000; padding-top: 5px; width: 200px; text-align:center;">Teacher's Signature</div>
        <div style="border-top: 1px solid #000; padding-top: 5px; width: 200px; text-align:center;">Headmaster's Signature</div>
      </div>
    </div>
  `;

  openModal('view-report-modal');
};

/* ====================== ATTENDANCE ====================== */
function renderAttList(){
  const el=document.getElementById('att-mark-list');
  if(!el) return;
  const myClass = STUDENTS_DB.filter(s => s.class === '6B');
  el.innerHTML=myClass.map((s,i)=>` <div class="std-row"> <div class="std-av">${getInitials(s.name)}</div> <div class="std-info"><strong>${s.name}</strong><span>${s.id}</span></div> <div class="ml-auto" style="display:flex;gap:.4rem;"> <button onclick="setAtt(${i},'present')" class="att-btn ${attState[i]==='present'?'att-present':''}" style="padding:4px 14px;border-radius:999px;font-size:.72rem;font-weight:700;cursor:pointer;border:1.5px solid;transition:all .2s;${attState[i]==='present'?'background:#22c55e;color:#fff;border-color:#22c55e;':'background:transparent;color:var(--lms-muted);border-color:var(--lms-border);'}">P</button> <button onclick="setAtt(${i},'absent')" style="padding:4px 14px;border-radius:999px;font-size:.72rem;font-weight:700;cursor:pointer;border:1.5px solid;transition:all .2s;${attState[i]==='absent'?'background:#ef4444;color:#fff;border-color:#ef4444;':'background:transparent;color:var(--lms-muted);border-color:var(--lms-border);'}">A</button> </div> </div>`).join('');
}
window.setAtt=function(i,v){attState[i]=v;renderAttList();};

/* ====================== INIT ====================== */
document.addEventListener('DOMContentLoaded',()=>{
  const y=document.getElementById('year');
  if(y) y.textContent=new Date().getFullYear();
});

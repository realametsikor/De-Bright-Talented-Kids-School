/* ====================== SUPABASE SETUP ====================== */
const supabaseUrl = 'https://ilxzzmsqtzvjvkkdqhbe.supabase.co';
const supabaseKey = 'Sb_publishable_bBJ3GmOkhM-tAbLDapMWkQ_LtOBzvF5';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

console.log("Supabase connected!", supabase);

/* ====================== DATA ====================== */
const USERS = {
  STU001:{role:'student',name:'Ama Korkor',initials:'AK',class:'6B',id:'STU001'},
  TCH001:{role:'teacher',name:'Abena Boateng',initials:'AB',class:'Class 6B Teacher',id:'TCH001'}
};
const PASSWORDS = {STU001:'student123',TCH001:'teacher123'};

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

// Live assignments loaded from cloud
let ASSIGNMENTS = [];

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

const QUIZ_QS = [
  {q:'What is ½ + ¼?',opts:['¾','½','1','⅔'],ans:0},
  {q:'Convert 0.75 to simplest fraction.',opts:['3/4','75/100','7/10','1/2'],ans:0},
  {q:'What is 2/3 of 60?',opts:['40','30','20','45'],ans:0},
  {q:'Which is greater: 5/8 or 3/4?',opts:['3/4','5/8','Equal','Cannot tell'],ans:0},
  {q:'Express 1½ as a decimal.',opts:['1.5','1.2','0.5','2.5'],ans:0},
];

const AI_REPLIES = {
  default:[
    "Great question! Let me explain that for you. In mathematics, the key is to break the problem into smaller steps.",
    "That's a common topic in your curriculum. Make sure you understand the core concept first, then practice with examples.",
    "Excellent curiosity! Your teacher Mr. Asare covers this in detail in Chapter 4 of your textbook.",
    "I recommend revising your class notes first, then trying the practice questions at the end of the chapter.",
    "This topic will likely appear in your end-of-term exam. Focus on understanding *why* the rule works, not just memorising it.",
  ],
  greetings:["Hello! I'm your AI Study Tutor. Ask me anything about your lessons — Maths, English, Science, and more! 📚","Hi there! Ready to learn? What subject can I help you with today?"],
};

const RESOURCES = [
  {name:'Mathematics Textbook – Term 2',type:'PDF',size:'4.2 MB',color:'#fee2e2',icon:'📕',iconColor:'#b91c1c'},
  {name:'English Comprehension Practice',type:'PDF',size:'1.8 MB',color:'#dbeafe',icon:'📘',iconColor:'#1d4ed8'},
  {name:'Science Lab Manual',type:'PDF',size:'3.1 MB',color:'#dcfce7',icon:'📗',iconColor:'#15803d'},
  {name:'Social Studies – Ghana Regions Map',type:'PNG',size:'980 KB',color:'#ede9fe',icon:'🗺️',iconColor:'#5b21b6'},
  {name:'ICT Practical Notes – MS Office',type:'PDF',size:'2.5 MB',color:'#fffbeb',icon:'💻',iconColor:'#b45309'},
  {name:'French Vocabulary List – Unité 3',type:'PDF',size:'640 KB',color:'#fce7f3',icon:'🇫🇷',iconColor:'#be185d'},
];

/* ====================== STATE ====================== */
let currentUser = null, currentRole = 'student';
let quizIdx = 0, quizScore = 0, quizAnswered = false;
let attState = {};

/* ====================== LOGIN ====================== */
function setRole(r){
  currentRole = r;
  document.getElementById('role-student').classList.toggle('active', r==='student');
  document.getElementById('role-teacher').classList.toggle('active', r==='teacher');
  document.getElementById('id-label').textContent = r==='student' ? 'Student ID' : 'Teacher ID';
}

async function doLogin(){
  const id = document.getElementById('login-id').value.trim().toUpperCase();
  const pw = document.getElementById('login-pass').value;
  const err = document.getElementById('login-error');
  const btn = document.getElementById('login-btn-text');
  err.style.display='none';
  
  if(!id||!pw){showErr('Please enter your ID and password.');return;}
  if(!USERS[id]||PASSWORDS[id]!==pw){showErr('Invalid ID or password. Contact the school office.');return;}
  if(USERS[id].role!==currentRole){showErr(`This ID belongs to a ${USERS[id].role} account. Please select the correct role.`);return;}
  
  currentUser = USERS[id];
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching Data…';

  // Fetch assignments live from Supabase (sorting newest first)
  const { data, error } = await supabase.from('assignments').select('*').order('created_at', { ascending: false });
  
  if (error) {
    console.error("Database Error:", error);
    showErr("Could not connect to the database.");
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Log In';
    return;
  }

  ASSIGNMENTS = data.map(item => ({
    id: item.id,
    title: item.title,
    subject: item.subject,
    desc: item.description, 
    due: item.due,
    status: item.status,
    color: item.color,
    type: item.assignment_type,
    content: item.content
  }));

  btn.innerHTML = '<i class="fas fa-check"></i> Success';
  setTimeout(()=>{
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Log In';
    document.getElementById('login-section').style.display='none';
    document.getElementById('lms-dashboard').classList.add('active');
    buildDashboard();
  }, 500);
}

function showErr(msg){const e=document.getElementById('login-error');e.textContent=msg;e.style.display='block';}

function doLogout(){
  document.getElementById('lms-dashboard').classList.remove('active');
  document.getElementById('login-section').style.display='';
  document.getElementById('login-id').value='';
  document.getElementById('login-pass').value='';
  document.getElementById('login-error').style.display='none';
  document.getElementById('login-btn-text').innerHTML='<i class="fas fa-sign-in-alt"></i> Log In';
  currentUser=null;
  window.scrollTo({top:0,behavior:'smooth'});
}

/* ====================== BUILD DASHBOARD ====================== */
function buildDashboard(){
  const u = currentUser;
  document.getElementById('sb-avatar').textContent = u.initials;
  document.getElementById('sb-name').textContent = u.name;
  document.getElementById('sb-sub').textContent = u.role==='student' ? `Class ${u.class} · ${u.id}` : `${u.class} · ${u.id}`;
  document.getElementById('sb-role-label').textContent = u.role==='student' ? 'Student Portal' : 'Teacher Portal';

  const nav = document.getElementById('sidebar-nav');
  const items = u.role==='student' ? [
    {section:'Main', links:[
      {icon:'th-large',label:'Dashboard',page:'s-dashboard'},
      {icon:'book-open',label:'My Subjects',page:'s-subjects'},
      {icon:'tasks',label:'Assignments',page:'s-assignments',badge:ASSIGNMENTS.filter(a=>a.status==='pending').length},
      {icon:'chart-bar',label:'Grades',page:'s-grades'},
      {icon:'calendar-alt',label:'Timetable',page:'s-timetable'},
    ]},
    {section:'Learning', links:[
      {icon:'question-circle',label:'Quizzes',page:'s-quiz'},
      {icon:'user-check',label:'Attendance',page:'s-attendance'},
      {icon:'book',label:'Resources',page:'s-resources'},
      {icon:'robot',label:'AI Tutor',page:'s-ai'},
      {icon:'bell',label:'Notices',page:'s-notices',badge:2},
    ]},
  ] : [
    {section:'Main', links:[
      {icon:'th-large',label:'Dashboard',page:'t-dashboard'},
      {icon:'users',label:'My Class',page:'t-class'},
      {icon:'tasks',label:'Assignments',page:'t-assignments'},
      {icon:'chart-bar',label:'Grade Book',page:'t-grades'},
      {icon:'clipboard-list',label:'Attendance',page:'t-attendance'},
    ]},
    {section:'Tools', links:[
      {icon:'bullhorn',label:'Post Notice',page:'t-notices'},
      {icon:'calendar-alt',label:'Timetable',page:'t-timetable'},
      {icon:'file-upload',label:'Resources',page:'t-resources'},
    ]},
  ];

  nav.innerHTML = items.map(s=>`
    <div class="sb-section">${s.section}</div>
    ${s.links.map(l=>`
      <div class="sb-item${l.page===(u.role==='student'?'s-dashboard':'t-dashboard')?' active':''}" onclick="showPage('${l.page}',this)">
        <i class="fas fa-${l.icon}"></i> ${l.label}
        ${l.badge?`<span class="sb-badge">${l.badge}</span>`:''}
      </div>`).join('')}
  `).join('');

  renderPage(u.role==='student' ? 's-dashboard' : 't-dashboard');
  window.scrollTo({top:0});
}

function showPage(page, el){
  document.querySelectorAll('.sb-item').forEach(n=>n.classList.remove('active'));
  if(el) el.classList.add('active');
  const titles = {
    's-dashboard':'Dashboard','s-subjects':'My Subjects','s-assignments':'Assignments',
    's-grades':'My Grades','s-timetable':'Timetable','s-quiz':'Quizzes',
    's-attendance':'Attendance','s-resources':'Study Resources','s-ai':'AI Tutor',
    's-notices':'School Notices','t-dashboard':'Dashboard','t-class':'My Class',
    't-assignments':'Manage Assignments','t-grades':'Grade Book','t-attendance':'Attendance',
    't-notices':'Post a Notice','t-timetable':'Timetable','t-resources':'Upload Resources',
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

function toast(msg){const t=document.getElementById('lms-toast');document.getElementById('toast-msg').textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000);}

function renderPage(page){
  const c = document.getElementById('pages-container');
  c.innerHTML = '';
  const div = document.createElement('div');
  div.className='lms-page active';
  div.innerHTML = pages[page] ? pages[page]() : `<p>Page coming soon.</p>`;
  c.appendChild(div);
  afterRender(page);
}

/* ====================== PAGES OBJECT ====================== */
const pages = {

/* ---- STUDENT DASHBOARD ---- */
's-dashboard':()=>`
  <div class="welcome-banner">
    <div class="wb-text">
      <div class="wb-tag">📚 Term 2 — 2025/26</div>
      <h2>Good day, Ama! 👋</h2>
      <p>You have ${ASSIGNMENTS.filter(a=>a.status==='pending').length} pending assignments and a quiz due today.</p>
    </div>
    <div class="wb-icon"><i class="fas fa-star"></i></div>
  </div>
  <div class="stats-row">
    <div class="sc gold"><div class="sc-icon gold"><i class="fas fa-book"></i></div><div class="sc-info"><label>Subjects</label><div class="val">8</div><div class="sub">This term</div></div></div>
    <div class="sc green"><div class="sc-icon green"><i class="fas fa-tasks"></i></div><div class="sc-info"><label>Pending</label><div class="val">${ASSIGNMENTS.filter(a=>a.status==='pending').length}</div><div class="sub">Assignments</div></div></div>
    <div class="sc blue"><div class="sc-icon blue"><i class="fas fa-chart-bar"></i></div><div class="sc-info"><label>Avg Grade</label><div class="val">78%</div><div class="sub">All subjects</div></div></div>
    <div class="sc purple"><div class="sc-icon purple"><i class="fas fa-user-check"></i></div><div class="sc-info"><label>Attendance</label><div class="val">94%</div><div class="sub">This term</div></div></div>
  </div>
  <div class="two-col">
    <div class="panel">
      <div class="panel-head"><h3>Upcoming Assignments</h3><button class="ph-action" onclick="showPage('s-assignments',null)">See all →</button></div>
      <table class="lms-tbl"><thead><tr><th>Subject</th><th>Task</th><th>Due</th><th>Status</th></tr></thead>
      <tbody>
        ${ASSIGNMENTS.slice(0,4).map(a => `
        <tr><td>${a.subject}</td><td>${a.title}</td><td>${a.due}</td><td><span class="chip ${a.status==='pending'?'red':a.status==='draft'?'gold':'green'}">${a.status.charAt(0).toUpperCase() + a.status.slice(1)}</span></td></tr>
        `).join('')}
      </tbody></table>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Notice Board</h3><button class="ph-action" onclick="showPage('s-notices',null)">See all →</button></div>
      <ul class="notice-list">
        <li class="notice-item"><div class="nd" style="background:var(--lms-red);"></div><div><h4>End-of-Term Exams — May 5</h4><p>Study schedules shared by class teachers.</p><div class="notice-date">Apr 17, 2026 · Admin</div></div></li>
        <li class="notice-item"><div class="nd" style="background:var(--accent);"></div><div><h4>Open Day — May 10</h4><p>Parents invited to visit and meet teachers.</p><div class="notice-date">Apr 15, 2026</div></div></li>
      </ul>
    </div>
  </div>`,

/* ---- STUDENT SUBJECTS ---- */
's-subjects':()=>`
  <h2 style="font-family:'Poppins',sans-serif;font-size:1.05rem;color:var(--primary);margin-bottom:1.2rem;">My Subjects — Class 6B</h2>
  <div class="cards-grid">
    ${SUBJECTS.map(s=>`
      <div class="asgn-card" style="border-top-color:${s.color==='gold'?'var(--accent)':s.color==='blue'?'#3b82f6':s.color==='green'?'#22c55e':'#8b5cf6'};">
        <div style="font-size:1.5rem;margin-bottom:.5rem;">${s.emoji}</div>
        <h4>${s.name}</h4>
        <p>👤 ${s.teacher}</p>
        <div style="margin-bottom:.8rem;">
          <div style="display:flex;justify-content:space-between;font-size:.75rem;color:var(--lms-muted);margin-bottom:.3rem;"><span>Progress</span><span>${s.progress}%</span></div>
          <div class="prog-bar"><div class="fill" style="width:${s.progress}%;"></div></div>
        </div>
        <div class="asgn-meta">
          <span class="chip ${s.progress>=80?'green':s.progress>=60?'gold':'red'}">${s.progress>=80?'On Track':s.progress>=60?'Good':'Needs Work'}</span>
          <button class="btn-gold" onclick="toast('Opening ${s.name} lessons…')">View Lessons</button>
        </div>
      </div>`).join('')}
  </div>`,

/* ---- STUDENT ASSIGNMENTS ---- */
's-assignments':()=>`
  <h2 style="font-family:'Poppins',sans-serif;font-size:1.05rem;color:var(--primary);margin-bottom:1.2rem;">Assignments</h2>
  <div class="cards-grid">
    ${ASSIGNMENTS.map(a=>{
      const chips={pending:'<span class="chip red">Pending</span>',draft:'<span class="chip gold">Draft</span>',submitted:'<span class="chip green">Submitted</span>', open:'<span class="chip blue">Open</span>'};
      const currentStatus = chips[a.status] || `<span class="chip grey">${a.status}</span>`;
      return `<div class="asgn-card" style="border-top-color:${a.color==='gold'?'var(--accent)':a.color==='blue'?'#3b82f6':a.color==='green'?'#22c55e':'#8b5cf6'};">
        <h4>${a.title}</h4>
        <p><strong>${a.subject}</strong> — ${a.desc}</p>
        <div class="asgn-meta">
          <span class="asgn-due"><i class="fas fa-calendar-day"></i> ${a.due}</span>
          <div style="display:flex;gap:.4rem;align-items:center;">
             ${currentStatus}
             ${(a.status==='pending' || a.status==='open') && a.type==='mcq' ? `<button class="btn-gold" onclick="toast('Starting Quiz!')">Start Quiz</button>` : ''}
             ${(a.status==='pending' || a.status==='open') && a.type!=='mcq' ? `<button class="btn-gold" onclick="toast('Submitted!')">Submit</button>` : ''}
          </div>
        </div>
      </div>`;
    }).join('')}
  </div>`,

/* ---- STUDENT GRADES, TIMETABLE, QUIZ, ATTENDANCE, RESOURCES, AI, NOTICES (Unchanged for brevity) ---- */
's-grades':()=>`<p>Grades module loaded.</p>`,
's-timetable':()=>`<p>Timetable module loaded.</p>`,
's-quiz':()=>`<p>Quiz module loaded.</p>`,
's-attendance':()=>`<p>Attendance module loaded.</p>`,
's-resources':()=>`<p>Resources module loaded.</p>`,
's-ai':()=>`<p>AI module loaded.</p>`,
's-notices':()=>`<p>Notices module loaded.</p>`,

/* ---- TEACHER DASHBOARD ---- */
't-dashboard':()=>`
  <div class="welcome-banner">
    <div class="wb-text">
      <div class="wb-tag">📋 Class Teacher — 6B</div>
      <h2>Good day, Ms. Boateng! 👩‍🏫</h2>
      <p>${ASSIGNMENTS.length} assignments created · Attendance not yet logged today</p>
    </div>
    <div class="wb-icon"><i class="fas fa-chalkboard-teacher"></i></div>
  </div>
  <div class="stats-row">
    <div class="sc gold"><div class="sc-icon gold"><i class="fas fa-users"></i></div><div class="sc-info"><label>Students</label><div class="val">34</div><div class="sub">In Class 6B</div></div></div>
    <div class="sc red"><div class="sc-icon red"><i class="fas fa-file-alt"></i></div><div class="sc-info"><label>Total Tasks</label><div class="val">${ASSIGNMENTS.length}</div><div class="sub">Assignments</div></div></div>
    <div class="sc green"><div class="sc-icon green"><i class="fas fa-user-check"></i></div><div class="sc-info"><label>Present Today</label><div class="val">31</div><div class="sub">of 34 students</div></div></div>
    <div class="sc blue"><div class="sc-icon blue"><i class="fas fa-chart-line"></i></div><div class="sc-info"><label>Class Average</label><div class="val">74%</div><div class="sub">This term</div></div></div>
  </div>
  <div class="two-col">
    <div class="panel">
      <div class="panel-head"><h3>Assignments to Mark</h3><button class="ph-action" onclick="showPage('t-assignments',null)">View all →</button></div>
      <table class="lms-tbl"><thead><tr><th>Task</th><th>Subject</th><th>Action</th></tr></thead>
      <tbody>
        ${ASSIGNMENTS.slice(0,3).map(a => `
        <tr><td>${a.title}</td><td>${a.subject}</td><td><button class="btn-gold" style="font-size:.75rem;padding:.4rem .8rem;" onclick="openGrader()">Mark</button></td></tr>
        `).join('')}
      </tbody></table>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Today's Quick Attendance</h3><button class="ph-action" onclick="showPage('t-attendance',null)">Full View →</button></div>
      <div id="t-quick-att"></div>
    </div>
  </div>`,

/* ---- TEACHER CLASS ---- */
't-class':()=>`<p>Class list loaded.</p>`,

/* ---- TEACHER ASSIGNMENTS (NEW DYNAMIC BUILDER) ---- */
't-assignments':()=>`
  <h2 style="font-family:'Poppins',sans-serif;font-size:1.05rem;color:var(--primary);margin-bottom:1.2rem;">Manage Assignments</h2>
  
  <div class="panel" style="margin-bottom:1.3rem;">
    <div class="panel-head"><h3>Create New Assignment</h3></div>
    <div style="padding:1.2rem;display:grid;grid-template-columns:1fr 1fr;gap:.9rem;">
      <div class="lms-form-group"><label>Title</label><input type="text" id="asgn-title" placeholder="e.g. Science Revision"></div>
      <div class="lms-form-group"><label>Subject</label>
        <select id="asgn-subj" style="width:100%;padding:.75rem 1rem;border:1.5px solid var(--lms-border);border-radius:10px;font-family:var(--font-lms);font-size:.9rem;background:var(--light);outline:none;">
          <option>Mathematics</option><option>English Language</option><option>Science</option><option>Social Studies</option><option>Creative Arts</option><option>ICT</option>
        </select>
      </div>
      <div class="lms-form-group"><label>Due Date</label><input type="date" id="asgn-due"></div>
      <div class="lms-form-group"><label>Format</label>
        <select id="asgn-type" onchange="toggleFormat()" style="width:100%;padding:.75rem 1rem;border:1.5px solid var(--lms-border);border-radius:10px;font-family:var(--font-lms);font-size:.9rem;background:var(--light);outline:none;">
          <option value="standard">Standard (Objectives / Tasks)</option>
          <option value="mcq">Multiple Choice Quiz</option>
        </select>
      </div>
      
      <div class="lms-form-group" id="fmt-standard" style="grid-column:span 2;">
        <label>Instructions & Objectives</label>
        <textarea id="asgn-desc" rows="4" placeholder="Type the learning objectives or instructions here..." style="width:100%;padding:.75rem 1rem;border:1.5px solid var(--lms-border);border-radius:10px;font-family:var(--font-lms);font-size:.9rem;background:var(--light);outline:none;resize:vertical;"></textarea>
      </div>

      <div class="lms-form-group" id="fmt-mcq" style="grid-column:span 2; display:none;">
        <label>Quiz Builder</label>
        <div id="mcq-list" style="display:flex;flex-direction:column;gap:.8rem;"></div>
        <button class="btn-outline" style="margin-top:.8rem;" onclick="addMcq()"><i class="fas fa-plus"></i> Add Question</button>
      </div>

    </div>
    <div style="padding:0 1.2rem 1.2rem;">
      <button class="btn-lms-primary" style="width:auto;padding:.65rem 1.6rem;" onclick="publishAssignment()" id="btn-publish"><i class="fas fa-paper-plane"></i> Publish to Class 6B</button>
    </div>
  </div>

  <div class="panel">
    <div class="panel-head"><h3>Active Assignments</h3></div>
    <table class="lms-tbl"><thead><tr><th>Title</th><th>Subject</th><th>Due</th><th>Type</th><th>Status</th><th>Action</th></tr></thead>
    <tbody>
      ${ASSIGNMENTS.map(a => `
      <tr>
        <td><strong>${a.title}</strong></td>
        <td>${a.subject}</td>
        <td>${a.due}</td>
        <td><span class="chip grey">${a.type === 'mcq' ? 'Quiz' : 'Task'}</span></td>
        <td><span class="chip ${a.status==='pending'?'red':a.status==='draft'?'gold':'green'}">${a.status.charAt(0).toUpperCase() + a.status.slice(1)}</span></td>
        <td><button class="btn-outline" style="font-size:.73rem;padding:.4rem .8rem;" onclick="openGrader()">Mark</button></td>
      </tr>
      `).join('')}
    </tbody></table>
  </div>`,

/* ---- TEACHER GRADES, ATTENDANCE, NOTICES, TIMETABLE, RESOURCES (Unchanged for brevity) ---- */
't-grades':()=>`<p>Grades loaded.</p>`,
't-attendance':()=>`<p>Attendance loaded.</p>`,
't-notices':()=>`<p>Notices loaded.</p>`,
't-timetable':()=>`<p>Timetable loaded.</p>`,
't-resources':()=>`<p>Resources loaded.</p>`
};

/* ====================== DYNAMIC ASSIGNMENT BUILDER LOGIC ====================== */

// Switches between Standard Task and Quiz view
window.toggleFormat = function() {
  const type = document.getElementById('asgn-type').value;
  document.getElementById('fmt-standard').style.display = type === 'standard' ? 'block' : 'none';
  document.getElementById('fmt-mcq').style.display = type === 'mcq' ? 'block' : 'none';
  
  // If they choose MCQ and it's empty, automatically add the first question block
  if(type === 'mcq' && document.getElementById('mcq-list').children.length === 0) {
    addMcq();
  }
};

let mcqCount = 0;
// Adds a new multiple choice question block to the form
window.addMcq = function() {
  mcqCount++;
  const list = document.getElementById('mcq-list');
  const div = document.createElement('div');
  div.className = 'mcq-item-block';
  div.style.cssText = 'background:var(--lms-surface);padding:1.2rem;border-radius:10px;border:1px solid var(--lms-border);';
  div.innerHTML = `
    <strong style="display:block;font-size:.8rem;color:var(--primary);margin-bottom:.5rem;">Question ${mcqCount}</strong>
    <input type="text" class="mcq-q" placeholder="Type the question here..." style="width:100%;padding:.65rem;border:1px solid var(--lms-border);border-radius:8px;font-family:var(--font-lms);font-size:.85rem;margin-bottom:.6rem;outline:none;">
    
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.6rem;margin-bottom:.8rem;">
      <input type="text" class="mcq-o1" placeholder="Option A" style="padding:.6rem;border:1px solid var(--lms-border);border-radius:8px;font-family:var(--font-lms);font-size:.8rem;outline:none;">
      <input type="text" class="mcq-o2" placeholder="Option B" style="padding:.6rem;border:1px solid var(--lms-border);border-radius:8px;font-family:var(--font-lms);font-size:.8rem;outline:none;">
      <input type="text" class="mcq-o3" placeholder="Option C" style="padding:.6rem;border:1px solid var(--lms-border);border-radius:8px;font-family:var(--font-lms);font-size:.8rem;outline:none;">
    </div>
    
    <div style="display:flex;align-items:center;gap:.6rem;font-size:.8rem;font-weight:600;color:var(--primary);">
      <label>Correct Answer:</label>
      <select class="mcq-ans" style="padding:.4rem .6rem;border:1.5px solid var(--lms-border);border-radius:8px;font-family:var(--font-lms);outline:none;">
        <option value="0">Option A</option>
        <option value="1">Option B</option>
        <option value="2">Option C</option>
      </select>
    </div>
  `;
  list.appendChild(div);
};

// Publishes the Assignment/Quiz securely to Supabase
window.publishAssignment = async function() {
  const title = document.getElementById('asgn-title').value.trim();
  const subject = document.getElementById('asgn-subj').value;
  const dueRaw = document.getElementById('asgn-due').value;
  const type = document.getElementById('asgn-type').value;
  const btn = document.getElementById('btn-publish');
  
  if(!title || !dueRaw) { 
    toast('Please fill in the Title and Due Date!'); 
    return; 
  }
  
  // Format Date (e.g. 2026-05-10 -> May 10)
  const dateObj = new Date(dueRaw);
  const dueFormated = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  let description = '';
  let contentPayload = null;

  // Gather Standard or MCQ Data
  if(type === 'standard') {
    description = document.getElementById('asgn-desc').value.trim();
  } else {
    description = 'Multiple Choice Quiz Assessment';
    const blocks = document.querySelectorAll('.mcq-item-block');
    const questions = [];
    
    blocks.forEach(block => {
      const qText = block.querySelector('.mcq-q').value.trim();
      const o1 = block.querySelector('.mcq-o1').value.trim();
      const o2 = block.querySelector('.mcq-o2').value.trim();
      const o3 = block.querySelector('.mcq-o3').value.trim();
      const ans = parseInt(block.querySelector('.mcq-ans').value);
      
      if(qText && o1 && o2) {
        questions.push({ question: qText, options: [o1, o2, o3], answerIndex: ans });
      }
    });
    
    if(questions.length === 0) { toast('Please add at least one complete question.'); return; }
    contentPayload = questions; // This will go into the magic JSONB column!
  }

  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving to Cloud...';

  const newAssignmentData = {
    title: title,
    subject: subject,
    description: description,
    due: dueFormated,
    status: 'open',
    color: 'blue', 
    assignment_type: type,
    content: contentPayload // JSON data
  };

  // Push to Supabase!
  const { data, error } = await supabase.from('assignments').insert([newAssignmentData]).select();

  if(error) {
    console.error("Insert Error:", error);
    toast('Failed to save assignment.');
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Publish to Class 6B';
    return;
  }

  toast('Assignment successfully published to the cloud!');
  
  // Add the newly created database row to our local array so it shows up instantly
  ASSIGNMENTS.unshift({
    id: data[0].id,
    title: data[0].title,
    subject: data[0].subject,
    desc: data[0].description,
    due: data[0].due,
    status: data[0].status,
    color: data[0].color,
    type: data[0].assignment_type,
    content: data[0].content
  });

  // Re-render the page to clear the form and show the updated list
  renderPage('t-assignments');
};

/* ====================== AFTER RENDER HOOKS ====================== */
function afterRender(page){
  if(page==='t-dashboard'){
    const el=document.getElementById('t-quick-att');
    if(el){el.innerHTML=STUDENTS.slice(0,5).map((s,i)=>` <div class="std-row"><div class="std-av">${s.split(' ').map(n=>n[0]).join('').slice(0,2)}</div> <div class="std-info"><strong>${s}</strong><span>STU${String(i+1).padStart(3,'0')}</span></div> <div class="ml-auto"><span class="chip ${i===2?'red':'green'}">${i===2?'Absent':'Present'}</span></div></div>`).join('')+`<div style="padding:.7rem 1.3rem;border-top:1px solid var(--lms-border);"><button class="ph-action" onclick="showPage('t-attendance',null)" style="color:var(--lms-blue);background:none;border:none;cursor:pointer;font-size:.8rem;font-weight:600;">View all 34 students →</button></div>`;}
  }
}

// Global modal handlers
window.openGrader = function(){
  const gl=document.getElementById('grader-list');
  gl.innerHTML=`<div>${STUDENTS.slice(0,8).map((s,i)=>`
  <div class="grader-row">
  <label>${s}</label>
  <input type="number" min="0" max="100" value="${60+i*4}" placeholder="/100">
  <select><option>Present</option><option>Absent</option></select>
  </div>`).join('')}</div>`;
  openModal('grader-modal');
};
window.saveGrades = function(){closeModal('grader-modal');toast('Grades saved successfully!');};

// Keyboard listener
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&document.getElementById('login-section').style.display!=='none'&&!document.getElementById('lms-dashboard').classList.contains('active')) doLogin();
});

// App init
document.addEventListener('DOMContentLoaded',()=>{
  const y=document.getElementById('year');
  if(y) y.textContent=new Date().getFullYear();
  window.addEventListener('load',()=>{
    const pre=document.getElementById('preloader');
    if(pre){pre.classList.add('loaded');setTimeout(()=>pre.remove(),600);}
  });
});

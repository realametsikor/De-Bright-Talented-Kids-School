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

const ASSIGNMENTS = [
  {title:'Fractions Worksheet',subject:'Mathematics',desc:'Complete questions 1–20 on fractions and decimals.',due:'Apr 21',status:'pending',color:'gold'},
  {title:'English Comprehension',subject:'English Language',desc:'Read passage and answer all 10 questions.',due:'Apr 22',status:'pending',color:'blue'},
  {title:'Science Lab Report',subject:'Science',desc:'Write up findings from the germination experiment.',due:'Apr 24',status:'draft',color:'green'},
  {title:'Map Work',subject:'Social Studies',desc:'Label Ghana\'s regions on the blank map.',due:'Apr 18',status:'submitted',color:'purple'},
  {title:'Creative Portfolio',subject:'Creative Arts',desc:'Submit sketchbook with 5 completed drawings.',due:'Apr 28',status:'pending',color:'gold'},
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

function doLogin(){
  const id = document.getElementById('login-id').value.trim().toUpperCase();
  const pw = document.getElementById('login-pass').value;
  const err = document.getElementById('login-error');
  const btn = document.getElementById('login-btn-text');
  err.style.display='none';
  if(!id||!pw){showErr('Please enter your ID and password.');return;}
  if(!USERS[id]||PASSWORDS[id]!==pw){showErr('Invalid ID or password. Contact the school office.');return;}
  if(USERS[id].role!==currentRole){showErr(`This ID belongs to a ${USERS[id].role} account. Please select the correct role.`);return;}
  currentUser = USERS[id];
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in…';
  setTimeout(()=>{
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Log In';
    document.getElementById('login-section').style.display='none';
    document.getElementById('lms-dashboard').classList.add('active');
    buildDashboard();
  },900);
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

  // Build sidebar nav
  const nav = document.getElementById('sidebar-nav');
  const items = u.role==='student' ? [
    {section:'Main', links:[
      {icon:'th-large',label:'Dashboard',page:'s-dashboard'},
      {icon:'book-open',label:'My Subjects',page:'s-subjects'},
      {icon:'tasks',label:'Assignments',page:'s-assignments',badge:3},
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
  setDate();
  window.scrollTo({top:0});
}

function setDate(){
  // Date formatting logic can go here if needed in the future
}

/* ====================== NAV ====================== */
function showPage(page, el){
  document.querySelectorAll('.sb-item').forEach(n=>n.classList.remove('active'));
  if(el) el.classList.add('active');
  const titles = {
    's-dashboard':'Dashboard','s-subjects':'My Subjects','s-assignments':'Assignments',
    's-grades':'My Grades','s-timetable':'Timetable','s-quiz':'Quizzes',
    's-attendance':'Attendance','s-resources':'Study Resources','s-ai':'AI Tutor',
    's-notices':'School Notices','t-dashboard':'Dashboard','t-class':'My Class',
    't-assignments':'Assignments','t-grades':'Grade Book','t-attendance':'Attendance',
    't-notices':'Post a Notice','t-timetable':'Timetable','t-resources':'Upload Resources',
  };
  document.getElementById('topbar-title').textContent = titles[page]||page;
  renderPage(page);
  closeSidebar();
  window.scrollTo({top:0,behavior:'smooth'});
}

/* ====================== SIDEBAR MOBILE ====================== */
function openSidebar(){document.getElementById('lms-sidebar').classList.add('open');document.getElementById('sb-overlay').classList.add('open');}
function closeSidebar(){document.getElementById('lms-sidebar').classList.remove('open');document.getElementById('sb-overlay').classList.remove('open');}

/* ====================== MODALS ====================== */
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.addEventListener('click',e=>{if(e.target.classList.contains('lms-modal')) e.target.classList.remove('open');});

/* ====================== TOAST ====================== */
function toast(msg){const t=document.getElementById('lms-toast');document.getElementById('toast-msg').textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000);}

/* ====================== PAGE RENDERER ====================== */
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
      <p>You have 3 pending assignments and a quiz due today.</p>
    </div>
    <div class="wb-icon"><i class="fas fa-star"></i></div>
  </div>
  <div class="stats-row">
    <div class="sc gold"><div class="sc-icon gold"><i class="fas fa-book"></i></div><div class="sc-info"><label>Subjects</label><div class="val">8</div><div class="sub">This term</div></div></div>
    <div class="sc green"><div class="sc-icon green"><i class="fas fa-tasks"></i></div><div class="sc-info"><label>Pending</label><div class="val">3</div><div class="sub">Assignments</div></div></div>
    <div class="sc blue"><div class="sc-icon blue"><i class="fas fa-chart-bar"></i></div><div class="sc-info"><label>Avg Grade</label><div class="val">78%</div><div class="sub">All subjects</div></div></div>
    <div class="sc purple"><div class="sc-icon purple"><i class="fas fa-user-check"></i></div><div class="sc-info"><label>Attendance</label><div class="val">94%</div><div class="sub">This term</div></div></div>
  </div>
  <div class="two-col">
    <div class="panel">
      <div class="panel-head"><h3>Upcoming Assignments</h3><button class="ph-action" onclick="showPage('s-assignments',null)">See all →</button></div>
      <table class="lms-tbl"><thead><tr><th>Subject</th><th>Task</th><th>Due</th><th>Status</th></tr></thead>
      <tbody>
        <tr><td>Mathematics</td><td>Fractions WS</td><td>Apr 21</td><td><span class="chip red">Pending</span></td></tr>
        <tr><td>English</td><td>Comprehension</td><td>Apr 22</td><td><span class="chip red">Pending</span></td></tr>
        <tr><td>Science</td><td>Lab Report</td><td>Apr 24</td><td><span class="chip gold">Draft</span></td></tr>
        <tr><td>Soc. Studies</td><td>Map Work</td><td>Apr 18</td><td><span class="chip green">Submitted</span></td></tr>
      </tbody></table>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Notice Board</h3><button class="ph-action" onclick="showPage('s-notices',null)">See all →</button></div>
      <ul class="notice-list">
        <li class="notice-item"><div class="nd" style="background:var(--lms-red);"></div><div><h4>End-of-Term Exams — May 5</h4><p>Study schedules shared by class teachers.</p><div class="notice-date">Apr 17, 2026 · Admin</div></div></li>
        <li class="notice-item"><div class="nd" style="background:var(--accent);"></div><div><h4>Open Day — May 10</h4><p>Parents invited to visit and meet teachers.</p><div class="notice-date">Apr 15, 2026</div></div></li>
        <li class="notice-item"><div class="nd" style="background:var(--lms-green);"></div><div><h4>Swimming Gala — Apr 26</h4><p>Bring swimming kits by April 24.</p><div class="notice-date">Apr 14, 2026</div></div></li>
      </ul>
    </div>
  </div>
  <div class="two-col">
    <div class="panel">
      <div class="panel-head"><h3>Subject Progress</h3></div>
      <div style="padding:1rem 1.3rem;display:flex;flex-direction:column;gap:.9rem;">
        ${SUBJECTS.slice(0,5).map(s=>`
          <div>
            <div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:.3rem;"><span style="font-weight:600;">${s.emoji} ${s.name}</span><span style="color:var(--lms-muted);">${s.progress}%</span></div>
            <div class="prog-bar"><div class="fill" style="width:${s.progress}%;"></div></div>
          </div>`).join('')}
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Recent Activity</h3></div>
      <div class="activity-item"><div class="act-icon" style="background:#dcfce7;color:#15803d;"><i class="fas fa-check"></i></div><div class="act-info"><p>Map Work submitted successfully</p><span>Social Studies · Apr 18</span></div></div>
      <div class="activity-item"><div class="act-icon" style="background:#dbeafe;color:#1d4ed8;"><i class="fas fa-star"></i></div><div class="act-info"><p>Quiz completed — English Grammar: <strong>80%</strong></p><span>English · Apr 16</span></div></div>
      <div class="activity-item"><div class="act-icon" style="background:#fffbeb;color:#b45309;"><i class="fas fa-book-open"></i></div><div class="act-info"><p>Downloaded Science Lab Manual</p><span>Resources · Apr 15</span></div></div>
      <div class="activity-item"><div class="act-icon" style="background:#ede9fe;color:#5b21b6;"><i class="fas fa-robot"></i></div><div class="act-info"><p>Asked AI Tutor about fractions</p><span>AI Tutor · Apr 14</span></div></div>
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
      const chips={pending:'<span class="chip red">Pending</span>',draft:'<span class="chip gold">Draft</span>',submitted:'<span class="chip green">Submitted</span>'};
      return `<div class="asgn-card" style="border-top-color:${a.color==='gold'?'var(--accent)':a.color==='blue'?'#3b82f6':a.color==='green'?'#22c55e':'#8b5cf6'};">
        <h4>${a.title}</h4>
        <p><strong>${a.subject}</strong> — ${a.desc}</p>
        <div class="asgn-meta">
          <span class="asgn-due"><i class="fas fa-calendar-day"></i> ${a.due}</span>
          <div style="display:flex;gap:.4rem;align-items:center;">${chips[a.status]}${a.status==='pending'?`<button class="btn-gold" onclick="toast('${a.title} submitted!')">Submit</button>`:''}${a.status==='draft'?`<button class="btn-outline" onclick="toast('Draft saved!')">Save</button>`:''}</div>
        </div>
      </div>`;
    }).join('')}
  </div>`,

/* ---- STUDENT GRADES ---- */
's-grades':()=>`
  <div class="two-col" style="margin-bottom:1.3rem;">
    <div class="panel">
      <div class="panel-head"><h3>Performance Summary</h3></div>
      <div class="perf-ring-wrap" style="--pct:${(78/100)*360}deg;">
        <div class="perf-ring" style="background:conic-gradient(var(--accent) ${78*3.6}deg, var(--lms-border) 0);">
          <div class="perf-ring-inner"><strong>78%</strong><span>Average</span></div>
        </div>
        <div style="display:flex;gap:.6rem;flex-wrap:wrap;justify-content:center;">
          <span class="chip green">5 A's</span><span class="chip blue">2 B's</span><span class="chip gold">2 C's</span>
        </div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Grade Distribution</h3></div>
      <div style="padding:1rem 1.3rem;display:flex;flex-direction:column;gap:.8rem;">
        ${[['A — Excellent',5,'#22c55e'],[`B — Good`,2,'#3b82f6'],['C — Average',2,'#f59e0b']].map(([label,count,color])=>`
          <div>
            <div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:.3rem;"><span>${label}</span><span style="font-weight:700;">${count} subjects</span></div>
            <div class="prog-bar"><div class="fill" style="width:${(count/8)*100}%;background:${color};"></div></div>
          </div>`).join('')}
      </div>
    </div>
  </div>
  <div class="panel">
    <div class="panel-head"><h3>Term 2 Results — Class 6B</h3><span class="chip green">Active Term</span></div>
    <table class="lms-tbl"><thead><tr><th>Subject</th><th>Class Score</th><th>Exam Score</th><th>Total</th><th>Grade</th><th>Remark</th></tr></thead>
    <tbody>${GRADES.map(g=>`
      <tr><td><strong>${g.subject}</strong></td><td>${g.classScore}</td><td>${g.examScore}</td><td><strong>${g.total}/100</strong></td>
      <td><span class="grade-${g.grade}">${g.grade}</span></td>
      <td><span class="chip ${g.remark==='Excellent'?'green':g.remark==='Good'?'blue':'gold'}">${g.remark}</span></td></tr>`).join('')}
    </tbody></table>
  </div>`,

/* ---- STUDENT TIMETABLE ---- */
's-timetable':()=>`
  <h2 style="font-family:'Poppins',sans-serif;font-size:1.05rem;color:var(--primary);margin-bottom:1.2rem;">Weekly Timetable — Class 6B</h2>
  <div class="panel">
    <div class="tt-wrap">
      <div class="tt-grid">
        <div class="tt-head">Time</div><div class="tt-head">Mon</div><div class="tt-head">Tue</div><div class="tt-head">Wed</div><div class="tt-head">Thu</div><div class="tt-head">Fri</div>
        <div class="tt-cell" style="font-size:.62rem;color:var(--lms-muted);">7:30–8:20</div>
        <div class="tt-cell filled-gold">Maths<div class="tt-sub">Mr. Asare</div></div>
        <div class="tt-cell filled-blue">English<div class="tt-sub">Ms. Owusu</div></div>
        <div class="tt-cell filled-green">Science<div class="tt-sub">Mr. Boateng</div></div>
        <div class="tt-cell filled-gold">Maths<div class="tt-sub">Mr. Asare</div></div>
        <div class="tt-cell filled-purple">French<div class="tt-sub">Mme. Kusi</div></div>
        <div class="tt-cell" style="font-size:.62rem;color:var(--lms-muted);">8:20–9:10</div>
        <div class="tt-cell filled-blue">English<div class="tt-sub">Ms. Owusu</div></div>
        <div class="tt-cell filled-green">Science<div class="tt-sub">Mr. Boateng</div></div>
        <div class="tt-cell filled-gold">Maths<div class="tt-sub">Mr. Asare</div></div>
        <div class="tt-cell filled-blue">English<div class="tt-sub">Ms. Owusu</div></div>
        <div class="tt-cell filled-green">Soc. Studies<div class="tt-sub">Ms. Ofori</div></div>
        <div class="tt-cell" style="font-size:.62rem;color:var(--lms-muted);">9:10–9:30</div>
        <div class="tt-cell break" style="grid-column:span 5;">☕ Morning Break</div>
        <div class="tt-cell" style="font-size:.62rem;color:var(--lms-muted);">9:30–10:20</div>
        <div class="tt-cell filled-green">Soc. Studies<div class="tt-sub">Ms. Ofori</div></div>
        <div class="tt-cell filled-purple">French<div class="tt-sub">Mme. Kusi</div></div>
        <div class="tt-cell filled-blue">English<div class="tt-sub">Ms. Owusu</div></div>
        <div class="tt-cell filled-green">Science<div class="tt-sub">Mr. Boateng</div></div>
        <div class="tt-cell filled-gold">Maths<div class="tt-sub">Mr. Asare</div></div>
        <div class="tt-cell" style="font-size:.62rem;color:var(--lms-muted);">10:20–11:10</div>
        <div class="tt-cell filled-purple">RME<div class="tt-sub">Mr. Frimpong</div></div>
        <div class="tt-cell filled-gold">ICT<div class="tt-sub">Ms. Mensah</div></div>
        <div class="tt-cell filled-purple">Creative Arts<div class="tt-sub">Ms. Acheampong</div></div>
        <div class="tt-cell filled-purple">RME<div class="tt-sub">Mr. Frimpong</div></div>
        <div class="tt-cell filled-gold">ICT<div class="tt-sub">Ms. Mensah</div></div>
        <div class="tt-cell" style="font-size:.62rem;color:var(--lms-muted);">12:00–1:00</div>
        <div class="tt-cell lunch" style="grid-column:span 5;">🍱 Lunch Break</div>
      </div>
    </div>
  </div>`,

/* ---- STUDENT QUIZZES ---- */
's-quiz':()=>`
  <h2 style="font-family:'Poppins',sans-serif;font-size:1.05rem;color:var(--primary);margin-bottom:1.2rem;">Quizzes</h2>
  <div class="cards-grid">
    <div class="asgn-card" style="border-top-color:#3b82f6;">
      <h4>Mathematics — Fractions & Decimals</h4>
      <p>5 multiple-choice questions · Est. 5 minutes</p>
      <div class="asgn-meta"><span class="asgn-due"><i class="fas fa-clock"></i> Due Apr 21</span><button class="btn-gold" onclick="openQuiz()">Start Quiz</button></div>
    </div>
    <div class="asgn-card" style="border-top-color:#22c55e;">
      <h4>Science — Living Things</h4>
      <p>8 questions · Est. 6 minutes</p>
      <div class="asgn-meta"><span class="asgn-due"><i class="fas fa-clock"></i> Due Apr 24</span><button class="btn-gold" onclick="toast('Loading Science Quiz…')">Start Quiz</button></div>
    </div>
    <div class="asgn-card" style="border-top-color:#8b5cf6;">
      <h4>English — Grammar Practice</h4>
      <p>12 questions · Est. 10 minutes</p>
      <div class="asgn-meta"><span class="chip green">Done · 80%</span><button class="btn-outline">Review</button></div>
    </div>
    <div class="asgn-card" style="border-top-color:var(--accent);">
      <h4>Social Studies — Ghana History</h4>
      <p>10 questions · Est. 8 minutes</p>
      <div class="asgn-meta"><span class="asgn-due"><i class="fas fa-clock"></i> Due Apr 30</span><button class="btn-gold" onclick="toast('Loading quiz…')">Start Quiz</button></div>
    </div>
  </div>`,

/* ---- STUDENT ATTENDANCE ---- */
's-attendance':()=>`
  <h2 style="font-family:'Poppins',sans-serif;font-size:1.05rem;color:var(--primary);margin-bottom:1.2rem;">My Attendance Record</h2>
  <div class="stats-row">
    <div class="sc green"><div class="sc-icon green"><i class="fas fa-check-circle"></i></div><div class="sc-info"><label>Present</label><div class="val">56</div><div class="sub">Days this term</div></div></div>
    <div class="sc red"><div class="sc-icon red"><i class="fas fa-times-circle"></i></div><div class="sc-info"><label>Absent</label><div class="val">3</div><div class="sub">Days this term</div></div></div>
    <div class="sc gold"><div class="sc-icon gold"><i class="fas fa-sun"></i></div><div class="sc-info"><label>Holidays</label><div class="val">1</div><div class="sub">This term</div></div></div>
    <div class="sc blue"><div class="sc-icon blue"><i class="fas fa-percent"></i></div><div class="sc-info"><label>Rate</label><div class="val">94%</div><div class="sub">This term</div></div></div>
  </div>
  <div class="panel">
    <div class="panel-head"><h3>April 2026 — Attendance Calendar</h3></div>
    <div style="padding:1rem 1.3rem;">
      <div style="display:flex;gap:.8rem;margin-bottom:1rem;flex-wrap:wrap;">
        <span style="display:flex;align-items:center;gap:5px;font-size:.77rem;"><span class="att-dot p"></span>Present</span>
        <span style="display:flex;align-items:center;gap:5px;font-size:.77rem;"><span class="att-dot a"></span>Absent</span>
        <span style="display:flex;align-items:center;gap:5px;font-size:.77rem;"><span class="att-dot h"></span>Holiday</span>
      </div>
      <div class="att-dots" id="att-calendar"></div>
    </div>
  </div>`,

/* ---- STUDENT RESOURCES ---- */
's-resources':()=>`
  <h2 style="font-family:'Poppins',sans-serif;font-size:1.05rem;color:var(--primary);margin-bottom:1.2rem;">Study Resources</h2>
  <div style="display:flex;flex-direction:column;gap:.8rem;">
    ${RESOURCES.map(r=>`
      <div class="resource-card">
        <div class="res-icon" style="background:${r.color};color:${r.iconColor};">${r.icon}</div>
        <div class="res-info"><strong>${r.name}</strong><span>${r.type} · ${r.size}</span></div>
        <div class="res-dl" onclick="toast('Downloading ${r.name}…')"><i class="fas fa-download"></i></div>
      </div>`).join('')}
  </div>`,

/* ---- STUDENT AI TUTOR ---- */
's-ai':()=>`
  <h2 style="font-family:'Poppins',sans-serif;font-size:1.05rem;color:var(--primary);margin-bottom:1.2rem;">AI Study Tutor 🤖</h2>
  <div class="panel" style="max-width:680px;">
    <div class="panel-head"><h3>Chat with your AI Tutor</h3><span class="chip green">Online</span></div>
    <div class="modal-body">
      <div class="ai-chat" id="ai-chat-inline">
        <div class="ai-msg ai"><div class="ai-av bot">🤖</div><div class="ai-bubble">Hello Ama! I'm your AI Study Tutor. Ask me anything about Maths, English, Science, or any subject. I'm here to help! 📚</div></div>
      </div>
      <div class="ai-input-row" style="margin-top:.8rem;">
        <input class="ai-input" id="ai-input-inline" placeholder="Ask me anything about your lessons…" onkeydown="if(event.key==='Enter')sendAiInline()">
        <button class="btn-gold" onclick="sendAiInline()"><i class="fas fa-paper-plane"></i></button>
      </div>
      <div style="margin-top:.8rem;display:flex;gap:.5rem;flex-wrap:wrap;">
        <button class="btn-outline" style="font-size:.73rem;" onclick="quickAsk('What is a fraction?')">What is a fraction?</button>
        <button class="btn-outline" style="font-size:.73rem;" onclick="quickAsk('Explain photosynthesis')">Explain photosynthesis</button>
        <button class="btn-outline" style="font-size:.73rem;" onclick="quickAsk('Help me with English grammar')">English grammar help</button>
      </div>
    </div>
  </div>`,

/* ---- STUDENT NOTICES ---- */
's-notices':()=>`
  <h2 style="font-family:'Poppins',sans-serif;font-size:1.05rem;color:var(--primary);margin-bottom:1.2rem;">School Notices</h2>
  <div class="panel">
    <ul class="notice-list">
      <li class="notice-item"><div class="nd" style="background:var(--lms-red);"></div><div><h4>End-of-Term Examinations — May 5</h4><p>Term 2 exams begin Monday, May 5. All students must be seated by 7:15 AM. Study timetables have been shared by individual class teachers. Parents are urged to support their wards.</p><div class="notice-date">Apr 17, 2026 · Admin Office</div></div></li>
      <li class="notice-item"><div class="nd" style="background:var(--accent);"></div><div><h4>Open Day — May 10, 2026</h4><p>Parents and guardians are warmly invited to our Open Day. Meet teachers, review your child's progress, and tour our facilities. 9:00 AM – 1:00 PM.</p><div class="notice-date">Apr 15, 2026 · Headmistress</div></div></li>
      <li class="notice-item"><div class="nd" style="background:var(--lms-green);"></div><div><h4>Swimming Gala — Apr 26</h4><p>Students selected for the swimming team should bring their kits by April 24. Event held at University of Ghana Sports Complex.</p><div class="notice-date">Apr 14, 2026 · Sports Department</div></div></li>
      <li class="notice-item"><div class="nd" style="background:var(--lms-blue);"></div><div><h4>PTA Meeting — Apr 30 at 5:00 PM</h4><p>Parent-Teacher Association meeting at 5 PM in the school hall. All parents strongly encouraged to attend.</p><div class="notice-date">Apr 10, 2026 · Admin Office</div></div></li>
    </ul>
  </div>`,

/* ---- TEACHER DASHBOARD ---- */
't-dashboard':()=>`
  <div class="welcome-banner">
    <div class="wb-text">
      <div class="wb-tag">📋 Class Teacher — 6B</div>
      <h2>Good day, Ms. Boateng! 👩‍🏫</h2>
      <p>18 assignments to mark · Attendance not yet logged today</p>
    </div>
    <div class="wb-icon"><i class="fas fa-chalkboard-teacher"></i></div>
  </div>
  <div class="stats-row">
    <div class="sc gold"><div class="sc-icon gold"><i class="fas fa-users"></i></div><div class="sc-info"><label>Students</label><div class="val">34</div><div class="sub">In Class 6B</div></div></div>
    <div class="sc red"><div class="sc-icon red"><i class="fas fa-file-alt"></i></div><div class="sc-info"><label>To Mark</label><div class="val">18</div><div class="sub">Assignments</div></div></div>
    <div class="sc green"><div class="sc-icon green"><i class="fas fa-user-check"></i></div><div class="sc-info"><label>Present Today</label><div class="val">31</div><div class="sub">of 34 students</div></div></div>
    <div class="sc blue"><div class="sc-icon blue"><i class="fas fa-chart-line"></i></div><div class="sc-info"><label>Class Average</label><div class="val">74%</div><div class="sub">This term</div></div></div>
  </div>
  <div class="two-col">
    <div class="panel">
      <div class="panel-head"><h3>Assignments to Mark</h3><button class="ph-action" onclick="showPage('t-assignments',null)">View all →</button></div>
      <table class="lms-tbl"><thead><tr><th>Task</th><th>Submitted</th><th>Action</th></tr></thead>
      <tbody>
        <tr><td>Fractions Worksheet</td><td>22/34</td><td><button class="btn-gold" style="font-size:.75rem;padding:.4rem .8rem;" onclick="openGrader()">Mark</button></td></tr>
        <tr><td>Comprehension</td><td>30/34</td><td><button class="btn-gold" style="font-size:.75rem;padding:.4rem .8rem;" onclick="openGrader()">Mark</button></td></tr>
        <tr><td>Lab Report</td><td>18/34</td><td><button class="btn-gold" style="font-size:.75rem;padding:.4rem .8rem;" onclick="openGrader()">Mark</button></td></tr>
      </tbody></table>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Class Performance</h3></div>
      <div style="padding:1rem 1.3rem;display:flex;flex-direction:column;gap:.8rem;">
        ${[['Mathematics',78],['English',72],['Science',80],['Social Studies',70],['ICT',85]].map(([s,p])=>`
          <div>
            <div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:.3rem;"><span style="font-weight:600;">${s}</span><span style="color:var(--lms-muted);">${p}%</span></div>
            <div class="prog-bar"><div class="fill" style="width:${p}%;"></div></div>
          </div>`).join('')}
      </div>
    </div>
  </div>
  <div class="panel">
    <div class="panel-head"><h3>Today's Quick Attendance</h3><button class="ph-action" onclick="showPage('t-attendance',null)">Full View →</button></div>
    <div id="t-quick-att"></div>
  </div>`,

/* ---- TEACHER CLASS ---- */
't-class':()=>`
  <h2 style="font-family:'Poppins',sans-serif;font-size:1.05rem;color:var(--primary);margin-bottom:1.2rem;">Class 6B — Student List</h2>
  <div class="panel">
    <div class="panel-head"><h3>34 Students Enrolled</h3><span class="chip green">Term 2 Active</span></div>
    ${STUDENTS.map((s,i)=>`
      <div class="std-row">
        <div class="std-av">${s.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
        <div class="std-info"><strong>${s}</strong><span>STU${String(i+1).padStart(3,'0')}</span></div>
        <div class="ml-auto" style="display:flex;gap:.4rem;">
          <span class="chip ${i%7===2||i%7===5?'red':'green'}">${i%7===2||i%7===5?'Absent':'Present'}</span>
        </div>
      </div>`).join('')}
  </div>`,

/* ---- TEACHER ASSIGNMENTS ---- */
't-assignments':()=>`
  <h2 style="font-family:'Poppins',sans-serif;font-size:1.05rem;color:var(--primary);margin-bottom:1.2rem;">Assignments</h2>
  <div class="panel" style="margin-bottom:1.3rem;">
    <div class="panel-head"><h3>Create New Assignment</h3></div>
    <div style="padding:1.2rem;display:grid;grid-template-columns:1fr 1fr;gap:.9rem;">
      <div class="lms-form-group"><label>Title</label><input type="text" placeholder="e.g. Fractions Worksheet"></div>
      <div class="lms-form-group"><label>Subject</label><input type="text" placeholder="e.g. Mathematics"></div>
      <div class="lms-form-group"><label>Due Date</label><input type="date"></div>
      <div class="lms-form-group"><label>Max Score</label><input type="number" placeholder="100"></div>
      <div class="lms-form-group" style="grid-column:span 2;"><label>Instructions</label><input type="text" placeholder="Brief instructions for students…"></div>
    </div>
    <div style="padding:0 1.2rem 1.2rem;"><button class="btn-lms-primary" style="width:auto;padding:.65rem 1.6rem;" onclick="toast('Assignment published to Class 6B!')"><i class="fas fa-paper-plane"></i> Publish Assignment</button></div>
  </div>
  <div class="panel">
    <div class="panel-head"><h3>Active Assignments</h3></div>
    <table class="lms-tbl"><thead><tr><th>Title</th><th>Subject</th><th>Due</th><th>Submitted</th><th>Status</th><th>Action</th></tr></thead>
    <tbody>
      <tr><td>Fractions Worksheet</td><td>Maths</td><td>Apr 21</td><td>22/34</td><td><span class="chip gold">In Progress</span></td><td><button class="btn-outline" style="font-size:.73rem;padding:.4rem .8rem;" onclick="openGrader()">Mark</button></td></tr>
      <tr><td>Comprehension Task</td><td>English</td><td>Apr 22</td><td>30/34</td><td><span class="chip gold">In Progress</span></td><td><button class="btn-outline" style="font-size:.73rem;padding:.4rem .8rem;" onclick="openGrader()">Mark</button></td></tr>
      <tr><td>Lab Report</td><td>Science</td><td>Apr 24</td><td>18/34</td><td><span class="chip blue">Open</span></td><td><button class="btn-outline" style="font-size:.73rem;padding:.4rem .8rem;" onclick="openGrader()">Mark</button></td></tr>
      <tr><td>Map Work</td><td>Soc. Studies</td><td>Apr 18</td><td>34/34</td><td><span class="chip green">Closed</span></td><td><button class="btn-outline" style="font-size:.73rem;padding:.4rem .8rem;" onclick="toast('Results loaded!')">Results</button></td></tr>
    </tbody></table>
  </div>`,

/* ---- TEACHER GRADES ---- */
't-grades':()=>`
  <h2 style="font-family:'Poppins',sans-serif;font-size:1.05rem;color:var(--primary);margin-bottom:1.2rem;">Grade Book — Class 6B</h2>
  <div class="panel">
    <div class="panel-head"><h3>Term 2 Results</h3><button class="ph-action" onclick="toast('Grades exported as CSV!')"><i class="fas fa-download"></i> Export CSV</button></div>
    <table class="lms-tbl"><thead><tr><th>Student</th><th>Maths</th><th>English</th><th>Science</th><th>Soc. Studies</th><th>ICT</th><th>Average</th><th>Grade</th></tr></thead>
    <tbody>${STUDENTS.slice(0,15).map((s,i)=>{
      const scores=[75+i%15,68+i%18,80+i%12,72+i%10,88+i%8];
      const avg=Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
      const g=avg>=80?'A':avg>=70?'B':avg>=60?'C':'D';
      return `<tr><td>${s}</td>${scores.map(sc=>`<td>${sc}%</td>`).join('')}<td><strong>${avg}%</strong></td><td><span class="grade-${g}">${g}</span></td></tr>`;
    }).join('')}</tbody></table>
  </div>`,

/* ---- TEACHER ATTENDANCE ---- */
't-attendance':()=>`
  <h2 style="font-family:'Poppins',sans-serif;font-size:1.05rem;color:var(--primary);margin-bottom:1.2rem;">Mark Attendance — Class 6B</h2>
  <div class="panel">
    <div class="panel-head"><h3>${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</h3><button class="ph-action" onclick="markAllPresent()">✅ Mark All Present</button></div>
    <div id="att-mark-list"></div>
    <div style="padding:1rem 1.3rem;border-top:1px solid var(--lms-border);">
      <button class="btn-lms-primary" style="width:auto;padding:.65rem 1.6rem;" onclick="toast('Attendance saved successfully!')"><i class="fas fa-save"></i> Save Attendance</button>
    </div>
  </div>`,

/* ---- TEACHER NOTICES ---- */
't-notices':()=>`
  <h2 style="font-family:'Poppins',sans-serif;font-size:1.05rem;color:var(--primary);margin-bottom:1.2rem;">Post a Notice</h2>
  <div class="panel" style="max-width:600px;">
    <div class="panel-head"><h3>New Notice</h3></div>
    <div style="padding:1.2rem;display:flex;flex-direction:column;gap:.9rem;">
      <div class="lms-form-group"><label>Title</label><input type="text" placeholder="e.g. End-of-Term Reminder"></div>
      <div class="lms-form-group"><label>Audience</label>
        <select style="width:100%;padding:.65rem .9rem;border:1.5px solid var(--lms-border);border-radius:9px;font-family:var(--font-lms);font-size:.88rem;background:var(--light);outline:none;">
          <option>All Students</option><option>Class 6B Only</option><option>Parents & Guardians</option><option>All Staff</option>
        </select>
      </div>
      <div class="lms-form-group"><label>Priority</label>
        <select style="width:100%;padding:.65rem .9rem;border:1.5px solid var(--lms-border);border-radius:9px;font-family:var(--font-lms);font-size:.88rem;background:var(--light);outline:none;">
          <option>Normal</option><option>Important</option><option>Urgent</option>
        </select>
      </div>
      <div class="lms-form-group"><label>Message</label>
        <textarea rows="5" placeholder="Type the notice content here…" style="width:100%;padding:.7rem .9rem;border:1.5px solid var(--lms-border);border-radius:9px;font-family:var(--font-lms);font-size:.88rem;resize:vertical;background:var(--light);outline:none;"></textarea>
      </div>
      <button class="btn-lms-primary" style="width:auto;padding:.65rem 1.6rem;" onclick="toast('Notice published successfully!')"><i class="fas fa-bullhorn"></i> Publish Notice</button>
    </div>
  </div>`,

/* ---- TEACHER TIMETABLE ---- */
't-timetable':()=>`
  <h2 style="font-family:'Poppins',sans-serif;font-size:1.05rem;color:var(--primary);margin-bottom:1.2rem;">Class 6B — Weekly Timetable</h2>
  <div class="panel">
    <div class="tt-wrap">
      <div class="tt-grid">
        <div class="tt-head">Time</div><div class="tt-head">Mon</div><div class="tt-head">Tue</div><div class="tt-head">Wed</div><div class="tt-head">Thu</div><div class="tt-head">Fri</div>
        <div class="tt-cell" style="font-size:.62rem;color:var(--lms-muted);">7:30–8:20</div>
        <div class="tt-cell filled-gold">Maths</div><div class="tt-cell filled-blue">English</div><div class="tt-cell filled-green">Science</div><div class="tt-cell filled-gold">Maths</div><div class="tt-cell filled-purple">French</div>
        <div class="tt-cell" style="font-size:.62rem;color:var(--lms-muted);">8:20–9:10</div>
        <div class="tt-cell filled-blue">English</div><div class="tt-cell filled-green">Science</div><div class="tt-cell filled-gold">Maths</div><div class="tt-cell filled-blue">English</div><div class="tt-cell filled-green">Soc. Studies</div>
        <div class="tt-cell" style="font-size:.62rem;color:var(--lms-muted);">9:10–9:30</div>
        <div class="tt-cell break" style="grid-column:span 5;">☕ Morning Break</div>
        <div class="tt-cell" style="font-size:.62rem;color:var(--lms-muted);">9:30–10:20</div>
        <div class="tt-cell filled-green">Soc. Studies</div><div class="tt-cell filled-purple">French</div><div class="tt-cell filled-blue">English</div><div class="tt-cell filled-green">Science</div><div class="tt-cell filled-gold">Maths</div>
        <div class="tt-cell" style="font-size:.62rem;color:var(--lms-muted);">10:20–11:10</div>
        <div class="tt-cell filled-purple">RME</div><div class="tt-cell filled-gold">ICT</div><div class="tt-cell filled-purple">Creative Arts</div><div class="tt-cell filled-purple">RME</div><div class="tt-cell filled-gold">ICT</div>
        <div class="tt-cell" style="font-size:.62rem;color:var(--lms-muted);">12:00–1:00</div>
        <div class="tt-cell lunch" style="grid-column:span 5;">🍱 Lunch Break</div>
      </div>
    </div>
  </div>`,

/* ---- TEACHER RESOURCES ---- */
't-resources':()=>`
  <h2 style="font-family:'Poppins',sans-serif;font-size:1.05rem;color:var(--primary);margin-bottom:1.2rem;">Upload Resources</h2>
  <div class="panel" style="max-width:600px;margin-bottom:1.3rem;">
    <div class="panel-head"><h3>Upload New File</h3></div>
    <div style="padding:1.2rem;display:flex;flex-direction:column;gap:.9rem;">
      <div class="lms-form-group"><label>Title</label><input type="text" placeholder="e.g. Maths Textbook Chapter 4"></div>
      <div class="lms-form-group"><label>Subject</label>
        <select style="width:100%;padding:.65rem .9rem;border:1.5px solid var(--lms-border);border-radius:9px;font-family:var(--font-lms);font-size:.88rem;background:var(--light);outline:none;">
          <option>Mathematics</option><option>English</option><option>Science</option><option>Social Studies</option><option>ICT</option>
        </select>
      </div>
      <div class="lms-form-group"><label>File</label><input type="file" accept=".pdf,.doc,.docx,.png,.jpg"></div>
      <button class="btn-lms-primary" style="width:auto;padding:.65rem 1.6rem;" onclick="toast('Resource uploaded and shared with students!')"><i class="fas fa-upload"></i> Upload Resource</button>
    </div>
  </div>
  <div class="panel">
    <div class="panel-head"><h3>Uploaded Resources</h3></div>
    <div style="display:flex;flex-direction:column;gap:.6rem;padding:1rem 1.2rem;">
      ${RESOURCES.map(r=>`
        <div class="resource-card">
          <div class="res-icon" style="background:${r.color};color:${r.iconColor};">${r.icon}</div>
          <div class="res-info"><strong>${r.name}</strong><span>${r.type} · ${r.size}</span></div>
          <button class="btn-danger" style="margin-left:auto;font-size:.72rem;padding:.35rem .75rem;" onclick="toast('Resource deleted.')"><i class="fas fa-trash"></i></button>
        </div>`).join('')}
    </div>
  </div>`,
};

/* ====================== AFTER RENDER HOOKS ====================== */
function afterRender(page){
// Attendance dots
if(page==='s-attendance'){
const dots=document.getElementById('att-calendar');
if(dots){const types=['p','p','p','p','h','p','p','a','p','p','p','p','p','a','p','p','p','p','p'];dots.innerHTML=types.map(t=>`<div class="att-dot ${t}" title="${{p:'Present',a:'Absent',h:'Holiday'}[t]}"></div>`).join('');}
}
// Teacher quick attendance
if(page==='t-dashboard'){
const el=document.getElementById('t-quick-att');
if(el){el.innerHTML=STUDENTS.slice(0,5).map((s,i)=>` <div class="std-row"><div class="std-av">${s.split(' ').map(n=>n[0]).join('').slice(0,2)}</div> <div class="std-info"><strong>${s}</strong><span>STU${String(i+1).padStart(3,'0')}</span></div> <div class="ml-auto"><span class="chip ${i===2?'red':'green'}">${i===2?'Absent':'Present'}</span></div></div>`).join('')+`<div style="padding:.7rem 1.3rem;border-top:1px solid var(--lms-border);"><button class="ph-action" onclick="showPage('t-attendance',null)" style="color:var(--lms-blue);background:none;border:none;cursor:pointer;font-size:.8rem;font-weight:600;">View all 34 students →</button></div>`;}
}
// Teacher attendance mark list
if(page==='t-attendance'){
STUDENTS.forEach((_,i)=>{ if(attState[i]===undefined) attState[i]='present'; });
renderAttList();
}
// AI tutor inline
if(page==='s-ai'){
const inp=document.getElementById('ai-input-inline');
if(inp) inp.focus();
}
}

/* ====================== QUIZ ====================== */
function openQuiz(){
quizIdx=0;quizScore=0;quizAnswered=false;
openModal('quiz-modal');
renderQuiz();
}
function renderQuiz(){
const body=document.getElementById('quiz-body');
if(quizIdx>=QUIZ_QS.length){
const pct=Math.round((quizScore/QUIZ_QS.length)*100);
body.innerHTML=`<div class="quiz-result"> <div class="quiz-score">${quizScore}<span>/${QUIZ_QS.length}</span></div> <p style="color:var(--lms-muted);font-size:.88rem;margin-top:.5rem;">${pct>=80?'🎉 Excellent work!':pct>=60?'👍 Good effort! Keep practising.':'💪 Review your notes and try again!'}</p> <p style="font-size:.8rem;margin-top:.3rem;">Score: <strong>${pct}%</strong></p> <div style="display:flex;gap:.7rem;justify-content:center;margin-top:1.3rem;"> <button class="btn-outline" onclick="closeModal('quiz-modal')">Close</button> <button class="btn-gold" onclick="openQuiz()">Try Again</button> </div></div>`;
return;
}
const q=QUIZ_QS[quizIdx];
body.innerHTML=` <div class="quiz-counter">Question ${quizIdx+1} of ${QUIZ_QS.length}</div> <div class="quiz-prog"><div class="fill" style="width:${(quizIdx/QUIZ_QS.length)*100}%;"></div></div> <div class="quiz-q">${q.q}</div> <div class="quiz-opts">${q.opts.map((o,i)=>`<div class="quiz-opt" id="qo${i}" onclick="pickOpt(${i})">${String.fromCharCode(65+i)}. ${o}</div>`).join('')}</div> <div style="display:flex;gap:.7rem;"> <button class="btn-outline" onclick="closeModal('quiz-modal')">Exit</button> <button class="btn-gold" id="q-next" onclick="nextQ()" style="display:none;">Next →</button> </div>`;
}
function pickOpt(i){
if(quizAnswered) return;
quizAnswered=true;
const q=QUIZ_QS[quizIdx];
document.querySelectorAll('.quiz-opt').forEach((el,idx)=>{
if(idx===q.ans) el.classList.add('correct');
else if(idx===i) el.classList.add('wrong');
});
if(i===q.ans) quizScore++;
document.getElementById('q-next').style.display='inline-flex';
}
function nextQ(){quizIdx++;quizAnswered=false;renderQuiz();}

/* ====================== GRADER ====================== */
function openGrader(){
const gl=document.getElementById('grader-list');
gl.innerHTML=`<div>${STUDENTS.slice(0,8).map((s,i)=>`
<div class="grader-row">
<label>${s}</label>
<input type="number" min="0" max="100" value="${60+i*4}" placeholder="/100">
<select><option>Present</option><option>Absent</option></select>
</div>`).join('')}</div>`;
openModal('grader-modal');
}
function saveGrades(){closeModal('grader-modal');toast('Grades saved successfully!');}

/* ====================== TEACHER ATTENDANCE ====================== */
function renderAttList(){
const el=document.getElementById('att-mark-list');
if(!el) return;
el.innerHTML=STUDENTS.map((s,i)=>` <div class="std-row"> <div class="std-av">${s.split(' ').map(n=>n[0]).join('').slice(0,2)}</div> <div class="std-info"><strong>${s}</strong><span>STU${String(i+1).padStart(3,'0')}</span></div> <div class="ml-auto" style="display:flex;gap:.4rem;"> <button onclick="setAtt(${i},'present')" style="padding:4px 12px;border-radius:999px;font-size:.7rem;font-weight:700;cursor:pointer;border:1.5px solid;transition:all .2s;${attState[i]==='present'?'background:#22c55e;color:#fff;border-color:#22c55e;':'background:transparent;color:var(--lms-muted);border-color:var(--lms-border);'}">P</button> <button onclick="setAtt(${i},'absent')" style="padding:4px 12px;border-radius:999px;font-size:.7rem;font-weight:700;cursor:pointer;border:1.5px solid;transition:all .2s;${attState[i]==='absent'?'background:#ef4444;color:#fff;border-color:#ef4444;':'background:transparent;color:var(--lms-muted);border-color:var(--lms-border);'}">A</button> </div> </div>`).join('');
}
function setAtt(i,v){attState[i]=v;renderAttList();}
function markAllPresent(){STUDENTS.forEach((_,i)=>{attState[i]='present';});renderAttList();toast('All students marked as present!');}

/* ====================== AI TUTOR ====================== */
function sendAiInline(){
const inp=document.getElementById('ai-input-inline');
const chat=document.getElementById('ai-chat-inline');
if(!inp||!chat||!inp.value.trim()) return;
const msg=inp.value.trim();
inp.value='';
chat.innerHTML+=`<div class="ai-msg user"><div class="ai-av usr">😊</div><div class="ai-bubble">${msg}</div></div>`;
chat.innerHTML+=`<div class="ai-msg ai" id="ai-typing-msg"><div class="ai-av bot">🤖</div><div class="ai-bubble"><div class="ai-typing"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div></div></div>`;
chat.scrollTop=chat.scrollHeight;
const replies=AI_REPLIES.default;
const reply=replies[Math.floor(Math.random()*replies.length)];
setTimeout(()=>{
const typing=document.getElementById('ai-typing-msg');
if(typing) typing.outerHTML=`<div class="ai-msg ai"><div class="ai-av bot">🤖</div><div class="ai-bubble">${reply}</div></div>`;
chat.scrollTop=chat.scrollHeight;
},1200);
}
function quickAsk(q){const inp=document.getElementById('ai-input-inline');if(inp){inp.value=q;sendAiInline();}}

function sendAiMsg(){
  const inp=document.getElementById('ai-input');
  const chat=document.getElementById('ai-chat');
  if(!inp||!chat||!inp.value.trim()) return;
  const msg=inp.value.trim();
  inp.value='';
  chat.innerHTML+=`<div class="ai-msg user"><div class="ai-av usr">😊</div><div class="ai-bubble">${msg}</div></div>`;
  chat.innerHTML+=`<div class="ai-msg ai" id="ai-typing-modal"><div class="ai-av bot">🤖</div><div class="ai-bubble"><div class="ai-typing"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div></div></div>`;
  chat.scrollTop=chat.scrollHeight;
  const replies=AI_REPLIES.default;
  const reply=replies[Math.floor(Math.random()*replies.length)];
  setTimeout(()=>{
    const typing=document.getElementById('ai-typing-modal');
    if(typing) typing.outerHTML=`<div class="ai-msg ai"><div class="ai-av bot">🤖</div><div class="ai-bubble">${reply}</div></div>`;
    chat.scrollTop=chat.scrollHeight;
  },1200);
}

/* ====================== KEYBOARD ====================== */
document.addEventListener('keydown',e=>{
if(e.key==='Enter'&&document.getElementById('login-section').style.display!=='none'&&!document.getElementById('lms-dashboard').classList.contains('active')) doLogin();
});

/* ====================== SITE SCRIPTS ====================== */
document.addEventListener('DOMContentLoaded',()=>{
// Year
const y=document.getElementById('year');
if(y) y.textContent=new Date().getFullYear();

// Preloader
window.addEventListener('load',()=>{
const pre=document.getElementById('preloader');
if(pre){pre.classList.add('loaded');setTimeout(()=>pre.remove(),600);}
});

// Mobile menu
const menuBtn=document.getElementById('mobile-menu');
const navLinks=document.getElementById('nav-menu');
const menuIcon=menuBtn?.querySelector('i');
if(menuBtn&&navLinks){
menuBtn.addEventListener('click',()=>{
navLinks.classList.toggle('active');
if(menuIcon){menuIcon.classList.toggle('fa-bars');menuIcon.classList.toggle('fa-times');}
});
navLinks.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{
navLinks.classList.remove('active');
if(menuIcon){menuIcon.classList.add('fa-bars');menuIcon.classList.remove('fa-times');}
}));
}

// Back to top
const btt=document.getElementById('backToTop');
if(btt){
window.addEventListener('scroll',()=>btt.classList.toggle('show',window.scrollY>300));
btt.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
}

// Mobile sidebar button show/hide based on screen
function checkMob(){
const btn=document.querySelector('.mob-sb-btn');
if(btn) btn.style.display=window.innerWidth<=900?'flex':'none';
}
checkMob();
window.addEventListener('resize',checkMob);
});

/* ====================== SUPABASE SETUP ====================== */
let supabase = null;

// Failsafe: Check if the library loaded from index.html successfully
if (window.supabase) {
  const supabaseUrl = 'https://ilxzzmsqtzvjvkkdqhbe.supabase.co';
  const supabaseKey = 'Sb_publishable_bBJ3GmOkhM-tAbLDapMWkQ_LtOBzvF5';
  supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
  console.log("Supabase connected!");
} else {
  console.error("Supabase library not found! Check your index.html script tag.");
}

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
    "Great question! Let me explain that for you.",
    "That's a common topic! I recommend reviewing your class notes first.",
    "Focus on understanding why the rule works, not just memorising it.",
  ]
};

const RESOURCES = [
  {name:'Mathematics Textbook – Term 2',type:'PDF',size:'4.2 MB',color:'#fee2e2',icon:'📕',iconColor:'#b91c1c'},
  {name:'Science Lab Manual',type:'PDF',size:'3.1 MB',color:'#dcfce7',icon:'📗',iconColor:'#15803d'},
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
  if(!USERS[id]||PASSWORDS[id]!==pw){showErr('Invalid ID or password.');return;}
  if(USERS[id].role!==currentRole){showErr(`Please select the correct role.`);return;}
  
  currentUser = USERS[id];
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching Data…';

  // Fetch live assignments safely
  if (supabase) {
    const { data, error } = await supabase.from('assignments').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      ASSIGNMENTS = data.map(item => ({
        id: item.id,
        title: item.title,
        subject: item.subject,
        desc: item.description, 
        due: item.due,
        status: item.status || 'open', // Safe fallback
        color: item.color || 'blue',
        type: item.assignment_type || 'standard',
        content: item.content
      }));
    } else {
      console.error("Database fetch failed", error);
    }
  }

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
      <p>You have ${ASSIGNMENTS.filter(a=>a.status==='pending').length} pending assignments.</p>
    </div>
    <div class="wb-icon"><i class="fas fa-star"></i></div>
  </div>
  <div class="stats-row">
    <div class="sc gold"><div class="sc-icon gold"><i class="fas fa-book"></i></div><div class="sc-info"><label>Subjects</label><div class="val">8</div><div class="sub">This term</div></div></div>
    <div class="sc green"><div class="sc-icon green"><i class="fas fa-tasks"></i></div><div class="sc-info"><label>Pending</label><div class="val">${ASSIGNMENTS.filter(a=>a.status==='pending').length}</div><div class="sub">Assignments</div></div></div>
    <div class="sc blue"><div class="sc-icon blue"><i class="fas fa-chart-bar"></i></div><div class="sc-info"><label>Avg Grade</label><div class="val">78%</div><div class="sub">All subjects</div></div></div>
  </div>
  <div class="panel">
    <div class="panel-head"><h3>Upcoming Assignments</h3><button class="ph-action" onclick="showPage('s-assignments',null)">See all →</button></div>
    <table class="lms-tbl"><thead><tr><th>Subject</th><th>Task</th><th>Due</th><th>Status</th></tr></thead>
    <tbody>
      ${ASSIGNMENTS.slice(0,4).map(a => {
        const stat = a.status || 'open';
        const badgeColor = stat==='pending' ? 'red' : stat==='draft' ? 'gold' : 'green';
        return `<tr><td>${a.subject}</td><td>${a.title}</td><td>${a.due}</td><td><span class="chip ${badgeColor}">${stat.charAt(0).toUpperCase() + stat.slice(1)}</span></td></tr>`;
      }).join('')}
    </tbody></table>
  </div>`,

/* ---- STUDENT SUBJECTS ---- */
's-subjects':()=>`
  <h2 style="font-family:'Poppins',sans-serif;font-size:1.05rem;color:var(--primary);margin-bottom:1.2rem;">My Subjects</h2>
  <div class="cards-grid">
    ${SUBJECTS.map(s=>`
      <div class="asgn-card" style="border-top-color:${s.color==='gold'?'var(--accent)':s.color==='blue'?'#3b82f6':s.color==='green'?'#22c55e':'#8b5cf6'};">
        <div style="font-size:1.5rem;margin-bottom:.5rem;">${s.emoji}</div>
        <h4>${s.name}</h4><p>👤 ${s.teacher}</p>
        <div style="margin-bottom:.8rem;">
          <div style="display:flex;justify-content:space-between;font-size:.75rem;color:var(--lms-muted);margin-bottom:.3rem;"><span>Progress</span><span>${s.progress}%</span></div>
          <div class="prog-bar"><div class="fill" style="width:${s.progress}%;"></div></div>
        </div>
      </div>`).join('')}
  </div>`,

/* ---- STUDENT ASSIGNMENTS ---- */
's-assignments':()=>`
  <h2 style="font-family:'Poppins',sans-serif;font-size:1.05rem;color:var(--primary);margin-bottom:1.2rem;">Assignments</h2>
  <div class="cards-grid">
    ${ASSIGNMENTS.map(a=>{
      const stat = a.status || 'open';
      const chips = {pending:'<span class="chip red">Pending</span>',draft:'<span class="chip gold">Draft</span>',submitted:'<span class="chip green">Submitted</span>', open:'<span class="chip blue">Open</span>'};
      const currentStatus = chips[stat] || `<span class="chip grey">${stat}</span>`;
      return `<div class="asgn-card">
        <h4>${a.title}</h4>
        <p><strong>${a.subject}</strong> — ${a.desc}</p>
        <div class="asgn-meta">
          <span class="asgn-due"><i class="fas fa-calendar-day"></i> ${a.due}</span>
          <div style="display:flex;gap:.4rem;align-items:center;">
             ${currentStatus}
             ${(stat==='pending' || stat==='open') && a.type==='mcq' ? `<button class="btn-gold" onclick="toast('Starting Quiz!')">Start Quiz</button>` : ''}
             ${(stat==='pending' || stat==='open') && a.type!=='mcq' ? `<button class="btn-gold" onclick="toast('Submitted!')">Submit</button>` : ''}
          </div>
        </div>
      </div>`;
    }).join('')}
  </div>`,

/* ---- STUDENT GRADES ---- */
's-grades':()=>`
  <div class="panel">
    <div class="panel-head"><h3>Term 2 Results</h3></div>
    <table class="lms-tbl"><thead><tr><th>Subject</th><th>Class Score</th><th>Exam Score</th><th>Total</th><th>Grade</th><th>Remark</th></tr></thead>
    <tbody>${GRADES.map(g=>`
      <tr><td><strong>${g.subject}</strong></td><td>${g.classScore}</td><td>${g.examScore}</td><td><strong>${g.total}/100</strong></td>
      <td><span class="grade-${g.grade}">${g.grade}</span></td>
      <td><span class="chip ${g.remark==='Excellent'?'green':g.remark==='Good'?'blue':'gold'}">${g.remark}</span></td></tr>`).join('')}
    </tbody></table>
  </div>`,

/* ---- STUDENT TIMETABLE ---- */
's-timetable':()=>`
  <div class="panel">
    <div class="panel-head"><h3>Weekly Timetable</h3></div>
    <div class="tt-wrap"><div class="tt-grid">
        <div class="tt-head">Time</div><div class="tt-head">Mon</div><div class="tt-head">Tue</div><div class="tt-head">Wed</div><div class="tt-head">Thu</div><div class="tt-head">Fri</div>
        <div class="tt-cell" style="font-size:.62rem;color:var(--lms-muted);">7:30–8:20</div>
        <div class="tt-cell filled-gold">Maths</div><div class="tt-cell filled-blue">English</div><div class="tt-cell filled-green">Science</div><div class="tt-cell filled-gold">Maths</div><div class="tt-cell filled-purple">French</div>
    </div></div>
  </div>`,

/* ---- STUDENT EXTRAS ---- */
's-quiz':()=>`<div class="panel"><div class="panel-head"><h3>Quizzes</h3></div><div style="padding:1rem;">Your upcoming quizzes will appear here.</div></div>`,
's-attendance':()=>`<div class="panel"><div class="panel-head"><h3>Attendance</h3></div><div id="att-calendar" style="padding:1rem;"></div></div>`,
's-resources':()=>`<div class="panel"><div class="panel-head"><h3>Study Resources</h3></div><div style="padding:1rem;">Resources shared by your teachers will appear here.</div></div>`,
's-ai':()=>`<div class="panel"><div class="panel-head"><h3>AI Tutor</h3></div><div style="padding:1rem;">Click the bot icon above to chat with your AI Tutor!</div></div>`,
's-notices':()=>`<div class="panel"><div class="panel-head"><h3>School Notices</h3></div><div style="padding:1rem;">No new notices today.</div></div>`,

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
  </div>
  <div class="two-col">
    <div class="panel">
      <div class="panel-head"><h3>Recent Assignments</h3><button class="ph-action" onclick="showPage('t-assignments',null)">Manage →</button></div>
      <table class="lms-tbl"><thead><tr><th>Task</th><th>Subject</th><th>Action</th></tr></thead>
      <tbody>
        ${ASSIGNMENTS.slice(0,4).map(a => `
        <tr><td>${a.title}</td><td>${a.subject}</td><td><button class="btn-gold" style="font-size:.75rem;padding:.4rem .8rem;" onclick="openGrader()">Mark</button></td></tr>
        `).join('')}
      </tbody></table>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Quick Attendance</h3><button class="ph-action" onclick="showPage('t-attendance',null)">Full View →</button></div>
      <div id="t-quick-att"></div>
    </div>
  </div>`,

/* ---- TEACHER CLASS ---- */
't-class':()=>`
  <div class="panel">
    <div class="panel-head"><h3>34 Students Enrolled</h3></div>
    ${STUDENTS.map((s,i)=>`
      <div class="std-row">
        <div class="std-av">${s.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
        <div class="std-info"><strong>${s}</strong><span>STU${String(i+1).padStart(3,'0')}</span></div>
      </div>`).join('')}
  </div>`,

/* ---- TEACHER ASSIGNMENTS (DYNAMIC BUILDER) ---- */
't-assignments':()=>`
  <h2 style="font-family:'Poppins',sans-serif;font-size:1.05rem;color:var(--primary);margin-bottom:1.2rem;">Manage Assignments</h2>
  
  <div class="panel" style="margin-bottom:1.3rem;">
    <div class="panel-head"><h3>Create New Assignment</h3></div>
    <div style="padding:1.2rem;display:grid;grid-template-columns:1fr 1fr;gap:.9rem;">
      <div class="lms-form-group"><label>Title</label><input type="text" id="asgn-title" placeholder="e.g. Science Revision"></div>
      <div class="lms-form-group"><label>Subject</label>
        <select id="asgn-subj">
          <option>Mathematics</option><option>English Language</option><option>Science</option><option>Social Studies</option><option>Creative Arts</option><option>ICT</option>
        </select>
      </div>
      <div class="lms-form-group"><label>Due Date</label><input type="date" id="asgn-due"></div>
      <div class="lms-form-group"><label>Format</label>
        <select id="asgn-type" onchange="toggleFormat()">
          <option value="standard">Standard Task</option>
          <option value="mcq">Multiple Choice Quiz</option>
        </select>
      </div>
      
      <div class="lms-form-group" id="fmt-standard" style="grid-column:span 2;">
        <label>Instructions</label>
        <textarea id="asgn-desc" rows="3" placeholder="Type instructions..."></textarea>
      </div>

      <div class="lms-form-group" id="fmt-mcq" style="grid-column:span 2; display:none;">
        <label>Quiz Builder</label>
        <div id="mcq-list" style="display:flex;flex-direction:column;gap:.8rem;"></div>
        <button class="btn-outline" style="margin-top:.8rem;" onclick="addMcq()"><i class="fas fa-plus"></i> Add Question</button>
      </div>
    </div>
    <div style="padding:0 1.2rem 1.2rem;">
      <button class="btn-lms-primary" style="width:auto;padding:.65rem 1.6rem;" onclick="publishAssignment()" id="btn-publish"><i class="fas fa-paper-plane"></i> Publish to Class</button>
    </div>
  </div>

  <div class="panel">
    <div class="panel-head"><h3>Active Assignments</h3></div>
    <table class="lms-tbl"><thead><tr><th>Title</th><th>Subject</th><th>Due</th><th>Type</th><th>Status</th></tr></thead>
    <tbody>
      ${ASSIGNMENTS.map(a => {
        const stat = a.status || 'open';
        const badgeColor = stat==='pending' ? 'red' : stat==='draft' ? 'gold' : 'green';
        return `<tr>
          <td><strong>${a.title}</strong></td><td>${a.subject}</td><td>${a.due}</td>
          <td><span class="chip grey">${a.type === 'mcq' ? 'Quiz' : 'Task'}</span></td>
          <td><span class="chip ${badgeColor}">${stat.charAt(0).toUpperCase() + stat.slice(1)}</span></td>
        </tr>`;
      }).join('')}
    </tbody></table>
  </div>`,

/* ---- TEACHER GRADES ---- */
't-grades':()=>`
  <div class="panel">
    <div class="panel-head"><h3>Term 2 Results</h3><button class="ph-action" onclick="toast('Grades exported as CSV!')"><i class="fas fa-download"></i> Export CSV</button></div>
    <table class="lms-tbl"><thead><tr><th>Student</th><th>Maths</th><th>English</th><th>Science</th><th>Average</th><th>Grade</th></tr></thead>
    <tbody>${STUDENTS.slice(0,10).map((s,i)=>{
      const scores=[75+i%15,68+i%18,80+i%12];
      const avg=Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
      const g=avg>=80?'A':avg>=70?'B':avg>=60?'C':'D';
      return `<tr><td>${s}</td>${scores.map(sc=>`<td>${sc}%</td>`).join('')}<td><strong>${avg}%</strong></td><td><span class="grade-${g}">${g}</span></td></tr>`;
    }).join('')}</tbody></table>
  </div>`,

/* ---- TEACHER ATTENDANCE ---- */
't-attendance':()=>`
  <div class="panel">
    <div class="panel-head"><h3>${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</h3><button class="ph-action" onclick="markAllPresent()">✅ Mark All Present</button></div>
    <div id="att-mark-list"></div>
    <div style="padding:1rem 1.3rem;border-top:1px solid var(--lms-border);">
      <button class="btn-lms-primary" style="width:auto;padding:.65rem 1.6rem;" onclick="toast('Attendance saved successfully!')"><i class="fas fa-save"></i> Save Attendance</button>
    </div>
  </div>`,

/* ---- TEACHER NOTICES ---- */
't-notices':()=>`
  <div class="panel" style="max-width:600px;">
    <div class="panel-head"><h3>New Notice</h3></div>
    <div style="padding:1.2rem;display:flex;flex-direction:column;gap:.9rem;">
      <div class="lms-form-group"><label>Title</label><input type="text" placeholder="e.g. End-of-Term Reminder"></div>
      <div class="lms-form-group"><label>Message</label><textarea rows="5" placeholder="Type notice..."></textarea></div>
      <button class="btn-lms-primary" style="width:auto;padding:.65rem 1.6rem;" onclick="toast('Notice published successfully!')"><i class="fas fa-bullhorn"></i> Publish Notice</button>
    </div>
  </div>`,

/* ---- TEACHER EXTRAS ---- */
't-timetable':()=>`<div class="panel"><div class="panel-head"><h3>Timetable</h3></div><div style="padding:1rem;">Your teaching schedule.</div></div>`,
't-resources':()=>`<div class="panel"><div class="panel-head"><h3>Upload Resources</h3></div><div style="padding:1rem;"><button class="btn-gold" onclick="toast('Resource uploaded!')">Upload PDF</button></div></div>`
};

/* ====================== DYNAMIC ASSIGNMENT BUILDER LOGIC ====================== */
window.toggleFormat = function() {
  const type = document.getElementById('asgn-type').value;
  document.getElementById('fmt-standard').style.display = type === 'standard' ? 'block' : 'none';
  document.getElementById('fmt-mcq').style.display = type === 'mcq' ? 'block' : 'none';
  if(type === 'mcq' && document.getElementById('mcq-list').children.length === 0) { addMcq(); }
};

let mcqCount = 0;
window.addMcq = function() {
  mcqCount++;
  const list = document.getElementById('mcq-list');
  const div = document.createElement('div');
  div.style.cssText = 'background:var(--lms-surface);padding:1.2rem;border-radius:10px;border:1px solid var(--lms-border);';
  div.innerHTML = `
    <strong style="display:block;font-size:.8rem;color:var(--primary);margin-bottom:.5rem;">Question ${mcqCount}</strong>
    <input type="text" class="mcq-q" placeholder="Question here..." style="width:100%;padding:.65rem;border:1px solid var(--lms-border);border-radius:8px;font-family:var(--font-lms);font-size:.85rem;margin-bottom:.6rem;outline:none;">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.6rem;margin-bottom:.8rem;">
      <input type="text" class="mcq-o1" placeholder="Option A" style="padding:.6rem;border:1px solid var(--lms-border);border-radius:8px;font-family:var(--font-lms);font-size:.8rem;outline:none;">
      <input type="text" class="mcq-o2" placeholder="Option B" style="padding:.6rem;border:1px solid var(--lms-border);border-radius:8px;font-family:var(--font-lms);font-size:.8rem;outline:none;">
      <input type="text" class="mcq-o3" placeholder="Option C" style="padding:.6rem;border:1px solid var(--lms-border);border-radius:8px;font-family:var(--font-lms);font-size:.8rem;outline:none;">
    </div>
    <div style="display:flex;align-items:center;gap:.6rem;font-size:.8rem;font-weight:600;color:var(--primary);">
      <label>Correct Answer:</label>
      <select class="mcq-ans" style="padding:.4rem .6rem;border:1.5px solid var(--lms-border);border-radius:8px;font-family:var(--font-lms);outline:none;">
        <option value="0">Option A</option><option value="1">Option B</option><option value="2">Option C</option>
      </select>
    </div>
  `;
  list.appendChild(div);
};

window.publishAssignment = async function() {
  const title = document.getElementById('asgn-title').value.trim();
  const subject = document.getElementById('asgn-subj').value;
  const dueRaw = document.getElementById('asgn-due').value;
  const type = document.getElementById('asgn-type').value;
  const btn = document.getElementById('btn-publish');
  
  if(!title || !dueRaw) { toast('Please fill in the Title and Due Date!'); return; }
  
  let dueFormated = dueRaw;
  try {
    const d = new Date(dueRaw);
    if(!isNaN(d)) dueFormated = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch(e){}

  let description = '';
  let contentPayload = null;

  if(type === 'standard') {
    description = document.getElementById('asgn-desc').value.trim();
  } else {
    description = 'Multiple Choice Quiz Assessment';
    const blocks = document.getElementById('mcq-list').children;
    const questions = [];
    Array.from(blocks).forEach(block => {
      const qText = block.querySelector('.mcq-q').value.trim();
      const o1 = block.querySelector('.mcq-o1').value.trim();
      const o2 = block.querySelector('.mcq-o2').value.trim();
      const o3 = block.querySelector('.mcq-o3').value.trim();
      const ans = parseInt(block.querySelector('.mcq-ans').value);
      if(qText && o1 && o2) questions.push({ question: qText, options: [o1, o2, o3], answerIndex: ans });
    });
    if(questions.length === 0) { toast('Please add at least one complete question.'); return; }
    contentPayload = questions;
  }

  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  const newAssignmentData = {
    title: title, subject: subject, description: description,
    due: dueFormated, status: 'open', color: 'blue', 
    assignment_type: type, content: contentPayload
  };

  if(supabase) {
    const { data, error } = await supabase.from('assignments').insert([newAssignmentData]).select();
    if(error) {
      console.error(error); toast('Failed to save.');
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> Publish to Class'; return;
    }
    ASSIGNMENTS.unshift({
      id: data[0].id, title: data[0].title, subject: data[0].subject,
      desc: data[0].description, due: data[0].due, status: data[0].status,
      color: data[0].color, type: data[0].assignment_type, content: data[0].content
    });
  }

  toast('Assignment successfully published!');
  renderPage('t-assignments');
};

/* ====================== AFTER RENDER HOOKS ====================== */
function afterRender(page){
  if(page==='s-attendance'){
    const dots=document.getElementById('att-calendar');
    if(dots){const types=['p','p','p','p','h','p','p','a','p','p','p','p','p','a','p','p','p','p','p'];dots.innerHTML=types.map(t=>`<div class="att-dot ${t}"></div>`).join('');}
  }
  if(page==='t-dashboard'){
    const el=document.getElementById('t-quick-att');
    if(el){el.innerHTML=STUDENTS.slice(0,5).map((s,i)=>` <div class="std-row"><div class="std-av">${s.split(' ').map(n=>n[0]).join('').slice(0,2)}</div> <div class="std-info"><strong>${s}</strong><span>STU${String(i+1).padStart(3,'0')}</span></div> <div class="ml-auto"><span class="chip ${i===2?'red':'green'}">${i===2?'Absent':'Present'}</span></div></div>`).join('');}
  }
  if(page==='t-attendance'){
    STUDENTS.forEach((_,i)=>{ if(attState[i]===undefined) attState[i]='present'; });
    renderAttList();
  }
}

window.openGrader = function(){
  const gl=document.getElementById('grader-list');
  gl.innerHTML=`<div>${STUDENTS.slice(0,8).map((s,i)=>`<div class="grader-row"><label>${s}</label><input type="number" min="0" max="100" value="${60+i*4}"><select><option>Present</option><option>Absent</option></select></div>`).join('')}</div>`;
  openModal('grader-modal');
};
window.saveGrades = function(){closeModal('grader-modal');toast('Grades saved!');};

function renderAttList(){
  const el=document.getElementById('att-mark-list');
  if(!el) return;
  el.innerHTML=STUDENTS.map((s,i)=>` <div class="std-row"> <div class="std-av">${s.split(' ').map(n=>n[0]).join('').slice(0,2)}</div> <div class="std-info"><strong>${s}</strong><span>STU${String(i+1).padStart(3,'0')}</span></div> <div class="ml-auto" style="display:flex;gap:.4rem;"> <button onclick="setAtt(${i},'present')" style="padding:4px 12px;border-radius:999px;font-size:.7rem;font-weight:700;cursor:pointer;border:1.5px solid;transition:all .2s;${attState[i]==='present'?'background:#22c55e;color:#fff;border-color:#22c55e;':'background:transparent;color:var(--lms-muted);border-color:var(--lms-border);'}">P</button> <button onclick="setAtt(${i},'absent')" style="padding:4px 12px;border-radius:999px;font-size:.7rem;font-weight:700;cursor:pointer;border:1.5px solid;transition:all .2s;${attState[i]==='absent'?'background:#ef4444;color:#fff;border-color:#ef4444;':'background:transparent;color:var(--lms-muted);border-color:var(--lms-border);'}">A</button> </div> </div>`).join('');
}
window.setAtt = function(i,v){attState[i]=v;renderAttList();};
window.markAllPresent = function(){STUDENTS.forEach((_,i)=>{attState[i]='present';});renderAttList();toast('All marked present!');};

// AI Modal logic
function sendAiMsg(){
  const inp=document.getElementById('ai-input'); const chat=document.getElementById('ai-chat');
  if(!inp||!chat||!inp.value.trim()) return;
  chat.innerHTML+=`<div class="ai-msg user"><div class="ai-bubble">${inp.value.trim()}</div></div>`;
  inp.value='';
  setTimeout(()=>{ chat.innerHTML+=`<div class="ai-msg ai"><div class="ai-bubble">That's a great question! I am reviewing your notes to help you.</div></div>`; chat.scrollTop=chat.scrollHeight; }, 1000);
}

// App init
document.addEventListener('DOMContentLoaded',()=>{
  const y=document.getElementById('year');
  if(y) y.textContent=new Date().getFullYear();
});

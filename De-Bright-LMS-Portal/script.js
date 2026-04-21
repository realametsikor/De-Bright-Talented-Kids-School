/* ====================== SUPABASE SETUP ====================== */
let supabaseClient = null;

if (window.supabase) {
  const supabaseUrl = 'https://ilxzzmsqtzvjvkkdqhbe.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlseHp6bXNxdHp2anZra2RxaGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDgwMjYsImV4cCI6MjA5MjE4NDAyNn0.l4zkNBGopLdE8Wt3KMHnfxySHwFHyEoto8txBgh4wMY';
  supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
} else {
  console.error("CRITICAL: Supabase library failed to load from the CDN.");
}

/* ====================== STATIC DATA ====================== */
const SCHOOL_CLASSES = ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6', 'JHS 1', 'JHS 2', 'JHS 3'];

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
let STUDENTS_DB = [], REPORT_CARDS = []; 
let attState = {};

/* ====================== DYNAMIC LOGIN & PERSISTENCE ====================== */
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

  let fetchedUser = null;

  try {
    if (currentRole === 'teacher') {
      if (idInput === 'TCH001' && pwInput === 'teacher123') {
        fetchedUser = { role: 'teacher', name: 'Abena Boateng', initials: 'AB', class: 'Primary 6', id: 'TCH001' };
      } else { showErr('Invalid teacher credentials.'); btnText.innerHTML = '<i class="fas fa-sign-in-alt"></i> Log In'; return; }
    } else {
      if (!supabaseClient) throw new Error("Supabase not initialized");
      const { data, error } = await supabaseClient.from('students').select('*').eq('id', idInput).single();
      
      if (error || !data) { showErr('Student ID not found.'); btnText.innerHTML = '<i class="fas fa-sign-in-alt"></i> Log In'; return; }
      if (pwInput !== 'student123') { showErr('Incorrect password.'); btnText.innerHTML = '<i class="fas fa-sign-in-alt"></i> Log In'; return; }

      fetchedUser = { role: 'student', name: data.name, initials: getInitials(data.name), class: data.class, id: data.id };
    }

    if (fetchedUser) {
      currentUser = fetchedUser;
      localStorage.setItem('lms_user', JSON.stringify(currentUser)); // SAVE LOGIN STATE
      await fetchAllData();
      
      btnText.innerHTML = '<i class="fas fa-check-circle"></i> Welcome!';
      setTimeout(()=>{
        btnText.innerHTML = '<i class="fas fa-sign-in-alt"></i> Log In';
        launchPortal();
      }, 600);
    }
  } catch (error) {
    console.error("Login Error:", error);
    showErr(`System Error: ${error.message || 'Check console for details'}`); 
    btnText.innerHTML = '<i class="fas fa-sign-in-alt"></i> Log In';
  }
};

function launchPortal() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('lms-dashboard').classList.add('active');
  document.querySelector('.navbar').style.display = 'none';
  document.querySelector('footer').style.display = 'none';
  const wa = document.querySelector('.whatsapp-btn'); if(wa) wa.style.display = 'none';
  const btt = document.getElementById('backToTop'); if(btt) btt.style.display = 'none';
  buildDashboard();
}

async function fetchAllData(){
  if(!supabaseClient) return;
  try {
    const [asgn, subs, stdRes, repRes] = await Promise.all([
      supabaseClient.from('assignments').select('*').order('created_at',{ascending:false}),
      supabaseClient.from('submissions').select('*').order('created_at',{ascending:false}),
      supabaseClient.from('students').select('*').order('name',{ascending:true}), 
      supabaseClient.from('report_cards').select('*').order('date',{ascending:false}) 
    ]);
    if(asgn.data) ASSIGNMENTS = asgn.data.map(mapAssignment);
    if(subs.data) SUBMISSIONS = subs.data;
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
  localStorage.removeItem('lms_user'); // CLEAR LOGIN STATE
  document.getElementById('lms-dashboard').classList.remove('active');
  document.getElementById('login-section').style.display='';
  document.querySelector('.navbar').style.display='';
  document.querySelector('footer').style.display='';
  const wa = document.querySelector('.whatsapp-btn'); if(wa) wa.style.display='';
  const btt = document.getElementById('backToTop'); if(btt) btt.style.display='';
  document.getElementById('login-id').value=''; document.getElementById('login-pass').value='';
  currentUser=null; window.scrollTo({top:0,behavior:'smooth'});
}

/* ====================== DASHBOARD BUILDER ====================== */
function buildDashboard(){
  const u = currentUser;
  document.getElementById('sb-avatar').textContent = u.initials;
  document.getElementById('sb-name').textContent = u.name;
  document.getElementById('sb-sub').textContent = u.role==='student'?`Class ${u.class} · ${u.id}`:`Teacher · ${u.class}`;
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
      {icon:'folder-open',label:'Resources',page:'s-resources'},
      {icon:'robot',label:'AI Tutor',page:'s-ai'},
      {icon:'bullhorn',label:'Notices',page:'s-notices'},
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
      {icon:'folder-open',label:'Resources',page:'t-resources'},
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
  document.getElementById('topbar-title').textContent = titles[page]||page.replace('s-','').replace('t-','').replace(/-/g, ' ').toUpperCase();
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
function renderProgressBar(pct, color = '') { return `<div class="prog-bar" style="background:#e2e8f0;border-radius:99px;height:8px;overflow:hidden;width:100%;"><div class="fill" style="height:100%;width:${pct}%;background:${color||'var(--primary)'};border-radius:99px;transition:width 1s ease;"></div></div>`; }
function fmtDate(d){try{return new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});}catch(e){return d;}}

/* ====================== MODERN UI PAGE DEFINITIONS ====================== */
const pages = {

's-dashboard':()=>`
    <div class="welcome-banner" style="background: linear-gradient(135deg, var(--primary), var(--accent)); border-radius: 16px; padding: 2rem; color: white; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 10px 20px rgba(0,0,0,0.1); margin-bottom: 2rem;">
      <div class="wb-text">
        <div class="wb-tag" style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 99px; font-size: 0.8rem; font-weight: 600; display: inline-block; margin-bottom: 0.8rem;">📚 Term 2 — 2025/26</div>
        <h2 style="font-size: 1.8rem; margin: 0; font-family: var(--font-lms-heading);">Welcome back, ${currentUser.name.split(' ')[0]}! 👋</h2>
        <p style="margin-top: 0.5rem; opacity: 0.9; font-size: 0.9rem;">You have ${ASSIGNMENTS.filter(a=>a.status==='open').length} assignments due this week.</p>
      </div>
      <div class="wb-icon" style="font-size: 4rem; opacity: 0.8;"><i class="fas fa-graduation-cap"></i></div>
    </div>
    <div class="stats-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem;">
      <div class="sc" style="background: #fff; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); display: flex; align-items: center; gap: 1rem; border-left: 4px solid var(--lms-blue);">
        <div class="sc-icon" style="width: 48px; height: 48px; background: #eff6ff; color: var(--lms-blue); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;"><i class="fas fa-chart-line"></i></div>
        <div class="sc-info"><label style="font-size: 0.8rem; color: var(--lms-muted); text-transform: uppercase; letter-spacing: 0.5px;">Avg Grade</label><div style="font-size: 1.5rem; font-weight: 700; color: var(--text);">83%</div></div>
      </div>
      <div class="sc" style="background: #fff; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); display: flex; align-items: center; gap: 1rem; border-left: 4px solid var(--lms-green);">
        <div class="sc-icon" style="width: 48px; height: 48px; background: #f0fdf4; color: var(--lms-green); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;"><i class="fas fa-check-circle"></i></div>
        <div class="sc-info"><label style="font-size: 0.8rem; color: var(--lms-muted); text-transform: uppercase; letter-spacing: 0.5px;">Attendance</label><div style="font-size: 1.5rem; font-weight: 700; color: var(--text);">98%</div></div>
      </div>
    </div>`,

's-subjects':()=>`
  <div class="page-header" style="margin-bottom: 2rem;"><h2>My Subjects</h2><span style="color:var(--lms-muted);">Overview of your active courses</span></div>
  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem;">
    ${SUBJECTS.map(s => `
      <div style="background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.04); transition: transform 0.2s ease; cursor: pointer;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
        <div style="height: 60px; background: var(--lms-${s.color}-pale); display: flex; align-items: center; padding: 0 1.5rem; font-size: 1.5rem;">${s.emoji}</div>
        <div style="padding: 1.5rem;">
          <h3 style="margin: 0 0 0.2rem 0; font-size: 1.1rem; color: var(--text);">${s.name}</h3>
          <p style="margin: 0 0 1rem 0; font-size: 0.85rem; color: var(--lms-muted);"><i class="fas fa-chalkboard-teacher"></i> ${s.teacher}</p>
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 0.4rem; font-weight: 600;"><span>Progress</span><span>${s.progress}%</span></div>
          ${renderProgressBar(s.progress, `var(--lms-${s.color})`)}
        </div>
      </div>
    `).join('')}
  </div>`,

's-timetable':()=>`
  <div class="page-header" style="margin-bottom: 2rem;"><h2>Class Timetable</h2><span style="color:var(--lms-muted);">Term 2 Schedule</span></div>
  <div class="panel" style="border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); overflow: hidden;">
    <div style="overflow-x: auto;">
      <table class="lms-tbl" style="width: 100%; min-width: 700px; text-align: center;">
        <thead style="background: var(--lms-surface);">
          <tr><th style="padding: 1rem;">Time</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th></tr>
        </thead>
        <tbody>
          ${TT_TIMES.map((time, i) => `
            <tr style="border-bottom: 1px solid var(--lms-border);">
              <td style="padding: 1rem; font-weight: 600; color: var(--primary); white-space: nowrap;">${time}</td>
              ${['Mon','Tue','Wed','Thu','Fri'].map((day, j) => {
                const sub = TIMETABLE[i]?.[j] || '-';
                const colorClass = TT_COLORS[sub] || 'grey';
                if(sub === 'LUNCH' || sub === 'BREAK') {
                  if(j===0) return `<td colspan="5" style="background: var(--lms-surface); letter-spacing: 4px; font-weight: 700; color: var(--lms-muted);">${sub}</td>`;
                  return '';
                }
                return `<td style="padding: 0.5rem;"><span class="chip ${colorClass}" style="display: inline-block; width: 100%; padding: 0.6rem; border-radius: 8px;">${sub}</span></td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>`,

's-assignments': () => {
  const pending = ASSIGNMENTS.filter(a => a.status === 'open' || a.status === 'pending').length;
  return `
  <div class="page-header" style="margin-bottom: 2rem;">
    <h2>Assignments</h2>
    <span style="color:var(--lms-muted);"><strong style="color:var(--lms-red);">${pending}</strong> pending tasks</span>
  </div>
  <div style="display: flex; flex-direction: column; gap: 1rem;">
    ${ASSIGNMENTS.length === 0 ? '<div class="empty-state" style="padding:4rem;background:#fff;border-radius:12px;text-align:center;"><i class="fas fa-check-circle" style="font-size:3rem;color:var(--lms-green);margin-bottom:1rem;"></i><p>You are all caught up!</p></div>' : 
      ASSIGNMENTS.map(a => `
        <div style="background: #fff; padding: 1.5rem; border-radius: 12px; border-left: 5px solid var(--lms-${a.color || 'blue'}); box-shadow: 0 4px 15px rgba(0,0,0,0.03); display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; align-items: center; transition: all 0.2s ease;" onmouseover="this.style.boxShadow='0 8px 25px rgba(0,0,0,0.08)'" onmouseout="this.style.boxShadow='0 4px 15px rgba(0,0,0,0.03)'">
          <div style="flex: 1; min-width: 250px;">
              <div style="display: flex; gap: 0.8rem; align-items: center; margin-bottom: 0.6rem;">
                <span class="chip ${a.color || 'blue'}">${a.subject}</span>
                <span style="font-size: 0.75rem; color: var(--lms-muted); font-weight: 600; text-transform: uppercase;"><i class="fas fa-clock"></i> Due: ${fmtDate(a.due) || 'No date'}</span>
              </div>
              <strong style="font-size: 1.15rem; color: var(--text); display: block; margin-bottom: 0.4rem;">${a.title}</strong>
              <p style="font-size: 0.9rem; color: #64748b; margin: 0; line-height: 1.5;">${a.desc || 'No description provided.'}</p>
          </div>
          <div>
            <button class="btn-lms-primary" style="padding: 0.6rem 1.5rem; border-radius: 8px; box-shadow: 0 4px 10px rgba(13, 59, 102, 0.2);" onclick="openModal('submit-modal')"><i class="fas fa-cloud-upload-alt"></i> Submit Work</button>
          </div>
        </div>
      `).join('')
    }
  </div>`
},

't-dashboard':()=>`
  <div class="welcome-banner" style="background: linear-gradient(135deg, #0f172a, var(--primary)); border-radius: 16px; padding: 2rem; color: white; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 10px 20px rgba(0,0,0,0.15); margin-bottom: 2rem;">
    <div class="wb-text">
      <div class="wb-tag" style="background: rgba(255,255,255,0.15); padding: 4px 12px; border-radius: 99px; font-size: 0.8rem; font-weight: 600; display: inline-block; margin-bottom: 0.8rem;">📋 Class Teacher — ${currentUser.class}</div>
      <h2 style="font-size: 1.8rem; margin: 0; font-family: var(--font-lms-heading);">Good day, ${currentUser.name.split(' ')[1]||currentUser.name}! 👩‍🏫</h2>
      <p style="margin-top: 0.5rem; opacity: 0.9; font-size: 0.9rem;">Your class has 3 new submissions awaiting grading.</p>
    </div>
    <div class="wb-icon" style="font-size: 4rem; opacity: 0.8;"><i class="fas fa-chalkboard-teacher"></i></div>
  </div>
  <div class="stats-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
    <div class="sc" style="background: #fff; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); display: flex; align-items: center; gap: 1rem; border-left: 4px solid var(--lms-gold);">
      <div class="sc-icon" style="width: 48px; height: 48px; background: #fef9c3; color: #a16207; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;"><i class="fas fa-users"></i></div>
      <div class="sc-info"><label style="font-size: 0.8rem; color: var(--lms-muted); text-transform: uppercase;">Students</label><div style="font-size: 1.5rem; font-weight: 700; color: var(--text);">${STUDENTS_DB.filter(s=>s.class===currentUser.class).length}</div></div>
    </div>
    <div class="sc" style="background: #fff; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); display: flex; align-items: center; gap: 1rem; border-left: 4px solid var(--lms-blue);">
      <div class="sc-icon" style="width: 48px; height: 48px; background: #eff6ff; color: var(--lms-blue); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;"><i class="fas fa-tasks"></i></div>
      <div class="sc-info"><label style="font-size: 0.8rem; color: var(--lms-muted); text-transform: uppercase;">Assignments</label><div style="font-size: 1.5rem; font-weight: 700; color: var(--text);">${ASSIGNMENTS.length}</div></div>
    </div>
    <div class="sc" style="background: #fff; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); display: flex; align-items: center; gap: 1rem; border-left: 4px solid var(--lms-red);">
      <div class="sc-icon" style="width: 48px; height: 48px; background: #fef2f2; color: var(--lms-red); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;"><i class="fas fa-inbox"></i></div>
      <div class="sc-info"><label style="font-size: 0.8rem; color: var(--lms-muted); text-transform: uppercase;">To Grade</label><div style="font-size: 1.5rem; font-weight: 700; color: var(--text);">3</div></div>
    </div>
  </div>`,

't-assignments': () => `
  <div class="page-header" style="margin-bottom: 2rem; display:flex; justify-content:space-between; align-items:center;">
    <div>
      <h2>Assignments</h2>
      <span style="color:var(--lms-muted);">${ASSIGNMENTS.length} published assignments</span>
    </div>
    <button class="btn-lms-primary" style="padding: 0.6rem 1.2rem; border-radius: 8px; box-shadow: 0 4px 10px rgba(13, 59, 102, 0.2);" onclick="openAssignmentModal()"><i class="fas fa-plus"></i> Create New</button>
  </div>
  <div style="display: flex; flex-direction: column; gap: 1rem;">
    ${ASSIGNMENTS.length === 0 ? '<div class="empty-state" style="padding:4rem;background:#fff;border-radius:12px;text-align:center;"><p>No assignments published yet.</p></div>' : 
      ASSIGNMENTS.map(a => `
        <div style="background: #fff; padding: 1.5rem; border-radius: 12px; border-left: 5px solid var(--lms-${a.color || 'blue'}); box-shadow: 0 4px 15px rgba(0,0,0,0.03); display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; align-items: center;">
          <div style="flex: 1; min-width: 250px;">
              <div style="display: flex; gap: 0.8rem; align-items: center; margin-bottom: 0.6rem;">
                <span class="chip ${a.color || 'blue'}">${a.subject}</span>
                <span style="font-size: 0.75rem; color: var(--lms-muted); font-weight: 600; text-transform: uppercase;"><i class="fas fa-clock"></i> Due: ${fmtDate(a.due) || 'No date'}</span>
              </div>
              <strong style="font-size: 1.15rem; color: var(--text); display: block; margin-bottom: 0.4rem;">${a.title}</strong>
              <p style="font-size: 0.9rem; color: #64748b; margin: 0; line-height: 1.5;">${a.desc || 'No description provided.'}</p>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn-outline" style="padding: 0.5rem 1rem; border-radius: 8px;" onclick="openAssignmentModal('${a.id}')"><i class="fas fa-edit"></i> Edit</button>
            <button class="btn-danger" style="padding: 0.5rem 1rem; border-radius: 8px;" onclick="deleteAssignment('${a.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      `).join('')
    }
  </div>`,

's-grades':()=>{
  const myReports = REPORT_CARDS.filter(r => r.student_id === currentUser.id);
  return `
  <div class="page-header" style="margin-bottom: 2rem;"><h2>Grades & Reports</h2><span style="color:var(--lms-muted);">Term 2 · 2025/26</span></div>
  <div class="panel" style="border: 2px solid var(--accent); border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); overflow: hidden; margin-bottom: 2rem;">
    <div class="panel-head" style="background:var(--lms-gold-pale); padding: 1.2rem 1.5rem; border-bottom: 1px solid var(--lms-border);">
      <h3 style="margin:0; color: var(--accent);"><i class="fas fa-scroll"></i> Official End of Term Reports</h3>
    </div>
    <div style="padding:1.5rem;">
      ${myReports.length === 0 ? `<p style="font-size:.9rem;color:var(--lms-muted);margin:0;">No reports have been published for you yet.</p>` : `
      <div style="display:flex;flex-direction:column;gap:1rem;">
        ${myReports.map(rep => `
          <div style="display:flex;align-items:center;justify-content:space-between;background:#f8fafc;padding:1rem 1.5rem;border-radius:10px;border:1px solid var(--lms-border);">
            <div>
              <strong style="color:var(--primary);display:block;font-size:1.05rem;">${rep.term} Report Card</strong>
              <span style="font-size:.8rem;color:var(--lms-muted);">Published on: ${fmtDate(rep.date)}</span>
            </div>
            <button class="btn-lms-primary" style="width:auto;padding:.5rem 1.2rem;border-radius:8px;" onclick="viewReportCard('${rep.id}')"><i class="fas fa-file-pdf"></i> View / Download</button>
          </div>
        `).join('')}
      </div>
      `}
    </div>
  </div>
  <div class="panel" style="border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); overflow: hidden;">
    <div class="panel-head" style="padding: 1.2rem 1.5rem; border-bottom: 1px solid var(--lms-border);">
      <h3 style="margin:0;">Current Continuous Assessment</h3>
    </div>
    <div style="overflow-x: auto;">
      <table class="lms-tbl" style="width: 100%; min-width: 600px;">
        <thead style="background: var(--lms-surface);">
          <tr><th style="padding: 1rem; text-align:left;">Subject</th><th>Class Score</th><th>Exam Score</th><th>Total</th><th>Grade</th></tr>
        </thead>
        <tbody>${GRADES.map(g=>`
          <tr style="border-bottom: 1px solid var(--lms-border);">
            <td style="padding: 1rem;"><strong>${g.subject}</strong></td>
            <td style="text-align:center;">${g.classScore}</td>
            <td style="text-align:center;">${g.examScore}</td>
            <td style="text-align:center;"><strong>${g.total}/100</strong></td>
            <td style="text-align:center;"><span class="grade-${g.grade}" style="font-weight:bold; padding: 4px 12px; border-radius: 6px; background: var(--lms-surface);">${g.grade}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`
},

't-class':()=>{
  const myClass = STUDENTS_DB.filter(s => s.class === currentUser.class);
  return `
  <div class="page-header" style="margin-bottom: 2rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
    <div>
      <h2>Manage My Class</h2>
      <span style="color:var(--lms-muted);">${myClass.length} students currently enrolled in ${currentUser.class}</span>
    </div>
    <button class="btn-lms-primary" style="padding:.6rem 1.2rem; border-radius:8px; box-shadow: 0 4px 10px rgba(13,59,102,0.2);" onclick="openModal('add-student-modal')"><i class="fas fa-user-plus"></i> Add Student</button>
  </div>
  <div class="panel" style="border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); overflow: hidden;">
    <div class="panel-head" style="padding: 1.2rem 1.5rem; border-bottom: 1px solid var(--lms-border); display:flex; justify-content:space-between; align-items:center;">
      <h3 style="margin:0;">Class Roster</h3>
      <input type="text" id="student-search" placeholder="Search student..." onkeyup="filterStudents()" style="padding:.5rem 1rem;border:1px solid var(--lms-border);border-radius:8px;font-family:var(--font-lms);font-size:.9rem;outline:none;width:200px; background:#f8fafc;">
    </div>
    <div id="student-list" style="padding: 1.5rem; display:flex; flex-direction:column; gap:0.8rem;">
      ${myClass.length === 0 ? `<div class="empty-state" style="text-align:center; padding:2rem;"><p>No students in this class.</p></div>` : 
      myClass.map(s=>`
        <div class="std-row" data-name="${s.name.toLowerCase()}" style="background:#fff; border:1px solid var(--lms-border); border-radius:10px; padding:1rem; display:flex; align-items:center; gap:1rem; transition: border-color 0.2s;" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--lms-border)'">
          <div class="std-av" style="width:40px; height:40px; font-size:1rem; flex-shrink:0;">${getInitials(s.name)}</div>
          <div class="std-info" style="flex:1;">
            <strong style="font-size:1.05rem; color:var(--text);">${s.name}</strong>
            <span style="font-size:.8rem; margin-top:4px; display:block; color:var(--lms-muted);">
              <span class="chip grey" style="padding:2px 8px; border-radius:4px;">${s.id}</span> · Age: ${s.age} · ${s.gender} · Parent: <a href="tel:${s.parent_contact}" style="color:var(--primary); text-decoration:none;">${s.parent_contact}</a>
            </span>
          </div>
          <div class="ml-auto" style="display:flex;gap:.5rem;">
            <button class="btn-outline" style="font-size:.8rem;padding:.4rem .8rem; border-radius:6px;" onclick="openTransferModal('${s.id}')"><i class="fas fa-exchange-alt"></i> Transfer</button>
            <button class="btn-danger" style="font-size:.8rem;padding:.4rem .8rem; border-radius:6px;" onclick="deleteStudent('${s.id}')" title="Remove from system"><i class="fas fa-trash"></i></button>
          </div>
        </div>`).join('')}
    </div>
  </div>`
},

't-grades':()=>{
  const myClass = STUDENTS_DB.filter(s => s.class === currentUser.class);
  return `
  <div class="page-header" style="margin-bottom: 2rem;"><h2>Grade Book & Reports</h2><span style="color:var(--lms-muted);">Class ${currentUser.class} · Term 2</span></div>
  <div class="panel" style="border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); overflow: hidden;">
    <div class="panel-head" style="padding: 1.2rem 1.5rem; border-bottom: 1px solid var(--lms-border);">
      <h3 style="margin:0;">Term 2 Assessments</h3>
    </div>
    <div style="overflow-x:auto;">
      <table class="lms-tbl" style="width: 100%; min-width: 700px;">
        <thead style="background: var(--lms-surface);">
          <tr><th style="padding: 1rem; text-align:left;">Student</th><th>Maths</th><th>English</th><th>Science</th><th>Avg</th><th>Report Card Action</th></tr>
        </thead>
        <tbody>${myClass.map((s,i)=>{
          const hasReport = REPORT_CARDS.find(r => r.student_id === s.id);
          const sc=[75+i%15,68+i%18,80+i%12];
          const avg=Math.round(sc.reduce((a,b)=>a+b,0)/sc.length);
          return `<tr style="border-bottom: 1px solid var(--lms-border);">
          <td style="padding: 1rem;">
            <div style="display:flex;align-items:center;gap:.8rem;">
              <div class="std-av" style="width:32px;height:32px;font-size:.8rem;">${getInitials(s.name)}</div>
              <strong style="font-size:.95rem;">${s.name}</strong>
            </div>
          </td>
          ${sc.map(v=>`<td style="text-align:center;">${v}%</td>`).join('')}
          <td style="text-align:center; font-size:1.05rem;"><strong style="color:var(--primary);">${avg}%</strong></td>
          <td style="text-align:center;">
            ${hasReport 
              ? `<span class="chip green" style="padding: 6px 12px; border-radius: 6px;"><i class="fas fa-check"></i> Published</span>` 
              : `<button class="btn-gold" style="font-size:.8rem;padding:.4rem 1rem; border-radius:6px; background:var(--accent); color:#fff; border:none; cursor:pointer;" onclick="openReportModal('${s.id}')"><i class="fas fa-pen"></i> Generate Report</button>`
            }
          </td></tr>`;
        }).join('')}
        </tbody>
      </table>
    </div>
  </div>`
},

's-notices':()=>buildNotices(),
't-notices':()=>buildNotices(true),
's-resources':()=>`<div class="page-header" style="margin-bottom:2rem;"><h2>Study Resources</h2><span style="color:var(--lms-muted);">Course materials & downloads</span></div><div class="empty-state" style="padding:4rem;background:#fff;border-radius:12px;text-align:center;"><i class="fas fa-folder-open" style="font-size:3rem;color:var(--lms-blue);margin-bottom:1rem;"></i><h3 style="color:var(--primary);">No Resources Yet</h3></div>`,
't-resources':()=>`<div class="page-header" style="margin-bottom:2rem;"><h2>Resource Library</h2></div><div class="empty-state" style="padding:4rem;background:#fff;border-radius:12px;text-align:center;"><i class="fas fa-folder-open" style="font-size:3rem;color:var(--lms-blue);margin-bottom:1rem;"></i><h3 style="color:var(--primary);">Library Ready</h3></div>`,
's-ai':()=>`<div class="page-header"><h2>AI Tutor</h2></div>`,
's-quiz':()=>`<div class="page-header" style="margin-bottom:2rem;"><h2>Active Quizzes</h2></div><div class="empty-state" style="padding:4rem;background:#fff;border-radius:12px;text-align:center;"><i class="fas fa-clipboard-check" style="font-size:3rem;color:var(--lms-gold);margin-bottom:1rem;"></i><h3 style="color:var(--primary);">No Active Quizzes</h3></div>`,
't-submissions':()=>`<div class="page-header" style="margin-bottom:2rem;"><h2>Submissions Inbox</h2></div><div class="empty-state" style="padding:4rem;background:#fff;border-radius:12px;text-align:center;"><i class="fas fa-inbox" style="font-size:3rem;color:var(--lms-red);margin-bottom:1rem;"></i><h3 style="color:var(--primary);">No Submissions</h3></div>`,
't-attendance':()=>`<div class="page-header" style="margin-bottom:2rem;"><h2>Attendance Tracker</h2></div><div class="panel" style="border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.04);overflow:hidden;padding:1.5rem;"><div id="att-mark-list" style="display:flex;flex-direction:column;gap:0.8rem;"></div></div>`,
't-timetable': () => pages['s-timetable']()
};

function buildNotices(isTeacher = false) {
  return `
  <div class="page-header" style="margin-bottom: 2rem; display:flex; justify-content:space-between; align-items:center;">
    <div><h2>School Board</h2><span style="color:var(--lms-muted);">Announcements & Notices</span></div>
  </div>
  <div style="display: flex; flex-direction: column; gap: 1rem;">
    <div style="background: #fff; padding: 1.5rem; border-radius: 12px; border-left: 5px solid var(--accent); box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
        <strong style="font-size: 1.1rem; color: var(--text);">Welcome to Term 2</strong>
        <span style="font-size: 0.8rem; color: var(--lms-muted);">Today</span>
      </div>
      <p style="font-size: 0.9rem; color: #64748b; margin: 0 0 1rem 0; line-height: 1.5;">Welcome back! Please ensure all schedules are up to date.</p>
    </div>
  </div>`;
}

/* ====================== ASSIGNMENTS CRUD (CREATE, EDIT, DELETE) ====================== */
function injectAssignmentModal() {
  if(document.getElementById('assignment-modal')) return;
  const m = document.createElement('div');
  m.className = 'lms-modal';
  m.id = 'assignment-modal';
  m.innerHTML = `
    <div class="lms-modal-box">
      <div class="modal-h"><h3><i class="fas fa-tasks" style="color:var(--accent);margin-right:6px;"></i><span id="asgn-modal-title">Create Assignment</span></h3><button onclick="closeModal('assignment-modal')"><i class="fas fa-times"></i></button></div>
      <div class="modal-body">
        <input type="hidden" id="asgn-id">
        <div class="lms-form-group"><label>Title</label><input type="text" id="asgn-title" placeholder="e.g. Algebra Worksheet"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem;">
          <div class="lms-form-group"><label>Subject</label><select id="asgn-subject">${SUBJECTS.map(s=>`<option value="${s.name}">${s.name}</option>`).join('')}</select></div>
          <div class="lms-form-group"><label>Due Date</label><input type="date" id="asgn-due"></div>
        </div>
        <div class="lms-form-group"><label>Description</label><textarea id="asgn-desc" rows="3" placeholder="Instructions for students..."></textarea></div>
        <div style="margin-top:1.2rem;display:flex;gap:.7rem;">
          <button class="btn-lms-primary" style="flex:1;" onclick="saveAssignment()">Save Assignment</button>
          <button class="btn-outline" onclick="closeModal('assignment-modal')">Cancel</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(m);
}

window.openAssignmentModal = function(id = null) {
  injectAssignmentModal();
  const t = document.getElementById('asgn-title');
  const s = document.getElementById('asgn-subject');
  const d = document.getElementById('asgn-due');
  const desc = document.getElementById('asgn-desc');
  const idInput = document.getElementById('asgn-id');
  const mTitle = document.getElementById('asgn-modal-title');
  
  if(id) {
    const a = ASSIGNMENTS.find(x => x.id === id);
    t.value = a.title; s.value = a.subject; d.value = a.due; desc.value = a.desc; idInput.value = a.id;
    mTitle.textContent = "Edit Assignment";
  } else {
    t.value = ''; d.value = ''; desc.value = ''; idInput.value = '';
    mTitle.textContent = "Create Assignment";
  }
  openModal('assignment-modal');
};

window.saveAssignment = async function() {
  if (!supabaseClient) return toast('Database connection missing!', 'error');
  const id = document.getElementById('asgn-id').value;
  const title = document.getElementById('asgn-title').value.trim();
  const subject = document.getElementById('asgn-subject').value;
  const due = document.getElementById('asgn-due').value;
  const desc = document.getElementById('asgn-desc').value.trim();
  
  if(!title || !due) return toast('Please provide a title and due date', 'error');
  
  const payload = { title, subject, due, description: desc, color: 'blue' }; 
  
  if(id) {
    const { error } = await supabaseClient.from('assignments').update(payload).eq('id', id);
    if(error) { console.error(error); return toast('Failed to update assignment', 'error'); }
    const idx = ASSIGNMENTS.findIndex(a => a.id === id);
    ASSIGNMENTS[idx] = { ...ASSIGNMENTS[idx], title, subject, due, desc };
    toast('Assignment updated successfully!');
  } else {
    const newId = 'ASG' + Date.now();
    payload.id = newId;
    const { data, error } = await supabaseClient.from('assignments').insert([payload]).select();
    if(error) { console.error(error); return toast('Failed to create assignment', 'error'); }
    ASSIGNMENTS.unshift(mapAssignment(data[0] || payload)); 
    toast('Assignment created successfully!');
  }
  closeModal('assignment-modal');
  renderPage('t-assignments');
};

window.deleteAssignment = async function(id) {
  if (!supabaseClient) return;
  if(!confirm('Are you sure you want to permanently delete this assignment?')) return;
  
  const { error } = await supabaseClient.from('assignments').delete().eq('id', id);
  if(error) { console.error(error); return toast('Failed to delete assignment', 'error'); }
  
  ASSIGNMENTS = ASSIGNMENTS.filter(a => a.id !== id);
  renderPage('t-assignments');
  toast('Assignment deleted successfully', 'error');
};

/* ====================== REAL WORK: MANAGE STUDENTS ====================== */
window.saveNewStudent = async function() {
  if (!supabaseClient) { toast('Database connection missing!', 'error'); return; }
  const name = document.getElementById('new-std-name').value.trim();
  const age = document.getElementById('new-std-age').value;
  const gender = document.getElementById('new-std-gender').value;
  const parentContact = document.getElementById('new-std-contact').value.trim();
  if(!name || !age || !parentContact) { toast('Please fill all fields', 'error'); return; }
  const { count } = await supabaseClient.from('students').select('*', { count: 'exact', head: true });
  const nextNumber = (count || STUDENTS_DB.length) + 1;
  const newId = 'STU' + String(nextNumber).padStart(3, '0');
  const payload = { id: newId, name: name, age: age, gender: gender, parent_contact: parentContact, class: currentUser.class };
  const { data, error } = await supabaseClient.from('students').insert([payload]).select();
  if (error) { console.error(error); toast('Failed to add student to DB.', 'error'); return; }
  if (data) STUDENTS_DB.push(data[0]);
  closeModal('add-student-modal'); renderPage('t-class'); toast(`${name} added successfully! ID: ${newId}`);
};

window.deleteStudent = async function(id) {
  if (!supabaseClient) return;
  const student = STUDENTS_DB.find(s => s.id === id);
  if(confirm(`Are you absolutely sure you want to remove ${student.name} from the database?`)) {
    const { error } = await supabaseClient.from('students').delete().eq('id', id);
    if (error) { console.error(error); toast('Failed to remove student.', 'error'); return; }
    STUDENTS_DB = STUDENTS_DB.filter(s => s.id !== id);
    renderPage('t-class'); toast('Student removed successfully.', 'error');
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
    std.class = newClass; 
  }
  closeModal('transfer-modal'); renderPage('t-class'); toast(`${std.name} has been transferred to ${newClass}`);
};

window.filterStudents = function(){
  const q = document.getElementById('student-search').value.toLowerCase();
  document.querySelectorAll('#student-list .std-row').forEach(row=>{
    row.style.display = row.dataset.name.includes(q) ? '' : 'none';
  });
};

/* ====================== REAL WORK: REPORT CARDS ====================== */
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
  const payload = { id: 'REP' + Date.now(), student_id: id, term: 'Term 2', conduct: conduct, remarks: remarks };
  const { data, error } = await supabaseClient.from('report_cards').insert([payload]).select();
  if (error) { console.error(error); toast('Failed to save report card.', 'error'); return; }
  if (data) REPORT_CARDS.push(data[0]);
  closeModal('build-report-modal'); renderPage('t-grades'); toast('Report Card Generated & Published! ✅');
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
        <div><p><strong>Student Name:</strong> ${currentUser.name}</p><p><strong>Student ID:</strong> ${currentUser.id}</p></div>
        <div style="text-align:right;"><p><strong>Class:</strong> ${currentUser.class}</p><p><strong>Term:</strong> ${report.term} 2025/26</p></div>
      </div>
      <table style="width:100%; border-collapse: collapse; margin-bottom: 2rem;">
        <tr style="background:var(--lms-surface);">
          <th style="padding:10px; border:1px solid #ccc; text-align:left;">Subject</th>
          <th style="padding:10px; border:1px solid #ccc; text-align:center;">Score</th>
          <th style="padding:10px; border:1px solid #ccc; text-align:center;">Grade</th>
        </tr>
        ${GRADES.slice(0,5).map(g => `<tr><td style="padding:10px; border:1px solid #ccc;">${g.subject}</td><td style="padding:10px; border:1px solid #ccc; text-align:center;">${g.total}</td><td style="padding:10px; border:1px solid #ccc; text-align:center;"><strong>${g.grade}</strong></td></tr>`).join('')}
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
  const myClass = STUDENTS_DB.filter(s => s.class === currentUser.class);
  el.innerHTML=myClass.map((s,i)=>` <div class="std-row" style="background:#f8fafc; border:1px solid var(--lms-border); border-radius:10px; padding:0.8rem 1rem; display:flex; align-items:center; gap:1rem;"> <div class="std-av" style="width:36px;height:36px;font-size:.9rem;">${getInitials(s.name)}</div> <div class="std-info" style="flex:1;"><strong>${s.name}</strong><span style="display:block;font-size:0.75rem;color:var(--lms-muted);">${s.id}</span></div> <div class="ml-auto" style="display:flex;gap:.5rem;"> <button onclick="setAtt(${i},'present')" class="att-btn ${attState[i]==='present'?'att-present':''}" style="padding:6px 18px;border-radius:8px;font-size:.8rem;font-weight:700;cursor:pointer;border:1.5px solid;transition:all .2s;${attState[i]==='present'?'background:#22c55e;color:#fff;border-color:#22c55e;box-shadow:0 4px 10px rgba(34,197,94,0.3);':'background:#fff;color:var(--lms-muted);border-color:var(--lms-border);'}">Present</button> <button onclick="setAtt(${i},'absent')" style="padding:6px 18px;border-radius:8px;font-size:.8rem;font-weight:700;cursor:pointer;border:1.5px solid;transition:all .2s;${attState[i]==='absent'?'background:#ef4444;color:#fff;border-color:#ef4444;box-shadow:0 4px 10px rgba(239,68,68,0.3);':'background:#fff;color:var(--lms-muted);border-color:var(--lms-border);'}">Absent</button> </div> </div>`).join('');
}
window.setAtt=function(i,v){attState[i]=v;renderAttList();};

/* ====================== INIT ====================== */
document.addEventListener('DOMContentLoaded', async () => {
  const y=document.getElementById('year');
  if(y) y.textContent=new Date().getFullYear();

  // Inject proper classes into the HTML transfer dropdown if it exists
  const transferSelect = document.getElementById('transfer-class-select');
  if (transferSelect) transferSelect.innerHTML = SCHOOL_CLASSES.map(c => `<option value="${c}">${c}</option>`).join('');

  // Check for persistent login
  const savedUser = localStorage.getItem('lms_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    currentRole = currentUser.role;
    
    // Hide login and show dashboard immediately to prevent blinking
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('lms-dashboard').classList.add('active');
    document.querySelector('.navbar').style.display = 'none';
    document.querySelector('footer').style.display = 'none';
    const wa = document.querySelector('.whatsapp-btn'); if(wa) wa.style.display = 'none';
    const btt = document.getElementById('backToTop'); if(btt) btt.style.display = 'none';
    
    // Build an empty skeleton, fetch live DB data, then refresh UI
    buildDashboard(); 
    await fetchAllData();
    buildDashboard();
  }
});

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
let STUDENTS_DB = [], REPORT_CARDS = []; 
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
      if (idInput === 'TCH001' && pwInput === 'teacher123') {
        authenticated = true;
        fetchedUser = { role: 'teacher', name: 'Abena Boateng', initials: 'AB', class: 'Class 6B', id: 'TCH001' };
      } else { showErr('Invalid teacher credentials.'); btnText.innerHTML = '<i class="fas fa-sign-in-alt"></i> Log In'; return; }
    } else {
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
      supabaseClient.from('students').select('*').order('name',{ascending:true}), 
      supabaseClient.from('report_cards').select('*').order('date',{ascending:false}) 
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

/* ─────── STUDENT DASHBOARD ─────── */
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

/* ─────── STUDENT SUBJECTS ─────── */
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

/* ─────── STUDENT TIMETABLE ─────── */
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

/* ─────── STUDENT ASSIGNMENTS ─────── */
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

/* ─────── STUDENT RESOURCES ─────── */
's-resources':()=>`
  <div class="page-header" style="margin-bottom: 2rem;"><h2>Study Resources</h2><span style="color:var(--lms-muted);">Course materials & downloads</span></div>
  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
    ${[
      {title:'Algebra Formulation', sub:'Mathematics', type:'pdf', icon:'file-pdf', color:'red'},
      {title:'Solar System Diagram', sub:'Science', type:'img', icon:'file-image', color:'blue'},
      {title:'Term 2 Grammar Guide', sub:'English', type:'doc', icon:'file-word', color:'blue'},
      {title:'History of Ghana (Slides)', sub:'Social Studies', type:'ppt', icon:'file-powerpoint', color:'gold'}
    ].map(r => `
      <div style="background:#fff; border: 1px solid var(--lms-border); border-radius: 12px; padding: 1.5rem; display: flex; gap: 1.2rem; align-items: center; transition: all 0.2s; cursor:pointer;" onmouseover="this.style.borderColor='var(--primary)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.05)'" onmouseout="this.style.borderColor='var(--lms-border)'; this.style.boxShadow='none'">
        <div style="width: 50px; height: 50px; background: var(--lms-${r.color}-pale); color: var(--lms-${r.color}); border-radius: 10px; display: flex; justify-content: center; align-items: center; font-size: 1.5rem;"><i class="fas fa-${r.icon}"></i></div>
        <div style="flex: 1;">
          <h4 style="margin: 0 0 0.3rem 0; color: var(--text); font-size: 1rem;">${r.title}</h4>
          <span style="font-size: 0.8rem; color: var(--lms-muted);">${r.sub} · ${r.type.toUpperCase()}</span>
        </div>
        <button style="background:transparent; border:none; color:var(--primary); font-size: 1.2rem; cursor:pointer;"><i class="fas fa-download"></i></button>
      </div>
    `).join('')}
  </div>`,

/* ─────── STUDENT AI TUTOR ─────── */
's-ai':()=>`
  <div style="height: calc(100vh - 180px); background: #fff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); display: flex; flex-direction: column; overflow: hidden;">
    <div style="padding: 1.5rem; background: var(--primary); color: white; display: flex; align-items: center; gap: 1rem;">
      <div style="width: 45px; height: 45px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">🤖</div>
      <div>
        <h3 style="margin: 0; font-size: 1.2rem; font-family: var(--font-lms-heading);">De-Bright AI Tutor</h3>
        <span style="font-size: 0.8rem; opacity: 0.8;">Powered by Gemini</span>
      </div>
    </div>
    <div style="flex: 1; padding: 2rem; overflow-y: auto; background: #f8fafc; display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="align-self: flex-start; max-width: 80%; background: #fff; padding: 1rem 1.5rem; border-radius: 0 16px 16px 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); font-size: 0.95rem; line-height: 1.5; color: var(--text);">
        Hello ${currentUser.name.split(' ')[0]}! I am your personal AI study assistant. Do you need help with your Mathematics assignment or preparing for your Science quiz?
      </div>
    </div>
    <div style="padding: 1.5rem; background: #fff; border-top: 1px solid var(--lms-border); display: flex; gap: 1rem;">
      <input type="text" placeholder="Ask a question..." style="flex: 1; padding: 1rem 1.5rem; border: 1px solid var(--lms-border); border-radius: 99px; outline: none; font-family: var(--font-lms); font-size: 0.95rem; background: #f8fafc;">
      <button style="width: 50px; height: 50px; border-radius: 50%; background: var(--primary); color: white; border: none; cursor: pointer; font-size: 1.2rem; box-shadow: 0 4px 10px rgba(13, 59, 102, 0.3);"><i class="fas fa-paper-plane"></i></button>
    </div>
  </div>`,

/* ─────── STUDENT & TEACHER NOTICES ─────── */
's-notices':()=>buildNotices(),
't-notices':()=>buildNotices(true),

/* ─────── STUDENT QUIZZES ─────── */
's-quiz':()=>`
  <div class="page-header" style="margin-bottom: 2rem;"><h2>Active Quizzes</h2><span style="color:var(--lms-muted);">Test your knowledge</span></div>
  <div class="empty-state" style="padding:4rem;background:#fff;border-radius:12px;text-align:center;box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
    <i class="fas fa-clipboard-check" style="font-size:3rem;color:var(--lms-gold);margin-bottom:1rem;"></i>
    <h3 style="color:var(--primary);">No Active Quizzes</h3>
    <p style="color:var(--lms-muted); max-width:300px; margin: 0 auto;">Your teachers have not published any online quizzes for this week.</p>
  </div>`,

/* ─────── TEACHER DASHBOARD ─────── */
't-dashboard':()=>`
  <div class="welcome-banner" style="background: linear-gradient(135deg, #0f172a, var(--primary)); border-radius: 16px; padding: 2rem; color: white; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 10px 20px rgba(0,0,0,0.15); margin-bottom: 2rem;">
    <div class="wb-text">
      <div class="wb-tag" style="background: rgba(255,255,255,0.15); padding: 4px 12px; border-radius: 99px; font-size: 0.8rem; font-weight: 600; display: inline-block; margin-bottom: 0.8rem;">📋 Class Teacher — 6B</div>
      <h2 style="font-size: 1.8rem; margin: 0; font-family: var(--font-lms-heading);">Good day, ${currentUser.name.split(' ')[1]||currentUser.name}! 👩‍🏫</h2>
      <p style="margin-top: 0.5rem; opacity: 0.9; font-size: 0.9rem;">Your class has 3 new submissions awaiting grading.</p>
    </div>
    <div class="wb-icon" style="font-size: 4rem; opacity: 0.8;"><i class="fas fa-chalkboard-teacher"></i></div>
  </div>
  <div class="stats-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
    <div class="sc" style="background: #fff; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); display: flex; align-items: center; gap: 1rem; border-left: 4px solid var(--lms-gold);">
      <div class="sc-icon" style="width: 48px; height: 48px; background: #fef9c3; color: #a16207; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;"><i class="fas fa-users"></i></div>
      <div class="sc-info"><label style="font-size: 0.8rem; color: var(--lms-muted); text-transform: uppercase;">Students</label><div style="font-size: 1.5rem; font-weight: 700; color: var(--text);">${STUDENTS_DB.filter(s=>s.class==='6B').length}</div></div>
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

/* ─────── TEACHER ASSIGNMENTS ─────── */
't-assignments': () => `
  <div class="page-header" style="margin-bottom: 2rem; display:flex; justify-content:space-between; align-items:center;">
    <div>
      <h2>Assignments</h2>
      <span style="color:var(--lms-muted);">${ASSIGNMENTS.length} published assignments</span>
    </div>
    <button class="btn-lms-primary" style="padding: 0.6rem 1.2rem; border-radius: 8px; box-shadow: 0 4px 10px rgba(13, 59, 102, 0.2);"><i class="fas fa-plus"></i> Create New</button>
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
            <button class="btn-outline" style="padding: 0.5rem 1rem; border-radius: 8px;"><i class="fas fa-edit"></i> Edit</button>
            <button class="btn-danger" style="padding: 0.5rem 1rem; border-radius: 8px;"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      `).join('')
    }
  </div>`,

/* ─────── TEACHER SUBMISSIONS ─────── */
't-submissions':()=>`
  <div class="page-header" style="margin-bottom: 2rem;"><h2>Submissions Inbox</h2><span style="color:var(--lms-muted);">Review and grade student work</span></div>
  <div class="panel" style="border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); overflow: hidden;">
    <div style="overflow-x: auto;">
      <table class="lms-tbl" style="width: 100%; min-width: 600px;">
        <thead style="background: var(--lms-surface);">
          <tr><th style="padding: 1rem; text-align:left;">Student</th><th style="text-align:left;">Assignment</th><th>Status</th><th>Action</th></tr>
        </thead>
        <tbody>
          ${STUDENTS_DB.slice(0,3).map((s, i) => `
            <tr style="border-bottom: 1px solid var(--lms-border);">
              <td style="padding: 1rem;">
                <div style="display:flex;align-items:center;gap:.8rem;">
                  <div class="std-av" style="width:32px;height:32px;font-size:.8rem;">${getInitials(s.name)}</div>
                  <div><strong style="display:block;font-size:.9rem;">${s.name}</strong><span style="font-size:.75rem;color:var(--lms-muted);">${s.id}</span></div>
                </div>
              </td>
              <td>${ASSIGNMENTS[i]?.title || 'Mathematics Worksheet'}</td>
              <td style="text-align:center;"><span class="chip ${i===0?'green':'gold'}">${i===0?'Graded':'Needs Grading'}</span></td>
              <td style="text-align:center;"><button class="btn-lms-primary" style="padding:0.4rem 0.8rem;font-size:0.8rem;border-radius:6px;">Review</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>`,

/* ─────── TEACHER ATTENDANCE ─────── */
't-attendance':()=>`
  <div class="page-header" style="margin-bottom: 2rem; display:flex; justify-content:space-between; align-items:center;">
    <div>
      <h2>Attendance Tracker</h2>
      <span style="color:var(--lms-muted);">Mark register for Class 6B</span>
    </div>
    <div style="display:flex; gap: 0.5rem;">
      <input type="date" value="${new Date().toISOString().split('T')[0]}" style="padding: 0.5rem; border: 1px solid var(--lms-border); border-radius: 8px; outline:none; font-family:var(--font-lms);">
      <button class="btn-lms-primary" style="padding: 0.5rem 1rem; border-radius: 8px;" onclick="toast('Attendance Saved successfully!')"><i class="fas fa-save"></i> Save</button>
    </div>
  </div>
  <div class="panel" style="border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); overflow: hidden; padding: 1.5rem;">
    <div id="att-mark-list" style="display: flex; flex-direction: column; gap: 0.8rem;"></div>
  </div>`,

/* ─────── TEACHER RESOURCES ─────── */
't-resources':()=>`
  <div class="page-header" style="margin-bottom: 2rem; display:flex; justify-content:space-between; align-items:center;">
    <div>
      <h2>Resource Library</h2>
      <span style="color:var(--lms-muted);">Manage files for Class 6B</span>
    </div>
    <button class="btn-lms-primary" style="padding: 0.6rem 1.2rem; border-radius: 8px;"><i class="fas fa-upload"></i> Upload File</button>
  </div>
  <div class="empty-state" style="padding:4rem;background:#fff;border-radius:12px;text-align:center;box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
    <i class="fas fa-folder-open" style="font-size:3rem;color:var(--lms-blue);margin-bottom:1rem;"></i>
    <h3 style="color:var(--primary);">Library Ready</h3>
    <p style="color:var(--lms-muted); max-width:300px; margin: 0 auto;">Click "Upload File" to start sharing notes, slides, and PDFs with your class.</p>
  </div>`,

/* ─────── TEACHER TIMETABLE ─────── */
't-timetable': () => pages['s-timetable'](),

/* ─────── REBUILT STUDENT & TEACHER GRADES ─────── */
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
  const myClass = STUDENTS_DB.filter(s => s.class === '6B');
  return `
  <div class="page-header" style="margin-bottom: 2rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
    <div>
      <h2>Manage My Class</h2>
      <span style="color:var(--lms-muted);">${myClass.length} students currently enrolled in 6B</span>
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
  const myClass = STUDENTS_DB.filter(s => s.class === '6B');
  return `
  <div class="page-header" style="margin-bottom: 2rem;"><h2>Grade Book & Reports</h2><span style="color:var(--lms-muted);">Class 6B · Term 2</span></div>
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
}
};

/* Notice Builder Helper */
function buildNotices(isTeacher = false) {
  return `
  <div class="page-header" style="margin-bottom: 2rem; display:flex; justify-content:space-between; align-items:center;">
    <div>
      <h2>School Board</h2>
      <span style="color:var(--lms-muted);">Announcements & Notices</span>
    </div>
    ${isTeacher ? `<button class="btn-lms-primary" style="padding: 0.6rem 1.2rem; border-radius: 8px;"><i class="fas fa-bullhorn"></i> New Notice</button>` : ''}
  </div>
  <div style="display: flex; flex-direction: column; gap: 1rem;">
    <div style="background: #fff; padding: 1.5rem; border-radius: 12px; border-left: 5px solid var(--accent); box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
        <strong style="font-size: 1.1rem; color: var(--text);">Mid-Term Break Announcement</strong>
        <span style="font-size: 0.8rem; color: var(--lms-muted);">Feb 20, 2026</span>
      </div>
      <p style="font-size: 0.9rem; color: #64748b; margin: 0 0 1rem 0; line-height: 1.5;">Please be informed that the school will break for mid-terms starting next week Friday. Classes will resume on Wednesday.</p>
      <div style="font-size: 0.8rem; color: var(--primary); font-weight: 600;"><i class="fas fa-user-tie"></i> From: Headmaster's Office</div>
    </div>
  </div>`;
}

/* ====================== REAL WORK: MANAGE STUDENTS IN SUPABASE ====================== */
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
  const payload = { id: newId, name: name, age: age, gender: gender, parent_contact: parentContact, class: '6B' };
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
  const myClass = STUDENTS_DB.filter(s => s.class === '6B');
  el.innerHTML=myClass.map((s,i)=>` <div class="std-row" style="background:#f8fafc; border:1px solid var(--lms-border); border-radius:10px; padding:0.8rem 1rem; display:flex; align-items:center; gap:1rem;"> <div class="std-av" style="width:36px;height:36px;font-size:.9rem;">${getInitials(s.name)}</div> <div class="std-info" style="flex:1;"><strong>${s.name}</strong><span style="display:block;font-size:0.75rem;color:var(--lms-muted);">${s.id}</span></div> <div class="ml-auto" style="display:flex;gap:.5rem;"> <button onclick="setAtt(${i},'present')" class="att-btn ${attState[i]==='present'?'att-present':''}" style="padding:6px 18px;border-radius:8px;font-size:.8rem;font-weight:700;cursor:pointer;border:1.5px solid;transition:all .2s;${attState[i]==='present'?'background:#22c55e;color:#fff;border-color:#22c55e;box-shadow:0 4px 10px rgba(34,197,94,0.3);':'background:#fff;color:var(--lms-muted);border-color:var(--lms-border);'}">Present</button> <button onclick="setAtt(${i},'absent')" style="padding:6px 18px;border-radius:8px;font-size:.8rem;font-weight:700;cursor:pointer;border:1.5px solid;transition:all .2s;${attState[i]==='absent'?'background:#ef4444;color:#fff;border-color:#ef4444;box-shadow:0 4px 10px rgba(239,68,68,0.3);':'background:#fff;color:var(--lms-muted);border-color:var(--lms-border);'}">Absent</button> </div> </div>`).join('');
}
window.setAtt=function(i,v){attState[i]=v;renderAttList();};

/* ====================== INIT ====================== */
document.addEventListener('DOMContentLoaded',()=>{
  const y=document.getElementById('year');
  if(y) y.textContent=new Date().getFullYear();
});

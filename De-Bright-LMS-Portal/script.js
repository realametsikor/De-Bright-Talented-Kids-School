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

const TT_COLORS = {
  'Maths':'filled-gold','English':'filled-blue','Science':'filled-green',
  'ICT':'filled-green','French':'filled-purple','Social Studies':'filled-purple',
  'Creative Arts':'filled-gold','RME':'filled-red','BREAK':'break','LUNCH':'lunch'
};

/* ====================== LIVE DB STATE ====================== */
let SUBJECTS = [];
let GRADES = [];
let TIMETABLE = [];
let TT_TIMES = [];
let GALLERY_DB = [];
let EVENTS_DB = [];


let currentUser = null, currentRole = 'student', currentPage = null;
let ASSIGNMENTS = [], SUBMISSIONS = [], NOTICES = [], NOTICE_COMMENTS = [], RESOURCES = [], ATTENDANCE_RECORDS = [];
let STUDENTS_DB = [], REPORT_CARDS = []; 
let QUIZZES = [], QUIZ_SUBMISSIONS = [];
let TEACHERS_DB = [], ARTICLES_DB = [], SITE_SETTINGS = {};
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
  const idInputRaw = document.getElementById('login-id').value.trim();
  const idInput = idInputRaw.toLowerCase();
  const pwInput = document.getElementById('login-pass').value;
  const errorBox = document.getElementById('login-error');
  const btnText = document.getElementById('login-btn-text');

  if(!idInput || !pwInput) { showErr('Please enter your ID and password.'); return; }

  errorBox.style.display = 'none';
  btnText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating…';

  try {
    const authEmail = `${idInput}@debright.edu`;

    if (!supabaseClient) throw new Error("Supabase not initialized");
    
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email: authEmail,
      password: pwInput
    });

    if (authError) {
      showErr('Invalid ID or Password.'); 
      btnText.innerHTML = '<i class="fas fa-sign-in-alt"></i> Log In'; 
      return; 
    }

    let fetchedUser = null;

    if (idInputRaw.toUpperCase().startsWith('ADM')) {
      const { data, error } = await supabaseClient.from('admins').select('*').eq('id', idInputRaw.toUpperCase()).single();
      if (error || !data) { showErr('Admin profile not found in database.'); btnText.innerHTML = '<i class="fas fa-sign-in-alt"></i> Log In'; return; }
      fetchedUser = { role: 'admin', name: data.name, initials: getInitials(data.name), id: data.id };
      
    } else if (currentRole === 'teacher') {
      const { data, error } = await supabaseClient.from('teachers').select('*').eq('id', idInputRaw.toUpperCase()).single();
      if (error || !data) { showErr('Teacher profile not found in database.'); btnText.innerHTML = '<i class="fas fa-sign-in-alt"></i> Log In'; return; }
      fetchedUser = { role: 'teacher', name: data.name, initials: data.initials, class: data.class_assigned, id: data.id };
      
    } else {
      const { data, error } = await supabaseClient.from('students').select('*').eq('id', idInputRaw.toUpperCase()).single();
      if (error || !data) { showErr('Student profile not found in database.'); btnText.innerHTML = '<i class="fas fa-sign-in-alt"></i> Log In'; return; }
      fetchedUser = { role: 'student', name: data.name, initials: getInitials(data.name), class: data.class, id: data.id };
    }

    if (fetchedUser) {
      currentUser = fetchedUser;
      localStorage.setItem('lms_user', JSON.stringify(currentUser));
      await fetchAllData();
      setupRealtimeListeners();
      
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

window.doLogout = async function(){
  if(supabaseClient) { await supabaseClient.auth.signOut(); }
  localStorage.removeItem('lms_user'); 
  if(realtimeChannel && supabaseClient) { supabaseClient.removeChannel(realtimeChannel); }
  currentPage = null;
  document.getElementById('lms-dashboard').classList.remove('active');
  document.getElementById('login-section').style.display='';
  document.querySelector('.navbar').style.display='';
  document.querySelector('footer').style.display='';
  const wa = document.querySelector('.whatsapp-btn'); if(wa) wa.style.display='';
  const btt = document.getElementById('backToTop'); if(btt) btt.style.display='';
  document.getElementById('login-id').value=''; document.getElementById('login-pass').value='';
  currentUser=null; window.scrollTo({top:0,behavior:'smooth'});
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
        const [asgn, subs, stdRes, repRes, qzRes, qzSubRes, attRes, notRes, comRes, subjRes, gradesRes, classRes, teachRes, artRes, setRes, galRes, evRes, resData] = await Promise.all([
      supabaseClient.from('assignments').select('*').order('created_at',{ascending:false}),
      supabaseClient.from('submissions').select('*').order('created_at',{ascending:false}),
      supabaseClient.from('students').select('*').order('name',{ascending:true}), 
      supabaseClient.from('report_cards').select('*').order('date',{ascending:false}),
      supabaseClient.from('quizzes').select('*').order('created_at',{ascending:false}),
      supabaseClient.from('quiz_submissions').select('*').order('created_at',{ascending:false}),
      supabaseClient.from('attendance_records').select('*').order('date',{ascending:false}),
      supabaseClient.from('notices').select('*').order('created_at',{ascending:false}),
      supabaseClient.from('notice_comments').select('*').order('created_at',{ascending:true}),
      supabaseClient.from('subjects').select('*').order('name',{ascending:true}),
      supabaseClient.from('continuous_assessments').select('*').eq('student_id', currentUser?.id || ''),
      supabaseClient.from('classes').select('*').eq('name', currentUser?.class || '').single(),
      supabaseClient.from('teachers').select('*').order('name',{ascending:true}),
      supabaseClient.from('articles').select('*').order('created_at',{ascending:false}),
      supabaseClient.from('site_settings').select('*').eq('id', 1).single(),
      supabaseClient.from('gallery_images').select('*').order('created_at',{ascending:false}),
      supabaseClient.from('events').select('*').order('event_date',{ascending:true}),
      supabaseClient.from('resources').select('*').order('created_at',{ascending:false})
    ]);

    if(asgn.data) ASSIGNMENTS = asgn.data.map(mapAssignment);
    if(subs.data) SUBMISSIONS = subs.data;
    if(stdRes.data) STUDENTS_DB = stdRes.data;
    if(repRes.data) REPORT_CARDS = repRes.data;
    if(qzRes.data) QUIZZES = qzRes.data;
    if(qzSubRes.data) QUIZ_SUBMISSIONS = qzSubRes.data;
    if(attRes.data) ATTENDANCE_RECORDS = attRes.data;
    if(notRes.data) NOTICES = notRes.data;
    if(comRes.data) NOTICE_COMMENTS = comRes.data;
    if(subjRes.data) SUBJECTS = subjRes.data;
    if(gradesRes.data) GRADES = gradesRes.data;
    if(teachRes && teachRes.data) TEACHERS_DB = teachRes.data;
    if(artRes && artRes.data) ARTICLES_DB = artRes.data;
    if(setRes && setRes.data) SITE_SETTINGS = setRes.data;
    if(galRes && galRes.data) GALLERY_DB = galRes.data;
    if(evRes && evRes.data) EVENTS_DB = evRes.data;
    if(resData && resData.data) RESOURCES = resData.data;

    if(classRes && classRes.data) {
      TIMETABLE = classRes.data.timetable_data || [];
      TT_TIMES = classRes.data.timetable_times || [];
    } else { TIMETABLE = []; TT_TIMES = []; }

  } catch (e) {
    console.error("Supabase Error:", e);
    if(currentUser.role !== 'admin') throw e; 
  }
}



function mapAssignment(item){
  return {
    id:item.id, title:item.title, subject:item.subject,
    desc:item.description, due:item.due, status:item.status||'open',
    color:item.color||'blue', attachment_url:item.attachment_url, 
    submission_type:item.submission_type||'any', created_at:item.created_at
  };
}

function showErr(msg){
  const e = document.getElementById('login-error');
  e.textContent = msg; e.style.display = 'block'; e.scrollIntoView({behavior:'smooth', block:'center'});
}

/* ====================== DASHBOARD BUILDER ====================== */
function buildDashboard(){
  const u = currentUser;
  document.getElementById('sb-avatar').textContent = u.initials;
  document.getElementById('sb-name').textContent = u.name;
  
  if(u.role === 'student') document.getElementById('sb-sub').textContent = `Class ${u.class} · ${u.id}`;
  else if(u.role === 'teacher') document.getElementById('sb-sub').textContent = `Teacher · ${u.class}`;
  else document.getElementById('sb-sub').textContent = `Administrator · ${u.id}`;

  if(u.role === 'student') document.getElementById('sb-role-label').textContent = 'Student Portal';
  else if(u.role === 'teacher') document.getElementById('sb-role-label').textContent = 'Teacher Portal';
  else document.getElementById('sb-role-label').textContent = 'Super Admin Portal';

  const nav = document.getElementById('sidebar-nav');
  const pending = ASSIGNMENTS.filter(a=>!SUBMISSIONS.some(s => String(s.assignment_id) === String(a.id) && s.student_id === u.id)).length;
  const pendingQuizzes = QUIZZES.filter(q=>q.class === u.class && q.status==='active' && !QUIZ_SUBMISSIONS.some(qs => qs.quiz_id === q.id && qs.student_id === u.id)).length;

  let items = [];
  
  if (u.role === 'student') {
    items = [
      {section:'Overview', links:[{icon:'th-large',label:'Dashboard',page:'s-dashboard'},{icon:'book-open',label:'My Subjects',page:'s-subjects'}]},
      {section:'Academics', links:[{icon:'tasks',label:'Assignments',page:'s-assignments',badge:pending||null},{icon:'question-circle',label:'Quizzes',page:'s-quiz',badge:pendingQuizzes||null},{icon:'chart-bar',label:'Grades & Reports',page:'s-grades'},{icon:'calendar-alt',label:'Timetable',page:'s-timetable'},{icon:'user-check',label:'Attendance',page:'s-attendance'}]},
      {section:'Learning', links:[{icon:'folder-open',label:'Resources',page:'s-resources'},{icon:'robot',label:'AI Tutor',page:'s-ai'},{icon:'bullhorn',label:'Notices',page:'s-notices'}]},
    ];
  } else if (u.role === 'teacher') {
    items = [
      {section:'Overview', links:[{icon:'th-large',label:'Dashboard',page:'t-dashboard'},{icon:'users',label:'My Class',page:'t-class'}]},
      {section:'Academics', links:[{icon:'tasks',label:'Assignments',page:'t-assignments'},{icon:'question-circle',label:'Quizzes',page:'t-quiz'},{icon:'inbox',label:'Submissions',page:'t-submissions',badge:SUBMISSIONS.filter(s=>s.status!=='graded' && (s.class===u.class || (STUDENTS_DB.find(st=>String(st.id)===String(s.student_id))||{}).class===u.class)).length||null},{icon:'chart-bar',label:'Grade Book',page:'t-grades'},{icon:'clipboard-list',label:'Attendance',page:'t-attendance'}]},
      {section:'Communication', links:[{icon:'bullhorn',label:'Notices',page:'t-notices'},{icon:'folder-open',label:'Resources',page:'t-resources'},{icon:'calendar-alt',label:'Timetable',page:'t-timetable'}]},
    ];
    } else if (u.role === 'admin') {
    items = [
      {section:'System Operations', links:[
        {icon:'shield-alt',label:'Admin Dashboard',page:'a-dashboard'},
        {icon:'users-cog',label:'Manage Users',page:'a-users'}
      ]},
      {section:'Website CMS', links:[
        {icon:'newspaper',label:'News & Articles',page:'a-articles'},
        {icon:'images',label:'Gallery Manager',page:'a-gallery'},
        {icon:'calendar-alt',label:'Event Manager',page:'a-events'},
        {icon:'cogs',label:'Global Settings',page:'a-settings'}
      ]}
    ];
  }


  const currentDisplayPage = currentPage || (u.role==='student'?'s-dashboard':(u.role==='teacher'?'t-dashboard':'a-dashboard'));

  nav.innerHTML = items.map(s=>` <div class="sb-section">${s.section}</div> ${s.links.map(l=>`
  <div class="sb-item${l.page===currentDisplayPage?' active':''}" onclick="showPage('${l.page}',this)">
  <i class="fas fa-${l.icon}"></i> ${l.label}
  ${l.badge?`<span class="sb-badge">${l.badge}</span>`:''}
  </div>`).join('')} `).join('');

  if (!currentPage) {
    currentPage = currentDisplayPage;
    renderPage(currentPage);
  }
}

function showPage(page, el){
  currentPage = page;
  document.querySelectorAll('.sb-item').forEach(n=>n.classList.remove('active'));
  if(el) el.classList.add('active');
  const titles = {'s-dashboard':'Dashboard','s-grades':'Grades & Reports','s-attendance':'My Attendance','t-dashboard':'Dashboard','t-class':'Manage My Class','t-grades':'Grade Book','t-quiz':'Quiz Manager','s-quiz':'Active Quizzes','t-timetable':'Timetable Manager','s-timetable':'Class Timetable','a-dashboard':'System Overview','a-users':'User Management','a-articles':'Website Content','a-gallery':'Gallery Management','a-events':'Event Management','a-settings':'Global Settings'};
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

/* ====================== TIMETABLE FUNCTIONS ====================== */
window.saveTimetable = function(silent = false) {
  const selects = document.querySelectorAll('.tt-select');
  const timeInputs = document.querySelectorAll('.tt-time-input');
  
  const newTimetable = Array.from({length: TT_TIMES.length}, () => Array(5).fill('-'));
  const newTimes = Array(TT_TIMES.length).fill('');

  timeInputs.forEach(inp => {
    const r = parseInt(inp.getAttribute('data-row'));
    if(newTimes[r] !== undefined) {
      newTimes[r] = inp.value.trim();
    }
  });

  selects.forEach(sel => {
    const r = parseInt(sel.getAttribute('data-row'));
    const c = parseInt(sel.getAttribute('data-col'));
    if(newTimetable[r]) {
      newTimetable[r][c] = sel.value.trim();
    }
  });

  TIMETABLE = newTimetable;
  TT_TIMES = newTimes;
  
  if(supabaseClient && currentUser.role === 'teacher') {
      supabaseClient.from('classes').update({ timetable_data: TIMETABLE, timetable_times: TT_TIMES }).eq('name', currentUser.class).then(() => {});
  }

  if(!silent) {
    toast('Timetable updated successfully! ✅');
    renderPage('t-timetable');
  }
};

window.addTimetableRow = function() {
  window.saveTimetable(true); 
  TT_TIMES.push('00:00 PM');
  TIMETABLE.push(['-','-','-','-','-']);
  renderPage('t-timetable');
};

window.removeTimetableRow = function(index) {
  if (TT_TIMES.length <= 1) { toast('Cannot remove the last row!', 'error'); return; }
  window.saveTimetable(true); 
  TT_TIMES.splice(index, 1);
  TIMETABLE.splice(index, 1);
  renderPage('t-timetable');
};

window.viewPrintableTimetable = function() {
  if(!document.getElementById('view-timetable-modal')) {
    const m = document.createElement('div');
    m.className = 'lms-modal';
    m.id = 'view-timetable-modal';
    document.body.appendChild(m);
  }
  const m = document.getElementById('view-timetable-modal');
  
  let tbodyHTML = '';
  TT_TIMES.forEach((time, i) => {
    const isAllBreak = TIMETABLE[i].every(s => s.toUpperCase().includes('BREAK'));
    const isAllLunch = TIMETABLE[i].every(s => s.toUpperCase().includes('LUNCH'));
    let rowContent = '';
    
    if(isAllBreak || isAllLunch) {
      const label = isAllBreak ? 'MORNING BREAK' : 'LUNCH BREAK';
      rowContent = '<td colspan="5" style="padding:15px; border:2px solid #333; background:rgba(240,240,240,0.8); font-weight:bold; font-size:1.15rem; letter-spacing:2px; color:#222; text-transform:uppercase;">' + label + '</td>';
    } else {
      rowContent = ['Mon','Tue','Wed','Thu','Fri'].map((day, j) => {
        const sub = TIMETABLE[i]?.[j] || '-';
        return '<td style="padding:15px; border:2px solid #333; font-size:1.1rem; font-weight:600; color:#000;">' + sub + '</td>';
      }).join('');
    }
    tbodyHTML += '<tr><td style="padding:15px; border:2px solid #333; font-weight:bold; font-size:1.1rem; color:#000;">' + time + '</td>' + rowContent + '</tr>';
  });

  m.innerHTML = `
    <style>
      @media print {
        @page { size: landscape; margin: 10mm; }
        body * { visibility: hidden; }
        #view-timetable-modal, #view-timetable-modal * { visibility: visible; }
        #view-timetable-modal { position: absolute; left: 0; top: 0; width: 100vw; height: 100vh; background: #fff !important; }
        .lms-modal-box { max-width: 100% !important; border: none !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; background: transparent !important; }
        .modal-h, .print-footer-actions { display: none !important; }
        #tt-print-area { width: 100%; margin: 0; padding: 0; background: transparent !important; }
        table { table-layout: fixed; width: 100% !important; border-collapse: collapse; }
        th, td { word-wrap: break-word; border: 2px solid #000 !important; }
        #tt-print-area::before {
          content: ""; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 700px; height: 700px;
          background: url('https://debrighttalentedkidsschool.online/wp-content/uploads/2026/01/IMG_2312.jpeg') no-repeat center center;
          background-size: contain; opacity: 0.3 !important; z-index: -1; pointer-events: none;
        }
      }
    </style>
    <div class="lms-modal-box" style="max-width:900px;">
      <div class="modal-h">
        <h3><i class="fas fa-calendar-alt" style="color:var(--accent);margin-right:6px;"></i>Official Timetable</h3>
        <button onclick="closeModal('view-timetable-modal')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body" id="tt-print-area" style="background:#fff; color:#000; position:relative; z-index:1; padding:2rem;">
        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:600px; height:600px; background:url('https://debrighttalentedkidsschool.online/wp-content/uploads/2026/01/IMG_2312.jpeg') no-repeat center center; background-size:contain; opacity:0.15; z-index:-1; pointer-events:none;"></div>
        <div style="text-align:center; border-bottom: 3px solid var(--accent); padding-bottom: 1.5rem; margin-bottom: 2rem; position:relative; z-index:2;">
          <h2 style="color:var(--primary); font-family:'Poppins', sans-serif; font-size:1.8rem; margin-bottom:0.5rem;">${SITE_SETTINGS.school_name || 'DE-BRIGHT TALENTED KIDS SCHOOL'}</h2>
          <p style="font-size:1rem; color:#444; font-weight:600;">Sonitra Road, Amasaman, Accra</p>
          <h3 style="margin-top:1.5rem; color:var(--accent); font-size:1.4rem;">CLASS ` + (currentUser.class || '') + ` TIMETABLE</h3>
        </div>
        <table style="width:100%; border-collapse: collapse; margin-bottom: 2rem; text-align:center; background:transparent; position:relative; z-index:2; border:2px solid #000;">
          <thead>
            <tr style="background:rgba(240,244,248,0.9);">
              <th style="padding:15px; border:2px solid #333; font-size:1.1rem; color:#000;">Time</th>
              <th style="padding:15px; border:2px solid #333; font-size:1.1rem; color:#000;">Mon</th>
              <th style="padding:15px; border:2px solid #333; font-size:1.1rem; color:#000;">Tue</th>
              <th style="padding:15px; border:2px solid #333; font-size:1.1rem; color:#000;">Wed</th>
              <th style="padding:15px; border:2px solid #333; font-size:1.1rem; color:#000;">Thu</th>
              <th style="padding:15px; border:2px solid #333; font-size:1.1rem; color:#000;">Fri</th>
            </tr>
          </thead>
          <tbody>` + tbodyHTML + `</tbody>
        </table>
      </div>
      <div class="print-footer-actions" style="padding:1.5rem;display:flex;gap:.7rem;border-top:1px solid var(--lms-border);">
        <button class="btn-lms-primary" style="flex:1;background:var(--lms-green);" onclick="window.print()"><i class="fas fa-download"></i> Download PDF / Print</button>
        <button class="btn-outline" onclick="closeModal('view-timetable-modal')">Close</button>
      </div>
    </div>
  `;
  openModal('view-timetable-modal');
};


/* ====================== MODERN UI PAGE DEFINITIONS ====================== */
const pages = {

'a-dashboard':() => `
  <div class="welcome-banner" style="background: linear-gradient(135deg, #1e293b, #0f172a); border-radius: 16px; padding: 2rem; color: white; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 10px 20px rgba(0,0,0,0.15); margin-bottom: 2rem;">
    <div class="wb-text">
      <div class="wb-tag" style="background: rgba(255,255,255,0.15); padding: 4px 12px; border-radius: 99px; font-size: 0.8rem; font-weight: 600; display: inline-block; margin-bottom: 0.8rem;">🔒 Root Access</div>
      <h2 style="font-size: 1.8rem; margin: 0; font-family: var(--font-lms-heading);">System Administrator</h2>
    </div>
    <div class="wb-icon" style="font-size: 4rem; opacity: 0.8;"><i class="fas fa-shield-alt"></i></div>
  </div>
  <div class="stats-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
    <div class="sc" style="background: #fff; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); display: flex; align-items: center; gap: 1rem; border-left: 4px solid var(--lms-blue);">
      <div class="sc-icon" style="width: 48px; height: 48px; background: #eff6ff; color: var(--lms-blue); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;"><i class="fas fa-user-graduate"></i></div>
      <div class="sc-info"><label style="font-size: 0.8rem; color: var(--lms-muted); text-transform: uppercase;">Total Students</label><div style="font-size: 1.5rem; font-weight: 700; color: var(--text);">${STUDENTS_DB.length}</div></div>
    </div>
    <div class="sc" style="background: #fff; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); display: flex; align-items: center; gap: 1rem; border-left: 4px solid var(--lms-green);">
      <div class="sc-icon" style="width: 48px; height: 48px; background: #f0fdf4; color: var(--lms-green); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;"><i class="fas fa-chalkboard-teacher"></i></div>
      <div class="sc-info"><label style="font-size: 0.8rem; color: var(--lms-muted); text-transform: uppercase;">Total Teachers</label><div style="font-size: 1.5rem; font-weight: 700; color: var(--text);">${TEACHERS_DB.length}</div></div>
    </div>
    <div class="sc" style="background: #fff; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); display: flex; align-items: center; gap: 1rem; border-left: 4px solid var(--lms-purple);">
      <div class="sc-icon" style="width: 48px; height: 48px; background: #f5f3ff; color: var(--lms-purple); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;"><i class="fas fa-newspaper"></i></div>
      <div class="sc-info"><label style="font-size: 0.8rem; color: var(--lms-muted); text-transform: uppercase;">Published Articles</label><div style="font-size: 1.5rem; font-weight: 700; color: var(--text);">${ARTICLES_DB.length}</div></div>
    </div>
  </div>
`,

'a-users':() => `
  <div class="page-header" style="margin-bottom: 2rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
    <div><h2>User Management</h2><span style="color:var(--lms-muted);">Add, edit, or remove users globally</span></div>
    <div style="display:flex;gap:0.5rem;">
      <button class="btn-lms-primary" style="padding:.6rem 1.2rem; border-radius:8px; background:var(--lms-blue);" onclick="openAdminUserModal('teacher')"><i class="fas fa-chalkboard-teacher"></i> Add Teacher</button>
      <button class="btn-lms-primary" style="padding:.6rem 1.2rem; border-radius:8px; background:var(--lms-green); border-color:var(--lms-green);" onclick="openAdminUserModal('student')"><i class="fas fa-user-graduate"></i> Add Student</button>
    </div>
  </div>
  
  <div style="display:grid; grid-template-columns: 1fr; gap: 2rem;">
    <div class="panel" style="border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); overflow: hidden;">
      <div class="panel-head" style="padding: 1.2rem 1.5rem; border-bottom: 1px solid var(--lms-border);">
        <h3 style="margin:0;"><i class="fas fa-chalkboard-teacher" style="color:var(--lms-blue); margin-right:8px;"></i> Staff Directory</h3>
      </div>
      <div style="overflow-x: auto;">
        <table class="lms-tbl" style="width: 100%; min-width: 600px;">
          <thead style="background: var(--lms-surface);">
            <tr><th style="padding: 1rem;">ID</th><th>Name</th><th>Class Assigned</th><th style="text-align:center;">Action</th></tr>
          </thead>
          <tbody>
            ${TEACHERS_DB.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--lms-muted);">No teachers found.</td></tr>' : 
              TEACHERS_DB.map(t => `
              <tr style="border-bottom: 1px solid var(--lms-border);">
                <td style="padding: 1rem; font-weight:600;">${t.id}</td>
                <td><div style="display:flex;align-items:center;gap:.8rem;"><div class="std-av">${t.initials}</div><strong>${t.name}</strong></div></td>
                <td><span class="chip blue">${t.class_assigned || 'None'}</span></td>
                <td style="text-align:center;"><button class="btn-danger" style="padding:.4rem .8rem;font-size:.75rem;" onclick="deleteTeacher('${t.id}')"><i class="fas fa-trash"></i> Delete</button></td>
              </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel" style="border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); overflow: hidden;">
      <div class="panel-head" style="padding: 1.2rem 1.5rem; border-bottom: 1px solid var(--lms-border);">
        <h3 style="margin:0;"><i class="fas fa-user-graduate" style="color:var(--lms-green); margin-right:8px;"></i> Student Directory</h3>
      </div>
      <div style="overflow-x: auto;">
        <table class="lms-tbl" style="width: 100%; min-width: 600px;">
          <thead style="background: var(--lms-surface);">
            <tr><th style="padding: 1rem;">ID</th><th>Name</th><th>Class</th><th>Contact</th><th style="text-align:center;">Action</th></tr>
          </thead>
          <tbody>
            ${STUDENTS_DB.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--lms-muted);">No students found.</td></tr>' : 
              STUDENTS_DB.map(s => `
              <tr style="border-bottom: 1px solid var(--lms-border);">
                <td style="padding: 1rem; font-weight:600;">${s.id}</td>
                <td><strong>${s.name}</strong></td>
                <td><span class="chip green">${s.class}</span></td>
                <td>${s.parent_contact}</td>
                <td style="text-align:center;"><button class="btn-danger" style="padding:.4rem .8rem;font-size:.75rem;" onclick="deleteStudent('${s.id}', true)"><i class="fas fa-trash"></i> Delete</button></td>
              </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>
`,

'a-articles':() => `
  <div class="page-header" style="margin-bottom: 2rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
    <div><h2>Content Management System</h2><span style="color:var(--lms-muted);">Write and publish articles to the main website</span></div>
    <button class="btn-lms-primary" style="padding:.6rem 1.2rem; border-radius:8px;" onclick="openArticleModal()"><i class="fas fa-pen"></i> Draft New Article</button>
  </div>
  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
    ${ARTICLES_DB.length === 0 ? `<div class="empty-state" style="grid-column: 1 / -1; padding:4rem;background:#fff;border-radius:12px;text-align:center;"><p>No articles published yet.</p></div>` : 
      ARTICLES_DB.map(a => `
        <div style="background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.04); display:flex; flex-direction:column;">
          ${a.cover_image ? `<img src="${a.cover_image}" style="width:100%; height:160px; object-fit:cover; border-bottom:1px solid var(--lms-border);">` : `<div style="width:100%; height:160px; background:var(--lms-surface); display:flex; align-items:center; justify-content:center; color:var(--lms-muted);"><i class="fas fa-image fa-2x"></i></div>`}
          <div style="padding:1.5rem; flex:1; display:flex; flex-direction:column;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.8rem;">
              <div>
                 <span class="chip ${a.status==='published'?'green':'grey'}">${a.status==='published'?'Published':'Draft'}</span>
                 <span style="font-size:0.75rem; color:var(--lms-muted); margin-left:8px; font-weight:bold;">${a.category || 'School Update'}</span>
              </div>
              <span style="font-size:0.75rem; color:var(--lms-muted);">${fmtDate(a.created_at)}</span>
            </div>
            <strong style="font-size:1.1rem; margin-bottom:0.5rem; color:var(--text); line-height:1.4;">${a.title}</strong>
            <p style="font-size:0.85rem; color:var(--lms-muted); margin-bottom:1rem; flex:1;">${a.excerpt || 'No excerpt provided.'}</p>
            <div style="display:flex; gap:0.5rem; margin-top:auto;">
              <button class="btn-outline" style="flex:1; padding:0.5rem; border-radius:6px;" onclick="openArticleModal('${a.id}')"><i class="fas fa-edit"></i> Edit</button>
              <button class="btn-danger" style="padding:0.5rem; border-radius:6px;" onclick="deleteArticle('${a.id}')"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        </div>
      `).join('')}
  </div>
`,

'a-gallery':() => `
  <div class="page-header" style="margin-bottom: 2rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
    <div><h2>Gallery Management</h2><span style="color:var(--lms-muted);">Upload and manage school photos</span></div>
    <button class="btn-lms-primary" style="padding:.6rem 1.2rem; border-radius:8px;" onclick="openGalleryUploadModal()"><i class="fas fa-upload"></i> Upload Photo</button>
  </div>
  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.5rem;">
    ${GALLERY_DB.length === 0 ? '<div class="empty-state" style="grid-column: 1 / -1; padding:4rem;background:#fff;border-radius:12px;text-align:center;"><p>No images in gallery.</p></div>' : 
      GALLERY_DB.map(img => `
        <div style="background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.04); display:flex; flex-direction:column;">
          <img src="${img.image_url}" style="width:100%; height:180px; object-fit:cover; border-bottom:1px solid var(--lms-border);">
          <div style="padding:1rem; display:flex; justify-content:space-between; align-items:center;">
            <strong style="font-size:1rem; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${img.title || 'Untitled'}">${img.title || 'Untitled'}</strong>
            <button class="btn-danger" style="padding:0.4rem 0.6rem; border-radius:6px; flex-shrink:0;" onclick="deleteGalleryImage('${img.id}')" title="Delete Image"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      `).join('')}
  </div>
`,

'a-settings':() => `
  <div class="page-header" style="margin-bottom: 2rem;"><h2>Global Settings</h2><span style="color:var(--lms-muted);">Update system parameters</span></div>
  <div style="max-width: 600px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem;">
    <div class="panel" style="border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); overflow: hidden;">
      <div class="panel-head" style="padding: 1.2rem 1.5rem; border-bottom: 1px solid var(--lms-border);">
        <h3 style="margin:0;"><i class="fas fa-cogs" style="color:var(--lms-muted); margin-right:8px;"></i> Configuration</h3>
      </div>
      <div style="padding: 1.5rem;">
        <div class="lms-form-group"><label>School Name</label><input type="text" id="set-school" value="${SITE_SETTINGS.school_name || ''}"></div>
        <div class="lms-form-group"><label>Contact Phone</label><input type="text" id="set-phone" value="${SITE_SETTINGS.contact_phone || ''}"></div>
        <div class="lms-form-group"><label>Contact Email</label><input type="email" id="set-email" value="${SITE_SETTINGS.contact_email || ''}"></div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
          <div class="lms-form-group"><label>Current Term</label><input type="text" id="set-term" value="${SITE_SETTINGS.current_term || ''}"></div>
          <div class="lms-form-group"><label>Academic Year</label><input type="text" id="set-year" value="${SITE_SETTINGS.academic_year || ''}"></div>
        </div>
        <div class="lms-form-group"><label>Homepage Announcement</label><textarea id="set-ann" rows="3" placeholder="Will display a banner on the main website...">${SITE_SETTINGS.homepage_announcement || ''}</textarea></div>
      </div>
    </div>

    <div class="panel" style="border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); overflow: hidden;">
      <div class="panel-head" style="padding: 1.2rem 1.5rem; border-bottom: 1px solid var(--lms-border);">
        <h3 style="margin:0;"><i class="fas fa-window-restore" style="color:var(--lms-muted); margin-right:8px;"></i> Homepage Popup Settings</h3>
      </div>
      <div style="padding: 1.5rem;">
        <div class="lms-form-group" style="display:flex; align-items:center; gap:0.5rem; margin-bottom:1rem; background: var(--lms-surface); padding: 1rem; border-radius: 8px;">
            <input type="checkbox" id="set-popup-active" ${SITE_SETTINGS.popup_active ? 'checked' : ''} style="width:18px; height:18px; cursor:pointer;">
            <label for="set-popup-active" style="margin:0; cursor:pointer; font-weight: bold; color: var(--text);">Enable Popup on Homepage</label>
        </div>
        <div class="lms-form-group"><label>Badge Text</label><input type="text" id="set-popup-badge" value="${SITE_SETTINGS.popup_badge || ''}" placeholder="e.g. HIRING"></div>
        <div class="lms-form-group"><label>Title</label><input type="text" id="set-popup-title" value="${SITE_SETTINGS.popup_title || ''}" placeholder="e.g. Teachers Needed"></div>
        <div class="lms-form-group"><label>Description</label><textarea id="set-popup-desc" rows="3" placeholder="Popup message...">${SITE_SETTINGS.popup_desc || ''}</textarea></div>
        <div class="lms-form-group"><label>List Items (Press Enter for new line)</label><textarea id="set-popup-list" rows="4" placeholder="Pre-School / Creche\nPrimary Department\nJ.H.S Subject Teachers">${Array.isArray(SITE_SETTINGS.popup_list) ? SITE_SETTINGS.popup_list.join('\n') : ''}</textarea></div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
          <div class="lms-form-group"><label>Button Text</label><input type="text" id="set-popup-btn-text" value="${SITE_SETTINGS.popup_btn_text || ''}" placeholder="e.g. Apply Now"></div>
          <div class="lms-form-group"><label>Button Link</label><input type="text" id="set-popup-btn-link" value="${SITE_SETTINGS.popup_btn_link || ''}" placeholder="e.g. tel:+233..."></div>
        </div>
      </div>
    </div>
    <button class="btn-lms-primary" style="width: 100%; padding: 1rem; font-size: 1.1rem;" onclick="saveSiteSettings()"><i class="fas fa-save"></i> Save All Configurations</button>
  </div>
`,

/* STUDENT ATTENDANCE PAGE */
's-attendance':() => {
    const myAtt = ATTENDANCE_RECORDS.filter(a => a.student_id === currentUser.id).sort((a,b) => new Date(b.date) - new Date(a.date));
    const total = myAtt.length;
    const pres = myAtt.filter(a => a.status === 'present').length;
    const abs = myAtt.filter(a => a.status === 'absent').length;
    const pct = total > 0 ? Math.round((pres/total)*100) : 100;

    return `
    <div class="page-header" style="margin-bottom: 2rem;">
      <h2>My Attendance</h2>
      <span style="color:var(--lms-muted);">View your daily attendance history</span>
    </div>

    <div class="stats-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
      <div class="sc" style="background:#fff; padding:1.5rem; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.03); border-left:4px solid var(--lms-blue);">
        <div class="sc-info">
          <label style="font-size:0.8rem; color:var(--lms-muted); text-transform:uppercase;">Overall Rate</label>
          <div style="font-size:1.5rem; font-weight:700; color:var(--text);">${pct}%</div>
        </div>
      </div>
      <div class="sc" style="background:#fff; padding:1.5rem; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.03); border-left:4px solid var(--lms-green);">
        <div class="sc-info">
          <label style="font-size:0.8rem; color:var(--lms-muted); text-transform:uppercase;">Days Present</label>
          <div style="font-size:1.5rem; font-weight:700; color:var(--text);">${pres}</div>
        </div>
      </div>
      <div class="sc" style="background:#fff; padding:1.5rem; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.03); border-left:4px solid var(--lms-red);">
        <div class="sc-info">
          <label style="font-size:0.8rem; color:var(--lms-muted); text-transform:uppercase;">Days Absent</label>
          <div style="font-size:1.5rem; font-weight:700; color:var(--text);">${abs}</div>
        </div>
      </div>
    </div>

    <div class="panel" style="border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); overflow: hidden;">
      <div class="panel-head" style="padding: 1.2rem 1.5rem; border-bottom: 1px solid var(--lms-border);">
        <h3 style="margin:0;">Recent Records</h3>
      </div>
      <div style="overflow-x: auto;">
        <table class="lms-tbl" style="width: 100%; min-width: 600px;">
          <thead style="background: var(--lms-surface);">
            <tr><th style="padding: 1rem;">Date</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${myAtt.length === 0 ? '<tr><td colspan="2" style="text-align:center; padding:2rem; color:var(--lms-muted);">No attendance records found yet.</td></tr>' : 
              myAtt.map(a => `
              <tr style="border-bottom: 1px solid var(--lms-border);">
                <td style="padding: 1rem; font-weight:600;">${fmtDate(a.date)}</td>
                <td><span class="chip ${a.status==='present'?'green':'red'}" style="text-transform:capitalize;">${a.status}</span></td>
              </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
},

's-subjects':()=>`
  <div class="page-header" style="margin-bottom: 2rem;"><h2>My Subjects</h2><span style="color:var(--lms-muted);">Overview of your active courses</span></div>
  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem;">
    ${SUBJECTS.map(s => `
      <div style="background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.04); transition: transform 0.2s ease; cursor: pointer;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
        <div style="height: 60px; background: var(--lms-${s.color || 'blue'}-pale); display: flex; align-items: center; justify-content: center; width: 60px; border-radius: 12px; margin: 1.5rem 0 0 1.5rem; color: var(--lms-${s.color || 'blue'}); font-size: 1.8rem;"><i class="${s.icon || 'fas fa-book'}"></i></div>
        <div style="padding: 1.5rem;">
          <h3 style="margin: 0 0 0.2rem 0; font-size: 1.1rem; color: var(--text);">${s.name}</h3>
          <p style="margin: 0 0 1rem 0; font-size: 0.85rem; color: var(--lms-muted);"><i class="fas fa-chalkboard-teacher"></i> ${s.teacher_name || s.teacher}</p>
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 0.4rem; font-weight: 600;"><span>Progress</span><span>${s.progress}%</span></div>
          ${renderProgressBar(s.progress, `var(--lms-${s.color || 'blue'})`)}
        </div>
      </div>
    `).join('')}
  </div>`,

's-timetable':() => {
  let tbodyHTML = '';
  TT_TIMES.forEach((time, i) => {
    const isAllBreak = TIMETABLE[i].every(s => s.toUpperCase().includes('BREAK'));
    const isAllLunch = TIMETABLE[i].every(s => s.toUpperCase().includes('LUNCH'));
    let rowContent = '';

    if (isAllBreak || isAllLunch) {
      const label = isAllBreak ? 'MORNING BREAK' : 'LUNCH BREAK';
      rowContent = '<td colspan="5" style="background: var(--lms-surface); letter-spacing: 4px; font-weight: 700; color: var(--lms-muted); text-transform:uppercase;">' + label + '</td>';
    } else {
      rowContent = ['Mon','Tue','Wed','Thu','Fri'].map((day, j) => {
        const sub = TIMETABLE[i]?.[j] || '-';
        const uSub = sub.toUpperCase();
        let colorClass = TT_COLORS[sub] || 'grey';
        
        if(colorClass === 'grey') {
            if(uSub.includes('MATH')) colorClass = 'filled-gold';
            else if(uSub.includes('ENG')) colorClass = 'filled-blue';
            else if(uSub.includes('SCI')) colorClass = 'filled-green';
            else if(uSub.includes('ART')) colorClass = 'filled-gold';
        }

        if(uSub.includes('BREAK') || uSub.includes('LUNCH')) {
            const displaySub = uSub.includes('BREAK') ? 'Break' : 'Lunch';
            return '<td style="padding: 0.5rem;"><span class="chip ' + (uSub.includes('BREAK')?'gold':'green') + '" style="display: inline-block; width: 100%; padding: 0.6rem; border-radius: 8px;">' + displaySub + '</span></td>';
        }
        return '<td style="padding: 0.5rem;"><span class="chip ' + colorClass + '" style="display: inline-block; width: 100%; padding: 0.6rem; border-radius: 8px;">' + sub + '</span></td>';
      }).join('');
    }
    tbodyHTML += '<tr style="border-bottom: 1px solid var(--lms-border);"><td style="padding: 1rem; font-weight: 600; color: var(--primary); white-space: nowrap;">' + time + '</td>' + rowContent + '</tr>';
  });

  return `
  <div class="page-header" style="margin-bottom: 2rem; display:flex; justify-content:space-between; align-items:center;">
    <div><h2>Class Timetable</h2><span style="color:var(--lms-muted);">${SITE_SETTINGS.current_term || 'Term 2'} Schedule</span></div>
    <button class="btn-outline" style="padding: 0.6rem 1.2rem; border-radius: 8px;" onclick="viewPrintableTimetable()"><i class="fas fa-print"></i> Download PDF</button>
  </div>
  <div class="panel" style="border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); overflow: hidden;">
    <div style="overflow-x: auto;">
      <table class="lms-tbl" style="width: 100%; min-width: 700px; text-align: center;">
        <thead style="background: var(--lms-surface);">
          <tr><th style="padding: 1rem;">Time</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th></tr>
        </thead>
        <tbody>
          ` + tbodyHTML + `
        </tbody>
      </table>
    </div>
  </div>`;
},

's-assignments': () => {
  return `
  <div class="page-header" style="margin-bottom: 2rem;">
    <h2>Assignments</h2>
    <span style="color:var(--lms-muted);">Your pending and submitted tasks</span>
  </div>
  <div style="display: flex; flex-direction: column; gap: 1rem;">
    ${ASSIGNMENTS.length === 0 ? '<div class="empty-state" style="padding:4rem;background:#fff;border-radius:12px;text-align:center;"><i class="fas fa-check-circle" style="font-size:3rem;color:var(--lms-green);margin-bottom:1rem;"></i><p>You are all caught up!</p></div>' : 
      ASSIGNMENTS.map(a => {
        const submission = SUBMISSIONS.find(s => String(s.assignment_id) === String(a.id) && s.student_id === currentUser.id);
        const isSubmitted = !!submission;
        const isGraded = isSubmitted && submission.status === 'graded';
        
        return `
        <div style="background: #fff; padding: 1.5rem; border-radius: 12px; border-left: 5px solid ${isGraded ? 'var(--lms-gold)' : isSubmitted ? 'var(--lms-green)' : `var(--lms-${a.color || 'blue'})`}; box-shadow: 0 4px 15px rgba(0,0,0,0.03); display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; align-items: center; transition: all 0.2s ease;">
          <div style="flex: 1; min-width: 250px;">
              <div style="display: flex; gap: 0.8rem; align-items: center; margin-bottom: 0.6rem;">
                <span class="chip ${isGraded ? 'gold' : isSubmitted ? 'green' : (a.color || 'blue')}">${a.subject}</span>
                ${isGraded ? `<span class="chip gold" style="background:#fefce8; color:#854d0e;"><i class="fas fa-award"></i> Graded: ${submission.grade}</span>` : isSubmitted ? `<span class="chip green" style="background:#dcfce7; color:#166534;"><i class="fas fa-check"></i> Submitted</span>` : `<span style="font-size: 0.75rem; color: var(--lms-muted); font-weight: 600; text-transform: uppercase;"><i class="fas fa-clock"></i> Due: ${fmtDate(a.due) || 'No date'}</span>`}
              </div>
              <strong style="font-size: 1.15rem; color: var(--text); display: block; margin-bottom: 0.4rem;">${a.title}</strong>
              <p style="font-size: 0.9rem; color: #64748b; margin: 0; line-height: 1.5;">${a.desc || 'No description provided.'}</p>
              ${a.attachment_url ? `<div style="margin-top:0.8rem;"><a href="${a.attachment_url}" target="_blank" style="font-size:0.8rem; color:var(--primary); text-decoration:none;"><i class="fas fa-file-download"></i> Attached File</a></div>` : ''}
              
              ${isGraded && submission.feedback ? `<div style="margin-top:1rem; background: #fef9c3; padding: 1rem; border-radius: 8px; border-left: 3px solid #eab308;"><strong style="font-size:0.8rem; color:#a16207; display:block; margin-bottom: 4px;"><i class="fas fa-comment-dots"></i> Teacher's Feedback:</strong><span style="font-size:0.9rem; color:var(--text);">${submission.feedback}</span></div>` : ''}
          </div>
          <div>
            ${!isSubmitted ? 
              `<button class="btn-lms-primary" style="padding: 0.6rem 1.5rem; border-radius: 8px; box-shadow: 0 4px 10px rgba(13, 59, 102, 0.2);" onclick="openSubmitModal('${a.id}')"><i class="fas fa-cloud-upload-alt"></i> Submit Work</button>` 
              : isGraded ?
              `<button class="btn-gold" style="padding: 0.6rem 1.5rem; border-radius: 8px; border:none; color:#000;" onclick="toast('You scored ${submission.grade} on this assignment!')"><i class="fas fa-star"></i> View Result</button>`
              :
              `<button class="btn-outline" style="padding: 0.6rem 1.5rem; border-radius: 8px; cursor: default; color: var(--lms-green); border-color: var(--lms-green);"><i class="fas fa-check-double"></i> Under Review</button>`
            }
          </div>
        </div>
      `}).join('')}
  </div>`

''s-ai':()=>`
  <div style="height: calc(100vh - 180px); background: #fff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); display: flex; flex-direction: column; overflow: hidden;">
    <div style="padding: 1.5rem; background: var(--primary); color: white; display: flex; align-items: center; gap: 1rem;">
      <div style="width: 45px; height: 45px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">🤖</div>
      <div>
        <h3 style="margin: 0; font-size: 1.2rem; font-family: var(--font-lms-heading);">De-Bright AI Tutor</h3>
        <span style="font-size: 0.8rem; opacity: 0.8;">Powered by Claude AI</span>
      </div>
    </div>
    
    <!-- ADDED ID: ai-chat-window -->
    <div id="ai-chat-window" style="flex: 1; padding: 2rem; overflow-y: auto; background: #f8fafc; display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="align-self: flex-start; max-width: 80%; background: #fff; padding: 1rem 1.5rem; border-radius: 0 16px 16px 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); font-size: 0.95rem; line-height: 1.5; color: var(--text);">
        Hello ${currentUser.name.split(' ')[0]}! I am your personal AI study assistant. Do you need help with your assignments or preparing for a quiz?
      </div>
    </div>
    
    <div style="padding: 1.5rem; background: #fff; border-top: 1px solid var(--lms-border); display: flex; gap: 1rem;">
      <!-- ADDED ID AND ONKEYDOWN EVENT -->
      <input type="text" id="ai-chat-input" placeholder="Ask a question..." onkeydown="if(event.key==='Enter') window.sendAiTutorMsg()" style="flex: 1; padding: 1rem 1.5rem; border: 1px solid var(--lms-border); border-radius: 99px; outline: none; font-family: var(--font-lms); font-size: 0.95rem; background: #f8fafc;">
      
      <!-- ADDED ONCLICK EVENT -->
      <button onclick="window.sendAiTutorMsg()" style="width: 50px; height: 50px; border-radius: 50%; background: var(--primary); color: white; border: none; cursor: pointer; font-size: 1.2rem; box-shadow: 0 4px 10px rgba(13, 59, 102, 0.3);"><i class="fas fa-paper-plane"></i></button>
    </div>
  </div>`,


't-dashboard':()=>`
  <div class="welcome-banner" style="background: linear-gradient(135deg, #0f172a, var(--primary)); border-radius: 16px; padding: 2rem; color: white; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 10px 20px rgba(0,0,0,0.15); margin-bottom: 2rem;">
    <div class="wb-text">
      <div class="wb-tag" style="background: rgba(255,255,255,0.15); padding: 4px 12px; border-radius: 99px; font-size: 0.8rem; font-weight: 600; display: inline-block; margin-bottom: 0.8rem;">📋 Class Teacher — ${currentUser.class}</div>
      <h2 style="font-size: 1.8rem; margin: 0; font-family: var(--font-lms-heading);">Good day, ${currentUser.name.split(' ')[1]||currentUser.name}! 👩‍🏫</h2>
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
      <div class="sc-info"><label style="font-size: 0.8rem; color: var(--lms-muted); text-transform: uppercase;">Submissions</label><div style="font-size: 1.5rem; font-weight: 700; color: var(--text);">${SUBMISSIONS.filter(s=>s.class===currentUser.class || (STUDENTS_DB.find(st=>String(st.id)===String(s.student_id))||{}).class===currentUser.class).length}</div></div>
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
              ${a.attachment_url ? `<div style="margin-top:0.6rem;"><a href="${a.attachment_url}" target="_blank" style="font-size:0.8rem; color:var(--primary); text-decoration:none;"><i class="fas fa-file-download"></i> Attached File</a></div>` : ''}
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn-outline" style="padding: 0.5rem 1rem; border-radius: 8px;" onclick="openAssignmentModal('${a.id}')"><i class="fas fa-edit"></i> Edit</button>
            <button class="btn-danger" style="padding: 0.5rem 1rem; border-radius: 8px;" onclick="deleteAssignment('${a.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      `).join('')
    }
  </div>`,

't-submissions':()=>{
  const classSubmissions = SUBMISSIONS.filter(s => s.class === currentUser.class || (STUDENTS_DB.find(st=>String(st.id)===String(s.student_id))||{}).class === currentUser.class);
  return `
  <div class="page-header" style="margin-bottom: 2rem;"><h2>Submissions Inbox</h2><span style="color:var(--lms-muted);">Review and grade student work for ${currentUser.class}</span></div>
  <div class="panel" style="border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); overflow: hidden;">
    <div style="overflow-x: auto;">
      <table class="lms-tbl" style="width: 100%; min-width: 600px;">
        <thead style="background: var(--lms-surface);">
          <tr><th style="padding: 1rem; text-align:left;">Student</th><th style="text-align:left;">Assignment Details</th><th>Status</th><th style="text-align:center;">Action</th></tr>
        </thead>
        <tbody>
          ${classSubmissions.length === 0 ? '<tr><td colspan="4" style="text-align:center;padding:3rem;color:var(--lms-muted);">No submissions received yet.</td></tr>' : 
            classSubmissions.map((sub) => {
              const asgn = ASSIGNMENTS.find(a => String(a.id) === String(sub.assignment_id));
              return `
              <tr style="border-bottom: 1px solid var(--lms-border);">
                <td style="padding: 1rem;">
                  <div style="display:flex;align-items:center;gap:.8rem;">
                    <div class="std-av" style="width:32px;height:32px;font-size:.8rem;">${getInitials(sub.student_name)}</div>
                    <div><strong style="display:block;font-size:.9rem;">${sub.student_name}</strong><span style="font-size:.75rem;color:var(--lms-muted);">${sub.student_id}</span></div>
                  </div>
                </td>
                <td>
                  <strong style="font-size:0.9rem; display:block; color:var(--primary);">${asgn ? asgn.title : 'Unknown Assignment'}</strong>
                  ${sub.comments ? `<div style="font-size:0.75rem; color:var(--lms-muted); margin-top:4px;">"<i>${sub.comments}</i>"</div>` : ''}
                  
                  <div style="display:flex; gap:0.5rem; margin-top: 8px;">
                    ${sub.typed_response ? `<button class="btn-outline" style="padding:0.2rem 0.6rem;font-size:0.7rem;border-radius:4px;" onclick="viewTypedResponse('${sub.id}')"><i class="fas fa-align-left"></i> Read Text</button>` : ''}
                    ${sub.file_url ? `<a href="${sub.file_url}" target="_blank" class="btn-outline" style="padding:0.2rem 0.6rem;font-size:0.7rem;border-radius:4px;text-decoration:none;"><i class="fas fa-paperclip"></i> File</a>` : ''}
                    ${sub.link ? `<a href="${sub.link}" target="_blank" class="btn-outline" style="padding:0.2rem 0.6rem;font-size:0.7rem;border-radius:4px;text-decoration:none;"><i class="fas fa-link"></i> Link</a>` : ''}
                  </div>
                </td>
                <td style="text-align:center;"><span class="chip ${sub.status==='graded'?'green':'gold'}">${sub.status==='graded'?'Graded':'Needs Grading'}</span></td>
                <td style="text-align:center; padding: 1rem;">
                  ${sub.status === 'graded' 
                    ? `<div style="font-size:0.85rem; color:var(--lms-green); font-weight:bold; margin-bottom:4px;"><i class="fas fa-check-circle"></i> Graded: ${sub.grade || ''}</div>
                       <button class="btn-outline" style="padding:0.3rem 0.6rem;font-size:0.7rem;border-radius:4px;" onclick="openGradeModal('${sub.id}')"><i class="fas fa-edit"></i> Edit Grade</button>` 
                    : `<button class="btn-lms-primary" style="padding:0.5rem 1rem;font-size:0.8rem;border-radius:6px;width:100%; box-shadow: 0 4px 10px rgba(13, 59, 102, 0.2);" onclick="openGradeModal('${sub.id}')"><i class="fas fa-marker"></i> Grade Work</button>`
                  }
                </td>
              </tr>
            `}).join('')}
        </tbody>
      </table>
    </div>
  </div>`
},

/* --- TEACHER QUIZ PAGE --- */
't-quiz': () => {
  const classQuizzes = QUIZZES.filter(q => q.class === currentUser.class);
  return `
  <div class="page-header" style="margin-bottom: 2rem; display:flex; justify-content:space-between; align-items:center;">
    <div><h2>Quiz Manager</h2><span style="color:var(--lms-muted);">Manage timed quizzes for ${currentUser.class}</span></div>
    <button class="btn-lms-primary" style="padding: 0.6rem 1.2rem; border-radius: 8px;" onclick="openQuizBuilder()"><i class="fas fa-plus"></i> Create Quiz</button>
  </div>
  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
    ${classQuizzes.length === 0 ? `<div class="empty-state" style="grid-column: 1 / -1; padding:4rem;background:#fff;border-radius:12px;text-align:center;"><p>No quizzes created yet.</p></div>` : 
      classQuizzes.map(q => {
        const subs = QUIZ_SUBMISSIONS.filter(s => s.quiz_id === q.id);
        return `
        <div style="background:#fff; padding:1.5rem; border-radius:12px; border-left:5px solid var(--accent); box-shadow:0 4px 15px rgba(0,0,0,0.04); display:flex; flex-direction:column; gap:1rem;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
              <span class="chip purple">${q.subject}</span>
              <span style="font-size:0.8rem; color:var(--lms-muted);"><i class="fas fa-stopwatch"></i> ${q.duration} mins</span>
            </div>
            <strong style="font-size:1.1rem;">${q.title}</strong>
            <div style="font-size:0.85rem; color:var(--lms-muted); margin-top:0.5rem;">${q.questions.length} Questions · ${q.reveal_mode === 'instant' ? 'Instant Grading' : 'Manual Grading'}</div>
          </div>
          <div style="display:flex; gap:0.5rem; margin-top:auto;">
            <button class="btn-lms-primary" style="flex:1; padding:0.5rem; border-radius:6px; font-size:0.85rem;" onclick="viewQuizResults('${q.id}')"><i class="fas fa-chart-bar"></i> Results (${subs.length})</button>
            <button class="btn-danger" style="padding:0.5rem; border-radius:6px;" onclick="deleteQuiz('${q.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      `}).join('')}
  </div>
  `;
},

/* --- STUDENT QUIZ PAGE --- */
's-quiz': () => {
  const classQuizzes = QUIZZES.filter(q => q.class === currentUser.class && q.status === 'active');
  return `
  <div class="page-header" style="margin-bottom: 2rem;"><h2>Active Quizzes</h2><span style="color:var(--lms-muted);">Take your timed assessments</span></div>
  <div style="display: flex; flex-direction: column; gap: 1rem;">
    ${classQuizzes.length === 0 ? `<div class="empty-state" style="padding:4rem;background:#fff;border-radius:12px;text-align:center;"><i class="fas fa-clipboard-check" style="font-size:3rem;color:var(--lms-gold);margin-bottom:1rem;"></i><p>No active quizzes at the moment.</p></div>` : 
      classQuizzes.map(q => {
        const sub = QUIZ_SUBMISSIONS.find(s => s.quiz_id === q.id && s.student_id === currentUser.id);
        const isDone = !!sub;
        return `
        <div style="background:#fff; padding:1.5rem; border-radius:12px; border-left:5px solid ${isDone ? 'var(--lms-green)' : 'var(--lms-gold)'}; box-shadow:0 4px 15px rgba(0,0,0,0.03); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
          <div>
            <div style="margin-bottom:0.4rem;"><span class="chip ${isDone ? 'green' : 'gold'}">${q.subject}</span> <span style="font-size:0.8rem; color:var(--lms-muted); margin-left:0.5rem;"><i class="fas fa-stopwatch"></i> ${q.duration} minutes</span></div>
            <strong style="font-size:1.15rem; color:var(--text);">${q.title}</strong>
            <p style="font-size:0.9rem; color:#64748b; margin:0.3rem 0 0 0;">${q.questions.length} Multiple Choice Questions</p>
          </div>
          <div>
            ${!isDone ? 
              `<button class="btn-lms-primary" style="padding:0.6rem 1.5rem; border-radius:8px; background:var(--accent);" onclick="startQuizPlayer('${q.id}')"><i class="fas fa-play"></i> Start Quiz</button>` 
            : q.reveal_mode === 'instant' ? 
              `<div style="text-align:center; padding:0.5rem 1rem; background:#dcfce7; color:#166534; border-radius:8px; font-weight:bold;">Score: ${sub.score} / ${sub.total_questions}</div>`
            : 
              `<div style="text-align:center; padding:0.5rem 1rem; background:#f1f5f9; color:#475569; border-radius:8px;"><i class="fas fa-check-double"></i> Submitted</div>`
            }
          </div>
        </div>
      `}).join('')}
  </div>
  `;
},

's-grades':()=>{
  const myReports = REPORT_CARDS.filter(r => r.student_id === currentUser.id);
  return `
  <div class="page-header" style="margin-bottom: 2rem;"><h2>Grades & Reports</h2><span style="color:var(--lms-muted);">${SITE_SETTINGS.current_term || 'Term 2'} · ${SITE_SETTINGS.academic_year || '2025/26'}</span></div>
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
            <td style="padding: 1rem;"><strong>${g.subject_name || g.subject}</strong></td>
            <td style="text-align:center;">${g.class_score || g.classScore}</td>
            <td style="text-align:center;">${g.exam_score || g.examScore}</td>
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
  <div class="page-header" style="margin-bottom: 2rem;"><h2>Grade Book & Reports</h2><span style="color:var(--lms-muted);">Class ${currentUser.class} · ${SITE_SETTINGS.current_term || 'Term 2'}</span></div>
  <div class="panel" style="border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); overflow: hidden;">
    <div class="panel-head" style="padding: 1.2rem 1.5rem; border-bottom: 1px solid var(--lms-border);">
      <h3 style="margin:0;">Term Assessments</h3>
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
's-resources': () => {
  const classRes = RESOURCES.filter(r => r.class === currentUser.class || r.class === 'All');
  return `
  <div class="page-header" style="margin-bottom: 2rem;"><h2>Study Resources</h2><span style="color:var(--lms-muted);">Course materials & chapters</span></div>
  <div style="display: flex; flex-direction: column; gap: 1rem;">
    ${classRes.length === 0 ? '<div class="empty-state" style="padding:4rem;background:#fff;border-radius:12px;text-align:center;"><i class="fas fa-folder-open" style="font-size:3rem;color:var(--lms-blue);margin-bottom:1rem;"></i><h3 style="color:var(--primary);">No Resources Yet</h3></div>' : 
      classRes.map(r => `
        <div style="background:#fff; border-radius:12px; padding:1.5rem; box-shadow:0 4px 15px rgba(0,0,0,0.03); border-left:5px solid var(--primary); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
          <div>
            <span class="chip blue" style="margin-bottom:8px;">${r.subject}</span>
            <strong style="font-size:1.15rem; display:block; color:var(--text); margin-bottom:4px;">${r.title}</strong>
            <span style="font-size:0.85rem; color:var(--lms-muted);"><i class="fas fa-user-edit"></i> ${r.author_name}</span>
          </div>
          <div>
            <button class="btn-lms-primary" style="padding:0.6rem 1.5rem; border-radius:8px; background:var(--primary);" onclick="openResourceReader('${r.id}')"><i class="fas fa-book-reader"></i> Read Now</button>
          </div>
        </div>
      `).join('')}
  </div>`;
},

't-resources': () => {
  const classRes = RESOURCES.filter(r => r.class === currentUser.class || currentUser.role === 'admin');
  return `
  <div class="page-header" style="margin-bottom: 2rem; display:flex; justify-content:space-between; align-items:center;">
    <div><h2>Resource Library</h2><span style="color:var(--lms-muted);">Author and manage reading materials</span></div>
    <button class="btn-lms-primary" style="padding: 0.6rem 1.2rem; border-radius: 8px;" onclick="openResourceManager()"><i class="fas fa-plus"></i> Create Material</button>
  </div>
  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
    ${classRes.length === 0 ? `<div class="empty-state" style="grid-column: 1 / -1; padding:4rem;background:#fff;border-radius:12px;text-align:center;"><p>No materials published yet.</p></div>` : 
      classRes.map(r => `
        <div style="background:#fff; padding:1.5rem; border-radius:12px; border-left:5px solid var(--lms-blue); box-shadow:0 4px 15px rgba(0,0,0,0.04); display:flex; flex-direction:column; gap:1rem;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
              <span class="chip blue">${r.subject}</span>
              <span style="font-size:0.8rem; color:var(--lms-muted);">${fmtDate(r.created_at)}</span>
            </div>
            <strong style="font-size:1.1rem; color:var(--text);">${r.title}</strong>
          </div>
          <div style="display:flex; gap:0.5rem; margin-top:auto;">
            <button class="btn-outline" style="flex:1; padding:0.5rem; border-radius:6px;" onclick="openResourceReader('${r.id}')"><i class="fas fa-book-reader"></i> Preview</button>
            <button class="btn-danger" style="padding:0.5rem; border-radius:6px;" onclick="deleteResource('${r.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      `).join('')}
  </div>`;
},


't-attendance':() => {
  const today = new Date().toISOString().split('T')[0];
  return `
  <div class="page-header" style="margin-bottom: 2rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
    <div><h2>Attendance Tracker</h2><span style="color:var(--lms-muted);">Daily Register for Class ${currentUser.class}</span></div>
    <div style="display:flex; gap:0.5rem; align-items:center;">
      <input type="date" id="att-date" value="${today}" onchange="renderAttList()" style="padding:0.6rem 1rem; border:1px solid var(--lms-border); border-radius:8px; font-family:var(--font-lms); outline:none;">
      <button class="btn-outline" style="padding: 0.6rem 1.2rem; border-radius: 8px;" onclick="viewAttendancePDF()"><i class="fas fa-print"></i> PDF View</button>
      <button class="btn-lms-primary" style="padding: 0.6rem 1.2rem; border-radius: 8px; box-shadow: 0 4px 10px rgba(13, 59, 102, 0.2);" onclick="saveAttendance()"><i class="fas fa-save"></i> Save</button>
    </div>
  </div>
  <div class="panel" style="border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); overflow: hidden; padding: 1.5rem;">
    <div id="att-mark-list" style="display:flex; flex-direction:column; gap:0.8rem;"></div>
  </div>`;
},

't-timetable': () => {
  const PRESET_OPTS = ['Maths','English','Science','Social Studies','Creative Arts','RME','French','ICT','BREAK','LUNCH'];
  let datalistHTML = '<datalist id="tt-subjects">';
  PRESET_OPTS.forEach(opt => { datalistHTML += '<option value="' + opt + '">'; });
  datalistHTML += '</datalist>';
  
  let tbodyHTML = '';
  
  TT_TIMES.forEach((time, i) => {
    let rowHTML = '';
    ['Mon','Tue','Wed','Thu','Fri'].forEach((day, j) => {
      const sub = TIMETABLE[i]?.[j] || '-';
      rowHTML += '<td style="padding: 0.5rem;"><input type="text" class="tt-select" data-row="' + i + '" data-col="' + j + '" value="' + sub + '" list="tt-subjects" style="width:100%; padding:0.5rem; border:1px solid var(--lms-border); border-radius:6px; font-family:var(--font-lms); font-size:0.8rem; outline:none; background:#fff; text-align:center; font-weight:600; color:var(--text);" onfocus="this.select()" onchange="this.style.borderColor=\'var(--primary)\'"></td>';
    });

    tbodyHTML += '<tr style="border-bottom: 1px solid var(--lms-border); transition: background 0.2s;" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'transparent\'">';
    tbodyHTML += '<td style="padding: 0.5rem; min-width: 140px;">' +
                 '<div style="display:flex; align-items:center; justify-content:center; gap:0.4rem;">' +
                 '<button class="btn-danger" style="padding:0.4rem 0.6rem; border-radius:6px; font-size:0.75rem;" onclick="removeTimetableRow(' + i + ')" title="Remove Row"><i class="fas fa-times"></i></button>' +
                 '<input type="text" class="tt-time-input" data-row="' + i + '" value="' + time + '" style="width:90px; padding:0.5rem; border:1px solid var(--lms-border); border-radius:6px; font-family:var(--font-lms); font-size:0.8rem; outline:none; text-align:center; font-weight:bold; color:var(--primary);">' +
                 '</div></td>';
    tbodyHTML += rowHTML;
    tbodyHTML += '</tr>';
  });

  return `
  <div class="page-header" style="margin-bottom: 2rem; display:flex; justify-content:space-between; align-items:center;">
    <div><h2>Timetable Manager</h2><span style="color:var(--lms-muted);">Edit schedule for ${currentUser.class}</span></div>
    <div style="display:flex; gap:0.5rem;">
      <button class="btn-outline" style="padding: 0.6rem 1.2rem; border-radius: 8px;" onclick="viewPrintableTimetable()"><i class="fas fa-print"></i> Preview PDF</button>
      <button class="btn-lms-primary" style="padding: 0.6rem 1.2rem; border-radius: 8px; box-shadow: 0 4px 10px rgba(13, 59, 102, 0.2);" onclick="saveTimetable()"><i class="fas fa-save"></i> Save Changes</button>
    </div>
  </div>
  <div class="panel" style="border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); overflow: hidden;">
    <div style="overflow-x: auto;">
      ` + datalistHTML + `
      <table class="lms-tbl" style="width: 100%; min-width: 700px; text-align: center;">
        <thead style="background: var(--lms-surface);">
          <tr><th style="padding: 1rem;">Time</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th></tr>
        </thead>
        <tbody id="tt-edit-body">
          ` + tbodyHTML + `
        </tbody>
      </table>
    </div>
    <div style="padding: 1rem; border-top: 1px solid var(--lms-border); background: #f8fafc;">
      <button class="btn-outline" style="width: 100%; border-style: dashed; padding: 0.8rem; border-radius: 8px;" onclick="addTimetableRow()"><i class="fas fa-plus"></i> Add New Time Slot</button>
    </div>
  </div>
 
   <div style="background:#fef9c3; color:#a16207; padding:1rem; border-radius:8px; margin-top:1rem; font-size:0.85rem; display:flex; gap:0.5rem; align-items:center;">
    <i class="fas fa-info-circle"></i>
    <span><strong>Tip:</strong> You can type any custom subject! To create a full-row break, simply type <strong>BREAK</strong> or <strong>LUNCH</strong> across all 5 days in a row.</span>
  </div>`;
},

'a-events':() => `
  <div class="page-header" style="margin-bottom: 2rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
    <div><h2>Event Management</h2><span style="color:var(--lms-muted);">Schedule upcoming school events</span></div>
    <button class="btn-lms-primary" style="padding:.6rem 1.2rem; border-radius:8px;" onclick="openEventModal()"><i class="fas fa-plus"></i> Add Event</button>
  </div>
  <div style="display: flex; flex-direction: column; gap: 1rem;">
    ${EVENTS_DB.length === 0 ? '<div class="empty-state" style="padding:4rem;background:#fff;border-radius:12px;text-align:center;"><p>No upcoming events scheduled.</p></div>' : 
      EVENTS_DB.map(e => {
        const d = new Date(e.event_date);
        const month = d.toLocaleString('default', { month: 'short' }).toUpperCase();
        const day = d.getDate().toString().padStart(2, '0');
        return `
        <div style="background:#fff; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.04); display:flex; align-items:center; padding: 1.5rem; gap: 1.5rem; flex-wrap:wrap;">
          <div style="background:var(--primary); color:#fff; border-radius:8px; padding:1rem; text-align:center; min-width:80px; flex-shrink:0;">
            <div style="font-size:1.8rem; font-weight:bold; line-height:1;">${day}</div>
            <div style="font-size:0.8rem; letter-spacing:1px; margin-top:4px;">${month}</div>
          </div>
          <div style="flex:1; min-width:200px;">
            <strong style="font-size:1.15rem; display:block; margin-bottom:0.4rem; color:var(--text);">${e.title}</strong>
            <p style="font-size:0.9rem; color:var(--lms-muted); margin:0;">${e.description || 'No description provided.'}</p>
          </div>
          <div style="display:flex; gap:0.5rem; margin-left:auto;">
            <button class="btn-outline" style="padding:0.5rem 1rem; border-radius:6px;" onclick="openEventModal('${e.id}')"><i class="fas fa-edit"></i> Edit</button>
            <button class="btn-danger" style="padding:0.5rem 1rem; border-radius:6px;" onclick="deleteEvent('${e.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      `}).join('')}
  </div>
`
};

/* ====================== ADMIN SPECIFIC FUNCTIONS ====================== */
window.openAdminUserModal = function(roleType) {
  if(!document.getElementById('admin-user-modal')) {
    const m = document.createElement('div');
    m.className = 'lms-modal'; m.id = 'admin-user-modal';
    document.body.appendChild(m);
  }
  const m = document.getElementById('admin-user-modal');
  
  if(roleType === 'teacher') {
    m.innerHTML = `
      <div class="lms-modal-box">
        <div class="modal-h"><h3><i class="fas fa-chalkboard-teacher" style="color:var(--lms-blue);margin-right:6px;"></i>Add New Teacher</h3><button onclick="closeModal('admin-user-modal')"><i class="fas fa-times"></i></button></div>
        <div class="modal-body">
          <p style="font-size:0.8rem; color:var(--lms-muted); margin-bottom:1rem;"><strong>Note:</strong> You must also create an Auth user for them in Supabase (e.g. <code>tch002@debright.edu</code>) before they can log in.</p>
          <input type="hidden" id="admin-add-type" value="teacher">
          <div class="lms-form-group"><label>Teacher ID (Prefix)</label><input type="text" id="adm-user-id" placeholder="e.g. TCH002"></div>
          <div class="lms-form-group"><label>Full Name</label><input type="text" id="adm-user-name" placeholder="e.g. Abena Boateng"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem;">
            <div class="lms-form-group"><label>Initials</label><input type="text" id="adm-user-initials" placeholder="e.g. AB" maxlength="3"></div>
            <div class="lms-form-group"><label>Class Assigned (Optional)</label><select id="adm-user-class"><option value="">None</option>${SCHOOL_CLASSES.map(c=>`<option value="${c}">${c}</option>`).join('')}</select></div>
          </div>
          <div style="margin-top:1.2rem;display:flex;gap:.7rem;">
            <button class="btn-lms-primary" style="flex:1;" onclick="saveAdminUser()">Save Teacher</button>
          </div>
        </div>
      </div>`;
  } else {
    m.innerHTML = `
      <div class="lms-modal-box">
        <div class="modal-h"><h3><i class="fas fa-user-graduate" style="color:var(--lms-green);margin-right:6px;"></i>Add New Student</h3><button onclick="closeModal('admin-user-modal')"><i class="fas fa-times"></i></button></div>
        <div class="modal-body">
          <p style="font-size:0.8rem; color:var(--lms-muted); margin-bottom:1rem;"><strong>Note:</strong> You must also create an Auth user for them in Supabase (e.g. <code>stu002@debright.edu</code>).</p>
          <input type="hidden" id="admin-add-type" value="student">
          <div class="lms-form-group"><label>Student ID (Prefix)</label><input type="text" id="adm-user-id" placeholder="e.g. STU002"></div>
          <div class="lms-form-group"><label>Full Name</label><input type="text" id="adm-user-name" placeholder="e.g. Kwame Mensah"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem;">
            <div class="lms-form-group"><label>Class</label><select id="adm-user-class">${SCHOOL_CLASSES.map(c=>`<option value="${c}">${c}</option>`).join('')}</select></div>
            <div class="lms-form-group"><label>Age</label><input type="number" id="adm-user-age" placeholder="e.g. 11"></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem;">
            <div class="lms-form-group"><label>Gender</label><select id="adm-user-gender"><option>Male</option><option>Female</option></select></div>
            <div class="lms-form-group"><label>Parent's Contact</label><input type="text" id="adm-user-contact" placeholder="e.g. 024 123 4567"></div>
          </div>
          <div style="margin-top:1.2rem;display:flex;gap:.7rem;">
            <button class="btn-lms-primary" style="flex:1;" onclick="saveAdminUser()">Save Student</button>
          </div>
        </div>
      </div>`;
  }
  openModal('admin-user-modal');
};

window.saveAdminUser = async function() {
  if(!supabaseClient) return toast('Database connection missing', 'error');
  const type = document.getElementById('admin-add-type').value;
  const id = document.getElementById('adm-user-id').value.trim().toUpperCase();
  const name = document.getElementById('adm-user-name').value.trim();
  
  if(!id || !name) return toast('ID and Name are required.', 'error');
  
  if(type === 'teacher') {
    const payload = {
      id: id, name: name,
      initials: document.getElementById('adm-user-initials').value.trim().toUpperCase() || getInitials(name),
      class_assigned: document.getElementById('adm-user-class').value || null
    };
    const { error } = await supabaseClient.from('teachers').insert([payload]);
    if(error) return toast(error.message, 'error');
    TEACHERS_DB.push(payload);
    toast('Teacher added successfully!');
  } else {
    const payload = {
      id: id, name: name,
      class: document.getElementById('adm-user-class').value,
      age: document.getElementById('adm-user-age').value,
      gender: document.getElementById('adm-user-gender').value,
      parent_contact: document.getElementById('adm-user-contact').value.trim()
    };
    const { error } = await supabaseClient.from('students').insert([payload]);
    if(error) return toast(error.message, 'error');
    STUDENTS_DB.push(payload);
    toast('Student added successfully!');
  }
  closeModal('admin-user-modal');
  renderPage('a-users');
};

window.deleteTeacher = async function(id) {
  if(!supabaseClient) return;
  if(confirm('Delete this teacher profile permanently?')) {
    const { error } = await supabaseClient.from('teachers').delete().eq('id', id);
    if(error) return toast(error.message, 'error');
    TEACHERS_DB = TEACHERS_DB.filter(t => t.id !== id);
    renderPage('a-users'); toast('Teacher deleted.', 'error');
  }
};

window.openArticleModal = function(id = null) {
  if(!document.getElementById('admin-article-modal')) {
    const m = document.createElement('div');
    m.className = 'lms-modal'; m.id = 'admin-article-modal';
    document.body.appendChild(m);
  }
  const m = document.getElementById('admin-article-modal');
  
  let art = id ? ARTICLES_DB.find(a => a.id === id) : null;
  let defaultAuthor = art ? (art.author || currentUser.name) : currentUser.name;
  
  m.innerHTML = `
    <div class="lms-modal-box" style="max-width:700px;">
      <div class="modal-h"><h3><i class="fas fa-newspaper" style="color:var(--primary);margin-right:6px;"></i>${art ? 'Edit Article' : 'Draft New Article'}</h3><button onclick="closeModal('admin-article-modal')"><i class="fas fa-times"></i></button></div>
      <div class="modal-body">
        <input type="hidden" id="art-id" value="${art ? art.id : ''}">
        <div class="lms-form-group"><label>Headline / Title</label><input type="text" id="art-title" value="${art ? art.title : ''}"></div>
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.8rem;">
          <div class="lms-form-group"><label>Author Name</label><input type="text" id="art-author" value="${defaultAuthor}" placeholder="e.g. Administration or Mr. Kwame"></div>
          <div class="lms-form-group"><label>Category</label>
            <select id="art-category">
              <option value="School Update" ${art&&art.category==='School Update'?'selected':''}>School Update</option>
              <option value="News" ${art&&art.category==='News'?'selected':''}>News</option>
              <option value="Social Updates" ${art&&art.category==='Social Updates'?'selected':''}>Social Updates</option>
              <option value="Articles" ${art&&art.category==='Articles'?'selected':''}>Articles</option>
              <option value="Learn Something New" ${art&&art.category==='Learn Something New'?'selected':''}>Learn Something New</option>
            </select>
          </div>
        </div>
        
        <div class="lms-form-group"><label>Short Excerpt (Summary)</label><textarea id="art-excerpt" rows="2">${art ? (art.excerpt||'') : ''}</textarea></div>
        <div class="lms-form-group"><label>Full Article Content (Supports HTML)</label><textarea id="art-content" rows="6">${art ? art.content : ''}</textarea></div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.8rem;">
          <div class="lms-form-group"><label>Cover Image Upload</label><input type="file" id="art-img" accept="image/*"></div>
          <div class="lms-form-group"><label>Status</label><select id="art-status"><option value="published" ${art&&art.status==='published'?'selected':''}>Published</option><option value="draft" ${art&&art.status==='draft'?'selected':''}>Save as Draft</option></select></div>
        </div>
        <div style="margin-top:1.2rem;display:flex;gap:.7rem;">
          <button class="btn-lms-primary" id="btn-save-art" style="flex:1;" onclick="saveArticle()"><i class="fas fa-save"></i> Save Article</button>
        </div>
      </div>
    </div>`;
  openModal('admin-article-modal');
};

window.saveArticle = async function() {
  if(!supabaseClient) return toast('Database connection missing', 'error');
  const btn = document.getElementById('btn-save-art');
  const id = document.getElementById('art-id').value;
  const title = document.getElementById('art-title').value.trim();
  const author = document.getElementById('art-author').value.trim() || currentUser.name;
  const category = document.getElementById('art-category').value;
  const excerpt = document.getElementById('art-excerpt').value.trim();
  const content = document.getElementById('art-content').value.trim();
  const status = document.getElementById('art-status').value;
  const imgInput = document.getElementById('art-img');
  
  if(!title || !content) return toast('Title and content are required.', 'error');
  
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  btn.disabled = true;
  
  let imgUrl = id ? (ARTICLES_DB.find(a => a.id === id)?.cover_image || null) : null;
  
  if(imgInput.files.length > 0) {
    const file = imgInput.files[0];
    const filePath = `articles/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
    const { error: uploadError } = await supabaseClient.storage.from('lms-files').upload(filePath, file);
    if(!uploadError) {
      const { data } = supabaseClient.storage.from('lms-files').getPublicUrl(filePath);
      imgUrl = data.publicUrl;
    }
  }
  
  const payload = { title, excerpt, content, status, cover_image: imgUrl, author: author, category: category };
  
  if(id) {
    const { error } = await supabaseClient.from('articles').update(payload).eq('id', id);
    if(error) { btn.disabled = false; return toast(error.message, 'error'); }
  } else {
    const { error } = await supabaseClient.from('articles').insert([payload]);
    if(error) { btn.disabled = false; return toast(error.message, 'error'); }
  }
  
  const { data } = await supabaseClient.from('articles').select('*').order('created_at',{ascending:false});
  if(data) ARTICLES_DB = data;
  
  closeModal('admin-article-modal');
  renderPage('a-articles');
  toast('Article saved successfully!');
};

window.deleteArticle = async function(id) {
  if(!supabaseClient) return;
  if(confirm('Delete this article? It will be removed from the public website.')) {
    const { error } = await supabaseClient.from('articles').delete().eq('id', id);
    if(error) return toast(error.message, 'error');
    ARTICLES_DB = ARTICLES_DB.filter(a => a.id !== id);
    renderPage('a-articles'); toast('Article deleted.', 'error');
  }
};

window.saveSiteSettings = async function() {
  if(!supabaseClient) return toast('Database connection missing', 'error');

  const popupListRaw = document.getElementById('set-popup-list').value;
  const popupListArray = popupListRaw ? popupListRaw.split('\n').map(item => item.trim()).filter(item => item.length > 0) : [];

  const payload = {
    school_name: document.getElementById('set-school').value.trim(),
    contact_phone: document.getElementById('set-phone').value.trim(),
    contact_email: document.getElementById('set-email').value.trim(),
    current_term: document.getElementById('set-term').value.trim(),
    academic_year: document.getElementById('set-year').value.trim(),
    homepage_announcement: document.getElementById('set-ann').value.trim(),
    
    // New Popup Fields
    popup_active: document.getElementById('set-popup-active').checked,
    popup_badge: document.getElementById('set-popup-badge').value.trim(),
    popup_title: document.getElementById('set-popup-title').value.trim(),
    popup_desc: document.getElementById('set-popup-desc').value.trim(),
    popup_list: popupListArray,
    popup_btn_text: document.getElementById('set-popup-btn-text').value.trim(),
    popup_btn_link: document.getElementById('set-popup-btn-link').value.trim()
  };
  
  const { error } = await supabaseClient.from('site_settings').update(payload).eq('id', 1);
  if(error) return toast(error.message, 'error');
  
  SITE_SETTINGS = { ...SITE_SETTINGS, ...payload };
  toast('Global Settings Updated!');
  buildDashboard();
};


/* ====================== ASSIGNMENTS (WITH ATTACHMENTS & TYPED RESPONSES) ====================== */
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
        <div class="lms-form-group"><label>Assignment Instructions / Questions</label><textarea id="asgn-desc" rows="3" placeholder="Type the full assignment here for students to read..."></textarea></div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem;">
          <div class="lms-form-group">
            <label>Allowed Submission Format</label>
            <select id="asgn-sub-type" style="padding: 0.5rem; border: 1px solid var(--lms-border); border-radius: 8px; width: 100%;">
              <option value="any">Any Method</option>
              <option value="text">Typed Response Only</option>
              <option value="file">File Upload Only</option>
              <option value="link">URL Link Only</option>
            </select>
          </div>
          <div class="lms-form-group">
            <label>Attach File (Optional)</label>
            <input type="file" id="asgn-file" style="padding: 0.4rem; border: 1px dashed var(--lms-border); border-radius: 8px; width: 100%; background: #f8fafc;">
          </div>
        </div>

        <div style="margin-top:1.2rem;display:flex;gap:.7rem;">
          <button class="btn-lms-primary" id="btn-save-asgn" style="flex:1;" onclick="saveAssignment()">Save Assignment</button>
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
  const fileInput = document.getElementById('asgn-file');
  const subType = document.getElementById('asgn-sub-type');
  const mTitle = document.getElementById('asgn-modal-title');
  
  if(id) {
    const a = ASSIGNMENTS.find(x => String(x.id) === String(id));
    if (a) {
      t.value = a.title; s.value = a.subject; d.value = a.due; desc.value = a.desc; idInput.value = a.id;
      subType.value = a.submission_type || 'any';
      fileInput.value = '';
      mTitle.textContent = "Edit Assignment";
    }
  } else {
    t.value = ''; d.value = ''; desc.value = ''; idInput.value = ''; fileInput.value = ''; subType.value = 'any';
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
  const subType = document.getElementById('asgn-sub-type').value;
  const fileInput = document.getElementById('asgn-file');
  const btn = document.getElementById('btn-save-asgn');
  
  if(!title || !due) return toast('Please provide a title and due date', 'error');
  
  let attachmentUrl = id ? ASSIGNMENTS.find(x => String(x.id) === String(id))?.attachment_url : null;

  if(fileInput.files.length > 0) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading File...';
    btn.disabled = true;
    const file = fileInput.files[0];
    const filePath = `assignments/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
    
    const { error: uploadError } = await supabaseClient.storage.from('lms-files').upload(filePath, file);
    if(uploadError) {
      btn.innerHTML = 'Save Assignment'; btn.disabled = false;
      return toast('File upload failed: ' + uploadError.message, 'error');
    }
    const { data: publicUrlData } = supabaseClient.storage.from('lms-files').getPublicUrl(filePath);
    attachmentUrl = publicUrlData.publicUrl;
  }
  
  const payload = { title: title, subject: subject, due: due, description: desc, submission_type: subType }; 
  if (attachmentUrl) payload.attachment_url = attachmentUrl; 
  
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  
  if(id) {
    const { error } = await supabaseClient.from('assignments').update(payload).eq('id', id);
    if(error) { btn.innerHTML = 'Save Assignment'; btn.disabled = false; return toast('DB Error: ' + error.message, 'error'); }
    toast('Assignment updated successfully!');
  } else {
    const { data, error } = await supabaseClient.from('assignments').insert([payload]).select();
    if(error) { btn.innerHTML = 'Save Assignment'; btn.disabled = false; return toast('DB Error: ' + error.message, 'error'); }
    toast('Assignment created successfully!');
  }
  
  btn.innerHTML = 'Save Assignment'; btn.disabled = false;
  closeModal('assignment-modal');
};

window.deleteAssignment = async function(id) {
  if (!supabaseClient) return;
  if(!confirm('Are you sure you want to permanently delete this assignment?')) return;
  const { error } = await supabaseClient.from('assignments').delete().eq('id', id);
  if(error) { console.error(error); return toast('Failed to delete assignment', 'error'); }
  toast('Assignment deleted successfully', 'error'); 
};

/* ====================== SUBMISSIONS (STUDENTS SUBMITTING WORK) ====================== */
function injectSubmitModal() {
  if(document.getElementById('dynamic-submit-modal')) return;
  const m = document.createElement('div');
  m.className = 'lms-modal';
  m.id = 'dynamic-submit-modal';
  m.innerHTML = `
    <div class="lms-modal-box" style="max-width: 600px;">
      <div class="modal-h"><h3><i class="fas fa-paper-plane" style="color:var(--primary);margin-right:6px;"></i>Submit Work</h3><button onclick="closeModal('dynamic-submit-modal')"><i class="fas fa-times"></i></button></div>
      <div class="modal-body" id="submit-modal-content"></div>
    </div>
  `;
  document.body.appendChild(m);
}

window.openSubmitModal = function(id) {
  injectSubmitModal();
  const a = ASSIGNMENTS.find(x => String(x.id) === String(id));
  const subType = a.submission_type || 'any';

  let html = `
    <input type="hidden" id="submit-asgn-id" value="${id}">
    <div style="background:#f8fafc; padding:1.2rem; border-radius:8px; margin-bottom:1.5rem; border:1px solid var(--lms-border);">
      <strong style="display:block; margin-bottom:0.5rem; color:var(--primary); font-size:1.1rem;">${a.title}</strong>
      <p style="font-size:0.9rem; color:var(--text); line-height:1.6; margin-bottom:0.8rem; white-space:pre-wrap;">${a.desc || 'No instructions provided.'}</p>
      ${a.attachment_url ? `<a href="${a.attachment_url}" target="_blank" class="btn-outline" style="font-size:0.8rem; padding:0.4rem 0.8rem; text-decoration:none;"><i class="fas fa-paperclip"></i> View Attached Material</a>` : ''}
    </div>
  `;

  if (subType === 'any' || subType === 'text') {
    html += `<div class="lms-form-group"><label>Typed Response</label><textarea id="submit-typed" rows="4" placeholder="Type your answer here..."></textarea></div>`;
  }
  if (subType === 'any') html += `<div style="text-align: center; margin: 10px 0; color: var(--lms-muted); font-size: 0.8rem; font-weight: 600;">— OR —</div>`;
  
  if (subType === 'any' || subType === 'file') {
    html += `<div class="lms-form-group"><label>Upload Document/File</label><input type="file" id="submit-file" style="padding: 0.5rem; border: 1px dashed var(--lms-border); border-radius: 8px; width: 100%; background: #fff;"></div>`;
  }
  if (subType === 'any') html += `<div style="text-align: center; margin: 10px 0; color: var(--lms-muted); font-size: 0.8rem; font-weight: 600;">— OR —</div>`;
  
  if (subType === 'any' || subType === 'link') {
    html += `<div class="lms-form-group"><label>Paste Link</label><input type="url" id="submit-link" placeholder="https://..."></div>`;
  }

  html += `
    <div class="lms-form-group" style="margin-top:1rem;"><label>Private Comment to Teacher</label><textarea id="submit-comment" rows="2" placeholder="Any notes?"></textarea></div>
    <div style="margin-top:1.2rem;display:flex;gap:.7rem;">
      <button class="btn-lms-primary" id="btn-do-submit" style="flex:1;" onclick="doSubmit('${subType}')"><i class="fas fa-check"></i> Finalize Submission</button>
      <button class="btn-outline" onclick="closeModal('dynamic-submit-modal')">Cancel</button>
    </div>
  `;

  document.getElementById('submit-modal-content').innerHTML = html;
  openModal('dynamic-submit-modal');
}

window.doSubmit = async function(subType) {
  if (!supabaseClient) return toast('Database connection missing!', 'error');
  
  const btn = document.getElementById('btn-do-submit');
  const asgnId = document.getElementById('submit-asgn-id').value;
  const commentEl = document.getElementById('submit-comment');
  const comment = commentEl ? commentEl.value.trim() : '';

  const typedEl = document.getElementById('submit-typed');
  const linkEl = document.getElementById('submit-link');
  const fileEl = document.getElementById('submit-file');

  const typedVal = typedEl ? typedEl.value.trim() : '';
  const linkVal = linkEl ? linkEl.value.trim() : '';
  const fileCount = fileEl ? fileEl.files.length : 0;

  if(subType === 'text' && !typedVal) return toast('Please type your response.', 'error');
  if(subType === 'file' && fileCount === 0) return toast('Please attach a file.', 'error');
  if(subType === 'link' && !linkVal) return toast('Please provide a link.', 'error');
  if(subType === 'any' && !typedVal && !linkVal && fileCount === 0) return toast('Please provide an answer, link, or file.', 'error');
  
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
  btn.disabled = true;
  
  let fileUrl = null;
  
  if(fileCount > 0) {
      const file = fileEl.files[0];
      const filePath = `submissions/${currentUser.id}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
      const { error: uploadError } = await supabaseClient.storage.from('lms-files').upload(filePath, file);
      
      if(uploadError) {
          btn.innerHTML = '<i class="fas fa-check"></i> Finalize Submission'; btn.disabled = false;
          return toast('File upload failed: ' + uploadError.message, 'error');
      }
      
      const { data: publicUrlData } = supabaseClient.storage.from('lms-files').getPublicUrl(filePath);
      fileUrl = publicUrlData.publicUrl;
  }
  
  const payload = {
      assignment_id: asgnId,
      student_id: currentUser.id,
      student_name: currentUser.name,
      file_url: fileUrl,
      link: linkVal,
      typed_response: typedVal,
      comments: comment,
      status: 'submitted',
      class: currentUser.class
  };
  
  const { data, error } = await supabaseClient.from('submissions').insert([payload]).select();
  
  btn.innerHTML = '<i class="fas fa-check"></i> Finalize Submission'; btn.disabled = false;
  
  if(error) return toast('DB Error: ' + error.message, 'error');
  
  closeModal('dynamic-submit-modal');
  toast('Work submitted successfully! 🎉');
}

/* ====================== TEACHER GRADING ENGINE ====================== */
window.viewTypedResponse = function(subId) {
  const sub = SUBMISSIONS.find(s => String(s.id) === String(subId));
  if(!document.getElementById('view-text-modal')) {
    const m = document.createElement('div');
    m.className = 'lms-modal'; m.id = 'view-text-modal';
    m.innerHTML = `<div class="lms-modal-box"><div class="modal-h"><h3>Typed Response</h3><button onclick="closeModal('view-text-modal')"><i class="fas fa-times"></i></button></div><div class="modal-body"><div style="background:#f8fafc;padding:1.5rem;border-radius:8px;border:1px solid var(--lms-border);white-space:pre-wrap;font-family:var(--font-lms);font-size:0.95rem;color:var(--text);line-height:1.6;" id="view-text-content"></div></div></div>`;
    document.body.appendChild(m);
  }
  document.getElementById('view-text-content').textContent = sub.typed_response || 'No text provided.';
  openModal('view-text-modal');
}

function injectGradeModal() {
  if(document.getElementById('grade-work-modal')) return;
  const m = document.createElement('div');
  m.className = 'lms-modal';
  m.id = 'grade-work-modal';
  m.innerHTML = `
    <div class="lms-modal-box">
      <div class="modal-h"><h3><i class="fas fa-marker" style="color:var(--accent);margin-right:6px;"></i>Grade Submission</h3><button onclick="closeModal('grade-work-modal')"><i class="fas fa-times"></i></button></div>
      <div class="modal-body">
        <input type="hidden" id="grade-sub-id">
        <div style="background:#f8fafc; padding:1rem; border-radius:8px; margin-bottom:1rem; border:1px solid var(--lms-border);">
          <strong style="display:block; color:var(--text); font-size:1rem;" id="grade-student-name"></strong>
          <span style="font-size:0.8rem; color:var(--lms-muted);" id="grade-asgn-title"></span>
        </div>
        
        <div class="lms-form-group">
          <label>Score / Grade</label>
          <input type="text" id="grade-score" placeholder="e.g. 85/100, A, or 10/10">
        </div>
        
        <div class="lms-form-group">
          <label>Teacher's Feedback (Optional)</label>
          <textarea id="grade-feedback" rows="3" placeholder="Great job! Keep it up..."></textarea>
        </div>
        
        <div style="margin-top:1.2rem;display:flex;gap:.7rem;">
          <button class="btn-lms-primary" id="btn-save-grade" style="flex:1;" onclick="saveGrade()"><i class="fas fa-check"></i> Submit Grade</button>
          <button class="btn-outline" onclick="closeModal('grade-work-modal')">Cancel</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(m);
}

window.openGradeModal = function(id) {
  injectGradeModal();
  const sub = SUBMISSIONS.find(s => String(s.id) === String(id));
  const asgn = ASSIGNMENTS.find(a => String(a.id) === String(sub.assignment_id));
  
  document.getElementById('grade-sub-id').value = id;
  document.getElementById('grade-student-name').textContent = sub.student_name;
  document.getElementById('grade-asgn-title').textContent = asgn ? asgn.title : 'Unknown Assignment';
  document.getElementById('grade-score').value = sub.grade || '';
  document.getElementById('grade-feedback').value = sub.feedback || '';
  
  openModal('grade-work-modal');
}

window.saveGrade = async function() {
  if (!supabaseClient) return toast('Database connection missing!', 'error');
  
  const btn = document.getElementById('btn-save-grade');
  const subId = document.getElementById('grade-sub-id').value;
  const score = document.getElementById('grade-score').value.trim();
  const feedback = document.getElementById('grade-feedback').value.trim();
  
  if(!score) return toast('Please enter a grade or score.', 'error');
  
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  btn.disabled = true;
  
  const payload = { status: 'graded', grade: score, feedback: feedback };
  
  const { error } = await supabaseClient.from('submissions').update(payload).eq('id', subId);
  
  btn.innerHTML = '<i class="fas fa-check"></i> Submit Grade'; btn.disabled = false;
  
  if(error) return toast('DB Error: ' + error.message, 'error');
  
  closeModal('grade-work-modal');
  toast('Submission Graded! ✅');
}

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
  if (error) { console.error(error); toast('DB Error: ' + error.message, 'error'); return; }
  if (data) STUDENTS_DB.push(data[0]);
  closeModal('add-student-modal'); renderPage('t-class'); toast(`${name} added successfully! ID: ${newId}`);
};

window.deleteStudent = async function(id, fromAdmin = false) {
  if (!supabaseClient) return;
  const student = STUDENTS_DB.find(s => s.id === id);
  if(confirm(`Are you absolutely sure you want to remove ${student.name} from the database?`)) {
    const { error } = await supabaseClient.from('students').delete().eq('id', id);
    if (error) { console.error(error); toast('DB Error: ' + error.message, 'error'); return; }
    STUDENTS_DB = STUDENTS_DB.filter(s => s.id !== id);
    if (fromAdmin) renderPage('a-users'); else renderPage('t-class'); 
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
    if (error) { console.error(error); toast('DB Error: ' + error.message, 'error'); return; }
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
  
  const termName = SITE_SETTINGS.current_term || 'Term 2';
  const payload = { student_id: id, term: termName, conduct: conduct, remarks: remarks };
  const { data, error } = await supabaseClient.from('report_cards').insert([payload]).select();
  
  if (error) { console.error(error); toast('DB Error: ' + error.message, 'error'); return; }
  
  if (data && data.length > 0) REPORT_CARDS.push(data[0]);
  closeModal('build-report-modal'); renderPage('t-grades'); toast('Report Card Generated & Published! ✅');
};

window.viewReportCard = function(reportId) {
  const report = REPORT_CARDS.find(r => r.id === reportId);
  const std = STUDENTS_DB.find(s => s.id === report.student_id) || currentUser;
  const printArea = document.getElementById('print-area');
  
  const modal = document.getElementById('view-report-modal');
  const header = modal.querySelector('.modal-h h3');
  if (header) header.innerHTML = `<i class="fas fa-award" style="color:var(--accent);margin-right:6px;"></i>Official Report Card`;

  const stdAtt = ATTENDANCE_RECORDS.filter(a => a.student_id === std.id);
  const totalDays = stdAtt.length;
  const presDays = stdAtt.filter(a => a.status === 'present').length;
  const absDays = stdAtt.filter(a => a.status === 'absent').length;
  const attPct = totalDays > 0 ? Math.round((presDays / totalDays) * 100) : 0;

  let gradesHTML = '';
  GRADES.slice(0,5).forEach(g => {
      gradesHTML += '<tr><td style="padding:10px; border:2px solid #000;">' + (g.subject_name || g.subject) + '</td><td style="padding:10px; border:2px solid #000; text-align:center;">' + g.total + '</td><td style="padding:10px; border:2px solid #000; text-align:center;"><strong>' + g.grade + '</strong></td></tr>';
  });

  const sName = SITE_SETTINGS.school_name || 'DE-BRIGHT TALENTED KIDS SCHOOL';

  printArea.innerHTML = `
    <style>
      @media print {
        @page { margin: 15mm; }
        body * { visibility: hidden; }
        #view-report-modal, #view-report-modal * { visibility: visible; }
        #view-report-modal { position: absolute; left: 0; top: 0; width: 100vw; height: 100vh; background: #fff !important; }
        .lms-modal-box { max-width: 100% !important; box-shadow: none !important; border: none !important; margin: 0 !important; padding: 0 !important; }
        .modal-h, .print-footer-actions { display: none !important; }
        #print-area { width: 100%; padding: 0; margin: 0; border: none !important; background: transparent !important; }
        table { width: 100% !important; border-collapse: collapse; }
        th, td { border: 2px solid #000 !important; }
        #print-area::before {
          content: ""; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 700px; height: 700px;
          background: url('https://debrighttalentedkidsschool.online/wp-content/uploads/2026/01/IMG_2312.jpeg') no-repeat center center;
          background-size: contain; opacity: 0.3 !important; z-index: -1; pointer-events: none;
        }
      }
    </style>
    <div style="border: 2px solid var(--primary); padding: 2rem; border-radius: 10px; background: #fff; position:relative; z-index:1;">
      
      <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:500px; height:500px; background:url('https://debrighttalentedkidsschool.online/wp-content/uploads/2026/01/IMG_2312.jpeg') no-repeat center center; background-size:contain; opacity:0.15; z-index:-1; pointer-events:none;"></div>

      <div style="text-align:center; border-bottom: 2px solid var(--accent); padding-bottom: 1rem; margin-bottom: 1.5rem; position:relative; z-index:2;">
        <h2 style="color:var(--primary); font-family:'Poppins', sans-serif; text-transform:uppercase;">${sName}</h2>
        <p style="font-size:.9rem; color:#555;">Sonitra Road, Amasaman, Accra</p>
        <h3 style="margin-top:1rem; color:var(--accent);">OFFICIAL END OF TERM REPORT</h3>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom: 2rem; font-size:.95rem; position:relative; z-index:2;">
        <div><p><strong>Student Name:</strong> ` + std.name + `</p><p><strong>Student ID:</strong> ` + std.id + `</p></div>
        <div style="text-align:right;"><p><strong>Class:</strong> ` + std.class + `</p><p><strong>Term:</strong> ` + report.term + ` ${SITE_SETTINGS.academic_year || '2025/26'}</p></div>
      </div>
      <table style="width:100%; border-collapse: collapse; margin-bottom: 2rem; background:transparent; position:relative; z-index:2; border: 2px solid #000;">
        <tr style="background:rgba(240,244,248,0.9);">
          <th style="padding:10px; border:2px solid #000; text-align:left;">Subject</th>
          <th style="padding:10px; border:2px solid #000; text-align:center;">Score</th>
          <th style="padding:10px; border:2px solid #000; text-align:center;">Grade</th>
        </tr>
        ` + gradesHTML + `
      </table>
      <div style="background: rgba(249,249,249,0.9); padding: 1rem; border-left: 4px solid var(--primary); margin-bottom: 1rem; position:relative; z-index:2; border: 1px solid #ccc; display:flex; flex-wrap:wrap; gap:2rem;">
        <div style="flex:1; min-width:300px;">
          <p style="margin-bottom:.5rem;"><strong>Conduct:</strong> ` + report.conduct + `</p>
          <p><strong>Class Teacher's Remarks:</strong> ` + report.remarks + `</p>
        </div>
        <div style="width:250px; background:#fff; padding:1rem; border:1px solid #ccc; border-radius:8px;">
          <h4 style="margin:0 0 0.5rem 0; font-size:0.9rem; border-bottom:1px solid #ccc; padding-bottom:0.3rem;">Attendance Summary</h4>
          <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:0.3rem;"><span>Total Days Recorded:</span> <strong>${totalDays}</strong></div>
          <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:0.3rem;"><span>Present:</span> <strong style="color:green;">${presDays}</strong></div>
          <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:0.3rem;"><span>Absent:</span> <strong style="color:red;">${absDays}</strong></div>
          <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-top:0.5rem; padding-top:0.5rem; border-top:1px dashed #ccc;"><span>Attendance Rate:</span> <strong>${attPct}%</strong></div>
        </div>
      </div>
      <div style="margin-top: 3rem; display:flex; justify-content:space-between; position:relative; z-index:2;">
        <div style="border-top: 1px solid #000; padding-top: 5px; width: 200px; text-align:center;">Teacher's Signature</div>
        <div style="border-top: 1px solid #000; padding-top: 5px; width: 200px; text-align:center;">Headmaster's Signature</div>
      </div>
    </div>
  `;
  openModal('view-report-modal');
};

/* ====================== ATTENDANCE ====================== */
window.renderAttList = function() {
  const el = document.getElementById('att-mark-list');
  if(!el) return;
  const dateInput = document.getElementById('att-date');
  const date = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
  const myClass = STUDENTS_DB.filter(s => s.class === currentUser.class);
  
  if(myClass.length === 0) {
    el.innerHTML = '<div class="empty-state"><p>No students in this class.</p></div>';
    return;
  }

  el.innerHTML = myClass.map(s => {
    const existing = ATTENDANCE_RECORDS.find(r => r.student_id === s.id && r.date === date);
    const status = existing ? existing.status : (attState[s.id] || '');
    
    if(existing) attState[s.id] = existing.status;

    return `
    <div class="std-row" data-std-id="${s.id}" style="background:#f8fafc; border:1px solid var(--lms-border); border-radius:10px; padding:0.8rem 1rem; display:flex; align-items:center; gap:1rem; transition: border-color 0.2s;">
      <div class="std-av" style="width:36px;height:36px;font-size:.9rem;">${getInitials(s.name)}</div>
      <div class="std-info" style="flex:1;">
        <strong>${s.name}</strong>
        <span style="display:block;font-size:0.75rem;color:var(--lms-muted);">${s.id}</span>
      </div>
      <div class="ml-auto" style="display:flex;gap:.5rem;">
        <button onclick="setAtt('${s.id}','present')" class="att-btn" style="padding:6px 18px;border-radius:8px;font-size:.8rem;font-weight:700;cursor:pointer;border:1.5px solid;transition:all .2s;${status==='present'?'background:#22c55e;color:#fff;border-color:#22c55e;box-shadow:0 4px 10px rgba(34,197,94,0.3);':'background:#fff;color:var(--lms-muted);border-color:var(--lms-border);'}">Present</button>
        <button onclick="setAtt('${s.id}','absent')" class="att-btn" style="padding:6px 18px;border-radius:8px;font-size:.8rem;font-weight:700;cursor:pointer;border:1.5px solid;transition:all .2s;${status==='absent'?'background:#ef4444;color:#fff;border-color:#ef4444;box-shadow:0 4px 10px rgba(239,68,68,0.3);':'background:#fff;color:var(--lms-muted);border-color:var(--lms-border);'}">Absent</button>
      </div>
    </div>`;
  }).join('');
};

window.setAtt = function(id, v) { 
  attState[id] = v; 
  renderAttList(); 
};

window.saveAttendance = async function() {
  if (!supabaseClient) return toast('Database connection missing!', 'error');
  
  const dateInput = document.getElementById('att-date');
  const date = dateInput ? dateInput.value : '';
  if(!date) return toast('Please select a valid date.', 'error');

  const myClass = STUDENTS_DB.filter(s => s.class === currentUser.class);
  const payload = myClass.map(s => {
      const stat = attState[s.id];
      if(!stat) return null; 
      return {
          date: date,
          class: currentUser.class,
          student_id: s.id,
          student_name: s.name,
          status: stat
      };
  }).filter(Boolean);

  if(payload.length === 0) return toast('No attendance marked for submission.', 'error');

  const btn = document.querySelector('button[onclick="saveAttendance()"]');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  btn.disabled = true;

  await supabaseClient.from('attendance_records').delete().eq('date', date).eq('class', currentUser.class);
  
  const { data, error } = await supabaseClient.from('attendance_records').insert(payload).select();
  
  btn.innerHTML = '<i class="fas fa-save"></i> Save';
  btn.disabled = false;

  if(error) return toast('DB Error: ' + error.message, 'error');
  
  ATTENDANCE_RECORDS = ATTENDANCE_RECORDS.filter(r => !(r.date === date && r.class === currentUser.class));
  if(data) ATTENDANCE_RECORDS.push(...data);
  
  toast('Attendance saved successfully! ✅');
};

window.viewAttendancePDF = function() {
  const dateInput = document.getElementById('att-date');
  const date = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
  const myClass = STUDENTS_DB.filter(s => s.class === currentUser.class);
  
  if(!document.getElementById('att-pdf-modal')) {
    const m = document.createElement('div');
    m.className = 'lms-modal';
    m.id = 'att-pdf-modal';
    document.body.appendChild(m);
  }
  const m = document.getElementById('att-pdf-modal');
  
  let rows = myClass.map((s, i) => {
      const existing = ATTENDANCE_RECORDS.find(r => r.student_id === s.id && r.date === date);
      const stat = existing ? existing.status : (attState[s.id] || 'Not Marked');
      let statColor = stat === 'present' ? 'color: #15803d;' : (stat === 'absent' ? 'color: #b91c1c;' : 'color: #64748b;');
      
      return `<tr>
        <td style="padding:10px; border:1px solid #000; text-align:center;">${i+1}</td>
        <td style="padding:10px; border:1px solid #000;">${s.id}</td>
        <td style="padding:10px; border:1px solid #000;">${s.name}</td>
        <td style="padding:10px; border:1px solid #000; text-align:center; font-weight:bold; text-transform:capitalize; ${statColor}">${stat}</td>
      </tr>`;
  }).join('');

  m.innerHTML = `
    <style>
      @media print {
        body * { visibility: hidden; }
        #att-pdf-modal, #att-pdf-modal * { visibility: visible; }
        #att-pdf-modal { position: absolute; left: 0; top: 0; width: 100vw; height: 100vh; background: #fff !important; }
        .lms-modal-box { max-width: 100% !important; box-shadow: none !important; border: none !important; margin: 0 !important; padding: 0 !important; }
        .modal-h, .print-footer-actions { display: none !important; }
        #att-print-area { width: 100%; padding: 0; margin: 0; border: none !important; background: transparent !important; }
        table { width: 100% !important; border-collapse: collapse; }
        th, td { border: 1px solid #000 !important; }
      }
    </style>
    <div class="lms-modal-box" style="max-width:800px;">
      <div class="modal-h">
        <h3><i class="fas fa-clipboard-list" style="color:var(--accent);margin-right:6px;"></i> Daily Register PDF</h3>
        <button onclick="closeModal('att-pdf-modal')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body" id="att-print-area" style="background:#fff; color:#000;">
        <div style="text-align:center; border-bottom: 2px solid var(--accent); padding-bottom: 1rem; margin-bottom: 1.5rem;">
          <h2 style="color:var(--primary); font-family:'Poppins', sans-serif; text-transform:uppercase;">${SITE_SETTINGS.school_name || 'DE-BRIGHT TALENTED KIDS SCHOOL'}</h2>
          <h3 style="margin-top:0.5rem; color:var(--accent);">DAILY ATTENDANCE REGISTER</h3>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom: 1rem; font-size:.95rem;">
          <div><p><strong>Class:</strong> ${currentUser.class}</p><p><strong>Class Teacher:</strong> ${currentUser.name}</p></div>
          <div style="text-align:right;"><p><strong>Date:</strong> ${fmtDate(date)}</p></div>
        </div>
        <table style="width:100%; border-collapse: collapse; margin-bottom: 2rem; border: 1px solid #000;">
          <tr style="background:rgba(240,244,248,0.9);">
            <th style="padding:10px; border:1px solid #000; width: 50px;">S/N</th>
            <th style="padding:10px; border:1px solid #000; width: 150px;">Student ID</th>
            <th style="padding:10px; border:1px solid #000; text-align:left;">Student Name</th>
            <th style="padding:10px; border:1px solid #000; width: 150px;">Status</th>
          </tr>
          ${rows}
        </table>
      </div>
      <div class="print-footer-actions" style="padding:1.5rem;display:flex;gap:.7rem;border-top:1px solid var(--lms-border);">
        <button class="btn-lms-primary" style="flex:1;background:var(--lms-green);" onclick="window.print()"><i class="fas fa-download"></i> Download / Print PDF</button>
        <button class="btn-outline" onclick="closeModal('att-pdf-modal')">Close</button>
      </div>
    </div>
  `;
  openModal('att-pdf-modal');
};


/* ====================== QUIZ ENGINE (TEACHER) ====================== */
function injectQuizBuilderModal() {
  if(document.getElementById('quiz-builder-modal')) return;
  const m = document.createElement('div');
  m.className = 'lms-modal'; m.id = 'quiz-builder-modal';
  m.innerHTML = `
    <div class="lms-modal-box" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
      <div class="modal-h" style="position:sticky; top:0; background:#fff; z-index:10; border-bottom:1px solid #e2e8f0;">
        <h3><i class="fas fa-question-circle" style="color:var(--accent);margin-right:6px;"></i>Create Quiz</h3>
        <button onclick="closeModal('quiz-builder-modal')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="lms-form-group"><label>Quiz Title</label><input type="text" id="qb-title" placeholder="e.g. Mid-Term Science Quiz"></div>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.8rem;">
          <div class="lms-form-group"><label>Subject</label><select id="qb-subject">${SUBJECTS.map(s=>`<option value="${s.name}">${s.name}</option>`).join('')}</select></div>
          <div class="lms-form-group"><label>Duration (Mins)</label><input type="number" id="qb-duration" value="15" min="1"></div>
          <div class="lms-form-group"><label>Grades Reveal</label>
            <select id="qb-reveal">
              <option value="instant">Instant upon submission</option>
              <option value="manual">Manual (I will tell them later)</option>
            </select>
          </div>
        </div>
        <hr style="border:none; border-top:1px dashed var(--lms-border); margin:1.5rem 0;">
        <h4 style="margin-bottom:1rem; color:var(--text);">Questions</h4>
        <div id="qb-questions-container"></div>
        <button class="btn-outline" style="width:100%; padding:0.8rem; border-style:dashed; border-radius:8px;" onclick="addQuizQuestionBlock()"><i class="fas fa-plus"></i> Add Question</button>
        <div style="margin-top:2rem; display:flex; gap:1rem;">
          <button class="btn-lms-primary" id="btn-save-quiz" style="flex:1; padding:1rem; font-size:1rem;" onclick="saveQuiz()"><i class="fas fa-save"></i> Publish Quiz</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(m);
}

window.openQuizBuilder = function() {
  injectQuizBuilderModal();
  document.getElementById('qb-title').value = '';
  document.getElementById('qb-duration').value = '15';
  document.getElementById('qb-questions-container').innerHTML = '';
  addQuizQuestionBlock(); 
  openModal('quiz-builder-modal');
};

window.addQuizQuestionBlock = function() {
  const container = document.getElementById('qb-questions-container');
  const index = container.children.length + 1;
  const div = document.createElement('div');
  div.className = 'qb-q-block';
  div.style = "background:#f8fafc; padding:1.2rem; border-radius:8px; border:1px solid var(--lms-border); margin-bottom:1rem; position:relative;";
  div.innerHTML = `
    <button style="position:absolute; top:10px; right:10px; background:none; border:none; color:var(--lms-red); cursor:pointer;" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    <div class="lms-form-group"><label>Question ${index}</label><input type="text" class="qb-q-text" placeholder="Type the question here..."></div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.8rem; margin-bottom:0.8rem;">
      <input type="text" class="qb-opt" data-opt="0" placeholder="Option A">
      <input type="text" class="qb-opt" data-opt="1" placeholder="Option B">
      <input type="text" class="qb-opt" data-opt="2" placeholder="Option C">
      <input type="text" class="qb-opt" data-opt="3" placeholder="Option D">
    </div>
    <div class="lms-form-group" style="margin:0;"><label style="font-size:0.8rem;">Correct Answer</label>
      <select class="qb-ans" style="padding:0.4rem; font-size:0.9rem;">
        <option value="0">Option A</option><option value="1">Option B</option><option value="2">Option C</option><option value="3">Option D</option>
      </select>
    </div>
  `;
  container.appendChild(div);
};

window.saveQuiz = async function() {
  if(!supabaseClient) return toast('Database connection missing!', 'error');
  
  const title = document.getElementById('qb-title').value.trim();
  const subject = document.getElementById('qb-subject').value;
  const duration = parseInt(document.getElementById('qb-duration').value) || 15;
  const reveal = document.getElementById('qb-reveal').value;
  const qBlocks = document.querySelectorAll('.qb-q-block');
  const btn = document.getElementById('btn-save-quiz');
  
  if(!title) return toast('Please enter a quiz title.', 'error');
  if(qBlocks.length === 0) return toast('Please add at least one question.', 'error');
  
  let questions = [];
  let valid = true;
  qBlocks.forEach(block => {
    const qText = block.querySelector('.qb-q-text').value.trim();
    const opts = Array.from(block.querySelectorAll('.qb-opt')).map(i => i.value.trim());
    const ans = parseInt(block.querySelector('.qb-ans').value);
    if(!qText || opts.some(o => o === '')) valid = false;
    questions.push({ q: qText, options: opts, answer: ans });
  });
  
  if(!valid) return toast('Please fill in all questions and options completely.', 'error');
  
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  btn.disabled = true;
  
  const payload = { title, subject, duration, reveal_mode: reveal, questions, class: currentUser.class };
  const { error } = await supabaseClient.from('quizzes').insert([payload]);
  
  btn.innerHTML = '<i class="fas fa-save"></i> Publish Quiz'; btn.disabled = false;
  
  if(error) return toast('DB Error: ' + error.message, 'error');
  closeModal('quiz-builder-modal');
};

window.deleteQuiz = async function(id) {
  if(!supabaseClient) return;
  if(confirm('Delete this quiz permanently?')) {
    const { error } = await supabaseClient.from('quizzes').delete().eq('id', id);
    if(error) return toast('Delete failed.', 'error');
  }
};

window.viewQuizResults = function(quizId) {
  const quiz = QUIZZES.find(q => q.id === quizId);
  const subs = QUIZ_SUBMISSIONS.filter(s => s.quiz_id === quizId);
  
  if(!document.getElementById('quiz-results-modal')) {
    const m = document.createElement('div');
    m.className = 'lms-modal'; m.id = 'quiz-results-modal';
    document.body.appendChild(m);
  }
  
  const m = document.getElementById('quiz-results-modal');
  m.innerHTML = `
    <div class="lms-modal-box" style="max-width: 600px;">
      <div class="modal-h">
        <h3><i class="fas fa-chart-bar" style="color:var(--primary);margin-right:6px;"></i>Quiz Results</h3>
        <button onclick="closeModal('quiz-results-modal')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
          <strong style="font-size:1.1rem; color:var(--text);">${quiz.title}</strong>
          ${quiz.reveal_mode === 'manual' 
            ? `<button class="btn-gold" style="padding:0.5rem 1rem; border-radius:8px; border:none; font-weight:bold; box-shadow:0 4px 10px rgba(234, 179, 8, 0.2);" onclick="publishQuizResults('${quiz.id}')"><i class="fas fa-bullhorn"></i> Publish Scores</button>` 
            : `<span class="chip green" style="padding:0.5rem 1rem; border-radius:8px;"><i class="fas fa-check-circle"></i> Scores Published</span>`
          }
        </div>
        ${subs.length === 0 ? '<div class="empty-state" style="padding:2rem;"><p style="color:var(--lms-muted);">No submissions yet.</p></div>' : `
          <div style="border:1px solid var(--lms-border); border-radius:8px; overflow:hidden;">
            <table class="lms-tbl" style="width:100%;">
              <thead style="background:var(--lms-surface);"><tr><th style="padding:1rem;text-align:left;">Student</th><th>Score</th></tr></thead>
              <tbody>
                ${subs.map(s => `<tr style="border-top:1px solid var(--lms-border);"><td style="padding:1rem;">${s.student_name}</td><td style="text-align:center; font-size:1.1rem;"><strong>${s.score} / ${s.total_questions}</strong></td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </div>
  `;
  openModal('quiz-results-modal');
};

window.publishQuizResults = async function(quizId) {
  if(!supabaseClient) return;
  if(!confirm('Publish these results? Students will immediately be able to see their scores.')) return;
  
  const { error } = await supabaseClient.from('quizzes').update({ reveal_mode: 'instant' }).eq('id', quizId);
  
  if(error) return toast('Failed to publish: ' + error.message, 'error');
  
  closeModal('quiz-results-modal');
  toast('Scores published successfully! 📢');
};

/* ====================== QUIZ ENGINE (STUDENT PLAYER) ====================== */
let playerTimerInt = null;

function injectQuizPlayer() {
  if(document.getElementById('quiz-player-overlay')) return;
  const d = document.createElement('div');
  d.id = 'quiz-player-overlay';
  d.style = "display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:#f8fafc; z-index:9999; overflow-y:auto;";
  document.body.appendChild(d);
}

window.startQuizPlayer = function(quizId) {
  injectQuizPlayer();
  const quiz = QUIZZES.find(q => q.id === quizId);
  if(!quiz) return;
  
  window.currentQuizQuestionIndex = 0;
  window.currentQuizData = quiz;
  
  const overlay = document.getElementById('quiz-player-overlay');
  overlay.innerHTML = `
    <div style="background:#fff; padding:1rem 2rem; box-shadow:0 2px 10px rgba(0,0,0,0.05); position:sticky; top:0; z-index:10; display:flex; justify-content:space-between; align-items:center;">
      <h2 style="margin:0; font-size:1.2rem; color:var(--primary);">${quiz.title}</h2>
      <div style="background:var(--lms-red); color:#fff; padding:0.5rem 1.2rem; border-radius:99px; font-family:monospace; font-size:1.2rem; font-weight:bold; box-shadow:0 4px 10px rgba(220, 38, 38, 0.2);" id="qp-timer">00:00</div>
    </div>
    
    <div style="max-width:800px; margin:1.5rem auto 0; padding:0 1rem;">
      <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:var(--lms-muted); margin-bottom:0.5rem; font-weight:600;">
        <span>Quiz Progress</span>
        <span id="qp-progress-text">Question 1 of ${quiz.questions.length}</span>
      </div>
      ${renderProgressBar(100/quiz.questions.length, 'var(--accent)')}
    </div>

    <div style="max-width:800px; margin:2rem auto; padding:0 1rem; padding-bottom:100px;">
      <input type="hidden" id="qp-quiz-id" value="${quiz.id}">
      ${quiz.questions.map((q, i) => `
        <div class="qp-q-card" id="qp-card-${i}" style="background:#fff; padding:2rem; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.04); display:${i === 0 ? 'block' : 'none'}; border: 1px solid var(--lms-border);" data-index="${i}" data-ans="${q.answer}">
          <h3 style="margin-top:0; font-size:1.2rem; line-height:1.6; color:var(--text);"><span style="color:var(--accent); margin-right:8px; font-weight:800;">${i+1}.</span> ${q.q}</h3>
          
          <div style="display:flex; flex-direction:column; gap:0.8rem; margin-top:1.5rem;">
            ${q.options.map((opt, optIdx) => `
              <label style="display:flex; align-items:center; gap:1rem; padding:1.2rem; border:2px solid var(--lms-border); border-radius:10px; cursor:pointer; transition:all 0.2s; background:#f8fafc;" onmouseover="if(!this.querySelector('input').checked) this.style.borderColor='var(--primary)'" onmouseout="if(!this.querySelector('input').checked) this.style.borderColor='var(--lms-border)'">
                <input type="radio" name="q_${i}" value="${optIdx}" style="width:20px; height:20px; accent-color:var(--primary); cursor:pointer;" onchange="this.parentElement.parentElement.querySelectorAll('label').forEach(l=>{l.style.borderColor='var(--lms-border)'; l.style.background='#f8fafc';}); this.parentElement.style.borderColor='var(--primary)'; this.parentElement.style.background='#eff6ff';">
                <span style="font-size:1.05rem; color:var(--text);">${opt}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
    
    <div style="position:fixed; bottom:0; left:0; width:100%; background:#fff; padding:1rem 2rem; border-top:1px solid var(--lms-border); box-shadow:0 -4px 20px rgba(0,0,0,0.06); z-index:20;">
      <div style="max-width:800px; margin:0 auto; display:flex; justify-content:space-between; align-items:center;">
        <button class="btn-outline" id="btn-prev-q" style="padding:0.8rem 2rem; border-radius:99px; visibility:hidden; font-weight:600;" onclick="navigateQuiz(-1)"><i class="fas fa-arrow-left"></i> Previous</button>
        
        <button class="btn-lms-primary" id="btn-next-q" style="padding:0.8rem 3rem; border-radius:99px; font-weight:600; box-shadow:0 4px 15px rgba(13,59,102,0.3); ${quiz.questions.length === 1 ? 'display:none;' : ''}" onclick="navigateQuiz(1)">Next <i class="fas fa-arrow-right"></i></button>
        
        <button class="btn-lms-primary" id="btn-submit-quiz" style="padding:0.8rem 3rem; font-weight:600; border-radius:99px; background:#16a34a; border-color:#16a34a; box-shadow:0 4px 15px rgba(22, 163, 74, 0.3); ${quiz.questions.length > 1 ? 'display:none;' : ''}" onclick="submitQuiz()"><i class="fas fa-check-double"></i> Submit Answers</button>
      </div>
    </div>
  `;
  
  overlay.style.display = 'block';
  document.body.style.overflow = 'hidden'; 
  
  let timeRemaining = quiz.duration * 60;
  const timerEl = document.getElementById('qp-timer');
  
  clearInterval(playerTimerInt);
  playerTimerInt = setInterval(() => {
    timeRemaining--;
    const m = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
    const s = (timeRemaining % 60).toString().padStart(2, '0');
    timerEl.textContent = `${m}:${s}`;
    
    if(timeRemaining === 300) { toast('⚠️ 5 minutes remaining!', 'error'); }
    if(timeRemaining === 60) {
        toast('⚠️ 1 minute remaining! Wrap up your answers.', 'error');
        timerEl.style.animation = 'pulse 1s infinite alternate';
    }
    
    if(timeRemaining <= 0) {
      clearInterval(playerTimerInt);
      toast('Time is up! Auto-submitting quiz.', 'error');
      submitQuiz(true); 
    }
  }, 1000);
};

window.navigateQuiz = function(dir) {
  const totalQ = window.currentQuizData.questions.length;
  
  document.getElementById(`qp-card-${window.currentQuizQuestionIndex}`).style.display = 'none';
  window.currentQuizQuestionIndex += dir;
  document.getElementById(`qp-card-${window.currentQuizQuestionIndex}`).style.display = 'block';
  
  document.getElementById('btn-prev-q').style.visibility = window.currentQuizQuestionIndex === 0 ? 'hidden' : 'visible';
  
  if(window.currentQuizQuestionIndex === totalQ - 1) {
    document.getElementById('btn-next-q').style.display = 'none';
    document.getElementById('btn-submit-quiz').style.display = 'block';
  } else {
    document.getElementById('btn-next-q').style.display = 'block';
    document.getElementById('btn-submit-quiz').style.display = 'none';
  }

  document.getElementById('qp-progress-text').textContent = `Question ${window.currentQuizQuestionIndex + 1} of ${totalQ}`;
  const pct = ((window.currentQuizQuestionIndex + 1) / totalQ) * 100;
  document.querySelector('#quiz-player-overlay .fill').style.width = pct + '%';
};

window.submitQuiz = async function(isAuto = false) {
  if(!isAuto && !confirm('Are you sure you want to submit? You cannot change your answers later.')) return;
  
  clearInterval(playerTimerInt);
  const btn = document.getElementById('btn-submit-quiz');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Grading...';
  btn.disabled = true;
  
  const quizId = document.getElementById('qp-quiz-id').value;
  const cards = document.querySelectorAll('.qp-q-card');
  let score = 0;
  
  cards.forEach(card => {
    const correctAns = card.getAttribute('data-ans');
    const selected = card.querySelector('input[type="radio"]:checked');
    if(selected && selected.value === correctAns) {
      score++;
    }
  });
  
  const payload = {
    quiz_id: quizId,
    student_id: currentUser.id,
    student_name: currentUser.name,
    class: currentUser.class,
    score: score,
    total_questions: cards.length
  };
  
  const { error } = await supabaseClient.from('quiz_submissions').insert([payload]);
  
  if(error) {
    btn.innerHTML = '<i class="fas fa-check-double"></i> Submit Answers'; btn.disabled = false;
    return toast('Submission failed: ' + error.message, 'error');
  }
  
  document.getElementById('quiz-player-overlay').style.display = 'none';
  document.body.style.overflow = '';
  toast('Quiz submitted successfully! 🎉');
};

/* ====================== NOTICES & ANNOUNCEMENTS (Q&A) ====================== */
window.buildNotices = function(isTeacher = false) {
  const classNotices = NOTICES.filter(n => n.class === currentUser.class || n.class === 'All');
  
  return `
  <div class="page-header" style="margin-bottom: 2rem; display:flex; justify-content:space-between; align-items:center;">
    <div><h2>School Board</h2><span style="color:var(--lms-muted);">Announcements & Q&A</span></div>
    ${isTeacher ? `<button class="btn-lms-primary" style="padding: 0.6rem 1.2rem; border-radius: 8px; box-shadow: 0 4px 10px rgba(13, 59, 102, 0.2);" onclick="openCreateNoticeModal()"><i class="fas fa-bullhorn"></i> Post Notice</button>` : ''}
  </div>
  
  <div style="display: flex; flex-direction: column; gap: 1rem;">
    ${classNotices.length === 0 ? '<div class="empty-state" style="padding:4rem;background:#fff;border-radius:12px;text-align:center;"><p>No notices have been posted yet.</p></div>' : 
      classNotices.map(n => {
        const commentCount = NOTICE_COMMENTS.filter(c => String(c.notice_id) === String(n.id)).length;
        return `
        <div style="background: #fff; padding: 1.5rem; border-radius: 12px; border-left: 5px solid var(--accent); box-shadow: 0 4px 15px rgba(0,0,0,0.03); cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s;" onclick="viewNoticeThread('${n.id}')" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 8px 20px rgba(0,0,0,0.06)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.03)'">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; align-items: center;">
            <strong style="font-size: 1.15rem; color: var(--text);">${n.title}</strong>
            <span style="font-size: 0.8rem; color: var(--lms-muted); background: var(--lms-surface); padding: 4px 10px; border-radius: 6px;">${fmtDate(n.created_at || new Date())}</span>
          </div>
          <p style="font-size: 0.9rem; color: #64748b; margin: 0 0 1rem 0; line-height: 1.5;">${n.content.length > 120 ? n.content.substring(0, 120) + '...' : n.content}</p>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.8rem; color: var(--primary); font-weight: 600;"><i class="fas fa-comments" style="color:var(--accent);"></i> ${commentCount} Questions/Replies</span>
            <span style="font-size: 0.8rem; color: var(--lms-muted);"><i class="fas fa-user-edit"></i> ${n.author_name}</span>
          </div>
        </div>
      `}).join('')}
  </div>`;
};

window.openCreateNoticeModal = function() {
  if(!document.getElementById('create-notice-modal')) {
    const m = document.createElement('div');
    m.className = 'lms-modal'; m.id = 'create-notice-modal';
    document.body.appendChild(m);
  }
  
  document.getElementById('create-notice-modal').innerHTML = `
    <div class="lms-modal-box">
      <div class="modal-h"><h3><i class="fas fa-bullhorn" style="color:var(--accent);margin-right:6px;"></i>Post Announcement</h3><button onclick="closeModal('create-notice-modal')"><i class="fas fa-times"></i></button></div>
      <div class="modal-body">
        <div class="lms-form-group"><label>Notice Title</label><input type="text" id="notice-title" placeholder="e.g. Field Trip Tomorrow"></div>
        <div class="lms-form-group"><label>Message</label><textarea id="notice-content" rows="4" placeholder="Type the full announcement here..."></textarea></div>
        <div style="margin-top:1.2rem;display:flex;gap:.7rem;">
          <button class="btn-lms-primary" id="btn-save-notice" style="flex:1;" onclick="saveNotice()"><i class="fas fa-paper-plane"></i> Post to Class</button>
          <button class="btn-outline" onclick="closeModal('create-notice-modal')">Cancel</button>
        </div>
      </div>
    </div>
  `;
  openModal('create-notice-modal');
};

window.saveNotice = async function() {
  if (!supabaseClient) return toast('Database connection missing!', 'error');
  
  const title = document.getElementById('notice-title').value.trim();
  const content = document.getElementById('notice-content').value.trim();
  const btn = document.getElementById('btn-save-notice');
  
  if(!title || !content) return toast('Please enter a title and message.', 'error');
  
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
  btn.disabled = true;
  
  const payload = {
    title: title,
    content: content,
    class: currentUser.class,
    author_id: currentUser.id,
    author_name: currentUser.name
  };
  
  const { data, error } = await supabaseClient.from('notices').insert([payload]).select();
  
  btn.innerHTML = '<i class="fas fa-paper-plane"></i> Post to Class'; btn.disabled = false;
  
  if(error) return toast('DB Error: ' + error.message, 'error');
  
  if(data) NOTICES.unshift(data[0]);
  closeModal('create-notice-modal');
  renderPage('t-notices');
  toast('Notice posted successfully! 📢');
};

window.viewNoticeThread = function(noticeId) {
  const notice = NOTICES.find(n => String(n.id) === String(noticeId));
  const comments = NOTICE_COMMENTS.filter(c => String(c.notice_id) === String(noticeId));
  
  if(!document.getElementById('view-notice-modal')) {
    const m = document.createElement('div');
    m.className = 'lms-modal'; m.id = 'view-notice-modal';
    document.body.appendChild(m);
  }
  
  const m = document.getElementById('view-notice-modal');
  m.dataset.currentNotice = noticeId; 

  m.innerHTML = `
    <div class="lms-modal-box" style="max-width: 650px; height: 85vh; display: flex; flex-direction: column;">
      <div class="modal-h" style="flex-shrink:0;">
        <h3><i class="fas fa-clipboard-list" style="color:var(--primary);margin-right:6px;"></i>Notice Details</h3>
        <button onclick="closeModal('view-notice-modal')"><i class="fas fa-times"></i></button>
      </div>
      
      <div class="modal-body" style="overflow-y:auto; flex:1; padding-bottom:1rem;">
        <div style="background:#f8fafc; padding:1.5rem; border-radius:10px; border:1px solid var(--lms-border); margin-bottom:1.5rem;">
          <h4 style="margin:0 0 0.5rem 0; font-size:1.2rem; color:var(--text);">${notice.title}</h4>
          <div style="font-size:0.8rem; color:var(--lms-muted); margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem;">
            <i class="fas fa-user-circle"></i> Posted by ${notice.author_name} on ${fmtDate(notice.created_at || new Date())}
          </div>
          <p style="font-size:0.95rem; line-height:1.6; color:var(--text); white-space:pre-wrap; margin:0;">${notice.content}</p>
        </div>

        <h5 style="margin:0 0 1rem 0; color:var(--primary); font-size:1rem; border-bottom:2px solid var(--lms-surface); padding-bottom:0.5rem;">Class Discussion</h5>
        
        <div id="notice-comments-list" style="display:flex; flex-direction:column; gap:1rem;">
          ${comments.length === 0 ? '<p style="color:var(--lms-muted); font-size:0.85rem; text-align:center; padding:1rem;">No questions or comments yet. Start the discussion!</p>' : 
            comments.map(c => {
              const isTeacher = c.user_role === 'teacher' || c.user_role === 'admin';
              const isMe = c.user_id === currentUser.id;
              
              return `
              <div style="display:flex; gap:0.8rem; align-items:flex-start; ${isMe ? 'flex-direction:row-reverse;' : ''}">
                <div style="width:34px; height:34px; border-radius:50%; background:${isTeacher ? 'var(--primary)' : 'var(--accent)'}; color:${isTeacher ? '#fff' : 'var(--primary)'}; display:flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:bold; flex-shrink:0;">${getInitials(c.user_name)}</div>
                
                <div style="background:${isTeacher ? '#eff6ff' : (isMe ? '#fffbeb' : '#f1f5f9')}; padding:0.8rem 1rem; border-radius:12px; border:1px solid ${isTeacher ? '#bfdbfe' : (isMe ? '#fde68a' : '#e2e8f0')}; max-width:85%;">
                  <div style="display:flex; justify-content:space-between; gap:1rem; margin-bottom:0.4rem; align-items:center;">
                    <strong style="font-size:0.8rem; color:var(--text);">${c.user_name} ${isTeacher ? '<i class="fas fa-check-circle" style="color:var(--lms-blue); margin-left:4px;" title="Staff"></i>' : ''}</strong>
                    <span style="font-size:0.7rem; color:var(--lms-muted);">${fmtDate(c.created_at || new Date())}</span>
                  </div>
                  <div style="font-size:0.9rem; color:var(--text); line-height:1.5;">${c.text}</div>
                </div>
              </div>
            `}).join('')}
        </div>
      </div>
      
      <div style="padding:1rem 1.5rem; background:#fff; border-top:1px solid var(--lms-border); flex-shrink:0; display:flex; gap:0.8rem; align-items:center;">
        <input type="text" id="new-comment-text" placeholder="Type a question or reply..." style="flex:1; padding:0.8rem 1.2rem; border:1px solid var(--lms-border); border-radius:99px; outline:none; font-family:var(--font-lms); background:#f8fafc;" onkeydown="if(event.key==='Enter') addNoticeComment('${notice.id}')">
        <button class="btn-lms-primary" style="width:45px; height:45px; border-radius:50%; padding:0; min-height:0; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow: 0 4px 10px rgba(13, 59, 102, 0.2);" onclick="addNoticeComment('${notice.id}')"><i class="fas fa-paper-plane"></i></button>
      </div>
    </div>
  `;
  openModal('view-notice-modal');

  setTimeout(() => {
    const body = m.querySelector('.modal-body');
    if(body) body.scrollTop = body.scrollHeight;
  }, 10);
};

window.addNoticeComment = async function(noticeId) {
  if (!supabaseClient) return toast('Database connection missing!', 'error');
  
  const input = document.getElementById('new-comment-text');
  const text = input.value.trim();
  if(!text) return;

  input.disabled = true;

  const payload = {
    notice_id: noticeId,
    user_id: currentUser.id,
    user_name: currentUser.name,
    user_role: currentUser.role,
    text: text
  };

  const { data, error } = await supabaseClient.from('notice_comments').insert([payload]).select();

  input.disabled = false;
  input.value = '';
  input.focus();

  if(error) return toast('DB Error: ' + error.message, 'error');

  if(data) NOTICE_COMMENTS.push(data[0]);
  viewNoticeThread(noticeId); 
};

/* ====================== REAL-TIME LISTENERS ====================== */
let realtimeChannel = null;

function setupRealtimeListeners() {
  if (!supabaseClient) return;

  if (realtimeChannel) supabaseClient.removeChannel(realtimeChannel);

  realtimeChannel = supabaseClient.channel('lms-realtime-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, payload => {
      const { eventType, new: newRec, old: oldRec } = payload;
      if (eventType === 'INSERT') { SUBMISSIONS.unshift(newRec); if(currentUser.role === 'teacher') toast('New submission received! 📥'); } 
      else if (eventType === 'UPDATE') { const idx = SUBMISSIONS.findIndex(s => String(s.id) === String(newRec.id)); if (idx !== -1) SUBMISSIONS[idx] = newRec; } 
      else if (eventType === 'DELETE') { SUBMISSIONS = SUBMISSIONS.filter(s => String(s.id) !== String(oldRec.id)); }
      refreshUI();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, payload => {
      const { eventType, new: newRec, old: oldRec } = payload;
      if (eventType === 'INSERT') { ASSIGNMENTS.unshift(mapAssignment(newRec)); if(currentUser.role === 'student') toast('New assignment posted! 📚'); } 
      else if (eventType === 'UPDATE') { const idx = ASSIGNMENTS.findIndex(a => String(a.id) === String(newRec.id)); if (idx !== -1) ASSIGNMENTS[idx] = mapAssignment(newRec); } 
      else if (eventType === 'DELETE') { ASSIGNMENTS = ASSIGNMENTS.filter(a => String(a.id) !== String(oldRec.id)); }
      refreshUI();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'quizzes' }, payload => {
      const { eventType, new: newRec, old: oldRec } = payload;
      if (eventType === 'INSERT') { QUIZZES.unshift(newRec); if(currentUser.role === 'student') toast('New Quiz Published! ⏱️'); } 
      else if (eventType === 'UPDATE') { const idx = QUIZZES.findIndex(q => q.id === newRec.id); if (idx !== -1) QUIZZES[idx] = newRec; } 
      else if (eventType === 'DELETE') { QUIZZES = QUIZZES.filter(q => q.id !== oldRec.id); }
      refreshUI();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_submissions' }, payload => {
      const { eventType, new: newRec, old: oldRec } = payload;
      if (eventType === 'INSERT') { QUIZ_SUBMISSIONS.unshift(newRec); } 
      else if (eventType === 'UPDATE') { const idx = QUIZ_SUBMISSIONS.findIndex(q => q.id === newRec.id); if (idx !== -1) QUIZ_SUBMISSIONS[idx] = newRec; } 
      else if (eventType === 'DELETE') { QUIZ_SUBMISSIONS = QUIZ_SUBMISSIONS.filter(q => q.id !== oldRec.id); }
      refreshUI();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, payload => {
      const { eventType, new: newRec, old: oldRec } = payload;
      if (eventType === 'INSERT') { ATTENDANCE_RECORDS.unshift(newRec); } 
      else if (eventType === 'UPDATE') { const idx = ATTENDANCE_RECORDS.findIndex(a => String(a.id) === String(newRec.id)); if (idx !== -1) ATTENDANCE_RECORDS[idx] = newRec; } 
      else if (eventType === 'DELETE') { ATTENDANCE_RECORDS = ATTENDANCE_RECORDS.filter(a => String(a.id) !== String(oldRec.id)); }
      refreshUI();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, payload => {
      const { eventType, new: newRec, old: oldRec } = payload;
      if (eventType === 'INSERT') { NOTICES.unshift(newRec); if(currentUser.role === 'student') toast('New Class Notice! 📢'); } 
      else if (eventType === 'UPDATE') { const idx = NOTICES.findIndex(n => String(n.id) === String(newRec.id)); if (idx !== -1) NOTICES[idx] = newRec; } 
      else if (eventType === 'DELETE') { NOTICES = NOTICES.filter(n => String(n.id) !== String(oldRec.id)); }
      refreshUI();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notice_comments' }, payload => {
      const { eventType, new: newRec } = payload;
      if (eventType === 'INSERT') { 
        NOTICE_COMMENTS.push(newRec);
        const modal = document.getElementById('view-notice-modal');
        if (modal && modal.classList.contains('open') && modal.dataset.currentNotice === String(newRec.notice_id)) {
          viewNoticeThread(newRec.notice_id);
        }
      } 
      refreshUI();
    })
    .subscribe();
}

function refreshUI() {
  buildDashboard(); 
  if (currentPage) renderPage(currentPage);
}

/* ====================== GALLERY ACTIONS ====================== */
window.openGalleryUploadModal = function() {
  if(!document.getElementById('admin-gallery-modal')) {
    const m = document.createElement('div');
    m.className = 'lms-modal'; m.id = 'admin-gallery-modal';
    document.body.appendChild(m);
  }
  document.getElementById('admin-gallery-modal').innerHTML = `
    <div class="lms-modal-box" style="max-width:500px;">
      <div class="modal-h"><h3><i class="fas fa-image" style="color:var(--primary);margin-right:6px;"></i>Upload New Photo</h3><button onclick="closeModal('admin-gallery-modal')"><i class="fas fa-times"></i></button></div>
      <div class="modal-body">
        <div class="lms-form-group"><label>Photo Title/Caption</label><input type="text" id="gal-title" placeholder="e.g. 2026 Sports Day"></div>
        <div class="lms-form-group"><label>Select Image</label><input type="file" id="gal-file" accept="image/*" style="padding: 0.5rem; border: 1px dashed var(--lms-border); border-radius: 8px; width: 100%; background: #fff;"></div>
        <button class="btn-lms-primary" id="btn-save-gal" style="width:100%; margin-top:1rem; padding: 0.8rem;" onclick="saveGalleryImage()"><i class="fas fa-upload"></i> Upload to Gallery</button>
      </div>
    </div>`;
  openModal('admin-gallery-modal');
};

window.saveGalleryImage = async function() {
  if(!supabaseClient) return toast('Database connection missing', 'error');
  const title = document.getElementById('gal-title').value.trim();
  const fileInput = document.getElementById('gal-file');
  const btn = document.getElementById('btn-save-gal');
  
  if(fileInput.files.length === 0) return toast('Please select an image file.', 'error');
  
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
  btn.disabled = true;
  
  const file = fileInput.files[0];
  const filePath = `gallery/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
  
  const { error: uploadError } = await supabaseClient.storage.from('lms-files').upload(filePath, file);
  if(uploadError) { btn.innerHTML = '<i class="fas fa-upload"></i> Upload to Gallery'; btn.disabled = false; return toast(uploadError.message, 'error'); }
  
  const { data: urlData } = supabaseClient.storage.from('lms-files').getPublicUrl(filePath);
  
  const { data, error } = await supabaseClient.from('gallery_images').insert([{ image_url: urlData.publicUrl, title: title }]).select();
  
  if(error) { btn.innerHTML = '<i class="fas fa-upload"></i> Upload to Gallery'; btn.disabled = false; return toast(error.message, 'error'); }
  
  if(data) GALLERY_DB.unshift(data[0]);
  closeModal('admin-gallery-modal');
  renderPage('a-gallery');
  toast('Photo uploaded successfully!');
};

window.deleteGalleryImage = async function(id) {
  if(!supabaseClient) return;
  if(confirm('Are you sure you want to delete this photo from the public gallery?')) {
    const { error } = await supabaseClient.from('gallery_images').delete().eq('id', id);
    if(error) return toast(error.message, 'error');
    GALLERY_DB = GALLERY_DB.filter(img => String(img.id) !== String(id));
    renderPage('a-gallery');
    toast('Image deleted.');
  }
};

/* ====================== EVENT ACTIONS ====================== */
window.openEventModal = function(id = null) {
  if(!document.getElementById('admin-event-modal')) {
    const m = document.createElement('div');
    m.className = 'lms-modal'; m.id = 'admin-event-modal';
    document.body.appendChild(m);
  }
  const m = document.getElementById('admin-event-modal');
  let ev = id ? EVENTS_DB.find(e => String(e.id) === String(id)) : null;
  
  m.innerHTML = `
    <div class="lms-modal-box" style="max-width:500px;">
      <div class="modal-h"><h3><i class="fas fa-calendar-alt" style="color:var(--primary);margin-right:6px;"></i>${ev ? 'Edit Event' : 'Add New Event'}</h3><button onclick="closeModal('admin-event-modal')"><i class="fas fa-times"></i></button></div>
      <div class="modal-body">
        <input type="hidden" id="ev-id" value="${ev ? ev.id : ''}">
        <div class="lms-form-group"><label>Event Title</label><input type="text" id="ev-title" value="${ev ? ev.title : ''}" placeholder="e.g. Independence Day Parade"></div>
        <div class="lms-form-group"><label>Event Date</label><input type="date" id="ev-date" value="${ev ? ev.event_date : ''}"></div>
        <div class="lms-form-group"><label>Short Description</label><textarea id="ev-desc" rows="3" placeholder="Time, location, details...">${ev ? (ev.description||'') : ''}</textarea></div>
        <div style="margin-top:1.2rem;display:flex;gap:.7rem;">
          <button class="btn-lms-primary" id="btn-save-ev" style="flex:1;" onclick="saveEvent()"><i class="fas fa-save"></i> Save Event</button>
        </div>
      </div>
    </div>`;
  openModal('admin-event-modal');
};

window.saveEvent = async function() {
  if(!supabaseClient) return toast('Database connection missing', 'error');
  const btn = document.getElementById('btn-save-ev');
  const id = document.getElementById('ev-id').value;
  const title = document.getElementById('ev-title').value.trim();
  const date = document.getElementById('ev-date').value;
  const desc = document.getElementById('ev-desc').value.trim();
  
  if(!title || !date) return toast('Title and Date are required.', 'error');
  
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; btn.disabled = true;
  
  const payload = { title: title, event_date: date, description: desc };
  
  if(id) {
    const { error } = await supabaseClient.from('events').update(payload).eq('id', id);
    if(error) { btn.innerHTML='Save Event'; btn.disabled=false; return toast(error.message, 'error'); }
  } else {
    const { error } = await supabaseClient.from('events').insert([payload]);
    if(error) { btn.innerHTML='Save Event'; btn.disabled=false; return toast(error.message, 'error'); }
  }
  
  const { data } = await supabaseClient.from('events').select('*').order('event_date',{ascending:true});
  if(data) EVENTS_DB = data;
  
  closeModal('admin-event-modal'); renderPage('a-events'); toast('Event saved successfully!');
};

window.deleteEvent = async function(id) {
  if(!supabaseClient) return;
  if(confirm('Are you sure you want to delete this event?')) {
    const { error } = await supabaseClient.from('events').delete().eq('id', id);
    if(error) return toast(error.message, 'error');
    EVENTS_DB = EVENTS_DB.filter(e => String(e.id) !== String(id));
    renderPage('a-events'); toast('Event deleted.', 'error');
  }
};

/* ====================== RESOURCE MANAGER (IN-APP READER & SECURE AI QUIZ) ====================== */
window.openResourceManager = function() {
  if(!document.getElementById('resource-manager-modal')) {
    const m = document.createElement('div');
    m.className = 'lms-modal'; m.id = 'resource-manager-modal';
    document.body.appendChild(m);
  }
  
  let datalistHTML = '<datalist id="res-subject-list">';
  SUBJECTS.forEach(s => { datalistHTML += `<option value="${s.name}">`; });
  datalistHTML += '</datalist>';

  document.getElementById('resource-manager-modal').innerHTML = `
    <div class="lms-modal-box" style="max-width:700px;">
      <div class="modal-h"><h3><i class="fas fa-book" style="color:var(--accent);margin-right:6px;"></i>Create Reading Material</h3><button onclick="closeModal('resource-manager-modal')"><i class="fas fa-times"></i></button></div>
      <div class="modal-body">
        ${datalistHTML}
        <div class="lms-form-group"><label>Material Title</label><input type="text" id="res-title" placeholder="e.g. Chapter 1: The Solar System"></div>
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.8rem;">
          <div class="lms-form-group">
            <label>Subject</label>
            <input type="text" id="res-subject" list="res-subject-list" placeholder="Select or type custom subject..." style="width: 100%; padding: 0.75rem 1rem; border: 1.5px solid var(--lms-border); border-radius: 10px; font-family: var(--font-lms);">
          </div>
          <div class="lms-form-group">
            <label>Upload Ebook/File</label>
            <input type="file" id="res-file" accept=".pdf,.doc,.docx,.epub,.png,.jpg" style="padding: 0.5rem; border: 1px dashed var(--lms-border); border-radius: 8px; width: 100%; background: #f8fafc;">
          </div>
        </div>

        <div class="lms-form-group">
          <label>In-App Reading Content (Required for AI Quiz)</label>
          <textarea id="res-content" rows="6" placeholder="Type or paste the chapter content here. The AI will use this text to automatically generate quiz questions for the students..." style="line-height:1.6; font-size:1rem; padding: 1rem;"></textarea>
        </div>

        <div style="margin-top:1.2rem;display:flex;gap:.7rem;">
          <button class="btn-lms-primary" id="btn-save-res" style="flex:1;" onclick="saveResource()"><i class="fas fa-upload"></i> Publish Material</button>
        </div>
      </div>
    </div>`;
  openModal('resource-manager-modal');
};

window.saveResource = async function() {
  if(!supabaseClient) return toast('Database error', 'error');
  const btn = document.getElementById('btn-save-res');
  const title = document.getElementById('res-title').value.trim();
  const subject = document.getElementById('res-subject').value.trim();
  const content = document.getElementById('res-content').value.trim();
  const fileInput = document.getElementById('res-file');

  if(!title || !subject) return toast('Title and Subject are required', 'error');
  if(!content && fileInput.files.length === 0) return toast('Please provide either text content or upload a file.', 'error');

  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing...';
  btn.disabled = true;

  let fileUrl = null;
  
  if(fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const filePath = `resources/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
    const { error: uploadError } = await supabaseClient.storage.from('lms-files').upload(filePath, file);
    if(uploadError) {
      btn.innerHTML = '<i class="fas fa-upload"></i> Publish Material'; btn.disabled = false;
      return toast('File upload failed: ' + uploadError.message, 'error');
    }
    const { data: publicUrlData } = supabaseClient.storage.from('lms-files').getPublicUrl(filePath);
    fileUrl = publicUrlData.publicUrl;
  }

  const payload = {
    title, subject, content,
    file_url: fileUrl,
    class: currentUser.class,
    author_name: currentUser.name
  };

  const { data, error } = await supabaseClient.from('resources').insert([payload]).select();
  if(error) { btn.innerHTML = '<i class="fas fa-upload"></i> Publish Material'; btn.disabled = false; return toast(error.message, 'error'); }

  if(data) RESOURCES.unshift(data[0]);
  closeModal('resource-manager-modal');
  renderPage('t-resources');
  toast('Material published successfully!');
};

window.deleteResource = async function(id) {
  if(confirm('Permanently delete this material?')) {
    await supabaseClient.from('resources').delete().eq('id', id);
    RESOURCES = RESOURCES.filter(r => r.id !== id);
    renderPage('t-resources');
    toast('Material removed.', 'error');
  }
};

window.openResourceReader = function(id) {
  const r = RESOURCES.find(x => String(x.id) === String(id));
  if(!r) return;

  if(!document.getElementById('resource-reader-modal')) {
    const m = document.createElement('div');
    m.className = 'lms-modal'; m.id = 'resource-reader-modal';
    document.body.appendChild(m);
  }

  let fileViewer = '';
  if (r.file_url) {
     const ext = r.file_url.split('.').pop().toLowerCase();
     if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) {
         fileViewer = `<img src="${r.file_url}" style="width:100%; border-radius:12px; margin-bottom:1.5rem; border:1px solid var(--lms-border);">`;
     } else {
         fileViewer = `<iframe src="https://docs.google.com/viewer?url=${encodeURIComponent(r.file_url)}&embedded=true" style="width:100%; height:65vh; border:1px solid var(--lms-border); border-radius:12px; margin-bottom:1.5rem; background:#f8fafc;"></iframe>`;
     }
  }

  let aiBanner = '';
  if (r.content && r.content.length > 50) {
    aiBanner = `
      <div id="ai-quiz-container" style="margin-top: 3rem; padding: 2rem; background: #eff6ff; border-radius: 12px; text-align: center; border: 2px dashed #3b82f6;">
        <h3 style="color: #1e40af; margin-bottom: 0.5rem;"><i class="fas fa-robot"></i> Test Your Knowledge</h3>
        <p style="color: #3b82f6; font-size: 0.9rem; margin-bottom: 1.5rem;">Have the De-Bright AI generate a quick custom quiz based on what you just read.</p>
        <button id="ai-quiz-btn" class="btn-lms-primary" style="padding: 0.8rem 2rem; font-size: 1.1rem; border-radius: 99px; background: #2563eb; color: #fff;" onclick="generateAIQuiz('${r.id}')"><i class="fas fa-bolt"></i> Generate Auto-Quiz</button>
      </div>
    `;
  }

  document.getElementById('resource-reader-modal').innerHTML = `
    <div class="lms-modal-box" style="max-width: 850px; height: 95vh; display: flex; flex-direction: column; background: #fffcf8;">
      <div class="modal-h" style="background: #fffcf8; border-bottom: 1px solid #eaeaea; flex-shrink: 0;">
        <h3 style="font-family: 'Merriweather', serif; color: #333;"><i class="fas fa-book-open" style="color:var(--lms-muted); margin-right:8px;"></i>${r.subject}</h3>
        <button onclick="closeModal('resource-reader-modal')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body" style="overflow-y: auto; padding: 2rem; flex: 1;">
        <h1 style="font-family: 'Merriweather', serif; font-size: 2rem; color: #111; margin-bottom: 0.5rem; line-height: 1.3;">${r.title}</h1>
        <div style="font-size: 0.9rem; color: #666; margin-bottom: 2.5rem; text-transform: uppercase; letter-spacing: 1px;">By ${r.author_name}</div>
        
        ${fileViewer}
        ${r.content ? `<div style="font-family: 'Georgia', serif; font-size: 1.15rem; line-height: 1.8; color: #222; white-space: pre-wrap;">${r.content}</div>` : ''}
        ${aiBanner}
      </div>
    </div>
  `;
  openModal('resource-reader-modal');
};

/* ====================== SECURE VERCEL AI AUTO-QUIZ GENERATOR ====================== */
window.generateAIQuiz = async function(id) {
  const r = RESOURCES.find(x => String(x.id) === String(id));
  const btn = document.getElementById('ai-quiz-btn');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating questions...';
  btn.disabled = true;

  const prompt = `You are a strict teacher. Read the following text and generate exactly 3 multiple-choice questions to test the student.
  Return ONLY a raw JSON array. No markdown, no introductory text, no backticks.
  Format: [{"q": "Question?", "options": ["A", "B", "C", "D"], "answer": 1}]
  Text: ${r.content.substring(0, 4000)}`;

  try {
    // Calling your secure Vercel backend
    const response = await fetch('/api/generate-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt })
    });

    if (!response.ok) {
      throw new Error(`Server Error: ${response.status}`);
    }
    
    // The backend already parsed the JSON, so we just receive it directly
    const quizData = await response.json();
    
    if(!Array.isArray(quizData)) {
       throw new Error("Parsed data from server is not an array.");
    }

    // Launch the full-screen Quiz UI
    renderAutoQuiz(quizData, r.title);
    
  } catch(e) {
    console.error("AI Quiz Generation Failed:", e);
    btn.innerHTML = '<i class="fas fa-bolt"></i> Generate Auto-Quiz';
    btn.disabled = false;
    toast('Error: ' + e.message, 'error');
  }
};

window.renderAutoQuiz = function(quizData, materialTitle) {
  const readerModal = document.getElementById('resource-reader-modal');
  if(readerModal) readerModal.classList.remove('open');

  if(!document.getElementById('ai-quiz-overlay')) {
    const d = document.createElement('div');
    d.id = 'ai-quiz-overlay';
    d.style = "display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:#f8fafc; z-index:9999; overflow-y:auto;";
    document.body.appendChild(d);
  }

  const overlay = document.getElementById('ai-quiz-overlay');
  window.currentAIQuizState = { score: 0, total: quizData.length, answered: 0 };

  overlay.innerHTML = `
    <div style="background:#fff; padding:1rem 2rem; box-shadow:0 2px 10px rgba(0,0,0,0.05); position:sticky; top:0; z-index:10; display:flex; justify-content:space-between; align-items:center;">
      <h2 style="margin:0; font-size:1.2rem; color:var(--primary);"><i class="fas fa-robot" style="color:var(--accent); margin-right:8px;"></i>AI Knowledge Check</h2>
      <button onclick="document.getElementById('ai-quiz-overlay').style.display='none'; document.body.style.overflow='';" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--lms-muted);"><i class="fas fa-times"></i></button>
    </div>

    <div style="max-width:800px; margin:2rem auto; padding:0 1rem; padding-bottom:100px;">
      <div style="text-align:center; margin-bottom: 2rem;">
         <span class="chip blue" style="font-size:0.85rem; margin-bottom:0.5rem; padding: 6px 12px; display:inline-block;">${materialTitle || 'Reading Material'}</span>
         <h3 style="color:var(--lms-muted); font-size:1rem; font-weight:500;">Answer all questions below to see your final score.</h3>
      </div>

      ${quizData.map((q, idx) => `
        <div class="ai-q-card" style="background:#fff; padding:2rem; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.04); margin-bottom: 1.5rem; border: 1px solid var(--lms-border);">
          <h3 style="margin-top:0; font-size:1.15rem; line-height:1.6; color:var(--text);"><span style="color:var(--accent); margin-right:8px; font-weight:800;">${idx + 1}.</span> ${q.q}</h3>
          <div style="display:flex; flex-direction:column; gap:0.8rem; margin-top:1.5rem;" id="ai-q-opts-${idx}">
            ${q.options.map((opt, oIdx) => `
              <button onclick="checkAIAnswer(this, ${idx}, ${oIdx}, ${q.answer})" style="padding:1.2rem 1.5rem; text-align:left; border:2px solid var(--lms-border); border-radius:10px; background:#f8fafc; cursor:pointer; transition:all 0.2s; outline:none; font-size:1.05rem; color:var(--text); font-family:var(--font-lms);" onmouseover="if(!this.disabled) this.style.borderColor='var(--primary)'" onmouseout="if(!this.disabled) this.style.borderColor='var(--lms-border)'">
                ${opt}
              </button>
            `).join('')}
          </div>
        </div>
      `).join('')}

      <div id="ai-quiz-results" style="display:none; text-align:center; background:#fff; padding:3rem 2rem; border-radius:12px; box-shadow:0 8px 30px rgba(0,0,0,0.08); border-top:5px solid var(--accent); margin-top:3rem;">
         <h2 style="font-size:2rem; color:var(--primary); margin-bottom:0.5rem;">Quiz Complete!</h2>
         <p style="color:var(--lms-muted); font-size:1rem; margin-bottom:1.5rem;" id="ai-final-msg"></p>
         <div style="font-size:4rem; font-weight:800; color:var(--primary); margin-bottom:2rem; background:var(--lms-surface); display:inline-block; padding:1rem 3rem; border-radius:16px;" id="ai-final-score">0 / 3</div>
         <br>
         <button class="btn-lms-primary" style="padding:1rem 3rem; font-size:1.1rem; border-radius:99px; box-shadow:0 4px 15px rgba(10,37,64,0.2);" onclick="document.getElementById('ai-quiz-overlay').style.display='none'; document.body.style.overflow='';"><i class="fas fa-check"></i> Finish & Close</button>
      </div>
    </div>
  `;

  overlay.style.display = 'block';
  document.body.style.overflow = 'hidden'; 
};

window.checkAIAnswer = function(btn, qIdx, selectedIdx, correctIdx) {
  const parent = document.getElementById(`ai-q-opts-${qIdx}`);
  const buttons = parent.querySelectorAll('button');

  buttons.forEach(b => {
    b.disabled = true;
    b.style.cursor = 'default';
  });

  if (selectedIdx === correctIdx) {
    btn.style.background = '#dcfce7';
    btn.style.borderColor = '#22c55e';
    btn.style.color = '#15803d';
    btn.innerHTML += ' <i class="fas fa-check-circle" style="float:right; font-size:1.3rem;"></i>';
    window.currentAIQuizState.score++;
  } else {
    btn.style.background = '#fee2e2';
    btn.style.borderColor = '#ef4444';
    btn.style.color = '#b91c1c';
    btn.innerHTML += ' <i class="fas fa-times-circle" style="float:right; font-size:1.3rem;"></i>';

    buttons[correctIdx].style.background = '#dcfce7';
    buttons[correctIdx].style.borderColor = '#22c55e';
    buttons[correctIdx].style.color = '#15803d';
    buttons[correctIdx].innerHTML += ' <i class="fas fa-check-circle" style="float:right; font-size:1.3rem;"></i>';
  }

  window.currentAIQuizState.answered++;

  if (window.currentAIQuizState.answered === window.currentAIQuizState.total) {
    setTimeout(() => {
        const resDiv = document.getElementById('ai-quiz-results');
        const score = window.currentAIQuizState.score;
        const total = window.currentAIQuizState.total;
        const pct = score / total;

        document.getElementById('ai-final-score').innerHTML = `${score} <span style="color:var(--lms-muted); font-size:2.5rem;">/ ${total}</span>`;

        let msg = "Good effort! Review the material and try again.";
        if (pct === 1) msg = "Perfect score! You have mastered this material. 🏆";
        else if (pct >= 0.6) msg = "Great job! You have a solid understanding. 👍";

        document.getElementById('ai-final-msg').innerHTML = msg;
        resDiv.style.display = 'block';

        resDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 800); 
  }
};

/* ====================== AI TUTOR LOGIC ====================== */
window.lmsChatHistory = []; // Stores the conversation context

window.sendAiTutorMsg = async function() {
    const inputEl = document.getElementById('ai-chat-input');
    const chatWindow = document.getElementById('ai-chat-window');
    const text = inputEl.value.trim();
    
    if (!text) return;
    
    // 1. Instantly show the user's message on screen
    chatWindow.insertAdjacentHTML('beforeend', `
        <div style="align-self: flex-end; max-width: 80%; background: var(--primary); color: white; padding: 1rem 1.5rem; border-radius: 16px 16px 0 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); font-size: 0.95rem; line-height: 1.5;">
            ${text}
        </div>
    `);
    
    // Clear input & scroll down
    inputEl.value = '';
    chatWindow.scrollTop = chatWindow.scrollHeight;
    
    // 2. Add message to API history
    window.lmsChatHistory.push({ role: "user", content: text });
    
    // 3. Show a "Typing..." indicator
    const typingId = 'typing-' + Date.now();
    chatWindow.insertAdjacentHTML('beforeend', `
        <div id="${typingId}" style="align-self: flex-start; max-width: 80%; background: #fff; padding: 1rem 1.5rem; border-radius: 0 16px 16px 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); font-size: 0.95rem; color: var(--lms-muted);">
            <i class="fas fa-circle-notch fa-spin"></i> AI is thinking...
        </div>
    `);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    
    // 4. Send to backend
    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: window.lmsChatHistory })
        });
        
        // Remove typing indicator
        document.getElementById(typingId).remove();
        
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Failed to fetch from AI');
        }
        
        // Parse Anthropic's response
        const data = await res.json();
        const aiText = data.content[0].text; 
        
        // 5. Show AI response on screen
        chatWindow.insertAdjacentHTML('beforeend', `
            <div style="align-self: flex-start; max-width: 80%; background: #fff; padding: 1rem 1.5rem; border-radius: 0 16px 16px 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); font-size: 0.95rem; line-height: 1.5; color: var(--text); white-space: pre-wrap;">
                ${aiText}
            </div>
        `);
        
        // Save AI reply to history so it remembers context for the next question
        window.lmsChatHistory.push({ role: "assistant", content: aiText });
        chatWindow.scrollTop = chatWindow.scrollHeight;
        
    } catch (err) {
        console.error("AI Tutor Error:", err);
        document.getElementById(typingId)?.remove();
        toast('Error connecting to AI Tutor. Check Vercel logs!', 'error');
    }
};


/* ====================== INIT ====================== */
document.addEventListener('DOMContentLoaded', async () => {
  const y=document.getElementById('year');
  if(y) y.textContent=new Date().getFullYear();

  const transferSelect = document.getElementById('transfer-class-select');
  if (transferSelect) transferSelect.innerHTML = SCHOOL_CLASSES.map(c => '<option value="' + c + '">' + c + '</option>').join('');

  const savedUser = localStorage.getItem('lms_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    currentRole = currentUser.role;
    
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('lms-dashboard').classList.add('active');
    document.querySelector('.navbar').style.display = 'none';
    document.querySelector('footer').style.display = 'none';
    const wa = document.querySelector('.whatsapp-btn'); if(wa) wa.style.display = 'none';
    const btt = document.getElementById('backToTop'); if(btt) btt.style.display = 'none';
    
    await fetchAllData();
    setupRealtimeListeners(); 
    buildDashboard();
  }
});

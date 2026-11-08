class App {
  constructor(){
    this.currentLesson = null;
    this.currentIndex = 0;
    this.startTime = null;
    this.timerInt = null;
    this.correctTyped = 0;
    this.errors = 0;
    this.totalTyped = 0;
    this.currentPage = 'dashboard';
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.chart = null;
    this.detChart = null;
    this.progress = this.loadProgress();
    this.streak = this.loadStreak();
    this.gameInterval = null;
    this.gameAnimIntervals = [];
    this.gameActive = false;
    this.gameScore = 0;
    this.gameLives = 3;

    this.init();
  }

  init(){
    this.setupNavigation();
    this.setupFilters();
    this.setupSearch();
    this.setupThemeBtn();
    this.setupKbSelect();
    this.setupKbTest();
    this.setupTypingInput();
    this.setupGameInput();
    this.updateStreak();
    this.renderLessons();
    this.loadDashboard();
    this.renderStats();
    this.buildKeyboard('avro');
  }

  // ============ NAVIGATION ============
  setupNavigation(){
    document.querySelectorAll('.nav-btn[data-tab]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        this.showPage(btn.dataset.tab);
      });
    });
  }

  showPage(name){
    this.currentPage = name;
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    const page = document.getElementById('page-'+name);
    if(page) page.classList.add('active');
    document.querySelectorAll('.nav-btn[data-tab]').forEach(b=>{
      b.classList.toggle('active', b.dataset.tab===name);
    });
    // Navbar collapse on mobile
    const nav = document.getElementById('navMenu');
    if(nav && nav.classList.contains('show')){
      new bootstrap.Collapse(nav).hide();
    }
    // Refresh content
    if(name==='lessons') this.renderLessons();
    if(name==='stats') this.renderStats();
    if(name==='keyboard') this.buildKeyboard(this.currentLayout || 'avro');
    if(name==='dashboard'){ this.loadDashboard(); }
    window.scrollTo({top:0, behavior:'smooth'});
  }

  // ============ FILTERS ============
  setupFilters(){
    document.querySelectorAll('.btn-filter').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        this.currentFilter = btn.dataset.f;
        document.querySelectorAll('.btn-filter').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        this.renderLessons();
      });
    });
  }

  setupSearch(){
    const el = document.getElementById('lessonSearch');
    if(el){
      el.addEventListener('input', (e)=>{
        this.searchQuery = e.target.value.toLowerCase();
        this.renderLessons();
      });
    }
  }

  setupThemeBtn(){
    const btn = document.getElementById('themeBtn');
    if(btn){
      btn.addEventListener('click', ()=>this.toggleTheme());
    }
  }

  setupKbSelect(){
    const sel = document.getElementById('kbLayoutSelect');
    if(sel){
      sel.addEventListener('change', (e)=>this.buildKeyboard(e.target.value));
    }
  }

  setupKbTest(){
    const inp = document.getElementById('kbTestInput');
    if(inp){
      inp.addEventListener('input', (e)=>{
        const v = e.target.value;
        if(v.length>0) this.highlightKey(v[v.length-1]);
      });
    }
  }

  setupTypingInput(){
    const inp = document.getElementById('typeInput');
    if(inp){
      inp.addEventListener('input', (e)=>this.handleTyping(e));
    }
  }

  setupGameInput(){
    const inp = document.getElementById('gameInput');
    if(inp){
      inp.addEventListener('keydown', (e)=>{
        if(e.key==='Enter'){ this.submitGameWord(inp.value.trim()); inp.value=''; }
      });
    }
  }

  // ============ STORAGE ============
  loadProgress(){ return JSON.parse(localStorage.getItem('bnUltraProgress')||'{}'); }
  saveProgress(){ localStorage.setItem('bnUltraProgress', JSON.stringify(this.progress)); }
  loadStreak(){ return JSON.parse(localStorage.getItem('bnStreak')||'{"days":0,"last":null}'); }

  updateStreak(){
    const today = new Date().toDateString();
    if(this.streak.last === today) return;
    const yest = new Date(Date.now()-86400000).toDateString();
    if(this.streak.last === yest) this.streak.days++;
    else this.streak.days = 1;
    this.streak.last = today;
    localStorage.setItem('bnStreak', JSON.stringify(this.streak));
    const el = document.getElementById('statStreak');
    if(el) el.textContent = this.streak.days;
  }

  // ============ LESSONS ============
  renderLessons(){
    const grid = document.getElementById('lessonsGrid');
    if(!grid) return;
    let items = LESSONS;
    if(this.currentFilter !== 'all') items = items.filter(l=>l.type===this.currentFilter);
    if(this.searchQuery) items = items.filter(l=>
      l.title.toLowerCase().includes(this.searchQuery) ||
      l.text.toLowerCase().includes(this.searchQuery)
    );
    const cnt = document.getElementById('lessonCount');
    if(cnt) cnt.textContent = items.length;

    if(items.length===0){
      grid.innerHTML = '<div class="col-12 text-center py-4 opacity-75">কোনো লেসন পাওয়া যায়নি</div>';
      return;
    }

    grid.innerHTML = items.map(l=>{
      const done = this.progress[l.id];
      return `<div class="col-6 col-md-4 col-lg-3">
        <div class="lesson-card glass ${done?'done':''}" data-id="${l.id}">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <span class="lesson-num">${l.id}</span>
            <span class="tbadge t-${l.type}">${l.level}</span>
          </div>
          <h6 class="mb-1">${l.title}</h6>
          <p class="small mb-0 opacity-75 text-truncate">${l.text}</p>
        </div>
      </div>`;
    }).join('');

    grid.querySelectorAll('.lesson-card').forEach(c=>{
      c.addEventListener('click', ()=>this.openLesson(Number(c.dataset.id)));
    });
  }

  openLesson(id){
    const lesson = LESSONS.find(l=>l.id===id);
    if(!lesson) return;
    this.currentLesson = lesson;
    this.currentIndex = 0;
    this.correctTyped = 0;
    this.errors = 0;
    this.totalTyped = 0;
    this.startTime = null;
    if(this.timerInt) clearInterval(this.timerInt);

    document.getElementById('lessonTitle').textContent = `${id}. ${lesson.title}`;
    const inp = document.getElementById('typeInput');
    inp.value = '';
    inp.disabled = false;
    document.getElementById('wpm').textContent = '0';
    document.getElementById('accuracy').textContent = '100';
    document.getElementById('errors').textContent = '0';
    document.getElementById('timer').textContent = '0:00';
    document.getElementById('lessonProgress').style.width = '0%';

    this.renderDisplay();
    this.showPage('typing');
    setTimeout(()=>inp.focus(), 300);
  }

  renderDisplay(){
    const disp = document.getElementById('textDisplay');
    if(!disp || !this.currentLesson) return;
    const target = this.currentLesson.text;
    disp.innerHTML = [...target].map((ch,i)=>{
      let cls = 'char';
      if(i===0) cls += ' current';
      return `<span class="${cls}">${ch===' '?'&nbsp;':ch}</span>`;
    }).join('');
  }

  handleTyping(e){
    if(!this.currentLesson) return;
    const target = this.currentLesson.text;
    const val = e.target.value;
    if(!this.startTime && val.length>0){
      this.startTime = Date.now();
      this.startTimer();
    }

    const disp = document.getElementById('textDisplay');
    let correct = 0;
    disp.innerHTML = [...target].map((ch,i)=>{
      let cls = 'char';
      if(i<val.length){
        if(val[i]===ch){ cls += ' correct'; correct++; }
        else cls += ' wrong';
      } else if(i===val.length){
        cls += ' current';
      }
      return `<span class="${cls}">${ch===' '?'&nbsp;':ch}</span>`;
    }).join('');

    this.correctTyped = correct;
    this.totalTyped = val.length;
    this.errors = val.length - correct;

    if(val.length>0) this.highlightKey(val[val.length-1]);

    const wpm = this.calcWPM();
    const acc = val.length ? Math.round((correct/val.length)*100) : 100;
    document.getElementById('wpm').textContent = wpm;
    document.getElementById('accuracy').textContent = acc;
    document.getElementById('errors').textContent = this.errors;
    document.getElementById('lessonProgress').style.width =
      Math.min(100, (val.length/target.length)*100) + '%';

    if(val.length>=target.length) this.finishLesson(wpm, acc);
  }

  calcWPM(){
    if(!this.startTime) return 0;
    const min = (Date.now()-this.startTime)/60000;
    return Math.round((this.correctTyped/5)/Math.max(min,0.01));
  }

  startTimer(){
    if(this.timerInt) clearInterval(this.timerInt);
    this.timerInt = setInterval(()=>{
      if(!this.startTime) return;
      const s = Math.floor((Date.now()-this.startTime)/1000);
      const el = document.getElementById('timer');
      if(el) el.textContent = `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
    },500);
  }

  finishLesson(wpm, acc){
    if(this.timerInt) clearInterval(this.timerInt);
    const inp = document.getElementById('typeInput');
    if(inp) inp.disabled = true;
    this.progress[this.currentLesson.id] = {wpm, accuracy:acc, date:new Date().toISOString()};
    this.saveProgress();
    this.showToast(`🎉 সম্পন্ন! ${wpm} WPM, ${acc}% নির্ভুলতা`);
    this.loadDashboard();
    this.renderLessons();
  }

  restartLesson(){ if(this.currentLesson) this.openLesson(this.currentLesson.id); }
  nextLesson(){
    const next = LESSONS.find(l=>l.id === (this.currentLesson?.id||0)+1);
    if(next) this.openLesson(next.id);
    else this.showToast('🎊 সব লেসন সম্পন্ন!');
  }

  toggleLiveKb(){
    const el = document.getElementById('liveKb');
    if(!el) return;
    el.classList.toggle('d-none');
    if(!el.classList.contains('d-none')) this.buildLiveKb();
  }

  // ============ DASHBOARD ============
  loadDashboard(){
    const vals = Object.values(this.progress);
    const avgWpm = vals.length ? Math.round(vals.reduce((a,b)=>a+b.wpm,0)/vals.length) : 0;
    const avgAcc = vals.length ? Math.round(vals.reduce((a,b)=>a+b.accuracy,0)/vals.length) : 0;
    const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
    set('statWPM', avgWpm);
    set('statAccuracy', avgAcc+'%');
    set('statCompleted', `${vals.length}/100`);
    set('statStreak', this.streak.days);
    this.renderBadges(vals.length, avgWpm);
    this.renderChart();
  }

  renderBadges(count, wpm){
    const area = document.getElementById('badgesArea');
    if(!area) return;
    const list = [
      {icon:'bi-1-circle', name:'প্রথম', earned: count>=1},
      {icon:'bi-5-circle', name:'৫টি', earned: count>=5},
      {icon:'bi-2-circle', name:'১০টি', earned: count>=10},
      {icon:'bi-3-circle', name:'২৫টি', earned: count>=25},
      {icon:'bi-trophy', name:'৫০টি', earned: count>=50},
      {icon:'bi-award', name:'১০০টি', earned: count>=100},
      {icon:'bi-lightning', name:'২০ WPM', earned: wpm>=20},
      {icon:'bi-fire', name:'৪০ WPM', earned: wpm>=40},
      {icon:'bi-star', name:'৬০ WPM', earned: wpm>=60}
    ];
    area.innerHTML = list.map(b=>`
      <div class="badge-item" style="opacity:${b.earned?1:0.3}">
        <i class="bi ${b.icon}"></i><small>${b.name}</small>
      </div>`).join('');
  }

  renderChart(){
    const ctx = document.getElementById('progressChart');
    if(!ctx || typeof Chart === 'undefined') return;
    if(this.chart){ this.chart.destroy(); this.chart = null; }
    const ids = Object.keys(this.progress).sort((a,b)=>a-b);
    const textColor = getComputedStyle(document.body).color;
    this.chart = new Chart(ctx, {
      type:'line',
      data:{
        labels: ids.map(id=>'L'+id),
        datasets:[{
          label:'WPM',
          data: ids.map(id=>this.progress[id].wpm),
          borderColor:'#8b5cf6',
          backgroundColor:'rgba(139,92,246,.2)',
          tension:.35, fill:true,
          pointBackgroundColor:'#6366f1', pointRadius:4
        }]
      },
      options:{
        responsive:true,
        plugins:{legend:{labels:{color:textColor}}},
        scales:{
          x:{ticks:{color:textColor}},
          y:{ticks:{color:textColor}}
        }
      }
    });
  }

  // ============ STATS ============
  renderStats(){
    const table = document.getElementById('historyTable');
    if(table){
      const rows = Object.entries(this.progress).map(([id,p])=>{
        const l = LESSONS.find(x=>x.id==id);
        return `<tr><td>${l?l.title:id}</td><td>${p.wpm}</td><td>${p.accuracy}%</td>
          <td>${new Date(p.date).toLocaleDateString('bn-BD')}</td></tr>`;
      }).join('');
      table.innerHTML = rows || '<tr><td colspan="4" class="text-center opacity-50">কোনো তথ্য নেই</td></tr>';
    }

    const ctx = document.getElementById('detailedChart');
    if(!ctx || typeof Chart==='undefined') return;
    if(this.detChart){ this.detChart.destroy(); this.detChart = null; }
    const ids = Object.keys(this.progress);
    const textColor = getComputedStyle(document.body).color;
    this.detChart = new Chart(ctx,{
      type:'bar',
      data:{
        labels: ids.map(id=>'L'+id),
        datasets:[
          {label:'WPM', data: ids.map(id=>this.progress[id].wpm), backgroundColor:'#6366f1', borderRadius:6},
          {label:'Accuracy %', data: ids.map(id=>this.progress[id].accuracy), backgroundColor:'#10b981', borderRadius:6}
        ]
      },
      options:{
        responsive:true,
        plugins:{legend:{labels:{color:textColor}}},
        scales:{x:{ticks:{color:textColor}}, y:{ticks:{color:textColor}}}
      }
    });
  }

  // ============ EXAM ============
  startExam(seconds){
    const text = LESSONS[95].text + ' ' + LESSONS[96].text;
    const area = document.getElementById('examArea');
    area.innerHTML = `
      <div class="alert alert-info">${seconds/60} মিনিটে টাইপ করুন!</div>
      <div class="text-display mb-2">${text}</div>
      <textarea id="examInput" class="form-control type-input mb-2" rows="4"></textarea>
      <div class="d-flex gap-3 flex-wrap">
        <span>⏱ <strong id="examTimer">${seconds}</strong> সেকেন্ড</span>
        <span>⚡ <strong id="examWpm">0</strong> WPM</span>
      </div>
      <div id="examResult" class="mt-2"></div>`;
    const inp = document.getElementById('examInput');
    const start = Date.now();
    inp.focus();
    let t = seconds;
    const int = setInterval(()=>{
      t--;
      document.getElementById('examTimer').textContent = t;
      const val = inp.value;
      let correct = 0;
      for(let i=0;i<val.length;i++) if(val[i]===text[i]) correct++;
      const min = (Date.now()-start)/60000;
      document.getElementById('examWpm').textContent = Math.round((correct/5)/Math.max(min,.01));
      if(t<=0){
        clearInterval(int);
        inp.disabled = true;
        const val = inp.value;
        let correct = 0;
        for(let i=0;i<val.length;i++) if(val[i]===text[i]) correct++;
        const wpm = Math.round((correct/5)/(seconds/60));
        const acc = Math.round(correct/Math.max(val.length,1)*100);
        document.getElementById('examResult').innerHTML =
          `<div class="alert alert-success">🏆 ফলাফল: <strong>${wpm} WPM</strong>, <strong>${acc}%</strong> নির্ভুলতা</div>`;
      }
    },1000);
  }

  dailyChallenge(){
    const day = new Date().getDate();
    const lesson = LESSONS[85 + (day % 15)];
    this.openLesson(lesson.id);
    this.showToast('🔥 ডেইলি চ্যালেঞ্জ!');
  }

  // ============ KEYBOARD ============
  buildKeyboard(layoutKey){
    this.currentLayout = layoutKey;
    const layout = KEYBOARD_LAYOUTS[layoutKey];
    const kb = document.getElementById('virtualKeyboard');
    if(!kb || !layout) return;
    kb.innerHTML = '';
    layout.rows.forEach(row=>{
      const r = document.createElement('div');
      r.className = 'kb-row';
      row.forEach(([bn,en])=>{
        const el = document.createElement('div');
        el.className = 'kb-key';
        el.innerHTML = `<span class="lbl-en">${en}</span>${bn}`;
        el.dataset.bn = bn;
        el.dataset.en = en;
        r.appendChild(el);
      });
      kb.appendChild(r);
    });
    const sr = document.createElement('div');
    sr.className = 'kb-row';
    const sp = document.createElement('div');
    sp.className = 'kb-key space';
    sp.textContent = '␣ Space';
    sp.dataset.en = ' ';
    sr.appendChild(sp);
    kb.appendChild(sr);
    const sel = document.getElementById('kbLayoutSelect');
    if(sel) sel.value = layoutKey;
  }

  buildLiveKb(){
    const live = document.getElementById('liveKb');
    const layout = KEYBOARD_LAYOUTS[this.currentLayout || 'avro'];
    if(!live || !layout) return;
    live.innerHTML = '';
    layout.rows.forEach(row=>{
      const r = document.createElement('div');
      r.className = 'kb-row';
      row.forEach(([bn,en])=>{
        const el = document.createElement('div');
        el.className = 'kb-key';
        el.textContent = bn;
        el.dataset.bn = bn;
        el.dataset.en = en;
        r.appendChild(el);
      });
      live.appendChild(r);
    });
  }

  highlightKey(ch){
    // Find in both main keyboard and live keyboard
    const sels = document.querySelectorAll('#virtualKeyboard .kb-key, #liveKb .kb-key');
    sels.forEach(k=>k.classList.remove('active'));
    sels.forEach(k=>{
      if(k.dataset.bn===ch || k.dataset.en===ch){
        k.classList.add('active');
        setTimeout(()=>k.classList.remove('active'), 180);
      }
    });
  }

  // ============ GAME ============
  startGame(){
    if(this.gameActive) this.stopGame();
    this.gameActive = true;
    this.gameScore = 0;
    this.gameLives = 3;
    this.gameWords = []; // store {word, el, animInt, startTop, speed}
    document.getElementById('gameScore').textContent = 0;
    document.getElementById('gameLives').textContent = 3;
    const area = document.getElementById('gameArea');
    area.innerHTML = '';
    const inp = document.getElementById('gameInput');
    inp.disabled = false;
    inp.value = '';
    inp.focus();

    // Spawn words
    this.gameInterval = setInterval(()=>{
      if(!this.gameActive) return;
      const word = GAME_WORDS[Math.floor(Math.random()*GAME_WORDS.length)];
      const el = document.createElement('div');
      el.className = 'falling-word';
      el.textContent = word;
      el.style.left = Math.random()*(area.clientWidth-120)+'px';
      el.style.top = '-40px';
      area.appendChild(el);
      const start = Date.now();
      const duration = 8000;
      const animInt = setInterval(()=>{
        if(!this.gameActive || !el.isConnected){ clearInterval(animInt); return; }
        const pct = (Date.now()-start)/duration;
        if(pct>=1){
          clearInterval(animInt);
          el.remove();
          this.gameLives--;
          document.getElementById('gameLives').textContent = this.gameLives;
          if(this.gameLives<=0) this.stopGame();
        } else {
          el.style.top = (pct*(area.clientHeight+40))+'px';
        }
      },50);
      this.gameAnimIntervals.push(animInt);
    }, 1800);
  }

  stopGame(){
    this.gameActive = false;
    if(this.gameInterval) clearInterval(this.gameInterval);
    this.gameAnimIntervals.forEach(i=>clearInterval(i));
    this.gameAnimIntervals = [];
    const inp = document.getElementById('gameInput');
    if(inp) inp.disabled = true;
    this.showToast(`🎮 গেম শেষ! স্কোর: ${this.gameScore}`);
  }

  submitGameWord(word){
    if(!this.gameActive || !word) return;
    const area = document.getElementById('gameArea');
    const matches = [...area.querySelectorAll('.falling-word')].filter(w=>w.textContent===word);
    if(matches.length>0){
      matches[0].remove();
      this.gameScore += 10;
      document.getElementById('gameScore').textContent = this.gameScore;
    }
  }

  // ============ THEME ============
  toggleTheme(){
    const cur = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', cur==='dark'?'light':'dark');
    setTimeout(()=>{
      if(this.currentPage==='dashboard') this.renderChart();
      if(this.currentPage==='stats') this.renderStats();
    }, 100);
  }

  // ============ EXPORT / RESET ============
  exportProgress(){
    const blob = new Blob([JSON.stringify(this.progress,null,2)],{type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bangla-typing-progress.json';
    a.click();
    this.showToast('প্রোগ্রেস ডাউনলোড হয়েছে');
  }

  resetProgress(){
    if(confirm('সব প্রোগ্রেস মুছে ফেলবেন?')){
      localStorage.removeItem('bnUltraProgress');
      this.progress = {};
      this.loadDashboard();
      this.renderLessons();
      this.renderStats();
      this.showToast('প্রোগ্রেস রিসেট হয়েছে');
    }
  }

  // ============ TOAST ============
  showToast(msg){
    const el = document.getElementById('toastMsg');
    if(!el) return;
    el.textContent = msg;
    bootstrap.Toast.getOrCreateInstance(document.getElementById('toast')).show();
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', ()=>{
  window.app = new App();
});

class UltraTypingApp {
  constructor(){
    this.currentLesson = null;
    this.currentIndex = 0;
    this.startTime = null;
    this.timerInt = null;
    this.totalTyped = 0;
    this.correctTyped = 0;
    this.errors = 0;
    this.soundOn = true;
    this.chart = null;
    this.detChart = null;
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.progress = this.loadProgress();
    this.streak = this.loadStreak();
    this.init();
  }

  init(){
    this.renderLessons();
    this.loadDashboard();
    this.bindEvents();
    this.renderStats();
    buildKeyboard('avro');
    this.updateStreak();
    setTimeout(()=>{
      if(typeof Chart!=='undefined') this.renderChart();
    },100);
  }

  loadProgress(){ return JSON.parse(localStorage.getItem('bnUltraProgress')||'{}'); }
  saveProgress(){ localStorage.setItem('bnUltraProgress', JSON.stringify(this.progress)); }
  loadStreak(){
    const d = JSON.parse(localStorage.getItem('bnStreak')||'{"days":0,"last":null}');
    return d;
  }
  updateStreak(){
    const today = new Date().toDateString();
    if(this.streak.last === today) return;
    const yest = new Date(Date.now()-86400000).toDateString();
    if(this.streak.last === yest) this.streak.days++;
    else if(this.streak.last !== today) this.streak.days = 1;
    this.streak.last = today;
    localStorage.setItem('bnStreak', JSON.stringify(this.streak));
    document.getElementById('statStreak').textContent = this.streak.days;
  }

  bindEvents(){
    const inp = document.getElementById('typeInput');
    if(inp) inp.addEventListener('input', e=>this.handleTyping(e));
    const kbTest = document.getElementById('kbTestInput');
    if(kbTest) kbTest.addEventListener('input', e=>{
      const ch = e.target.value.slice(-1);
      if(ch) highlightKey(ch);
    });
    document.querySelectorAll('[data-bs-toggle="tab"]').forEach(el=>{
      el.addEventListener('shown.bs.tab', e=>{
        const t = e.target.getAttribute('href');
        if(t==='#lessons') this.renderLessons();
        if(t==='#stats') this.renderStats();
        if(t==='#keyboard') buildKeyboard(CURRENT_LAYOUT);
      });
    });
  }

  playSound(type){
    if(!this.soundOn) return;
    try{
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = type==='ok' ? 800 : 200;
      o.type = type==='ok' ? 'sine' : 'square';
      g.gain.setValueAtTime(0.05, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.08);
      o.start(); o.stop(ctx.currentTime+0.08);
    }catch(e){}
  }

  renderLessons(){
    const grid = document.getElementById('lessonsGrid');
    if(!grid) return;
    let items = LESSONS;
    if(this.currentFilter!=='all') items = items.filter(l=>l.type===this.currentFilter);
    if(this.searchQuery) items = items.filter(l=>
      l.title.includes(this.searchQuery) || l.text.includes(this.searchQuery));
    document.getElementById('lessonCount').textContent = items.length;
    grid.innerHTML = items.map(l=>{
      const done = this.progress[l.id];
      return `<div class="col-6 col-md-4 col-lg-3">
        <div class="lesson-card glass ${done?'completed':''}" onclick="app.openLesson(${l.id})">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <span class="lesson-num">${l.id}</span>
            <span class="lesson-type-badge type-${l.type}">${l.level}</span>
          </div>
          <h6 class="mb-1">${l.title}</h6>
          <p class="small mb-0 opacity-75 text-truncate">${l.text}</p>
        </div>
      </div>`;
    }).join('');
  }

  filterLessons(type, btn){
    this.currentFilter = type;
    document.querySelectorAll('.btn-filter').forEach(b=>b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    this.renderLessons();
  }

  searchLessons(q){ this.searchQuery = q; this.renderLessons(); }

  openLesson(id){
    this.currentLesson = LESSONS.find(l=>l.id===id);
    if(!this.currentLesson) return;
    this.currentIndex = 0;
    this.totalTyped = 0;
    this.correctTyped = 0;
    this.errors = 0;
    this.startTime = null;
    if(this.timerInt) clearInterval(this.timerInt);
    document.getElementById('lessonTitle').textContent = `${id}. ${this.currentLesson.title}`;
    const inp = document.getElementById('typeInput');
    inp.value = '';
    inp.disabled = false;
    document.getElementById('wpm').textContent = '0';
    document.getElementById('accuracy').textContent = '100';
    document.getElementById('errors').textContent = '0';
    document.getElementById('timer').textContent = '0:00';
    document.getElementById('lessonProgress').style.width = '0%';
    this.renderDisplay();
    bootstrap.Tab.getOrCreateInstance(document.querySelector('a[href="#typing"]')).show();
    setTimeout(()=>inp.focus(), 300);
  }

  renderDisplay(){
    const disp = document.getElementById('textDisplay');
    const target = this.currentLesson.text;
    disp.innerHTML = [...target].map((ch,i)=>{
      let cls = 'char';
      if(i===this.currentIndex) cls += ' current';
      return `<span class="${cls}">${ch}</span>`;
    }).join('');
  }

  handleTyping(e){
    if(!this.currentLesson) return;
    const target = this.currentLesson.text;
    const val = e.target.value;
    if(!this.startTime){ this.startTime = Date.now(); this.startTimer(); }

    const disp = document.getElementById('textDisplay');
    disp.innerHTML = [...target].map((ch,i)=>{
      let cls = 'char';
      if(i<val.length) cls += (val[i]===ch) ? ' correct' : ' wrong';
      else if(i===val.length) cls += ' current';
      return `<span class="${cls}">${ch}</span>`;
    }).join('');

    // error count
    let newErrors = 0, correct = 0;
    for(let i=0;i<val.length;i++){ if(val[i]===target[i]) correct++; }
    newErrors = val.length - correct;
    if(newErrors > this.errors){
      this.playSound('bad');
    } else if(val.length > 0){
      this.playSound('ok');
    }
    this.errors = newErrors;
    this.correctTyped = correct;
    this.totalTyped = val.length;

    if(val.length>0) highlightKey(val[val.length-1]);

    const wpm = this.calculateWPM();
    const acc = val.length ? Math.round((correct/val.length)*100) : 100;
    document.getElementById('wpm').textContent = wpm;
    document.getElementById('accuracy').textContent = acc;
    document.getElementById('errors').textContent = this.errors;
    document.getElementById('lessonProgress').style.width =
      Math.min(100, (val.length/target.length)*100) + '%';

    if(val.length>=target.length) this.finishLesson(wpm, acc);
  }

  calculateWPM(){
    if(!this.startTime) return 0;
    const min = (Date.now()-this.startTime)/60000;
    return Math.round((this.correctTyped/5)/Math.max(min,0.01));
  }

  startTimer(){
    if(this.timerInt) clearInterval(this.timerInt);
    this.timerInt = setInterval(()=>{
      if(!this.startTime) return;
      const s = Math.floor((Date.now()-this.startTime)/1000);
      document.getElementById('timer').textContent =
        `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
    },500);
  }

  finishLesson(wpm, acc){
    if(this.timerInt) clearInterval(this.timerInt);
    document.getElementById('typeInput').disabled = true;
    this.progress[this.currentLesson.id] = {
      wpm, accuracy:acc, date:new Date().toISOString()
    };
    this.saveProgress();
    this.showToast(`🎉 ${this.currentLesson.title} সম্পন্ন! ${wpm} WPM, ${acc}% নির্ভুলতা`);
    this.loadDashboard();
    this.renderLessons();
  }

  restartLesson(){ if(this.currentLesson) this.openLesson(this.currentLesson.id); }
  nextLesson(){
    const next = LESSONS.find(l=>l.id === (this.currentLesson?.id||0)+1);
    if(next) this.openLesson(next.id);
    else this.showToast('🎊 সব লেসন সম্পন্ন!');
  }
  backToLessons(){
    bootstrap.Tab.getOrCreateInstance(document.querySelector('a[href="#lessons"]')).show();
  }

  toggleLiveKb(){
    const el = document.getElementById('liveKb');
    el.classList.toggle('d-none');
    if(!el.classList.contains('d-none')) buildLiveKb();
  }

  setKeyboardLayout(layout){
    buildKeyboard(layout);
    this.showToast(`কীবোর্ড লেআউট: ${KEYBOARD_LAYOUTS[layout].name}`);
  }

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
      {icon:'bi-1-circle', name:'প্রথম লেসন', earned: count>=1},
      {icon:'bi-5-circle', name:'৫ লেসন', earned: count>=5},
      {icon:'bi-2-circle', name:'১০ লেসন', earned: count>=10},
      {icon:'bi-3-circle', name:'২৫ লেসন', earned: count>=25},
      {icon:'bi-trophy', name:'৫০ লেসন', earned: count>=50},
      {icon:'bi-award', name:'১০০ লেসন', earned: count>=100},
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
    if(this.chart) this.chart.destroy();
    const ids = Object.keys(this.progress).sort((a,b)=>a-b);
    this.chart = new Chart(ctx, {
      type:'line',
      data:{
        labels: ids.map(id=>'L'+id),
        datasets:[{
          label:'WPM', data: ids.map(id=>this.progress[id].wpm),
          borderColor:'#8b5cf6', backgroundColor:'rgba(139,92,246,.15)',
          tension:.35, fill:true, pointBackgroundColor:'#6366f1', pointRadius:4
        }]
      },
      options:{
        responsive:true,
        plugins:{legend:{labels:{color:getComputedStyle(document.body).color}}},
        scales:{
          x:{ticks:{color:getComputedStyle(document.body).color}},
          y:{ticks:{color:getComputedStyle(document.body).color}}
        }
      }
    });
  }

  renderStats(){
    const table = document.getElementById('historyTable');
    if(!table) return;
    const rows = Object.entries(this.progress).map(([id,p])=>{
      const l = LESSONS.find(x=>x.id==id);
      return `<tr><td>${l?l.title:id}</td><td>${p.wpm}</td><td>${p.accuracy}%</td>
        <td>${new Date(p.date).toLocaleDateString('bn-BD')}</td></tr>`;
    }).join('');
    table.innerHTML = rows || '<tr><td colspan="4" class="text-center opacity-50">কোনো তথ্য নেই</td></tr>';

    const ctx = document.getElementById('detailedChart');
    if(!ctx || typeof Chart==='undefined') return;
    if(this.detChart) this.detChart.destroy();
    const ids = Object.keys(this.progress);
    this.detChart = new Chart(ctx,{
      type:'bar',
      data:{
        labels: ids.map(id=>'L'+id),
        datasets:[
          {label:'WPM', data: ids.map(id=>this.progress[id].wpm), backgroundColor:'#6366f1', borderRadius:6},
          {label:'Accuracy %', data: ids.map(id=>this.progress[id].accuracy), backgroundColor:'#10b981', borderRadius:6}
        ]
      },
      options:{responsive:true, plugins:{legend:{labels:{color:getComputedStyle(document.body).color}}},
        scales:{x:{ticks:{color:getComputedStyle(document.body).color}},y:{ticks:{color:getComputedStyle(document.body).color}}}}
    });
  }

  startExam(seconds){
    const text = LESSONS[95].text + ' ' + LESSONS[96].text;
    const area = document.getElementById('examArea');
    area.innerHTML = `
      <div class="alert alert-info">নিচের লেখাটি ${seconds/60} মিনিটে টাইপ করুন!</div>
      <div class="text-display mb-2">${text}</div>
      <textarea id="examInput" class="form-control type-input mb-2" rows="4"></textarea>
      <div class="d-flex gap-3"><span>⏱ <strong id="examTimer">${seconds}</strong> সেকেন্ড</span>
      <span>⚡ <strong id="examWpm">0</strong> WPM</span></div>
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
    const day = new Date().getDay();
    const lesson = LESSONS[85 + (day % 15)];
    this.openLesson(lesson.id);
    this.showToast('🔥 ডেইলি চ্যালেঞ্জ শুরু!');
  }

  startGame(){
    const area = document.getElementById('gameArea');
    area.innerHTML = '';
    let score = 0, lives = 3;
    document.getElementById('gameScore').textContent = score;
    document.getElementById('gameLives').textContent = lives;
    const words = ['আম','কলা','বই','নদী','আকাশ','বাংলা','শিক্ষা','পাখি','ফুল','গাড়ি','টাকা','ঘর','পানি','মানুষ','সূর্য'];
    const interval = setInterval(()=>{
      if(lives<=0){ clearInterval(interval); this.showToast(`🎮 গেম শেষ! স্কোর: ${score}`); return; }
      const word = words[Math.floor(Math.random()*words.length)];
      const el = document.createElement('div');
      el.className = 'falling-word';
      el.textContent = word;
      el.style.left = Math.random()*(area.clientWidth-100)+'px';
      el.style.top = '-40px';
      area.appendChild(el);
      const start = Date.now();
      const duration = 6000;
      const anim = setInterval(()=>{
        const elapsed = Date.now()-start;
        const pct = elapsed/duration;
        if(pct>=1){
          clearInterval(anim); el.remove(); lives--;
          document.getElementById('gameLives').textContent = lives;
        } else {
          el.style.top = (pct*(area.clientHeight+40))+'px';
        }
      },50);
      el.dataset.word = word;
    }, 1600);

    // typing listener
    const handler = (e)=>{
      if(e.key === 'Escape'){ clearInterval(interval); document.removeEventListener('keydown', handler); }
      const active = area.querySelector('.falling-word');
      area.querySelectorAll('.falling-word').forEach(w=>{
        if(w.textContent === e.key || w.dataset.word.startsWith(e.key)){
          // simple match
        }
      });
    };
    document.addEventListener('keydown', handler);

    // better word-matching: capture typed input
    area.onclick = ()=>{};
    const input = prompt; // fallback
    const gameInput = document.createElement('input');
    gameInput.className = 'form-control mt-2';
    gameInput.placeholder = 'টাইপ করে Enter চাপুন';
    area.appendChild(gameInput);
    gameInput.focus();
    gameInput.addEventListener('keydown', e=>{
      if(e.key==='Enter'){
        const typed = gameInput.value.trim();
        const match = [...area.querySelectorAll('.falling-word')].find(w=>w.textContent===typed);
        if(match){ match.remove(); score+=10; document.getElementById('gameScore').textContent = score; }
        gameInput.value='';
      }
    });
  }

  toggleTheme(){
    const cur = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', cur==='dark'?'light':'dark');
    setTimeout(()=>{ this.renderChart(); this.renderStats(); }, 100);
  }

  toggleSound(){
    this.soundOn = !this.soundOn;
    document.getElementById('soundState').textContent = this.soundOn?'চালু':'বন্ধ';
  }

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

  showToast(msg){
    const el = document.getElementById('toastMsg');
    el.textContent = msg;
    bootstrap.Toast.getOrCreateInstance(document.getElementById('toast')).show();
  }
}

const app = new UltraTypingApp();

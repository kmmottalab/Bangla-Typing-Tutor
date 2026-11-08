
let CURRENT_LAYOUT = 'avro';

function buildKeyboard(layoutKey){
  CURRENT_LAYOUT = layoutKey || CURRENT_LAYOUT;
  const layout = KEYBOARD_LAYOUTS[CURRENT_LAYOUT];
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
  // Space bar
  const spaceRow = document.createElement('div');
  spaceRow.className = 'kb-row';
  const space = document.createElement('div');
  space.className = 'kb-key space';
  space.textContent = '␣ Space';
  space.dataset.en = ' ';
  spaceRow.appendChild(space);
  kb.appendChild(spaceRow);
}

function highlightKey(ch){
  document.querySelectorAll('.kb-key').forEach(k=>k.classList.remove('active'));
  const el = document.querySelector(`.kb-key[data-bn="${ch}"]`) ||
             document.querySelector(`.kb-key[data-en="${ch}"]`);
  if(el){
    el.classList.add('active');
    setTimeout(()=>el.classList.remove('active'), 180);
  }
}

function buildLiveKb(){
  const live = document.getElementById('liveKb');
  const layout = KEYBOARD_LAYOUTS[CURRENT_LAYOUT];
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

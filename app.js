import {QUIZZES} from './config.js?v=2';
import {STORAGE_KEY,LEGACY_STORAGE_KEY,LEVELS,RUN_SIZE,normalize,prepareProgress,startRun,recordAnswer,finishRun,scoreRun,readState,validProgress,isNumeric,numericResult,parseNumericInput} from './core.js?v=2';
const app=document.querySelector('#app'),dialog=document.querySelector('#reset-dialog'),data=new Map();
let state={version:2,quizzes:{}},storageReady=true,view={type:'home'},notice='',busy=false;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>Number(v).toLocaleString('es-AR',{maximumFractionDigits:6});
const configFor=file=>QUIZZES.find(q=>q.file===file);
const kind=c=>c.mode==='aproximacion'?'Aproximación':'Trivia A, B, C, D';
const unit=q=>String(q.unidad??'').replaceAll('_',' ');
function icon(c,small=false){return `<img class="${small?'small-icon':'card-icon'}" src="Images/${esc(encodeURIComponent(c.icon))}" alt="" loading="lazy"><span class="icon-fallback" hidden aria-hidden="true">${esc(c.title[0])}</span>`;}
function decorateIcons(){app.querySelectorAll('img').forEach(img=>{const fallback=()=>{img.hidden=true;const next=img.nextElementSibling;if(next){next.hidden=false;if(img.classList.contains('small-icon'))next.classList.add('small-fallback');}};img.addEventListener('error',fallback,{once:true});if(img.complete&&!img.naturalWidth)fallback();});}
function progressFor(c){const q=data.get(c.file)?.questions,p=state.quizzes[c.file];return q&&validProgress(p,q)?p:null;}
const finishedRuns=c=>(progressFor(c)?.runs??[]).filter(r=>r.finished);
function card(c,i){
 const item=data.get(c.file),p=progressFor(c),finished=finishedRuns(c),active=p?.runs.some(r=>!r.finished),available=!!item?.questions&&storageReady,exhausted=finished.length>=5;
 const best=finished.length?Math.max(...finished.map(r=>scoreRun(r,item.questions))):null;
 return `<article class="card"><div class="card-top">${icon(c)}<span class="card-number">${String(i+1).padStart(2,'0')}</span></div><h2>${esc(c.title)}</h2><p class="card-description">${c.mode==='aproximacion'?'Ingresá un número y compará tu aproximación con los participantes.':'Elegí la respuesta correcta entre cuatro opciones.'}</p><div class="card-bottom"><div class="dots" aria-label="${finished.length} de 5 partidas completadas">${[0,1,2,3,4].map(j=>`<span class="dot ${j<finished.length?'done':active&&j===finished.length?'active':''}"></span>`).join('')}</div>${item?.error?`<p class="error-message">${esc(item.error)}</p>`:`<div class="card-meta">${finished.length}/5 partidas${best!==null?` · Mejor: ${best}/8${c.mode==='aproximacion'?' victorias':''}`:''}${active?' · En curso':''}</div>`}<button class="button full ${exhausted?'secondary':''}" data-action="${exhausted?'history':'start'}" data-file="${esc(c.file)}" ${!available?'disabled':''}>${exhausted?'Ver resultados':active?'Continuar partida':'Comenzar'}<span aria-hidden="true">${exhausted?'✓':'↗'}</span></button></div></article>`;
}
function home(){
 view={type:'home'};const total=QUIZZES.reduce((n,c)=>n+finishedRuns(c).length,0);
 app.innerHTML=`<section class="hero-row"><div><span class="eyebrow">PONÉ A PRUEBA LO QUE SABÉS</span><h1>Un tema.<br>Ocho preguntas.</h1><p class="intro">3 fáciles, 2 regulares, 1 difícil, 1 muy difícil y 1 imposible.<br>Cinco partidas por desafío. Ninguna pregunta repetida.</p></div><div class="summary"><strong>${total}<span class="summary-total"> / ${QUIZZES.length*5}</span></strong><span>partidas completadas</span></div></section>${notice?`<div class="notice" role="status">${esc(notice)}</div>`:''}<div class="toolbar"><span>16 DESAFÍOS · 8 PREGUNTAS POR PARTIDA</span><button class="text-button" data-action="reset">Limpiar historial</button></div>${['trivia','aproximacion'].map(mode=>`<section class="challenge-group"><h2>${mode==='trivia'?'Trivias A, B, C, D':'Aproximación numérica'}</h2><div class="grid">${QUIZZES.filter(c=>c.mode===mode).map(card).join('')}</div></section>`).join('')}`;
 decorateIcons();
}
const backButton=()=>'<button class="back" data-action="home">← Todos los desafíos</button>';
function quizHeader(c,i){return `<div class="play-header"><div class="play-title">${icon(c,true)}<div><strong>${esc(c.title)}</strong><div class="play-sub">${kind(c)} · 8 preguntas</div></div></div><span class="run-count">PARTIDA ${i+1} DE 5</span></div>`;}
function comparison(q,answer){
 const r=numericResult(q,answer);return `<details class="comparison"><summary>Comparar con los 12 participantes</summary><div class="table-scroll"><table><thead><tr><th>Participante</th><th>Respuesta</th><th>Error absoluto</th></tr></thead><tbody>${r.entries.map(e=>`<tr class="${e.you?'you-row':''}"><th scope="row">${e.name}</th><td>${fmt(e.answer)}</td><td>${fmt(e.error)}</td></tr>`).join('')}</tbody></table></div></details>`;
}
function numericFeedback(q,answer){const r=numericResult(q,answer);return `${r.exact?'¡Respuesta exacta! ':''}${r.win?(r.tied?'Primer puesto compartido.':'¡Fuiste quien más se acercó!'):`Puesto ${r.rank} de 13.`} Respuesta correcta: ${fmt(q.respuesta_correcta)}. Tu error: ${fmt(r.error)} ${esc(unit(q))}.`;}
function play(file,reviewId=null){
 const c=configFor(file),item=data.get(file),p=progressFor(c),runIndex=p?.runs.findIndex(r=>!r.finished)??-1;if(runIndex<0){home();return;}
 const run=p.runs[runIndex],answered=Object.keys(run.answers).length,index=reviewId&&run.ids.includes(reviewId)?run.ids.indexOf(reviewId):Math.min(answered,RUN_SIZE-1);
 const id=run.ids[index],q=item.questions.find(q=>q.id===id),selected=run.answers[id],has=Object.hasOwn(run.answers,id);view={type:'play',file,index,runIndex};
 const controls=isNumeric(q)?`<form id="numeric-form" novalidate><label class="number-label" for="numeric-answer">Tu aproximación · ${esc(unit(q))}</label><div class="number-controls"><input id="numeric-answer" type="text" inputmode="decimal" autocomplete="off" placeholder="Ingresá un número" aria-describedby="number-hint number-error" ${has?`value="${selected}" disabled`:''}><button class="button" type="submit" ${has?'disabled':''}>Confirmar respuesta</button></div><p class="quiet" id="number-hint">${q.decimales_permitidos?`Hasta ${q.decimales_permitidos} decimales. Coma o punto decimal.`:'Ingresá un número entero.'} Sin separadores de miles.${q.respuesta_minima!==undefined?` Mínimo: ${fmt(q.respuesta_minima)}.`:''}${q.respuesta_maxima!==undefined?` Máximo: ${fmt(q.respuesta_maxima)}.`:''}</p><p id="number-error" class="error-message" role="alert"></p></form>`:`<div class="options">${Object.entries(q.opciones).map(([letter,text])=>{const correct=has&&letter===q.respuesta_correcta,wrong=has&&letter===selected&&!correct;return `<button class="option ${correct?'correct':wrong?'incorrect':''}" data-action="answer" data-answer="${letter}" ${has?'disabled':''}><span class="letter">${letter}</span><span class="option-label">${esc(text)}</span>${correct?'<span class="answer-mark">CORRECTA ✓</span>':wrong?'<span class="answer-mark">TU RESPUESTA</span>':''}</button>`;}).join('')}</div>`;
 const feedback=has?(isNumeric(q)?numericFeedback(q,selected):selected===q.respuesta_correcta?'¡Correcto!':`La respuesta correcta es ${q.respuesta_correcta}: ${esc(q.opciones[q.respuesta_correcta])}.`):(isNumeric(q)?'La respuesta se guarda al confirmarla. Ganás si sos quien más se acerca; los empates en primer lugar cuentan.':'Elegí una respuesta para continuar.');
 app.innerHTML=`<div class="play-layout">${backButton()}${quizHeader(c,runIndex)}<div class="progress-line" aria-label="${answered} de 8 respuestas">${run.ids.map((_,i)=>`<span class="${i<answered?'filled':''}"></span>`).join('')}</div><section class="question-card" aria-labelledby="question-title"><div class="question-info"><span>PREGUNTA ${index+1} / 8</span><span class="pill">Nivel ${q.dificultad} · ${LEVELS[q.dificultad-1]}</span></div><h1 class="question-text" id="question-title" tabindex="-1">${esc(q.texto)}</h1>${controls}<p class="feedback" role="status">${feedback}</p>${has&&q.explicacion_respuesta?`<p class="quiet">${esc(q.explicacion_respuesta)}</p>`:''}${has&&isNumeric(q)?comparison(q,selected):''}<div class="question-actions"><span class="quiet">${has?'Tu respuesta quedó guardada.':'Podés volver al menú y continuar después.'}</span><button class="button" data-action="next" ${!has?'disabled':''}>${index===RUN_SIZE-1?'Ver resultado':'Siguiente pregunta'} →</button></div></section></div>`;
 decorateIcons();if(reviewId)app.querySelector('[data-action="next"]')?.focus({preventScroll:true});else app.querySelector('#question-title')?.focus({preventScroll:true});
}
function results(file,index){
 const c=configFor(file),item=data.get(file),p=progressFor(c),run=p?.runs[index];if(!run?.finished){home();return;}view={type:'result',file,runIndex:index};
 const score=scoreRun(run,item.questions),complete=p.runs.filter(r=>r.finished).length,numeric=c.mode==='aproximacion',lookup=new Map(item.questions.map(q=>[q.id,q]));
 const exact=run.ids.filter(id=>run.answers[id]===lookup.get(id).respuesta_correcta).length;
 app.innerHTML=`<div class="play-layout">${backButton()}${quizHeader(c,index)}<section class="result-panel"><span class="eyebrow">PARTIDA COMPLETADA</span><div class="score">${score}<small> / 8</small></div><h1>${score===8?'¡Ocho de ocho!':numeric?'Tus aproximaciones':'Tu resultado'}</h1><p class="intro" style="margin:auto">${numeric?`${score} victorias por cercanía, incluidos los empates.<br>${exact} respuestas exactas de 8.`:`${score} respuestas correctas de 8.`}<br>${complete===5?'Completaste las cinco partidas de este desafío.':'La próxima partida tendrá ocho preguntas diferentes.'}</p><div class="result-buttons"><button class="button secondary" data-action="home">Volver al menú</button>${complete<5?`<button class="button" data-action="start" data-file="${esc(file)}">${p.runs.some(r=>!r.finished)?'Continuar partida':'Nueva partida'} →</button>`:''}</div></section><div class="history-list" aria-label="Resultados de las partidas">${p.runs.map((r,i)=>r.finished?`<button class="text-button history-score" data-action="result" data-file="${esc(file)}" data-index="${i}" ${i===index?'aria-current="true"':''}>${i+1}.ª · ${scoreRun(r,item.questions)}/8</button>`:'').join('')}</div><h2 class="review-title">Tus ocho respuestas</h2>${run.ids.map((id,i)=>{
  const q=lookup.get(id),a=run.answers[id],correct=isNumeric(q)?numericResult(q,a).win:a===q.respuesta_correcta;
  return `<article class="review-row"><div class="review-head"><span>${i+1}. NIVEL ${q.dificultad} · ${LEVELS[q.dificultad-1]}</span><strong>${isNumeric(q)?(correct?'✓ Victoria':`Puesto ${numericResult(q,a).rank}`):(correct?'✓ Correcta':'× Incorrecta')}</strong></div><p>${esc(q.texto)}</p><div class="review-answer">${isNumeric(q)?`Tu respuesta: <strong>${fmt(a)}</strong><br>${numericFeedback(q,a)}`:`Tu respuesta: <strong>${a}. ${esc(q.opciones[a])}</strong>${!correct?`<br>Respuesta correcta: <strong>${q.respuesta_correcta}. ${esc(q.opciones[q.respuesta_correcta])}</strong>`:''}`}</div>${isNumeric(q)?comparison(q,a):''}</article>`;
 }).join('')}</div>`;decorateIcons();window.scrollTo({top:0,behavior:'instant'});
}
async function mutate(change){
 if(!storageReady)throw new Error('No se puede guardar el historial. Habilitá el almacenamiento del navegador.');
 const tx=()=>{const fresh=readState(localStorage);change(fresh);localStorage.setItem(STORAGE_KEY,JSON.stringify(fresh));state=fresh;};
 if(navigator.locks?.request)await navigator.locks.request(STORAGE_KEY,tx);else tx();
}
async function begin(file){const item=data.get(file);if(!item?.questions)throw new Error('Este desafío no está disponible.');await mutate(fresh=>{fresh.quizzes[file]=prepareProgress(fresh.quizzes[file],item.questions);startRun(fresh.quizzes[file]);});notice='';play(file);window.scrollTo({top:0,behavior:'instant'});}
async function answer(value){
 const {file,index,runIndex}=view,q=data.get(file).questions.find(q=>q.id===progressFor(configFor(file)).runs[runIndex].ids[index]);
 await mutate(fresh=>{const p=fresh.quizzes[file];if(!validProgress(p,data.get(file).questions)||!p.runs[runIndex]||!recordAnswer(p.runs[runIndex],p.runs[runIndex].ids[index],value,q))throw new Error('La partida cambió en otra pestaña. Volvé a abrirla desde el menú.');});
 play(file,progressFor(configFor(file)).runs[runIndex].ids[index]);
}
async function next(){const {file,index,runIndex}=view;if(index<RUN_SIZE-1){play(file);return;}await mutate(fresh=>{const p=fresh.quizzes[file];if(!validProgress(p,data.get(file).questions)||!p.runs[runIndex])throw new Error('La partida ya no está disponible.');finishRun(p.runs[runIndex]);});results(file,runIndex);}
app.addEventListener('click',async event=>{
 const b=event.target.closest('button[data-action]');if(!b||b.disabled||busy)return;busy=true;
 try{switch(b.dataset.action){
 case 'home':notice='';home();window.scrollTo({top:0,behavior:'instant'});break;
 case 'reset':dialog.returnValue='';dialog.showModal();break;
 case 'start':await begin(b.dataset.file);break;
 case 'answer':await answer(b.dataset.answer);break;
 case 'next':await next();break;
 case 'history':{const c=configFor(b.dataset.file);results(c.file,progressFor(c).runs.length-1);break;}
 case 'result':results(b.dataset.file,Number(b.dataset.index));break;
 }}catch(error){notice=error.message+' No se confirmó la acción.';home();}finally{busy=false;}
});
app.addEventListener('submit',async event=>{
 if(event.target.id!=='numeric-form')return;event.preventDefault();if(busy)return;
 const input=app.querySelector('#numeric-answer');if(input.disabled)return;
 const {file,index,runIndex}=view,run=progressFor(configFor(file))?.runs[runIndex],q=data.get(file).questions.find(q=>q.id===run?.ids[index]);
 let value;try{value=parseNumericInput(input.value,q);app.querySelector('#number-error').textContent='';input.removeAttribute('aria-invalid');}catch(error){app.querySelector('#number-error').textContent=error.message;input.setAttribute('aria-invalid','true');input.focus();return;}
 busy=true;try{await answer(value);}catch(error){notice=error.message;home();}finally{busy=false;}
});
dialog.addEventListener('close',async()=>{if(dialog.returnValue!=='reset')return;try{const reset=()=>{localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(LEGACY_STORAGE_KEY);state={version:2,quizzes:{}};storageReady=true;};if(navigator.locks?.request)await navigator.locks.request(STORAGE_KEY,reset);else reset();notice='Historial borrado. Todas las preguntas vuelven a estar disponibles.';home();}catch(error){notice='No fue posible borrar el historial: '+error.message;home();}});
document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();notice='';home();window.scrollTo({top:0,behavior:'instant'});});
window.addEventListener('storage',event=>{if(event.key!==STORAGE_KEY&&event.key!==null)return;try{state=readState(localStorage);notice='El historial cambió en otra pestaña. Podés continuar desde el menú.';home();}catch(error){notice=error.message;storageReady=false;home();}});
async function boot(){
 try{const probe=STORAGE_KEY+':probe';localStorage.setItem(probe,'1');localStorage.removeItem(probe);state=readState(localStorage);if(!localStorage.getItem(STORAGE_KEY)&&localStorage.getItem(LEGACY_STORAGE_KEY))notice='Versión actualizada: las partidas de 8 preguntas comienzan con un historial nuevo.';}catch(error){storageReady=false;notice='No se puede leer o guardar el historial. Usá «Limpiar historial» si está dañado, o habilitá el almacenamiento del navegador.';}
 await Promise.all(QUIZZES.map(async c=>{try{const response=await fetch('Quiz/'+encodeURIComponent(c.file),{cache:'no-cache'});if(!response.ok)throw new Error(`No se pudo cargar Quiz/${c.file} (HTTP ${response.status}).`);const questions=normalize(await response.json());if(questions[0].mode!==c.mode)throw new Error('El tipo del JSON no coincide con el desafío.');data.set(c.file,{questions});}catch(error){data.set(c.file,{error:location.protocol==='file:'?'Publicá la carpeta en GitHub Pages o abrila con un servidor local para cargar los JSON.':error.message});}}));
 if(QUIZZES.some(c=>state.quizzes[c.file]&&data.get(c.file)?.questions&&!validProgress(state.quizzes[c.file],data.get(c.file).questions)))notice='Cambió el contenido de un desafío. Su historial se reiniciará al comenzar; los demás se conservan.';home();
}
boot();

import {QUIZZES} from './config.js';
import {STORAGE_KEY,LEVELS,normalize,prepareProgress,startRun,recordAnswer,finishRun,scoreRun,readState,validProgress} from './core.js';

const app=document.querySelector('#app');
const dialog=document.querySelector('#reset-dialog');
const data=new Map();
let state={version:1,quizzes:{}},storageReady=true,view={type:'home'},notice='',busy=false;
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const imagePath=config=>'Images/'+encodeURIComponent(config.icon);
const configFor=file=>QUIZZES.find(q=>q.file===file);
function icon(config,small=false){return `<img class="${small?'small-icon':'card-icon'}" src="${esc(imagePath(config))}" alt="" loading="lazy"><span class="icon-fallback" hidden aria-hidden="true">${esc(config.title[0])}</span>`;}
function decorateIcons(){
  app.querySelectorAll('img').forEach(img=>{
    const fallback=()=>{img.hidden=true;const next=img.nextElementSibling;if(next){next.hidden=false;if(img.classList.contains('small-icon')){next.style.width='48px';next.style.height='48px';next.style.fontSize='20px';}}};
    img.addEventListener('error',fallback,{once:true});if(img.complete&&!img.naturalWidth)fallback();
  });
}
function progressFor(config){
  const questions=data.get(config.file)?.questions;
  const progress=state.quizzes[config.file];
  return questions&&validProgress(progress,questions)?progress:null;
}
function finishedRuns(config){return (progressFor(config)?.runs??[]).filter(r=>r.finished);}
function home(){
  view={type:'home'};
  const total=QUIZZES.reduce((sum,c)=>sum+finishedRuns(c).length,0);
  app.innerHTML=`<section class="hero-row"><div><span class="eyebrow">PONÉ A PRUEBA LO QUE SABÉS</span><h1>Una trivia.<br>Cinco desafíos.</h1><p class="intro">Elegí un tema y respondé una pregunta de cada nivel.<br>Cinco partidas por trivia. Ninguna pregunta repetida.</p></div><div class="summary"><strong>${total}<span style="display:inline;font-size:19px;color:#aaa"> / 40</span></strong><span>partidas completadas</span></div></section>
  ${notice?`<div class="notice" role="status">${esc(notice)}</div>`:''}
  <div class="toolbar"><span>${QUIZZES.length} TEMAS · 5 NIVELES POR PARTIDA</span><button class="text-button" data-action="reset">Limpiar historial</button></div>
  <section class="grid" aria-label="Seleccionar una trivia">${QUIZZES.map((config,i)=>{
    const item=data.get(config.file),progress=progressFor(config),finished=finishedRuns(config),active=progress?.runs.some(r=>!r.finished),available=!!item?.questions&&storageReady,exhausted=finished.length>=5;
    const best=finished.length?Math.max(...finished.map(r=>scoreRun(r,item.questions))):null;
    return `<article class="card"><div class="card-top">${icon(config)}<span class="card-number">${String(i+1).padStart(2,'0')}</span></div><h2>${esc(config.title)}</h2><p class="card-description">${esc(config.description)}</p><div class="card-bottom"><div class="dots" aria-label="${finished.length} de 5 partidas completadas">${[0,1,2,3,4].map(j=>`<span class="dot ${j<finished.length?'done':active&&j===finished.length?'active':''}"></span>`).join('')}</div>
    ${item?.error?`<p class="error-message">${esc(item.error)}</p>`:`<div class="card-meta">${finished.length}/5 partidas${best!==null?` · Mejor: ${best}/5`:''}${active?' · En curso':''}</div>`}
    <button class="button full ${exhausted?'secondary':''}" data-action="${exhausted?'history':'start'}" data-file="${esc(config.file)}" ${!available?'disabled':''}>${exhausted?'Ver resultados':active?'Continuar partida':'Comenzar'}<span aria-hidden="true">${exhausted?'✓':'↗'}</span></button></div></article>`;
  }).join('')}</section>`;
  decorateIcons();
}
function backButton(){return '<button class="back" data-action="home"><span aria-hidden="true">←</span> Todas las trivias</button>';}
function quizHeader(config,runIndex){return `<div class="play-header"><div class="play-title">${icon(config,true)}<div><strong>${esc(config.title)}</strong><div class="play-sub">Una pregunta por nivel</div></div></div><span class="run-count">PARTIDA ${runIndex+1} DE 5</span></div>`;}
function play(file,reviewId=null){
  const config=configFor(file),item=data.get(file),progress=progressFor(config);
  const runIndex=progress?.runs.findIndex(r=>!r.finished)??-1;
  if(runIndex<0){home();return;}
  const run=progress.runs[runIndex],answered=Object.keys(run.answers).length;
  // Tras recargar se conserva también el feedback de la última respuesta.
  const index=reviewId&&run.ids.includes(reviewId)?run.ids.indexOf(reviewId):Math.min(answered,4);
  const id=run.ids[index],question=item.questions.find(q=>q.id===id),selected=run.answers[id];
  view={type:'play',file,index,runIndex};
  app.innerHTML=`<div class="play-layout">${backButton()}${quizHeader(config,runIndex)}<div class="progress-line" aria-label="${answered} de 5 respuestas">${run.ids.map((_,i)=>`<span class="${i<answered?'filled':''}"></span>`).join('')}</div><section class="question-card" aria-labelledby="question-title"><div class="question-info"><span>PREGUNTA ${index+1} / 5</span><span class="pill">Nivel ${question.dificultad} · ${LEVELS[question.dificultad-1]}</span></div><h1 class="question-text" id="question-title" tabindex="-1">${esc(question.texto)}</h1><div class="options">${Object.entries(question.opciones).map(([letter,text])=>{
    const correct=selected&&letter===question.respuesta_correcta,wrong=selected&&letter===selected&&!correct;
    return `<button class="option ${correct?'correct':wrong?'incorrect':''}" data-action="answer" data-answer="${letter}" ${selected?'disabled':''}><span class="letter">${letter}</span><span class="option-label">${esc(text)}</span>${correct?'<span class="answer-mark">CORRECTA ✓</span>':wrong?'<span class="answer-mark">TU RESPUESTA</span>':''}</button>`;
  }).join('')}</div><p class="feedback" role="status">${selected?(selected===question.respuesta_correcta?'¡Correcto!':`La respuesta correcta es ${question.respuesta_correcta}: ${esc(question.opciones[question.respuesta_correcta])}.`):'Elegí una respuesta para continuar.'}</p><div class="question-actions"><span class="quiet">${selected?'Tu respuesta quedó guardada.':'La respuesta se confirma al seleccionarla.'}</span><button class="button" data-action="next" ${!selected?'disabled':''}>${index===4?'Ver resultado':'Siguiente pregunta'} <span aria-hidden="true">→</span></button></div></section></div>`;
  decorateIcons();
  if(reviewId)app.querySelector('[data-action="next"]')?.focus({preventScroll:true});
  else document.querySelector('#question-title')?.focus({preventScroll:true});
}
function results(file,index){
  const config=configFor(file),item=data.get(file),progress=progressFor(config),run=progress?.runs[index];
  if(!run?.finished){home();return;}
  view={type:'result',file,runIndex:index};
  const score=scoreRun(run,item.questions),complete=progress.runs.filter(r=>r.finished).length;
  const messages=['Una nueva oportunidad para aprender.','Cada respuesta suma experiencia.','Ya tenés una buena base.','¡Buen recorrido!','¡Muy cerca del pleno!','¡Cinco de cinco!'];
  app.innerHTML=`<div class="play-layout">${backButton()}${quizHeader(config,index)}<section class="result-panel"><span class="eyebrow">PARTIDA COMPLETADA</span><div class="score">${score}<small> / 5</small></div><h1>${messages[score]}</h1><p class="intro" style="margin:auto">${score===1?'Una respuesta correcta':`${score} respuestas correctas`} de cinco.<br>${complete===5?'Completaste las cinco partidas de esta trivia.':'La próxima partida tendrá cinco preguntas diferentes.'}</p><div class="result-buttons"><button class="button secondary" data-action="home">Volver al menú</button>${complete<5?`<button class="button" data-action="start" data-file="${esc(file)}">${progress.runs.some(r=>!r.finished)?'Continuar partida':'Nueva partida'} →</button>`:''}</div></section><div class="history-list" aria-label="Resultados de las partidas">${progress.runs.map((r,i)=>r.finished?`<button class="text-button history-score" data-action="result" data-file="${esc(file)}" data-index="${i}" ${i===index?'aria-current="true"':''}>${i+1}.ª · ${scoreRun(r,item.questions)}/5</button>`:'').join('')}</div><h2 class="review-title">Tus cinco respuestas</h2>${run.ids.map((id,i)=>{
    const q=item.questions.find(q=>q.id===id),answer=run.answers[id],correct=answer===q.respuesta_correcta;
    return `<article class="review-row"><div class="review-head"><span>${i+1}. NIVEL ${q.dificultad} · ${LEVELS[q.dificultad-1]}</span><strong>${correct?'✓ Correcta':'× Incorrecta'}</strong></div><p>${esc(q.texto)}</p><div class="review-answer">Tu respuesta: <strong>${answer}. ${esc(q.opciones[answer])}</strong>${!correct?`<br>Respuesta correcta: <strong>${q.respuesta_correcta}. ${esc(q.opciones[q.respuesta_correcta])}</strong>`:''}</div></article>`;
  }).join('')}</div>`;
  decorateIcons();window.scrollTo({top:0,behavior:'instant'});
}
async function mutate(change){
  if(!storageReady)throw new Error('No se puede guardar el historial. Habilitá el almacenamiento del navegador.');
  const transaction=()=>{const fresh=readState(localStorage);change(fresh);localStorage.setItem(STORAGE_KEY,JSON.stringify(fresh));state=fresh;};
  if(navigator.locks?.request)await navigator.locks.request(STORAGE_KEY,transaction);else transaction();
}
async function begin(file){
  const item=data.get(file);if(!item?.questions)throw new Error('Esta trivia no está disponible.');
  await mutate(fresh=>{fresh.quizzes[file]=prepareProgress(fresh.quizzes[file],item.questions);startRun(fresh.quizzes[file]);});
  notice='';play(file);window.scrollTo({top:0,behavior:'instant'});
}
async function answer(letter){
  const {file,index,runIndex}=view;
  await mutate(fresh=>{
    const progress=fresh.quizzes[file];
    if(!validProgress(progress,data.get(file).questions)||!recordAnswer(progress.runs[runIndex],progress.runs[runIndex].ids[index],letter))throw new Error('La partida cambió en otra pestaña. Volvé a abrirla desde el menú.');
  });
  play(file,progressFor(configFor(file)).runs[runIndex].ids[index]);
}
async function next(){
  const {file,index,runIndex}=view;
  if(index<4){play(file);return;}
  await mutate(fresh=>{
    const progress=fresh.quizzes[file];
    if(!validProgress(progress,data.get(file).questions)||!progress.runs[runIndex])throw new Error('La partida ya no está disponible.');
    finishRun(progress.runs[runIndex]);
  });
  results(file,runIndex);
}
app.addEventListener('click',async event=>{
  const button=event.target.closest('button[data-action]');if(!button||button.disabled||busy)return;
  busy=true;
  try{
    switch(button.dataset.action){
      case 'home':notice='';home();window.scrollTo({top:0,behavior:'instant'});break;
      case 'reset':dialog.returnValue='';dialog.showModal();break;
      case 'start':await begin(button.dataset.file);break;
      case 'answer':await answer(button.dataset.answer);break;
      case 'next':await next();break;
      case 'history':{const config=configFor(button.dataset.file);results(config.file,progressFor(config).runs.length-1);break;}
      case 'result':results(button.dataset.file,Number(button.dataset.index));break;
    }
  }catch(error){notice=error.message+' No se confirmó la acción.';home();}finally{busy=false;}
});
dialog.addEventListener('close',async()=>{
  if(dialog.returnValue!=='reset')return;
  try{
    const reset=()=>{localStorage.removeItem(STORAGE_KEY);state={version:1,quizzes:{}};storageReady=true;};
    if(navigator.locks?.request)await navigator.locks.request(STORAGE_KEY,reset);else reset();
    notice='Historial borrado. Todas las preguntas vuelven a estar disponibles.';home();
  }catch(error){notice='No fue posible borrar el historial: '+error.message;home();}
});
document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();notice='';home();window.scrollTo({top:0,behavior:'instant'});});
window.addEventListener('storage',event=>{
  if(event.key!==STORAGE_KEY&&event.key!==null)return;
  try{state=readState(localStorage);notice='El historial cambió en otra pestaña. Podés continuar desde el menú.';home();}catch(error){notice=error.message;storageReady=false;home();}
});
async function boot(){
  try{
    const probe=STORAGE_KEY+':probe';localStorage.setItem(probe,'1');localStorage.removeItem(probe);state=readState(localStorage);
  }catch(error){storageReady=false;notice='No se puede leer o guardar el historial. Si está dañado, usá «Limpiar historial»; si el navegador bloquea el almacenamiento, habilitalo para esta página.';}
  await Promise.all(QUIZZES.map(async config=>{
    try{
      const response=await fetch('Quiz/'+encodeURIComponent(config.file),{cache:'no-cache'});
      if(!response.ok)throw new Error(`No se pudo cargar Quiz/${config.file} (HTTP ${response.status}).`);
      data.set(config.file,{questions:normalize(await response.json())});
    }catch(error){data.set(config.file,{error:location.protocol==='file:'?'Publicá la carpeta en GitHub Pages o abrila con un servidor local. El doble clic en index.html no permite cargar los JSON.':error.message});}
  }));
  const changed=QUIZZES.filter(c=>state.quizzes[c.file]&&data.get(c.file)?.questions&&!validProgress(state.quizzes[c.file],data.get(c.file).questions));
  if(changed.length)notice='Cambió el contenido de alguna trivia. Su historial se reiniciará al comenzar; el de las demás se conserva.';
  home();
}
boot();

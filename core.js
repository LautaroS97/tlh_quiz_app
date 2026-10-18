export const STORAGE_KEY='tlh-quiz-room:v1';
export const LEVELS=['Fácil','Regular','Difícil','Muy difícil','Imposible'];
export function shuffle(items, random=Math.random){
  const copy=[...items];
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
}
export function normalize(raw){
  if(!raw || !Array.isArray(raw.preguntas))throw new Error('El JSON debe contener un arreglo "preguntas".');
  const questions=raw.preguntas.map((q,i)=>{
    if(!Number.isInteger(q.dificultad)||q.dificultad<1||q.dificultad>5)throw new Error(`Dificultad inválida en la pregunta ${i+1}.`);
    if(typeof q.texto!=='string'||!q.texto.trim())throw new Error(`Falta el texto de la pregunta ${i+1}.`);
    if(!q.opciones||Object.keys(q.opciones).sort().join('')!=='ABCD'||Object.values(q.opciones).some(v=>typeof v!=='string'||!v.trim()))throw new Error(`Se requieren opciones A, B, C y D en la pregunta ${i+1}.`);
    if(!['A','B','C','D'].includes(q.respuesta_correcta))throw new Error(`Respuesta correcta inválida en la pregunta ${i+1}.`);
    return {...q,id:String(q.id??`pregunta_${i+1}`)};
  });
  if(new Set(questions.map(q=>q.id)).size!==questions.length)throw new Error('Hay identificadores de preguntas repetidos.');
  if(questions.length!==25||[1,2,3,4,5].some(d=>questions.filter(q=>q.dificultad===d).length!==5))throw new Error('Se requieren 25 preguntas: exactamente cinco por cada nivel del 1 al 5.');
  return questions;
}
export function signature(questions){
  // Detecta cambios de contenido, no cambios en las probabilidades de personajes.
  const data=JSON.stringify(questions.map(q=>[q.id,q.dificultad,q.texto,q.opciones,q.respuesta_correcta]));
  let hash=2166136261;for(let i=0;i<data.length;i++){hash^=data.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return (hash>>>0).toString(16);
}
export function validProgress(progress,questions){
  if(!progress||progress.signature!==signature(questions)||!Array.isArray(progress.runs)||progress.runs.length>5)return false;
  const lookup=new Map(questions.map(q=>[q.id,q]));
  const all=[];
  for(let level=1;level<=5;level++){
    const deck=progress.decks?.[level];
    if(!Array.isArray(deck)||deck.length!==5||new Set(deck).size!==5||deck.some(id=>lookup.get(id)?.dificultad!==level))return false;
  }
  for(let i=0;i<progress.runs.length;i++){
    const run=progress.runs[i];
    if(!Array.isArray(run.ids)||run.ids.length!==5||run.ids.some((id,j)=>id!==progress.decks[j+1][i]))return false;
    if(!run.answers||typeof run.answers!=='object'||Array.isArray(run.answers)||typeof run.finished!=='boolean')return false;
    const entries=Object.entries(run.answers);
    if(entries.some(([id,answer])=>!run.ids.includes(id)||!['A','B','C','D'].includes(answer)))return false;
    // Las respuestas forman un prefijo: no se pueden saltar preguntas.
    if(run.ids.some((id,j)=>j<entries.length?!Object.hasOwn(run.answers,id):Object.hasOwn(run.answers,id)))return false;
    if(run.finished&&entries.length!==5)return false;
    if(!run.finished&&i!==progress.runs.length-1)return false;
    all.push(...run.ids);
  }
  return new Set(all).size===all.length;
}
export function prepareProgress(previous,questions,random=Math.random){
  if(validProgress(previous,questions))return previous;
  return {signature:signature(questions),decks:Object.fromEntries([1,2,3,4,5].map(d=>[d,shuffle(questions.filter(q=>q.dificultad===d).map(q=>q.id),random)])),runs:[]};
}
export function startRun(progress){
  const active=progress.runs.find(r=>!r.finished);
  if(active)return active;
  if(progress.runs.length>=5)throw new Error('Ya completaste las cinco partidas de esta trivia.');
  const index=progress.runs.length;
  const run={ids:[1,2,3,4,5].map(d=>progress.decks[d][index]),answers:{},finished:false,startedAt:new Date().toISOString()};
  progress.runs.push(run);return run;
}
export function recordAnswer(run,id,answer){
  if(run.finished||!['A','B','C','D'].includes(answer)||run.ids[Object.keys(run.answers).length]!==id)return false;
  run.answers[id]=answer;return true;
}
export function finishRun(run){
  if(run.ids.some(id=>!Object.hasOwn(run.answers,id)))throw new Error('Faltan respuestas.');
  run.finished=true;run.finishedAt=new Date().toISOString();
}
export function scoreRun(run,questions){const map=new Map(questions.map(q=>[q.id,q]));return run.ids.filter(id=>run.answers[id]===map.get(id)?.respuesta_correcta).length;}
export function readState(storage){
  const value=storage.getItem(STORAGE_KEY);
  if(!value)return {version:1,quizzes:{}};
  const parsed=JSON.parse(value);
  if(parsed?.version!==1||!parsed.quizzes||typeof parsed.quizzes!=='object'||Array.isArray(parsed.quizzes))throw new Error('El historial guardado no tiene un formato válido.');
  return parsed;
}

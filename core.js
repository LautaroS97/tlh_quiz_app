export const STORAGE_KEY='tlh-quiz-room:v2';
export const LEGACY_STORAGE_KEY='tlh-quiz-room:v1';
export const LEVELS=['Fácil','Regular','Difícil','Muy difícil','Imposible'];
export const QUOTAS=[3,2,1,1,1],RUN_SIZE=8,MAX_RUNS=5;
export const PARTICIPANTS=['alan','ashley','pretty','gloria','wiktor','megan','kerem','bruno','brody','kim','hyun','jana'];
export function shuffle(items,random=Math.random){
 const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;
}
export const isNumeric=q=>q?.mode==='aproximacion';
export const rounded=(q,value)=>Number(value.toFixed(q.decimales_permitidos??0));
export function numericError(q,value){
 if(typeof value!=='number'||!Number.isFinite(value))return 'Ingresá un número válido.';
 if(value<(q.respuesta_minima??0))return `El mínimo permitido es ${q.respuesta_minima??0}.`;
 if(q.respuesta_maxima!==undefined&&value>q.respuesta_maxima)return `El máximo permitido es ${q.respuesta_maxima}.`;
 if(Math.abs(value-rounded(q,value))>1e-9)return `Usá como máximo ${q.decimales_permitidos??0} decimales.`;
 return '';
}
export function parseNumericInput(text,q){
 const input=String(text).trim();
 if(!/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(input))throw new Error('Ingresá un número sin separadores de miles. Podés usar coma o punto decimal.');
 const value=Number(input.replace(',','.'));const error=numericError(q,value);if(error)throw new Error(error);return value;
}
export function normalize(raw){
 if(!raw||!Array.isArray(raw.preguntas))throw new Error('El JSON debe contener un arreglo "preguntas".');
 const mode=raw.tipo==='aproximacion_numerica'?'aproximacion':'trivia';
 const questions=raw.preguntas.map((q,i)=>{
  if(!Number.isInteger(q.dificultad)||q.dificultad<1||q.dificultad>5)throw new Error(`Dificultad inválida en la pregunta ${i+1}.`);
  if(typeof q.texto!=='string'||!q.texto.trim())throw new Error(`Falta el texto de la pregunta ${i+1}.`);
  const result={...q,id:String(q.id??`pregunta_${i+1}`),mode};
  if(mode==='trivia'){
   if(!q.opciones||Object.keys(q.opciones).sort().join('')!=='ABCD'||Object.values(q.opciones).some(v=>typeof v!=='string'||!v.trim()))throw new Error(`Se requieren opciones A, B, C y D en la pregunta ${i+1}.`);
   if(!['A','B','C','D'].includes(q.respuesta_correcta))throw new Error(`Respuesta correcta inválida en la pregunta ${i+1}.`);
  }else{
   result.decimales_permitidos=q.decimales_permitidos??0;result.respuesta_minima=q.respuesta_minima??0;
   if(!Number.isInteger(result.decimales_permitidos)||result.decimales_permitidos<0||result.decimales_permitidos>6)throw new Error(`Precisión inválida en la pregunta ${i+1}.`);
   if(numericError(result,q.respuesta_correcta))throw new Error(`Respuesta numérica inválida en la pregunta ${i+1}.`);
   if(PARTICIPANTS.some(n=>typeof q.desvio_respuesta?.[n]!=='number'||!Number.isFinite(q.desvio_respuesta[n])))throw new Error(`Faltan desvíos numéricos en la pregunta ${i+1}.`);
   if(PARTICIPANTS.some(n=>numericError(result,rounded(result,q.respuesta_correcta+q.desvio_respuesta[n]))))throw new Error(`Un desvío genera una respuesta fuera de rango en la pregunta ${i+1}.`);
  }return result;
 });
 if(new Set(questions.map(q=>q.id)).size!==questions.length)throw new Error('Hay identificadores de preguntas repetidos.');
 if(questions.length!==40||QUOTAS.some((n,i)=>questions.filter(q=>q.dificultad===i+1).length!==n*MAX_RUNS))throw new Error('Se requieren 40 preguntas: 15 fáciles, 10 regulares y 5 de cada nivel restante.');
 return questions;
}
export function signature(questions){
 const text=JSON.stringify(questions.map(q=>[q.id,q.mode,q.dificultad,q.texto,q.opciones,q.respuesta_correcta,q.unidad,q.decimales_permitidos,q.respuesta_minima,q.respuesta_maxima,q.desvio_respuesta]));
 let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16);
}
const idsFor=(p,index)=>QUOTAS.flatMap((n,i)=>p.decks[i+1].slice(index*n,(index+1)*n));
export function validProgress(progress,questions){
 if(!progress||progress.signature!==signature(questions)||!Array.isArray(progress.runs)||progress.runs.length>MAX_RUNS)return false;
 const lookup=new Map(questions.map(q=>[q.id,q])),all=[];
 for(let level=1;level<=5;level++){
  const deck=progress.decks?.[level],count=QUOTAS[level-1]*MAX_RUNS;
  if(!Array.isArray(deck)||deck.length!==count||new Set(deck).size!==count||deck.some(id=>lookup.get(id)?.dificultad!==level))return false;
 }
 for(let i=0;i<progress.runs.length;i++){
  const run=progress.runs[i],expected=idsFor(progress,i);
  if(!Array.isArray(run.ids)||run.ids.length!==RUN_SIZE||run.ids.some((id,j)=>id!==expected[j]))return false;
  if(!run.answers||typeof run.answers!=='object'||Array.isArray(run.answers)||typeof run.finished!=='boolean')return false;
  const entries=Object.entries(run.answers);
  if(entries.some(([id,a])=>!run.ids.includes(id)||(isNumeric(lookup.get(id))?!!numericError(lookup.get(id),a):!['A','B','C','D'].includes(a))))return false;
  if(run.ids.some((id,j)=>j<entries.length?!Object.hasOwn(run.answers,id):Object.hasOwn(run.answers,id)))return false;
  if(run.finished&&entries.length!==RUN_SIZE)return false;
  if(!run.finished&&i!==progress.runs.length-1)return false;
  all.push(...run.ids);
 }return new Set(all).size===all.length;
}
export function prepareProgress(previous,questions,random=Math.random){
 if(validProgress(previous,questions))return previous;
 return {signature:signature(questions),decks:Object.fromEntries(QUOTAS.map((_,i)=>[i+1,shuffle(questions.filter(q=>q.dificultad===i+1).map(q=>q.id),random)])),runs:[]};
}
export function startRun(progress){
 const active=progress.runs.find(r=>!r.finished);if(active)return active;
 if(progress.runs.length>=MAX_RUNS)throw new Error('Ya completaste las cinco partidas de este desafío.');
 const run={ids:idsFor(progress,progress.runs.length),answers:{},finished:false,startedAt:new Date().toISOString()};progress.runs.push(run);return run;
}
export function recordAnswer(run,id,answer,question){
 if(run.finished||run.ids[Object.keys(run.answers).length]!==id)return false;
 if(isNumeric(question)?numericError(question,answer):!['A','B','C','D'].includes(answer))return false;
 run.answers[id]=answer;return true;
}
export function finishRun(run){
 if(run.ids.some(id=>!Object.hasOwn(run.answers,id)))throw new Error('Faltan respuestas.');
 run.finished=true;run.finishedAt=new Date().toISOString();
}
export function numericResult(q,answer){
 const target=q.respuesta_correcta;
 const entries=[{name:'Vos',answer,error:rounded(q,Math.abs(answer-target)),you:true},...PARTICIPANTS.map(n=>({name:n[0].toUpperCase()+n.slice(1),answer:rounded(q,target+q.desvio_respuesta[n]),error:rounded(q,Math.abs(q.desvio_respuesta[n])),you:false}))].sort((a,b)=>a.error-b.error||Number(b.you)-Number(a.you));
 const own=entries.find(e=>e.you),rank=1+entries.filter(e=>e.error<own.error).length;
 return {entries,error:own.error,rank,win:rank===1,exact:own.error===0,tied:entries.filter(e=>e.error===own.error).length>1};
}
export function scoreRun(run,questions){
 const lookup=new Map(questions.map(q=>[q.id,q]));return run.ids.filter(id=>{if(!Object.hasOwn(run.answers,id))return false;const q=lookup.get(id);return isNumeric(q)?numericResult(q,run.answers[id]).win:run.answers[id]===q.respuesta_correcta;}).length;
}
export function readState(storage){
 const value=storage.getItem(STORAGE_KEY);if(!value)return {version:2,quizzes:{}};
 const parsed=JSON.parse(value);if(parsed?.version!==2||!parsed.quizzes||typeof parsed.quizzes!=='object'||Array.isArray(parsed.quizzes))throw new Error('El historial guardado no tiene un formato válido.');return parsed;
}

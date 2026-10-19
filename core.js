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
   if(!q.intervalos_desvio_si_falla&&PARTICIPANTS.some(n=>typeof q.desvio_respuesta?.[n]!=='number'||!Number.isFinite(q.desvio_respuesta[n])))throw new Error(`Faltan desvíos numéricos en la pregunta ${i+1}.`);
   if(!q.intervalos_desvio_si_falla&&PARTICIPANTS.some(n=>numericError(result,rounded(result,q.respuesta_correcta+q.desvio_respuesta[n]))))throw new Error(`Un desvío genera una respuesta fuera de rango en la pregunta ${i+1}.`);
   if(q.intervalos_desvio_si_falla){
    result.simulation='probabilistic-v1';
    result.paso_desvio_si_falla=q.paso_desvio_si_falla??raw.modelo_simulacion?.paso_desvio??1;
    validateSimulation(result,raw.modelo_simulacion?.probabilidades_acierto_permitidas??[10,25,50]);
   }
  }return result;
 });
 if(new Set(questions.map(q=>q.id)).size!==questions.length)throw new Error('Hay identificadores de preguntas repetidos.');
 if(questions.length!==40||QUOTAS.some((n,i)=>questions.filter(q=>q.dificultad===i+1).length!==n*MAX_RUNS))throw new Error('Se requieren 40 preguntas: 15 fáciles, 10 regulares y 5 de cada nivel restante.');
 return questions;
}
export function signature(questions){
 const text=JSON.stringify(questions.map(q=>[q.id,q.mode,q.dificultad,q.texto,q.opciones,q.respuesta_correcta,q.unidad,q.decimales_permitidos,q.respuesta_minima,q.respuesta_maxima,q.desvio_respuesta,...(q.simulation?[q.probabilidad_acierto,q.nivel_error_si_falla,q.intervalos_desvio_si_falla,q.paso_desvio_si_falla]:[])]));
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
  if(expected.some(id=>lookup.get(id).simulation)&&!validRivalAnswers(run,lookup))return false;
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
export function startRun(progress,questions,random=Math.random){
 const active=progress.runs.find(r=>!r.finished);if(active)return active;
 if(progress.runs.length>=MAX_RUNS)throw new Error('Ya completaste las cinco partidas de este desafío.');
 const run={ids:idsFor(progress,progress.runs.length),answers:{},finished:false,startedAt:new Date().toISOString()};
 if(questions?.some(q=>q.simulation)){
  const lookup=new Map(questions.map(q=>[q.id,q]));
  run.rivalAnswers=Object.fromEntries(run.ids.map(id=>{const q=lookup.get(id);return [id,Object.fromEntries(PARTICIPANTS.map(n=>[n,simulateNumericAnswer(q,n,random)]))];}));
 }
 progress.runs.push(run);return run;
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
export function numericResult(q,answer,run){
 const target=q.respuesta_correcta;
 const entries=[{id:'you',name:'Vos',answer,error:rounded(q,Math.abs(answer-target)),you:true},...PARTICIPANTS.map(n=>{
  const value=q.simulation?run?.rivalAnswers?.[q.id]?.[n]:rounded(q,target+q.desvio_respuesta[n]);
  if(numericError(q,value))throw new Error('Faltan respuestas guardadas de los participantes. Volvé a iniciar este desafío.');
  return {id:n,name:n[0].toUpperCase()+n.slice(1),answer:value,error:rounded(q,Math.abs(value-target)),you:false};
 })].sort((a,b)=>a.error-b.error||Number(b.you)-Number(a.you));
 const own=entries.find(e=>e.you),rank=1+entries.filter(e=>e.error<own.error).length;
 return {entries,error:own.error,rank,win:rank===1,exact:own.error===0,tied:entries.filter(e=>e.error===own.error).length>1};
}
export function scoreRun(run,questions){
 const lookup=new Map(questions.map(q=>[q.id,q]));return run.ids.filter(id=>{if(!Object.hasOwn(run.answers,id))return false;const q=lookup.get(id);return isNumeric(q)?numericResult(q,run.answers[id],run).win:run.answers[id]===q.respuesta_correcta;}).length;
}
export function readState(storage){
 const value=storage.getItem(STORAGE_KEY);if(!value)return {version:2,quizzes:{}};
 const parsed=JSON.parse(value);if(parsed?.version!==2||!parsed.quizzes||typeof parsed.quizzes!=='object'||Array.isArray(parsed.quizzes))throw new Error('El historial guardado no tiene un formato válido.');return parsed;
}

// Simulación estable: revisar resultados nunca vuelve a sortear los aciertos.
function stableRoll(text){
 let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}return (hash>>>0)/4294967296;
}
export function finalRanking(run,questions){
 if(!run?.finished||run.ids.some(id=>!Object.hasOwn(run.answers,id)))throw new Error('La clasificación requiere una partida completada.');
 const lookup=new Map(questions.map(q=>[q.id,q])),selected=run.ids.map(id=>lookup.get(id));
 if(selected.some(q=>!q))throw new Error('Faltan preguntas de esta partida.');
 const numeric=isNumeric(selected[0]);
 if(!numeric&&selected.some(q=>PARTICIPANTS.some(n=>typeof q.probabilidad_acierto?.[n]!=='number'||q.probabilidad_acierto[n]<0||q.probabilidad_acierto[n]>100)))return null;
 const rows=[{id:'you',name:'Vos',you:true},...PARTICIPANTS.map(id=>({id,name:id[0].toUpperCase()+id.slice(1),you:false}))].map(p=>({...p,points:0,exact:0,relativeError:0}));
 for(const q of selected){
  if(numeric){
   const result=numericResult(q,run.answers[q.id],run),minimum=result.entries[0].error;
   for(const row of rows){
    const error=row.you?result.error:result.entries.find(e=>e.id===row.id).error;
    if(error===minimum)row.points++;
    if(error===0)row.exact++;
    row.relativeError+=error/Math.max(Math.abs(q.respuesta_correcta),1);
   }
  }else{
   for(const row of rows){
    const probability=row.you?null:q.probabilidad_acierto[row.id];
    const correct=row.you?run.answers[q.id]===q.respuesta_correcta:stableRoll(JSON.stringify([run.startedAt,run.ids,q.id,q.texto,row.id]))<probability/100;
    if(correct){row.points++;row.exact++;}
   }
  }
 }
 for(const row of rows){row.relativeError=Number((row.relativeError/selected.length).toFixed(10));}
 rows.sort((a,b)=>b.points-a.points||(numeric?a.relativeError-b.relativeError:0)||Number(b.you)-Number(a.you)||a.name.localeCompare(b.name));
 rows.forEach((row,i)=>{const previous=rows[i-1];row.rank=previous&&row.points===previous.points&&(!numeric||row.relativeError===previous.relativeError)?previous.rank:i+1;});
 const own=rows.find(row=>row.you),tied=rows.filter(row=>row.rank===own.rank).length>1;
 return {numeric,rows,rank:own.rank,tied};
}

// Los sorteos solo ocurren al crear una partida; las vistas leen rivalAnswers.
const integerTick=(value,scale)=>{
 const tick=Math.round(value*scale);
 if(!Number.isSafeInteger(tick)||Math.abs(value*scale-tick)>1e-6)throw new Error('Un valor no respeta la precisión numérica.');
 return tick;
};
function intervalGrid(q,level){
 const scale=10**q.decimales_permitidos,step=integerTick(q.paso_desvio_si_falla,scale);
 if(step<=0)throw new Error('El paso de desvío debe ser positivo.');
 const intervals=q.intervalos_desvio_si_falla?.[level];
 if(!Array.isArray(intervals)||!intervals.length)throw new Error('Faltan intervalos de desvío.');
 const bands=intervals.map(p=>{
  if(typeof p.min!=='number'||!Number.isFinite(p.min)||typeof p.max!=='number'||!Number.isFinite(p.max))throw new Error('Los extremos de los intervalos deben ser números.');
  const min=integerTick(p.min,scale),max=integerTick(p.max,scale);
  if(min>max||min<=0&&max>=0||min%step!==0||max%step!==0)throw new Error('Un intervalo incluye cero, está invertido o no respeta el paso.');
  const count=(max-min)/step+1;
  if(!Number.isSafeInteger(count))throw new Error('El intervalo excede el rango numérico permitido.');
  if(numericError(q,rounded(q,q.respuesta_correcta+min/scale))||numericError(q,rounded(q,q.respuesta_correcta+max/scale)))throw new Error('Un intervalo genera respuestas fuera de los límites de la pregunta.');
  return {min,max,count};
 });
 const sorted=[...bands].sort((a,b)=>a.min-b.min);
 if(sorted.some((p,i)=>i&&p.min<=sorted[i-1].max))throw new Error('Hay intervalos superpuestos.');
 const total=bands.reduce((n,p)=>n+p.count,0);
 if(!Number.isSafeInteger(total))throw new Error('Hay demasiados desvíos posibles.');
 return {scale,step,bands,total};
}
function validateSimulation(q,allowed){
 if(!Array.isArray(allowed)||!allowed.length||allowed.some(p=>typeof p!=='number'||!Number.isFinite(p)||p<0||p>100))throw new Error('Probabilidades permitidas inválidas.');
 if(typeof q.paso_desvio_si_falla!=='number'||!Number.isFinite(q.paso_desvio_si_falla))throw new Error('El paso debe ser numérico.');
 if(PARTICIPANTS.some(n=>typeof q.probabilidad_acierto?.[n]!=='number'||!allowed.includes(q.probabilidad_acierto[n])||!['bajo','medio','alto'].includes(q.nivel_error_si_falla?.[n])))throw new Error('Faltan probabilidades o niveles de error válidos para los 12 participantes.');
 let previous=0;
 for(const level of ['bajo','medio','alto']){
  const {bands}=intervalGrid(q,level),low=Math.min(...bands.map(p=>Math.min(Math.abs(p.min),Math.abs(p.max)))),high=Math.max(...bands.map(p=>Math.max(Math.abs(p.min),Math.abs(p.max))));
  if(low<=previous)throw new Error('Los niveles de error se superponen o no crecen.');previous=high;
 }
}
const roll=random=>{const x=random();if(typeof x!=='number'||!Number.isFinite(x)||x<0||x>=1)throw new Error('Sorteo inválido.');return x;};
export function simulateNumericAnswer(q,participant,random=Math.random){
 if(!q.simulation)return rounded(q,q.respuesta_correcta+q.desvio_respuesta[participant]);
 if(roll(random)<q.probabilidad_acierto[participant]/100)return q.respuesta_correcta;
 const {scale,step,bands,total}=intervalGrid(q,q.nivel_error_si_falla[participant]);let index=Math.floor(roll(random)*total);
 for(const band of bands){
  if(index<band.count){const offset=band.min+index*step;return (integerTick(q.respuesta_correcta,scale)+offset)/scale;}index-=band.count;
 }
 throw new Error('No se pudo elegir un desvío.');
}
function validRivalAnswers(run,lookup){
 if(!run.rivalAnswers||typeof run.rivalAnswers!=='object'||Object.keys(run.rivalAnswers).length!==run.ids.length)return false;
 for(const id of run.ids){
  const q=lookup.get(id),answers=run.rivalAnswers[id];
  if(!answers||Object.keys(answers).length!==PARTICIPANTS.length)return false;
  for(const n of PARTICIPANTS){
   const value=answers[n];if(numericError(q,value))return false;
   if(value===q.respuesta_correcta){if(q.probabilidad_acierto[n]<=0)return false;continue;}
   if(q.probabilidad_acierto[n]>=100)return false;
   const {scale,step,bands}=intervalGrid(q,q.nivel_error_si_falla[n]);
   const delta=integerTick(value,scale)-integerTick(q.respuesta_correcta,scale);
   if(!bands.some(p=>delta>=p.min&&delta<=p.max&&(delta-p.min)%step===0))return false;
  }
 }return true;
}

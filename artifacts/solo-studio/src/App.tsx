import { useEffect, useLayoutEffect, useRef, useState, type SetStateAction } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, Show, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Link, Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BriefcaseBusiness, Check, CheckSquare, Clock3, Download, FileText, FolderKanban, HelpCircle, LayoutDashboard, LifeBuoy, Plus, Search, Settings as SettingsIcon, Users, Wallet, X } from 'lucide-react';
import { STUDIO_THEMES, type StudioThemeId } from './lib/studio-themes';
import { dateKey, isoToday, offsetDate } from './lib/date-utils';
import { countAttentionItemsByDay, filterAttentionItemsForDay, getActiveProjectDeadlinesThroughWeekEnd } from './lib/week-agenda';
import { buildExpensesCsv, buildInvoicesCsv } from './lib/finance-export';
import { buildRecordOutput } from './lib/proposal-invoice';
import { applyDocumentLines, documentLinesError, emptyDocumentSettings, linesForForm, normalizeDocumentSettings, parseDocumentPath } from './lib/studio-document';
import { findConvertedProject, getProjectDependentRecords, paidDateForStatus, projectDateValidationMessage, taskBelongsToProject } from './lib/record-integrity';
import { buildWorkspaceExport, parseWorkspaceImport } from './lib/workspace-export';
import { mergeWorkspaceChanges } from './lib/workspace-concurrency';
import { EmailConnectionsPanel, type EmailAnalysisCandidate } from './components/EmailConnectionsPanel';
import { MobileNavigation } from './components/MobileNavigation';
import { PwaInstallCard } from './components/PwaInstallCard';
import { ProposalInvoiceAction } from './components/ProposalInvoiceAction';
import { DocumentLinesEditor, DocumentSettingsCard, StudioDocumentPage, documentSettingsFromForm } from './components/StudioDocument';
import { LegalPage } from './components/LegalPages';
import HelpPage from './components/HelpPage';
import { getGetStudioLegalProfileQueryKey, useGetStudioLegalProfile, useSaveStudioLegalProfile, type StudioLegalProfileInput } from '@workspace/api-client-react';

type Entity = 'leads'|'clients'|'proposals'|'projects'|'tasks'|'invoices'|'expenses'|'timeEntries';
type Item = Record<string, any> & {id:string};
type FontPairId = 'dm-lora'|'manrope-newsreader'|'public-source';
type Store = Record<Entity, Item[]> & {settings:{businessName:string;defaultHourlyRatePence:number;designTheme:StudioThemeId;fontPair:FontPairId;document:ReturnType<typeof normalizeDocumentSettings>};caseStudies?:Item[];launchDrafts?:Item[]};
type AttentionItem = {id:string;entity:Entity;record:Item;category:string;title:string;context:string;date:string;dateText:string;badge:string;severity:number};
const uid = () => globalThis.crypto?.randomUUID?.() ?? `ss-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
const seed:Store = {
 leads:[
  {id:'lead-olive',name:'Sophie Bennett',company:'Olive & Row',email:'sophie@example.com',source:'Referral',valuePence:480000,stage:'Proposal sent',nextActionDate:offsetDate(1),notes:'Independent homeware brand. Wants a thoughtful commerce refresh before autumn.',createdAt:offsetDate(-5)},
  {id:'lead-fable',name:'Tom Edwards',company:'Fable Press',email:'tom@example.com',source:'Website',valuePence:265000,stage:'Qualified',nextActionDate:offsetDate(2),notes:'Small publishing house; looking for a new identity and launch site.',createdAt:offsetDate(-8)},
  {id:'lead-morrow',name:'Amira Shah',company:'Morrow Studio',email:'amira@example.com',source:'LinkedIn',valuePence:190000,stage:'New',nextActionDate:offsetDate(4),notes:'Asked about a brand sprint.',createdAt:offsetDate(-2)},
  {id:'lead-common',name:'Jamie Clarke',company:'Common Ground',email:'jamie@example.com',source:'Event',valuePence:320000,stage:'Won',nextActionDate:offsetDate(-1),notes:'Accepted identity proposal. Ready to begin.',createdAt:offsetDate(-14)}
 ],
 clients:[
  {id:'client-north',name:'Eleanor Price',company:'North & Kind',email:'eleanor@example.com',phone:'07700 900 281',notes:'Brand and digital partner since last spring.',createdAt:offsetDate(-75)},
  {id:'client-common',name:'Jamie Clarke',company:'Common Ground',email:'jamie@example.com',phone:'07700 900 143',notes:'Community-first organisation; prefers email updates.',createdAt:offsetDate(-12)}
 ],
 proposals:[
  {id:'prop-olive',title:'Olive & Row — digital shop',leadId:'lead-olive',clientId:'',status:'Sent',amountPence:480000,validUntil:offsetDate(14),notes:'Shopify refresh, art direction and launch support.'},
  {id:'prop-common',title:'Common Ground — identity',leadId:'lead-common',clientId:'client-common',status:'Accepted',amountPence:320000,validUntil:offsetDate(10),notes:'Identity system and launch toolkit.'}
 ],
 projects:[
  {id:'project-north',title:'North & Kind — seasonal story',clientId:'client-north',description:'A bright, flexible campaign landing page for the new collection.',status:'In progress',startDate:offsetDate(-3),dueDate:offsetDate(12),budgetPence:265000},
  {id:'project-common',title:'Common Ground — identity system',clientId:'client-common',description:'An identity built around the good work happening locally.',status:'Completed',startDate:offsetDate(-18),dueDate:offsetDate(-2),budgetPence:320000}
 ],
 tasks:[
  {id:'task-01',projectId:'project-north',title:'Share first page direction',dueDate:offsetDate(1),priority:'High',completed:false},
  {id:'task-02',projectId:'project-north',title:'Prepare mobile prototype',dueDate:offsetDate(3),priority:'Medium',completed:false},
  {id:'task-03',projectId:'project-common',title:'Package final logo files',dueDate:offsetDate(-2),priority:'Low',completed:true}
 ],
 invoices:[
  {id:'invoice-01',number:'SS-104',clientId:'client-north',projectId:'project-north',amountPence:132500,issuedDate:offsetDate(-10),dueDate:offsetDate(4),status:'Sent',paidDate:''},
  {id:'invoice-02',number:'SS-103',clientId:'client-common',projectId:'project-common',amountPence:160000,issuedDate:offsetDate(-17),dueDate:offsetDate(-4),status:'Paid',paidDate:offsetDate(-6)}
 ],
 expenses:[
  {id:'expense-01',title:'Type Foundry licence',category:'Software',amountPence:4800,date:offsetDate(-2),projectId:'project-common',notes:'Commercial desktop licence'},
  {id:'expense-02',title:'Client workshop train',category:'Travel',amountPence:3260,date:offsetDate(-1),projectId:'project-north',notes:'Return journey'}
 ],
 timeEntries:[
  {id:'time-01',projectId:'project-north',taskId:'task-01',date:isoToday(),durationMinutes:105,notes:'First round of visual references'},
  {id:'time-02',projectId:'project-common',taskId:'task-03',date:offsetDate(-2),durationMinutes:75,notes:'Final file handover'}
 ],
  settings:{businessName:'Fieldnotes Studio',defaultHourlyRatePence:6500,designTheme:'evergreen',fontPair:'dm-lora',document:{...emptyDocumentSettings}}
};
const basePath=import.meta.env.BASE_URL.replace(/\/$/,'');
const brandMarkUrl=`${basePath}/solo-studio-mark.png`;
const workspaceEndpoint=`${basePath}/api/studio/workspace`;
function normalizeWorkspace(value:unknown):Store{
 const saved=value&&typeof value==='object'?value as Partial<Store>:{};
 const selected=saved.settings?.designTheme;
 const designTheme=STUDIO_THEMES.some(theme=>theme.id===selected)?selected:'evergreen';
 const selectedFont=saved.settings?.fontPair;
 const fontPair=(['dm-lora','manrope-newsreader','public-source'] as string[]).includes(selectedFont??'')?selectedFont as FontPairId:'dm-lora';
 return {...seed,...saved,settings:{...seed.settings,...saved.settings,designTheme,fontPair,document:normalizeDocumentSettings(saved.settings?.document)}} as Store;
}
type WorkspaceSnapshot={state:Store;version:number};
type WorkspaceConflictState={ownerId:string;latest:WorkspaceSnapshot};
class WorkspaceConflictError extends Error{
 constructor(readonly latest:WorkspaceSnapshot){
  super('This workspace changed in another tab.');
  this.name='WorkspaceConflictError';
 }
}
function parseWorkspaceResponse(payload:unknown):WorkspaceSnapshot{
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('The workspace service returned an unexpected response.');
 const response=payload as {state?:unknown;version?:unknown};
 const state=response.state;
 if(!state||typeof state!=='object'||Array.isArray(state))throw new Error('The workspace service returned invalid workspace data.');
 if(typeof response.version!=='number'||!Number.isInteger(response.version)||response.version<1)throw new Error('The workspace service returned an invalid workspace version.');
 return {state:normalizeWorkspace(state),version:response.version};
}
async function writeWorkspace(state:Store,expectedVersion:number|null,signal?:AbortSignal):Promise<WorkspaceSnapshot>{
 const response=await fetch(workspaceEndpoint,{method:'PUT',credentials:'include',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({state,expectedVersion}),signal});
 if(response.status===409){
  const payload=await response.json() as {current?:unknown};
  if(!payload.current)throw new Error('The workspace changed in another tab. Reload it before saving again.');
  throw new WorkspaceConflictError(parseWorkspaceResponse(payload.current));
 }
 if(!response.ok)throw new Error(response.status===401?'Your session has expired. Sign in again.':'Your workspace could not be saved. Check your connection and try again.');
 return parseWorkspaceResponse(await response.json());
}
async function readWorkspace(signal:AbortSignal):Promise<WorkspaceSnapshot>{
 const response=await fetch(workspaceEndpoint,{credentials:'include',cache:'no-store',signal});
 if(response.status===404){
  try{return await writeWorkspace(normalizeWorkspace(seed),null,signal)}
  catch(error){if(error instanceof WorkspaceConflictError)return error.latest;throw error}
 }
 if(!response.ok)throw new Error(response.status===401?'Your session has expired. Sign in again.':'Your workspace could not be loaded. Please try again.');
 return parseWorkspaceResponse(await response.json());
}
const workspaceEntities:Entity[]=['leads','clients','proposals','projects','tasks','invoices','expenses','timeEntries'];
const sameWorkspaceValue=(left:unknown,right:unknown)=>JSON.stringify(left)===JSON.stringify(right);
const titleMap:Record<Entity,string>={leads:'Leads',clients:'Clients',proposals:'Proposals',projects:'Projects',tasks:'Tasks',invoices:'Invoices',expenses:'Expenses',timeEntries:'Time entries'};
const configs:Record<Entity,{label:string;fields:{key:string;label:string;type?:string;options?:string[];required?:boolean;wide?:boolean}[];primary:string;columns:string[]}> = {
 leads:{label:'Lead',primary:'name',columns:['name','company','stage','valuePence','nextActionDate'],fields:[{key:'name',label:'Contact name',required:true},{key:'company',label:'Company'},{key:'email',label:'Email',type:'email'},{key:'source',label:'Source'},{key:'valuePence',label:'Potential value (£)',type:'money'},{key:'stage',label:'Stage',type:'select',options:['New','Qualified','Proposal sent','Won','Lost']},{key:'nextActionDate',label:'Next action date',type:'date'},{key:'notes',label:'Notes',type:'textarea',wide:true}]},
 clients:{label:'Client',primary:'name',columns:['name','company','email','phone'],fields:[{key:'name',label:'Contact name',required:true},{key:'company',label:'Company'},{key:'email',label:'Email',type:'email'},{key:'phone',label:'Phone'},{key:'notes',label:'Notes',type:'textarea',wide:true}]},
 proposals:{label:'Proposal',primary:'title',columns:['title','status','amountPence','validUntil'],fields:[{key:'title',label:'Proposal title',required:true},{key:'leadId',label:'Linked lead',type:'select-ref:leads'},{key:'clientId',label:'Client',type:'select-ref:clients'},{key:'status',label:'Status',type:'select',options:['Draft','Sent','Accepted','Declined','Expired']},{key:'amountPence',label:'Amount (£)',type:'money'},{key:'validUntil',label:'Valid until',type:'date'},{key:'notes',label:'Notes',type:'textarea',wide:true}]},
 projects:{label:'Project',primary:'title',columns:['title','clientId','status','dueDate','budgetPence'],fields:[{key:'title',label:'Project title',required:true},{key:'clientId',label:'Client',type:'select-ref:clients'},{key:'description',label:'Description',type:'textarea',wide:true},{key:'status',label:'Status',type:'select',options:['Planning','In progress','On hold','Completed','Archived']},{key:'startDate',label:'Start date',type:'date'},{key:'dueDate',label:'Due date',type:'date'},{key:'budgetPence',label:'Budget (£)',type:'money'}]},
 tasks:{label:'Task',primary:'title',columns:['title','projectId','dueDate','priority','completed'],fields:[{key:'projectId',label:'Project',type:'select-ref:projects',required:true},{key:'title',label:'Task',required:true},{key:'dueDate',label:'Due date',type:'date'},{key:'priority',label:'Priority',type:'select',options:['Low','Medium','High']},{key:'completed',label:'Completed',type:'select',options:['No','Yes']}]},
 invoices:{label:'Invoice',primary:'number',columns:['number','clientId','amountPence','dueDate','status'],fields:[{key:'number',label:'Invoice number',required:true},{key:'clientId',label:'Client',type:'select-ref:clients'},{key:'projectId',label:'Project',type:'select-ref:projects'},{key:'amountPence',label:'Amount (£)',type:'money'},{key:'issuedDate',label:'Issued date',type:'date'},{key:'dueDate',label:'Due date',type:'date'},{key:'status',label:'Payment status',type:'select',options:['Draft','Sent','Paid','Overdue','Void']},{key:'paidDate',label:'Paid date',type:'date'}]},
 expenses:{label:'Expense',primary:'title',columns:['title','category','amountPence','date','projectId'],fields:[{key:'title',label:'Expense',required:true},{key:'category',label:'Category',type:'select',options:['Software','Travel','Equipment','Marketing','Professional services','Other']},{key:'amountPence',label:'Amount (£)',type:'money'},{key:'date',label:'Date',type:'date'},{key:'projectId',label:'Project',type:'select-ref:projects'},{key:'notes',label:'Notes',type:'textarea',wide:true}]},
 timeEntries:{label:'Time entry',primary:'date',columns:['projectId','taskId','date','durationMinutes','notes'],fields:[{key:'projectId',label:'Project',type:'select-ref:projects',required:true},{key:'taskId',label:'Task',type:'select-ref:tasks'},{key:'date',label:'Date',type:'date'},{key:'durationMinutes',label:'Duration (minutes)',type:'number'},{key:'notes',label:'Notes',type:'textarea',wide:true}]},
};
const routes:{path:string;label:string;icon:any;entity?:Entity}[]=[
  {path:'/user-portal',label:'Overview',icon:LayoutDashboard},
  {path:'/pipeline',label:'Pipeline',icon:ArrowUpRight,entity:'leads'},
  {path:'/clients',label:'Clients',icon:Users,entity:'clients'},
  {path:'/projects',label:'Projects',icon:FolderKanban,entity:'projects'},
  {path:'/money',label:'Money',icon:Wallet,entity:'invoices'},
  {path:'/settings',label:'Settings',icon:SettingsIcon},
  {path:'/help',label:'Help',icon:HelpCircle}
];
const money=(p:any)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format((Number(p)||0)/100);
const dateFmt=(v:any)=>{if(!v)return '—';const d=new Date(`${v}T00:00:00`);return Number.isNaN(d.getTime())?String(v):new Intl.DateTimeFormat('en-GB').format(d)};
const columnLabels:Record<string,string>={clientId:'Client',projectId:'Project',taskId:'Task',leadId:'Lead',amountPence:'Amount (£)',valuePence:'Potential value (£)',budgetPence:'Budget (£)',dueDate:'Due date',startDate:'Start date',nextActionDate:'Next action date',validUntil:'Valid until',issuedDate:'Issue date',paidDate:'Paid date',durationMinutes:'Duration',completed:'Completed'};
const nice=(s:string)=>columnLabels[s]??s?.replace(/([A-Z])/g,' $1').replace(/^./,m=>m.toUpperCase())??'';
const FONT_PAIRS:{id:FontPairId;name:string;description:string;sans:string;serif:string}[]=[
 {id:'dm-lora',name:'DM Sans + Lora',description:'A quietly editorial pairing with crisp, open interface text.',sans:"'DM Sans', sans-serif",serif:"'Lora', Georgia, serif"},
 {id:'manrope-newsreader',name:'Manrope + Newsreader',description:'Compact, contemporary sans with a warm reading voice.',sans:"'Manrope', sans-serif",serif:"'Newsreader', Georgia, serif"},
 {id:'public-source',name:'Public Sans + Source Serif 4',description:'Direct and highly legible, with a measured bookish accent.',sans:"'Public Sans', sans-serif",serif:"'Source Serif 4', Georgia, serif"}
];

function Studio(){
 const [location,setLocation]=useLocation();
 const routeName=routes.find(r=>r.path===location)?.label??'Overview';
 useEffect(()=>{
  document.title=routeName==='Overview'?'Solo Studio · A calmer way to run your studio':`${routeName} · Solo Studio`;
 },[routeName]);
  const {isLoaded,user}=useUser();
  const {signOut}=useClerk();
  const userId=user?.id??'';
  const [workspaceData,setWorkspaceData]=useState<{ownerId:string;store:Store;version:number}|null>(null);
  const store=workspaceData?.ownerId===userId?workspaceData.store:null;
  const latestWorkspaceRef=useRef(workspaceData);
  latestWorkspaceRef.current=workspaceData;
  const versionRef=useRef<{ownerId:string;version:number}|null>(null);
  const persistedStateRef=useRef<{ownerId:string;state:Store}|null>(null);
  const lastSavedStoreRef=useRef<{ownerId:string;store:Store}|null>(null);
  const savingRef=useRef(false);
  const retryAfterSaveRef=useRef(false);
  const conflictRef=useRef<WorkspaceConflictState|null>(null);
  const setStore=(action:SetStateAction<Store>)=>{
    if(!userId)return;
    setWorkspaceData(current=>{
      const previous=current?.ownerId===userId?current.store:normalizeWorkspace(seed);
      const next=typeof action==='function'?action(previous):action;
      return {ownerId:userId,store:next,version:current?.ownerId===userId?current.version:1};
    });
  };
  const [loadError,setLoadError]=useState<{ownerId:string;message:string}|null>(null);
  const [saveInfo,setSaveInfo]=useState<{ownerId:string;status:'saving'|'saved'|'error'|'conflict'}|null>(null);
  const [saveConflict,setSaveConflict]=useState<WorkspaceConflictState|null>(null);
  const [mergeError,setMergeError]=useState('');
  const [saveRetry,setSaveRetry]=useState(0);
 const [modal,setModal]=useState<{entity:Entity;mode:'create'|'edit'|'view';item?:Item}|null>(null);
 const [form,setForm]=useState<Record<string,any>>({});
  const formBaselineRef=useRef('{}');
  const [formError,setFormError]=useState('');
 const [query,setQuery]=useState('');
 const [toast,setToast]=useState('');
  const [settingsForm,setSettingsForm]=useState(seed.settings);
  const [isOnline,setIsOnline]=useState(()=>typeof navigator==='undefined'?true:navigator.onLine);
  const hasUnsavedRecordForm=Boolean(modal&&modal.mode!=='view'&&JSON.stringify(form)!==formBaselineRef.current);
  const hasUnsavedSettings=Boolean(location==='/settings'&&store&&JSON.stringify(settingsForm)!==JSON.stringify(store.settings));
  const hasUnsavedWorkspace=Boolean(
    store&&lastSavedStoreRef.current?.ownerId===userId&&lastSavedStoreRef.current.store!==store
  )||Boolean(saveInfo?.ownerId===userId&&['saving','error','conflict'].includes(saveInfo.status));
  const shouldWarnBeforeLeave=hasUnsavedRecordForm||hasUnsavedSettings||hasUnsavedWorkspace;
   useEffect(()=>{
    const handleOnline=()=>{
     setIsOnline(true);
     if(savingRef.current)retryAfterSaveRef.current=true;
     setSaveRetry(attempt=>attempt+1);
    };
    const handleOffline=()=>setIsOnline(false);
    window.addEventListener('online',handleOnline);
    window.addEventListener('offline',handleOffline);
    return()=>{window.removeEventListener('online',handleOnline);window.removeEventListener('offline',handleOffline)};
   },[]);
   useEffect(()=>{
    if(!shouldWarnBeforeLeave)return;
    const warnBeforeLeave=(event:BeforeUnloadEvent)=>{
     event.preventDefault();
     event.returnValue='';
    };
    window.addEventListener('beforeunload',warnBeforeLeave);
    return()=>window.removeEventListener('beforeunload',warnBeforeLeave);
   },[shouldWarnBeforeLeave]);
  useEffect(()=>{
    if(!isLoaded||!userId)return;
    let active=true;
    const controller=new AbortController();
     versionRef.current=null;
     persistedStateRef.current=null;
     lastSavedStoreRef.current=null;
     conflictRef.current=null;
     setSaveConflict(null);
     setSaveInfo(null);
    setLoadError(null);
    readWorkspace(controller.signal).then(loaded=>{
       if(active){
         versionRef.current={ownerId:userId,version:loaded.version};
         persistedStateRef.current={ownerId:userId,state:loaded.state};
         lastSavedStoreRef.current={ownerId:userId,store:loaded.state};
         setWorkspaceData({ownerId:userId,store:loaded.state,version:loaded.version});
       }
    }).catch(error=>{
      if(active&&!(error instanceof DOMException&&error.name==='AbortError')){
        setLoadError({ownerId:userId,message:error instanceof Error?error.message:'Your workspace could not be loaded.'});
      }
    });
    return()=>{active=false;controller.abort()};
  },[isLoaded,userId]);
  useEffect(()=>{
    if(!store||!userId)return;
    document.documentElement.dataset.studioTheme=store.settings.designTheme;
    document.documentElement.dataset.studioFont=store.settings.fontPair||'dm-lora';
     if(conflictRef.current?.ownerId===userId)return;
     if(lastSavedStoreRef.current?.ownerId===userId&&lastSavedStoreRef.current.store===store)return;
    setSaveInfo({ownerId:userId,status:'saving'});
    const timer=setTimeout(()=>{
       if(savingRef.current)return;
       savingRef.current=true;
       void (async()=>{
         let snapshot:Store|null=store;
         try{
           while(snapshot){
             if(conflictRef.current?.ownerId===userId)break;
             const version=versionRef.current?.ownerId===userId?versionRef.current.version:null;
             const saved=await writeWorkspace(snapshot,version);
             if(versionRef.current?.ownerId!==userId)break;
             versionRef.current={ownerId:userId,version:saved.version};
             persistedStateRef.current={ownerId:userId,state:snapshot};
             lastSavedStoreRef.current={ownerId:userId,store:snapshot};
             setWorkspaceData(current=>current?.ownerId===userId?{...current,version:saved.version}:current);
             const latest=latestWorkspaceRef.current;
             snapshot=latest?.ownerId===userId&&latest.store!==snapshot?latest.store:null;
           }
           if(!conflictRef.current||conflictRef.current.ownerId!==userId)setSaveInfo({ownerId:userId,status:'saved'});
         }catch(error){
           if(error instanceof WorkspaceConflictError){
             const nextConflict={ownerId:userId,latest:error.latest};
             conflictRef.current=nextConflict;
             setSaveConflict(nextConflict);
             setMergeError('');
             setSaveInfo({ownerId:userId,status:'conflict'});
           }else{
             setSaveInfo({ownerId:userId,status:'error'});
             setToast(error instanceof Error?error.message:'Your changes could not be saved.');
           }
         }finally{
           savingRef.current=false;
            if(retryAfterSaveRef.current){
             retryAfterSaveRef.current=false;
             setSaveRetry(attempt=>attempt+1);
            }
         }
       })();
    },300);
     return()=>{clearTimeout(timer)};
  },[store,userId,saveRetry]);
  useEffect(()=>{if(store)setSettingsForm(store.settings)},[store?.settings]);
  useEffect(()=>{setQuery('')},[location]);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),3200);return()=>clearTimeout(timer)},[toast]);
  if(!isLoaded||!userId||!store){
    const message=loadError?.ownerId===userId?loadError.message:null;
    return message?<main className="auth-screen"><div className="card auth-error" role="alert"><img src={brandMarkUrl} alt="" className="auth-mark"/><h1>Your workspace is unavailable</h1><p>{message}</p><button className="button primary" onClick={()=>window.location.reload()}>Try again</button></div></main>:<main className="auth-screen" aria-live="polite"><div className="auth-loading"><img src={brandMarkUrl} alt="" className="auth-mark"/><p>Opening your private workspace…</p></div></main>;
  }
 const allRecords=(entity:Entity)=>store[entity] as Item[];
 const nameFor=(entity:Entity,id:any)=> id ? allRecords(entity).find(x=>x.id===id)?.[configs[entity].primary]??'Unavailable record':'—';
  const open=(entity:Entity,mode:'create'|'edit'|'view',item?:Item,initialValues:Record<string,any>={})=>{
   const initial:Record<string,any>={};
   configs[entity].fields.forEach(f=>{
     let value=item?.[f.key];
      if(value===undefined){
        if(Object.prototype.hasOwnProperty.call(initialValues,f.key))value=initialValues[f.key];
        else if(entity==='invoices'&&f.key==='paidDate')value='';
        else value=f.type==='date'?isoToday():f.type==='select'?f.options?.[0]??'':f.type==='money'||f.type==='number'?0:f.key==='completed'||f.key==='published'?'No':'';
      }
      if(entity==='invoices'&&f.key==='paidDate'&&(item?.status??'Draft')!=='Paid')value='';
     if(f.type==='money')value=Number(value||0)/100;
      if(f.key==='completed'&&typeof value==='boolean')value=value?'Yes':'No';
     initial[f.key]=value;
   });
    if(entity==='proposals'||entity==='invoices')initial.lines=linesForForm(item,uid);
    formBaselineRef.current=JSON.stringify(initial);
    setForm(initial);setFormError('');setModal({entity,mode,item});
 };
 const saveRecord=()=>{
   if(!modal)return;
   const {entity,mode,item}=modal;
    if(entity==='projects'){
      const message=projectDateValidationMessage(String(form.startDate||''),String(form.dueDate||''));
      if(message){setFormError(message);return;}
    }
    if(entity==='timeEntries'&&form.taskId&&!taskBelongsToProject(String(form.taskId),String(form.projectId||''),store.tasks)){
      setFormError('Choose a task from the selected project, or leave Task blank.');
      return;
    }
    const output:Item=buildRecordOutput(entity,item,form,uid);
   configs[entity].fields.forEach(f=>{
     if(f.type==='money')output[f.key]=Math.round(Number(form[f.key]||0)*100);
     if(f.type==='number')output[f.key]=Number(form[f.key]||0);
     if((f.key==='completed'||f.key==='published')&&typeof form[f.key]==='string')output[f.key]=form[f.key]==='Yes';
   });
    if(!item&&!output.createdAt)output.createdAt=isoToday();
    if(entity==='invoices'&&form.status!=='Paid')output.paidDate='';
    if(entity==='proposals'||entity==='invoices'){
      const lineError=documentLinesError(form.lines??[]);
      if(lineError){setFormError(lineError);return;}
      const priced=applyDocumentLines(form.lines);
      output.lines=priced.lines;
      output.amountPence=priced.amountPence;
    }
   setStore(prev=>({...prev,[entity]:mode==='edit'?prev[entity].map(x=>x.id===output.id?output:x):[output,...prev[entity]]}));
   setModal(null);setToast(`${configs[entity].label} ${mode==='edit'?'updated':'created'}.`);
 };
 const removeRecord=(entity:Entity,item:Item)=>{
    if(entity==='projects'){
      const dependents=getProjectDependentRecords(item.id,store);
      const total=Object.values(dependents).reduce((count,records)=>count+records.length,0);
      if(total){
         setToast(`This project has linked proposals, tasks, time entries, invoices or expenses. Reassign them or archive the project to keep its history intact.`);
        return;
      }
    }
   if(!window.confirm(`Delete “${item[configs[entity].primary]||configs[entity].label}”? This cannot be undone.`))return;
   setStore(prev=>({...prev,[entity]:prev[entity].filter(x=>x.id!==item.id)}));setModal(null);setToast(`${configs[entity].label} deleted.`);
 };
 const patchRecord=(entity:Entity,id:string,patch:Record<string,any>)=>setStore(prev=>({...prev,[entity]:prev[entity].map(x=>x.id===id?{...x,...patch}:x)}));
 const convertLead=(lead:Item)=>{
   const clientId=uid(),projectId=uid();
   const client:Item={id:clientId,name:lead.name,company:lead.company,email:lead.email,phone:'',notes:`Converted from lead. ${lead.notes||''}`.trim(),createdAt:isoToday()};
   const project:Item={id:projectId,title:`${lead.company||lead.name} — new project`,clientId,description:`Project created from accepted opportunity.\n\n${lead.notes||''}`,status:'Planning',startDate:isoToday(),dueDate:lead.nextActionDate||offsetDate(30),budgetPence:Number(lead.valuePence)||0};
   setStore(prev=>({...prev,clients:[client,...prev.clients],projects:[project,...prev.projects],leads:prev.leads.map(x=>x.id===lead.id?{...x,stage:'Won'}:x)}));
   setModal(null);setLocation('/projects');setToast('Lead converted into a client and project.');
 };
  const convertProposal=(proposal:Item)=>{
    const existingProject=findConvertedProject(proposal,store.projects);
    let clientId=proposal.clientId||existingProject?.clientId;
    let createdClient:Item|undefined;
    let convertedLeadId:string|undefined;
    if(!clientId){
      const lead=store.leads.find(x=>x.id===proposal.leadId);
      if(lead){
        clientId=uid();
        convertedLeadId=lead.id;
        createdClient={id:clientId,name:lead.name,company:lead.company,email:lead.email,phone:'',notes:`Converted from proposal ${proposal.title}.`,createdAt:isoToday()};
      }
    }
    if(!clientId){setToast('Link this proposal to a lead or client before converting.');return;}
    const project=existingProject??{id:uid(),title:proposal.title,clientId,description:proposal.notes||'',status:'Planning',startDate:isoToday(),dueDate:offsetDate(30),budgetPence:Number(proposal.amountPence)||0,sourceProposalId:proposal.id};
    setStore(prev=>({
      ...prev,
      ...(createdClient?{clients:[createdClient,...prev.clients]}:{}),
      ...(convertedLeadId?{leads:prev.leads.map(x=>x.id===convertedLeadId?{...x,stage:'Won'}:x)}:{}),
      projects:existingProject
        ?prev.projects.map(x=>x.id===project.id?{...x,sourceProposalId:proposal.id}:x)
        :[project,...prev.projects],
      proposals:prev.proposals.map(x=>x.id===proposal.id?{...x,status:'Accepted',clientId,linkedProjectId:project.id}:x),
    }));
    setModal(null);setLocation('/projects');setToast(existingProject?'This proposal is already linked to a project.':'Accepted proposal connected to a new project.');
  };
 const displayValue=(entity:Entity,key:string,value:any)=>{
   if(value===null||value===undefined||value==='')return '—';
   if(key.endsWith('Pence'))return money(value);
   if(['nextActionDate','validUntil','startDate','dueDate','issuedDate','paidDate','date','createdAt','updatedAt'].includes(key))return dateFmt(value);
   if(key==='durationMinutes')return `${Math.floor((Number(value)||0)/60)}h ${(Number(value)||0)%60}m`;
   if(key==='clientId')return nameFor('clients',value);
   if(key==='projectId')return nameFor('projects',value);
   if(key==='leadId')return nameFor('leads',value);
   if(key==='taskId')return nameFor('tasks',value);
   if(typeof value==='boolean')return value?'Yes':'No';
   return String(value);
 };
  const matching=(entity:Entity)=>{
    const normalizedQuery=query.trim().toLocaleLowerCase('en-GB');
    if(!normalizedQuery)return allRecords(entity);
    const references:Record<string,Entity>={clientId:'clients',projectId:'projects',taskId:'tasks',leadId:'leads'};
    return allRecords(entity).filter(item=>{
      const related=Object.entries(references).flatMap(([key,relatedEntity])=>{
        const relatedId=item[key];
        const record=relatedId?allRecords(relatedEntity).find(candidate=>candidate.id===relatedId):undefined;
        return record?Object.values(record):[];
      });
      return [...Object.values(item),...related].join(' ').toLocaleLowerCase('en-GB').includes(normalizedQuery);
    });
  };
  const resetDemo=()=>{if(window.confirm('Reset this account’s workspace to the original Solo Studio starter data? All changes in this account will be replaced. This cannot be undone.')){setStore(normalizeWorkspace(seed));setToast('Starter workspace restored for this account.')}};
  const downloadBackup=()=>{
    try{
      const exportedAt=new Date().toISOString();
      const backup=buildWorkspaceExport(store,exportedAt);
      const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));
      const link=document.createElement('a');
      link.href=url;
      link.download=`solo-studio-backup-${exportedAt.slice(0,10)}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),1000);
      setToast('Your studio backup has downloaded.');
    }catch{
      setToast('Your studio backup could not be created. Please try again.');
    }
  };
  const loadLatestWorkspace=()=>{
    if(saveConflict?.ownerId!==userId)return;
    const {latest}=saveConflict;
    versionRef.current={ownerId:userId,version:latest.version};
    persistedStateRef.current={ownerId:userId,state:latest.state};
    lastSavedStoreRef.current={ownerId:userId,store:latest.state};
    conflictRef.current=null;
    setSaveConflict(null);
    setMergeError('');
    setSaveInfo({ownerId:userId,status:'saved'});
    setWorkspaceData({ownerId:userId,store:latest.state,version:latest.version});
  };
  const mergeMyChanges=()=>{
    if(saveConflict?.ownerId!==userId||!store)return;
    const base=persistedStateRef.current;
    if(!base||base.ownerId!==userId){
      setMergeError('The previous version is not available in this tab. Download your changes before loading the latest version.');
      return;
    }
    const {latest}=saveConflict;
    const merged=mergeWorkspaceChanges(base.state,store,latest.state,workspaceEntities);
    if(!merged.state){
      setMergeError(`Some changes affect the same records in both tabs: ${merged.conflicts.join(', ')}. Download your changes before loading the latest version.`);
      return;
    }
    versionRef.current={ownerId:userId,version:latest.version};
    persistedStateRef.current={ownerId:userId,state:latest.state};
    conflictRef.current=null;
    setSaveConflict(null);
    setMergeError('');
    if(sameWorkspaceValue(merged.state,latest.state)){
      lastSavedStoreRef.current={ownerId:userId,store:latest.state};
      setSaveInfo({ownerId:userId,status:'saved'});
      setWorkspaceData({ownerId:userId,store:latest.state,version:latest.version});
    }else{
      lastSavedStoreRef.current={ownerId:userId,store:latest.state};
      setSaveInfo({ownerId:userId,status:'saving'});
      setWorkspaceData({ownerId:userId,store:merged.state,version:latest.version});
    }
  };
  const selectTheme=(designTheme:StudioThemeId)=>{setSettingsForm((current:any)=>({...current,designTheme}));setStore((prev:Store)=>({...prev,settings:{...prev.settings,designTheme}}));setToast(`${STUDIO_THEMES.find(theme=>theme.id===designTheme)?.name??'Studio'} theme applied.`)};
  const documentRoute=parseDocumentPath(location);
  if(documentRoute){
    const records=documentRoute.kind==='invoice'?store.invoices:store.proposals;
    const record=records.find(item=>item.id===documentRoute.id);
    const linkedClient=record?store.clients.find(item=>item.id===record.clientId):undefined;
    const linkedLead=record&&documentRoute.kind==='proposal'?store.leads.find(item=>item.id===record.leadId):undefined;
    return <StudioDocumentPage kind={documentRoute.kind} record={record} client={linkedClient} lead={linkedLead} paymentSettings={store.settings.document} backHref={documentRoute.kind==='invoice'?'/money':'/pipeline'}/>;
  }
 const page=()=>{
   if(location==='/user-portal')return <Dashboard store={store} money={money} dateFmt={dateFmt} open={open} nameFor={nameFor}/>;
   if(location==='/settings')return <Settings key={userId} store={store} setStore={setStore} form={settingsForm} setForm={setSettingsForm} resetDemo={resetDemo} downloadBackup={downloadBackup} toast={setToast} selectTheme={selectTheme}/>;
    if(location==='/help')return <HelpPage/>;
    if(location==='/buildbook')return <Redirect to="/user-portal"/>;
  if(location==='/pipeline')return <Pipeline store={store} open={open} patchRecord={patchRecord} matching={matching} displayValue={displayValue} convertLead={convertLead} convertProposal={convertProposal} query={query} setQuery={setQuery}/>;
   if(location==='/money')return <MoneyPage store={store} open={open} matching={matching} displayValue={displayValue} query={query} setQuery={setQuery} patchRecord={patchRecord} toast={setToast}/>;
  const route=routes.find(r=>r.path===location);
  if(route?.entity)return <EntityPage entity={route.entity} store={store} open={open} matching={matching} displayValue={displayValue} query={query} setQuery={setQuery} patchRecord={patchRecord}/>;
  return <div className="page"><div className="empty card"><div className="empty-mark"><LifeBuoy size={18}/></div><h3>That page is not on the desk</h3><p>Choose a workspace area from the navigation to continue.</p><Link href="/" className="button primary" data-testid="link-go-overview">Back to overview</Link></div></div>;
 };
   const saveStatus=saveInfo?.ownerId===userId?saveInfo.status:'saving';
   return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><img className="brand-image" src={brandMarkUrl} alt=""/>solo studio</div><div className="nav-label">Your workspace</div>{routes.map(({path,label,icon:Icon})=><Link key={path} href={path} className={`nav-link ${location===path?'active':''}`} data-testid={`nav-${label.toLowerCase().replaceAll(' ','-')}`}><Icon className="nav-icon"/><span>{label}</span></Link>)}<div className="side-foot"><strong>{store.settings.businessName||'Your studio'}</strong>One desk. All the moving parts.<br/>Private to your account.</div></aside>
    <MobileNavigation routes={routes} location={location}/>
    <main className="main-area">
     <header className="topbar">
      <span className="crumb">Studio / {routeName}</span>
      <div className="account-actions">
       <Link href="/help" className="button small topbar-help-link" data-testid="link-help-topbar"><HelpCircle size={14}/>Help</Link>
       <span className={`save-pill ${saveStatus==='error'||saveStatus==='conflict'?'save-error':''}`} aria-live="polite" data-testid="workspace-save-status"><i className="save-dot"/>{saveStatus==='conflict'?'Another tab saved newer changes':saveStatus==='error'?'Changes not saved':saveStatus==='saving'?'Saving to your account':'Saved to your account'}</span>
       {saveStatus==='error'&&<button className="button small" onClick={()=>setSaveRetry(attempt=>attempt+1)} data-testid="button-retry-save">Retry save</button>}
       <span className="account-name">{user?.firstName||user?.primaryEmailAddress?.emailAddress||'Your account'}</span>
       <button className="button small" onClick={()=>signOut({redirectUrl:basePath||'/'})} data-testid="button-sign-out">Sign out</button>
      </div>
     </header>
     {!isOnline&&<div className="connection-banner" role="alert" data-testid="status-offline-workspace"><strong>You’re offline.</strong><span>Pending edits stay in this tab’s memory and will retry when you reconnect. Do not close or refresh until the save status says “Saved to your account”. CRM records are not stored for offline use.</span></div>}
     {isOnline&&saveStatus==='error'&&<div className="connection-banner" role="alert" data-testid="status-unsaved-workspace"><strong>Changes not saved.</strong><span>Your edits are still in this tab, but are not on your account yet. Retry the save before leaving this workspace.</span></div>}
     {saveConflict?.ownerId===userId&&<section className="card" role="alert" style={{margin:'0 24px 20px',padding:'16px 18px',borderColor:'hsl(var(--accent) / .45)',background:'hsl(var(--accent) / .07)'}} data-testid="workspace-save-conflict"><strong style={{fontSize:13}}>This workspace changed in another tab</strong><p className="small-muted" style={{margin:'6px 0 12px'}}>Your edits in this tab are still here, but were not saved. Merge non-overlapping changes, download a backup, or load the latest version.</p>{mergeError&&<p role="status" className="small-muted" style={{color:'hsl(var(--destructive))',margin:'0 0 12px'}} data-testid="workspace-merge-error">{mergeError}</p>}<div className="button-row"><button className="button primary small" onClick={mergeMyChanges} data-testid="button-merge-workspace-changes">Merge my changes</button><button className="button small" onClick={downloadBackup} data-testid="button-download-unsaved-workspace">Download unsaved changes</button><button className="button small" onClick={loadLatestWorkspace} data-testid="button-load-latest-workspace">Load latest version</button></div></section>}
     {page()}
    </main>
    {modal&&<RecordModal modal={modal} form={form} setForm={setForm} formError={formError} setFormError={setFormError} store={store} setStore={setStore} save={saveRecord} close={()=>setModal(null)} remove={removeRecord} displayValue={displayValue} convertLead={convertLead} convertProposal={convertProposal} open={open} notify={setToast}/>}
    {toast&&<div role="status" data-testid="status-toast" style={{position:'fixed',right:20,bottom:82,zIndex:70,background:'hsl(var(--primary))',color:'white',padding:'12px 17px',borderRadius:10,fontSize:12,boxShadow:'0 8px 30px #18272026'}}>{toast}</div>}
 </div>
}
function PageHeader({eyebrow,title,subtitle,action}:{eyebrow:string;title:string;subtitle:string;action?:any}){return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="subtitle">{subtitle}</p></div>{action}</div>}
function Dashboard({store,money,dateFmt,open,nameFor}:{store:Store;money:any;dateFmt:any;open:any;nameFor:any}){
 const today=new Date();
  const todayKey=isoToday();
 const monthPrefix=isoToday().slice(0,7);
 const collected=store.invoices.filter(x=>x.status==='Paid').reduce((a,x)=>a+Number(x.amountPence||0),0);
 const outstanding=store.invoices.filter(x=>['Sent','Overdue'].includes(x.status)).reduce((a,x)=>a+Number(x.amountPence||0),0);
 const expenses=store.expenses.filter(x=>String(x.date||'').startsWith(monthPrefix)).reduce((a,x)=>a+Number(x.amountPence||0),0);
 const active=store.projects.filter(x=>['In progress','Planning'].includes(x.status)).length;
 const monday=new Date();monday.setHours(0,0,0,0);monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
 const days=Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(monday.getDate()+i);return d});
 const dayKeys=days.map(dateKey);
  const [selectedDayKey,setSelectedDayKey]=useState(todayKey);
  const activeDayKey=dayKeys.includes(selectedDayKey)?selectedDayKey:todayKey;
  const selectedDay=days[dayKeys.indexOf(activeDayKey)]??today;
  const weekEndKey=dayKeys[6];
  const formatAttentionDate=(value:string)=>{
    const date=new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'2-digit',year:'numeric'}).format(date);
  };
  const makeAttentionItem=(entity:Entity,record:Item,category:string,title:string,context:string,date:string,overdueLabel='Overdue',forceOverdue=false):AttentionItem=>{
    const isOverdue=forceOverdue||Boolean(date&&date<todayKey);
    const severity=isOverdue?0:!date||date===todayKey?1:2;
    return {id:`${entity}-${record.id}`,entity,record,category,title,context,date,dateText:date?formatAttentionDate(date):'Due date not set',badge:isOverdue?overdueLabel:!date?'Add due date':date===todayKey?'Today':'This week',severity};
  };
  const allAttentionItems:AttentionItem[]=[
    ...store.tasks.filter(task=>!task.completed&&task.dueDate&&task.dueDate<=weekEndKey).map(task=>makeAttentionItem('tasks',task,'Task',task.title,nameFor('projects',task.projectId),task.dueDate)),
     ...getActiveProjectDeadlinesThroughWeekEnd(store.projects,weekEndKey).map(project=>makeAttentionItem('projects',project,'Project deadline',project.title,nameFor('clients',project.clientId),project.dueDate)),
    ...store.leads.filter(lead=>!['Won','Lost'].includes(lead.stage)&&lead.nextActionDate&&lead.nextActionDate<=weekEndKey).map(lead=>makeAttentionItem('leads',lead,'Follow-up',lead.name,lead.company||lead.email||'',lead.nextActionDate)),
    ...store.proposals.filter(proposal=>proposal.status==='Sent'&&proposal.validUntil&&proposal.validUntil<=weekEndKey).map(proposal=>makeAttentionItem('proposals',proposal,'Proposal expiry',proposal.title,proposal.clientId?nameFor('clients',proposal.clientId):nameFor('leads',proposal.leadId),proposal.validUntil,'Expired')),
    ...store.invoices.filter(invoice=>invoice.status==='Overdue'||(invoice.status==='Sent'&&(!invoice.dueDate||invoice.dueDate<=weekEndKey))).map(invoice=>makeAttentionItem('invoices',invoice,'Invoice',invoice.number||'Invoice',[nameFor('clients',invoice.clientId),money(invoice.amountPence)].filter(value=>value&&value!=='—').join(' · '),invoice.dueDate||'','Overdue',invoice.status==='Overdue')),
  ];
  const attentionItems=allAttentionItems.sort((a,b)=>a.severity-b.severity||(a.date||todayKey).localeCompare(b.date||todayKey)||a.category.localeCompare(b.category));
   const attentionCountsByDay=countAttentionItemsByDay(attentionItems,dayKeys);
   const dayAttentionItems=filterAttentionItemsForDay(attentionItems,activeDayKey);
   const visibleAttentionItems=dayAttentionItems.slice(0,6);
   const selectedDayLabel=selectedDay.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
  const upcoming=store.invoices.filter(invoice=>invoice.status==='Sent'&&invoice.dueDate&&invoice.dueDate>weekEndKey).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,3);
 const weekMinutes=store.timeEntries.filter(x=>x.date>=dayKeys[0]&&x.date<=dayKeys[6]).reduce((a,x)=>a+Number(x.durationMinutes||0),0);
 const weeklyGoal=30*60, weekPct=Math.min(100,weekMinutes/weeklyGoal*100);
 return <section className="page"><PageHeader eyebrow={`This week · ${new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long'}).format(today)}`} title={`Good ${today.getHours()<12?'morning':today.getHours()<18?'afternoon':'evening'}.`} subtitle="A clear view of what is moving in your studio." action={<button className="button primary" onClick={()=>open('leads','create')} data-testid="button-add-lead-dashboard"><Plus size={15}/> Add a lead</button>}/>
   <div className="card" style={{padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:12,background:'hsla(18,67%,54%,.08)'}} data-testid="notice-demo-first-run"><div className="activity-mark" style={{background:'hsl(var(--accent))',color:'white'}}><FolderKanban size={15}/></div><div className="row-main"><div className="row-title">Your private starter workspace is ready</div><div className="row-sub">Sample leads, client work, invoices and projects are ready to explore. Changes are saved to your account only.</div></div></div>
  <div className="grid stats-grid">
   <Stat label="Collected" value={money(collected)} note="Paid invoices, all time" icon={ArrowDownRight}/>
   <Stat label="To come in" value={money(outstanding)} note={`${store.invoices.filter(x=>['Sent','Overdue'].includes(x.status)).length} invoices awaiting payment`} icon={ArrowUpRight}/>
   <Stat label="Active projects" value={String(active).padStart(2,'0')} note={`${store.tasks.filter(x=>!x.completed).length} open tasks`} icon={FolderKanban}/>
   <Stat label="Studio outgoings" value={money(expenses)} note="Expenses this month" icon={Wallet}/>
  </div>
  <div className="grid dashboard-grid">
   <div>
     <div className="card"><div className="card-heading"><div><div className="eyebrow">Week at a glance</div><h2 className="card-title">Make room for the work</h2></div><span className="card-meta">{dateFmt(dayKeys[0])} — {dateFmt(dayKeys[6])}</span></div>
      <div className="week-band">{days.map((d,i)=>{const dayKey=dayKeys[i],dueCount=attentionCountsByDay[dayKey]??0,weekday=d.toLocaleDateString('en-GB',{weekday:'long'});return <button type="button" className={`week-day ${dayKey===todayKey?'today':''} ${dayKey===activeDayKey?'selected':''}`} key={dayKey} onClick={()=>setSelectedDayKey(dayKey)} aria-label={`${weekday} ${dateFmt(dayKey)}, ${dueCount} ${dueCount===1?'item':'items'} due`} aria-current={dayKey===todayKey?'date':undefined} aria-pressed={dayKey===activeDayKey} data-testid={`calendar-day-${dayKey}`}>{d.toLocaleDateString('en-GB',{weekday:'short'})}<b>{d.getDate()}</b><span className={`week-day-count ${dueCount?'':'empty'}`} aria-hidden="true">{dueCount||'\u00a0'}</span></button>})}</div>
      <p className="small-muted" style={{margin:'-7px 0 15px'}} data-testid="text-weekday-help">Choose a day to filter the list below. Overdue items and records needing a date stay visible.</p>
     <div className="card-heading" style={{marginBottom:4}}><span className="card-meta">Time logged this week</span><strong style={{font:'500 15px var(--app-font-mono)'}}>{Math.floor(weekMinutes/60)}h {weekMinutes%60}m <span className="card-meta">/ 30h focus goal</span></strong></div>
     <div className="progress-track"><div className="progress-fill" style={{width:`${weekPct}%`}}/></div>
    </div>
     <div className="card section" data-testid="section-needs-attention">
      <div className="card-heading">
       <div>
        <div className="eyebrow">Needs attention</div>
        <h2 className="card-title">Keep the work moving</h2>
          <div className="card-meta" data-testid="text-selected-day-summary">Overdue or undated items, plus items due {selectedDayLabel}</div>
       </div>
        <span className={`badge ${dayAttentionItems.some(item=>item.severity===0)?'bad':dayAttentionItems.length?'warn':'good'}`} data-testid="text-attention-count">
         {dayAttentionItems.length?`${dayAttentionItems.length} ${dayAttentionItems.length===1?'item':'items'}`:'All clear'}
       </span>
      </div>
      {visibleAttentionItems.length?(
       <>
        <div role="list" aria-label="Items that need attention">
         {visibleAttentionItems.map(item=>{
           const Icon=item.entity==='tasks'?CheckSquare:item.entity==='projects'?FolderKanban:item.entity==='leads'?Activity:item.entity==='invoices'?Wallet:FileText;
          const context=[item.context,item.dateText].filter(value=>value&&value!=='—').join(' · ');
          return <div className="activity-row" key={item.id} data-testid={`row-attention-${item.id}`} role="listitem">
           <div className="activity-mark"><Icon size={15} aria-hidden="true"/></div>
           <div className="row-main">
            <div className="row-title">{item.title}</div>
            <div className="row-sub">{item.category}{context?` · ${context}`:''}</div>
           </div>
           <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',justifyContent:'flex-end'}}>
            <span className={`badge ${item.severity===0?'bad':'warn'}`}>{item.badge}</span>
            <button className="button small" onClick={()=>open(item.entity,'edit',item.record)} aria-label={`Open ${item.category.toLowerCase()}: ${item.title}`} data-testid={`button-open-attention-${item.id}`}>Open</button>
           </div>
          </div>;
         })}
        </div>
         {dayAttentionItems.length>visibleAttentionItems.length&&<div className="small-muted" style={{marginTop:10}}>Showing the 6 most urgent of {dayAttentionItems.length}. The rest remain in their workspace sections.</div>}
       </>
       ):<Empty title={`All clear for ${selectedDayLabel}`} body="Nothing is due on this day, and there are no overdue or undated items. Choose another day to check the rest of the week." icon={CheckSquare} action={()=>open('tasks','create')} actionLabel="Add a task"/>}
    </div>
   </div>
   <div>
    <div className="card"><div className="card-heading"><div><div className="eyebrow">Activity</div><h2 className="card-title">Money in motion</h2></div><Link href="/money" className="button small ghost" data-testid="link-open-money">View money <ArrowRight size={13}/></Link></div>
      {upcoming.length?upcoming.map(inv=><div className="list-row" key={inv.id} data-testid={`row-invoice-${inv.id}`}><div className="activity-mark"><FileText size={15}/></div><div className="row-main"><div className="row-title">{inv.number} · {nameFor('clients',inv.clientId)}</div><div className="row-sub">Due {dateFmt(inv.dueDate)} <span className="badge warn">Sent</span></div></div><div className="row-end">{money(inv.amountPence)}</div></div>):<Empty title="No payments expected beyond this week" body="Invoices due soon, overdue or missing a due date appear in Needs attention." icon={FileText} action={()=>open('invoices','create')} actionLabel="Create an invoice"/>}
     <div className="activity-row"><div className="activity-mark"><Activity size={15}/></div><div className="row-main"><div className="row-title">{store.leads.filter(x=>!['Won','Lost'].includes(x.stage)).length} conversations in pipeline</div><div className="row-sub">Potential value across live leads</div></div><Link className="button small" href="/pipeline" data-testid="link-pipeline-dashboard">Review</Link></div>
    </div>
    <div className="card section" style={{background:'hsl(var(--primary))',color:'hsl(var(--primary-foreground))',border:0}}><div className="eyebrow" style={{color:'#e7a17e'}}>A note from your desk</div><h2 className="card-title" style={{fontSize:22}}>The small things add up.</h2><p style={{fontSize:12,lineHeight:1.7,opacity:.78,marginBottom:0}}>Log a little time, follow up with a good lead, and keep the studio moving at your own pace.</p></div>
   </div>
  </div>
 </section>
}
function Stat({label,value,note,icon:Icon}:any){return <div className="card stat-card" data-testid={`metric-${label.toLowerCase().replaceAll(' ','-')}`}><span className="stat-label">{label}</span><div className="stat-value">{value}</div><div className="stat-note">{note}</div><Icon size={17} style={{position:'absolute',right:17,bottom:17,color:'hsl(var(--accent))'}}/></div>}
function Empty({title,body,icon:Icon,action,actionLabel}:any){return <div className="empty"><div className="empty-mark"><Icon size={18}/></div><h3>{title}</h3><p>{body}</p>{action&&<button className="button small" onClick={action} data-testid={`button-empty-${actionLabel.toLowerCase().replaceAll(' ','-')}`}><Plus size={13}/>{actionLabel}</button>}</div>}
function NoSearchResults({query,setQuery,label='records'}:any){return <div className="card"><div className="empty" role="status" data-testid="empty-search-results"><div className="empty-mark"><Search size={18}/></div><h3>No matching results</h3><p>Nothing in {label} matches “{query.trim()}”. Try another search or clear it.</p><button className="button small" onClick={()=>setQuery('')} data-testid="button-clear-search">Clear search</button></div></div>}
function Toolbar({query,setQuery,placeholder,children}:any){return <div className="toolbar"><div className="search"><Search size={15}/><input className="input" aria-label={placeholder} placeholder={placeholder} value={query} onChange={e=>setQuery(e.target.value)} data-testid="input-search-records"/></div><div className="button-row">{children}</div></div>}
function EntityPage({entity,store,open,matching,displayValue,query,setQuery,patchRecord}:any){
 const entityKey=entity as Entity;
  const cfg=configs[entityKey];
 const [tab,setTab]=useState(entityKey==='projects'?'Projects':entityKey==='clients'?'Clients':titleMap[entityKey]);
 const tabs=entity==='projects'?['Projects','Tasks','Time entries'] as const:entity==='clients'?['Clients','Proposals','Invoices'] as const:[cfg.label==='Lead'?'Leads':cfg.label==='Client'?'Clients':titleMap[entity as Entity]];
 const currentEntity:Entity=entity==='projects'?tab==='Tasks'?'tasks':tab==='Time entries'?'timeEntries':'projects':entity==='clients'?tab==='Proposals'?'proposals':tab==='Invoices'?'invoices':'clients':entity;
  const currentCfg=configs[currentEntity]; const rows=matching(currentEntity);
  const noSearchMatches=Boolean(query.trim())&&(store[currentEntity] as Item[]).length>0&&!rows.length;
 return <section className="page"><PageHeader eyebrow={entityKey==='projects'?'Work in progress':entityKey==='clients'?'Good people':'Studio records'} title={entityKey==='projects'?'Projects':entityKey==='clients'?'Clients':titleMap[entityKey]} subtitle={entityKey==='projects'?'Projects, tasks and the hours behind your work.':entityKey==='clients'?'Keep the people behind good work close at hand.':'Make everyday studio details easy to find.'} action={<button className="button primary" onClick={()=>open(currentEntity,'create')} data-testid={`button-create-${currentEntity}`}><Plus size={15}/> Add {currentCfg.label.toLowerCase()}</button>}/>
  {tabs.length>1&&<div className="button-row" style={{marginBottom:17}}>{tabs.map(label=><button key={label} className={`button small ${tab===label?'primary':''}`} onClick={()=>{setTab(label);setQuery('')}} data-testid={`tab-${label.toLowerCase().replaceAll(' ','-')}`}>{label}</button>)}</div>}
  <Toolbar query={query} setQuery={setQuery} placeholder={`Search ${currentCfg.label.toLowerCase()} records…`}><span className="card-meta" data-testid="text-record-count">{rows.length} {rows.length===1?'record':'records'}</span></Toolbar>
   {noSearchMatches?<NoSearchResults query={query} setQuery={setQuery} label={currentCfg.label.toLowerCase()}/>:currentEntity==='projects'?<ProjectCards records={rows} store={store} open={open} displayValue={displayValue}/>:currentEntity==='tasks'?<TaskList records={rows} open={open} displayValue={displayValue} patchRecord={patchRecord}/>:currentEntity==='timeEntries'?<RecordTable entity={currentEntity} records={rows} open={open} displayValue={displayValue} patchRecord={patchRecord}/>:rows.length?<RecordTable entity={currentEntity} records={rows} open={open} displayValue={displayValue} patchRecord={patchRecord}/>:<div className="card"><Empty title={`Your ${currentCfg.label.toLowerCase()} list starts here`} body="Add details as they come in. Your records stay private to your account." icon={BriefcaseBusiness} action={()=>open(currentEntity,'create')} actionLabel={`Add ${currentCfg.label.toLowerCase()}`}/></div>}
 </section>
}
function RecordTable({entity,records,open,displayValue,patchRecord}:any){
 const cfg=configs[entity as Entity];
 if(!records.length)return <div className="card"><Empty title={`No ${cfg.label.toLowerCase()} records yet`} body="Create the first record to keep the work moving. You can edit or update its status any time." icon={FileText} action={()=>open(entity,'create')} actionLabel={`Add ${cfg.label.toLowerCase()}`}/></div>;
   return <>
    <p className="table-scroll-hint" aria-hidden="true">Swipe sideways to see all columns</p>
    <div className="table-wrap" role="region" aria-label={`${cfg.label} records. Scroll horizontally to view all columns.`} tabIndex={0} data-testid={`scroll-table-${entity}`}>
     <table><thead><tr>{cfg.columns.map((key:string)=><th key={key}>{nice(key)}</th>)}<th>Actions</th></tr></thead><tbody>{records.map((r:Item)=><tr key={r.id} data-testid={`row-record-${entity}-${r.id}`}>{cfg.columns.map((key:string)=><td key={key} data-testid={`text-${key}-${r.id}`}>{key==='status'||key==='stage'?<span className={`badge ${['Paid','Accepted','Won','Completed','Ready'].includes(r[key])?'good':['Overdue','Lost','Declined'].includes(r[key])?'bad':'warn'}`}>{r[key]}</span>:key==='completed'||key==='published'?<span className={`badge ${r[key]?'good':'warn'}`}>{r[key]?'Yes':'No'}</span>:<span>{displayValue(entity,key,r[key])}</span>}</td>)}<td><div className="button-row"><button className="button small" onClick={()=>open(entity,'view',r)} data-testid={`button-view-${entity}-${r.id}`}>View</button><button className="button small" onClick={()=>open(entity,'edit',r)} data-testid={`button-edit-${entity}-${r.id}`}>Edit</button>{r.status&&<select aria-label={`Change ${r.number||r.title||'record'} status`} className="input" style={{width:115,padding:'8px 10px',fontSize:16}} value={r.status} onChange={e=>patchRecord(entity,r.id,{status:e.target.value,...(entity==='invoices'?{paidDate:paidDateForStatus(e.target.value,r.paidDate||'',isoToday())}:{})})} data-testid={`select-status-${entity}-${r.id}`}>{(cfg.fields.find((f:any)=>f.key==='status')?.options||[]).map((s:string)=><option key={s}>{s}</option>)}</select>}</div></td></tr>)}</tbody></table>
    </div>
   </>;
}
function ProjectCards({records,store,open,displayValue}:any){return records.length?<div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))'}}>{records.map((p:Item)=>{const tasks=store.tasks.filter((t:Item)=>t.projectId===p.id),done=tasks.filter((t:Item)=>t.completed).length,mins=store.timeEntries.filter((t:Item)=>t.projectId===p.id).reduce((a:number,t:Item)=>a+Number(t.durationMinutes||0),0);return <article className="card" key={p.id} data-testid={`card-project-${p.id}`}><div className="card-heading"><span className={`badge ${p.status==='Completed'?'good':'warn'}`}>{p.status}</span><span className="card-meta">{displayValue('projects','dueDate',p.dueDate)}</span></div><h2 className="card-title" style={{marginBottom:5}}>{p.title}</h2><div className="card-meta">{displayValue('projects','clientId',p.clientId)} · {money(p.budgetPence)}</div><p className="small-muted" style={{minHeight:38}}>{p.description||'No project notes yet.'}</p><div className="progress-track"><div className="progress-fill" style={{width:`${tasks.length?done/tasks.length*100:0}%`}}/></div><div className="row-sub" style={{display:'flex',justifyContent:'space-between',marginTop:7}}><span>{done} of {tasks.length} tasks complete</span><span>{Math.floor(mins/60)}h {mins%60}m logged</span></div><div className="button-row" style={{marginTop:15}}><button className="button small" onClick={()=>open('projects','view',p)} data-testid={`button-view-project-${p.id}`}>Details</button><button className="button small" onClick={()=>open('projects','edit',p)} data-testid={`button-edit-project-${p.id}`}>Edit project</button><button className="button small" onClick={()=>open('tasks','create',undefined,{projectId:p.id})} data-testid={`button-add-task-project-${p.id}`}><Plus size={12}/> Task</button></div></article>})}</div>:<div className="card"><Empty title="A project takes shape here" body="Keep client work, dates, tasks and time together in one place." icon={FolderKanban} action={()=>open('projects','create')} actionLabel="Add project"/></div>}
function TaskList({records,open,displayValue,patchRecord}:any){
 if(!records.length)return <div className="card"><Empty title="A clear list is a good start" body="Add your next actions and connect each one to a project." icon={CheckSquare} action={()=>open('tasks','create')} actionLabel="Add task"/></div>;
 return <>
  <p className="table-scroll-hint" aria-hidden="true">Swipe sideways to see all columns</p>
  <div className="table-wrap" role="region" aria-label="Tasks. Scroll horizontally to view all columns." tabIndex={0} data-testid="scroll-table-tasks">
   <table><thead><tr><th>Task</th><th>Project</th><th>Due date</th><th>Priority</th><th>Progress</th><th>Actions</th></tr></thead><tbody>{records.map((t:Item)=><tr key={t.id} data-testid={`row-task-${t.id}`}><td className="main-cell">{t.title}</td><td>{displayValue('tasks','projectId',t.projectId)}</td><td>{displayValue('tasks','dueDate',t.dueDate)}</td><td><span className={`badge ${t.priority==='High'?'bad':'warn'}`}>{t.priority}</span></td><td><button className={`button small ${t.completed?'primary':''}`} onClick={()=>patchRecord('tasks',t.id,{completed:!t.completed})} data-testid={`button-toggle-task-${t.id}`}>{t.completed?'Complete':'Mark done'}</button></td><td><button className="button small" onClick={()=>open('tasks','edit',t)} data-testid={`button-edit-task-row-${t.id}`}>Edit</button></td></tr>)}</tbody></table>
  </div>
 </>;
}
function Pipeline({store,open,patchRecord,matching,displayValue,convertLead,convertProposal,query,setQuery}:any){
  const [tab,setTab]=useState('Leads');
  const [draggingId,setDraggingId]=useState<string|null>(null);
  const [dropTarget,setDropTarget]=useState<string|null>(null);
  const data=tab==='Leads'?matching('leads'):matching('proposals');
  const stages=tab==='Leads'?['New','Qualified','Proposal sent','Won','Lost']:['Draft','Sent','Accepted','Declined','Expired'];
  const ent:Entity=tab==='Leads'?'leads':'proposals';
  const noSearchMatches=Boolean(query.trim())&&store[ent].length>0&&!data.length;
  const moveToStage=(itemId:string,stage:string)=>{
    const item=data.find((record:Item)=>record.id===itemId);
    if(!item)return;
    const current=tab==='Leads'?item.stage:item.status;
    if(current!==stage)patchRecord(ent,item.id,tab==='Leads'?{stage}:{status:stage});
    setDraggingId(null);
    setDropTarget(null);
  };
  const startDrag=(event:any,item:Item)=>{
    event.dataTransfer.effectAllowed='move';
    event.dataTransfer.setData('text/plain',item.id);
    setDraggingId(item.id);
  };
  const allowDrop=(event:any,stage:string)=>{
    event.preventDefault();
    event.dataTransfer.dropEffect='move';
    setDropTarget(stage);
  };
  const dropOnStage=(event:any,stage:string)=>{
    event.preventDefault();
    const itemId=event.dataTransfer.getData('text/plain');
    if(itemId)moveToStage(itemId,stage);
  };
  return <section className="page"><PageHeader eyebrow="From first hello to signed work" title="Pipeline" subtitle="A simple place for good conversations to turn into good work." action={<button className="button primary" onClick={()=>open(ent,'create')} data-testid={`button-add-${ent}-pipeline`}><Plus size={15}/> Add {tab==='Leads'?'lead':'proposal'}</button>}/>
   <div className="button-row" style={{marginBottom:17}}>{['Leads','Proposals'].map(t=><button key={t} className={`button small ${t===tab?'primary':''}`} onClick={()=>{setTab(t);setQuery('');setDraggingId(null);setDropTarget(null)}} data-testid={`tab-pipeline-${t.toLowerCase()}`}>{t}</button>)}</div>
   <Toolbar query={query} setQuery={setQuery} placeholder={`Search ${tab.toLowerCase()}…`}><span className="card-meta">{data.length} {tab.toLowerCase()}</span></Toolbar>
   <p className="board-hint">Drag a card to another stage. On touch devices, use its stage selector instead.</p>
    {noSearchMatches?<NoSearchResults query={query} setQuery={setQuery} label={tab.toLowerCase()}/>:data.length?<div className="kanban">{stages.map(stage=>{const list=data.filter((x:Item)=>x.stage===stage||x.status===stage);return <div className={`kanban-col ${dropTarget===stage?'drop-active':''}`} key={stage} onDragOver={(event:any)=>allowDrop(event,stage)} onDragLeave={(event:any)=>{if(!event.currentTarget.contains(event.relatedTarget))setDropTarget(null)}} onDrop={(event:any)=>dropOnStage(event,stage)} data-testid={`pipeline-column-${stage.toLowerCase().replaceAll(' ','-')}`} aria-label={`${stage}, ${list.length} ${tab.toLowerCase()}`}><div className="kanban-title"><span>{stage}</span><span>{list.length}</span></div>{list.map((item:Item)=><div className={`kanban-card ${draggingId===item.id?'dragging':''}`} key={item.id} draggable data-testid={`card-pipeline-${item.id}`} aria-label={`Drag ${item.name||item.title} to change stage`} onDragStart={(event:any)=>startDrag(event,item)} onDragEnd={()=>{setDraggingId(null);setDropTarget(null)}}><div className="row-title">{item.name||item.title}</div><div className="row-sub">{item.company||displayValue('proposals','leadId',item.leadId)}</div><div style={{font:'500 15px var(--app-font-serif)',margin:'10px 0'}}>{money(item.valuePence??item.amountPence)}</div><div className="row-sub">{item.nextActionDate?`Next step ${dateFmt(item.nextActionDate)}`:item.validUntil?`Valid to ${dateFmt(item.validUntil)}`:''}</div><div className="button-row" style={{marginTop:11}}><button className="button small" onClick={()=>open(ent,'view',item)} data-testid={`button-view-pipeline-${item.id}`}>Open</button><button className="button small" onClick={()=>open(ent,'edit',item)} data-testid={`button-edit-pipeline-${item.id}`}>Edit</button></div>{(tab==='Leads'&&item.stage!=='Won'||tab==='Proposals'&&item.status!=='Accepted')&&<button className="button small primary" style={{marginTop:8}} onClick={()=>tab==='Leads'?convertLead(item):convertProposal(item)} data-testid={`button-convert-${tab.toLowerCase()}-${item.id}`}>{tab==='Leads'?'Convert to client + project':'Accept & create project'}</button>}<div style={{marginTop:8}}><select aria-label={`Move ${item.name||item.title} to a stage`} className="input" value={item.stage||item.status} onChange={event=>moveToStage(item.id,event.target.value)} data-testid={`select-pipeline-status-${item.id}`}>{stages.map(s=><option key={s}>{s}</option>)}</select></div></div>)}</div>})}</div>:<div className="card"><Empty title="The next conversation starts here" body="Add a lead or proposal to keep an eye on the opportunities taking shape." icon={Activity} action={()=>open(ent,'create')} actionLabel={`Add ${tab==='Leads'?'lead':'proposal'}`}/></div>}
 </section>
}
function MoneyPage({store,open,matching,displayValue,query,setQuery,patchRecord,toast}: {store:Store;open:any;matching:any;displayValue:any;query:string;setQuery:any;patchRecord:any;toast:any}){
 const [tab,setTab]=useState('Invoices');
 const entity:Entity=tab==='Invoices'?'invoices':'expenses', data=matching(entity);
 const outstanding=store.invoices.filter(x=>['Sent','Overdue'].includes(x.status)).reduce((a,x)=>a+Number(x.amountPence||0),0),paid=store.invoices.filter(x=>x.status==='Paid').reduce((a,x)=>a+Number(x.amountPence||0),0),spend=store.expenses.reduce((a,x)=>a+Number(x.amountPence||0),0);
  const downloadCsv=()=>{
   try{
    const content=tab==='Invoices'
      ?buildInvoicesCsv(store.invoices,store.clients,store.projects)
      :buildExpensesCsv(store.expenses,store.projects);
    const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');
    link.href=url;
    link.download=`solo-studio-${tab.toLowerCase()}-${isoToday()}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    toast(`${tab} spreadsheet downloaded. Open the CSV in Excel, Numbers or Google Sheets.`);
   }catch{
    toast('The spreadsheet could not be created. Please try again.');
   }
  };
  return <section className="page"><PageHeader eyebrow="The numbers, without the noise" title="Money" subtitle="Invoices, payments and the costs of running a small studio." action={<div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button className="button" onClick={downloadCsv} title={`Export all ${tab.toLowerCase()} records as a spreadsheet-compatible CSV`} data-testid={`button-export-${tab.toLowerCase()}`}><Download size={14}/> Download {tab.toLowerCase()} CSV</button><button className="button primary" onClick={()=>open(entity,'create')} data-testid={`button-create-${entity}`}><Plus size={15}/> Add {tab==='Invoices'?'invoice':'expense'}</button></div>}/>
  <div className="grid stats-grid"><Stat label="Paid invoices" value={money(paid)} note="Confirmed income" icon={Check}/><Stat label="Awaiting payment" value={money(outstanding)} note="Sent or overdue" icon={Clock3}/><Stat label="Expenses logged" value={money(spend)} note={`${store.expenses.length} recorded costs`} icon={ArrowDownRight}/><Stat label="Invoices to chase" value={String(store.invoices.filter(x=>x.status==='Overdue').length).padStart(2,'0')} note="Marked overdue" icon={FileText}/></div>
  <div className="button-row" style={{margin:'22px 0 15px'}}>{['Invoices','Expenses'].map(t=><button key={t} className={`button small ${tab===t?'primary':''}`} onClick={()=>{setTab(t);setQuery('')}} data-testid={`tab-money-${t.toLowerCase()}`}>{t}</button>)}</div>
  <Toolbar query={query} setQuery={setQuery} placeholder={`Search ${tab.toLowerCase()}…`}><span className="card-meta">{data.length} records</span></Toolbar>
   {query.trim()&&store[entity].length>0&&!data.length?<NoSearchResults query={query} setQuery={setQuery} label={tab.toLowerCase()}/>:<RecordTable entity={entity} records={data} open={open} displayValue={displayValue} patchRecord={patchRecord}/>}
 </section>
}
function Settings({store,setStore,form,setForm,resetDemo,downloadBackup,toast,selectTheme}:any){
  const queryClient=useQueryClient();
  const legalProfileQuery=useGetStudioLegalProfile({query:{queryKey:getGetStudioLegalProfileQueryKey()}});
  const [legalProfileForm,setLegalProfileForm]=useState<StudioLegalProfileInput>({registeredName:'',tradingName:'',country:'',registeredAddress:'',privacyEmail:'',website:''});
  const [legalProfileInitialized,setLegalProfileInitialized]=useState(false);
  const legalProfileBaselineRef=useRef('');
  const saveLegalProfile=useSaveStudioLegalProfile({mutation:{onSuccess:async()=>{await queryClient.invalidateQueries({queryKey:getGetStudioLegalProfileQueryKey()})}}});
  useEffect(()=>{
   if(legalProfileQuery.data&&!legalProfileInitialized){
    const {registeredName,tradingName,country,registeredAddress,privacyEmail,website}=legalProfileQuery.data;
     const initial={registeredName,tradingName,country,registeredAddress,privacyEmail,website};
     legalProfileBaselineRef.current=JSON.stringify(initial);
     setLegalProfileForm(initial);
    setLegalProfileInitialized(true);
   }
  },[legalProfileQuery.data,legalProfileInitialized]);
   const legalProfileHasUnsavedChanges=legalProfileInitialized&&JSON.stringify(legalProfileForm)!==legalProfileBaselineRef.current;
   useEffect(()=>{
    if(!legalProfileHasUnsavedChanges)return;
    const warnBeforeLeave=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''};
    window.addEventListener('beforeunload',warnBeforeLeave);
    return()=>window.removeEventListener('beforeunload',warnBeforeLeave);
   },[legalProfileHasUnsavedChanges]);
  const submitLegalProfile=(event:any)=>{
   event.preventDefault();
    const submitted={...legalProfileForm};
    saveLegalProfile.mutate({data:submitted},{onSuccess:()=>{legalProfileBaselineRef.current=JSON.stringify(submitted)}});
  };
 const [backupPreview,setBackupPreview]=useState<{fileName:string;exportedAt:string;data:Record<string,unknown>;recordCount:number}|null>(null);
 const [backupError,setBackupError]=useState('');
 const inspectBackup=async(event:any)=>{
  const input=event.currentTarget as HTMLInputElement;
  const file=input.files?.[0];
  input.value='';
  if(!file)return;
  setBackupPreview(null);
  setBackupError('');
  if(file.size>10*1024*1024){
   setBackupError('This backup is larger than 10 MB. Choose a smaller Solo Studio backup.');
   return;
  }
  let backupContent:unknown;
  try{
   backupContent=JSON.parse(await file.text());
  }catch{
   setBackupError('This file is not valid JSON. Choose a Solo Studio backup file.');
   return;
  }
  try{
   const parsed=parseWorkspaceImport(backupContent);
   const recordCount=Object.entries(parsed.data)
    .filter(([key])=>key!=='settings')
    .reduce((count,[,value])=>count+(Array.isArray(value)?value.length:0),0);
   setBackupPreview({fileName:file.name,exportedAt:parsed.exportedAt,data:parsed.data,recordCount});
  }catch(error){
   setBackupError(error instanceof Error?error.message:'The backup could not be checked.');
  }
 };
 const applyBackup=()=>{
  if(!backupPreview)return;
  if(!window.confirm(`Replace this account’s current workspace with “${backupPreview.fileName}”? This cannot be undone.`))return;
  setStore(normalizeWorkspace(backupPreview.data));
  setBackupPreview(null);
  setBackupError('');
  toast('Backup restored to this account.');
 };
  const importEmailCandidate=(candidate:EmailAnalysisCandidate)=>{
   const email=candidate.email.trim().toLowerCase();
   const alreadySaved=[...store.leads,...store.clients].some((record:Item)=>String(record.email||'').trim().toLowerCase()===email);
   if(alreadySaved){toast('This email address is already saved as a lead or client.');return}
   const lastContact=candidate.lastMessageAt?new Intl.DateTimeFormat('en-GB',{dateStyle:'short'}).format(new Date(candidate.lastMessageAt)):'';
   const signalText=candidate.signals.map(signal=>signal.replace('_',' ')).join(', ');
   const lead:Item={
    id:uid(),
    name:candidate.name||email.split('@')[0],
    company:'',
    email,
    source:'Email',
    valuePence:0,
    stage:'New',
    nextActionDate:isoToday(),
    notes:`Added from ${candidate.messageCount} mailbox message${candidate.messageCount===1?'':'s'}.${lastContact?` Latest conversation: ${lastContact}.`:''}${candidate.latestSubject?` Subject: ${candidate.latestSubject}.`:''}${signalText?` Signals: ${signalText}.`:''}`,
    createdAt:isoToday()
   };
   setStore((prev:Store)=>({...prev,leads:[lead,...prev.leads]}));
   toast('Email contact added as a new lead.');
  };
 const selectFontPair=(fontPair:FontPairId)=>{setForm((current:any)=>({...current,fontPair}));document.documentElement.dataset.studioFont=fontPair;setStore((prev:Store)=>({...prev,settings:{...prev.settings,fontPair}}));toast(`${FONT_PAIRS.find(pair=>pair.id===fontPair)?.name??'Font'} applied.`)};
 const save=(e:any)=>{e.preventDefault();const next={businessName:String(form.businessName||'').trim()||'My Studio',defaultHourlyRatePence:Math.round(Number(form.defaultHourlyRatePence)||0),designTheme:form.designTheme||store.settings.designTheme||'evergreen',fontPair:form.fontPair||store.settings.fontPair||'dm-lora'};setStore((prev:Store)=>({...prev,settings:{...prev.settings,...next,document:normalizeDocumentSettings(prev.settings.document)}}));toast('Studio preferences saved.')};
  return <section className="page"><PageHeader eyebrow="Make the desk yours" title="Settings" subtitle="Your business details and the defaults this workspace uses."/>
  <PwaInstallCard/>
 <div className="card section theme-settings" style={{maxWidth:700}} data-testid="section-studio-appearance"><div className="eyebrow">Appearance</div><h2 className="card-title">Choose your studio look</h2><p className="small-muted">Pick a colour direction. It applies immediately and stays selected on your account.</p><div className="theme-grid" role="group" aria-label="Choose a studio theme">{STUDIO_THEMES.map(theme=>{const selected=(form.designTheme??store.settings.designTheme??'evergreen')===theme.id;return <button type="button" className={`theme-choice ${selected?'selected':''}`} key={theme.id} aria-pressed={selected} onClick={()=>selectTheme(theme.id)} data-testid={`button-theme-${theme.id}`}><div className="theme-preview" aria-hidden="true"><div className="theme-preview-rail" style={{backgroundColor:theme.swatches[0]}}><i/><i/><i/></div><div className="theme-preview-main" style={{backgroundColor:theme.swatches[1]}}><span style={{backgroundColor:theme.swatches[0]}}/><i style={{backgroundColor:theme.swatches[2]}}/><i style={{backgroundColor:theme.swatches[0],opacity:.18}}/></div></div><div className="theme-choice-copy"><div className="theme-name-row"><strong>{theme.name}</strong>{selected&&<span className="theme-selected"><Check size={12}/> Selected</span>}</div><p>{theme.description}</p></div></button>})}</div><div className="font-picker"><div className="eyebrow">Typography</div><h3 className="card-title">Set your reading rhythm</h3><p className="small-muted">A small set of comfortable pairings. Choose one to preview it across the studio.</p><div className="font-pair-grid" role="group" aria-label="Choose a font pairing">{FONT_PAIRS.map(pair=>{const selected=(form.fontPair??store.settings.fontPair??'dm-lora')===pair.id;return <button key={pair.id} type="button" className={`font-pair-choice ${selected?'selected':''}`} aria-pressed={selected} onClick={()=>selectFontPair(pair.id)} data-testid={`button-font-pair-${pair.id}`}><span className="font-pair-sample" style={{fontFamily:pair.serif}}>A good week starts here<span style={{fontFamily:pair.sans}}>Plan the work. Make space for the good bits.</span></span><span className="font-pair-detail"><strong>{pair.name}</strong>{selected&&<span className="theme-selected"><Check size={12}/> Selected</span>}<small>{pair.description}</small></span></button>})}</div></div></div>
  <section className="card section legal-profile-settings" style={{maxWidth:700}} data-testid="section-remix-legal-profile">
   <div className="eyebrow">Public legal profile · shared by this Remix</div><h2 className="card-title">Company identity</h2>
   <p className="small-muted">These details appear on Solo Studio’s public legal pages and are shared across this Remix. They are separate from your private workspace. The first account to save becomes this profile’s manager.</p>
   {legalProfileQuery.isLoading?<div className="legal-loading" aria-live="polite" data-testid="status-legal-profile-loading"><span className="skeleton-line"/><span className="skeleton-line short"/><span className="skeleton-line"/></div>
   :legalProfileQuery.isError?<div className="legal-status error" role="alert" data-testid="status-legal-profile-error"><span>The shared company profile could not be loaded. Your private workspace is unaffected.</span><button className="button small" type="button" onClick={()=>legalProfileQuery.refetch()} data-testid="button-retry-legal-profile">Try again</button></div>
   :!legalProfileQuery.data?.canEdit?<div data-testid="legal-profile-readonly">
    <div className="legal-status locked" role="status" data-testid="status-legal-profile-locked">Another account manages this Remix’s legal profile. You can view the saved details here, but only its manager can change them.</div>
    <div className="legal-profile-readonly-grid">{[
     ['Registered / legal entity name',legalProfileQuery.data?.registeredName],['Trading name',legalProfileQuery.data?.tradingName],['Country of registration',legalProfileQuery.data?.country],['Registered business address',legalProfileQuery.data?.registeredAddress],['Privacy / legal contact email',legalProfileQuery.data?.privacyEmail],['Website',legalProfileQuery.data?.website]
    ].map(([label,value])=><div className="legal-profile-readonly-item" key={label}><span>{label}</span><strong>{value||'Not provided'}</strong></div>)}</div>
   </div>
   :<form onSubmit={submitLegalProfile} data-testid="form-remix-legal-profile">
    <div className="field-grid legal-profile-fields">
    {([
     ['registeredName','Registered / legal entity name','e.g. Your registered company or proprietor name','text'],
     ['tradingName','Trading name','e.g. The name clients know you by','text'],
     ['country','Country of registration','e.g. Country where the business is registered','text'],
     ['registeredAddress','Registered business address','Street, city, postal code and country','textarea'],
     ['privacyEmail','Privacy / legal contact email','name@example.com','email'],
     ['website','Website','https://your-studio.example','url']
    ] as const).map(([key,label,placeholder,type])=><div className="field" key={key} style={key==='registeredAddress'?{gridColumn:'1/-1'}:{}}>
     <label htmlFor={`legal-profile-${key}`}>{label}</label>{type==='textarea'?<textarea id={`legal-profile-${key}`} autoComplete="street-address" placeholder={placeholder} value={legalProfileForm[key]} onChange={event=>setLegalProfileForm(current=>({...current,[key]:event.target.value}))} data-testid={`input-legal-profile-${key}`}/>:<input id={`legal-profile-${key}`} type={type} placeholder={placeholder} value={legalProfileForm[key]} onChange={event=>setLegalProfileForm(current=>({...current,[key]:event.target.value}))} data-testid={`input-legal-profile-${key}`}/>}
    </div>)}
    </div>
    {saveLegalProfile.isError&&<div className="legal-status error" role="alert" data-testid="status-legal-profile-save-error">Your changes could not be saved. Please check your connection and try again.</div>}
    {saveLegalProfile.isSuccess&&<div className="legal-status success" role="status" data-testid="status-legal-profile-save-success">Shared company identity saved. The public legal pages will use these details.</div>}
    <button className="button primary" type="submit" disabled={saveLegalProfile.isPending} data-testid="button-save-legal-profile">{saveLegalProfile.isPending?'Saving profile…':'Save company identity'}</button>
   </form>}
   <div className="legal-profile-links"><span className="small-muted">Review the public templates:</span><Link href="/privacy" data-testid="link-settings-privacy">Privacy</Link><Link href="/cookies" data-testid="link-settings-cookies">Cookies</Link><Link href="/terms" data-testid="link-settings-terms">Terms</Link></div>
  </section>
  <form className="card" onSubmit={save} style={{maxWidth:700}}><div className="eyebrow">Business profile</div><h2 className="card-title">A name for your studio</h2><p className="small-muted" style={{marginBottom:18}}>These details are saved to your account and can be changed whenever you need.</p><div className="field"><label htmlFor="business-name">Business name</label><input id="business-name" value={form.businessName} onChange={(e:any)=>setForm({...form,businessName:e.target.value})} data-testid="input-business-name"/></div><div className="field"><label htmlFor="hourly-rate">Default hourly rate (£)</label><input id="hourly-rate" type="number" min="0" step=".50" value={Number(form.defaultHourlyRatePence||0)/100} onChange={(e:any)=>setForm({...form,defaultHourlyRatePence:Math.round(Number(e.target.value)*100)})} data-testid="input-default-hourly-rate"/><span className="small-muted">Used as a personal reference when logging work. Time entries are not automatically billed.</span></div>  <button className="button primary" type="submit" data-testid="button-save-settings">Save preferences</button></form>
  <DocumentSettingsCard form={form} setForm={setForm} onSave={()=>{setStore((prev:Store)=>({...prev,settings:{...prev.settings,document:documentSettingsFromForm(form)}}));toast('Document settings saved.')}}/>
   <EmailConnectionsPanel onImportCandidate={importEmailCandidate}/>
  <div className="card section" style={{maxWidth:700}}><div className="eyebrow">Your data</div><h2 className="card-title">Private workspace</h2><p className="small-muted">Your records are saved to your signed-in account and kept separate from other users. The sample records are a starter template for this account.</p><div className="setting-line"><div><strong style={{fontSize:12}}>Download a backup</strong><div className="small-muted">Save your clients, projects, finances and other studio records as a JSON file. The backup is made in your browser and does not include account identifiers.</div></div><button className="button" onClick={downloadBackup} data-testid="button-download-workspace-backup"><Download size={14}/> Download backup</button></div><div className="setting-line" style={{alignItems:'flex-start',flexWrap:'wrap'}}><div><strong style={{fontSize:12}}>Restore a backup</strong><div className="small-muted">Choose a Solo Studio JSON backup. It will be checked before anything changes.</div></div><div className="field" style={{width:230,margin:0}}><label htmlFor="workspace-backup-file">Choose backup file</label><input id="workspace-backup-file" className="input" type="file" accept=".json,application/json" onChange={inspectBackup} data-testid="input-workspace-backup"/></div></div>{backupError&&<div role="alert" className="small-muted" style={{color:'hsl(var(--destructive))',marginTop:10}} data-testid="backup-validation-error">{backupError}</div>}{backupPreview&&<div role="status" style={{marginTop:12,padding:13,borderRadius:9,background:'hsl(var(--primary) / .07)',border:'1px solid hsl(var(--primary) / .2)'}} data-testid="backup-validation-success"><strong style={{fontSize:12}}>Backup ready to restore</strong><div className="small-muted" style={{marginTop:5}}>{backupPreview.fileName} · Exported {new Intl.DateTimeFormat('en-GB',{dateStyle:'short',timeStyle:'medium'}).format(new Date(backupPreview.exportedAt))} · {backupPreview.recordCount} records</div><div className="small-muted" style={{marginTop:5}}>Restoring replaces only this signed-in account’s workspace.</div><div className="button-row" style={{marginTop:11}}><button className="button danger" onClick={applyBackup} data-testid="button-apply-workspace-backup">Restore this backup</button><button className="button" onClick={()=>setBackupPreview(null)} data-testid="button-cancel-workspace-backup">Cancel</button></div></div>}<div className="setting-line"><div><strong style={{fontSize:12}}>Reset starter workspace</strong><div className="small-muted">Restore the original sample records. Your changes in this account will be replaced.</div></div><button className="button danger" onClick={resetDemo} data-testid="button-reset-demo-data">Reset starter data</button></div></div>
 </section>
}
function RecordModal({modal,form,setForm,formError,setFormError,store,setStore,save,close,remove,displayValue,convertLead,convertProposal,open,notify}:any){
 const {entity,mode,item}=modal,cfg=configs[entity as Entity];
 const entityList=(e:Entity)=>store[e] as Item[];
  const backdropRef=useRef<HTMLDivElement>(null);
  const closeRef=useRef<()=>void>(close);
  closeRef.current=close;
  const projectDependents=entity==='projects'&&item?getProjectDependentRecords(item.id,store):null;
  const dependentCount=projectDependents?Object.values(projectDependents).reduce((count,records)=>count+records.length,0):0;
  const projectDeleteBlocked=dependentCount>0;
  const updateField=(key:string,value:any)=>{
    setForm((previous:Record<string,any>)=>{
      const next={...previous,[key]:value};
      if(entity==='timeEntries'&&key==='projectId'&&!taskBelongsToProject(String(previous.taskId||''),String(value||''),store.tasks))next.taskId='';
      if(entity==='invoices'&&key==='status')next.paidDate=paidDateForStatus(String(value),String(previous.paidDate||''),isoToday());
      return next;
    });
    setFormError('');
  };
  useEffect(()=>{
    const previousFocus=document.activeElement;
    return()=>{if(previousFocus instanceof HTMLElement&&previousFocus.isConnected)previousFocus.focus()};
  },[]);
  useEffect(()=>{
    const dialog=backdropRef.current?.querySelector<HTMLElement>('[role="dialog"]');
    if(!dialog)return;
    const selector='a[href],button:not([disabled]),input:not([type="hidden"]):not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const focusable=()=>Array.from(dialog.querySelectorAll<HTMLElement>(selector)).filter(element=>element.getAttribute('aria-hidden')!=='true'&&element.tabIndex>=0);
    const controls=focusable();
    const firstInput=dialog.querySelector<HTMLElement>('input:not([type="hidden"]):not([disabled]),select:not([disabled]),textarea:not([disabled])');
    (firstInput??controls[0]??dialog).focus();
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();closeRef.current();return;}
      if(event.key!=='Tab')return;
      const current=focusable();
      if(!current.length){event.preventDefault();dialog.focus();return;}
      const first=current[0],last=current[current.length-1];
      if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',onKeyDown);
    return()=>document.removeEventListener('keydown',onKeyDown);
  },[entity,mode,item?.id]);
  if(mode==='view')return <div ref={backdropRef} className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><section className="modal" role="dialog" tabIndex={-1} aria-modal="true" aria-labelledby="record-modal-title"><div className="modal-top"><div><div className="eyebrow">{cfg.label} · details</div><h2 id="record-modal-title">{item[cfg.primary]||cfg.label}</h2></div><button className="close" onClick={close} aria-label="Close details" data-testid="button-close-detail"><X size={20}/></button></div>
  <div className="detail-grid">{cfg.fields.filter((f:any)=>f.type!=='textarea').map((f:any)=><div className="detail-item" key={f.key} data-testid={`detail-${entity}-${f.key}`}><span>{f.label}</span><strong>{displayValue(entity,f.key,item[f.key])}</strong></div>)}</div>
  {cfg.fields.filter((f:any)=>f.type==='textarea').map((f:any)=><div key={f.key} style={{marginBottom:15}}><div className="eyebrow">{f.label}</div><div className="detail-copy">{item[f.key]||'Nothing added yet.'}</div></div>)}
   {projectDeleteBlocked&&<p className="small-muted" role="note" style={{color:'hsl(var(--destructive))',margin:'0 0 12px'}} data-testid="project-delete-blocked">Deleting is disabled while this project has linked history. Reassign records where possible, or change the project status to Archived to preserve the full record. Linked records: {projectDependents!.proposals.length} proposals, {projectDependents!.tasks.length} tasks, {projectDependents!.timeEntries.length} time entries, {projectDependents!.invoices.length} invoices and {projectDependents!.expenses.length} expenses.</p>}
   <div className="modal-actions"><button className="button danger" disabled={projectDeleteBlocked} onClick={()=>remove(entity,item)} data-testid={`button-delete-${entity}-${item.id}`}>Delete</button><div className="button-row">{entity==='leads'&&item.stage!=='Won'&&<button className="button accent" onClick={()=>convertLead(item)} data-testid={`button-convert-lead-${item.id}`}>Convert to client + project</button>}{entity==='proposals'&&item.status!=='Accepted'&&<button className="button accent" onClick={()=>convertProposal(item)} data-testid={`button-accept-proposal-${item.id}`}>Accept & create project</button>}{entity==='proposals'&&item.status==='Accepted'&&<ProposalInvoiceAction proposal={item} workspace={store} setWorkspace={setStore} openInvoice={(invoice,mode)=>open('invoices',mode,invoice)} issuedDate={isoToday()} createId={uid} notify={notify} defaultDueDays={store.settings.document?.defaultDueDays}/>}{(entity==='proposals'||entity==='invoices')&&<Link href={`/${entity==='invoices'?'invoice':'proposal'}/${item.id}`} className="button" data-testid={`link-preview-document-${item.id}`}>Preview document</Link>}<button className="button" onClick={()=>open(entity,'edit',item)} data-testid={`button-edit-from-detail-${entity}-${item.id}`}>Edit</button><button className="button primary" onClick={close} data-testid="button-detail-done">Done</button></div></div>
 </section></div>;
  return <div ref={backdropRef} className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><form className="modal" role="dialog" tabIndex={-1} aria-modal="true" aria-labelledby="record-modal-title" onSubmit={e=>{e.preventDefault();save()}}><div className="modal-top"><div><div className="eyebrow">{mode==='edit'?'Update your records':'Add to the studio desk'}</div><h2 id="record-modal-title">{mode==='edit'?`Edit ${cfg.label.toLowerCase()}`:`New ${cfg.label.toLowerCase()}`}</h2></div><button type="button" className="close" onClick={close} aria-label="Close form" data-testid="button-close-form"><X size={20}/></button></div>
  <div className="field-grid">{cfg.fields.map((f:any)=>{
   const isWide=f.wide||f.type?.startsWith('select-ref:');
   const refEntity=f.type?.startsWith('select-ref:')?f.type.split(':')[1] as Entity:null;
    const refs=refEntity?entityList(refEntity).filter((record:Item)=>!(entity==='timeEntries'&&f.key==='taskId')||record.projectId===form.projectId):[];
   const value=form[f.key]??'';
    const disabledPaidDate=entity==='invoices'&&f.key==='paidDate'&&form.status!=='Paid';
    const lockedAmount=(entity==='proposals'||entity==='invoices')&&f.key==='amountPence';
   return <div className="field" key={f.key} style={isWide?{gridColumn:'1/-1'}:{}}>
    <label htmlFor={`field-${f.key}`}>{f.label}{f.required?' *':''}</label>
     {f.type==='textarea'?<textarea id={`field-${f.key}`} required={f.required} value={value} onChange={e=>updateField(f.key,e.target.value)} data-testid={`input-${entity}-${f.key}`}/>:f.type==='select'||refEntity?<select id={`field-${f.key}`} required={f.required} value={value} onChange={e=>updateField(f.key,e.target.value)} data-testid={`select-${entity}-${f.key}`}><option value="">— Select —</option>{refEntity?refs.map((r:Item)=><option key={r.id} value={r.id}>{r[cfgsPrimary(refEntity)]||r.id}</option>):f.options.map((o:string)=><option key={o} value={o}>{o}</option>)}</select>:<input id={`field-${f.key}`} type={f.type==='money'||f.type==='number'?'number':f.type||'text'} min={f.type==='money'||f.type==='number'?'0':undefined} step={f.type==='money'?'.01':f.type==='number'?'1':undefined} required={f.required} disabled={disabledPaidDate||lockedAmount} value={value} onChange={e=>updateField(f.key,e.target.value)} data-testid={`input-${entity}-${f.key}`}/>}
   </div>
  })}</div>
   {(entity==='proposals'||entity==='invoices')&&<DocumentLinesEditor lines={Array.isArray(form.lines)?form.lines:[]} onChange={(lines,amountPounds)=>setForm((current:Record<string,any>)=>({...current,lines,...(amountPounds===null?{}:{amountPence:amountPounds})}))}/>}
   {formError&&<div role="alert" className="small-muted" style={{color:'hsl(var(--destructive))',marginTop:11}} data-testid="record-validation-error">{formError}</div>}
   {projectDeleteBlocked&&<p className="small-muted" role="note" style={{color:'hsl(var(--destructive))',margin:'0 0 12px'}} data-testid="project-delete-blocked">Deleting is disabled while this project has linked history. Reassign records where possible, or change the project status to Archived to preserve invoices and time records. Linked records: {projectDependents!.tasks.length} tasks, {projectDependents!.timeEntries.length} time entries, {projectDependents!.invoices.length} invoices and {projectDependents!.expenses.length} expenses.</p>}
   <div className="modal-actions">{mode==='edit'?<button type="button" className="button danger" disabled={projectDeleteBlocked} onClick={()=>remove(entity,item)} data-testid={`button-delete-${entity}-${item.id}`}>Delete record</button>:<span className="small-muted">* Required field</span>}<div className="button-row"><button type="button" className="button" onClick={close} data-testid="button-cancel-record">Cancel</button><button className="button primary" type="submit" data-testid={`button-save-${entity}`}>{mode==='edit'?'Save changes':'Create record'}</button></div></div>
 </form></div>
}
function cfgsPrimary(entity:Entity){return configs[entity].primary}
const clerkPubKey=publishableKeyFromHost(window.location.hostname,import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl=import.meta.env.VITE_CLERK_PROXY_URL;
function stripBase(path:string){return basePath&&path.startsWith(basePath)?path.slice(basePath.length)||'/':path}

if(!clerkPubKey)throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY.');

const clerkAppearance={
 theme:shadcn,
 cssLayerName:'clerk',
 options:{
  logoPlacement:'inside' as const,
  logoLinkUrl:basePath||'/',
   logoImageUrl:`${window.location.origin}${brandMarkUrl}`,
 },
 variables:{
  colorPrimary:'#3f6b5d',
  colorForeground:'#263b34',
  colorMutedForeground:'#64736c',
  colorDanger:'#a84238',
  colorBackground:'#fbfaf6',
  colorInput:'#f8f6ef',
  colorInputForeground:'#263b34',
  colorNeutral:'#d9d4c8',
  fontFamily:'DM Sans, sans-serif',
  borderRadius:'12px',
 },
 elements:{
  rootBox:{width:'100%',display:'flex',justifyContent:'center'},
  cardBox:{backgroundColor:'#fbfaf6',border:'1px solid #ded9cf',borderRadius:'18px',boxShadow:'0 22px 70px rgba(33,48,40,.12)',width:'440px',maxWidth:'100%',overflow:'hidden'},
  card:{backgroundColor:'transparent',border:'none',boxShadow:'none'},
  footer:{backgroundColor:'transparent',border:'none',boxShadow:'none'},
  headerTitle:{color:'#263b34',fontFamily:'Fraunces, serif',fontSize:'1.8rem'},
  headerSubtitle:{color:'#5c6c65',fontFamily:'DM Sans, sans-serif'},
  socialButtonsBlockButtonText:{color:'#263b34',fontWeight:'600'},
  formFieldLabel:{color:'#334b42',fontWeight:'600'},
  footerActionLink:{color:'#3f6b5d',fontWeight:'600'},
  footerActionText:{color:'#5c6c65'},
  dividerText:{color:'#64736c'},
  identityPreviewEditButton:{color:'#3f6b5d'},
  formFieldSuccessText:{color:'#286447'},
  alertText:{color:'#733b35'},
  logoBox:{marginBottom:'12px'},
  logoImage:{width:'48px',height:'48px',objectFit:'contain'},
  socialButtonsBlockButton:{backgroundColor:'#fffefa',border:'1px solid #ded9cf',borderRadius:'10px'},
  formButtonPrimary:{backgroundColor:'#3f6b5d',color:'#fffefa',borderRadius:'10px'},
  formFieldInput:{backgroundColor:'#f8f6ef',color:'#263b34',border:'1px solid #ded9cf',borderRadius:'9px'},
  footerAction:{color:'#5c6c65'},
  dividerLine:{backgroundColor:'#ded9cf'},
  alert:{backgroundColor:'#f8eeeb',borderRadius:'9px'},
  otpCodeFieldInput:{backgroundColor:'#f8f6ef',color:'#263b34',border:'1px solid #ded9cf',borderRadius:'9px'},
  formFieldRow:{marginBottom:'14px'},
  main:{fontFamily:'DM Sans, sans-serif'},
 },
} as const;

function Home(){
 useEffect(()=>{document.title='Solo Studio · A calmer way to run your studio'},[]);
 return <main className="marketing-shell">
  <header className="marketing-nav">
   <Link href="/" className="marketing-brand"><img src={brandMarkUrl} alt=""/> <span>Solo Studio</span></Link>
   <nav className="marketing-actions" aria-label="Account">
    <Link href="/sign-in" className="marketing-signin">Sign in</Link>
    <Link href="/sign-up" className="button primary">Create your workspace <ArrowRight size={15}/></Link>
   </nav>
  </header>
  <section className="home-hero">
   <div className="home-copy">
    <div className="eyebrow">A calmer way to run your studio</div>
    <h1>Make space for the work you love.</h1>
    <p>Keep clients, projects, proposals, time and invoices together, without losing sight of the creative work behind them.</p>
    <div className="home-actions">
     <Link href="/sign-up" className="button primary">Start your private workspace <ArrowRight size={15}/></Link>
     <Link href="/sign-in" className="button">I already have an account</Link>
    </div>
    <div className="home-private"><span className="home-check"><Check size={13}/></span> Your studio records stay private to your account</div>
   </div>
   <div className="home-preview" aria-label="A preview of the Solo Studio dashboard">
    <div className="home-preview-top"><div className="home-preview-brand"><img src={brandMarkUrl} alt=""/> <span>Fieldnotes Studio</span></div><span className="home-preview-label">THIS WEEK</span></div>
    <div className="home-preview-heading"><div className="eyebrow">Your studio at a glance</div><h2>Good work, in motion.</h2><p>Everything important, in one clear view.</p></div>
    <div className="home-preview-stats">
     <div><span>Active projects</span><strong>03</strong><i className="preview-bar preview-bar-green"/></div>
     <div><span>To come in</span><strong>£4,800</strong><i className="preview-bar preview-bar-clay"/></div>
     <div><span>Open tasks</span><strong>07</strong><i className="preview-bar preview-bar-soft"/></div>
    </div>
    <div className="home-preview-work"><span className="home-preview-icon"><FolderKanban size={16}/></span><div><strong>North & Kind</strong><span>Seasonal story · In progress</span></div><span className="preview-status">ON TRACK</span></div>
     <div className="home-preview-work"><span className="home-preview-icon home-preview-icon-clay"><FolderKanban size={16}/></span><div><strong>Common Ground</strong><span>Identity system · Completed</span></div><span className="preview-status">READY</span></div>
     <div className="home-preview-foot"><span><Users size={14}/> Clients</span><span><FolderKanban size={14}/> Projects</span><span><Wallet size={14}/> Money</span></div>
   </div>
  </section>
  <section className="home-features">
   <div><span className="feature-icon"><Users size={17}/></span><h2>Keep good people close</h2><p>Track leads, clients and proposals from first conversation to signed work.</p></div>
   <div><span className="feature-icon"><FolderKanban size={17}/></span><h2>Keep work moving</h2><p>Bring projects, tasks and time together so the next step is easy to see.</p></div>
   <div><span className="feature-icon"><Wallet size={17}/></span><h2>Know where you stand</h2><p>See invoices, payments and expenses alongside the work they belong to.</p></div>
  </section>
   <footer className="marketing-footer"><span>Solo Studio</span><span>Made for independent makers.</span><nav aria-label="Legal" className="marketing-legal-links"><Link href="/privacy" data-testid="link-footer-privacy">Privacy</Link><Link href="/cookies" data-testid="link-footer-cookies">Cookies</Link><Link href="/terms" data-testid="link-footer-terms">Terms</Link></nav></footer>
 </main>;
}

function AuthLoading(){return <main className="auth-screen" aria-live="polite"><div className="auth-loading"><img src={brandMarkUrl} alt=""/><p>Checking your account…</p></div></main>}
function HomeRedirect(){
 const {isLoaded,user}=useUser();
 if(!isLoaded)return <AuthLoading/>;
 return user?<Redirect to="/user-portal"/>:<Home/>;
}
function ProtectedStudio(){
 const {isLoaded}=useUser();
 if(!isLoaded)return <AuthLoading/>;
 return <><Show when="signed-in"><Studio/></Show><Show when="signed-out"><Redirect to="/"/></Show></>;
}
function SignInPage(){
 return <main className="auth-screen"><Link href="/" className="auth-home-link"><img src={brandMarkUrl} alt=""/> Back to Solo Studio</Link><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`}/></main>;
}
function SignUpPage(){
 return <main className="auth-screen"><Link href="/" className="auth-home-link"><img src={brandMarkUrl} alt=""/> Back to Solo Studio</Link><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`}/></main>;
}
function ClerkRoutes(){
  const [location,setLocation]=useLocation();
  useEffect(()=>{
    const previousScrollRestoration=window.history.scrollRestoration;
    window.history.scrollRestoration='manual';
    return ()=>{window.history.scrollRestoration=previousScrollRestoration};
  },[]);
  useLayoutEffect(()=>{
    window.scrollTo(0,0);
    document.documentElement.scrollTop=0;
    document.body.scrollTop=0;
  },[location]);
 return <ClerkProvider
  publishableKey={clerkPubKey}
  proxyUrl={clerkProxyUrl}
  appearance={clerkAppearance}
  signInUrl={`${basePath}/sign-in`}
  signUpUrl={`${basePath}/sign-up`}
  localization={{
   signIn:{start:{title:'Welcome back',subtitle:'Sign in to open your private studio workspace'}},
   signUp:{start:{title:'Start your studio',subtitle:'Create an account for your own private workspace'}},
  }}
  routerPush={to=>setLocation(stripBase(to))}
  routerReplace={to=>setLocation(stripBase(to),{replace:true})}
 >
  <Switch>
   <Route path="/cookies">{()=><LegalPage kind="cookies"/>}</Route>
   <Route path="/privacy">{()=><LegalPage kind="privacy"/>}</Route>
   <Route path="/terms">{()=><LegalPage kind="terms"/>}</Route>
   <Route path="/" component={HomeRedirect}/>
   <Route path="/sign-in/*?" component={SignInPage}/>
   <Route path="/sign-up/*?" component={SignUpPage}/>
   <Route path="/user-portal" component={ProtectedStudio}/>
   <Route component={ProtectedStudio}/>
  </Switch>
 </ClerkProvider>;
}
const queryClient=new QueryClient();
function App(){return <QueryClientProvider client={queryClient}><WouterRouter base={basePath}><ClerkRoutes/></WouterRouter></QueryClientProvider>}
export default App;
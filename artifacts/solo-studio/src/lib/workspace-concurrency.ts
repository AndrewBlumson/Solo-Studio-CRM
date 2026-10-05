type WorkspaceRecord={id:string;[key:string]:unknown};
type WorkspaceObject=Record<string,unknown>;

const sameValue=(left:unknown,right:unknown)=>JSON.stringify(left)===JSON.stringify(right);

function asObject(value:unknown):WorkspaceObject{
 return value&&typeof value==='object'&&!Array.isArray(value)?value as WorkspaceObject:{};
}

function asRecords(value:unknown):WorkspaceRecord[]{
 return Array.isArray(value)?value.filter((item):item is WorkspaceRecord=>!!item&&typeof item==='object'&&typeof item.id==='string'):[];
}

export function mergeWorkspaceChanges<T extends object>(
 base:T,
 local:T,
 remote:T,
 entities:readonly string[],
):{state?:T;conflicts:string[]}{
 const baseWorkspace=base as WorkspaceObject;
 const localWorkspace=local as WorkspaceObject;
 const remoteWorkspace=remote as WorkspaceObject;
 const merged={...remoteWorkspace};
 const conflicts:string[]=[];
 const baseSettings=asObject(baseWorkspace.settings);
 const localSettings=asObject(localWorkspace.settings);
 const remoteSettings=asObject(remoteWorkspace.settings);
 const mergedSettings={...remoteSettings};

 for(const key of new Set([...Object.keys(baseSettings),...Object.keys(localSettings),...Object.keys(remoteSettings)])){
  const baseValue=baseSettings[key],localValue=localSettings[key],remoteValue=remoteSettings[key];
  const localChanged=!sameValue(localValue,baseValue),remoteChanged=!sameValue(remoteValue,baseValue);
  if(localChanged&&remoteChanged&&!sameValue(localValue,remoteValue)){
   conflicts.push(`Studio setting: ${key}`);
   continue;
  }
  const value=localChanged?localValue:remoteValue;
  if(value===undefined)delete mergedSettings[key];else mergedSettings[key]=value;
 }
 merged.settings=mergedSettings;

 for(const entity of entities){
  const baseItems=asRecords(baseWorkspace[entity]);
  const localItems=asRecords(localWorkspace[entity]);
  const remoteItems=asRecords(remoteWorkspace[entity]);
  const baseById=new Map(baseItems.map(item=>[item.id,item]));
  const localById=new Map(localItems.map(item=>[item.id,item]));
  const remoteById=new Map(remoteItems.map(item=>[item.id,item]));
  const resolved=new Map<string,WorkspaceRecord|undefined>();
  let entityHasConflict=false;

  for(const id of new Set([...baseById.keys(),...localById.keys(),...remoteById.keys()])){
   const baseItem=baseById.get(id),localItem=localById.get(id),remoteItem=remoteById.get(id);
   const localChanged=!sameValue(localItem,baseItem),remoteChanged=!sameValue(remoteItem,baseItem);
   if(localChanged&&remoteChanged&&!sameValue(localItem,remoteItem)){
    conflicts.push(`${entity} record ${id}`);
    entityHasConflict=true;
    continue;
   }
   resolved.set(id,localChanged?localItem:remoteItem);
  }

  if(!entityHasConflict){
   const order=[...remoteItems.map(item=>item.id),...localItems.map(item=>item.id)];
   const seen=new Set<string>();
   merged[entity]=order.flatMap(id=>{
    if(seen.has(id))return [];
    seen.add(id);
    const item=resolved.get(id);
    return item?[item]:[];
   });
  }
 }

 return conflicts.length?{conflicts}:{state:merged as T,conflicts};
}

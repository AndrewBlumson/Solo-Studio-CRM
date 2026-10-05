import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeWorkspaceChanges } from './workspace-concurrency.ts';

test('merges changes from separate tabs without dropping the newer proposal invoice',()=>{
 const base={
  settings:{businessName:'Fieldnotes'},
  proposals:[{id:'proposal-1',status:'Accepted'}],
  invoices:[],
  clients:[],
 };
 const local={
  ...base,
  settings:{businessName:'Fieldnotes'},
  clients:[{id:'client-2',name:'New client'}],
 };
 const invoice={id:'invoice-1',sourceProposalId:'proposal-1',status:'Draft'};
 const remote={
  ...base,
  invoices:[invoice],
 };

 const result=mergeWorkspaceChanges(base,local,remote,['proposals','invoices','clients']);

 assert.deepEqual(result.conflicts,[]);
 assert.deepEqual(result.state?.invoices,[invoice]);
 assert.deepEqual(result.state?.clients,[{id:'client-2',name:'New client'}]);
});

test('flags edits to the same record rather than picking one tab silently',()=>{
 const base={settings:{businessName:'Fieldnotes'},proposals:[{id:'proposal-1',status:'Sent'}]};
 const local={settings:{businessName:'Fieldnotes'},proposals:[{id:'proposal-1',status:'Accepted'}]};
 const remote={settings:{businessName:'Fieldnotes'},proposals:[{id:'proposal-1',status:'Declined'}]};

 const result=mergeWorkspaceChanges(base,local,remote,['proposals']);

 assert.equal(result.state,undefined);
 assert.deepEqual(result.conflicts,['proposals record proposal-1']);
});

test('merges unrelated preference changes but reports conflicting preference edits',()=>{
 const base={settings:{businessName:'Fieldnotes',defaultHourlyRatePence:6500},leads:[]};
 const local={settings:{businessName:'Fieldnotes Creative',defaultHourlyRatePence:6500},leads:[]};
 const remote={settings:{businessName:'Fieldnotes',defaultHourlyRatePence:7200},leads:[]};

 const merged=mergeWorkspaceChanges(base,local,remote,['leads']);
 assert.deepEqual(merged.state?.settings,{
  businessName:'Fieldnotes Creative',
  defaultHourlyRatePence:7200,
 });

 const conflict=mergeWorkspaceChanges(base,local,{
  ...remote,
  settings:{businessName:'Fieldnotes Studio',defaultHourlyRatePence:7200},
 },['leads']);
 assert.deepEqual(conflict.conflicts,['Studio setting: businessName']);
});

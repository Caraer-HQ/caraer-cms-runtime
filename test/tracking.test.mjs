import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startActiveTimeTracking, enqueueTrackingSnapshot } from '../src/tracking.ts';

function fixture() {
  let now = 0, timer, active = 0, flushes = 0;
  const events = [];
  const doc = new EventTarget();
  doc.visibilityState = 'visible';
  const stop = startActiveTimeTracking({
    document: doc, now: () => now,
    setInterval: callback => { timer = callback; return 1; }, clearInterval: () => { timer = null; },
    sessionActiveMs: delta => active += delta,
    emit: event => events.push(event), flush: () => flushes++, allowed: () => doc.consent !== false,
  });
  return { doc, events, stop, advance(ms, fire=true) { now += ms; if(fire) timer?.(); }, visibility(state) { doc.visibilityState = state; doc.dispatchEvent(new Event('visibilitychange')); }, get flushes() { return flushes; } };
}

test('hidden tabs emit one changed final snapshot and no repeated heartbeats', () => {
  const f = fixture();
  f.advance(30000);
  assert.deepEqual(f.events, [{ type: 'session_heartbeat', activeTime: 30, timeOnPage: 30 }]);
  f.advance(10000,false);
  f.visibility('hidden');
  assert.deepEqual(f.events.at(-1), {type:'page_engagement',activeTime:40,timeOnPage:40});
  assert.equal(f.flushes,1);
  const before = f.events.length;
  for (let i=0;i<20;i++) f.advance(30000);
  assert.equal(f.events.length, before);
  f.visibility('visible'); f.advance(30000);
  assert.equal(f.events.at(-1).timeOnPage, 70);
  assert.equal(f.events.at(-1).activeTime, 70);
  f.stop();
});

test('snapshot merging cannot move measurements across a business action',()=>{
 const queue=[];
 enqueueTrackingSnapshot(queue,{type:'session_heartbeat',sessionId:'a',activeTime:10});
 enqueueTrackingSnapshot(queue,{type:'cta_click',sessionId:'a'});
 enqueueTrackingSnapshot(queue,{type:'session_heartbeat',sessionId:'a',activeTime:20});
 assert.equal(queue.length,3);assert.equal(queue[0].activeTime,10);assert.equal(queue[2].activeTime,20);
});

test('an initially hidden page produces no heartbeat or fictitious active time',()=>{
 const f=fixture();f.visibility('hidden');f.advance(300000);f.stop();assert.equal(f.events.length,0);
});

test('unchanged hide, cleanup, and revoked consent cannot add analytics', () => {
  const f = fixture(); f.advance(30000);
  f.visibility('hidden'); assert.equal(f.events.length, 1);
  f.visibility('visible'); f.doc.consent = false; f.advance(30000); f.stop();
  assert.equal(f.events.length, 1);
});

test('pending snapshots merge maxima within one session and page without merging actions', () => {
  const queue = [];
  enqueueTrackingSnapshot(queue, { type:'page_engagement', sessionId:'a', pageUrl:'/', scrollPct:70 });
  enqueueTrackingSnapshot(queue, { type:'page_engagement', sessionId:'a', pageUrl:'/', timeOnPage:30, scrollPct:20 });
  enqueueTrackingSnapshot(queue, { type:'page_engagement', sessionId:'b', pageUrl:'/', timeOnPage:10 });
  enqueueTrackingSnapshot(queue, { type:'form_step', sessionId:'a', stepIndex:1 });
  enqueueTrackingSnapshot(queue, { type:'form_step', sessionId:'a', stepIndex:2 });
  assert.equal(queue.length,4);
  assert.equal(queue[0].scrollPct,70); assert.equal(queue[0].timeOnPage,30);
  assert.deepEqual(queue.slice(2).map(e=>e.stepIndex),[1,2]);
});

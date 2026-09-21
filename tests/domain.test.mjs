import test from 'node:test';
import assert from 'node:assert/strict';
import {balance,completeTask,emptyWorkspace,nextDate,occurs,streak,toMinor,totals,validate} from '../src/domain.js';

test('a recurring task creates one clean successor', () => {
  const w=emptyWorkspace();
  const task={id:'task-1',title:'Plan week',status:'todo',date:'2026-09-21',repeat:'weekly',subtasks:[{id:'s1',title:'Review',done:true}],createdAt:'2026-09-21'};
  w.tasks.push(task);
  completeTask(w,task,'2026-09-21');
  completeTask(w,task,'2026-09-21');
  completeTask(w,task,'2026-09-21');
  assert.equal(w.tasks.length,2);
  assert.equal(w.tasks[1].date,'2026-09-28');
  assert.equal(w.tasks[1].status,'todo');
  assert.equal(w.tasks[1].subtasks[0].done,false);
});

test('monthly recurrence clamps to the last day', () => {
  assert.equal(nextDate('2026-01-31','monthly'),'2026-02-28');
  assert.equal(occurs({date:'2026-01-31',repeat:'monthly'},'2026-02-28'),true);
});

test('habit streak respects scheduled weekdays', () => {
  const habit={startDate:'2026-09-14',weekdays:[1,3,5],completions:['2026-09-14','2026-09-16','2026-09-18','2026-09-21']};
  assert.deepEqual(streak(habit,'2026-09-21'),{current:4,best:4});
});

test('transfers preserve total cash and currency totals ignore them', () => {
  const w=emptyWorkspace();
  const cash={id:'a',title:'Cash',currency:'TJS',opening:10000};
  const card={id:'b',title:'Card',currency:'TJS',opening:5000};
  w.accounts.push(cash,card);
  w.transactions.push(
    {id:'t1',kind:'transfer',accountId:'a',toAccountId:'b',amount:2500,date:'2026-09-02'},
    {id:'t2',kind:'income',accountId:'a',amount:1000,date:'2026-09-03'},
    {id:'t3',kind:'expense',accountId:'b',amount:400,date:'2026-09-04'}
  );
  assert.equal(balance(w,cash)+balance(w,card),15600);
  assert.deepEqual(totals(w,'2026-09','TJS'),{income:1000,expense:400});
  assert.equal(toMinor('12,50'),1250);
  assert.doesNotThrow(()=>validate(w));
});

test('workspace validation rejects cross-currency transfers', () => {
  const w=emptyWorkspace();
  w.accounts.push({id:'a',title:'Cash',currency:'TJS',opening:0},{id:'b',title:'USD',currency:'USD',opening:0});
  w.transactions.push({id:'t',kind:'transfer',accountId:'a',toAccountId:'b',amount:100,date:'2026-09-04'});
  assert.throws(()=>validate(w),/transfer/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeSchool, breachAt } from '../src/services/leaderboard.js';
import { getTomorrowForecast, clearTomorrowForecastCache } from '../src/services/forecast.js';
import { minutesFromBreachToNotice } from '../../client/src/utils/metrics.js';

const school={_id:'school-1',name:'Demo School',slug:'demo'};
test('leaderboard excludes false alarms from breaches and computes response minutes',()=>{
  const decisions=[
    {schoolId:'school-1',date:'2026-10-08',hourly:[{time:'06:00',pm25:121,pm10:0}],status:'sent',approvedAt:new Date('2026-10-08T00:45:00Z')},
    {schoolId:'school-1',date:'2026-10-07',hourly:[{time:'06:00',pm25:20,pm10:20}],status:'sent',approvedAt:new Date('2026-10-07T01:00:00Z')}
  ];
  assert.equal(breachAt(decisions[0]).toISOString(),'2026-10-08T00:30:00.000Z');
  const row=summarizeSchool(school,decisions,new Date('2026-10-09T12:00:00Z'));
  assert.equal(row.breaches,1); assert.equal(row.mean_minutes,15); assert.equal(row.last_incident_notice_missing,false);
});
test('leaderboard keeps breach without notice visible and reports no incidents',()=>{
  const incident={schoolId:'school-1',date:'2026-10-08',hourly:[{time:'06:00',pm25:121,pm10:0}],status:'proposed'};
  const row=summarizeSchool(school,[incident],new Date('2026-10-09T12:00:00Z'));
  assert.equal(row.breaches,1); assert.equal(row.mean_minutes,null); assert.equal(row.last_incident_notice_missing,true);
  const empty=summarizeSchool(school,[],new Date('2026-10-09T12:00:00Z'));
  assert.equal(empty.breaches,0); assert.equal(empty.mean_minutes,null);
});
test('leaderboard p95 uses the 95th percentile of incident response minutes',()=>{
  const decisions=Array.from({length:20},(_,index)=>{
    const date=new Date(Date.UTC(2026,8,2+index,12)).toISOString().slice(0,10);
    const incident={schoolId:'school-1',date,hourly:[{time:'06:00',pm25:121,pm10:0}],status:'sent'};
    incident.approvedAt=new Date(breachAt(incident).getTime()+(index+1)*60_000);
    return incident;
  });
  const row=summarizeSchool(school,decisions,new Date('2026-10-01T00:00:00Z'));
  assert.equal(row.breaches,20);assert.equal(row.mean_minutes,10.5);assert.equal(row.p95_minutes,19);
});
test('headline KPI measures from first school-hour AQI breach above 300',()=>{
  const decision={date:'2026-10-10',hourly:[{time:'06:00',pm25:121,pm10:0},{time:'07:00',pm25:130,pm10:0}],approvedAt:'2026-10-10T07:30:00+05:30'};
  assert.equal(minutesFromBreachToNotice(decision),90);
  assert.equal(minutesFromBreachToNotice({...decision,hourly:[{time:'06:00',pm25:100,pm10:0}]}),null);
});
test('tomorrow forecast applies India params and caches the hourly AQI',async()=>{
  clearTomorrowForecastCache(); let calls=0, requested='';
  const fetchImpl=async url=>{calls++;requested=url;return {ok:true,json:async()=>({hourly:{time:['2026-10-10T06:00','2026-10-10T07:00'],pm2_5:[100,120],pm10:[180,200]}})};};
  const now=new Date('2026-10-09T12:30:00+05:30');
  const first=await getTomorrowForecast(28.6,77.2,{now,fetchImpl});
  await getTomorrowForecast(28.6,77.2,{now,fetchImpl});
  assert.equal(calls,1); assert.match(requested,/latitude=28.6/);assert.match(requested,/longitude=77.2/);assert.match(requested,/Asia%2FKolkata/);
  assert.equal(first.morning_summary.at,'2026-10-10T06:00');assert.equal(first.hours.length,2);assert.equal(first.hours[0].aqi,232);assert.equal(first.hours[1].aqi,300);assert.equal(first.hours[0].dominant,'PM2.5');
  clearTomorrowForecastCache();
});
test('tomorrow forecast reports an unavailable upstream',async()=>{
  clearTomorrowForecastCache();
  await assert.rejects(()=>getTomorrowForecast(1,2,{fetchImpl:async()=>({ok:false,status:503})}),/HTTP 503/);
});

(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.JCCFTLEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const TABLES={
    NCC:{
      A:[[15,14.25,13.5,12.75,12,11.5,11,11],[16,15.25,14.5,13.75,13,12.5,12,11.5],[15,14.25,13.5,12.75,12,11.5,11,11],[14,13.25,12.5,11.75,11,11,11,11],[13,12.25,11.5,11,11,11,11,11]],
      B:[[15,14.25,13.5,12.75,12,11.25,11],[13.5,13,12.5,11.75,11,11,11]],
      reportMin:60,postMin:30,minRest:10,awayAccommodationMin:8,localNightDuty:20,splitExcludedMin:20/60,reliefCaps:{bunk:20,seat:18},daysPair:16,cumulative:[65,105,190,2000]
    },
    CAT:{
      A:[[13,12.25,11.5,10.75,10,9.5,9,9],[14,13.25,12.5,11.75,11,10.5,10,9.5],[13,12.25,11.5,10.75,10,9.5,9,9],[12,11.25,10.5,9.75,9,9,9,9],[11,10.25,9.5,9,9,9,9,9]],
      B:[[13,12.25,11.5,10.75,10,9.25,9],[11.5,11,10.5,9.75,9,9,9]],
      reportMin:60,postMin:30,minRest:12,awayAccommodationMin:10,localNightDuty:18,splitExcludedMin:30/60,reliefCaps:{bunk:18,seat:15},daysPair:14,cumulative:[55,95,190,2000]
    }
  };
  const EPS=1e-8;
  function band(min){min=((min%1440)+1440)%1440;if(min>=360&&min<420)return 0;if(min>=420&&min<780)return 1;if(min>=780&&min<1080)return 2;if(min>=1080&&min<1320)return 3;return 4}
  function duration(start,end){let d=end-start;if(d<0)d+=1440;return d/60}
  function capSectors(acc,sectors){return Math.min(Math.max(1,sectors),acc?8:7)}
  function longThreshold(rule){return rule==='CAT'?7:9}
  function longContribution(rule,acc,h){
    if(rule==='NCC'){
      if(h<=9)return 1;
      if(h<=11)return acc?1:2;
      return acc?2:3;
    }
    if(h<=7)return 1;
    if(h<=9)return acc?2:4;
    if(h<=11)return acc?3:4;
    return acc?4:null;
  }
  function modifiedSectors({rule,acc,sectors,longestSectorHours=0,longSectorCount=0,additionalCurrentTypeRatedPilot=false}){
    if(additionalCurrentTypeRatedPilot||longSectorCount===0||longestSectorHours<=longThreshold(rule)) return {ok:true,sectors};
    if(longSectorCount<0||longSectorCount>sectors)return {ok:false,review:true,reason:'Long-sector count exceeds actual sectors'};
    const c=longContribution(rule,acc,longestSectorHours);
    if(c===null)return {ok:false,notApplicable:true,reason:'CAT two-pilot non-acclimatised sector over 11h is not applicable'};
    return {ok:true,sectors:sectors-longSectorCount+c*longSectorCount,contribution:c};
  }
  function tableLimit({rule='NCC',acc=true,reportMin=540,sectors=1,precedingRestHours=12,longestSectorHours=0,longSectorCount=0,additionalCurrentTypeRatedPilot=false}){
    const cfg=TABLES[rule];
    const mod=modifiedSectors({rule,acc,sectors,longestSectorHours,longSectorCount,additionalCurrentTypeRatedPilot});
    if(!mod.ok)return mod;
    const s=capSectors(acc,mod.sectors);
    if(acc)return {ok:true,max:cfg.A[band(reportMin)][s-1],table:'A',band:band(reportMin),modifiedSectors:mod.sectors};
    if(Math.abs(precedingRestHours-30)<EPS)return {ok:false,review:true,reason:'Exactly 30h preceding rest is ambiguous in supplied Table B wording'};
    const row=(precedingRestHours<=18||precedingRestHours>30)?0:1;
    return {ok:true,max:cfg.B[row][s-1],table:'B',restBand:row,modifiedSectors:mod.sectors};
  }
  function relief(rule,base,{restHours=0,facility='bunk',qualified=false,facilityQualified=false}={}){
    if(restHours<3)return {ok:true,max:base,extension:0,reason:'In-flight rest under 3h: no extension'};
    if(!qualified||!facilityQualified)return {ok:false,review:true,max:base,reason:'Relief qualification/rest facility not confirmed'};
    if(!['bunk','seat'].includes(facility))return {ok:false,review:true,max:base,reason:'Invalid relief facility'};
    const factor=facility==='bunk'?0.5:1/3,cap=TABLES[rule].reliefCaps[facility],ext=restHours*factor;
    return {ok:true,max:Math.min(base+ext,cap),extension:ext,cap};
  }
  function split(rule,base,{groundIntervalHours=0,excludedDutyHours=null,facilityQualified=false}={}){
    const minExcluded=TABLES[rule].splitExcludedMin;
    const excluded=Math.max(minExcluded,excludedDutyHours==null?minExcluded:excludedDutyHours);
    const q=Math.max(0,groundIntervalHours-excluded);
    if(q<3)return {ok:true,max:base,extension:0,qualifyingRest:q,reason:'Qualifying split rest under 3h: no extension'};
    if(q>10)return {ok:false,review:true,max:base,qualifyingRest:q,reason:'Qualifying split rest over 10h is outside supplied split-duty table'};
    if(!facilityQualified)return {ok:false,review:true,max:base,qualifyingRest:q,reason:q>6?'Suitable accommodation not confirmed':'Quiet/comfortable non-public rest place not confirmed'};
    const ext=q/2;return {ok:true,max:base+ext,extension:ext,qualifyingRest:q};
  }
  function applyInterruptedRest(rule,max,{enabled=false,disturbanceMin=180,departureRestMin=360}={}){
    if(!enabled)return {ok:true,max,addedFDP:0};
    if(rule!=='CAT')return {ok:false,review:true,max,reason:'No numerical NCC interrupted-rest rule in supplied current NCC Section 7.5'};
    const inWindow=disturbanceMin>=1380||disturbanceMin<420;
    if(!inWindow)return {ok:true,max,addedFDP:0,reason:'Disturbance outside 2300-0700 rule window'};
    let gap=departureRestMin-disturbanceMin;if(gap<0)gap+=1440;
    if(gap<=60)return {ok:true,max,addedFDP:0,reason:'Disturbance not earlier than 1h before departure from place of rest'};
    const add=(gap-60)/60;return {ok:true,max:Math.max(0,max-add),addedFDP:add};
  }
  function applyPIC(rule,max,{hours=0,sectors=1,catContext='early',emergency=false}={}){
    if(hours<=0)return {ok:true,max,extension:0};
    if(emergency)return {ok:false,review:true,max,reason:'Emergency discretion requires PIC operational judgement; not numerically automated'};
    let cap=3;if(rule==='CAT'&&sectors>=2&&catContext!=='last')cap=2;
    if(hours>cap+EPS)return {ok:false,review:true,max,reason:`Requested PIC discretion exceeds ${cap}h for this context`};
    return {ok:true,max:max+hours,extension:hours,cap};
  }
  function applyVariation(rule,max,{hours=0,crewApproved=false,fullApproval=false}={}){
    if(hours<=0)return {ok:true,max,extension:0};
    if(rule==='CAT')return {ok:false,review:true,max,reason:'CAT OMA Section 7 planned variation section is Reserved'};
    if(hours<=1+EPS){if(!crewApproved)return {ok:false,review:true,max,reason:'NCC planned variation up to 1h requires crew approval'};return {ok:true,max:max+hours,extension:hours};}
    if(!fullApproval)return {ok:false,review:true,max,reason:'NCC variation over 1h requires NPFO/SM/crew approval and case-specific risk assessment'};
    return {ok:true,max:max+hours,extension:hours,reason:'Approved case-specific NCC variation'};
  }
  function evaluate(inp){
    const notes=[],reviews=[];let fdpStartMin=inp.reportMin;
    const baseInput={rule:inp.rule,acc:inp.acc,sectors:inp.sectors,precedingRestHours:inp.precedingRestHours,longestSectorHours:inp.longestSectorHours,longSectorCount:inp.longSectorCount,additionalCurrentTypeRatedPilot:inp.additionalCurrentTypeRatedPilot};
    function at(t){return tableLimit({...baseInput,reportMin:t})}
    let b=at(inp.reportMin);if(!b.ok)return {...b,legal:false,notes,reviews:[b.reason]};let max=b.max;notes.push(`Table ${b.table}; modified sectors ${b.modifiedSectors}`);
    if(inp.delayed?.enabled){
      if(inp.rule!=='CAT')reviews.push('Delayed reporting numerical rule not present in supplied current NCC Section 7.5');
      else{
        const d=duration(inp.delayed.originalMin,inp.delayed.actualMin);
        if(d>=10&&inp.delayed.undisturbed){b=at(inp.delayed.actualMin);if(!b.ok)return {...b,legal:false,notes,reviews:[b.reason]};max=b.max;fdpStartMin=inp.delayed.actualMin;notes.push('≥10h advance delay treated as rest; actual report used');}
        else if(d<4){b=at(inp.delayed.originalMin);if(!b.ok)return {...b,legal:false,notes,reviews:[b.reason]};max=b.max;fdpStartMin=inp.delayed.actualMin;notes.push('Delayed report <4h: original band, FDP starts actual report');}
        else{const bo=at(inp.delayed.originalMin),ba=at(inp.delayed.actualMin);if(!bo.ok||!ba.ok)return {ok:false,legal:false,review:true,reviews:[(bo.reason||ba.reason)],notes};max=Math.min(bo.max,ba.max);fdpStartMin=(inp.delayed.originalMin+240)%1440;notes.push('Delayed report ≥4h: more limiting planned/actual band; FDP starts original+4h');}
      }
    }
    if(inp.standby?.enabled){
      if(inp.rule!=='CAT')reviews.push('Standby numerical rule not present in supplied current NCC Section 7.5');
      else{
        const d=duration(inp.standby.startMin,inp.standby.reportMin??fdpStartMin);
        if(d>12+EPS)reviews.push('CAT standby exceeds 12h maximum');
        const bs=at(inp.standby.startMin),ba=at(fdpStartMin);if(!bs.ok||!ba.ok)return {ok:false,legal:false,review:true,reviews:[bs.reason||ba.reason],notes};
        max=Math.min(max,bs.max,ba.max);if(d>=6)max-=d-6;notes.push(`CAT standby ${d.toFixed(2)}h${d>=6?' with excess-over-6 reduction':''}`);
      }
    }
    const ir=applyInterruptedRest(inp.rule,max,inp.interruptedRest);max=ir.max;if(!ir.ok)reviews.push(ir.reason);else if(ir.addedFDP)notes.push(`Interrupted-rest count ${ir.addedFDP.toFixed(2)}h`);
    if(inp.extension?.type==='relief'){const r=relief(inp.rule,max,inp.extension);max=r.max;if(!r.ok)reviews.push(r.reason);else if(r.extension)notes.push(`In-flight relief +${r.extension.toFixed(2)}h cap ${r.cap}h`);}
    if(inp.extension?.type==='split'){const s=split(inp.rule,max,inp.extension);max=s.max;if(!s.ok)reviews.push(s.reason);else if(s.extension)notes.push(`Split duty +${s.extension.toFixed(2)}h`);}
    const p=applyPIC(inp.rule,max,inp.pic);max=p.max;if(!p.ok)reviews.push(p.reason);else if(p.extension)notes.push(`PIC discretion +${p.extension.toFixed(2)}h`);
    const v=applyVariation(inp.rule,max,inp.variation);max=v.max;if(!v.ok)reviews.push(v.reason);else if(v.extension)notes.push(`Planned variation +${v.extension.toFixed(2)}h`);
    const planned=inp.plannedFDPHours;const assessed=Number.isFinite(planned);const legal=reviews.length===0&&(!assessed||planned<=max+EPS);
    return {ok:reviews.length===0,review:reviews.length>0,legal,assessed,maxFDPHours:max,fdpStartMin,notes,reviews,table:b.table,modifiedSectors:b.modifiedSectors};
  }
  function minimumRest(rule,{precedingDutyHours,away=false,suitableAccommodation=false,travelEachWayHours=0,dutyIncludingPositioningHours=0}={}){
    const cfg=TABLES[rule];let base=Math.max(precedingDutyHours||0,cfg.minRest),r=base,reduced=false;
    if(away&&suitableAccommodation){
      if(rule==='NCC'&&base>=10){r=base-1;reduced=true;}
      if(rule==='CAT'&&Math.abs(base-12)<EPS){r=11;reduced=true;}
    }
    const travelExtra=away?Math.max(0,travelEachWayHours*2-1):0;r+=travelExtra;
    const accommodationFloor=away&&suitableAccommodation?cfg.awayAccommodationMin+Math.max(0,travelEachWayHours*2):0;
    if(accommodationFloor)r=Math.max(r,accommodationFloor);
    return {restHours:r,reduced,travelExtra,requiresLocalNight:(dutyIncludingPositioningHours||0)>cfg.localNightDuty};
  }
  function cumulative(rule,v={}){
    const L=TABLES[rule].cumulative;const breaches=[];
    [['d7',L[0]],['d14',L[1]],['d28',L[2]],['d12',L[3]],['f28',100],['f12',900]].forEach(([k,l])=>{if(Number.isFinite(v[k])&&v[k]>l+EPS)breaches.push(`${k} exceeds ${l}`)});
    if(Number.isFinite(v.consecutiveDutyDays)&&v.consecutiveDutyDays>7)breaches.push('More than 7 consecutive duty days');
    if(Number.isFinite(v.daysOff28)&&v.daysOff28<7)breaches.push('Fewer than 7 days off in 4 weeks');
    if(v.twoConsecutiveDaysOffOK===false)breaches.push(`Two consecutive days off requirement not met (${TABLES[rule].daysPair}-day sequence)`);
    if(rule==='CAT'&&Number.isFinite(v.daysOffYear)&&v.daysOffYear<96)breaches.push('Fewer than 96 days free of duty in calendar year');
    return {legal:breaches.length===0,breaches,limits:L};
  }
  return {TABLES,band,duration,longThreshold,longContribution,modifiedSectors,tableLimit,relief,split,applyInterruptedRest,applyPIC,applyVariation,evaluate,minimumRest,cumulative};
});
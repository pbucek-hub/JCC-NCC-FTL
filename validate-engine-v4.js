const E=require('./jcc-ftl-engine-v4.js');
let pass=0,fail=0; const errs=[];
function eq(a,b,msg,eps=1e-9){if((Number.isNaN(a)&&Number.isNaN(b))||Math.abs(a-b)<=eps){pass++}else{fail++;errs.push(`${msg}: got ${a}, expected ${b}`)}}
function ok(v,msg){if(v){pass++}else{fail++;errs.push(msg)}}
const TA={NCC:[[15,14.25,13.5,12.75,12,11.5,11,11],[16,15.25,14.5,13.75,13,12.5,12,11.5],[15,14.25,13.5,12.75,12,11.5,11,11],[14,13.25,12.5,11.75,11,11,11,11],[13,12.25,11.5,11,11,11,11,11]],CAT:[[13,12.25,11.5,10.75,10,9.5,9,9],[14,13.25,12.5,11.75,11,10.5,10,9.5],[13,12.25,11.5,10.75,10,9.5,9,9],[12,11.25,10.5,9.75,9,9,9,9],[11,10.25,9.5,9,9,9,9,9]]};
const TB={NCC:[[15,14.25,13.5,12.75,12,11.25,11],[13.5,13,12.5,11.75,11,11,11]],CAT:[[13,12.25,11.5,10.75,10,9.25,9],[11.5,11,10.5,9.75,9,9,9]]};
const bandTimes=[360,420,780,1080,1320];
for(const rule of ['NCC','CAT']) for(let b=0;b<5;b++) for(let s=1;s<=8;s++){const r=E.tableLimit({rule,acc:true,reportMin:bandTimes[b],sectors:s,precedingRestHours:12});eq(r.max,TA[rule][b][s-1],`${rule} A b${b} s${s}`)}
for(const rule of ['NCC','CAT']) for(let row=0;row<2;row++) for(let s=1;s<=7;s++){const pr=row===0?18:24;const r=E.tableLimit({rule,acc:false,reportMin:540,sectors:s,precedingRestHours:pr});eq(r.max,TB[rule][row][s-1],`${rule} B r${row} s${s}`)}
for(const [m,b] of [[359,4],[360,0],[419,0],[420,1],[779,1],[780,2],[1079,2],[1080,3],[1319,3],[1320,4],[1439,4],[0,4]])eq(E.band(m),b,`band ${m}`);
for(const rule of ['NCC','CAT']){
  ok(E.tableLimit({rule,acc:false,sectors:1,precedingRestHours:18}).restBand===0,`${rule} 18 outer`);
  ok(E.tableLimit({rule,acc:false,sectors:1,precedingRestHours:18.0001}).restBand===1,`${rule} >18 middle`);
  ok(E.tableLimit({rule,acc:false,sectors:1,precedingRestHours:29.999}).restBand===1,`${rule} <30 middle`);
  ok(E.tableLimit({rule,acc:false,sectors:1,precedingRestHours:30}).review,`${rule} 30 review`);
  ok(E.tableLimit({rule,acc:false,sectors:1,precedingRestHours:30.001}).restBand===0,`${rule} >30 outer`);
}
const longExpected={NCC:{true:[[9,1],[9+1/60,1],[11,1],[11+1/60,2]],false:[[9,1],[9+1/60,2],[11,2],[11+1/60,3]]},CAT:{true:[[7,1],[7+1/60,2],[9,2],[9+1/60,3],[11,3],[11+1/60,4]],false:[[7,1],[7+1/60,4],[9,4],[9+1/60,4],[11,4],[11+1/60,null]]}};
for(const rule of ['NCC','CAT'])for(const acc of [true,false])for(const [h,c] of longExpected[rule][acc]){const got=E.longContribution(rule,acc,h);ok(got===c,`${rule} long ${acc} ${h} got ${got} expected ${c}`)}
let r=E.modifiedSectors({rule:'NCC',acc:false,sectors:2,longestSectorHours:10,longSectorCount:1});eq(r.sectors,3,'NCC 2 sectors one 10h => 3 modified');
r=E.modifiedSectors({rule:'CAT',acc:true,sectors:2,longestSectorHours:10,longSectorCount:1});eq(r.sectors,4,'CAT 2 sectors one 10h => 4 modified');
r=E.modifiedSectors({rule:'CAT',acc:false,sectors:2,longestSectorHours:11.1,longSectorCount:1});ok(r.notApplicable,'CAT nonacc >11 N/A');
r=E.modifiedSectors({rule:'CAT',acc:false,sectors:2,longestSectorHours:11.1,longSectorCount:1,additionalCurrentTypeRatedPilot:true});eq(r.sectors,2,'extra pilot bypass');
for(const rule of ['NCC','CAT'])for(const facility of ['bunk','seat']){
  r=E.relief(rule,12,{restHours:2.999,facility,qualified:true,facilityQualified:true});eq(r.extension,0,`${rule} ${facility} <3 no ext`);
  r=E.relief(rule,12,{restHours:3,facility,qualified:true,facilityQualified:true});eq(r.extension,facility==='bunk'?1.5:1,`${rule} ${facility} 3h ext`);
  r=E.relief(rule,17.5,{restHours:6,facility,qualified:true,facilityQualified:true});ok(r.max<=E.TABLES[rule].reliefCaps[facility]+1e-9,`${rule} ${facility} cap`);
  r=E.relief(rule,12,{restHours:3,facility,qualified:false,facilityQualified:true});ok(r.review,`${rule} relief qual required`);
  r=E.relief(rule,12,{restHours:3,facility,qualified:true,facilityQualified:false});ok(r.review,`${rule} relief facility confirm`);
}
for(const rule of ['NCC','CAT']){
 const ex=E.TABLES[rule].splitExcludedMin;
 for(const [q,ext,review] of [[2.999,0,false],[3,1.5,false],[6,3,false],[6.001,3.0005,false],[10,5,false],[10.001,0,true]]){
   r=E.split(rule,12,{groundIntervalHours:q+ex,excludedDutyHours:ex,facilityQualified:true});
   if(review)ok(r.review,`${rule} split >10 review`); else eq(r.extension,ext,`${rule} split q${q}`,1e-6);
 }
 r=E.split(rule,12,{groundIntervalHours:4+ex,excludedDutyHours:0,facilityQualified:true});eq(r.qualifyingRest,4,`${rule} split enforces min excluded`);
 r=E.split(rule,12,{groundIntervalHours:4+ex,excludedDutyHours:ex,facilityQualified:false});ok(r.review,`${rule} split facility required`);
}
let base={rule:'CAT',acc:true,sectors:1,precedingRestHours:12,longestSectorHours:0,longSectorCount:0,reportMin:420,plannedFDPHours:12};
r=E.evaluate({...base,delayed:{enabled:true,originalMin:420,actualMin:659,undisturbed:false}});eq(r.maxFDPHours,14,'CAT delay 3:59 uses original band');eq(r.fdpStartMin,659,'CAT delay <4 starts actual');eq(r.fdpStartDeltaMinutes,239,'CAT delay <4 delta');
r=E.evaluate({...base,delayed:{enabled:true,originalMin:420,actualMin:660,undisturbed:false}});eq(r.maxFDPHours,14,'CAT delay 4h limiting bands');eq(r.fdpStartMin,660,'CAT delay 4 starts original+4');eq(r.fdpStartDeltaMinutes,240,'CAT delay 4 delta');
r=E.evaluate({...base,reportMin:720,delayed:{enabled:true,originalMin:720,actualMin:1080,undisturbed:false}});eq(r.maxFDPHours,12,'CAT delay >=4 more limiting actual evening');eq(r.fdpStartMin,960,'CAT delay >=4 FDP starts original+4');
r=E.evaluate({...base,reportMin:420,delayed:{enabled:true,originalMin:420,actualMin:1020,undisturbed:true}});eq(r.fdpStartMin,1020,'CAT >=10h undisturbed uses actual report');
r=E.evaluate({...base,reportMin:660,standby:{enabled:true,startMin:360,reportMin:659}});ok(!r.review,'CAT standby <6h no review');
r=E.evaluate({...base,reportMin:720,standby:{enabled:true,startMin:360,reportMin:720}});eq(r.maxFDPHours,13,'CAT standby exactly6 uses standby start table');
r=E.evaluate({...base,reportMin:780,standby:{enabled:true,startMin:360,reportMin:780}});eq(r.maxFDPHours,12,'CAT standby 7h reduces 1h');
r=E.evaluate({...base,reportMin:360,standby:{enabled:true,startMin:360,reportMin:1081}});ok(r.review,'CAT standby >12 review');
r=E.applyInterruptedRest('CAT',14,{enabled:true,disturbanceMin:180,departureRestMin:360});eq(r.addedFDP,2,'CAT interrupted rest 03->06 adds 2h');eq(r.max,12,'CAT interrupted reduces available max');
r=E.applyInterruptedRest('CAT',14,{enabled:true,disturbanceMin:300,departureRestMin:360});eq(r.addedFDP,0,'CAT disturbance exactly1h before no add');
r=E.applyInterruptedRest('CAT',14,{enabled:true,disturbanceMin:600,departureRestMin:720});eq(r.addedFDP,0,'CAT disturbance outside window');
ok(E.applyInterruptedRest('NCC',14,{enabled:true,disturbanceMin:180,departureRestMin:360}).review,'NCC interrupted unsupported by supplied current section');
r=E.applyPIC('CAT',12,{hours:2,sectors:2,catContext:'early'});eq(r.max,14,'CAT multi early +2');ok(E.applyPIC('CAT',12,{hours:2.01,sectors:2,catContext:'early'}).review,'CAT multi early >2 review');
r=E.applyPIC('CAT',12,{hours:3,sectors:2,catContext:'last'});eq(r.max,15,'CAT last +3');r=E.applyPIC('CAT',12,{hours:3,sectors:1,catContext:'early'});eq(r.max,15,'CAT single +3');
r=E.applyPIC('NCC',12,{hours:3,sectors:4});eq(r.max,15,'NCC +3');ok(E.applyPIC('NCC',12,{hours:3.01,sectors:1}).review,'NCC >3 review');
r=E.applyVariation('NCC',12,{hours:1,crewApproved:true});eq(r.max,13,'NCC OCC +1');ok(E.applyVariation('NCC',12,{hours:1,crewApproved:false}).review,'NCC +1 needs crew approval');ok(E.applyVariation('NCC',12,{hours:1.5,fullApproval:false}).review,'NCC >1 needs full approval');r=E.applyVariation('NCC',12,{hours:1.5,fullApproval:true});eq(r.max,13.5,'NCC approved >1 case-specific');ok(E.applyVariation('CAT',12,{hours:1,crewApproved:true}).review,'CAT variation reserved');
r=E.minimumRest('NCC',{precedingDutyHours:8});eq(r.restHours,10,'NCC base min rest 10');r=E.minimumRest('NCC',{precedingDutyHours:12});eq(r.restHours,12,'NCC rest preceding duty');r=E.minimumRest('NCC',{precedingDutyHours:12,away:true,suitableAccommodation:true});eq(r.restHours,11,'NCC away -1 at >=10');r=E.minimumRest('NCC',{precedingDutyHours:12,away:true,suitableAccommodation:true,travelEachWayHours:.75});eq(r.restHours,11.5,'NCC travel extra');ok(E.minimumRest('NCC',{precedingDutyHours:12,dutyIncludingPositioningHours:20.01}).requiresLocalNight,'NCC >20 local night');ok(!E.minimumRest('NCC',{precedingDutyHours:12,dutyIncludingPositioningHours:20}).requiresLocalNight,'NCC exactly20 no local night');
r=E.minimumRest('CAT',{precedingDutyHours:8});eq(r.restHours,12,'CAT base min rest12');r=E.minimumRest('CAT',{precedingDutyHours:12,away:true,suitableAccommodation:true});eq(r.restHours,11,'CAT exactly12 away -1');r=E.minimumRest('CAT',{precedingDutyHours:13,away:true,suitableAccommodation:true});eq(r.restHours,13,'CAT >12 no away reduction');ok(E.minimumRest('CAT',{precedingDutyHours:12,dutyIncludingPositioningHours:18.01}).requiresLocalNight,'CAT >18 local night');ok(!E.minimumRest('CAT',{precedingDutyHours:12,dutyIncludingPositioningHours:18}).requiresLocalNight,'CAT exactly18 no local night');
for(const rule of ['NCC','CAT']){const L=E.TABLES[rule].cumulative;r=E.cumulative(rule,{d7:L[0],d14:L[1],d28:L[2],d12:L[3],f28:100,f12:900,consecutiveDutyDays:7,daysOff28:7,daysOff84:24,twoConsecutiveDaysOffOK:true,daysOffYear:rule==='CAT'?96:undefined});ok(r.legal,`${rule} equal limits legal`);r=E.cumulative(rule,{d7:L[0]+.01,d14:0,d28:0,d12:0,f28:0,f12:0,consecutiveDutyDays:0,daysOff28:7,daysOff84:24,twoConsecutiveDaysOffOK:true,daysOffYear:rule==='CAT'?96:undefined});ok(!r.legal,`${rule} d7 over illegal`)}
const inp={acc:true,reportMin:420,sectors:2,precedingRestHours:12,longestSectorHours:0,longSectorCount:0};const before=JSON.stringify(inp);const n=E.tableLimit({...inp,rule:'NCC'}),c=E.tableLimit({...inp,rule:'CAT'});ok(JSON.stringify(inp)===before,'ruleset switch does not mutate inputs');eq(n.max,15.25,'NCC switch limit');eq(c.max,13.25,'CAT switch limit');
const repBands=[360,420,780,1080,1320];
for(const rule of ['NCC','CAT'])for(const acc of [true,false])for(const reportMin of repBands)for(let sectors=1;sectors<=8;sectors++){
  const rests=acc?[12]:[18,24,30.001];
  for(const precedingRestHours of rests){
    const longSet=rule==='NCC'?[0,9,9+1/60,11,11+1/60]:[0,7,7+1/60,9,9+1/60,11,11+1/60];
    for(const longestSectorHours of longSet){
      const longSectorCount=longestSectorHours>0?1:0;
      if(longSectorCount>sectors)continue;
      const t=E.tableLimit({rule,acc,reportMin,sectors,precedingRestHours,longestSectorHours,longSectorCount});
      if(rule==='CAT'&&!acc&&longestSectorHours>11){ok(t.notApplicable,`cross ${rule} nonacc >11 N/A`);continue;}
      ok(t.ok,`cross table ${rule} ${acc} ${reportMin} ${sectors} ${precedingRestHours} ${longestSectorHours}`);
      if(!t.ok)continue;
      for(const ext of [
        {type:'none'},
        {type:'relief',restHours:3,facility:'bunk',qualified:true,facilityQualified:true},
        {type:'relief',restHours:3,facility:'seat',qualified:true,facilityQualified:true},
        {type:'split',groundIntervalHours:4+E.TABLES[rule].splitExcludedMin,excludedDutyHours:E.TABLES[rule].splitExcludedMin,facilityQualified:true}
      ]){
        const ev=E.evaluate({rule,acc,reportMin,sectors,precedingRestHours,longestSectorHours,longSectorCount,extension:ext,plannedFDPHours:0});
        ok(Number.isFinite(ev.maxFDPHours),`cross finite ${rule}/${acc}/${reportMin}/${sectors}/${longestSectorHours}/${ext.type}`);
        if(ext.type==='relief') ok(ev.maxFDPHours<=E.TABLES[rule].reliefCaps[ext.facility]+1e-9,`cross relief cap ${rule}/${ext.facility}`);
        const exact=E.evaluate({rule,acc,reportMin,sectors,precedingRestHours,longestSectorHours,longSectorCount,extension:ext,plannedFDPHours:ev.maxFDPHours});
        ok(exact.legal,`planned exactly max legal ${rule}`);
        const over=E.evaluate({rule,acc,reportMin,sectors,precedingRestHours,longestSectorHours,longSectorCount,extension:ext,plannedFDPHours:ev.maxFDPHours+0.01});
        ok(!over.legal,`planned over max not legal ${rule}`);
      }
    }
  }
}
console.log(JSON.stringify({pass,fail,errors:errs.slice(0,30)},null,2));if(fail)process.exit(1);

r=E.evaluate({rule:'CAT',acc:false,reportMin:540,sectors:2,precedingRestHours:12,longestSectorHours:11,longSectorCount:1,extension:{type:'none'}});
ok(r.intrinsicallyIllegal,'CAT non-acclim 11h sector should be intrinsically illegal when min known FDP exceeds max');
eq(r.minimumKnownFDP,12,'CAT 11h sector + 1h report minimum known FDP');
eq(r.maxFDPHours,10,'CAT non-acclim 11h one long sector in 2-sector duty yields 10h max');
ok(!r.legal,'intrinsically illegal case must not be legal');

(() => {
  'use strict';
  document.querySelectorAll('.bar-completion[data-completion]').forEach(setup);
  document.querySelectorAll('.bar-completion[data-builder]').forEach(setupRhythmBuilder);
  function setupRhythmBuilder(root) {
    if (!window.completionValues || !window.completionGlyphs) return;
    const capacity=48,barWidth=480,barStart=58,scoreWidth=1030;
    const bars=[[],[]],ties=new Set();let selectedPosition=null,selectedTieNote=null,nextId=1;
    const available=window.completionValues.filter(value=>['n4','n2','n1','n8','n16','r4','r2','r1','r8'].includes(value.id))
      .map(value=>({...value,units:value.units*3,rest:value.id.startsWith('r')}));
    available.push({id:'r16',name:'Sechzehntelpause',units:3,rest:true,code:'E4E7'});
    const glyphCode=value=>value.code||(value.rest?{48:'E4E3',24:'E4E4',12:'E4E5',6:'E4E6',3:'E4E7'}:{48:'E1D2',24:'E1D3',12:'E1D5',6:'E1D7',3:'E1D9'})[value.units];
    root.innerHTML=`<p>Wähle zuerst im Takt einen Schlag und eine Unterteilung. Klicke danach auf den gewünschten Notenwert oder die Pause. An einer bereits belegten Position ersetzt der neue Wert das vorhandene Zeichen. An den Positionen tri und ol werden Achtelnote und Achtelpause automatisch als Triolenwerte gesetzt. Zeichen dürfen sich nicht überlappen; jeder Takt umfasst höchstens vier Schläge.</p><div class="builder-score-wrap"><div class="builder-score"></div></div><div class="builder-position-bars" aria-label="Schlag und Unterteilung wählen"></div><p class="builder-selection" role="status" aria-live="polite">Wähle zuerst eine Position im Takt.</p><div class="builder-palette" role="group" aria-label="Notenwerte, Pausen und Haltebogen einsetzen"></div><section class="builder-ties"><h4>Haltebögen</h4><p>Klicke oben eine Note als Anfang an. Klicke dann auf das Haltebogen-Symbol in der Palette, um sie mit der direkt folgenden Note zu verbinden. Erneutes Klicken entfernt den Bogen. Das funktioniert auch über den Taktstrich hinweg.</p></section><div class="builder-playback"><button type="button" data-builder-play>▶ Rhythmus abspielen</button><span data-builder-play-status role="status" aria-live="polite">40 BPM · Metronom und gehaltener Ton</span></div><div class="builder-actions"><button type="button" data-builder-clear>Alles löschen</button><span class="builder-status" role="status" aria-live="polite"></span></div><noscript>Aktiviere JavaScript, um eigene Rhythmen und Haltebögen zu setzen.</noscript>`;
    const score=root.querySelector('.builder-score'),positionBars=root.querySelector('.builder-position-bars'),palette=root.querySelector('.builder-palette'),status=root.querySelector('.builder-status'),selection=root.querySelector('.builder-selection'),ns='http://www.w3.org/2000/svg';
    const subdivisions=[{offset:0,label:'1',spoken:'Zahl 1'},{offset:3,label:'e',spoken:'e'},{offset:4,label:'tri',spoken:'tri'},{offset:6,label:'&',spoken:'und'},{offset:8,label:'ol',spoken:'ol'},{offset:9,label:'a',spoken:'a'}];
    const playButton=root.querySelector('[data-builder-play]'),playStatus=root.querySelector('[data-builder-play-status]');
    let audioContext=null,scheduledSounds=[],playTimer=null,playing=false;
    function stopPlayback(){scheduledSounds.forEach(sound=>{try{sound.stop();}catch{}});scheduledSounds=[];if(playTimer)clearTimeout(playTimer);playTimer=null;playing=false;playButton.textContent='▶ Rhythmus abspielen';playStatus.textContent='40 BPM · Metronom und gehaltener Ton';}
    playButton.addEventListener('click',async()=>{
      if(playing){stopPlayback();return;}
      const events=allEvents().filter(event=>!event.value.rest);
      if(!events.length){playStatus.textContent='Setze zuerst mindestens eine Note in den Takten.';return;}
      const AudioContextClass=window.AudioContext||window.webkitAudioContext;
      if(!AudioContextClass){playStatus.textContent='Audio-Wiedergabe wird von diesem Browser nicht unterstützt.';return;}
      if(!audioContext)audioContext=new AudioContextClass();
      try{await audioContext.resume();}catch{playStatus.textContent='Audio konnte nicht gestartet werden.';return;}
      const start=audioContext.currentTime+.12,secondsPerUnit=60/40/12,totalDuration=capacity*2*secondsPerUnit;
      const tiePairs=new Set([...ties]),tiedTo=new Map(),tiedFrom=new Set();
      tiePairs.forEach(key=>{const [from,to]=key.split('|');tiedTo.set(from,to);tiedFrom.add(to);});
      events.forEach(event=>{if(tiedFrom.has(event.id))return;let endUnit=event.absolute+event.value.units,next=tiedTo.get(event.id),guard=0;while(next&&guard++<events.length){const following=events.find(item=>item.id===next);if(!following)break;endUnit=following.absolute+following.value.units;next=tiedTo.get(next);}const begin=start+event.absolute*secondsPerUnit,end=start+endUnit*secondsPerUnit;
        const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='sine';osc.frequency.setValueAtTime(261.63,begin);gain.gain.setValueAtTime(.0001,begin);gain.gain.linearRampToValueAtTime(.28,begin+.006);gain.gain.setValueAtTime(.28,Math.max(begin+.007,end-.04));gain.gain.linearRampToValueAtTime(.0001,Math.max(begin+.03,end));osc.connect(gain);gain.connect(audioContext.destination);osc.start(begin);osc.stop(end+.01);scheduledSounds.push(osc);
        const attack=audioContext.createOscillator(),attackGain=audioContext.createGain();attack.type='triangle';attack.frequency.setValueAtTime(880,begin);attackGain.gain.setValueAtTime(.0001,begin);attackGain.gain.linearRampToValueAtTime(.16,begin+.003);attackGain.gain.exponentialRampToValueAtTime(.0001,begin+.075);attack.connect(attackGain);attackGain.connect(audioContext.destination);attack.start(begin);attack.stop(begin+.08);scheduledSounds.push(attack);
      });
      for(let beat=0;beat<8;beat++){const at=start+beat*12*secondsPerUnit,osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='sine';osc.frequency.setValueAtTime(beat%4===0?1050:760,at);gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(beat%4===0?.11:.075,at+.004);gain.gain.exponentialRampToValueAtTime(.0001,at+.055);osc.connect(gain);gain.connect(audioContext.destination);osc.start(at);osc.stop(at+.06);scheduledSounds.push(osc);}
      playing=true;playButton.textContent='■ Wiedergabe stoppen';playStatus.textContent='Spielt mit 40 BPM …';playTimer=setTimeout(()=>{scheduledSounds=[];playing=false;playButton.textContent='▶ Rhythmus abspielen';playStatus.textContent='Wiedergabe beendet · 40 BPM';},(totalDuration+.25)*1000);
    });
    function selectPosition(bar,beat,offset,label){selectedPosition={bar,beat,offset,label};selectedTieNote=null;selection.textContent=`Takt ${bar+1}, Schlag ${beat+1} · ${label==='1'?String(beat+1):label} ausgewählt. Klicke jetzt auf einen Notenwert oder eine Pause.`;drawPositions();drawScore();}
    available.forEach(value=>{
      const button=document.createElement('button');button.type='button';button.innerHTML=`${value.svg||`<svg viewBox="-12 -85 78 120" aria-hidden="true"><path d="${window.completionGlyphs[glyphCode(value)]}" transform="scale(.8 -.8)" fill="currentColor"/></svg>`}<span>${value.name}</span>`;
      button.addEventListener('click',()=>{
        if(!selectedPosition){selection.textContent='Wähle zuerst im Takt einen Schlag und eine Unterteilung aus.';return;}
        const {bar,beat,offset}=selectedPosition,onset=beat*12+offset,events=bars[bar];
        const eighthOrRest=['n8','r8'].includes(value.id),tripletSlot=offset===4||offset===8;
        const startEvent=tripletSlot&&eighthOrRest?events.find(event=>event.onset===beat*12&&!event.value.triplet&&['n8','r8'].includes(event.value.id)):null;
        const tripletContext=events.some(event=>Math.floor(event.onset/12)===beat&&event.value.triplet);
        const placedValue=eighthOrRest&&(tripletSlot||offset===0&&tripletContext)
          ? {...value,units:4,triplet:true,name:value.rest?'Triolenachtelpause':'Triolenachtelnote',code:value.rest?'E4E6':'E1D7'}
          : value;
        const existing=events.find(event=>event.onset===onset),otherEvents=events.filter(event=>event.onset!==onset),overlap=otherEvents.some(event=>onset<event.onset+(event===startEvent?4:event.value.units)&&onset+placedValue.units>event.onset);
        if(onset+placedValue.units>capacity){selection.textContent=`${placedValue.name} passt an dieser Stelle nicht bis zum Ende von Takt ${bar+1}. Wähle eine frühere Position oder einen kürzeren Wert.`;return;}
        if(overlap){selection.textContent=`${placedValue.name} würde ein benachbartes Zeichen überdecken. Wähle eine andere Position oder einen kürzeren Wert.`;return;}
        if(startEvent)startEvent.value={...startEvent.value,units:4,triplet:true,name:startEvent.value.rest?'Triolenachtelpause':'Triolenachtelnote',code:startEvent.value.rest?'E4E6':'E1D7'};
        bars[bar]=otherEvents;bars[bar].push({id:`note-${nextId++}`,value:placedValue,onset});bars[bar].sort((a,b)=>a.onset-b.onset);selectedPosition=null;selectedTieNote=null;selection.textContent=existing?`${placedValue.name} eingesetzt und das bisherige Zeichen ersetzt.`:`${placedValue.name} eingesetzt.`;selection.textContent+=' Wähle die nächste Position im Takt.';drawPositions();drawScore();
      });palette.append(button);
    });
    const tieButton=document.createElement('button');tieButton.type='button';tieButton.className='builder-tie-symbol';tieButton.innerHTML='<svg viewBox="0 0 48 28" aria-hidden="true"><path d="M4 6C13 24 35 24 44 6" fill="none" stroke="currentColor" stroke-width="2.5"/></svg><span>Haltebogen</span>';tieButton.addEventListener('click',()=>{
      if(!selectedTieNote){selection.textContent='Klicke zuerst oben auf eine Note, die du mit der folgenden Note verbinden möchtest.';return;}
      const events=allEvents(),index=events.findIndex(event=>event.id===selectedTieNote),start=events[index],end=events[index+1];
      if(!start||start.value.rest){selection.textContent='Wähle eine Note aus; Pausen können nicht mit einem Haltebogen verbunden werden.';return;}
      if(!end||end.value.rest||start.absolute+start.value.units!==end.absolute){selection.textContent='Auf die ausgewählte Note folgt keine direkt anschließende Note zum Verbinden.';return;}
      const key=`${start.id}|${end.id}`;if(ties.has(key)){ties.delete(key);selection.textContent='Haltebogen entfernt.';}else{ties.add(key);selection.textContent='Haltebogen zur folgenden Note gesetzt.';}drawScore();
    });palette.append(tieButton);
    function allEvents(){return bars.flatMap((events,barIndex)=>events.map(event=>({...event,barIndex,absolute:barIndex*capacity+event.onset}))).sort((a,b)=>a.absolute-b.absolute);}
    function drawPositions(){positionBars.replaceChildren();bars.forEach((_,barIndex)=>{
      const card=document.createElement('section');card.className='builder-bar';const heading=document.createElement('h5');heading.textContent=`Takt ${barIndex+1} · Position wählen`;card.append(heading);
      const beats=document.createElement('div');beats.className='builder-beats';
      for(let beat=0;beat<4;beat++){
        const beatGroup=document.createElement('div');beatGroup.className='builder-beat';const title=document.createElement('strong');title.textContent=`Schlag ${beat+1}`;beatGroup.append(title);
        const row=document.createElement('div');row.className='builder-subdivisions';
        subdivisions.forEach(({offset,label,spoken})=>{const button=document.createElement('button');button.type='button';const onset=beat*12+offset,occupant=bars[barIndex].find(event=>event.onset===onset);button.textContent=occupant?`${label} •`:label;const active=selectedPosition?.bar===barIndex&&selectedPosition.beat===beat&&selectedPosition.offset===offset;button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',`Takt ${barIndex+1}, Schlag ${beat+1}, Position ${spoken}${occupant?`, belegt mit ${occupant.value.name}; auswählen zum Ersetzen`:''}`);if(occupant)button.classList.add('is-occupied');button.addEventListener('click',()=>selectPosition(barIndex,beat,offset,label));row.append(button);});
        beatGroup.append(row);beats.append(beatGroup);
      }
      card.append(beats);positionBars.append(card);
    });}
    function drawScore(){
      score.replaceChildren();const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${scoreWidth} 150`);svg.setAttribute('role','img');svg.setAttribute('aria-label','Dein Rhythmus in zwei 4/4-Takten.');
      const path=(d,w=1.5)=>{const el=document.createElementNS(ns,'path');el.setAttribute('d',d);el.setAttribute('fill','none');el.setAttribute('stroke','currentColor');el.setAttribute('stroke-width',w);el.setAttribute('pointer-events','none');svg.append(el);};
      path(`M${barStart} 102H${barStart+barWidth*2}`,1);path(`M${barStart} 82V121 M${barStart+barWidth} 82V121 M${barStart+barWidth*2} 82V121`,1.5);
      for(let bar=0;bar<2;bar++){const x=barStart+bar*barWidth;if(bar===0)[['4',94],['4',112]].forEach(([number,y])=>{const t=document.createElementNS(ns,'text');t.setAttribute('x',String(x-35));t.setAttribute('y',String(y));t.setAttribute('font-size','18');t.setAttribute('font-weight','bold');t.textContent=number;svg.append(t);});for(let beat=0;beat<4;beat++){const t=document.createElementNS(ns,'text');t.setAttribute('x',String(x+beat*120+10));t.setAttribute('y','22');t.setAttribute('text-anchor','middle');t.setAttribute('font-size','14');t.textContent=String(beat+1);svg.append(t);}}
      const events=allEvents(),groups=[];events.forEach((event,index)=>{if(event.value.rest||event.value.units>6||Math.floor(event.onset/12)!==Math.floor((event.onset+event.value.units-1)/12))return;const prev=groups[groups.length-1];if(prev&&prev[prev.length-1]===index-1&&events[prev[0]].barIndex===event.barIndex&&Math.floor(events[prev[0]].onset/12)===Math.floor(event.onset/12)&&events[prev[prev.length-1]].absolute+events[prev[prev.length-1]].value.units===event.absolute&&!!events[prev[0]].value.triplet===!!event.value.triplet)prev.push(index);else groups.push([index]);});
      const beamed=new Set(groups.filter(group=>group.length>1).flat());events.forEach((event,index)=>{
        const x=barStart+event.absolute*10+3,hit=document.createElementNS(ns,'rect');hit.setAttribute('x',String(x-2));hit.setAttribute('y','93');hit.setAttribute('width','27');hit.setAttribute('height','26');hit.setAttribute('fill','transparent');hit.setAttribute('tabindex','0');hit.setAttribute('role','button');hit.setAttribute('aria-label',`${event.value.name} in Takt ${event.barIndex+1}, Schlag ${Math.floor(event.onset/12)+1} als Anfang für einen Haltebogen auswählen`);hit.style.cursor='pointer';const selectTieStart=()=>{selectedTieNote=event.id;selectedPosition=null;selection.textContent=`Note in Takt ${event.barIndex+1}, Schlag ${Math.floor(event.onset/12)+1} ausgewählt. Klicke auf das Haltebogen-Symbol in der Notenpalette.`;drawPositions();drawScore();};hit.addEventListener('click',selectTieStart);hit.addEventListener('keydown',key=>{if(key.key==='Enter'||key.key===' '){key.preventDefault();selectTieStart();}});svg.append(hit);
        const code=beamed.has(index)?'E0A4':glyphCode(event.value),note=document.createElementNS(ns,'path'),symbolBaseline=event.value.id==='r2'?124:event.value.id==='r4'?123:event.value.rest?102:123;note.setAttribute('d',window.completionGlyphs[code]);note.setAttribute('transform',`translate(${x} ${symbolBaseline}) scale(.52 -.52)`);note.setAttribute('fill','currentColor');note.setAttribute('pointer-events','none');svg.append(note);
        if(beamed.has(index))path(`M${x+11.3} 102V66`,1.5);
      });
      groups.filter(group=>group.length>1).forEach(group=>{
        const x1=barStart+events[group[0]].absolute*10+13.6,x2=barStart+events[group[group.length-1]].absolute*10+15;
        path(`M${x1} 66H${x2}`,4.5);
        for(let i=0;i<group.length;i++){
          if(events[group[i]].value.units!==3)continue;
          let end=i;
          while(end+1<group.length&&events[group[end+1]].value.units===3)end++;
          const startX=barStart+events[group[i]].absolute*10+14.3;
          if(end>i){const endX=barStart+events[group[end]].absolute*10+14.3;path(`M${startX} 74H${endX}`,4.5);}
          else {
            const direction=i===0?1:i===group.length-1?-1:events[group[i]].onset%6===0?1:-1;
            const neighborX=barStart+events[group[i+direction]].absolute*10+14.3;
            const partialEnd=startX+direction*Math.min(18,Math.abs(neighborX-startX)*.45);
            path(`M${startX} 74L${partialEnd} 74`,4.5);
          }
          i=end;
        }
      });
      const tripletBeats=[...new Set(events.filter(event=>event.value.triplet).map(event=>event.barIndex*4+Math.floor(event.onset/12)))];
      tripletBeats.forEach(beatIndex=>{const members=events.filter(event=>event.barIndex*4+Math.floor(event.onset/12)===beatIndex&&event.value.triplet);const left=barStart+members[0].absolute*10+6,right=barStart+members[members.length-1].absolute*10+25,mid=(left+right)/2;path(`M${left} 60V56H${right}V60`,1);const label=document.createElementNS(ns,'text');label.setAttribute('x',String(mid));label.setAttribute('y','54');label.setAttribute('text-anchor','middle');label.setAttribute('font-size','12');label.textContent='3';svg.append(label);});
      const validPairs=[];for(let i=0;i<events.length-1;i++)if(!events[i].value.rest&&!events[i+1].value.rest&&events[i].absolute+events[i].value.units===events[i+1].absolute)validPairs.push([events[i],events[i+1]]);
      const valid=new Set(validPairs.map(([a,b])=>`${a.id}|${b.id}`));[...ties].forEach(key=>{if(!valid.has(key))ties.delete(key);});ties.forEach(key=>{const [aId,bId]=key.split('|'),a=events.find(item=>item.id===aId),b=events.find(item=>item.id===bId);if(a&&b){const startX=barStart+a.absolute*10+20,endX=barStart+b.absolute*10+3;path(`M${startX} 108Q${(startX+endX)/2} 132 ${endX} 108`,2.4);}});
      if(selectedPosition){const x=barStart+selectedPosition.bar*barWidth+(selectedPosition.beat*12+selectedPosition.offset)*10+15;path(`M${x} 27V117`,1.5);const dot=document.createElementNS(ns,'circle');dot.setAttribute('cx',String(x));dot.setAttribute('cy','102');dot.setAttribute('r','5');dot.setAttribute('fill','#c44929');svg.append(dot);}
      score.append(svg);
      const beatCount=units=>{const whole=Math.floor(units/12),rem=units%12,part={3:'¼',4:'⅓',6:'½',8:'⅔',9:'¾'}[rem]||(rem?`${rem}/12`:'');return `${whole||''}${part}`||'0';};
      const used=bars.map(events=>events.reduce((sum,event)=>sum+event.value.units,0));status.textContent=`Takt 1: ${beatCount(used[0])} von 4 Schlägen belegt · Takt 2: ${beatCount(used[1])} von 4 Schlägen belegt.`;
    }
    root.querySelector('[data-builder-clear]').addEventListener('click',()=>{stopPlayback();bars[0].length=0;bars[1].length=0;ties.clear();selectedPosition=null;selectedTieNote=null;selection.textContent='Wähle zuerst eine Position im Takt.';drawPositions();drawScore();});
    drawPositions();drawScore();
  }
  function setup(root) {
  const config = window.completionExercises?.[root.dataset.completion];
  if (!config || !window.completionValues) return;
  const values = window.completionValues
    .filter(value => (config.rests || value.id.startsWith('n')) && (config.course > 1 || value.units >= 2))
    .map(value => ({...value, units: value.units * 3, rest: value.id.startsWith('r')}));
  if (config.rests && config.course > 1) values.push({id:'r16', name:'Sechzehntelpause', units:3, rest:true, code:'E4E7'});
  if (config.course === 3) {
    values.push({id:'nt',name:'Triolenachtelnote',units:4,triplet:true,code:'E1D7'});
    if (config.rests) values.push({id:'rt',name:'Triolenachtelpause',units:4,triplet:true,rest:true,code:'E4E6'});
  }
  const bars = config.gaps.map(gap => ({...gap, notes:[]}));
  // Beam short notes within each quarter beat; never across a beat boundary.
  function notation(bar, requestedWidth, editable) {
    let cursor = bar.onset;
    const notes = bar.notes.map(value => {
      const note = {value, onset: cursor, end: cursor + value.units};
      cursor = note.end;
      return note;
    });
    const origin = bar.onset;
    const capacity = bar.duration;
    const length = Math.max(capacity, cursor - origin);
    // The source score uses 94 SVG units per quarter beat. Keep its
    // geometry fixed: a gap starts 3 units before the first note origin.
    // Never shrink or redistribute notes to fit the number of entries.
    const unit = editable ? 12 : config.step;
    const width = editable ? Math.max(requestedWidth, length * unit + 16) : requestedWidth;
    notes.forEach(note => { note.x = 3 + (note.onset - origin) * unit; });
    const groups = [];
    notes.forEach((note, index) => {
      if (note.value.rest || note.value.units > 6 || Math.floor(note.onset / 12) !== Math.floor((note.end - 1) / 12)) return;
      const previous = groups[groups.length - 1];
      if (previous && previous[previous.length - 1] === index - 1 && Math.floor(notes[previous[0]].onset / 12) === Math.floor(note.onset / 12) && !!notes[previous[0]].value.triplet === !!note.value.triplet) previous.push(index);
      else groups.push([index]);
    });
    const beamed = new Set(groups.filter(group => group.length > 1).flat());
    const glyphs = window.completionGlyphs;
    let body = `<path d="M0 44H${width}" stroke="currentColor" stroke-width="1"/>`;
    notes.forEach((note, index) => {
      const code = beamed.has(index) ? 'E0A4' : note.value.code || (note.value.rest ? {48:'E4E3',24:'E4E4',12:'E4E5',6:'E4E6',3:'E4E7'} : {48:'E1D2',24:'E1D3',12:'E1D5',6:'E1D7',3:'E1D9'})[note.value.units];
      body += `<g ${editable ? `data-note="${index}" role="button" tabindex="0" aria-label="${index + 1}. Zeichen: ${note.value.name} entfernen"` : ''}>`;
      if (editable) body += `<rect class="completion-hit" x="${note.x-2}" y="0" width="${Math.max(18,note.value.units*unit)}" height="70" fill="transparent"/>`;
      body += `<path data-onset="${note.onset}" data-smufl="${code}" transform="translate(${note.x} 64.8) scale(.52 -.52)" fill="currentColor" d="${glyphs[code]}"/>`;
      if (beamed.has(index)) body += `<path d="M${note.x+11.3} 44V6" stroke="currentColor" stroke-width="1.5"/>`;
      body += '</g>';
    });
    const beam = (x1, x2, level) => `<path data-beam-level="${level}" d="M${x1} ${level === 1 ? 6 : 15}H${x2}" stroke="currentColor" stroke-width="4.5" pointer-events="none"/>`;
    groups.filter(group => group.length > 1).forEach(group => {
      body += beam(notes[group[0]].x+10.6, notes[group[group.length-1]].x+12, 1);
      for (let i=0; i<group.length; i++) {
        if (notes[group[i]].value.units !== 3) continue;
        let end=i;
        while (end+1<group.length && notes[group[end+1]].value.units===3) end++;
        const x=notes[group[i]].x+11.3;
        if (end>i) body += beam(x-.7, notes[group[end]].x+12, 2);
        else {
          const direction = i===0 ? 1 : i===group.length-1 ? -1 : notes[group[i]].onset%6===0 ? 1 : -1;
          const neighbor=notes[group[i+direction]].x+11.3;
          body += beam(x, x+direction*Math.min(10,Math.abs(neighbor-x)*.45), 2);
        }
        i=end;
      }
    });
    const tripletBeats = [...new Set(notes.filter(n=>n.value.triplet).map(n=>Math.floor(n.onset/12)))];
    tripletBeats.forEach(beat => {
      const members = notes.filter(n=>n.value.triplet && Math.floor(n.onset/12)===beat);
      const left = members[0].x-2, right = members[members.length-1].x+16;
      body += `<path data-triplet-bracket="true" d="M${left} 2V-4H${right}V2" fill="none" stroke="currentColor"/><text x="${(left+right)/2}" y="-7" text-anchor="middle" font-family="Arial" font-size="11">3</text>`;
    });
    const dy = editable ? 18 : bar.baseline-44;
    const height = editable ? 92 : bar.height;
    return `<svg class="completion-notation" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" ${editable ? `width="${width}" height="${height}" role="group" aria-label="Deine Ergänzung; zum Entfernen anklicken"` : 'aria-hidden="true"'}><g transform="translate(0 ${dy})">${body}</g></svg>`;

  }

  let active = 0;
const figure = root.previousElementSibling;
const link = figure.querySelector('a');
const score = document.createElement('div');
score.className = 'completion-score';
link.replaceWith(score);
score.append(link.querySelector('img'));
const dialog = document.createElement('dialog');
dialog.className = 'completion-dialog bar-completion';
dialog.setAttribute('aria-label', 'Lücke ergänzen');
const close = document.createElement('button');
close.type = 'button'; close.className = 'completion-close'; close.textContent = 'Fertig · Schließen ×';
dialog.append(close, root.querySelector('.completion-palette'), root.querySelector('.completion-bars'));
root.append(dialog);
let opener;
close.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
dialog.addEventListener('close', () => opener?.focus({preventScroll:true}));
const positions = config.gaps.map(gap => [gap.x,gap.y,gap.width,gap.height]);
const gaps = positions.map(([x,y,w,h], index) => {
  const button = document.createElement('button'); button.type = 'button'; button.className = 'completion-gap';
  button.style.cssText = `left:${x/config.width*100}%;top:${y/config.height*100}%;width:${w/config.width*100}%;height:${h/config.height*100}%;`;
  button.setAttribute('aria-haspopup','dialog');
  button.addEventListener('click', () => {select(index); opener=button; dialog.showModal(); dialog.querySelector('.completion-palette button').focus();});
  score.append(button); return button;
});
function updateGap(index) {
  const bar=bars[index], button=gaps[index];
  button.replaceChildren();
  if (!bar.notes.length) button.textContent='?';
  else button.innerHTML = notation(bar, positions[index][2], false);
  button.setAttribute('aria-label', `Takt ${bar.bar}: Lücke ${bar.notes.length ? 'bearbeiten. '+bar.notes.map(v=>v.name).join(', ') : 'ergänzen'}`);
  button.dataset.result=bar.correct ? 'correct' : '';
}
  const container = root.querySelector('.completion-bars');
  const summary = root.querySelector('.completion-summary');
  const beats = units => {
    const whole=Math.floor(units/12), remainder=units%12;
    if (!remainder) return String(whole);
    const gcd=(a,b)=>b?gcd(b,a%b):a, divisor=gcd(remainder,12);
    const fraction={3:'¼',4:'⅓',6:'½',8:'⅔',9:'¾'}[remainder] || `${remainder/divisor}/${12/divisor}`;
    return `${whole || ''}${fraction}`;
  };
  function select(index) {
    active = index;

    container.querySelectorAll('.completion-bar').forEach((card, i) => card.hidden = i !== index);
  }
  function render(index) {
    const bar = bars[index];
    const card = container.children[index];
    const sequence = card.querySelector('.completion-sequence');
    sequence.replaceChildren();
    if (!bar.notes.length) {
      const empty = document.createElement('p');
      empty.textContent = 'Deine Ergänzung erscheint hier.';
      sequence.append(empty);
    }
if (bar.notes.length) {
  sequence.innerHTML = notation(bar, Math.max(180, bar.notes.length * 40), true);
  sequence.querySelectorAll('[data-note]').forEach(button => {
    const remove = () => {
      const n = Number(button.dataset.note);
      bar.notes.splice(n, 1); render(index);
      const remaining = sequence.querySelectorAll('[data-note]');
      (remaining[Math.min(n, remaining.length - 1)] || card.querySelector('[data-check]')).focus();
    };
    button.addEventListener('click', remove);
    button.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); remove();}
    });
  });
}
    card.querySelector('.completion-feedback').textContent = '';
    card.querySelector('.completion-feedback').removeAttribute('data-result');
    card.querySelector('[data-clear]').disabled = !bar.notes.length;
    bar.correct = false;
    summary.textContent = '';
    updateGap(index);
  }
  bars.forEach((bar, index) => {

    const card = document.createElement('div');
    card.className = 'completion-bar';
    card.innerHTML = `<h6>Takt ${bar.bar} · Lücke ergänzen</h6><div class="completion-sequence" role="group" aria-label="Deine Ergänzung für Takt ${bar.bar}"></div><p class="completion-hint">Klicke auf ein eingesetztes Zeichen, um es zu entfernen.</p><div class="completion-actions"><button type="button" data-check>Lücke prüfen</button><button type="button" data-clear>Ergänzung löschen</button></div><p class="completion-feedback" role="status" aria-live="polite"></p>`;
    container.append(card);
    card.querySelector('[data-clear]').addEventListener('click', () => {bar.notes = []; render(index); card.querySelector('[data-check]').focus();});
    card.querySelector('[data-check]').addEventListener('click', () => {
      const feedback = card.querySelector('.completion-feedback');
      if (!bar.notes.length) {feedback.textContent = 'Füge zuerst Zeichen für die Lücke hinzu.'; return;}
      const total = bar.notes.reduce((sum, value) => sum + value.units, 0);
      const delta = total - bar.duration;
      let onset=bar.onset;
      const timeline=bar.notes.map(value=>{const item={value,onset};onset+=value.units;return item;});
      const triBeats=[...new Set(timeline.filter(n=>n.value.triplet).map(n=>Math.floor(n.onset/12)))];
      const invalid = triBeats.some(beat=>{
        const group=timeline.filter(n=>Math.floor(n.onset/12)===beat);
        return group.length!==3 || group.some((n,i)=>!n.value.triplet || n.onset!==beat*12+i*4);
      }) || timeline.some(n=>!n.value.triplet && n.onset%3!==0);
      if (!delta && invalid) {
        bar.correct=false;updateGap(index);
        feedback.dataset.result='retry';
        feedback.textContent='Die Dauer stimmt. Fasse die Triolen aber zu vollständigen Dreiergruppen innerhalb eines Viertelschlags zusammen.';
        return;
      }
      bar.correct = delta === 0;
      updateGap(index);
      feedback.dataset.result = bar.correct ? 'correct' : 'retry';
      feedback.textContent = bar.correct
        ? 'Richtig! Deine Ergänzung passt genau in diese Lücke.'
        : `Deine Ergänzung hat ${beats(total)} Schläge. ${delta < 0 ? `Es fehlen noch ${beats(-delta)} Schläge.` : `Das sind ${beats(delta)} Schläge zu viel.`} Passe deine Ergänzung an.`;
      if (bars.every(b => b.correct)) summary.textContent = 'Geschafft! Alle Lücken dieser Aufgabe sind richtig ergänzt.';
    });
    render(index);
  });
  values.forEach(value => {
    const button = document.createElement('button'); button.type = 'button';
    const icon = value.svg || `<svg viewBox="-12 -85 78 120" aria-hidden="true"><path transform="scale(.8 -.8)" d="${window.completionGlyphs[value.code]}" fill="currentColor"/>${value.triplet ? '<text x="30" y="-64" text-anchor="middle" font-size="17">3</text>' : ''}</svg>`;
    button.innerHTML = `${icon}<span>${value.name}</span>`;
    button.addEventListener('click', () => {
      if (bars[active].notes.length >= 32) {summary.textContent = 'Entferne erst ein Zeichen, bevor du weitere hinzufügst.'; return;}
      bars[active].notes.push(value); render(active);
    });
    root.querySelector('.completion-palette').append(button);
  });
  select(0);
  }
})();

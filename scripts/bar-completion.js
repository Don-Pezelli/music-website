(() => {
  'use strict';
  let completionHelpTooltipId = 0;
  document.querySelectorAll('.bar-completion[data-completion]').forEach(root => {
    if (root.dataset.interaction === 'bar-editor') setupBarEditor(root);
    else setup(root);
  });
  document.querySelectorAll('.bar-completion[data-builder]').forEach(setupRhythmBuilder);
  function setupRhythmBuilder(root) {
    if (!window.completionValues || !window.completionGlyphs) return;
    const capacity=48,barWidth=480,barStart=58,scoreWidth=1030;
    const bars=[[],[]],ties=new Set(),accents=new Set();const accentEnabled=root.hasAttribute("data-accents"),dotEnabled=root.hasAttribute("data-dotting");let selectedPosition=null,selectedTieNote=null,nextId=1;
    const available=window.completionValues.filter(value=>['n4','n2','n1','n8','n16','r4','r2','r1','r8'].includes(value.id))
      .map(value=>({...value,units:value.units*3,rest:value.id.startsWith('r')}));
    available.push({id:'r16',name:'Sechzehntelpause',units:3,rest:true,code:'E4E7'});
    if(dotEnabled)available.push({id:'n2d',name:'Punktierte halbe Note',units:36,rest:false,code:'E1D3',dotted:true},{id:'n1d',name:'Punktierte Viertelnote',units:18,rest:false,code:'E1D5',dotted:true},{id:'n8d',name:'Punktierte Achtelnote',units:9,rest:false,code:'E1D7',dotted:true});
    const glyphCode=value=>value.code||(value.rest?{48:'E4E3',24:'E4E4',12:'E4E5',6:'E4E6',3:'E4E7'}:{48:'E1D2',24:'E1D3',12:'E1D5',6:'E1D7',3:'E1D9'})[value.units];
    root.innerHTML=`<p>Wähle zuerst im Takt einen Schlag und eine Unterteilung. Klicke danach auf den gewünschten Notenwert oder die Pause.${dotEnabled?' Auch punktierte halbe, Viertel- und Achtelnoten kannst du direkt aus der Notenpalette einsetzen.':''} An einer bereits belegten Position ersetzt der neue Wert das vorhandene Zeichen. An den Positionen tri und ol werden Achtelnote und Achtelpause automatisch als Triolenwerte gesetzt. Zeichen dürfen sich nicht überlappen; jeder Takt umfasst höchstens vier Schläge.</p><div class="builder-score-wrap"><div class="builder-score"></div></div><div class="builder-position-bars" aria-label="Schlag und Unterteilung wählen"></div><p class="builder-selection" role="status" aria-live="polite">Wähle zuerst eine Position im Takt.</p><div class="builder-palette" role="group" aria-label="${accentEnabled?'Notenwerte, Pausen, Haltebogen und Akzentzeichen einsetzen':'Notenwerte, Pausen und Haltebogen einsetzen'}"></div><section class="builder-ties"><h4>Haltebögen</h4><p>Klicke oben eine Note als Anfang an. Klicke dann auf das Haltebogen-Symbol in der Palette, um sie mit der direkt folgenden Note zu verbinden. Erneutes Klicken entfernt den Bogen. Das funktioniert auch über den Taktstrich hinweg.</p></section>${accentEnabled?'<section class="builder-accents"><h4>Akzentzeichen</h4><p>Klicke oben eine Note an und dann auf das Akzentzeichen. Es hebt die Note hervor, ohne ihre Dauer zu verändern. Erneutes Klicken entfernt den Akzent.</p></section>':''}<div class="builder-playback"><button type="button" data-builder-play>▶ Rhythmus abspielen</button><span data-builder-play-status role="status" aria-live="polite">40 BPM · Metronom und gehaltener Ton</span></div><div class="builder-actions"><button type="button" data-builder-clear>Alles löschen</button><span class="builder-status" role="status" aria-live="polite"></span></div><noscript>Aktiviere JavaScript, um eigene Rhythmen und Haltebögen zu setzen.</noscript>`;
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
        const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='sine';osc.frequency.setValueAtTime(261.63,begin);gain.gain.setValueAtTime(.0001,begin);const accented=accents.has(event.id),level=accented ? .38 : .28;gain.gain.linearRampToValueAtTime(level,begin+.006);gain.gain.setValueAtTime(level,Math.max(begin+.007,end-.04));gain.gain.linearRampToValueAtTime(.0001,Math.max(begin+.03,end));osc.connect(gain);gain.connect(audioContext.destination);osc.start(begin);osc.stop(end+.01);scheduledSounds.push(osc);
        const attack=audioContext.createOscillator(),attackGain=audioContext.createGain();attack.type='triangle';attack.frequency.setValueAtTime(880,begin);attackGain.gain.setValueAtTime(.0001,begin);attackGain.gain.linearRampToValueAtTime(accents.has(event.id) ? .32 : .16,begin+.003);attackGain.gain.exponentialRampToValueAtTime(.0001,begin+.075);attack.connect(attackGain);attackGain.connect(audioContext.destination);attack.start(begin);attack.stop(begin+.08);scheduledSounds.push(attack);
      });
      for(let beat=0;beat<8;beat++){const at=start+beat*12*secondsPerUnit,osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='sine';osc.frequency.setValueAtTime(beat%4===0?1050:760,at);gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(beat%4===0?.30:.22,at+.004);gain.gain.exponentialRampToValueAtTime(.0001,at+.065);osc.connect(gain);gain.connect(audioContext.destination);osc.start(at);osc.stop(at+.07);scheduledSounds.push(osc);}
      playing=true;playButton.textContent='■ Wiedergabe stoppen';playStatus.textContent='Spielt mit 40 BPM …';playTimer=setTimeout(()=>{scheduledSounds=[];playing=false;playButton.textContent='▶ Rhythmus abspielen';playStatus.textContent='Wiedergabe beendet · 40 BPM';},(totalDuration+.25)*1000);
    });
    function selectPosition(bar,beat,offset,label){selectedPosition={bar,beat,offset,label};selectedTieNote=null;selection.textContent=`Takt ${bar+1}, Schlag ${beat+1} · ${label==='1'?String(beat+1):label} ausgewählt. Klicke jetzt auf einen Notenwert oder eine Pause.`;drawPositions();drawScore();}
    available.forEach(value=>{
      const button=document.createElement('button');button.type='button';let icon=value.svg||`<svg viewBox="-12 -85 78 120" aria-hidden="true"><path d="${window.completionGlyphs[glyphCode(value)]}" transform="scale(.8 -.8)" fill="currentColor"/></svg>`;if(value.dotted)icon=icon.replace('</svg>','<circle cx="37" cy="-34" r="3" fill="currentColor"/></svg>');button.innerHTML=`${icon}<span>${value.name}</span>`;
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
      if(!selectedTieNote){selection.textContent='Klicke zuerst oben eine Note an und wähle dann Haltebogen oder Akzentzeichen.';return;}
      const events=allEvents(),index=events.findIndex(event=>event.id===selectedTieNote),start=events[index],end=events[index+1];
      if(!start||start.value.rest){selection.textContent='Wähle eine Note aus; Pausen können nicht mit einem Haltebogen verbunden werden.';return;}
      if(!end||end.value.rest||start.absolute+start.value.units!==end.absolute){selection.textContent='Auf die ausgewählte Note folgt keine direkt anschließende Note zum Verbinden.';return;}
      const key=`${start.id}|${end.id}`;if(ties.has(key)){ties.delete(key);selection.textContent='Haltebogen entfernt.';}else{ties.add(key);selection.textContent='Haltebogen zur folgenden Note gesetzt.';}drawScore();
    });palette.append(tieButton);
    if(accentEnabled){const accentButton=document.createElement('button');accentButton.type='button';accentButton.className='builder-accent-symbol';accentButton.innerHTML='<svg viewBox="0 0 48 28" aria-hidden="true"><path d="M8 7l30 7L8 21" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Akzentzeichen</span>';accentButton.addEventListener('click',()=>{if(!selectedTieNote){selection.textContent='Klicke zuerst oben auf eine Note, die du akzentuieren möchtest.';return;}const event=allEvents().find(item=>item.id===selectedTieNote);if(!event||event.value.rest){selection.textContent='Akzentzeichen können nur auf Noten gesetzt werden, nicht auf Pausen.';return;}if(accents.has(event.id)){accents.delete(event.id);selection.textContent='Akzentzeichen entfernt.';}else{accents.add(event.id);selection.textContent='Akzentzeichen gesetzt.';}selectedTieNote=null;drawScore();});palette.append(accentButton);}
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
      const events=allEvents(),groups=[];events.forEach((event,index)=>{if(event.value.rest||event.value.units>9||Math.floor(event.onset/12)!==Math.floor((event.onset+event.value.units-1)/12))return;const prev=groups[groups.length-1];if(prev&&prev[prev.length-1]===index-1&&events[prev[0]].barIndex===event.barIndex&&Math.floor(events[prev[0]].onset/12)===Math.floor(event.onset/12)&&events[prev[prev.length-1]].absolute+events[prev[prev.length-1]].value.units===event.absolute&&!!events[prev[0]].value.triplet===!!event.value.triplet)prev.push(index);else groups.push([index]);});
      const beamed=new Set(groups.filter(group=>group.length>1).flat());events.forEach((event,index)=>{
        const x=barStart+event.absolute*10+3,hit=document.createElementNS(ns,'rect');hit.setAttribute('x',String(x-2));hit.setAttribute('y','93');hit.setAttribute('width','27');hit.setAttribute('height','26');hit.setAttribute('fill','transparent');hit.setAttribute('tabindex','0');hit.setAttribute('role','button');hit.setAttribute('aria-label',`${event.value.name} in Takt ${event.barIndex+1}, Schlag ${Math.floor(event.onset/12)+1} als ${accentEnabled?'Haltebogen- oder Akzentposition':'Anfang für einen Haltebogen'} auswählen`);hit.style.cursor='pointer';const selectTieStart=()=>{selectedTieNote=event.id;selectedPosition=null;selection.textContent=`Note in Takt ${event.barIndex+1}, Schlag ${Math.floor(event.onset/12)+1} ausgewählt. Klicke ${accentEnabled?'auf Haltebogen oder Akzentzeichen':'auf das Haltebogen-Symbol'} in der Palette.`;drawPositions();drawScore();};hit.addEventListener('click',selectTieStart);hit.addEventListener('keydown',key=>{if(key.key==='Enter'||key.key===' '){key.preventDefault();selectTieStart();}});svg.append(hit);
        const code=beamed.has(index)?'E0A4':glyphCode(event.value),note=document.createElementNS(ns,'path'),symbolBaseline=event.value.id==='r2'?124:event.value.id==='r4'?123:event.value.rest?102:123;note.setAttribute('d',window.completionGlyphs[code]);note.setAttribute('transform',`translate(${x} ${symbolBaseline}) scale(.52 -.52)`);note.setAttribute('fill','currentColor');note.setAttribute('pointer-events','none');svg.append(note);if(event.value.dotted){const dot=document.createElementNS(ns,'circle');dot.setAttribute('cx',String(x+22));dot.setAttribute('cy','102');dot.setAttribute('r','2.5');dot.setAttribute('fill','currentColor');dot.setAttribute('pointer-events','none');svg.append(dot);}if(accents.has(event.id)&&!event.value.rest)path(`M${x+1} 40L${x+15} 45L${x+1} 50`,2.2);
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
      const currentIds=new Set(events.map(event=>event.id));[...accents].forEach(id=>{if(!currentIds.has(id))accents.delete(id);});const validPairs=[];for(let i=0;i<events.length-1;i++)if(!events[i].value.rest&&!events[i+1].value.rest&&events[i].absolute+events[i].value.units===events[i+1].absolute)validPairs.push([events[i],events[i+1]]);
      const valid=new Set(validPairs.map(([a,b])=>`${a.id}|${b.id}`));[...ties].forEach(key=>{if(!valid.has(key))ties.delete(key);});ties.forEach(key=>{const [aId,bId]=key.split('|'),a=events.find(item=>item.id===aId),b=events.find(item=>item.id===bId);if(a&&b){const startX=barStart+a.absolute*10+20,endX=barStart+b.absolute*10+3;path(`M${startX} 108Q${(startX+endX)/2} 132 ${endX} 108`,2.4);}});
      if(selectedPosition){const x=barStart+selectedPosition.bar*barWidth+(selectedPosition.beat*12+selectedPosition.offset)*10+15;path(`M${x} 27V117`,1.5);const dot=document.createElementNS(ns,'circle');dot.setAttribute('cx',String(x));dot.setAttribute('cy','102');dot.setAttribute('r','5');dot.setAttribute('fill','#c44929');svg.append(dot);}
      score.append(svg);
      const beatCount=units=>{const whole=Math.floor(units/12),rem=units%12,part={3:'¼',4:'⅓',6:'½',8:'⅔',9:'¾'}[rem]||(rem?`${rem}/12`:'');return `${whole||''}${part}`||'0';};
      const used=bars.map(events=>events.reduce((sum,event)=>sum+event.value.units,0));status.textContent=`Takt 1: ${beatCount(used[0])} von 4 Schlägen belegt · Takt 2: ${beatCount(used[1])} von 4 Schlägen belegt.`;
    }
    root.querySelector('[data-builder-clear]').addEventListener('click',()=>{stopPlayback();bars[0].length=0;bars[1].length=0;ties.clear();accents.clear();selectedPosition=null;selectedTieNote=null;selection.textContent='Wähle zuerst eine Position im Takt.';drawPositions();drawScore();});
    drawPositions();drawScore();
  }
  function setupBarEditor(root) {
    const taskSequence=(root.dataset.taskSequence||'').split('|').filter(Boolean);
    const taskIndex=Number(root.dataset.taskSequenceIndex||0);
    const sequenceLabel=root.dataset.sequenceLabel||'Aufgabe 2';
    const station=root.closest('.completion-station')||root;
    const stationMarkup=station.innerHTML;
    const config=window.completionExercises?.[root.dataset.completion];
    if(!config||!window.completionValues||!window.completionGlyphs)return;
    const isRestCode=code=>String(code||'').startsWith('E4');
    const values=window.completionValues.filter(value=>(config.rests||value.id.startsWith('n'))&&(config.course>1||value.units >= (config.minUnits ?? 2)))
      .map(value=>({...value,units:value.units*3,rest:value.id.startsWith('r')}));
    const palette=root.querySelector('.completion-palette');
    if(root.dataset.completion.includes('/bild-160-paar-')&&values.length===4)palette.classList.add('completion-palette-centered');
    let gaps=config.gaps.map((gap,index)=>({...gap,index,notes:[]}));
    let bars=[...new Set(gaps.map(gap=>gap.bar))].map(number=>({number,gaps:gaps.filter(gap=>gap.bar===number)}));
    const desktop=window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 700px)').matches;
    const helpToggle=station.querySelector('.completion-help-toggle');
    helpToggle?.addEventListener('click',()=>{
      const active=station.classList.toggle('completion-help-active');
      helpToggle.setAttribute('aria-pressed',String(active));
      helpToggle.setAttribute('aria-label',active?'Hilfe ausblenden':'Hilfe anzeigen');
      helpToggle.title=active?'Hilfe ausblenden':'Hilfe anzeigen';
      if(root.dataset.showBeatCounts==='true')baseSvg?.querySelector('[data-beat-counts]')?.setAttribute('display',active?'inline':'none');
      if(!active)station.querySelectorAll('.completion-help-marker').forEach(marker=>{marker.classList.remove('is-open');marker.setAttribute('aria-expanded','false');marker.getAttribute('aria-describedby')&&document.getElementById(marker.getAttribute('aria-describedby'))?.classList.remove('is-visible');});
    });
    function addHelpMarker(host,text){
      const marker=document.createElement('span');marker.className='completion-help-marker';marker.textContent='i';marker.tabIndex=0;marker.setAttribute('role','button');marker.setAttribute('aria-label',`Hilfe: ${text}`);marker.setAttribute('aria-expanded','false');
      const tooltip=document.createElement('span');tooltip.className='completion-help-tooltip';tooltip.id=`completion-help-tooltip-${++completionHelpTooltipId}`;tooltip.setAttribute('role','tooltip');tooltip.textContent=text;marker.setAttribute('aria-describedby',tooltip.id);document.body.append(tooltip);
      marker.addEventListener('pointerdown',event=>{event.preventDefault();event.stopPropagation();});
      const hideTooltip=()=>tooltip.classList.remove('is-visible');
      const showTooltip=()=>{if(!station.classList.contains('completion-help-active'))return;const rect=marker.getBoundingClientRect();tooltip.style.visibility='hidden';tooltip.classList.add('is-visible');const box=tooltip.getBoundingClientRect(),left=Math.max(10,Math.min(rect.right-box.width,window.innerWidth-box.width-10));let top=rect.bottom+8;if(top+box.height>window.innerHeight-10)top=Math.max(10,rect.top-box.height-8);tooltip.style.left=`${left}px`;tooltip.style.top=`${top}px`;tooltip.style.visibility='visible';};
      marker.addEventListener('mouseenter',showTooltip);marker.addEventListener('focus',showTooltip);marker.addEventListener('mouseleave',()=>{if(!marker.classList.contains('is-open')&&document.activeElement!==marker)hideTooltip();});marker.addEventListener('blur',()=>{if(!marker.classList.contains('is-open'))hideTooltip();});
      marker.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const open=marker.classList.toggle('is-open');marker.setAttribute('aria-expanded',String(open));if(open)showTooltip();else hideTooltip();});
      marker.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();marker.click();}else if(event.key==='Escape'){marker.classList.remove('is-open');marker.setAttribute('aria-expanded','false');hideTooltip();}});
      host.append(marker);return marker;
    }
    root.classList.toggle('drag-drop-enabled',desktop);
    const figure=root.previousElementSibling;
    // Score figures no longer wrap their images in zoom links. Replace either
    // the former link or the current image wrapper so the interactive editor
    // still gets a stable score container in both markup versions.
    const scoreSource=figure?.querySelector('a, .score-image-wrap, img');
    let score=null,baseSvg=null,beamLayer=null;
    if(scoreSource){
      const image=scoreSource.matches('img')?scoreSource:scoreSource.querySelector('img');
      if(image){
        score=document.createElement('div');score.className='completion-score completion-score--bar-editor';scoreSource.replaceWith(score);
        score.parentElement?.classList.add('completion-editor-scroll');score.append(image);
        fetch(root.dataset.completion).then(response=>response.ok?response.text():Promise.reject()).then(source=>{
          const parsed=new DOMParser().parseFromString(source,'image/svg+xml');baseSvg=parsed.documentElement;
          baseSvg.querySelectorAll('[data-gap="true"],text').forEach(node=>{if(node.matches('[data-gap="true"]')||node.textContent.trim()==='?')node.remove();});
          if(root.dataset.showBeatCounts==='true'&&station.classList.contains('completion-help-active'))baseSvg.querySelector('[data-beat-counts]')?.setAttribute('display','inline');
          baseSvg.querySelectorAll('path[data-bar][data-onset]').forEach(path=>{path.dataset.originalCode=path.dataset.smufl||'';});
          beamLayer=document.createElementNS('http://www.w3.org/2000/svg','svg');beamLayer.setAttribute('viewBox',`0 0 ${config.width} ${config.height}`);beamLayer.setAttribute('preserveAspectRatio','none');beamLayer.classList.add('completion-beam-layer');
          score.replaceChildren(baseSvg,beamLayer);render();
        }).catch(()=>{});
      }
    }
    const container=root.querySelector('.completion-bars');
    container.classList.add('bar-editor-controls');
    if(score?.parentElement)score.parentElement.insertBefore(container,score);
    const demo=root.querySelector('.completion-drag-demo');
    let history=[],hasStarted=false,draggingGapIndex=null;
    let playbackContext=null,playbackNodes=[],playbackTimer=null,counterTimers=[],isPlaying=false,playbackBpm=40;
    const playbackLabel=bars.length>2?'Alle Takte':'Beide Takte';
    const playbackButton=document.createElement('button');playbackButton.type='button';playbackButton.className='completion-bar-play';playbackButton.setAttribute('aria-label',`${playbackLabel} abspielen`);playbackButton.title=`${playbackLabel} abspielen · ein Takt Metronom-Einzähler`;playbackButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
    if(root.dataset.adjustableBpm==='true'&&score?.parentElement){
      const bpmControl=document.createElement('div');bpmControl.className='completion-bpm-control';bpmControl.setAttribute('role','group');bpmControl.setAttribute('aria-label','Wiedergabetempo einstellen');
      const bpmValue=document.createElement('output');bpmValue.className='completion-bpm-value';bpmValue.setAttribute('aria-live','polite');bpmValue.textContent=`${playbackBpm} BPM`;
      const arrows=document.createElement('span');arrows.className='completion-bpm-arrows';
      const changeBpm=(amount)=>{playbackBpm=Math.max(30,Math.min(120,playbackBpm+amount));bpmValue.textContent=`${playbackBpm} BPM`;};
      const up=document.createElement('button');up.type='button';up.className='completion-bpm-up';up.textContent='▲';up.setAttribute('aria-label','Tempo erhöhen');up.title='Tempo erhöhen';up.addEventListener('click',()=>changeBpm(5));
      const down=document.createElement('button');down.type='button';down.className='completion-bpm-down';down.textContent='▼';down.setAttribute('aria-label','Tempo verringern');down.title='Tempo verringern';down.addEventListener('click',()=>changeBpm(-5));
      arrows.append(up,down);bpmControl.append(bpmValue,arrows);score.parentElement.insertBefore(bpmControl,score);
    }
    const playbackHelpMarker=addHelpMarker(score||root,`Spielt ${playbackLabel.toLowerCase()} nach einem Metronom-Einzähler ab${root.dataset.playPartial==='true'?' – auch mit leeren Feldern.':' sobald alle Takte vollständig sind.'}`);playbackHelpMarker.classList.add('completion-help-play-marker');
    const countDisplay=document.createElement('span');countDisplay.className='completion-count-display';countDisplay.hidden=true;countDisplay.setAttribute('aria-hidden','true');
    const snapshot=()=>gaps.map(gap=>gap.notes.slice());
    function save(){history.push(snapshot());}
    let playableBars=bars.slice().sort((a,b)=>a.number-b.number),lastBar=playableBars.at(-1);
    container.dataset.barCount=String(playableBars.length);
    function isBarComplete(bar){return !!bar&&bar.gaps.every(gap=>gap.notes.length>0)&&bar.gaps.reduce((sum,gap)=>sum+gap.notes.reduce((noteSum,value)=>noteSum+value.units,0),0)===bar.gaps.reduce((sum,gap)=>sum+gap.duration,0);}
    function isPlaybackReady(){return !!baseSvg&&(root.dataset.playPartial==='true'||playableBars.length>=2&&playableBars.every(isBarComplete));}
    function stopBarPlayback(){if(playbackTimer)clearTimeout(playbackTimer);playbackTimer=null;counterTimers.forEach(clearTimeout);counterTimers=[];countDisplay.hidden=true;playbackNodes.forEach(node=>{try{node.stop();}catch{}});playbackNodes=[];isPlaying=false;score?.classList.remove('completion-is-playing');playbackButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';playbackButton.setAttribute('aria-label',`${playbackLabel} abspielen`);playbackButton.title=`${playbackLabel} abspielen · ein Takt Metronom-Einzähler`;}
    function render(){
      undoButton.disabled=!history.length;
      playbackButton.disabled=!isPlaying&&!isPlaybackReady();
      if(hasStarted)demo?.setAttribute('hidden','');
      if(score){
        score.classList.toggle('completion-all-gaps-filled',gaps.every(gap=>gap.notes.length>0));
        score.querySelectorAll('.completion-gap, .completion-gap-clear').forEach(node=>node.remove());
        const beamedGapNotes=updateBeams();
        const clearByBar=root.dataset.evaluateClears==='true';
        const barTrashButtons=new Map();
        if(clearByBar){
          playableBars.forEach(bar=>{
            if(!bar.gaps.some(gap=>gap.notes.length))return;
            const right=bar.gaps.reduce((edge,gap)=>Math.max(edge,gap.x+gap.width),0);
            const bottom=bar.gaps.reduce((edge,gap)=>Math.max(edge,gap.y+gap.height),0);
            const trash=document.createElement('button');trash.type='button';trash.className='completion-gap-clear completion-bar-clear';trash.dataset.bar=String(bar.number);trash.setAttribute('aria-label',`Takt ${bar.number} leeren`);trash.title=`Takt ${bar.number} leeren`;trash.style.left=`${right/config.width*100}%`;trash.style.top=`${bottom/config.height*100}%`;
            trash.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v6m4-6v6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            addHelpMarker(trash,'Leert den ganzen Takt. Ziehst du ein einzelnes Zeichen aus einer Lücke hierher, wird nur dieses Zeichen entfernt.');
            trash.addEventListener('click',event=>{event.stopPropagation();if(isPlaying)stopBarPlayback();save();bar.gaps.forEach(gap=>{gap.notes=[];});noteContentEdited();render();});
            trash.addEventListener('dragover',event=>{if(draggingGapIndex===null||!Array.from(event.dataTransfer.types).includes('application/x-completion-gap-note'))return;const source=gaps[draggingGapIndex];if(source?.bar!==bar.number)return;event.preventDefault();event.dataTransfer.dropEffect='move';trash.classList.add('completion-trash-ready');});
            trash.addEventListener('dragleave',event=>{if(!trash.contains(event.relatedTarget))trash.classList.remove('completion-trash-ready');});
            trash.addEventListener('drop',event=>{const raw=event.dataTransfer.getData('application/x-completion-gap-note');if(!raw)return;event.preventDefault();const [sourceIndex,noteIndex]=raw.split(':').map(Number),source=gaps[sourceIndex];trash.classList.remove('completion-trash-ready');if(source?.bar!==bar.number||!source.notes[noteIndex])return;if(isPlaying)stopBarPlayback();save();source.notes.splice(noteIndex,1);noteContentEdited();render();});
            score.append(trash);barTrashButtons.set(bar.number,trash);
          });
        }
        gaps.forEach(gap=>{
          const target=document.createElement('div');target.className='completion-gap';target.dataset.gap=String(gap.index);
          target.dataset.bar=String(gap.bar);
          target.style.cssText=`left:${gap.x/config.width*100}%;top:${gap.y/config.height*100}%;width:${gap.width/config.width*100}%;height:${gap.height/config.height*100}%;`;
          target.setAttribute('role','group');target.setAttribute('aria-label',`Takt ${gap.bar}, Lücke ${gap.index+1}${gap.notes.length?`: ${gap.notes.map(n=>n.name).join(', ')}`:': leer'}`);
          if(!gap.notes.length)target.textContent='?';else target.innerHTML=renderGap(gap,beamedGapNotes);
          target.style.position='absolute';
          let trash=null;
          if(gap.notes.length){
            if(clearByBar){trash=barTrashButtons.get(gap.bar)||null;}
            else{trash=document.createElement('button');trash.type='button';trash.className='completion-gap-clear';trash.setAttribute('aria-label',`Lücke ${gap.index+1} leeren`);trash.title=`Lücke ${gap.index+1} leeren · Zeichen hierher ziehen oder anklicken`;trash.style.left=`${(gap.x+gap.width)/config.width*100}%`;trash.style.top=`${(gap.y+gap.height)/config.height*100}%`;trash.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v6m4-6v6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';addHelpMarker(trash,'Leert diese Lücke. Ziehe ein Zeichen aus der Lücke auf den Papierkorb oder klicke darauf.');trash.addEventListener('click',event=>{event.stopPropagation();if(isPlaying)stopBarPlayback();save();gap.notes=[];noteContentEdited();render();});}
          }
          if(desktop){
            if(gap.notes.length){gapLayout(gap).positions.forEach((position,index)=>{const handle=document.createElement('button');handle.type='button';handle.className='completion-note-drag-handle';handle.draggable=true;handle.setAttribute('aria-label',`${gap.notes[index].name} aus Lücke ${gap.index+1} zum Löschen ziehen`);handle.style.left=`${position.x/gap.width*100}%`;handle.style.width=`${Math.max(20,28*position.scale)/gap.width*100}%`;handle.addEventListener('dragstart',event=>{draggingGapIndex=gap.index;event.dataTransfer.setData('application/x-completion-gap-note',`${gap.index}:${index}`);event.dataTransfer.effectAllowed='move';station.classList.add('is-dragging');trash?.classList.add('completion-trash-source');const paletteIndex=values.findIndex(value=>value.id===gap.notes[index].id),icon=palette.children[paletteIndex]?.querySelector('svg');if(icon){const preview=icon.cloneNode(true);preview.setAttribute('width','36');preview.setAttribute('height','54');preview.style.cssText='position:fixed;left:-1000px;top:0;width:36px;height:54px;color:#202e31;background:transparent;padding:0;border:0;box-shadow:none';document.body.append(preview);event.dataTransfer.setDragImage(preview,18,27);handle.addEventListener('dragend',()=>preview.remove(),{once:true});}});handle.addEventListener('dragend',()=>{draggingGapIndex=null;station.classList.remove('is-dragging');trash?.classList.remove('completion-trash-source','completion-trash-ready');});target.append(handle);});}
            target.addEventListener('dragover',event=>{if(!Array.from(event.dataTransfer.types).includes('application/x-completion-value'))return;event.preventDefault();event.dataTransfer.dropEffect='copy';target.classList.add('completion-drop-ready');});target.addEventListener('dragleave',()=>target.classList.remove('completion-drop-ready'));target.addEventListener('drop',event=>{const raw=event.dataTransfer.getData('application/x-completion-value');if(!raw)return;event.preventDefault();target.classList.remove('completion-drop-ready');const value=values[Number(raw)];if(value)add(value,gap);});
            if(trash&&!clearByBar){trash.addEventListener('dragover',event=>{if(draggingGapIndex!==gap.index||!Array.from(event.dataTransfer.types).includes('application/x-completion-gap-note'))return;event.preventDefault();event.dataTransfer.dropEffect='move';trash.classList.add('completion-trash-ready');});trash.addEventListener('dragleave',event=>{if(!trash.contains(event.relatedTarget))trash.classList.remove('completion-trash-ready');});trash.addEventListener('drop',event=>{const raw=event.dataTransfer.getData('application/x-completion-gap-note');if(!raw)return;event.preventDefault();const [sourceIndex,noteIndex]=raw.split(':').map(Number),source=gaps[sourceIndex];trash.classList.remove('completion-trash-ready');if(sourceIndex!==gap.index||!source?.notes[noteIndex])return;if(isPlaying)stopBarPlayback();save();source.notes.splice(noteIndex,1);noteContentEdited();render();});}
          }
          addHelpMarker(target,'Setze hier ein Noten- oder Pausenzeichen ein. Am Computer ziehst du es aus der Palette in die Lücke; auf Touchgeräten tippst du ein Zeichen an, um es in die nächste Lücke zu setzen.');
          if(clearByBar&&trash){
            target.addEventListener('pointerenter',()=>trash.classList.add('completion-trash-visible'));
            target.addEventListener('pointerleave',event=>{const nextGap=event.relatedTarget?.closest?.('.completion-gap');if(nextGap?.dataset.bar===String(gap.bar)||trash.contains(event.relatedTarget))return;trash.classList.remove('completion-trash-visible');});
            trash.addEventListener('pointerleave',event=>{const nextGap=event.relatedTarget?.closest?.('.completion-gap');if(nextGap?.dataset.bar===String(gap.bar))return;trash.classList.remove('completion-trash-visible');});
            trash.addEventListener('focus',()=>trash.classList.add('completion-trash-visible'));
            trash.addEventListener('blur',()=>trash.classList.remove('completion-trash-visible'));
          }
          score.append(target);if(trash&&!clearByBar)score.append(trash);
        });
        if(beamLayer)score.append(beamLayer);if(lastBar)score.append(playbackButton,playbackHelpMarker);score.append(countDisplay);
      }
      container.replaceChildren();bars.forEach(bar=>{
        const card=document.createElement('section');card.className='completion-bar bar-editor-card';
        const feedback=document.createElement('p');feedback.className='completion-feedback';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');card.append(feedback);container.append(card);
      });
    }
    const evaluateWrap=document.createElement('div');evaluateWrap.className='completion-evaluate-wrap';
    const finalButtons=document.createElement('div');finalButtons.className='completion-final-buttons';
    const undoButton=document.createElement('button');undoButton.type='button';undoButton.className='completion-undo';undoButton.setAttribute('aria-label','Rückgängig machen');undoButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 10h11a6 6 0 1 1-5.6 8M3 10l5-5M3 10l5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Rückgängig machen</span>';undoButton.disabled=true;undoButton.addEventListener('click',()=>{if(!history.length)return;if(isPlaying)stopBarPlayback();const previous=history.pop();gaps.forEach((gap,i)=>gap.notes=previous[i]);noteContentEdited();render();});
    const undoHost=document.createElement('span');undoHost.className='completion-help-host';undoHost.append(undoButton);addHelpMarker(undoHost,'Macht die letzte Änderung rückgängig. Der Knopf wird aktiv, sobald du ein Zeichen eingesetzt oder entfernt hast.');
    const evaluateButton=document.createElement('button');evaluateButton.type='button';evaluateButton.className='completion-evaluate';evaluateButton.textContent='Aufgabe auswerten';
    const evaluateHost=document.createElement('span');evaluateHost.className='completion-help-host';evaluateHost.append(evaluateButton);
    let evaluated=false;
    function noteContentEdited(){
      if(!evaluated||root.dataset.evaluateClears!=='true')return;
      evaluated=false;
      evaluateButton.textContent='Aufgabe auswerten';
      evaluateButton.setAttribute('aria-label',evaluateButton.textContent);
      evaluateButton.disabled=false;
      evaluateButton.classList.remove('completion-next-ready');
      container.querySelectorAll('.completion-feedback').forEach(feedback=>{
        feedback.replaceChildren();
        feedback.removeAttribute('data-result');
        feedback.classList.remove('completion-result-flash-correct','completion-result-flash-wrong');
      });
    }
    const evaluateHelp=addHelpMarker(evaluateHost,`Prüft alle ${playableBars.length===2?'beiden Takte':'vier Takte'}. Jeder muss genau vier Schläge enthalten. Bei Fehlern wird beschrieben, was nicht stimmt, ohne die Lösung vorzugeben.`);
    evaluateButton.addEventListener('click',()=>{
      if(evaluated){
        if(root.dataset.evaluateClears==='true'){
          if(isPlaying)stopBarPlayback();history=[];gaps.forEach(gap=>gap.notes=[]);hasStarted=false;evaluated=false;
          container.querySelectorAll('.completion-feedback').forEach(feedback=>{feedback.replaceChildren();feedback.removeAttribute('data-result');feedback.classList.remove('completion-result-flash-correct','completion-result-flash-wrong');});
          evaluateButton.textContent='Aufgabe auswerten';evaluateButton.setAttribute('aria-label',evaluateButton.textContent);evaluateButton.disabled=false;evaluateButton.classList.remove('completion-next-ready');undoButton.disabled=true;render();return;
        }
        const nextIndex=taskIndex+1;
        if(nextIndex>=taskSequence.length){
          const target=root.dataset.nextSection?document.querySelector(root.dataset.nextSection):null;
          if(target){if(target.id)window.history.replaceState(null,'',`#${target.id}`);target.scrollIntoView({behavior:'smooth',block:'start'});}
          return;
        }
        if(isPlaying)stopBarPlayback();
        station.querySelectorAll('.completion-help-marker[aria-describedby]').forEach(marker=>document.getElementById(marker.getAttribute('aria-describedby'))?.remove());
        const nextStation=station.cloneNode(false);
        nextStation.classList.remove('completion-help-active');
        nextStation.innerHTML=stationMarkup;
        const nextTitle=`${sequenceLabel}.${nextIndex+1} · Takte vervollständigen`;
        const heading=nextStation.querySelector('.completion-station-heading h4');
        const nextRoot=nextStation.querySelector('.bar-completion');
        const figure=nextStation.querySelector('.score-figure');
        const nextPath=taskSequence[nextIndex];
        const nextImage=figure?.querySelector('img');
        const nextCaption=figure?.querySelector('figcaption');
        if(heading)heading.textContent=nextTitle;
        if(figure){figure.querySelector('.score-scroll')?.setAttribute('aria-label',`${nextTitle} – bei Bedarf seitlich scrollen`);if(nextImage){nextImage.src=nextPath;nextImage.width=window.completionExercises[nextPath]?.width||960;nextImage.height=window.completionExercises[nextPath]?.height||150;nextImage.alt=`Notation für ${nextTitle}`;}if(nextCaption){nextCaption.textContent=nextTitle;}}
        if(nextRoot){nextRoot.dataset.completion=nextPath;nextRoot.dataset.taskSequence=taskSequence.join('|');nextRoot.dataset.taskSequenceIndex=String(nextIndex);}
        station.replaceWith(nextStation);
        if(nextRoot)setupBarEditor(nextRoot);
        return;
      }
      let allBarsCorrect=true;
      bars.forEach((bar,index)=>{
        const errors=checkBar(bar,container.children[index]);
        if(errors.length)allBarsCorrect=false;
        showEvaluationEffect(container.children[index].querySelector('.completion-feedback'),!errors.length);
      });
      evaluated=true;
      refreshGapBeams();
      if(allBarsCorrect&&root.dataset.transferTarget)saveEvaluatedPattern();
      const hasNext=taskIndex+1<taskSequence.length;
      const canContinue=Boolean(root.dataset.nextSection)&&!hasNext;
      evaluateButton.textContent=root.dataset.evaluateClears==='true'?'Takte leeren':hasNext?'Nächste Aufgabe':canContinue?"Weiter geht's!":'Alle Aufgaben erledigt';
      evaluateButton.setAttribute('aria-label',evaluateButton.textContent);
      if(root.dataset.evaluateClears==='true'){evaluateButton.disabled=false;}
      else if(hasNext||canContinue){evaluateButton.classList.add('completion-next-ready');evaluateHelp.setAttribute('aria-label',canContinue?'Hilfe: Weiter zum nächsten Aufgabenabschnitt.':'Hilfe: Klicke hier, um die nächste Aufgabe mit leerem Arbeitsfeld zu öffnen.');const tooltip=document.getElementById(evaluateHelp.getAttribute('aria-describedby'));if(tooltip)tooltip.textContent=canContinue?'Springt zum nächsten Aufgabenabschnitt.':'Öffnet die nächste Aufgabe mit leerem Arbeitsfeld.';}
      else evaluateButton.disabled=true;
    });
    finalButtons.append(undoHost,evaluateHost);evaluateWrap.append(finalButtons);root.append(evaluateWrap);
    playbackButton.addEventListener('click',async()=>{
      if(isPlaying){stopBarPlayback();return;}
      if(!isPlaybackReady())return;
      const AudioContextClass=window.AudioContext||window.webkitAudioContext;if(!AudioContextClass)return;
      if(!playbackContext)playbackContext=new AudioContextClass();
      try{await playbackContext.resume();}catch{return;}
      const bpm=playbackBpm,beatSeconds=60/bpm,start=playbackContext.currentTime+.15;
      const tone=(frequency,at,duration,wave='sine',volume=.22)=>{const oscillator=playbackContext.createOscillator(),gain=playbackContext.createGain();oscillator.type=wave;oscillator.frequency.setValueAtTime(frequency,at);gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(volume,at+.006);gain.gain.setValueAtTime(volume,Math.max(at+.007,at+duration-.035));gain.gain.linearRampToValueAtTime(.0001,Math.max(at+.03,at+duration));oscillator.connect(gain);gain.connect(playbackContext.destination);oscillator.start(at);oscillator.stop(at+duration+.015);playbackNodes.push(oscillator);};
      const playbackBeats=4+playableBars.length*4;
      for(let beat=0;beat<playbackBeats;beat++){const at=start+beat*beatSeconds;tone(beat%4===0?1050:760,at,.075,'triangle',beat%4===0?.25:.16);}
      const counterDelay=Math.max(0,(start-playbackContext.currentTime)*1000);
      for(let beat=0;beat<playbackBeats;beat++){counterTimers.push(setTimeout(()=>{if(beat>=playbackBeats){countDisplay.hidden=true;return;}const isCountIn=beat<4,playedBeat=beat-4,barIndex=isCountIn?0:Math.floor(playedBeat/4),bar=playableBars[barIndex],barStart=((bar?.number||1)-1)%2===0?88:510,beatInBar=isCountIn?0:playedBeat%4,gapY=bar?.gaps[0]?.y??61;countDisplay.textContent=String(isCountIn?beat+1:beatInBar+1);countDisplay.classList.toggle('is-count-in',isCountIn);countDisplay.style.left=`${(barStart+(isCountIn?-33:beatInBar*105))/config.width*100}%`;countDisplay.style.top=`${Math.max(8,gapY-41)/config.height*100}%`;countDisplay.hidden=false;},counterDelay+beat*beatSeconds*1000));}
      const events=[];
      if(baseSvg)[...baseSvg.querySelectorAll('path[data-bar][data-onset][data-duration]')].forEach(path=>{const barNumber=Number(path.dataset.bar);if(!playableBars.some(bar=>bar.number===barNumber))return;events.push({barNumber,onset:Number(path.dataset.onset),units:Number(path.dataset.duration),rest:isRestCode(path.dataset.originalCode||path.dataset.smufl)});});
      playableBars.forEach(bar=>bar.gaps.forEach(gap=>{let onset=gap.onset;gap.notes.forEach(value=>{events.push({barNumber:bar.number,onset,units:value.units,rest:value.rest});onset+=value.units;});}));
      events.filter(event=>!event.rest).forEach(event=>{const barIndex=playableBars.findIndex(bar=>bar.number===event.barNumber);if(barIndex<0)return;const at=start+(4+barIndex*4+event.onset/12)*beatSeconds,duration=event.units/12*beatSeconds;tone(261.63,at,duration);});
      isPlaying=true;score?.classList.add('completion-is-playing');playbackButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 5h4v14H6zm8 0h4v14h-4z" fill="currentColor"/></svg>';playbackButton.setAttribute('aria-label','Wiedergabe stoppen');playbackButton.title='Wiedergabe stoppen';
      playbackTimer=setTimeout(stopBarPlayback,playbackBeats*beatSeconds*1000+250);
    });
    function updateBeams(){
      if(!baseSvg||!beamLayer)return new Set();
      beamLayer.replaceChildren();const events=[];
      const fixed=[...baseSvg.querySelectorAll('path[data-bar][data-onset][data-duration]')];
      fixed.forEach(path=>{
        const transform=path.getAttribute('transform')||'',match=transform.match(/translate\(([-\d.]+)\s+([-\d.]+)\)/),code=path.dataset.originalCode;
        if(!match)return;const onset=Number(path.dataset.onset),duration=Number(path.dataset.duration),bar=Number(path.dataset.bar);
        events.push({bar,onset,end:onset+duration,duration,rest:isRestCode(code),path,x:Number(match[1])});
        path.setAttribute('d',window.completionGlyphs[code]);path.dataset.smufl=code;
      });
      gaps.forEach(gap=>{const used=gap.notes.reduce((sum,value)=>sum+value.units,0);if(used>gap.duration)return;let onset=gap.onset;gap.notes.forEach((value,index)=>{events.push({bar:gap.bar,onset,end:onset+value.units,duration:value.units,rest:value.rest,gap,index,x:gap.x+3+(onset-gap.onset)*config.step});onset+=value.units;});});
      events.sort((a,b)=>a.bar-b.bar||a.onset-b.onset);const groups=[];events.forEach((event,index)=>{
        if(event.rest||event.duration!==6)return;const previous=groups.at(-1),prior=previous?events[previous.at(-1)]:null;
        const continuousWithinBeat=prior&&prior.end===event.onset&&Math.floor(prior.onset/12)===Math.floor(event.onset/12);
        const adjacentSingleGapEighths=evaluated&&prior?.gap&&event.gap&&event.gap.index===prior.gap.index+1&&prior.gap.notes.length===1&&event.gap.notes.length===1;
        if(previous&&previous.at(-1)===index-1&&prior.bar===event.bar&&(continuousWithinBeat||adjacentSingleGapEighths))previous.push(index);else groups.push([index]);
      });
      const selected=new Set();groups.filter(group=>group.length>1&&group.some(index=>events[index].gap)).forEach(group=>{
        const firstGap=events[group[0]].gap;
        if(firstGap&&group.every(index=>events[index].gap?.index===firstGap.index))return;
        group.forEach(index=>{const event=events[index];if(event.gap)selected.add(`${event.gap.index}-${event.index}`);else{event.path.setAttribute('d',window.completionGlyphs.E0A4);event.path.dataset.smufl='E0A4';}});
        const first=events[group[0]],last=events[group.at(-1)],y=67;
        group.filter(index=>!events[index].gap).forEach(index=>{const x=events[index].x+11.3;const stem=document.createElementNS('http://www.w3.org/2000/svg','path');stem.setAttribute('d',`M${x} 105V${y}`);stem.setAttribute('stroke','black');stem.setAttribute('stroke-width','1.5');beamLayer.append(stem);});
        const line=document.createElementNS('http://www.w3.org/2000/svg','path');line.setAttribute('d',`M${first.x+11.3} ${y}H${last.x+11.3}`);line.setAttribute('stroke','black');line.setAttribute('stroke-width','4.5');beamLayer.append(line);
      });
      return selected;
    }
    function refreshGapBeams(){
      const beamed=updateBeams();
      gaps.forEach(gap=>{
        if(!gap.notes.length)return;
        const current=score?.querySelector(`.completion-gap[data-gap="${gap.index}"] .completion-notation`);
        if(!current)return;
        const replacement=document.createElement('div');replacement.innerHTML=renderGap(gap,beamed);
        if(replacement.firstElementChild)current.replaceWith(replacement.firstElementChild);
      });
    }
    function saveEvaluatedPattern(){
      if(!baseSvg)return;
      const completed=baseSvg.cloneNode(true);
      completed.querySelectorAll('[data-gap="true"]').forEach(node=>node.remove());
      completed.querySelectorAll('text').forEach(node=>{if(node.textContent.trim()==='?')node.remove();});
      completed.querySelector('[data-beat-counts]')?.setAttribute('display','none');
      const beamNotes=updateBeams();
      gaps.forEach(gap=>{
        if(!gap.notes.length)return;
        const parser=new DOMParser(),notation=parser.parseFromString(renderGap(gap,beamNotes),'image/svg+xml').documentElement;
        notation.removeAttribute('class');notation.setAttribute('x',String(gap.x));notation.setAttribute('y',String(gap.y));notation.setAttribute('width',String(gap.width));notation.setAttribute('height',String(gap.height));notation.setAttribute('preserveAspectRatio','none');notation.setAttribute('aria-hidden','true');
        completed.append(notation);
      });
      if(beamLayer)Array.from(beamLayer.childNodes).forEach(node=>completed.append(node.cloneNode(true)));
      const svg=new XMLSerializer().serializeToString(completed);
      const key=root.dataset.patternStorageKey||'the-tree-of-music-rhythm-task5-patterns';
      let saved=[];try{saved=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(saved))saved=[];}catch{}
      const clapEvents=[],noteEvents=[];
      playableBars.forEach((bar,barIndex)=>bar.gaps.forEach(gap=>{let onset=gap.onset;gap.notes.forEach(value=>{if(!value.rest){const beat=(barIndex*48+onset)/12;clapEvents.push(beat);noteEvents.push({beat,duration:value.units/12});}onset+=value.units;});}));
      saved.push({id:`pattern-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,createdAt:new Date().toISOString(),svg,clapEvents,noteEvents,durationBeats:playableBars.length*4});
      try{localStorage.setItem(key,JSON.stringify(saved));window.dispatchEvent(new CustomEvent('rhythm:patterns-updated',{detail:{patterns:saved,storageKey:key}}));}catch{container.querySelector('.completion-feedback')?.append(document.createTextNode(' Die Notation konnte nicht dauerhaft auf diesem Gerät gespeichert werden.'));}
    }
    function gapLayout(gap){
      const occupiedSpan=gap.notes.slice(0,-1).reduce((sum,value)=>sum+value.units,0)*config.step;
      const availableWidth=Math.max(1,gap.width-6);
      const spacingScale=Math.min(1,availableWidth/Math.max(30,occupiedSpan+30));
      const unit=config.step*spacingScale,positions=[];let onset=gap.onset;
      gap.notes.forEach(value=>{positions.push({value,onset,x:3+(onset-gap.onset)*unit,scale:spacingScale});onset+=value.units;});
      return {spacingScale,unit,positions};
    }
    function renderGap(gap,beamedGapNotes){
      const {spacingScale,unit,positions}=gapLayout(gap),notes=positions.map(position=>({...position,end:position.onset+position.value.units}));
      const groups=[];
      notes.forEach((note,i)=>{
        if(note.value.rest||note.value.units!==6||Math.floor(note.onset/12)!==Math.floor((note.end-1)/12))return;
        const prev=groups.at(-1);
        if(prev&&prev.at(-1)===i-1&&Math.floor(notes[prev[0]].onset/12)===Math.floor(note.onset/12)&&notes[prev.at(-1)].end===note.onset)prev.push(i);
        else groups.push([i]);
      });
      const beamed=new Set(groups.filter(group=>group.length>1).flat());
      let body='<path d="M0 45H'+Math.max(gap.width,notes.length*unit*0.65)+'" stroke="currentColor" stroke-width="1"/>';
      notes.forEach((note,i)=>{
        const x=note.x,isBeamed=beamed.has(i)||beamedGapNotes.has(`${gap.index}-${i}`),code=isBeamed?'E0A4':note.value.code||(note.value.rest?{48:'E4E3',24:'E4E4',12:'E4E5',6:'E4E6',3:'E4E7'}:{48:'E1D2',24:'E1D3',12:'E1D5',6:'E1D7',3:'E1D9'})[note.value.units];
        body+=`<path transform="translate(${x} 64.8) scale(${.52*spacingScale} ${-.52*spacingScale})" fill="currentColor" d="${window.completionGlyphs[code]}"/>`;
        if(isBeamed)body+=`<path d="M${x+11.3} 45V6" stroke="currentColor" stroke-width="1.5"/>`;
      });
      groups.filter(group=>group.length>1).forEach(group=>body+=`<path d="M${notes[group[0]].x+10.6} 6H${notes[group.at(-1)].x+12}" stroke="currentColor" stroke-width="4.5"/>`);
      const width=gap.width;
      return `<svg class="completion-notation" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 70" aria-hidden="true">${body}</svg>`;
    }
    function canFitVisually(gap,value){
      const allNotes=[...gap.notes,value],occupiedSpan=allNotes.slice(0,-1).reduce((sum,note)=>sum+note.units,0)*config.step;
      return (gap.width-6)/Math.max(30,occupiedSpan+30)>=.48;
    }
    function add(value,gap){if(!canFitVisually(gap,value)){const feedback=container.querySelector('.completion-feedback');if(feedback)feedback.textContent=`In Lücke ${gap.index+1} ist visuell kein Platz mehr für ein weiteres Zeichen.`;return;}if(isPlaying)stopBarPlayback();save();gap.notes.push(value);hasStarted=true;noteContentEdited();render();}
    function checkBar(bar,card){
      const feedback=card.querySelector('.completion-feedback');
      const errors=[];
      const expectedGapUnits=bar.gaps.reduce((sum,gap)=>sum+gap.duration,0);
      const total=bar.gaps.reduce((sum,gap)=>sum+gap.notes.reduce((n,value)=>n+value.units,0),0)+(48-expectedGapUnits);
      if(total<48)errors.push(`Takt ${bar.number} ist insgesamt ${formatBeats(48-total)} ${48-total===12?'Schlag':'Schläge'} zu kurz; es ergeben sich ${formatBeats(total)} statt vier Schläge.`);
      else if(total>48)errors.push(`Takt ${bar.number} ist insgesamt ${formatBeats(total-48)} ${total-48===12?'Schlag':'Schläge'} zu lang; es ergeben sich ${formatBeats(total)} statt vier Schläge.`);
      const offbeatQuarters=[];
      bar.gaps.forEach(gap=>{let onset=gap.onset;gap.notes.forEach(value=>{if(!value.rest&&value.units===12&&onset%12===6)offbeatQuarters.push(`${Math.floor(onset/12)+1} &`);onset+=value.units;});});
      if(errors.length){feedback.dataset.result='retry';feedback.textContent=errors.join(' ');}else{feedback.dataset.result='correct';feedback.textContent=`Takt ${bar.number} stimmt: vier Schläge.${offbeatQuarters.length?` Hinweis: Die Viertelnote auf ${offbeatQuarters.map(value=>`„${value}“`).join(' und ')} ist korrekt, aber auf dieser schwachen Zählzeit schwer lesbar. Ein Haltebogen macht solche Rhythmen später klarer; du lernst ihn im passenden Rhythmuskurs kennen.`:''}`;}
      return errors;
    }
    function showEvaluationEffect(feedback,correct){
      if(!feedback)return;
      feedback.querySelectorAll('.completion-result-flake').forEach(flake=>flake.remove());
      feedback.classList.remove('completion-result-flash-correct','completion-result-flash-wrong');
      void feedback.offsetWidth;
      feedback.classList.add(correct?'completion-result-flash-correct':'completion-result-flash-wrong');
      if(correct){
        const burst=[[-34,-24],[-20,-39],[-7,-31],[10,-40],[25,-29],[37,-17]];
        burst.forEach(([x,y],index)=>{
          const flake=document.createElement('span');flake.className='completion-result-flake';flake.setAttribute('aria-hidden','true');flake.textContent='✦';flake.style.setProperty('--flake-x',`${x}px`);flake.style.setProperty('--flake-y',`${y}px`);flake.style.setProperty('--flake-delay',`${index*35}ms`);feedback.append(flake);
          window.setTimeout(()=>flake.remove(),1050);
        });
      }
    }
    function formatBeats(units){const value=units/12;return Number.isInteger(value)?String(value):String(value).replace('.',',');}
    values.forEach((value,index)=>{
      const button=document.createElement('button');button.type='button';
      if(desktop){button.draggable=true;button.addEventListener('dragstart',event=>{draggingGapIndex=null;station.classList.add('is-dragging','is-palette-dragging');event.dataTransfer.setData('application/x-completion-value',String(index));event.dataTransfer.effectAllowed='copy';const icon=button.querySelector('svg');if(icon){const preview=icon.cloneNode(true);preview.setAttribute('width','48');preview.setAttribute('height','66');preview.style.cssText='position:fixed;left:-1000px;top:0;width:48px;height:66px;color:#202e31';document.body.append(preview);event.dataTransfer.setDragImage(preview,24,33);button.addEventListener('dragend',()=>preview.remove(),{once:true});}});button.addEventListener('dragend',()=>station.classList.remove('is-dragging','is-palette-dragging'));}
      button.innerHTML=`${value.svg||`<svg viewBox="-12 -85 78 120" aria-hidden="true"><path transform="scale(.8 -.8)" d="${window.completionGlyphs[value.code]}" fill="currentColor"/></svg>`}<span>${value.name}</span>`;
      button.addEventListener('click',()=>{if(desktop)return;const next=gaps.find(gap=>canFitVisually(gap,value));if(!next){const feedback=container.querySelector('.completion-feedback');if(feedback)feedback.textContent='In den Lücken ist visuell kein Platz mehr für dieses Zeichen.';return;}add(value,next);});palette.append(button);
    });
    addHelpMarker(palette,'Setze eine Note oder Pause ein: Am Computer ziehst du das gewünschte Symbol in eine Lücke. Auf Touchgeräten tippst du das Symbol an; es wird in die nächste Lücke gesetzt.');
    render();
  }
  function setup(root) {
  const config = window.completionExercises?.[root.dataset.completion];
  if (!config || !window.completionValues) return;
  const values = window.completionValues
    .filter(value => (config.rests || value.id.startsWith('n')) && (config.course > 1 || value.units >= (config.minUnits ?? 2)))
    .map(value => ({...value, units: value.units * 3, rest: value.id.startsWith('r')}));
  if (config.rests && config.course > 1) values.push({id:'r16', name:'Sechzehntelpause', units:3, rest:true, code:'E4E7'});
  if (config.course === 3) {
    values.push({id:'nt',name:'Triolenachtelnote',units:4,triplet:true,code:'E1D7'});
    if (config.rests) values.push({id:'rt',name:'Triolenachtelpause',units:4,triplet:true,rest:true,code:'E4E6'});
  }
  const bars = config.gaps.map(gap => ({...gap, notes:[]}));
  let hasStarted = false;
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
const dragDropEnabled = root.dataset.dragDrop === 'desktop' && window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 700px)').matches;
root.classList.toggle('drag-drop-enabled', dragDropEnabled);
const figure = root.previousElementSibling;
const scoreSource = figure?.querySelector('a, .score-image-wrap, img');
const scoreImage = scoreSource?.matches('img') ? scoreSource : scoreSource?.querySelector('img');
if (!scoreSource || !scoreImage) return;
const score = document.createElement('div');
score.className = 'completion-score';
scoreSource.replaceWith(score);
score.append(scoreImage);
const dialog = document.createElement('dialog');
dialog.className = 'completion-dialog bar-completion';
dialog.setAttribute('aria-label', 'Lücke ergänzen');
const close = document.createElement('button');
close.type = 'button'; close.className = 'completion-close'; close.textContent = 'Fertig · Schließen ×';
const palette = root.querySelector('.completion-palette');
const completionBars = root.querySelector('.completion-bars');
dialog.append(close);
if (!dragDropEnabled) dialog.append(palette);
dialog.append(completionBars);
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
  button.addEventListener('click', () => {
    select(index);
    if (dragDropEnabled && !bars[index].notes.length) { summary.textContent=`Lücke in Takt ${bars[index].bar} ausgewählt. Wähle ein Zeichen oder ziehe es hierher.`; return; }
    opener=button; dialog.showModal();
    (dragDropEnabled ? dialog.querySelector('[data-clear]') : dialog.querySelector('.completion-palette button'))?.focus();
  });
  if (dragDropEnabled) {
    button.addEventListener('dragover', event => { event.preventDefault(); event.dataTransfer.dropEffect='copy'; button.classList.add('completion-drop-ready'); });
    button.addEventListener('dragleave', () => button.classList.remove('completion-drop-ready'));
    button.addEventListener('drop', event => {
      event.preventDefault(); button.classList.remove('completion-drop-ready');
      const value=values[Number(event.dataTransfer.getData('application/x-completion-value'))];
      if (!value) return;
      select(index);
      if (bars[index].notes.length>=32) {summary.textContent='Entferne erst ein Zeichen, bevor du weitere hinzufügst.';return;}
      bars[index].notes.push(value);hasStarted=true;render(index);
      summary.textContent=`${value.name} in Takt ${bars[index].bar} eingesetzt.`;
    });
  }
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
    gaps.forEach((gap, i) => gap.dataset.selected = String(i === index));
  }
  function render(index) {
    const bar = bars[index];
    if (hasStarted) root.querySelector('.completion-drag-demo')?.setAttribute('hidden','');
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
    if (dragDropEnabled) {
      button.draggable=true;
      button.addEventListener('dragstart', event => {
        event.dataTransfer.setData('application/x-completion-value', String(values.indexOf(value)));
        event.dataTransfer.effectAllowed='copy';
        const symbol=button.querySelector('svg');
        if (symbol) {
          const preview=symbol.cloneNode(true);
          preview.setAttribute('width','48'); preview.setAttribute('height','66');
          preview.setAttribute('aria-hidden','true');
          preview.style.cssText='position:fixed;left:-1000px;top:0;width:48px;height:66px;color:#202e31;overflow:visible;';
          document.body.append(preview);
          event.dataTransfer.setDragImage(preview,24,33);
          button.addEventListener('dragend', () => preview.remove(), {once:true});
        }
      });
    }
    const icon = value.svg || `<svg viewBox="-12 -85 78 120" aria-hidden="true"><path transform="scale(.8 -.8)" d="${window.completionGlyphs[value.code]}" fill="currentColor"/>${value.triplet ? '<text x="30" y="-64" text-anchor="middle" font-size="17">3</text>' : ''}</svg>`;
    button.innerHTML = `${icon}<span>${value.name}</span>`;
    button.addEventListener('click', () => {
      if (bars[active].notes.length >= 32) {summary.textContent = 'Entferne erst ein Zeichen, bevor du weitere hinzufügst.'; return;}
      bars[active].notes.push(value); hasStarted=true; render(active);
    });
    root.querySelector('.completion-palette').append(button);
  });
  select(0);
  }
})();

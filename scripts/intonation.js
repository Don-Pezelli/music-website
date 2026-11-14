(() => {
  'use strict';
  const $=id=>document.getElementById(id), pitch=window.PitchDetector;
  const hasVoice=!!$('voice-trainer'),hasEar=!!document.querySelector('[data-ear-trainer]'),centerTrainer=document.querySelector('[data-tonal-center-trainer]');
  if((!hasVoice && !hasEar) || !pitch)return;
  let context, stream, source, analyser, frame=0, request=0, pending=false, history=[],lastFrame=0,heldSince=0,singleToneLastInRange=0,stopMic=()=>{},singleToneAttemptActive=false,singleToneHitRecorded=false,singleToneAdvanceReady=false,singleToneSuccessMessage='',singleToneNeedsAdvance=false,centerIntervalOscillator=null,centerIntervalGain=null,centerIntervalActive=false,centerIntervalButton=null,centerScaleButton=null,centerScalePlaying=false,centerCents=null,setCenterSaveEnabled=()=>{};
  const singleToneSuccessMessages=['Treffer!','Gut gemacht!','Richtig!','Bingo!','Yes!','Korrekt!','Super!','Weiter so!','Genau richtig!','Juppie!','Juhu','Wow!','Nailed it!','Oh yeah!'];
  const singleToneMessageIndexKey='music-method-single-tone-message-index-v1';
  let singleToneMessageIndex=0;
  try{singleToneMessageIndex=Number(localStorage.getItem(singleToneMessageIndexKey))||0;}catch{}
  function nextSingleToneSuccessMessage(){const message=singleToneSuccessMessages[singleToneMessageIndex%singleToneSuccessMessages.length];singleToneMessageIndex=(singleToneMessageIndex+1)%singleToneSuccessMessages.length;try{localStorage.setItem(singleToneMessageIndexKey,String(singleToneMessageIndex));}catch{}return message;}
  let target=60, muteUntil=0, soundGeneration=0, timers=[],oscillators=[],celebrationOscillators=[];
  function setIntervalFlowStep(id){
    ['large-interval-range-button','large-interval-mic-start','large-interval-new','large-interval-replay','large-interval-capture-first','large-interval-capture-second'].forEach(key=>$(key)?.classList.toggle('flow-step-active',key===id));
  }
  function setSingleToneFlowStep(id){
    if(!hasVoice||centerTrainer)return;
    const steps={'voice-range-button':$('voice-range-button'),'mic-start':$('mic-start'),'target-play':$('target-play'),'sing':document.querySelector('#voice-trainer .tuner-display-layout')};
    Object.entries(steps).forEach(([key,element])=>element?.classList.toggle('flow-step-active',key===id));
  }
  const voiceRangeSelect=$('voice-range'),voiceRangeButton=$('voice-range-button'),voiceRangeMenu=$('voice-range-menu'),voiceRangeValue=$('voice-range-value');
  if(voiceRangeSelect&&voiceRangeButton&&voiceRangeMenu&&voiceRangeValue){
    const rangeOptions=[...voiceRangeMenu.querySelectorAll('[data-range-value]')];
    const syncVoiceRange=()=>{const selected=voiceRangeSelect.selectedOptions[0];if(selected){const octave=selected.textContent.split(' · ')[0];voiceRangeValue.textContent=octave;voiceRangeButton.setAttribute('aria-label',`Stimmlage: ${octave}`);}rangeOptions.forEach(option=>option.setAttribute('aria-selected',String(option.dataset.rangeValue===voiceRangeSelect.value)));};
    const closeVoiceRangeMenu=({restoreFocus=false}={})=>{voiceRangeMenu.hidden=true;voiceRangeButton.setAttribute('aria-expanded','false');if(restoreFocus)voiceRangeButton.focus();};
    voiceRangeSelect.addEventListener('change',syncVoiceRange);rangeOptions.forEach(option=>option.setAttribute('aria-selected','false'));
    voiceRangeButton.addEventListener('click',()=>{const open=voiceRangeButton.getAttribute('aria-expanded')!=='true';voiceRangeButton.setAttribute('aria-expanded',String(open));voiceRangeMenu.hidden=!open;if(open)rangeOptions.find(option=>option.dataset.rangeValue===voiceRangeSelect.value)?.focus();});
    voiceRangeButton.addEventListener('keydown',event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();voiceRangeMenu.hidden=false;voiceRangeButton.setAttribute('aria-expanded','true');rangeOptions.find(option=>option.dataset.rangeValue===voiceRangeSelect.value)?.focus();}});
    voiceRangeMenu.addEventListener('click',event=>{const option=event.target.closest('[data-range-value]');if(!option)return;voiceRangeSelect.value=option.dataset.rangeValue;voiceRangeSelect.dispatchEvent(new Event('change',{bubbles:true}));closeVoiceRangeMenu({restoreFocus:true});});
    voiceRangeMenu.addEventListener('keydown',event=>{const current=rangeOptions.indexOf(document.activeElement);if(event.key==='Escape'){event.preventDefault();closeVoiceRangeMenu({restoreFocus:true});}else if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();const delta=event.key==='ArrowDown'?1:-1;rangeOptions[(current+delta+rangeOptions.length)%rangeOptions.length]?.focus();}else if(event.key==='Home'){event.preventDefault();rangeOptions[0]?.focus();}else if(event.key==='End'){event.preventDefault();rangeOptions.at(-1)?.focus();}});
    document.addEventListener('click',event=>{if(!voiceRangeMenu.hidden&&!voiceRangeMenu.contains(event.target)&&!voiceRangeButton.contains(event.target))closeVoiceRangeMenu();});
  }
  const intervalRangeSelect=$('large-interval-range'),intervalRangeButton=$('large-interval-range-button'),intervalRangeMenu=$('large-interval-range-menu'),intervalRangeValue=$('large-interval-range-value');
  if(intervalRangeSelect&&intervalRangeButton&&intervalRangeMenu&&intervalRangeValue){
    const rangeOptions=[...intervalRangeMenu.querySelectorAll('[data-range-value]')];
    const syncIntervalRange=()=>{const selected=intervalRangeSelect.selectedOptions[0];intervalRangeValue.textContent=selected?.value?selected.textContent.split(' · ')[0]:'Stimmlage wählen';intervalRangeButton.setAttribute('aria-label',selected?.value?`Stimmlage: ${intervalRangeValue.textContent}`:'Stimmlage wählen');rangeOptions.forEach(option=>option.setAttribute('aria-selected',String(option.dataset.rangeValue===intervalRangeSelect.value)));$('large-interval-new').disabled=!intervalRangeSelect.value;$('large-interval-mic-start').disabled=!intervalRangeSelect.value;setIntervalFlowStep(intervalRangeSelect.value?'large-interval-mic-start':'large-interval-range-button');};
    const closeIntervalRangeMenu=({restoreFocus=false}={})=>{intervalRangeMenu.hidden=true;intervalRangeButton.setAttribute('aria-expanded','false');if(restoreFocus)intervalRangeButton.focus();};
    const openIntervalRangeMenu=()=>{intervalRangeMenu.hidden=false;intervalRangeButton.setAttribute('aria-expanded','true');rangeOptions.find(option=>option.dataset.rangeValue===intervalRangeSelect.value)?.focus();};
    intervalRangeSelect.addEventListener('change',syncIntervalRange);syncIntervalRange();
    intervalRangeButton.addEventListener('click',()=>{if(intervalRangeButton.getAttribute('aria-expanded')==='true')closeIntervalRangeMenu();else openIntervalRangeMenu();});
    intervalRangeButton.addEventListener('keydown',event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();openIntervalRangeMenu();}});
    intervalRangeMenu.addEventListener('click',event=>{const option=event.target.closest('[data-range-value]');if(!option)return;intervalRangeSelect.value=option.dataset.rangeValue;intervalRangeSelect.dispatchEvent(new Event('change',{bubbles:true}));closeIntervalRangeMenu({restoreFocus:true});});
    intervalRangeMenu.addEventListener('keydown',event=>{const current=rangeOptions.indexOf(document.activeElement);if(event.key==='Escape'){event.preventDefault();closeIntervalRangeMenu({restoreFocus:true});}else if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();const delta=event.key==='ArrowDown'?1:-1;rangeOptions[(current+delta+rangeOptions.length)%rangeOptions.length]?.focus();}else if(event.key==='Home'){event.preventDefault();rangeOptions[0]?.focus();}else if(event.key==='End'){event.preventDefault();rangeOptions.at(-1)?.focus();}});
    document.addEventListener('click',event=>{if(!intervalRangeMenu.hidden&&!intervalRangeMenu.contains(event.target)&&!intervalRangeButton.contains(event.target))closeIntervalRangeMenu();});
  }
  const calibration=$('tuner-calibration'),calibrationOutput=$('tuner-calibration-output');
  function calibrationCents(){return calibration ? Number(calibration.value) : 0;}
  if(calibration && calibrationOutput)calibration.addEventListener('input',()=>{calibrationOutput.textContent=`${calibration.value} Cent`;});
  const tunerOptionsButton=$('tuner-options-toggle'),tunerOptionsMenu=$('tuner-options-menu');
  tunerOptionsButton?.addEventListener('click',()=>{const open=tunerOptionsButton.getAttribute('aria-expanded')!=='true';tunerOptionsButton.setAttribute('aria-expanded',String(open));tunerOptionsButton.setAttribute('aria-label',open?'Optionen schließen':'Optionen öffnen');tunerOptionsMenu.hidden=!open;});
  document.addEventListener('click',event=>{if(tunerOptionsMenu&&!tunerOptionsMenu.hidden&&!tunerOptionsMenu.contains(event.target)&&!tunerOptionsButton.contains(event.target)){tunerOptionsMenu.hidden=true;tunerOptionsButton.setAttribute('aria-expanded','false');tunerOptionsButton.setAttribute('aria-label','Optionen öffnen');}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&tunerOptionsMenu&&!tunerOptionsMenu.hidden){tunerOptionsMenu.hidden=true;tunerOptionsButton.setAttribute('aria-expanded','false');tunerOptionsButton.setAttribute('aria-label','Optionen öffnen');tunerOptionsButton.focus();}});
  const calibrationInfoButton=$('tuner-calibration-info'),calibrationHelp=$('tuner-calibration-help');
  calibrationInfoButton?.addEventListener('click',()=>{const open=calibrationInfoButton.getAttribute('aria-expanded')!=='true';calibrationInfoButton.setAttribute('aria-expanded',String(open));calibrationHelp.hidden=!open;calibrationInfoButton.setAttribute('aria-label',open?'Erklärung zum Mikrofon-Feinabgleich ausblenden':'Erklärung zum Mikrofon-Feinabgleich anzeigen');});
  const singleToneInfoButton=$('single-tone-info'),singleToneInfoPanel=$('single-tone-info-panel');
  singleToneInfoButton?.addEventListener('click',()=>{const open=singleToneInfoButton.getAttribute('aria-expanded')!=='true';singleToneInfoButton.setAttribute('aria-expanded',String(open));singleToneInfoPanel.hidden=!open;singleToneInfoButton.setAttribute('aria-label',open?'Hinweis zur Speicherung und Mikrofonverwendung ausblenden':'Hinweis zur Speicherung und Mikrofonverwendung anzeigen');});
  const status=(message,state='')=>{const panel=$('voice-guidance');if(!panel)return;const output=panel.querySelector('[data-voice-guidance]')||panel;if(output.textContent!==message)output.textContent=message;panel.dataset.state=state;};
  async function audio(){
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)throw Error('Dieser Browser unterstützt die Tonausgabe nicht. Öffne die Seite in einem aktuellen Browser.');
    if(!context || context.state==='closed')context=new Audio();
    if(context.state!=='running')await context.resume();
    if(context.state!=='running')throw Error('Tonausgabe pausiert. Tippe noch einmal auf die Wiedergabetaste.');
    return context;
  }
  function playCelebrationJingle(delay=.9){
    if(!context||context.state!=='running')return;
    const notes=[523.25,659.25,783.99,1046.5],start=context.currentTime+delay,step=.085,duration=.13;
    notes.forEach((frequency,index)=>{
      const oscillator=context.createOscillator(),gain=context.createGain(),when=start+index*step;
      oscillator.type='square';oscillator.frequency.setValueAtTime(frequency,when);
      gain.gain.setValueAtTime(.0001,when);gain.gain.exponentialRampToValueAtTime(.035,when+.012);gain.gain.exponentialRampToValueAtTime(.0001,when+duration);
      oscillator.connect(gain);gain.connect(context.destination);oscillator.start(when);oscillator.stop(when+duration);
      celebrationOscillators.push(oscillator);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();celebrationOscillators=celebrationOscillators.filter(item=>item!==oscillator);};
    });
    muteUntil=Math.max(muteUntil,start+duration+.08);
  }
  function cancelSound(){
    soundGeneration++;timers.forEach(clearTimeout);timers=[];
    oscillators.forEach(osc=>{try{osc.stop();}catch(_){} });oscillators=[];
    celebrationOscillators.forEach(osc=>{try{osc.stop();}catch(_){} });celebrationOscillators=[];
    centerIntervalOscillator=null;centerIntervalGain=null;centerIntervalActive=false;if(centerIntervalButton){centerIntervalButton.textContent='▶ Intervall abspielen';centerIntervalButton.setAttribute('aria-pressed','false');}centerScalePlaying=false;if(centerScaleButton){centerScaleButton.textContent='▶ Tonleiter abspielen';centerScaleButton.setAttribute('aria-pressed','false');}centerTrainer?.querySelector('[data-center-save]')?.setAttribute('disabled','');
    muteUntil=context ? context.currentTime+.25 : 0;
  }
  async function play(notes,where,done,options={}){
    cancelSound();const generation=soundGeneration;
    history=[];heldSince=0;
    try{
      const ctx=await audio();if(generation!==soundGeneration)return;
      const start=ctx.currentTime+(options.startDelay??.05),duration=options.duration??.85,lastDuration=options.lastDuration??duration,gap=options.gap??.35;
      notes.forEach((note,i)=>{
        const at=start+i*(duration+gap),osc=ctx.createOscillator(),gain=ctx.createGain();
        const noteDuration=i===notes.length-1?lastDuration:duration;
        osc.type=options.type??'sine';osc.frequency.value=pitch.frequency(note);
        const volume=options.volume??.16,attack=options.attack??.04,release=options.release??.12;
        gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+attack);gain.gain.setValueAtTime(volume,at+noteDuration-release);gain.gain.linearRampToValueAtTime(0,at+noteDuration);
        osc.connect(gain);gain.connect(ctx.destination);osc.start(at);osc.stop(at+noteDuration+.02);oscillators.push(osc);
        osc.onended=()=>{osc.disconnect();gain.disconnect();oscillators=oscillators.filter(o=>o!==osc);};
      });
      muteUntil=start+(notes.length-1)*(duration+gap)+lastDuration+(options.muteTail??.3);
      if(hasVoice){$('detected-note').textContent='—';$('pitch-pointer').hidden=true;status(where==='voice'?'Höre dir jetzt den Zielton an.':'Zuhören – die Messung pausiert.');$('voice-detail').textContent='';}
      if(where instanceof HTMLElement && where.matches('[data-ear-trainer]')){where.querySelector('[data-ear-new]').disabled=true;where.querySelector('[data-ear-replay]').disabled=true;where.querySelectorAll('[data-answer]').forEach(button=>button.disabled=true);where.querySelector('[data-ear-feedback]').textContent='Höre beide Töne an …';}
      timers.push(setTimeout(()=>{if(generation!==soundGeneration)return;done?.();if(hasVoice && !stream && !done)status(centerTrainer?`Jetzt ${pitch.name(target)} singen. Schalte dafür das Mikrofon ein.`:'Singe den Zielton nach. Schalte dafür das Mikrofon ein.');},(muteUntil-ctx.currentTime)*1000));
    }catch(error){if(where instanceof HTMLElement && where.matches('[data-ear-trainer]'))where.querySelector('[data-ear-feedback]').textContent=error.message;else status(error.message);cancelSound();}
  }
  const ranges={low:[36,60],'octave-c2-c3':[36,48],'octave-g2-g3':[43,55],'octave-c3-c4':[48,60],'octave-g3-g4':[55,67],'octave-c4-c5':[60,72],'octave-g4-g5':[67,79],'octave-c5-c6':[72,84],middle:[48,72],high:[60,84],octave:[60,72]};
  if(hasVoice){
  let centerPair=null,lastCenterInterval=-1,centerNextTimer=0,centerResults={total:0,byOctave:{},byInterval:{}};
  const centerStorageKey='music-method-gehoerbildung2-tonal-center-v1';
  const centerSteps=[2,4,5,7,9,11];
  const centerSound={type:'triangle',duration:.48,gap:.12,volume:.14,attack:.025,release:.08,startDelay:.08,muteTail:.3};
  try{centerResults={...centerResults,...JSON.parse(localStorage.getItem(centerStorageKey)||'{}')};}catch{}
  setCenterSaveEnabled=enabled=>{const button=centerTrainer?.querySelector('[data-center-save]');if(button)button.disabled=!enabled;};
  function updateCenterResults(){if(!centerTrainer)return;const octave=$('voice-range').selectedOptions[0]?.textContent||'gewählte Oktave',count=Number(centerResults.byOctave?.[$('voice-range').value])||0;centerTrainer.querySelector('[data-center-progress]').textContent=`Gespeichert: ${count} richtige Grundtöne in ${octave}. Insgesamt: ${Number(centerResults.total)||0}.`;}
  function saveCenterResult(root,pair){const interval=Math.abs(pair[0]-pair[1]),octave=$('voice-range').value;centerResults.total=(Number(centerResults.total)||0)+1;centerResults.byOctave=centerResults.byOctave||{};centerResults.byInterval=centerResults.byInterval||{};centerResults.byOctave[octave]=(Number(centerResults.byOctave[octave])||0)+1;centerResults.byInterval[interval]=(Number(centerResults.byInterval[interval])||0)+1;centerResults.last={target:pitch.name(root),interval,octave,at:new Date().toISOString()};try{localStorage.setItem(centerStorageKey,JSON.stringify(centerResults));}catch{}updateCenterResults();}
  function chooseCenterPair(){const root=target,available=centerSteps.map((step,index)=>index).filter(index=>index!==lastCenterInterval);const index=available[Math.floor(Math.random()*available.length)];lastCenterInterval=index;centerPair=[root+centerSteps[index],root];return centerPair;}
  function stopCenterInterval(){if(!centerIntervalActive)return;centerIntervalActive=false;const oscillator=centerIntervalOscillator,gain=centerIntervalGain;centerIntervalOscillator=null;centerIntervalGain=null;if(oscillator){try{gain?.gain.setTargetAtTime(0,context.currentTime,.015);oscillator.stop(context.currentTime+.06);}catch{} }muteUntil=context?context.currentTime+.25:0;history=[];heldSince=0;centerCents=null;singleToneAttemptActive=true;singleToneHitRecorded=false;setCenterSaveEnabled(true);if(centerIntervalButton){centerIntervalButton.textContent='▶ Intervall abspielen';centerIntervalButton.setAttribute('aria-pressed','false');}const root=target;$('voice-detail').textContent=`Zielton: ${pitch.name(root)} · Halte ihn möglichst ruhig.`;status(stream?`Jetzt ${pitch.name(root)} singen und den Grundton halten.`:`Jetzt ${pitch.name(root)} singen. Schalte dafür das Mikrofon ein.`);}
  async function playCenterInterval(){if(!centerTrainer)return;if(centerIntervalActive){stopCenterInterval();return;}if(centerNextTimer){clearTimeout(centerNextTimer);centerNextTimer=0;}if(!centerPair)chooseCenterPair();centerTrainer.querySelector('[data-center-result]').dataset.state='ready';centerTrainer.querySelector('[data-center-result]').textContent='Höre den neuen Ton und singe danach den Grundton.';cancelSound();const note=centerPair[0],root=target;singleToneAttemptActive=false;singleToneHitRecorded=false;setCenterSaveEnabled(false);try{const ctx=await audio(),osc=ctx.createOscillator(),gain=ctx.createGain(),start=ctx.currentTime+.08;osc.type='triangle';osc.frequency.value=pitch.frequency(note);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.14,start+.025);osc.connect(gain);gain.connect(ctx.destination);osc.start(start);oscillators.push(osc);osc.onended=()=>{osc.disconnect();gain.disconnect();oscillators=oscillators.filter(item=>item!==osc);};centerIntervalOscillator=osc;centerIntervalGain=gain;centerIntervalActive=true;muteUntil=Infinity;centerIntervalButton.textContent='■ Intervall stoppen';centerIntervalButton.setAttribute('aria-pressed','true');$('voice-detail').textContent=`Intervallton: ${pitch.name(note)} · Stoppe den Ton, wenn du bereit bist.`;status(`Der Ton ${pitch.name(note)} erklingt. Drücke den Knopf erneut, um ihn zu stoppen.`);}catch(error){status(error.message);cancelSound();}}
  function recordCenterSuccess(){if(!centerTrainer||!centerPair)return;const completed=[...centerPair],root=target;saveCenterResult(root,completed);centerPair=null;if(centerIntervalButton)centerIntervalButton.textContent='▶ Neues Intervall abspielen';status('Richtig gehalten und gespeichert. Ein neues Intervall ist bereit.','hit');}
  const targetSelector=$('target-note');
  function setTarget(note){target=note;history=[];heldSince=0;singleToneLastInRange=0;singleToneAttemptActive=false;singleToneHitRecorded=false;$('target-name').textContent=pitch.name(target);if(targetSelector)targetSelector.value=String(target);$('detected-note').textContent='—';$('pitch-pointer').hidden=true;$('voice-detail').textContent='';status(document.querySelector('[data-tonal-center-trainer]')?'Höre zuerst die Tonleiter und das Intervallpaar.':'Höre zuerst den Zielton.');}
  function populate(){const [low,high]=ranges[$('voice-range').value];if(targetSelector){targetSelector.replaceChildren();for(let n=low;n<=high;n++){const option=document.createElement('option');option.value=n;option.textContent=pitch.name(n);targetSelector.append(option);}}setTarget(document.querySelector('[data-tonal-center-trainer]')?low:Math.min(high,Math.max(low,target)));}
  $('voice-range').addEventListener('change',()=>{cancelSound();centerPair=null;singleToneNeedsAdvance=false;singleToneAdvanceReady=false;$('target-play').textContent='▶ Zielton hören';populate();updateCenterResults();if(!centerTrainer){$('mic-start').disabled=false;$('target-play').disabled=!stream;status(stream?'Höre dir jetzt den Zielton an.':'Schalte jetzt das Mikrofon ein.');setSingleToneFlowStep(stream?'target-play':'mic-start');}});
  targetSelector?.addEventListener('change',()=>{cancelSound();singleToneNeedsAdvance=false;singleToneAdvanceReady=false;$('target-play').textContent='▶ Zielton hören';setTarget(Number(targetSelector.value));});
  function chooseDifferentTarget(){const [low,high]=ranges[$('voice-range').value];if(high<=low)return low;let note;do{note=low+Math.floor(Math.random()*(high-low+1));}while(note===target);return note;}
  $('target-random').addEventListener('click',()=>{cancelSound();singleToneNeedsAdvance=false;singleToneAdvanceReady=false;$('target-play').textContent='▶ Zielton hören';setTarget(chooseDifferentTarget());if(!centerTrainer){status(stream?'Neuer Zielton gewählt. Höre ihn jetzt an.':'Neuer Zielton gewählt. Schalte jetzt das Mikrofon ein.');setSingleToneFlowStep(stream?'target-play':'mic-start');}else status(`Neuer Zielton: ${pitch.name(target)}. Spiele ihn ab und singe ihn nach.`);});
  $('single-tone-reset')?.addEventListener('click',()=>{cancelSound();window.resetSingleToneProgress?.();window.location.reload();});
  $('target-play').addEventListener('click',()=>{if(singleToneNeedsAdvance){setTarget(chooseDifferentTarget());singleToneNeedsAdvance=false;}singleToneAdvanceReady=false;singleToneSuccessMessage='';heldSince=0;singleToneLastInRange=0;$('target-play').textContent='▶ Zielton hören';singleToneAttemptActive=true;singleToneHitRecorded=false;if(window.recordSingleToneAttempt)window.recordSingleToneAttempt();setSingleToneFlowStep('target-play');play([target],'voice',()=>{if(!centerTrainer){if(stream){status('Singe den Zielton nach und halte ihn zwei Sekunden im Zielbereich.');setSingleToneFlowStep('sing');}else setSingleToneFlowStep('mic-start');}});});
  populate();
  if(!$('mic-stop')&&!centerTrainer){$('mic-start').disabled=true;$('target-play').disabled=true;status('Wähle zuerst deine Stimmlage.');setSingleToneFlowStep('voice-range-button');}
  updateCenterResults();
  if(centerTrainer){
    const feedback=centerTrainer.querySelector('[data-center-result]');
    const showCenterFeedback=(state,message)=>{feedback.dataset.state=state;feedback.textContent=message;};
    centerTrainer.querySelector('[data-center-save]').addEventListener('click',()=>{
      if(!singleToneAttemptActive||singleToneHitRecorded)return;
      if(centerCents===null){showCenterFeedback('incorrect','Noch kein Ton erkannt. Singe einen einzelnen, kräftigen Ton und versuche es erneut.');status('Noch kein Ton erkannt. Singe einen ruhigen Ton und versuche es erneut.');return;}
      if(Math.abs(centerCents)>40){showCenterFeedback('incorrect',centerCents<0?'Noch zu tief. Singe etwas höher und speichere, wenn der Zeiger mittig steht.':'Noch zu hoch. Singe etwas tiefer und speichere, wenn der Zeiger mittig steht.');status('Der Ton liegt noch außerhalb des Zielbereichs. Korrigiere die Tonhöhe und versuche es erneut.');return;}
      singleToneHitRecorded=true;singleToneAttemptActive=false;setCenterSaveEnabled(false);showCenterFeedback('correct','Richtig! Der Grundton sitzt. Dein Treffer wurde gespeichert.');recordCenterSuccess();
    });
    centerScaleButton=centerTrainer.querySelector('[data-center-scale]');centerScaleButton.setAttribute('aria-pressed','false');centerScaleButton.addEventListener('click',()=>{if(centerScalePlaying){cancelSound();singleToneAttemptActive=false;status('Tonleiter gestoppt. Du kannst sie erneut abspielen oder das Intervall starten.');return;}const root=target,centerScale=[root,root+2,root+4,root+5,root+7,root+9,root+11,root+12,root];singleToneAttemptActive=false;singleToneHitRecorded=false;centerCents=null;setCenterSaveEnabled(false);centerTrainer.querySelector('[data-center-result]').dataset.state='ready';centerTrainer.querySelector('[data-center-result]').textContent='Höre die Tonleiter und präge dir den Grundton ein.';play(centerScale,'voice',()=>{centerScalePlaying=false;centerScaleButton.textContent='▶ Tonleiter abspielen';centerScaleButton.setAttribute('aria-pressed','false');status('Tonleiter und Grundton gehört. Spiele jetzt das Intervall.');},{...centerSound,lastDuration:.9});centerScalePlaying=true;centerScaleButton.textContent='■ Tonleiter stoppen';centerScaleButton.setAttribute('aria-pressed','true');});
    centerIntervalButton=centerTrainer.querySelector('[data-center-interval]');centerIntervalButton.setAttribute('aria-pressed','false');centerIntervalButton.addEventListener('click',playCenterInterval);
  }
  }
  const hasLargeInterval=$('large-interval-trainer');
  let intervalStream=null,intervalSource=null,intervalAnalyser=null,intervalFrame=0,intervalHistory=[],intervalLastFrame=0,largeInterval=null,largeFirst=null;
  function intervalStatus(message){if($('large-interval-mic-status'))$('large-interval-mic-status').textContent=message;}
  function syncLargeIntervalLiveTuners(){
    if(!hasLargeInterval)return;
    const first=$('large-interval-live-first'),second=$('large-interval-live-second');
    const firstActive=!!intervalStream&&largeFirst===null,secondActive=!!intervalStream&&largeFirst!==null;
    first.dataset.active=String(firstActive);second.dataset.active=String(secondActive);
    if(!firstActive)$('large-interval-live-note-first').textContent='—';
    if(!secondActive)$('large-interval-live-note-second').textContent='—';
  }
  function updateLargeIntervalLiveTuner(result){
    if(!intervalStream)return;
    const which=largeFirst===null?'first':'second',noteOutput=$(`large-interval-live-note-${which}`);
    if(!result){noteOutput.textContent='—';return;}
    const midi=pitch.midi(result.hz),nearest=Math.round(midi),cents=Math.abs((midi-nearest)*100);
    noteOutput.textContent=cents<=35?pitch.name(nearest):'—';
  }
  function stopLargeIntervalMic(message='Mikrofon aus. Die Auswertung erfolgt auf deinem Gerät.'){
    if(intervalFrame)cancelAnimationFrame(intervalFrame);intervalFrame=0;
    if(intervalStream)intervalStream.getTracks().forEach(track=>track.stop());intervalStream=null;
    if(intervalSource)intervalSource.disconnect();if(intervalAnalyser)intervalAnalyser.disconnect();intervalSource=intervalAnalyser=null;
    intervalHistory=[];
    if(hasLargeInterval){const micButton=$('large-interval-mic-start'),indicator=$('large-interval-on-air');micButton.disabled=false;micButton.setAttribute('aria-pressed','false');micButton.setAttribute('aria-label','Mikrofon einschalten');micButton.title='Mikrofon einschalten';indicator.dataset.active='false';indicator.setAttribute('aria-label','Mikrofon aus');$('large-interval-capture-first').disabled=true;$('large-interval-capture-second').disabled=true;}
    intervalStatus(message);syncLargeIntervalLiveTuners();setIntervalFlowStep('large-interval-mic-start');
  }
  function listenLargeInterval(time){
    if(!intervalStream||!intervalAnalyser)return;intervalFrame=requestAnimationFrame(listenLargeInterval);if(time-intervalLastFrame<100)return;intervalLastFrame=time;
    if(context.currentTime<muteUntil){intervalHistory=[];return;}
    const samples=new Float32Array(intervalAnalyser.fftSize);intervalAnalyser.getFloatTimeDomainData(samples);const result=pitch.detect(samples,context.sampleRate);
    if(!result){intervalHistory=[];updateLargeIntervalLiveTuner(null);return;}
    intervalHistory.push(pitch.midi(result.hz));if(intervalHistory.length>9)intervalHistory.shift();updateLargeIntervalLiveTuner(result);
  }
  if(hasLargeInterval){
    const firstOutput=$('large-interval-first'),secondOutput=$('large-interval-second');
    function nextLargeInterval(){$('large-interval-prompt').closest('.large-interval-display').dataset.state='';const [rangeLow,rangeHigh]=$('large-interval-range').value.split('-').map(Number),maxDistance=Math.min(11,rangeHigh-rangeLow),distance=7+Math.floor(Math.random()*(maxDistance-6)),first=rangeLow+Math.floor(Math.random()*(rangeHigh-rangeLow-distance+1));largeInterval={first,second:first+distance,distance,heard:false};largeFirst=null;syncLargeIntervalLiveTuners();firstOutput.textContent=secondOutput.textContent='—';$('large-interval-capture-first').disabled=true;$('large-interval-capture-second').disabled=true;$('large-interval-prompt').textContent='Intervall wird abgespielt …';setIntervalFlowStep(null);play([first,first+distance],'sequence',()=>{largeInterval.heard=true;$('large-interval-prompt').textContent='Jetzt Ton 1 singen.';$('large-interval-replay').disabled=false;$('large-interval-capture-first').disabled=!intervalStream;$('large-interval-new').disabled=false;setIntervalFlowStep(intervalStream?'large-interval-capture-first':'large-interval-mic-start');});}
    $('large-interval-range').addEventListener('change',()=>{$('large-interval-prompt').closest('.large-interval-display').dataset.state='';largeInterval=null;largeFirst=null;firstOutput.textContent=secondOutput.textContent='—';$('large-interval-replay').disabled=true;$('large-interval-prompt').textContent='';$('large-interval-prompt').textContent='Stimmlage gewählt. Schalte das Mikrofon ein.';$('large-interval-capture-first').disabled=true;$('large-interval-capture-second').disabled=true;syncLargeIntervalLiveTuners();});
    $('large-interval-new').addEventListener('click',()=>{if(intervalStream)intervalHistory=[];$('large-interval-replay').disabled=true;$('large-interval-new').disabled=true;nextLargeInterval();});
    $('large-interval-replay').addEventListener('click',()=>{if(!largeInterval)return;$('large-interval-prompt').closest('.large-interval-display').dataset.state='';largeInterval.heard=false;largeFirst=null;firstOutput.textContent=secondOutput.textContent='—';syncLargeIntervalLiveTuners();intervalHistory=[];$('large-interval-capture-first').disabled=true;$('large-interval-capture-second').disabled=true;setIntervalFlowStep(null);$('large-interval-prompt').textContent='Intervall wird erneut abgespielt …';play([largeInterval.first,largeInterval.second],'sequence',()=>{largeInterval.heard=true;$('large-interval-capture-first').disabled=!intervalStream;$('large-interval-prompt').textContent='Jetzt Ton 1 singen.';setIntervalFlowStep(intervalStream?'large-interval-capture-first':'large-interval-mic-start');});});
    $('large-interval-mic-start').addEventListener('click',async()=>{
      if(intervalStream){stopLargeIntervalMic();return;}
      if(!navigator.mediaDevices?.getUserMedia){intervalStatus('Mikrofon nicht verfügbar. Öffne die Seite über HTTPS oder localhost.');return;}
      $('large-interval-mic-start').disabled=true;intervalStatus('Bitte erlaube den Mikrofonzugriff im Browser.');
      try{await audio();intervalStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});intervalSource=context.createMediaStreamSource(intervalStream);intervalAnalyser=context.createAnalyser();intervalAnalyser.fftSize=8192;intervalSource.connect(intervalAnalyser);intervalStream.getAudioTracks().forEach(track=>track.addEventListener('ended',()=>{if(intervalStream)stopLargeIntervalMic('Die Mikrofonverbindung wurde beendet.');}));intervalStatus('');const micButton=$('large-interval-mic-start'),indicator=$('large-interval-on-air');micButton.disabled=false;micButton.setAttribute('aria-pressed','true');micButton.setAttribute('aria-label','Mikrofon ausschalten');micButton.title='Mikrofon ausschalten';indicator.dataset.active='true';indicator.setAttribute('aria-label','Mikrofon aktiv');syncLargeIntervalLiveTuners();if(largeInterval?.heard){$('large-interval-prompt').textContent='Jetzt Ton 1 singen.';$('large-interval-capture-first').disabled=false;setIntervalFlowStep('large-interval-capture-first');}else{$('large-interval-prompt').textContent='Mikrofon aktiv. Spiele jetzt ein Intervall ab.';setIntervalFlowStep('large-interval-new');}intervalFrame=requestAnimationFrame(listenLargeInterval);}
      catch(error){stopLargeIntervalMic(error.name==='NotAllowedError'?'Mikrofonzugriff nicht erlaubt. Erlaube ihn in den Website-Einstellungen.':'Das Mikrofon konnte nicht gestartet werden. Prüfe Verbindung und Mikrofon.');}
    });
    function captureLargeTone(){if(intervalHistory.length<3){$('large-interval-prompt').textContent='Ton noch nicht sicher erkannt. Singe ihn kurz und stabil, dann übernimm ihn.';return null;}const values=[...intervalHistory].sort((a,b)=>a-b),tone=values[Math.floor(values.length/2)],spread=values[values.length-1]-values[0];if(spread>1.2){$('large-interval-prompt').textContent='Dein Ton schwankt noch. Halte ihn kurz stabil und übernimm ihn erneut.';return null;}intervalHistory=[];return tone;}
    $('large-interval-capture-first').addEventListener('click',()=>{if(!largeInterval?.heard)return;const tone=captureLargeTone();if(tone===null)return;largeFirst=tone;firstOutput.textContent=pitch.name(Math.round(tone));syncLargeIntervalLiveTuners();$('large-interval-capture-first').disabled=true;$('large-interval-capture-second').disabled=false;$('large-interval-prompt').textContent='Jetzt Ton 2 singen.';setIntervalFlowStep('large-interval-capture-second');});
    $('large-interval-capture-second').addEventListener('click',()=>{if(largeFirst===null)return;const tone=captureLargeTone();if(tone===null)return;const sung=tone-largeFirst,error=sung-largeInterval.distance,hit=Math.abs(error)<=.75,detail=hit?'Richtig erkannt! Dein gesungener Abstand liegt nah genug am Zielintervall.':error<0?'Der gesungene Abstand war kleiner als das Zielintervall. Höre noch einmal hin und versuche es erneut.':'Der gesungene Abstand war größer als das Zielintervall. Höre noch einmal hin und versuche es erneut.';secondOutput.textContent=pitch.name(Math.round(tone));$('large-interval-prompt').textContent=`${hit?'Richtig!':detail} Gemessen: ${Math.abs(sung).toFixed(1).replace('.',',')} Halbtonschritte; Ziel: ${largeInterval.distance}.`;$('large-interval-prompt').closest('.large-interval-display').dataset.state=hit?'hit':'';$('large-interval-capture-second').disabled=true;largeFirst=null;syncLargeIntervalLiveTuners();if(window.recordLargeIntervalResult)window.recordLargeIntervalResult(hit);if(hit)playCelebrationJingle();$('large-interval-capture-first').disabled=false;setIntervalFlowStep(hit?'large-interval-new':'large-interval-replay');});
  }
  // Add scored sing-back tools to the interval and melody groups in chapter 2.
  const sequenceGroups = [
    { match: 'Mittlere Intervalle', key: 'middleIntervals', minDistance: 3, maxDistance: 7 },
    { match: 'Kleine Intervalle', key: 'smallIntervals', minDistance: 2, maxDistance: 4 },
    { match: 'Einfache Melodien', key: 'simpleMelodies', items: [['Folge 1 · C4–D4–E4–G4–E4','60,62,64,67,64'],['Folge 2 · G3–C4–D4–C4–G3','55,60,62,60,55'],['Folge 3 · E4–G4–A4–G4–E4','64,67,69,67,64']] },
    { match: 'Anspruchsvollere Melodien', key: 'advancedMelodies', items: [['Folge 1 · C4–G4–E4–F4–D4','60,67,64,65,62'],['Folge 2 · D4–B3–F#4–A4–G4','62,59,66,69,67'],['Folge 3 · A3–E4–C4–F4–D4','57,64,60,65,62']] }
  ];
  if (hasVoice) sequenceGroups.forEach(group => {
    const section = [...document.querySelectorAll('.lesson-section')].find(item => item.querySelector('h2')?.textContent.includes(group.match));
    const description = section?.querySelector('h2')?.nextElementSibling;
    if (!description) return;
    if (group.minDistance) {
      const panel = document.createElement('div');
      panel.className = `intonation-panel sequence-trainer interval-tool large-interval-trainer ${group.key === 'middleIntervals' ? 'interval-tool-blue-green' : 'interval-tool-yellow-green'}`;
      panel.dataset.sequenceTrainer = group.key;
      panel.dataset.intervalStation = 'true';
      panel.id = `sequence-${group.key}`;
      const octaveOptions = [
        ['36-48', 'C2–C3 · Sehr tiefe Männerstimme'],
        ['43-55', 'G2–G3 · Tiefe Männerstimme'],
        ['48-60', 'C3–C4 · Mittlere Männerstimme'],
        ['55-67', 'G3–G4 · Höhere Männerstimme'],
        ['60-72', 'C4–C5 · Viele Frauenstimmen'],
        ['67-79', 'G4–G5 · Hohe Frauenstimme']
      ];
      const menuOptions = octaveOptions.map(([value, label]) => `<button type="button" class="voice-range-option" role="option" data-range-value="${value}" aria-selected="false">${label}</button>`).join('');
      const nativeOptions = octaveOptions.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
      panel.innerHTML = `<h3>Intervall nachsingen und prüfen</h3><p>Höre das Intervall. Singe Ton 1 und Ton 2 nacheinander und übernimm beide einzeln.</p><div class="interval-voice-settings"><div class="voice-range-control"><button type="button" class="voice-range-button" data-interval-range-button aria-haspopup="listbox" aria-expanded="false" aria-label="Stimmlage wählen"><span data-interval-range-value>Stimmlage wählen</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 6 5 5 5-5"/></svg></button><div class="voice-range-menu" data-interval-range-menu hidden><div class="voice-range-hint">Grobe Orientierung; Stimmumfänge überschneiden sich.</div><div class="voice-range-listbox" role="listbox" aria-label="Stimmlage auswählen">${menuOptions}</div></div><select class="voice-range-native" data-interval-range aria-hidden="true" tabindex="-1"><option value="" selected disabled>Stimmlage wählen</option>${nativeOptions}</select></div><button type="button" class="mic-toggle-button" data-interval-mic aria-label="Mikrofon einschalten" title="Mikrofon einschalten" aria-pressed="false" disabled><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="9" y="2" width="6" height="12" rx="3"></rect><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"></path><path data-mic-slash d="M4 4l16 16"></path></svg></button><span class="mic-on-air" data-interval-on-air data-active="false" role="status" aria-live="polite" aria-label="Mikrofon aus"><i aria-hidden="true"></i><span>ON AIR</span></span><div class="intonation-actions large-interval-play-actions"><button type="button" data-sequence-play disabled>▶ Neues Intervall hören</button><button type="button" class="secondary" data-sequence-replay disabled>Noch einmal hören</button></div></div><div class="large-interval-display"><p data-sequence-prompt role="status" aria-live="polite">Wähle zuerst deine Stimmlage.</p><div class="large-interval-score" role="status" aria-live="polite"><span>Richtig / Versuche</span><strong data-sequence-score="${group.key}">0 / 0</strong></div></div><div class="voice-readout large-interval-readout"><div class="large-interval-tone-card"><span>Ton 1</span><div class="interval-tone-result-row"><strong data-interval-captured-first>—</strong><button type="button" class="interval-capture-button" data-interval-capture-first disabled>Ton 1 übernehmen</button></div><div class="interval-live-tuner" data-interval-live-first data-active="false"><div class="interval-live-note"><span>Deine Stimme</span><strong data-interval-note-first>—</strong></div></div></div><div class="large-interval-tone-card"><span>Ton 2</span><div class="interval-tone-result-row"><strong data-interval-captured-second>—</strong><button type="button" class="interval-capture-button" data-interval-capture-second disabled>Ton 2 übernehmen</button></div><div class="interval-live-tuner" data-interval-live-second data-active="false"><div class="interval-live-note"><span>Deine Stimme</span><strong data-interval-note-second>—</strong></div></div></div></div>`;
      description.insertAdjacentElement('afterend', panel);

      const find = selector => panel.querySelector(selector);
      const range = find('[data-interval-range]'), rangeButton = find('[data-interval-range-button]'), rangeValue = find('[data-interval-range-value]'), rangeMenu = find('[data-interval-range-menu]');
      const micButton = find('[data-interval-mic]'), onAir = find('[data-interval-on-air]'), playButton = find('[data-sequence-play]'), replayButton = find('[data-sequence-replay]');
      const captureFirst = find('[data-interval-capture-first]'), captureSecond = find('[data-interval-capture-second]');
      const capturedFirst = find('[data-interval-captured-first]'), capturedSecond = find('[data-interval-captured-second]');
      const liveFirst = find('[data-interval-live-first]'), liveSecond = find('[data-interval-live-second]');
      const noteFirst = find('[data-interval-note-first]'), noteSecond = find('[data-interval-note-second]'), prompt = find('[data-sequence-prompt]');
      const flowItems = [rangeButton, micButton, playButton, replayButton, captureFirst, captureSecond];
      const flowStep = active => flowItems.forEach(item => item.classList.toggle('flow-step-active', item === active));
      const display=find('.large-interval-display');
      const setPrompt = (message, state='') => { prompt.textContent = message; display.dataset.state=state; };
      const syncOctave = () => {
        const selected = range.selectedOptions[0];
        rangeValue.textContent = selected?.value ? selected.textContent.split(' · ')[0] : 'Stimmlage wählen';
        rangeButton.setAttribute('aria-label', selected?.value ? `Stimmlage: ${rangeValue.textContent}` : 'Stimmlage wählen');
        rangeMenu.querySelectorAll('[data-range-value]').forEach(option => option.setAttribute('aria-selected', String(option.dataset.rangeValue === range.value)));
        micButton.disabled = !range.value;
        playButton.disabled = !range.value || !mic;
        flowStep(range.value ? micButton : rangeButton);
      };
      const closeMenu = (restoreFocus = false) => { rangeMenu.hidden = true; rangeButton.setAttribute('aria-expanded', 'false'); if (restoreFocus) rangeButton.focus(); };
      rangeButton.addEventListener('click', () => { const open = rangeButton.getAttribute('aria-expanded') !== 'true'; rangeButton.setAttribute('aria-expanded', String(open)); rangeMenu.hidden = !open; if (open) rangeMenu.querySelector('[aria-selected="true"]')?.focus(); });
      rangeButton.addEventListener('keydown', event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); rangeMenu.hidden = false; rangeButton.setAttribute('aria-expanded', 'true'); (rangeMenu.querySelector('[aria-selected="true"]') || rangeMenu.querySelector('[role="option"]'))?.focus(); } });
      rangeMenu.addEventListener('click', event => { const option = event.target.closest('[data-range-value]'); if (!option) return; range.value = option.dataset.rangeValue; range.dispatchEvent(new Event('change', { bubbles: true })); closeMenu(true); });
      rangeMenu.addEventListener('keydown', event => { const options = [...rangeMenu.querySelectorAll('[role="option"]')], index = options.indexOf(document.activeElement); if (event.key === 'Escape') { event.preventDefault(); closeMenu(true); } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); options[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length]?.focus(); } });
      document.addEventListener('click', event => { if (!rangeMenu.hidden && !rangeMenu.contains(event.target) && !rangeButton.contains(event.target)) closeMenu(); });

      let mic = null, micSource = null, micAnalyser = null, micFrame = 0, micLastFrame = 0, samples = [], notes = null, heard = false, firstTone = null, targetDistance = 0;
      const noteStatus = (phase, detected = null) => {
        const firstActive = !!mic && phase === 0, secondActive = !!mic && phase === 1;
        liveFirst.dataset.active = String(firstActive); liveSecond.dataset.active = String(secondActive);
        if (!firstActive) noteFirst.textContent = '—';
        if (!secondActive) noteSecond.textContent = '—';
        const activeNote = phase === 0 ? noteFirst : noteSecond;
        if (!mic || !detected) { activeNote.textContent = '—'; return; }
        const midi = pitch.midi(detected.hz), nearest = Math.round(midi), cents = Math.abs((midi - nearest) * 100);
        activeNote.textContent = cents <= 35 ? pitch.name(nearest) : '—';
      };
      const stopMic = (message = 'Mikrofon aus.') => {
        if (micFrame) cancelAnimationFrame(micFrame); micFrame = 0;
        if (mic) mic.getTracks().forEach(track => track.stop()); mic = null;
        if (micSource) micSource.disconnect(); if (micAnalyser) micAnalyser.disconnect(); micSource = micAnalyser = null; samples = [];
        micButton.disabled = !range.value; micButton.setAttribute('aria-pressed', 'false'); micButton.setAttribute('aria-label', 'Mikrofon einschalten'); micButton.title = 'Mikrofon einschalten';
        onAir.dataset.active = 'false'; onAir.setAttribute('aria-label', 'Mikrofon aus');
        captureFirst.disabled = captureSecond.disabled = true; playButton.disabled = !range.value; noteStatus(firstTone === null ? 0 : 1); setPrompt(message); flowStep(micButton);
      };
      const listen = time => {
        if (!mic || !micAnalyser) return;
        micFrame = requestAnimationFrame(listen); if (time - micLastFrame < 100) return; micLastFrame = time;
        if (context.currentTime < muteUntil) { samples = []; return; }
        const buffer = new Float32Array(micAnalyser.fftSize); micAnalyser.getFloatTimeDomainData(buffer);
        const detected = pitch.detect(buffer, context.sampleRate);
        if (!detected) { samples = []; noteStatus(firstTone === null ? 0 : 1); return; }
        samples.push(pitch.midi(detected.hz)); if (samples.length > 9) samples.shift(); noteStatus(firstTone === null ? 0 : 1, detected);
      };
      const selectTone = () => {
        if (samples.length < 3) { setPrompt('Ton noch nicht sicher erkannt. Singe ihn kurz und stabil, dann übernimm ihn.'); return null; }
        const values = [...samples].sort((a, b) => a - b), tone = values[Math.floor(values.length / 2)];
        if (values[values.length - 1] - values[0] > 1.2) { setPrompt('Dein Ton schwankt noch. Halte ihn kurz stabil und versuche es erneut.'); return null; }
        samples = []; return tone;
      };
      const playInterval = (reuse = false) => {
        if (!range.value) return;
        if (!reuse) {
          const [low, high] = range.value.split('-').map(Number);
          targetDistance = group.minDistance + Math.floor(Math.random() * (group.maxDistance - group.minDistance + 1));
          const first = low + Math.floor(Math.random() * (high - low - targetDistance + 1));
          notes = [first, first + targetDistance];
        }
        firstTone = null; capturedFirst.textContent = capturedSecond.textContent = '—'; samples = []; heard = false;
        captureFirst.disabled = captureSecond.disabled = true; replayButton.disabled = true; playButton.disabled = true;
        setPrompt(reuse ? 'Intervall wird erneut abgespielt …' : 'Intervall wird abgespielt …'); flowStep(null);
        play(notes, 'sequence', () => { heard = true; replayButton.disabled = false; playButton.disabled = false; captureFirst.disabled = !mic; setPrompt(mic ? 'Jetzt Ton 1 singen.' : 'Mikrofon einschalten, dann Ton 1 singen.'); flowStep(mic ? captureFirst : micButton); });
      };
      range.addEventListener('change', () => { notes = null; firstTone = null; heard = false; capturedFirst.textContent = capturedSecond.textContent = '—'; replayButton.disabled = true; captureFirst.disabled = captureSecond.disabled = true; syncOctave(); setPrompt('Stimmlage gewählt. Schalte das Mikrofon ein.'); });
      rangeMenu.querySelectorAll('[data-range-value]').forEach(option => option.setAttribute('aria-selected', 'false'));
      syncOctave();
      playButton.addEventListener('click', () => playInterval(false));
      replayButton.addEventListener('click', () => { if (notes) playInterval(true); });
      micButton.addEventListener('click', async () => {
        if (mic) { stopMic(); return; }
        if (!navigator.mediaDevices?.getUserMedia) { setPrompt('Das Mikrofon benötigt HTTPS oder localhost.'); return; }
        micButton.disabled = true; setPrompt('Bitte erlaube den Mikrofonzugriff im Browser.');
        try {
          await audio(); mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
          micSource = context.createMediaStreamSource(mic); micAnalyser = context.createAnalyser(); micAnalyser.fftSize = 8192; micSource.connect(micAnalyser);
          mic.getAudioTracks().forEach(track => track.addEventListener('ended', () => { if (mic) stopMic('Die Mikrofonverbindung wurde beendet.'); }));
          micButton.disabled = false; micButton.setAttribute('aria-pressed', 'true'); micButton.setAttribute('aria-label', 'Mikrofon ausschalten'); micButton.title = 'Mikrofon ausschalten'; onAir.dataset.active = 'true'; onAir.setAttribute('aria-label', 'Mikrofon aktiv');
          playButton.disabled = false; setPrompt('Mikrofon aktiv. Spiele jetzt ein Intervall ab.'); flowStep(playButton); micFrame = requestAnimationFrame(listen);
        } catch (error) { stopMic(error.name === 'NotAllowedError' ? 'Mikrofonzugriff nicht erlaubt. Erlaube ihn in den Website-Einstellungen.' : 'Das Mikrofon konnte nicht gestartet werden. Prüfe Verbindung und Mikrofon.'); }
      });
      captureFirst.addEventListener('click', () => {
        if (!heard || !mic) return; const tone = selectTone(); if (tone === null) return;
        firstTone = tone; capturedFirst.textContent = pitch.name(Math.round(tone)); noteStatus(1); captureFirst.disabled = true; captureSecond.disabled = false;
        setPrompt('Jetzt Ton 2 singen.'); flowStep(captureSecond);
      });
      captureSecond.addEventListener('click', () => {
        if (firstTone === null || !mic) return; const tone = selectTone(); if (tone === null) return;
        capturedSecond.textContent = pitch.name(Math.round(tone)); const error = tone - firstTone - targetDistance, hit = Math.abs(error) <= .75;
        setPrompt(hit ? `Richtig! Der Abstand passt. Ziel: ${targetDistance} Halbtonschritte.` : `Noch nicht richtig. Der gesungene Abstand war ${error < 0 ? 'kleiner' : 'größer'} als das Ziel.`, hit ? 'hit' : '');
        captureSecond.disabled = true; firstTone = null; noteStatus(0); if (window.recordIntervalStationResult) window.recordIntervalStationResult(group.key, hit); if(hit)playCelebrationJingle();
        captureFirst.disabled = true; flowStep(hit ? playButton : replayButton);
      });
      window.addEventListener('pagehide', () => stopMic('Mikrofon pausiert.'));
      return;
    }
    const panel = document.createElement('div');
    panel.className = 'intonation-panel sequence-trainer interval-tool';
    if(group.key==='middleIntervals')panel.classList.add('interval-tool-blue-green');
    if(group.key==='smallIntervals')panel.classList.add('interval-tool-yellow-green');
    panel.dataset.sequenceTrainer = group.key;
    panel.id = `sequence-${group.key}`;
    const isMelody = group.key.includes('Melodies');
    const options = group.items?.map(([label, sequence]) => `<option value="${sequence}">${label}</option>`).join('') || '';
    const intervalInfo = group.minDistance ? `<p>Bei jedem neuen Intervall wird ein zufälliges Zweiton-Beispiel erzeugt (${group.minDistance} bis ${group.maxDistance} Halbtonschritte).</p>` : `<label>Tonfolge<select data-sequence-choice>${options}</select></label>`;
    const playLabel = group.minDistance ? '▶ Neues Intervall hören' : '▶ Folge hören';
    panel.innerHTML = `<h3>Nachsingen und prüfen</h3>${intervalInfo}<div class="intonation-actions"><button type="button" data-sequence-play>${playLabel}</button><button type="button" class="secondary" data-sequence-replay disabled>Folge erneut hören</button></div>${isMelody ? '<div class="intonation-actions"><button type="button" data-melody-record disabled>● Ganze Melodie aufnehmen</button><button type="button" class="secondary" data-melody-finish disabled>Aufnahme auswerten</button></div>' : ''}<p data-sequence-prompt role="status" aria-live="polite">Höre das Intervall an und singe es nach.</p><div class="intonation-actions"><button type="button" data-sequence-mic-start>Mikrofon einschalten</button><button type="button" class="secondary" data-sequence-mic-stop disabled>Mikrofon ausschalten</button><button type="button" data-sequence-capture disabled>Ton 1 übernehmen</button></div><p data-sequence-status role="status">Mikrofon aus. Die Auswertung erfolgt auf deinem Gerät.</p><p data-sequence-result role="status" aria-live="polite">Übernimm die gesungenen Töne nacheinander.</p><p data-sequence-progress role="status" aria-live="polite">Treffer werden nach jeder vollständigen Folge gespeichert.</p>`;
    description.insertAdjacentElement('afterend', panel);
    const $panel = selector => panel.querySelector(selector);
    let notes = [], index = 0, heard = false, samples = [], mic = null, micSource = null, micAnalyser = null, micFrame = 0, micLastFrame = 0, noteHits = 0, melodyRecording = false, melodyFrames = [];
    const prompt = message => { $panel('[data-sequence-prompt]').textContent = message; };
    const micStatus = message => { $panel('[data-sequence-status]').textContent = message; };
    const resultStatus = message => { $panel('[data-sequence-result]').textContent = message; };
    const playCurrentSequence = () => {
      index = noteHits = 0; samples = []; heard = false;
      $panel('[data-sequence-capture]').disabled = true;
      $panel('[data-sequence-replay]').disabled = true;
      prompt('Höre aufmerksam an.');
      resultStatus('Singe die Töne nacheinander und übernimm sie einzeln.');
      play(notes, 'sequence', () => { heard = true; prompt('Jetzt nachsingen und Ton für Ton übernehmen.');$panel('[data-sequence-capture]').disabled = !mic;$panel('[data-sequence-replay]').disabled = false;if (isMelody) $panel('[data-melody-record]').disabled = !mic; });
    };
    const playSequence = () => {
      if (group.minDistance) {
        const distance = group.minDistance + Math.floor(Math.random() * (group.maxDistance - group.minDistance + 1));
        const low = 48, high = 72;
        const first = low + Math.floor(Math.random() * (high - low - distance + 1));
        notes = [first, first + distance];
        prompt('Höre das neue Intervall aufmerksam an.');
      } else {
        notes = $panel('[data-sequence-choice]').value.split(',').map(Number);
        index = noteHits = 0; samples = [];
      }
      playCurrentSequence();
    };
    const listen = time => {
      if (!mic || !micAnalyser) return;
      micFrame = requestAnimationFrame(listen);
      if (time - micLastFrame < 100) return;
      micLastFrame = time;
      if (context.currentTime < muteUntil) { samples = []; if (melodyRecording) melodyFrames.push(null); return; }
      const buffer = new Float32Array(micAnalyser.fftSize);
      micAnalyser.getFloatTimeDomainData(buffer);
      const detected = pitch.detect(buffer, context.sampleRate);
      if (!detected) { samples = []; if (melodyRecording) melodyFrames.push(null); return; }
      const midi = pitch.midi(detected.hz);
      if (melodyRecording) melodyFrames.push(midi);
      samples.push(midi);
      if (samples.length > 9) samples.shift();
    };
    const startMic = async () => {
      if (mic) return;
      if (!navigator.mediaDevices?.getUserMedia) { micStatus('Mikrofon benötigt HTTPS oder localhost.'); return; }
      $panel('[data-sequence-mic-start]').disabled = true;
      micStatus('Bitte erlaube den Mikrofonzugriff im Browser.');
      try {
        await audio();
        mic = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
        micSource = context.createMediaStreamSource(mic); micAnalyser = context.createAnalyser(); micAnalyser.fftSize = 8192; micSource.connect(micAnalyser);
        mic.getAudioTracks().forEach(track => track.addEventListener('ended', () => stopMic('Mikrofonverbindung beendet.')));
        micStatus('');
        $panel('[data-sequence-mic-stop]').disabled = false;
        if (heard) $panel('[data-sequence-capture]').disabled = false;
        if (isMelody && heard) $panel('[data-melody-record]').disabled = false;
        micFrame = requestAnimationFrame(listen);
      } catch (error) {
        stopMic(error.name === 'NotAllowedError' ? 'Mikrofonzugriff nicht erlaubt.' : 'Mikrofon konnte nicht gestartet werden.');
      }
    };
    const finishMelodyRecording = () => {
      if (!melodyRecording) return;
      melodyRecording = false;
      $panel('[data-melody-record]').disabled = !mic;
      $panel('[data-melody-finish]').disabled = true;
      const runs = []; let run = [], previous = null;
      const saveRun = () => { if (run.length >= 3) runs.push(run.reduce((sum, value) => sum + value, 0) / run.length); run = []; };
      melodyFrames.forEach(value => {
        if (value === null) { saveRun(); previous = null; return; }
        const rounded = Math.round(value);
        if (previous !== null && rounded !== previous) saveRun();
        run.push(value); previous = rounded;
      });
      saveRun(); melodyFrames = [];
      const hits = notes.reduce((sum, expected, i) => sum + (runs[i] !== undefined && Math.abs(runs[i] - expected) <= .75 ? 1 : 0), 0);
      resultStatus(`Aufnahme ausgewertet: ${runs.length} von ${notes.length} Tönen erkannt, ${hits} richtig getroffen.`);
      prompt('Wähle eine weitere Folge oder nimm die Melodie noch einmal auf.');
      if (window.recordSequenceResult) $panel('[data-sequence-progress]').textContent = window.recordSequenceResult(group.key, hits, notes.length);
    };
    const stopMic = message => {
      if (melodyRecording) finishMelodyRecording();
      if (micFrame) cancelAnimationFrame(micFrame); micFrame = 0;
      if (mic) mic.getTracks().forEach(track => track.stop()); mic = null;
      if (micSource) micSource.disconnect(); if (micAnalyser) micAnalyser.disconnect(); micSource = micAnalyser = null; samples = [];
      $panel('[data-sequence-mic-start]').disabled = false; $panel('[data-sequence-mic-stop]').disabled = true; $panel('[data-sequence-capture]').disabled = true;
      micStatus(message || 'Mikrofon aus. Die Auswertung erfolgt auf deinem Gerät.');
    };
    if (isMelody) {
      $panel('[data-melody-record]').addEventListener('click', () => {
        if (!heard || !mic) return;
        melodyFrames = []; melodyRecording = true;
        $panel('[data-melody-record]').disabled = true;
        $panel('[data-melody-finish]').disabled = false;
        resultStatus('Aufnahme läuft. Singe die ganze Melodie und beende die Aufnahme danach.');
      });
      $panel('[data-melody-finish]').addEventListener('click', finishMelodyRecording);
    }
    $panel('[data-sequence-play]').addEventListener('click', playSequence);
    $panel('[data-sequence-replay]').addEventListener('click', playCurrentSequence);
    $panel('[data-sequence-mic-start]').addEventListener('click', startMic);
    $panel('[data-sequence-mic-stop]').addEventListener('click', () => stopMic());
    $panel('[data-sequence-capture]').addEventListener('click', () => {
      if (!heard || index >= notes.length) return;
      if (samples.length < 3) { resultStatus('Ton noch nicht sicher erkannt. Singe ihn kurz und stabil und übernimm ihn erneut.'); return; }
      const sorted = [...samples].sort((a,b) => a-b), tone = sorted[Math.floor(sorted.length/2)], spread = sorted[sorted.length-1] - sorted[0];
      if (spread > 1.2) { resultStatus('Der Ton schwankt noch. Halte ihn kurz stabil und versuche es erneut.'); return; }
      samples = [];
      const hit = Math.abs(tone - notes[index]) <= .75;
      if (hit) noteHits++;
      index++;
      if (index < notes.length) {
        $panel('[data-sequence-capture]').textContent = `Ton ${index+1} übernehmen`;
        resultStatus(`${hit ? 'Getroffen' : 'Noch nicht getroffen'} · ${pitch.name(Math.round(tone))}. Singe jetzt Ton ${index+1}.`);
      } else {
        const total = notes.length;
        resultStatus(`Folge abgeschlossen: ${noteHits} von ${total} Tönen getroffen.`);
        prompt('Wähle eine weitere Folge oder übe diese noch einmal.');
        $panel('[data-sequence-capture]').disabled = true;
        if (window.recordSequenceResult) $panel('[data-sequence-progress]').textContent = window.recordSequenceResult(group.key, noteHits, total);
      }
    });
    $panel('[data-sequence-choice]')?.addEventListener('change', () => { heard = false; $panel('[data-sequence-capture]').disabled = true;if (isMelody) $panel('[data-melody-record]').disabled = true; $panel('[data-sequence-replay]').disabled = true; prompt('Ausgewählt. Spiele die Folge ab, bevor du sie nachsingst.'); });
    window.addEventListener('pagehide', () => stopMic('Mikrofon aus.'));
  });

  if(hasEar){
  const intervalNames={1:'kleine Sekunde',2:'große Sekunde',3:'kleine Terz',4:'große Terz',5:'reine Quarte',7:'reine Quinte',12:'reine Oktave'};
  const earRegisterToggle=$('ear-register-toggle'),earRegisterStatus=$('ear-register-status');
  let earRegisterShift=0;
  earRegisterToggle?.addEventListener('click',()=>{
    earRegisterShift=earRegisterToggle.getAttribute('aria-pressed')==='true'?0:12;
    const shifted=earRegisterShift===12;
    earRegisterToggle.setAttribute('aria-pressed',String(shifted));
    earRegisterToggle.textContent=shifted?'Tiefe Töne wieder einblenden':'Tiefe Töne ausblenden';
    if(earRegisterStatus)earRegisterStatus.textContent=shifted?'Neue und erneut abgespielte Tonpaare erklingen eine Oktave höher; die drei Richtungen bleiben unverändert.':'Neue und erneut abgespielte Tonpaare erklingen wieder im normalen Tonbereich.';
  });
  const earStations=[...document.querySelectorAll('[data-ear-trainer]')];
  earStations.forEach(station=>{
    const stationAnswers=[...station.querySelectorAll('[data-answer]')],stage=station.dataset.stage;
    let ear=null,answered=0,correct=0;
    const find=selector=>station.querySelector(selector);
    function resetEar(){cancelSound();ear=null;answered=correct=0;stationAnswers.forEach(button=>button.disabled=true);find('[data-ear-new]').disabled=false;find('[data-ear-replay]').disabled=true;find('[data-ear-feedback]').textContent='Starte ein Tonpaar und entscheide: höher, tiefer oder gleich.';find('[data-ear-progress]').textContent='0 von 10 Tonpaaren beantwortet.';find('[data-ear-new]').textContent='Neues Tonpaar spielen';}
    function replay(){if(!ear)return;if(ear.registerShift!==earRegisterShift){const shift=earRegisterShift-ear.registerShift;ear.notes=ear.notes.map(note=>note+shift);ear.registerShift=earRegisterShift;}ear.heard=false;find('[data-ear-new]').disabled=true;find('[data-ear-replay]').disabled=true;stationAnswers.forEach(button=>button.disabled=true);play(ear.notes,station,()=>{ear.heard=true;find('[data-ear-new]').disabled=false;find('[data-ear-replay]').disabled=false;stationAnswers.forEach(button=>button.disabled=ear.answered);find('[data-ear-feedback]').textContent=ear.feedback || 'Ist der zweite Ton höher, tiefer oder gleich?';});}
    find('[data-ear-new]').addEventListener('click',()=>{if(answered>=10)resetEar();const [low,high]=stage.split('-').map(Number),distance=low+Math.floor(Math.random()*(high-low+1)),direction=Math.random()<.2?0:Math.random()<.5?-1:1,rangeLow=55+earRegisterShift,rangeHigh=67+earRegisterShift,minFirst=direction<0?rangeLow+distance:rangeLow,maxFirst=direction>0?rangeHigh-distance:rangeHigh,first=minFirst+Math.floor(Math.random()*(maxFirst-minFirst+1));ear={notes:[first,first+direction*distance],direction,distance,registerShift:earRegisterShift,answered:false,heard:false};replay();});
    find('[data-ear-replay]').addEventListener('click',replay);find('[data-ear-reset]').addEventListener('click',()=>{resetEar();window.resetEarTrainingStage?.(stage);});
    stationAnswers.forEach(button=>button.addEventListener('click',()=>{
      if(!ear || !ear.heard || ear.answered)return;
      ear.answered=true;answered++;const hit=Number(button.dataset.answer)===ear.direction;if(hit)correct++;
      const description=ear.direction===0?'Beide Töne sind gleich hoch.':`Der zweite Ton ist ${ear.direction>0?'höher':'tiefer'}.`+(intervalNames[ear.distance]?` Abstand: ${intervalNames[ear.distance]}.`:'');
      ear.feedback=(hit?'Richtig! ':'Höre noch einmal hin. ')+description;find('[data-ear-feedback]').textContent=ear.feedback;stationAnswers.forEach(item=>item.disabled=true);if(window.recordEarTrainingResult)window.recordEarTrainingResult(stage,hit);
      find('[data-ear-progress]').textContent=`${answered} von 10 beantwortet · ${correct} beim ersten Versuch richtig.`+(answered===10?(correct>=8?' Gut erkannt! Gehe danach zur nächsten Station.':'Wiederhole diese Station noch einmal.'):'');
      if(answered===10)find('[data-ear-new]').textContent='Neue Übungsrunde';
    }));
  });
  }
  if(hasVoice){
  const singleToneMicToggle=!$('mic-stop');
  function setSingleToneMicButton(state){const button=$('mic-start'),slash=button.querySelector('[data-mic-slash]'),indicator=$('mic-on-air'),label=state==='on'?'Mikrofon ausschalten':state==='pending'?'Mikrofon wird eingeschaltet':'Mikrofon einschalten';if(slash)slash.hidden=state==='on';button.disabled=state==='pending';button.setAttribute('aria-label',label);button.title=label;button.setAttribute('aria-pressed',String(state==='on'));if(indicator){indicator.dataset.active=String(state==='on');indicator.setAttribute('aria-label',state==='on'?'Mikrofon eingeschaltet':'Mikrofon ausgeschaltet');}}
  function stopMicImpl(message=singleToneMicToggle?'':'Mikrofon aus.'){
    request++;pending=false;cancelAnimationFrame(frame);frame=0;
    if(stream)stream.getTracks().forEach(track=>track.stop());stream=null;
    if(source)source.disconnect();if(analyser)analyser.disconnect();source=analyser=null;
    history=[];heldSince=0;setCenterSaveEnabled(false);if(singleToneMicToggle)setSingleToneMicButton('off');else{$('mic-start').disabled=false;$('mic-stop').disabled=true;}if(singleToneMicToggle&&!centerTrainer){$('target-play').disabled=true;setSingleToneFlowStep('mic-start');}$('mic-status').textContent=message;
    $('detected-note').textContent='—';$('pitch-pointer').hidden=true;$('voice-detail').textContent='';status(singleToneMicToggle&&!centerTrainer?'Schalte jetzt das Mikrofon ein.':singleToneMicToggle?'':'Mikrofon ausgeschaltet.');
  }
  function listen(time){
    if(!stream || !analyser)return;frame=requestAnimationFrame(listen);if(time-lastFrame<100)return;lastFrame=time;
    if(singleToneAdvanceReady&&!centerTrainer){status(singleToneSuccessMessage,'hit');return;}
    if(centerIntervalActive||context.currentTime<muteUntil){history=[];heldSince=0;return;}
    if(context.state!=='running'){status('Audio pausiert. Schalte das Mikrofon erneut ein.');return;}
    const samples=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(samples);const result=pitch.detect(samples,context.sampleRate);
    if(!result){history=[];if(heldSince&&time-singleToneLastInRange>400){heldSince=0;singleToneLastInRange=0;}centerCents=null;setCenterSaveEnabled(centerTrainer&&singleToneAttemptActive&&!singleToneHitRecorded);$('detected-note').textContent='—';$('pitch-pointer').hidden=true;status(centerTrainer?'Ton noch nicht sicher erkannt. Singe etwas kräftiger und halte einen einzelnen Ton.':'Ton noch nicht sicher erkannt.');$('voice-detail').textContent='Singe einen einzelnen, ruhigen Ton.';return;}
    history.push(pitch.midi(result.hz));if(history.length>5)history.shift();
    if(history.length<3){status('Ton wird erkannt …');return;}
    const sorted=[...history].sort((a,b)=>a-b),note=sorted[Math.floor(sorted.length/2)],cents=100*(note-target)+calibrationCents(),adjustedNote=target+cents/100;centerCents=cents;if(centerTrainer)setCenterSaveEnabled(singleToneAttemptActive&&!singleToneHitRecorded);
    $('detected-note').textContent=pitch.name(Math.round(adjustedNote));
    $('voice-detail').textContent=`${pitch.frequency(adjustedNote).toFixed(1).replace('.',',')} Hz · ${cents>0?'+':''}${Math.round(cents)} Cent zum Zielton`;
    $('pitch-pointer').hidden=false;$('pitch-pointer').style.left=`${50+Math.max(-100,Math.min(100,cents))/2}%`;
    if(Math.abs(cents)<=40){if(!heldSince||time-singleToneLastInRange>400)heldSince=time;singleToneLastInRange=time;if(centerTrainer){const canSave=singleToneAttemptActive&&!singleToneHitRecorded,feedback=centerTrainer.querySelector('[data-center-result]');if(canSave&&feedback.dataset.state==='incorrect'){feedback.dataset.state='ready';feedback.textContent='Der Ton ist jetzt in der Mitte. Drücke „Treffer speichern“. ';}status(canSave?'Ton in der Mitte. Drücke „Treffer speichern“.':'Im Zielbereich – halte den Ton ruhig.','hit');}else{if(time-heldSince>=2000&&singleToneAttemptActive&&!singleToneHitRecorded){singleToneHitRecorded=true;singleToneAttemptActive=false;if(window.recordSingleToneHit)window.recordSingleToneHit();singleToneNeedsAdvance=true;singleToneAdvanceReady=true;singleToneSuccessMessage=`${nextSingleToneSuccessMessage()} Höre jetzt den nächsten Zielton an.`;$('target-play').textContent='▶ Neuen Zielton abspielen';status(singleToneSuccessMessage,'hit');setSingleToneFlowStep('target-play');}else status('Im Zielbereich – halte den Ton ruhig.');}}
    else{heldSince=0;singleToneLastInRange=0;setCenterSaveEnabled(centerTrainer&&singleToneAttemptActive&&!singleToneHitRecorded);status(cents<0?'Etwas höher singen ↑':'Etwas tiefer singen ↓');}
  }
  $('mic-start').addEventListener('click',async()=>{
    if(stream&&singleToneMicToggle){stopMicImpl();return;}
    if(stream)return;
    if(pending)return;
    if(!navigator.mediaDevices?.getUserMedia){$('mic-status').textContent='Mikrofon nicht verfügbar. Öffne die Website über HTTPS oder localhost in einem Browser mit Mikrofonunterstützung.';return;}
    const token=++request;pending=true;if(singleToneMicToggle)setSingleToneMicButton('pending');else{$('mic-start').disabled=true;$('mic-stop').disabled=false;}$('mic-status').textContent='Bitte erlaube den Mikrofonzugriff im Browser.';
    try{
      await audio();if(token!==request)return;
      const acquired=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
      if(token!==request || document.hidden){acquired.getTracks().forEach(t=>t.stop());return;}
      stream=acquired;source=context.createMediaStreamSource(stream);analyser=context.createAnalyser();analyser.fftSize=8192;source.connect(analyser);
      // Deliberately do not connect microphone audio to speakers.
      stream.getAudioTracks().forEach(track=>track.addEventListener('ended',()=>{if(stream===acquired)stopMicImpl('Die Mikrofonverbindung wurde beendet.');}));
      pending=false;if(singleToneMicToggle)setSingleToneMicButton('on');else $('mic-start').disabled=true;if(!centerTrainer){$('target-play').disabled=false;status('Höre dir jetzt den Zielton an.');setSingleToneFlowStep('target-play');}$('mic-status').textContent='';history=[];heldSince=0;frame=requestAnimationFrame(listen);
    }catch(error){if(token!==request)return;stopMicImpl(({NotAllowedError:'Mikrofonzugriff nicht erlaubt. Erlaube den Zugriff in den Website-Einstellungen deines Browsers und versuche es erneut.',NotFoundError:'Kein Mikrofon gefunden. Verbinde ein Mikrofon und versuche es erneut.',NotReadableError:'Das Mikrofon ist nicht verfügbar oder wird von einer anderen Anwendung belegt.'})[error.name] || 'Das Mikrofon konnte nicht gestartet werden. Prüfe die Verbindung und versuche es erneut.');}
  });
  if(!singleToneMicToggle)$('mic-stop').addEventListener('click',()=>stopMicImpl());
  stopMic=stopMicImpl;
  }
  function suspend(){cancelSound();if(hasVoice)stopMic();if(hasLargeInterval)stopLargeIntervalMic('Mikrofon pausiert, weil die Seite verlassen wurde.');if(context?.state==='running')context.suspend().catch(()=>{});}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});window.addEventListener('pagehide',suspend);
})();

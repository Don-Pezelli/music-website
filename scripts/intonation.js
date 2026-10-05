(() => {
  'use strict';
  const $=id=>document.getElementById(id), pitch=window.PitchDetector;
  if(!$('voice-trainer') || !pitch)return;
  let context, stream, source, analyser, frame=0, request=0, pending=false, history=[],lastFrame=0,heldSince=0;
  let target=60, muteUntil=0, soundGeneration=0, timers=[],oscillators=[],ear=null,answered=0,correct=0;
  const answers=[...document.querySelectorAll('[data-answer]')];
  const status=(message,state='')=>{if($('voice-guidance').textContent!==message)$('voice-guidance').textContent=message;$('voice-guidance').dataset.state=state;};
  async function audio(){
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)throw Error('Dieser Browser unterstützt die Tonausgabe nicht. Öffne die Seite in einem aktuellen Browser.');
    if(!context || context.state==='closed')context=new Audio();
    if(context.state!=='running')await context.resume();
    if(context.state!=='running')throw Error('Tonausgabe pausiert. Tippe noch einmal auf die Wiedergabetaste.');
    return context;
  }
  function cancelSound(){
    soundGeneration++;timers.forEach(clearTimeout);timers=[];
    oscillators.forEach(osc=>{try{osc.stop();}catch(_){} });oscillators=[];
    muteUntil=context ? context.currentTime+.25 : 0;
    $('ear-new').disabled=false;$('ear-replay').disabled=!ear;
    answers.forEach(button=>button.disabled=!ear || ear.answered || !ear.heard);
  }
  async function play(notes,where,done){
    cancelSound();const generation=soundGeneration;
    history=[];heldSince=0;
    try{
      const ctx=await audio();if(generation!==soundGeneration)return;
      const start=ctx.currentTime+.05,duration=.85,gap=.35;
      notes.forEach((note,i)=>{
        const at=start+i*(duration+gap),osc=ctx.createOscillator(),gain=ctx.createGain();
        osc.type='sine';osc.frequency.value=pitch.frequency(note);
        gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.16,at+.04);gain.gain.setValueAtTime(.16,at+duration-.12);gain.gain.linearRampToValueAtTime(0,at+duration);
        osc.connect(gain);gain.connect(ctx.destination);osc.start(at);osc.stop(at+duration+.02);oscillators.push(osc);
        osc.onended=()=>{osc.disconnect();gain.disconnect();oscillators=oscillators.filter(o=>o!==osc);};
      });
      muteUntil=start+(notes.length-1)*(duration+gap)+duration+.3;
      $('detected-note').textContent='—';$('pitch-pointer').hidden=true;status('Zuhören – die Messung pausiert.');$('voice-detail').textContent='Singe erst nach dem vorgespielten Ton.';
      if(where==='ear'){$('ear-new').disabled=true;$('ear-replay').disabled=true;answers.forEach(b=>b.disabled=true);$('ear-feedback').textContent='Höre beide Töne an …';}
      timers.push(setTimeout(()=>{if(generation!==soundGeneration)return;done?.();if(!stream)status('Singe den Zielton nach. Schalte dafür das Mikrofon ein.');},(muteUntil-ctx.currentTime)*1000));
    }catch(error){if(where==='ear')$('ear-feedback').textContent=error.message;else status(error.message);cancelSound();}
  }
  const ranges={low:[36,60],middle:[48,72],high:[60,84]};
  function setTarget(note){target=note;history=[];heldSince=0;$('target-name').textContent=pitch.name(target);$('target-note').value=String(target);$('detected-note').textContent='—';$('pitch-pointer').hidden=true;$('voice-detail').textContent='Noch keine Messung.';status('Höre zuerst den Zielton.');}
  function populate(){const [low,high]=ranges[$('voice-range').value];$('target-note').replaceChildren();for(let n=low;n<=high;n++){const option=document.createElement('option');option.value=n;option.textContent=pitch.name(n);$('target-note').append(option);}setTarget(Math.min(high,Math.max(low,target)));}
  $('voice-range').addEventListener('change',()=>{cancelSound();populate();});
  $('target-note').addEventListener('change',()=>{cancelSound();setTarget(Number($('target-note').value));});
  $('target-random').addEventListener('click',()=>{cancelSound();const [low,high]=ranges[$('voice-range').value];let n;do{n=low+Math.floor(Math.random()*(high-low+1));}while(n===target);setTarget(n);});
  $('target-play').addEventListener('click',()=>play([target],'voice'));
  function resetEar(){cancelSound();ear=null;answered=correct=0;answers.forEach(b=>b.disabled=true);$('ear-replay').disabled=true;$('ear-feedback').textContent='Starte ein neues Tonpaar.';$('ear-progress').textContent='0 von 10 Tonpaaren beantwortet.';$('ear-new').textContent='Neues Tonpaar spielen';}
  function replay(){if(!ear)return;ear.heard=false;play(ear.notes,'ear',()=>{ear.heard=true;$('ear-new').disabled=false;$('ear-replay').disabled=false;answers.forEach(b=>b.disabled=ear.answered);$('ear-feedback').textContent=ear.feedback || 'Ist der zweite Ton höher, tiefer oder gleich?';});}
  $('ear-new').addEventListener('click',()=>{if(answered>=10)resetEar();const distance=Number($('interval-stage').value),direction=Math.random()<.2?0:Math.random()<.5?-1:1;const first=55+Math.floor(Math.random()*13);ear={notes:[first,first+direction*distance],direction,distance,answered:false,heard:false};replay();});
  $('ear-replay').addEventListener('click',replay);$('ear-reset').addEventListener('click',resetEar);$('interval-stage').addEventListener('change',resetEar);
  const intervalNames={1:'kleine Sekunde',2:'große Sekunde',3:'kleine Terz',4:'große Terz',5:'reine Quarte',7:'reine Quinte',12:'reine Oktave'};
  answers.forEach(button=>button.addEventListener('click',()=>{
    if(!ear || !ear.heard || ear.answered)return;
    ear.answered=true;answered++;const hit=Number(button.dataset.answer)===ear.direction;if(hit)correct++;
    const description=ear.direction===0?'Beide Töne sind gleich hoch (Prime).':`Der zweite Ton ist ${ear.direction>0?'höher':'tiefer'}: ${intervalNames[ear.distance]}, ${ear.distance} Halbtonschritte.`;
    ear.feedback=(hit?'Richtig! ':'Höre noch einmal hin. ')+description;$('ear-feedback').textContent=ear.feedback;answers.forEach(b=>b.disabled=true);
    $('ear-progress').textContent=`${answered} von 10 beantwortet · ${correct} beim ersten Versuch richtig.`+(answered===10?(correct>=8?' Gut erkannt! Versuche bei Bedarf einen kleineren Abstand.':'Wiederhole diese Stufe noch einmal.'):'');
    if(answered===10)$('ear-new').textContent='Neue Übungsrunde';
  }));
  document.querySelectorAll('[data-stage]').forEach(button=>button.addEventListener('click',()=>{$('interval-stage').value=button.dataset.stage;resetEar();$('hoertraining').scrollIntoView({behavior:'smooth'});$('ear-new').focus({preventScroll:true});}));
  function stopMic(message='Mikrofon aus.'){
    request++;pending=false;cancelAnimationFrame(frame);frame=0;
    if(stream)stream.getTracks().forEach(track=>track.stop());stream=null;
    if(source)source.disconnect();if(analyser)analyser.disconnect();source=analyser=null;
    history=[];heldSince=0;$('mic-start').disabled=false;$('mic-stop').disabled=true;$('mic-status').textContent=message;
    $('detected-note').textContent='—';$('pitch-pointer').hidden=true;$('voice-detail').textContent='Keine laufende Messung.';status('Mikrofon ausgeschaltet.');
  }
  function listen(time){
    if(!stream || !analyser)return;frame=requestAnimationFrame(listen);if(time-lastFrame<100)return;lastFrame=time;
    if(context.currentTime<muteUntil){history=[];heldSince=0;return;}
    if(context.state!=='running'){status('Audio pausiert. Schalte das Mikrofon erneut ein.');return;}
    const samples=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(samples);const result=pitch.detect(samples,context.sampleRate);
    if(!result){history=[];heldSince=0;$('detected-note').textContent='—';$('pitch-pointer').hidden=true;status('Ton noch nicht sicher erkannt.');$('voice-detail').textContent='Singe einen einzelnen, ruhigen Ton.';return;}
    history.push(pitch.midi(result.hz));if(history.length>5)history.shift();
    if(history.length<3){status('Ton wird erkannt …');return;}
    const sorted=[...history].sort((a,b)=>a-b),note=sorted[Math.floor(sorted.length/2)],cents=100*(note-target);
    $('detected-note').textContent=pitch.name(Math.round(note));
    $('voice-detail').textContent=`${pitch.frequency(note).toFixed(1).replace('.',',')} Hz · ${cents>0?'+':''}${Math.round(cents)} Cent zum Zielton`;
    $('pitch-pointer').hidden=false;$('pitch-pointer').style.left=`${50+Math.max(-100,Math.min(100,cents))/2}%`;
    if(Math.abs(cents)<=25){if(!heldSince)heldSince=time;status(time-heldSince>=2000?'Gut gehalten! Mache eine kurze Pause.':'Im Zielbereich – halte den Ton ruhig.','hit');}
    else{heldSince=0;status(cents<0?'Etwas höher singen ↑':'Etwas tiefer singen ↓');}
  }
  $('mic-start').addEventListener('click',async()=>{
    if(stream || pending)return;
    if(!navigator.mediaDevices?.getUserMedia){$('mic-status').textContent='Mikrofon nicht verfügbar. Öffne die Website über HTTPS oder localhost in einem Browser mit Mikrofonunterstützung.';return;}
    const token=++request;pending=true;$('mic-start').disabled=true;$('mic-stop').disabled=false;$('mic-status').textContent='Bitte erlaube den Mikrofonzugriff im Browser.';
    try{
      await audio();if(token!==request)return;
      const acquired=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
      if(token!==request || document.hidden){acquired.getTracks().forEach(t=>t.stop());return;}
      stream=acquired;source=context.createMediaStreamSource(stream);analyser=context.createAnalyser();analyser.fftSize=8192;source.connect(analyser);
      // Deliberately do not connect microphone audio to speakers.
      stream.getAudioTracks().forEach(track=>track.addEventListener('ended',()=>{if(stream===acquired)stopMic('Die Mikrofonverbindung wurde beendet.');}));
      pending=false;$('mic-status').textContent='Mikrofon aktiv · Auswertung nur auf deinem Gerät.';history=[];heldSince=0;frame=requestAnimationFrame(listen);
    }catch(error){if(token!==request)return;stopMic(({NotAllowedError:'Mikrofonzugriff nicht erlaubt. Erlaube den Zugriff in den Website-Einstellungen deines Browsers und versuche es erneut.',NotFoundError:'Kein Mikrofon gefunden. Verbinde ein Mikrofon und versuche es erneut.',NotReadableError:'Das Mikrofon ist nicht verfügbar oder wird von einer anderen Anwendung belegt.'})[error.name] || 'Das Mikrofon konnte nicht gestartet werden. Prüfe die Verbindung und versuche es erneut.');}
  });
  $('mic-stop').addEventListener('click',()=>stopMic());
  function suspend(){cancelSound();stopMic();if(context?.state==='running')context.suspend().catch(()=>{});}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});window.addEventListener('pagehide',suspend);
  populate();
})();

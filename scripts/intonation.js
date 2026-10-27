(() => {
  'use strict';
  const $=id=>document.getElementById(id), pitch=window.PitchDetector;
  const hasVoice=!!$('voice-trainer'),hasEar=!!document.querySelector('[data-ear-trainer]');
  if((!hasVoice && !hasEar) || !pitch)return;
  let context, stream, source, analyser, frame=0, request=0, pending=false, history=[],lastFrame=0,heldSince=0,stopMic=()=>{},singleToneAttemptActive=false,singleToneHitRecorded=false;
  let target=60, muteUntil=0, soundGeneration=0, timers=[],oscillators=[];
  const calibration=$('tuner-calibration'),calibrationOutput=$('tuner-calibration-output');
  function calibrationCents(){return calibration ? Number(calibration.value) : 0;}
  if(calibration && calibrationOutput)calibration.addEventListener('input',()=>{calibrationOutput.textContent=`${calibration.value} Cent`;});
  const status=(message,state='')=>{if(!$('voice-guidance'))return;if($('voice-guidance').textContent!==message)$('voice-guidance').textContent=message;$('voice-guidance').dataset.state=state;};
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
      if(hasVoice){$('detected-note').textContent='—';$('pitch-pointer').hidden=true;status('Zuhören – die Messung pausiert.');$('voice-detail').textContent='Singe erst nach dem vorgespielten Ton.';}
      if(where instanceof HTMLElement && where.matches('[data-ear-trainer]')){where.querySelector('[data-ear-new]').disabled=true;where.querySelector('[data-ear-replay]').disabled=true;where.querySelectorAll('[data-answer]').forEach(button=>button.disabled=true);where.querySelector('[data-ear-feedback]').textContent='Höre beide Töne an …';}
      timers.push(setTimeout(()=>{if(generation!==soundGeneration)return;done?.();if(hasVoice && !stream)status('Singe den Zielton nach. Schalte dafür das Mikrofon ein.');},(muteUntil-ctx.currentTime)*1000));
    }catch(error){if(where instanceof HTMLElement && where.matches('[data-ear-trainer]'))where.querySelector('[data-ear-feedback]').textContent=error.message;else status(error.message);cancelSound();}
  }
  const ranges={low:[36,60],'octave-c2-c3':[36,48],'octave-c3-c4':[48,60],middle:[48,72],high:[60,84],octave:[60,72]};
  if(hasVoice){
  function setTarget(note){target=note;history=[];heldSince=0;singleToneAttemptActive=false;singleToneHitRecorded=false;$('target-name').textContent=pitch.name(target);$('target-note').value=String(target);$('detected-note').textContent='—';$('pitch-pointer').hidden=true;$('voice-detail').textContent='Noch keine Messung.';status('Höre zuerst den Zielton.');}
  function populate(){const [low,high]=ranges[$('voice-range').value];$('target-note').replaceChildren();for(let n=low;n<=high;n++){const option=document.createElement('option');option.value=n;option.textContent=pitch.name(n);$('target-note').append(option);}setTarget(Math.min(high,Math.max(low,target)));}
  $('voice-range').addEventListener('change',()=>{cancelSound();populate();});
  $('target-note').addEventListener('change',()=>{cancelSound();setTarget(Number($('target-note').value));});
  $('target-random').addEventListener('click',()=>{cancelSound();const [low,high]=ranges[$('voice-range').value];let n;do{n=low+Math.floor(Math.random()*(high-low+1));}while(n===target);setTarget(n);});
  $('target-play').addEventListener('click',()=>{singleToneAttemptActive=true;singleToneHitRecorded=false;if(window.recordSingleToneAttempt)window.recordSingleToneAttempt();play([target],'voice');});
  populate();
  }
  const hasLargeInterval=$('large-interval-trainer');
  let intervalStream=null,intervalSource=null,intervalAnalyser=null,intervalFrame=0,intervalHistory=[],intervalLastFrame=0,largeInterval=null,largeFirst=null;
  function intervalStatus(message){if($('large-interval-mic-status'))$('large-interval-mic-status').textContent=message;}
  function stopLargeIntervalMic(message='Mikrofon aus. Die Auswertung erfolgt auf deinem Gerät.'){
    if(intervalFrame)cancelAnimationFrame(intervalFrame);intervalFrame=0;
    if(intervalStream)intervalStream.getTracks().forEach(track=>track.stop());intervalStream=null;
    if(intervalSource)intervalSource.disconnect();if(intervalAnalyser)intervalAnalyser.disconnect();intervalSource=intervalAnalyser=null;
    intervalHistory=[];
    if(hasLargeInterval){$('large-interval-mic-start').disabled=false;$('large-interval-mic-stop').disabled=true;$('large-interval-capture-first').disabled=true;$('large-interval-capture-second').disabled=true;}
    intervalStatus(message);
  }
  function listenLargeInterval(time){
    if(!intervalStream||!intervalAnalyser)return;intervalFrame=requestAnimationFrame(listenLargeInterval);if(time-intervalLastFrame<100)return;intervalLastFrame=time;
    if(context.currentTime<muteUntil){intervalHistory=[];return;}
    const samples=new Float32Array(intervalAnalyser.fftSize);intervalAnalyser.getFloatTimeDomainData(samples);const result=pitch.detect(samples,context.sampleRate);
    if(!result){intervalHistory=[];return;}
    intervalHistory.push(pitch.midi(result.hz));if(intervalHistory.length>9)intervalHistory.shift();
  }
  if(hasLargeInterval){
    const firstOutput=$('large-interval-first'),secondOutput=$('large-interval-second');
    function nextLargeInterval(){const [rangeLow,rangeHigh]=$('large-interval-range').value.split('-').map(Number),maxDistance=Math.min(11,rangeHigh-rangeLow),distance=7+Math.floor(Math.random()*(maxDistance-6)),first=rangeLow+Math.floor(Math.random()*(rangeHigh-rangeLow-distance+1));largeInterval={first,second:first+distance,distance,heard:false};largeFirst=null;firstOutput.textContent=secondOutput.textContent='—';$('large-interval-capture-first').disabled=true;$('large-interval-capture-second').disabled=true;$('large-interval-result').textContent='Höre das Intervall und singe die beiden Töne nacheinander.';$('large-interval-prompt').textContent='Quinte bis Septime · aufwärts';play([first,first+distance],'sequence',()=>{largeInterval.heard=true;$('large-interval-prompt').textContent='Jetzt beide Töne einzeln nachsingen und übernehmen.';$('large-interval-replay').disabled=false;$('large-interval-capture-first').disabled=!intervalStream;$('large-interval-new').disabled=false;});}
    $('large-interval-range').addEventListener('change',()=>{largeInterval=null;largeFirst=null;firstOutput.textContent=secondOutput.textContent='—';$('large-interval-replay').disabled=true;$('large-interval-prompt').textContent='Stimmlage geändert. Starte ein neues Intervall.';$('large-interval-capture-first').disabled=true;$('large-interval-capture-second').disabled=true;});
    $('large-interval-new').addEventListener('click',()=>{if(intervalStream)intervalHistory=[];$('large-interval-replay').disabled=true;$('large-interval-new').disabled=true;nextLargeInterval();});
    $('large-interval-replay').addEventListener('click',()=>{if(!largeInterval)return;largeInterval.heard=false;intervalHistory=[];$('large-interval-capture-first').disabled=true;$('large-interval-capture-second').disabled=true;play([largeInterval.first,largeInterval.second],'sequence',()=>{largeInterval.heard=true;$('large-interval-capture-first').disabled=!intervalStream;$('large-interval-prompt').textContent='Singe beide Töne einzeln und übernimm sie.';});});
    $('large-interval-mic-start').addEventListener('click',async()=>{
      if(intervalStream)return;
      if(!navigator.mediaDevices?.getUserMedia){intervalStatus('Mikrofon nicht verfügbar. Öffne die Seite über HTTPS oder localhost.');return;}
      $('large-interval-mic-start').disabled=true;intervalStatus('Bitte erlaube den Mikrofonzugriff im Browser.');
      try{await audio();intervalStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});intervalSource=context.createMediaStreamSource(intervalStream);intervalAnalyser=context.createAnalyser();intervalAnalyser.fftSize=8192;intervalSource.connect(intervalAnalyser);intervalStream.getAudioTracks().forEach(track=>track.addEventListener('ended',()=>{if(intervalStream)stopLargeIntervalMic('Die Mikrofonverbindung wurde beendet.');}));intervalStatus('Mikrofon aktiv · Auswertung nur auf deinem Gerät.');$('large-interval-mic-stop').disabled=false;if(largeInterval?.heard)$('large-interval-capture-first').disabled=false;intervalFrame=requestAnimationFrame(listenLargeInterval);}
      catch(error){stopLargeIntervalMic(error.name==='NotAllowedError'?'Mikrofonzugriff nicht erlaubt. Erlaube ihn in den Website-Einstellungen.':'Das Mikrofon konnte nicht gestartet werden. Prüfe Verbindung und Mikrofon.');}
    });
    $('large-interval-mic-stop').addEventListener('click',()=>stopLargeIntervalMic());
    function captureLargeTone(){if(intervalHistory.length<3){$('large-interval-result').textContent='Ton noch nicht sicher erkannt. Singe ihn kurz und stabil, dann übernimm ihn.';return null;}const values=[...intervalHistory].sort((a,b)=>a-b),tone=values[Math.floor(values.length/2)],spread=values[values.length-1]-values[0];if(spread>1.2){$('large-interval-result').textContent='Dein Ton schwankt noch. Halte ihn kurz stabil und übernimm ihn erneut.';return null;}intervalHistory=[];return tone;}
    $('large-interval-capture-first').addEventListener('click',()=>{if(!largeInterval?.heard)return;const tone=captureLargeTone();if(tone===null)return;largeFirst=tone;firstOutput.textContent=pitch.name(Math.round(tone));$('large-interval-capture-first').disabled=true;$('large-interval-capture-second').disabled=false;$('large-interval-result').textContent='Grundton erfasst. Singe jetzt den zweiten Ton und übernimm ihn.';});
    $('large-interval-capture-second').addEventListener('click',()=>{if(largeFirst===null)return;const tone=captureLargeTone();if(tone===null)return;const sung=tone-largeFirst,error=sung-largeInterval.distance,hit=Math.abs(error)<=.75,detail=hit?'Richtig erkannt! Dein gesungener Abstand liegt nah genug am Zielintervall.':error<0?'Der gesungene Abstand war kleiner als das Zielintervall. Höre noch einmal hin und versuche es erneut.':'Der gesungene Abstand war größer als das Zielintervall. Höre noch einmal hin und versuche es erneut.';secondOutput.textContent=pitch.name(Math.round(tone));$('large-interval-result').textContent=`${detail} Gemessen: ${Math.abs(sung).toFixed(1).replace('.',',')} Halbtonschritte; Ziel: ${largeInterval.distance}.`;$('large-interval-capture-second').disabled=true;if(window.recordLargeIntervalResult)window.recordLargeIntervalResult(hit);$('large-interval-capture-first').disabled=false;});
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
    const panel = document.createElement('div');
    panel.className = 'intonation-panel sequence-trainer';
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
        micStatus('Mikrofon aktiv · Auswertung nur auf deinem Gerät.');
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
  const earStations=[...document.querySelectorAll('[data-ear-trainer]')];
  earStations.forEach(station=>{
    const stationAnswers=[...station.querySelectorAll('[data-answer]')],stage=station.dataset.stage;
    let ear=null,answered=0,correct=0;
    const find=selector=>station.querySelector(selector);
    function resetEar(){cancelSound();ear=null;answered=correct=0;stationAnswers.forEach(button=>button.disabled=true);find('[data-ear-new]').disabled=false;find('[data-ear-replay]').disabled=true;find('[data-ear-feedback]').textContent='Starte ein Tonpaar und entscheide: höher, tiefer oder gleich.';find('[data-ear-progress]').textContent='0 von 10 Tonpaaren beantwortet.';find('[data-ear-new]').textContent='Neues Tonpaar spielen';}
    function replay(){if(!ear)return;ear.heard=false;find('[data-ear-new]').disabled=true;find('[data-ear-replay]').disabled=true;stationAnswers.forEach(button=>button.disabled=true);play(ear.notes,station,()=>{ear.heard=true;find('[data-ear-new]').disabled=false;find('[data-ear-replay]').disabled=false;stationAnswers.forEach(button=>button.disabled=ear.answered);find('[data-ear-feedback]').textContent=ear.feedback || 'Ist der zweite Ton höher, tiefer oder gleich?';});}
    find('[data-ear-new]').addEventListener('click',()=>{if(answered>=10)resetEar();const [low,high]=stage.split('-').map(Number),distance=low+Math.floor(Math.random()*(high-low+1)),direction=Math.random()<.2?0:Math.random()<.5?-1:1,first=55+Math.floor(Math.random()*13);ear={notes:[first,first+direction*distance],direction,distance,answered:false,heard:false};replay();});
    find('[data-ear-replay]').addEventListener('click',replay);find('[data-ear-reset]').addEventListener('click',resetEar);
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
  function stopMicImpl(message='Mikrofon aus.'){
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
    const sorted=[...history].sort((a,b)=>a-b),note=sorted[Math.floor(sorted.length/2)],cents=100*(note-target)+calibrationCents(),adjustedNote=target+cents/100;
    $('detected-note').textContent=pitch.name(Math.round(adjustedNote));
    $('voice-detail').textContent=`${pitch.frequency(adjustedNote).toFixed(1).replace('.',',')} Hz · ${cents>0?'+':''}${Math.round(cents)} Cent zum Zielton`;
    $('pitch-pointer').hidden=false;$('pitch-pointer').style.left=`${50+Math.max(-100,Math.min(100,cents))/2}%`;
    if(Math.abs(cents)<=40){if(!heldSince)heldSince=time;if(time-heldSince>=2000&&singleToneAttemptActive&&!singleToneHitRecorded){singleToneHitRecorded=true;singleToneAttemptActive=false;if(window.recordSingleToneHit)window.recordSingleToneHit();}status(time-heldSince>=2000?'Gut gehalten! Mache eine kurze Pause.':'Im Zielbereich – halte den Ton ruhig.','hit');}
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
      stream.getAudioTracks().forEach(track=>track.addEventListener('ended',()=>{if(stream===acquired)stopMicImpl('Die Mikrofonverbindung wurde beendet.');}));
      pending=false;$('mic-status').textContent='Mikrofon aktiv · Auswertung nur auf deinem Gerät.';history=[];heldSince=0;frame=requestAnimationFrame(listen);
    }catch(error){if(token!==request)return;stopMicImpl(({NotAllowedError:'Mikrofonzugriff nicht erlaubt. Erlaube den Zugriff in den Website-Einstellungen deines Browsers und versuche es erneut.',NotFoundError:'Kein Mikrofon gefunden. Verbinde ein Mikrofon und versuche es erneut.',NotReadableError:'Das Mikrofon ist nicht verfügbar oder wird von einer anderen Anwendung belegt.'})[error.name] || 'Das Mikrofon konnte nicht gestartet werden. Prüfe die Verbindung und versuche es erneut.');}
  });
  $('mic-stop').addEventListener('click',()=>stopMicImpl());
  stopMic=stopMicImpl;
  }
  function suspend(){cancelSound();if(hasVoice)stopMic();if(hasLargeInterval)stopLargeIntervalMic('Mikrofon pausiert, weil die Seite verlassen wurde.');if(context?.state==='running')context.suspend().catch(()=>{});}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});window.addEventListener('pagehide',suspend);
})();

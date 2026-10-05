(() => {
  'use strict';
  const names=['C','Cis/Des','D','Dis/Es','E','F','Fis/Ges','G','Gis/As','A','Ais/B','H'];
  const frequency = midi => 440 * 2 ** ((midi - 69) / 12);
  const midi = hz => 69 + 12 * Math.log2(hz / 440);
  const name = note => names[((note % 12)+12)%12] + (Math.floor(note/12)-1);
  // YIN-style cumulative normalized difference. Downsample for efficient
  // fundamental detection; reject silence and weak periodicity, not just peaks.
  function detect(input, sampleRate) {
    const step=Math.max(1,Math.floor(sampleRate/12000)),rate=sampleRate/step;
    const size=Math.floor(input.length/step),data=new Float32Array(size);
    let mean=0,energy=0;
    for(let i=0;i<size;i++) {let sum=0;for(let k=0;k<step;k++)sum+=input[i*step+k];data[i]=sum/step;mean+=data[i];}
    mean/=size;
    for(let i=0;i<size;i++){data[i]-=mean;energy+=data[i]*data[i];}
    const rms=Math.sqrt(energy/size);
    if(rms<0.008) return null;
    const min=Math.max(2,Math.floor(rate/1200)),max=Math.min(Math.ceil(rate/60),Math.floor(size/2)-1),window=size-max;
    const diff=new Float64Array(max+1);let cumulative=0;
    for(let lag=1;lag<=max;lag++){
      let sum=0;for(let i=0;i<window;i++){const d=data[i]-data[i+lag];sum+=d*d;}
      cumulative+=sum;diff[lag]=cumulative ? sum*lag/cumulative : 1;
    }
    for(let lag=min;lag<max;lag++){
      if(diff[lag]>=0.12)continue;
      while(lag+1<max && diff[lag+1]<diff[lag])lag++;
      const a=diff[lag-1],b=diff[lag],c=diff[lag+1];
      const denominator=a-2*b+c;
      const refined=lag+(denominator ? .5*(a-c)/denominator : 0);
      const hz=rate/refined;
      return hz>=60 && hz<=1200 ? {hz,confidence:1-b,rms} : null;
    }
    return null;
  }
  window.PitchDetector={detect,frequency,midi,name};
})();

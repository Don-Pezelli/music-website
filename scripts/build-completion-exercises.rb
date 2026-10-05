# encoding: UTF-8
require 'json'
require 'rexml/document'
B=File.expand_path('..', __dir__)
raw={};%w[bravura-glyphs.json sixteenth-glyph.json sixteenth-rest-glyph.json].each{|f|raw.merge!(JSON.parse(File.read(B+'/scripts/'+f)))}
glyphs=raw.transform_values{|s|s.lines.map{|l|m=l.strip.match(/^(.*?)\s*(moveto|lineto|curveto|closepath)$/);next unless m;{'moveto'=>'M','lineto'=>'L','curveto'=>'C','closepath'=>'Z'}[m[2]]+m[1].split.map(&:to_f).join(' ')}.compact.join(' ')}
p=B+'/scripts/completion-values.js';s=File.read(p).split("\nwindow.completionGlyphs").first;File.write(p,s+"\nwindow.completionGlyphs = #{JSON.generate(glyphs)};\n")
# Original course 1: preserve the printed note/rest sequences, marking the
# existing writing spaces explicitly. Durations here are quarter beats.
legacy={
 'kapitel-2/bild-160.png'=>[[1,0.5,0.5,'g1',0.5,0.5],['g1',0.5,0.5,0.5,0.5,'g0.5',0.5],['g1.5',0.5,0.5,0.5,0.5,0.5],['g2',1,0.5,0.5],[0.5,0.5,'g1.5',0.5,0.5,0.5],['g4'],[2,1,1],[1,'g3']],
 'kapitel-3/bild-222.png'=>[['g0.5',0.5,0.5,'r0.5','g2',0.5],['g1',1,'g2']],
 'kapitel-3/bild-223.png'=>[[0.5,0.5,'g0.5','r0.5',0.5,0.5,'g1'],['g1',0.5,0.5,'g0.5',0.5,0.5,0.5]],
 'kapitel-3/bild-224.png'=>[[0.5,'r0.5','g1',0.5,'g1.5'],['g2','r0.5',0.5,0.5,0.5],['g2','r0.5','g1.5'],['g2',1,'r1']]
}
# Correct the first legacy measure: three eighth notes + an eighth rest = 2 beats.
legacy['kapitel-3/bild-222.png'][0]=['g0.5',0.5,0.5,'r0.5','g1.5',0.5]
legacy.each do |old,bars|
 height=((bars.size+1)/2)*150
 parts=[%(<rect width="960" height="#{height}" fill="white"/>)]
 desc=[]
 bars.each_with_index do |bar,bi|
  y=105+(bi/2)*150;start=92+(bi%2)*422;cursor=0
  raise "Bad legacy duration #{old} #{bi}" unless bar.sum{|t|t.is_a?(String) ? t[1..-1].to_f : t}==4
  parts<<%(<path d="M#{start-4} #{y-19}v38 M#{start-4} #{y}H#{start+416} M#{start+416} #{y-19}v38" stroke="black" fill="none"/>)
  parts<<%(<text x="#{start}" y="#{y-76}" font-family="Arial" font-size="12">Takt #{bi+1}</text>)
  parts<<%(<text x="55" y="#{y}" font-family="Georgia" font-size="23">4</text><text x="55" y="#{y+20}" font-family="Georgia" font-size="23">4</text>) if bi==0
  timed=[];time=0
  bar.each{|t|d=t.is_a?(String) ? t[1..-1].to_f : t;timed<<[t,time];time+=d}
  groups=[]
  timed.each_with_index do |(t,onset),i|
   next unless t==0.5
   if groups.last && groups.last.last==i-1 && timed[groups.last.first][1].floor==onset.floor
    groups.last<<i
   else
    groups<<[i]
   end
  end
  groups.select!{|g|g.size>1};beamed=groups.flatten
  bar.each_with_index do |t,ti|
   kind=t.is_a?(String) ? t[0] : 'n';d=t.is_a?(String) ? t[1..-1].to_f : t;x=start+10+cursor*94
   if kind=='g'
    parts<<%(<rect data-gap="true" x="#{x-3}" y="#{y-44}" width="#{d*94-9}" height="70" rx="4" fill="white" stroke="#65706e" stroke-dasharray="5 4"/><text x="#{x+(d*94-9)/2-3}" y="#{y+8}" text-anchor="middle" font-family="Arial" font-size="22">?</text>)
   else
    code=kind=='r' ? {0.5=>'E4E6',1.0=>'E4E5',2.0=>'E4E4',4.0=>'E4E3'}[d.to_f] : {0.5=>'E1D7',1.0=>'E1D5',2.0=>'E1D3',4.0=>'E1D2'}[d.to_f]
    code='E0A4' if beamed.include?(ti)
    parts<<%(<path data-bar="#{bi+1}" data-onset="#{cursor*12}" data-duration="#{d*12}" data-smufl="#{code}" transform="translate(#{x} #{y+20.8}) scale(.52 -.52)" d="#{glyphs.fetch(code)}"/>)
   end
   parts<<%(<path d="M#{x+11.3} #{y}V#{y-38}" stroke="black" stroke-width="1.5"/>) if beamed.include?(ti)
   cursor+=d
  end
  groups.each{|g|parts<<%(<path d="M#{start+10+timed[g.first][1]*94+10.6} #{y-38}H#{start+10+timed[g.last][1]*94+12}" stroke="black" stroke-width="4.5"/>)}
  desc<<"Takt #{bi+1}: "+bar.map{|t|t.is_a?(String)&&t.start_with?('g') ? 'Lücke' : "#{t.to_s.start_with?('r') ? 'Pause' : 'Note'} (#{t.to_s.sub(/^r/,'')} Schläge)"}.join(', ')
 end
 path='assets/'+old.sub('.png','-interaktiv.svg')
 File.write(B+'/'+path,%(<svg xmlns="http://www.w3.org/2000/svg" width="960" height="#{height}" viewBox="0 0 960 #{height}" role="img"><title>Takte vervollständigen</title><desc>#{desc.join('. ')}</desc>#{parts.join}</svg>))
 page=B+'/'+old.split('/')[0]+'.html';s=File.read(page)
 s=s.gsub(/<figure class="score-figure"[^>]*>(?:(?!<\/figure>).)*assets\/#{Regexp.escape(old)}(?:(?!<\/figure>).)*<\/figure>/m){|figure|figure.gsub('assets/'+old,path).sub(/width="\d+" height="\d+"/,"width=\"960\" height=\"#{height}\"").sub(/alt="[^"]*"/,"alt=\"#{desc.join('. ')}\"")}
 File.write(page,s)
end
configs={}
Dir[B+'/*.html'].each do |page|
 s=File.read(page)
 s=s.gsub(/<section class="bar-completion".*?<\/section>/m,'')
 files=s.scan(/<img[^>]+src="([^"]*(?:takte-ergaenzen-\d|ergaenzen-\d|bild-\d+-interaktiv)\.svg)"/).flatten
 next if files.empty?
 files.each do |path|
  doc=REXML::Document.new(File.read(B+'/'+path));w,h=doc.root.attributes['viewBox'].split.map(&:to_f).last(2)
  tri=path.include?('rhythmus-3');step=tri ? 15.5/2 : 94.0/12;rowheight=tri ? 190 : 150;baseY=tri ? 85 : 61
  gaps=REXML::XPath.match(doc,'//*[@data-gap]').map do |r|
   x,y,width,height=%w[x y width height].map{|k|r.attributes[k].to_f};row=((y-baseY)/rowheight).round;col=x>=514 ? 1 : 0;start=92+col*422
   onset=((x-start-7)/step).round;duration=((width+9)/step).round
   {x:x,y:tri ? y-12 : y,width:width,height:tri ? height+12 : height,baseline:tri ? 62 : 44,onset:onset,duration:duration,bar:row*2+col+1}
  end
  course=path.include?('rhythmus-3') ? 3 : path.include?('rhythmus-2') ? 2 : 1
  rests=File.basename(page).include?('kapitel-2') && course>1 || File.basename(page)=='kapitel-3.html'
  configs[path]={width:w,height:h,step:step,gaps:gaps,course:course,rests:rests}
  instruction=rests ? 'Noten oder Pausen' : 'Noten'
  widget=%(<section class="bar-completion" data-completion="#{path}" aria-label="Interaktive Ergänzungsaufgabe"><p>Klicke auf ein Fragezeichen und ergänze die Lücke mit #{instruction}. Mit „Lücke prüfen“ kontrollierst du deine Eingabe.</p><div class="completion-palette" role="group" aria-label="#{instruction} hinzufügen"></div><div class="completion-bars"></div><p class="completion-summary" role="status" aria-live="polite"></p><noscript>Aktiviere JavaScript für die interaktive Eingabe oder bearbeite die Aufgabe auf Papier.</noscript></section>)
  s=s.sub(/(<figure class="score-figure"[^>]*>(?:(?!<\/figure>).)*<img[^>]+src="#{Regexp.escape(path)}".*?<\/figure>)/m){|figure|figure+widget}
 end
 s=s.gsub('Aufgabe 1 kannst du direkt hier ausprobieren. Bearbeite die weiteren Aufgaben auf Papier.','Du kannst alle Ergänzungsaufgaben direkt hier bearbeiten.').gsub('Schreibe die ergänzten Takte auf ein Blatt Papier.','Klicke zum Ergänzen auf die Fragezeichenfelder.').gsub('Schreibe die fertigen Takte auf Papier.','Ergänze die Takte direkt über die Fragezeichenfelder.').gsub('Schreibe die vollständigen Takte auf Papier und kennzeichne Triolen mit der Ziffer 3.','Ergänze die Takte direkt über die Fragezeichenfelder. Triolen werden mit der Ziffer 3 gekennzeichnet.')
 %w[completion-values completion-exercises bar-completion].each do |script|
  s=s.gsub(/\s*<script src="scripts\/#{script}\.js" defer><\/script>/,'')
 end
 s=s.sub('</body>',%w[completion-values completion-exercises bar-completion].map{|script|%(<script src="scripts/#{script}.js" defer></script>)}.join("\n")+"\n</body>")
 File.write(page,s)
end
File.write(B+'/scripts/completion-exercises.js',"window.completionExercises = #{JSON.generate(configs)};\n")
puts "Configured #{configs.size} exercises / #{configs.values.sum{|c|c[:gaps].size}} gaps"

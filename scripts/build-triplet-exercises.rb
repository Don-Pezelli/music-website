# encoding: UTF-8
require 'json';require 'cgi';require 'fileutils'
BASE=File.expand_path('..',__dir__);OUT=File.join(BASE,'assets/rhythmus-3');FileUtils.mkdir_p(OUT)
GLYPHS=JSON.parse(File.read(File.join(__dir__,'bravura-glyphs.json'))).transform_values do |s|
 c=s.lines.map{|l|m=l.strip.match(/^(.*?)\s*(moveto|lineto|curveto|closepath)$/);next unless m;[{'moveto'=>'M','lineto'=>'L','curveto'=>'C','closepath'=>'Z'}[m[2]],m[1].split.map(&:to_f)]}.compact
 c.pop while c.last && c.last[0]=='M'
 c.map{|op,v|op+v.join(' ')}.join(' ')
end
# Six units per quarter beat: ordinary eighth = 3, triplet eighth = 2.
def n(d);{kind:'note',duration:d};end
def r(d);{kind:'rest',duration:d};end
def gap(d);{kind:'gap',duration:d};end
def t(pattern='xxx',accent:nil);{kind:'triplet',duration:6,pattern:pattern,accent:accent};end
def e;{kind:'eighths',duration:6};end
def sig(bars);JSON.generate(bars);end
$manifest={}
def draw(name,bars,title,blank:false)
 raise 'Incorrect bar duration' unless bars.all?{|b|b.sum{|v|v[:duration]}==24}
 multi=bars.size>1; rows=multi ? (bars.size+1)/2 : 1;height=rows*190
 parts=[%(<rect width="960" height="#{height}" fill="white"/>)]
 description=[]; events=[]
 bars.each_with_index do |bar,bi|
  row=multi ? bi/2 : 0;col=multi ? bi%2 : 0;y=135+row*190
  start=multi ? 92+col*422 : 120;finish=multi ? start+422 : 936;unit=multi ? 15.5 : 32.0
  parts<<%(<path d="M24 #{y}H936" stroke="black" stroke-width="1"/>) if col==0
  if bi==0
   parts<<%(<text x="55" y="#{y-1}" font-family="Georgia,serif" font-size="23" font-weight="bold">4</text><text x="55" y="#{y+19}" font-family="Georgia,serif" font-size="23" font-weight="bold">4</text>)
  end
  parts<<%(<text x="#{start}" y="#{y-115}" font-family="Arial,sans-serif" font-size="11" fill="#65706e">Takt #{bi+1}</text>) if multi
  parts<<%(<path d="M#{start-4} #{y-19}v38" stroke="black" stroke-width="1.5"/>)
  cursor=0;bar_description=[]
  bar.each do |token|
   kind=token[:kind].to_sym;duration=token[:duration];x=start+10+cursor*unit
   raise 'Invalid ordinary value' if %w[note rest gap].include?(kind.to_s) && ![3,6,12,24].include?(duration)
   if kind==:gap
    unless blank
     parts<<%(<rect data-gap="true" x="#{x-3}" y="#{y-50}" width="#{duration*unit-9}" height="80" rx="4" fill="white" stroke="#65706e" stroke-dasharray="5 4"/><text x="#{x-3+(duration*unit-9)/2}" y="#{y+7}" text-anchor="middle" font-family="Arial,sans-serif" font-size="22">?</text>)
    end
    events<<{bar:bi+1,onset:cursor,duration:duration,kind:'gap'};bar_description<<'Lücke'
   elsif [:triplet,:eighths].include?(kind)
    raise 'Group crosses beat' unless cursor%6==0 && duration==6
    is_tri=kind==:triplet;pattern=is_tri ? token[:pattern] : 'xx';step=is_tri ? 2 : 3
    raise 'Invalid triplet' unless !is_tri || pattern.match?(/\A[x.]{3}\z/)
    count_labels=is_tri ? [(cursor/6+1).to_s,'tri','ol'] : [(cursor/6+1).to_s,'&amp;']
    runs=[];run=[]
    pattern.chars.each_with_index{|c,i|if c=='x';run<<i;else;runs<<run unless run.empty?;run=[];end};runs<<run unless run.empty?;runs.select!{|g|g.size>1};beamed=runs.flatten
    pattern.chars.each_with_index do |c,i|
     sx=x+i*step*unit;onset=cursor+i*step
     code=c=='.' ? 'E4E6' : (beamed.include?(i) ? 'E0A4' : 'E1D7')
     parts<<%(<text x="#{sx+6}" y="#{y-96}" text-anchor="middle" font-family="Arial,sans-serif" font-size="#{multi ? 12 : 19}">#{count_labels[i]}</text>)
     parts<<%(<path data-smufl="#{code}" data-bar="#{bi+1}" data-onset="#{onset}" data-duration="#{step}" data-tuplet="#{is_tri ? '3:2' : 'none'}" fill="black" transform="translate(#{sx} #{y+20.8}) scale(0.52 -0.52)" d="#{GLYPHS.fetch(code)}"/>)
     parts<<%(<path d="M#{sx+11.3} #{y}V#{y-38}" stroke="black" stroke-width="1.5"/>) if beamed.include?(i)
     if c=='x' && token[:accent]==i
      parts<<%(<path data-accent="#{i+1}" d="M#{sx} #{y-57}L#{sx+12} #{y-53}L#{sx} #{y-49}" fill="none" stroke="black" stroke-width="1.6"/>)
     end
     events<<{bar:bi+1,onset:onset,duration:step,kind:c=='.' ? 'rest' : 'note',triplet:is_tri,accent:token[:accent]==i}
    end
    runs.each do |indices|
     x1=x+indices.first*step*unit+10.6;x2=x+indices.last*step*unit+12
     parts<<%(<path data-beam="1" d="M#{x1} #{y-38}H#{x2}" stroke="black" stroke-width="4.5"/>)
    end
    if is_tri
     left=x-3;right=x+4*unit+19;mid=(left+right)/2
     # A full bracket includes rests too; the 3 always governs all three positions.
     parts<<%(<path data-tuplet-bracket="3" d="M#{left} #{y-68}v-7H#{mid-10}M#{mid+10} #{y-75}H#{right}v7" fill="none" stroke="black" stroke-width="1.3"/><text data-tuplet-number="3" x="#{mid}" y="#{y-70}" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="17">3</text>)
     positions=pattern.chars.each_with_index.select{|c,_|c=='.'}.map{|_,i|i+1}
     bar_description<<"Achteltriole#{positions.empty? ? '' : " mit Pause auf Position #{positions.join(' und ')}"}#{token[:accent].nil? ? '' : ", Akzent auf Position #{token[:accent]+1}"}"
    else
     bar_description<<'zwei gerade Achtelnoten'
    end
   else
    code=kind==:rest ? {3=>'E4E6',6=>'E4E5',12=>'E4E4',24=>'E4E3'}.fetch(duration) : {3=>'E1D7',6=>'E1D5',12=>'E1D3',24=>'E1D2'}.fetch(duration)
    sx=(kind==:rest && duration==24) ? start+(finish-start)/2 : x
    parts<<%(<text x="#{x+6}" y="#{y-96}" text-anchor="middle" font-family="Arial,sans-serif" font-size="#{multi ? 12 : 19}">#{cursor%6==0 ? cursor/6+1 : '&amp;'}</text>)
    parts<<%(<path data-smufl="#{code}" data-bar="#{bi+1}" data-onset="#{cursor}" data-duration="#{duration}" fill="black" transform="translate(#{sx} #{y+20.8}) scale(0.52 -0.52)" d="#{GLYPHS.fetch(code)}"/>)
    events<<{bar:bi+1,onset:cursor,duration:duration,kind:kind.to_s,triplet:false}
    bar_description<<{3=>'Achtel',6=>'Viertel',12=>'Halbe',24=>'Ganze'}.fetch(duration)+(kind==:rest ? 'pause' : 'note')
   end
   cursor+=duration
  end
  parts<<%(<path d="M#{finish-6} #{y-19}v38" stroke="black" stroke-width="1.5"/>)
  parts<<%(<path d="M#{finish} #{y-19}v38" stroke="black" stroke-width="4"/>) if bi==bars.size-1
  description<<"Takt #{bi+1}: #{bar_description.join('; ')}"
 end
 events.group_by{|v|v[:bar]}.each_value do |bar|
  cursor=0;bar.each{|v|raise 'Gap or overlap' unless v[:onset]==cursor;cursor+=v[:duration]};raise 'Incomplete' unless cursor==24
 end
 desc=description.join('. ')
 File.write(File.join(OUT,name+'.svg'),%(<svg xmlns="http://www.w3.org/2000/svg" width="960" height="#{height}" viewBox="0 0 960 #{height}" role="img" aria-labelledby="title desc"><title id="title">#{CGI.escapeHTML(title)}</title><desc id="desc">#{CGI.escapeHTML(desc)}</desc>#{parts.join}</svg>))
 $manifest[name]={height:height,description:desc,bars:bars,signature:sig(bars),events:events}
end
(1..2).each do |chapter|
 (1..3).each do |lesson|
  if chapter==1
   focus=t('xxx',accent:lesson-1)
  else
   pattern='xxx';pattern[lesson-1]='.';focus=t(pattern)
  end
  reading=[]
  4.times do |active|
   b=(0..3).map{|beat|beat==active ? focus : r(6)};reading<<b
   draw("k#{chapter}-l#{lesson}-lesen-#{active+1}",[b],"Kapitel #{chapter}, Lektion #{lesson}, Leseübung #{active+1}")
  end
  b=[focus]*4;reading<<b;draw("k#{chapter}-l#{lesson}-lesen-5",[b],"Kapitel #{chapter}, Lektion #{lesson}: alle vier Schläge")
  if chapter==1
   b=[focus,n(6),focus,n(6)]
  else
   isolated={1=>'.x.',2=>'x..',3=>'.x.'}[lesson];b=[t(isolated)]*4
  end
  reading<<b;draw("k#{chapter}-l#{lesson}-lesen-6",[b],"Kapitel #{chapter}, Lektion #{lesson}, Leseübung 6")
  hearing=[[focus,n(6),r(6),focus],[n(12),focus,n(6)],[r(6),focus,focus,n(6)]]
  hearing.each_with_index{|b,i|raise 'Copied reading' if reading.include?(b);draw("k#{chapter}-l#{lesson}-hoeren-#{i+1}",[b],"Lösung Höraufgabe #{i+1}: ein Takt")}
 end
 patterns=chapter==1 ? [t('xxx',accent:0),t('xxx',accent:1),t('xxx',accent:2)] : [t('.xx'),t('x.x'),t('xx.')]
 a,b,c=patterns
 readings={1=>[[a,e,n(6),b],[n(12),c,r(6)],[b,a,e,r(6)],[n(24)]],2=>[[e,c,b,n(6)],[r(12),a,e],[r(24)],[b,e,c,a]],3=>[[c,a,b,e],[n(12),r(6),a],[e,b,n(6),c],[r(6),a,c,n(6)]]}
 readings.each{|i,bars|draw("k#{chapter}-l4-lesen-#{i}",bars,"Gemischte Triolen, Leseübung #{i}: vier Takte")}
 [[b,r(6),e,a],[e,a,n(12)],[r(6),c,e,b]].each_with_index{|bar,i|raise 'Copied reading' if readings.values.flatten(1).include?(bar);draw("k#{chapter}-l4-hoeren-#{i+1}",[bar],"Gemischte Triolen, Lösung Höraufgabe #{i+1}: ein Takt")}
 {
 1=>[[a,gap(6),n(6),r(6)],[n(12),gap(6),b],[gap(12),c,e],[b,n(6),gap(12)]],
 2=>[[e,gap(6),a,n(6)],[r(6),b,gap(6),e],[n(12),n(3),gap(3),c],[gap(6),c,r(6),a]],
 3=>[[c,gap(6),a,r(6)],[gap(12),b,e],[r(3),gap(3),a,n(12)],[a,b,gap(6),e]]
 }.each{|i,bars|draw("k#{chapter}-ergaenzen-#{i}",bars,"Ergänzungsaufgabe #{i}: vier unvollständige Takte")}
 [[n(6),c,a,r(6)],[b,r(3),n(3),n(12)],[r(6),a,e,c]].each_with_index{|bar,i|draw("k#{chapter}-fehler-#{i+1}",[bar],"Fehler hören und finden #{i+1}: korrekte Notation")}
 draw("k#{chapter}-schreiben",Array.new(4){[gap(24)]},'Vier leere Takte',blank:true)
end
# Explanatory examples, distinct from student exercises.
draw('einfuehrung-triolen',[[t,t,t,t]],'Vier Achteltriolen: 1 tri ol, 2 tri ol, 3 tri ol, 4 tri ol')
draw('einfuehrung-vergleich',[[n(6),e,t,n(6)]],'Gleicher Viertelpuls: ein Ton, zwei gerade Achtel, drei triolische Achtel, ein Ton')
draw('einfuehrung-pausen',[[t('.xx'),t('x.x'),t('xx.'),n(6)]],'Triolische Achtelpausen innerhalb der Dreierklammer')
File.write(File.join(OUT,'aufgaben.json'),JSON.pretty_generate($manifest))
puts "Generated #{$manifest.size} SVGs; validated all durations, grouping and undotted values."

# encoding: UTF-8
require 'json'; require 'cgi'; require 'fileutils'
BASE=File.expand_path('..',__dir__)
OUT=File.join(BASE,'assets/rhythmus-2/pausen');FileUtils.mkdir_p(OUT)
raw={};%w[bravura-glyphs.json sixteenth-glyph.json sixteenth-rest-glyph.json].each{|f|raw.merge!(JSON.parse(File.read(File.join(__dir__,f))))}
GLYPHS=raw.transform_values do |s|
 c=s.lines.map{|l|m=l.strip.match(/^(.*?)\s*(moveto|lineto|curveto|closepath)$/);next unless m;[{'moveto'=>'M','lineto'=>'L','curveto'=>'C','closepath'=>'Z'}[m[2]],m[1].split.map(&:to_f)]}.compact
 c.pop while c.last && c.last[0]=='M'
 c.map{|op,v|op+v.join(' ')}.join(' ')
end
N=lambda{|d|['n',d]};R=lambda{|d|['r',d]};G=lambda{|d|['g',d]}
def pat(text);text.chars.map{|c|[c=='.' ? 'r' : 'n',1]};end
def bar(*beats);beats.flatten(1);end
def signature(bars);bars.map{|b|b.map{|t|t.join(':')}.join(',')}.join('|');end
$manifest={}
def score(name,bars,title,blank:false)
 raise 'Bar duration' unless bars.all?{|b|b.sum{|_,d|d}==16}
 raise 'Dotted or invalid value' unless bars.flatten(1).all?{|kind,d|%w[n r g].include?(kind)&&[1,2,4,8,16].include?(d)}
 multi=bars.size>1;height=multi ? ((bars.size+1)/2)*150 : 145
 parts=[%(<rect width="960" height="#{height}" fill="white"/>)]
 descriptions=[]
 bars.each_with_index do |events,bi|
  row=multi ? bi/2 : 0;col=multi ? bi%2 : 0;y=100+row*150;start=multi ? 92+col*422 : 120;finish=multi ? start+422 : 936;unit=multi ? 23.5 : 48.75
  if col==0
   parts<<%(<path d="M24 #{y}H936" stroke="black" stroke-width="1"/>)
   parts<<%(<text x="55" y="#{y-1}" font-family="Georgia,serif" font-size="23" font-weight="bold">4</text><text x="55" y="#{y+19}" font-family="Georgia,serif" font-size="23" font-weight="bold">4</text>) if row==0
  end
  unless blank
   16.times{|i|label=i%4==0 ? (i/4+1).to_s : (i%4==2 ? '&amp;' : 'e');parts<<%(<text x="#{start+16+i*unit}" y="#{y-62}" text-anchor="middle" font-family="Arial,sans-serif" font-size="#{multi ? 12 : 22}">#{label}</text>)}
  end
  parts<<%(<path d="M#{start-4} #{y-19}v38" stroke="black" stroke-width="1.5"/>)
  cursor=0; timed=events.map{|kind,d|e=[kind,d,cursor];cursor+=d;e};raise 'Wrong sum' unless cursor==16
  # Beam only adjacent eighth/sixteenth notes within the same quarter beat.
  groups=[];run=[]
  timed.each_with_index do |(kind,d,onset),i|
   eligible=kind=='n' && d<=2 && onset/4==(onset+d-1)/4
   if !eligible || (!run.empty? && timed[run.first][2]/4!=onset/4)
    groups<<run unless run.empty?;run=[]
   end
   run<<i if eligible
  end
  groups<<run unless run.empty?;groups.select!{|g|g.size>1}
  grouped=groups.flatten
  timed.each_with_index do |(kind,d,onset),i|
   x=start+10+onset*unit
   if kind=='g'
    unless blank
     parts<<%(<rect data-gap="true" x="#{x-3}" y="#{y-44}" width="#{d*unit-9}" height="70" rx="4" fill="white" stroke="#65706e" stroke-dasharray="5 4"/><text x="#{x-3+(d*unit-9)/2}" y="#{y+8}" text-anchor="middle" font-family="Arial,sans-serif" font-size="22">?</text>)
    end
    next
   end
   code=kind=='r' ? {1=>'E4E7',2=>'E4E6',4=>'E4E5',8=>'E4E4',16=>'E4E3'}.fetch(d) : (grouped.include?(i) ? 'E0A4' : {1=>'E1D9',2=>'E1D7',4=>'E1D5',8=>'E1D3',16=>'E1D2'}.fetch(d))
   x=start+(finish-start)/2 if kind=='r' && d==16
   parts<<%(<path data-smufl="#{code}" data-bar="#{bi+1}" data-onset="#{onset}" data-duration="#{d}" fill="black" transform="translate(#{x} #{y+20.8}) scale(0.52 -0.52)" d="#{GLYPHS.fetch(code)}"/>)
   parts<<%(<path d="M#{x+11.3} #{y}V#{y-38}" stroke="black" stroke-width="1.5"/>) if grouped.include?(i)
  end
  groups.each do |group|
   xs=group.map{|i|start+21.3+timed[i][2]*unit}
   parts<<%(<path data-beam="1" d="M#{xs.first-0.7} #{y-38}H#{xs.last+0.7}" stroke="black" stroke-width="4.5"/>)
   group.chunk{|i|timed[i][1]==1}.each do |six,indices|
    next unless six
    x1=start+21.3+timed[indices.first][2]*unit;x2=start+21.3+timed[indices.last][2]*unit
    if indices.size==1
     indices.first==group.last ? x1-=8 : x2+=8
    end
    parts<<%(<path data-beam="2" d="M#{x1-0.7} #{y-29}H#{x2+0.7}" stroke="black" stroke-width="4.5"/>)
   end
  end
  parts<<%(<path d="M#{finish-6} #{y-19}v38" stroke="black" stroke-width="1.5"/>)
  parts<<%(<path d="M#{finish} #{y-19}v38" stroke="black" stroke-width="4"/>) if bi==bars.size-1
  names={1=>'Sechzehntel',2=>'Achtel',4=>'Viertel',8=>'Halbe',16=>'Ganze'}
  descriptions<<"Takt #{bi+1}: "+events.map{|kind,d|kind=='g' ? 'Lücke' : "#{names[d]}#{kind=='r' ? 'pause' : 'note'}"}.join(', ')
 end
 desc=descriptions.join('. ')
 File.write(File.join(OUT,name+'.svg'),%(<svg xmlns="http://www.w3.org/2000/svg" width="960" height="#{height}" viewBox="0 0 960 #{height}" role="img" aria-labelledby="title desc"><title id="title">#{CGI.escapeHTML(title)}</title><desc id="desc">#{CGI.escapeHTML(desc)}</desc>#{parts.join}</svg>))
 $manifest[name]={height:height,description:desc,bars:bars,signature:signature(bars)}
end
quarter=[N.call(4)];rest=[R.call(4)];eighths=[N.call(2),N.call(2)];full=pat('xxxx')
(1..4).each do |lesson|
 focus='xxxx';focus[lesson-1]='.';pattern=pat(focus)
 readings=[]
 4.times do |active|
  b=bar(*(0..3).map{|beat|beat==active ? pattern : rest});readings<<b
  score("l#{lesson}-lesen-#{active+1}",[b],"Lektion #{lesson}, Leseübung #{active+1}: Pause auf Position #{lesson}, Schlag #{active+1}")
 end
 b=bar(pattern,pattern,pattern,pattern);readings<<b
 score("l#{lesson}-lesen-5",[b],"Lektion #{lesson}, Leseübung 5: gleiche Pausenposition auf allen vier Schlägen")
 # One isolated sound per beat; the learned rest position remains silent.
 isolated_index={1=>1,2=>0,3=>3,4=>2}[lesson]
 isolated='....';isolated[isolated_index]='x';b=bar(*Array.new(4){pat(isolated)});readings<<b
 score("l#{lesson}-lesen-6",[b],"Lektion #{lesson}, Leseübung 6: nur Position #{isolated_index+1} erklingt")
 hearing=[bar(pattern,quarter,eighths,rest),bar(eighths,pattern,rest,pattern),bar(rest,pattern,pattern,quarter)]
 hearing.each_with_index do |b,i|
  raise 'Copied reading' if readings.include?(b)
  score("l#{lesson}-hoeren-#{i+1}",[b],"Lektion #{lesson}, Lösung Höraufgabe #{i+1}: ein 4/4-Takt")
 end
end
p1=pat('.xxx');p2=pat('x.xx');p3=pat('xx.x');p4=pat('xxx.')
mixed={
 1=>[bar(p1,p2,quarter,rest),bar(eighths,p3,p4,quarter),bar([N.call(8)],p2,p1),bar(p4,rest,full,eighths)],
 2=>[bar(p2,quarter,p4,eighths),bar([R.call(8)],p1,p3),[N.call(16)],bar(rest,p3,eighths,p2)],
 3=>[bar(p3,p1,p4,p2),bar([N.call(8)],rest,p4),[R.call(16)],bar(pat('.x..'),pat('..x.'),eighths,quarter)]
}
mixed.each{|i,bars|score("l5-lesen-#{i}",bars,"Gemischte Pausen, Leseübung #{i}: vier 4/4-Takte")}
[bar(p4,p1,eighths,rest),bar(quarter,p2,rest,p3),bar(pat('.x..'),eighths,p4,quarter)].each_with_index{|b,i|raise 'Copied reading' if mixed.values.any?{|bars|bars.include?(b)};score("l5-hoeren-#{i+1}",[b],"Gemischte Pausen, Lösung Höraufgabe #{i+1}: ein 4/4-Takt")}
{
 1=>[bar(p1,[G.call(4)],quarter,rest),bar([N.call(8)],p2,[G.call(4)]),bar([G.call(8)],p3,eighths),bar(p4,quarter,[G.call(8)])],
 2=>[bar(eighths,[G.call(4)],p1,quarter),bar(rest,p2,[G.call(4)],eighths),bar([N.call(8)],[R.call(2),G.call(2)],p4),bar([G.call(4)],p3,rest,quarter)],
 3=>[bar(pat('.x..'),[G.call(4)],p4,quarter),bar([G.call(8)],p2,p1),bar([R.call(2),G.call(2)],p3,[N.call(8)]),bar(p2,p4,[G.call(4)],eighths)]
}.each{|i,bars|score("ergaenzen-#{i}",bars,"Ergänzungsaufgabe #{i}: vier unvollständige Takte")}
[bar(p2,eighths,p1,quarter),bar(rest,p4,p2,eighths),bar(p3,[N.call(8)],p1)].each_with_index{|b,i|score("fehler-loesung-#{i+1}",[b],"Fehler hören und finden #{i+1}: korrekte Notation")}
score('eigener-rhythmus',Array.new(4){[G.call(16)]},'Vier leere 4/4-Takte für deinen eigenen Rhythmus',blank:true)
File.write(File.join(OUT,'aufgaben.json'),JSON.pretty_generate($manifest))
puts "Generated #{$manifest.size} vector scores; all bars total 16 sixteenth units, without dotted values."

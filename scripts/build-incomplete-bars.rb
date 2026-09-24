# encoding: UTF-8
require 'json'
require 'cgi'
base=File.expand_path('..',__dir__)
glyphs=JSON.parse(File.read(File.join(__dir__,'bravura-glyphs.json'))).transform_values do |s|
 c=s.lines.map{|l|m=l.strip.match(/^(.*?)\s*(moveto|lineto|curveto|closepath)$/);next unless m;[{'moveto'=>'M','lineto'=>'L','curveto'=>'C','closepath'=>'Z'}[m[2]],m[1].split.map(&:to_f)]}.compact
 c.pop while c.last && c.last[0]=='M'
 c.map{|op,v|op+v.join(' ')}.join(' ')
end
# Nested arrays are beam groups. Rests are explicitly tagged; durations are quarter beats.
a=[0.25,0.25,0.5]; b=[0.5,0.25,0.25]; e=[0.5,0.5]; full=[0.25]*4
scores={
 1=>[[a,'g1',1,'r1'],[2,'g1',b],['g2',a,e],[b,1,'g2']],
 2=>[[e,'g1',b,1],['r1',a,'g1',e],[2,0.5,'g0.5',1],['g1',b,'r1',a]],
 3=>[[full,'g1',a,'r1'],['g2',b,e],['r0.5','g0.5',a,2],[a,b,'g1',e]]
}
names={4=>'ganze Note',2=>'halbe Note',1=>'Viertelnote',0.5=>'Achtelnote',0.25=>'Sechzehntelnote','r4'=>'ganze Pause','r2'=>'halbe Pause','r1'=>'Viertelpause','r0.5'=>'Achtelpause','g0.5'=>'Lücke','g1'=>'Lücke','g2'=>'Lücke'}
def duration(t); t.is_a?(String) ? t[1..-1].to_f : t.to_f; end
scores.each do |number,bars|
 bars.each{|bar|raise 'Invalid bar' unless bar.flatten.sum{|t|duration(t)}==4;raise 'Forbidden value' unless bar.flatten.all?{|t|[4,2,1,0.5,0.25,'r4','r2','r1','r0.5','g0.5','g1','g2'].include?(t)}}
 parts=['<rect width="960" height="300" fill="white"/>']
 bars.each_with_index do |bar,bi|
  row=bi/2; col=bi%2; y=105+row*150; start=92+col*422; finish=start+422; unit=94
  if col==0
   parts << %(<path d="M24 #{y}H936" stroke="black" stroke-width="1"/>)
   parts << %(<text x="24" y="#{y-70}" font-family="Arial,sans-serif" font-size="12" fill="#65706e">Takt #{bi+1}–#{bi+2}</text>)
   parts << %(<text x="55" y="#{y-1}" font-family="Georgia,serif" font-size="23" font-weight="bold">4</text><text x="55" y="#{y+19}" font-family="Georgia,serif" font-size="23" font-weight="bold">4</text>) if row==0
  end
  4.times do |beat|
   [ (beat+1).to_s,'e','&amp;','e'].each_with_index do |label,i|
    parts << %(<text x="#{start+16+(beat+i*0.25)*unit}" y="#{y-55}" text-anchor="middle" font-family="Arial,sans-serif" font-size="12">#{label}</text>)
   end
  end
  parts << %(<path d="M#{start-4} #{y-19}v38" stroke="black" stroke-width="1.5"/>)
  cursor=0.0
  bar.each do |token|
   group=token.is_a?(Array); notes=group ? token : [token]; stems=[]
   notes.each do |t|
    d=duration(t); x=start+10+cursor*unit
if t.is_a?(String) && t.start_with?('g')
 # Empty writing space, explicitly not a musical rest or a supplied answer.
 parts << %(<rect data-gap="true" x="#{x-3}" y="#{y-44}" width="#{d*unit-9}" height="70" rx="4" fill="white" stroke="#65706e" stroke-width="1.5" stroke-dasharray="5 4"/>)
 parts << %(<text x="#{x-3+(d*unit-9)/2}" y="#{y+8}" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" fill="#65706e">?</text>)
 cursor+=d
 next
end
    code=if t.is_a?(String)
     {'r4'=>'E4E3','r2'=>'E4E4','r1'=>'E4E5','r0.5'=>'E4E6'}.fetch(t)
    elsif group
     'E0A4'
    else
     {4=>'E1D2',2=>'E1D3',1=>'E1D5',0.5=>'E1D7'}.fetch(t)
    end
    # Center a whole-bar rest; other signs align with their rhythmic onset.
    x=start+200 if t=='r4'
    parts << %(<path data-smufl="#{code}" data-bar="#{bi+1}" data-onset="#{cursor}" data-duration="#{d}" fill="black" transform="translate(#{x} #{y+20.8}) scale(0.52 -0.52)" d="#{glyphs.fetch(code)}"/>)
    if group
     stem=x+11.3; stems<<[stem,d]
     parts << %(<path d="M#{stem} #{y}V#{y-38}" stroke="black" stroke-width="1.5"/>)
    end
    cursor+=d
   end
   if group
    parts << %(<path data-beam-level="1" d="M#{stems.first[0]-0.7} #{y-38}H#{stems.last[0]+0.7}" stroke="black" stroke-width="4.5"/>)
    stems.chunk{|_,d|d==0.25}.each do |sixteenths,run|
     next unless sixteenths
     raise 'Unexpected isolated sixteenth' unless run.size>=2
     parts << %(<path data-beam-level="2" d="M#{run.first[0]-0.7} #{y-29}H#{run.last[0]+0.7}" stroke="black" stroke-width="4.5"/>)
    end
   end
  end
  parts << %(<path d="M#{finish-6} #{y-19}v38" stroke="black" stroke-width="1.5"/>)
  parts << %(<path d="M#{finish} #{y-19}v38" stroke="black" stroke-width="4"/>) if bi==3
 end
 description=bars.each_with_index.map{|bar,i|"Takt #{i+1}: "+bar.flatten.map{|t|names.fetch(t)}.join(', ')}.join('. ')
 svg=%(<svg xmlns="http://www.w3.org/2000/svg" width="960" height="300" viewBox="0 0 960 300" role="img" aria-labelledby="title desc"><title id="title">Takte vervollständigen · Aufgabe #{number}: vier unvollständige 4/4-Takte</title><desc id="desc">#{CGI.escapeHTML(description)}</desc>#{parts.join}</svg>)
 raise 'Forbidden rest' if svg.include?('E4E7')
 File.write(File.join(base,"assets/rhythmus-2/takte-ergaenzen-#{number}.svg"),svg)
end
puts 'Generated 12 incomplete bars with one writing gap each; no solutions.'

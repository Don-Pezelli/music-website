# encoding: UTF-8
require 'json'
base=File.expand_path('..',__dir__)
glyphs=JSON.parse(File.read(File.join(__dir__,'bravura-glyphs.json'))).transform_values do |raw|
 c=raw.lines.map do |line|
  m=line.strip.match(/^(.*?)\s*(moveto|lineto|curveto|closepath)$/)
  next unless m
  [{'moveto'=>'M','lineto'=>'L','curveto'=>'C','closepath'=>'Z'}[m[2]],m[1].split.map(&:to_f)]
 end.compact
 c.pop while c.last[0]=='M'
 {path:c.map{|op,v|op+v.join(' ')}.join(' '),bottom:c.flat_map{|_,v|v.each_slice(2).map(&:last)}.min}
end
# Each active beat starts on its number; values give the count of sixteenth notes.
exercises={
 1=>{notes:{0=>2,1=>2},rests:[[0,0.5],[1,0.5],[2,2]]},
 2=>{notes:{0=>4,3=>2},rests:[[1,1],[2,1],[3,0.5]]},
 3=>{notes:{1=>4,2=>4,3=>2},rests:[[0,1],[3,0.5]]}
}
exercises.each do |number,exercise|
 parts=['<rect width="960" height="145" fill="white"/>','<path d="M24 100H936" stroke="black" stroke-width="1"/>','<path d="M36 81v38" stroke="black" stroke-width="1.5"/>','<text x="65" y="99" font-family="Georgia,serif" font-weight="bold" font-size="23">4</text>','<text x="65" y="119" font-family="Georgia,serif" font-weight="bold" font-size="23">4</text>']
 4.times do |beat|
  labels=exercise[:notes].key?(beat) ? [(beat+1).to_s,'e','&amp;','e'] : [(beat+1).to_s]
  labels.each_with_index{|label,i|parts << %(<text x="#{136+beat*210+i*52.5}" y="32" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="22" fill="#202e31">#{label}</text>)}
 end
 exercise[:notes].each do |beat,count|
  stems=[]
  count.times do |i|
   offset=count==2 ? 0.5 : 0; x=130+(beat+offset)*210+i*52.5; stem=x+11.3; stems << stem
   parts << %(<path data-smufl="E0A4" data-onset="#{beat+offset+i*0.25}" data-duration="0.25" fill="black" transform="translate(#{x} 120.8) scale(0.52 -0.52)" d="#{glyphs.fetch('E0A4')[:path]}"/>)
   parts << %(<path d="M#{stem} 100V62" stroke="black" stroke-width="1.5"/>)
  end
  [62,71].each{|y|parts << %(<path data-beam="#{count}" d="M#{stems.first-0.7} #{y}H#{stems.last+0.7}" stroke="black" stroke-width="4.5"/>)}
 end
 exercise[:rests].each do |beat,duration|
  code={0.5=>'E4E6',1=>'E4E5',2=>'E4E4'}.fetch(duration); g=glyphs.fetch(code)
  y=duration==2 ? 100+g[:bottom]*0.52 : 120.8
  parts << %(<path data-smufl="#{code}" data-onset="#{beat}" data-duration="#{duration}" fill="black" transform="translate(#{130+beat*210} #{y}) scale(0.52 -0.52)" d="#{g[:path]}"/>)
 end
 parts << '<path d="M929 81v38" stroke="black" stroke-width="1.5"/><path d="M936 81v38" stroke="black" stroke-width="4"/>'
 svg=%(<svg xmlns="http://www.w3.org/2000/svg" width="960" height="145" viewBox="0 0 960 145" role="img" aria-labelledby="title"><title id="title">Lösung zu Höraufgabe #{number}: ein 4/4-Takt mit Sechzehntelnoten und Pausen</title>#{parts.join}</svg>)
 events=svg.scan(/data-onset="([\d.]+)" data-duration="([\d.]+)"/).map{|a,b|[a.to_f,b.to_f]}.sort
 cursor=0
 events.each{|onset,duration|raise 'Gap or overlap' unless onset==cursor; cursor+=duration}
 raise 'Incomplete bar' unless cursor==4
 File.write(File.join(base,"assets/rhythmus-2/hoerloesung-ande-#{number}.svg"),svg)
end

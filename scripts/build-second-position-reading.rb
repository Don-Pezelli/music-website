# encoding: UTF-8
require 'json'
base=File.expand_path('..',__dir__)
raw={}
%w[bravura-glyphs.json sixteenth-glyph.json sixteenth-rest-glyph.json].each{|name|raw.merge!(JSON.parse(File.read(File.join(__dir__,name))))}
glyphs=raw.transform_values do |description|
 c=description.lines.map do |line|
  m=line.strip.match(/^(.*?)\s*(moveto|lineto|curveto|closepath)$/)
  next unless m
  [{'moveto'=>'M','lineto'=>'L','curveto'=>'C','closepath'=>'Z'}[m[2]],m[1].split.map(&:to_f)]
 end.compact
 c.pop while c.last[0]=='M'
 c.map{|op,v|op+v.join(' ')}.join(' ')
end
parts=['<rect width="960" height="145" fill="white"/>','<path d="M24 100H936" stroke="black" stroke-width="1"/>','<path d="M36 81v38" stroke="black" stroke-width="1.5"/>','<text x="65" y="99" font-family="Georgia,serif" font-weight="bold" font-size="23">4</text>','<text x="65" y="119" font-family="Georgia,serif" font-weight="bold" font-size="23">4</text>']
4.times do |beat|
 [(beat+1).to_s,'e','&amp;','e'].each_with_index do |label,i|
  parts << %(<text x="#{136+beat*210+i*52.5}" y="32" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="22" fill="#202e31">#{label}</text>)
 end
 # Silence on the downbeat, one isolated sixteenth on position 2, silence on & e.
 [['E4E7',0,0.25],['E1D9',0.25,0.25],['E4E6',0.5,0.5]].each do |code,offset,duration|
  parts << %(<path data-smufl="#{code}" data-onset="#{beat+offset}" data-duration="#{duration}" fill="black" transform="translate(#{130+(beat+offset)*210} 120.8) scale(0.52 -0.52)" d="#{glyphs.fetch(code)}"/>)
 end
end
parts << '<path d="M929 81v38" stroke="black" stroke-width="1.5"/><path d="M936 81v38" stroke="black" stroke-width="4"/>'
svg=%(<svg xmlns="http://www.w3.org/2000/svg" width="960" height="145" viewBox="0 0 960 145" role="img" aria-labelledby="title"><title id="title">Leseübung 7: nur die zweite Sechzehntelposition auf 1e, 2e, 3e und 4e. Sechzehntelpause auf jeder Hauptzählzeit, Achtelpause auf jeder zweiten Schlaghälfte.</title>#{parts.join}</svg>)
cursor=0
svg.scan(/data-onset="([\d.]+)" data-duration="([\d.]+)"/).each{|onset,duration|raise 'Gap or overlap' unless onset.to_f==cursor; cursor+=duration.to_f}
raise 'Incomplete bar' unless cursor==4
raise 'Wrong note positions' unless svg.scan(/data-smufl="E1D9" data-onset="([\d.]+)"/).flatten.map(&:to_f)==[0.25,1.25,2.25,3.25]
File.write(File.join(base,'assets/rhythmus-2/leseuebung-1e-7.svg'),svg)

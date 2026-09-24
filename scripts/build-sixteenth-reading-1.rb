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
parts=['<rect width="960" height="145" fill="white"/>','<path d="M24 100H936" stroke="black" stroke-width="1"/>','<path d="M36 81v38" stroke="black" stroke-width="1.5"/>','<text x="65" y="99" font-family="Georgia,serif" font-weight="bold" font-size="23">4</text>','<text x="65" y="119" font-family="Georgia,serif" font-weight="bold" font-size="23">4</text>']
[[136,'1'],[188.5,'e'],[241,'&amp;'],[293.5,'e'],[346,'2'],[556,'3'],[766,'4']].each do |x,label|
 parts << %(<text x="#{x}" y="32" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="22" fill="#202e31">#{label}</text>)
end
stems=[]
4.times do |i|
 x=130+i*52.5; stem=x+11.3; stems<<stem
 parts << %(<path data-smufl="E0A4" data-duration="0.25" fill="black" transform="translate(#{x} 120.8) scale(0.52 -0.52)" d="#{glyphs.fetch('E0A4')[:path]}"/>)
 parts << %(<path d="M#{stem} 100V62" stroke="black" stroke-width="1.5"/>)
end
[62,71].each{|y|parts << %(<path data-beam="4" d="M#{stems.first-0.7} #{y}H#{stems.last+0.7}" stroke="black" stroke-width="4.5"/>)}
parts << %(<path data-smufl="E4E5" data-duration="1" fill="black" transform="translate(340 120.8) scale(0.52 -0.52)" d="#{glyphs.fetch('E4E5')[:path]}"/>)
# The half rest sits ON the rhythmic line and spans beats 3 and 4.
half=glyphs.fetch('E4E4')
parts << %(<path data-smufl="E4E4" data-duration="2" fill="black" transform="translate(550 #{100+half[:bottom]*0.52}) scale(0.52 -0.52)" d="#{half[:path]}"/>)
parts << '<path d="M929 81v38" stroke="black" stroke-width="1.5"/><path d="M936 81v38" stroke="black" stroke-width="4"/>'
File.write(File.join(base,'assets/rhythmus-2/leseuebung-1.svg'),%(<svg xmlns="http://www.w3.org/2000/svg" width="960" height="145" viewBox="0 0 960 145" role="img" aria-labelledby="title"><title id="title">4/4-Takt: vier Sechzehntel auf Schlag 1, Viertelpause auf Schlag 2, halbe Pause auf den Schlägen 3 und 4</title>#{parts.join}</svg>))

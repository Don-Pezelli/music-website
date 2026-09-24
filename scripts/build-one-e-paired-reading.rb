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
{5=>[0,2],6=>[1,3]}.each do |exercise,active_beats|
 parts=['<rect width="960" height="145" fill="white"/>','<path d="M24 100H936" stroke="black" stroke-width="1"/>','<path d="M36 81v38" stroke="black" stroke-width="1.5"/>','<text x="65" y="99" font-family="Georgia,serif" font-weight="bold" font-size="23">4</text>','<text x="65" y="119" font-family="Georgia,serif" font-weight="bold" font-size="23">4</text>']
 4.times do |beat|
  labels=active_beats.include?(beat) ? [(beat+1).to_s,'e','&amp;','e'] : [(beat+1).to_s]
  labels.each_with_index do |label,i|
   parts << %(<text x="#{136+beat*210+i*52.5}" y="32" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="22" fill="#202e31">#{label}</text>)
  end
 end
 active_beats.each do |active|
 stems=[]
 2.times do |i|
  x=130+active*210+i*52.5; stem=x+11.3; stems<<stem
  parts << %(<path data-smufl="E0A4" data-duration="0.25" fill="black" transform="translate(#{x} 120.8) scale(0.52 -0.52)" d="#{glyphs.fetch('E0A4')[:path]}"/>)
  parts << %(<path d="M#{stem} 100V62" stroke="black" stroke-width="1.5"/>)
 end
 [62,71].each{|y|parts << %(<path data-beam="2" d="M#{stems.first-0.7} #{y}H#{stems.last+0.7}" stroke="black" stroke-width="4.5"/>)}
 parts << %(<path data-smufl="E4E6" data-duration="0.5" fill="black" transform="translate(#{235+active*210} 120.8) scale(0.52 -0.52)" d="#{glyphs.fetch('E4E6')[:path]}"/>)
 end
 rests=((0..3).to_a-active_beats).map{|beat|[beat,1]}
 rests.each do |beat,duration|
  code=duration==2 ? 'E4E4' : 'E4E5'; g=glyphs.fetch(code)
  y=duration==2 ? 100+g[:bottom]*0.52 : 120.8
  parts << %(<path data-smufl="#{code}" data-duration="#{duration}" fill="black" transform="translate(#{130+beat*210} #{y}) scale(0.52 -0.52)" d="#{g[:path]}"/>)
 end
 parts << '<path d="M929 81v38" stroke="black" stroke-width="1.5"/><path d="M936 81v38" stroke="black" stroke-width="4"/>'
 svg=%(<svg xmlns="http://www.w3.org/2000/svg" width="960" height="145" viewBox="0 0 960 145" role="img" aria-labelledby="title"><title id="title">Leseübung #{exercise}: je zwei Sechzehntel auf der ersten Hälfte der Schläge #{active_beats.map{|b|b+1}.join(' sowie ')}, Pausen auf den übrigen Schlägen</title>#{parts.join}</svg>)
 raise 'Wrong total duration' unless svg.scan(/data-duration="([\d.]+)"/).flatten.map(&:to_f).sum==4
 File.write(File.join(base,"assets/rhythmus-2/leseuebung-1e-#{exercise}.svg"),svg)
end

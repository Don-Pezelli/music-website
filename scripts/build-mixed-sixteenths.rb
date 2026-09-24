# encoding: UTF-8
require 'json'
base=File.expand_path('..',__dir__)
glyphs=JSON.parse(File.read(File.join(__dir__,'bravura-glyphs.json'))).transform_values do |description|
 commands=description.lines.map do |line|
  m=line.strip.match(/^(.*?)\s*(moveto|lineto|curveto|closepath)$/)
  next unless m
  [{'moveto'=>'M','lineto'=>'L','curveto'=>'C','closepath'=>'Z'}[m[2]],m[1].split.map(&:to_f)]
 end.compact
 commands.pop while commands.last[0]=='M'
 points=commands.flat_map{|_,v|v.each_slice(2).to_a}
 {path:commands.map{|c,v|c+v.join(' ')}.join(' '),left:points.map(&:first).min,right:points.map(&:first).max,bottom:points.map(&:last).min,top:points.map(&:last).max}
end
def shape(g,code,x,bottom,height)
 scale=height/(g[:top]-g[:bottom])
 %(<path data-smufl="#{code}" fill="black" transform="translate(#{x-g[:left]*scale} #{bottom+g[:bottom]*scale}) scale(#{scale} #{-scale})" d="#{g[:path]}"/>)
end
def beam(x1,x2,y,level)
 %(<path data-beam-level="#{level}" d="M#{x1} #{y}H#{x2}" stroke="black" stroke-width="8"/>)
end
parts=['<rect x="4" y="4" width="992" height="252" rx="8" fill="#fff34f" stroke="black" stroke-width="8"/>']
# Durations in sixteenth units, grouped by quarter-note beat.
groups=[[2,1,1],[1,1,2],[1,2,1]]
raise 'Invalid durations' unless groups.all?{|g|g.sum==4}
4.times do |beat|
 x=24+beat*241
 parts << %(<rect x="#{x}" y="25" width="229" height="60" fill="#00a8ef"/>)
 ["#{beat+1}",'e','&amp;','e'].each_with_index do |label,i|
  parts << %(<text x="#{x+22+i*57}" y="67" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700">#{label}</text>)
 end
 if beat==3
  parts << shape(glyphs.fetch('E4E5'),'E4E5',x+8,215,100)
  next
 end
 head=glyphs.fetch('E0A4'); scale=24.0/(head[:top]-head[:bottom]); cursor=0; stems=[]
 groups[beat].each do |duration|
  nx=x+22+cursor*57-19
  parts << shape(head,'E0A4',nx,215,24)
  stem=nx+(head[:right]-head[:left])*scale-1.5
  stems << stem
  parts << %(<path data-stem="true" d="M#{stem} 205V110" stroke="black" stroke-width="3"/>)
  cursor+=duration
 end
 parts << beam(stems.first-1.5,stems.last+1.5,110,1)
 case beat
 when 0 then parts << beam(stems[1]-1.5,stems[2]+1.5,125,2)
 when 1 then parts << beam(stems[0]-1.5,stems[1]+1.5,125,2)
 when 2
  parts << beam(stems[0]-1.5,stems[0]+19,125,2)
  parts << beam(stems[2]-19,stems[2]+1.5,125,2)
 end
end
File.write(File.join(base,'assets/rhythmus-2/gemischte-balken.svg'),%(<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="260" viewBox="0 0 1000 260" role="img" aria-labelledby="title"><title id="title">Gemischte Balkengruppen im 4/4-Takt: Achtel und zwei Sechzehntel; zwei Sechzehntel und Achtel; Sechzehntel, Achtel, Sechzehntel; Viertelpause</title>#{parts.join}</svg>))

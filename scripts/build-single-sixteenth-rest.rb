# encoding: UTF-8
require 'json'
base=File.expand_path('..',__dir__)
description=JSON.parse(File.read(File.join(__dir__,'sixteenth-rest-glyph.json'))).fetch('E4E7')
commands=description.lines.map do |line|
 m=line.strip.match(/^(.*?)\s*(moveto|lineto|curveto|closepath)$/)
 next unless m
 [{'moveto'=>'M','lineto'=>'L','curveto'=>'C','closepath'=>'Z'}[m[2]],m[1].split.map(&:to_f)]
end.compact
commands.pop while commands.last[0]=='M'
points=commands.flat_map{|_,v|v.each_slice(2).to_a}
left=points.map(&:first).min; right=points.map(&:first).max
bottom=points.map(&:last).min; top=points.map(&:last).max
scale=180.0/(top-bottom)
x=(160-(right-left)*scale)/2-left*scale
y=30+top*scale
path=commands.map{|c,v|c+v.join(' ')}.join(' ')
File.write(File.join(base,'assets/rhythmus-2/sechzehntelpause-einzeln.svg'),%(<svg xmlns="http://www.w3.org/2000/svg" width="160" height="240" viewBox="0 0 160 240" role="img" aria-labelledby="title"><title id="title">Eine Sechzehntelpause mit zwei Häkchen</title><path data-smufl="E4E7" fill="black" transform="translate(#{x} #{y}) scale(#{scale} #{-scale})" d="#{path}"/></svg>))

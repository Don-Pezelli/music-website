# encoding: UTF-8
# Run: ruby -E UTF-8 scripts/build-sixteenth-diagram.rb
require 'json'
require 'fileutils'
base=File.expand_path('..',__dir__)
description=JSON.parse(File.read(File.join(__dir__,'bravura-glyphs.json'))).fetch('E0A4')
commands=description.lines.map do |line|
 m=line.strip.match(/^(.*?)\s*(moveto|lineto|curveto|closepath)$/)
 next unless m
 [{'moveto'=>'M','lineto'=>'L','curveto'=>'C','closepath'=>'Z'}[m[2]],m[1].split.map(&:to_f)]
end.compact
commands.pop while commands.last[0]=='M'
points=commands.flat_map{|_,v| v.each_slice(2).to_a}
left=points.map(&:first).min; bottom=points.map(&:last).min; top=points.map(&:last).max
path=commands.map{|c,v| c+v.join(' ')}.join(' ')
right=points.map(&:first).max; scale=24.0/(top-bottom)
parts=['<rect x="4" y="4" width="992" height="252" rx="8" fill="#fff34f" stroke="black" stroke-width="8"/>']
4.times do |beat|
 x=24+beat*241
 parts << %(<rect x="#{x}" y="25" width="229" height="60" fill="#00a8ef"/>)
 stems=[]
 ["#{beat+1}",'e','&amp;','e'].each_with_index do |label,i|
  cx=x+22+i*57
  parts << %(<text x="#{cx}" y="67" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700">#{label}</text>)
  parts << %(<path data-smufl="E0A4" fill="black" transform="translate(#{cx-19-left*scale} #{215+bottom*scale}) scale(#{scale} #{-scale})" d="#{path}"/>)
  stem=cx-19+(right-left)*scale-1.5
  stems << stem
  parts << %(<path data-stem="true" d="M#{stem} 205V110" stroke="black" stroke-width="3"/>)
 end
 [110,125].each do |y|
  parts << %(<path data-beam="4" d="M#{stems.first-1.5} #{y}H#{stems.last+1.5}" stroke="black" stroke-width="8"/>)
 end
end
out=File.join(base,'assets/rhythmus-2'); FileUtils.mkdir_p(out)
File.write(File.join(out,'sechzehntelnoten.svg'),%(<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="260" viewBox="0 0 1000 260" role="img" aria-labelledby="title"><title id="title">16 Sechzehntelnoten im 4/4-Takt: 1 e &amp; e, 2 e &amp; e, 3 e &amp; e, 4 e &amp; e</title>#{parts.join}</svg>))

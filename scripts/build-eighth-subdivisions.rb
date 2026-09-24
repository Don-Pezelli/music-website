# encoding: UTF-8
require 'json'
base=File.expand_path('..',__dir__)
raw=JSON.parse(File.read(File.join(__dir__,'bravura-glyphs.json'))).fetch('E0A4')
commands=raw.lines.map do |line|
 m=line.strip.match(/^(.*?)\s*(moveto|lineto|curveto|closepath)$/)
 next unless m
 [{'moveto'=>'M','lineto'=>'L','curveto'=>'C','closepath'=>'Z'}[m[2]],m[1].split.map(&:to_f)]
end.compact
commands.pop while commands.last[0]=='M'
path=commands.map{|c,v|c+v.join(' ')}.join(' ')
parts=['<rect width="960" height="145" fill="white"/>','<path d="M24 100H936" stroke="black" stroke-width="1"/>','<path d="M36 81v38" stroke="black" stroke-width="1.5"/>','<text x="65" y="99" font-family="Georgia,serif" font-weight="bold" font-size="23">4</text>','<text x="65" y="119" font-family="Georgia,serif" font-weight="bold" font-size="23">4</text>']
stems=[]
8.times do |i|
 x=130+i*105
 label=i.even? ? (i/2+1).to_s : '&amp;'
 parts << %(<text data-count="#{i+1}" x="#{x+6}" y="32" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="22" fill="#202e31">#{label}</text>)
 parts << %(<text data-subdivision="#{i+1}" x="#{x+58.5}" y="32" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="22" fill="#202e31">e</text>)
 parts << %(<path data-smufl="E0A4" fill="black" transform="translate(#{x} 120.8) scale(0.52 -0.52)" d="#{path}"/>)
 stem=x+11.3; stems << stem
 parts << %(<path d="M#{stem} 100V62" stroke="black" stroke-width="1.5"/>)
end
stems.each_slice(2){|a,b|parts << %(<path data-beam="2" d="M#{a-0.7} 62H#{b+0.7}" stroke="black" stroke-width="4.5"/>)}
parts << '<path d="M929 81v38" stroke="black" stroke-width="1.5"/><path d="M936 81v38" stroke="black" stroke-width="4"/>'
File.write(File.join(base,'assets/rhythmus-2/achtel-sechzehntelraster.svg'),%(<svg xmlns="http://www.w3.org/2000/svg" width="960" height="145" viewBox="0 0 960 145" role="img" aria-labelledby="title"><title id="title">Ein 4/4-Takt mit acht Achtelnoten. Zähle: 1 e &amp; e, 2 e &amp; e, 3 e &amp; e, 4 e &amp; e. Klatsche nur die Achtelnoten.</title>#{parts.join}</svg>))

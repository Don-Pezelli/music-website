# encoding: UTF-8
# Complete musical outlines from the same Bravura glyph set as the introduction.
require 'json';require 'cgi'
base=File.expand_path('..',__dir__);out=File.join(base,'assets/kapitel-2')
glyphs=JSON.parse(File.read(File.join(__dir__,'bravura-glyphs.json'))).transform_values do |s|
 c=s.lines.map{|l|m=l.strip.match(/^(.*?)\s*(moveto|lineto|curveto|closepath)$/);next unless m;[{'moveto'=>'M','lineto'=>'L','curveto'=>'C','closepath'=>'Z'}[m[2]],m[1].split.map(&:to_f)]}.compact
 c.pop while c.last && c.last[0]=='M'
 c.map{|op,v|op+v.join(' ')}.join(' ')
end
G=glyphs
# Durations in quarter-note beats. Nested arrays mark exactly the source beam groups.
Q=[1,1,1,1]; E=[0.5,0.5]; E4=[0.5]*4; W=[4]; H=[2,2]
scores={
29=>[W,W,W,W],47=>[H,W,W,H,H,W,H,W],74=>[Q,H,W,H,Q,[2,1,1],[1,1,2],Q],
81=>[H,Q,Q,W],85=>[W,Q,H,Q],95=>[Q,[1,1,2],[2,1,1],Q],
106=>[['r4'],[E4,E4],['r4'],[E4,E4],['r4'],[E4,E4],['r4'],[E4,E4]],
115=>[['r4'],['r0.5',0.5,'r0.5',0.5,'r0.5',0.5,'r0.5',0.5],['r4'],['r0.5',0.5,'r0.5',0.5,'r0.5',0.5,'r0.5',0.5],['r4'],['r0.5',0.5,'r0.5',0.5,'r0.5',0.5,'r0.5',0.5],['r4'],['r0.5',0.5,'r0.5',0.5,'r0.5',0.5,'r0.5',0.5]],
116=>[[E4,E4],Q,[2,1,E],[1,E,1,E]],117=>[W,[E,1,E,1],[E,2,1],[1,2,E]],
132=>[[1,1,E,1]],134=>[[E,1,E,1]],136=>[[1,1,1,E]],151=>[[2,E4]],
168=>[[E,1,1,E]],170=>[[E4,E,1]],172=>[[1,1,1,E]],
186=>[[1,1,E4]],187=>[[E,2,E]],188=>[[E4,1,E]]}
def duration(t);t.is_a?(String) ? t[1..-1].to_f : t.to_f;end
def shape(code,x,y,scale=0.52)
 # Bravura Text's rhythmic baseline is y=40. SVG's y axis points downward.
 %Q{<path data-smufl="#{code}" fill="black" transform="translate(#{x} #{y+40*scale}) scale(#{scale} #{-scale})" d="#{G.fetch(code)}"/>}
end
scores.each do |id,bars|
 bars.each{|bar|raise "Incomplete bar #{id}" unless bar.flatten.sum{|t|duration(t)}==4}
 rows=(bars.length/4.0).ceil;width=960;height=rows*135
 parts=[%Q{<svg xmlns="http://www.w3.org/2000/svg" width="#{width}" height="#{height}" viewBox="0 0 #{width} #{height}" role="img" aria-labelledby="title"><title id="title">Rhythmus im 4/4-Takt, #{bars.length} #{bars.length==1 ? 'Takt' : 'Takte'}</title><path fill="white" d="M0 0H#{width}V#{height}H0Z"/>}]
 bars.each_slice(4).with_index do |row,r|
  y=80+r*135; start=86.0; finish=940;bw=(finish-start)/row.length
  parts<<%Q{<path d="M18 #{y}H#{finish}" stroke="black" stroke-width="1"/><path d="M29 #{y-11}v22M38 #{y-11}v22" stroke="black" stroke-width="5"/>}
  if r==0
   parts<<%Q{<text x="51" y="#{y-1}" font-family="Georgia,serif" font-weight="bold" font-size="23">4</text><text x="51" y="#{y+19}" font-family="Georgia,serif" font-weight="bold" font-size="23">4</text>}
  else
   parts<<%Q{<text x="20" y="#{y-40}" font-family="Georgia,serif" font-style="italic" font-size="13">#{r*4+1}</text>}
  end
  row.each_with_index do |bar,bi|
   cursor=0.0;x0=start+bi*bw;unit=(bw-26)/4
   bar.each do |token|
    tokens=token.is_a?(Array) ? token : [token];beam=[]
    tokens.each do |t|
     x=x0+10+cursor*unit;d=duration(t)
     if t.is_a?(String)
      code=d==4 ? 'E4E3' : 'E4E6';parts<<shape(code,x,y)
     elsif token.is_a?(Array)
      parts<<shape('E0A4',x,y);stem=x+11.3
      parts<<%Q{<path d="M#{stem} #{y}V#{y-38}" stroke="black" stroke-width="1.5"/>};beam<<stem
     else
      code={4=>'E1D2',2=>'E1D3',1=>'E1D5',0.5=>'E1D7'}.fetch(d==0.5 ? d : d.to_i);parts<<shape(code,x,y)
     end
     cursor+=d
    end
    parts<<%Q{<path data-beam="#{beam.length}" d="M#{beam.first-0.7} #{y-38}H#{beam.last+0.7}" stroke="black" stroke-width="4.5"/>} unless beam.empty?
   end
   endx=x0+bw;last=(r*4+bi==bars.length-1)
   parts<<%Q{<path d="M#{last ? endx-6 : endx} #{y-19}v38" stroke="black" stroke-width="1.5"/>}
   parts<<%Q{<path d="M#{endx} #{y-19}v38" stroke="black" stroke-width="4"/>} if last
  end
 end
 parts<<'</svg>';File.write(File.join(out,"noten-#{id}.svg"),parts.join)
end
# Four individual symbol paths for the note-value overview, independent of fonts.
{4=>'E1D2',2=>'E1D3',1=>'E1D5',0.5=>'E1D7'}.each do |value,code|
 File.write(File.join(out,"symbol-#{value}.svg"),%Q{<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 70"><title>Notenwert #{value} Schläge</title>#{shape(code,6,53,0.57)}</svg>})
end
File.write(File.join(out,'score-data.json'),JSON.pretty_generate(scores))
puts "Built #{scores.length} score SVGs; all #{scores.values.flatten(1).length} bars total four quarter-note beats."

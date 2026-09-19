# encoding: UTF-8
# Complete musical outlines from the same Bravura glyph set as the introduction.
require 'json';require 'cgi'
base=File.expand_path('..',__dir__);out=File.join(base,'assets/kapitel-3')
glyphs=JSON.parse(File.read(File.join(__dir__,'bravura-glyphs.json'))).transform_values do |s|
 c=s.lines.map{|l|m=l.strip.match(/^(.*?)\s*(moveto|lineto|curveto|closepath)$/);next unless m;[{'moveto'=>'M','lineto'=>'L','curveto'=>'C','closepath'=>'Z'}[m[2]],m[1].split.map(&:to_f)]}.compact
 c.pop while c.last && c.last[0]=='M'
 c.map{|op,v|op+v.join(' ')}.join(' ')
end
G=glyphs
# Durations in quarter-note beats. Nested arrays mark exactly the source beam groups.
Q=[1,1,1,1]; E=[0.5,0.5]; E4=[0.5]*4; W=[4]; H=[2,2]
scores={
28=>[[E,2,1],['r4'],[1,E,E4],['r4'],[1,2,E],['r4'],[E,1,1,E],W],
45=>[[E,1,1,1],['r4'],['r4'],[1,E,E4]],46=>[W,Q,['r4'],['r4']],47=>[Q,['r4'],[E4,2],['r4']],48=>[H,['r4'],[E,1,E,1],['r4']],
72=>[[E,'r2',1],[1,'r2',1],[1,E,'r2'],['r4'],[1,'r2',E],[2,'r2'],['r2',1,E],[E4,'r2']],
82=>[['r2',1,1],[E,'r2',1],[E4,'r2'],[E,'r2',E]],83=>[[2,'r2'],['r2',E,1],['r2',E4],[1,'r2',E]],84=>[['r2',2],[2,'r2'],[E,'r2',E],[1,1,'r2']],
109=>[[E,'r1',E,'r1'],[E4,E,'r1'],['r1',2,E],[1,'r1',1,E]],110=>[[E4,1,1],['r1',E,1,E]],
123=>[[E4,1,'r1'],[1,'r1',1,'r1']],124=>[[E,'r1',1,'r1'],[E,1,E,'r1']],126=>[[E,1,1,'r1'],['r1',1,E,'r1']],
146=>[[E,'r0.5',0.5,'r0.5',[0.5,0.5,0.5]],[0.5,'r0.5','r0.5',0.5,E,'r0.5',0.5]],
147=>[[E,1,'r0.5',E,'r0.5'],[E4,'r0.5',[0.5,0.5,0.5]]],
150=>[['r0.5',0.5,'r0.5',0.5,'r0.5',[0.5,0.5,0.5]],['r2','r0.5',0.5,'r0.5',0.5]],
164=>[[1,E,'r0.5',0.5,'r0.5',0.5],[2,1,'r0.5',0.5]],
166=>[[0.5,'r0.5',E,E4],[E4,'r0.5',[0.5,0.5,0.5]]],
168=>[[E4,'r1',E],['r1',0.5,'r0.5',0.5,'r0.5',0.5,'r0.5']],
182=>[[1,'r0.5',0.5,E4],['r1',E,'r0.5',[0.5,0.5,0.5]]],
185=>[[1,E,0.5,'r0.5','r0.5',0.5],[0.5,'r0.5','r0.5',0.5,0.5,'r0.5','r1']],
198=>[[0.5,'r0.5',1,'r0.5',[0.5,0.5,0.5]],[0.5,'r0.5',1,'r0.5',[0.5,0.5,0.5]],[0.5,'r0.5',1,'r0.5',[0.5,0.5,0.5]],[1,'r0.5',0.5,1,'r1']],
237=>[[1,1,1,E,1]],239=>[[1,'r1',1,E]],240=>[['r2',E4]]}
def duration(t);t.is_a?(String) ? t[1..-1].to_f : t.to_f;end
def shape(code,x,y,scale=0.52)
 # Bravura Text's rhythmic baseline is y=40. SVG's y axis points downward.
 %Q{<path data-smufl="#{code}" fill="black" transform="translate(#{x} #{y+40*scale}) scale(#{scale} #{-scale})" d="#{G.fetch(code)}"/>}
end
scores.each do |id,bars|
 bars.each{|bar|raise "Incomplete bar #{id}" unless bar.flatten.sum{|t|duration(t)}==(id==237 ? 5 : 4)}
 per_row=id==198 ? 2 : 4; rows=(bars.length/per_row.to_f).ceil;width=960;height=rows*135
 parts=[%Q{<svg xmlns="http://www.w3.org/2000/svg" width="#{width}" height="#{height}" viewBox="0 0 #{width} #{height}" role="img" aria-labelledby="title"><title id="title">Rhythmus im 4/4-Takt, #{bars.length} #{bars.length==1 ? 'Takt' : 'Takte'}</title><path fill="white" d="M0 0H#{width}V#{height}H0Z"/>}]
 bars.each_slice(per_row).with_index do |row,r|
  y=80+r*135; start=86.0; finish=940;bw=(finish-start)/row.length
  parts<<%Q{<path d="M18 #{y}H#{finish}" stroke="black" stroke-width="1"/><path d="M29 #{y-11}v22M38 #{y-11}v22" stroke="black" stroke-width="5"/>}
  if r==0
   parts<<%Q{<text x="51" y="#{y-1}" font-family="Georgia,serif" font-weight="bold" font-size="23">4</text><text x="51" y="#{y+19}" font-family="Georgia,serif" font-weight="bold" font-size="23">4</text>}
  else
   parts<<%Q{<text x="20" y="#{y-40}" font-family="Georgia,serif" font-style="italic" font-size="13">#{r*per_row+1}</text>}
  end
  row.each_with_index do |bar,bi|
   cursor=0.0;x0=start+bi*bw;unit=(bw-26)/(id==237 ? 5 : 4)
   bar.each do |token|
    tokens=token.is_a?(Array) ? token : [token];beam=[]
    tokens.each do |t|
     x=x0+10+cursor*unit;d=duration(t)
     if t.is_a?(String)
      code={4=>'E4E3',2=>'E4E4',1=>'E4E5',0.5=>'E4E6'}.fetch(d==0.5 ? d : d.to_i);parts<<shape(code,x,y)
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
   endx=x0+bw;last=(r*per_row+bi==bars.length-1)
   parts<<%Q{<path d="M#{last ? endx-6 : endx} #{y-19}v38" stroke="black" stroke-width="1.5"/>}
   parts<<%Q{<path d="M#{endx} #{y-19}v38" stroke="black" stroke-width="4"/>} if last
  end
 end
 parts<<'</svg>';File.write(File.join(out,"noten-#{id}.svg"),parts.join)
end
# Individual rest symbols, with reference lines for whole and half rests.
{4=>'E4E3',2=>'E4E4',1=>'E4E5',0.5=>'E4E6'}.each do |value,code|
 line=value>=2 ? '<path d="M5 38H41" stroke="black" stroke-width="1.5"/>' : ''
 File.write(File.join(out,"pause-#{value}.svg"),%Q{<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 70"><title>Pause: #{value} Schläge</title>#{line}#{shape(code,15,38,0.65)}</svg>})
end
File.write(File.join(out,'score-data.json'),JSON.pretty_generate(scores))
puts "Built #{scores.length} scores. Error-finding task 3.1 retains its intentional five-beat mistake."

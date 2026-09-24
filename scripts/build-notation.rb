# encoding: UTF-8
# Run: ruby -E UTF-8 scripts/build-notation.rb (from Design).
require 'json'
require 'cgi'
BASE = File.expand_path('..', __dir__)
OUT = File.join(BASE, 'assets/grundlagen')
GLYPHS = JSON.parse(File.read(File.join(__dir__, 'bravura-glyphs.json'))).transform_values do |description|
  commands = description.lines.map do |line|
    m = line.strip.match(/^(.*?)\s*(moveto|lineto|curveto|closepath)$/)
    next unless m
    [{'moveto'=>'M','lineto'=>'L','curveto'=>'C','closepath'=>'Z'}[m[2]], m[1].split.map(&:to_f)]
  end
  commands.compact!
  commands.pop while commands.last && commands.last[0] == 'M'
  points = commands.flat_map{|_,v| v.each_slice(2).to_a}
  {path: commands.map{|c,v| c + v.map{|x| x.round(4)}.join(' ')}.join(' '), bounds: [points.map(&:first).min,points.map(&:last).min,points.map(&:first).max,points.map(&:last).max]}
end
# Paths are complete SMuFL glyphs, including noteheads, stems and flags.
def glyph(code,x,y,height)
  g=GLYPHS.fetch(code); left,bottom,right,top=g[:bounds]; scale=height/(top-bottom)
  %Q{<path data-smufl="#{code}" fill="#000" transform="translate(#{x-left*scale} #{y+top*scale}) scale(#{scale} #{-scale})" d="#{g[:path]}"/>}
end
def save(name,w,h,title,content)
  File.write(File.join(OUT,"#{name}.svg"), %Q{<svg xmlns="http://www.w3.org/2000/svg" width="#{w}" height="#{h}" viewBox="0 0 #{w} #{h}" role="img" aria-labelledby="title"><title id="title">#{CGI.escapeHTML(title)}</title>#{content}</svg>\n})
end
YELLOW='#fff34f'; BLUE='#00a8ef'
save('takt',660,144,'Ein vollständiger Takt',%Q{<path fill="#{YELLOW}" d="M0 0H660V144H0Z"/>})

def diagram(name,w,h,title,code:nil,count:0,rest:false,numbers:true,eighth:false)
  parts=[]
  parts << %Q{<rect x="0" y="0" width="#{w}" height="#{h}" fill="#{YELLOW}"/>}
  parts << %Q{<rect x="5" y="5" width="#{w-10}" height="#{h-10}" rx="8" fill="none" stroke="black" stroke-width="8"/>} if code
  margin=w*0.024
  gap=w*0.023; block=(w-2*margin-3*gap)/4.0
  by=h*0.097; bh=h*0.25
  font=h*0.17
  4.times do |i|
    x=margin+i*(block+gap)
    parts << %Q{<rect x="#{x}" y="#{by}" width="#{block}" height="#{bh}" fill="#{BLUE}"/>}
    if numbers
      parts << %Q{<text x="#{x+block*0.1}" y="#{by+bh*0.74}" fill="black" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="#{font}">#{i+1}</text>}
      parts << %Q{<text x="#{x+block*0.53}" y="#{by+bh*0.74}" fill="black" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="#{font}">&amp;</text>} if eighth
    end
  end
  line=h*0.695
  parts << %Q{<path d="M#{margin} #{line}H#{w-margin}" fill="none" stroke="black" stroke-width="#{h*0.021}"/>} if rest
  if code
    count.times do |i|
      beat=4.0*i/count
      x=margin+beat.floor*(block+gap)+block*(0.10+(beat%1)*0.90)
      # Shift eighth-note heads left toward their corresponding count labels.
      x -= w * 0.012 if code == 'E1D7'
      if rest
        gh= case code;when 'E4E3','E4E4' then h*0.07; when 'E4E5' then h*0.30;else h*0.17;end
        y=case code;when 'E4E3' then line;when 'E4E4' then line-gh;when 'E4E5' then line-gh*0.58;else line-gh*0.45;end
      else
        gh=code=='E1D2' ? h*0.085 : h*0.39
        y=h*0.82-gh
      end
      parts << glyph(code,x,y,gh)
    end
  end
  save(name,w,h,title,parts.join)
end

diagram('vier-schlaege',904,182,'Vier gleichmäßige Schläge in einem Takt',numbers:false)
[
 ['ganze-note',664,206,'Ganze Note: vier Schläge','E1D2',1],
 ['halbe-noten',664,206,'Zwei halbe Noten: je zwei Schläge','E1D3',2],
 ['viertelnoten',664,206,'Vier Viertelnoten: je ein Schlag','E1D5',4],
 ['achtelnoten',664,206,'Acht Achtelnoten: je ein halber Schlag','E1D7',8],
 ['ganze-pause',664,206,'Ganze Pause unter der Linie: vier Schläge','E4E3',1],
 ['halbe-pausen',664,206,'Zwei halbe Pausen auf der Linie: je zwei Schläge','E4E4',2],
 ['viertelpausen',664,206,'Vier Viertelpausen: je ein Schlag','E4E5',4],
 ['achtelpausen',664,206,'Acht Achtelpausen: je ein halber Schlag','E4E6',8]
].each{|name,w,h,title,code,count|diagram(name,w,h,title,code:code,count:count,rest:code.start_with?('E4'),eighth:count==8)}
# Speaker, notation sheet, and arrow, following the source illustration.
parts=['<path fill="white" d="M0 0H588V224H0Z"/>','<path d="M44 75H64L107 36V188L64 149H44Z" fill="black"/>','<g fill="none" stroke="black" stroke-width="9"><path d="M31 69Q0 112 31 155"/><path d="M18 48Q-26 112 18 176"/></g>','<path d="M460 34L583 112L460 190Z" fill="black"/>','<path d="M108 23H457V201H108Z" fill="white" stroke="black" stroke-width="5"/>']
[['E1D2',133,94,24],['E1D3',218,56,93],['E1D5',293,56,93],['E1D7',363,56,93]].each{|a|parts << glyph(*a)}
save('klang-und-zeit',588,224,'Ein Lautsprecher, echte Notenzeichen und ein Pfeil: Klänge entfalten sich in der Zeit',parts.join)
puts 'Built 11 SVG diagrams using complete Bravura music glyph outlines.'

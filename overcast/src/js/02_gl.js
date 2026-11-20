/* =====================================================================
   RENDERER — custom WebGL2 engine: procedural PBR-ish materials, shadow
   mapping, spot/point lights, fog, sky, water, particles, skinning.
   ===================================================================== */
const MAT = { PAINT: 0, WOOD: 1, CONC: 2, CORR: 3, MUD: 4, GRASS: 5, CLOTH: 6, SKIN: 7, BARK: 8, LEAF: 9, EMIT: 10, GLASS: 11, METAL: 12, RUST: 13, BRICK: 14, SNOW: 15, ASPH: 16, CAMO: 17, ROCK: 18, HAIR: 19, LEATHER: 20, RUBBER: 21, PLASTIC: 22, TILE: 23, CANVAS: 24, CHAIN: 25, MIRROR: 26, BLOOD: 27, CLOUD: 29, WETSKIN: 30 };
const STRIDE = 11;
function lin(h) { const c = hexCol(h); return [Math.pow(c[0], 2.2), Math.pow(c[1], 2.2), Math.pow(c[2], 2.2)]; }
function linA(a) { return [Math.pow(a[0], 2.2), Math.pow(a[1], 2.2), Math.pow(a[2], 2.2)]; }

const GLSL_NOISE = `
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
vec3 tonemap(vec3 c){c=(c*(2.51*c+.03))/(c*(2.43*c+.59)+.14);return pow(clamp(c,0.,1.),vec3(1./2.2));}
`;
const VS_MAIN = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor; layout(location=2) in vec3 aCol; layout(location=3) in float aMat; layout(location=4) in float aBone;
uniform mat4 uVP; uniform mat4 uModel; uniform mat4 uBones[24]; uniform int uSkin; uniform float uTime; uniform float uWind;
out vec3 vPos; out vec3 vNor; out vec3 vCol; out vec3 vLoc; flat out int vMat;
void main(){
  mat4 M = uSkin==1 ? uBones[int(aBone+.5)] : uModel;
  vec4 wp = M*vec4(aPos,1.);
  int m=int(aMat+.5);
  if(m==9 && uSkin==0){ float h=max(aPos.y,0.); wp.x+=sin(uTime*1.3+wp.x*.21+wp.z*.17)*.025*uWind*min(h,6.)*.3; wp.z+=cos(uTime*1.1+wp.x*.13)*.02*uWind*min(h,6.)*.3; }
  vPos=wp.xyz; vNor=mat3(M)*aNor; vCol=aCol; vLoc=aPos; vMat=m;
  gl_Position=uVP*wp;
}`;
const FS_MAIN = `#version 300 es
precision highp float; precision highp int; precision highp sampler2DShadow;
in vec3 vPos; in vec3 vNor; in vec3 vCol; in vec3 vLoc; flat in int vMat;
uniform vec3 uSunDir,uSunCol,uSky,uGnd,uFog,uCam; uniform float uFogD,uFogH,uExpo,uTime,uWet,uSnow;
uniform int uSkin; uniform vec4 uTint; uniform vec4 uClip; uniform sampler2D uMirror; uniform vec2 uRes; uniform float uAlpha;
uniform sampler2DShadow uShadow; uniform mat4 uSVP; uniform int uShadowOn; uniform float uSRes;
uniform vec4 uLP[12]; uniform vec4 uLC[12]; uniform vec4 uLD[12]; uniform int uNL;
out vec4 frag;
${GLSL_NOISE}
float shadowAt(vec3 p,vec3 n){
  if(uShadowOn==0) return 1.;
  vec4 s=uSVP*vec4(p+n*.05,1.); vec3 c=s.xyz/s.w*.5+.5;
  if(c.x<.01||c.x>.99||c.y<.01||c.y>.99||c.z>1.) return 1.;
  float b=.0009; vec2 t=vec2(1./uSRes); float sum=0.;
  sum+=texture(uShadow,vec3(c.xy+vec2(-.7,-.7)*t,c.z-b));
  sum+=texture(uShadow,vec3(c.xy+vec2(.7,-.7)*t,c.z-b));
  sum+=texture(uShadow,vec3(c.xy+vec2(-.7,.7)*t,c.z-b));
  sum+=texture(uShadow,vec3(c.xy+vec2(.7,.7)*t,c.z-b));
  float edge=smoothstep(.0,.08,min(min(c.x,1.-c.x),min(c.y,1.-c.y)));
  return mix(1.,sum*.25,edge);
}
void main(){
  if(uClip.w!=0. && dot(vPos,uClip.xyz)<uClip.w) discard;
  if(vMat==26){ vec2 suv=gl_FragCoord.xy/uRes; vec3 m=texture(uMirror,vec2(suv.x,suv.y)).rgb; float sm=fbm(vPos.xy*9.+vPos.zy*7.); m=m*.93+vec3(.02)*smoothstep(.55,.8,sm); float ed=fbm(vPos.xy*30.); m*=.97+.03*ed; frag=vec4(m*uTint.rgb,1.); return; }
  vec3 N=normalize(vNor); vec3 Vd=uCam-vPos; float dist=length(Vd); vec3 V=Vd/dist;
  if(dot(N,V)<0.) N=-N;
  if(vMat==29){ // layered cloud sheet: procedural density, lit from above, blended
    vec2 q=vPos.xz*.0032+vec2(uTime*.002,uTime*.0007)+vLoc.y*.37; float dd=fbm(q)*.65+fbm(q*3.1+5.)*.35; float th=vCol.r;
    float a=smoothstep(th,th+.22,dd); if(a<.01) discard;
    vec3 cc=mix(uFog*.82,vec3(1.),vCol.g)*(.82+.25*smoothstep(.4,.9,dd));
    cc+=uSunCol*.28*pow(max(dot(V,-uSunDir),0.),6.)*(1.-a);
    float f=1.-exp(-dist*uFogD*.35); cc=mix(cc,uFog,clamp(f,0.,1.)*.6);
    frag=vec4(tonemap(cc*uExpo),a*vCol.b*uAlpha*smoothstep(4.,40.,dist)); return; }
  vec3 c=vCol; float spec=.04, shin=12., refl=0.; bool emit=false;
  vec3 tp = uSkin==1 ? vLoc*1.0 : vPos;
  vec3 an=abs(N);
  vec2 uv = an.y>.6 ? tp.xz : (an.x>an.z ? tp.zy : tp.xy);
  if(vMat==0){ c*=.92+.12*vn(uv*7.); }
  else if(vMat==1){ float pk=floor(uv.y*5.); float g=vn(vec2(uv.x*1.3+pk*3.7,uv.y*60.))*.6+vn(vec2(uv.x*14.,pk))*.4; float sm=fract(uv.y*5.); float seam=smoothstep(0.,.06,sm)*smoothstep(1.,.94,sm); c*=(.7+.4*g)*(.62+.38*seam)*(.85+.3*h21(vec2(pk,3.))); }
  else if(vMat==2){ float n=fbm(uv*2.3); c*=.78+.3*n; c*=1.-.25*smoothstep(.55,.8,fbm(uv*.4+7.)); c*=1.-.15*smoothstep(.4,.0,abs(fract(uv.y*.5)-.5))*0.; spec=.06; }
  else if(vMat==3){ float r=sin((an.y>.6?uv.x:uv.x)*6.2831*7.); N=normalize(N+(an.y>.6?vec3(r*.18,0,0):vec3(0)) ); c*=.82+.12*r+.1*vn(uv*3.); c=mix(c,c*vec3(.7,.5,.35),.35*smoothstep(.55,.85,fbm(uv*.8))); spec=.35; shin=40.; refl=.12; }
  else if(vMat==4){ float n=fbm(uv*.35); float w=smoothstep(.42,.62,n); c=mix(c,c*vec3(.55,.5,.45),w); c*=.82+.3*vn(uv*6.); spec=.05+w*.35; shin=30.; refl=w*.1; }
  else if(vMat==5){ float n=fbm(uv*.25); c=mix(c,c*vec3(1.35,1.15,.6),smoothstep(.4,.75,n)); c*=.75+.4*vn(uv*3.)+.15*vn(uv*25.); }
  else if(vMat==6){ c*=.9+.12*vn(uv*40.)+.05*sin(uv.x*400.)*sin(uv.y*400.); }
  else if(vMat==7){ c*=.96+.06*vn(uv*30.); spec=.12; shin=14.; }
  else if(vMat==8){ c*=.62+.45*vn(vec2(uv.x*22.,uv.y*2.5))+.1*vn(uv*9.); }
  else if(vMat==9){ c*=.62+.55*vn(uv*5.)+.2*vn(uv*17.); spec=.1; shin=10.; }
  else if(vMat==10){ emit=true; }
  else if(vMat==11){ spec=1.4; shin=140.; refl=.65; c*=.6; }
  else if(vMat==12){ c*=.9+.15*vn(uv*12.); spec=.65; shin=55.; refl=.18; }
  else if(vMat==13){ float r=fbm(uv*1.6); c=mix(c,vec3(.32,.11,.03),smoothstep(.4,.7,r)); c*=.8+.25*vn(uv*14.); spec=.2; shin=20.; }
  else if(vMat==14){ vec2 b=uv*vec2(4.,8.); b.x+=floor(b.y)*.5; vec2 f=fract(b); float m=step(.06,f.x)*step(.1,f.y); c*=mix(.55,1.,m)*(.82+.3*h21(floor(b))); }
  else if(vMat==15){ c*=.92+.1*vn(uv*4.); spec=.35; shin=30.; if(h21(floor(uv*80.))>.995) c+=.6; }
  else if(vMat==16){ c*=.75+.35*vn(uv*40.)+.15*fbm(uv*.8); spec=.15; shin=20.; }
  else if(vMat==17){ float a=vn(uv*3.3+vLoc.xz*2.); float b=vn(uv*5.1+17.); c= a>.55 ? c*.55 : (b>.6? c*vec3(1.2,1.15,.85) : c); c*=.92+.1*vn(uv*50.); }
  else if(vMat==18){ float n=fbm(uv*1.1); c*=.6+.55*n; c*=.9+.15*vn(uv*12.); spec=.08; }
  else if(vMat==19){ c*=.8+.3*vn(vec2(uv.x*80.,uv.y*6.)); spec=.2; shin=25.; }
  else if(vMat==20){ c*=.88+.15*vn(uv*25.); spec=.25; shin=22.; }
  else if(vMat==21){ c*=.95+.05*vn(uv*20.); spec=.08; }
  else if(vMat==22){ spec=.35; shin=45.; }
  else if(vMat==23){ vec2 f=fract(uv*2.5); float g=step(.04,f.x)*step(.04,f.y); c*=mix(.6,1.,g)*(.92+.1*h21(floor(uv*2.5))); spec=.4; shin=50.; refl=.08; }
  else if(vMat==25){ vec2 q=vec2(uv.x+uv.y,uv.x-uv.y)*9.; vec2 f=abs(fract(q)-.5); if(min(f.x,f.y)>.075) discard; spec=.5; shin=40.; }
  else if(vMat==24){ c*=.85+.2*vn(uv*18.)+.1*fbm(uv*1.5); }
  else if(vMat==27){ float n=fbm(uv*9.); c*=.55+.6*n; spec=1.1; shin=90.; refl=.25; }
  else if(vMat==30){ c*=.96+.06*vn(uv*30.); spec=.6; shin=50.; refl=.05; }
  // weather: wetness and snow accumulation on static geometry
  if(uSkin==0){
    if(uSnow>0. && N.y>.55 && vMat!=10 && vMat!=11){ float s=smoothstep(.55,.85,N.y)*uSnow*(.75+.25*vn(vPos.xz*.7)); c=mix(c,vec3(.82,.86,.92),s); spec=mix(spec,.3,s); }
    if(uWet>0. && vMat!=10){ float w=uWet*(.4+.6*smoothstep(.3,.9,N.y)); c*=1.-w*.35; spec+=w*.6; shin=mix(shin,80.,w); refl+=w*(.05+.1*smoothstep(.55,.85,vn(vPos.xz*.6))); }
  }
  c*=uTint.rgb;
  vec3 col;
  if(emit){ col=c*2.2; }
  else{
    float sh=shadowAt(vPos,N);
    float ndl=max(dot(N,uSunDir),0.);
    vec3 amb=mix(uGnd,uSky,N.y*.5+.5);
    vec3 H=normalize(uSunDir+V);
    col=c*(amb+uSunCol*ndl*sh)+uSunCol*sh*spec*pow(max(dot(N,H),0.),shin)*ndl;
    for(int i=0;i<12;i++){ if(i>=uNL) break;
      vec3 L=uLP[i].xyz-vPos; float d=length(L); if(d>uLP[i].w) continue; L/=d;
      float at=1.-d/uLP[i].w; at*=at;
      if(uLD[i].w>-1.5){ float cs=dot(-L,uLD[i].xyz); at*=smoothstep(uLD[i].w,uLD[i].w+.12,cs); }
      float nl=max(dot(N,L),0.); vec3 h=normalize(L+V);
      col+=uLC[i].rgb*at*(c*nl+spec*pow(max(dot(N,h),0.),shin)*nl);
    }
    if(refl>0.){ vec3 R=reflect(-V,N); float fr=pow(1.-max(dot(N,V),0.),3.); col+=mix(uGnd,uSky*1.3,clamp(R.y*.5+.5,0.,1.))*refl*(.25+fr); }
  }
  col+=uTint.a*vec3(1.,.25,.2);
  float fh=exp(-max(vPos.y-uFogH,0.)*.06);
  float f=1.-exp(-dist*uFogD*(.55+.45*fh));
  col=mix(col,uFog,clamp(f,0.,1.));
  frag=vec4(tonemap(col*uExpo),(vMat==11||(vMat==10&&uAlpha<.99))?uAlpha:1.);
}`;
const VS_DEPTH = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos; layout(location=4) in float aBone;
uniform mat4 uVP; uniform mat4 uModel; uniform mat4 uBones[24]; uniform int uSkin;
void main(){ mat4 M=uSkin==1?uBones[int(aBone+.5)]:uModel; gl_Position=uVP*M*vec4(aPos,1.); }`;
const FS_DEPTH = `#version 300 es
precision highp float; precision highp int; out vec4 f; void main(){ f=vec4(1); }`;
const VS_SKY = `#version 300 es
precision highp float; layout(location=0) in vec2 aP; out vec2 vP; void main(){ vP=aP; gl_Position=vec4(aP,.99999,1.); }`;
const FS_SKY = `#version 300 es
precision highp float; precision highp int; in vec2 vP; uniform mat4 uInvVP; uniform vec3 uSunDir,uSunCol,uZen,uHor,uFog,uCam; uniform float uTime,uNight,uCloud,uExpo,uFogAmt; out vec4 frag;
${GLSL_NOISE}
void main(){
  vec4 a=uInvVP*vec4(vP,1.,1.); vec3 d=normalize(a.xyz/a.w-uCam);
  float y=d.y;
  vec3 col=mix(uHor,uZen,pow(clamp(y,0.,1.),.55));
  if(y<0.) col=mix(uHor,uFog,clamp(-y*6.,0.,1.));
  float sd=max(dot(d,uSunDir),0.);
  col+=uSunCol*(pow(sd,8.)*.25+pow(sd,64.)*.5+smoothstep(.9994,.9998,sd)*6.)*(1.-uNight*.85);
  if(uNight>0.){ vec2 sp=d.xz/(y+.3)*80.; float st=step(.9975,h21(floor(sp)))*smoothstep(0.,.3,y); col+=vec3(st)*uNight*(.6+.4*sin(uTime*3.+h21(floor(sp))*40.)); }
  if(y>0.){ vec2 cp=d.xz/(y+.12)*1.6+vec2(uTime*.006,uTime*.002); float cl=smoothstep(.45,.85,fbm(cp))*uCloud; vec3 cc=mix(uHor*1.1,uSunCol*.4+uZen*.6,.5)*(1.-uNight*.7); col=mix(col,cc,cl*smoothstep(0.,.25,y)); }
  col=mix(col,uFog,uFogAmt*(1.-smoothstep(0.,.35,y)));
  frag=vec4(tonemap(col*uExpo),1.);
}`;
const VS_WATER = `#version 300 es
precision highp float; layout(location=0) in vec3 aPos; uniform mat4 uVP; uniform float uTime; out vec3 vPos;
void main(){ vec3 p=aPos; p.y+=sin(p.x*.4+uTime*.8)*.025+cos(p.z*.33+uTime*.6)*.025; vPos=p; gl_Position=uVP*vec4(p,1.); }`;
const FS_WATER = `#version 300 es
precision highp float; precision highp int; in vec3 vPos;
uniform vec3 uSunDir,uSunCol,uSky,uGnd,uFog,uCam,uWCol,uWDeep; uniform float uFogD,uExpo,uTime,uRain,uAlpha,uRough;
uniform vec4 uLP[12]; uniform vec4 uLC[12]; uniform vec4 uLD[12]; uniform int uNL;
out vec4 frag;
${GLSL_NOISE}
void main(){
  vec2 p=vPos.xz; float t=uTime;
  float e=.15; float hC=fbm(p*.35+vec2(t*.05,t*.03))+fbm(p*1.3-vec2(t*.09,-t*.07))*.4;
  float hX=fbm((p+vec2(e,0))*.35+vec2(t*.05,t*.03))+fbm((p+vec2(e,0))*1.3-vec2(t*.09,-t*.07))*.4;
  float hZ=fbm((p+vec2(0,e))*.35+vec2(t*.05,t*.03))+fbm((p+vec2(0,e))*1.3-vec2(t*.09,-t*.07))*.4;
  vec3 N=normalize(vec3((hC-hX)*uRough,e,(hC-hZ)*uRough));
  if(uRain>0.){ vec2 g=floor(p*2.); vec2 f=fract(p*2.)-.5; float ph=fract(t*1.3+h21(g)); float r=length(f); float ring=sin((r-ph*.5)*40.)*smoothstep(.5,.0,r)*(1.-ph); N.xz+=f*ring*uRain*.6; N=normalize(N); }
  vec3 Vd=uCam-vPos; float dist=length(Vd); vec3 V=Vd/dist;
  float fr=.03+.97*pow(1.-max(dot(N,V),0.),5.);
  vec3 R=reflect(-V,N);
  vec3 sky=mix(uGnd*.6+uFog*.4,uSky*1.2,clamp(R.y*1.6,0.,1.));
  vec3 base=mix(uWCol,uWDeep,clamp(dist*.004,0.,1.));
  vec3 col=mix(base*(uGnd+uSunCol*.25),sky,fr*.85);
  vec3 H=normalize(uSunDir+V); col+=uSunCol*pow(max(dot(N,H),0.),220.)*2.;
  for(int i=0;i<12;i++){ if(i>=uNL) break; vec3 L=uLP[i].xyz-vPos; float d=length(L); if(d>uLP[i].w*1.6) continue; L/=d; vec3 h=normalize(L+V); float at=1.-d/(uLP[i].w*1.6); col+=uLC[i].rgb*pow(max(dot(N,h),0.),90.)*at*1.5+uLC[i].rgb*at*at*.04; }
  float f=1.-exp(-dist*uFogD); col=mix(col,uFog,clamp(f,0.,1.));
  frag=vec4(tonemap(col*uExpo),clamp(uAlpha+fr*.3,0.,1.));
}`;
const VS_PART = `#version 300 es
precision highp float; layout(location=0) in vec3 aPos; layout(location=1) in vec2 aUV; layout(location=2) in vec4 aCol; layout(location=3) in float aSh;
uniform mat4 uVP; out vec2 vUV; out vec4 vCol; out float vSh; out vec3 vP;
void main(){ vUV=aUV; vCol=aCol; vSh=aSh; vP=aPos; gl_Position=uVP*vec4(aPos,1.); }`;
const FS_PART = `#version 300 es
precision highp float; precision highp int; in vec2 vUV; in vec4 vCol; in float vSh; in vec3 vP; uniform vec3 uCam,uFog; uniform float uFogD; out vec4 frag;
void main(){
  float r=length(vUV); float a;
  if(vSh<.5) a=smoothstep(1.,.15,r);
  else if(vSh<1.5) a=smoothstep(1.,.6,abs(vUV.x))*smoothstep(1.,.2,abs(vUV.y));
  else a=smoothstep(1.,.0,r);
  a*=vCol.a; if(a<.003) discard;
  float f=1.-exp(-length(uCam-vP)*uFogD);
  vec3 c=vCol.rgb;
  if(vSh>1.5) { c=c*(1.-f); frag=vec4(c*a,a); }
  else frag=vec4(mix(c,uFog,clamp(f,0.,1.)*.8),a);
}`;

const VS_POST = `#version 300 es
precision highp float; layout(location=0) in vec2 aP; out vec2 vUV; void main(){ vUV=aP*.5+.5; gl_Position=vec4(aP,0.,1.); }`;
const FS_POST = `#version 300 es
precision highp float; precision highp int; in vec2 vUV; uniform sampler2D uTex; uniform vec2 uRes; uniform float uSlow,uHurt,uTime,uSat,uCon,uVig,uFx,uRays,uBloom,uLens,uFade; uniform vec2 uSun; uniform vec3 uGrade; out vec4 frag;
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  vec2 uv=vUV; vec2 c=uv-.5; float r=length(c);
  // slow-motion lens: radial chromatic aberration + gentle barrel warp
  float ab=(uSlow*.006+uHurt*.003)*uFx; uv+=c*r*r*uSlow*-.06*uFx;
  vec3 col; col.r=texture(uTex,uv+c*ab).r; col.g=texture(uTex,uv).g; col.b=texture(uTex,uv-c*ab).b;
  if(uSlow>0.&&uFx>0.){ vec3 bl=vec3(0.); for(int i=1;i<5;i++){ bl+=texture(uTex,uv-c*float(i)*.006*uSlow).rgb; } col=mix(col,bl*.25,.35*uSlow*smoothstep(.1,.6,r)); }
  if(uLens>0.){ // rain droplets running down the lens / visor
    vec2 g=vec2(uv.x*18.,uv.y*9.+uTime*.0); vec2 id=floor(g); float rn=h(id); vec2 f=fract(g)-.5; float ph=fract(uTime*(.08+rn*.12)+rn*7.);
    vec2 dp=vec2(rn*.6-.3,.4-ph*.9); float dr=length((f-dp)*vec2(1.,1.6)); float drop=smoothstep(.12,.04,dr)*step(.55,rn);
    vec2 off=(f-dp)*drop*.035*uLens; col=mix(col,texture(uTex,uv-off).rgb*1.08,drop*uLens*.85);
  }
  if(uBloom>0.){ vec3 b=vec3(0.); for(int i=0;i<12;i++){ float a=float(i)*.5236; for(int k=1;k<3;k++){ vec2 o=vec2(cos(a),sin(a))*float(k)*7./uRes; vec3 s=texture(uTex,uv+o*(1.+float(k))).rgb; b+=max(s-.72,0.); } } col+=b/24.*uBloom*1.6; }
  if(uRays>0.){ vec2 d=(uSun-uv); vec3 acc=vec3(0.); float w=1.; vec2 p=uv; for(int i=0;i<36;i++){ p+=d*(1./36.)*.94; vec3 s=texture(uTex,clamp(p,0.,1.)).rgb; float lm=dot(s,vec3(.33)); acc+=max(lm-.78,0.)*w*vec3(1.,.93,.8); w*=.955; } float fall=smoothstep(1.3,0.,length(d*vec2(uRes.x/uRes.y,1.))); col+=acc*.11*uRays*fall; }
  float l=dot(col,vec3(.299,.587,.114));
  col=mix(vec3(l),col,uSat-uSlow*.35);
  col*=uGrade;
  col=(col-.5)*uCon+.5;
  col=mix(col,col*vec3(1.25,.55,.5)+vec3(.04,0.,0.),uSlow*.55);
  col*=1.-smoothstep(.45,.95,r)*uVig;
  col=mix(col,col*vec3(.6,.05,.05),smoothstep(.35,.9,r)*(uSlow*.6+uHurt*.7));
  col+=(h(uv*uRes+uTime)-.5)*.022*uFx;
  col*=1.-uFade;
  frag=vec4(clamp(col,0.,1.),1.);
}`;
const R = {
  gl: null, canvas: null, w: 1, h: 1, scale: 1, shadowRes: 2048, shadowsOn: true, drawDist: 380, detailDist: 70,
  stats: { draws: 0, tris: 0 },
  init(canvas) {
    this.canvas = canvas;
    const gl = this.gl = canvas.getContext('webgl2', { antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false });
    if (!gl) throw new Error('WebGL2 is not supported by this browser.');
    this.pMain = this.prog(VS_MAIN, FS_MAIN); this.pDepth = this.prog(VS_DEPTH, FS_DEPTH); this.pSky = this.prog(VS_SKY, FS_SKY);
    this.pWater = this.prog(VS_WATER, FS_WATER); this.pPart = this.prog(VS_PART, FS_PART);
    // sky triangle
    this.skyVao = gl.createVertexArray(); gl.bindVertexArray(this.skyVao);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null);
    // particles buffer
    this.partCap = 6000; this.partData = new Float32Array(this.partCap * 6 * 10);
    this.partVao = gl.createVertexArray(); gl.bindVertexArray(this.partVao);
    this.partBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.partBuf); gl.bufferData(gl.ARRAY_BUFFER, this.partData.byteLength, gl.DYNAMIC_DRAW);
    const S = 40; gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, S, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, S, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, S, 20); gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, S, 36); gl.bindVertexArray(null);
    this.makeShadow(this.shadowRes); this.pPost = this.prog(VS_POST, FS_POST); this.samples = Math.min(this.aa ?? 4, gl.getParameter(gl.MAX_SAMPLES)); this.post = { slow: 0, hurt: 0, sat: 1.05, con: 1.04, vig: .55, fx: 1, rays: 0, bloom: .6, lens: 0, fade: 0, sun: [.5, .5], grade: [1, 1, 1] };
    this.dummy = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.dummy); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    this.vp = M4.create(); this.view = M4.create(); this.proj = M4.create(); this.invVP = M4.create(); this.svp = M4.create();
    this.vmVP = M4.create(); this.vmProj = M4.create(); this.tmp = M4.create();
    this.resize();
  },
  makeShadow(res) {
    const gl = this.gl; this.shadowRes = res;
    if (this.shadowTex) { gl.deleteTexture(this.shadowTex); gl.deleteFramebuffer(this.shadowFbo); }
    this.shadowTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, res, res);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    this.shadowFbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowTex, 0);
    gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  },
  prog(vs, fs) {
    const gl = this.gl;
    const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { const e = gl.getShaderInfoLog(sh); console.error(e, s); throw new Error('Shader: ' + e); } return sh; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Link: ' + gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const inf = gl.getActiveUniform(p, i); const nm = inf.name.replace(/\[0\]$/, ''); u[nm] = gl.getUniformLocation(p, inf.name); }
    return { p, u };
  },
  makeTargets() {
    const gl = this.gl; const w = this.w, h = this.h; const T = this.tg || (this.tg = {});
    if (T.w === w && T.h === h && T.s === this.samples) return; T.w = w; T.h = h; T.s = this.samples;
    for (const k of ['fbo', 'rfbo']) if (T[k]) gl.deleteFramebuffer(T[k]); for (const k of ['crb', 'drb']) if (T[k]) gl.deleteRenderbuffer(T[k]); if (T.tex) gl.deleteTexture(T.tex);
    T.fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, T.fbo);
    T.crb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, T.crb);
    if (this.samples > 0) gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, gl.RGBA8, w, h); else gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, T.crb);
    T.drb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, T.drb);
    if (this.samples > 0) gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, gl.DEPTH_COMPONENT24, w, h); else gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, T.drb);
    T.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, T.tex); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    T.rfbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, T.rfbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, T.tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  },
  finish() { // resolve MSAA scene and run the post-process grade to the screen
    const gl = this.gl, T = this.tg, w = this.w, h = this.h;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, T.fbo); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, T.rfbo); gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, w, h); gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    const P = this.pPost, q = this.post; gl.useProgram(P.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, T.tex); gl.uniform1i(P.u.uTex, 0);
    gl.uniform2f(P.u.uRes, w, h); gl.uniform1f(P.u.uSlow, q.slow); gl.uniform1f(P.u.uHurt, q.hurt); gl.uniform1f(P.u.uTime, (performance.now() / 1000) % 100); gl.uniform1f(P.u.uSat, q.sat); gl.uniform1f(P.u.uCon, q.con); gl.uniform1f(P.u.uVig, q.vig); gl.uniform1f(P.u.uFx, q.fx); gl.uniform1f(P.u.uRays, q.rays); gl.uniform1f(P.u.uBloom, q.bloom); gl.uniform1f(P.u.uLens, q.lens); gl.uniform1f(P.u.uFade, q.fade); gl.uniform2fv(P.u.uSun, q.sun); gl.uniform3fv(P.u.uGrade, q.grade);
    gl.bindVertexArray(this.skyVao); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.enable(gl.DEPTH_TEST);
  },
  resize() {
    const c = this.canvas; const w = Math.max(1, (c.clientWidth * this.scale * Math.min(devicePixelRatio, 2)) | 0), h = Math.max(1, (c.clientHeight * this.scale * Math.min(devicePixelRatio, 2)) | 0);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    this.w = w; this.h = h;
  },
  /* ------------- frame rendering ------------- */
  render(S, cam) {
    const gl = this.gl; this.resize(); const st = this.stats; st.draws = 0; st.tris = 0;
    const env = S.env;
    M4.persp(this.proj, cam.fov, this.w / this.h, cam.near || .05, cam.far || 900);
    M4.mul(this.vp, this.proj, cam.view); M4.invert(this.invVP, this.vp);
    const cp = cam.pos;
    // ---------------- shadow pass ----------------
    const shadowOn = this.shadowsOn && !S.noShadow && env.sunCol[0] + env.sunCol[1] + env.sunCol[2] > .05;
    if (shadowOn) {
      const ext = S.shadowExt || 70; const sd = env.sunDir;
      const tx = ext * 2 / this.shadowRes;
      const cx = Math.round((cp[0] + cam.fwd[0] * ext * .5) / tx) * tx, cz = Math.round((cp[2] + cam.fwd[2] * ext * .5) / tx) * tx, cy = Math.round(cp[1] / tx) * tx;
      const eye = [cx + sd[0] * 200, cy + sd[1] * 200, cz + sd[2] * 200];
      M4.lookAt(this.tmp, eye, [cx, cy, cz], Math.abs(sd[1]) > .99 ? [0, 0, 1] : [0, 1, 0]);
      const pr = M4.ortho(M4.create(), -ext, ext, -ext, ext, 20, 420); M4.mul(this.svp, pr, this.tmp);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo); gl.viewport(0, 0, this.shadowRes, this.shadowRes);
      gl.clear(gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.colorMask(false, false, false, false);
      gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.6, 3); gl.disable(gl.CULL_FACE);
      const P = this.pDepth; gl.useProgram(P.p); gl.uniformMatrix4fv(P.u.uVP, false, this.svp);
      const splanes = frustumPlanes(this.svp);
      gl.uniform1i(P.u.uSkin, 0); gl.uniformMatrix4fv(P.u.uModel, false, M4.create());
      for (const ch of S.chunks) {
        if (!aabbInFrustum(splanes, ch.mn, ch.mx)) continue;
        if (ch.mesh) this.drawMesh(ch.mesh);
        if (ch.detail && Math.hypot(ch.cx - cp[0], ch.cz - cp[2]) < this.detailDist * .8) this.drawMesh(ch.detail);
      }
      for (const d of S.dyn) {
        if (d.hidden || d.noShadow || d.mirrorSurf) continue;
        if (d.pos && !sphereInFrustum(splanes, d.pos, d.r || 3)) continue;
        this.setObj(P, d, true); this.drawMesh(d.mesh);
      }
      gl.disable(gl.POLYGON_OFFSET_FILL); gl.colorMask(true, true, true, true);
    }
    // ---------------- planar mirror (reflected camera into its own target) ----------------
    const Mi = S.mirror; let mirrorOn = false;
    if (Mi && Mi.on) {
      const n = Mi.n, d0 = V.dot(n, Mi.p); const side = V.dot(n, cp) - d0;
      if (side > 0 && side < (Mi.range || 12)) {
        mirrorOn = true; this.makeMirrorTarget();
        const Rm = M4.create(); // reflection about plane n.x = d0
        Rm[0] = 1 - 2 * n[0] * n[0]; Rm[1] = -2 * n[1] * n[0]; Rm[2] = -2 * n[2] * n[0];
        Rm[4] = -2 * n[0] * n[1]; Rm[5] = 1 - 2 * n[1] * n[1]; Rm[6] = -2 * n[2] * n[1];
        Rm[8] = -2 * n[0] * n[2]; Rm[9] = -2 * n[1] * n[2]; Rm[10] = 1 - 2 * n[2] * n[2];
        Rm[12] = 2 * d0 * n[0]; Rm[13] = 2 * d0 * n[1]; Rm[14] = 2 * d0 * n[2];
        const mv = M4.mul(M4.create(), cam.view, Rm); const mvp = M4.mul(M4.create(), this.proj, mv);
        const rcp = V.sub(cp, V.sc(n, 2 * side));
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.mt.fbo); gl.viewport(0, 0, this.w, this.h); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        this.drawScene(S, { pos: rcp, fwd: cam.fwd, right: cam.right, up: cam.up }, mvp, shadowOn, { mirror: true, clip: [n[0], n[1], n[2], d0 + .002] });
      }
    }
    this.makeTargets(); gl.bindFramebuffer(gl.FRAMEBUFFER, this.tg.fbo);
    gl.viewport(0, 0, this.w, this.h);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.drawScene(S, cam, this.vp, shadowOn, { mirrorOn });
    // ---------------- viewmodel (first-person close objects) ----------------
    if (S.vm && S.vm.length) {
      gl.clear(gl.DEPTH_BUFFER_BIT); const P = this.pMain;
      M4.persp(this.vmProj, (cam.vmFov || 54) * DEG, this.w / this.h, .01, 50); M4.mul(this.vmVP, this.vmProj, cam.view);
      gl.useProgram(P.p); gl.uniformMatrix4fv(P.u.uVP, false, this.vmVP);
      for (const d of S.vm) { if (d.hidden) continue; this.setObj(P, d); gl.uniform4fv(P.u.uTint, d.tint || [1, 1, 1, 0]); this.drawMesh(d.mesh); }
    }
    this.finish(); gl.bindVertexArray(null);
  },
  makeMirrorTarget() {
    const gl = this.gl, w = this.w, h = this.h; const T = this.mt || (this.mt = {});
    if (T.w === w && T.h === h) return; T.w = w; T.h = h;
    if (T.fbo) { gl.deleteFramebuffer(T.fbo); gl.deleteTexture(T.tex); gl.deleteRenderbuffer(T.drb); }
    T.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, T.tex); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    T.drb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, T.drb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    T.fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, T.fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, T.tex, 0); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, T.drb);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  },
  drawScene(S, cam, vp, shadowOn, o) {
    const gl = this.gl, env = S.env, time = S.time, cp = cam.pos; const mir = !!o.mirror;
    const planes = frustumPlanes(vp); const inv = M4.invert(M4.create(), vp);
    // sky
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
    let P = this.pSky; gl.useProgram(P.p);
    gl.uniformMatrix4fv(P.u.uInvVP, false, inv); gl.uniform3fv(P.u.uSunDir, env.sunDir); gl.uniform3fv(P.u.uSunCol, env.sunCol);
    gl.uniform3fv(P.u.uZen, env.zen); gl.uniform3fv(P.u.uHor, env.hor); gl.uniform3fv(P.u.uFog, env.fog); gl.uniform3fv(P.u.uCam, cp);
    gl.uniform1f(P.u.uTime, time); gl.uniform1f(P.u.uNight, env.night || 0); gl.uniform1f(P.u.uCloud, env.cloud ?? .5); gl.uniform1f(P.u.uExpo, env.expo); gl.uniform1f(P.u.uFogAmt, env.skyFog ?? .5);
    gl.bindVertexArray(this.skyVao); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.depthFunc(gl.LEQUAL);
    // opaque
    P = this.pMain; gl.useProgram(P.p); this.setMainUniforms(P, S, cp, shadowOn, vp);
    gl.uniform4fv(P.u.uClip, o.clip || [0, 0, 0, 0]); gl.uniform2f(P.u.uRes, this.w, this.h); gl.uniform1f(P.u.uAlpha, 1);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, o.mirrorOn ? this.mt.tex : this.dummy); gl.uniform1i(P.u.uMirror, 1); gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(P.u.uSkin, 0); gl.uniformMatrix4fv(P.u.uModel, false, M4.create()); gl.uniform4f(P.u.uTint, 1, 1, 1, 0);
    gl.disable(gl.CULL_FACE);
    const dd = Math.min(this.drawDist, S.maxDraw || 9999);
    for (const ch of S.chunks) {
      const dx = Math.max(0, Math.abs(ch.cx - cp[0]) - ch.hw), dz = Math.max(0, Math.abs(ch.cz - cp[2]) - ch.hw);
      const dist = Math.hypot(dx, dz); if (dist > dd) continue;
      if (!aabbInFrustum(planes, ch.mn, ch.mx)) continue;
      if (ch.mesh) this.drawMesh(ch.mesh);
      if (ch.detail && dist < this.detailDist) { gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(0, -6); this.drawMesh(ch.detail); gl.disable(gl.POLYGON_OFFSET_FILL); }
    }
    for (const d of S.dyn) {
      if (d.hidden) continue; if (mir && (d.mirrorSurf || d.noMirror)) continue; if (!mir && d.mirrorOnly) continue; if (d.mirrorSurf && !o.mirrorOn) continue;
      if (d.pos) { const dist = V.dist(d.pos, cp); if (dist > dd + (d.r || 3)) continue; if (!sphereInFrustum(planes, d.pos, d.r || 3)) continue; if (d.lod && dist > d.lod) continue; }
      this.setObj(P, d, false, mir); gl.uniform4fv(P.u.uTint, d.tint || [1, 1, 1, 0]); this.drawMesh(d.mesh);
    }
    gl.uniform4f(P.u.uTint, 1, 1, 1, 0);
    // water
    if (S.water) {
      const W = S.water; const Pw = this.pWater; gl.useProgram(Pw.p);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
      gl.uniformMatrix4fv(Pw.u.uVP, false, vp); gl.uniform1f(Pw.u.uTime, time);
      gl.uniform3fv(Pw.u.uSunDir, env.sunDir); gl.uniform3fv(Pw.u.uSunCol, env.sunCol); gl.uniform3fv(Pw.u.uSky, env.sky); gl.uniform3fv(Pw.u.uGnd, env.gnd);
      gl.uniform3fv(Pw.u.uFog, env.fog); gl.uniform3fv(Pw.u.uCam, cp); gl.uniform3fv(Pw.u.uWCol, W.col); gl.uniform3fv(Pw.u.uWDeep, W.deep);
      gl.uniform1f(Pw.u.uFogD, env.fogD); gl.uniform1f(Pw.u.uExpo, env.expo); gl.uniform1f(Pw.u.uRain, env.rain || 0); gl.uniform1f(Pw.u.uAlpha, W.alpha); gl.uniform1f(Pw.u.uRough, W.rough || 1);
      this.setLights(Pw, S.lights);
      this.drawMesh(W.mesh, true);
      gl.depthMask(true); gl.disable(gl.BLEND);
    }
    // transparent: glass panes and layered cloud sheets (sorted far to near)
    if (S.glass && S.glass.length) {
      P = this.pMain; gl.useProgram(P.p); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
      const list = S.glass.filter(d => !d.hidden).sort((a, b) => V.dist(b.pos || cp, cp) - V.dist(a.pos || cp, cp));
      for (const d of list) { if (d.pos && d.r && !sphereInFrustum(planes, d.pos, d.r)) continue; this.setObj(P, d, false, mir); gl.uniform1f(P.u.uAlpha, d.alpha ?? .22); gl.uniform4fv(P.u.uTint, d.tint || [1, 1, 1, 0]); this.drawMesh(d.mesh); }
      gl.uniform1f(P.u.uAlpha, 1); gl.depthMask(true); gl.disable(gl.BLEND);
    }
    if (S.particles) this.drawParticles(S, cam, vp);
  },
  setMainUniforms(P, S, cp, shadowOn, vp) {
    const gl = this.gl, env = S.env;
    gl.uniformMatrix4fv(P.u.uVP, false, vp); gl.uniform1f(P.u.uTime, S.time); gl.uniform1f(P.u.uWind, env.wind || 1);
    gl.uniform3fv(P.u.uSunDir, env.sunDir); gl.uniform3fv(P.u.uSunCol, env.sunCol); gl.uniform3fv(P.u.uSky, env.sky); gl.uniform3fv(P.u.uGnd, env.gnd);
    gl.uniform3fv(P.u.uFog, env.fog); gl.uniform3fv(P.u.uCam, cp); gl.uniform1f(P.u.uFogD, env.fogD); gl.uniform1f(P.u.uFogH, env.fogH || 0);
    gl.uniform1f(P.u.uExpo, env.expo); gl.uniform1f(P.u.uWet, env.wet || 0); gl.uniform1f(P.u.uSnow, env.snow || 0);
    gl.uniform1i(P.u.uShadowOn, shadowOn ? 1 : 0); gl.uniform1f(P.u.uSRes, this.shadowRes);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.shadowTex); gl.uniform1i(P.u.uShadow, 0);
    gl.uniformMatrix4fv(P.u.uSVP, false, this.svp);
    this.setLights(P, S.lights);
  },
  setLights(P, lights) {
    const gl = this.gl; const n = Math.min(12, lights.length);
    if (!this._lp) { this._lp = new Float32Array(48); this._lc = new Float32Array(48); this._ld = new Float32Array(48); }
    const lp = this._lp, lc = this._lc, ld = this._ld;
    for (let i = 0; i < n; i++) {
      const L = lights[i]; lp.set([L.pos[0], L.pos[1], L.pos[2], L.range], i * 4); lc.set([L.col[0] * L.i, L.col[1] * L.i, L.col[2] * L.i, 0], i * 4);
      if (L.dir) ld.set([L.dir[0], L.dir[1], L.dir[2], L.cone], i * 4); else ld.set([0, -1, 0, -2], i * 4);
    }
    gl.uniform4fv(P.u.uLP, lp); gl.uniform4fv(P.u.uLC, lc); gl.uniform4fv(P.u.uLD, ld); gl.uniform1i(P.u.uNL, n);
  },
  setObj(P, d, shadow, mir) {
    const gl = this.gl;
    if (d.bones) { gl.uniform1i(P.u.uSkin, 1); gl.uniformMatrix4fv(P.u.uBones, false, (mir || shadow) && d.fullBones ? d.fullBones : d.bones); }
    else { gl.uniform1i(P.u.uSkin, 0); gl.uniformMatrix4fv(P.u.uModel, false, d.m); }
  },
  drawMesh(m, water) {
    if (!m || !m.count) return; const gl = this.gl;
    gl.bindVertexArray(m.vao); gl.drawArrays(gl.TRIANGLES, 0, m.count); this.stats.draws++; this.stats.tris += m.count / 3;
  },
  drawParticles(S, cam, vp) {
    const gl = this.gl; const parts = S.particles; if (!parts.length) return;
    const D = this.partData; let n = 0; const right = cam.right, up = cam.up; const cap = this.partCap;
    const sortAdd = [], sortAlpha = [];
    for (const p of parts) { if (p.add) sortAdd.push(p); else sortAlpha.push(p); }
    const cp = cam.pos;
    sortAlpha.sort((a, b) => V.dist(b.p, cp) - V.dist(a.p, cp));
    const emit = (p) => {
      if (n >= cap) return; let rx, ry, rz, ux, uy, uz; const s = p.s;
      if (p.streak) { // velocity-aligned streak (rain, tracers, sparks)
        const v = p.dir; const dx = cp[0] - p.p[0], dy = cp[1] - p.p[1], dz = cp[2] - p.p[2];
        let sx = v[1] * dz - v[2] * dy, sy = v[2] * dx - v[0] * dz, sz = v[0] * dy - v[1] * dx; const l = Math.hypot(sx, sy, sz) || 1;
        rx = sx / l * p.w; ry = sy / l * p.w; rz = sz / l * p.w; ux = v[0] * s; uy = v[1] * s; uz = v[2] * s;
      } else if (p.flat) { rx = p.flat[0][0] * s; ry = p.flat[0][1] * s; rz = p.flat[0][2] * s; ux = p.flat[1][0] * s; uy = p.flat[1][1] * s; uz = p.flat[1][2] * s; }
      else { const c = Math.cos(p.rot || 0), si = Math.sin(p.rot || 0); rx = (right[0] * c + up[0] * si) * s; ry = (right[1] * c + up[1] * si) * s; rz = (right[2] * c + up[2] * si) * s; ux = (up[0] * c - right[0] * si) * s; uy = (up[1] * c - right[1] * si) * s; uz = (up[2] * c - right[2] * si) * s; }
      const x = p.p[0], y = p.p[1], z = p.p[2], c = p.c, a = p.a, sh = p.streak ? 1 : p.add ? 2 : 0; let o = n * 60;
      const V4 = (cx, cy) => { D[o++] = x + rx * cx + ux * cy; D[o++] = y + ry * cx + uy * cy; D[o++] = z + rz * cx + uz * cy; D[o++] = cx; D[o++] = cy; D[o++] = c[0]; D[o++] = c[1]; D[o++] = c[2]; D[o++] = a; D[o++] = sh; };
      V4(-1, -1); V4(1, -1); V4(1, 1); V4(-1, -1); V4(1, 1); V4(-1, 1); n++;
    };
    const P = this.pPart; gl.useProgram(P.p); gl.uniformMatrix4fv(P.u.uVP, false, vp || this.vp); gl.uniform3fv(P.u.uCam, cp); gl.uniform3fv(P.u.uFog, S.env.fog); gl.uniform1f(P.u.uFogD, S.env.fogD);
    gl.bindVertexArray(this.partVao); gl.bindBuffer(gl.ARRAY_BUFFER, this.partBuf);
    gl.enable(gl.BLEND); gl.depthMask(false);
    for (const p of sortAlpha) emit(p);
    const nA = n; for (const p of sortAdd) emit(p);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, D, 0, n * 60);
    if (nA) { gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.drawArrays(gl.TRIANGLES, 0, nA * 6); }
    if (n > nA) { gl.blendFunc(gl.ONE, gl.ONE); gl.drawArrays(gl.TRIANGLES, nA * 6, (n - nA) * 6); }
    gl.disable(gl.BLEND); gl.depthMask(true);
  },
};

/* ---------------- GPU mesh ---------------- */
class Mesh {
  constructor(data, water = false) {
    const gl = R.gl; this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    this.buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const S = STRIDE * 4;
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, S, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, S, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, S, 24);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, S, 36);
    gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 1, gl.FLOAT, false, S, 40);
    gl.bindVertexArray(null); this.count = data.length / STRIDE;
  }
  dispose() { const gl = R.gl; gl.deleteBuffer(this.buf); gl.deleteVertexArray(this.vao); this.count = 0; }
}

/* ---------------- geometry builder ---------------- */
class MB {
  constructor(cap = 4096) { this.d = new Float32Array(cap * STRIDE); this.n = 0; this.m = M4.create(); this.stack = []; this.c = [1, 1, 1]; this.mat = 0; this.bone = 0; this.jit = 0; this._nm = null; this._cc = this.c; }
  grow(k) { if ((this.n + k) * STRIDE <= this.d.length) return; let cap = this.d.length * 2; while (cap < (this.n + k) * STRIDE) cap *= 2; const nd = new Float32Array(cap); nd.set(this.d.subarray(0, this.n * STRIDE)); this.d = nd; }
  push() { this.stack.push(this.m.slice()); return this; }
  pop() { this.m = this.stack.pop(); this._nm = null; return this; }
  t(x, y, z) { M4.translate(this.m, this.m, x, y, z); return this; }
  rx(a) { M4.rotX(this.m, this.m, a); this._nm = null; return this; }
  ry(a) { M4.rotY(this.m, this.m, a); this._nm = null; return this; }
  rz(a) { M4.rotZ(this.m, this.m, a); this._nm = null; return this; }
  s(x, y, z) { M4.scale(this.m, this.m, x, y ?? x, z ?? x); this._nm = null; return this; }
  col(h, mat) { this.c = typeof h === 'number' ? lin(h) : h; if (mat !== undefined) this.mat = mat; return this; }
  mt(m) { this.mat = m; return this; }
  b(i) { this.bone = i; return this; }
  nmat() {
    if (this._nm) return this._nm; const m = this.m;
    const a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10];
    const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, D = -(b * i - c * h), E = a * i - c * g, F = -(a * h - b * g), G = b * f - c * e, H = -(a * f - c * d), I = a * e - b * d;
    this._nm = [A, B, C, D, E, F, G, H, I]; return this._nm;
  }
  begin() { const j = this.jit; if (j) { const k = 1 + (Math.random() * 2 - 1) * j; this._cc = [this.c[0] * k, this.c[1] * k, this.c[2] * k]; } else this._cc = this.c; }
  vtx(x, y, z, nx, ny, nz) {
    const m = this.m, o = this.n * STRIDE, d = this.d, c = this._cc;
    d[o] = m[0] * x + m[4] * y + m[8] * z + m[12]; d[o + 1] = m[1] * x + m[5] * y + m[9] * z + m[13]; d[o + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
    d[o + 3] = nx; d[o + 4] = ny; d[o + 5] = nz; d[o + 6] = c[0]; d[o + 7] = c[1]; d[o + 8] = c[2]; d[o + 9] = this.mat; d[o + 10] = this.bone; this.n++;
  }
  // local-space normal -> world via normal matrix
  tn(nx, ny, nz) { const q = this.nmat(); const x = q[0] * nx + q[3] * ny + q[6] * nz, y = q[1] * nx + q[4] * ny + q[7] * nz, z = q[2] * nx + q[5] * ny + q[8] * nz; const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; }
  tri(a, b, c) {
    this.grow(3); const m = this.m;
    const pa = M4.pt(m, a[0], a[1], a[2]), pb = M4.pt(m, b[0], b[1], b[2]), pc = M4.pt(m, c[0], c[1], c[2]);
    const ux = pb[0] - pa[0], uy = pb[1] - pa[1], uz = pb[2] - pa[2], vx = pc[0] - pa[0], vy = pc[1] - pa[1], vz = pc[2] - pa[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const d = this.d, cc = this._cc;
    for (const p of [pa, pb, pc]) { const o = this.n * STRIDE; d[o] = p[0]; d[o + 1] = p[1]; d[o + 2] = p[2]; d[o + 3] = nx; d[o + 4] = ny; d[o + 5] = nz; d[o + 6] = cc[0]; d[o + 7] = cc[1]; d[o + 8] = cc[2]; d[o + 9] = this.mat; d[o + 10] = this.bone; this.n++; }
  }
  quad(a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); }
  // axis-aligned box centered at (x,y,z) with size (w,h,d). skip: bitmask 1=bottom 2=top
  box(x, y, z, w, h, d, skip = 0) {
    this.begin(); const a = w / 2, b = h / 2, c = d / 2;
    const P = (i, j, k) => [x + i * a, y + j * b, z + k * c];
    this.quad(P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1));
    this.quad(P(1, -1, -1), P(-1, -1, -1), P(-1, 1, -1), P(1, 1, -1));
    this.quad(P(1, -1, 1), P(1, -1, -1), P(1, 1, -1), P(1, 1, 1));
    this.quad(P(-1, -1, -1), P(-1, -1, 1), P(-1, 1, 1), P(-1, 1, -1));
    if (!(skip & 2)) this.quad(P(-1, 1, 1), P(1, 1, 1), P(1, 1, -1), P(-1, 1, -1));
    if (!(skip & 1)) this.quad(P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1));
    return this;
  }
  // box with min corner + size (y from base)
  boxB(x, y, z, w, h, d, skip) { return this.box(x, y + h / 2, z, w, h, d, skip); }
  // tapered box (top scaled)
  tbox(x, y, z, w, h, d, tw, td, skip = 0) {
    this.begin(); const a = w / 2, c = d / 2, ta = tw / 2, tc = td / 2, y0 = y - h / 2, y1 = y + h / 2;
    const B = (i, k) => [x + i * a, y0, z + k * c], T = (i, k) => [x + i * ta, y1, z + k * tc];
    this.quad(B(-1, 1), B(1, 1), T(1, 1), T(-1, 1)); this.quad(B(1, -1), B(-1, -1), T(-1, -1), T(1, -1));
    this.quad(B(1, 1), B(1, -1), T(1, -1), T(1, 1)); this.quad(B(-1, -1), B(-1, 1), T(-1, 1), T(-1, -1));
    if (!(skip & 2)) this.quad(T(-1, 1), T(1, 1), T(1, -1), T(-1, -1)); if (!(skip & 1)) this.quad(B(-1, -1), B(1, -1), B(1, 1), B(-1, 1));
    return this;
  }
  // cylinder along +Y from base (x,y,z)
  cyl(x, y, z, rb, rt, h, seg = 10, caps = 3) {
    this.begin(); this.grow(seg * 12); const sl = (rb - rt) / h;
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * TAU, a1 = (i + 1) / seg * TAU; const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const n0 = this.tn(c0, sl, s0), n1 = this.tn(c1, sl, s1);
      const p = [[x + c0 * rb, y, z + s0 * rb], [x + c1 * rb, y, z + s1 * rb], [x + c1 * rt, y + h, z + s1 * rt], [x + c0 * rt, y + h, z + s0 * rt]];
      const ns = [n0, n1, n1, n0];
      for (const k of [0, 2, 1, 0, 3, 2]) this.vtx(p[k][0], p[k][1], p[k][2], ns[k][0], ns[k][1], ns[k][2]);
      if ((caps & 2) && rt > 0) { const n = this.tn(0, 1, 0); this.vtx(x, y + h, z, ...n); this.vtx(p[2][0], p[2][1], p[2][2], ...n); this.vtx(p[3][0], p[3][1], p[3][2], ...n); }
      if ((caps & 1) && rb > 0) { const n = this.tn(0, -1, 0); this.vtx(x, y, z, ...n); this.vtx(p[0][0], p[0][1], p[0][2], ...n); this.vtx(p[1][0], p[1][1], p[1][2], ...n); }
    }
    return this;
  }
  // cylinder along Z axis centered (for barrels, wheels, gun barrels)
  cylZ(x, y, z, r, len, seg = 10, caps = 3) { this.push().t(x, y, z).rx(Math.PI / 2).cyl(0, -len / 2, 0, r, r, len, seg, caps); return this.pop(); }
  cylX(x, y, z, r, len, seg = 10, caps = 3) { this.push().t(x, y, z).rz(Math.PI / 2).cyl(0, -len / 2, 0, r, r, len, seg, caps); return this.pop(); }
  sph(x, y, z, rx, ry, rz, seg = 10, rings = 7) {
    this.begin(); this.grow(seg * rings * 6);
    const P = (i, j) => { const th = i / seg * TAU, ph = j / rings * Math.PI; const sx = Math.sin(ph) * Math.cos(th), sy = Math.cos(ph), sz = Math.sin(ph) * Math.sin(th); return [x + sx * rx, y + sy * ry, z + sz * rz, sx / rx, sy / ry, sz / rz]; };
    for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
      const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
      for (const q of [a, c, b, a, d, c]) { const n = this.tn(q[3], q[4], q[5]); this.vtx(q[0], q[1], q[2], n[0], n[1], n[2]); }
    }
    return this;
  }
  // irregular blob (foliage, rocks): noisy sphere
  blob(x, y, z, r, ry, seed = 1, amt = .3, seg = 7, rings = 5) {
    this.begin(); this.grow(seg * rings * 6); const R0 = mulberry(seed * 9973 | 0); const off = []; for (let i = 0; i <= seg * (rings + 1); i++) off.push(1 + (R0() * 2 - 1) * amt);
    const P = (i, j) => { const ii = i % seg; const th = i / seg * TAU, ph = j / rings * Math.PI; const k = (j === 0 || j === rings) ? 1 : off[ii + j * seg]; return [x + Math.sin(ph) * Math.cos(th) * r * k, y + Math.cos(ph) * ry * k, z + Math.sin(ph) * Math.sin(th) * r * k]; };
    for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) { const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1); this.tri(a, c, b); this.tri(a, d, c); }
    return this;
  }
  // gabled roof prism: ridge along X, base w (x) by d (z), height h, at base y
  prism(x, y, z, w, h, d) {
    this.begin(); const a = w / 2, c = d / 2;
    const L0 = [x - a, y, z - c], L1 = [x - a, y, z + c], R0 = [x + a, y, z - c], R1 = [x + a, y, z + c], T0 = [x - a, y + h, z], T1 = [x + a, y + h, z];
    this.quad(L1, R1, T1, T0); this.quad(R0, L0, T0, T1); this.tri(L0, L1, T0); this.tri(R1, R0, T1); this.quad(L0, R0, R1, L1);
    return this;
  }
  // beam: box from p0 to p1 with thickness t (local coords)
  beam(p0, p1, tw, th) {
    th = th || tw; const d = V.sub(p1, p0); const L = V.len(d); if (L < 1e-5) return this; const y = V.sc(d, 1 / L);
    let x = Math.abs(y[1]) < .95 ? V.norm(V.cross([0, 1, 0], y)) : V.norm(V.cross([1, 0, 0], y)); const z = V.cross(x, y);
    const M = M4.basis(M4.create(), x, y, z, p0); this.push(); M4.mul(this.m, this.m, M); this._nm = null; this.box(0, L / 2, 0, tw, L, th); return this.pop();
  }
  // tube along p0->p1, cylinder
  tube(p0, p1, r0, r1, seg = 6) {
    const d = V.sub(p1, p0); const L = V.len(d); if (L < 1e-5) return this; const y = V.sc(d, 1 / L);
    let x = Math.abs(y[1]) < .95 ? V.norm(V.cross([0, 1, 0], y)) : V.norm(V.cross([1, 0, 0], y)); const z = V.cross(x, y);
    const M = M4.basis(M4.create(), x, y, z, p0); this.push(); M4.mul(this.m, this.m, M); this._nm = null; this.cyl(0, 0, 0, r0, r1 ?? r0, L, seg, 3); return this.pop();
  }
  torus(x, y, z, R0, r, segR = 16, segr = 6) {
    this.begin(); this.grow(segR * segr * 6);
    const P = (i, j) => { const u = i / segR * TAU, v = j / segr * TAU; const cx = Math.cos(u), cz = Math.sin(u); return [x + (R0 + r * Math.cos(v)) * cx, y + r * Math.sin(v), z + (R0 + r * Math.cos(v)) * cz, Math.cos(v) * cx, Math.sin(v), Math.cos(v) * cz]; };
    for (let i = 0; i < segR; i++) for (let j = 0; j < segr; j++) { const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1); for (const q of [a, b, c, a, c, d]) { const n = this.tn(q[3], q[4], q[5]); this.vtx(q[0], q[1], q[2], ...n); } }
    return this;
  }
  // flat polygon (convex) in XZ at y, facing up
  plane(x, y, z, w, d) { this.begin(); this.quad([x - w / 2, y, z + d / 2], [x + w / 2, y, z + d / 2], [x + w / 2, y, z - d / 2], [x - w / 2, y, z - d / 2]); return this; }
  // vertical plane (facing +z) for posters/screens
  vplane(x, y, z, w, h) { this.begin(); this.quad([x - w / 2, y - h / 2, z], [x + w / 2, y - h / 2, z], [x + w / 2, y + h / 2, z], [x - w / 2, y + h / 2, z]); return this; }
  data() { return this.d.subarray(0, this.n * STRIDE); }
  mesh() { return new Mesh(this.data()); }
}

/* split a big static builder into spatial chunks for culling */
function buildChunks(mainB, detailB, cell = 40) {
  const map = new Map();
  const add = (B, key) => {
    const d = B.d, n = B.n;
    for (let t = 0; t < n; t += 3) {
      const o = t * STRIDE; const cx = (d[o] + d[o + STRIDE] + d[o + STRIDE * 2]) / 3, cz = (d[o + 2] + d[o + 2 + STRIDE] + d[o + 2 + STRIDE * 2]) / 3;
      const ix = Math.floor(cx / cell), iz = Math.floor(cz / cell); const k = ix + ',' + iz;
      let c = map.get(k); if (!c) { c = { ix, iz, main: [], detail: [], mn: [1e9, 1e9, 1e9], mx: [-1e9, -1e9, -1e9] }; map.set(k, c); }
      c[key].push(t);
      for (let v = 0; v < 3; v++) { const q = o + v * STRIDE; for (let a = 0; a < 3; a++) { const val = d[q + a]; if (val < c.mn[a]) c.mn[a] = val; if (val > c.mx[a]) c.mx[a] = val; } }
    }
  };
  add(mainB, 'main'); if (detailB) add(detailB, 'detail');
  const out = [];
  for (const c of map.values()) {
    const mk = (B, list) => { if (!list.length) return null; const arr = new Float32Array(list.length * 3 * STRIDE); let o = 0; for (const t of list) { arr.set(B.d.subarray(t * STRIDE, (t + 3) * STRIDE), o); o += 3 * STRIDE; } return new Mesh(arr); };
    out.push({ mesh: mk(mainB, c.main), detail: detailB ? mk(detailB, c.detail) : null, mn: c.mn, mx: c.mx, cx: (c.ix + .5) * cell, cz: (c.iz + .5) * cell, hw: cell / 2 });
  }
  return out;
}

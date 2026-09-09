'use strict';
// ===== VOID SECTOR — Этап 2: графическое ядро =====
// PBR-подобный шейдер, направленный + точечные источники, теневые карты, HDR-буфер,
// bloom и пост-обработка, буфер команд отрисовки, уровни качества.
const gfx={
 isWebGL2:!!(window.WebGL2RenderingContext&&gl instanceof WebGL2RenderingContext),
 quality:'high',auto:true,preset:null,
 presets:{
  low:   {label:'НИЗКИЕ', scale:.72,dprCap:1,  shadow:0,   taps:0,bloom:0,fxaa:false,lights:4,particles:.5, lod:1,grain:0},
  medium:{label:'СРЕДНИЕ',scale:1,  dprCap:1,  shadow:1024,taps:1,bloom:1,fxaa:true, lights:6,particles:.75,lod:1,grain:0},
  high:  {label:'ВЫСОКИЕ',scale:1,  dprCap:1.5,shadow:2048,taps:4,bloom:2,fxaa:true, lights:8,particles:1,  lod:0,grain:.02},
  ultra: {label:'УЛЬТРА', scale:1,  dprCap:2,  shadow:4096,taps:9,bloom:2,fxaa:true, lights:8,particles:1.3,lod:0,grain:.02}
 },
 cam:[0,3,18],collecting:false,state:{depthWrite:true,add:false},
 cmds:[],cmdCount:0,lights:[],dynamicLights:[],
 sun:{dir:[-.5,.8,.6],color:[1.1,1.02,.9]},ambientSky:[.16,.22,.3],ambientGround:[.05,.06,.09],fogColor:[.015,.035,.065],fog:[100,340],
 post:{shake:0,ca:0,radial:0,zoom:1,warp:0,emp:[0,0,0,0],vignette:.42,damage:0,grain:0,flash:[0,0,0],lift:[0,0,0],gain:[1,1,1],sat:1,bloom:.85,exposure:1},
 frameTimes:[],adaptTimer:0,fps:60,time:0,
 hdr:false,outScale:1
};
// ---------- Возможности ----------
(function detect(){
 gfx.maxTex=gl.getParameter(gl.MAX_TEXTURE_SIZE);
 if(gfx.isWebGL2){gfx.floatExt=gl.getExtension('EXT_color_buffer_float');gfx.halfType=gl.HALF_FLOAT;gfx.halfInternal=gl.RGBA16F;gfx.hdr=!!gfx.floatExt}
 else{const h=gl.getExtension('OES_texture_half_float'),c=gl.getExtension('EXT_color_buffer_half_float');gl.getExtension('OES_texture_half_float_linear');if(h&&c){gfx.halfType=h.HALF_FLOAT_OES;gfx.halfInternal=gl.RGBA;gfx.hdr=true}}
 try{const s=JSON.parse(localStorage.getItem('void-sector-gfx'));if(s&&gfx.presets[s.quality]){gfx.quality=s.quality;gfx.auto=!!s.auto}else if(s&&s.quality==='auto'){gfx.auto=true}}catch{}
 if(!gfx.hdr&&gfx.quality==='ultra')gfx.quality='high';
 gfx.preset=gfx.presets[gfx.quality];
})();
// ---------- Шейдеры ----------
function gfxProgram(vsSrc,fsSrc,defines={}){
 const head=Object.entries(defines).map(([k,v])=>'#define '+k+' '+v+'\n').join('');
 const compile=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,head+src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.error(gl.getShaderInfoLog(s),head+src);throw Error('shader')}return s};
 const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,vsSrc));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fsSrc));gl.linkProgram(p);
 if(!gl.getProgramParameter(p,gl.LINK_STATUS)){console.error(gl.getProgramInfoLog(p));throw Error('link')}
 const prog={p,u:{},a:{}};
 const nu=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<nu;i++){const info=gl.getActiveUniform(p,i);const name=info.name.replace('[0]','');prog.u[name]=gl.getUniformLocation(p,info.name)}
 const na=gl.getProgramParameter(p,gl.ACTIVE_ATTRIBUTES);for(let i=0;i<na;i++){const info=gl.getActiveAttrib(p,i);prog.a[info.name]=gl.getAttribLocation(p,info.name)}
 return prog;
}
const GLSL_PREC=`#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`;
const GLSL_NOISE=`float hash3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm3(vec3 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*noise3(p);p=p*2.07+vec3(1.7,9.2,3.1);a*=.5;}return v;}
float fbm4(vec3 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise3(p);p=p*2.13+vec3(3.1,1.7,7.2);a*=.5;}return v;}
`;
const MAIN_VS=`attribute vec3 aPos;attribute vec3 aNormal;attribute vec3 aColor;attribute vec3 aMat;
uniform mat4 uM,uVP,uShadowVP;uniform mat3 uN;
varying vec3 vN,vP,vL,vC,vMat;varying vec4 vS;
void main(){vec4 w=uM*vec4(aPos,1.);vP=w.xyz;vL=aPos;vN=normalize(uN*aNormal);vC=aColor;vMat=aMat;vS=uShadowVP*w;gl_Position=uVP*w;}`;
const MAIN_FS=GLSL_PREC+GLSL_NOISE+`
varying vec3 vN,vP,vL,vC,vMat;varying vec4 vS;
uniform vec3 uTint,uEmitAdd,uColor2,uCam,uSunDir,uSunColor,uAmbSky,uAmbGround,uFogColor;
uniform float uGlowScale,uAlpha,uSurface,uDamage,uSeed,uShadowOn,uShadowTexel,uTime,uOutScale,uRoughMul;
uniform vec2 uFog;
uniform vec3 uLightPos[LIGHTS];uniform vec4 uLightCol[LIGHTS];
uniform sampler2D uShadow;
float unpackDepth(vec4 c){return dot(c,vec4(1.,1./255.,1./65025.,1./16581375.));}
float shadowTap(vec2 uv,float z){return z<=unpackDepth(texture2D(uShadow,uv))?1.:0.;}
float shadowFactor(float ndl){
 if(uShadowOn<.5)return 1.;
 vec3 s=vS.xyz/vS.w*.5+.5;
 if(s.x<=.001||s.x>=.999||s.y<=.001||s.y>=.999||s.z>=1.)return 1.;
 float z=s.z-uShadowTexel*(1.2+2.5*(1.-ndl))-.0006;
 float r=0.;
 #if TAPS==1
 r=shadowTap(s.xy,z);
 #elif TAPS==4
 float t=uShadowTexel*.7;
 r=(shadowTap(s.xy+vec2(-t,-t),z)+shadowTap(s.xy+vec2(t,-t),z)+shadowTap(s.xy+vec2(-t,t),z)+shadowTap(s.xy+vec2(t,t),z))*.25;
 #else
 for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++)r+=shadowTap(s.xy+vec2(float(i),float(j))*uShadowTexel*1.15,z);r/=9.;
 #endif
 float edge=smoothstep(0.,.08,s.x)*smoothstep(1.,.92,s.x)*smoothstep(0.,.08,s.y)*smoothstep(1.,.92,s.y);
 return mix(1.,r,edge);
}
vec3 brdf(vec3 N,vec3 V,vec3 L,vec3 diff,vec3 F0,float a,float NdV){
 float NdL=max(dot(N,L),0.);vec3 H=normalize(L+V);float NdH=max(dot(N,H),0.),VdH=max(dot(V,H),0.);
 float a2=a*a;float dd=NdH*NdH*(a2-1.)+1.;float D=a2/(3.14159*dd*dd+1e-5);
 vec3 F=F0+(1.-F0)*pow(1.-VdH,5.);float k=a*.5;float G=1./((NdL*(1.-k)+k)*(NdV*(1.-k)+k)+1e-4);
 return (diff/3.14159+D*F*G*.25)*NdL;
}
void main(){
 vec3 N=normalize(vN);vec3 albedo=vC*uTint;float rough=clamp(vMat.x*uRoughMul,.03,1.),metal=vMat.y;vec3 emissive=vC*vMat.z*uGlowScale+uEmitAdd;
 int surf=int(uSurface+.5);
 if(surf==1){ // газовый гигант
  float bands=fbm3(vec3(vL.y*7.+vL.x*.4,vL.x*1.2,uSeed))+sin(vL.y*22.+fbm3(vL*3.)*4.)*.15;
  albedo=mix(uColor2,albedo,smoothstep(.2,.8,bands));albedo+=vec3(.05,.03,.02)*sin(vL.y*90.+vL.x*6.);
  float storm=smoothstep(.8,.95,noise3(vL*4.+vec3(uSeed)));albedo=mix(albedo,albedo*1.5,storm);rough=.9;metal=0.;
 }else if(surf>=2&&surf<=8){ // каменные поверхности
  vec3 q=vL*3.1+vec3(uSeed*7.3);float e=.05;
  float n0=fbm3(q),nx=fbm3(q+vec3(e,0,0)),ny=fbm3(q+vec3(0,e,0)),nz=fbm3(q+vec3(0,0,e));
  vec3 grad=vec3(nx-n0,ny-n0,nz-n0)/e;float bump=(surf==3?.14:surf==6?.18:.3);
  N=normalize(N-(grad-N*dot(grad,N))*bump);
  float grain=noise3(vL*23.+uSeed);
  if(surf==2||surf==8){albedo*=.78+grain*.4;rough=.88+grain*.1;metal=0.;}
  if(surf==8){float crack=pow(1.-abs(sin(fbm3(vL*2.2+uSeed)*9.+vL.x*3.)),14.);albedo*=1.-crack*.8;emissive+=uColor2*crack*.25;}
  if(surf==3){albedo=albedo*(.85+grain*.3);rough=.22+grain*.3;metal=0.;float sub=pow(1.-max(dot(N,normalize(uCam-vP)),0.),2.);emissive+=uColor2*sub*.18;}
  if(surf==4){albedo*=.55+grain*.35;rough=.96;metal=0.;}
  if(surf==5){albedo*=.7+grain*.3;rough=.85;float vein=pow(1.-abs(sin(fbm3(vL*2.4+uSeed)*8.+vL.z*4.)),10.);float pulse=.7+.3*sin(uTime*2.+vL.x*5.);emissive+=uColor2*vein*pulse*1.8;albedo=mix(albedo,vec3(.05),vein*.5);}
  if(surf==6){float vein=smoothstep(.55,.85,fbm3(vL*3.+uSeed*3.));albedo=mix(albedo*(.8+grain*.3),uColor2*.6,vein);rough=mix(.85,.18,vein);metal=vein*.3;emissive+=uColor2*vein*(.5+.3*sin(uTime*1.5+uSeed));}
  if(surf==7){float speck=smoothstep(.6,.72,noise3(vL*11.+uSeed));albedo=mix(albedo*(.75+grain*.35),vec3(.55,.5,.47),speck);metal=speck*.9;rough=mix(.9,.35,speck);}
 }else if(surf==9){ // каменистая луна
  float c=fbm4(vL*4.+uSeed);float crater=smoothstep(.62,.7,c)-smoothstep(.7,.78,c);albedo*=.7+c*.5-crater*.4;rough=.95;metal=0.;
  vec3 q=vL*4.+uSeed;float e=.04;float n0=fbm3(q);vec3 grad=vec3(fbm3(q+vec3(e,0,0))-n0,fbm3(q+vec3(0,e,0))-n0,fbm3(q+vec3(0,0,e))-n0)/e;N=normalize(N-(grad-N*dot(grad,N))*.25);
 }else if(surf==10){ // панели корпуса
  vec3 g=abs(fract(vL*3.+.5)-.5);float line=smoothstep(.025,.0,min(g.x,min(g.y,g.z)));albedo*=1.-line*.5;rough=mix(rough,rough+.25,line);float wear=noise3(vL*9.+uSeed);rough+=wear*.12;albedo*=.93+wear*.14;
 }else if(surf==11){ // стекло кабины
  rough=.06;metal=.9;
 }
 if(uDamage>0.){float d=fbm3(vL*3.2+uSeed*1.7);float scorch=smoothstep(.62-uDamage*.55,.8-uDamage*.5,d)*min(1.,uDamage*1.6);albedo*=1.-scorch*.82;rough=mix(rough,.95,scorch);metal*=1.-scorch;float ember=scorch*smoothstep(.84,.96,noise3(vL*5.+uSeed))*(.6+.4*sin(uTime*9.+vL.x*20.));emissive+=vec3(1.,.35,.08)*ember*.9*uDamage;}
 vec3 V=normalize(uCam-vP);float NdV=max(dot(N,V),1e-3);
 vec3 F0=mix(vec3(.04),albedo,metal);vec3 diff=albedo*(1.-metal);float a=max(rough*rough,.002);
 vec3 col=vec3(0.);
 float ndlSun=max(dot(N,normalize(uSunDir)),0.);
 if(ndlSun>0.)col+=brdf(N,V,normalize(uSunDir),diff,F0,a,NdV)*uSunColor*shadowFactor(ndlSun);
 for(int i=0;i<LIGHTS;i++){vec3 d=uLightPos[i]-vP;float rad=uLightCol[i].w;if(rad<=0.)continue;float dist2=dot(d,d);float att=1./(1.+dist2*4./(rad*rad));att*=clamp(1.-dist2/(rad*rad*9.),0.,1.);if(att<.002)continue;col+=brdf(N,V,d*inversesqrt(dist2),diff,F0,a,NdV)*uLightCol[i].rgb*att;}
 vec3 amb=mix(uAmbGround,uAmbSky,N.y*.5+.5);
 vec3 Fa=F0+(1.-F0)*pow(1.-NdV,5.)*(1.-rough);
 col+=amb*diff+amb*Fa*(1.-rough)*.9;
 col+=uAmbSky*pow(1.-NdV,3.)*.9*(1.-metal*.3);
 col+=emissive;
 float fog=smoothstep(uFog.x,uFog.y,-vP.z);col=mix(col,uFogColor,fog*.85);
 gl_FragColor=vec4(col*uOutScale,uAlpha);
}`;
const DEPTH_VS=`attribute vec3 aPos;uniform mat4 uM,uShadowVP;void main(){gl_Position=uShadowVP*uM*vec4(aPos,1.);}`;
const DEPTH_FS=GLSL_PREC+`void main(){float d=gl_FragCoord.z;vec4 e=vec4(1.,255.,65025.,16581375.)*d;e=fract(e);e-=e.yzww*vec4(1./255.,1./255.,1./255.,0.);gl_FragColor=e;}`;
const QUAD_VS=`attribute vec2 aPos;varying vec2 vUV;void main(){vUV=aPos*.5+.5;gl_Position=vec4(aPos,0.,1.);}`;
const SKY_FS=GLSL_PREC+GLSL_NOISE+`
varying vec2 vUV;
uniform float uAspect,uTanHalf,uTime,uStarDensity,uNebScale,uNebDensity,uSunSize,uSunGlow,uBrightness,uOutScale,uDust;
uniform vec3 uNebA,uNebB,uNebC,uNebOffset,uSunDir,uSunColor,uDustColor,uDustAxis,uBase;
float star(vec3 d,float n,float thr,float size){vec3 p=d*n;vec3 i=floor(p);vec3 f=fract(p)-.5;float h=hash3(i);vec3 off=vec3(hash3(i+1.3),hash3(i+7.7),hash3(i+3.9))-.5;float dist=length(f-off*.7);float b=smoothstep(thr,1.,h);float tw=1.+.35*sin(uTime*(1.+h*4.)+h*80.);return b*smoothstep(size,0.,dist)*tw;}
void main(){
 vec2 ndc=vUV*2.-1.;vec3 d=normalize(vec3(ndc.x*uAspect*uTanHalf,ndc.y*uTanHalf,-1.));
 vec3 col=uBase;
 float n1=fbm4(d*uNebScale+uNebOffset);float n2=fbm4(d*uNebScale*2.3+uNebOffset.zxy+5.);
 float dens=smoothstep(.32,.9,n1)*uNebDensity;
 col+=mix(uNebA,uNebB,n2)*dens+uNebC*pow(n1,5.)*uNebDensity*2.;
 float band=exp(-pow(dot(d,uDustAxis)*5.,2.))*fbm3(d*7.+uNebOffset.yzx)*uDust;
 col+=uDustColor*band;
 float s=star(d,120.,1.-uStarDensity*.04,.05)*.5+star(d,52.,1.-uStarDensity*.02,.06)*.9+star(d,18.,.965,.05)*1.8;
 vec3 starCol=mix(vec3(.72,.82,1.),vec3(1.,.9,.75),hash3(floor(d*40.)));
 col+=starCol*s*(1.-dens*.6);
 float sd=dot(d,normalize(uSunDir));
 float disc=smoothstep(cos(uSunSize),cos(uSunSize*.8),sd);
 float glow=pow(max(sd,0.),uSunGlow)*.9+pow(max(sd,0.),uSunGlow*.12)*.12;
 col+=uSunColor*(disc*6.+glow);
 gl_FragColor=vec4(col*uBrightness*uOutScale,1.);
}`;
const PART_VS=`attribute vec3 aPos;attribute vec2 aCorner;attribute vec4 aColor;attribute vec4 aData;attribute vec2 aDir;
uniform mat4 uVP;varying vec2 vUV;varying vec4 vCol;varying vec4 vData;
void main(){vec3 p=aPos;float len=length(aDir);vec2 ox,oy;if(len>.001){vec2 u=aDir/len;ox=u*aData.x*(1.+len);oy=vec2(-u.y,u.x)*aData.x;}else{float r=aData.z;ox=vec2(cos(r),sin(r))*aData.x;oy=vec2(-sin(r),cos(r))*aData.x;}p.xy+=ox*aCorner.x+oy*aCorner.y;vUV=aCorner;vCol=aColor;vData=aData;gl_Position=uVP*vec4(p,1.);}`;
const PART_FS=GLSL_PREC+`
varying vec2 vUV;varying vec4 vCol;varying vec4 vData;uniform float uTime,uOutScale,uAdditive;
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 x){vec2 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
void main(){
 float r=length(vUV);int kind=int(vData.y+.5);float a;vec3 col=vCol.rgb;
 if(kind==0){a=pow(max(0.,1.-r),2.2);}
 else if(kind==1){a=pow(max(0.,1.-r),1.6);}
 else if(kind==2){float n=n2(vUV*2.6+vData.w*13.+uTime*.7)+.5*n2(vUV*6.+vData.w*7.-uTime*1.3);a=smoothstep(1.,.15,r+n*.55-.35);col*=.7+n*.9;}
 else if(kind==3){float n=n2(vUV*2.2+vData.w*11.+uTime*.15)+.5*n2(vUV*5.5+vData.w*3.);a=smoothstep(1.,.25,r+n*.6-.4);col*=.85+.3*(vUV.x*.4+vUV.y*.6);}
 else{a=smoothstep(1.,.85,r)*smoothstep(.55,.8,r);}
 a*=vCol.a;
 if(uAdditive>.5)gl_FragColor=vec4(col*a*uOutScale,1.);else gl_FragColor=vec4(col*uOutScale,a);
}`;
const BRIGHT_FS=GLSL_PREC+`varying vec2 vUV;uniform sampler2D uTex;uniform vec2 uTexel;uniform float uThreshold,uOutScale;
void main(){vec3 c=texture2D(uTex,vUV+uTexel*vec2(-.5,-.5)).rgb+texture2D(uTex,vUV+uTexel*vec2(.5,-.5)).rgb+texture2D(uTex,vUV+uTexel*vec2(-.5,.5)).rgb+texture2D(uTex,vUV+uTexel*vec2(.5,.5)).rgb;c*=.25/uOutScale;float l=max(max(c.r,c.g),c.b);float k=max(0.,l-uThreshold)/max(l,1e-4);gl_FragColor=vec4(c*k,1.);}`;
const BLUR_FS=GLSL_PREC+`varying vec2 vUV;uniform sampler2D uTex;uniform vec2 uDir;
void main(){vec3 c=texture2D(uTex,vUV).rgb*.2270270;c+=(texture2D(uTex,vUV+uDir*1.3846154).rgb+texture2D(uTex,vUV-uDir*1.3846154).rgb)*.3162162;c+=(texture2D(uTex,vUV+uDir*3.2307692).rgb+texture2D(uTex,vUV-uDir*3.2307692).rgb)*.0702703;gl_FragColor=vec4(c,1.);}`;
const COMP_FS=GLSL_PREC+`varying vec2 vUV;
uniform sampler2D uScene,uBloom1,uBloom2;uniform vec2 uRes,uShake;uniform vec4 uEmp;
uniform float uAspect,uBloomStrength,uCA,uVignette,uZoom,uRadial,uWarp,uDamage,uGrain,uTime,uSat,uOutScale,uExposure,uBloomOn;
uniform vec3 uFlash,uLift,uGain;
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
vec3 sampleScene(vec2 uv){return texture2D(uScene,uv).rgb/uOutScale;}
void main(){
 vec2 uv=(vUV-.5)/uZoom+.5+uShake;
 vec2 toC=uv-.5;
 vec3 col;
 float radial=uRadial+uWarp*.9;
 if(radial>.002){col=vec3(0.);for(int i=0;i<10;i++){float t=float(i)/9.;vec2 o=toC*radial*t*.35;vec2 p=uv-o;if(uCA>.0005){vec2 c=(p-.5)*uCA*.4;col+=vec3(sampleScene(p+c).r,sampleScene(p).g,sampleScene(p-c).b);}else col+=sampleScene(p);}col*=.1;}
 else if(uCA>.0005){vec2 c=toC*uCA*.4;col=vec3(sampleScene(uv+c).r,sampleScene(uv).g,sampleScene(uv-c).b);}
 else col=sampleScene(uv);
 if(uBloomOn>.5){vec3 b=texture2D(uBloom1,uv).rgb*.65+texture2D(uBloom2,uv).rgb*.9;col+=b*uBloomStrength;}
 if(uWarp>.002){float streak=pow(max(0.,1.-length(toC)*1.2),2.);col+=vec3(.6,.85,1.)*uWarp*streak*.7;col=mix(col,vec3(.85,.95,1.),uWarp*uWarp*uWarp*.35);}
 col*=uExposure;col+=uFlash;
 col=aces(col);
 col=col*uGain+uLift;
 float lum=dot(col,vec3(.299,.587,.114));col=mix(vec3(lum),col,uSat);
 if(uEmp.w>.001){float d=length((vUV-uEmp.xy)*vec2(uAspect,1.));float ring=exp(-pow((d-uEmp.z)*28.,2.));col+=vec3(.35,.9,1.)*ring*uEmp.w*1.2;col=mix(col,vec3(1.)-col,ring*uEmp.w*.5);float inside=smoothstep(uEmp.z,uEmp.z-.08,d)*uEmp.w*.35;col=mix(col,vec3(lum)*vec3(.7,.95,1.),inside);}
 if(uDamage>.001){float sl=sin(vUV.y*uRes.y*1.3+uTime*30.)*.5+.5;col*=1.-uDamage*.2*sl;float g=step(.985,h2(vec2(floor(vUV.y*40.),floor(uTime*18.))))*uDamage;col.rg+=g*.25;col=mix(col,col.brg,g*.35);}
 float v=length((vUV-.5)*vec2(1.,.82))*1.55;col*=1.-uVignette*smoothstep(.45,1.55,v);
 if(uGrain>.0001)col+=(h2(vUV*uRes*.5+fract(uTime*7.))-.5)*uGrain;
 gl_FragColor=vec4(col,1.);
}`;
const FXAA_FS=GLSL_PREC+`varying vec2 vUV;uniform sampler2D uTex;uniform vec2 uTexel;
void main(){
 vec3 rgbNW=texture2D(uTex,vUV+vec2(-1.,-1.)*uTexel).rgb,rgbNE=texture2D(uTex,vUV+vec2(1.,-1.)*uTexel).rgb,rgbSW=texture2D(uTex,vUV+vec2(-1.,1.)*uTexel).rgb,rgbSE=texture2D(uTex,vUV+vec2(1.,1.)*uTexel).rgb,rgbM=texture2D(uTex,vUV).rgb;
 vec3 luma=vec3(.299,.587,.114);float lNW=dot(rgbNW,luma),lNE=dot(rgbNE,luma),lSW=dot(rgbSW,luma),lSE=dot(rgbSE,luma),lM=dot(rgbM,luma);
 float lMin=min(lM,min(min(lNW,lNE),min(lSW,lSE))),lMax=max(lM,max(max(lNW,lNE),max(lSW,lSE)));
 vec2 dir=vec2(-((lNW+lNE)-(lSW+lSE)),((lNW+lSW)-(lNE+lSE)));
 float dirReduce=max((lNW+lNE+lSW+lSE)*.03125,.0078125);float rcp=1./(min(abs(dir.x),abs(dir.y))+dirReduce);
 dir=min(vec2(8.),max(vec2(-8.),dir*rcp))*uTexel;
 vec3 rgbA=.5*(texture2D(uTex,vUV+dir*(1./3.-.5)).rgb+texture2D(uTex,vUV+dir*(2./3.-.5)).rgb);
 vec3 rgbB=rgbA*.5+.25*(texture2D(uTex,vUV+dir*-.5).rgb+texture2D(uTex,vUV+dir*.5).rgb);
 float lB=dot(rgbB,luma);gl_FragColor=vec4((lB<lMin||lB>lMax)?rgbA:rgbB,1.);
}`;
// ---------- Программы ----------
gfx.programs={};
gfx.mainProgram=function(){const taps=gfx.preset.shadow?gfx.preset.taps:0,key='main'+taps;return gfx.programs[key]??=gfxProgram(MAIN_VS,MAIN_FS,{LIGHTS:8,TAPS:taps})};
gfx.depthProg=gfxProgram(DEPTH_VS,DEPTH_FS);
gfx.skyProg=gfxProgram(QUAD_VS,SKY_FS);
gfx.partProg=gfxProgram(PART_VS,PART_FS);
gfx.brightProg=gfxProgram(QUAD_VS,BRIGHT_FS);
gfx.blurProg=gfxProgram(QUAD_VS,BLUR_FS);
gfx.compProg=gfxProgram(QUAD_VS,COMP_FS);
gfx.fxaaProg=gfxProgram(QUAD_VS,FXAA_FS);
gfx.whiteTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,gfx.whiteTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));gl.bindTexture(gl.TEXTURE_2D,null);
gfx.quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,gfx.quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
// ---------- Буферы кадра ----------
function gfxTexture(w,h,hdr,linear){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,linear?gl.LINEAR:gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,linear?gl.LINEAR:gl.NEAREST);
 if(hdr)gl.texImage2D(gl.TEXTURE_2D,0,gfx.halfInternal,w,h,0,gl.RGBA,gfx.halfType,null);else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);return t}
function gfxFBO(w,h,{hdr=false,depth=false,linear=true}={}){
 const fb=gl.createFramebuffer(),tex=gfxTexture(w,h,hdr,linear);gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);let rb=null;
 if(depth){rb=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,rb);gl.renderbufferStorage(gl.RENDERBUFFER,gfx.isWebGL2?gl.DEPTH_COMPONENT24:gl.DEPTH_COMPONENT16,w,h);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,rb)}
 const ok=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;gl.bindFramebuffer(gl.FRAMEBUFFER,null);
 if(!ok){gl.deleteFramebuffer(fb);gl.deleteTexture(tex);if(rb)gl.deleteRenderbuffer(rb);return null}
 return {fb,tex,rb,w,h,dispose(){gl.deleteFramebuffer(fb);gl.deleteTexture(tex);if(rb)gl.deleteRenderbuffer(rb)}}
}
gfx.buffers={};
gfx.setupBuffers=function(){
 for(const k in gfx.buffers){gfx.buffers[k]?.dispose();delete gfx.buffers[k]}
 const w=canvas.width,h=canvas.height,p=gfx.preset;
 let scene=gfx.hdr?gfxFBO(w,h,{hdr:true,depth:true}):null;
 if(!scene){gfx.hdr=false;gfx.outScale=.5;scene=gfxFBO(w,h,{depth:true})}else gfx.outScale=1;
 gfx.buffers.scene=scene;
 if(p.bloom){const hw=Math.max(2,w>>1),hh=Math.max(2,h>>1),qw=Math.max(2,w>>2),qh=Math.max(2,h>>2),ew=Math.max(2,w>>3),eh=Math.max(2,h>>3);
  gfx.buffers.bright=gfxFBO(hw,hh,{hdr:gfx.hdr});gfx.buffers.q1=gfxFBO(qw,qh,{hdr:gfx.hdr});gfx.buffers.q2=gfxFBO(qw,qh,{hdr:gfx.hdr});gfx.buffers.e1=gfxFBO(ew,eh,{hdr:gfx.hdr});gfx.buffers.e2=gfxFBO(ew,eh,{hdr:gfx.hdr})}
 if(p.fxaa)gfx.buffers.ldr=gfxFBO(w,h,{});
 if(p.shadow){const size=Math.min(p.shadow,gfx.maxTex);gfx.buffers.shadow=gfxFBO(size,size,{depth:true,linear:false});if(!gfx.buffers.shadow)gfx.shadowDisabled=true}
};
gfx.resize=function(){
 const v=getAppViewport();W=v.width;H=v.height;try{document.documentElement.style.setProperty('--app-height',H+'px')}catch{}
 const p=gfx.preset,d=Math.min(devicePixelRatio||1,p.dprCap)*p.scale;
 canvas.width=Math.max(2,Math.round(W*d));canvas.height=Math.max(2,Math.round(H*d));aspect=W/H;
 const f=1/Math.tan(Math.PI/6),near=.1,far=800,A=(far+near)/(near-far),B=2*far*near/(near-far);
 vp=new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,A,-1,0,-3*f,B-18*A,18]);
 gfx.setupBuffers();
};
// Снимаем исходный обработчик resize из game.js. Свой собственный на 'resize' не
// вешаем: в мобильной сборке единственный источник пересчёта — syncMobileViewport()
// из mobile-controls.js (он же сохраняет относительную позицию прицела через
// mx/W,my/H — второй независимый слушатель 'resize' успевал вызвать gfx.resize()
// раньше и портил эту математику). Первый расчёт ниже (gfx.resize()) закрывает
// самый первый кадр, до того как mobile-controls.js вообще загрузится.
removeEventListener('resize',resize);
// ---------- Качество ----------
gfx.applyQuality=function(name,save=true){
 if(!gfx.presets[name])return;if(name==='ultra'&&!gfx.hdr)name='high';
 gfx.quality=name;gfx.preset=gfx.presets[name];gfx.shadowDisabled=false;gfx.resize();
 if(save){try{localStorage.setItem('void-sector-gfx',JSON.stringify({quality:gfx.quality,auto:gfx.auto}))}catch{}}
 emit?.('graphicsQuality',{quality:name});
};
gfx.adapt=function(dt){
 gfx.frameTimes.push(dt);if(gfx.frameTimes.length>90)gfx.frameTimes.shift();
 const avg=gfx.frameTimes.reduce((a,b)=>a+b,0)/gfx.frameTimes.length;gfx.fps=1/Math.max(avg,1e-3);
 if(!gfx.auto||mode!=='play')return;gfx.adaptTimer+=dt;if(gfx.adaptTimer<5||gfx.frameTimes.length<60)return;
 const order=['low','medium','high','ultra'],i=order.indexOf(gfx.quality);
 if(avg>1/38&&i>0){gfx.adaptTimer=-8;gfx.applyQuality(order[i-1],false);notify('ГРАФИКА · АВТО: '+gfx.preset.label)}
 else if(avg<1/95&&i<2&&gfx.adaptTimer>25){gfx.adaptTimer=-10;gfx.applyQuality(order[i+1],false)}
};
// ---------- Буфер команд ----------
class GfxCmd{constructor(){this.m=null;this.model=new Float32Array(16);this.normal=new Float32Array(9);this.tint=[1,1,1];this.emit=[0,0,0];this.color2=[.5,.5,.5];this.glow=0;this.alpha=1;this.rough=.55;this.metal=.6;this.surface=0;this.damage=0;this.seed=0;this.add=false;this.depthWrite=true;this.shadow=true;this.glowScale=1;this.roughMul=1}}
gfx.cmdPool=[];
function gfxCmd(){if(gfx.cmdCount>=gfx.cmdPool.length)gfx.cmdPool.push(new GfxCmd());return gfx.cmdPool[gfx.cmdCount++]}
const gfxMatrixStack=[];
function pushMatrix(m){gfxMatrixStack.push(parentMatrix);parentMatrix=parentMatrix?multiply(parentMatrix,m):m}
function popMatrix(){parentMatrix=gfxMatrixStack.pop()||null}
function gfxNormalMatrix(model,out){for(let c=0;c<3;c++){let len=model[c*4]**2+model[c*4+1]**2+model[c*4+2]**2;for(let r=0;r<3;r++)out[c*3+r]=model[c*4+r]/Math.max(1e-6,len)}return out}
// Материал по умолчанию для простых мешей (без вершинных атрибутов материала).
const gfxMaterial={rough:.5,metal:.65};
function setMaterial(rough,metal){gfxMaterial.rough=rough;gfxMaterial.metal=metal}
function resetMaterial(){gfxMaterial.rough=.5;gfxMaterial.metal=.65}
// draw(mesh,x,y,z,sx,sy,sz,color,glow,rx,ry,rz,alpha,opt) — совместимая замена старого draw.
draw=function(m,x,y,z,sx,sy,sz,col,glow=0,rx=0,ry=0,rz=0,alpha=1,opt=null){
 if(!m)return;
 const c=gfxCmd();c.m=m;
 let model=matrix(x,y,z,sx,sy,sz,rx,ry,rz);if(parentMatrix)model=multiply(parentMatrix,model);c.model.set(model);gfxNormalMatrix(model,c.normal);
 const rich=m.stride===48;
 if(rich){c.tint[0]=col?col[0]:1;c.tint[1]=col?col[1]:1;c.tint[2]=col?col[2]:1;c.glowScale=glow||1;c.emit[0]=c.emit[1]=c.emit[2]=0}
 else{c.tint[0]=col[0];c.tint[1]=col[1];c.tint[2]=col[2];c.glow=glow;c.glowScale=1;c.emit[0]=c.emit[1]=c.emit[2]=0}
 c.alpha=alpha;c.rough=opt?.rough??m.rough??gfxMaterial.rough;c.metal=opt?.metal??m.metal??gfxMaterial.metal;c.roughMul=1;
 c.surface=opt?.surface??m.surface??0;c.damage=opt?.damage??0;c.seed=opt?.seed??m.seed??0;
 const c2=opt?.color2||m.color2;if(c2){c.color2[0]=c2[0];c.color2[1]=c2[1];c.color2[2]=c2[2]}else{c.color2[0]=c.color2[1]=c.color2[2]=.5}
 if(opt?.emit){c.emit[0]=opt.emit[0];c.emit[1]=opt.emit[1];c.emit[2]=opt.emit[2]}
 c.add=opt?.add??gfx.state.add;c.depthWrite=opt?.depthWrite??gfx.state.depthWrite;
 c.shadow=(opt?.shadow??m.shadow??true)&&alpha>=.99&&!c.add;
};
// drawModel(mesh,x,y,z,scale|[sx,sy,sz],rx,ry,rz,opt) — для запечённых моделей с вершинными материалами.
function drawModel(m,x,y,z,s=1,rx=0,ry=0,rz=0,opt=null){const sx=Array.isArray(s)?s[0]:s,sy=Array.isArray(s)?s[1]:s,sz=Array.isArray(s)?s[2]:s;draw(m,x,y,z,sx,sy,sz,opt?.tint||null,opt?.glowScale??1,rx,ry,rz,opt?.alpha??1,opt)}
// Перехват состояния GL, которое старый код меняет напрямую.
(function interceptGL(){const dm=gl.depthMask.bind(gl),bf=gl.blendFunc.bind(gl);gl.depthMask=v=>{if(gfx.collecting)gfx.state.depthWrite=!!v;else dm(v)};gl.blendFunc=(s,d)=>{if(gfx.collecting)gfx.state.add=(d===gl.ONE);else bf(s,d)}})();
// ---------- Свет ----------
function addLight(x,y,z,r,g,b,intensity=1,radius=12){if(intensity<=.001)return;gfx.lights.push({x,y,z,r:r*intensity,g:g*intensity,b:b*intensity,radius,w:intensity*radius/(1+Math.hypot(x,y-3,z-18)*.02)})}
function addFlashLight(x,y,z,color,intensity,radius,life=.5){gfx.dynamicLights.push({x,y,z,color,intensity,radius,life,max:life});if(gfx.dynamicLights.length>24)gfx.dynamicLights.splice(0,gfx.dynamicLights.length-24)}
gfx.updateDynamicLights=function(dt){for(const l of gfx.dynamicLights){l.life-=dt;if(l.life>0){const k=l.life/l.max,fall=k*k*(3-2*k);addLight(l.x,l.y,l.z,l.color[0],l.color[1],l.color[2],l.intensity*fall,l.radius*(1+(1-k)*.6))}}gfx.dynamicLights=gfx.dynamicLights.filter(l=>l.life>0)};
// ---------- Матрицы теневой камеры ----------
function gfxLookAt(eye,center,up){let zx=eye[0]-center[0],zy=eye[1]-center[1],zz=eye[2]-center[2],l=Math.hypot(zx,zy,zz);zx/=l;zy/=l;zz/=l;let xx=up[1]*zz-up[2]*zy,xy=up[2]*zx-up[0]*zz,xz=up[0]*zy-up[1]*zx;l=Math.hypot(xx,xy,xz)||1;xx/=l;xy/=l;xz/=l;let yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;return new Float32Array([xx,yx,zx,0,xy,yy,zy,0,xz,yz,zz,0,-(xx*eye[0]+xy*eye[1]+xz*eye[2]),-(yx*eye[0]+yy*eye[1]+yz*eye[2]),-(zx*eye[0]+zy*eye[1]+zz*eye[2]),1])}
function gfxOrtho(l,r,b,t,n,f){return new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1])}
gfx.shadowMatrix=function(){
 const d=gfx.sun.dir,l=Math.hypot(...d)||1,dir=[d[0]/l,d[1]/l,d[2]/l],center=[0,2,-40],eye=[center[0]+dir[0]*160,center[1]+dir[1]*160,center[2]+dir[2]*160];
 const up=Math.abs(dir[1])>.95?[0,0,-1]:[0,1,0];
 return multiply(gfxOrtho(-44,44,-44,44,20,330),gfxLookAt(eye,center,up));
};
// ---------- Проходы ----------
gfx.bindMesh=function(prog,m){
 gl.bindBuffer(gl.ARRAY_BUFFER,m.b);const stride=m.stride||24,a=prog.a;
 gl.enableVertexAttribArray(a.aPos);gl.vertexAttribPointer(a.aPos,3,gl.FLOAT,false,stride,0);
 if(a.aNormal!==undefined&&a.aNormal>=0){gl.enableVertexAttribArray(a.aNormal);gl.vertexAttribPointer(a.aNormal,3,gl.FLOAT,false,stride,12)}
 if(a.aColor!==undefined&&a.aColor>=0){if(stride===48){gl.enableVertexAttribArray(a.aColor);gl.vertexAttribPointer(a.aColor,3,gl.FLOAT,false,48,24);gl.enableVertexAttribArray(a.aMat);gl.vertexAttribPointer(a.aMat,3,gl.FLOAT,false,48,36)}else{gl.disableVertexAttribArray(a.aColor);gl.disableVertexAttribArray(a.aMat)}}
};
gfx.renderShadowPass=function(shadowVP){
 const b=gfx.buffers.shadow;if(!b)return;
 gl.bindFramebuffer(gl.FRAMEBUFFER,b.fb);gl.viewport(0,0,b.w,b.h);gl.clearColor(1,1,1,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 gl.disable(gl.BLEND);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);
 const prog=gfx.depthProg;gl.useProgram(prog.p);gl.uniformMatrix4fv(prog.u.uShadowVP,false,shadowVP);
 let last=null;for(let i=0;i<gfx.cmdCount;i++){const c=gfx.cmdPool[i];if(!c.shadow||!c.depthWrite)continue;if(c.m!==last){gfx.bindMesh(prog,c.m);last=c.m}gl.uniformMatrix4fv(prog.u.uM,false,c.model);gl.drawArrays(gl.TRIANGLES,0,c.m.count)}
};
gfx.renderSky=function(theme){
 const prog=gfx.skyProg;gl.useProgram(prog.p);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.disable(gl.BLEND);
 gl.bindBuffer(gl.ARRAY_BUFFER,gfx.quad);gl.enableVertexAttribArray(prog.a.aPos);gl.vertexAttribPointer(prog.a.aPos,2,gl.FLOAT,false,0,0);
 const u=prog.u;gl.uniform1f(u.uAspect,aspect);gl.uniform1f(u.uTanHalf,Math.tan(Math.PI/6));gl.uniform1f(u.uTime,gfx.time);gl.uniform1f(u.uOutScale,gfx.outScale);
 gl.uniform1f(u.uStarDensity,theme.stars);gl.uniform1f(u.uNebScale,theme.nebScale);gl.uniform1f(u.uNebDensity,theme.nebDensity);gl.uniform1f(u.uSunSize,theme.sunSize);gl.uniform1f(u.uSunGlow,theme.sunGlow);gl.uniform1f(u.uBrightness,theme.brightness);gl.uniform1f(u.uDust,theme.dust);
 gl.uniform3fv(u.uNebA,theme.nebA);gl.uniform3fv(u.uNebB,theme.nebB);gl.uniform3fv(u.uNebC,theme.nebC);gl.uniform3fv(u.uNebOffset,theme.nebOffset);gl.uniform3fv(u.uSunDir,theme.sunDir);gl.uniform3fv(u.uSunColor,theme.sunColor);gl.uniform3fv(u.uDustColor,theme.dustColor);gl.uniform3fv(u.uDustAxis,theme.dustAxis);gl.uniform3fv(u.uBase,theme.base);
 gl.drawArrays(gl.TRIANGLES,0,3);
 gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.enable(gl.BLEND);
};
gfx.renderMainPass=function(shadowVP){
 const prog=gfx.mainProgram(),u=prog.u,a=prog.a;gl.useProgram(prog.p);
 gl.uniformMatrix4fv(u.uVP,false,vp);gl.uniformMatrix4fv(u.uShadowVP,false,shadowVP);gl.uniform3fv(u.uCam,gfx.cam);
 gl.uniform3fv(u.uSunDir,gfx.sun.dir);gl.uniform3fv(u.uSunColor,gfx.sun.color);gl.uniform3fv(u.uAmbSky,gfx.ambientSky);gl.uniform3fv(u.uAmbGround,gfx.ambientGround);gl.uniform3fv(u.uFogColor,gfx.fogColor);gl.uniform2fv(u.uFog,gfx.fog);
 gl.uniform1f(u.uTime,gfx.time);gl.uniform1f(u.uOutScale,gfx.outScale);
 const sb=gfx.buffers.shadow,shadowOn=sb&&gfx.preset.shadow&&!gfx.shadowDisabled;gl.uniform1f(u.uShadowOn,shadowOn?1:0);gl.uniform1f(u.uShadowTexel,sb?1/sb.w:0);
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,sb&&shadowOn?sb.tex:gfx.whiteTex);gl.uniform1i(u.uShadow,0);
 // Точечные источники: выбрать самые значимые.
 const n=gfx.preset.lights,lights=gfx.lights.sort((p,q)=>q.w-p.w).slice(0,n),pos=new Float32Array(24),col=new Float32Array(32);
 for(let i=0;i<8;i++){const l=lights[i];if(l){pos[i*3]=l.x;pos[i*3+1]=l.y;pos[i*3+2]=l.z;col[i*4]=l.r;col[i*4+1]=l.g;col[i*4+2]=l.b;col[i*4+3]=l.radius}else col[i*4+3]=0}
 gl.uniform3fv(u.uLightPos,pos);gl.uniform4fv(u.uLightCol,col);
 gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);
 const opaque=[],transparent=[];for(let i=0;i<gfx.cmdCount;i++){const c=gfx.cmdPool[i];if(c.alpha>=.999&&!c.add&&c.depthWrite)opaque.push(c);else transparent.push(c)}
 opaque.sort((p,q)=>(p.m.id||0)-(q.m.id||0));
 let last=null,lastAdd=false,lastDW=true;gl.depthMask(true);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
 const emitCmd=c=>{
  if(c.m!==last){gfx.bindMesh(prog,c.m);last=c.m}
  if(c.add!==lastAdd){gl.blendFunc(gl.SRC_ALPHA,c.add?gl.ONE:gl.ONE_MINUS_SRC_ALPHA);lastAdd=c.add}
  if(c.depthWrite!==lastDW){gl.depthMask(c.depthWrite);lastDW=c.depthWrite}
  gl.uniformMatrix4fv(u.uM,false,c.model);gl.uniformMatrix3fv(u.uN,false,c.normal);
  gl.uniform3fv(u.uTint,c.tint);gl.uniform3fv(u.uEmitAdd,c.emit);gl.uniform3fv(u.uColor2,c.color2);gl.uniform1f(u.uGlowScale,c.glowScale);gl.uniform1f(u.uAlpha,c.alpha);gl.uniform1f(u.uSurface,c.surface);gl.uniform1f(u.uDamage,c.damage);gl.uniform1f(u.uSeed,c.seed);gl.uniform1f(u.uRoughMul,c.roughMul);
  if(c.m.stride!==48){gl.vertexAttrib3f(a.aColor,1,1,1);gl.vertexAttrib3f(a.aMat,c.rough,c.metal,c.glow)}
  gl.drawArrays(gl.TRIANGLES,0,c.m.count);
 };
 for(const c of opaque)emitCmd(c);
 for(const c of transparent)emitCmd(c);
 gl.depthMask(true);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
};
gfx.blitQuad=function(prog){gl.bindBuffer(gl.ARRAY_BUFFER,gfx.quad);gl.enableVertexAttribArray(prog.a.aPos);gl.vertexAttribPointer(prog.a.aPos,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,3)};
gfx.renderPost=function(){
 const B=gfx.buffers,P=gfx.post,p=gfx.preset;gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.depthMask(false);
 const bind=(fbo)=>{gl.bindFramebuffer(gl.FRAMEBUFFER,fbo?fbo.fb:null);gl.viewport(0,0,fbo?fbo.w:canvas.width,fbo?fbo.h:canvas.height)};
 const tex=(unit,t)=>{gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t)};
 if(p.bloom&&B.bright){
  let prog=gfx.brightProg;gl.useProgram(prog.p);bind(B.bright);tex(0,B.scene.tex);gl.uniform1i(prog.u.uTex,0);gl.uniform2f(prog.u.uTexel,1/B.scene.w,1/B.scene.h);gl.uniform1f(prog.u.uThreshold,.95);gl.uniform1f(prog.u.uOutScale,gfx.outScale);gfx.blitQuad(prog);
  prog=gfx.blurProg;gl.useProgram(prog.p);gl.uniform1i(prog.u.uTex,0);
  bind(B.q1);tex(0,B.bright.tex);gl.uniform2f(prog.u.uDir,1/B.q1.w,0);gfx.blitQuad(prog);
  bind(B.q2);tex(0,B.q1.tex);gl.uniform2f(prog.u.uDir,0,1/B.q1.h);gfx.blitQuad(prog);
  if(p.bloom>1){bind(B.e1);tex(0,B.q2.tex);gl.uniform2f(prog.u.uDir,1.5/B.e1.w,0);gfx.blitQuad(prog);bind(B.e2);tex(0,B.e1.tex);gl.uniform2f(prog.u.uDir,0,1.5/B.e1.h);gfx.blitQuad(prog);}
 }
 const prog=gfx.compProg,u=prog.u;gl.useProgram(prog.p);bind(p.fxaa&&B.ldr?B.ldr:null);
 tex(0,B.scene.tex);gl.uniform1i(u.uScene,0);
 if(p.bloom&&B.q2){tex(1,B.q2.tex);gl.uniform1i(u.uBloom1,1);tex(2,(p.bloom>1?B.e2:B.q2).tex);gl.uniform1i(u.uBloom2,2);gl.uniform1f(u.uBloomOn,1)}else gl.uniform1f(u.uBloomOn,0);
 gl.uniform2f(u.uRes,canvas.width,canvas.height);gl.uniform2fv(u.uShake,P.shakeVec||[0,0]);gl.uniform4fv(u.uEmp,P.emp);gl.uniform1f(u.uAspect,aspect);
 gl.uniform1f(u.uBloomStrength,P.bloom);gl.uniform1f(u.uCA,P.ca);gl.uniform1f(u.uVignette,P.vignette);gl.uniform1f(u.uZoom,P.zoom);gl.uniform1f(u.uRadial,P.radial);gl.uniform1f(u.uWarp,P.warp);gl.uniform1f(u.uDamage,P.damage);gl.uniform1f(u.uGrain,p.grain+P.grain);gl.uniform1f(u.uTime,gfx.time);gl.uniform1f(u.uSat,P.sat);gl.uniform1f(u.uOutScale,gfx.outScale);gl.uniform1f(u.uExposure,P.exposure);
 gl.uniform3fv(u.uFlash,P.flash);gl.uniform3fv(u.uLift,P.lift);gl.uniform3fv(u.uGain,P.gain);
 gfx.blitQuad(prog);
 if(p.fxaa&&B.ldr){const f=gfx.fxaaProg;gl.useProgram(f.p);bind(null);tex(0,B.ldr.tex);gl.uniform1i(f.u.uTex,0);gl.uniform2f(f.u.uTexel,1/B.ldr.w,1/B.ldr.h);gfx.blitQuad(f)}
 for(let i=0;i<3;i++)tex(i,null);gl.activeTexture(gl.TEXTURE0);
 gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.enable(gl.BLEND);
};
// Полный кадр: sceneFn() наполняет буфер команд, particlesFn() рисует частицы поверх, theme — параметры неба.
gfx.renderFrame=function(dt,sceneFn,particlesFn,theme){
 gfx.time+=dt;gfx.adapt(dt);
 gfx.cmdCount=0;gfx.lights=[];gfx.state.depthWrite=true;gfx.state.add=false;parentMatrix=null;gfxMatrixStack.length=0;
 gfx.updateDynamicLights(dt);
 gfx.collecting=true;try{sceneFn()}finally{gfx.collecting=false;parentMatrix=null}
 const shadowVP=gfx.shadowMatrix();
 if(gfx.preset.shadow&&gfx.buffers.shadow&&!gfx.shadowDisabled)gfx.renderShadowPass(shadowVP);
 const S=gfx.buffers.scene;gl.bindFramebuffer(gl.FRAMEBUFFER,S.fb);gl.viewport(0,0,S.w,S.h);
 gl.clearColor(gfx.fogColor[0]*gfx.outScale,gfx.fogColor[1]*gfx.outScale,gfx.fogColor[2]*gfx.outScale,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 if(theme)gfx.renderSky(theme);
 gfx.renderMainPass(shadowVP);
 if(particlesFn)particlesFn();
 gfx.renderPost();
};
// ---------- Панель настроек ----------
gfx.buildSettings=function(){
 if($('settingsBtn'))return;
 const btn=document.createElement('button');btn.id='settingsBtn';btn.textContent='НАСТРОЙКИ';btn.setAttribute('aria-label','Настройки графики и звука');
 const sound=$('sound');sound.parentNode.insertBefore(btn,sound);
 const panel=document.createElement('div');panel.id='settings';panel.hidden=true;document.body.appendChild(panel);
 const style=document.createElement('style');style.textContent=`#settingsBtn{font-size:11px;letter-spacing:1px}#settings{position:fixed;inset:0;z-index:9;background:#030b15c8;backdrop-filter:blur(10px);display:grid;place-items:center}#settings .panel{width:min(560px,92vw);max-height:90vh;overflow:auto}#settings h3{font-size:12px;letter-spacing:2px;color:var(--cyan);margin:22px 0 10px}#settings .row{display:flex;flex-wrap:wrap;gap:8px}#settings .row button{font-size:12px;letter-spacing:1px;padding:10px 14px;flex:1}#settings .row [aria-pressed=true]{border-color:var(--cyan);background:#68efda1c;color:var(--cyan)}#settings label{display:flex;align-items:center;justify-content:space-between;gap:14px;font-size:13px;color:#b8c9d6;margin:8px 0}#settings input[type=range]{flex:1;accent-color:#98f8ed}#settings .hint{font-size:12px;color:#8aa0b3;line-height:1.6}#settings #fpsInfo{font-size:12px;color:#95e6cc;margin-top:8px}#settings .toggle{width:auto;margin:0;padding:8px 12px;font-size:12px}`;
 document.head.appendChild(style);
 const render=()=>{
  const q=['auto','low','medium','high','ultra'],labels={auto:'АВТО',low:'НИЗКИЕ',medium:'СРЕДНИЕ',high:'ВЫСОКИЕ',ultra:'УЛЬТРА'};
  const audioRows=globalThis.audioAPI?['master','music','sfx','voice'].map(k=>'<label>'+({master:'ОБЩАЯ ГРОМКОСТЬ',music:'МУЗЫКА',sfx:'ЭФФЕКТЫ',voice:'ДИАЛОГИ'}[k])+'<input type="range" min="0" max="1" step=".02" data-vol="'+k+'" value="'+audioAPI.getVolume(k)+'"></label>').join(''):'<p class="hint">Звуковая система не загружена.</p>';
  const voice=globalThis.storyAPI?'<label>ОЗВУЧКА ДИАЛОГОВ<button class="toggle" id="voiceToggle" aria-pressed="'+(storyAPI.getVoice?.()?'true':'false')+'">'+(storyAPI.getVoice?.()?'ВКЛ':'ВЫКЛ')+'</button></label>':'';
  panel.innerHTML='<div class="panel"><div class="eyebrow">НАСТРОЙКИ</div><h2 style="font-size:28px;margin:8px 0">ГРАФИКА И ЗВУК</h2><h3>КАЧЕСТВО ГРАФИКИ</h3><div class="row">'+q.map(k=>'<button data-q="'+k+'" aria-pressed="'+((k==='auto'&&gfx.auto)||(k!=='auto'&&!gfx.auto&&gfx.quality===k))+'"'+(k==='ultra'&&!gfx.hdr?' disabled title="Нужна поддержка HDR-буфера"':'')+'>'+labels[k]+'</button>').join('')+'</div><p class="hint">Низкие: без теней и bloom, уменьшенное разрешение. Средние: тени 1024, bloom. Высокие: тени 2048 с мягкими краями, HiDPI. Ультра: тени 4096, максимум частиц. «Авто» подбирает уровень по частоте кадров.</p><div id="fpsInfo">Текущий уровень: '+gfx.preset.label+' · '+(gfx.isWebGL2?'WebGL 2':'WebGL 1')+' · '+(gfx.hdr?'HDR':'LDR')+' · '+Math.round(gfx.fps)+' FPS</div><h3>ЗВУК</h3>'+audioRows+voice+'<button id="settingsClose" class="primary" style="margin-top:22px">ГОТОВО →</button></div>';
  panel.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{const k=b.dataset.q;if(k==='auto'){gfx.auto=true;gfx.adaptTimer=0;gfx.applyQuality(gfx.quality)}else{gfx.auto=false;gfx.applyQuality(k)}render()});
  panel.querySelectorAll('[data-vol]').forEach(r=>r.oninput=()=>audioAPI.setVolume(r.dataset.vol,parseFloat(r.value)));
  const vt=panel.querySelector('#voiceToggle');if(vt)vt.onclick=()=>{storyAPI.setVoice(!storyAPI.getVoice());render()};
  panel.querySelector('#settingsClose').onclick=close;
 };
 let wasPlaying=false;
 const open=()=>{if(mode==='play'){pause();wasPlaying=true}else wasPlaying=false;render();panel.hidden=false};
 const close=()=>{panel.hidden=true;if(wasPlaying&&mode==='pause')pause()};
 btn.onclick=()=>panel.hidden?open():close();
 addEventListener('keydown',e=>{if(e.code==='Escape'&&!panel.hidden){e.stopImmediatePropagation();close()}},true);
};
gfx.resize();gfx.buildSettings();

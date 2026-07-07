/* mobius3d.js — <mobius-hero> : true-3D shaded Möbius ribbon, canvas renderer.
   Variants: hero (bio particles + transcription letters), figure (annotated loop stations),
   petri (light-page microscope dish). Drag = orbit, click = disrupt (loop re-optimizes). */
(function(){
'use strict';
if (customElements.get('mobius-hero')) return;
const TAU = Math.PI*2;
const clamp = (v,a,b)=>v<a?a:(v>b?b:v);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MO = REDUCED ? 0.35 : 1;
const G=[55,240,160], C=[89,216,255], M=[255,92,154];
const Gd=[30,140,96], Cd=[52,128,152], Md=[150,56,94]; // dimmed bio-artifact palette
const LX=0.32, LY=0.46, LZ=0.83;
const LETTERS=['A','T','C','G'];
function ribbonColor(u){
  const A3=[G,C,M];
  const ph=((u/TAU)%1+1)%1, seg=ph*3, k=Math.floor(seg)%3, f=seg-Math.floor(seg);
  const A=A3[k], B=A3[(k+1)%3];
  return [A[0]+(B[0]-A[0])*f, A[1]+(B[1]-A[1])*f, A[2]+(B[2]-A[2])*f];
}

class MobiusHero extends HTMLElement{
  static get observedAttributes(){ return ['variant','spin','hud','hudpos','cx','cy','zoom','bands','grow','stations','letters','artifacts','count','speed']; }
  constructor(){
    super();
    this._cfg={variant:'hero', spin:0.14, hud:true, hudpos:'bl', cx:0.5, cy:0.5, zoom:1, bands:10, grow:1, stations:false, letters:true, artifacts:'cell,hex,strand', count:0, speed:1};
    this._rot={yaw:0.6, pitch:-0.55};
    this._st={p:0.04, pulse:0, iter:1, shock:0, time:0};
    this._letters=[]; this._parts=null; this._microbes=null;
    this._raf=0; this._dt=0.016;
    this._W=0; this._H=0; this._DPR=1; this._focal=600; this._cxp=0; this._cyp=0;
    this._camDist=3.15; this._R=1.05;
    this._px=null; this._nu=0; this._nv=0;
    this._ptr={down:false,sx:0,sy:0,lx:0,ly:0,moved:false};
  }
  attributeChangedCallback(){ this._readAttrs(); }
  set spin(v){ const s=parseFloat(v); if(!isNaN(s)) this._cfg.spin=s; }
  set hud(v){ this._cfg.hud = !(v===false||v===0||v==='0'||v==='false'); }
  set variant(v){ if(v) this._cfg.variant=String(v); }
  set bands(v){ const b=parseInt(v); if(!isNaN(b)) this._cfg.bands=clamp(b,1,16); }
  set grow(v){ const g=parseFloat(v); if(!isNaN(g)) this._cfg.grow=g; }
  set stations(v){ this._cfg.stations=!(v===false||v===0||v==='0'||v==='false'||v==null); }
  set letters(v){ this._cfg.letters=!(v===false||v===0||v==='0'||v==='false'); }
  set artifacts(v){ if(v!=null) this._cfg.artifacts=String(v); }
  set count(v){ const n=parseInt(v); if(!isNaN(n)) this._cfg.count=clamp(n,0,40); }
  set speed(v){ const s=parseFloat(v); if(!isNaN(s)) this._cfg.speed=s; }
  _readAttrs(){
    const c=this._cfg, ga=n=>this.getAttribute(n);
    if(ga('variant')) c.variant=ga('variant');
    const s=parseFloat(ga('spin')); if(!isNaN(s)) c.spin=s;
    if(ga('hud')!=null) c.hud=!(ga('hud')==='0'||ga('hud')==='false');
    if(ga('hudpos')) c.hudpos=ga('hudpos');
    const cx=parseFloat(ga('cx')); if(!isNaN(cx)) c.cx=cx;
    const cy=parseFloat(ga('cy')); if(!isNaN(cy)) c.cy=cy;
    const z=parseFloat(ga('zoom')); if(!isNaN(z)) c.zoom=z;
    const b=parseInt(ga('bands')); if(!isNaN(b)) c.bands=clamp(b,1,16);
    const g=parseFloat(ga('grow')); if(!isNaN(g)) c.grow=g;
    if(ga('stations')!=null) c.stations=!(ga('stations')==='0'||ga('stations')==='false');
    if(ga('letters')!=null) c.letters=!(ga('letters')==='0'||ga('letters')==='false');
    if(ga('artifacts')!=null) c.artifacts=ga('artifacts');
    const n=parseInt(ga('count')); if(!isNaN(n)) c.count=clamp(n,0,40);
    const sp=parseFloat(ga('speed')); if(!isNaN(sp)) c.speed=sp;
  }
  connectedCallback(){
    if(this._cv) return;
    this._readAttrs();
    if(getComputedStyle(this).position==='static') this.style.position='relative';
    this.style.display='block';
    if(!this.style.width) this.style.width='100%';
    if(!this.style.height) this.style.height='100%';
    this.style.cursor='grab';
    this.style.touchAction='none';
    const cv=document.createElement('canvas');
    cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block';
    this.appendChild(cv);
    this._cv=cv; this._ctx=cv.getContext('2d');
    this._ro=new ResizeObserver(()=>this._resize());
    this._ro.observe(this);
    this._resize();
    this._bindPointer();
    let last=performance.now();
    const loop=(now)=>{
      let dt=(now-last)/1000; last=now; if(dt>0.05) dt=0.05;
      this._step(dt); this._draw();
      this._raf=requestAnimationFrame(loop);
    };
    this._raf=requestAnimationFrame(loop);
  }
  disconnectedCallback(){
    cancelAnimationFrame(this._raf);
    if(this._ro) this._ro.disconnect();
  }
  _resize(){
    const r=this.getBoundingClientRect();
    if(r.width<2||r.height<2) return;
    this._DPR=Math.min(2,window.devicePixelRatio||1);
    this._W=r.width; this._H=r.height;
    this._cv.width=Math.floor(r.width*this._DPR);
    this._cv.height=Math.floor(r.height*this._DPR);
    this._ctx.setTransform(this._DPR,0,0,this._DPR,0,0);
  }
  _bindPointer(){
    const p=this._ptr;
    this.addEventListener('pointerdown',e=>{
      const r=this.getBoundingClientRect();
      p.down=true; p.moved=false;
      p.sx=e.clientX-r.left; p.sy=e.clientY-r.top; p.lx=p.sx; p.ly=p.sy;
      try{ this.setPointerCapture(e.pointerId); }catch(_){}
    });
    this.addEventListener('pointermove',e=>{
      if(!p.down) return;
      const r=this.getBoundingClientRect();
      const x=e.clientX-r.left, y=e.clientY-r.top;
      const dx=x-p.lx, dy=y-p.ly; p.lx=x; p.ly=y;
      if(Math.abs(x-p.sx)+Math.abs(y-p.sy)>6) p.moved=true;
      if(p.moved){
        this._rot.yaw+=dx*0.006;
        this._rot.pitch=clamp(this._rot.pitch+dy*0.006,-1.4,1.4);
      }
    });
    this.addEventListener('pointerup',()=>{
      if(p.down && !p.moved){ this._st.shock=1; this._st.p=Math.max(0.15,this._st.p-0.3); }
      p.down=false;
    });
  }
  _step(dt){
    const st=this._st;
    this._dt=dt;
    st.time+=dt;
    this._rot.yaw+=this._cfg.spin*dt*MO;
    st.pulse+=1.7*dt*MO;
    const gr=this._cfg.grow;
    if(st.pulse>=TAU){ st.pulse-=TAU; st.iter++; st.p=Math.min(1,st.p+0.14*gr); }
    st.p=Math.min(1, st.p+dt*0.03*gr*MO);
    st.shock*=Math.pow(0.94, dt*60);
  }
  _rotv(x,y,z){
    const cy=Math.cos(this._rot.yaw), sy=Math.sin(this._rot.yaw);
    const x1=x*cy+z*sy, z1=-x*sy+z*cy;
    const cx=Math.cos(this._rot.pitch), sx=Math.sin(this._rot.pitch);
    return {x:x1, y:y*cx-z1*sx, z:y*sx+z1*cx};
  }
  _proj(x,y,z){
    const r=this._rotv(x,y,z);
    const zc=r.z+this._camDist, s=this._focal/Math.max(0.05,zc);
    return {x:this._cxp+r.x*s, y:this._cyp+r.y*s, z:zc, s:s};
  }
  _bright(zc){ return clamp((this._camDist+1.7-zc)/3.3, 0.06, 1); }

  /* ============================== draw ============================== */
  _draw(){
    const ctx=this._ctx, W=this._W, H=this._H, cfg=this._cfg;
    if(!ctx||W<10||H<10) return;
    ctx.clearRect(0,0,W,H);
    const petri=cfg.variant==='petri';
    this._cxp=W*cfg.cx; this._cyp=H*cfg.cy;
    let dishR=0;
    if(petri){
      dishR=Math.min(W,H)*0.46;
      this._focal=dishR*1.42*cfg.zoom;
      this._drawDishBase(dishR);
      ctx.save();
      ctx.beginPath(); ctx.arc(this._cxp,this._cyp,dishR-2,0,TAU); ctx.clip();
      this._drawCrosshair(dishR);
      this._drawMicrobes(dishR);
    } else {
      this._focal=Math.min(W,H)*1.18*cfg.zoom;
    }
    if(cfg.variant==='hero'||cfg.variant==='figure') this._drawParticles(true);
    this._buildGrid();
    this._drawSurface();
    this._drawEdge();
    this._drawPulseBand();
    if(cfg.variant==='hero'){ this._drawParticles(false); this._updLetters(); }
    if(cfg.stations) this._drawStationsOnBand();
    if(petri){ this._drawScaleBar(dishR); ctx.restore(); this._drawDishChrome(dishR); }
    if(cfg.variant==='figure') this._drawStations();
    if(cfg.hud) this._drawHud();
  }

  _buildGrid(){
    const st=this._st, p=st.p, time=st.time;
    const nu=Math.round(48+p*84);
    const nv=Math.max(1,Math.round(1+p*(this._cfg.bands-1)));
    const hw=0.32+0.10*p;
    const jit=(0.04+0.24*(1-p))+st.shock*0.4;
    const R=this._R;
    const wx=[], px=[];
    for(let i=0;i<=nu;i++){
      const u=i/nu*TAU, cu=Math.cos(u), su=Math.sin(u), h=u/2, ch=Math.cos(h), sh=Math.sin(h);
      const wrow=[], prow=[];
      for(let j=0;j<=nv;j++){
        const v=j/nv*2-1, off=v*hw;
        let x=(R+off*ch)*cu, y=(R+off*ch)*su, z=off*sh;
        if(jit>0.001){
          // position-based noise: continuous across the Möbius seam (u=0 ≡ u=2π with v flipped)
          const n1=Math.sin(x*2.3+y*1.9+z*3.1+time*2), n2=Math.cos(x*3.1-y*2.2+z*1.7-time*1.7);
          const rr=jit*0.5*(n1+0.6*n2);
          x+=cu*rr; y+=su*rr; z+=rr*0.4*n2;
        }
        wrow.push({x,y,z}); prow.push(this._proj(x,y,z));
      }
      wx.push(wrow); px.push(prow);
    }
    this._wx=wx; this._px=px; this._nu=nu; this._nv=nv;
  }

  _drawSurface(){
    const ctx=this._ctx, st=this._st, p=st.p, pulse=st.pulse;
    const wx=this._wx, px=this._px, nu=this._nu, nv=this._nv;
    const quads=[];
    for(let i=0;i<nu;i++){
      const uC=(i+0.5)/nu*TAU;
      let dd=Math.abs(((uC-pulse+Math.PI)%TAU+TAU)%TAU-Math.PI);
      const pulseGlow=Math.exp(-dd*dd*7);
      const dBehind=((pulse-uC)%TAU+TAU)%TAU;
      const fresh=clamp(pulseGlow+Math.exp(-dBehind*1.6)*0.55,0,1.2);
      const base=ribbonColor(uC);
      for(let j=0;j<nv;j++){
        const a=wx[i][j], b=wx[i+1][j], c=wx[i+1][j+1], d=wx[i][j+1];
        const e1x=b.x-a.x,e1y=b.y-a.y,e1z=b.z-a.z, e2x=d.x-a.x,e2y=d.y-a.y,e2z=d.z-a.z;
        let nx=e1y*e2z-e1z*e2y, ny=e1z*e2x-e1x*e2z, nz=e1x*e2y-e1y*e2x;
        const nl=Math.hypot(nx,ny,nz)||1; nx/=nl; ny/=nl; nz/=nl;
        const rn=this._rotv(nx,ny,nz);
        const diff=Math.abs(rn.x*LX+rn.y*LY+rn.z*LZ);
        const spec=Math.pow(diff,18)*0.85;
        const shade=0.24+0.78*diff;
        const pa=px[i][j], pb=px[i+1][j], pc=px[i+1][j+1], pd=px[i][j+1];
        const zc=(pa.z+pb.z+pc.z+pd.z)*0.25, db=this._bright(zc);
        const wf=fresh*0.7;
        const r =(base[0]*(1-wf)+255*wf)*shade*db + spec*150*db;
        const g =(base[1]*(1-wf)+255*wf)*shade*db + spec*150*db;
        const bl=(base[2]*(1-wf)+255*wf)*shade*db + spec*150*db;
        quads.push({z:zc, pts:[pa,pb,pc,pd], r,g,b:bl});
      }
    }
    quads.sort((A,B)=>B.z-A.z);
    // Paint opaque on an offscreen layer (strokes seal seams without alpha-stacking),
    // then composite the whole band translucently — no visible grid, uniform glassiness.
    const oc=this._oc||(this._oc=document.createElement('canvas'));
    if(oc.width!==this._cv.width||oc.height!==this._cv.height){ oc.width=this._cv.width; oc.height=this._cv.height; }
    const c2=oc.getContext('2d');
    c2.setTransform(this._DPR,0,0,this._DPR,0,0);
    c2.clearRect(0,0,this._W,this._H);
    c2.lineJoin='round';
    for(const q of quads){
      const P=q.pts, fs=`rgb(${q.r|0},${q.g|0},${q.b|0})`;
      c2.beginPath();
      c2.moveTo(P[0].x,P[0].y); c2.lineTo(P[1].x,P[1].y);
      c2.lineTo(P[2].x,P[2].y); c2.lineTo(P[3].x,P[3].y);
      c2.closePath();
      c2.fillStyle=fs; c2.fill();
      c2.strokeStyle=fs; c2.lineWidth=1; c2.stroke();      // seals seams
      c2.strokeStyle='rgba(255,255,255,0.05)'; c2.lineWidth=0.5; c2.stroke(); // whisper of mesh
    }
    ctx.save();
    ctx.globalAlpha=clamp(0.52+0.4*p,0,0.94);
    ctx.drawImage(oc,0,0,this._W,this._H);
    ctx.restore();
  }

  _drawEdge(){
    const ctx=this._ctx, st=this._st, p=st.p, pulse=st.pulse;
    const px=this._px, nu=this._nu, nv=this._nv;
    ctx.globalCompositeOperation='lighter';
    const edge=[];
    for(let i=0;i<=nu;i++) edge.push({p:px[i][nv], u:i/nu*TAU});
    for(let i=0;i<=nu;i++) edge.push({p:px[i][0], u:i/nu*TAU});
    for(let k=0;k<edge.length-1;k++){
      const a=edge[k].p, b=edge[k+1].p, u=edge[k].u;
      let dd=Math.abs(((u-pulse+Math.PI)%TAU+TAU)%TAU-Math.PI);
      const near=Math.exp(-dd*dd*6);
      const col=ribbonColor(u);
      const cr=col[0]*(1-near)+255*near, cg=col[1]*(1-near)+255*near, cb=col[2]*(1-near)+255*near;
      const db=this._bright((a.z+b.z)*0.5);
      const al=(0.25+0.5*p)*db+near*0.7;
      const w=(1.1+1.4*p)+near*2.2;
      ctx.strokeStyle=`rgba(${cr|0},${cg|0},${cb|0},${al*0.18})`; ctx.lineWidth=w*4;
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
      ctx.strokeStyle=`rgba(${cr|0},${cg|0},${cb|0},${al})`; ctx.lineWidth=w;
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    }
    ctx.globalCompositeOperation='source-over';
  }

  _drawPulseBand(){
    const ctx=this._ctx, px=this._px, nu=this._nu;
    const pi=Math.round(this._st.pulse/TAU*nu)%nu;
    ctx.globalCompositeOperation='lighter';
    for(let off=-1;off<=1;off++){
      const ii=((pi+off)%nu+nu)%nu; const a=off===0?1:0.4;
      const rowP=px[ii];
      ctx.strokeStyle=`rgba(200,255,255,${0.5*a})`; ctx.lineWidth=(off===0?3.2:1.6);
      ctx.beginPath(); ctx.moveTo(rowP[0].x,rowP[0].y);
      for(let j=1;j<rowP.length;j++) ctx.lineTo(rowP[j].x,rowP[j].y);
      ctx.stroke();
    }
    ctx.globalCompositeOperation='source-over';
  }

  /* ---------- bio particles (3D shell, drawn behind/front of ribbon) ---------- */
  _initParts(){
    const cfg=this._cfg;
    const types=cfg.artifacts.split(',').map(s=>s.trim()).filter(t=>t==='cell'||t==='hex'||t==='strand');
    const n=types.length? (cfg.count>0?cfg.count:(cfg.variant==='hero'?14:8)) : 0;
    const parts=[];
    for(let i=0;i<n;i++){
      parts.push({
        r:1.55+Math.random()*1.5,
        th:Math.random()*TAU,
        ph:(Math.random()-0.5)*2.4,
        spd:(0.02+Math.random()*0.05)*(Math.random()<0.5?-1:1),
        type: types[i%types.length],
        col:[Gd,Cd,Md][i%3],
        size:0.022+Math.random()*0.028,
        seed:Math.random()*TAU
      });
    }
    this._parts=parts;
    this._partKey=cfg.artifacts+'|'+cfg.count;
  }
  _drawParticles(behindPass){
    const cfg=this._cfg;
    if(!this._parts || this._partKey!==cfg.artifacts+'|'+cfg.count) this._initParts();
    const ctx=this._ctx, time=this._st.time, dt=this._dt;
    for(const m of this._parts){
      m.th+=m.spd*dt*MO*cfg.speed;
      const wob=Math.sin(time*0.4+m.seed)*0.12;
      const x=m.r*Math.cos(m.th)*Math.cos(m.ph+wob);
      const y=m.r*Math.sin(m.ph+wob)*0.8;
      const z=m.r*Math.sin(m.th)*Math.cos(m.ph+wob);
      const pr=this._proj(x,y,z);
      const behind=pr.z>this._camDist;
      if(behind!==behindPass) continue;
      const s=Math.min(m.size*pr.s, 18); // cap so no artifact dominates
      if(s<1.2) continue;
      const db=this._bright(pr.z);
      const a=(behind?0.45:0.7)*db;
      const [cr,cg,cb]=m.col;
      const rgba=(al)=>`rgba(${cr},${cg},${cb},${al})`;
      if(m.type==='cell'){
        ctx.fillStyle=rgba(0.07*a*4); ctx.beginPath(); ctx.arc(pr.x,pr.y,s,0,TAU); ctx.fill();
        ctx.strokeStyle=rgba(0.35*a); ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle=rgba(0.4*a);
        ctx.beginPath(); ctx.arc(pr.x+s*0.2,pr.y-s*0.15,s*0.32,0,TAU); ctx.fill();
      } else if(m.type==='hex'){
        ctx.strokeStyle=rgba(0.32*a); ctx.lineWidth=1;
        ctx.beginPath();
        for(let k=0;k<6;k++){
          const an=m.seed+time*0.15*m.spd*10+k/6*TAU;
          const hx=pr.x+Math.cos(an)*s, hy=pr.y+Math.sin(an)*s;
          k?ctx.lineTo(hx,hy):ctx.moveTo(hx,hy);
        }
        ctx.closePath(); ctx.stroke();
        ctx.fillStyle=rgba(0.3*a);
        ctx.beginPath(); ctx.arc(pr.x,pr.y,1.2,0,TAU); ctx.fill();
      } else {
        ctx.strokeStyle=rgba(0.32*a); ctx.lineWidth=1.1; ctx.lineCap='round';
        ctx.beginPath();
        for(let k=0;k<=10;k++){
          const t2=k/10;
          const hx=pr.x+(t2-0.5)*s*2.6;
          const hy=pr.y+Math.sin(t2*TAU*1.5+time+m.seed)*s*0.42;
          k?ctx.lineTo(hx,hy):ctx.moveTo(hx,hy);
        }
        ctx.stroke();
      }
    }
  }

  /* ---------- transcription letters emitted at the pulse ---------- */
  _updLetters(){
    const ctx=this._ctx, st=this._st, dt=this._dt;
    if(!this._cfg.letters){ this._letters.length=0; return; }
    if(!REDUCED && Math.random()<dt*7){
      const u=st.pulse, cu=Math.cos(u), su=Math.sin(u), h=u/2;
      const hw=0.32+0.10*st.p, ch=Math.cos(h), sh=Math.sin(h);
      const x=(this._R+hw*ch)*cu, y=(this._R+hw*ch)*su, z=hw*sh;
      const pr=this._proj(x,y,z);
      this._letters.push({
        x:pr.x, y:pr.y,
        vx:(Math.random()-0.5)*26, vy:-14-Math.random()*20,
        t:0, ch:LETTERS[(Math.random()*4)|0]
      });
      if(this._letters.length>26) this._letters.shift();
    }
    ctx.font='500 11px "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign='center';
    for(let i=this._letters.length-1;i>=0;i--){
      const L=this._letters[i];
      L.t+=dt; L.x+=L.vx*dt; L.y+=L.vy*dt;
      const a=1-L.t/1.9;
      if(a<=0){ this._letters.splice(i,1); continue; }
      ctx.fillStyle=`rgba(190,255,225,${a*0.75})`;
      ctx.fillText(L.ch,L.x,L.y);
    }
    ctx.textAlign='left';
  }

  /* ---------- stations pinned to the band (rotate with it) ---------- */
  _drawStationsOnBand(){
    const ctx=this._ctx, st=this._st;
    const stations=[
      {u:0.03*TAU, n:'01', label:'HYPOTHESIZE', col:G},
      {u:0.36*TAU, n:'02', label:'EXPERIMENT',  col:C},
      {u:0.70*TAU, n:'03', label:'ANALYZE',     col:M}
    ];
    ctx.font='600 11px "JetBrains Mono", ui-monospace, monospace';
    ctx.textBaseline='middle';
    for(const s of stations){
      const cu=Math.cos(s.u), su=Math.sin(s.u);
      const pr=this._proj(this._R*cu, this._R*su, 0);
      const behind=pr.z>this._camDist;
      const db=this._bright(pr.z);
      let dd=Math.abs(((s.u-st.pulse+Math.PI)%TAU+TAU)%TAU-Math.PI);
      const near=Math.exp(-dd*dd*4);
      const [cr,cg,cb]=s.col;
      const a=(behind?0.3:0.85)*db+(behind?0:near*0.15);
      // dot + ring
      ctx.fillStyle=`rgba(${cr},${cg},${cb},${a})`;
      ctx.beginPath(); ctx.arc(pr.x,pr.y,3+near*2.5,0,TAU); ctx.fill();
      ctx.strokeStyle=`rgba(${cr},${cg},${cb},${a*0.4})`;
      ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(pr.x,pr.y,8+near*4,0,TAU); ctx.stroke();
      // label offset outward from loop center, following the point as it rotates
      const dx=pr.x-this._cxp, dy=pr.y-this._cyp;
      const len=Math.hypot(dx,dy)||1;
      const ox=dx/len*(20+near*4), oy=dy/len*(20+near*4);
      const rightSide=ox>=0;
      ctx.textAlign=rightSide?'left':'right';
      ctx.fillStyle=`rgba(${cr},${cg},${cb},${Math.min(1,a+0.1)})`;
      ctx.fillText(s.n+' '+s.label, pr.x+ox, pr.y+oy);
    }
    ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  }

  /* ---------- figure: annotated loop stations ---------- */
  _drawStations(){
    const ctx=this._ctx, W=this._W, H=this._H, st=this._st;
    const stations=[
      {u:0.02*TAU, n:'01', label:'HYPOTHESIZE', col:G, ax:0.13, ay:0.16, align:'left'},
      {u:0.36*TAU, n:'02', label:'EXPERIMENT',  col:C, ax:0.88, ay:0.22, align:'right'},
      {u:0.70*TAU, n:'03', label:'ANALYZE',     col:M, ax:0.85, ay:0.85, align:'right'}
    ];
    ctx.font='500 11px "JetBrains Mono", ui-monospace, monospace';
    for(const s of stations){
      const cu=Math.cos(s.u), su=Math.sin(s.u);
      const pr=this._proj(this._R*cu, this._R*su, 0);
      const ax=W*s.ax, ay=H*s.ay;
      let dd=Math.abs(((s.u-st.pulse+Math.PI)%TAU+TAU)%TAU-Math.PI);
      const near=Math.exp(-dd*dd*4);
      const [cr,cg,cb]=s.col;
      const lift=0.45+near*0.55;
      ctx.strokeStyle=`rgba(${cr},${cg},${cb},${0.22+near*0.4})`;
      ctx.lineWidth=1;
      ctx.setLineDash([3,4]);
      ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(pr.x,pr.y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle=`rgba(${cr},${cg},${cb},${lift})`;
      ctx.beginPath(); ctx.arc(pr.x,pr.y,3+near*2.5,0,TAU); ctx.fill();
      ctx.strokeStyle=`rgba(${cr},${cg},${cb},${0.3*lift})`;
      ctx.beginPath(); ctx.arc(pr.x,pr.y,7+near*4,0,TAU); ctx.stroke();
      ctx.textAlign=s.align==='right'?'right':'left';
      ctx.fillStyle=`rgba(${cr},${cg},${cb},${0.75+near*0.25})`;
      ctx.fillText(s.n+' — '+s.label, ax, ay-8);
      ctx.fillStyle=`rgba(130,141,169,${0.55+near*0.3})`;
    }
    ctx.textAlign='left';
  }

  /* ---------- petri dish (light page) ---------- */
  _drawDishBase(R){
    const ctx=this._ctx, cx=this._cxp, cy=this._cyp;
    ctx.save();
    ctx.shadowColor='rgba(14,19,30,.35)';
    ctx.shadowBlur=46; ctx.shadowOffsetY=18;
    ctx.fillStyle='#0a0f1a';
    ctx.beginPath(); ctx.arc(cx,cy,R,0,TAU); ctx.fill();
    ctx.restore();
    const grd=ctx.createRadialGradient(cx-R*0.25,cy-R*0.3,R*0.1, cx,cy,R);
    grd.addColorStop(0,'#111b30'); grd.addColorStop(1,'#070a12');
    ctx.fillStyle=grd;
    ctx.beginPath(); ctx.arc(cx,cy,R,0,TAU); ctx.fill();
    ctx.strokeStyle='rgba(126,146,196,.07)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(cx,cy,R*0.84,0,TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,R*0.6,0,TAU); ctx.stroke();
    ctx.strokeStyle='rgba(200,230,255,.09)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(cx,cy,R-4,0,TAU); ctx.stroke();
  }
  _drawCrosshair(R){
    const ctx=this._ctx, cx=this._cxp, cy=this._cyp;
    ctx.strokeStyle='rgba(126,146,196,.09)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(cx-R,cy); ctx.lineTo(cx+R,cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx,cy-R); ctx.lineTo(cx,cy+R); ctx.stroke();
  }
  _initMicrobes(){
    const n=22, arr=[];
    for(let i=0;i<n;i++){
      const an=Math.random()*TAU, rr=Math.sqrt(Math.random())*0.82;
      arr.push({
        x:Math.cos(an)*rr, y:Math.sin(an)*rr,
        vx:(Math.random()-0.5)*0.02, vy:(Math.random()-0.5)*0.02,
        r:0.012+Math.random()*0.022,
        a:Math.random()*TAU, va:(Math.random()-0.5)*0.3,
        type:(Math.random()*3)|0,
        col:[Gd,Cd,Md][i%3],
        seed:Math.random()*TAU, f:0.3+Math.random()*0.6
      });
    }
    this._microbes=arr;
  }
  _drawMicrobes(R){
    if(!this._microbes) this._initMicrobes();
    const ctx=this._ctx, cx=this._cxp, cy=this._cyp, dt=this._dt, time=this._st.time;
    for(const m of this._microbes){
      m.vx+=Math.sin(time*m.f+m.seed)*dt*0.004;
      m.vy+=Math.cos(time*m.f*1.3+m.seed)*dt*0.004;
      m.x+=m.vx*dt*MO*3; m.y+=m.vy*dt*MO*3; m.a+=m.va*dt*MO;
      const d=Math.hypot(m.x,m.y);
      if(d>0.86){ m.vx-=m.x*dt*0.1; m.vy-=m.y*dt*0.1; }
      const px=cx+m.x*R, py=cy+m.y*R, s=m.r*R;
      const [cr,cg,cb]=m.col;
      const rgba=al=>`rgba(${cr},${cg},${cb},${al})`;
      if(m.type===0){
        ctx.fillStyle=rgba(0.06); ctx.beginPath(); ctx.arc(px,py,s,0,TAU); ctx.fill();
        ctx.strokeStyle=rgba(0.25); ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle=rgba(0.3);
        ctx.beginPath(); ctx.arc(px+s*0.2,py-s*0.15,s*0.34,0,TAU); ctx.fill();
      } else if(m.type===1){
        ctx.save(); ctx.translate(px,py); ctx.rotate(m.a);
        ctx.strokeStyle=rgba(0.24); ctx.lineWidth=s*0.85; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(-s*1.4,0); ctx.lineTo(s*1.4,0); ctx.stroke();
        ctx.strokeStyle=rgba(0.12); ctx.lineWidth=s*0.4;
        ctx.beginPath(); ctx.moveTo(-s*1.2,0); ctx.lineTo(s*1.2,0); ctx.stroke();
        ctx.restore();
      } else {
        ctx.strokeStyle=rgba(0.26); ctx.lineWidth=1;
        ctx.beginPath();
        for(let k=0;k<6;k++){
          const an=m.a+k/6*TAU;
          const hx=px+Math.cos(an)*s, hy=py+Math.sin(an)*s;
          k?ctx.lineTo(hx,hy):ctx.moveTo(hx,hy);
        }
        ctx.closePath(); ctx.stroke();
      }
    }
  }
  _drawScaleBar(R){
    const ctx=this._ctx, cx=this._cxp, cy=this._cyp;
    const x=cx+R*0.28, y=cy+R*0.74, w=64;
    ctx.strokeStyle='rgba(170,200,240,.7)'; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+w,y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x,y-4); ctx.lineTo(x,y+4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+w,y-4); ctx.lineTo(x+w,y+4); ctx.stroke();
    ctx.font='500 10px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle='rgba(170,200,240,.7)';
    ctx.fillText('50 µm', x+w+8, y+3);
  }
  _drawDishChrome(R){
    const ctx=this._ctx, cx=this._cxp, cy=this._cyp;
    const ink=a=>`rgba(20,24,33,${a})`;
    ctx.strokeStyle=ink(0.5); ctx.lineWidth=1.6;
    ctx.beginPath(); ctx.arc(cx,cy,R,0,TAU); ctx.stroke();
    ctx.strokeStyle=ink(0.16); ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(cx,cy,R+9,0,TAU); ctx.stroke();
    for(let i=0;i<72;i++){
      const an=i/72*TAU, len=i%6===0?7:3.5;
      const r0=R+13;
      ctx.strokeStyle=ink(i%6===0?0.4:0.22); ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(cx+Math.cos(an)*r0, cy+Math.sin(an)*r0);
      ctx.lineTo(cx+Math.cos(an)*(r0+len), cy+Math.sin(an)*(r0+len));
      ctx.stroke();
    }
  }

  /* ---------- HUD ---------- */
  _drawHud(){
    const ctx=this._ctx, st=this._st, W=this._W, H=this._H;
    const bw=190;
    const right=this._cfg.hudpos==='br';
    const hx=right? W-28-bw : 24, hy=H-52;
    ctx.font='500 11px "JetBrains Mono", ui-monospace, monospace';
    ctx.textBaseline='alphabetic'; ctx.textAlign='left';
    const conv=st.p>=0.995;
    ctx.fillStyle='rgba(150,240,255,.9)';
    ctx.fillText('ITERATION '+String(st.iter).padStart(2,'0'), hx, hy);
    ctx.fillStyle='rgba(130,141,169,.85)';
    ctx.fillText(conv?'CONVERGED — LOOP OPTIMIZED':'SELF-OPTIMIZING…  FIDELITY '+Math.round(st.p*100)+'%', hx, hy+16);
    const bh=4, by=hy+26;
    ctx.fillStyle='rgba(126,146,196,.16)';
    this._rr(hx,by,bw,bh,2); ctx.fill();
    if(bw*st.p>=0.5){
      const grd=ctx.createLinearGradient(hx,0,hx+bw,0);
      grd.addColorStop(0,'#37f0a0'); grd.addColorStop(.55,'#59d8ff'); grd.addColorStop(1,'#ff5c9a');
      ctx.fillStyle=grd;
      this._rr(hx,by,bw*st.p,bh,2); ctx.fill();
    }
  }
  _rr(x,y,w,h,r){
    const ctx=this._ctx;
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
  }
}
customElements.define('mobius-hero', MobiusHero);
})();

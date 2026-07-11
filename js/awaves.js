/* AWaves — interactive wavy lines background.
   Ported to vanilla from Antoine Wodniack's AW-2025 portfolio (AWaves.astro + Noise.js).
   Renders SVG polylines on a grid, animated by Perlin noise, pushed by mouse velocity. */
(function(){
  "use strict";

  /* ---- Perlin noise (from the repo's Noise.js) ---- */
  function Grad(x,y,z){this.x=x;this.y=y;this.z=z;}
  Grad.prototype.dot2=function(x,y){return this.x*x+this.y*y;};
  function Noise(seed){
    this.grad3=[new Grad(1,1,0),new Grad(-1,1,0),new Grad(1,-1,0),new Grad(-1,-1,0),
      new Grad(1,0,1),new Grad(-1,0,1),new Grad(1,0,-1),new Grad(-1,0,-1),
      new Grad(0,1,1),new Grad(0,-1,1),new Grad(0,1,-1),new Grad(0,-1,-1)];
    this.p=[151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
      190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,
      136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,
      41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,
      188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,
      59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,
      129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,
      179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,
      150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
    this.perm=new Array(512);this.gradP=new Array(512);this.seed(seed||0);
  }
  Noise.prototype.seed=function(seed){
    if(seed>0&&seed<1)seed*=65536;seed=Math.floor(seed);if(seed<256)seed|=seed<<8;
    for(let i=0;i<256;i++){let v;if(i&1)v=this.p[i]^(seed&255);else v=this.p[i]^((seed>>8)&255);
      this.perm[i]=this.perm[i+256]=v;this.gradP[i]=this.gradP[i+256]=this.grad3[v%12];}
  };
  Noise.prototype.fade=function(t){return t*t*t*(t*(t*6-15)+10);};
  Noise.prototype.lerp=function(a,b,t){return(1-t)*a+t*b;};
  Noise.prototype.perlin2=function(x,y){
    let X=Math.floor(x),Y=Math.floor(y);x-=X;y-=Y;X&=255;Y&=255;
    const n00=this.gradP[X+this.perm[Y]].dot2(x,y);
    const n01=this.gradP[X+this.perm[Y+1]].dot2(x,y-1);
    const n10=this.gradP[X+1+this.perm[Y]].dot2(x-1,y);
    const n11=this.gradP[X+1+this.perm[Y+1]].dot2(x-1,y-1);
    const u=this.fade(x);
    return this.lerp(this.lerp(n00,n10,u),this.lerp(n01,n11,u),this.fade(y));
  };

  /* ---- AWaves web component ---- */
  class AWaves extends HTMLElement{
    connectedCallback(){
      this.svg=this.querySelector(".js-svg");
      this.mouse={x:-10,y:0,lx:0,ly:0,sx:0,sy:0,v:0,vs:0,a:0,set:false};
      this.lines=[];this.paths=[];this.noise=new Noise(Math.random());
      this.isInteractive=false;this.isPaused=false;
      this.setSize();this.setLines();
      this.bindEvents();
      this._tick=this.tick.bind(this);
      // respect reduced motion: render a single static frame, no loop
      const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if(reduce){ this.drawLines(); return; }
      // drive with rAF (GSAP ticker not required)
      const loop=(t)=>{ if(!this.isPaused) this._tick(t); this._raf=requestAnimationFrame(loop); };
      this._raf=requestAnimationFrame(loop);
    }
    disconnectedCallback(){ cancelAnimationFrame(this._raf); }
    bindEvents(){
      window.addEventListener("mousemove",(e)=>this.updateMousePosition(e.clientX,e.clientY),{passive:true});
      window.addEventListener("resize",()=>{this.setSize();this.setLines();});
      this.addEventListener("touchmove",(e)=>{const t=e.touches[0];this.updateMousePosition(t.clientX,t.clientY);},{passive:true});
    }
    setInteractive(v){ this.isInteractive=v; }
    updateMousePosition(x,y){
      const m=this.mouse,b=this.bounding;
      m.x=x-b.left;m.y=y-b.top+window.scrollY;
      if(!m.set){m.sx=m.x;m.sy=m.y;m.lx=m.x;m.ly=m.y;m.set=true;}
    }
    setSize(){
      const b=this.getBoundingClientRect();
      this.svg.style.width="";this.svg.style.height="";
      this.bounding={left:b.left,top:b.top+window.scrollY,width:this.clientWidth,height:this.clientHeight};
      this.svg.style.width=this.bounding.width+"px";this.svg.style.height=this.bounding.height+"px";
    }
    setLines(){
      const{width,height}=this.bounding;this.lines=[];
      this.paths.forEach((p)=>p.remove());this.paths=[];
      const xGap=10,yGap=32,oWidth=width+200,oHeight=height+30;
      const totalLines=Math.ceil(oWidth/xGap),totalPoints=Math.ceil(oHeight/yGap);
      const xStart=(width-xGap*totalLines)/2,yStart=(height-yGap*totalPoints)/2;
      for(let i=0;i<=totalLines;i++){
        const points=[];
        for(let j=0;j<=totalPoints;j++)points.push({x:xStart+xGap*i,y:yStart+yGap*j,wave:{x:0,y:0},cursor:{x:0,y:0,vx:0,vy:0}});
        const path=document.createElementNS("http://www.w3.org/2000/svg","path");
        path.classList.add("a__line");path.classList.add("js-line");
        this.svg.appendChild(path);this.paths.push(path);this.lines.push(points);
      }
      this.drawLines();
    }
    movePoints(time){
      const{lines,mouse,noise}=this;
      lines.forEach((points)=>{points.forEach((p)=>{
        const move=noise.perlin2((p.x+time*0.0125)*0.002,(p.y+time*0.005)*0.0015)*12;
        p.wave.x=Math.cos(move)*32;p.wave.y=Math.sin(move)*16;
        if(this.isInteractive){
          const dx=p.x-mouse.sx,dy=p.y-mouse.sy,d=Math.hypot(dx,dy),l=Math.max(175,mouse.vs);
          if(d<l){const s=1-d/l,f=Math.cos(d*0.001)*s;
            p.cursor.vx+=Math.cos(mouse.a)*f*l*mouse.vs*0.00065;
            p.cursor.vy+=Math.sin(mouse.a)*f*l*mouse.vs*0.00065;}
          p.cursor.vx+=(0-p.cursor.x)*0.005;p.cursor.vy+=(0-p.cursor.y)*0.005;
          p.cursor.vx*=0.925;p.cursor.vy*=0.925;
          p.cursor.x+=p.cursor.vx*2;p.cursor.y+=p.cursor.vy*2;
          p.cursor.x=Math.min(100,Math.max(-100,p.cursor.x));
          p.cursor.y=Math.min(100,Math.max(-100,p.cursor.y));
        }
      });});
    }
    moved(point,withCursor){
      const c={x:point.x+point.wave.x+(withCursor?point.cursor.x:0),y:point.y+point.wave.y+(withCursor?point.cursor.y:0)};
      c.x=Math.round(c.x*10)/10;c.y=Math.round(c.y*10)/10;return c;
    }
    drawLines(){
      const{lines,paths}=this;
      lines.forEach((points,li)=>{
        let p1=this.moved(points[0],false),d="M "+p1.x+" "+p1.y;
        points.forEach((pt,pi)=>{const isLast=pi===points.length-1;p1=this.moved(pt,!isLast);d+="L "+p1.x+" "+p1.y;});
        paths[li].setAttribute("d",d);
      });
    }
    tick(time){
      const m=this.mouse;
      m.sx+=(m.x-m.sx)*0.1;m.sy+=(m.y-m.sy)*0.1;
      const dx=m.x-m.lx,dy=m.y-m.ly,d=Math.hypot(dx,dy);
      m.v=d;m.vs+=(d-m.vs)*0.1;m.vs=Math.min(100,m.vs);
      m.lx=m.x;m.ly=m.y;m.a=Math.atan2(dy,dx);
      this.style.setProperty("--x",m.sx+"px");this.style.setProperty("--y",m.sy+"px");
      this.movePoints(time);this.drawLines();
    }
  }
  if(!customElements.get("a-waves")) customElements.define("a-waves",AWaves);
})();

/* Native WebGL: real depth-tested meshes, orbit/pan/zoom camera and animated geometry. */
(function(){
  'use strict';
  const M=SurfaceMath,$=id=>document.getElementById(id),canvas=$('surfaceCanvas');
  const state={model:'sphere',mode:'gores',count:12,t:0,playing:false,last:0,attempt:null,textureState:'textureLoading'};
  const camera={yaw:-.3,pitch:.15,zoom:1,pan:[0,0]};
  const copy=()=>SURFACE_COPY[document.documentElement.lang==='ru'?'ru':'kk'];
  const f=(x,n=4)=>Number.isFinite(x)?new Intl.NumberFormat(document.documentElement.lang==='ru'?'ru-RU':'kk-KZ',{maximumFractionDigits:n}).format(x):'—';
  let gl,program,mesh,buffers,locations,texture,frame=0,geometryDirty=true,contextLost=false;
  const VERT=`
    precision highp float;
    attribute vec3 aPosition; attribute vec3 aNormal; attribute vec2 aUV; attribute vec3 aColor;
    uniform vec3 uCenter; uniform vec2 uAngle; uniform vec2 uPan;
    uniform float uDistance; uniform float uAspect; uniform mediump float uPoint;
    varying mediump vec2 vUV; varying mediump vec3 vNormal; varying mediump vec3 vColor;
    vec3 rotate(vec3 p){float c=cos(uAngle.x),s=sin(uAngle.x);p=vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);c=cos(uAngle.y);s=sin(uAngle.y);return vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);}
    void main(){vec3 p=rotate(aPosition-uCenter);p.xy+=uPan;p.z-=uDistance;
      gl_Position=vec4(p.x*2.14450692/uAspect,p.y*2.14450692,-1.002002*p.z-.2002002,-p.z);
      gl_PointSize=max(1.0,uPoint);vNormal=rotate(aNormal);vUV=aUV;vColor=aColor;}`;
  function fragment(derivatives){return `${derivatives?'#extension GL_OES_standard_derivatives : enable':''}
    precision mediump float;
    uniform sampler2D uEarth;uniform float uTexture;uniform float uHeat;uniform float uGrid;uniform float uLine;uniform float uPoint;
    varying mediump vec2 vUV;varying mediump vec3 vNormal;varying mediump vec3 vColor;
    void main(){if(uPoint>0.0&&length(gl_PointCoord-vec2(.5))>.5)discard;
      vec3 earth=texture2D(uEarth,vUV).rgb;
      vec3 base=mix(vec3(.22,.57,.57),earth,uTexture);
      if(uHeat>.5)base=vColor*(.86+.14*dot(earth,vec3(.299,.587,.114)));
      vec3 n=normalize(vNormal+vec3(0.0,0.0,.00001));float light=.61+.39*abs(dot(n,normalize(vec3(-.4,.65,1.0))));
      base*=light;
      if(uGrid>.5){vec2 q=vUV*vec2(12.,6.);vec2 d=abs(fract(q+.5)-.5);vec2 w=${derivatives?'max(fwidth(q)*.8,vec2(.008))':'vec2(.012)'};
        float line=1.-min(smoothstep(w.x,w.x*1.8,d.x),smoothstep(w.y,w.y*1.8,d.y));base=mix(base,vec3(.83,.95,.96),line*.42);}
      if(uLine>.5)base=vColor;gl_FragColor=vec4(base,1.);}`;}
  function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
  function initializeGL(){
    try{
      gl=canvas.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer:false})||canvas.getContext('webgl',{antialias:false,alpha:false,preserveDrawingBuffer:false});if(!gl)throw Error('WebGL unavailable');
      const vs=compile(gl.VERTEX_SHADER,VERT),fs=compile(gl.FRAGMENT_SHADER,fragment(!!gl.getExtension('OES_standard_derivatives')));
      program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
      gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(program);
      locations={};for(const s of ['aPosition','aNormal','aUV','aColor'])locations[s]=gl.getAttribLocation(program,s);
      for(const s of ['uCenter','uAngle','uPan','uDistance','uAspect','uPoint','uEarth','uTexture','uHeat','uGrid','uLine'])locations[s]=gl.getUniformLocation(program,s);
      buffers={vertices:gl.createBuffer(),indices:gl.createBuffer(),lines:gl.createBuffer(),point:gl.createBuffer()};
      texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([32,73,87,255]));
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.clearColor(.035,.075,.11,1);
      state.graphicsError=null;$('surfaceGlError').hidden=true;contextLost=false;geometryDirty=true;return true;
    }catch(e){state.graphicsError=e.message==='WebGL unavailable'?'noWebGL':'graphicsInitFailed';$('surfaceGlError').hidden=false;$('surfaceGlError').textContent=copy()[state.graphicsError];console.error('Surface renderer:',e);gl=null;return false;}
  }
  function attributes(buffer){
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    for(const [key,size,offset] of [['aPosition',3,0],['aNormal',3,12],['aUV',2,24],['aColor',3,32]]){const loc=locations[key];gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,44,offset);}
  }
  function sample(){
    const phi=+$('sampleLatitude').value*M.PI/180,v=+$('sampleLongitude').value/100,step=M.TAU/state.count;
    const center=-M.PI+(Math.floor((68*M.PI/180+M.PI)/step)+.5)*step;
    const lambda=state.mode==='mercator'?v*M.PI:center+v*step/2;
    return {lambda,phi,center,delta:lambda-center};
  }
  function draw(){
    if(!gl||contextLost)return;
    const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    if(geometryDirty){mesh=SurfaceMesh.build(state);gl.bindBuffer(gl.ARRAY_BUFFER,buffers.vertices);gl.bufferData(gl.ARRAY_BUFFER,mesh.vertices,gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,buffers.indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.indices,gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,buffers.lines);gl.bufferData(gl.ARRAY_BUFFER,mesh.lines,gl.DYNAMIC_DRAW);geometryDirty=false;}
    gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
    const aspect=w/h,half=Math.min(25*M.PI/180,Math.atan(Math.tan(25*M.PI/180)*aspect));
    const distance=Math.max(.3,mesh.radius)/Math.sin(half)*1.10*camera.zoom;
    gl.uniform3fv(locations.uCenter,mesh.center);gl.uniform2f(locations.uAngle,camera.yaw,camera.pitch);gl.uniform2fv(locations.uPan,camera.pan);gl.uniform1f(locations.uDistance,distance);gl.uniform1f(locations.uAspect,aspect);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(locations.uEarth,0);
    gl.uniform1f(locations.uTexture,$('surfaceTexture').checked?1:0);gl.uniform1f(locations.uHeat,$('surfaceHeat').checked?1:0);gl.uniform1f(locations.uGrid,$('surfaceGrid').checked&&state.model==='sphere'?1:0);gl.uniform1f(locations.uLine,0);gl.uniform1f(locations.uPoint,0);
    attributes(buffers.vertices);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,buffers.indices);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,1);gl.drawElements(gl.TRIANGLES,mesh.indices.length,gl.UNSIGNED_SHORT,0);gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.uniform1f(locations.uLine,1);attributes(buffers.lines);gl.drawArrays(gl.LINES,0,mesh.lines.length/11);
    if(state.model==='sphere'){
      const p=sample(),point=M.sphere(p.lambda,p.phi,state.t,state.mode,p.center),n=M.sphereMetric(p.lambda,p.phi,state.t,state.mode,p.center).normal;
      const lifted=M.add(point,M.mul(n,.006));gl.bindBuffer(gl.ARRAY_BUFFER,buffers.point);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([...lifted,...n,0,0,1,1,.72]),gl.DYNAMIC_DRAW);attributes(buffers.point);gl.uniform1f(locations.uPoint,9*dpr);gl.drawArrays(gl.POINTS,0,1);
    }
    camera.distance=distance;
  }
  function requestDraw(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;draw();});}
  function metrics(){
    const c=copy(),p=sample(),isSphere=state.model==='sphere';
    const m=isSphere?M.sphereMetric(p.lambda,p.phi,state.t,state.mode,p.center):{min:1,max:1,area:1};
    $('experimentCalcLink').href=`lab.html?lat=${p.phi*180/M.PI}&lon=${p.lambda*180/M.PI}#point-lab`;
    $('surfaceMin').textContent=f(m.min)+'×';$('surfaceMax').textContent=f(m.max)+'×';$('surfaceArea').textContent=f(m.area)+'×';
    $('metricStage').textContent=`t = ${f(state.t,3)} · ${f(state.t*100,1)}%`;
    $('localHeading').textContent=isSphere?`φ = ${f(p.phi*180/M.PI,1)}° · λ = ${f(p.lambda*180/M.PI,1)}°`:c[state.model];
    $('sampleControls').hidden=!isSphere;
    $('sampleLongitudeLabel').textContent=state.mode==='gores'?c.offset:c.longitude;
    $('samplePosition').textContent=state.mode==='gores'?`λc = ${f(p.center*180/M.PI,2)}° · Δλ = ${f(p.delta*180/M.PI,2)}°`:`λ = ${f(p.lambda*180/M.PI,2)}°`;
    $('goreGap').hidden=!(isSphere&&state.mode==='gores');
    $('goreGap').textContent=`${c.gap}: ${f(M.goreGap(p.phi,state.count))} · ${c.gapUnit}.`;
  }
  function outcome(){
    const c=copy(),done=state.attempt&&state.t>=.9999;
    const key=!state.attempt?'waiting':done?(state.mode==='gores'?'successGores':'successMercator'):'attempting';
    $('experimentOutcome').textContent=c[key];$('experimentOutcome').classList.toggle('complete',!!done);$('experimentConclusion').hidden=!done;
    $('attemptGores').classList.toggle('selected',state.attempt==='gores');$('attemptMercator').classList.toggle('selected',state.attempt==='mercator');
  }
  function updateProgress(){
    $('surfaceTime').value=state.t;$('surfaceProgress').textContent=f(state.t*100,1)+'%';
    $('surfacePlay').textContent=copy()[state.playing?'pause':'play'];
    $('surfaceTime').setAttribute('aria-valuetext',f(state.t*100,1)+'%');metrics();outcome();
  }
  function language(){
    const c=copy();for(const e of document.querySelectorAll('[data-s]'))e.textContent=c[e.dataset.s]||e.dataset.s;
    for(const e of document.querySelectorAll('[data-html]'))e.innerHTML=c[e.dataset.html]||'';
    $('surfaceTextureStatus').textContent=c[state.textureState];
    if(state.graphicsError)$('surfaceGlError').textContent=c[state.graphicsError];
    $('sphereControls').hidden=state.model!=='sphere';$('goreControls').hidden=state.mode!=='gores';$('surfaceGrid').disabled=state.model!=='sphere';
    $('strainLegend').hidden=!$('surfaceHeat').checked;
    const key=state.model==='sphere'?state.mode:state.model;
    $('modelTitle').textContent=c[key];$('modelNote').textContent=c[key+'Note'];
    $('surfaceBadge').textContent=state.model==='sphere'?'K_G = 1/R² > 0':state.model==='cube'?(document.documentElement.lang==='ru'?'K_G = 0 · внутри грани':'K_G = 0 · жақтың ішінде'):state.model==='cone'?'K_G = 0 · ρ > 0':'K_G = 0';
    $('modelFormula').innerHTML={cube:'6 × a²<br>σₘᵢₙ = σₘₐₓ = 1',cylinder:'2πr × h<br>r = 1 · h = 2<br>σₘᵢₙ = σₘₐₓ = 1',cone:'L = 2 · r = 1<br>α = 2πr/L = π<br>σₘᵢₙ = σₘₐₓ = 1',gores:'t = 1: Kₐ = 1<br>σ₊σ₋ = 1<br>σ± = (√(4+a²) ± |a|)/2',mercator:'t = 1: k = sec φ<br>Kₐ = sec²φ<br>|φ| ≤ 85°'}[key];
    for(const b of document.querySelectorAll('[data-model]')){const selected=b.dataset.model===state.model;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));}
    updateProgress();
  }
  function stop(){state.playing=false;state.last=0;$('surfacePlay').textContent=copy().play;}
  function setTime(t){state.t=Math.max(0,Math.min(1,t));geometryDirty=true;updateProgress();requestDraw();}
  function animate(now){
    if(!state.playing)return;
    if(state.last){const elapsed=Math.min((now-state.last)/1000,.1);setTime(state.t+elapsed/7);}
    state.last=now;
    if(state.t>=1){stop();updateProgress();return;}
    requestAnimationFrame(animate);
  }
  function resetCamera(){camera.yaw=-.3;camera.pitch=.15;camera.zoom=1;camera.pan=[0,0];requestDraw();}
  function choose(model,mode=state.mode){stop();state.model=model;state.mode=mode;state.t=0;state.attempt=null;$('sphereMode').value=mode;geometryDirty=true;resetCamera();language();requestDraw();}
  for(const b of document.querySelectorAll('[data-model]'))b.onclick=()=>choose(b.dataset.model);
  $('sphereMode').onchange=e=>choose('sphere',e.target.value);
  $('goreCount').onchange=e=>{state.count=+e.target.value;geometryDirty=true;metrics();requestDraw();};
  $('surfacePlay').onclick=()=>{if(state.playing){stop();return;}if(state.t>=1)setTime(0);state.playing=true;state.last=0;updateProgress();requestAnimationFrame(animate);};
  $('surfaceTime').oninput=e=>{stop();setTime(+e.target.value);};
  for(const id of ['surfaceTexture','surfaceGrid','surfaceHeat'])$(id).onchange=()=>{language();requestDraw();};
  for(const id of ['sampleLatitude','sampleLongitude'])$(id).oninput=()=>{metrics();requestDraw();};
  $('surfaceZoomIn').onclick=()=>zoom(.85);$('surfaceZoomOut').onclick=()=>zoom(1/.85);
  $('surfaceFront').onclick=()=>{camera.yaw=0;camera.pitch=0;camera.pan=[0,0];requestDraw();};
  $('surfaceAngle').onclick=()=>{camera.yaw=-.5;camera.pitch=.3;camera.pan=[0,0];requestDraw();};
  $('surfaceReset').onclick=()=>{stop();setTime(0);resetCamera();};
  function zoom(factor){camera.zoom=Math.max(.35,Math.min(4,camera.zoom*factor));requestDraw();}
  const pointers=new Map();
  canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.focus({preventScroll:true});pointers.set(e.pointerId,[e.clientX,e.clientY]);canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{
    const prev=pointers.get(e.pointerId);if(!prev)return;const before=[...pointers.values()],dx=e.clientX-prev[0],dy=e.clientY-prev[1];pointers.set(e.pointerId,[e.clientX,e.clientY]);
    const size=canvas.getBoundingClientRect(),scale=(camera.distance||6)/(2.1445*Math.max(1,size.height))*2;
    if(pointers.size>1){const after=[...pointers.values()],a=Math.hypot(before[0][0]-before[1][0],before[0][1]-before[1][1]),b=Math.hypot(after[0][0]-after[1][0],after[0][1]-after[1][1]);if(a>0&&b>0)zoom(a/b);camera.pan[0]+=dx*scale/2;camera.pan[1]-=dy*scale/2;}
    else if(e.shiftKey||e.buttons===2){camera.pan[0]+=dx*scale;camera.pan[1]-=dy*scale;}
    else{camera.yaw+=dx*.008;camera.pitch=Math.max(-1.5,Math.min(1.5,camera.pitch+dy*.008));}
    requestDraw();
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>pointers.delete(e.pointerId));
  canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(e.deltaY*.001));},{passive:false});
  canvas.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0'].includes(e.key))return;e.preventDefault();
    if(e.key==='0')resetCamera();else if(e.key==='+'||e.key==='=')zoom(.85);else if(e.key==='-')zoom(1/.85);
    else {camera.yaw+=e.key==='ArrowLeft'?-.12:e.key==='ArrowRight'?.12:0;camera.pitch=Math.max(-1.5,Math.min(1.5,camera.pitch+(e.key==='ArrowUp'?-.12:e.key==='ArrowDown'?.12:0)));requestDraw();}
  });
  function attempt(mode){choose('sphere',mode);state.attempt=mode;$('surfaceHeat').checked=true;$('sampleLatitude').value=60;$('sampleLongitude').value=mode==='gores'?80:36;language();requestDraw();document.querySelector('.surface-lab').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
  $('attemptGores').onclick=()=>attempt('gores');$('attemptMercator').onclick=()=>attempt('mercator');$('attemptReset').onclick=()=>{choose('sphere','gores');outcome();};
  // Use geographic polygons, not invented continent silhouettes or a decorative globe image.
  let textureCanvas=null,texturePromise=null;
  function uploadTexture(){if(!gl||!textureCanvas||contextLost)return;gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,textureCanvas);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);requestDraw();}
  async function loadEarth(){
    if(texturePromise)return texturePromise;
    state.textureState='textureLoading';$('surfaceTextureRetry').hidden=true;language();
    texturePromise=(async()=>{try{
      await Promise.all([ensureScript('d3','https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js','https://unpkg.com/d3@7.9.0/dist/d3.min.js'),ensureScript('topojson','https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js','https://unpkg.com/topojson-client@3.1.0/dist/topojson-client.min.js')]);
      let world=window.MERCATOR_WORLD;if(!world)try{world=await fetchJSON('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json');}catch(e){world=await fetchJSON('https://unpkg.com/world-atlas@2.0.2/countries-110m.json');}
      const land=topojson.feature(world,world.objects.land||world.objects.countries),c=document.createElement('canvas');c.width=2048;c.height=1024;const ctx=c.getContext('2d');
      const grad=ctx.createLinearGradient(0,0,0,1024);grad.addColorStop(0,'#193747');grad.addColorStop(.5,'#23566b');grad.addColorStop(1,'#193747');ctx.fillStyle=grad;ctx.fillRect(0,0,2048,1024);
      const projection=d3.geoEquirectangular().scale(2048/M.TAU).translate([1024,512]).precision(.2),path=d3.geoPath(projection,ctx);
      ctx.beginPath();path(land);ctx.fillStyle='#79b39c';ctx.fill();ctx.strokeStyle='#b2d9bc';ctx.lineWidth=.6;ctx.stroke();
      if(world.objects.countries){ctx.beginPath();path(topojson.mesh(world,world.objects.countries,(a,b)=>a!==b));ctx.strokeStyle='#345e59';ctx.lineWidth=.5;ctx.stroke();}
      textureCanvas=c;uploadTexture();state.textureState='textureReady';
    }catch(e){state.textureState='textureFail';$('surfaceTextureRetry').hidden=false;console.warn('Earth texture unavailable',e);}
    finally{language();texturePromise=null;}})();return texturePromise;
  }
  $('surfaceTextureRetry').onclick=loadEarth;
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();stop();contextLost=true;state.graphicsError='graphicsContextLost';$('surfaceGlError').hidden=false;$('surfaceGlError').textContent=copy().graphicsContextLost;});
  canvas.addEventListener('webglcontextrestored',()=>{initializeGL();uploadTexture();requestDraw();});
  $('surfaceVerify').onclick=()=>{
    let total=0,failed=0,maxError=0;const check=(x,y)=>{total++;const err=Math.abs(x-y);maxError=Math.max(maxError,err);if(!Number.isFinite(x)||err>1e-7)failed++;};
    for(const t of [0,.25,.5,.75,1]){
      for(const u of [-2,-.4,1.7])for(const model of ['cylinder','cone']){const fn=model==='cylinder'?M.cylinder:M.cone,scale=model==='cone'?.35:1;const m=M.finiteMetric((a,b)=>fn(a,b,t),u,.7,scale);check(m.min,1);check(m.max,1);check(m.area,1);}
      for(let i=0;i<6;i++){const m=M.finiteMetric((u,v)=>M.cube(i,u,v,t),.4,.6);check(m.min,1);check(m.max,1);}
      for(const mode of ['gores','mercator']){const m=M.sphereMetric(.3,.8,t,mode,.2),n=M.finiteMetric((u,v)=>M.sphere(u,v,t,mode,.2),.3,.8,Math.cos(.8));check(m.min,n.min);check(m.max,n.max);check(m.area,n.area);}
    }
    const c=copy();$('surfaceTestResults').textContent=`${failed?'CHECK':'PASS'} · ${total-failed}/${total} ${c[failed?'testFail':'testPass']} · max |Δ| = ${maxError.toExponential(2)}`;
  };
  window.addEventListener('resize',requestDraw);document.addEventListener('mercator-language',language);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  initializeGL();language();requestDraw();loadEarth();
})();

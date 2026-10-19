import assert from 'node:assert/strict';
await import('../dist/surface-math.js');
const M=globalThis.SurfaceMath;
let checks=0,worst=0;
function near(a,b,e=3e-8){assert.ok(Number.isFinite(a)&&Math.abs(a-b)<e,`${a} != ${b}`);checks++;worst=Math.max(worst,Math.abs(a-b));}
const ts=[0,.01,.2,.5,.83,.999,1];
for(const t of ts){
  for(const u of [-2.8,-1.7,-.2,.4,2.9]){
    const m=M.finiteMetric((a,b)=>M.cylinder(a,b,t),u,.37);
    near(m.min,1);near(m.max,1);near(m.area,1);
  }
  for(const theta of [-3,-1.3,.4,2.7])for(const rho of [.1,.8,1.9]){
    const m=M.finiteMetric((a,b)=>M.cone(a,b,t),theta,rho,.5*rho,1);
    near(m.min,1);near(m.max,1);near(m.area,1);
  }
  for(let f=0;f<6;f++){
    const a=M.cube(f,0,0,t),b=M.cube(f,1,0,t),c=M.cube(f,1,1,t),d=M.cube(f,0,1,t);
    for(const [p,q] of [[a,b],[b,c],[c,d],[d,a]])near(M.norm(M.sub(p,q)),1);
    near(M.norm(M.sub(a,c)),Math.SQRT2);
    const m=M.finiteMetric((u,v)=>M.cube(f,u,v,t),.3,.7);near(m.min,1);near(m.max,1);
  }
  // Hinges stay joined while all other coincident cube edges may be cut.
  for(const v of [0,.4,1]){
    near(M.norm(M.sub(M.cube(0,1,v,t),M.cube(1,0,v,t))),0);
    near(M.norm(M.sub(M.cube(0,0,v,t),M.cube(2,0,v,t))),0);
    near(M.norm(M.sub(M.cube(0,v,1,t),M.cube(3,v,0,t))),0);
    near(M.norm(M.sub(M.cube(0,v,0,t),M.cube(4,v,0,t))),0);
    near(M.norm(M.sub(M.cube(3,v,1,t),M.cube(5,v,0,t))),0);
  }
}
for(const phi of [-1.3,-.8,0,.6,1.4])for(const lambda of [-2.8,-.4,1.8]){
  const expected=1/Math.cos(phi),m=M.sphereMetric(lambda,phi,1,'mercator');
  near(m.min,expected);near(m.max,expected);near(m.area,expected**2);
  for(const center of [lambda-.1,lambda,lambda+.1]){
    const m=M.sphereMetric(lambda,phi,1,'gores',center);near(m.area,1);near(m.min*m.max,1);
    if(phi!==0&&lambda!==center){assert.ok(m.max>1&&m.min<1);checks++;}
    for(const t of ts){
      const m=M.sphereMetric(lambda,phi,t,'gores',center);
      const n=M.finiteMetric((a,b)=>M.sphere(a,b,t,'gores',center),lambda,phi,Math.cos(phi),1);
      near(m.min,n.min);near(m.max,n.max);near(m.area,n.area);
    }
  }
}
for(const n of [6,12,24,48])for(const phi of [0,.7,1.2]){
  const step=M.TAU/n,left=M.sphere(step/2,phi,1,'gores',0),right=M.sphere(step/2,phi,1,'gores',step);
  near(right[0]-left[0],M.goreGap(phi,n));
}
for(const t of ts)for(const phi of [-1,.4,1.3]){
  const a=M.sphereMetric(.5,phi,t,'mercator');
  const b=M.finiteMetric((u,v)=>M.sphere(u,v,t,'mercator'),.5,phi,Math.cos(phi),1);
  near(a.min,b.min);near(a.max,b.max);near(a.area,b.area);
}
for(const p of [M.cylinder(1,.6,1),M.cone(1,2,1),...Array.from({length:6},(_,f)=>M.cube(f,.4,.3,1)),M.sphere(.2,.6,1,'gores'),M.sphere(.2,.6,1,'mercator')])near(p[2],0);
near(M.norm(M.sub(M.cylinder(Math.PI,0,1),M.cylinder(-Math.PI,0,1))),2*Math.PI);
near(M.norm(M.sub(M.cone(-Math.PI,2,1),[0,1,0])),2); // sector radius is slant height
assert.throws(()=>M.sphere(0,Math.PI/2,1,'mercator'),RangeError);checks++;
console.log(`Surface geometry: ${checks} assertions PASS; largest absolute numerical difference ${worst.toExponential(3)}.`);

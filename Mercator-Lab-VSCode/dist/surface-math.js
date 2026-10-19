/* Pure differential geometry. Model lengths use R = 1; angles are radians.
 * Cylinders/cones are exact smooth isometries; WebGL samples these surfaces.
 * Sphere morphs deliberately deform. No isometry of a spherical patch is claimed.
 */
(function(root){
  'use strict';
  const PI=Math.PI, TAU=2*PI;
  const add=(a,b)=>a.map((x,i)=>x+b[i]);
  const mul=(a,k)=>a.map(x=>x*k);
  const sub=(a,b)=>a.map((x,i)=>x-b[i]);
  const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const norm=a=>Math.hypot(...a);
  const unit=a=>mul(a,1/(norm(a)||1));
  const mix=(a,b,t)=>add(mul(a,1-t),mul(b,t));
  function cylinder(u,v,t,r=1){
    const b=1-t;
    if(b<1e-9)return [r*u,v,0];
    return [r*Math.sin(b*u)/b,v,-2*r*Math.sin(b*u/2)**2/b+b*r];
  }
  // rho = slant distance from apex; q0 = base radius / slant height.
  // Changing cone angle while rescaling azimuth keeps dρ²+(q0 ρ)²dθ².
  function cone(theta,rho,t,q0=.5){
    const q=q0+(1-q0)*t,b=q0*theta/q,h=Math.sqrt(Math.max(0,1-q*q));
    // A time-dependent rigid rotation puts the axis upright initially and the final sector in XY.
    const a=(1-t)*PI/2,y=-rho*q*Math.cos(b),z=rho*h;
    return [rho*q*Math.sin(b),1+y*Math.cos(a)-z*Math.sin(a),y*Math.sin(a)+z*Math.cos(a)];
  }
  function cube(face,u,v,t){
    const a=(1-t)*PI/2,c=Math.cos(a),s=Math.sin(a);
    switch(face){
      case 0:return [u-.5,v-.5,0];
      case 1:return [.5+u*c,v-.5,-u*s];
      case 2:return [-.5-u*c,v-.5,-u*s];
      case 3:return [u-.5,.5+v*c,-v*s];
      case 4:return [u-.5,-.5-v*c,-v*s];
      case 5:return [u-.5,.5+c+v*Math.cos(2*a),-s-v*Math.sin(2*a)];
      default:throw Error('Unknown cube face');
    }
  }
  function globe(lambda,phi){const c=Math.cos(phi);return [c*Math.sin(lambda),Math.sin(phi),c*Math.cos(lambda)];}
  function sphere(lambda,phi,t,mode='gores',center=0){
    if(mode==='mercator'&&Math.abs(phi)>=PI/2)throw RangeError('Mercator excludes poles');
    const target=mode==='mercator'?[lambda,Math.asinh(Math.tan(phi)),0]:[center+(lambda-center)*Math.cos(phi),phi,0];
    return mix(globe(lambda,phi),target,t);
  }
  function singular(east,north){
    const a=dot(east,east),b=dot(east,north),c=dot(north,north);
    const disc=Math.hypot(a-c,2*b),hi=Math.sqrt(Math.max(0,(a+c+disc)/2));
    const area=norm(cross(east,north));
    return {min:hi>1e-14?area/hi:0,max:hi,area,normal:unit(cross(east,north))};
  }
  function sphereMetric(lambda,phi,t,mode='gores',center=0){
    const c=Math.cos(phi),s=Math.sin(phi);
    if(mode==='mercator'&&Math.abs(phi)>=PI/2)throw RangeError('Mercator excludes poles');
    const east0=[Math.cos(lambda),0,-Math.sin(lambda)];
    const north0=[-s*Math.sin(lambda),c,-s*Math.cos(lambda)];
    const east1=mode==='mercator'?[1/c,0,0]:[1,0,0];
    const north1=mode==='mercator'?[0,1/c,0]:[-(lambda-center)*s,1,0];
    return singular(mix(east0,east1,t),mix(north0,north1,t));
  }
  function goreGap(phi,count){return TAU/count*(1-Math.cos(phi));}
  function finiteMetric(fn,u,v,duScale=1,dvScale=1){
    const h=1e-5;
    return singular(mul(sub(fn(u+h,v),fn(u-h,v)),1/(2*h*duScale)),mul(sub(fn(u,v+h),fn(u,v-h)),1/(2*h*dvScale)));
  }
  function earthUV(point){const r=norm(point);if(r<1e-12)return [.5,.5];return [.5+Math.atan2(point[0],point[2])/TAU,.5+Math.asin(Math.max(-1,Math.min(1,point[1]/r)))/PI];}
  // Continuous principal stretches: cyan compression, neutral green, orange stretching.
  function color(m){
    const stretch=Math.log2(Math.max(1,m.max)),shrink=-Math.log2(Math.max(1e-8,Math.min(1,m.min)));
    const neutral=[.27,.78,.65],target=stretch+1e-10>=shrink?[1,.39,.12]:[.24,.48,1];
    const a=Math.min(1,Math.max(stretch,shrink)/2);
    return mix(neutral,target,a);
  }
  root.SurfaceMath={PI,TAU,add,mul,sub,dot,cross,norm,unit,mix,cylinder,cone,cube,globe,sphere,sphereMetric,singular,goreGap,finiteMetric,earthUV,color};
})(typeof window!=='undefined'?window:globalThis);

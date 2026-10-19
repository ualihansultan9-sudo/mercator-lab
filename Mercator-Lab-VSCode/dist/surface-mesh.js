/* Tessellated samples of the exact maps in surface-math.js. No rendering dependency. */
(function(root){
  'use strict';
  const M=root.SurfaceMath,TAU=M.TAU,PI=M.PI;
  function build({model='sphere',mode='gores',count=12,t=0}){
    const verts=[],indices=[],lines=[];let low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];
    const neutral=[.27,.78,.65],cut=[1,.57,.30],boundary=[.6,.79,.83],hinge=[.33,.85,.74];
    function addVertex(p,n,uv,col){for(let k=0;k<3;k++){low[k]=Math.min(low[k],p[k]);high[k]=Math.max(high[k],p[k]);}verts.push(...p,...n,...uv,...col);return verts.length/11-1;}
    function triangle(a,b,c){
      const ids=[a,b,c],us=ids.map(i=>verts[i*11+6]);
      if(Math.max(...us)-Math.min(...us)>.5){for(let k=0;k<3;k++)if(us[k]<.5){const v=verts.slice(ids[k]*11,ids[k]*11+11);v[6]+=1;ids[k]=verts.length/11;verts.push(...v);}}
      indices.push(...ids);
    }
    function edge(fn,ua,va,ub,vb,segments,col){for(let j=0;j<segments;j++)for(const f of [j/segments,(j+1)/segments])lines.push(...fn(ua+(ub-ua)*f,va+(vb-va)*f),0,0,1,0,0,...col);}
    function patch(fn,uvfn,normfn,metric,nu,nv,u0,u1,v0,v1,edges){
      const base=verts.length/11;
      for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){
        const u=u0+(u1-u0)*i/nu,v=v0+(v1-v0)*j/nv,p=fn(u,v),m=metric?metric(u,v):null;
        addVertex(p,m?m.normal:normfn(u,v),uvfn(u,v),m?M.color(m):neutral);
      }
      for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=base+j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;triangle(a,b,d);triangle(a,d,c);}
      if(edges){edge(fn,u0,v0,u0,v1,nv,edges[0]);edge(fn,u1,v0,u1,v1,nv,edges[1]);edge(fn,u0,v0,u1,v0,nu,edges[2]);edge(fn,u0,v1,u1,v1,nu,edges[3]);}
    }
    if(model==='cube'){
      for(let f=0;f<6;f++){
        const fn=(u,v)=>M.cube(f,u,v,t),p=fn(0,0),n=M.unit(M.cross(M.sub(fn(1,0),p),M.sub(fn(0,1),p)));
        const colors=f===0?[hinge,hinge,hinge,hinge]:f===3?[cut,cut,hinge,hinge]:f===4||f===5?[cut,cut,hinge,cut]:[hinge,cut,cut,cut];
        patch(fn,(u,v)=>M.earthUV(M.add(M.cube(f,u,v,0),[0,0,.5])),()=>n,null,12,12,0,1,0,1,colors);
      }
    }else if(model==='cylinder'){
      patch((u,v)=>M.cylinder(u,v,t),(u,v)=>[.5+u/TAU,(v+1)/2],u=>[Math.sin((1-t)*u),0,Math.cos((1-t)*u)],null,128,24,-PI,PI,-1,1,[cut,cut,boundary,boundary]);
    }else if(model==='cone'){
      const fn=(u,v)=>M.cone(u,v,t);
      patch(fn,(u,v)=>[.5+u/TAU,1-v/2],(u,v)=>M.finiteMetric(fn,u,Math.max(v,.001)).normal,null,128,32,-PI,PI,0,2,[cut,cut,boundary,boundary]);
    }else{
      const n=mode==='gores'?count:1,half=mode==='mercator'?85*PI/180:PI/2;
      for(let i=0;i<n;i++){
        const u0=-PI+TAU*i/n,u1=-PI+TAU*(i+1)/n,center=(u0+u1)/2;
        const fn=(u,v)=>M.sphere(u,v,t,mode,center);
        patch(fn,(u,v)=>[.5+u/TAU,.5+v/PI],null,(u,v)=>M.sphereMetric(u,v,t,mode,center),Math.max(4,Math.ceil(144/n)),64,u0,u1,-half,half,[cut,cut,boundary,boundary]);
      }
    }
    const center=low.map((x,i)=>(x+high[i])/2);let radius=0;
    for(let i=0;i<verts.length;i+=11)radius=Math.max(radius,M.norm(M.sub(verts.slice(i,i+3),center)));
    if(verts.length/11>=65536)throw Error('Mesh exceeds WebGL 1 index range');
    return {vertices:new Float32Array(verts),indices:new Uint16Array(indices),lines:new Float32Array(lines),center,radius};
  }
  root.SurfaceMesh={build};
})(typeof window!=='undefined'?window:globalThis);

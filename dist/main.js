(()=>{function f(c,s=5,e=navigator.hardwareConcurrency||1){return new Promise((t,a)=>{let n=URL.createObjectURL(new Blob(["(",m(),")()"],{type:"application/javascript"})),o=[];for(let i=0;i<e;i++){let r=new Worker(n);r.onmessage=l=>{o.forEach(d=>d.terminate()),r.terminate(),t(l.data)},r.onerror=l=>{r.terminate(),a()},r.postMessage({data:c,difficulty:s,nonce:i,threads:e}),o.push(r)}URL.revokeObjectURL(n)})}function m(){return function(){let c=e=>{let t=new TextEncoder().encode(e);return crypto.subtle.digest("SHA-256",t.buffer)};function s(e){return Array.from(e).map(t=>t.toString(16).padStart(2,"0")).join("")}addEventListener("message",async e=>{let t=e.data.data,a=e.data.difficulty,n,o=e.data.nonce,i=e.data.threads;for(;;){let r=await c(t+o),l=new Uint8Array(r),d=!0;for(let u=0;u<a;u++){let w=Math.floor(u/2),h=u%2;if((l[w]>>(h===0?4:0)&15)!==0){d=!1;break}}if(d){n=s(l),console.log(n);break}o+=i}postMessage({hash:n,data:t,difficulty:a,nonce:o})})}.toString()}var g=(c="",s={})=>{let e=new URL(c,window.location.href);return Object.entries(s).forEach(t=>{let[a,n]=t;e.searchParams.set(a,n)}),e.toString()};(async()=>{let c=document.getElementById("content"),s=document.getElementById("title"),e=JSON.parse(document.getElementById("challenge").textContent),t=JSON.parse(document.getElementById("difficulty").textContent),a=Date.now(),{hash:n,nonce:o}=await f(e,t),i=Date.now();console.log({hash:n,nonce:o}),s.innerHTML="Success!",c.innerHTML=`Done! Took ${i-a}ms, ${o} iterations`,setTimeout(()=>{let r=window.location.href,l=window.location.origin+window.location.pathname;window.location.href=g(l,{cerberus:!0,response:n,nonce:o,redir:r})},250)})();})();

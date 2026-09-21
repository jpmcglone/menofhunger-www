/** Rumble's JS embed owns its controls/ads; the app only bridges its exposed playback API. */
export function rumbleDocument(embedURL: string, channel: string, parentOrigin: string): string {
  const url = new URL(embedURL)
  if (url.protocol !== 'https:' || url.hostname !== 'rumble.com' || !/^\/embed\/[a-z0-9.]+\/?$/i.test(url.pathname)) throw new Error('Invalid Rumble embed')
  const raw = url.pathname.split('/').filter(Boolean)[1]!
  const [publisher, video] = raw.includes('.') ? raw.split('.') : [null, raw]
  const pub = publisher ?? (url.searchParams.get('pub') ? `u${url.searchParams.get('pub')}` : 'u7a20')
  if (!/^u[a-z0-9]+$/i.test(pub)) throw new Error('Invalid Rumble publisher')
  const json = (v: unknown) => JSON.stringify(v).replaceAll('<', '\\u003c')
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><style>html,body,#player{margin:0;width:100%;height:100%;background:#000;overflow:hidden}</style></head><body><div id="player"></div><script>
const channel=${json(channel)}, parentOrigin=${json(parentOrigin)}; let api, startTimer, readyAt=0;
function report(state){ if(!api)return; parent.postMessage({channel,state,muted:api.getMuted(),volume:api.getMuted()?null:api.getVolume(),time:api.getCurrentTime(),paused:api.getPaused()},parentOrigin); }
window.Rumble=window.Rumble||function(){(Rumble._=Rumble._||[]).push(arguments)};
Rumble('play',{video:${json(video)},div:'player',resize:'full',api:function(player){
 api=player; readyAt=Date.now()+500; api.mute();
 ['play','pause','videoEnd','error','mute','volumeChange','videoTime','fullscreen'].forEach(function(name){ api.on(name,function(value){ if(name==='fullscreen')parent.postMessage({channel,state:'fullscreen',value:!!value},parentOrigin); else report(name); }); });
 report('ready');
}});
addEventListener('message',function(event){ if(event.source!==parent||event.origin!==parentOrigin||event.data?.channel!==channel||!api)return;
 const d=event.data; if(d.action==='pause'){clearTimeout(startTimer);api.pause();}
 if(d.action==='audio'||d.action==='play'){ if(Number.isFinite(d.volume))api.setVolume(Math.max(0,Math.min(1,d.volume))); if(d.muted)api.mute();else api.unmute(); }
 if(d.action==='play'){ clearTimeout(startTimer); startTimer=setTimeout(function(){ if(Number.isFinite(d.time)&&d.time>0)api.setCurrentTime(d.time); api.autoplay(!d.muted); },Math.max(0,readyAt-Date.now())); }
});
const loader=document.createElement('script');
loader.src=${json(`https://rumble.com/embedJS/${pub}.${video}/`)};
loader.onerror=function(){parent.postMessage({channel,state:'error'},parentOrigin);};
document.head.appendChild(loader);
</script></body></html>`
}

/* A stand-in for Supabase Realtime: same Phoenix framing, so the game's transport
   can be exercised end to end without touching the real service. */
import {WebSocketServer} from 'ws';
export function start(port){
  const wss=new WebSocketServer({port});
  const rooms=new Map();
  wss.on('connection',(ws,req)=>{
    const url=new URL(req.url,'http://x');
    ws._key=url.searchParams.get('apikey');
    ws._topic=null;
    ws.on('message',raw=>{
      let m; try{ m=JSON.parse(raw) }catch(e){ return }
      if(m.event==='heartbeat'){ ws.send(JSON.stringify({topic:'phoenix',event:'phx_reply',ref:m.ref,payload:{status:'ok',response:{}}})); return }
      if(m.event==='phx_join'){
        if(!ws._key||ws._key==='bad'){ ws.send(JSON.stringify({topic:m.topic,event:'phx_reply',ref:m.ref,payload:{status:'error',response:{reason:'bad key'}}})); return }
        ws._topic=m.topic;
        if(!rooms.has(m.topic)) rooms.set(m.topic,new Set());
        rooms.get(m.topic).add(ws);
        ws.send(JSON.stringify({topic:m.topic,event:'phx_reply',ref:m.ref,payload:{status:'ok',response:{}}}));
        return;
      }
      if(m.event==='broadcast'&&ws._topic){
        for(const peer of rooms.get(ws._topic)||[]){
          if(peer===ws) continue;                    // self:false
          if(peer.readyState===1) peer.send(JSON.stringify({topic:ws._topic,event:'broadcast',payload:m.payload}));
        }
      }
    });
    ws.on('close',()=>{ if(ws._topic&&rooms.has(ws._topic)) rooms.get(ws._topic).delete(ws) });
  });
  return wss;
}

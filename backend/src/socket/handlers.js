function setupSocketHandlers(io,scanService){io.on('connection',socket=>{socket.on('scan:join',id=>socket.join(`scan:${id}`));socket.on('scan:leave',id=>socket.leave(`scan:${id}`));socket.on('alerts:subscribe',()=>socket.join('alerts'));socket.emit('server:ready',{timestamp:new Date().toISOString()});});}
module.exports={setupSocketHandlers};

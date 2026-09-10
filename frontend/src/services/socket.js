import { io } from 'socket.io-client';
class SocketService { constructor(){this.socket=null;this.listeners=new Map();}
 connect(){if(this.socket?.connected)return Promise.resolve(this.socket);return new Promise((resolve,reject)=>{this.socket=io('/',{transports:['websocket','polling'],reconnection:true,reconnectionAttempts:8});this.socket.on('connect',()=>{this.emit('connected',{socketId:this.socket.id});resolve(this.socket)});this.socket.on('disconnect',r=>this.emit('disconnected',{reason:r}));this.socket.on('connect_error',e=>{this.emit('connectionError',e);reject(e)});this.socket.onAny((name,...args)=>this.emit(name,...args));});}
 disconnect(){this.socket?.disconnect();this.socket=null;}
 joinScanRoom(id){this.socket?.emit('scan:join',id)} leaveScanRoom(id){this.socket?.emit('scan:leave',id)}
 on(event,cb){if(!this.listeners.has(event))this.listeners.set(event,new Set());this.listeners.get(event).add(cb);return()=>this.off(event,cb)} off(event,cb){this.listeners.get(event)?.delete(cb)} emit(event,...args){this.listeners.get(event)?.forEach(cb=>cb(...args));}
}
export const socketService=new SocketService();export default socketService;

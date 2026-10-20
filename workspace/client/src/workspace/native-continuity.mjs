// Capacitor-compatible lifecycle boundary. App/Network are injected by the
// future Android/iOS shell; the web client adds no native SDK dependency.
// Resume is a retry hint, never proof that background WebRTC stayed alive.
export async function attachNativeContinuityLifecycle(controller,{app,network}){
 const listeners=[],resume=()=>controller.tick().catch(()=>{});
 if(app)listeners.push(await app.addListener('appStateChange',state=>{if(state.isActive)resume()}));
 if(network)listeners.push(await network.addListener('networkStatusChange',state=>{if(state.connected)resume()}));
 return async()=>{for(const listener of listeners)await listener.remove()};
}

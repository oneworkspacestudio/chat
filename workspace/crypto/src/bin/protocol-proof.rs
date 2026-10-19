//! Test-only stdin/stdout interoperability harness. Not a server, device
//! enrolment flow, recovery tool or application key service.
use std::io::{self, BufRead, Write};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use oneworkspace_chat_crypto::ProofClient;
use serde_json::{json, Value};

fn bytes(value:&Value,name:&str)->Result<Vec<u8>,String>{B64.decode(value[name].as_str().ok_or("field missing")?).map_err(|_|"invalid encoding".into())}
fn run(client:&mut Option<ProofClient>,value:Value)->Result<Value,String>{
 if value["op"]=="init"{
  let identity=value["identity"].as_str().ok_or("identity missing")?;
  if !identity.starts_with("synthetic-"){return Err("synthetic test identities only".into())}
  let new=ProofClient::new(identity.into())?;let result=json!({"key":B64.encode(new.public_key())});*client=Some(new);return Ok(result)
 }
 let current=client.as_ref().ok_or("initialise test client first")?;
 match value["op"].as_str().ok_or("operation missing")?{
  "create"=>{current.create_group(bytes(&value,"id")?)?;Ok(json!({"created":true}))},
  "add"=>Ok(serde_json::from_str(&current.add(bytes(&value,"id")?,bytes(&value,"package")?,bytes(&value,"key")?)?).map_err(|_|"invalid result")?),
  "encrypt"=>Ok(json!({"message":B64.encode(current.encrypt(bytes(&value,"id")?,bytes(&value,"aad")?,bytes(&value,"content")?)?)})),
  "process"=>Ok(serde_json::from_str(&current.process(bytes(&value,"id")?,bytes(&value,"message")?)?).map_err(|_|"invalid result")?),
  _=>Err("unknown test operation".into())
 }
}
fn main(){
 let mut client=None;
 for line in io::stdin().lock().lines(){
  let response=match line{
   Ok(line) if line.len()<=2*1024*1024=>match serde_json::from_str(&line){Ok(value)=>match run(&mut client,value){Ok(result)=>json!({"ok":true,"result":result}),Err(_)=>json!({"ok":false,"rejected":true})},Err(_)=>json!({"ok":false,"rejected":true})},
   _=>json!({"ok":false,"rejected":true})
  };
  println!("{}",response);let _=io::stdout().flush();
 }
}

//! Shared OpenMLS integration proof. It is deliberately not exposed as a
//! production keystore until application identity/roster/origin gates pass.
//! No cryptographic primitives are implemented in this adapter.
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use openmls::prelude::*;
use openmls_basic_credential::SignatureKeyPair;
use openmls_rust_crypto::OpenMlsRustCrypto;
use openmls_traits::OpenMlsProvider;
use serde::{Deserialize, Serialize};
use ::tls_codec::{Deserialize as TlsDeserialize, Serialize as TlsSerialize};
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

const SUITE: Ciphersuite = Ciphersuite::MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519;
fn failure(e: impl std::fmt::Debug) -> String { format!("MLS operation rejected: {e:?}") }

#[derive(Serialize, Deserialize)]
struct Snapshot {
    identity: String,
    signer: SignatureKeyPair,
    records: Vec<(Vec<u8>, Vec<u8>)>,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub struct ProofClient {
    provider: OpenMlsRustCrypto,
    signer: SignatureKeyPair,
    credential: CredentialWithKey,
    identity: String,
    decrypt_only: bool,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
impl ProofClient {
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen(constructor))]
    pub fn new(identity: String) -> Result<ProofClient, String> {
        if identity.is_empty() || identity.len() > 512 { return Err("Invalid device identity".into()); }
        let provider = OpenMlsRustCrypto::default();
        let signer = SignatureKeyPair::new(SUITE.signature_algorithm()).map_err(failure)?;
        signer.store(provider.storage()).map_err(failure)?;
        let credential = CredentialWithKey { credential: BasicCredential::new(identity.as_bytes().to_vec()).into(), signature_key: signer.public().into() };
        Ok(Self {provider,signer,credential,identity,decrypt_only:false})
    }

    pub fn public_key(&self) -> Vec<u8> { self.signer.public().to_vec() }

    pub fn key_package(&self) -> Result<Vec<u8>, String> {
        self.require_fresh_sender()?;
        KeyPackage::builder().build(SUITE,&self.provider,&self.signer,self.credential.clone())
            .map_err(failure)?.key_package().tls_serialize_detached().map_err(failure)
    }

    pub fn create_group(&self, id: Vec<u8>) -> Result<(),String> {
        self.require_fresh_sender()?;
        if id.is_empty() || id.len()>128 { return Err("Invalid conversation ID".into()); }
        if MlsGroup::load(self.provider.storage(),&GroupId::from_slice(&id)).map_err(failure)?.is_some() {return Err("Group already exists".into());}
        MlsGroup::builder().ciphersuite(SUITE).use_ratchet_tree_extension(true)
            .with_group_id(GroupId::from_slice(&id)).build(&self.provider,&self.signer,self.credential.clone()).map_err(failure)?;
        Ok(())
    }

    /// Caller supplies an already-approved, pinned device signature key. This
    /// rejects replacement key packages even if the delivery server supplies one.
    pub fn add(&self,id:Vec<u8>,package:Vec<u8>,expected_key:Vec<u8>) -> Result<String,String> {
        self.require_fresh_sender()?;
        let input=KeyPackageIn::tls_deserialize_exact(package).map_err(failure)?;
        let kp=input.validate(self.provider.crypto(),ProtocolVersion::Mls10).map_err(failure)?;
        if kp.leaf_node().signature_key().as_slice()!=expected_key {return Err("Device key differs from approved key".into());}
        let mut group=self.group(&id)?;
        let (commit,welcome,_)=group.add_members(&self.provider,&self.signer,&[kp]).map_err(failure)?;
        group.merge_pending_commit(&self.provider).map_err(failure)?;
        serde_json::to_string(&serde_json::json!({"commit":B64.encode(commit.tls_serialize_detached().map_err(failure)?),"welcome":B64.encode(welcome.tls_serialize_detached().map_err(failure)?)})).map_err(failure)
    }

    pub fn join(&self, welcome:Vec<u8>) -> Result<Vec<u8>,String> {
        let message=MlsMessageIn::tls_deserialize_exact(welcome).map_err(failure)?;
        let welcome=match message.extract(){MlsMessageBodyIn::Welcome(w)=>w,_=>return Err("Expected MLS Welcome".into())};
        let config=MlsGroupJoinConfig::builder().build();
        let group=StagedWelcome::new_from_welcome(&self.provider,&config,welcome,None).map_err(failure)?.into_group(&self.provider).map_err(failure)?;
        Ok(group.group_id().as_slice().to_vec())
    }

    pub fn encrypt(&self,id:Vec<u8>,aad:Vec<u8>,plaintext:Vec<u8>) -> Result<Vec<u8>,String> {
        self.require_fresh_sender()?;
        if plaintext.len()>262144 || aad.is_empty() || aad.len()>2048{return Err("Invalid application envelope limits".into());}
        let mut group=self.group(&id)?;
        group.set_aad(aad);
        group.create_message(&self.provider,&self.signer,&plaintext).map_err(failure)?.tls_serialize_detached().map_err(failure)
    }

    /// Proof API returns authenticated AAD and sender credential to the caller
    /// for application binding checks. No plaintext is written to server state.
    pub fn process(&self,id:Vec<u8>,message:Vec<u8>) -> Result<String,String> {
        let mut group=self.group(&id)?;
        let input=MlsMessageIn::tls_deserialize_exact(message).map_err(failure)?.try_into_protocol_message().map_err(failure)?;
        let processed=group.process_message(&self.provider,input).map_err(failure)?;
        let aad=B64.encode(processed.aad());
        let identity=B64.encode(processed.credential().serialized_content());
        match processed.into_content(){
            ProcessedMessageContent::ApplicationMessage(msg)=>serde_json::to_string(&serde_json::json!({"kind":"application","aad":aad,"identity":identity,"content":B64.encode(msg.into_bytes())})).map_err(failure),
            // Application policy must validate a staged commit before merging.
            // This proof deliberately fails closed until roster policy is wired.
            _=>Err("Membership change requires verified application policy".into())
        }
    }

    // Snapshot contains private material. Only client encrypted storage/recovery
    // may consume it. Restored snapshots cannot resume sending without roster /
    // epoch reconciliation, which the eventual application integration must gate.
    pub fn snapshot(&self)->Result<String,String>{
        let signer=serde_json::from_str(&serde_json::to_string(&self.signer).map_err(failure)?).map_err(failure)?;
        let records=self.provider.storage().values.read().map_err(failure)?.iter().map(|(k,v)|(k.clone(),v.clone())).collect();
        serde_json::to_string(&Snapshot{identity:self.identity.clone(),signer,records}).map_err(failure)
    }
    pub fn restore(snapshot:String)->Result<ProofClient,String>{
        if snapshot.len()>16*1024*1024{return Err("Snapshot too large".into());}
        let state:Snapshot=serde_json::from_str(&snapshot).map_err(failure)?;
        let provider=OpenMlsRustCrypto::default();
        *provider.storage().values.write().map_err(failure)?=state.records.into_iter().collect();
        let credential=CredentialWithKey{credential:BasicCredential::new(state.identity.as_bytes().to_vec()).into(),signature_key:state.signer.public().into()};
        Ok(Self{provider,signer:state.signer,credential,identity:state.identity,decrypt_only:true})
    }
}
impl ProofClient {
 fn require_fresh_sender(&self)->Result<(),String>{if self.decrypt_only {Err("Recovered snapshots are decrypt-only; enrol a fresh authorised device before sending".into())}else{Ok(())}}
 fn group(&self,id:&[u8])->Result<MlsGroup,String>{MlsGroup::load(self.provider.storage(),&GroupId::from_slice(id)).map_err(failure)?.ok_or_else(||"Unknown conversation".into())}
}

#[cfg(test)]
mod tests {
 use super::*;
 #[test]
 fn two_clients_bind_tamper_replay_and_restore(){
  let alice=ProofClient::new("synthetic-alice-device".into()).unwrap();
  let bob=ProofClient::new("synthetic-bob-device".into()).unwrap();
  let id=b"synthetic-conversation-v1".to_vec();alice.create_group(id.clone()).unwrap();
  assert!(alice.add(id.clone(),bob.key_package().unwrap(),alice.public_key()).is_err());
  let added:serde_json::Value=serde_json::from_str(&alice.add(id.clone(),bob.key_package().unwrap(),bob.public_key()).unwrap()).unwrap();
  assert_eq!(bob.join(B64.decode(added["welcome"].as_str().unwrap()).unwrap()).unwrap(),id);
  let message=alice.encrypt(id.clone(),b"v1|conversation|alice|message-1".to_vec(),b"synthetic private content".to_vec()).unwrap();
  // Group IDs and authenticated routing metadata remain visible in MLS.
  assert!(!message.windows(b"synthetic private content".len()).any(|w|w==b"synthetic private content"));
  let mut tampered=message.clone();let n=tampered.len();tampered[n-1]^=1;assert!(bob.process(id.clone(),tampered).is_err());
  let plain:serde_json::Value=serde_json::from_str(&bob.process(id.clone(),message.clone()).unwrap()).unwrap();
  assert_eq!(B64.decode(plain["content"].as_str().unwrap()).unwrap(),b"synthetic private content");
  assert!(bob.process(id.clone(),message.clone()).is_err());
  let restored=ProofClient::restore(bob.snapshot().unwrap()).unwrap();assert!(restored.process(id.clone(),message).is_err());
  assert!(restored.encrypt(id,b"replayed-snapshot".to_vec(),b"must-not-send".to_vec()).is_err());
  assert!(restored.key_package().is_err());
 }
}

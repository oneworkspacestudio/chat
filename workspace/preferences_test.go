//go:build windows

package workspace

import (
 "context"
 "encoding/json"
 "net/http"
 "net/http/httptest"
 "strings"
 "testing"
 "time"
 auth "github.com/tinode/chat/server/auth/workspace"
)

func TestPreferencesIdentityConflictAndOrigin(t *testing.T) {
 g,err:=NewGateway(context.Background(),Config{Data:t.TempDir(),Origin:"http://localhost:20906/chat"},[]byte(strings.Repeat("k",32)),"api-key","http://127.0.0.1:20907","")
 if err!=nil{t.Fatal(err)}
 ctx,cancel:=context.WithCancel(context.Background());defer cancel()
 for _,name:=range []string{"alice","bob"}{g.sessions[name]=&loginSession{Ticket:auth.Ticket{Issuer:"https://accounts.example.test",Subject:name},Expires:time.Now().Add(time.Minute),Context:ctx,Cancel:func(){}}}
 request:=func(method,user,origin,etag,body string)*httptest.ResponseRecorder{
  req:=httptest.NewRequest(method,"http://localhost:20906/chat/api/preferences",strings.NewReader(body))
  if user!=""{req.AddCookie(&http.Cookie{Name:"chat_session",Value:user})};req.Header.Set("Origin",origin);req.Header.Set("If-Match",etag)
  result:=httptest.NewRecorder();g.ServeHTTP(result,req);return result
 }
 if r:=request("GET","","","","");r.Code!=401{t.Fatalf("anonymous returned %d",r.Code)}
 original:=request("GET","alice","","","")
 if original.Code!=200||original.Header().Get("ETag")!=`"0"`{t.Fatalf("initial preferences: %d",original.Code)}
 body:=`{"lists":[{"id":"family","name":"Family","topics":["usrBBBBBBBBBBB"]}],"favourites":["usrBBBBBBBBBBB"]}`
 if r:=request("PUT","alice","https://outsider.example.test",`"0"`,body);r.Code!=403{t.Fatalf("foreign origin returned %d",r.Code)}
 r:=request("PUT","alice","http://localhost:20906",`"0"`,body)
 if r.Code!=200||r.Header().Get("ETag")!=`"1"`{t.Fatalf("saved preferences: %d %s",r.Code,r.Body.String())}
 if r:=request("PUT","alice","http://localhost:20906",`"0"`,body);r.Code!=409{t.Fatalf("stale update returned %d",r.Code)}
 var saved preferences
 if err:=json.Unmarshal(request("GET","alice","","","").Body.Bytes(),&saved);err!=nil||len(saved.Lists)!=1||saved.Lists[0].Name!="Family"{t.Fatal("saved list was not retained")}
 var other preferences
 if err:=json.Unmarshal(request("GET","bob","","","").Body.Bytes(),&other);err!=nil||len(other.Lists)!=0||len(other.Favourites)!=0{t.Fatal("preferences leaked across accounts")}
 if r:=request("PUT","alice","http://localhost:20906",`"1"`,`{"lists":[{"id":"x","name":"","topics":[]}]}`);r.Code!=400{t.Fatalf("invalid list returned %d",r.Code)}
 if r:=request("PUT","alice","http://localhost:20906",`"1"`,`{"lists":[],"favourites":[],"unknown":true}`);r.Code!=400{t.Fatalf("unknown fields returned %d",r.Code)}
 if r:=request("PUT","alice","http://localhost:20906",`"1"`,body+body);r.Code!=400{t.Fatalf("trailing JSON returned %d",r.Code)}
}

param([Parameter(Mandatory=$true)][string]$FixtureRoot)
$ErrorActionPreference='Stop'
if([IO.Path]::GetFullPath($FixtureRoot).Replace('\','/') -cne 'C:/Projects/.cache/chat-parity-20261019/fixture'){throw 'Only the isolated primary fixture is allowed'}
$config=Get-Content -LiteralPath ($FixtureRoot+'/Private/workspace.json') -Raw|ConvertFrom-Json
if($config.issuer -cne 'http://localhost:30961' -or $config.origin -cne 'http://localhost:30960'){throw 'Unexpected synthetic endpoints'}
$users=Get-Content -LiteralPath ($FixtureRoot+'/test-users.json') -Raw|ConvertFrom-Json
if(@($users|Where-Object{$_.email -notlike '*@example.test'}).Count){throw 'Only synthetic identities allowed'}
$bytes=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($FixtureRoot+'/Private/secrets.dpapi'),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
$secrets=[Text.Encoding]::UTF8.GetString($bytes)|ConvertFrom-Json
$session=[Microsoft.PowerShell.Commands.WebRequestSession]::new()
function Api($path,$body=$null){
 $parameters=@{Uri=$config.issuer+$path;WebSession=$session;Headers=@{Origin=$config.issuer};TimeoutSec=30}
 if($null-ne$body){$parameters.Method='POST';$parameters.ContentType='application/json';$parameters.Body=$body|ConvertTo-Json -Depth 32 -Compress}
 $response=Invoke-RestMethod @parameters;if($response.status -cne 'ok'){throw 'Synthetic OIDC fixture setup rejected'};return $response.data
}
Api '/api/login' @{organization='built-in';username=$secrets.AdminEmail;password=$secrets.AdminPassword;application='app-built-in';type='login';signinMethod='Password'}|Out-Null
$app=Api '/api/get-application?id=admin/myaccounts'
$id='native-acceptance-'+[Guid]::NewGuid().ToString('N')
$callback=$config.origin+'/chat/auth/callback';$alternate=$config.origin+'/chat/auth/callback-alternate'
$app.name=$id;$app.clientId=$id;$app.clientSecret=[Guid]::NewGuid().ToString('N')+[Guid]::NewGuid().ToString('N');$app.displayName='Synthetic public PKCE acceptance';$app.redirectUris=@($callback,$alternate);$app.grantTypes=@('authorization_code');$app.enableSignUp=$false;$app.disableSelfSignup=$true;$app.enableAutoSignin=$true;$app.enableSigninSession=$true;$app.providers=@();$app.scopes=@()
Api '/api/add-application' $app|Out-Null
# Public metadata only. The generated confidential credential is never exported;
# the relying-party harness MUST use PKCE without it or browser cookies.
@{issuer=$config.issuer;clientID=$id;redirectURI=$callback;alternateRegisteredURI=$alternate}|ConvertTo-Json|Set-Content -LiteralPath ($FixtureRoot+'/native-oidc-public.json') -Encoding utf8
Write-Output 'Synthetic registered callbacks prepared; no client credential exported'

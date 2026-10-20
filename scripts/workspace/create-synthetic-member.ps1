param([Parameter(Mandatory=$true)][string]$FixtureRoot,[Parameter(Mandatory=$true)][string]$Member)
$ErrorActionPreference='Stop'
$allowed='C:/Projects/.cache/chat-parity-20261019/fresh-chat-parity-20261020/fixture'
if([IO.Path]::GetFullPath($FixtureRoot).Replace('\','/') -cne $allowed){throw 'Only the isolated synthetic fixture is allowed'}
if($Member -cnotmatch '^delta-[0-9]{13}$'){throw 'Synthetic member identifier required'}
$config=Get-Content -LiteralPath ($FixtureRoot+'/Private/workspace.json') -Raw|ConvertFrom-Json
if($config.origin -cne 'http://localhost:31060' -or $config.issuer -cne 'http://localhost:31061'){throw 'Unexpected synthetic service endpoints'}
$users=Get-Content -LiteralPath ($FixtureRoot+'/test-users.json') -Raw|ConvertFrom-Json
if(@($users|Where-Object{$_.email -notlike '*@example.test'}).Count){throw 'Only synthetic identities allowed'}
$clear=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($FixtureRoot+'/Private/secrets.dpapi'),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
$secrets=[Text.Encoding]::UTF8.GetString($clear)|ConvertFrom-Json
$session=[Microsoft.PowerShell.Commands.WebRequestSession]::new()
function Api($path,$body){
 $response=Invoke-RestMethod -Uri ($config.issuer+$path) -Method POST -WebSession $session -Headers @{Origin=$config.issuer} -ContentType 'application/json' -Body ($body|ConvertTo-Json -Depth 12 -Compress) -TimeoutSec 30
 if($response.status -cne 'ok'){throw 'Synthetic identity operation rejected'}
}
Api '/api/login' @{organization='built-in';username=$secrets.AdminEmail;password=$secrets.AdminPassword;application='app-built-in';type='login';signinMethod='Password'}
$random=[byte[]]::new(24);[Security.Cryptography.RandomNumberGenerator]::Fill($random)
Api '/api/add-user' @{owner='myaccounts';name=$Member;displayName=$Member;email=($Member+'@example.test');emailVerified=$true;type='normal-user';isAdmin=$false;passwordType='plain';password=[Convert]::ToBase64String($random);signupApplication='myaccounts';createdTime=[DateTime]::UtcNow.ToString('o')}
# Password is deliberately neither returned nor saved. This member never signs in.
Write-Output 'Synthetic directory member created'

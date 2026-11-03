# SAIKO BEAT local gateway: one double-click after Python + FFmpeg are available.
# No cloud service, account, uploaded audio, or paid subscription.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
function Fail([string]$message){
  Write-Host ('エラー: ' + $message) -ForegroundColor Red
  Write-Host 'このウィンドウを閉じる前に内容を確認してください。'
  Read-Host 'Enterで終了' | Out-Null
  exit 1
}
$cmd = $null
if(Get-Command py -ErrorAction SilentlyContinue){
  try{
    & py -3.12 --version *> $null
    if($LASTEXITCODE -eq 0){$cmd=@('py','-3.12')}
  }catch{}
}
if(-not $cmd -and (Get-Command python -ErrorAction SilentlyContinue)){
  try{
    & python --version *> $null
    if($LASTEXITCODE -eq 0){$cmd=@('python')}
  }catch{}
}
if(-not $cmd){Fail 'Python 3.11以降がありません。https://www.python.org/downloads/ から導入してください。'}
if(-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)){Fail 'FFmpegがPATHにありません。既に導入している場合はPowerShellを開き直してください。'}
if(-not (Get-Command ffprobe -ErrorAction SilentlyContinue)){Fail 'FFprobeがPATHにありません。FFmpegのbinフォルダの場所を確認してください。'}
$exe=$cmd[0];$pythonArgs=@()
if($cmd.Length -gt 1){$pythonArgs=@($cmd[1])}
if(-not (Test-Path '.venv/Scripts/python.exe')){
  Write-Host '無料のPython動作環境を作成しています…'
  & $exe @pythonArgs -m venv .venv
  if($LASTEXITCODE -ne 0){Fail 'Pythonの仮想環境を作成できませんでした'}
}
$venv=Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
Write-Host '音源解析の依存関係を確認中…'
& $venv -m pip install --disable-pip-version-check -r requirements.txt
if($LASTEXITCODE -ne 0){Fail 'パッケージのインストールに失敗しました。ネット接続を確認してください'}
$env:SAIKO_LOCAL_GAME='1'
$env:SAIKO_CHART_BIND='127.0.0.1'
$env:SAIKO_CHART_PORT='8766'
$url='http://127.0.0.1:8766/game/youtube.html'
Write-Host 'SAIKO BEAT 自動採譜の試作を起動します。終了するときはCtrl+C。' -ForegroundColor Cyan
Start-Job -ScriptBlock {
 param([string]$u)
 Start-Sleep -Seconds 2
 Start-Process $u
} -ArgumentList $url | Out-Null
& $venv app.py
if($LASTEXITCODE -ne 0){Fail 'サーバーを起動できませんでした'}

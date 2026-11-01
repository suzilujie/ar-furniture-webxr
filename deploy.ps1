# GitHub Pages deploy helper
# Creates a repo (if needed), pushes, and enables Pages.
# Requires: git + gh (authenticated: gh auth login)
#
# NOTE: $ErrorActionPreference stays 'Continue'.
# Reason: gh/git write warnings to stderr, and with 'Stop' PowerShell turns
# those into terminating NativeCommandError. We check $LASTEXITCODE instead.
param(
  [string]$RepoName = 'ar-furniture-webxr',
  [switch]$Private
)

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
Set-Location $PSScriptRoot

function Fail($msg) {
  Write-Host ''
  Write-Host "  [ERROR] $msg" -ForegroundColor Red
  exit 1
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Fail 'git not found in PATH' }
if (-not (Get-Command gh  -ErrorAction SilentlyContinue)) { Fail 'gh (GitHub CLI) not found in PATH' }

Write-Host ''
Write-Host '  WebXR demo -> GitHub Pages' -ForegroundColor Cyan
Write-Host '  ----------------------------------------'

# 1) auth check
gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Fail 'gh is not logged in. Run: gh auth login' }

$user = (gh api user --jq .login) 2>&1
if ($LASTEXITCODE -ne 0) { Fail 'cannot resolve GitHub user' }
$user = "$user".Trim()
Write-Host ("  account : {0}" -f $user)
Write-Host ("  repo    : {0}" -f $RepoName)

# 2) local commit (only when repo is missing)
if (-not (Test-Path '.git')) {
  Write-Host '  git init + first commit ...'
  git init -q 2>&1 | Out-Null
  git add -A 2>&1 | Out-Null
  git commit -q -m "init: AR furniture placement WebXR demo" 2>&1 | Out-Null
} else {
  Write-Host '  git repo exists, committing current changes ...'
  git add -A 2>&1 | Out-Null
  git commit -q -m "update: WebXR demo" 2>&1 | Out-Null   # 无改动时会失败，忽略
}

# 3) create remote if needed, then push
gh repo view "$user/$RepoName" --json name 2>&1 | Out-Null
$repoExists = ($LASTEXITCODE -eq 0)

if ($repoExists) {
  Write-Host '  remote repo exists, pushing ...'
  git branch -M main 2>&1 | Out-Null
  $remotes = git remote 2>&1
  if (-not ($remotes -match 'origin')) {
    git remote add origin ("https://github.com/{0}/{1}.git" -f $user, $RepoName) 2>&1 | Out-Null
  }
  git push -u origin main 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { Fail 'git push failed (check gh auth / network)' }
} else {
  Write-Host '  creating repo and pushing ...'
  $vis = if ($Private) { '--private' } else { '--public' }
  gh repo create $RepoName $vis --source=. --remote=origin --push 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { Fail 'gh repo create failed' }
}

# 4) enable Pages (idempotent: try POST, fall back to PUT)
Write-Host '  enabling GitHub Pages ...'
gh api -X POST "repos/$user/$RepoName/pages" -f "source[branch]=main" -f "source[path]=/" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  gh api -X PUT "repos/$user/$RepoName/pages" -f "source[branch]=main" -f "source[path]=/" 2>&1 | Out-Null
}
if ($LASTEXITCODE -ne 0) {
  Write-Host '  [WARN] Pages API failed. Enable manually:' -ForegroundColor Yellow
  Write-Host '         repo -> Settings -> Pages -> Source: main / root'
} else {
  Write-Host '  Pages enabled.' -ForegroundColor Green
}

$url = "https://$user.github.io/$RepoName/"
Write-Host ''
Write-Host '  ----------------------------------------'
Write-Host ("  URL : {0}" -f $url) -ForegroundColor Green
Write-Host '  First build takes 1-3 minutes.'
Write-Host '  ----------------------------------------'
Write-Host ''

# GitHub Pages deploy helper
# Creates a repo (if needed), pushes, and enables Pages.
# Requires: git + gh (authenticated: gh auth login)
param(
  [string]$RepoName = 'ar-furniture-webxr',
  [switch]$Private
)

$ErrorActionPreference = 'Stop'
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
gh auth status *> $null
if ($LASTEXITCODE -ne 0) { Fail 'gh is not logged in. Run: gh auth login' }

$user = gh api user --jq .login
Write-Host ("  account : {0}" -f $user)
Write-Host ("  repo    : {0}" -f $RepoName)

# 2) local commit (only when repo is missing)
if (-not (Test-Path '.git')) {
  Write-Host '  git init + first commit ...'
  git init -q
  git add -A
  git commit -q -m "init: AR furniture placement WebXR demo"
} else {
  Write-Host '  git repo exists, committing current changes ...'
  git add -A
  git commit -q -m "update: WebXR demo" 2>$null
}

# 3) create remote + push
$exists = gh repo view "$user/$RepoName" --json name 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host '  remote repo exists, pushing ...'
  git branch -M main
  if (-not (git remote | Select-String -Quiet 'origin')) {
    git remote add origin ("https://github.com/{0}/{1}.git" -f $user, $RepoName)
  }
  git push -u origin main
} else {
  Write-Host '  creating repo and pushing ...'
  if ($Private) {
    gh repo create $RepoName --private --source=. --remote=origin --push
  } else {
    gh repo create $RepoName --public --source=. --remote=origin --push
  }
}

# 4) enable Pages (idempotent: ignore error when already enabled)
Write-Host '  enabling GitHub Pages ...'
gh api -X POST "repos/$user/$RepoName/pages" -f "source[branch]=main" -f "source[path]=/" *> $null
if ($LASTEXITCODE -ne 0) {
  gh api -X PUT "repos/$user/$RepoName/pages" -f "source[branch]=main" -f "source[path]=/" *> $null
}

$url = "https://$user.github.io/$RepoName/"
Write-Host ''
Write-Host '  ----------------------------------------' -ForegroundColor Green
Write-Host ("  URL : {0}" -f $url) -ForegroundColor Green
Write-Host '  Note: first build takes 1-3 minutes.'
Write-Host '  If 404, check: repo Settings -> Pages -> Source = main / root'
Write-Host '  ----------------------------------------'
Write-Host ''

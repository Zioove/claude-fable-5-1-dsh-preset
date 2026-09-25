<#
.SYNOPSIS
  Install the Claude Fable 5.1 agent preset into a DeepSeek Harness home.

.DESCRIPTION
  Copies preset/ into ${DSH_HOME:-$HOME/.dsh}/.agent-presets/claude-fable-5-1/.
  Refuses to overwrite an existing installation unless -Force is given.

.EXAMPLE
  pwsh -File scripts/install.ps1
  pwsh -File scripts/install.ps1 -Force
#>
[CmdletBinding()]
param(
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'preset'
$dshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME '.dsh' }
$target = Join-Path (Join-Path $dshHome '.agent-presets') 'claude-fable-5-1'

if (-not (Test-Path (Join-Path $source 'agent.cordis.yml'))) {
  throw "preset/agent.cordis.yml not found under $root — run from a full checkout"
}
if ((Test-Path $target) -and -not $Force) {
  throw "$target already exists; re-run with -Force to overwrite"
}

New-Item -ItemType Directory -Path $target -Force | Out-Null
Copy-Item (Join-Path $source 'agent.cordis.yml') $target -Force
Copy-Item (Join-Path $source 'preset.yml') $target -Force

Write-Host "installed: $target"
Get-ChildItem $target | Select-Object Name, Length | Format-Table -AutoSize | Out-String | Write-Host
Write-Host 'Pick "Claude Fable 5.1" in the preset picker, or set:'
Write-Host '  agent-presets:'
Write-Host '    default: claude-fable-5-1'
Write-Host "in $(Join-Path $dshHome 'settings.yaml')"

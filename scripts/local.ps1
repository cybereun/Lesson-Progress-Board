param(
  [ValidateSet("sync", "dev", "build", "start", "lint", "typecheck")]
  [string]$Command = "dev",
  [int]$Port = 3000,
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$depsRoot = "C:\CodexTemp\lesson-progress-board-deps"
$runRoot = "C:\CodexTemp\lesson-progress-board-run"
$dataRoot = "C:\CodexTemp\lesson-progress-board-data"
$sourcePackage = Join-Path $projectRoot "package.json"
$depsPackage = Join-Path $depsRoot "package.json"
$runNodeModules = Join-Path $runRoot "node_modules"
$depsNodeModules = Join-Path $depsRoot "node_modules"
$mutex = New-Object System.Threading.Mutex($false, "LessonProgressBoardLocalRunner")
$lockTaken = $false

function Ensure-Directory([string]$Path) {
  if (-not (Test-Path $Path)) {
    New-Item -ItemType Directory -Path $Path | Out-Null
  }
}

function Invoke-Robocopy([string]$Source, [string]$Destination, [string[]]$Arguments) {
  & robocopy $Source $Destination @Arguments
  $exitCode = $LASTEXITCODE

  if ($exitCode -gt 7) {
    throw "robocopy failed with exit code $exitCode"
  }
}

function Copy-ProjectFiles {
  Ensure-Directory $runRoot

  $args = @(
    "/MIR"
    "/XD", "node_modules", "node_modules_broken", ".next", "data"
    "/XF", "package-lock.json", "tsconfig.tsbuildinfo"
  )

  Invoke-Robocopy $projectRoot $runRoot $args
}

function Ensure-Dependencies {
  Ensure-Directory $depsRoot

  $needsInstall = -not (Test-Path (Join-Path $depsNodeModules "next\package.json"))

  if (Test-Path $depsPackage) {
    $sourceHash = (Get-FileHash $sourcePackage -Algorithm SHA256).Hash
    $depsHash = (Get-FileHash $depsPackage -Algorithm SHA256).Hash

    if ($sourceHash -ne $depsHash) {
      $needsInstall = $true
    }
  } else {
    $needsInstall = $true
  }

  Copy-Item $sourcePackage $depsPackage -Force

  if ($SkipInstall) {
    return
  }

  if ($needsInstall) {
    npm install --no-audit --no-fund --prefix $depsRoot
  }
}

function Ensure-NodeModulesLink {
  if (Test-Path $runNodeModules) {
    $item = Get-Item $runNodeModules -Force

    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
      return
    }

    cmd /c "rmdir /s /q `"$runNodeModules`""
    if ($LASTEXITCODE -ne 0) {
      throw "기존 node_modules 폴더를 정리하지 못했습니다."
    }
  }

  cmd /c "mklink /J `"$runNodeModules`" `"$depsNodeModules`""
  if ($LASTEXITCODE -ne 0) {
    throw "node_modules 연결 생성에 실패했습니다."
  }
}

try {
  $lockTaken = $mutex.WaitOne([TimeSpan]::FromMinutes(5))

  if (-not $lockTaken) {
    throw "로컬 실행 잠금을 얻지 못했습니다."
  }

  Ensure-Directory $dataRoot
  Ensure-Dependencies
  Copy-ProjectFiles
  Ensure-NodeModulesLink

  $env:LESSON_PROGRESS_DATA_DIR = $dataRoot
  $env:PORT = [string]$Port

  switch ($Command) {
    "sync" {
      Write-Host "Synced to $runRoot"
    }
    "dev" {
      npm run dev --prefix $runRoot -- --port $Port
    }
    "build" {
      npm run build --prefix $runRoot
    }
    "start" {
      npm run start --prefix $runRoot -- --port $Port
    }
    "lint" {
      npm run lint --prefix $runRoot
    }
    "typecheck" {
      npm run typecheck --prefix $runRoot
    }
  }
}
finally {
  if ($lockTaken) {
    $mutex.ReleaseMutex()
  }

  $mutex.Dispose()
}

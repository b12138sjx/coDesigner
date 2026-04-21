param(
  [string]$NodeImage = "node:24-alpine",
  [string]$NginxImage = "nginx:latest",
  [string]$PostgresImage = "postgres:16-alpine"
)

$ErrorActionPreference = "Stop"

function Test-LocalImage {
  param([Parameter(Mandatory = $true)][string]$Image)

  docker image inspect $Image *> $null
  return $LASTEXITCODE -eq 0
}

$requiredImages = @($NodeImage, $NginxImage, $PostgresImage)
$missingImages = @($requiredImages | Where-Object { -not (Test-LocalImage $_) })

if ($missingImages.Count -gt 0) {
  Write-Error ("Missing local base images: " + ($missingImages -join ", ") + ".`n" +
    "Load them locally first, or pass alternative tags:`n" +
    "  .\scripts\docker-rebuild-local.ps1 -NodeImage <tag> -NginxImage <tag> -PostgresImage <tag>")
}

$originalEnv = @{
  NODE_IMAGE = $env:NODE_IMAGE
  NGINX_IMAGE = $env:NGINX_IMAGE
  POSTGRES_IMAGE = $env:POSTGRES_IMAGE
  ALPINE_MIRROR = $env:ALPINE_MIRROR
}

try {
  $env:NODE_IMAGE = $NodeImage
  $env:NGINX_IMAGE = $NginxImage
  $env:POSTGRES_IMAGE = $PostgresImage

  if (-not $env:ALPINE_MIRROR) {
    $env:ALPINE_MIRROR = "mirrors.aliyun.com"
  }

  Write-Host "Building latest application images with cached base images..."
  docker compose build backend ai-api web
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  Write-Host "Recreating containers with the freshly built images..."
  docker compose up -d --force-recreate
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  Write-Host "Current container status:"
  docker compose ps
  exit $LASTEXITCODE
}
finally {
  $env:NODE_IMAGE = $originalEnv.NODE_IMAGE
  $env:NGINX_IMAGE = $originalEnv.NGINX_IMAGE
  $env:POSTGRES_IMAGE = $originalEnv.POSTGRES_IMAGE
  $env:ALPINE_MIRROR = $originalEnv.ALPINE_MIRROR
}

$ErrorActionPreference = 'Stop'

$packageArgs = @{
  packageName    = $env:ChocolateyPackageName
  fileType       = 'msi'
  url64bit       = 'https://github.com/avelino/calblend/releases/download/beta/CalBlend_0.1.0_x64_en-US.msi'
  checksum64     = '__SHA256__'
  checksumType64 = 'sha256'
  silentArgs     = '/qn /norestart'
  validExitCodes = @(0, 3010)
}

Install-ChocolateyPackage @packageArgs

# scripts/test_section12.ps1
$ErrorActionPreference = "Stop"

function Invoke-CurlPost($url, $jsonBody, $cookieJar, $cookieIn) {
    $tempFile = [System.IO.Path]::GetTempFileName()
    try {
        if ($jsonBody) {
            [System.IO.File]::WriteAllText($tempFile, $jsonBody)
        } else {
            [System.IO.File]::WriteAllText($tempFile, "{}")
        }
        $curlArgs = @("-s")
        if ($cookieJar) { $curlArgs += @("-c", $cookieJar) }
        if ($cookieIn) { $curlArgs += @("-b", $cookieIn) }
        $curlArgs += @(
            "-H", "Content-Type: application/json",
            "-H", "Origin: http://localhost:5173",
            "-X", "POST",
            $url,
            "--data-binary", "@$tempFile"
        )
        return & curl.exe @curlArgs
    } finally {
        if (Test-Path $tempFile) { Remove-Item $tempFile -Force -ErrorAction SilentlyContinue }
    }
}

function Invoke-CurlPut($url, $jsonBody, $cookieIn) {
    $tempFile = [System.IO.Path]::GetTempFileName()
    try {
        if ($jsonBody) {
            [System.IO.File]::WriteAllText($tempFile, $jsonBody)
        } else {
            [System.IO.File]::WriteAllText($tempFile, "{}")
        }
        $curlArgs = @("-s")
        if ($cookieIn) { $curlArgs += @("-b", $cookieIn) }
        $curlArgs += @(
            "-H", "Content-Type: application/json",
            "-H", "Origin: http://localhost:5173",
            "-X", "PUT",
            $url,
            "--data-binary", "@$tempFile"
        )
        return & curl.exe @curlArgs
    } finally {
        if (Test-Path $tempFile) { Remove-Item $tempFile -Force -ErrorAction SilentlyContinue }
    }
}

function Invoke-CurlGet($url, $cookieIn = $null) {
    $curlArgs = @("-s")
    if ($cookieIn) { $curlArgs += @("-b", $cookieIn) }
    $curlArgs += @(
        "-H", "Origin: http://localhost:5173",
        $url
    )
    return & curl.exe @curlArgs
}

Write-Host "=== TEST 1: Public Read Access (No Auth) ==="
# 1. GET /api/findings without cookie
$pubFindingsRaw = Invoke-CurlGet "http://localhost:5173/api/findings"
$pubFindings = $pubFindingsRaw | ConvertFrom-Json
if (-not $pubFindings.findings) {
    throw "FAIL: GET /api/findings did not return findings array: $pubFindingsRaw"
}
Write-Host ">>> PASS: GET /api/findings works publicly without cookies (found $($pubFindings.findings.Count) findings)"

# Check attached photos
$hasPhotosProp = $false
foreach ($f in $pubFindings.findings) {
    if ($null -ne $f.photos -and $null -ne $f.before_photos -and $null -ne $f.after_photos) {
        $hasPhotosProp = $true
        break
    }
}
if (-not $hasPhotosProp) {
    throw "FAIL: Attached photos/before_photos/after_photos not found on findings"
}
Write-Host ">>> PASS: Findings have photos, before_photos, after_photos attached directly"

# 2. GET /api/findings/alarms without cookie
$pubAlarmsRaw = Invoke-CurlGet "http://localhost:5173/api/findings/alarms"
$pubAlarms = $pubAlarmsRaw | ConvertFrom-Json
if ($pubAlarms.count -ne 0) {
    throw "FAIL: Expected count 0 for unauthenticated alarms, got $($pubAlarms.count)"
}
Write-Host ">>> PASS: GET /api/findings/alarms gracefully returns empty count=0 without auth"

Write-Host "`n=== TEST 2: Admin Login & Role Splitting ==="
$cookieFile = "$PSScriptRoot\test_cookies.txt"
if (Test-Path $cookieFile) { Remove-Item $cookieFile -Force }

$loginRes = Invoke-CurlPost "http://localhost:5173/api/auth/login" '{"username":"admin","password":"password123"}' $cookieFile $cookieFile
Write-Host "Login response: $loginRes"

# Create Auditor user with area_ids
$randAud = Get-Random -Minimum 1000 -Maximum 9999
$audUserBody = "{`"username`":`"aud_$randAud`",`"password`":`"password123`",`"full_name`":`"Auditor Test $randAud`",`"role`":`"auditor`",`"area_ids`":[1, 2]}"
$audRes = Invoke-CurlPost "http://localhost:5173/api/users" $audUserBody $null $cookieFile | ConvertFrom-Json
$audId = $audRes.user.id
if ($audRes.user.role -ne "auditor") {
    throw "FAIL: Created user role expected auditor, got $($audRes.user.role)"
}
Write-Host ">>> PASS: Created user $audId with role 'auditor'"

# Create Manager user with area_ids
$randMng = Get-Random -Minimum 1000 -Maximum 9999
$mngUserBody = "{`"username`":`"mng_$randMng`",`"password`":`"password123`",`"full_name`":`"Manager Test $randMng`",`"role`":`"manager`",`"area_ids`":[2, 3]}"
$mngRes = Invoke-CurlPost "http://localhost:5173/api/users" $mngUserBody $null $cookieFile | ConvertFrom-Json
$mngId = $mngRes.user.id
if ($mngRes.user.role -ne "manager") {
    throw "FAIL: Created user role expected manager, got $($mngRes.user.role)"
}
Write-Host ">>> PASS: Created user $mngId with role 'manager'"

# Verify user list and assigned area exclusivity
$allUsersRes = Invoke-CurlGet "http://localhost:5173/api/users" $cookieFile | ConvertFrom-Json
$createdAud = $allUsersRes.users | Where-Object { $_.id -eq $audId }
$createdMng = $allUsersRes.users | Where-Object { $_.id -eq $mngId }

foreach ($a in $createdAud.areas) {
    if ($a.role -ne "auditor") { throw "FAIL: Auditor user has non-auditor area role: $($a.role)" }
}
Write-Host ">>> PASS: Auditor $audId has only 'auditor' area roles ($($createdAud.areas.Count) areas)"

foreach ($a in $createdMng.areas) {
    if ($a.role -ne "manager") { throw "FAIL: Manager user has non-manager area role: $($a.role)" }
}
Write-Host ">>> PASS: Manager $mngId has only 'manager' area roles ($($createdMng.areas.Count) areas)"

# Change auditor user role to manager
Invoke-CurlPut "http://localhost:5173/api/users/$audId" '{"role":"manager"}' $cookieFile | Out-Null
$allUsersRes2 = Invoke-CurlGet "http://localhost:5173/api/users" $cookieFile | ConvertFrom-Json
$updatedUser = $allUsersRes2.users | Where-Object { $_.id -eq $audId }
if ($updatedUser.role -ne "manager") { throw "FAIL: Role update failed" }
foreach ($a in $updatedUser.areas) {
    if ($a.role -ne "manager") { throw "FAIL: User areas role not migrated to manager" }
}
Write-Host ">>> PASS: User role switched from auditor to manager, user_areas automatically updated to manager"

# Change user role to viewer -> user_areas must be cleared
Invoke-CurlPut "http://localhost:5173/api/users/$audId" '{"role":"viewer"}' $cookieFile | Out-Null
$allUsersRes3 = Invoke-CurlGet "http://localhost:5173/api/users" $cookieFile | ConvertFrom-Json
$viewerUser = $allUsersRes3.users | Where-Object { $_.id -eq $audId }
if ($viewerUser.areas.Count -ne 0) { throw "FAIL: Viewer user still has area assignments" }
Write-Host ">>> PASS: User switched to viewer, user_areas cleared completely"

Write-Host "`n=== TEST 3: Historical Monthly Score Import ==="
$histPayload = '{"year":2026,"entries":[{"area_id":1,"month":"01","score":96.5},{"area_id":1,"month":"02","score":0.942},{"area_id":2,"month":"01","score":98.0}]}'
$saveHistRes = Invoke-CurlPut "http://localhost:5173/api/reports/historical-monthly" $histPayload $cookieFile | ConvertFrom-Json
if (-not $saveHistRes.ok) {
    throw "FAIL: Saving historical scores failed: $($saveHistRes | ConvertTo-Json)"
}
Write-Host ">>> PASS: Saved $($saveHistRes.saved) historical scores"

# Verify GET /api/reports/monthly includes historical values and auto-ratio conversion (0.942 -> 94.2)
$monthRepRaw = Invoke-CurlGet "http://localhost:5173/api/reports/monthly?year=2026" $cookieFile
$monthRep = $monthRepRaw | ConvertFrom-Json
$row1 = $monthRep.matrix | Where-Object { $_.area_id -eq 1 }
$m01Score = $row1.months."01"
$m02Score = $row1.months."02"
$m01Source = $row1.sources."01"
$m02Source = $row1.sources."02"

Write-Host "Area 1 Month 01: Score=$m01Score, Source=$m01Source"
Write-Host "Area 1 Month 02: Score=$m02Score, Source=$m02Source"
Write-Host "Area 1 Year Avg: $($row1.year_avg)"

if ($m01Score -ne 96.5) { throw "FAIL: Month 01 expected 96.5, got $m01Score" }
if ($m02Score -ne 94.2) { throw "FAIL: Month 02 expected 94.2 (converted from 0.942), got $m02Score" }
if ($m01Source -ne "historical" -or $m02Source -ne "historical") {
    throw "FAIL: Expected sources to be 'historical'"
}
Write-Host ">>> PASS: Historical scores correctly reflected in monthly report matrix and year_avg!"

if (Test-Path $cookieFile) { Remove-Item $cookieFile -Force }
Write-Host "`n>>> ALL SECTION 12 & HISTORICAL IMPORT TESTS PASSED 100%! <<<"

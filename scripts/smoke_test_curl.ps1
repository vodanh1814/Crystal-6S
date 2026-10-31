# scripts/smoke_test_curl.ps1
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

function Invoke-CurlGet($url, $cookieIn) {
    $curlArgs = @("-s")
    if ($cookieIn) { $curlArgs += @("-b", $cookieIn) }
    $curlArgs += @(
        "-H", "Origin: http://localhost:5173",
        $url
    )
    return & curl.exe @curlArgs
}

function Invoke-CurlUpload($url, $filePath, $kind, $cookieIn) {
    $curlArgs = @("-s")
    if ($cookieIn) { $curlArgs += @("-b", $cookieIn) }
    $curlArgs += @(
        "-H", "Origin: http://localhost:5173",
        "-F", "file=@$filePath;type=image/jpeg",
        "-F", "kind=$kind",
        $url
    )
    return & curl.exe @curlArgs
}

Write-Host "1. Resetting / applying local migrations..."
npm run db:migrate:local

Write-Host "2. Starting dev server..."
$devProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev -- --port 5173" -PassThru -NoNewWindow

try {
    # Wait for server ready
    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        try {
            $resp = Invoke-WebRequest -Uri "http://localhost:5173/api/auth/setup" -UseBasicParsing -TimeoutSec 1
            if ($resp.StatusCode -eq 200) { $ready = $true; break }
        } catch { Start-Sleep -Milliseconds 500 }
    }
    if (-not $ready) { throw "Dev server did not start in time." }
    Write-Host "Dev server is up!"

    $cookieFile = "$PSScriptRoot\cookies.txt"
    if (Test-Path $cookieFile) { Remove-Item $cookieFile }

    # Setup / check
    Write-Host "3. Testing /api/auth/setup..."
    $setupCheck = Invoke-CurlGet "http://localhost:5173/api/auth/setup"
    Write-Host "Setup check: $setupCheck"

    # If needs setup, create admin
    if ($setupCheck -like "*true*") {
        Write-Host "Creating first admin..."
        $setupRes = Invoke-CurlPost "http://localhost:5173/api/auth/setup" '{"username":"admin","password":"password123","full_name":"Admin User"}' $cookieFile $null
        Write-Host "Setup res: $setupRes"
    }

    # Login (stores httpOnly cookie s5_session in cookies.txt)
    Write-Host "4. Logging in as admin..."
    $loginRes = Invoke-CurlPost "http://localhost:5173/api/auth/login" '{"username":"admin","password":"password123"}' $cookieFile $cookieFile
    Write-Host "Login res: $loginRes"

    # Test Inactive Area Check (Issue 3)
    Write-Host "5. Testing Inactive Area Audit Creation Check..."
    $inactCode = "INACT_" + (Get-Random -Minimum 1000 -Maximum 9999)
    $inactAreaRes = Invoke-CurlPost "http://localhost:5173/api/areas" "{`"code`":`"$inactCode`",`"name`":`"Inactive Area`",`"sort_order`":99}" $null $cookieFile | ConvertFrom-Json
    $inactAreaId = $inactAreaRes.area.id
    # Set to active = 0
    Invoke-CurlPut "http://localhost:5173/api/areas/$inactAreaId" "{`"active`":0}" $cookieFile | Out-Null
    # Attempt to create audit for inactive area
    $inactAuditRes = Invoke-CurlPost "http://localhost:5173/api/audits" "{`"area_id`":$inactAreaId,`"audit_date`":`"2026-10-15`"}" $null $cookieFile
    Write-Host "Inactive audit attempt result: $inactAuditRes"
    if ($inactAuditRes -notlike "*inactive area*") {
        throw "FAIL: Expected inactive area error, got: $inactAuditRes"
    }
    Write-Host ">>> PASS: Inactive area check passed! <<<"

    # Create active Area
    Write-Host "6. Creating active Area..."
    $areaCode = "TEST_" + (Get-Random -Minimum 1000 -Maximum 9999)
    $areaRes = Invoke-CurlPost "http://localhost:5173/api/areas" "{`"code`":`"$areaCode`",`"name`":`"Test Area $areaCode`",`"sort_order`":1}" $null $cookieFile
    Write-Host "Area res: $areaRes"
    $areaObj = $areaRes | ConvertFrom-Json
    $areaId = $areaObj.area.id

    # Create user & assign
    Write-Host "7. Creating User & assigning to area..."
    $uName = "aud_" + (Get-Random -Minimum 1000 -Maximum 9999)
    $userRes = Invoke-CurlPost "http://localhost:5173/api/users" "{`"username`":`"$uName`",`"password`":`"password123`",`"full_name`":`"Auditor User`",`"role`":`"user`",`"assignments`":[{`"area_id`":$areaId,`"role`":`"auditor`"}]}" $null $cookieFile
    Write-Host "User res: $userRes"

    # Create audit 1
    Write-Host "8. Creating Audit 1 (2026-10-15)..."
    $audit1Res = Invoke-CurlPost "http://localhost:5173/api/audits" "{`"area_id`":$areaId,`"audit_date`":`"2026-10-15`"}" $null $cookieFile
    Write-Host "Audit 1 res: $audit1Res"
    $audit1Obj = $audit1Res | ConvertFrom-Json
    $audit1Id = $audit1Obj.audit.id

    # Test Duplicate Draft Check (Issue 5)
    $dupDraftRes = Invoke-CurlPost "http://localhost:5173/api/audits" "{`"area_id`":$areaId,`"audit_date`":`"2026-10-16`"}" $null $cookieFile
    Write-Host "Duplicate draft attempt: $dupDraftRes"
    if ($dupDraftRes -notlike "*draft audit already exists*") {
        throw "FAIL: Expected duplicate draft error, got: $dupDraftRes"
    }
    Write-Host ">>> PASS: Duplicate draft check passed! <<<"

    # Get checklist item S1.1 id
    $chkRaw = Invoke-CurlGet "http://localhost:5173/api/checklist" $cookieFile
    $chkRes = $chkRaw | ConvertFrom-Json
    $itemS1 = $chkRes.items | Where-Object { $_.code -eq "S1.1" }
    $itemId = $itemS1.id
    Write-Host "Checklist item S1.1 ID: $itemId (penalty: $($itemS1.penalty))"

    # Add finding to Audit 1
    Write-Host "9. Adding finding to Audit 1..."
    $finding1Res = Invoke-CurlPost "http://localhost:5173/api/audits/$audit1Id/findings" "{`"item_id`":$itemId,`"description`":`"Finding in Audit 1`"}" $null $cookieFile
    Write-Host "Finding 1 res: $finding1Res"
    $finding1Obj = $finding1Res | ConvertFrom-Json
    $finding1Id = $finding1Obj.finding.id

    # Submit Audit 1
    Write-Host "10. Submitting Audit 1..."
    $submit1Res = Invoke-CurlPost "http://localhost:5173/api/audits/$audit1Id/submit" "{}" $null $cookieFile
    Write-Host "Submit 1 res: $submit1Res"

    # Test Reject Clearing fixed_at/fixed_by (Issue 1)
    Write-Host "11. Testing Reject clearing fixed_at / fixed_by flow..."
    # Create a small dummy image for after photo
    $dummyImage = "$PSScriptRoot\test_after.jpg"
    [System.IO.File]::WriteAllBytes($dummyImage, [byte[]]@(0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0xFF, 0xD9))
    Invoke-CurlUpload "http://localhost:5173/api/findings/$finding1Id/photos" $dummyImage "after" $cookieFile | Out-Null
    Remove-Item $dummyImage -Force -ErrorAction SilentlyContinue

    # Fix the finding
    Invoke-CurlPost "http://localhost:5173/api/findings/$finding1Id/fix" '{"note":"Fixed by MNG"}' $null $cookieFile | Out-Null
    $fFixed = Invoke-CurlGet "http://localhost:5173/api/findings/$finding1Id" $cookieFile | ConvertFrom-Json
    Write-Host "Finding status after fix: $($fFixed.finding.status), fixed_at: $($fFixed.finding.fixed_at)"

    # Reject the finding
    Invoke-CurlPost "http://localhost:5173/api/findings/$finding1Id/verify" '{"action":"reject","note":"Not good enough"}' $null $cookieFile | Out-Null
    $fRejected = Invoke-CurlGet "http://localhost:5173/api/findings/$finding1Id" $cookieFile | ConvertFrom-Json
    Write-Host "Finding status after reject: $($fRejected.finding.status), fixed_at: $($fRejected.finding.fixed_at)"
    if ($fRejected.finding.fixed_at -ne $null) {
        throw "FAIL: fixed_at was not cleared on reject!"
    }
    Write-Host ">>> PASS: Reject properly cleared fixed_at! <<<"

    # GET reports
    Write-Host "12. GET reports/weekly & dashboard..."
    $repWeekly = Invoke-CurlGet "http://localhost:5173/api/reports/weekly?month=2026-10" $cookieFile
    Write-Host "Weekly report: $($repWeekly.Substring(0, [Math]::Min(120, $repWeekly.Length)))..."

    $repDash = Invoke-CurlGet "http://localhost:5173/api/reports/dashboard" $cookieFile
    Write-Host "Dashboard: $($repDash.Substring(0, [Math]::Min(120, $repDash.Length)))..."

    # Next-week audit (2026-10-22)
    Write-Host "13. Creating next-week Audit 2 (2026-10-22)..."
    $audit2Res = Invoke-CurlPost "http://localhost:5173/api/audits" "{`"area_id`":$areaId,`"audit_date`":`"2026-10-22`"}" $null $cookieFile
    Write-Host "Audit 2 res: $audit2Res"
    $audit2Obj = $audit2Res | ConvertFrom-Json
    $audit2Id = $audit2Obj.audit.id

    # Carry not_improved
    Write-Host "14. Carrying finding into Audit 2 as not_improved..."
    $carryRes = Invoke-CurlPost "http://localhost:5173/api/audits/$audit2Id/carry" "{`"finding_id`":$finding1Id,`"decision`":`"not_improved`"}" $null $cookieFile
    Write-Host "Carry res: $carryRes"

    # Test Undo Carry restoring to 'open' (verifying Issue 1 critical fix in action!)
    Write-Host "15. Testing Undo Carry restores status to 'open' (because it was rejected)..."
    Invoke-CurlPost "http://localhost:5173/api/audits/$audit2Id/carry/undo" "{`"finding_id`":$finding1Id}" $null $cookieFile | Out-Null
    $fRestored = Invoke-CurlGet "http://localhost:5173/api/findings/$finding1Id" $cookieFile | ConvertFrom-Json
    Write-Host "Finding status after undo: $($fRestored.finding.status)"
    if ($fRestored.finding.status -ne "open") {
        throw "FAIL: Expected status 'open' after undo, got: $($fRestored.finding.status)"
    }
    Write-Host ">>> PASS: Undo carry correctly restored status to 'open'! <<<"

    # Re-carry not_improved to verify escalation
    Invoke-CurlPost "http://localhost:5173/api/audits/$audit2Id/carry" "{`"finding_id`":$finding1Id,`"decision`":`"not_improved`"}" $null $cookieFile | Out-Null

    # Check applied_penalty escalated by 1
    Write-Host "16. Verifying escalated penalty in Audit 2..."
    $audit2Raw = Invoke-CurlGet "http://localhost:5173/api/audits/$audit2Id" $cookieFile
    $audit2Detail = $audit2Raw | ConvertFrom-Json
    $carriedF = $audit2Detail.findings | Where-Object { $_.prev_finding_id -eq $finding1Id }
    Write-Host "Carried finding: repeat_level=$($carriedF.repeat_level), base_penalty=$($carriedF.base_penalty), applied_penalty=$($carriedF.applied_penalty)"
    Write-Host "Live score: $($audit2Detail.live_score.score)"

    if ($carriedF.repeat_level -eq 2 -and $carriedF.applied_penalty -eq ($carriedF.base_penalty + 1)) {
        Write-Host ">>> SUCCESS: Applied penalty escalated by exactly 1! (Base $($carriedF.base_penalty) -> Applied $($carriedF.applied_penalty)) <<<"
    } else {
        throw "FAIL: Penalty was not escalated properly."
    }
} finally {
    Write-Host "17. Stopping dev server..."
    if ($devProcess -and -not $devProcess.HasExited) {
        taskkill /F /T /PID $devProcess.Id
    }
    $conn = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
    if ($conn) { Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue }
    if (Test-Path "$PSScriptRoot\cookies.txt") { Remove-Item "$PSScriptRoot\cookies.txt" -ErrorAction SilentlyContinue }
    Write-Host "Dev server stopped."
}

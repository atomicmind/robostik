# Stop existing server on port 5000 (if any)
try {
    $conn = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    }
} catch {}

# Start Flask app
& .\.venv\Scripts\python.exe run.py

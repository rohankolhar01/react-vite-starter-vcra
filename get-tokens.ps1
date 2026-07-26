Invoke-RestMethod -Method Post -Uri "https://accounts.zoho.in/oauth/v2/token" -Body @{
    grant_type = "authorization_code"
    client_id = "1000.AKTUQN3EQFK5BVEBSRY3K9WD3LTLDH"
    client_secret = "80dc67e1081321224ff17e0dd68d44930b62dbfa96"
    code = "1000.4265bc7184a65a5400699fcafbd838f0.7d60442f42705d34e4445205e9260d0b"
} | Format-List
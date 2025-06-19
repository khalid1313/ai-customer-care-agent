#!/bin/bash
# Health check script

echo "🏥 Checking site health..."

# Check if site is responding
if curl -s https://rocketagents.ai > /dev/null; then
    echo "✅ Site is responding"
else
    echo "❌ Site is down!"
    exit 1
fi

# Check SSL certificate
if curl -s https://rocketagents.ai | grep -q "<!DOCTYPE html>"; then
    echo "✅ HTTPS is working"
else
    echo "❌ HTTPS issue detected"
fi

# Check server resources
ssh root@165.227.206.60 "
    echo '📊 Server Resources:'
    echo 'CPU Usage:' \$(top -bn1 | grep 'Cpu(s)' | awk '{print \$2}')
    echo 'Memory:' \$(free -h | grep '^Mem:' | awk '{print \$3\"/\"\$2}')
    echo 'Disk:' \$(df -h / | tail -1 | awk '{print \$3\"/\"\$2\" (\"\$5\" used)\"}')
"
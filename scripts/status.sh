#!/bin/bash
# Quick status check script

echo "==============================================="
echo "  AI Knowledge Assistant - Status Check"
echo "==============================================="
echo ""

# Check supervisor status
echo "📊 Service Status:"
sudo supervisorctl status

echo ""
echo "==============================================="
echo "🔍 Backend Health:"
curl -s http://localhost:8001/api/health | python3 -m json.tool || echo "❌ Backend not responding"

echo ""
echo "==============================================="
echo "📁 Backend Logs (last 10 lines):"
tail -10 /var/log/supervisor/backend.err.log

echo ""
echo "==============================================="
echo "🎨 Frontend Logs (last 10 lines):"
tail -10 /var/log/supervisor/frontend.out.log

echo ""
echo "==============================================="
echo "✅ System is running!"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:8001"
echo "   - API Docs: http://localhost:8001/docs"
echo "==============================================="

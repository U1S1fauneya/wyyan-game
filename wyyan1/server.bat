@echo off
echo 启动本地服务器...
echo 请在浏览器中访问: http://localhost:8000
echo 按 Ctrl+C 停止服务器

python -m http.server 8000 --bind 127.0.0.1

pause
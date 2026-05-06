#!/bin/bash

# VUNO Jira/Confluence MCP 설치 스크립트

echo "🚀 VUNO Jira/Confluence MCP 설치를 시작합니다..."
echo ""

# 현재 디렉토리
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "📁 설치 경로: $SCRIPT_DIR"
echo ""

# Node.js 버전 확인
echo "✓ Node.js 버전 확인 중..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js가 설치되어 있지 않습니다."
    echo "   Node.js 18.0.0 이상을 설치해주세요: https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "  설치된 Node.js: $NODE_VERSION"
echo ""

# npm 의존성 설치
echo "📦 npm 의존성 설치 중..."
cd "$SCRIPT_DIR"
npm install
if [ $? -ne 0 ]; then
    echo "❌ npm install 실패"
    exit 1
fi
echo "✓ 의존성 설치 완료"
echo ""

# .env 파일 확인
echo "🔐 .env 파일 확인 중..."
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo "❌ .env 파일이 없습니다."
    echo "   $SCRIPT_DIR/.env 파일을 생성하고 토큰을 입력해주세요."
    exit 1
fi

# .env 파일 유효성 확인
if ! grep -q "JIRA_URL" "$SCRIPT_DIR/.env" || ! grep -q "JIRA_TOKEN" "$SCRIPT_DIR/.env"; then
    echo "❌ .env 파일에 필수 항목이 없습니다: JIRA_URL, JIRA_TOKEN"
    exit 1
fi

echo "✓ .env 파일 확인 완료"
echo ""

# Claude 설정 경로 확인
echo "📋 Claude 설정 경로를 확인하고 있습니다..."
CLAUDE_CONFIG="$HOME/.claude/settings.json"
ALT_CLAUDE_CONFIG="$HOME/Library/Application Support/Claude/settings.json"

if [ -f "$CLAUDE_CONFIG" ]; then
    CLAUDE_ACTUAL_CONFIG="$CLAUDE_CONFIG"
    echo "✓ Claude 설정 경로: $CLAUDE_CONFIG"
elif [ -f "$ALT_CLAUDE_CONFIG" ]; then
    CLAUDE_ACTUAL_CONFIG="$ALT_CLAUDE_CONFIG"
    echo "✓ Claude 설정 경로: $ALT_CLAUDE_CONFIG"
else
    echo "⚠️  Claude 설정 파일을 찾을 수 없습니다."
    echo "   다음 위치 중 하나에 수동으로 설정해주세요:"
    echo "   - $CLAUDE_CONFIG"
    echo "   - $ALT_CLAUDE_CONFIG"
    echo ""
fi

echo ""
echo "✅ 설치가 완료되었습니다!"
echo ""
echo "📝 다음 단계:"
echo "   1. Claude 앱/CLI를 완전히 종료하세요"
echo "   2. 아래의 설정을 복사하여 Claude 설정 파일에 추가하세요:"
echo ""
echo "   {\"mcpServers\": {\"vuno-jira-confluence\": {\"command\": \"node\", \"args\": [\"$SCRIPT_DIR/mcp-server.js\"]}}}"
echo ""
echo "   3. Claude 앱/CLI를 재시작하세요"
echo "   4. Claude 채팅에서 Jira/Confluence를 사용하세요!"
echo ""
echo "💡 자세한 내용은 SETUP_GUIDE.md를 참고하세요"
echo ""

# 🔗 VUNO Jira/Confluence MCP

Claude에서 직접 VUNO의 Jira와 Confluence에 접근하는 MCP(Model Context Protocol) 서버입니다.

## ✨ 기능

### Jira 통합

- 🔍 **이슈 검색**: JQL을 사용한 고급 검색
- 📋 **이슈 상세 조회**: 완벽한 이슈 정보 확인
- ✍️ **이슈 생성**: 새로운 태스크/버그/스토리 생성
- 📝 **이슈 수정**: 담당자, 댓글 등 업데이트
- 📊 **프로젝트 조회**: 전체 프로젝트 목록 확인

### Confluence 통합

- 🔎 **문서 검색**: 키워드로 문서 찾기
- 📄 **페이지 조회**: 상세 콘텐츠 읽기
- 📍 **스페이스 관리**: 모든 스페이스 확인

## 🚀 빠른 시작

### 1️⃣ 설치

```bash
git clone https://github.com/jinyu74/mcp-jira.git
cd mcp-jira
npm install
```

### 2️⃣ 환경 설정

`.env` 파일이 이미 준비되어 있습니다:

```
JIRA_URL=https://jira.vuno.co
JIRA_TOKEN=<your-token>
CONFLUENCE_URL=https://kb.vuno.co
CONFLUENCE_TOKEN=<your-token>
```

### 3️⃣ Claude 설정

`claude-settings.json` 의 내용을 `~/.claude/settings.json`에 병합하세요:

```json
{
  "mcpServers": {
    "vuno-jira-confluence": {
      "command": "node",
      "args": ["/Users/vuno/Documents/claude/mcp-server.js"]
    }
  }
}
```

### 4️⃣ 재시작

Claude 앱/CLI를 재시작하면 바로 사용 가능합니다!

## 📖 사용 예시

### Jira 검색

```
"PROJ 프로젝트에서 상태가 'Open'인 모든 이슈 찾기"
→ Claude가 자동으로 jira_search_issues 도구 사용
```

### 문서 찾기

```
"KB에서 'API 설명서' 검색해줄래?"
→ Confluence 검색 후 내용 요약
```

### 자동화

```
"PROJ 프로젝트에 'UI 버그' 태스크 만들고 나한테 할당해줘"
→ 자동으로 이슈 생성 및 할당
```

## 📁 파일 구조

```
/Users/vuno/Documents/claude/
├── .env                     # 보안 토큰 (로컬에만 저장)
├── mcp-server.js            # MCP 서버 메인 코드
├── package.json             # Node.js 의존성
├── claude-settings.json     # Claude 설정 예시
├── install.sh               # 자동 설치 스크립트
├── README.md                # 이 파일
├── SETUP_GUIDE.md           # 상세 설정 가이드
└── node_modules/            # npm 패키지 (설치 후)
```

## 🔐 보안

✅ **안전한 관리:**

- 토큰은 `.env` 파일에 로컬 저장
- Git에 커밋되지 않음
- Claude 프로세스만 접근 가능

✅ **토큰 갱신:**

1. https://jira.vuno.co 또는 https://kb.vuno.co에서 새 토큰 발급
2. `.env` 파일의 토큰 값 업데이트
3. Claude 재시작

## 🛠️ 기술 스택

- **Node.js 18+**
- **MCP SDK** (@modelcontextprotocol/sdk)
- **Axios** (HTTP 클라이언트)
- **dotenv** (환경 변수 관리)

## 📚 상세 가이드

더 자세한 내용은 **SETUP_GUIDE.md**를 참고하세요:

- 완전한 도구 목록
- 상세 사용 예시
- 문제 해결 가이드
- API 명세

## 💡 팁

### Claude CLI 사용

```bash
# Claude Code 터미널에서 Jira 이슈 조회
claude "PROJ 프로젝트의 오픈 이슈 모두 찾기"
```

### Cowork 데스크톱 앱

설정 후 Cowork의 Chat 탭에서 바로 Jira/Confluence 도구 사용 가능

## ⚡ 문제 해결

### MCP 서버 시작 실패

```bash
cd /Users/vuno/Documents/claude
npm install
node mcp-server.js  # 직접 실행해서 오류 확인
```

### 토큰 오류

- 토큰 유효성 확인
- `.env` 파일 경로 확인
- Claude 재시작 시도

### Node.js 버전 확인

```bash
node --version  # 18.0.0 이상 필요
```

## 📞 지원

문제 발생 시:

1. **SETUP_GUIDE.md** 문제 해결 섹션 확인
2. `.env` 파일과 Claude 설정 재확인
3. Claude 완전 재시작 (캐시 지우기 포함)

---

**준비 완료!** 🎉

이제 Claude에서 VUNO의 Jira와 Confluence를 바로 사용할 수 있습니다.

Happy collaborating! 🚀

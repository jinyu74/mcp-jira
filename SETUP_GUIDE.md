# VUNO Jira/Confluence MCP 설정 가이드

## 📋 개요

이 MCP(Model Context Protocol) 서버는 Claude에서 직접 VUNO의 Jira와 Confluence에 접근할 수 있게 해줍니다.

**지원 환경:**

- ✅ Cowork (데스크톱 앱)
- ✅ Claude CLI (`claude` 커맨드)
- ✅ Claude.ai 웹 (향후 지원)

---

## 🚀 설치 방법

### 1단계: 의존성 설치

```bash
git clone https://github.com/jinyu74/mcp-jira.git
cd mcp-jira
npm install
```

### 2단계: Claude 설정

#### Cowork / Claude 데스크톱 앱의 경우:

1. 설정(Settings) → 고급(Advanced) 열기
2. `claude_settings.json` 또는 `settings.json` 파일 경로 확인
   - 보통: `~/.claude/settings.json` or `~/.claude.json`
3. `claude-settings.json` 파일의 내용을 복사하여 `~/.claude/settings.json`에 병합

**파일 위치:**

```
macOS: ~/Library/Application Support/Claude/settings.json
또는: ~/.claude/settings.json
또는: ~/.claude.json
```

**병합 방법:**
기존 `settings.json`이 있다면:

```json
{
  "mcpServers": {
    // 기존 서버들...
    "vuno-jira-confluence": {
      "command": "node",
      "args": ["/설치디렉토리/mcp-server.js"]
    }
  }
}
```

기존 `claude.json` 에 병합

```
  "mcpServers": {
    "vuno-jira-confluence": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/설치디렉토리/mcp-server.js"
      ],
      "env": {}
    }
  },
```

#### Claude CLI의 경우:

```bash
# ~/.claude/settings.json 또는 ~/.claude/claude-settings.json 에 다음 추가:
cp /Users/vuno/mcp-jira/claude-settings.json ~/.claude/settings.json
```

### 3단계: Claude 재시작

설정 변경 후 Claude 앱/CLI를 재시작하세요.

---

## 🔐 보안 정보

### .env 파일 관리

- ✅ `.env` 파일은 로컬 폴더에만 저장
- ✅ Git에 커밋하지 마세요
- ✅ 토큰 변경 시 `.env` 파일만 수정

### 토큰 갱신

1. Jira: https://jira.vuno.co/secure/ViewProfile.jspa → API 토큰
2. Confluence: https://kb.vuno.co/admin → API 토큰
3. `.env` 파일의 토큰 값 업데이트
4. Claude 재시작

---

## 📚 사용 가능한 도구 (Tools)

### Jira 도구

#### 1. `jira_search_issues` - 이슈 검색

```
JQL 쿼리로 Jira 이슈를 검색합니다.

입력:
- jql (필수): JQL 쿼리 (예: "project = PROJ AND status = 'Open'")
- maxResults (선택): 최대 반환 개수 (기본값: 50)

예시:
"최근 업데이트된 PROJ 프로젝트의 모든 오픈 이슈 찾기"
```

#### 2. `jira_get_issue` - 이슈 상세 조회

```
특정 이슈의 상세 정보를 조회합니다.

입력:
- issueKey (필수): 이슈 키 (예: "PROJ-123")

예시:
"PROJ-456의 상세 정보 보기"
```

#### 3. `jira_create_issue` - 이슈 생성

```
새로운 Jira 이슈를 생성합니다.

입력:
- project (필수): 프로젝트 키
- issueType (필수): 이슈 타입 (Bug, Task, Story, Epic 등)
- summary (필수): 이슈 제목
- description (선택): 상세 설명
- assignee (선택): 담당자

예시:
"PROJ 프로젝트에 'API 버그 수정' 태스크 생성하기"
```

#### 4. `jira_update_issue` - 이슈 수정

```
기존 이슈를 수정합니다.

입력:
- issueKey (필수): 이슈 키
- assignee (선택): 담당자 변경
- comment (선택): 댓글 추가

예시:
"PROJ-789에 댓글 추가: '진행 중입니다'"
```

#### 5. `jira_get_projects` - 프로젝트 조회

```
모든 Jira 프로젝트의 목록을 조회합니다.
```

### Confluence 도구

#### 1. `confluence_search` - 콘텐츠 검색

```
Confluence에서 페이지나 문서를 검색합니다.

입력:
- text (필수): 검색어
- maxResults (선택): 최대 반환 개수 (기본값: 25)

예시:
"'API 문서' 검색"
```

#### 2. `confluence_get_page` - 페이지 조회

```
특정 Confluence 페이지의 내용을 조회합니다.

입력:
- pageId (필수): 페이지 ID

예시:
"페이지 12345의 내용 보기"
```

#### 3. `confluence_get_spaces` - 스페이스 조회

```
Confluence의 모든 스페이스(공간)를 조회합니다.

입력:
- maxResults (선택): 최대 반환 개수 (기본값: 50)
```

---

## 💡 사용 예시

### 예1: Jira 이슈 검색

```
"PROJ 프로젝트에서 status = 'In Progress' 인 이슈 모두 찾기"
→ Claude가 jira_search_issues 도구 사용
→ 결과 반환
```

### 예2: 문서 찾기 및 검토

```
"KB에서 'API 인증' 관련 문서 찾고 내용 요약해주기"
→ Claude가 confluence_search 사용
→ confluence_get_page로 상세 내용 조회
→ 요약 제시
```

### 예3: 자동화 작업

```
"PROJ 프로젝트에 '새로운 기능 요청' 태스크 생성하고, 담당자를 'john'으로 지정"
→ Claude가 jira_create_issue 사용
→ 이슈 생성 및 할당
```

---

## 🔧 문제 해결

### MCP 서버가 시작되지 않는 경우

```bash
# 수동 테스트
cd mcp-jira
npm install
npm start

# 로그 확인
```

### 인증 오류 발생

- `.env` 파일의 토큰 확인
- 토큰이 아직 유효한지 확인
- 토큰 재발급 후 `.env` 업데이트

### Node.js 버전 확인

```bash
node --version  # 18.0.0 이상 필요
```

---

## 📝 주의사항

1. **토큰 노출 금지**: `.env` 파일을 절대 공개 저장소에 커밋하지 마세요
2. **캐시 지우기**: 설정 변경 후 Claude 캐시 지워야 할 수 있습니다
3. **네트워크**: VUNO 내부 네트워크에서만 접근 가능합니다

---

## 📞 지원

문제가 생기면:

1. `.env` 파일 경로 확인
2. 토큰 유효성 확인
3. Node.js 버전 확인 (18+)
4. Claude 재시작

---

**설정 완료!** 🎉

이제 Claude에서 바로 Jira와 Confluence를 사용할 수 있습니다.

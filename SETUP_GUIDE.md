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
- reporter (선택): 보고자
- priority (선택): 우선순위 이름
- labels (선택): 라벨 배열
- components (선택): 컴포넌트 이름 배열
- fixVersions (선택): 수정 버전 이름 배열
- dueDate (선택): 마감일 YYYY-MM-DD
- parent (선택, Sub-task 시 필수): 부모 이슈 키
- cc (선택): CC(Participant) 로 등록할 username 배열
  → Jira 커스텀 필드 CC (Participant) 에 등록됨. 워처와는 다른 개념.

예시:
"TECG 프로젝트에 'API 버그 수정' 태스크 생성하고, jin.yu 와 byeongyong.kang 을 CC로 추가"
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

#### 6. `jira_add_participant` - CC(Participant) 추가

```
기존 이슈에 CC(Participant) 를 추가합니다. 기존 CC 는 보존되며, 중복은 자동 제거됩니다.

입력:
- issueKey (필수): 이슈 키 (예: "TECG-363")
- usernames (필수): CC 로 추가할 username 배열

동작:
- Jira 커스텀 필드 CC (Participant) (기본 customfield_10404) 의 기존 값을 읽고
  새 username 을 합친 뒤 PUT /rest/api/2/issue/{key} 로 갱신
- 다른 인스턴스에서는 JIRA_CC_FIELD 환경변수로 customfield ID 오버라이드 가능

예시:
"TECG-363 에 jin.yu 를 CC 로 추가"
```

#### 7. `jira_add_watcher` - 워처 추가

```
이슈 변경 알림을 받을 워처(지켜보는 사람)를 추가합니다.
CC(Participant) 와는 다른 개념이며, CC 추가는 jira_add_participant 를 사용하세요.

입력:
- issueKey (필수): 이슈 키
- username (필수): 워처로 추가할 사용자 username

예시:
"TECG-363 의 워처에 jin.yu 추가"
```

> **CC vs Watcher 정리**
> - **CC (Participant)**: 이슈에 공식적으로 참여하는 이해관계자 (이메일 CC와 동등). `customfield_10404` 에 저장.
> - **Watcher**: 이슈 변경을 지켜보고 알림만 받는 사용자. `/rest/api/2/issue/{key}/watchers` 표준 API.

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

## 🆕 변경 이력

### 2026-05-08 — CC(Participant) 와 Watcher 개념 분리

기존 `jira_create_issue` 의 `cc` 인자는 워처(`/watchers` API)로 등록되었으나, 이는 Jira 의 **CC (Participant)** 와 다른 개념입니다.
이번 변경으로:

- `jira_create_issue(cc=[...])` → 커스텀 필드 **CC (Participant)** (`customfield_10404`) 에 등록
- 신규 도구 **`jira_add_participant`** — 기존 이슈에 CC 추가 (기존 CC 보존)
- 기존 도구 **`jira_add_watcher`** — "이슈를 지켜보는 사람" 등록 용도로 그대로 유지
- `jira_get_issue` 응답에 `cc` 필드 추가 (현재 CC 멤버 확인 가능)
- 다른 인스턴스 사용 시 환경변수 `JIRA_CC_FIELD` 로 customfield ID 오버라이드 가능

**선택 가이드**

| 의도 | 사용 도구 |
|------|----------|
| 이슈에 공식 참여시키고 싶다 / 메일 CC 의도 | `jira_add_participant` 또는 `jira_create_issue(cc=[...])` |
| 단순히 알림만 받고 싶다 | `jira_add_watcher` |

---

**설정 완료!** 🎉

이제 Claude에서 바로 Jira와 Confluence를 사용할 수 있습니다.

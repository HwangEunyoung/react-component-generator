---
name: create-pr
description: |
  현재 브랜치의 변경사항으로 GitHub PR을 생성한다. gh CLI로 브랜치를 push하고, 프로젝트 성격에 맞는 언어(한국어/영어) 템플릿으로 PR 제목·본문을 작성해 `gh pr create`까지 수행한다.
  "PR 만들어줘", "PR 생성해줘", "풀리퀘스트 올려줘", "pull request 만들어줘", "create a pull request", "open a PR", "PR 열어줘/올려줘" 같은 요청에 활성화한다.
  기본은 한국어 PR 템플릿을 쓰고, README·커밋 이력·기존 이슈/PR 언어 등에서 영어 기반 국제 오픈소스 프로젝트로 판단되면 영문 템플릿으로 전환한다.
context: fork
---

# create-pr: GitHub PR 생성

현재 작업 디렉토리의 git 저장소를 기준으로, 현재 브랜치의 변경사항을 GitHub PR로 올린다. 사용자가 PR 생성을 요청했다는 것 자체가 push와 PR 오픈에 대한 승인이므로, 아래 절차를 확인 없이 끝까지 진행한다. 단, 브랜치 상태가 애매하거나(예: 커밋되지 않은 변경, 이미 열린 PR 존재) 사용자 의도와 다르게 해석될 여지가 있는 경우에는 진행 전에 상황을 보고하고 확인을 받는다.

## 워크플로우

### Step 0: 저장소 지침 확인

저장소 루트의 `AGENTS.md`(없으면 `CLAUDE.md`)를 읽는다. 커밋/PR 관련 컨벤션(제목 형식, 본문 형식, 언어 등)이 명시돼 있으면 이 스킬의 기본 로직보다 그 지침을 우선한다.

### Step 1: 브랜치·변경사항 파악

- `git branch --show-current`로 현재 브랜치를 확인한다. 기본 브랜치(main/master 등, `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`로 확인)에 그대로 있다면, PR을 만들 새 브랜치가 필요하다는 뜻이므로 사용자에게 브랜치명을 확인하거나 변경 내용에서 합리적인 이름을 정해 새 브랜치를 만든다.
- `git status`로 미커밋 변경사항이 있는지 확인한다. 있으면 PR에 포함시킬 의도인지 사용자에게 확인한다(임의로 커밋하지 않는다 — 커밋이 필요하면 `commit` 스킬 절차를 따르거나 사용자에게 안내한다).
- 기본 브랜치와의 차이를 확인한다: `git log <base>..HEAD --oneline`, `git diff <base>...HEAD --stat`. PR 제목·본문 작성의 근거로 쓴다.
- 로컬 브랜치가 원격에 없거나 뒤처져 있으면 `git push -u origin <branch>`로 push한다.

### Step 2: 기존 PR 확인 (중복 방지)

`gh pr list --head <branch> --state all --json number,url,state`로 이미 해당 브랜치의 PR이 있는지 확인한다.

- **열린 PR이 있으면** 새로 만들지 않는다. URL을 보고하고, 최신 커밋이 이미 반영돼 있는지만 알린다(필요하면 `gh pr edit`으로 제목/본문 업데이트를 제안하되, 사용자가 원할 때만 수행한다).
- **닫힌/머지된 PR만 있으면** 새 PR 생성을 계속 진행한다.

### Step 3: 템플릿 언어 판단

기본값은 **한국어 템플릿**(`references/pr-template-ko.md`)이다. 다음 신호를 종합해 **영어 기반 국제 오픈소스 프로젝트**로 판단되면 **영문 템플릿**(`references/pr-template-en.md`)으로 전환한다. 사용자가 대화에서 언어를 명시했다면 그 지시가 항상 우선한다.

신호 수집 (판단 근거를 나중에 한 줄로 보고할 수 있도록 기록해 둔다):

1. **README 언어**: `README.md`(또는 대표 README)가 영어로 작성돼 있는가.
2. **커밋 이력 언어**: `git log -20 --oneline`의 커밋 메시지가 대부분 영어인가.
3. **기존 PR/이슈 언어**: `gh pr list --state all --limit 10 --json title` / `gh issue list --state all --limit 10 --json title`로 확인했을 때 제목이 대부분 영어인가.
4. **오픈소스 정황**: `LICENSE`(또는 `LICENSE.md`) 파일이 있고 리포지토리가 public이며, `CONTRIBUTING.md` 등 기여 문서가 영어로 돼 있는가 (`gh repo view --json isPrivate,licenseInfo` 참고).

이 중 **README와 커밋 이력을 포함해 신호의 과반**이 영어를 가리키면 영문 템플릿을 쓴다. 애매하면(신호가 엇갈리거나 판단 근거가 부족하면) 기본값인 한국어를 유지한다. 이 프로젝트(react-component-generator)처럼 README·AGENTS.md가 한국어/영어 혼용이라도 팀 내부용 리포지토리라면 한국어 기본값을 유지하는 쪽이 안전하다.

### Step 4: PR 제목·본문 작성

- 선택된 템플릿 파일(`references/pr-template-ko.md` 또는 `references/pr-template-en.md`)을 읽고 그 구조를 그대로 따른다.
- Step 1에서 파악한 커밋 로그와 diff를 근거로 각 섹션을 채운다. 커밋 메시지를 그대로 나열하지 말고, 실제 변경의 목적과 내용을 요약한다.
- 관련 이슈 링크는 사용자가 언급했거나 커밋 메시지에 이슈 번호가 있을 때만 채운다. 없으면 템플릿의 안내대로 그 섹션을 생략한다.
- 테스트 계획 섹션은 실제로 실행했거나(예: `bun run test`, `bun run lint`) 실행이 필요한 항목만 적는다. 하지 않은 검증을 했다고 적지 않는다.
- 현재 세션에 PR 본문 attribution 지침(예: `🤖 Generated with Claude Code` 문구)이 있다면 본문 맨 끝에 덧붙인다.
- PR 제목은 70자 이내로, 본문과 같은 언어로 간결하게 작성한다.

### Step 5: PR 생성

`gh pr create`를 heredoc으로 실행해 본문 서식이 깨지지 않게 한다:

```bash
gh pr create --title "<제목>" --base <base-branch> --body "$(cat <<'EOF'
<Step 4에서 작성한 본문>
EOF
)"
```

- `--base`는 Step 1에서 확인한 기본 브랜치를 명시한다.
- 생성이 끝나면 반환된 PR URL을 사용자에게 보고한다.
- 생성 중 오류(예: 권한 부족, 원격 브랜치 없음)가 나면 원인을 설명하고, 추측으로 우회하지 않는다.

## 안전 규칙

- push와 PR 생성은 사용자의 명시적 요청 범위 내에서만 수행한다. 요청받지 않은 브랜치나 리포지토리로 확장하지 않는다.
- 미커밋 변경사항을 임의로 커밋하거나 `git add -A`로 무분별하게 스테이징하지 않는다.
- `--force` push, 기존 PR 강제 종료/재생성 등 파괴적 동작은 사용자가 명시적으로 요청하지 않는 한 하지 않는다.
- PR 본문에는 `.env` 값, API 키 등 시크릿을 포함하지 않는다. diff에 시크릿으로 의심되는 내용이 보이면 PR 생성을 멈추고 사용자에게 알린다.

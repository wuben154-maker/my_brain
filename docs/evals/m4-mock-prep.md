# M4 mock / prep — quick capture + provisional queue



> **状态：** mock/prep only · **非 M4-GATE PASS**  

> **前置：** M2 PASS（并行路径）；M3 仍为 NEEDS_DEVICE_EVIDENCE  

> **不得**修改 `EXECUTION_STATE` 或签发 M4-GATE PASS 报告。



## 已完成（第一批 prep）



| 区域 | 交付物 |

|------|--------|

| Core SSRF | `packages/core/src/provisional/urlFetchGuard.ts` + `ssrf.test.ts` + `urlFetchGuard.test.ts`（§2.1 全 fixture + IPv6/timeout/体积） |

| Core ingest gate | `ingestGate.ts` + `ingestGate.test.ts`（share/OCR/sync 不得 bypass `applyIngestCreate`） |

| Core queue FSM | `provisionalQueueFsm.test.ts`（三意图复用 `ConversationConductor`） |

| Core source types | `learning` / `project` / `life` / `image_mock` / `voice_note_mock`（mock 禁用） |

| Mobile mock capture | `QuickCaptureFab` 链接走 `UrlFetchGuard`；`provisionalStore.addLinkCapture` |

| Mobile queue UI | `ProvisionalQueueSheet` 展示 source / SSRF code / `voice_disconnected` |

| Mobile tests | `apps/mobile/capture/provisionalQueue*.test.tsx` |

| E2E skeleton | `share-no-permanent.yaml` / `share-ssrf-deny.yaml`（mock/local，非真机 PASS） |



## 已完成（第二批 prep — 本任务）



| 区域 | 交付物 |

|------|--------|

| Core share schema | `packages/core/src/provisional/sharePayload.ts` + `sharePayload.test.ts`（`url`/`title`/`mime`/`sourceApp`/`capturedAt`/`platform`/`payloadKind`；拒绝畸形与密钥字段） |

| Core OCR boundary | `packages/core/src/provisional/ocrBoundary.ts` + `ocrBoundary.test.ts`（on-device 优先；云 OCR `cloudOcrEnabled: false`；失败仅图片引用 + 可编辑摘要） |

| Mobile share intake | `apps/mobile/capture/shareIntake.ts` + `shareImageIntake.ts` + `shareIntake.test.ts`（validated payload → provisional；链接走 `UrlFetchGuard`） |

| Store hook | `provisionalStore.addShareIntake`（畸形 payload → safe error，不写 permanent） |

| Fixtures | `docs/evals/m4-share-payload-fixtures.json` |

| E2E skeleton | `share-payload-mock.yaml`（mock/local；**非** Android intent / iOS Extension PASS） |

| Voice 禁用 | `M3_VOICE_SHARE_DISABLED` / `intakeVoiceNoteShareMock`；队列仍显示 `voice_disconnected` |



## 仍阻塞 M4-GATE FULL PASS



- M3 双端真机 barge-in 证据（`NEEDS_DEVICE_EVIDENCE`）

- Android `ACTION_SEND` intent 真机验收

- iOS Share Extension + App Group 真机验收

- 语音笔记路径（须 M3-GATE PASS 后启用）



## 运行验证



```bash

# 第二批 + 第一批 core

pnpm --filter @my-brain/core test -- sharePayload ocrBoundary ingestGate sourceTypes ssrf urlFetchGuard provisionalQueueFsm



# 第二批 + 第一批 mobile

pnpm --filter @my-brain/mobile test -- shareIntake provisionalQueue QuickCapture

```



## 声明



- **未修改** `specs/mobile-app/EXECUTION_STATE.json`

- **未创建** `M4-GATE-report.md` PASS 报告

- **未触碰** M5/M6/M7 文件或逻辑



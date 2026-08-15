<template>
  <div class="chat-container">
    <!-- 左侧侧边栏：当前正在咨询的客户列表 -->
    <div :class="['history-sidebar', { collapsed: isSidebarCollapsed }]">
      <div class="sidebar-header">
        <div class="header-top">
          <div v-if="!isSidebarCollapsed" class="sidebar-title">
            <el-icon><User /></el-icon>
            <span>当前咨询客户 ({{ chatHistory.length }})</span>
          </div>
          <div class="header-right-actions">
            <el-tooltip content="模拟新访客来访" placement="top" v-if="!isSidebarCollapsed">
              <el-button circle size="small" type="primary" :icon="Plus" @click="mockNewCustomer" />
            </el-tooltip>
            <el-button link class="toggle-btn" @click="isSidebarCollapsed = !isSidebarCollapsed">
              <el-icon>
                <Expand v-if="isSidebarCollapsed" />
                <Fold v-else />
              </el-icon>
            </el-button>
          </div>
        </div>
      </div>

      <!-- 会话搜索 -->
      <div v-if="!isSidebarCollapsed" class="search-box">
        <el-input
          v-model="searchQuery"
          placeholder="搜索客户、问题..."
          :prefix-icon="Search"
          clearable
          size="small"
          class="custom-search"
        />
      </div>

      <!-- 正在咨询的客户会话列表 -->
      <div class="history-list">
        <div 
          v-for="item in filteredHistory" 
          :key="item.id" 
          :class="['history-item', { active: currentChatId === item.id }]"
          data-pinmark="chat-history-item"
          @click="selectChat(item)"
        >
          <div class="item-avatar">
            <el-avatar :size="32" :src="item.avatar">{{ item.customerName.charAt(0) }}</el-avatar>
          </div>
          <div v-if="!isSidebarCollapsed" class="item-detail">
            <div class="item-first-row">
              <span class="customer-name">{{ item.customerName }}</span>
              <span class="time-label">{{ item.time }}</span>
            </div>
            <div class="item-second-row">
              <span class="last-msg">{{ item.lastMessage }}</span>
              <el-tag 
                :type="item.isHandled ? 'primary' : 'success'" 
                size="small" 
                effect="plain"
                class="status-tag"
              >
                {{ item.isHandled ? '人工接管' : 'AI托管' }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧：会话实时监控与接管控制台 -->
    <div class="chat-main">
      <!-- 顶部控制栏 -->
      <div class="chat-header">
        <div class="bot-status-group">
          <el-avatar :size="38" :src="currentChat.avatar">{{ currentChat.customerName.charAt(0) }}</el-avatar>
          <div class="bot-header-info">
            <div class="bot-name">
              {{ currentChat.customerName }}
              <span class="divider">/</span>
              <span class="consult-topic">{{ currentChat.topic }}</span>
            </div>
            <div class="bot-sub">
              <span>系统路径：官网首页 -> 产品咨询</span>
              <span class="separator">|</span>
              <span v-if="currentChat.isHandled" class="status-indicator handled">
                <span class="status-dot blue"></span> 人工客服接管中 (AI 协同建议已启用)
              </span>
              <span v-else class="status-indicator ai-active">
                <span class="status-dot green"></span> AI 智能托管中
              </span>
            </div>
          </div>
        </div>

        <!-- 核心业务操作：手动接管/释放 -->
        <div class="header-actions">
          <div class="assist-switch-wrapper" data-pinmark="assist-switch-wrapper">
            <span class="assist-switch-label">AI 协同回复：</span>
            <el-switch v-model="isAiAssistEnabled" @change="(val) => { if(!val) aiDraft.value = null }" />
          </div>
          <el-button 
            v-if="!currentChat.isHandled" 
            type="primary" 
            size="small" 
            @click="takeOverChat(true)"
          >
            <el-icon><Service /></el-icon>
            <span>手动接入此会话</span>
          </el-button>
          <el-button 
            v-else 
            type="warning" 
            size="small" 
            plain 
            @click="takeOverChat(false)"
          >
            <el-icon><RefreshRight /></el-icon>
            <span>释放接管 (恢复AI托管)</span>
          </el-button>
        </div>
      </div>

      <!-- 对话消息历史区 -->
      <div class="messages-container" ref="messagesContainer">
        <!-- 头部提示：人机双轨模式说明 -->
        <div class="system-intro-bar">
          <el-icon><InfoFilled /></el-icon>
          <span>【人机协作模式】AI 托管时自动回复；接管后 AI 为您提供回复草稿，审核通过或二次修改后即可一键发给访客。</span>
        </div>

        <!-- 消息气泡流 -->
        <div 
          v-for="(msg, index) in messages" 
          :key="index" 
          :class="['message-row', msg.role, { 'human-agent': msg.isHumanAgent }]"
        >
          <div class="avatar-cell">
            <el-avatar v-if="msg.role === 'user'" class="user-avatar" :size="36">客</el-avatar>
            <div v-else-if="msg.isHumanAgent" class="human-avatar">
              <el-icon :size="18" color="#fff"><UserFilled /></el-icon>
            </div>
            <div v-else class="bot-avatar">
              <el-icon :size="18" color="#fff"><Service /></el-icon>
            </div>
          </div>

          <div class="bubble-cell">
            <div class="msg-meta">
              <span class="msg-name">
                <template v-if="msg.role === 'user'">{{ currentChat.customerName }}</template>
                <template v-else-if="msg.isHumanAgent">人工客服</template>
                <template v-else>AI 智能客服</template>
              </span>
              <span class="msg-time">{{ msg.time }}</span>
            </div>

            <div class="bubble-wrapper">
              <!-- 访客气泡左侧悬浮操作栏（鼠标悬停消息行时优雅浮现，不破坏对话纯粹感） -->
              <div v-if="msg.role === 'user'" class="bubble-floating-actions user-floating-actions">
                <el-tooltip content="针对此问题生成 AI 协同回复建议" placement="top" :show-after="200">
                  <button 
                    class="float-action-btn ai-action-btn"
                    :class="{ 'is-loading': generatingMsgIndex === index }"
                    @click="generateDraftForMessage(msg, index)"
                  >
                    <el-icon class="btn-icon"><MagicStick /></el-icon>
                    <span>AI 建议</span>
                  </button>
                </el-tooltip>
                <el-tooltip content="复制问题" placement="top" :show-after="200">
                  <button class="float-action-btn icon-btn" @click="copyText(msg.content)">
                    <el-icon><CopyDocument /></el-icon>
                  </button>
                </el-tooltip>
              </div>

              <!-- 消息气泡主体 -->
              <div class="bubble">
                <div class="msg-text" v-html="formatMessage(msg.content)"></div>
                
                <!-- 关联的知识库来源切片 (如果是助理回答且带有切片) -->
                <div v-if="msg.sources && msg.sources.length > 0" class="sources-card">
                  <div class="sources-header">
                    <el-icon class="source-icon"><DocumentChecked /></el-icon>
                    <span>知识库切片引用：</span>
                  </div>
                  <div class="sources-list">
                    <div 
                      v-for="(src, sIdx) in msg.sources" 
                      :key="sIdx" 
                      class="source-tag"
                      @click="openSourceModal(src)"
                    >
                      <el-icon><Document /></el-icon>
                      <span>{{ src.docName }}</span>
                      <span class="section-name">（{{ src.section }}）</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 助理/客服气泡右侧悬浮操作栏 -->
              <div v-if="msg.role === 'assistant'" class="bubble-floating-actions assistant-floating-actions">
                <el-tooltip content="复制回答" placement="top" :show-after="200">
                  <button class="float-action-btn icon-btn" @click="copyText(msg.content)">
                    <el-icon><CopyDocument /></el-icon>
                  </button>
                </el-tooltip>
                <el-tooltip content="点赞收藏" placement="top" :show-after="200">
                  <button 
                    class="float-action-btn icon-btn" 
                    :class="{ 'is-liked': msg.liked }" 
                    @click="toggleLike(msg)"
                  >
                    <el-icon><Star /></el-icon>
                  </button>
                </el-tooltip>
              </div>
            </div>
          </div>
        </div>

        <!-- 正在输入状态 (托管状态下的 AI 回复 或 接管状态下的 AI 草稿生成提示) -->
        <div v-if="isGenerating" class="message-row assistant">
          <div class="avatar-cell">
            <div class="bot-avatar">
              <el-icon :size="18" color="#fff"><Service /></el-icon>
            </div>
          </div>
          <div class="bubble-cell">
            <div class="bubble loading-bubble">
              <div class="dot-flashing"></div>
              <span class="loading-tip">
                {{ currentChat.isHandled ? 'AI 正在基于知识库为您生成协同回复草稿...' : 'AI 助手正在基于企业知识库撰写答复...' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 底栏输入控制区域 -->
      <div class="input-area">
        <!-- AI 协同回复建议面板 (仅在人工接管且 AI 生成了草稿时显示，作为审核机制) -->
        <div v-if="currentChat.isHandled && aiDraft" class="ai-draft-box">
          <div class="draft-header">
            <span class="draft-title">
              <el-icon class="draft-icon"><MagicStick /></el-icon>
              <span>🤖 AI 协同回复建议 (关联匹配度: {{ aiDraft.score }})</span>
            </span>
            <div class="draft-actions">
              <el-button size="small" type="success" @click="approveAndSendDraft">
                <el-icon><Check /></el-icon> 审核通过并发送
              </el-button>
              <el-button size="small" type="primary" plain @click="importDraftToInput">
                <el-icon><Edit /></el-icon> 导入二次修改
              </el-button>
              <el-button 
                size="small" 
                type="warning" 
                plain 
                :loading="isRegeneratingDraft"
                @click="regenerateDraft"
              >
                <el-icon><RefreshRight /></el-icon> 重新生成
              </el-button>
              <el-button size="small" link @click="aiDraft = null">忽略建议</el-button>
            </div>
          </div>
          <div class="draft-content">
            <div v-if="aiDraft.targetQuestion" class="draft-target-question">
              <span class="target-q-tag">针对提问</span>
              <span class="target-q-text">“{{ aiDraft.targetQuestion }}”</span>
            </div>
            <div class="draft-text" v-html="formatMessage(aiDraft.content)"></div>
            <div v-if="aiDraft.sources && aiDraft.sources.length > 0" class="draft-source-indicator">
              <span class="draft-source-label">检索出处 (点击可查看原文切片)：</span>
              <div class="draft-sources-list">
                <div 
                  v-for="(src, sIdx) in aiDraft.sources" 
                  :key="sIdx" 
                  class="draft-source-tag"
                  @click="openSourceModal(src)"
                >
                  <el-icon class="draft-doc-icon"><Document /></el-icon>
                  <span class="draft-doc-name">{{ src.docName }}</span>
                  <span class="draft-section-name">（{{ src.section }}）</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 未接管状态：展示 AI 托管提示及一键接管入口 -->
        <div v-if="!currentChat.isHandled" class="disabled-input-overlay" data-pinmark="disabled-input-overlay">
          <div class="overlay-content">
            <el-icon color="#e6a23c" :size="20"><WarningFilled /></el-icon>
            <span>当前会话由 AI 智能托管中。</span>
            <el-button type="primary" size="small" @click="takeOverChat(true)">手动接入以发送消息</el-button>
          </div>
        </div>

        <!-- 已接管状态：可由人工客服输入答复 -->
        <div v-else class="input-wrapper">
          <!-- 模拟新消息发送测试快捷入口（用于在人工接管下模拟客户提问，以触发 AI 协同撰写） -->
          <div class="sim-visitor-bar">
            <span>模拟客户提问演示:</span>
            <el-tag size="small" class="sim-tag" @click="mockVisitorSend('系统私有化部署支持离线环境吗？')">
              问私有化部署
            </el-tag>
            <el-tag size="small" class="sim-tag" @click="mockVisitorSend('新上传的手册切片需要审核吗？')">
              问知识库更新
            </el-tag>
          </div>

          <el-input
            v-model="inputMessage"
            type="textarea"
            :rows="3"
            placeholder="请输入您的答复，或直接使用上方 AI 推荐回复..."
            resize="none"
            @keydown.enter.exact.prevent="sendAgentMessage"
          />
          <div class="input-actions">
            <span class="hint">以“人工客服”身份回复 · 按 Enter 发送</span>
            <el-button 
              type="primary" 
              class="send-button"
              :disabled="!inputMessage.trim()"
              @click="sendAgentMessage"
            >
              <span>发送给客户</span>
              <el-icon class="el-icon--right"><Promotion /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 知识库切片原文查看 -->
    <el-dialog
      v-model="isModalVisible"
      title="知识库引用文档切片"
      width="560px"
      destroy-on-close
    >
      <div v-if="activeSource" class="source-detail">
        <div class="detail-row">
          <span class="label">关联知识库：</span>
          <span class="val">{{ activeSource.kbName }}</span>
        </div>
        <div class="detail-row">
          <span class="label">关联文档：</span>
          <span class="val bold">{{ activeSource.docName }}</span>
        </div>
        <div class="detail-row">
          <span class="label">章节位置：</span>
          <span class="val">{{ activeSource.section }}</span>
        </div>
        <div class="content-box">
          <div class="box-title">文档知识切片摘要：</div>
          <div class="box-text">{{ activeSource.content }}</div>
        </div>
      </div>
      <template #footer>
        <el-button @click="isModalVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { 
  Expand, Fold, Search, Delete, MoreFilled, 
  Service, DocumentChecked, Document, Promotion, 
  User, RefreshRight, InfoFilled, UserFilled, WarningFilled, Plus,
  MagicStick, Check, Edit, CopyDocument, Star
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const isSidebarCollapsed = ref(false)
const searchQuery = ref('')
const currentChatId = ref('chat-1')
const inputMessage = ref('')
const isGenerating = ref(false)
const generatingMsgIndex = ref(null)
const isRegeneratingDraft = ref(false)
const isAiAssistEnabled = ref(true)
const messagesContainer = ref(null)

const isModalVisible = ref(false)
const activeSource = ref(null)

// AI 协同回复草稿数据
const aiDraft = ref(null)

// 正在咨询的客户列表 (模拟真实客服后台会话)
const chatHistory = ref([
  {
    id: 'chat-1',
    customerName: '访客 #260730-002',
    avatar: '',
    time: '14:20',
    topic: '咨询私有化部署要求',
    lastMessage: '服务器有什么具体硬件配置要求？',
    isHandled: false,
    messages: [
      {
        role: 'user',
        time: '14:18',
        content: '你们好，我们企业想要私有化部署这套 AI 运营管理中后台系统，服务器有什么具体要求？'
      },
      {
        role: 'assistant',
        time: '14:19',
        content: '根据**《企业系统介绍.pdf》**中部署说明，系统支持轻量容器化部署与集群部署：\n\n1. **硬件推荐配置**：8核 CPU、32GB 内存、100GB 硬盘（推荐 SSD 以保障召回毫秒级响应）。\n2. **网络环境要求**：支持离线部署。',
        sources: [
          {
            docName: '企业系统介绍.pdf',
            section: '第 4.1 节 硬件要求与部署依赖',
            content: '硬件配置说明：推荐使用 8核 CPU、32GB RAM、100GB SSD 硬盘。向量数据库推荐 Milvus 或 Qdrant 独立实例。'
          }
        ]
      },
      {
        role: 'user',
        time: '14:20',
        content: '必须使用 SSD 固态硬盘吗？普通机械硬盘部署会有什么问题吗？'
      }
    ]
  },
  {
    id: 'chat-2',
    customerName: '访客 #260730-001',
    avatar: '',
    time: '10:15',
    topic: '咨询知识库切片生效时效',
    lastMessage: '上传新的产品手册切片后需要多长时间才能生效？',
    isHandled: true,
    messages: [
      {
        role: 'user',
        time: '10:10',
        content: '你好，请问我们如果直接在后台上传最新的产品手册并切片，客服多久能更新回答？'
      },
      {
        role: 'assistant',
        time: '10:11',
        content: '上传产品手册触发智能分块切片后，后台系统会同步进行向量计算。通常在 **10~30 秒** 内即可增量生效。',
        sources: [
          {
            docName: '产品功能手册与 FAQ',
            section: '第 2.3 节 知识库实时同步机制',
            content: '管理员上传或编辑文档节点并触发分词切片后，向量生成微服务将自动增量写入，平均索引生效时间 T < 30s.静态数据'
          }
        ]
      },
      {
        role: 'user',
        time: '10:14',
        content: '明白了，切片对文件大小有限制吗？'
      },
      {
        role: 'assistant',
        time: '10:15',
        isHumanAgent: true, // 人工客服回复
        sendMode: '直接回复',
        content: '访客您好，我是人工客服。系统对单个文件大小限制为 50MB。建议将超大文档进行章节分拆上传，这样能够保障向量检索段落定位 of 精度与回答的准确度。'
      }
    ]
  }
])

const currentChat = computed(() => {
  return chatHistory.value.find(c => c.id === currentChatId.value) || chatHistory.value[0]
})

const messages = computed(() => {
  return currentChat.value ? currentChat.value.messages : []
})

// 会话检索过滤
const filteredHistory = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return chatHistory.value
  return chatHistory.value.filter(item => 
    item.customerName.toLowerCase().includes(q) || 
    item.topic.toLowerCase().includes(q) ||
    item.lastMessage.toLowerCase().includes(q)
  )
})

const selectChat = (chat) => {
  currentChatId.value = chat.id
  aiDraft.value = null // 切换会话清空草稿
  scrollToBottom()
}

// 模拟新访客接入逻辑
const mockNewCustomer = () => {
  const nextNum = chatHistory.value.length + 1
  const now = new Date()
  const year = String(now.getFullYear()).slice(-2) // 取年份后两位
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const date = String(now.getDate()).padStart(2, '0')
  const datePrefix = `${year}${month}${date}`
  
  const customerName = `访客 #${datePrefix}-${String(nextNum).padStart(3, '0')}`
  const newChat = {
    id: `chat-${Date.now()}`,
    customerName: customerName,
    avatar: '',
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    topic: '新发起产品咨询',
    lastMessage: '请问这套系统支持哪些定制化需求？',
    isHandled: false,
    messages: [
      {
        role: 'user',
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: '你好，请问这套系统支持哪些定制化需求？支持第三方单点登录对接吗？'
      }
    ]
  }
  chatHistory.value.unshift(newChat)
  currentChatId.value = newChat.id
  aiDraft.value = null
  ElMessage.success(`模拟新会话成功接入：${customerName}`)
}

// 模拟客户在前台发送消息，便于在人工接管下演示 AI 协同回复
const mockVisitorSend = (text) => {
  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  messages.value.push({
    role: 'user',
    time: nowTime,
    content: text
  })
  currentChat.value.lastMessage = text
  scrollToBottom()
  
  // 触发 AI 的响应逻辑
  handleIncomingMessage(text)
}

// 核心业务：接管与释放托管
const takeOverChat = (status) => {
  currentChat.value.isHandled = status
  aiDraft.value = null
  if (status) {
    ElMessage.success('已手动接管会话。当客户发送新问题时，AI 将自动为您生成回复建议草稿')
    // 如果最后一条是用户消息，接管时直接为客服生成一份 AI 回复草稿
    const len = messages.value.length
    if (len > 0 && messages.value[len - 1].role === 'user') {
      handleIncomingMessage(messages.value[len - 1].content)
    }
  } else {
    ElMessage.info('已释放接管，会话恢复由 AI 客服托管')
    // 释放后，如果上条是用户问题，AI 直接在对话流中自动发送回复
    triggerAiResponseIfNeeded()
  }
}

// 处理收到的客户消息（根据托管状态分配流向）
const handleIncomingMessage = (text) => {
  isGenerating.value = true
  scrollToBottom()

  setTimeout(() => {
    let mockResponseText = ''
    let mockSources = []

    if (text.includes('部署') || text.includes('环境') || text.includes('硬件')) {
      mockResponseText = '企业私有化部署支持**完全离线/物理隔离环境**。部署依赖包与 Milvus/Qdrant 镜像可采用离线 TAR 包导入，支持对接企业内部 LDAP 统一账户认证。'
      mockSources = [
        {
          docName: '企业系统介绍.pdf',
          section: '第 4.3 节 离线环境与单点登录部署',
          content: '离线部署规范：企业版系统支持离线局域网环境一键安装，镜像打包提供 Docker Registry 导入。'
        }
      ]
    } else if (text.includes('格式') || text.includes('切片') || text.includes('更新') || text.includes('审核')) {
      mockResponseText = '上传新的手册分块切片后，默认为**【草稿状态】**，需要管理员在“知识库审核”面板中点击【通过发布】后，才会增量写入向量库并立即在 30 秒内生效。'
      mockSources = [
        {
          docName: '产品功能手册与 FAQ',
          section: '第 2.4 节 知识切片发布与审核流程',
          content: '为规避直接发布引起的知识库污染，系统提供两阶段审核同步：切片落盘 -> 管理员审核通过 -> 发布向量检索生效 (T < 30s)。'
        }
      ]
    } else {
      mockResponseText = `根据企业知识库检索：关于您提问的“${text}”，系统标准接口已提供对应模块。如果该建议有偏颇，您可以直接修改后发给客户。`
      mockSources = [
        {
          docName: '产品功能手册与 FAQ',
          section: '通用客服知识配置',
          content: '提供企业软件功能的基本解答说明。'
        }
      ]
    }

    isGenerating.value = false

    if (currentChat.value.isHandled) {
      // 人工接管状态下：若开启了 AI 协同助手，则生成后台草稿，等待人工审核，不直接进入 messages 对话流
      if (isAiAssistEnabled.value) {
        aiDraft.value = {
          targetQuestion: text,
          content: mockResponseText,
          score: '96.2%',
          sources: mockSources
        }
        ElMessage({
          message: '🤖 AI 已为您生成一份协同回复草稿，请在输入框上方审核。',
          type: 'info',
          duration: 4000
        })
      } else {
        aiDraft.value = null
      }
    } else {
      // AI 托管状态下：直接发送并显示在对话流里
      messages.value.push({
        role: 'assistant',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: mockResponseText,
        sources: mockSources
      })
      currentChat.value.lastMessage = mockResponseText
    }
    
    scrollToBottom()
  }, 1000)
}

// 针对特定访客消息气泡主动触发生成/刷新 AI 回复建议草稿
const generateDraftForMessage = (msg, index) => {
  // 若当前尚未进入人工接管状态，自动接入以便在输入区审核发送
  if (!currentChat.value.isHandled) {
    currentChat.value.isHandled = true
  }

  generatingMsgIndex.value = index

  setTimeout(() => {
    const text = msg.content
    let mockResponseText = ''
    let mockSources = []

    if (text.includes('部署') || text.includes('环境') || text.includes('硬件') || text.includes('离线')) {
      mockResponseText = '企业私有化部署支持**完全离线/物理隔离环境**。部署依赖包与 Milvus/Qdrant 镜像可采用离线 TAR 包导入，支持对接企业内部 LDAP 统一账户认证。'
      mockSources = [
        {
          docName: '企业系统介绍.pdf',
          section: '第 4.3 节 离线环境与单点登录部署',
          content: '离线部署规范：企业版系统支持离线局域网环境一键安装，镜像打包提供 Docker Registry 导入。'
        }
      ]
    } else if (text.includes('格式') || text.includes('切片') || text.includes('更新') || text.includes('审核') || text.includes('时效') || text.includes('生效') || text.includes('硬盘') || text.includes('固态') || text.includes('机械')) {
      mockResponseText = '建议部署在**固态硬盘（SSD）**上。在普通机械硬盘上部署会导致向量检索的 I/O 延迟显著增加，在大并发时容易引发查询超时，从而拖慢客服的整体响应时间。'
      mockSources = [
        {
          docName: '企业系统介绍.pdf',
          section: '第 5.1 节 硬件资源与存储推荐',
          content: '存储介质要求：生产环境必须配置企业级 SSD（读写速度 > 500MB/s），以支撑高频高吞吐向量检索及数据库频繁落盘读写。'
        }
      ]
    } else if (text.includes('大小') || text.includes('限制') || text.includes('限制吗')) {
      mockResponseText = '系统对单文档大小限制为 50MB。建议将超长文档按章节拆分后再行切片，以保证向量定位精度和回答匹配度。'
      mockSources = [
        {
          docName: '产品功能手册与 FAQ',
          section: '第 1.2 节 文件上传与切片限制',
          content: '单文件最大支持 50MB，推荐格式包含 PDF、Markdown、Docx。'
        }
      ]
    } else {
      mockResponseText = `根据企业知识库检索：针对您所咨询的“${text}”，系统已准备好标准应答建议。您可以直接采纳或导入修改后发给访客。`
      mockSources = [
        {
          docName: '产品功能手册与 FAQ',
          section: '通用客服知识库',
          content: '提供企业软件标准功能与咨询的规范解答。'
        }
      ]
    }

    // 无论当前草稿卡片是否开启，直接刷新为对应提问的最新建议
    aiDraft.value = {
      targetQuestion: msg.content,
      content: mockResponseText,
      score: '98.5%',
      sources: mockSources
    }

    generatingMsgIndex.value = null
    scrollToBottom()
    ElMessage.success('已生成针对该问题的 AI 协同回复建议草稿')
  }, 350)
}

// 重新生成当前草稿卡片的 AI 建议回复
const regenerateDraft = () => {
  if (!aiDraft.value) return

  isRegeneratingDraft.value = true

  setTimeout(() => {
    const text = aiDraft.value.targetQuestion || ''
    let mockResponseText = ''
    let mockSources = []

    if (text.includes('部署') || text.includes('环境') || text.includes('硬件') || text.includes('离线')) {
      mockResponseText = '🤖【AI 深度检索优化】：企业私有化部署支持**完全离线/物理隔离环境**。部署依赖包与 Milvus/Qdrant 镜像可采用离线 TAR 包导入，支持对接企业内部 LDAP 统一账户认证，并提供完整的 Shell 自动化部署脚本。'
      mockSources = [
        {
          docName: '企业系统介绍.pdf',
          section: '第 4.3 节 离线环境与单点登录部署',
          content: '离线部署规范：企业版系统支持离线局域网环境一键安装，镜像打包提供 Docker Registry 导入。'
        }
      ]
    } else if (text.includes('格式') || text.includes('切片') || text.includes('更新') || text.includes('审核') || text.includes('时效') || text.includes('生效') || text.includes('硬盘') || text.includes('固态') || text.includes('机械')) {
      mockResponseText = '🤖【AI 深度检索优化】：对于硬件部署介质，**强烈建议使用 SSD 固态硬盘**。相比于机械硬盘（HDD），固态硬盘可提供 >500MB/s 的读写速度与极佳的随机 I/O，可让 Milvus 检索段落定位降至数十毫秒，而普通机械硬盘会导致高并发请求排队与数据库写入阻塞。'
      mockSources = [
        {
          docName: '企业系统介绍.pdf',
          section: '第 5.1 节 硬件资源与存储推荐',
          content: '存储介质要求：生产环境必须配置企业级 SSD（读写速度 > 500MB/s），以支撑高频高吞吐向量检索及数据库频繁落盘读写。'
        }
      ]
    } else if (text.includes('大小') || text.includes('限制') || text.includes('限制吗')) {
      mockResponseText = '🤖【AI 深度检索优化】：系统对单文档大小硬限制为 50MB。建议将长文档切分为不超过 10MB 的章节文件进行分批切片，这样能够显著提升 LLM 语义片段召回的准确性与召回质量。'
      mockSources = [
        {
          docName: '产品功能手册与 FAQ',
          section: '第 1.2 节 文件上传与切片限制',
          content: '单文件最大支持 50MB，推荐格式包含 PDF、Markdown、Docx。'
        }
      ]
    } else {
      mockResponseText = `🤖【AI 深度检索优化】：针对您咨询的“${text}”，已扩大向量检索窗口并重新排列 Top-K 召回段落，优化了建议答复句式。`
      mockSources = [
        {
          docName: '产品功能手册与 FAQ',
          section: '通用客服知识库',
          content: '提供企业软件标准功能与咨询的规范解答。'
        }
      ]
    }

    aiDraft.value = {
      targetQuestion: text,
      content: mockResponseText,
      score: '99.2%', // 更新匹配分值
      sources: mockSources
    }

    isRegeneratingDraft.value = false
    ElMessage.success('AI 已重新检索并生成更精准的回复建议')
  }, 400)
}

// 释放接管后，如果需要，AI 直接补齐回复
const triggerAiResponseIfNeeded = () => {
  const len = messages.value.length
  if (len > 0 && messages.value[len - 1].role === 'user') {
    handleIncomingMessage(messages.value[len - 1].content)
  }
}

// 协同审核操作1：采纳并发送 AI 生成的草稿
const approveAndSendDraft = () => {
  if (!aiDraft.value) return

  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  messages.value.push({
    role: 'assistant',
    isHumanAgent: true,
    sendMode: '采纳 AI 协同建议', // 标记是通过审核发送的
    time: nowTime,
    content: aiDraft.value.content,
    sources: aiDraft.value.sources // 保留知识库引用卡片
  })

  currentChat.value.lastMessage = aiDraft.value.content
  aiDraft.value = null // 清空草稿
  scrollToBottom()
  ElMessage.success('已审核通过并成功发送给客户')
}

// 协同审核操作2：导入草稿至文本框修改
const importDraftToInput = () => {
  if (!aiDraft.value) return
  // 清除 markdown 标记导入
  inputMessage.value = aiDraft.value.content.replace(/\*\*/g, '')
  ElMessage.success('已导入输入框，您可以对照着进行编辑修改')
}

// 发送手写人工客服消息
const sendAgentMessage = () => {
  const text = inputMessage.value.trim()
  if (!text) return

  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  messages.value.push({
    role: 'assistant',
    isHumanAgent: true,
    sendMode: '人工直接回复',
    time: nowTime,
    content: text
  })

  currentChat.value.lastMessage = text
  inputMessage.value = ''
  aiDraft.value = null // 手动发消息后清空建议
  scrollToBottom()
}

const deleteHistory = (id) => {
  ElMessageBox.confirm('确定要删除与该客户的会话记录吗？', '提示', {
    type: 'warning'
  }).then(() => {
    const idx = chatHistory.value.findIndex(c => c.id === id)
    if (idx !== -1) {
      chatHistory.value.splice(idx, 1)
      if (currentChatId.value === id && chatHistory.value.length > 0) {
        currentChatId.value = chatHistory.value[0].id
      }
    }
  }).catch(() => {})
}

const clearHistory = () => {
  chatHistory.value = []
  ElMessage.success('已清空所有咨询记录')
}

const sendMessage = () => {
  // 接管状态下允许点击或者发送
  if (currentChat.value.isHandled) {
    sendAgentMessage()
  }
}

const openSourceModal = (src) => {
  const kbNameMap = {
    '企业系统介绍.pdf': '「企业级部署知识库」',
    '产品功能手册与 FAQ': '「智能客服常用知识库」'
  }
  activeSource.value = {
    ...src,
    kbName: src.kbName || kbNameMap[src.docName] || '「智能客服常用知识库」'
  }
  isModalVisible.value = true
}

const copyText = (txt) => {
  navigator.clipboard.writeText(txt)
  ElMessage.success('已复制到剪贴板')
}

const toggleLike = (msg) => {
  msg.liked = !msg.liked
  if (msg.liked) ElMessage.success('反馈已记录')
}

const formatMessage = (txt) => {
  if (!txt) return ''
  return txt
    .replace(/\n/g, '<br/>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

onMounted(() => {
  scrollToBottom()
})
</script>

<style scoped>
.chat-container {
  display: flex;
  height: calc(100vh - 110px);
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

/* 侧边栏 */
.history-sidebar {
  width: 280px;
  background: #f8fafc;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  transition: width 0.25s ease;
}
.history-sidebar.collapsed {
  width: 60px;
}

.sidebar-header {
  padding: 16px 14px;
}
.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sidebar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}
.header-right-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-box {
  padding: 0 14px 10px 14px;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}
.group-label {
  font-size: 11px;
  color: #94a3b8;
  padding: 10px 8px 4px 8px;
  font-weight: 600;
}
.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 6px;
  transition: all 0.2s;
}
.history-item:hover {
  background: #e2e8f0;
}
.history-item.active {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}
.item-avatar {
  flex-shrink: 0;
}
.item-detail {
  flex: 1;
  min-width: 0;
}
.item-first-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.customer-name {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.time-label {
  font-size: 11px;
  color: #94a3b8;
}
.item-second-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}
.last-msg {
  font-size: 12px;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.status-tag {
  font-size: 10px;
  padding: 0 4px;
  height: 18px;
  line-height: 16px;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid #e2e8f0;
}
.clear-all-btn {
  color: #64748b;
  font-size: 12px;
}

/* 主控制台 */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.chat-header {
  height: 68px;
  padding: 0 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
}
.bot-status-group {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.bot-header-info {
  min-width: 0;
}
.bot-name {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 6px;
}
.divider {
  color: #cbd5e1;
}
.consult-topic {
  font-size: 13px;
  color: #64748b;
  font-weight: normal;
}
.bot-sub {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.separator {
  color: #e2e8f0;
}
.status-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
}
.status-indicator.ai-active { color: #22c55e; }
.status-indicator.handled { color: #2563eb; }

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.status-dot.green { background: #22c55e; }
.status-dot.blue { background: #2563eb; }

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.assist-switch-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.assist-switch-label {
  font-size: 13px;
  color: #64748b;
}

.messages-container {
  flex: 1;
  padding: 20px 32px;
  overflow-y: auto;
  background: #f8fafc;
}

.system-intro-bar {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 12px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 消息气泡 */
.message-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  max-width: 860px;
}
.message-row.user {
  flex-direction: row-reverse;
  margin-left: auto;
}

.bot-avatar {
  width: 36px;
  height: 36px;
  background: #22c55e;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.human-avatar {
  width: 36px;
  height: 36px;
  background: #2563eb;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.user-avatar {
  background: #475569;
  color: #ffffff;
}

.bubble-cell {
  max-width: 82%;
}
.msg-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  margin-bottom: 4px;
}
.message-row.user .msg-meta {
  justify-content: flex-end;
}
.msg-name {
  font-weight: 600;
  color: #334155;
}
.msg-time {
  color: #94a3b8;
}

.bubble {
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
}
.message-row.user .bubble {
  background: #f1f5f9;
  color: #1e293b;
  border: 1px solid #e2e8f0;
  border-bottom-right-radius: 2px;
}
.message-row.assistant .bubble {
  background: #ffffff;
  color: #1e293b;
  border: 1px solid #e2e8f0;
  border-bottom-left-radius: 2px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
}
/* 人工客服回复框强调色 */
.message-row.human-agent .bubble {
  background: #eff6ff;
  border-color: #bfdbfe;
}

/* AI 字段引用与交互 */
.sources-card {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #f1f5f9;
  font-size: 12px;
}
.sources-header {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #64748b;
  margin-bottom: 6px;
}
.source-icon {
  color: #16a34a;
}
.sources-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.source-tag {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #15803d;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: background 0.2s;
}
.source-tag:hover {
  background: #dcfce7;
}
.section-name {
  color: #4b5563;
}
.takeover-tip {
  font-size: 12px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 4px;
}

.bubble-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.message-row.user .bubble-wrapper {
  flex-direction: row;
  justify-content: flex-end;
}

.message-row.assistant .bubble-wrapper {
  flex-direction: row;
  justify-content: flex-start;
}

/* 浮动微胶囊工具栏 */
.bubble-floating-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
  transform: scale(0.92) translateY(2px);
  pointer-events: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

/* 鼠标悬停在消息行上，或者包含 loading 状态时显现 */
.message-row:hover .bubble-floating-actions,
.bubble-floating-actions:has(.is-loading) {
  opacity: 1;
  transform: scale(1) translateY(0);
  pointer-events: auto;
}

/* 悬浮操作按钮通用规范 */
.float-action-btn {
  height: 28px;
  padding: 0 10px;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #475569;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
}

.float-action-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #1e293b;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
}

/* AI 建议胶囊高亮风格 */
.float-action-btn.ai-action-btn {
  background: #f0fdf4;
  border-color: #86efac;
  color: #15803d;
}

.float-action-btn.ai-action-btn:hover {
  background: #dcfce7;
  border-color: #4ade80;
  color: #166534;
  box-shadow: 0 3px 8px rgba(22, 163, 74, 0.18);
}

.float-action-btn.ai-action-btn .btn-icon {
  color: #16a34a;
  font-size: 13px;
}

/* 纯图标微按钮 */
.float-action-btn.icon-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  justify-content: center;
  border-radius: 50%;
  color: #64748b;
}

.float-action-btn.icon-btn:hover {
  color: #0f172a;
}

.float-action-btn.icon-btn.is-liked {
  color: #eab308;
  background: #fefce8;
  border-color: #fde047;
}

/* loading 动画 */
.float-action-btn.is-loading .btn-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 针对提问标记 */
.draft-target-question {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px dashed #bbf7d0;
  font-size: 12px;
}
.target-q-tag {
  background: #16a34a;
  color: #fff;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
}
.target-q-text {
  color: #15803d;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.msg-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
}

/* Loading */
.loading-bubble {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
}
.dot-flashing {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #22c55e;
  animation: dot-flashing 1s infinite alternate;
}
@keyframes dot-flashing {
  0% { opacity: 0.3; }
  100% { opacity: 1; }
}

/* AI 协同建议草稿面板 */
.ai-draft-box {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
}
.draft-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.draft-title {
  font-size: 13px;
  font-weight: 600;
  color: #166534;
  display: flex;
  align-items: center;
  gap: 6px;
}
.draft-icon {
  color: #15803d;
}
.draft-actions {
  display: flex;
  gap: 6px;
}
.draft-content {
  background: #ffffff;
  border: 1px solid #dcfce7;
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 13px;
  line-height: 1.5;
  color: #1e293b;
}
.draft-source-indicator {
  margin-top: 8px;
  font-size: 11px;
  color: #15803d;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.draft-source-label {
  font-weight: 600;
  color: #15803d;
}
.draft-sources-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.draft-source-tag {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #15803d;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.2s;
}
.draft-source-tag:hover {
  background: #dcfce7;
  border-color: #86efac;
}
.draft-doc-icon {
  color: #16a34a;
}
.draft-doc-name {
  font-weight: 600;
}
.draft-section-name {
  color: #4b5563;
}

/* 模拟发送演示栏 */
.sim-visitor-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 11px;
  color: #64748b;
}
.sim-tag {
  cursor: pointer;
  transition: all 0.2s;
}
.sim-tag:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #2563eb;
}

/* 输入框 & 拦截层 */
.input-area {
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
  background: #ffffff;
  position: relative;
}
.disabled-input-overlay {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
}
.overlay-content {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: #334155;
}

.input-wrapper {
  border: 1px solid #2563eb;
  border-radius: 10px;
  padding: 8px 12px;
}
.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
}
.hint {
  font-size: 11px;
  color: #94a3b8;
}

/* 弹窗样式 */
.source-detail {
  font-size: 13px;
}
.detail-row {
  margin-bottom: 8px;
}
.label { color: #64748b; }
.bold { font-weight: 600; }
.content-box {
  margin-top: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
}
.box-title {
  font-weight: 600;
  margin-bottom: 6px;
  color: #1e293b;
}
.box-text {
  line-height: 1.6;
  color: #334155;
}
.form-tip {
  font-size: 11px;
  color: #64748b;
  margin-top: 4px;
}
</style>

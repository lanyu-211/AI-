<template>
  <div class="chat-container">
    <!-- 内部侧边栏：历史记录（Glassmorphism） -->
    <div :class="['history-sidebar', { collapsed: isSidebarCollapsed }]">
      <div class="sidebar-header">
        <div class="header-top">
          <el-button v-if="!isSidebarCollapsed" type="primary" class="new-chat-btn" @click="createNewChat">
            <el-icon><Plus /></el-icon>
            <span>新建对话</span>
          </el-button>
          <el-button v-else type="primary" circle @click="createNewChat" title="新建对话">
            <el-icon><Plus /></el-icon>
          </el-button>
          
          <el-button link class="toggle-btn" @click="isSidebarCollapsed = !isSidebarCollapsed">
            <el-icon>
              <Expand v-if="isSidebarCollapsed" />
              <Fold v-else />
            </el-icon>
          </el-button>
        </div>
      </div>

      <!-- 搜索框 -->
      <div v-if="!isSidebarCollapsed" class="search-box">
        <el-input
          v-model="searchQuery"
          placeholder="搜索对话..."
          :prefix-icon="Search"
          clearable
          size="small"
          class="custom-search"
        />
      </div>

      <div class="history-list">
        <template v-for="group in groupedHistory" :key="group.label">
          <div v-if="!isSidebarCollapsed && group.items.length > 0" class="group-label">
            {{ group.label }}
          </div>
          <div 
            v-for="item in group.items" 
            :key="item.id" 
            :class="['history-item', { active: currentChatId === item.id }]"
            @click="selectChat(item)"
            :title="isSidebarCollapsed ? item.title : ''"
          >
            <el-icon class="msg-icon"><ChatLineRound /></el-icon>
            <span v-if="!isSidebarCollapsed" class="chat-title">{{ item.title }}</span>
            
            <el-dropdown v-if="!isSidebarCollapsed" trigger="click" @click.stop>
              <el-icon class="more-icon"><MoreFilled /></el-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="deleteHistory(item.id)">
                    <el-icon><Delete /></el-icon>删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>
      </div>

      <div class="sidebar-footer">
        <el-tooltip
          v-if="isSidebarCollapsed"
          content="清空历史"
          placement="right"
        >
          <el-button link class="clear-all-btn" @click="clearHistory">
            <el-icon><Delete /></el-icon>
          </el-button>
        </el-tooltip>
        <el-button v-else link class="clear-all-btn" @click="clearHistory">
          <el-icon><Delete /></el-icon>
          <span>清空历史记录</span>
        </el-button>
      </div>
    </div>

    <!-- 主对话区域 -->
    <div class="chat-main">
      <div class="chat-header">
        <div class="header-left">
          <div class="model-info">
            <el-select v-model="selectedModel" placeholder="选择 AI 模型" class="model-select">
              <el-option label="GPT-4o (推荐)" value="gpt-4o">
                <div class="option-content">
                  <el-icon><Cpu /></el-icon><span>GPT-4o</span>
                </div>
              </el-option>
              <el-option label="Claude 3.5 Sonnet" value="claude-3-5">
                <div class="option-content">
                  <el-icon><MagicStick /></el-icon><span>Claude 3.5</span>
                </div>
              </el-option>
              <el-option label="DeepSeek-V3" value="deepseek-v3">
                <div class="option-content">
                  <el-icon><Finished /></el-icon><span>DeepSeek V3</span>
                </div>
              </el-option>
            </el-select>
            <div class="status-indicator">
              <span class="pulse-dot"></span>
              <span class="status-text">在线</span>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <el-button-group>
            <el-button @click="clearMessages" plain>
              <el-icon><Delete /></el-icon> 清空上下文
            </el-button>
            <el-button plain>
              <el-icon><Share /></el-icon> 分享会话
            </el-button>
          </el-button-group>
        </div>
      </div>

      <div class="message-list-wrapper">
        <div class="message-list" ref="messageListRef">
          <div v-if="messages.length === 0" class="empty-state">
            <div class="welcome-box">
              <div class="welcome-icon">✨</div>
              <h2>欢迎使用 AI 助手</h2>
              <p>你可以问我关于项目管理、代码优化或任何技术问题</p>
              <div class="suggested-actions">
                <div class="suggest-chip" @click="inputMessage = '帮我检查一下大模型参数配置'">“检查参数配置”</div>
                <div class="suggest-chip" @click="inputMessage = '如何优化当前界面的 UI？'">“UI 优化建议”</div>
              </div>
            </div>
          </div>
          
          <div
            v-for="(msg, index) in messages"
            :key="index"
            :class="['message-item', msg.role === 'user' ? 'user' : 'ai', { 'show-actions': hoveredMsg === index }]"
            @mouseenter="hoveredMsg = index"
            @mouseleave="hoveredMsg = null"
          >
            <div class="avatar">
              <el-avatar :size="38" :src="msg.role === 'user' ? userAvatar : aiAvatar" class="custom-avatar" />
            </div>
            <div class="content-wrapper">
              <div class="sender-name">{{ msg.role === 'user' ? '你' : 'AI 助手' }}</div>
              <div class="message-bubble">
                <div v-if="msg.files && msg.files.length > 0" class="message-attachments">
                  <div v-for="file in msg.files" :key="file.name" class="attachment-bubble">
                    <el-icon><Document /></el-icon>
                    <span>{{ file.name }}</span>
                  </div>
                </div>
                <div class="message-text">{{ msg.content }}</div>
                
                <!-- 消息操作动作条 -->
                <div v-if="msg.role === 'ai'" class="message-actions">
                  <el-tooltip content="复制内容" placement="top">
                    <el-button link @click="copyContent(msg.content)"><el-icon><CopyDocument /></el-icon></el-button>
                  </el-tooltip>
                  <el-tooltip content="重新生成" placement="top">
                    <el-button link @click="regenerate(index)"><el-icon><RefreshRight /></el-icon></el-button>
                  </el-tooltip>
                  <el-divider direction="vertical" />
                  <el-button link><el-icon><CircleCheck /></el-icon></el-button>
                  <el-button link><el-icon><CircleClose /></el-icon></el-button>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="isTyping" class="message-item ai">
            <div class="avatar">
              <el-avatar :size="38" :src="aiAvatar" class="custom-avatar" />
            </div>
            <div class="content-wrapper">
              <div class="sender-name">AI 助手正在思考...</div>
              <div class="message-bubble typing-bubble">
                <div class="typing-animation">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域（胶囊式悬浮设计） -->
      <div class="input-area">
        <div class="input-container-capsule">
          <!-- 附件预览栏 -->
          <div v-if="attachedFiles.length > 0" class="attachment-preview-bar">
            <div v-for="(file, index) in attachedFiles" :key="index" class="glass-preview-item">
              <el-icon><Document /></el-icon>
              <span class="file-name">{{ file.name }}</span>
              <el-icon class="remove-btn" @click="removeFile(index)"><Close /></el-icon>
            </div>
          </div>

          <div class="input-main-row">
            <el-upload
              class="file-upload-mini"
              action="#"
              :auto-upload="false"
              :show-file-list="false"
              :on-change="handleFileChange"
              multiple
            >
              <template #trigger>
                <el-button link class="icon-btn">
                  <el-icon><Paperclip /></el-icon>
                </el-button>
              </template>
            </el-upload>
            
            <el-input
              v-model="inputMessage"
              type="textarea"
              :autosize="{ minRows: 1, maxRows: 8 }"
              placeholder="问我任何问题..."
              @keydown.enter.prevent="handleEnter"
              resize="none"
              class="capsule-input"
            />
            
            <div class="input-right-actions">
              <el-button 
                type="primary" 
                :disabled="(!inputMessage.trim() && attachedFiles.length === 0) || isTyping"
                @click="sendMessage"
                class="fancy-send-btn"
              >
                <el-icon><Promotion /></el-icon>
              </el-button>
            </div>
          </div>
        </div>
        <div class="footer-tip">按 Enter 发送，Shift + Enter 换行</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { 
  Search, Promotion, Plus, ChatLineRound, 
  MoreFilled, Paperclip, Document,
  Expand, Fold, Cpu, MagicStick, Finished,
  Share, CopyDocument, RefreshRight, CircleCheck, CircleClose,
  Close, Delete
} from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'

const selectedModel = ref('gpt-4o')
const inputMessage = ref('')
const searchQuery = ref('')
const isSidebarCollapsed = ref(false)
const isTyping = ref(false)
const currentChatId = ref('1')
const messages = ref([])
const messageListRef = ref(null)
const attachedFiles = ref([])
const hoveredMsg = ref(null)

// 模拟头像
const userAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4'
const aiAvatar = 'https://api.dicebear.com/7.x/bottts/svg?seed=Aneka&backgroundColor=d1d4f9'

// 模拟历史记录（带时间戳）
const historyList = ref([
  { 
    id: '1', 
    title: '关于大模型配置的问题', 
    timestamp: Date.now(),
    messages: [
      { role: 'ai', content: '你好！我是你的 AI 助手，有什么项目上的问题我可以帮你的吗？' }
    ] 
  },
  { id: '2', title: 'Vue3 动画方案调研', timestamp: Date.now() - 86400000, messages: [] },
  { id: '3', title: '设计稿还原度测试', timestamp: Date.now() - 172800000, messages: [] }
])

// 历史记录时间分组逻辑
const groupedHistory = computed(() => {
  const query = searchQuery.value.toLowerCase()
  const filtered = historyList.value.filter(item => 
    item.title.toLowerCase().includes(query)
  )

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 86400000

  return [
    { label: '今天', items: filtered.filter(i => i.timestamp >= today) },
    { label: '昨天', items: filtered.filter(i => i.timestamp >= yesterday && i.timestamp < today) },
    { label: '更早以前', items: filtered.filter(i => i.timestamp < yesterday) }
  ]
})

const scrollToBottom = async () => {
  await nextTick()
  if (messageListRef.value) {
    messageListRef.value.scrollTo({
      top: messageListRef.value.scrollHeight,
      behavior: 'smooth'
    })
  }
}

const selectChat = (chat) => {
  currentChatId.value = chat.id
  messages.value = [...chat.messages]
  scrollToBottom()
}

const createNewChat = () => {
  const newId = String(Date.now())
  const newChat = {
    id: newId,
    title: '新对话',
    timestamp: Date.now(),
    messages: []
  }
  historyList.value.unshift(newChat)
  selectChat(newChat)
  if (isSidebarCollapsed.value) isSidebarCollapsed.value = false
}

const deleteHistory = (id) => {
  const index = historyList.value.findIndex(item => item.id === id)
  if (index > -1) {
    historyList.value.splice(index, 1)
    if (currentChatId.value === id) {
      if (historyList.value.length > 0) {
        selectChat(historyList.value[0])
      } else {
        messages.value = []
        currentChatId.value = ''
      }
    }
  }
}

const clearHistory = () => {
  ElMessageBox.confirm('确定要清理所有历史记录吗？此操作不可撤销。', '系统确认', {
    confirmButtonText: '确定清理',
    cancelButtonText: '取消',
    type: 'warning',
    roundButton: true
  }).then(() => {
    historyList.value = []
    messages.value = []
    currentChatId.value = ''
    ElMessage.success('历史记录已清空')
  })
}

// 功能增强
const copyContent = (text) => {
  navigator.clipboard.writeText(text)
  ElMessage.success('已复制到剪贴板')
}

const regenerate = (index) => {
  messages.value.splice(index)
  sendMessage()
}

const handleFileChange = (file) => {
  attachedFiles.value.push(file)
}

const removeFile = (index) => {
  attachedFiles.value.splice(index, 1)
}

const handleEnter = (e) => {
  if (e.shiftKey) return
  sendMessage()
}

const sendMessage = async () => {
  if ((!inputMessage.value.trim() && attachedFiles.value.length === 0) || isTyping.value) return

  const userContent = inputMessage.value.trim()
  const currentFiles = attachedFiles.value.map(f => ({ name: f.name }))
  
  if (!currentChatId.value) createNewChat()

  messages.value.push({ 
    role: 'user', 
    content: userContent,
    files: currentFiles.length > 0 ? currentFiles : undefined
  })
  
  const currentChat = historyList.value.find(c => c.id === currentChatId.value)
  if (currentChat && currentChat.title === '新对话') {
    currentChat.title = userContent || (currentFiles.length > 0 ? currentFiles[0].name : '新对话')
    if (currentChat.title.length > 15) currentChat.title = currentChat.title.slice(0, 15) + '...'
  }
  if (currentChat) currentChat.messages = [...messages.value]

  inputMessage.value = ''
  attachedFiles.value = []
  
  await scrollToBottom()
  
  isTyping.value = true
  await scrollToBottom()
  
  setTimeout(async () => {
    isTyping.value = false
    const aiContent = currentFiles.length > 0 
      ? `我已解析你上传的附件。基于这些文件，我可以为你提供深度分析。你想从哪里开始？`
      : `这是针对“${userContent}”生成的模拟分析报告。在完整版本中，我将链接后端神经引擎进行实时推理。`
    
    messages.value.push({ role: 'ai', content: aiContent })
    if (currentChat) currentChat.messages.push({ role: 'ai', content: aiContent })
    await scrollToBottom()
  }, 1000)
}

const clearMessages = () => {
  messages.value = []
}

onMounted(() => {
  if (historyList.value.length > 0) selectChat(historyList.value[0])
})
</script>

<style scoped>
/* 核心变量 */
:root {
  --chat-bg: #ffffff;
  --sidebar-blur-bg: rgba(248, 250, 252, 0.8);
  --accent-color: #1677ff;
  --accent-light: #e6f4ff;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --glass-border: rgba(255, 255, 255, 0.6);
}

.chat-container {
  height: calc(100vh - 64px - 48px);
  display: flex;
  background-color: #f1f5f9;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,0.05);
}

/* 侧边栏优化：毛玻璃效果 */
.history-sidebar {
  width: 280px;
  background: var(--sidebar-blur-bg);
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.history-sidebar.collapsed {
  width: 80px;
}

.sidebar-header {
  padding: 20px 16px;
}

.header-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.collapsed .header-top {
  flex-direction: column;
}

.new-chat-btn {
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #1677ff 0%, #4096ff 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(22, 119, 255, 0.2);
}

.toggle-btn {
  font-size: 20px;
  color: #94a3b8;
}

.search-box {
  padding: 0 16px 16px;
}

.custom-search :deep(.el-input__wrapper) {
  border-radius: 10px;
  background: rgba(0,0,0,0.03);
  box-shadow: none !important;
}

.group-label {
  padding: 12px 20px 6px;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px;
}

.history-item {
  margin-bottom: 4px;
  padding: 12px 14px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s ease;
  color: #475569;
}

.history-item:hover {
  background: rgba(0,0,0,0.04);
}

.history-item.active {
  background: #fff;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  color: var(--accent-color);
}

.chat-title {
  flex: 1;
  font-size: 13.5px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 主对话区优化 */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  position: relative;
}

.chat-header {
  height: 64px;
  padding: 0 24px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.model-select {
  width: 260px;
}

.model-select :deep(.el-input__wrapper) {
  box-shadow: none !important;
  background: #f8fafc;
  border-radius: 20px;
  padding: 0 16px;
}

.option-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.option-content i {
  font-size: 16px;
  color: #94a3b8;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 16px;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background-color: #10b981;
  border-radius: 50%;
  position: relative;
}

.pulse-dot::after {
  content: '';
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background-color: inherit;
  border-radius: inherit;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(2.5); opacity: 0; }
}

.status-text {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.message-list-wrapper {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.message-list {
  flex: 1;
  padding: 40px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* 消息流居中控制 */
.message-item {
  max-width: 850px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  gap: 20px;
  opacity: 0;
  transform: translateY(20px);
  animation: slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes slideIn {
  to { opacity: 1; transform: translateY(0); }
}

.message-item.user {
  flex-direction: row-reverse;
}

.custom-avatar {
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
  border: 2px solid #fff;
}

.content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: calc(100% - 60px);
}

.user .content-wrapper {
  align-items: flex-end;
}

.sender-name {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 2px;
}

.message-bubble {
  padding: 16px 20px;
  border-radius: 20px;
  font-size: 15px;
  line-height: 1.65;
  color: #334155;
  box-shadow: 0 2px 10px rgba(0,0,0,0.02);
  position: relative;
}

.ai .message-bubble {
  background: #f8fafc;
  border-top-left-radius: 4px;
}

.user .message-bubble {
  background: linear-gradient(135deg, #1677ff 0%, #0050b3 100%);
  color: #fff;
  border-top-right-radius: 4px;
  box-shadow: 0 10px 20px rgba(22, 119, 255, 0.15);
}

/* 消息操作条 */
.message-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px dashed rgba(0,0,0,0.05);
  opacity: 0;
  transition: opacity 0.3s;
}

.message-item:hover .message-actions {
  opacity: 1;
}

/* 欢迎状态 */
.welcome-box {
  text-align: center;
  max-width: 500px;
  margin: 100px auto;
}

.welcome-icon {
  font-size: 48px;
  margin-bottom: 20px;
  animation: wave 2.5s infinite;
}

@keyframes wave {
  0%, 100% { transform: rotate(0deg); }
  20% { transform: rotate(15deg); }
  45% { transform: rotate(-10deg); }
}

.suggested-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 24px;
}

.suggest-chip {
  padding: 8px 16px;
  background: #f1f5f9;
  border-radius: 20px;
  font-size: 13px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.suggest-chip:hover {
  background: #fff;
  border-color: var(--accent-color);
  color: var(--accent-color);
  transform: translateY(-2px);
}

/* 输入框优化：胶囊式悬浮 */
.input-area {
  padding: 0 40px 40px;
}

.input-container-capsule {
  max-width: 850px;
  margin: 0 auto;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  padding: 8px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.06);
  transition: all 0.3s;
}

.input-container-capsule:focus-within {
  border-color: var(--accent-color);
  box-shadow: 0 15px 50px rgba(22, 119, 255, 0.12);
}

.input-main-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.icon-btn {
  font-size: 20px;
  color: #94a3b8;
  padding: 10px !important;
}

.icon-btn:hover {
  color: var(--accent-color);
  background: var(--accent-light);
  border-radius: 50%;
}

.capsule-input :deep(.el-textarea__inner) {
  padding: 10px 12px !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  font-size: 15px;
}

.fancy-send-btn {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  padding: 0;
  transition: transform 0.2s;
}

.fancy-send-btn:hover {
  transform: scale(1.05);
}

.footer-tip {
  text-align: center;
  margin-top: 12px;
  font-size: 11px;
  color: #94a3b8;
  letter-spacing: 0.02em;
}

/* 附件预览 */
.attachment-preview-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #f1f5f9;
}

.glass-preview-item {
  background: #f8fafc;
  padding: 6px 12px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  border: 1px solid #e2e8f0;
}

/* 打字动画 */
.typing-animation {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}

.typing-animation span {
  width: 6px;
  height: 6px;
  background: #cbd5e1;
  border-radius: 50%;
  animation: bounceDot 1.4s infinite ease-in-out;
}

.typing-animation span:nth-child(2) { animation-delay: 0.2s; }
.typing-animation span:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounceDot {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1.2); opacity: 1; }
}

/* 滚动条定制 */
.message-list::-webkit-scrollbar {
  width: 6px;
}
.message-list::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
</style>

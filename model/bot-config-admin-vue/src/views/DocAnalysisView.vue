<template>
  <div class="doc-analysis-container">
    <!-- 内部侧边栏：历史记录 -->
    <HistorySidebar 
      :is-collapsed="isSidebarCollapsed"
      :current-id="currentSessionId"
      :history="historyList"
      @toggle-collapse="isSidebarCollapsed = !isSidebarCollapsed"
      @new-upload="handleNewUpload"
      @select-session="handleSelectSession"
      @delete-session="handleDeleteSession"
    />

    <!-- 主展示区域 -->
    <div class="doc-main">
      <!-- 初始上传状态 -->
      <UploadArea 
        v-if="!isUploaded && !isParsing" 
        @upload="handleUpload"
      />

      <!-- 解析中状态 -->
      <div v-else-if="isParsing" class="parsing-state">
        <div class="parsing-box">
          <div class="loader"></div>
          <h2>正在智能解析文档...</h2>
          <p>这通常需要几秒钟，请稍候</p>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progress + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- 解析完成状态：左右分栏 -->
      <div v-else class="analysis-layout">
        <div class="chat-section">
          <ChatPanel 
            ref="chatPanelRef"
            :messages="currentMessages"
            :is-typing="isTyping"
            @send="handleSendMessage"
          />
        </div>
        <div class="preview-section">
          <PreviewPanel 
            :title="currentDocTitle"
            :content="currentDocContent"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadFile } from 'element-plus'
import HistorySidebar from '../components/DocAnalysis/HistorySidebar.vue'
import UploadArea from '../components/DocAnalysis/UploadArea.vue'
import ChatPanel from '../components/DocAnalysis/ChatPanel.vue'
import PreviewPanel from '../components/DocAnalysis/PreviewPanel.vue'

// 接口定义
interface Message {
  role: 'user' | 'ai'
  content: string
}

interface DocSession {
  id: string
  title: string
  content: string
  messages: Message[]
}

// 状态管理
const isSidebarCollapsed = ref(false)
const isUploaded = ref(false)
const isParsing = ref(false)
const isTyping = ref(false)
const progress = ref(0)
const currentSessionId = ref('')
const chatPanelRef = ref<InstanceType<typeof ChatPanel> | null>(null)
let parsingTimer: ReturnType<typeof setInterval> | null = null

// 模拟历史数据
const historyList = ref<DocSession[]>([
  { 
    id: '1', 
    title: '深度学习研究论文.pdf', 
    content: '这是一篇关于深度学习在图像识别领域应用的学术论文...', 
    messages: [
      { role: 'ai', content: '您好！我已完成该论文的解析。这篇论文主要探讨了卷积神经网络（CNN）在低光照场景下的优化算法。您可以就其核心结论或实验方法向我提问。' }
    ] 
  },
  { 
    id: '2', 
    title: '2024年第一季度财报.docx', 
    content: '公司2024年Q1总营收同比增长15%...', 
    messages: [
      { role: 'ai', content: '财报分析已就绪。数据显示公司在研发投入上显著增加。' }
    ] 
  }
])

const currentSession = computed(() => {
  return historyList.value.find(s => s.id === currentSessionId.value)
})

const currentDocTitle = computed(() => currentSession.value?.title || '')
const currentDocContent = computed(() => currentSession.value?.content || '')
const currentMessages = computed(() => currentSession.value?.messages || [])

// 方法
const handleUpload = (file: UploadFile) => {
  isParsing.value = true
  isUploaded.value = false
  progress.value = 0
  
  if (parsingTimer) clearInterval(parsingTimer)
  
  // 模拟解析进度
  parsingTimer = setInterval(() => {
    progress.value += 10
    if (progress.value >= 100) {
      if (parsingTimer) clearInterval(parsingTimer)
      parsingTimer = null
      completeParsing(file.name)
    }
  }, 200)
}

const completeParsing = (fileName: string) => {
  isParsing.value = false
  isUploaded.value = true
  
  const newId = String(Date.now())
  const newSession: DocSession = {
    id: newId,
    title: fileName,
    content: `这是关于“${fileName}”的内容解析结果...\n\n文档摘要：本文件详细描述了相关业务流程及其关键控制点。\n主要关键词：流程优化、系统集成、风险管控。\n\n在实际生产环境中，此处会展示通过 OCR 或 PDF 解析器提取的结构化文本。`,
    messages: [
      { role: 'ai', content: `文档《${fileName}》解析成功。我是您的 AI 助手，现在您可以针对这份文档的内容向我提问，我会结合原文为您解答。` }
    ]
  }
  
  historyList.value.unshift(newSession)
  currentSessionId.value = newId
}

const handleSendMessage = (text: string) => {
  if (!currentSession.value) return
  
  // 添加用户消息
  currentSession.value.messages.push({ role: 'user', content: text })
  
  // 模拟 AI 回答
  isTyping.value = true
  setTimeout(() => {
    chatPanelRef.value?.scrollToBottom()
  }, 50)
  
  setTimeout(() => {
    isTyping.value = false
    const aiResponse = `基于文档内容，针对您提到的“${text}”，我认为：文档在第三章中明确指出，这种情况应该按照标准的 SOP 进行处理，以确保数据的准确性和一致性。`
    currentSession.value?.messages.push({ role: 'ai', content: aiResponse })
    setTimeout(() => {
      chatPanelRef.value?.scrollToBottom()
    }, 50)
  }, 1000)
}

const handleNewUpload = () => {
  isUploaded.value = false
  isParsing.value = false
  currentSessionId.value = ''
  if (parsingTimer) {
    clearInterval(parsingTimer)
    parsingTimer = null
  }
}

const handleSelectSession = (id: string) => {
  currentSessionId.value = id
  isUploaded.value = true
  isParsing.value = false
}

const handleDeleteSession = (id: string) => {
  ElMessageBox.confirm('确定要删除这段对话历史吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    const index = historyList.value.findIndex(h => h.id === id)
    if (index > -1) {
      historyList.value.splice(index, 1)
      if (currentSessionId.value === id) {
        handleNewUpload()
      }
      ElMessage.success('已删除')
    }
  })
}

onUnmounted(() => {
  if (parsingTimer) clearInterval(parsingTimer)
})
</script>

<style scoped>
.doc-analysis-container {
  height: calc(100vh - 64px - 48px);
  display: flex;
  background-color: #f1f5f9;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,0.05);
}

.doc-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  position: relative;
  overflow: hidden;
}

.parsing-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
}

.parsing-box {
  text-align: center;
  width: 300px;
}

.loader {
  width: 48px;
  height: 48px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #1677ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.parsing-box h2 {
  font-size: 18px;
  color: #1e293b;
  margin-bottom: 8px;
}

.parsing-box p {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 24px;
}

.progress-bar {
  height: 6px;
  background: #f1f5f9;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1677ff, #4096ff);
  transition: width 0.3s ease;
}

.analysis-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.chat-section {
  width: 450px;
  min-width: 400px;
  height: 100%;
}

.preview-section {
  flex: 1;
  height: 100%;
}
</style>

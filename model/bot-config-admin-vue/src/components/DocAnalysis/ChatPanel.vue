<template>
  <div class="chat-panel">
    <div class="message-list" ref="messageListRef">
      <div
        v-for="(msg, index) in messages"
        :key="index"
        :class="['message-item', msg.role === 'user' ? 'user' : 'ai']"
      >
        <div class="avatar">
          <el-avatar :size="32" :src="msg.role === 'user' ? userAvatar : aiAvatar" />
        </div>
        <div class="content-wrapper">
          <div class="message-bubble">{{ msg.content }}</div>
        </div>
      </div>
      
      <div v-if="isTyping" class="message-item ai">
        <div class="avatar">
          <el-avatar :size="32" :src="aiAvatar" />
        </div>
        <div class="content-wrapper">
          <div class="message-bubble typing-bubble">
            <div class="typing-animation">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <div class="input-container-capsule">
        <el-input
          v-model="inputMessage"
          type="textarea"
          :autosize="{ minRows: 1, maxRows: 6 }"
          placeholder="基于文档内容提问..."
          @keydown.enter.prevent="handleEnter"
          resize="none"
          class="capsule-input"
        />
        <el-button 
          type="primary" 
          circle
          :disabled="!inputMessage.trim() || isTyping"
          @click="sendMessage"
          class="send-btn"
        >
          <el-icon><Promotion /></el-icon>
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Promotion } from '@element-plus/icons-vue'

const props = defineProps<{
  messages: Array<{ role: 'user' | 'ai'; content: string }>
  isTyping: boolean
}>()

const emit = defineEmits(['send'])

const inputMessage = ref('')
const messageListRef = ref<HTMLElement | null>(null)

// 模拟头像
const userAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4'
const aiAvatar = 'https://api.dicebear.com/7.x/bottts/svg?seed=Aneka&backgroundColor=d1d4f9'

const scrollToBottom = async () => {
  await nextTick()
  if (messageListRef.value) {
    messageListRef.value.scrollTo({
      top: messageListRef.value.scrollHeight,
      behavior: 'smooth'
    })
  }
}

const handleEnter = (e: KeyboardEvent) => {
  if (e.shiftKey) return
  sendMessage()
}

const sendMessage = () => {
  if (!inputMessage.value.trim() || props.isTyping) return
  emit('send', inputMessage.value.trim())
  inputMessage.value = ''
  scrollToBottom()
}

defineExpose({ scrollToBottom })
</script>

<style scoped>
.chat-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-right: 1px solid #f1f5f9;
}

.message-list {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.message-item {
  display: flex;
  gap: 12px;
  max-width: 90%;
}

.message-item.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.user .content-wrapper {
  align-items: flex-end;
}

.message-bubble {
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  color: #334155;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
  width: fit-content;
}

.ai .message-bubble {
  background: #f1f5f9;
  border-top-left-radius: 2px;
}

.user .message-bubble {
  background: #1677ff;
  color: white;
  border-top-right-radius: 2px;
}

.input-area {
  padding: 16px 24px 24px;
}

.input-container-capsule {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 6px 6px 6px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.capsule-input :deep(.el-textarea__inner) {
  background: transparent;
  box-shadow: none !important;
  border: none !important;
  padding: 8px 0;
  color: #1e293b;
}

.send-btn {
  width: 36px;
  height: 36px;
  min-height: 36px;
}

.typing-bubble {
  padding: 12px 20px;
}

.typing-animation {
  display: flex;
  gap: 4px;
}

.typing-animation span {
  width: 6px;
  height: 6px;
  background: #94a3b8;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-animation span:nth-child(2) { animation-delay: 0.2s; }
.typing-animation span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 100% { transform: translateY(0); opacity: 0.4; }
  50% { transform: translateY(-4px); opacity: 1; }
}
</style>

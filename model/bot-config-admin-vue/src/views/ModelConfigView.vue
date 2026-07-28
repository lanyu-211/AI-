<template>
  <div class="page-container" style="display: flex; flex-direction: column; height: 100%;" v-if="localModel">
    <div class="page-header" style="flex-shrink: 0; margin-bottom: 0; padding: 16px 24px; background: #fff; border-bottom: 1px solid var(--border-color); margin: -24px -24px 0 -24px;">
      <div>
        <h2>模型配置与调试</h2>
        <p style="color:var(--text-secondary); font-size:13px; margin-top:4px; margin-bottom:0">实时调整推理参数并验证模型输出效果</p>
      </div>
    </div>

    <div class="config-editor-layout">
      <!-- 聊天模拟区 -->
      <div class="chat-container">
        <div class="chat-messages" ref="chatMessagesRef">
          <div 
            v-for="(msg, idx) in chatMessages" 
            :key="idx" 
            :class="['msg-bubble', msg.role === 'user' ? 'msg-user' : 'msg-ai']"
          >
            {{ msg.content }}
          </div>
        </div>
        <div class="chat-input-area">
          <el-input 
            v-model="inputMsg" 
            placeholder="输入测试指令，按回车发送..." 
            @keyup.enter="sendMessage"
          />
          <el-button type="primary" @click="sendMessage">发送</el-button>
        </div>
      </div>

      <!-- 右侧配置栏 -->
      <div class="config-sidebar">
        <!-- 基础身份 -->
        <div class="panel">
          <span class="sidebar-section-title">基础身份</span>
          <el-form label-position="top" size="default">
            <el-form-item label="模型名称"><el-input v-model="localModel.name" /></el-form-item>
            <el-form-item label="供应商 / 底层引擎">
              <el-select v-model="localModel.type" style="width: 100%;">
                <el-option label="OpenAI (GPT)" value="OpenAI" />
                <el-option label="Anthropic (Claude)" value="Anthropic" />
                <el-option label="Local (Ollama/vLLM)" value="Local" />
              </el-select>
            </el-form-item>
            <el-form-item label="API 密钥"><el-input v-model="localModel.key" type="password" show-password /></el-form-item>
            <el-form-item label="应用描述"><el-input v-model="localModel.desc" type="textarea" :rows="3" /></el-form-item>
          </el-form>
        </div>

        <el-divider style="margin: 8px 0" />

        <!-- 推理策略 -->
        <div class="panel">
          <span class="sidebar-section-title">推理策略</span>
          <div class="slider-box">
            <div class="slider-label"><span>生成温度 (Temp)</span><b>{{ localModel.temp }}</b></div>
            <el-slider v-model="localModel.temp" :min="0" :max="2" :step="0.1" :show-tooltip="false" />
          </div>
          <div class="slider-box">
            <div class="slider-label"><span>核采样 (Top-P)</span><b>{{ localModel.topP }}</b></div>
            <el-slider v-model="localModel.topP" :min="0" :max="1" :step="0.05" :show-tooltip="false" />
          </div>
          <div class="slider-box">
            <div class="slider-label"><span>上下文记忆 (轮次)</span><b>{{ localModel.mem }}</b></div>
            <el-slider v-model="localModel.mem" :min="5" :max="100" :step="5" :show-tooltip="false" />
          </div>
          <div class="slider-box">
            <div class="slider-label"><span>最大 Token 输出</span><b>{{ localModel.out }}</b></div>
            <el-slider v-model="localModel.out" :min="256" :max="8192" :step="256" :show-tooltip="false" />
          </div>
        </div>

        <el-divider style="margin: 8px 0" />

        <!-- 关联知识库 -->
        <div class="panel">
          <span class="sidebar-section-title">关联知识库资源</span>
          <div class="kb-list" v-if="localModel.kb.length">
            <div class="kb-item" v-for="(k, idx) in localModel.kb" :key="idx">
              <span>{{ k }}</span>
              <el-button link type="danger" size="small" @click="unboundKb(idx)">解除</el-button>
            </div>
          </div>
          <div v-else style="padding: 16px; text-align: center; color: #bfbfbf;">无关联</div>
          <el-button style="margin-top:12px; width:100%; border-style: dashed;" @click="openMountKbModal">
            + 挂载新知识库
          </el-button>
        </div>

        <div class="sidebar-actions">
          <el-button style="flex: 1" @click="goBack">退出编辑</el-button>
          <el-button type="primary" style="flex: 1.5" @click="saveConfig">保存并发布</el-button>
        </div>
      </div>
    </div>
    
    <MountKbModal 
      v-model:visible="mountVisible" 
      :initial-selected="localModel.kb"
      @confirm="handleMountConfirm"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/appStore'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const store = useAppStore()

const modelId = computed(() => route.params.id)
const localModel = ref(null)

watch(() => modelId.value, (id) => {
  const m = store.models.find(x => x.id === id)
  if (m) localModel.value = JSON.parse(JSON.stringify(m))
}, { immediate: true })

// 对话逻辑
const inputMsg = ref('')
const chatMessages = ref([
  { role: 'ai', content: '你好！我是当前配置的模型实例。你可以尝试修改右侧的参数，然后在这里发送消息来测试我的回复效果。' }
])
const chatMessagesRef = ref(null)

const scrollToBottom = () => {
  nextTick(() => {
    if (chatMessagesRef.value) {
      chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight
    }
  })
}

const sendMessage = () => {
  const text = inputMsg.value.trim()
  if (!text || !localModel.value) return
  
  chatMessages.value.push({ role: 'user', content: text })
  inputMsg.value = ''
  scrollToBottom()

  // 模拟请求延迟
  setTimeout(() => {
    chatMessages.value.push({ 
      role: 'ai', 
      content: `[模拟回复] 收到指令！当前模型：${localModel.value?.name}，生成温度已按您的参数设定为 ${localModel.value?.temp}。正在基于关联的知识库进行检索并推理...`
    })
    scrollToBottom()
  }, 800)
}

const unboundKb = (idx) => {
  if (localModel.value) {
    localModel.value.kb.splice(idx, 1)
    ElMessage.success('已成功解除绑定')
  }
}

import MountKbModal from '@/components/modals/MountKbModal.vue'
const mountVisible = ref(false)

const openMountKbModal = () => {
  mountVisible.value = true
}

const handleMountConfirm = (kbs) => {
  if(localModel.value) {
    localModel.value.kb = kbs
  }
}

const goBack = () => {
  router.push('/models')
}

const saveConfig = () => {
  if (localModel.value) {
    store.updateModel(localModel.value.id, localModel.value)
    ElMessage.success('配置固化成功')
    goBack()
  }
}
</script>

<style scoped>
.config-editor-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  background: #fff;
  margin: 0 -24px -24px -24px;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f7f8fa;
  position: relative;
  border-right: 1px solid var(--border-color);
}

.chat-messages {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.msg-bubble {
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  position: relative;
  word-break: break-all;
}

.msg-user {
  align-self: flex-end;
  background: var(--primary-color);
  color: white;
  border-bottom-right-radius: 2px;
}

.msg-ai {
  align-self: flex-start;
  background: white;
  color: var(--text-main);
  border-bottom-left-radius: 2px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.chat-input-area {
  padding: 20px 24px;
  background: white;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 12px;
}

.config-sidebar {
  width: 420px;
  overflow-y: auto;
  padding: 24px;
  background: white;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sidebar-actions {
  display: flex;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
  margin-top: auto;
  background: white;
}

.panel { padding: 0; border: none; }
.sidebar-section-title { font-size: 13px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; display: block; }

.slider-box { margin-bottom: 8px; }
.slider-label { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 0px; }
.slider-label b { color: var(--primary-color) }

.kb-list { border: 1px solid var(--border-color); border-radius: var(--radius); }
.kb-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-bottom: 1px solid var(--border-color); font-size: 14px; }
.kb-item:last-child { border-bottom: none; }
</style>

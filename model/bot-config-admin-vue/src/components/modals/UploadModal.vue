<template>
  <el-dialog
    v-model="dialogVisible"
    title="上传新文档"
    width="640px"
    destroy-on-close
  >
    <div v-show="!uploading">
      <div 
        class="upload-area" 
        :class="{ dragover: isDragOver }"
        @dragenter.prevent="isDragOver = true"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="handleDrop"
        @click="triggerFileSelect"
      >
        <div class="upload-icon">
          <el-icon :size="32" color="#1677ff"><FirstAidKit /></el-icon>
        </div>
        <div style="font-weight: 500;">点击或拖拽文件到此处上传</div>
        <div class="upload-hint">支持多文件并行上传，单文件不超过 20MB</div>
        
        <input type="file" ref="fileInput" multiple style="display: none" @change="handleFileSelect">
        
        <div class="format-tags">
          <span class="format-tag">PDF</span>
          <span class="format-tag">WORD</span>
          <span class="format-tag">MD</span>
          <span class="format-tag">TXT</span>
        </div>
      </div>

      <div class="selected-files" v-if="files.length">
        <div class="kb-item" v-for="(f, i) in files" :key="i">
          <div class="file-info">
            <span :class="['file-icon', `type-${getFileExt(f.name)}`]">{{ getFileExt(f.name) }}</span>
            {{ f.name }}
          </div>
          <el-button link type="danger" size="small" @click.stop="files.splice(i, 1)">删除</el-button>
        </div>
      </div>
    </div>

    <!-- 进度条模拟区 -->
    <div v-show="uploading" class="upload-progress-container">
      <el-progress :percentage="progress" :status="progress === 100 ? 'success' : ''" />
      <div class="progress-text">正在解析并存储文档...</div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="close" :disabled="uploading">取消</el-button>
        <el-button type="primary" :disabled="files.length === 0 || uploading" @click="startUpload">
          开始上传
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { FirstAidKit } from '@element-plus/icons-vue' // Placeholder icon
import { ElMessage } from 'element-plus'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits(['update:visible', 'success'])

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const fileInput = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)
const files = ref<File[]>([])
const uploading = ref(false)
const progress = ref(0)
const allowedExts = ['pdf', 'doc', 'docx', 'md', 'txt']

watch(() => props.visible, (val) => {
  if (val) {
    files.value = []
    uploading.value = false
    progress.value = 0
  }
})

const getFileExt = (filename: string) => filename.split('.').pop()?.toLowerCase() || 'unknown'

const filterFiles = (fileList: FileList | File[]) => {
  for (let i = 0; i < fileList.length; i++) {
    const f = fileList[i]
    if (allowedExts.includes(getFileExt(f.name))) {
      // 简单去重
      if (!files.value.some(existing => existing.name === f.name)) {
        files.value.push(f)
      }
    } else {
      ElMessage.warning(`不支持格式: ${f.name}`)
    }
  }
}

const triggerFileSelect = () => fileInput.value?.click()

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files) filterFiles(target.files)
  target.value = '' // Reset
}

const handleDrop = (e: DragEvent) => {
  isDragOver.value = false
  if (e.dataTransfer?.files) filterFiles(e.dataTransfer.files)
}

const close = () => { dialogVisible.value = false }

const startUpload = () => {
  uploading.value = true
  progress.value = 0
  const interval = setInterval(() => {
    progress.value += 5
    if (progress.value >= 100) {
      clearInterval(interval)
      setTimeout(() => {
        emit('success', files.value.map(f => f.name))
        ElMessage.success(`成功上传 ${files.value.length} 份文档`)
        close()
      }, 500)
    }
  }, 50)
}
</script>

<style scoped>
.upload-area { border: 2px dashed #d9d9d9; border-radius: 8px; padding: 40px 20px; text-align: center; cursor: pointer; transition: var(--transition); background: #fafafa; margin-bottom: 20px; }
.upload-area:hover, .upload-area.dragover { border-color: var(--primary-color); background: #f0f7ff; }
.upload-icon { margin-bottom: 12px; }
.upload-hint { font-size: 13px; color: var(--text-secondary); margin-top: 8px; }
.format-tags { display: flex; gap: 8px; justify-content: center; margin-top: 16px; }
.format-tag { font-size: 10px; padding: 2px 6px; border-radius: 3px; background: #eee; color: #888; border: 1px solid #ddd; }

.selected-files { max-height: 150px; overflow-y: auto; border: 1px solid #f0f0f0; border-radius: 4px; padding: 8px; }
.kb-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f5f5f5; font-size: 13px; }
.kb-item:last-child { border-bottom: none; }

.file-info { display: flex; align-items: center; gap: 12px; }
.file-icon { width: 30px; height: 30px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800; text-transform: uppercase; flex-shrink: 0; }
.type-pdf { background: #fff1f0; color: #f5222d; }
.type-doc, .type-docx { background: #e6f7ff; color: #1890ff; }
.type-md { background: #f9f0ff; color: #722ed1; }
.type-txt { background: #f6ffed; color: #52c41a; }

.upload-progress-container { padding: 20px; }
.progress-text { text-align: center; text-align: center; color: var(--text-secondary); margin-top: 12px; font-size: 13px; }
</style>

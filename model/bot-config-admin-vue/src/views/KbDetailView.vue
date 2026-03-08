<template>
  <div class="page-container" v-if="kb">
    <div class="page-header" style="align-items: center; display: flex; justify-content: space-between; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 20px; font-weight: 600; margin: 0;">{{ kb.name }}</h2>
        <p style="color:var(--text-secondary); font-size:13px; margin-top:4px; margin-bottom:0">{{ kb.desc }}</p>
      </div>
      <div>
        <el-button type="primary" @click="openUpload">+ 上传新文档</el-button>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">文档列表</div>
      <div class="kb-list" v-if="kb.files.length">
        <div class="kb-item" v-for="(file, idx) in kb.files" :key="idx">
          <div class="file-info">
            <div :class="['file-icon', `type-${getFileExt(file)}`]">{{ getFileExt(file) }}</div>
            <span>{{ file }}</span>
          </div>
          <div style="display:flex; gap:8px">
            <el-button link size="small">预览</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(idx)">删除</el-button>
          </div>
        </div>
      </div>
      <div v-else style="padding: 24px; text-align: center; color: #888;">暂无文档...</div>
    </div>
    
    <UploadModal v-model:visible="uploadVisible" @success="handleUploadSuccess" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/appStore'
import { ElMessageBox, ElMessage } from 'element-plus'

const route = useRoute()
const store = useAppStore()

const kbId = computed(() => route.params.kbId as string)
const kb = computed(() => store.kbList.find(k => k.id === kbId.value))

const getFileExt = (filename: string) => {
  return filename.split('.').pop()?.toLowerCase() || 'unknown'
}

const handleDelete = (index: number) => {
  ElMessageBox.confirm('确定要永久删除此文档吗？', '提示', {
    type: 'warning'
  }).then(() => {
    store.deleteKbFile(kbId.value, index)
    ElMessage.success('文档已移除')
  }).catch(() => {})
}

import UploadModal from '@/components/modals/UploadModal.vue'
const uploadVisible = ref(false)

const openUpload = () => {
  uploadVisible.value = true
}

const handleUploadSuccess = (newFiles: string[]) => {
  store.addKbFiles(kbId.value, newFiles)
}
</script>

<style scoped>
.panel { background: white; padding: 24px; border-radius: var(--radius); border: 1px solid var(--border-color); }
.panel-title { font-size: 15px; font-weight: 600; margin-bottom: 20px; padding-left: 12px; border-left: 3px solid var(--primary-color); display: flex; justify-content: space-between; align-items: center; }

.kb-list { border: 1px solid var(--border-color); border-radius: var(--radius); }
.kb-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-bottom: 1px solid var(--border-color); font-size: 14px; }
.kb-item:last-child { border-bottom: none; }

.file-info { display: flex; align-items: center; gap: 12px; }
.file-icon { width: 30px; height: 30px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800; text-transform: uppercase; flex-shrink: 0; }
.type-pdf { background: #fff1f0; color: #f5222d; }
.type-doc, .type-docx { background: #e6f7ff; color: #1890ff; }
.type-md { background: #f9f0ff; color: #722ed1; }
.type-txt { background: #f6ffed; color: #52c41a; }
</style>

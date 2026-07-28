<template>
  <div class="upload-area">
    <div class="upload-card">
      <el-upload
        class="doc-uploader"
        drag
        action="#"
        :auto-upload="false"
        :on-change="handleChange"
        :show-file-list="false"
        accept=".pdf,.doc,.docx,.txt"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          将文件拖到此处，或 <em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持 PDF、Word 或纯文本文件，文件大小不超过 20MB
          </div>
        </template>
      </el-upload>
      
      <div class="features-grid">
        <div class="feature-item">
          <el-icon><Reading /></el-icon>
          <span>智能解析内容</span>
        </div>
        <div class="feature-item">
          <el-icon><ChatDotRound /></el-icon>
          <span>多轮交互问答</span>
        </div>
        <div class="feature-item">
          <el-icon><Position /></el-icon>
          <span>精准定位原文</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { UploadFilled, Reading, ChatDotRound, Position } from '@element-plus/icons-vue'

const emit = defineEmits(['upload'])

const handleChange = (file) => {
  emit('upload', file)
}
</script>

<style scoped>
.upload-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  padding: 40px;
}

.upload-card {
  width: 100%;
  max-width: 600px;
  background: white;
  padding: 40px;
  border-radius: 24px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.05);
  text-align: center;
}

.doc-uploader :deep(.el-upload-dragger) {
  border-radius: 16px;
  border: 2px dashed #dcdfe6;
  padding: 40px;
  background: #f8fafc;
  transition: all 0.3s;
}

.doc-uploader :deep(.el-upload-dragger:hover) {
  border-color: #1677ff;
  background: #f0f7ff;
}

.el-icon--upload {
  font-size: 64px;
  color: #1677ff;
  margin-bottom: 16px;
}

.el-upload__text {
  font-size: 16px;
  color: #606266;
}

.el-upload__text em {
  color: #1677ff;
  font-style: normal;
  font-weight: 600;
}

.el-upload__tip {
  margin-top: 16px;
  color: #909399;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 40px;
  padding-top: 30px;
  border-top: 1px solid #f1f5f9;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 13px;
}

.feature-item i {
  font-size: 24px;
  color: #1677ff;
  background: #e6f4ff;
  padding: 10px;
  border-radius: 12px;
}
</style>

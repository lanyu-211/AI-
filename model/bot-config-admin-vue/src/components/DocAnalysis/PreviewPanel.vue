<template>
  <div class="preview-panel">
    <div class="preview-header">
      <div class="doc-title">
        <el-icon><Document /></el-icon>
        <span>{{ title }}</span>
      </div>
      <div class="actions">
        <el-button-group size="small">
          <el-button plain><el-icon><ZoomIn /></el-icon></el-button>
          <el-button plain><el-icon><ZoomOut /></el-icon></el-button>
          <el-button plain><el-icon><Download /></el-icon></el-button>
        </el-button-group>
      </div>
    </div>
    
    <div class="preview-content">
      <div class="doc-card">
        <div class="doc-skeleton">
          <h3>{{ title }}</h3>
          <el-divider />
          <div class="mock-text">
            <template v-if="content">
              {{ content }}
            </template>
            <template v-else>
              <div v-for="i in 15" :key="i" class="skeleton-line"></div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Document, ZoomIn, ZoomOut, Download } from '@element-plus/icons-vue'

defineProps({
  title: String,
  content: String
})
</script>

<style scoped>
.preview-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f1f5f9;
}

.preview-header {
  height: 56px;
  padding: 0 20px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.doc-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.preview-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  justify-content: center;
}

.doc-card {
  width: 100%;
  max-width: 800px;
  background: white;
  min-height: 100%;
  padding: 40px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.05);
  border-radius: 4px;
}

.doc-skeleton h3 {
  text-align: center;
  margin-bottom: 24px;
}

.mock-text {
  color: #475569;
  line-height: 1.8;
  white-space: pre-wrap;
}

.skeleton-line {
  height: 12px;
  background: #f1f5f9;
  margin-bottom: 16px;
  border-radius: 4px;
}

.skeleton-line:nth-child(3n) { width: 80%; }
.skeleton-line:nth-child(3n+1) { width: 95%; }
.skeleton-line:nth-child(3n+2) { width: 90%; }
</style>

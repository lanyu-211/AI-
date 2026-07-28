<template>
  <div :class="['history-sidebar', { collapsed: isCollapsed }]">
    <div class="sidebar-header">
      <div class="header-top">
        <el-button v-if="!isCollapsed" type="primary" class="new-doc-btn" @click="$emit('new-upload')">
          <el-icon><Plus /></el-icon>
          <span>上传新文档</span>
        </el-button>
        <el-button v-else type="primary" circle @click="$emit('new-upload')" title="上传新文档">
          <el-icon><Plus /></el-icon>
        </el-button>
        
        <el-button link class="toggle-btn" @click="$emit('toggle-collapse')">
          <el-icon>
            <Expand v-if="isCollapsed" />
            <Fold v-else />
          </el-icon>
        </el-button>
      </div>
    </div>

    <!-- 搜索框 -->
    <div v-if="!isCollapsed" class="search-box">
      <el-input
        v-model="searchQuery"
        placeholder="搜索文档..."
        :prefix-icon="Search"
        clearable
        size="small"
        class="custom-search"
      />
    </div>

    <div class="history-list">
      <div v-if="!isCollapsed" class="group-label">历史文档</div>
      <div 
        v-for="item in filteredHistory" 
        :key="item.id" 
        :class="['history-item', { active: currentId === item.id }]"
        @click="$emit('select-session', item.id)"
        :title="isCollapsed ? item.title : ''"
      >
        <el-icon class="msg-icon"><Document /></el-icon>
        <span v-if="!isCollapsed" class="chat-title">{{ item.title }}</span>
        
        <el-dropdown v-if="!isCollapsed" trigger="click" @click.stop>
          <el-icon class="more-icon"><MoreFilled /></el-icon>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="$emit('delete-session', item.id)">
                <el-icon><Delete /></el-icon>删除
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Plus, Expand, Fold, Search, Document, MoreFilled, Delete } from '@element-plus/icons-vue'

const props = defineProps({
  isCollapsed: Boolean,
  currentId: String,
  history: Array
})

const emit = defineEmits(['new-upload', 'toggle-collapse', 'select-session', 'delete-session'])

const searchQuery = ref('')

const filteredHistory = computed(() => {
  return props.history.filter(item => 
    item.title.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})
</script>

<style scoped>
.history-sidebar {
  width: 260px;
  background: rgba(248, 250, 252, 0.8);
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  height: 100%;
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

.new-doc-btn {
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #1677ff 0%, #4096ff 100%);
  border: none;
  flex: 1;
}

.toggle-btn {
  font-size: 20px;
  color: #94a3b8;
}

.search-box {
  padding: 0 16px 16px;
}

.custom-search :deep(.el-input__wrapper) {
  border-radius: 8px;
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
  padding: 10px 14px;
  border-radius: 10px;
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
  color: #1677ff;
}

.chat-title {
  flex: 1;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.more-icon {
  font-size: 14px;
  color: #94a3b8;
  opacity: 0;
  transition: opacity 0.2s;
}

.history-item:hover .more-icon {
  opacity: 1;
}
</style>
